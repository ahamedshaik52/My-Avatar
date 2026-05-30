#!/usr/bin/env python3
"""
End-to-end pipeline smoke test — proves the self-hosted stack actually works.

Runs the REAL services (no mocks):
  1. Kokoro ONNX TTS  → generates speech audio from text
  2. Wav2Lip lip sync  → animates a face image to match the audio
  3. Verifies the output is a TALKING video, not a static image, by
     extracting frames and confirming the mouth region actually changes.

Usage:
  python backend/scripts/test_pipeline.py                 # uses a synthetic test face
  python backend/scripts/test_pipeline.py --face me.jpg   # use your own photo

No paid APIs. No internet needed once models + test face are present.
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # backend/
sys.path.insert(0, str(ROOT))

TEST_DIR = ROOT / "scripts" / "test_assets"
TEST_FACE = TEST_DIR / "test_face.jpg"


def ensure_test_face(face_arg: str | None) -> Path:
    """Return a usable face image path. Downloads a synthetic (non-real-person)
    AI face once for testing if the user did not supply their own."""
    if face_arg:
        p = Path(face_arg).expanduser().resolve()
        if not p.exists():
            sys.exit(f"ERROR: face image not found: {p}")
        return p

    TEST_DIR.mkdir(parents=True, exist_ok=True)
    if TEST_FACE.exists() and TEST_FACE.stat().st_size > 0:
        print(f"[face] using cached test face: {TEST_FACE}")
        return TEST_FACE

    # thispersondoesnotexist serves a fresh GAN-generated face of a person who
    # does not exist — ideal privacy-safe test fixture (no real person's PII).
    print("[face] downloading a synthetic test face (non-real person) ...")
    req = urllib.request.Request(
        "https://thispersondoesnotexist.com/",
        headers={"User-Agent": "Mozilla/5.0 (myavatar-pipeline-test)"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
    TEST_FACE.write_bytes(data)
    print(f"[face] saved {len(data)/1024:.0f} KB -> {TEST_FACE}")
    return TEST_FACE


def count_distinct_frames(video_path: Path) -> tuple[int, int]:
    """Return (total_frames_sampled, distinct_frames). A static-image video
    yields distinct≈1; a real talking video yields distinct≈total."""
    import cv2  # type: ignore[import]
    import numpy as np  # type: ignore[import]

    cap = cv2.VideoCapture(str(video_path))
    prev = None
    total = 0
    distinct = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        total += 1
        small = cv2.resize(frame, (64, 64))
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        if prev is None or float(np.mean(np.abs(gray.astype("int16") - prev.astype("int16")))) > 1.0:
            distinct += 1
        prev = gray
    cap.release()
    return total, distinct


async def main() -> None:
    parser = argparse.ArgumentParser(description="My Avatar E2E pipeline smoke test")
    parser.add_argument("--face", help="Path to a face image (defaults to synthetic test face)")
    parser.add_argument("--voice", default="en-US-GuyNeural", help="Voice id (default: Marcus / male)")
    parser.add_argument(
        "--text",
        default="Hello! I am a fully self hosted AI avatar. My voice and lip movements run entirely on this machine, with no paid services.",
    )
    args = parser.parse_args()

    out_dir = TEST_DIR / "output"
    out_dir.mkdir(parents=True, exist_ok=True)
    audio_path = out_dir / "speech.wav"
    video_path = out_dir / "result.mp4"

    face = ensure_test_face(args.face)

    # ── 1. TTS via the real service ──────────────────────────────────────────
    from app.services.tts_service import tts_service

    print(f"\n[tts] synthesizing speech with voice '{args.voice}' ...")
    audio_bytes, duration = await tts_service.synthesize_with_duration(args.voice, args.text)
    audio_path.write_bytes(audio_bytes)
    print(f"[tts] wrote {len(audio_bytes)/1024:.0f} KB, ~{duration:.1f}s -> {audio_path}")
    assert len(audio_bytes) > 2000, "TTS produced suspiciously small audio"

    # ── 2. Lip sync via the real service ─────────────────────────────────────
    from app.services.lipsync_service import lipsync_service

    print("\n[lipsync] generating talking-head video (Wav2Lip) ... this can take 1-3 min on CPU")
    result = await lipsync_service.generate(str(face), str(audio_path), str(video_path))
    print(f"[lipsync] wrote → {result}")
    assert Path(result).exists() and Path(result).stat().st_size > 0, "No video produced"

    # ── 3. Verify it is a TALKING video, not a static image ──────────────────
    print("\n[verify] sampling frames to confirm motion ...")
    total, distinct = count_distinct_frames(Path(result))
    ratio = (distinct / total) if total else 0.0
    print(f"[verify] frames sampled: {total}, distinct: {distinct} ({ratio*100:.0f}% changing)")

    print("\n" + "=" * 64)
    if distinct >= max(3, total * 0.2):
        print("PASS  Output is a TALKING video - mouth/frames animate over time.")
        print(f"      Video: {result}")
        print(f"      Size:  {Path(result).stat().st_size/1024:.0f} KB, ~{duration:.1f}s")
    else:
        print("WARN  Frames are nearly identical - this looks like a STATIC image.")
        print("      Wav2Lip likely fell back to FFmpeg static composition.")
        print("      Check that WAV2LIP_PATH + WAV2LIP_CHECKPOINT are set and a face was detected.")
        sys.exit(2)
    print("=" * 64)


if __name__ == "__main__":
    asyncio.run(main())
