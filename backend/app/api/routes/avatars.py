import os
import re
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.storage import storage
from app.core.config import get_settings
from app.models.user import User
from app.models.avatar import Avatar
from app.schemas.avatar import AvatarOut

settings = get_settings()
router = APIRouter(prefix="/avatar", tags=["avatar"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm"}
MAX_BYTES = settings.MAX_AVATAR_SIZE_MB * 1024 * 1024

# Allowed extension-to-content-type map (double-check content_type against ext to resist spoofing)
_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov", ".webm"}


def _safe_filename(raw: str | None) -> str:
    """Return a sanitized basename with only alphanumeric, dash, underscore, and dot characters."""
    if not raw:
        return "upload"
    # Take basename only — prevents path traversal
    base = Path(raw).name
    # Strip everything that isn't alphanumeric, dot, dash, or underscore
    safe = re.sub(r"[^\w.\-]", "_", base)
    # Truncate to a sane length
    return safe[:120] or "upload"


@router.post("/upload", response_model=AvatarOut)
async def upload_avatar(
    project_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    # Sanitize before any use — prevents path traversal and stored XSS
    safe_name = _safe_filename(file.filename)
    ext = Path(safe_name).suffix.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        ext = ".jpg" if file.content_type in ALLOWED_IMAGE_TYPES else ".mp4"

    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.MAX_AVATAR_SIZE_MB}MB limit")

    storage_key = storage.generate_key(f"avatars/{current_user.id}", ext)
    url = storage.save(storage_key, content, file.content_type)

    media_type = "image" if file.content_type in ALLOWED_IMAGE_TYPES else "video"

    avatar = Avatar(
        user_id=current_user.id,
        project_id=project_id,
        filename=safe_name,
        storage_key=storage_key,
        url=url,
        media_type=media_type,
        file_size=len(content),
    )
    db.add(avatar)
    db.commit()
    db.refresh(avatar)
    return AvatarOut.from_orm_mapped(avatar)


@router.get("/{avatar_id}", response_model=AvatarOut)
def get_avatar(
    avatar_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    avatar = db.query(Avatar).filter(Avatar.id == avatar_id, Avatar.user_id == current_user.id).first()
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")
    return AvatarOut.from_orm_mapped(avatar)
