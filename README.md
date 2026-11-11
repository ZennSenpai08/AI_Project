# Hiraya AI

An original Filipino AI companion with persistent conversations, an explicit memory notebook, streaming text, interruptible voice, and an animated browser avatar. The character imagines a little night studio where small wins become paper stars. She is transparent about being AI.

**Chat runs immediately without dependencies or keys in a clearly labeled, scripted demo.** Real free-form conversation and cloud voice require the provider configuration below. Demo responses are deterministic examples, not a local language model. The selected Mao Live2D avatar requires the separate runtime setup below.

## Run on Windows

Requires **Node.js 22.18.0 or newer** with `node:sqlite`. This project was actually checked on Windows with Node 22.18.0 and PowerShell. No Python environment, Docker, GPU, npm installation, or build step is needed for the core app.

```powershell
cd C:\Users\Romcill\Desktop\Project
npm start
```

Open **http://127.0.0.1:3210**. Stop with Ctrl+C. `npm run dev` restarts the backend when source changes; reload the browser for frontend changes. Node 22 prints an experimental SQLite warning; it does not prevent startup.

For live AI, copy the example once and edit it locally:

```powershell
Copy-Item .env.example .env
notepad .env
```

Set `CHAT_PROVIDER=openai` and your `OPENAI_API_KEY`. The default chat adapter uses `gpt-4.1-mini`. Restart the app. Do not put keys into the browser or commit `.env`.

For a Filipino synthetic voice, configure `TTS_PROVIDER=azure`, `AZURE_SPEECH_KEY`, and `AZURE_SPEECH_REGION`. The default is `fil-PH-BlessicaNeural`. Browser device voices work without an app key, but available accents and languages depend on the device. OpenAI transcription uses configurable `STT_MODEL=gpt-transcribe` when a key is present. See [PROVIDER_SETUP.md](PROVIDER_SETUP.md) for exact configurations, API references, model availability caveats, and the optional local Ollama adapter.

`APP_NAME` and `CHARACTER_NAME` rename the product and character. The existing package name `Zy-ai` was preserved. Stable personality and original example dialogues live in [characters/hiraya.json](characters/hiraya.json).

## Use

The user-supplied `mao_en` folder is now the default visual model. Follow [MODEL_SETUP.md](MODEL_SETUP.md) to install the pinned browser renderer and supply the official Cubism Core. Until then, the avatar panel shows a setup message; chat remains usable. `AVATAR_PROVIDER=svg` explicitly selects the earlier SVG. Mao artwork is credited to Live2D Inc.; it is separate from Hiraya's original personality and voice.

- Type a message; Enter sends, Shift+Enter adds a line. Model text streams as it arrives. Demo text arrives at once.
- **Dictate** uses browser recognition to fill an editable draft. Browser recognition may send audio to the browser vendor.
- **Record** starts a bounded push-to-talk style recording; **Finish** stops it. Cloud transcription fills the draft for review. Maximum 20 seconds. An OpenAI key is required for this mode.
- **Start voice conversation** enables hands-free recognition and automatic replies. Speak to interrupt; **Stop reply** or Esc cancels generation and speech. **Mute** silences replies while leaving an active microphone on; end the voice conversation to turn the microphone off.
- Use headphones when testing interruption. Energy-based VAD can mistake speakers or background voices for an interruption. Configure pause duration and noise threshold in settings.
- Save suggested memories explicitly, or add notes yourself. Edit or forget them in the notebook. `Disable memory` pauses retrieval and suggestions; `Enable memory` resumes them. `Forget this` / `That is incorrect` opens the notebook so you can choose the correct note.
- Settings include language, speed, volume, voice audition, memory controls, document ingestion, usage, export, and local-data erasure.
- Reference documents accept plain `.txt` / `.md`, up to 12,000 characters / 48 KB, maximum 20 documents. Cloud embeddings are optional; default retrieval is explicitly lexical.
- The browser avatar responds to emotions and cloud playback amplitude. `/avatar.html` is a transparent overlay for a same-origin browser tab. Optional VTube Studio connection is under settings; it remains off until requested.

## Verify

```powershell
npm run check
npm test
node scripts/benchmark.js
```

Core tests require no external dependencies, credentials, or network. Browser tests are a separate optional package:

```powershell
npm --prefix tests/browser install
npm --prefix tests/browser test
```

On Windows these use installed Microsoft Edge. On other systems install the Playwright Chromium binary from `tests/browser` with `npx playwright install chromium`. The browser test server uses **port 3211** and `.test-data/browser`, never the normal database. Playwright is pinned to 1.58.2. Installation and execution were blocked in this environment; do not interpret supplied tests as passed browser QA.

## Data and boundaries

SQLite is created automatically at `data/hiraya.sqlite`, with transactional schema setup and upgrade from the initial schema. This is a **single-user, loopback-only application**, not an authenticated public service. Records carry an owner boundary for future work; shared process configuration and settings still assume one user. Do not expose it through a public tunnel or change its host binding without adding proper authentication, per-user settings, authorization, and HTTPS.

The app does not store raw microphone recordings. Cloud providers receive the data needed for their requests: recent messages and selected memories/documents for chat, recorded utterances for transcription, reply text for synthesis, and documents/query text for configured cloud embeddings. Provider retention is separate from local deletion. Local SQLite is unencrypted; protect the computer and backups.

Deleting a memory removes it from retrieval and clears derived summaries. Matching/source messages are excluded from future summaries. Original chat messages remain visible and can still be in recent conversation context; delete their conversation if you want that source removed too. Deleting a document removes its chunks and vectors. Exports and your own backups are not automatically erased. Daily aggregate usage counters remain after “erase all” to prevent resetting usage ceilings; they contain no dialogue.

## Backup and restore

Stop the server before copying the complete `data` directory, including any SQLite WAL/SHM files. Restore into a **new empty directory**, set `DATA_DIR` to it, and start the server. This avoids overwriting current data. UI JSON export is readable archival data; it is not an import format. Keep `.env` separately and securely. Do not share real database copies in bug reports.

## What was verified

See [TEST_REPORT.md](TEST_REPORT.md). Local startup, syntax, 48 automated tests, provider request-contract mocks, 100-turn deterministic continuity, and a local benchmark passed. **Live cloud calls, real microphone/speaker operation, Filipino accent quality, Live2D rendering, visual browser QA, and a real VTube Studio model were not verified.** No credentials were available; browser automation was unavailable and npm registry access was blocked.

See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md), [ARCHITECTURE.md](ARCHITECTURE.md), [CHARACTER_DESIGN.md](CHARACTER_DESIGN.md), [PROJECT_REQUIREMENTS.md](PROJECT_REQUIREMENTS.md), and [DEVELOPMENT_PROGRESS.md](DEVELOPMENT_PROGRESS.md). This is a runnable local implementation with explicitly identified validation gaps, not a claim of production voice quality.
