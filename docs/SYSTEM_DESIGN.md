# System Design — My Avatar

**Last updated:** 2026-05-30

## 1. Job lifecycle (async without a broker)

`POST /api/video/generate` does minimal synchronous work (create row, validate)
then schedules the heavy work via FastAPI `BackgroundTasks`:

```
request → create VideoJob(status=queued) → schedule BackgroundTask → 202 {jobId}
BackgroundTask:
  validating(10%) → generating_lipsync(40%) → exporting(70%) → completed(100%)
  on error: status=failed, project marked failed, message persisted
```

`_update_job()` writes status/progress/current_step and an explicit
`updated_at = datetime.now(timezone.utc)` on every transition.

**Trade-off:** BackgroundTasks share the API process. Acceptable for a personal,
low-concurrency app; a long lip-sync (1–3 min) ties up a worker thread. For
higher concurrency, reintroduce a dedicated worker process — but that was
explicitly removed to keep the stack broker-free.

## 2. TTS provider selection

`_voice_provider(voice_id)` routes by ID shape:
- Kokoro IDs (`am_adam`), UUIDs, or empty → Kokoro.
- edge-tts IDs (`en-US-GuyNeural`) → edge-tts.
- Otherwise → ElevenLabs (only if key present).

Seeded edge-style IDs are mapped to Kokoro voices via `_EDGE_TO_KOKORO` so the
self-hosted engine is always tried first. Kokoro is a process-wide singleton
(load once, reuse). Language is BCP-47 (`en-us`/`en-gb`) per kokoro-onnx 0.5.

## 3. Lip-sync engine

Wav2Lip runs as a subprocess against the cloned repo. Inputs: face image +
WAV audio. Output: MP4 with mouth synced to audio. The face detector (s3fd)
locates the mouth region; the GAN checkpoint generates lip frames.

**Critical correctness note:** Wav2Lip's bundled `audio.py` builds a mel filter
via `librosa.filters.mel(...)`. librosa ≥ 0.10 made this keyword-only; the old
positional call raises `TypeError`, which Wav2Lip swallows and falls back to a
static image. `setup_models.py::patch_wav2lip_librosa()` rewrites the call to
keyword args on every setup (models are gitignored, so the patch must re-apply).

## 4. Verification strategy

`scripts/test_pipeline.py` is the executable spec for "it works":
1. Synthesize speech via the real `tts_service`.
2. Lip-sync a (synthetic, non-real-person) test face via the real
   `lipsync_service`.
3. `count_distinct_frames()` samples frames and counts how many differ from the
   previous (downscaled grayscale mean-abs-diff > 1.0). A static image yields
   ~1 distinct frame; a talking video yields many. **PASS** requires
   `distinct ≥ max(3, total * 0.2)`.

Latest run: 201 frames, 64 distinct (32% changing) → PASS.

## 5. Storage

`app/core/storage.py` abstracts local-disk vs S3. Self-hosted boxes use local
disk (`./media/`, served at `/media/*`); cloud deployments must use S3 because
container FS is ephemeral. Video URLs are proxied through the frontend rewrite.

## 6. Data model (key tables)

- `users` — auth (JWT, bcrypt).
- `projects` — one per video creation, owns status + thumbnail.
- `video_jobs` — async job state (status, progress, current_step, updated_at).
- `generated_videos` — final artifact metadata (url, duration, resolution).
- `voices` — seeded voice catalog (name, gender, accent, external_id).
- `download_history` — download audit (ip_address currently NULL — BUG-007).

## 7. Security

- JWT (python-jose) + bcrypt password hashing.
- All queries scoped by `user_id`.
- File type/size validation on uploads.
- Secrets via env vars only; no secrets committed.
- SQLAlchemy ORM (parameterized) — no raw SQL string building.

## 8. Performance characteristics

| Operation | Cost (CPU) |
|-----------|-----------|
| Kokoro TTS (8s speech) | ~2–4 s |
| Wav2Lip (8s clip) | ~120 s |
| Thumbnail extract | <1 s |

Lip sync dominates; this is the bottleneck and the reason a GPU/SadTalker path
is kept open for the future.
