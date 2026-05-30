# Deployment Guide

## Architecture

| Component | Service | Notes |
|-----------|---------|-------|
| Backend (FastAPI) | Self-hosted box / VPS / Railway | Async jobs via FastAPI BackgroundTasks (no Celery/Redis) |
| Frontend (Next.js) | [Vercel](https://vercel.com) | Auto-deploys from `frontend/` |
| Database | Railway PostgreSQL (or local Postgres) | Persistent, survives redeploys |
| Media storage | AWS S3 (cloud) / local disk (dev/self-host) | S3 only if backend FS is ephemeral |
| TTS | **Kokoro ONNX** (self-hosted) → edge-tts → gTTS | No paid API. 82M model, CPU, 50 voices |
| Lip sync | **Wav2Lip** (self-hosted) → SadTalker → static FFmpeg | No paid API. torch CPU, ~60-120s/10s video |

This stack is **fully self-hosted** — no D-ID, no ElevenLabs, no paid services.
All AI runs locally from `backend/models/` (gitignored; populated by
`python scripts/setup_models.py --all`).

---

## Deployment Strategy for Self-Hosted Models

The AI models are large and the lip-sync inference is CPU-heavy:

| Asset | Size | Notes |
|---|---|---|
| Kokoro ONNX model + voices | ~430 MB | `backend/models/kokoro/` |
| Wav2Lip repo + torch (CPU) | ~2.0 GB | torch is the bulk |
| Wav2Lip checkpoint + s3fd detector | ~500 MB | `backend/models/wav2lip/checkpoints/` |

Because `backend/models/` is **gitignored**, it is never in the image — it must
be provisioned at runtime. Choose one of:

### Option A — Self-hosted box / VPS (recommended for personal use)
Run the backend on a machine you control (your PC, a home server, or a small
VPS with ≥4 GB RAM and ≥6 GB disk). Models persist on real disk, so you run
`setup_models.py --all` **once** and lip sync works on every job.
This is the intended deployment for the project's "personal use, own code" goal.

```bash
cd backend
python scripts/setup_models.py --all      # one-time, downloads ~3 GB
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

`STORAGE_BACKEND=local` is fine here — media lives in `./media/`.

### Option B — Railway with a persistent Volume
Railway's container FS is ephemeral, but a **mounted Volume** is not. Attach a
volume at `/app/backend/models`, then run `setup_models.py --all` once (via a
one-off shell) so the download survives redeploys. Set `MAX` build memory
accordingly; CPU lip sync of a 10s clip takes 1-3 min and will tie up a worker.

### Option C — Cloud without models (graceful degradation)
If you deploy the backend with no models provisioned, the pipeline degrades
safely: **edge-tts** (free, online, no key) gives correct-gender voices, and
video falls back to **static FFmpeg composition** (no lip motion). Use this only
as a stopgap — it does not deliver a talking avatar.

---

## ⚠️ Critical: Persistent Media Storage

Railway's filesystem is **ephemeral** — every redeploy wipes the container disk.  
If you run with `STORAGE_BACKEND=local` (the default), all uploaded avatars, audio files,
and generated videos are permanently deleted on every deploy.

**You must configure S3 before going to production.**

The backend will log a `CRITICAL` warning at startup if it detects
`ENVIRONMENT=production` + `STORAGE_BACKEND=local`.

---

## Railway Environment Variables

Set these in your Railway backend service dashboard under **Variables**:

### Required — always
```
ENVIRONMENT=production
SECRET_KEY=<openssl rand -hex 32>
DATABASE_URL=<Railway PostgreSQL connection string — auto-set by Railway>
```

### Required — persistent storage (S3)
```
STORAGE_BACKEND=s3
S3_BUCKET_NAME=my-avatar-prod
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your IAM key>
AWS_SECRET_ACCESS_KEY=<your IAM secret>
```

### Required — CORS (allow your Vercel frontend)
```
ALLOWED_ORIGINS=["https://your-app.vercel.app"]
ALLOWED_ORIGINS_REGEX=https://.*\.vercel\.app
FRONTEND_URL=https://your-app.vercel.app
```

### Self-hosted AI models (set by `setup_models.py`)
```
# TTS — Kokoro ONNX (no API key, runs on CPU)
KOKORO_MODEL_PATH=/app/backend/models/kokoro/kokoro-v1.0.onnx
KOKORO_VOICES_PATH=/app/backend/models/kokoro/voices-v1.0.bin

# Lip sync — Wav2Lip (no API key, runs on CPU)
WAV2LIP_PATH=/app/backend/models/wav2lip
WAV2LIP_CHECKPOINT=/app/backend/models/wav2lip/checkpoints/wav2lip_gan.pth

# Optional secondary lip-sync engine
SADTALKER_MODEL_PATH=/app/backend/models/sadtalker
```

### Optional — paid cloud upgrade (NOT required; project is self-hosted)
```
ELEVENLABS_API_KEY=<key>   # only used if set; Kokoro is the default self-hosted TTS
```
> The project intentionally avoids paid APIs. Leave these unset for a fully
> self-hosted deployment. D-ID has been removed entirely in favor of Wav2Lip.

### Optional — email
```
EMAIL_BACKEND=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=<app password>
SMTP_USE_TLS=true
EMAIL_FROM_ADDRESS=noreply@yourapp.com
```

---

## AWS S3 Setup

1. **Create a bucket** in your chosen region (e.g. `my-avatar-prod` in `us-east-1`).

2. **Disable "Block all public access"** for the bucket (videos need to be fetchable by users).

3. **Add a bucket policy** to allow public reads on the `videos/` prefix:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::my-avatar-prod/videos/*"
       }
     ]
   }
   ```

4. **Create an IAM user** with the following policy (principle of least privilege):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject",
           "s3:GeneratePresignedUrl"
         ],
         "Resource": "arn:aws:s3:::my-avatar-prod/*"
       }
     ]
   }
   ```

5. Generate an **Access Key** for the IAM user and copy the values into Railway as
   `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

---

## Vercel Environment Variables

Set these in your Vercel project under **Settings → Environment Variables**:

```
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
```

The frontend's `next.config.mjs` rewrites `/api/*` to the Railway backend, so
the browser never makes cross-origin requests and CORS is not needed for the frontend.

---

## Local Development

```bash
# Backend
cd backend
cp .env.example .env          # fill in values
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

For local development, `STORAGE_BACKEND=local` is fine — files are stored in `./media/`
and served at `http://localhost:8000/media/`.

---

## nixpacks.toml (Railway build config)

`backend/nixpacks.toml` installs the FFmpeg binary at build time:

```toml
[phases.setup]
nixPkgs = ["ffmpeg"]
```

Do not remove this — video generation will fail without the FFmpeg binary.
