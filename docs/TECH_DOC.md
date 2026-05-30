# Technical Guide — My Avatar

**Last updated:** 2026-05-30 · Practical how-to for developers.

## Prerequisites

- Node.js 20+, Python 3.11+, PostgreSQL 16, FFmpeg on PATH.
- ~6 GB free disk for AI models.

## First-time setup

```bash
git clone https://github.com/ahamedshaik52/My-Avatar.git
cd My-Avatar

# Backend deps
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Self-hosted models (~3 GB, one-time). Writes paths into backend/.env.
python scripts/setup_models.py --all

# Prove the pipeline works (TTS + lip sync + frame-diff verification)
python scripts/test_pipeline.py            # expect: PASS  Output is a TALKING video
```

## Running locally

```bash
# Backend
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger | http://localhost:8000/api/docs |
| Redoc | http://localhost:8000/api/redoc |

## Environment variables (`backend/.env`)

```
SECRET_KEY=<openssl rand -hex 32>
DATABASE_URL=postgresql://user:pass@localhost:5432/myavatar
STORAGE_BACKEND=local                      # or s3 in cloud
# set by setup_models.py:
KOKORO_MODEL_PATH=.../models/kokoro/kokoro-v1.0.onnx
KOKORO_VOICES_PATH=.../models/kokoro/voices-v1.0.bin
WAV2LIP_PATH=.../models/wav2lip
WAV2LIP_CHECKPOINT=.../models/wav2lip/checkpoints/wav2lip_gan.pth
```

No paid-API keys are required. `ELEVENLABS_API_KEY` is honored only if set.

## Model management

| Command | Effect |
|---------|--------|
| `python scripts/setup_models.py --tts` | Kokoro ONNX only |
| `python scripts/setup_models.py --lipsync` | Wav2Lip only (clones repo, patches librosa, downloads checkpoints) |
| `python scripts/setup_models.py --sadtalker` | Optional full head-motion engine |
| `python scripts/setup_models.py --all` | Everything |

`backend/models/` is gitignored. Re-running `--lipsync` re-applies the librosa
keyword-arg patch (idempotent), so the fix survives fresh clones.

## Common issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Video is a static image | Wav2Lip fell back (model missing or librosa positional-arg TypeError) | Run `setup_models.py --lipsync`; confirm `WAV2LIP_*` env set |
| All voices sound the same | Kokoro models missing → gTTS fallback | Run `setup_models.py --tts` |
| `language "a" is not supported` | Old lang code | Fixed: Kokoro uses BCP-47 (`en-us`/`en-gb`) |
| `UnicodeEncodeError` on Windows | cp1252 console | `set PYTHONIOENCODING=utf-8` |

## Tests

```bash
cd backend
pytest tests/ -v                  # unit/integration
python scripts/test_pipeline.py   # E2E smoke (real models)

cd frontend
npx playwright install chromium
npm run test:e2e
```

## Key files

| Path | Responsibility |
|------|----------------|
| `backend/app/services/tts_service.py` | TTS provider chain (Kokoro/edge/gTTS) |
| `backend/app/services/lipsync_service.py` | Wav2Lip / SadTalker / FFmpeg |
| `backend/app/workers/video_worker.py` | Async job pipeline |
| `backend/scripts/setup_models.py` | Model download + Wav2Lip patch |
| `backend/scripts/test_pipeline.py` | E2E verification |
