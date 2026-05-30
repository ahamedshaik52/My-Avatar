# Architecture — My Avatar

**Last updated:** 2026-05-30

## High-level

```
┌─────────────┐     HTTPS / /api proxy     ┌──────────────────────────────┐
│  Next.js 14 │ ─────────────────────────► │  FastAPI backend             │
│  (Vercel)   │ ◄───────────────────────── │  (self-hosted box / VPS)     │
└─────────────┘     JSON + media URLs       │                              │
                                            │  ┌────────────────────────┐  │
                                            │  │ BackgroundTasks worker │  │
                                            │  │  video_worker.py       │  │
                                            │  └───────────┬────────────┘  │
                                            │              │               │
   ┌──────────────┐                         │   ┌──────────▼───────────┐   │
   │ PostgreSQL   │ ◄───────────────────────┼── │ tts_service (Kokoro) │   │
   │ (Railway)    │   projects, jobs, users │   │ lipsync_service      │   │
   └──────────────┘                         │   │   (Wav2Lip)          │   │
                                            │   └──────────┬───────────┘   │
   ┌──────────────┐                         │              │               │
   │ Storage      │ ◄───────────────────────┼──────────────┘ media R/W     │
   │ local / S3   │                         │   models/ (Kokoro, Wav2Lip)  │
   └──────────────┘                         └──────────────────────────────┘
```

## Components

### Frontend (`frontend/`)
- Next.js 14 App Router. `next.config.mjs` rewrites `/api/*` → backend, so the
  browser makes same-origin calls (no CORS in the browser path).
- Zustand holds wizard state across the 4 creation steps; TanStack Query for
  server state and job-status polling (3s interval).

### Backend (`backend/`)
- FastAPI app (`app/main.py`) with routers for auth, projects, avatar, script,
  voices, video.
- **No queue broker.** `POST /api/video/generate` enqueues a FastAPI
  `BackgroundTask` running `video_worker.process_video_job(...)`.
- SQLAlchemy 2 + Alembic against PostgreSQL.

### AI services (`backend/app/services/`)
- `tts_service.py` — provider chain: **Kokoro ONNX** (self-hosted, primary) →
  edge-tts (free, online) → gTTS (last resort). Optional ElevenLabs only if a
  key is explicitly set. Returns `(audio_bytes, duration)`.
- `lipsync_service.py` — **Wav2Lip** (self-hosted) → SadTalker → static FFmpeg.

### Models (`backend/models/`, gitignored)
- `kokoro/` — `kokoro-v1.0.onnx` + `voices-v1.0.bin`.
- `wav2lip/` — cloned repo + `checkpoints/wav2lip_gan.pth` + s3fd detector.
- Provisioned by `scripts/setup_models.py`, which also patches Wav2Lip's
  `audio.py` for librosa ≥ 0.10 (keyword-only `librosa.filters.mel`).

## Data flow (video generation)

1. Client uploads avatar → stored, URL persisted.
2. Client submits script + voice → `voices/generate` calls `tts_service`,
   producing audio stored to media.
3. Client clicks Generate → `video/generate` creates a `VideoJob`, schedules a
   BackgroundTask, returns 202.
4. Worker: download assets → `lipsync_service.generate(face, audio, out)` →
   thumbnail → upload → mark job `completed`.
5. Client polls `video/status/:jobId` until completed, then plays/downloads.

## Failure & fallback model

| Stage | Primary | Fallback 1 | Fallback 2 |
|-------|---------|-----------|-----------|
| TTS | Kokoro ONNX | edge-tts (online) | gTTS |
| Lip sync | Wav2Lip | SadTalker | static FFmpeg compose |

A missing model never crashes the job — it degrades to the next option.

## Deployment topology

See [../DEPLOYMENT.md](../DEPLOYMENT.md). Recommended: backend + models on a
self-hosted box/VPS (persistent disk), frontend on Vercel, Postgres on Railway.
