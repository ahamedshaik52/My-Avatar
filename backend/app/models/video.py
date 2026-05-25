import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Integer, Float, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class VideoJob(Base):
    __tablename__ = "video_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        SAEnum(
            "queued", "validating", "generating_audio", "normalizing_audio",
            "generating_lipsync", "interpolating_frames", "upscaling",
            "color_grading", "noise_cleanup", "exporting", "completed", "failed",
            name="job_step",
        ),
        default="queued",
        nullable=False,
    )
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_step: Mapped[str] = mapped_column(String(100), default="Queued", nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    project = relationship("Project", back_populates="video_jobs")


class GeneratedVideo(Base):
    __tablename__ = "generated_videos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("video_jobs.id"), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(1000), nullable=False)
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    thumbnail_url: Mapped[str] = mapped_column(String(1000), nullable=False, default="")
    duration: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    resolution: Mapped[str] = mapped_column(
        SAEnum("1080p", "2k", "4k", name="video_resolution"),
        default="1080p",
        nullable=False,
    )
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class DownloadHistory(Base):
    __tablename__ = "download_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    video_id: Mapped[str] = mapped_column(String(36), ForeignKey("generated_videos.id", ondelete="CASCADE"), nullable=False)
    downloaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
