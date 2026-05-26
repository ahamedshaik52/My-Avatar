# Deployment Guide

## Architecture

| Component | Service | Notes |
|-----------|---------|-------|
| Backend (FastAPI) | [Railway](https://railway.app) | Auto-deploys from `backend/` via Nixpacks |
| Frontend (Next.js) | [Vercel](https://vercel.com) | Auto-deploys from `frontend/` |
| Database | Railway PostgreSQL | Persistent, survives redeploys |
| Media storage | AWS S3 (production) / local (dev) | **Must be S3 in production** |

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

### Optional — AI services
```
ELEVENLABS_API_KEY=<elevenlabs key>   # Real TTS voices; falls back to gTTS if unset
D_ID_API_KEY=<d-id key>               # Lip-sync; uses static image fallback if unset
```

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
