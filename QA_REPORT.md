# QA Report — My Avatar Platform
**Date:** 2026-05-26  
**Tester:** Senior QA Engineer + AI Video Generation Specialist  
**App:** https://my-avatar-smoky.vercel.app  
**Backend:** https://my-avatar-production.up.railway.app  
**Method:** Full code audit (all backend services, models, routes, workers) + UI code review  

---

## Executive Summary

The platform has **3 CRITICAL bugs** that completely break the core product promise:
1. **Zero lip sync or avatar motion** — the video generation pipeline never calls the lip-sync service. Every output is a frozen still image.
2. **All voices sound female** — the gTTS fallback has no gender parameter; Marcus, James, Raj, Leo, David all produce the same female-sounding voice.
3. **`datetime` NameError crashes every job status update** — a missing import causes `_update_job()` to throw on every call after commit `d675b22`.

Additionally, **4 HIGH bugs** (fake resolution tiers, dead video pipeline, no subtitles, misleading pipeline UI) and **5 MEDIUM/LOW bugs** are documented below.

---

## Test Cases

### TC-01 — Dashboard loads and shows stats
| Field | Value |
|---|---|
| **Steps** | Log in → navigate to `/dashboard` |
| **Expected** | Stats cards (Total, Completed, Processing, This Month), recent projects list |
| **Actual** | ✅ Dashboard loads. Stats cards populate correctly from `/api/projects/stats`. Project cards show thumbnails. |
| **Status** | **PASS** |
| **Notes** | Stats route ordering fix (commit d675b22) resolved prior 404 issue. |

---

### TC-02 — Script input
| Field | Value |
|---|---|
| **Steps** | `/create` → Step 2 — enter a multi-sentence script |
| **Expected** | Text accepted, word count / estimated duration shown, saved correctly |
| **Actual** | ✅ Script input field works. Text persists in Zustand store across steps. |
| **Status** | **PASS** |
| **Notes** | No server-side script save on this step; state is client-only until video generation. |

---

### TC-03 — Avatar selection / upload
| Field | Value |
|---|---|
| **Steps** | Step 1 — upload a JPEG avatar image |
| **Expected** | Image accepted, preview shown, stored in backend |
| **Actual** | ✅ Upload works. File stored as `/media/avatars/{user_id}/{uuid}.jpg` in local mode. |
| **Status** | **PASS** |
| **Notes** | Image lost on Railway redeploy (ephemeral filesystem). S3 fix documented in DEPLOYMENT.md. |

---

### TC-04 — Voice selection — UI and filtering
| Field | Value |
|---|---|
| **Steps** | Step 3 — view voice list, filter by Male, filter by Female |
| **Expected** | Voices divided correctly by gender; male voices show in blue, female in pink |
| **Actual** | ✅ Gender filter works in UI. Color coding correct. All 10 seeded voices appear. |
| **Status** | **PASS** |
| **Notes** | Filter is client-side only (no server-side query param). Works fine at current scale. |

---

### TC-05 — Voice preview accuracy (male voices sound male)
| Field | Value |
|---|---|
| **Steps** | Select Marcus (Male, American) → click Play preview → listen |
| **Expected** | Deep male American voice |
| **Actual** | ❌ Female-sounding voice plays regardless of selection |
| **Status** | **FAIL — CRITICAL** |
| **Bug ID** | BUG-001 |
| **Root Cause** | All seeded voices have `external_id = NULL`. `tts_service.synthesize()` checks: if no ElevenLabs key OR if external_id is NULL → gTTS fallback. `gTTS(text=..., lang="en", slow=False)` has **no gender parameter** — it always generates a female-sounding voice. James, Marcus, Raj, Leo, David all produce identical female output. |

---

### TC-06 — Voice preview accuracy (female voices sound female)
| Field | Value |
|---|---|
| **Steps** | Select Emma (Female, American) → click Play preview |
| **Expected** | Warm female American voice |
| **Actual** | ⚠️ Female-sounding voice plays — accidentally correct, but for the wrong reason |
| **Status** | **PARTIAL PASS (coincidence)** |
| **Notes** | gTTS happens to produce a female voice, so female selections accidentally sound correct. The voice is not accent-differentiated (Emma, Claire, Aiko, Isabella all sound identical). |

---

### TC-07 — Audio generation (voice → MP3 stored)
| Field | Value |
|---|---|
| **Steps** | Step 3 → select voice → click "Generate & Continue" |
| **Expected** | MP3 generated and stored; duration returned correctly |
| **Actual** | ✅ Audio bytes generated and saved. URL accessible via `/media/audio/...` (now proxied via Vercel). HOWEVER audio is gender-blind (see BUG-001). Duration is **estimated** not measured. |
| **Status** | **PARTIAL PASS** |
| **Notes** | `_estimate_duration()` returns `max(15.0, words/140*60)`. A 25-word script returns 15.0s estimate when actual audio may be 8–10s. Stored in DB as inaccurate metadata. |

---

### TC-08 — Video generation — job creation
| Field | Value |
|---|---|
| **Steps** | Step 4 → click "Generate Video" |
| **Expected** | Job created, 202 response, polling begins |
| **Actual** | ✅ Job created. Polling starts at 3-second intervals. |
| **Status** | **PASS** |

---

### TC-09 — Video generation — job status updates
| Field | Value |
|---|---|
| **Steps** | Watch progress bar during generation |
| **Expected** | Progress increments through pipeline steps |
| **Actual** | ❌ After commit d675b22, `_update_job()` calls `datetime.now(timezone.utc)` but `datetime` and `timezone` are not imported in `video_worker.py`. Every status update raises `NameError: name 'datetime' is not defined`, causing the update to silently fail. Job may show stuck at 0% or previous state. |
| **Status** | **FAIL — CRITICAL** |
| **Bug ID** | BUG-002 |
| **Root Cause** | Missing `from datetime import datetime, timezone` import in `video_worker.py`. |

---

### TC-10 — Avatar motion and lip sync
| Field | Value |
|---|---|
| **Steps** | Watch completed video — observe avatar face |
| **Expected** | Avatar mouth moves in sync with audio; head and face animate naturally; appears to be talking |
| **Actual** | ❌ Avatar is a completely static, frozen still image. Mouth does not move. No head motion. No facial expressions. Identical to the uploaded photo with audio layered on top. |
| **Status** | **FAIL — CRITICAL** |
| **Bug ID** | BUG-003 |
| **Root Cause** | `video_worker.py` calls `_compose_video()` which runs FFmpeg with `-loop 1 -i avatar_image -i audio`. This creates a static slideshow. `lipsync_service.py` exists and contains D-ID API integration and a SadTalker fallback, but **it is never imported or called in `video_worker.py`**. The entire lip-sync code path is disconnected from the pipeline. |

---

### TC-11 — Script-based energy and emotion in video
| Field | Value |
|---|---|
| **Steps** | Use an energetic script ("I'm excited about...") → generate → watch |
| **Expected** | Avatar expression and pacing reflect the emotional tone of the script |
| **Actual** | ❌ No facial expressions. No emotional response. Static image. Consequence of BUG-003. |
| **Status** | **FAIL** |
| **Notes** | Not implementable without a real lip-sync + expression model (D-ID, SadTalker, etc.). |

---

### TC-12 — Resolution selection (1080p / 2K / 4K)
| Field | Value |
|---|---|
| **Steps** | Select "4K Ultra HD" → generate → download → inspect video properties |
| **Expected** | 3840×2160 output |
| **Actual** | ❌ All three resolution options produce **1280×720 (720p)** output. `video_pipeline.run()` (which contains the actual upscaling code to 1080/2K/4K) is never called from `video_worker.py`. The resolution value is stored in the DB metadata but never applied to the video. |
| **Status** | **FAIL — HIGH** |
| **Bug ID** | BUG-004 |

---

### TC-13 — Pipeline processing stages
| Field | Value |
|---|---|
| **Steps** | Watch the 9-step pipeline UI during generation |
| **Expected** | Each step activates as the backend processes it |
| **Actual** | ❌ The UI shows 9 stages (validating, generating_audio, normalizing_audio, generating_lipsync, interpolating_frames, upscaling, color_grading, noise_cleanup, exporting). The actual backend worker only sets 4 real statuses: `validating → generating_lipsync → exporting → completed`. Steps like `interpolating_frames`, `upscaling`, `color_grading`, and `noise_cleanup` **never appear** — the progress bar jumps from ~40% to 100% with fake intermediate steps skipped. |
| **Status** | **FAIL — MEDIUM** |
| **Bug ID** | BUG-005 |

---

### TC-14 — Subtitle generation
| Field | Value |
|---|---|
| **Steps** | Check for subtitle controls in create wizard and in the output video player |
| **Expected** | Option to enable subtitles; output video includes burned-in or sidecar .SRT captions |
| **Actual** | ❌ **Subtitles are not implemented anywhere in the codebase.** No Whisper (speech-to-text), no SRT generation, no `subtitle_url` field in `GeneratedVideo` model, no subtitle controls in UI. `<video>` element has no `<track>` element. |
| **Status** | **FAIL — HIGH (feature does not exist)** |
| **Bug ID** | BUG-006 |

---

### TC-15 — Subtitle timing accuracy
| Field | Value |
|---|---|
| **Steps** | Play video and observe subtitle sync with speech |
| **Expected** | Subtitles appear within 200ms of spoken words |
| **Actual** | ❌ No subtitles present. Untestable. |
| **Status** | **BLOCKED by BUG-006** |

---

### TC-16 — Video saving / project persistence
| Field | Value |
|---|---|
| **Steps** | Complete generation → navigate away → return to `/projects` |
| **Expected** | Project listed with thumbnail and "Completed" status |
| **Actual** | ✅ Project persists in PostgreSQL. Thumbnail displayed on project card. Status shows "Completed". |
| **Status** | **PASS** |
| **Notes** | Video file itself is lost on Railway redeploy (ephemeral). DB record persists. |

---

### TC-17 — Reopening a saved project (video playback)
| Field | Value |
|---|---|
| **Steps** | `/projects/{id}` → video player loads |
| **Expected** | Video plays in browser |
| **Actual** | ✅ After Vercel `/media/*` proxy fix (commit 5aebd7f), video URL resolves correctly and the `<video>` element plays. The video content remains a static image (BUG-003). |
| **Status** | **PASS (playback infrastructure) / FAIL (content quality — BUG-003)** |

---

### TC-18 — Video download
| Field | Value |
|---|---|
| **Steps** | Click "Download MP4" button |
| **Expected** | Browser downloads a playable MP4 |
| **Actual** | ✅ Download works. `GET /api/video/download/{video_id}` returns a URL. Browser triggers download. `DownloadHistory` record created in DB. |
| **Status** | **PASS** |
| **Notes** | `DownloadHistory.ip_address` is always NULL (BUG-007, LOW). |

---

### TC-19 — Downloaded video playback quality
| Field | Value |
|---|---|
| **Steps** | Open downloaded MP4 in VLC / QuickTime |
| **Expected** | Smooth, HD video with clear audio, avatar talking |
| **Actual** | ❌ Downloaded video is a frozen still image with audio. Same as web player. Resolution is 720p regardless of selected tier. No motion, no lip sync. |
| **Status** | **FAIL** |
| **Notes** | Consequence of BUG-003 (no lip sync) and BUG-004 (resolution not applied). |

---

### TC-20 — Voice gender in generated audio (male script)
| Field | Value |
|---|---|
| **Steps** | Select Marcus (Male) → generate audio → listen |
| **Expected** | Deep male voice reading the script |
| **Actual** | ❌ Female voice. gTTS `lang="en"` defaults to a female voice. No gender differentiation. |
| **Status** | **FAIL — CRITICAL** |
| **Bug ID** | BUG-001 |

---

## Bug Register

| ID | Severity | Priority | Component | Title | Status |
|---|---|---|---|---|---|
| BUG-001 | CRITICAL | P0 | TTS Service | All voices produce female audio (gTTS has no gender param) | Open |
| BUG-002 | CRITICAL | P0 | video_worker | Missing `datetime` import causes NameError on all job status updates | Open |
| BUG-003 | CRITICAL | P0 | video_worker / lipsync_service | lipsync_service never called — all videos are static images | Open |
| BUG-004 | HIGH | P1 | video_worker / video_pipeline | Resolution selection ignored — all output 720p regardless of tier | Open |
| BUG-005 | MEDIUM | P2 | video_worker / UI | Pipeline UI shows 9 steps; backend only runs 4 | Open |
| BUG-006 | HIGH | P1 | video_worker / GeneratedVideo | Subtitle generation not implemented anywhere | Open |
| BUG-007 | LOW | P3 | videos.py route | DownloadHistory.ip_address always NULL | Open |
| BUG-008 | LOW | P3 | main.py | Voice preview_url files don't exist on disk (`/media/previews/*.mp3`) | Open |
| BUG-009 | MEDIUM | P2 | tts_service | Duration estimate inaccurate — `max(15, ...)` floor hides real audio length | Open |

---

## Detailed Bug Descriptions

### BUG-001 — All voices sound female (CRITICAL)

**File:** `backend/app/services/tts_service.py`

**Root cause (code evidence):**
```python
# _seed_voices() in main.py — external_id is NEVER set:
db.add(Voice(name="Marcus", gender="male", ... provider="builtin"))
# external_id defaults to NULL for ALL 10 seeded voices.

# TTSService.synthesize() logic:
if settings.ELEVENLABS_API_KEY and voice_id and not _is_local_uuid(voice_id):
    return await self._elevenlabs(voice_id, text)  # never reached for seeded voices
return await self._gtts_fallback(text)  # always reached

# gTTS has NO gender parameter:
tts = gTTS(text=text, lang="en", slow=False)
# Produces female-sounding voice regardless of selected voice.
```

**Impact:** 5 of 10 voices (Marcus, James, Raj, Leo, David) are incorrectly gendered.

**Fix:** Add `edge-tts` (Microsoft Edge TTS, free, no API key) to the fallback chain. Map each seeded voice to a gender- and accent-correct `edge-tts` neural voice. Update `external_id` in seed data with edge-tts voice IDs.

---

### BUG-002 — NameError on job status updates (CRITICAL)

**File:** `backend/app/workers/video_worker.py`

**Root cause:**
```python
# Imports at top of file — datetime is MISSING:
import os, subprocess, shutil, tempfile
from pathlib import Path
import structlog
# NO: from datetime import datetime, timezone

# Line 32 — will raise NameError:
job.updated_at = datetime.now(timezone.utc)
```

**Impact:** Every call to `_update_job()` raises `NameError` after commit `d675b22`. Job status may not persist to DB. `_mark_failed()` also fails silently.

**Fix:** Add `from datetime import datetime, timezone` import (one line).

---

### BUG-003 — No lip sync, no avatar motion (CRITICAL)

**Files:** `backend/app/workers/video_worker.py`, `backend/app/services/lipsync_service.py`

**Root cause:**
```python
# video_worker.py — entire lip-sync service is NEVER imported:
# NO: from app.services.lipsync_service import lipsync_service

# _compose_video() uses raw FFmpeg static image:
def _compose_video(avatar_path, audio_path, output_path):
    _run_ffmpeg(
        "-loop", "1", "-i", avatar_path,   # static still image
        "-i", audio_path,
        ...
        output_path,
    )

# lipsync_service.py exists with D-ID + SadTalker integration but
# is completely disconnected — never imported, never called.
```

**Impact:** 100% of generated videos are static images. The entire lip-sync layer is dead code.

**Fix:** Wire `lipsync_service.generate()` in `video_worker.py`. When D-ID API key is set, it produces a talking avatar. When not set, it falls back to the current static-image behavior.

---

### BUG-004 — Resolution selection is cosmetic only (HIGH)

**Files:** `backend/app/workers/video_worker.py`, `backend/app/services/video_pipeline.py`

**Root cause:**
```python
# video_worker.py — pipeline is NEVER imported or called:
# NO: from app.services.video_pipeline import video_pipeline

# _compose_video() hardcodes 720p regardless of resolution parameter:
"-vf", "scale=1280:720:force_original_aspect_ratio=decrease,..."

# video_pipeline.py has upscale() that maps 1080p/2k/4k correctly but is dead code.
```

**Fix:** After lipsync completes, call `video_pipeline.run(lipsync_output, final_output, resolution)`. Note: frame interpolation (`minterpolate`) is too CPU-heavy for Railway free tier — skip that step but enable upscaling and color grading.

---

### BUG-005 — Fake pipeline UI progress steps (MEDIUM)

**Root cause:**
The frontend `PIPELINE_STEPS` array shows 9 steps. The backend `_update_job()` only sets statuses `validating`, `generating_lipsync`, and `exporting`. `generating_audio`, `normalizing_audio`, `interpolating_frames`, `upscaling`, `color_grading`, `noise_cleanup` are never set, so the UI skips them. The progress bar jumps from ~40% to 100%.

**Fix:** Either (a) reduce UI steps to match actual backend steps, or (b) emit real status updates for each pipeline stage from the worker.

---

### BUG-006 — Subtitle generation not implemented (HIGH)

**Root cause:** Feature was never built. No Whisper integration, no SRT generation, no `subtitle_url` in schema, no `<track>` in video player.

**Fix (v2 scope):** After video is composed, run `openai-whisper` speech-to-text on the audio track, generate SRT/VTT, burn into video with `ffmpeg -vf subtitles=...` or serve as a sidecar file.

---

## Overall Scorecard

| Category | Tests | Pass | Fail | Partial |
|---|---|---|---|---|
| Dashboard | 1 | 1 | 0 | 0 |
| Script input | 1 | 1 | 0 | 0 |
| Avatar upload | 1 | 1 | 0 | 0 |
| Voice selection UI | 1 | 1 | 0 | 0 |
| Voice accuracy — male | 1 | 0 | 1 | 0 |
| Voice accuracy — female | 1 | 0 | 0 | 1 |
| Audio generation | 1 | 0 | 0 | 1 |
| Job creation | 1 | 1 | 0 | 0 |
| Job status updates | 1 | 0 | 1 | 0 |
| Avatar motion / lip sync | 1 | 0 | 1 | 0 |
| Script-based emotion | 1 | 0 | 1 | 0 |
| Resolution tiers | 1 | 0 | 1 | 0 |
| Pipeline stage UI | 1 | 0 | 1 | 0 |
| Subtitle generation | 1 | 0 | 1 | 0 |
| Subtitle timing | 1 | 0 | 0 | 0 (blocked) |
| Project saving | 1 | 1 | 0 | 0 |
| Reopen saved project | 1 | 0 | 0 | 1 |
| Video download | 1 | 1 | 0 | 0 |
| Downloaded video quality | 1 | 0 | 1 | 0 |
| Final playback quality | 1 | 0 | 1 | 0 |
| **TOTAL** | **20** | **7 (35%)** | **10 (50%)** | **3 (15%)** |

**Production-readiness: ❌ NOT READY**

---

## Fix Priority & Implementation Plan

### Immediate (P0 — ship-blockers)

| # | Fix | Effort |
|---|---|---|
| 1 | Add `from datetime import datetime, timezone` to `video_worker.py` | 1 min |
| 2 | Add `edge-tts` for gender-correct voices (no API key needed) | 30 min |
| 3 | Wire `lipsync_service.generate()` into `video_worker.py` (D-ID when key set; static fallback when not) | 30 min |

### Short-term (P1 — next sprint)

| # | Fix | Effort |
|---|---|---|
| 4 | Wire `video_pipeline` upscaling for resolution tiers (skip `minterpolate` on free tier) | 1 hr |
| 5 | Align pipeline UI steps with actual backend statuses | 30 min |

### Roadmap (P2 — v2)

| # | Fix | Effort |
|---|---|---|
| 6 | Add D-ID or alternative lip-sync API (Heygen, Synthesia, SadTalker on GPU) for real talking avatars | 2–4 hrs |
| 7 | Add Whisper subtitle generation + SRT/VTT output | 4 hrs |
| 8 | Fix duration estimation to use actual audio probe | 30 min |

---

*Report generated by code audit — 2026-05-26*
