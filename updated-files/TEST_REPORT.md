# Test report

Date: 2026-11-11. Environment: Windows (`win32`), PowerShell, Node.js **v22.18.0**, npm **11.10.0**. Core application has zero downloaded runtime dependencies. Tests use in-memory or freshly created temporary databases, not user conversations.

## Automated tests passed

`npm run check` passed syntax validation for **30 JavaScript files**, including the supplied browser tests/configuration. Node's built-in runner (`node --test --test-concurrency=1 --test-reporter=spec tests/*.test.js`) passed **48 tests, 0 failed** after Mao integration (about 2.67 seconds). Covered behaviors:

- Local startup/bootstrap, serving every browser asset, HTTP response shapes, security headers.
- Cross-origin writes, missing tokens, untrusted Host headers and private-file requests rejected.
- Session CRUD/rename, stream framing, explicit memory approval, correction, deletion, export.
- Configuration failures, invalid structured model output, provider error redaction, rate limits, timeout, retry bounds and no silent provider substitution.
- Exact provider contracts for chat, transcription, Azure SSML and OpenAI compatibility speech, using **mock transports**.
- Character configuration/language retained outside bounded history; 100 deterministic turns, 200 messages, bounded summaries and no accidental permanent memories.
- Grounded memory candidates, rejection of selected sensitive/hypothetical/unsupported claims, deduplication, conflict hints, owner-scoped queries.
- Deleted memory absent from retrieval and future summaries through source exclusions.
- Newer turn cancels older generation; browser disconnect aborts work; no partial turn committed.
- Late TTS response cannot start playback after stop; five repeated cancellations; delayed mic permission releases acquired tracks after cancellation.
- WAV PCM16 encoding, silence/short-noise VAD rejection, pre-roll, turn-end detection and bounded long utterances.
- Speech normalization and ordered segments, playback acknowledgement qualifiers.
- Document chunks/vectors/provenance and cascade deletion.
- Daily ceilings including retry reservations persist across content erasure.
- Mock VTube Studio token/authentication and bounded parameter injection.
- All supplied Mao manifest references resolve; HTTP model, binary, and texture routes work while editor sources and traversal are rejected.
- Mao `ParamA` mouth mapping clamps amplitude and closes on interruption; expression names match supplied files; sizing contains the model.
- Injected mock Pixi/Live2D renderer checks mounting, updates, expression deduplication, and teardown. This does not exercise real WebGL or Cubism.

Mao setup check: `npm run setup:avatar` correctly exited 1 listing the four absent runtime scripts without copying a partial installation. Registry access failed with `EACCES`. Actual browser rendering, the package installation/lockfile, Core compatibility, and model appearance remain **unverified**. The supplied model files were not modified. See `MODEL_SETUP.md` for completion steps.

An initial Host-header test failed because Node fetch did not send the overridden Host header. It was corrected to use Node HTTP and the server’s real Host validation passed. An early syntax-check run lacked the not-yet-created test directory; the completed repository fixes that. Neither failure remains in the verified suite.

## Local integration and benchmark passed

`npm start` bound `http://127.0.0.1:3210` in demo/browser mode. HTTP integration tests start the real server on disposable loopback ports and exercise real SQLite and handlers.

`node scripts/benchmark.js` measured 30 complete loopback demo requests using in-memory SQLite:

| Statistic | Measured |
| --- | --- |
| Median | 5.13 ms |
| p95 | 10.56 ms |
| Maximum | 19.47 ms |

Raw report: `artifacts/benchmark.json` (generated, ignored). This measures deterministic demo HTTP/database work only. It does not measure live model latency, network-to-provider latency, microphone capture, audible playback, or perceived interruption delay.

## Not tested / blocked

- **Live provider calls:** no configured OpenAI/Azure key; no local Ollama model. Request-contract tests are not live integration tests.
- **Browser/visual QA:** interactive browser tool returned “The browser access host is unavailable.” npm registry access returned `EACCES`; optional Playwright could not be installed. `npm --prefix tests/browser test` reported `playwright` unavailable. Four browser test scenarios are supplied, not marked passed. No screenshots were fabricated.
- **Human listening:** no microphone/speaker session, accent/authenticity/Taglish scoring, emotional delivery review or actual laughter evaluation.
- **Real acoustic interruption:** deterministic VAD/cancellation tests pass, but background speakers, echo and brief acknowledgements require real-device evaluation.
- **VTube Studio:** protocol mocked; no actual model permission, parameter or hotkey test.
- **Other OSes:** Windows verified. Cross-platform modules are used, but macOS/Linux were not tested.

## Reproduce remaining tests

Run core commands from README. Install the separate pinned browser package when registry access is available. Browser tests use port 3211 and `.test-data/browser`, covering chat/memory persistence and edits, session rename/switch, preferences/XSS-safe rendering and mobile overflow. Live checks and voice scoring are enumerated in `PROVIDER_SETUP.md`. `tests/evaluation-scenarios.js` exports 100 expectation-labeled turns for a subsequent budgeted evaluation; no paid 100-turn test was run.

No human quality scores or live-provider success claims are implied by this report.
