"""
Full video enhancement pipeline:
lipsync → frame interpolation → 4K upscale → color grading
→ noise cleanup → final MP4 export.
"""
import asyncio
import shutil
import tempfile
from pathlib import Path
from typing import Literal
import structlog
import ffmpeg

log = structlog.get_logger(__name__)

Resolution = Literal["1080p", "2k", "4k"]

_RESOLUTION_MAP: dict[Resolution, tuple[int, int]] = {
    "1080p": (1920, 1080),
    "2k": (2560, 1440),
    "4k": (3840, 2160),
}


class VideoPipeline:
    async def run(
        self,
        lipsync_video_path: str,
        output_path: str,
        resolution: Resolution = "1080p",
        min_duration: float = 15.0,
    ) -> str:
        """
        Apply the full enhancement pipeline and return final MP4 path.
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self._run_sync,
            lipsync_video_path,
            output_path,
            resolution,
            min_duration,
        )

    def _run_sync(
        self,
        src: str,
        dst: str,
        resolution: Resolution,
        min_duration: float,
    ) -> str:
        with tempfile.TemporaryDirectory() as tmp:
            current = src

            # 1. Ensure minimum duration via loop/pad
            current = self._ensure_duration(current, min_duration, tmp)

            # 2. Frame interpolation (2x via minterpolate)
            current = self._interpolate_frames(current, tmp)

            # 3. Upscale to target resolution
            target_w, target_h = _RESOLUTION_MAP[resolution]
            current = self._upscale(current, target_w, target_h, tmp)

            # 4. Color grading + sharpness + noise cleanup (single ffmpeg pass)
            current = self._enhance(current, tmp)

            # 5. Final export
            self._final_export(current, dst)

        return dst

    def _ensure_duration(self, src: str, min_dur: float, tmp: str) -> str:
        probe = ffmpeg.probe(src)
        actual = float(probe["format"]["duration"])
        if actual >= min_dur:
            return src

        out = str(Path(tmp) / "padded.mp4")
        loops = int(min_dur / actual) + 1
        (
            ffmpeg.input(src, stream_loop=loops)
            .output(out, t=min_dur, vcodec="libx264", acodec="aac", pix_fmt="yuv420p")
            .overwrite_output()
            .run(quiet=True)
        )
        return out

    def _interpolate_frames(self, src: str, tmp: str) -> str:
        out = str(Path(tmp) / "interpolated.mp4")
        probe = ffmpeg.probe(src)
        fps_str = probe["streams"][0].get("r_frame_rate", "25/1")
        num, den = fps_str.split("/")
        target_fps = int(int(num) / int(den)) * 2  # 2x frame rate

        (
            ffmpeg.input(src)
            .video.filter("minterpolate", fps=target_fps, mi_mode="mci")
            .output(
                ffmpeg.input(src).audio,
                out,
                vcodec="libx264",
                acodec="copy",
                pix_fmt="yuv420p",
                preset="fast",
            )
            .overwrite_output()
            .run(quiet=True)
        )
        return out

    def _upscale(self, src: str, w: int, h: int, tmp: str) -> str:
        out = str(Path(tmp) / "upscaled.mp4")
        (
            ffmpeg.input(src)
            .video.filter("scale", w, h, flags="lanczos")
            .output(
                ffmpeg.input(src).audio,
                out,
                vcodec="libx264",
                acodec="copy",
                pix_fmt="yuv420p",
                crf=18,
                preset="medium",
            )
            .overwrite_output()
            .run(quiet=True)
        )
        return out

    def _enhance(self, src: str, tmp: str) -> str:
        """
        Apply cinematic color grading, sharpness, and noise reduction in one pass.
        Filters:
          - unsharp: sharpen edges
          - eq: boost contrast & saturation (cinematic look)
          - hqdn3d: temporal + spatial noise reduction
        """
        out = str(Path(tmp) / "enhanced.mp4")
        (
            ffmpeg.input(src)
            .video.filter("unsharp", lx=5, ly=5, la=0.8)
            .filter("eq", contrast=1.1, brightness=0.02, saturation=1.15)
            .filter("hqdn3d", luma_spatial=3, chroma_spatial=3)
            .output(
                ffmpeg.input(src).audio,
                out,
                vcodec="libx264",
                acodec="copy",
                pix_fmt="yuv420p",
                crf=16,
                preset="medium",
            )
            .overwrite_output()
            .run(quiet=True)
        )
        return out

    def _final_export(self, src: str, dst: str) -> None:
        """Re-mux to ensure clean container and normalized audio."""
        (
            ffmpeg.input(src)
            .output(
                dst,
                vcodec="libx264",
                acodec="aac",
                audio_bitrate="192k",
                pix_fmt="yuv420p",
                movflags="+faststart",
                crf=16,
            )
            .overwrite_output()
            .run(quiet=True)
        )


video_pipeline = VideoPipeline()
