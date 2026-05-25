# My Avatar — AI Avatar Video Generation Platform

> Original, production-ready AI avatar video creation SaaS.  
> **Not affiliated with or derived from any third-party platform.**

---

## Architecture Overview

```
my-avatar/
├── frontend/          # Next.js 14 · TypeScript · Tailwind · shadcn/ui · Framer Motion
├── backend/           # FastAPI · SQLAlchemy · Alembic · Celery
├── docker-compose.yml # Full local stack (DB + Redis + API + Worker + Frontend)
└── README.md
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion |
| State | Zustand, TanStack Query |
| Backend | FastAPI, Python 3.11, SQLAlchemy 2, Alembic |
| Queue | Celery + Redis |
| Database | PostgreSQL 16 |
| Storage | Local (dev) / AWS S3 (prod) |
| TTS | ElevenLabs API (fallback: gTTS) |
| Lip Sync | D-ID API (fallback: SadTalker local) |
| Video | FFmpeg (interpolation · upscaling · color grading · noise cleanup) |
| Auth | JWT (python-jose + bcrypt) |
| Testing | pytest (backend) · Playwright (E2E) |

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- FFmpeg installed (`ffmpeg -version`)

### 1. Clone and set up environment

```bash
# Clone
git clone https://github.com/ahamedshaik52/My-Avatar.git
cd My-Avatar

# Backend env
cp backend/.env.example backend/.env
# Edit backend/.env — set SECRET_KEY, AI API keys (optional for dev)

# Frontend env
cp frontend/.env.local.example frontend/.env.local
```

### 2. Start infrastructure (PostgreSQL + Redis)

```bash
docker-compose up db redis -d
```

### 3. Start the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run API server
uvicorn app.main:app --reload --port 8000
```

### 4. Start the Celery worker (separate terminal)

```bash
cd backend
source .venv/bin/activate
celery -A app.workers.celery_app worker --loglevel=info
```

### 5. Start the frontend

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

```
1.  Validate avatar + audio inputs
2.  Download assets from storage
3.  Normalize audio (loudnorm filter)
4.  Generate lip-sync video (D-ID API or SadTalker)
5.  Ensure ≥15 second duration (loop/pad)
6.  Frame interpolation (2× FPS via minterpolate)
7.  Upscale to target resolution (1080p / 2K / 4K — Lanczos)
8.  Sharpen (unsharp mask)
9.  Cinematic contrast + saturation (eq filter)
10. Temporal noise reduction (hqdn3d)
11. Final MP4 export (libx264 · AAC · faststart)
12. Extract thumbnail
13. Upload to storage
14. Update job status → completed
15. Show preview + download link
```

---

## Production Deployment

### Environment Variables (production)

```bash
# backend/.env (production)
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=$(openssl rand -hex 32)
DATABASE_URL=postgresql://user:pass@your-rds-host:5432/myavatar
REDIS_URL=redis://your-redis-host:6379/0
STORAGE_BACKEND=s3
S3_BUCKET_NAME=myavatar-media
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
ELEVENLABS_API_KEY=...
D_ID_API_KEY=...
ALLOWED_ORIGINS=["https://myavatar.ai"]
```

### Deploy with Docker Compose

```bash
# Build and start all services
docker-compose up --build -d

# Run migrations
docker-compose exec api alembic upgrade head

# Check logs
docker-compose logs -f api worker
```

### Recommended Production Setup

| Component | Recommendation |
|---|---|
| Frontend | Vercel (Next.js native) |
| Backend API | Render / Railway / Fly.io |
| Celery Worker | Same platform as API |
| Database | Supabase / Neon / AWS RDS |
| Redis | Upstash / AWS ElastiCache |
| Storage | AWS S3 + CloudFront CDN |
| Domain | Cloudflare |

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
8.  Watch real-time pipeline progress (9 steps displayed)
9.  Preview generated video in the player
10. Download MP4
```

---

## License

MIT — build freely, deploy commercially, no attribution required.
