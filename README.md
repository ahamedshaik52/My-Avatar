# My Avatar — AI Avatar Video Generation Platform

> Original, **fully self-hosted** AI avatar video creation app — built with our
> own code for personal use. **No paid APIs** (no D-ID, no ElevenLabs).
> **Not affiliated with or derived from any third-party platform.**

---

## Architecture Overview

```
my-avatar/
├── frontend/          # Next.js 14 · TypeScript · Tailwind · shadcn/ui · Framer Motion
├── backend/           # FastAPI · SQLAlchemy · Alembic · self-hosted AI models
│   ├── models/        # Kokoro ONNX + Wav2Lip (gitignored; setup_models.py)
│   └── scripts/       # setup_models.py · test_pipeline.py (E2E smoke test)
└── README.md
```

Async video jobs run on **FastAPI BackgroundTasks** — no Celery, no Redis.

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion |
| State | Zustand, TanStack Query |
| Backend | FastAPI, Python 3.11, SQLAlchemy 2, Alembic |
| Async jobs | FastAPI BackgroundTasks (no queue broker) |
| Database | PostgreSQL 16 |
| Storage | Local disk (dev/self-host) / AWS S3 (cloud) |
| TTS | **Kokoro ONNX** (self-hosted, 50 voices, CPU) → edge-tts → gTTS |
| Lip Sync | **Wav2Lip** (self-hosted, CPU) → SadTalker → static FFmpeg |
| Video | FFmpeg (compose · normalize audio · thumbnail) |
| Auth | JWT (python-jose + bcrypt) |
| Testing | pytest (backend) · Playwright (E2E) · `scripts/test_pipeline.py` (E2E smoke) |

All AI inference is local and free. Models download once via `setup_models.py`.

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 16 (local install or Docker)
- FFmpeg installed (`ffmpeg -version`)
- ~6 GB free disk for self-hosted AI models

### 1. Clone and set up environment

```bash
# Clone
git clone https://github.com/ahamedshaik52/My-Avatar.git
cd My-Avatar

# Backend env
cp backend/.env.example backend/.env
# Edit backend/.env — set SECRET_KEY and DATABASE_URL

# Frontend env
cp frontend/.env.local.example frontend/.env.local
```

### 2. Install backend dependencies

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Download the self-hosted AI models (one-time, ~3 GB)

```bash
cd backend
python scripts/setup_models.py --all      # Kokoro TTS + Wav2Lip lip sync
# or individually:  --tts   |   --lipsync
```

This downloads Kokoro ONNX (TTS) and Wav2Lip (lip sync), patches Wav2Lip for
modern librosa, and writes the model paths into `backend/.env`.

### 4. Verify the pipeline works end-to-end

```bash
cd backend
python scripts/test_pipeline.py           # synthesizes speech + lip-syncs a test face
# Expect: "PASS  Output is a TALKING video"
```

### 5. Start the backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### 6. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

### Local URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/api/docs |
| API Docs (Redoc) | http://localhost:8000/api/redoc |

---

## Database Migrations

```bash
cd backend

# Create initial migration
alembic revision --autogenerate -m "initial schema"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

---

## Running Tests

### Backend (pytest)

```bash
cd backend
pytest tests/ -v --tb=short
```

### Frontend E2E (Playwright)

```bash
cd frontend
npx playwright install chromium
npm run test:e2e
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/auth/me` | Current user |

### Projects
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects` | List projects (paginated) |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| DELETE | `/api/projects/:id` | Delete project |

### Avatar
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/avatar/upload` | Upload avatar image/video |
| GET | `/api/avatar/:id` | Get avatar |

### Script
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/script/save` | Save script |
| GET | `/api/script/:id` | Get script |

### Voice
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/voices` | List available voices |
| POST | `/api/voices/preview` | Preview voice sample |
| POST | `/api/voices/generate` | Generate audio from script |
| POST | `/api/voices/upload-sample` | Upload voice sample |

### Video
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/video/generate` | Start video generation job |
| GET | `/api/video/status/:jobId` | Poll job status |
| GET | `/api/video/:id` | Get generated video |
| GET | `/api/video/download/:id` | Get signed download URL |

---

## Video Generation Pipeline

The pipeline is intentionally lean and fully self-hosted:

```
1. Validate avatar + audio inputs, download assets from storage
2. Synthesize speech  — Kokoro ONNX (self-hosted) → edge-tts → gTTS fallback
3. Generate lip-sync  — Wav2Lip (self-hosted) → SadTalker → static FFmpeg fallback
4. Extract thumbnail, export MP4 (libx264 · AAC · faststart)
5. Upload to storage, update job status → completed, show preview + download
```

Each stage degrades gracefully: if the self-hosted models are missing, TTS falls
back to free online edge-tts and video falls back to static FFmpeg composition.
`scripts/test_pipeline.py` proves the full path produces a real *talking* video
(it frame-diffs the output to confirm the mouth actually moves).

---

## Production Deployment

### Environment Variables (production)

```bash
# backend/.env (production)
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=$(openssl rand -hex 32)
DATABASE_URL=postgresql://user:pass@your-host:5432/myavatar
STORAGE_BACKEND=s3                # or "local" on a self-hosted box
S3_BUCKET_NAME=myavatar-media
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
# Self-hosted model paths (set by setup_models.py)
KOKORO_MODEL_PATH=/app/backend/models/kokoro/kokoro-v1.0.onnx
KOKORO_VOICES_PATH=/app/backend/models/kokoro/voices-v1.0.bin
WAV2LIP_PATH=/app/backend/models/wav2lip
WAV2LIP_CHECKPOINT=/app/backend/models/wav2lip/checkpoints/wav2lip_gan.pth
ALLOWED_ORIGINS=["https://myavatar.ai"]
```

### Recommended Setup

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full model-provisioning strategy.
Because lip sync is CPU-heavy and the models are ~3 GB, a **self-hosted box / VPS**
(where models persist on real disk) is recommended for personal use.

| Component | Recommendation |
|---|---|
| Frontend | Vercel (Next.js native) |
| Backend API + AI models | Self-hosted box / VPS (≥4 GB RAM) or Railway with a persistent Volume |
| Database | Railway PostgreSQL / Supabase / Neon |
| Storage | Local disk (self-host) or AWS S3 (cloud) |

---

## Security Checklist

- [x] JWT with bcrypt password hashing
- [x] File type + size validation on all uploads
- [x] User-scoped data access (all queries filter by user_id)
- [x] Environment variables for all secrets (never hardcoded)
- [x] CORS configured with explicit allowed origins
- [x] Signed URLs for private file downloads
- [x] Input sanitization on all text fields
- [x] SQL injection prevention via SQLAlchemy ORM

---

## User Flow

```
1.  Visit homepage → learn about the platform
2.  Sign up (free) → dashboard
3.  Click "Create New Video"
4.  Step 1: Set project title + upload avatar (image or video)
5.  Step 2: Write script in the editor (templates available)
6.  Step 3: Choose from 50+ voices → preview → confirm
7.  Step 4: Select export quality → click "Generate Video"
8.  Watch real-time pipeline progress (TTS → lip sync → export)
9.  Preview generated video in the player
10. Download MP4
```

---

## License

MIT — build freely, deploy commercially, no attribution required.
