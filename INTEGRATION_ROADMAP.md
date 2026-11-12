# Focused speech repair delivered — 2026-11-12

Standalone OmniVoice Q4_K_M is installed with two original fixed reference profiles and 14 local audition WAVs; it is the active TTS provider in this checkout. VoiceStudio remains optional/uninstalled. VoxCPM2 was evaluated but not downloaded/quality-auditioned on this 4 GB GPU. Explicit tl/transcribe STT and local Dictate routing replace automatic-only recognition. Playback drives enhanced actual Mao poses and amplitude mouth motion. Native preview/chat, cancellation/hide and restart persistence passed. Human voice preference, real Tagalog microphone quality and a verified real LLM remain open. See updated-files/SPEECH_V2.md and ACCEPTANCE_TESTS.md. Optional advanced services below remain deferred.

The following sections retain earlier phase context; their earlier absent-TTS status is superseded by this focused repair.

# Zyrah integration roadmap — 2026-11-12

## Current foundation and scope

Keep Electron 45.3.0, Node HTTP/SQLite, Pixi/Live2D Mao and the protected Zyrah profile. Baseline audit: 56 tests passed before these changes. Entry points are updated-files/desktop/main.js and updated-files/server/index.js. Existing root edits were preserved; an existing AppData SQLite/WAL set was found and left untouched. No destructive schema migration was needed.

This phase prioritizes direct local STT and fail-closed offline privacy. Python 3.9.13 can run faster-whisper 1.2.1; a project-local environment and pinned requirements lock were installed. CPU/int8 avoids requiring new CUDA/cuDNN libraries on the 4 GB RTX 2050. The small multilingual Systran/faster-whisper-tiny conversion is pinned to d90ca5fe260221311c53c58e660288d3deb8d356; model.bin is 75,538,270 bytes. Both code and model cards report MIT. Source: https://github.com/SYSTRAN/faster-whisper and https://huggingface.co/Systran/faster-whisper-tiny . Tiny is a plumbing test choice, not an endorsed Taglish quality winner.

## Unblocked implementation delivered

- Direct application-owned persistent STT worker: CPU/int8, local files only, socket/DNS denial, in-memory WAV, Silero VAD supplied with faster-whisper, original-language transcription, bounded concurrency/timeout, child termination on cancellation and restart on the next request.
- Strict Offline Only policy: refuses cloud and unaudited loopback proxies, rejects provider network calls before transport, blocks external renderer/session requests and VTube connections; local lexical embeddings/document parsing and approved memory stay local. Browser dictation is prohibited; browser TTS requires an installed localService voice. No updater or telemetry integration exists. Chromium background networking/component updates and spellcheck downloads are disabled.
- Safer output: voice pitch no longer artificially raised; distress context suppresses amusement cues; speech errors clear active reactions. Navy/lavender/gold interface accents follow Mao.

## Core gates still open

1. Configure and verify a real local LLM. Strict Offline Only currently refuses Ollama and other external services because their downstream network isolation has not been verified. It permits the labeled scripted demo for UI tests, not real offline conversation. Do not bypass this with a self-attestation checkbox.
2. Listen to the generated A/B auditions and approve or reject a voice; verify accent, Taglish and laughter. OS speech is an explicitly configured legacy provider, never an automatic fallback. No creator cloning is authorized.
3. Human microphone/noise/disconnection, physical window/monitor/hotkey tests and a truly disconnected complete conversation remain unverified.

## Independently evaluated advanced services — all deferred, no adapters enabled

OpenJarvis: https://github.com/open-jarvis/OpenJarvis , Apache-2.0, Python >=3.10 per upstream README. Offers tools, orchestration and resource evaluation, but no authorized tool requirement currently justifies another agent stack. Upstream describes optional cloud fallback and an installer that brings Ollama/models; do not run it for this core task. Deployment/API and actual resource fit remain untested on this Python 3.9 machine.

Hindsight: https://github.com/vectorize-io/hindsight , MIT. Retain/recall/reflect APIs offer temporal/semantic memory. Retain uses an LLM; a local HTTP endpoint alone cannot establish privacy. A separate service/database/extraction model would duplicate current authoritative SQLite for a benefit not yet measured. Before adoption require source IDs, owner scope, an outbox for correction/deletion retries and downstream offline verification.

AnythingLLM: https://github.com/Mintplex-Labs/anything-llm , MIT repository; desktop/Docker deployments with separate configured providers. It could add richer authorized document ingestion beyond current local TXT/MD retrieval, but no request justifies duplicated storage and inference today. API deployment and downstream parser/embedding/reranker/model behavior must be verified before integration. Documents remain untrusted data.

VoiceStudio: https://github.com/debpalash/VoiceStudio , AGPL-3.0 application, optional separately configured service. https://voicestudio.sh/docs/api-reference/audio documents OpenAI-compatible speech/transcription; actual engine availability is version-dependent. VoxCPM2 (https://github.com/OpenBMB/VoxCPM, Apache-2.0 code/weights per upstream) lists Tagalog; OmniVoice (https://github.com/k2-fsa/OmniVoice, Apache-2.0 repository) documents multilingual design/cloning and some nonverbal controls. No candidate TTS weights were installed and no target-machine quality/performance ranking is claimed. Reference audio permissions and engine-specific controls require separate review.

Any future integration needs its own disabled-by-default flag, verified health check, timeout, safe fallback, source/deletion semantics and offline audit. No provider-discovery list is a runtime dependency. No service was purchased, installed globally, published or enabled by this roadmap.
