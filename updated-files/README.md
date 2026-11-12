# Current local speech and privacy update — 2026-11-12

Direct faster-whisper recognition is now installed and tested in this checkout; private .env selects it. Use Record → Finish to obtain an editable draft. The model is a small multilingual test model; English spelling and Tagalog/Taglish quality need review. See [start here](../README_START_HERE.md), [acceptance tests](../ACCEPTANCE_TESTS.md), and [roadmap](../INTEGRATION_ROADMAP.md).

OFFLINE_ONLY=true enforces fail-closed application networking, local embeddings, direct STT, and local device voices only. External loopback services and Ollama are currently refused because downstream isolation is unverified. A complete offline AI conversation is still an open gate; the permitted demo is scripted. Restart after configuration changes. No silent cloud fallback.

# Zyrah desktop companion

Runnable Windows application in this directory. Stack: Electron 45.3.0, Node.js built-in HTTP and SQLite, browser ES modules, PixiJS 7.4.3 and the supplied Mao Live2D model. The root README retains the product specification.

## Run now

From the repository root:

```powershell
cd updated-files
npm run desktop
```

For browser mode: `npm start`, then open http://127.0.0.1:3210. Browser mode is secondary and has no native tray/shortcut controls.

The default chat mode is a clearly labeled scripted demo. Real conversation requires configuring a running local model or cloud credentials. No live model or voice quality is certified by demo replies.

## Reproducible setup

Tested environment: Windows 11 Home 10.0.26200, Node 22.18.0, npm 11.10.0. Electron embeds Node 24.22.2. Dependencies are pinned in both lockfiles.

```powershell
npm ci
npm run setup:desktop
npm ci --prefix avatar-runtime
npm run download:core
npm run setup:avatar
npm run desktop
```

Cubism Core is downloaded from Live2D's official URL with a pinned SHA-256. See ASSET_LICENSES.md and its upstream terms. The supplied assets remain at ../mao_en; the package copies runtime files and their notice.

## Implemented

Transparent frameless character and separate chat, click/drag threshold, alpha-based click-through, tray controls, saved pin/position, monitor-work-area recovery, configurable conflict-checked shortcut (Ctrl+Alt+C), current-session recovery and searchable conversation previews. Settings exposes performance preview, voice auditions, language, volume/speed and memory controls.

Zyrah's protected versioned character is characters/zyrah.json. Typed conversation connects to streaming OpenAI-compatible or Ollama adapters. SQLite persists history, source-linked approved memories and extractive older-message summaries. Memories support edit/delete/disable; forgotten source messages are excluded from future model context and summaries. Original chat stays visible until deleted. Conversation deletion also removes source-linked memories. Export and explicit data erasure are available.

Mao performs bounded facial, gaze, breathing, head/body/shoulder and arm reactions. The greeting uses the rig's raised-arm pose and wrist motion; the model's supplied hand shapes did not yield a verified open-palm greeting. This remains an approximation. No unique Zyrah artwork or recorded laughter is claimed. See MODEL_SETUP.md.

Push-to-talk Record/Finish creates an editable transcript using configured STT. Hands-free uses bounded utterances with half-duplex capture to prevent self-transcription. Stop or Record interrupts; this is not acoustic full-duplex barge-in. Local/cloud buffered sentence audio drives actual-amplitude mouth movement. Device TTS has no amplitude access, so its mouth stays closed.

Hide mutes immediately, invalidates turns, aborts backend requests, releases capture, stops playback and queued cues, and hides windows. An unacknowledged renderer is destroyed after 350 ms. Restore leaves the mic off. Closing only chat keeps the companion present. Lock/suspend and renderer failure invoke cleanup.

## Configuration and data

Copy .env.example to .env only if you need configuration. Keep it private. See PROVIDER_SETUP.md. Desktop data defaults to %APPDATA%/Zyrah/data; browser data defaults to ./data. The database retains its compatibility filename hiraya.sqlite. DATA_DIR overrides either location; use an absolute path. Desktop preferences are desktop.json in the app user-data directory.

Credentials stay in backend/main configuration. Desktop HTTP uses a private HttpOnly cookie plus request tokens. Browser mode uses same-origin request tokens; any local user can open its bootstrap page. This is a private single-user application, not a multi-user deployment.

Quit before backup; copy the entire data directory plus desktop.json. Restore only while stopped. SQLite is unencrypted. Deleted text may remain in SQLite free pages, WAL, backups or exports; no forensic-erasure guarantee. Raw microphone recordings are not saved.

## Verification and build

```powershell
npm test
npm run check
npm run test:browser
npm run test:desktop
npm run benchmark
npm run package:win
```

See TEST_REPORT.md for executed results and KNOWN_LIMITATIONS.md for manual checks. The package is an unsigned portable Windows directory under artifacts, not an installer. No release was published. Launch its Zyrah.exe; retain the entire directory. Remove that directory to remove binaries; user data remains in AppData until explicitly removed.

