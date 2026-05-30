# Product Requirements Document — My Avatar

**Status:** Active · **Last updated:** 2026-05-30 · **Owner:** Personal project

---

## 1. Vision

My Avatar turns a single face photo and a written script into a short video of
that face *speaking* the script — with correct voice and synchronized lip
movement. It is **fully self-hosted**: every AI step runs locally on our own
code and open models, with **no paid third-party APIs** (no D-ID, no ElevenLabs).

## 2. Goals & Non-Goals

### Goals
- G1 — Generate a talking-head video from `image + script` end-to-end, locally.
- G2 — Correct, distinct voices (male/female, accent) without any paid TTS.
- G3 — Real lip motion synced to the audio (not a static image with sound).
- G4 — Run on CPU on a personal machine / small VPS; no GPU required.
- G5 — Graceful degradation when models are absent (free online + static fallback).

### Non-Goals
- N1 — Commercial multi-tenant SaaS scale / billing.
- N2 — Full head/body motion and emotion (SadTalker is an optional upgrade path).
- N3 — Real-time generation (CPU lip sync takes 1–3 min per 10s clip).
- N4 — Subtitles, 4K upscaling, frame interpolation (roadmap, see §8).

## 3. Users & Use Cases

- **Primary user:** the project owner, creating personal avatar videos.
- **Use case:** "Upload my photo, type a script, pick a voice, get an MP4 of me
  speaking it" — entirely on my own hardware, no data leaves the box.

## 4. Functional Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| FR-1 | Upload an avatar image (JPEG/PNG), validated by type & size | Done |
| FR-2 | Enter a multi-sentence script with live word/duration estimate | Done |
| FR-3 | Choose from 50+ self-hosted voices, filterable by gender | Done |
| FR-4 | Synthesize speech locally (Kokoro ONNX), correct gender/accent | Done |
| FR-5 | Generate lip-synced video locally (Wav2Lip) | Done |
| FR-6 | Poll job status; show pipeline progress | Done |
| FR-7 | Preview + download the resulting MP4 | Done |
| FR-8 | Persist projects in PostgreSQL | Done |
| FR-9 | Degrade gracefully if models are missing | Done |

## 5. Non-Functional Requirements

- **Privacy:** all inference local; no user media sent to third parties.
- **Cost:** $0 recurring AI cost (open models only).
- **Hardware:** runs on CPU, ≥4 GB RAM, ~6 GB disk for models.
- **Reliability:** every pipeline stage has a documented fallback.
- **Maintainability:** small focused services; model setup is one command.

## 6. Success Metrics

- M1 — `scripts/test_pipeline.py` reports **PASS** (output is a talking video,
  verified by frame-diff: distinct frames ≫ 1). ✅ Achieved 2026-05-30.
- M2 — Male voices sound male, female voices sound female. ✅ (Kokoro).
- M3 — Zero paid-API calls in the default configuration. ✅

## 7. Constraints & Decisions

- **No paid APIs.** Kokoro ONNX replaces ElevenLabs; Wav2Lip replaces D-ID.
- **No Celery/Redis.** FastAPI BackgroundTasks runs jobs in-process.
- **Models are gitignored** (too large); provisioned by `setup_models.py`,
  which also patches Wav2Lip for modern librosa.

## 8. Roadmap (post-MVP)

| Priority | Item | Notes |
|----------|------|-------|
| P1 | Resolution tiers (1080p/2K/4K upscale) | BUG-004; FFmpeg Lanczos, skip on weak CPU |
| P1 | Subtitles via local Whisper → SRT/VTT | BUG-006 |
| P2 | Align pipeline UI steps with real backend stages | BUG-005 |
| P2 | SadTalker option for full head motion (GPU upgrade path) | Already scriptable |
| P3 | Accurate `DownloadHistory.ip_address`, real voice preview files | BUG-007/008 |

## 9. Acceptance

The MVP is accepted when a fresh machine can: install deps →
`setup_models.py --all` → `test_pipeline.py` returns PASS → run the app and
produce a downloadable talking-head MP4. **All four hold as of 2026-05-30.**
