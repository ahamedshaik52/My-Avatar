from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.storage import storage
from app.models.user import User
from app.models.project import Project
from app.models.avatar import Avatar
from app.models.voice import GeneratedAudio
from app.models.video import VideoJob, GeneratedVideo, DownloadHistory
from app.schemas.video import GenerateVideoRequest, VideoJobOut, GeneratedVideoOut, DownloadUrlOut
from app.workers.video_worker import process_video_job

router = APIRouter(prefix="/video", tags=["video"])


@router.post("/generate", response_model=VideoJobOut, status_code=202)
def generate_video(
    payload: GenerateVideoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == payload.project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    avatar = db.query(Avatar).filter(Avatar.id == payload.avatar_id, Avatar.user_id == current_user.id).first()
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")

    # Scope by project ownership to prevent IDOR — audio must belong to a project the user owns
    audio = (
        db.query(GeneratedAudio)
        .join(Project, GeneratedAudio.project_id == Project.id)
        .filter(GeneratedAudio.id == payload.audio_id, Project.user_id == current_user.id)
        .first()
    )
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")

    # Create job
    job = VideoJob(project_id=payload.project_id, status="queued", progress=0, current_step="Queued")
    db.add(job)
    project.status = "processing"
    db.commit()
    db.refresh(job)

    # Dispatch celery task
    task = process_video_job.delay(
        job_id=job.id,
        avatar_storage_key=avatar.storage_key,
        audio_storage_key=audio.storage_key,
        resolution=payload.resolution,
        project_id=payload.project_id,
    )
    job.celery_task_id = task.id
    db.commit()
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
