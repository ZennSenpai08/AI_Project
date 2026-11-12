"""Application-owned local-only STT. Never download weights or retain recordings."""
import base64
import io
import json
import os
import sys
from pathlib import Path

os.environ.update(HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1", HF_HUB_DISABLE_TELEMETRY="1")
# No network is needed for this worker, including dependency/provider discovery.
import socket
def no_network(*args, **kwargs):
    raise OSError("Network is disabled in the speech worker")
socket.socket.connect = no_network
socket.socket.connect_ex = no_network
socket.create_connection = no_network
socket.getaddrinfo = no_network

def run():
    from faster_whisper import WhisperModel
    folder = Path(sys.argv[1]).resolve(strict=True)
    model = WhisperModel(str(folder), device="cpu", compute_type="int8", cpu_threads=4, local_files_only=True)
    for line in sys.stdin:
        request = {}
        try:
            if len(line) > 4100000:
                raise ValueError("input too large")
            request = json.loads(line)
            audio = base64.b64decode(request["audio"], validate=True)
            if len(audio) > 3000000:
                raise ValueError("audio too large")
            segments, _ = model.transcribe(io.BytesIO(audio), task="transcribe", language=None,
                beam_size=3, vad_filter=True, condition_on_previous_text=False)
            text = " ".join(s.text.strip() for s in segments).strip()
            print(json.dumps({"id": request["id"], "text": text[:4000]}), flush=True)
        except Exception:
            print(json.dumps({"id": request.get("id"), "error": "transcription_failed"}), flush=True)

if __name__ == "__main__":
    run()
