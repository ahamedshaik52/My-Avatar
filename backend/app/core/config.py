from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from functools import lru_cache

_INSECURE_DEFAULT = "change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_NAME: str = "My Avatar API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Security — must be set via SECRET_KEY env var; empty default forces explicit configuration
    SECRET_KEY: str = _INSECURE_DEFAULT
    ALGORITHM: str = "HS256"
    # Short-lived access tokens + refresh token flow keeps blast radius small on theft
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_set(cls, v: str) -> str:
        if v == _INSECURE_DEFAULT or len(v) < 32:
            import os
            if os.getenv("ENVIRONMENT", "development") == "production":
                raise ValueError(
                    "SECRET_KEY must be set to a random 32+ character string in production. "
                    "Generate one with: openssl rand -hex 32"
                )
        return v

    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/myavatar"

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Storage
    STORAGE_BACKEND: str = "local"  # "local" | "s3"
    LOCAL_STORAGE_PATH: str = "./media"
    S3_BUCKET_NAME: str = ""
    S3_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    CDN_BASE_URL: str = ""

    # AI Services — all optional; self-hosted models used by default
    ELEVENLABS_API_KEY: str = ""   # Optional cloud TTS upgrade
    OPENAI_API_KEY: str = ""
    D_ID_API_KEY: str = ""         # Optional cloud lip-sync upgrade

    # ── Self-hosted TTS: Kokoro ONNX ────────────────────────────────────────
    # Download models once with:  python backend/scripts/setup_models.py --tts
    # Kokoro runs on CPU, no API key, 50 male/female voices, Apache-2.0 license.
    KOKORO_MODEL_PATH: str = "./models/kokoro/kokoro-v1.0.onnx"
    KOKORO_VOICES_PATH: str = "./models/kokoro/voices-v1.0.bin"

    # ── Self-hosted lip sync: Wav2Lip ────────────────────────────────────────
    # Download + install with:  python backend/scripts/setup_models.py --lipsync
    # Wav2Lip runs on CPU (~60-120s/10s video), non-commercial personal use.
    WAV2LIP_PATH: str = "./models/wav2lip"
    WAV2LIP_CHECKPOINT: str = "./models/wav2lip/checkpoints/wav2lip_gan.pth"

    # ── Fallback: SadTalker (Apache-2.0, CPU mode available) ────────────────
    SADTALKER_MODEL_PATH: str = "./models/sadtalker"

    # Upload limits
    MAX_AVATAR_SIZE_MB: int = 200
    MAX_AUDIO_SIZE_MB: int = 50

    # CORS — set via ALLOWED_ORIGINS env var in production
    # e.g. ALLOWED_ORIGINS=["https://your-app.vercel.app","http://localhost:3000"]
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "https://myavatar.ai"]
    ALLOWED_ORIGINS_REGEX: str = ""  # optional regex, e.g. "https://.*\\.vercel\\.app"

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Frontend URL (used in email links)
    FRONTEND_URL: str = "http://localhost:3000"

    # Email
    # Set EMAIL_BACKEND=smtp and configure SMTP_* for real delivery.
    # Default is "console": reset links are printed to the API server stdout.
    EMAIL_BACKEND: str = "console"
    EMAIL_FROM_ADDRESS: str = "noreply@myavatar.ai"
    EMAIL_FROM_NAME: str = "My Avatar"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True

    @property
    def celery_config(self) -> dict:
        return {
            "broker_url": self.CELERY_BROKER_URL,
            "result_backend": self.CELERY_RESULT_BACKEND,
            "task_serializer": "json",
            "result_serializer": "json",
            "accept_content": ["json"],
            "task_track_started": True,
            "worker_prefetch_multiplier": 1,
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()
