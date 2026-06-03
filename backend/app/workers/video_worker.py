"""
Video generation pipeline — plain synchronous function.
Runs directly in FastAPI BackgroundTasks (no Celery/Redis dependency).
Pipeline: download assets → compose video (FFmpeg) → upload to storage → persist DB record.
"""
import asyncio
import os
import subprocess
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import structlog

from app.core.config import get_settings
from app.core.storage import storage
from app.services.lipsync_service import lipsync_service
from app.services.video_pipeline import video_pipeline

settings = get_settings()
log = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _update_job(db, job_id: str, status: str, progress: int, current_step: str) -> None:
    from app.models.video import VideoJob
    job = db.query(VideoJob).filter(VideoJob.id == job_id).first()
    if job:
        job.status = status
        job.progress = progress
        job.current_step = current_step
        job.updated_at = datetime.now(timezone.utc)  # explicit — don't rely on ORM onupdate
        db.commit()


def _mark_failed(db, job_id: str, project_id: str, message: str) -> None:
    from app.models.project import Project
    try:
        _update_job(db, job_id, "failed", 0, f"Failed: {message[:200]}")
        project = db.query(Project).filter(Project.id == project_id).first()
        if project:
            project.status = "failed"
        db.commit()
    except Exception as db_err:
        log.error("video_job.mark_failed_db_error", job_id=job_id, error=str(db_err))


def _run_ffmpeg(*args: str) -> None:
    """Run ffmpeg with the given arguments; raise RuntimeError on failure."""
    cmd = ["ffmpeg", "-y", *args]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg error (rc={result.returncode}): {result.stderr[-500:]}")


def _compose_video(avatar_path: str, audio_path: str, output_path: str) -> None:
    """Combine a static image + audio track into a playable MP4."""
    _run_ffmpeg(
        "-loop", "1", "-i", avatar_path,
        "-i", audio_path,
        # Scale to max 720p — keeps memory and CPU low on free-tier hosts.
        # force_original_aspect_ratio=decrease preserves portrait/landscape;
        # pad fills remaining space with black bars.
        "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2",
        "-c:v", "libx264",
        "-preset", "ultrafast",   # 10-20x faster than default 'medium'
        "-tune", "stillimage",
        "-crf", "28",             # Acceptable quality, lower memory than CRF 18
        "-c:a", "aac",
        "-b:a", "128k",
        "-pix_fmt", "yuv420p",
        "-shortest",
        output_path,
    )


def _extract_thumbnail(video_path: str, thumb_path: str) -> None:
    """Extract a single frame from the video as a JPEG thumbnail."""
    try:
        _run_ffmpeg(
            "-i", video_path,
            "-ss", "00:00:01",
            "-vframes", "1",
            "-f", "image2",
            thumb_path,
        )
    except Exception as exc:
        log.warning("video_job.thumbnail_failed", error=str(exc))


def _probe_duration(video_path: str) -> float:
    """Return video duration in seconds, or 0.0 on failure."""
    try:
        import ffmpeg as ffmpeg_py
        probe = ffmpeg_py.probe(video_path)
        return float(probe["format"]["duration"])
    except Exception:
        return 0.0


# ---------------------------------------------------------------------------
# Main entry point (called directly from FastAPI BackgroundTasks)
# ---------------------------------------------------------------------------

def process_video_job(
    job_id: str,
    avatar_storage_key: str,
    audio_storage_key: str,
    resolution: str,
    project_id: str,
) -> None:
    from app.core.database import SessionLocal
    from app.models.video import VideoJob, GeneratedVideo
    from app.models.project import Project

    db = SessionLocal()

    def update(status: str, progress: int, step: str) -> None:
        _update_job(db, job_id, status, progress, step)

    try:
        update("validating", 5, "Downloading assets")
        log.info("video_job.start", job_id=job_id, resolution=resolution)

        with tempfile.TemporaryDirectory() as tmp:
            avatar_suffix = Path(avatar_storage_key).suffix or ".jpg"
            avatar_local = str(Path(tmp) / f"avatar{avatar_suffix}")
            audio_local  = str(Path(tmp) / "audio.mp3")
            output_path  = str(Path(tmp) / "output.mp4")
            thumb_path   = str(Path(tmp) / "thumb.jpg")

            # ── Download assets ──────────────────────────────────────────────
            if settings.STORAGE_BACKEND == "s3":
                import boto3
                s3 = boto3.client(
                    "s3",
                    region_name=settings.S3_REGION,
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                )
                s3.download_file(settings.S3_BUCKET_NAME, avatar_storage_key, avatar_local)
                s3.download_file(settings.S3_BUCKET_NAME, audio_storage_key, audio_local)
            else:
                src_avatar = Path(settings.LOCAL_STORAGE_PATH) / avatar_storage_key
                src_audio  = Path(settings.LOCAL_STORAGE_PATH) / audio_storage_key
                if not src_avatar.exists():
                    raise ValueError(f"Avatar not found in local storage: {avatar_storage_key}")
                if not src_audio.exists():
                    raise ValueError(f"Audio not found in local storage: {audio_storage_key}")
                shutil.copy2(src_avatar, avatar_local)
                shutil.copy2(src_audio, audio_local)

            if os.path.getsize(avatar_local) == 0:
                raise ValueError("Avatar file is empty")
            if os.path.getsize(audio_local) == 0:
                raise ValueError("Audio file is empty")

            # ── Lip-sync / compose video ─────────────────────────────────────
            # Self-hosted: Wav2Lip when WAV2LIP_PATH + WAV2LIP_CHECKPOINT are
            # set (real lip sync, runs on CPU). Falls back to SadTalker if
            # SADTALKER_MODEL_PATH exists, then to static FFmpeg composition.
            update("generating_lipsync", 40, "Generating lip sync")
            lipsync_path = str(Path(tmp) / "lipsync.mp4")
            asyncio.run(lipsync_service.generate(avatar_local, audio_local, lipsync_path))

            if not os.path.exists(lipsync_path) or os.path.getsize(lipsync_path) == 0:
                raise RuntimeError("Lip-sync produced an empty output file")

            # ── Enhancement pipeline ──────────────────────────────────────────
            # Upscale to target resolution + face-optimised sharpening +
            # color grading. This is the step that turns a blurry 720p static
            # fallback into a crisp, broadcast-quality output.
            update("exporting", 60, "Enhancing video quality")
            asyncio.run(
                video_pipeline.run(
                    lipsync_video_path=lipsync_path,
                    output_path=output_path,
                    resolution=resolution,  # type: ignore[arg-type]
                )
            )

            if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                raise RuntimeError("Enhancement pipeline produced an empty output file")

            # ── Thumbnail ─────────────────────────────────────────────────────
            update("exporting", 75, "Generating thumbnail")
            _extract_thumbnail(output_path, thumb_path)

            duration  = _probe_duration(output_path)
            file_size = os.path.getsize(output_path)

            # ── Upload to storage ─────────────────────────────────────────────
            update("exporting", 85, "Uploading to storage")
            video_key = storage.generate_key(f"videos/{project_id}", ".mp4")
            video_url = storage.save_file(output_path, video_key)

            thumb_url = ""
            if os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 0:
                thumb_key = storage.generate_key(f"thumbnails/{project_id}", ".jpg")
                thumb_url = storage.save_file(thumb_path, thumb_key)

            # ── Persist result ────────────────────────────────────────────────
            update("exporting", 95, "Saving result")

            video = GeneratedVideo(
                project_id=project_id,
                job_id=job_id,
                storage_key=video_key,
                url=video_url,
                thumbnail_url=thumb_url,
                duration=duration,
                resolution=resolution,
                file_size=file_size,
            )
            db.add(video)
            db.flush()  # get video.id without closing transaction

            job_record = db.query(VideoJob).filter(VideoJob.id == job_id).first()
            if job_record:
                job_record.video_id = video.id

            project = db.query(Project).filter(Project.id == project_id).first()
            if project:
                project.status = "completed"
                project.generated_video_id = video.id
                if thumb_url:
                    project.thumbnail_url = thumb_url

            db.commit()
            update("completed", 100, "Completed")
            log.info("video_job.complete", job_id=job_id, duration=duration, file_size=file_size)

    except Exception as exc:
        log.error("video_job.failed", job_id=job_id, error=str(exc))
        _mark_failed(db, job_id, project_id, str(exc))
    finally:
        db.close()
