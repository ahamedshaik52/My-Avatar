from pydantic import BaseModel
from datetime import datetime


class AvatarOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    user_id: str
    filename: str
    url: str
    type: str = ""
    width: int | None
    height: int | None
    duration: float | None
    created_at: datetime

    @classmethod
    def from_orm_mapped(cls, avatar):
        return cls(
            id=avatar.id,
            user_id=avatar.user_id,
            filename=avatar.filename,
            url=avatar.url,
            type=avatar.media_type,
            width=avatar.width,
            height=avatar.height,
            duration=avatar.duration,
            created_at=avatar.created_at,
        )
