# Start Zyrah

The current application is updated-files. From the project root:

```powershell
cd updated-files
npm run desktop
```

This development checkout now has a private .env selecting the tested application-owned faster-whisper engine and local model directory. Existing credentials/settings were not overwritten. Chat remains the labeled scripted demo until a real provider is configured. Record → Finish produces an editable transcript. Stop/hide cancels work; restore leaves capture off.

## Recreate local speech setup (explicit connected setup)

```powershell
python -m venv speech/.venv
speech/.venv/Scripts/python.exe -m pip install -r speech/requirements-lock.txt
speech/.venv/Scripts/python.exe speech/setup-model.py speech/models/tiny
npm run test:stt
```

The initial installation used faster-whisper==1.2.1; requirements-lock.txt records the resolved tested Windows/Python 3.9 environment. Set STT_PROVIDER=faster-whisper, WHISPER_PYTHON to the environment's absolute python.exe, and WHISPER_MODEL_PATH to the downloaded directory in private .env. No weights download during transcription. Models and virtual environments are ignored by Git and excluded from portable packages. Package users must configure these external paths separately.

## Strict Offline Only

In .env set OFFLINE_ONLY=true, CHAT_PROVIDER=demo, STT_PROVIDER=faster-whisper (or disabled), EMBEDDING_PROVIDER=local, and TTS_PROVIDER=browser (installed local voices only) or disabled. Restart. Mode is intentionally immutable while running. The interface reports its state and whether local model files exist.

This mode currently supports local speech/UI/memory checks; **a complete offline AI conversation is not yet implemented**. Ollama and external local speech proxies are refused until their downstream egress can be verified. There is no silent cloud fallback. See INTEGRATION_ROADMAP.md and ACCEPTANCE_TESTS.md for limits and open gates.

Setup/build: see updated-files/README.md. Existing AppData conversations remain authoritative. Never delete or migrate them to test a provider. No paid inference or larger weights were downloaded in this phase.
