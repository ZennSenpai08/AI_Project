# Start Zyrah

The current application is updated-files. From the project root:

```powershell
cd updated-files
npm run desktop
```

This development checkout now has a private .env selecting the tested application-owned faster-whisper engine and local OmniVoice Q4 voice. Existing credentials/settings were not overwritten. Chat remains the labeled scripted demo until a real provider is configured. Record → Finish produces an editable transcript. Stop/hide cancels work; restore leaves capture off.

## Recreate local speech setup (explicit connected setup)

```powershell
python -m venv speech/.venv
speech/.venv/Scripts/python.exe -m pip install -r speech/requirements-lock.txt
speech/.venv/Scripts/python.exe speech/setup-model.py speech/models/tiny
npm run test:stt
```

The initial installation used faster-whisper==1.2.1; requirements-lock.txt records the resolved tested Windows/Python 3.9 environment. Set STT_PROVIDER=faster-whisper, WHISPER_PYTHON to the environment's absolute python.exe, and WHISPER_MODEL_PATH to the downloaded directory in private .env. No weights download during transcription. Models and virtual environments are ignored by Git and excluded from portable packages. Package users must configure these external paths separately.

## Strict Offline Only

In .env set OFFLINE_ONLY=true, CHAT_PROVIDER=demo, STT_PROVIDER=faster-whisper (or disabled), EMBEDDING_PROVIDER=local, and TTS_PROVIDER=omnivoice (installed native runtime/models/references), browser (installed local voices only), or disabled. Restart. Mode is intentionally immutable while running. The interface reports its state and whether local model files exist.

This mode currently supports local speech/UI/memory checks; **a complete offline AI conversation is not yet implemented**. Ollama and external local speech proxies are refused until their downstream egress can be verified. There is no silent cloud fallback. See INTEGRATION_ROADMAP.md and ACCEPTANCE_TESTS.md for limits and open gates.

Setup/build: see updated-files/README.md. Existing AppData conversations remain authoritative. Never delete or migrate them to test a provider. The focused voice phase explicitly installed ~660 MB OmniVoice Q4 weights and a separate base STT checkpoint for comparison; no paid inference was used.

## Current voice and motion

Old portable copies have older code. Use the source command above or root Start-Zyrah.ps1 after quitting any old copy. Settings → Neural character voice → A/B → Try voices → Play sample; enable Read replies aloud for chat. Both paths use the same profile. Six lines, two candidates and laughter WAVs are in updated-files/artifacts/voice-v2/index.html. Exact native setup, measurements and current limitations: [SPEECH_V2](updated-files/SPEECH_V2.md). Source-only changes have not been repackaged in this focused phase.
