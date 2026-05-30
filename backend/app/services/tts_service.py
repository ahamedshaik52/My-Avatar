"""
Text-to-Speech service — fully self-hosted, no paid API required.

Provider priority:
  1. Kokoro ONNX  — self-hosted, 82 M model, 50 male/female voices, Apache-2.0.
                    Runs on CPU. Download models with: python scripts/setup_models.py --tts
  2. edge-tts     — Microsoft Edge neural voices, free, no key, online-only.
                    Gender + accent accurate fallback when Kokoro models not found.
  3. gTTS         — last resort; female-sounding only; acceptable for quick dev.
  4. ElevenLabs   — optional cloud upgrade; only used when API key + ElevenLabs ID set.
"""
from __future__ import annotations

import asyncio
import io
import re
import threading
from typing import Tuple

import structlog

from app.core.config import get_settings

settings = get_settings()
log = structlog.get_logger(__name__)

# ── Regexes to identify voice ID type ────────────────────────────────────────
_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)
# edge-tts IDs look like "en-US-GuyNeural"
_EDGE_TTS_RE = re.compile(r"^[a-z]{2}-[A-Z]{2}-\w+Neural$")
# Kokoro IDs look like "af_heart", "am_adam", "bm_daniel", "bf_emma"
_KOKORO_RE = re.compile(r"^[a-z]{2}_[a-z]+$")


def _voice_provider(voice_id: str | None) -> str:
    if not voice_id or _UUID_RE.match(voice_id):
        return "kokoro"          # old seeded voices without external_id → try kokoro
    if _KOKORO_RE.match(voice_id):
        return "kokoro"
    if _EDGE_TTS_RE.match(voice_id):
        return "edge_tts"
    return "elevenlabs"          # proper ElevenLabs IDs


# ── Kokoro singleton (load once, reuse across requests) ───────────────────────
_kokoro_lock = threading.Lock()
_kokoro_instance = None


def _get_kokoro() -> "Kokoro | None":  # type: ignore[name-defined]
    global _kokoro_instance
    if _kokoro_instance is not None:
        return _kokoro_instance
    from pathlib import Path
    model = Path(settings.KOKORO_MODEL_PATH)
    voices = Path(settings.KOKORO_VOICES_PATH)
    if not model.exists() or not voices.exists():
        return None
    with _kokoro_lock:
        if _kokoro_instance is None:
            try:
                from kokoro_onnx import Kokoro  # type: ignore[import]
                _kokoro_instance = Kokoro(str(model), str(voices))
                log.info("kokoro.loaded", model=str(model))
            except Exception as exc:
                log.warning("kokoro.load_failed", error=str(exc))
                return None
    return _kokoro_instance


# ── Voice-name → Kokoro voice mapping ────────────────────────────────────────
# Maps the edge-tts IDs we seeded earlier to their Kokoro equivalents.
# When Kokoro models are present, Kokoro is used; edge-tts is the fallback.
_EDGE_TO_KOKORO: dict[str, str] = {
    "en-US-JennyNeural":       "af_heart",    # Emma — warm American female
    "en-GB-RyanNeural":        "bm_daniel",   # James — British male
    "en-AU-NatashaNeural":     "af_sky",      # Sophia — upbeat female
    "en-IN-PrabhatNeural":     "am_michael",  # Raj — Indian accent (closest)
    "en-GB-SoniaNeural":       "bf_emma",     # Claire — British female
    "en-US-GuyNeural":         "am_adam",     # Marcus — confident American male
    "en-US-AriaNeural":        "af_nova",     # Aiko — neutral female
    "en-CA-LiamNeural":        "am_liam",     # Leo — friendly male
    "en-US-SaraNeural":        "af_jessica",  # Isabella — energetic female
    "en-US-ChristopherNeural": "am_echo",     # David — clear neutral male
}

# Lang code: kokoro-onnx 0.5+ uses BCP-47 language tags
_KOKORO_LANG: dict[str, str] = {
    "af_": "en-us", "am_": "en-us",   # American female / male
    "bf_": "en-gb", "bm_": "en-gb",   # British female / male
}


def _kokoro_lang(voice: str) -> str:
    prefix = voice[:3]
    return _KOKORO_LANG.get(prefix, "en-us")


class TTSService:

    async def synthesize(self, voice_id: str | None, text: str) -> bytes:
        """Return raw audio bytes (WAV from Kokoro, MP3 from others)."""
        provider = _voice_provider(voice_id)

        # ElevenLabs — only when explicitly configured
        if provider == "elevenlabs" and settings.ELEVENLABS_API_KEY:
            try:
                return await self._elevenlabs(voice_id, text)  # type: ignore[arg-type]
            except Exception as exc:
                log.warning("elevenlabs.failed", error=str(exc))

        # Kokoro ONNX — self-hosted primary
        kokoro_voice = voice_id if (voice_id and _KOKORO_RE.match(voice_id)) else None
        if not kokoro_voice and voice_id:
            kokoro_voice = _EDGE_TO_KOKORO.get(voice_id)  # map edge-tts ID → kokoro
        try:
            return await self._kokoro(kokoro_voice or "af_heart", text)
        except FileNotFoundError:
            log.info("kokoro.not_installed", hint="run: python scripts/setup_models.py --tts")
        except Exception as exc:
            log.warning("kokoro.synthesis_failed", error=str(exc))

        # edge-tts — free Microsoft neural voices, no key, requires internet
        edge_voice = voice_id if (voice_id and _EDGE_TTS_RE.match(voice_id)) else "en-US-GuyNeural"
        try:
            return await self._edge_tts(edge_voice, text)
        except Exception as exc:
            log.warning("edge_tts.failed", error=str(exc))

        # gTTS — last resort
        return await self._gtts_fallback(text)

    async def synthesize_with_duration(
        self, voice_id: str | None, text: str
    ) -> Tuple[bytes, float]:
        audio = await self.synthesize(voice_id, text)
        duration = self._probe_duration(audio)
        if duration <= 0:
            words = len(text.strip().split())
            duration = max(3.0, (words / 140) * 60)
        return audio, duration

    # ── Providers ─────────────────────────────────────────────────────────────

    async def _kokoro(self, voice: str, text: str) -> bytes:
        """Self-hosted Kokoro ONNX — no API key, runs on CPU."""
        kokoro = _get_kokoro()
        if kokoro is None:
            raise FileNotFoundError("Kokoro model files not found at configured path")

        import soundfile as sf  # type: ignore[import]

        lang = _kokoro_lang(voice)
        loop = asyncio.get_running_loop()

        def _run() -> bytes:
            samples, sample_rate = kokoro.create(text, voice=voice, speed=1.0, lang=lang)
            buf = io.BytesIO()
            sf.write(buf, samples, sample_rate, format="WAV")
            return buf.getvalue()

        return await loop.run_in_executor(None, _run)

    async def _edge_tts(self, voice_name: str, text: str) -> bytes:
        """Microsoft Edge TTS — free, no key, gender + accent correct, needs internet."""
        try:
            import edge_tts  # type: ignore[import]
        except ImportError:
            raise RuntimeError("edge-tts not installed: pip install edge-tts")

        buf = io.BytesIO()

        async def _stream() -> None:
            communicate = edge_tts.Communicate(text, voice_name)
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    buf.write(chunk["data"])

        await _stream()
        audio = buf.getvalue()
        if not audio:
            raise RuntimeError(f"edge-tts returned empty audio for voice {voice_name}")
        return audio

    async def _elevenlabs(self, voice_id: str, text: str) -> bytes:
        import httpx
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "xi-api-key": settings.ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        }
        body = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
        }
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, json=body, headers=headers)
            resp.raise_for_status()
            return resp.content

    async def _gtts_fallback(self, text: str) -> bytes:
        """gTTS — last resort; female-sounding only, no accent differentiation."""
        from gtts import gTTS  # type: ignore[import]

        loop = asyncio.get_running_loop()

        def _gen() -> bytes:
            tts = gTTS(text=text, lang="en", slow=False)
            buf = io.BytesIO()
            tts.write_to_fp(buf)
            return buf.getvalue()

        return await loop.run_in_executor(None, _gen)

    def _probe_duration(self, audio_bytes: bytes) -> float:
        """Try to read actual audio duration from bytes."""
        try:
            # Try mutagen for MP3/WAV
            import mutagen  # type: ignore[import]
            buf = io.BytesIO(audio_bytes)
            f = mutagen.File(buf)
            if f and hasattr(f, "info"):
                return float(f.info.length)
        except Exception:
            pass
        try:
            # Try soundfile for WAV (from Kokoro output)
            import soundfile as sf  # type: ignore[import]
            buf = io.BytesIO(audio_bytes)
            info = sf.info(buf)
            return info.duration
        except Exception:
            pass
        return 0.0


tts_service = TTSService()
