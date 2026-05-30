#!/usr/bin/env python3
"""
One-command setup for all self-hosted AI models.

Usage:
  python backend/scripts/setup_models.py --tts        # Kokoro ONNX (voice)
  python backend/scripts/setup_models.py --lipsync    # Wav2Lip (lip sync)
  python backend/scripts/setup_models.py --sadtalker  # SadTalker (full head motion)
  python backend/scripts/setup_models.py --all        # everything above

All models are free and open-source. No API keys needed.
"""
import argparse
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

# Project root = two levels above this script (backend/scripts/setup_models.py)
ROOT = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = ROOT / "backend" / "models"


def run(cmd: list[str], cwd: Path | None = None, check: bool = True) -> int:
    print(f"\n$ {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd)
    if check and result.returncode != 0:
        print(f"ERROR: command failed with exit code {result.returncode}")
        sys.exit(1)
    return result.returncode


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        print(f"  [skip] already exists: {dest.name}")
        return
    print(f"  Downloading {dest.name} ...")

    def _progress(count: int, block: int, total: int) -> None:
        if total > 0:
            pct = min(count * block * 100 // total, 100)
            print(f"\r  {pct}%", end="", flush=True)

    urllib.request.urlretrieve(url, dest, _progress)
    print()  # newline after progress


# ─────────────────────────────────────────────────────────────────────────────
# Kokoro ONNX — self-hosted TTS, 50 voices (male + female), Apache-2.0
# ─────────────────────────────────────────────────────────────────────────────

def setup_tts() -> None:
    print("\n" + "=" * 60)
    print("Setting up Kokoro ONNX TTS")
    print("  • 82M model, runs on CPU, no internet needed after setup")
    print("  • 50 voices: American/British male + female, + other languages")
    print("=" * 60)

    kokoro_dir = MODELS_DIR / "kokoro"
    kokoro_dir.mkdir(parents=True, exist_ok=True)

    # Install Python packages
    run([sys.executable, "-m", "pip", "install", "-U",
         "kokoro-onnx>=0.5.0", "soundfile", "mutagen"])

    # Download model files (~430 MB total)
    base = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"
    download(f"{base}/kokoro-v1.0.onnx", kokoro_dir / "kokoro-v1.0.onnx")
    download(f"{base}/voices-v1.0.bin",  kokoro_dir / "voices-v1.0.bin")

    # Write .env hint
    env_path = ROOT / "backend" / ".env"
    lines = env_path.read_text().splitlines() if env_path.exists() else []
    kokoro_model_line = f"KOKORO_MODEL_PATH={kokoro_dir / 'kokoro-v1.0.onnx'}"
    kokoro_voices_line = f"KOKORO_VOICES_PATH={kokoro_dir / 'voices-v1.0.bin'}"
    updated = False
    for key in ("KOKORO_MODEL_PATH", "KOKORO_VOICES_PATH"):
        if not any(l.startswith(key) for l in lines):
            if key == "KOKORO_MODEL_PATH":
                lines.append(kokoro_model_line)
            else:
                lines.append(kokoro_voices_line)
            updated = True
    if updated:
        env_path.write_text("\n".join(lines) + "\n")

    print("\n✅ Kokoro TTS ready!")
    print(f"   Models saved to: {kokoro_dir}")
    print("   Add these to backend/.env if not already set:")
    print(f"   {kokoro_model_line}")
    print(f"   {kokoro_voices_line}")


# ─────────────────────────────────────────────────────────────────────────────
# Wav2Lip — self-hosted lip sync, personal/non-commercial use
# ─────────────────────────────────────────────────────────────────────────────

def setup_lipsync() -> None:
    print("\n" + "=" * 60)
    print("Setting up Wav2Lip (self-hosted lip sync)")
    print("  • Runs on CPU (~60-120s for a 10-second video)")
    print("  • Mouth/lips animate in sync with audio")
    print("  • Personal / non-commercial use")
    print("=" * 60)

    wav2lip_dir = MODELS_DIR / "wav2lip"

    # Clone Wav2Lip repo
    if not (wav2lip_dir / "inference.py").exists():
        print("\nCloning Wav2Lip repo ...")
        run(["git", "clone",
             "https://github.com/Rudrabha/Wav2Lip.git",
             str(wav2lip_dir)])
    else:
        print("  [skip] Wav2Lip repo already cloned")

    # Install Wav2Lip Python dependencies
    # NOTE: Wav2Lip's requirements.txt pins ancient versions (numpy==1.17.1, librosa==0.7.0)
    # that are incompatible with Python 3.9+. We install modern compatible replacements.
    print("\nInstalling Wav2Lip dependencies (modern compatible versions) ...")
    wav2lip_deps = [
        "torch",
        "torchvision",
        "opencv-python",
        "numpy>=1.24.0",
        "librosa>=0.10.0",
        "batch-face>=1.4.2",  # modern face-alignment replacement
        "tqdm",
        "numba",
        "scipy",
        "audioread",
    ]
    run([sys.executable, "-m", "pip", "install", "-U"] + wav2lip_deps)

    # Download face detection model
    face_det_dir = wav2lip_dir / "face_detection" / "detection" / "sfd"
    face_det_dir.mkdir(parents=True, exist_ok=True)
    download(
        "https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth",
        face_det_dir / "s3fd.pth",
    )

    # Download Wav2Lip GAN model checkpoint (HuggingFace mirror)
    checkpoints_dir = wav2lip_dir / "checkpoints"
    checkpoints_dir.mkdir(parents=True, exist_ok=True)
    download(
        "https://huggingface.co/numz/wav2lip_studio/resolve/main/Wav2lip/wav2lip_gan.pth",
        checkpoints_dir / "wav2lip_gan.pth",
    )

    # Write .env hint
    env_path = ROOT / "backend" / ".env"
    lines = env_path.read_text().splitlines() if env_path.exists() else []
    wav2lip_path_line = f"WAV2LIP_PATH={wav2lip_dir}"
    wav2lip_ckpt_line = f"WAV2LIP_CHECKPOINT={checkpoints_dir / 'wav2lip_gan.pth'}"
    updated = False
    for key, line in [("WAV2LIP_PATH", wav2lip_path_line),
                       ("WAV2LIP_CHECKPOINT", wav2lip_ckpt_line)]:
        if not any(l.startswith(key) for l in lines):
            lines.append(line)
            updated = True
    if updated:
        env_path.write_text("\n".join(lines) + "\n")

    print("\n✅ Wav2Lip ready!")
    print(f"   Repo + models saved to: {wav2lip_dir}")
    print("   Add these to backend/.env if not already set:")
    print(f"   {wav2lip_path_line}")
    print(f"   {wav2lip_ckpt_line}")


# ─────────────────────────────────────────────────────────────────────────────
# SadTalker — full head motion, Apache-2.0
# ─────────────────────────────────────────────────────────────────────────────

def setup_sadtalker() -> None:
    print("\n" + "=" * 60)
    print("Setting up SadTalker (full head motion + expressions)")
    print("  • Apache-2.0 license — free for any use including commercial")
    print("  • More realistic than Wav2Lip but slower (~4-30 min on CPU)")
    print("  • Use as alternative to Wav2Lip or as GPU upgrade path")
    print("=" * 60)

    sadtalker_dir = MODELS_DIR / "sadtalker"

    if not (sadtalker_dir / "inference.py").exists():
        print("\nCloning SadTalker repo ...")
        run(["git", "clone",
             "https://github.com/OpenTalker/SadTalker.git",
             str(sadtalker_dir)])
    else:
        print("  [skip] SadTalker repo already cloned")

    # Install dependencies
    req_file = sadtalker_dir / "requirements.txt"
    if req_file.exists():
        run([sys.executable, "-m", "pip", "install", "-r", str(req_file)])

    # Download checkpoints using SadTalker's own download script if available
    dl_script = sadtalker_dir / "scripts" / "download_models.sh"
    if dl_script.exists():
        print("\nDownloading SadTalker model checkpoints ...")
        run(["bash", str(dl_script)], cwd=sadtalker_dir)

    env_path = ROOT / "backend" / ".env"
    lines = env_path.read_text().splitlines() if env_path.exists() else []
    sadtalker_line = f"SADTALKER_MODEL_PATH={sadtalker_dir}"
    if not any(l.startswith("SADTALKER_MODEL_PATH") for l in lines):
        lines.append(sadtalker_line)
        env_path.write_text("\n".join(lines) + "\n")

    print("\n✅ SadTalker ready!")
    print(f"   Repo + models saved to: {sadtalker_dir}")


# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download and set up self-hosted AI models for My Avatar"
    )
    parser.add_argument("--tts",       action="store_true", help="Set up Kokoro ONNX TTS")
    parser.add_argument("--lipsync",   action="store_true", help="Set up Wav2Lip lip sync")
    parser.add_argument("--sadtalker", action="store_true", help="Set up SadTalker head motion")
    parser.add_argument("--all",       action="store_true", help="Set up all models")
    args = parser.parse_args()

    if not any(vars(args).values()):
        parser.print_help()
        print("\n  Run with --tts to set up voice, --lipsync for lip sync, or --all for everything.")
        sys.exit(0)

    if args.all or args.tts:
        setup_tts()
    if args.all or args.lipsync:
        setup_lipsync()
    if args.all or args.sadtalker:
        setup_sadtalker()

    print("\n" + "=" * 60)
    print("Setup complete! Restart the backend to use the new models.")
    print("=" * 60)


if __name__ == "__main__":
    main()
