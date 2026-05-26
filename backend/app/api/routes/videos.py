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


def _run_video_job_background(
    job_id: str,
    avatar_storage_key: str,
    audio_storage_key: str,
    resolution: str,
    project_id: str,
) -> None:
    """Run the video pipeline in a FastAPI background thread (no Celery/Redis needed)."""
    try:
        from app.workers.video_worker import process_video_job
        # Call the task function directly (bypasses the broker, runs in-process)
        process_video_job(
            job_id=job_id,
            avatar_storage_key=avatar_storage_key,
            audio_storage_key=audio_storage_key,
            resolution=resolution,
            project_id=project_id,
        )
    except Exception as exc:
        log.error("video_job.background_failed", job_id=job_id, error=str(exc))


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

    # Create job record — returned immediately so the client can poll status
    job = VideoJob(project_id=payload.project_id, status="queued", progress=0, current_step="Queued")
    db.add(job)
    project.status = "processing"
    db.commit()
    db.refresh(job)

    # Dispatch in-process background task (no Redis/Celery dependency)
    background_tasks.add_task(
        _run_video_job_background,
        job_id=job.id,
        avatar_storage_key=avatar.storage_key,
        audio_storage_key=audio.storage_key,
        resolution=payload.resolution,
        project_id=payload.project_id,
    )

    log.info("video_job.queued", job_id=job.id, project_id=payload.project_id)
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
