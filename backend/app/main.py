from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pathlib import Path
import structlog
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import get_settings
from app.core.database import engine, Base
from app.core.rate_limit import limiter
from app.api.routes import auth, projects, avatars, voices, videos, scripts
import app.models  # noqa: F401 — register all models

settings = get_settings()
log = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (use Alembic in production)
    Base.metadata.create_all(bind=engine)
    _seed_voices()
    log.info("app.started", environment=settings.ENVIRONMENT)
    yield
    log.info("app.shutdown")


def _seed_voices():
    """Insert built-in voices if the table is empty."""
    from app.core.database import SessionLocal
    from app.models.voice import Voice

    db = SessionLocal()
    try:
        if db.query(Voice).count() > 0:
            return

        built_in = [
            {"name": "Emma", "gender": "female", "accent": "american", "description": "Warm, friendly professional voice."},
            {"name": "James", "gender": "male", "accent": "british", "description": "Authoritative, clear British tone."},
            {"name": "Sophia", "gender": "female", "accent": "australian", "description": "Upbeat and engaging Aussie voice."},
            {"name": "Raj", "gender": "male", "accent": "indian", "description": "Clear, articulate with subtle Indian accent."},
            {"name": "Claire", "gender": "female", "accent": "british", "description": "Elegant, trustworthy British female."},
            {"name": "Marcus", "gender": "male", "accent": "american", "description": "Deep, confident American narrator."},
            {"name": "Aiko", "gender": "female", "accent": "neutral", "description": "Gentle, neutral international tone."},
            {"name": "Leo", "gender": "male", "accent": "canadian", "description": "Friendly, approachable Canadian voice."},
            {"name": "Isabella", "gender": "female", "accent": "american", "description": "Energetic, youthful American voice."},
            {"name": "David", "gender": "male", "accent": "neutral", "description": "Professional, clear neutral voice."},
        ]

        for v in built_in:
            db.add(Voice(
                name=v["name"],
                gender=v["gender"],
                accent=v["accent"],
                language="en",
                preview_url=f"/media/previews/{v['name'].lower()}.mp3",
                description=v["description"],
                provider="builtin",
                is_cloneable=False,
                is_active=True,
            ))
        db.commit()
    finally:
        db.close()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS — allow listed origins + optional regex (covers Vercel preview URLs)
cors_kwargs: dict = {
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if settings.ALLOWED_ORIGINS_REGEX:
    cors_kwargs["allow_origin_regex"] = settings.ALLOWED_ORIGINS_REGEX
    cors_kwargs["allow_origins"] = settings.ALLOWED_ORIGINS
else:
    cors_kwargs["allow_origins"] = settings.ALLOWED_ORIGINS

app.add_middleware(CORSMiddleware, **cors_kwargs)

# Serve uploaded media locally
media_path = Path(settings.LOCAL_STORAGE_PATH)
media_path.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(media_path)), name="media")

# Routers
app.include_router(auth.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(avatars.router, prefix="/api")
app.include_router(voices.router, prefix="/api")
app.include_router(videos.router, prefix="/api")
app.include_router(scripts.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "version": settings.APP_VERSION}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    tb = traceback.format_exc()
    log.error("unhandled_exception", path=request.url.path, error=str(exc), traceback=tb)
    # Return real error in non-production so we can diagnose quickly
    if settings.ENVIRONMENT != "production":
        return JSONResponse(status_code=500, content={"detail": str(exc), "traceback": tb})
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
