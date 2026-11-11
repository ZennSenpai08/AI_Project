# Development progress

Updated 2026-11-11.

## Environment and preserved work

Initial workspace inspection found no application or repository instructions. Node 22.18.0, npm 11.10.0 and Python 3.9.13 were available on Windows. During implementation AGENTS.md appeared and the package name changed to `Zy-ai`; both were preserved. No Git repository was initialized, no public deployment was created, and no account/subscription was purchased.

## Completed implementation

- Local HTTP/static server, validated configuration, automatic SQLite setup and schema upgrade.
- Original character JSON, protected persona, English/Filipino/Taglish settings and deterministic demo.
- OpenAI/Ollama chat adapters with structured output, real SSE text deltas, timeout/cancellation/errors and bounded retries.
- Responsive chat interface, avatar panel, history, rename/delete, draft recovery, settings and explicit AI disclosure.
- Browser dictation, bounded Record/Finish drafts, cloud WAV transcription, configurable VAD hands-free, mute/stop and stale-result rejection.
- Azure Filipino speech candidate, device voice selection, OpenAI compatibility adapter, normalized sentence-sized speech and playback acknowledgements.
- Persistent memory notebook, source metadata, conservative grounding/conflict checks, correction/deletion/disable and bounded summaries.
- TXT/MD ingestion, model-tagged vectors, local lexical/cloud embedding adapters, bounded passages and source labels.
- Actual-amplitude browser avatar, transparent overlay, optional local VTube Studio adapter.
- Voice audition corpus/export, persistent usage reservations, timing/usage reporting, data export and explicit erasure.
- Runtime lockfile with zero third-party runtime dependencies; optional Playwright 1.58.2 test package.
- Core, API, provider and audio-lifecycle tests; 100-turn deterministic run and evaluation corpus; benchmark script.

## Verification

Latest verification after Mao integration: syntax passed for 30 JavaScript files and all 48 automated tests passed in about 2.67 seconds. Results are recorded in `TEST_REPORT.md`. The app starts on port 3210. Earlier mock loopback benchmark: 30 requests, median 5.13 ms, p95 10.56 ms; these are not live AI/audio latency figures.

Interactive browser access failed because the browser access host was unavailable. npm registry lookup/install preparation failed with OS `EACCES`; no attempt was made to bypass permissions. Playwright test execution then reported the command unavailable. Browser tests were written but not run. No cloud credentials or real microphone/voice/VTube session were available.

## Continue from here

2026-11-11 follow-up: the user requested `mao_en` as Hiraya's visual model. Inspected its original notice, manifest, expressions, motions, and `ParamA` lip-sync group; preserved all source assets. Added default Live2D renderer integration, manifest-only asset routes, visible attribution, explicit runtime readiness/errors, expression/mouth mapping, visibility/cleanup, and a local runtime setup helper. The pinned optional dependencies and official user-supplied Cubism Core are not installed because registry access returned `EACCES`. Do not claim real rendering is passed. First complete `MODEL_SETUP.md`, then visually exercise the panel/overlay and cloud-audio interruption. The original SVG remains an explicit configuration alternative.

Do not rebuild or replace the app. First run `npm run check` and `npm test`, then configure a real provider in `.env`. Follow the live acceptance checklist in `PROVIDER_SETUP.md`. In an environment with npm access, install/run `tests/browser` and resolve any actual UI failures. Human voice audition is the highest-value remaining validation. Native streaming voice transport is the next architectural improvement after measuring this pipeline.

Known architectural choices: JavaScript/Node/SQLite instead of the preferred larger stack; lexical user-memory ranking; cloud embeddings for documents only; recorded-utterance STT and buffered sentence TTS; no hard dollar estimate; single local user. These are documented explicitly in `KNOWN_LIMITATIONS.md`.
