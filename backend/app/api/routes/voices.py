from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.security import get_current_user
from app.core.storage import storage
from app.core.config import get_settings
from app.models.user import User
from app.models.voice import Voice, GeneratedAudio, VoiceSample
from app.schemas.voice import VoiceOut, GenerateVoiceRequest, PreviewVoiceRequest, GeneratedAudioOut
from app.services.tts_service import tts_service

settings = get_settings()
router = APIRouter(prefix="/voices", tags=["voices"])


@router.get("", response_model=list[VoiceOut])
def list_voices(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    voices = db.query(Voice).filter(Voice.is_active == True).order_by(Voice.name).all()
    return [
        VoiceOut(
            id=v.id, name=v.name, gender=v.gender, accent=v.accent,
            language=v.language, preview_url=v.preview_url,
            description=v.description, is_cloneable=v.is_cloneable,
        )
        for v in voices
    ]


@router.post("/preview")
@limiter.limit("10/minute")
async def preview_voice(request: Request, payload: PreviewVoiceRequest, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    voice = db.query(Voice).filter(Voice.id == payload.voice_id, Voice.is_active == True).first()
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")

    preview_text = (payload.text or "Hello! This is a preview of my voice.")[:200]
    try:
        audio_bytes = await tts_service.synthesize(voice.external_id or voice.id, preview_text)
        key = storage.generate_key("previews", ".mp3")
        url = storage.save(key, audio_bytes, "audio/mpeg")
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice preview failed: {str(e)}")


@router.post("/generate", response_model=GeneratedAudioOut)
@limiter.limit("10/minute")
async def generate_voice(
    request: Request,
    payload: GenerateVoiceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    voice = db.query(Voice).filter(Voice.id == payload.voice_id, Voice.is_active == True).first()
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")

    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        audio_bytes, duration = await tts_service.synthesize_with_duration(
            voice.external_id or voice.id, payload.text
        )
        key = storage.generate_key(f"audio/{current_user.id}", ".mp3")
        url = storage.save(key, audio_bytes, "audio/mpeg")

        audio = GeneratedAudio(
            project_id=payload.project_id,
            voice_id=payload.voice_id,
            storage_key=key,
            url=url,
            duration=duration,
            file_size=len(audio_bytes),
        )
        db.add(audio)
        db.commit()
        db.refresh(audio)
        return audio
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio generation failed: {str(e)}")


@router.post("/upload-sample")
async def upload_voice_sample(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed = {"audio/mpeg", "audio/wav", "audio/ogg", "audio/flac", "audio/mp4"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported audio format")

    content = await file.read()
    max_bytes = settings.MAX_AUDIO_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.MAX_AUDIO_SIZE_MB}MB limit")

    ext = Path(file.filename or "sample").suffix.lower() or ".mp3"
    key = storage.generate_key(f"voice-samples/{current_user.id}", ext)
    url = storage.save(key, content, file.content_type)

    sample = VoiceSample(
        user_id=current_user.id,
        project_id=project_id,
        filename=file.filename or key,
        storage_key=key,
        url=url,
        duration=0.0,
    )
    db.add(sample)
    db.commit()
    db.refresh(sample)
    return {"sample_id": sample.id, "url": url}
