import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(
        SAEnum("draft", "processing", "completed", "failed", name="project_status"),
        default="draft",
        nullable=False,
    )
    avatar_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    script_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    voice_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    generated_video_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", back_populates="projects")
    video_jobs = relationship("VideoJob", back_populates="project", cascade="all, delete-orphan")
