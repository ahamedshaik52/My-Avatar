"""
Text-to-Speech service.
Primary:   ElevenLabs API (production quality, requires API key + valid external_id).
Secondary: edge-tts / Microsoft Edge TTS (free, no key, gender + accent accurate).
Fallback:  gTTS (last resort — female-only, no accent differentiation).
"""
import io
import asyncio
from typing import Tuple
import httpx
import structlog
from app.core.config import get_settings

settings = get_settings()
log = structlog.get_logger(__name__)

import re

# Words-per-minute estimate for duration calculation when actual duration unavailable
_WPM = 140

# UUID pattern — our seeded voices use plain UUIDs as DB PKs, not ElevenLabs voice IDs
_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

# edge-tts voice ID pattern (e.g. "en-US-GuyNeural")
_EDGE_TTS_RE = re.compile(r"^[a-z]{2}-[A-Z]{2}-\w+Neural$")


def _is_local_uuid(value: str) -> bool:
    return bool(_UUID_RE.match(value))


def _is_edge_tts_voice(value: str) -> bool:
    return bool(_EDGE_TTS_RE.match(value))


def _estimate_duration(text: str) -> float:
    words = len(text.strip().split())
    return max(5.0, (words / _WPM) * 60)


class TTSService:
    async def synthesize(self, voice_id: str | None, text: str) -> bytes:
        """Return raw audio bytes (MP3).

        Provider selection:
        1. ElevenLabs — when API key is set AND voice_id is a real ElevenLabs ID
           (not None, not a UUID from our seed data, not an edge-tts ID).
        2. edge-tts — when voice_id is an edge-tts neural voice name
           (e.g. 'en-US-GuyNeural'). Free, no key, gender + accent accurate.
        3. gTTS — last resort fallback (female-only, no accent).
        """
        if settings.ELEVENLABS_API_KEY and voice_id and not _is_local_uuid(voice_id) and not _is_edge_tts_voice(voice_id):
            return await self._elevenlabs(voice_id, text)
        if voice_id and _is_edge_tts_voice(voice_id):
            return await self._edge_tts(voice_id, text)
        return await self._gtts_fallback(text)

    async def synthesize_with_duration(self, voice_id: str | None, text: str) -> Tuple[bytes, float]:
        audio = await self.synthesize(voice_id, text)
        duration = self._probe_duration_bytes(audio)
        if duration <= 0:
            duration = _estimate_duration(text)
        return audio, duration

    def _probe_duration_bytes(self, audio_bytes: bytes) -> float:
        """Probe actual MP3 duration from bytes via mutagen (if available)."""
        try:
            from mutagen.mp3 import MP3
            buf = io.BytesIO(audio_bytes)
            info = MP3(buf)
            return info.info.length
        except Exception:
            return 0.0

    async def _elevenlabs(self, voice_id: str, text: str) -> bytes:
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

    async def _edge_tts(self, voice_name: str, text: str) -> bytes:
        """Generate audio using Microsoft Edge TTS (free, no API key required).

        Supports gender- and accent-correct neural voices:
        Male:   en-US-GuyNeural, en-GB-RyanNeural, en-AU-WilliamNeural, etc.
        Female: en-US-JennyNeural, en-GB-SoniaNeural, en-AU-NatashaNeural, etc.
        """
        try:
            import edge_tts

            buf = io.BytesIO()

            async def _stream() -> None:
                communicate = edge_tts.Communicate(text, voice_name)
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        buf.write(chunk["data"])

            await _stream()
            audio = buf.getvalue()
            if audio:
                return audio
            log.warning("edge_tts.empty_response", voice=voice_name)
        except ImportError:
            log.warning("edge_tts.not_installed", hint="pip install edge-tts")
        except Exception as exc:
            log.warning("edge_tts.failed", voice=voice_name, error=str(exc))

        # Fall through to gTTS if edge-tts is unavailable or fails
        return await self._gtts_fallback(text)

    async def _gtts_fallback(self, text: str) -> bytes:
        """gTTS fallback — runs in thread pool to avoid blocking the event loop.
        NOTE: gTTS has no gender parameter and always sounds female."""
        from gtts import gTTS

        def _gen() -> bytes:
            tts = gTTS(text=text, lang="en", slow=False)
            buf = io.BytesIO()
            tts.write_to_fp(buf)
            return buf.getvalue()

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _gen)


tts_service = TTSService()
