from pydantic import BaseModel
from datetime import datetime


class ScriptOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    project_id: str
    content: str
    language: str
    word_count: int
    estimated_duration: float
    created_at: datetime
