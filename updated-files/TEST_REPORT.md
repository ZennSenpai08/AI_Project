# Current speech/offline phase — 2026-11-12

Baseline was 56 passing tests. Current deterministic suite: 63/63 passing. Syntax check: 44 JS files passed. Edge browser: 5/5 passed (24.4 seconds), including actual Live2D rig rendering, mouth priority, memory and interface flows. Native source suite: 3/3 passed in 37.3 seconds, including actual local STT with synthetic capture, hide/restore/retry and offline egress denial.

Real faster-whisper 1.2.1 tiny model ran on CPU/int8 through the actual HTTP endpoint: silence returned empty text and synthetic Windows English returned “Hello, Zyra. The database connection is ready.” Latest measured readiness is in artifacts/speech/live-stt.json, including worker cancellation/restart verification. These are two different samples, not a statistical latency distribution; no human speech/Tagalog/Taglish quality review occurred. Node mocks are labeled in tests. Offline native fetch/session denials were observed while internet was available; no OS-disconnected full conversation was tested. Native fixed timing assumptions were replaced with frame-derived recording progress. A stale microphone-ended callback could stop new capture; the generation guard and handler cleanup now have a regression test.

The historical report below describes the previous phase; its absent direct-STT limitation is superseded.

# Verification report — 2026-11-12

## Automated tests executed

- npm test: 56/56 passed (latest recorded run 4.18 seconds). Real Node HTTP and SQLite; deterministic/mocked provider transport. Includes character/language protection, 100-turn bounded history scenario, approved memory provenance/correction/deletion and source-context exclusion, session persistence/owner scope, schema rejection, timeouts/rate limits, audio cancellation/stale synthesis, drag threshold, display geometry and shortcut conflict behavior.
- npm run check: syntax passed for 40 JS/CJS files (including Electron main/preload); vendored bundles excluded.
- npm run test:browser: five Edge cases cover memory reload/edit/delete, session rename/switch, settings and HTML injection resistance, mobile controls and actual Mao model rendering/parameter bounds/mouth priority. A temporary diagnostic hand-inspection clock override failed after animation cancellation; it was removed and the affected test passed. Final complete rerun: 5/5 passed in 25.1 seconds.
- npm run test:desktop: one compound native Windows test passed on the source app, then passed on the built Zyrah.exe (14.01 seconds test body). It launches two actual Electron windows with isolated test data, verifies sandbox/Node isolation, renders actual Mao, closes only chat without hiding the companion, captures synthetic Chromium microphone input and verifies tracks end after hide, checks native mute/visibility and restore with mic off, creates an actual shortcut registration conflict, and recovers after a forced renderer crash. These are native automation checks; the audio source is synthetic.
- npm ci and npm ci --prefix avatar-runtime succeeded with 0 reported vulnerabilities in both audits. The unnecessary packaging dependency was removed after its development dependency tree reported five moderate advisories. Runtime setup/download commands succeeded, including checksum verification. npm run setup:desktop was performed through its identical node installer command earlier.
- npm run package:win succeeded. Portable package scan found no .env, SQLite files, .cmo3 or .can3 authoring files. Actual model and main entry were present. Package launch and native lifecycle test passed. This is not a clean-machine installer test.

## Measurements

Local Windows 11 10.0.26200, Ryzen 5 6600H (6 cores/12 threads), RAM 16,438,312,960 bytes, RTX 2050 4096 MiB, driver 595.79. Node 22.18.0/npm 11.10.0; Electron 45.3.0 embeds Node 24.22.2.

npm run benchmark: 30 scripted demo requests through loopback HTTP and in-memory SQLite: median 7.02 ms, p95 24.02 ms, maximum 25.01 ms. This does not measure live LLM, speech synthesis, transcription or end-of-speech-to-audio latency.

artifacts/native/metrics.json contains a short actual process snapshot; artifacts/browser/model-parameters.json records the actual rig's parameter inventory. Screenshots were generated and visually inspected for transparency, complete model framing and raised-arm pose. These snapshots do not establish sustained idle CPU/GPU use, peak system RAM/VRAM or human animation quality.

## External checks and failures

Ollama was not reachable and no local model was found. No cloud credentials were present in the inspected working tree. No paid inference was performed. npm run audition:local executed and failed to reach the absent local service; results.json honestly records that failure. No real voice samples, accent ratings, STT error rates or voice latency measurements are reported.

Physical mouse drag/click-through over another app, actual tray clicks and global key presses, monitor disconnect/DPI changes, OS lock/suspend, real microphone/speaker echo handling and clean-machine installation remain manual checks. Full-duplex acoustic interruption and actual laughter remain unverified. Provider tests use mocks; the 100-turn scenario is deterministic and does not establish live personality quality. See KNOWN_LIMITATIONS.md.

Final portable verification: rebuilt Zyrah.exe passed all 3 native tests in 31.8 seconds, including actual local STT with synthetic capture, hide/restore/retry and network denial. Package scan found no private .env, databases, virtual environment or model weights; the worker, setup script and pinned requirements were included. Runtime/model paths must be configured for package use. No clean-machine installation or human speech evaluation is claimed.
