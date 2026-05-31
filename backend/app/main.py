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
    _run_migrations()
    _seed_voices()
    # Warn loudly if running in production with ephemeral local storage
    if settings.ENVIRONMENT == "production" and settings.STORAGE_BACKEND == "local":
        log.critical(
            "storage.ephemeral_in_production",
            warning="STORAGE_BACKEND=local is unsafe for production. All media is wiped on redeploy. "
                    "Set STORAGE_BACKEND=s3 and configure S3_BUCKET_NAME / AWS credentials.",
        )
    log.info("app.started", environment=settings.ENVIRONMENT, storage_backend=settings.STORAGE_BACKEND)
    yield
    log.info("app.shutdown")


def _existing_columns(db, table: str) -> set[str]:
    """Return the set of column names on a table, dialect-aware.

    SQLite rejects ``ADD COLUMN IF NOT EXISTS``, so we check existence first
    rather than relying on that (Postgres-only) syntax.
    """
    from sqlalchemy import text

    dialect = db.bind.dialect.name
    if dialect == "sqlite":
        rows = db.execute(text(f"PRAGMA table_info({table})")).fetchall()
        return {r[1] for r in rows}
    rows = db.execute(
        text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = :t"
        ),
        {"t": table},
    ).fetchall()
    return {r[0] for r in rows}


def _run_migrations():
    """Apply additive schema changes that create_all won't handle (existing tables)."""
    from app.core.database import SessionLocal
    from sqlalchemy import text

    db = SessionLocal()
    try:
        # (table, column, column_definition) — added with a plain ADD COLUMN only
        # when the column is missing. Avoids the Postgres-only IF NOT EXISTS that
        # SQLite cannot parse (which previously left video_jobs.video_id missing).
        add_columns = [
            ("video_jobs", "video_id", "VARCHAR(36) NULL"),
            ("generated_videos", "thumbnail_url", "VARCHAR(1000) NOT NULL DEFAULT ''"),
            ("projects", "generated_video_id", "VARCHAR(36) NULL"),
            ("projects", "thumbnail_url", "VARCHAR(1000) NULL"),
        ]
        for table, column, ddl in add_columns:
            try:
                if column not in _existing_columns(db, table):
                    db.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
                    db.commit()
                    log.info("migration.column_added", table=table, column=column)
            except Exception as e:
                db.rollback()
                log.warning("migration.skipped", sql=f"{table}.{column}", error=str(e))

        migrations = [
            # voices: backfill edge-tts external_ids for existing seeded voices
            # so existing DBs get gender-correct voices without a full re-seed.
            "UPDATE voices SET external_id='en-US-JennyNeural',      provider='edge-tts' WHERE name='Emma'     AND (external_id IS NULL OR external_id='')",
            "UPDATE voices SET external_id='en-GB-RyanNeural',       provider='edge-tts' WHERE name='James'    AND (external_id IS NULL OR external_id='')",
            "UPDATE voices SET external_id='en-AU-NatashaNeural',    provider='edge-tts' WHERE name='Sophia'   AND (external_id IS NULL OR external_id='')",
            "UPDATE voices SET external_id='en-IN-PrabhatNeural',    provider='edge-tts' WHERE name='Raj'      AND (external_id IS NULL OR external_id='')",
            "UPDATE voices SET external_id='en-GB-SoniaNeural',      provider='edge-tts' WHERE name='Claire'   AND (external_id IS NULL OR external_id='')",
            "UPDATE voices SET external_id='en-US-GuyNeural',        provider='edge-tts' WHERE name='Marcus'   AND (external_id IS NULL OR external_id='')",
            "UPDATE voices SET external_id='en-US-AriaNeural',       provider='edge-tts' WHERE name='Aiko'     AND (external_id IS NULL OR external_id='')",
            "UPDATE voices SET external_id='en-CA-LiamNeural',       provider='edge-tts' WHERE name='Leo'      AND (external_id IS NULL OR external_id='')",
            "UPDATE voices SET external_id='en-US-SaraNeural',       provider='edge-tts' WHERE name='Isabella' AND (external_id IS NULL OR external_id='')",
            "UPDATE voices SET external_id='en-US-ChristopherNeural',provider='edge-tts' WHERE name='David'    AND (external_id IS NULL OR external_id='')",
        ]
        for sql in migrations:
            try:
                db.execute(text(sql))
                db.commit()
            except Exception as e:
                db.rollback()
                log.warning("migration.skipped", sql=sql[:60], error=str(e))
        log.info("migrations.complete")
    finally:
        db.close()


def _seed_voices():
    """Insert built-in voices if the table is empty."""
    from app.core.database import SessionLocal
    from app.models.voice import Voice

    db = SessionLocal()
    try:
        if db.query(Voice).count() > 0:
            return

        # external_id = edge-tts neural voice name (gender + accent accurate, no API key needed).
        # When an ElevenLabs key is set, replace external_id with the real ElevenLabs voice ID.
        built_in = [
            {"name": "Emma",    "gender": "female", "accent": "american",   "external_id": "en-US-JennyNeural",     "description": "Warm, friendly professional voice."},
            {"name": "James",   "gender": "male",   "accent": "british",    "external_id": "en-GB-RyanNeural",      "description": "Authoritative, clear British tone."},
            {"name": "Sophia",  "gender": "female", "accent": "australian", "external_id": "en-AU-NatashaNeural",   "description": "Upbeat and engaging Aussie voice."},
            {"name": "Raj",     "gender": "male",   "accent": "indian",     "external_id": "en-IN-PrabhatNeural",   "description": "Clear, articulate with subtle Indian accent."},
            {"name": "Claire",  "gender": "female", "accent": "british",    "external_id": "en-GB-SoniaNeural",     "description": "Elegant, trustworthy British female."},
            {"name": "Marcus",  "gender": "male",   "accent": "american",   "external_id": "en-US-GuyNeural",       "description": "Deep, confident American narrator."},
            {"name": "Aiko",    "gender": "female", "accent": "neutral",    "external_id": "en-US-AriaNeural",      "description": "Gentle, neutral international tone."},
            {"name": "Leo",     "gender": "male",   "accent": "canadian",   "external_id": "en-CA-LiamNeural",      "description": "Friendly, approachable Canadian voice."},
            {"name": "Isabella","gender": "female", "accent": "american",   "external_id": "en-US-SaraNeural",      "description": "Energetic, youthful American voice."},
            {"name": "David",   "gender": "male",   "accent": "neutral",    "external_id": "en-US-ChristopherNeural","description": "Professional, clear neutral voice."},
        ]

        for v in built_in:
            db.add(Voice(
                name=v["name"],
                gender=v["gender"],
                accent=v["accent"],
                language="en",
                external_id=v["external_id"],
                preview_url=f"/api/voices/preview-static/{v['name'].lower()}",
                description=v["description"],
                provider="edge-tts",
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

# Serve uploaded media — only mount static files when using local storage.
# In S3 mode, /media/* URLs are not generated, so no mount is needed.
if settings.STORAGE_BACKEND == "local":
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
