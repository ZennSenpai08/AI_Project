"""Explicit online setup only: download a small multilingual test model."""
import argparse
import os
from pathlib import Path
if os.environ.get("OFFLINE_ONLY") == "true":
    raise SystemExit("Offline Only blocks downloads. Run explicit setup in connected mode first.")
parser = argparse.ArgumentParser()
parser.add_argument("destination", type=Path)
args = parser.parse_args()
from huggingface_hub import snapshot_download
snapshot_download("Systran/faster-whisper-tiny", local_dir=str(args.destination.resolve()), revision="d90ca5fe260221311c53c58e660288d3deb8d356",
    allow_patterns=["model.bin", "config.json", "tokenizer.json", "vocabulary.*", "README.md"],
    max_workers=2)
print("Multilingual tiny test model downloaded. Set WHISPER_MODEL_PATH to", args.destination.resolve())
