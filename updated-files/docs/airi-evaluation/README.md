# Isolated foundation evaluation — 2026-11-12

AIRI was inspected separately through its upstream README and development instructions at https://github.com/moeru-ai/airi . Its MIT application includes web and Electron desktop targets, Live2D/VRM and provider integrations. Upstream documents pnpm i, pnpm dev and pnpm dev:tamagotchi. It was not cloned, installed or benchmarked. Migrating would replace the existing working Node/SQLite chat, memory and voice pipelines and introduce a larger monorepo; retain this application. This directory is the isolated evaluation record, not merged framework code.

Amica (https://github.com/semperai/amica) provides conversational 3D emotion mapping as a reference; no personality/code/assets copied. three-vrm (https://github.com/pixiv/three-vrm, MIT) is unnecessary for the supplied Live2D rig; avoid a second renderer.

VoiceStudio (https://github.com/debpalash/VoiceStudio, AGPL-3.0 application) is an optional separately configured local service. Its compatibility endpoints and documented engine IDs were inspected; installed-engine compatibility and performance still require a running service. VoxCPM2 (https://github.com/OpenBMB/VoxCPM, Apache-2.0 code/weights per upstream) and OmniVoice (https://github.com/k2-fsa/OmniVoice, Apache-2.0 repository) are audition candidates. No weights downloaded; voice/reference permissions remain separate.

faster-whisper (https://github.com/SYSTRAN/faster-whisper, MIT) is a practical local multilingual STT candidate through the service adapter. Its CUDA/CTranslate2 dependencies need platform-specific installation; do not infer compatibility solely from the installed NVIDIA driver. Silero VAD (https://github.com/snakers4/silero-vad, MIT) is a future speech-boundary option. Existing lightweight RMS VAD is retained and is not labeled Silero. Ollama (https://github.com/ollama/ollama, MIT runtime) is supported through its documented OpenAI compatibility endpoint; individual model licenses remain separate. No compatible local model is currently installed/reachable.

The hardware inventory was obtained locally on Windows: Ryzen 5 6600H, 16,438,312,960 bytes RAM, RTX 2050 4096 MiB, driver 595.79, Windows 11 10.0.26200. No upstream speed claims are treated as measurements on this computer.

