# Implemented architecture

Electron main owns two sandboxed windows, tray, native cursor hit testing, shortcuts, display recovery and lifecycle. Narrow context-isolated preload validates operations again in main. Desktop main starts the loopback Node HTTP service with an ephemeral port and a private HttpOnly cookie. Request tokens protect mutations. Browser mode uses the same backend without Electron.

server/providers.js contains replaceable chat, STT and TTS adapters. Character identity is loaded from characters/zyrah.json for every model request. Display text, sanitized spoken text and bounded performance intent remain separate. public/performance.js runs deterministic poses with cooldown and smooth envelopes; MaoAvatar clamps to actual model parameter ranges and layers blink/face/body and playback mouth ownership. Actual audio playback starts the response gesture; cloud/local audio amplitude drives ParamA.

public/app.js owns the audio turn epoch, microphone, abort controllers, sentence playback and interruption. Desktop hide invalidates its epoch, aborts all backend requests, mutes and hides native windows, requests renderer cleanup, and destroys renderers without acknowledgement after 350 ms. Restore replaces any unacknowledged renderers and leaves capture off. Late provider events fail both local generation and desktop visibility checks.

SQLite stores owner-scoped sessions, messages, summaries, approved memories/provenance, documents, usage and metrics. Existing hiraya.sqlite filename and schema are retained. Forgotten source messages are excluded from summaries and future history; conversation deletion removes source-linked notes. Extractive summaries and lexical memory retrieval are deliberately bounded. No model training occurs.

No destructive database migration was added. Backup with the app stopped before manual upgrades; restore the entire data folder while stopped. AppData is unencrypted. See README.md for startup and privacy details.
