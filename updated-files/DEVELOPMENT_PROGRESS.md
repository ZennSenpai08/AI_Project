## Local STT and offline phase — 2026-11-12

Audited current Git changes, actual Electron/runtime dependencies, entry points, tests and existing AppData SQLite/WAL files without modifying user records. Optional roadmap/acceptance/start-here files were absent and are now created. Baseline 56 tests passed.

Fixed stale microphone-disconnect callbacks crossing capture generations; added captured-frame recording duration and hidden-state Record gating.

Implemented direct faster-whisper 1.2.1 via an owned persistent CPU/int8 worker, pinned Python requirements and tiny model revision, local-file loading, in-memory audio, bundled VAD, socket/DNS denial, bounded concurrency and kill-on-cancel/restart. Installed only a project-local venv and ~75 MB multilingual model. Created a private .env only because none existed, selecting tested local STT without credentials.

Implemented strict offline configuration and transport/session/CSP enforcement; unaudited loopback services are refused rather than assumed offline. Device voice selection requires localService=true; browser dictation/external avatar links are blocked. No complete offline AI conversation is claimed. Removed artificial pitch boost, added serious-context gesture guard, clears reactions on voice failure, adjusted palette to navy/lavender/gold. No database migration or optional external service was introduced.

63 deterministic tests and five Edge browser cases passed. Real engine through HTTP returned empty silence and synthetic English with Zyrah transcribed as Zyra; latest measured CPU times were 3220 ms initial silence and 1341 ms following synthetic English. This is not human speech or a quality/latency guarantee. Native offline egress test passed with internet available; native source suite passed 3/3, including direct capture/transcription/hide/retry using synthetic Chromium audio. Actual disconnected full conversation is blocked by absent verified local LLM; Tagalog/Taglish and real-device voice quality remain unverified.

See ACCEPTANCE_TESTS.md and INTEGRATION_ROADMAP.md for remaining gates and independent advanced-integration evaluations.

# Zyrah development progress — 2026-11-12

## Repository audit and foundation

The starting working tree contained edited root requirements and Mao assets; tracked application files were already deleted and updated-files did not exist. Source from Git f9f8fcd was copied into updated-files without checkout/reset. Existing root deletions, assets and unrelated build_zyrah.md were preserved. No credentials or user databases were found in the working tree.

Retained Node HTTP/SQLite and browser ES modules, existing memory/voice providers and Mao assets; added Electron 45.3.0. AIRI was evaluated separately in docs/airi-evaluation/README.md. No competing companion framework was merged.

## Plan and completed work

- [x] Audit, hardware inventory and baseline: 45/48 recovered tests passed; three asset-location failures fixed.
- [x] Versioned Zyrah identity and bounded emotion/gesture output, with deterministic defaults.
- [x] Actual Mao model rendering, inspected parameter ranges, face/body layers and raised-arm greeting approximation.
- [x] Playback-triggered performance, audio amplitude mouth priority, cancellation and half-duplex capture.
- [x] Electron companion/chat windows, native tray, pin, shortcut conflict detection, alpha hit map, saved bounds and display-work-area recovery.
- [x] Central hide invalidation, backend abort, immediate mute, renderer capture release and fail-closed destruction; mic stays off on restore.
- [x] Searchable previews and current-session recovery; approved memory CRUD, source exclusion on forgetting and source-linked note deletion with conversations.
- [x] Local VoiceStudio-compatible speech adapter, identical-sample audition script and measured hardware baseline.
- [x] Windows portable build script with explicit source allowlist; no .env, database or model-editor source included.
- [x] Updated root/readable application documentation and preserved asset notices.
- [ ] Live LLM and English/Filipino/Taglish voice acceptance: blocked by absent model/service/credentials and no selected permitted voice.
- [ ] Physical pointer/tray/hotkey, monitor hotplug, actual lock/suspend, real microphone/speaker and clean-machine checks.

## Verification and measured environment

Windows 11 Home 10.0.26200; Ryzen 5 6600H, 6 cores/12 threads; RAM 16,438,312,960 bytes; RTX 2050 4096 MiB, driver 595.79. Node 22.18.0/npm 11.10.0; Electron embeds Node 24.22.2. Hardware was read locally, not inferred from a remote Linux environment.

56 unit/API/provider/controller tests passed. Five Edge browser tests exercise history/memory and actual Mao rendering/mouth layering. Native Windows automation exercises sandboxing, actual transparent model window, chat close versus hide, synthetic capture-track release, restore, real shortcut registration conflict and forced renderer-crash recovery. See TEST_REPORT.md for final execution details. These do not establish live microphone/provider quality.

Demo loopback/in-memory benchmark, n=30: median 7.02 ms, p95 24.02 ms, max 25.01 ms. This measures scripted HTTP behavior only. Native process metrics and model inventory are under artifacts, with no claim of sustained idle/peak utilization. Local voice audition failed to connect; no audio/voice rating was invented.

## Continue from here

Run from updated-files: npm run desktop. Configure a running local model and permitted local voice via .env.example; do not download large weights or incur paid inference without an explicit budget/authorization. Human audition on this RTX 2050 is the next highest-value step. Open-palm waving and audible laughter remain unverified model/voice capabilities. No release, push, purchase or installer publication occurred.

Final portable verification: rebuilt Zyrah.exe passed all 3 native tests in 31.8 seconds, including actual local STT with synthetic capture, hide/restore/retry and network denial. Package scan found no private .env, databases, virtual environment or model weights; the worker, setup script and pinned requirements were included. Runtime/model paths must be configured for package use. No clean-machine installation or human speech evaluation is claimed.
