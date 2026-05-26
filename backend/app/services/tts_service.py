"""
Text-to-Speech service.
Primary: ElevenLabs API (production quality).
Fallback: gTTS (free, for dev/testing).
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

# Words-per-minute estimate for duration calculation
_WPM = 140

# UUID pattern — our seeded voices use plain UUIDs, not ElevenLabs IDs
_UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE)


def _is_local_uuid(value: str) -> bool:
    """Return True if value looks like a local database UUID rather than an ElevenLabs voice ID."""
    return bool(_UUID_RE.match(value))


def _estimate_duration(text: str) -> float:
    words = len(text.strip().split())
    return max(15.0, (words / _WPM) * 60)


class TTSService:
    async def synthesize(self, voice_id: str | None, text: str) -> bytes:
        """Return raw audio bytes (MP3).

        Uses ElevenLabs only when an API key is set AND a real ElevenLabs voice_id
        is provided (not None and not a plain UUID from our local seed data).
        Falls back to gTTS otherwise.
        """
        if settings.ELEVENLABS_API_KEY and voice_id and not _is_local_uuid(voice_id):
            return await self._elevenlabs(voice_id, text)
        return await self._gtts_fallback(text)

    async def synthesize_with_duration(self, voice_id: str | None, text: str) -> Tuple[bytes, float]:
        audio = await self.synthesize(voice_id, text)
        duration = _estimate_duration(text)
        return audio, duration

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

    async def _gtts_fallback(self, text: str) -> bytes:
        """gTTS fallback — runs in thread pool to avoid blocking."""
        from gtts import gTTS

        def _gen():
            tts = gTTS(text=text, lang="en", slow=False)
            buf = io.BytesIO()
            tts.write_to_fp(buf)
            return buf.getvalue()

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _gen)


tts_service = TTSService()
