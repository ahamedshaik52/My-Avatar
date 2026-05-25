from pydantic import BaseModel
from datetime import datetime


class ProjectCreate(BaseModel):
    title: str


class ProjectOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    user_id: str
    title: str
    status: str
    avatar_id: str | None
    script_id: str | None
    voice_id: str | None
    generated_video_id: str | None
    thumbnail_url: str | None
    created_at: datetime
    updated_at: datetime


class PaginatedProjects(BaseModel):
    items: list[ProjectOut]
    total: int
    page: int
    limit: int
    has_next: bool
