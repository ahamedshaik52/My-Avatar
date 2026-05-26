from pydantic import BaseModel
from datetime import datetime
from typing import Literal


class GenerateVideoRequest(BaseModel):
    project_id: str
    avatar_id: str
    audio_id: str
    resolution: Literal["1080p", "2k", "4k"] = "1080p"


class VideoJobOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    project_id: str
    status: str
    progress: int
    current_step: str
    error_message: str | None
    video_id: str | None = None
    created_at: datetime
    updated_at: datetime


class GeneratedVideoOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    project_id: str
    job_id: str
    url: str
    download_url: str = ""
    thumbnail_url: str
    duration: float
    resolution: str
    file_size: int
    created_at: datetime


class DownloadUrlOut(BaseModel):
    url: str
    expires_at: str
