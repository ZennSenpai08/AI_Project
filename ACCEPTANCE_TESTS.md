# Acceptance evidence — 2026-11-12

Run in updated-files. Tests use disposable databases; never point tests at AppData user data.

| Area | Executed evidence | Remaining acceptance |
|---|---|---|
| Core regression | npm test: 63 deterministic/API tests passed | Live LLM conversation quality |
| Desktop | Native source suite: 3/3 passed (37.3 seconds); tests exercise real Electron model windows, chat close vs hide, restore, actual shortcut conflict, forced crash; drag/DPI logic unit-tested | Physical drag, transparent pass-through over other apps, monitor hotplug and lock/suspend |
| Browser/avatar | Five Edge cases passed; actual Mao model, parameter inventory, speech mouth priority, memory/settings/mobile | Human motion quality, verified open-palm rig/gesture, actual laughter |
| Local STT | Real faster-whisper tiny CPU/int8 through loopback API; silence empty, synthetic English recognized except Zyrah spelling | Real microphone, Tagalog/Taglish, names/noise, denial and disconnect on physical hardware |
| Cancellation | Mocked late synthesis/stale disconnect tests; real worker kill/restart; native synthetic capture/transcription/hide/restore/retry passed | Full real audio device matrix and measured stop latency |
| Offline, internet available | Native Electron external fetch/session requests blocked, Node transport never invoked; direct worker socket/DNS denial | Real offline LLM/provider chain |
| Offline, disconnected | Not executed with OS internet disconnected | Requires verified complete local conversation stack; current strict mode rejects unaudited services |
| Memory | Persistence, approved notes, correction/deletion/source exclusions and 100-turn deterministic history tests | Live long-history personality evaluation |
| Packaging | Previous portable build passed native lifecycle test; rebuild with npm run package:win for new source | Clean-machine setup/installer/signing and speech runtime provisioning |

Latest real STT result is artifacts/speech/live-stt.json. Synthetic speech is a Windows-installed voice fixture, not a human recording or a proposed Zyrah voice. No human listening scores or Filipino accent conclusions exist. No OS network adapter was disabled. Internet-available egress tests are application-boundary evidence, not proof about independent third-party services.

Final portable verification: rebuilt Zyrah.exe passed all 3 native tests in 31.8 seconds, including actual local STT with synthetic capture, hide/restore/retry and network denial. Package scan found no private .env, databases, virtual environment or model weights; the worker, setup script and pinned requirements were included. Runtime/model paths must be configured for package use. No clean-machine installation or human speech evaluation is claimed.
