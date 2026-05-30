# Task List — My Avatar

**Last updated:** 2026-05-30 · Tracks build/QA tasks against the PRD.

## Legend
- ✅ Done · 🔄 In progress · ⏳ Roadmap (post-MVP)

## Phase 1 — Self-hosted rebuild (MVP)

| # | Task | Status | Notes |
|---|------|--------|-------|
| T-1 | Remove paid APIs (D-ID, ElevenLabs) from default path | ✅ | ElevenLabs honored only if key explicitly set |
| T-2 | Kokoro ONNX TTS provider (primary) + edge-tts/gTTS fallback | ✅ | BCP-47 lang codes, process-wide singleton |
| T-3 | Wav2Lip lip-sync engine (subprocess) | ✅ | s3fd detector + wav2lip_gan.pth |
| T-4 | Fix librosa 0.10+ keyword-only `filters.mel()` bug | ✅ | audio.py line 100; was silently falling back to static image |
| T-5 | Make librosa patch survive fresh clones | ✅ | `setup_models.py::patch_wav2lip_librosa()` (idempotent) |
| T-6 | Remove Celery/Redis → FastAPI BackgroundTasks | ✅ | Broker-free, in-process job pipeline |
| T-7 | E2E verification via frame-diff | ✅ | `test_pipeline.py`: 201 frames / 64 distinct → PASS |
| T-8 | One-command model setup | ✅ | `setup_models.py --all` (~3 GB) |
| T-9 | Graceful degradation when models absent | ✅ | TTS + lip-sync fallback chains |

## Phase 2 — Docs & QA alignment

| # | Task | Status | Notes |
|---|------|--------|-------|
| T-10 | Update README (setup, stack, pipeline) | ✅ | Docker/Redis/Celery removed |
| T-11 | Update DEPLOYMENT.md (model-size strategies) | ✅ | Self-host / Railway Volume / cloud degrade |
| T-12 | Update QA_REPORT.md | ✅ | BUG-001/002/003/009 marked FIXED |
| T-13 | Planning docs (PRD, ARCHITECTURE, SYSTEM_DESIGN, TECH_DOC, TASK_LIST) | ✅ | This set |
| T-14 | Update project memory | ✅ | project_myavatar.md |

## Phase 3 — Roadmap (post-MVP)

| # | Task | Status | Bug ref |
|---|------|--------|---------|
| T-15 | Resolution tiers (1080p/2K/4K upscale, FFmpeg Lanczos) | ⏳ | BUG-004 |
| T-16 | UI pipeline steps aligned to real backend stages | ⏳ | BUG-005 |
| T-17 | Subtitles via local Whisper → SRT/VTT | ⏳ | BUG-006 |
| T-18 | SadTalker full head-motion path (GPU upgrade) | ⏳ | — |
| T-19 | Accurate `DownloadHistory.ip_address` | ⏳ | BUG-007 |
| T-20 | Real voice-preview sample files | ⏳ | BUG-008 |

## Acceptance (from PRD §9)

Fresh machine: install deps → `setup_models.py --all` → `test_pipeline.py` returns PASS → run app → produce downloadable talking-head MP4. **All hold as of 2026-05-30.** ✅
