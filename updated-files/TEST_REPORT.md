# Current speech repair verification — 2026-11-12

- `npm run check`: 51 JavaScript files passed syntax checks.
- `npm test`: **70/70 passed** (latest 6.67 seconds). Real HTTP/SQLite plus deterministic provider/process mocks; includes explicit tl/en/auto configuration, persisted profile, owned-process replacement, stale cancellation and bounded AudioContext resume.
- `npm run test:browser`: **5/5 Edge cases passed** (21.2 seconds), including actual Mao rig/parameter rendering, mouth priority, chat/memory and layout regressions.
- `npm run test:desktop`: **3/3 native Windows cases passed** (35.6 seconds). Actual Electron windows, synthetic Chromium capture, actual faster-whisper tiny inference, Dictate through local STT, hide/transcription/retry, native shortcut conflict, crash recovery and offline request blocking.
- `node --test tests/native/speech-v2.test.js`: **1/1 native neural case passed** (127.1 seconds). Actual OmniVoice Q4 on Vulkan1/RTX 2050, profile B preview and conversational WAV playback, nonzero mouth amplitude relayed after chat closes, numeric turn/segment cues, Stop clears mouth/cues, hide mutes/hides, a real owned synthesis process is canceled, fake capture/listening pose and profile persistence/mic-off restart. Conversation is the scripted demo; capture is synthetic. This is native automated rendering/playback evidence, not human listening, physical pointer acceptance or a live LLM test.
- `node scripts/compare-stt-v2.js`: **12 real-engine inferences executed** (tiny/base × Filipino synthetic greeting/English Windows fixture × auto/fil/en). Tiny/auto misdetected the Filipino greeting as English; tiny/tl improved that fixture but retained errors. WER details and exact normalization are in artifacts/voice-v2/stt-comparison.json. No human Tagalog accuracy claim.
- Original voice auditions: **14 actual WAVs** (two references × six identical requested lines, plus laughter each), and six reconstructed OS-default comparison WAVs. No human preference/quality approval recorded. artifacts/voice-v2/index.html is the playable comparison.
- `./speech/setup-neural.ps1 -Offline`: passed incremental native build and pinned weight checksum verification on this installed toolchain. Fresh-machine full setup remains unverified.

Evidence: artifacts/unit-speech-v2.log, browser-speech-v2.log, desktop-speech-v2.log, native-speech-v2-final2.log, performance-v2/evidence.json and screenshots. Latest native synthesis: 31,601 ms preview and 42,527 ms reply. These are synthesis times, not an end-to-end audio-latency distribution. Standalone RTX/RVQ audition samples were roughly 15–24 seconds; initial CPU attempts were much slower and one timed out.

Several intermediate native tests failed: video capture stalled navigation, response-body observation stalled, and post-hide playback checks were inconsistent. Tests were changed to observe the renderer's real fetch and amplitude signals, use an explicit Send gesture, and record bounded states. Source now also bounds suspended AudioContext resume, explicitly clears cues across IPC, and serializes replacement synthesis until the old owned child exits. Only the final passing log above is acceptance evidence; prior failures are retained in ignored artifacts.

Physical microphone/noise/Tagalog/Taglish and voice preference, OS-disconnected full LLM flow, physical drag/tray/hotkeys/monitor events, sustained resource peaks and clean-machine packaging remain open. No new portable build was produced in this focused phase; historical builds contain older source. See SPEECH_V2.md.

Root `./Start-Zyrah.ps1` was executed successfully after testing. Process inspection confirmed a Zyrah window, the project Electron executable, renderer --app-path pointing at updated-files, normal AppData and no fake-media/test flags. It was left running; capture starts off by the verified desktop lifecycle. The existing database was queried read-only for the two selected speech preferences only.

The report below retains previous phase evidence; earlier absent-neural-voice statements are superseded.

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
