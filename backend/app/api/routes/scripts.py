from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.script import Script
from app.models.project import Project
from datetime import datetime, timezone

router = APIRouter(prefix="/script", tags=["script"])


class SaveScriptRequest(BaseModel):
    project_id: str
    content: str
    language: str = "en"


class ScriptOut(BaseModel):
    model_config = {"from_attributes": True}
    id: str
    project_id: str
    content: str
    language: str
    word_count: int
    estimated_duration: float
    created_at: datetime


@router.post("/save", response_model=ScriptOut)
def save_script(
    payload: SaveScriptRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == payload.project_id, Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Script cannot be empty")

    words = len(content.split())
    duration = max(15.0, (words / 140) * 60)

    script = Script(
        project_id=payload.project_id,
        content=content,
        language=payload.language,
        word_count=words,
        estimated_duration=duration,
    )
    db.add(script)
    project.script_id = script.id
    db.commit()
    db.refresh(script)
    return script


@router.get("/{script_id}", response_model=ScriptOut)
def get_script(
    script_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    script = (
        db.query(Script)
        .join(Project, Script.project_id == Project.id)
        .filter(Script.id == script_id, Project.user_id == current_user.id)
        .first()
    )
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    return script
