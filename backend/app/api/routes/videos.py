import asyncio
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.security import get_current_user
from app.core.storage import storage
from app.models.user import User
from app.models.project import Project
from app.models.avatar import Avatar
from app.models.voice import GeneratedAudio
from app.models.video import VideoJob, GeneratedVideo, DownloadHistory
from app.schemas.video import GenerateVideoRequest, VideoJobOut, GeneratedVideoOut, DownloadUrlOut
import structlog

log = structlog.get_logger(__name__)

router = APIRouter(prefix="/video", tags=["video"])


def _dispatch_celery(job_id: str, avatar_key: str, audio_key: str, resolution: str, project_id: str) -> str | None:
    """Try to dispatch via Celery. Returns task_id or None if broker unavailable."""
    try:
        from app.workers.video_worker import process_video_job
        task = process_video_job.delay(
            job_id=job_id,
            avatar_storage_key=avatar_key,
            audio_storage_key=audio_key,
            resolution=resolution,
            project_id=project_id,
        )
        return task.id
    except Exception as exc:
        log.warning("celery.dispatch_failed", job_id=job_id, error=str(exc))
        return None


def _run_video_job_background(
    job_id: str, avatar_key: str, audio_key: str, resolution: str, project_id: str
) -> None:
    """In-process fallback: run the video pipeline when Celery broker is unavailable."""
    try:
        from app.workers.video_worker import process_video_job
        process_video_job(
            job_id=job_id,
            avatar_storage_key=avatar_key,
            audio_storage_key=audio_key,
            resolution=resolution,
            project_id=project_id,
        )
    except Exception as exc:
        log.error("video_job.inline_failed", job_id=job_id, error=str(exc))


@router.post("/generate", response_model=VideoJobOut, status_code=202)
@limiter.limit("10/minute")
async def generate_video(
    request: Request,
    payload: GenerateVideoRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == payload.project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    avatar = db.query(Avatar).filter(Avatar.id == payload.avatar_id, Avatar.user_id == current_user.id).first()
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")

    # Scope by project ownership to prevent IDOR
    audio = (
        db.query(GeneratedAudio)
        .join(Project, GeneratedAudio.project_id == Project.id)
        .filter(GeneratedAudio.id == payload.audio_id, Project.user_id == current_user.id)
        .first()
    )
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")

    # Create job record
    job = VideoJob(project_id=payload.project_id, status="queued", progress=0, current_step="Queued")
    db.add(job)
    project.status = "processing"
    db.commit()
    db.refresh(job)

    job_id = job.id
    avatar_key = avatar.storage_key
    audio_key = audio.storage_key

    # Try Celery (with a 5-second timeout); fall back to in-process BackgroundTask
    try:
        loop = asyncio.get_event_loop()
        task_id = await asyncio.wait_for(
            loop.run_in_executor(None, _dispatch_celery, job_id, avatar_key, audio_key, payload.resolution, payload.project_id),
            timeout=5.0,
        )
    except asyncio.TimeoutError:
        task_id = None
        log.warning("celery.dispatch_timeout", job_id=job_id)

    if task_id:
        job.celery_task_id = task_id
        db.commit()
        db.refresh(job)
    else:
        # Celery unavailable — process video in FastAPI background task
        log.info("video_job.using_background_task", job_id=job_id)
        background_tasks.add_task(
            _run_video_job_background,
            job_id=job_id,
            avatar_key=avatar_key,
            audio_key=audio_key,
            resolution=payload.resolution,
            project_id=payload.project_id,
        )
        db.refresh(job)

    return job


@router.get("/status/{job_id}", response_model=VideoJobOut)
def get_job_status(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = (
        db.query(VideoJob)
        .join(Project, VideoJob.project_id == Project.id)
        .filter(VideoJob.id == job_id, Project.user_id == current_user.id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/{video_id}", response_model=GeneratedVideoOut)
def get_video(
    video_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    video = (
        db.query(GeneratedVideo)
        .join(Project, GeneratedVideo.project_id == Project.id)
        .filter(GeneratedVideo.id == video_id, Project.user_id == current_user.id)
        .first()
    )
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    return GeneratedVideoOut(
        id=video.id,
        project_id=video.project_id,
        job_id=video.job_id,
        url=video.url,
        download_url=storage.get_signed_url(video.storage_key),
        thumbnail_url=video.thumbnail_url,
        duration=video.duration,
        resolution=video.resolution,
        file_size=video.file_size,
        created_at=video.created_at,
    )


@router.get("/download/{video_id}", response_model=DownloadUrlOut)
def get_download_url(
    video_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    video = (
        db.query(GeneratedVideo)
        .join(Project, GeneratedVideo.project_id == Project.id)
        .filter(GeneratedVideo.id == video_id, Project.user_id == current_user.id)
        .first()
    )
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    signed_url = storage.get_signed_url(video.storage_key, expires=3600)

    db.add(DownloadHistory(user_id=current_user.id, video_id=video.id))
    db.commit()

    return DownloadUrlOut(
        url=signed_url,
        expires_at=(datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
    )
