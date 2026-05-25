from pydantic import BaseModel
from datetime import datetime


class VoiceOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    name: str
    gender: str
    accent: str
    language: str
    preview_url: str
    description: str
    is_cloneable: bool
    tags: list[str] = []


class GenerateVoiceRequest(BaseModel):
    project_id: str
    voice_id: str
    text: str


class PreviewVoiceRequest(BaseModel):
    voice_id: str
    text: str


class GeneratedAudioOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    project_id: str
    voice_id: str
    url: str
    duration: float
    created_at: datetime
