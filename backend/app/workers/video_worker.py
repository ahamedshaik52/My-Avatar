"""
Celery task: full video generation pipeline.
Steps mirror the 19-step workflow spec.

Design notes:
- All async service calls are wrapped with _run_sync() so they execute safely
  in the Celery worker thread without creating nested event loops.
- Non-retryable errors (bad input, missing file) are caught explicitly and
  stored as FAILED without consuming retry budget.
"""
import os
import tempfile
import asyncio
import shutil
from pathlib import Path
from celery import Task
from app.workers.celery_app import celery_app
from app.core.config import get_settings
from app.core.storage import storage
import structlog

settings = get_settings()
log = structlog.get_logger(__name__)

# Errors that indicate bad caller input — retrying won't help
_NON_RETRYABLE = (ValueError, FileNotFoundError, TypeError, PermissionError)


def _run_sync(coro):
    """Run an async coroutine from a synchronous Celery worker thread."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _update_job(db, job_id: str, status: str, progress: int, current_step: str) -> None:
    from app.models.video import VideoJob
    job = db.query(VideoJob).filter(VideoJob.id == job_id).first()
    if job:
        job.status = status
        job.progress = progress
        job.current_step = current_step
        db.commit()


def _mark_failed(db, job_id: str, project_id: str, message: str) -> None:
    """Persist failure state; swallows secondary DB errors to avoid masking original."""
    from app.models.project import Project
    try:
        _update_job(db, job_id, "failed", 0, f"Failed: {message[:200]}")
        project = db.query(Project).filter(Project.id == project_id).first()
        if project:
            project.status = "failed"
        db.commit()
    except Exception as db_err:
        log.error("video_job.mark_failed_db_error", job_id=job_id, error=str(db_err))


@celery_app.task(bind=True, max_retries=2, default_retry_delay=30)
def process_video_job(
    self: Task,
    job_id: str,
    avatar_storage_key: str,
    audio_storage_key: str,
    resolution: str,
    project_id: str,
):
    from app.core.database import SessionLocal
    from app.models.video import VideoJob, GeneratedVideo
    from app.models.project import Project
    from app.services.lipsync_service import lipsync_service
    from app.services.video_pipeline import video_pipeline

    db = SessionLocal()

    def update(status: str, progress: int, step: str) -> None:
        _update_job(db, job_id, status, progress, step)

    try:
        update("validating", 5, "Validating inputs")
        log.info("video_job.start", job_id=job_id, resolution=resolution)

        with tempfile.TemporaryDirectory() as tmp:
            # Download avatar and audio from storage
            update("validating", 10, "Downloading assets")
            avatar_suffix = Path(avatar_storage_key).suffix or ".jpg"
            avatar_local = str(Path(tmp) / f"avatar{avatar_suffix}")
            audio_local = str(Path(tmp) / "audio.mp3")

            if settings.STORAGE_BACKEND == "local":
                shutil.copy2(Path(settings.LOCAL_STORAGE_PATH) / avatar_storage_key, avatar_local)
                shutil.copy2(Path(settings.LOCAL_STORAGE_PATH) / audio_storage_key, audio_local)
            else:
                import boto3
                s3 = boto3.client("s3", region_name=settings.S3_REGION)
                s3.download_file(settings.S3_BUCKET_NAME, avatar_storage_key, avatar_local)
                s3.download_file(settings.S3_BUCKET_NAME, audio_storage_key, audio_local)

            # Validate downloaded files before processing
            if not os.path.exists(avatar_local) or os.path.getsize(avatar_local) == 0:
                raise ValueError(f"Downloaded avatar is empty: {avatar_storage_key}")
            if not os.path.exists(audio_local) or os.path.getsize(audio_local) == 0:
                raise ValueError(f"Downloaded audio is empty: {audio_storage_key}")

            # Step 4-5: Normalize audio
            update("normalizing_audio", 20, "Normalizing audio")
            normalized_audio = str(Path(tmp) / "normalized.mp3")
            _normalize_audio(audio_local, normalized_audio)

            # Step 6: Lip-sync generation (async → sync wrapper)
            update("generating_lipsync", 35, "Rendering lip sync")
            lipsync_output = str(Path(tmp) / "lipsync.mp4")
            _run_sync(lipsync_service.generate(avatar_local, normalized_audio, lipsync_output))

            # Step 7-16: Full enhancement pipeline (async → sync wrapper)
            update("interpolating_frames", 50, "Frame interpolation")
            final_output = str(Path(tmp) / "final.mp4")
            _run_sync(
                video_pipeline.run(
                    lipsync_output, final_output,
                    resolution=resolution, min_duration=15.0,
                )
            )

            # Probe final video
            import ffmpeg as ffmpeg_py
            probe = ffmpeg_py.probe(final_output)
            duration = float(probe["format"]["duration"])
            file_size = os.path.getsize(final_output)

            # Step 17: Save to storage
            update("exporting", 90, "Uploading to storage")
            video_key = storage.generate_key(f"videos/{project_id}", ".mp4")
            video_url = storage.save_file(final_output, video_key)

            # Generate thumbnail
            thumb_key = storage.generate_key(f"thumbnails/{project_id}", ".jpg")
            thumb_local = str(Path(tmp) / "thumb.jpg")
            _extract_thumbnail(final_output, thumb_local)
            thumb_url = storage.save_file(thumb_local, thumb_key)

            # Step 18-19: Persist result
            update("completed", 100, "Completed")

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

            # Link completed video back to the job so the frontend can fetch it
            job_record = db.query(VideoJob).filter(VideoJob.id == job_id).first()
            if job_record:
                job_record.video_id = video.id

            project = db.query(Project).filter(Project.id == project_id).first()
            if project:
                project.status = "completed"
                project.generated_video_id = video.id
                project.thumbnail_url = thumb_url

            db.commit()
            log.info("video_job.complete", job_id=job_id, duration=duration)

    except _NON_RETRYABLE as exc:
        # Bad input — retrying won't fix it; store failure and return
        log.error("video_job.non_retryable_failure", job_id=job_id, error=str(exc))
        _mark_failed(db, job_id, project_id, str(exc))

    except Exception as exc:
        log.error("video_job.transient_failure", job_id=job_id, error=str(exc))
        _mark_failed(db, job_id, project_id, str(exc))
        raise self.retry(exc=exc)

    finally:
        db.close()


def _normalize_audio(src: str, dst: str) -> None:
    import ffmpeg
    (
        ffmpeg.input(src)
        .output(dst, af="loudnorm=I=-16:TP=-1.5:LRA=11", acodec="libmp3lame", audio_bitrate="192k")
        .overwrite_output()
        .run(quiet=True)
    )


def _extract_thumbnail(video_path: str, thumb_path: str, time: float = 1.0) -> None:
    import ffmpeg
    (
        ffmpeg.input(video_path, ss=time)
        .output(thumb_path, vframes=1, format="image2", vcodec="mjpeg")
        .overwrite_output()
        .run(quiet=True)
    )
