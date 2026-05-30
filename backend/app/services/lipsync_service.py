"""
Lip-sync video generation — fully self-hosted, no paid API required.

Provider priority:
  1. Wav2Lip    — self-hosted, open-source, runs on CPU (~60-120s/10s video).
                  Personal/non-commercial use. Install with:
                  python backend/scripts/setup_models.py --lipsync
  2. SadTalker  — self-hosted, Apache-2.0, full head motion + expressions.
                  Slower on CPU. Install with:
                  python backend/scripts/setup_models.py --sadtalker
  3. Static     — plain FFmpeg: image + audio → MP4 (no motion). Always available.
"""
from __future__ import annotations

import asyncio
import shutil
import subprocess
import sys
from pathlib import Path

import structlog

from app.core.config import get_settings

settings = get_settings()
log = structlog.get_logger(__name__)


class LipSyncService:

    async def generate(
        self,
        avatar_path: str,
        audio_path: str,
        output_path: str,
    ) -> str:
        """Generate a video of the avatar speaking the audio.

        Returns the path to the output MP4.
        Tries self-hosted models first; falls back to static image + audio.
        """
        # 1. Wav2Lip — self-hosted, no API key needed
        wav2lip_dir = Path(settings.WAV2LIP_PATH)
        wav2lip_ckpt = Path(settings.WAV2LIP_CHECKPOINT)
        if wav2lip_dir.exists() and wav2lip_ckpt.exists():
            try:
                log.info("lipsync.wav2lip_start")
                result = await self._wav2lip(avatar_path, audio_path, output_path)
                log.info("lipsync.wav2lip_done")
                return result
            except Exception as exc:
                log.warning("lipsync.wav2lip_failed", error=str(exc))

        # 2. SadTalker — self-hosted, Apache-2.0
        sadtalker_dir = Path(settings.SADTALKER_MODEL_PATH)
        if sadtalker_dir.exists():
            try:
                log.info("lipsync.sadtalker_start")
                result = await self._sadtalker(avatar_path, audio_path, output_path)
                log.info("lipsync.sadtalker_done")
                return result
            except Exception as exc:
                log.warning("lipsync.sadtalker_failed", error=str(exc))

        # 3. Static fallback — always works
        log.info(
            "lipsync.static_fallback",
            hint="Install Wav2Lip for real lip sync: python scripts/setup_models.py --lipsync",
        )
        return await self._ffmpeg_static(avatar_path, audio_path, output_path)

    # ── Wav2Lip ───────────────────────────────────────────────────────────────

    async def _wav2lip(
        self, avatar_path: str, audio_path: str, output_path: str
    ) -> str:
        """Run Wav2Lip inference via subprocess.

        Wav2Lip produces a video where the mouth region is animated to match
        the audio. Works on CPU (no GPU required).

        Setup: python backend/scripts/setup_models.py --lipsync
        Repo:  https://github.com/Rudrabha/Wav2Lip
        """
        wav2lip_dir = Path(settings.WAV2LIP_PATH)
        checkpoint = Path(settings.WAV2LIP_CHECKPOINT)

        # Convert audio to 16kHz WAV — Wav2Lip works best with WAV input
        wav_path = await self._to_wav(audio_path)

        cmd = [
            sys.executable,
            str(wav2lip_dir / "inference.py"),
            "--checkpoint_path", str(checkpoint),
            "--face", str(avatar_path),
            "--audio", wav_path,
            "--outfile", str(output_path),
            "--nosmooth",
            "--resize_factor", "1",
            "--pads", "0", "10", "0", "0",  # top/bottom/left/right chin padding
        ]

        loop = asyncio.get_running_loop()
        proc = await loop.run_in_executor(
            None,
            lambda: subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=600,      # 10-minute timeout for long videos
                cwd=str(wav2lip_dir),
            ),
        )

        if proc.returncode != 0:
            raise RuntimeError(
                f"Wav2Lip exited {proc.returncode}:\n{proc.stderr[-800:]}"
            )

        # Wav2Lip may write to results/result_voice.mp4 relative to cwd
        default = wav2lip_dir / "results" / "result_voice.mp4"
        if not Path(output_path).exists() and default.exists():
            shutil.move(str(default), output_path)

        if not Path(output_path).exists():
            raise RuntimeError("Wav2Lip produced no output file")

        return output_path

    # ── SadTalker ─────────────────────────────────────────────────────────────

    async def _sadtalker(
        self, avatar_path: str, audio_path: str, output_path: str
    ) -> str:
        """Run SadTalker — full head motion + expressions, Apache-2.0.

        Setup: python backend/scripts/setup_models.py --sadtalker
        Repo:  https://github.com/OpenTalker/SadTalker
        """
        sadtalker_dir = Path(settings.SADTALKER_MODEL_PATH)
        out_dir = Path(output_path).parent

        cmd = [
            sys.executable,
            str(sadtalker_dir / "inference.py"),
            "--driven_audio", str(audio_path),
            "--source_image", str(avatar_path),
            "--result_dir", str(out_dir),
            "--still",          # minimal head motion for portrait photos
            "--preprocess", "full",
            "--cpu",            # force CPU mode (no GPU required)
        ]

        loop = asyncio.get_running_loop()
        proc = await loop.run_in_executor(
            None,
            lambda: subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=1800,   # SadTalker is slower — 30-minute timeout
                cwd=str(sadtalker_dir),
            ),
        )

        if proc.returncode != 0:
            raise RuntimeError(
                f"SadTalker exited {proc.returncode}:\n{proc.stderr[-800:]}"
            )

        # SadTalker names output with the source image stem + timestamp
        candidates = sorted(out_dir.glob("*.mp4"), key=lambda p: p.stat().st_mtime, reverse=True)
        if not candidates:
            raise RuntimeError("SadTalker produced no output .mp4")

        if str(candidates[0]) != output_path:
            shutil.move(str(candidates[0]), output_path)

        return output_path

    # ── Static FFmpeg fallback ─────────────────────────────────────────────────

    async def _ffmpeg_static(
        self, avatar_path: str, audio_path: str, output_path: str
    ) -> str:
        """Compose a static image + audio into MP4 (no motion, no lip sync).

        Always available fallback. Install Wav2Lip for talking-avatar output.
        """
        loop = asyncio.get_running_loop()

        def _run() -> str:
            subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-loop", "1", "-i", avatar_path,
                    "-i", audio_path,
                    "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,"
                           "pad=1280:720:(ow-iw)/2:(oh-ih)/2",
                    "-c:v", "libx264",
                    "-preset", "ultrafast",
                    "-tune", "stillimage",
                    "-crf", "28",
                    "-c:a", "aac",
                    "-b:a", "128k",
                    "-pix_fmt", "yuv420p",
                    "-shortest",
                    output_path,
                ],
                capture_output=True,
                check=True,
                timeout=300,
            )
            return output_path

        return await loop.run_in_executor(None, _run)

    # ── Utility ───────────────────────────────────────────────────────────────

    async def _to_wav(self, audio_path: str) -> str:
        """Convert any audio to 16 kHz mono WAV — the format Wav2Lip expects."""
        if audio_path.endswith("_16k.wav"):
            return audio_path

        wav_path = audio_path.rsplit(".", 1)[0] + "_16k.wav"
        loop = asyncio.get_running_loop()

        def _run() -> str:
            subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-i", audio_path,
                    "-ar", "16000",   # 16 kHz
                    "-ac", "1",       # mono
                    wav_path,
                ],
                capture_output=True,
                check=True,
                timeout=60,
            )
            return wav_path

        return await loop.run_in_executor(None, _run)


lipsync_service = LipSyncService()
