# Project requirements and implementation map

Scope: private, single-user local companion, based on the original brief and the subsequently supplied AGENTS.md. No public deployment or paid service purchase was authorized or performed.

| Requirement | Implementation | Verification / limits |
| --- | --- | --- |
| Runnable app | Node 22 HTTP server, native browser modules, SQLite | Startup and API checks passed on Windows |
| Original stable character | Versioned JSON + protected prompt, eight examples | Prompt/language tests pass; subjective review pending |
| Real text integration | OpenAI and Ollama adapters, structured SSE text | Contract mocks pass; live credentials/model absent |
| Offline development | Explicit scripted demo | Automated end-to-end API tests pass |
| English/Filipino/Taglish | Language settings, persona rules, corpus | Mechanical behavior tested; fluency unscored |
| Persistent sessions | Create, list, rename, select, delete | API persistence tests pass; browser tests supplied |
| Speech recognition | OpenAI WAV adapter; browser recognition | API mocks pass; microphone test unavailable |
| Push-to-talk review | Record/Finish bounded capture → editable draft | WAV and late-permission cleanup tested |
| Hands-free / interruption | Worklet VAD, epochs, abort propagation, mute/stop | Deterministic VAD and cancellation tests pass |
| Expressive speech | Azure prosody, OpenAI compatibility instructions, device rate/pitch | No live listening; no natural-laughter guarantee |
| Speech streaming | Ordered sentence-sized synthesis/playback | Buffered per segment after final model output; no native transport streaming |
| Voice audition | Twelve samples, editable text, exported human notes | UI supplied; human scores pending |
| Memory control | Grounded suggestions, explicit save, metadata, dedup, conservative conflicts, edit/delete/disable | Automated tests pass |
| Summary behavior | Bounded extractive same-session summaries; source exclusion after memory removal | Tests pass; original chat remains until deleted |
| Reference learning | TXT/MD ingestion, chunking, local/cloud vectors, citations | Local retrieval tests and cloud schema mocks; cloud embeddings unverified |
| Browser avatar | User-supplied Mao Live2D default; optional original SVG; emotion signals and cloud-audio RMS mouth | Manifest/HTTP/lip-sync/mock-renderer tests pass; runtime install and visual QA remain external |
| VTube Studio | Optional local authentication, mouth parameter and expression-hotkey mapping | Mock protocol test passes; real app not tested |
| Privacy/security | Local binding, origin/host/token checks, limits, redacted errors | API tests pass; not multi-user authentication |
| Spending/metrics | Persistent daily reservations, reported tokens, speech characters/duration, timing | Counts tested; no configured price table or billing guarantee |
| Export/deletion | UI JSON export, memory/session/document erasure, typed all-data confirmation | API tests pass; external exports/backups remain |
| Long conversation | 100-turn deterministic run + broader 100-turn evaluation corpus | Storage/prompt checks pass; paid quality eval not run |
| Documentation | Setup, architecture, providers, character, progress, tests, limits | Included in repository |

The specification’s stack is a preference. This release retains the working dependency-free local architecture begun before the full file appeared; blocked package downloads further support that choice. It does **not** claim to implement FastAPI, PostgreSQL/pgvector, React, or LiveKit. Optional multi-user hosting, live web search, training, audience chat and automatic streaming remain outside the delivered local core.

Unverified live criteria are explicit acceptance work, not passed tests. See `TEST_REPORT.md` and `PROVIDER_SETUP.md` for the exact next actions.
