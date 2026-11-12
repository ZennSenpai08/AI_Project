# Direct STT and strict privacy update

For the new tested speech path, use STT_PROVIDER=faster-whisper, WHISPER_PYTHON and WHISPER_MODEL_PATH as documented in [README_START_HERE](../README_START_HERE.md). It loads only local model files on CPU/int8; socket/DNS access is denied in the owned worker and cancellation terminates only that child. The private checkout .env selects this engine; no existing configuration was overwritten.

OFFLINE_ONLY=true prohibits all network provider requests, including generic loopback proxies. Use CHAT_PROVIDER=demo, EMBEDDING_PROVIDER=local, STT_PROVIDER=faster-whisper or disabled, TTS_PROVIDER=omnivoice (owned installed runtime), browser (localService voices only), or disabled. This tests local UI/speech/memory, not real offline AI chat. Ollama/VoiceStudio remain available in connected mode only.

# Providers and auditions

Copy .env.example to .env in updated-files; restart after editing. Never put keys in browser code or commit .env.

## Chat

CHAT_PROVIDER=demo is deterministic scripted behavior. For a running Ollama installation set CHAT_PROVIDER=ollama and OLLAMA_MODEL to an actually installed model; OLLAMA_BASE_URL defaults to http://127.0.0.1:11434/v1. The example qwen3:8b is configurable and has not been downloaded, benchmarked, or selected as suitable for this 4 GB GPU. See https://docs.ollama.com/api/openai-compatibility .

For cloud chat set CHAT_PROVIDER=openai, OPENAI_API_KEY, and CHAT_MODEL=gpt-4.1-mini. This existing adapter uses chat/completions structured output and SSE. Identifier checked against https://developers.openai.com/api/docs/models/gpt-4.1-mini ; no paid/live call executed. Taglish quality needs evaluation. Identity is included with every request, independent of summaries.

## Installed native neural speech

The current checkout uses TTS_PROVIDER=omnivoice and NEURAL_TTS_EXE=speech/tools/omnivoice-vulkan/omnivoice-tts.exe, NEURAL_TTS_DEVICE=Vulkan1 (this RTX 2050 only). Models are pinned Q4_K_M; original anchors are speech/voices. Profile selection lives in SQLite as speechVoice, independently of legacy OS voice. Use Settings → Neural character voice and Try voices. Missing assets fail with text fallback, no OS voice. See SPEECH_V2.md for build, licenses, measurements and auditions. Explicit setup: ./speech/setup-neural.ps1; tested offline incremental verification: ./speech/setup-neural.ps1 -Offline. Do not assume device numbers on another machine.

STT uses sttLanguage separately from conversation language. Filipino maps to Whisper tl/transcribe, English to en, auto omits the hint. Local Dictate and Record share this route. The raw draft is editable.

## Optional external local speech adapter

Start a separately installed VoiceStudio service. Zyrah never installs its weights or clones a speaker. Set STT_PROVIDER=local and/or TTS_PROVIDER=local, LOCAL_SPEECH_BASE_URL=http://127.0.0.1:3900/v1, LOCAL_TTS_MODEL=omnivoice (or another engine actually installed), LOCAL_TTS_VOICE to a permitted profile ID, LOCAL_STT_MODEL=faster-whisper. Optional LOCAL_SPEECH_API_KEY stays backend-only. URL must be loopback HTTP(S).

Adapter follows https://voicestudio.sh/docs/api-reference/audio : POST audio/speech with model, input, voice, response_format=mp3 and speed; POST audio/transcriptions with multipart file and model. The selected recognition mode supplies tl/en when explicit; automatic omits it. Service compatibility must be verified. No speculative synthesis tags are sent. VoiceStudio's current documentation lists omnivoice and voxcpm2, but availability depends on the installed version and model manager. No speech engine is silently substituted.

Run npm run audition:local. To compare engines on identical samples, set AUDITION_ENGINES=omnivoice,voxcpm2 in .env. Results and audio go to artifacts/audition with synthesis duration, bytes and empty human ratings. The historical service audition failed because no service was running; this is separate from the now-working standalone native engine. No voice ranking is available. Use Settings → Voice audition for listening notes and export. Review Filipino pronunciation, Taglish, names, numbers, accent, consistency, emotion and latency before choosing a voice. Measure GPU use separately with nvidia-smi; reported API readiness is not first-audible latency.

## Cloud/device speech

TTS_PROVIDER=browser uses OS/browser voices with no amplitude lip sync and no guaranteed Filipino voice. Browser dictation may be unavailable in Electron. Prefer a configured STT adapter there.

STT_PROVIDER=openai requires OPENAI_API_KEY; STT_MODEL=gpt-4o-mini-transcribe is documented at https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe . Cloud audio leaves the device. TTS_PROVIDER=azure requires AZURE_SPEECH_KEY/REGION/VOICE; existing default fil-PH-BlessicaNeural uses prosody only, with no claim of supported laughter/style tags. TTS_PROVIDER=openai retains the existing configurable gpt-4o-mini-tts compatibility adapter (https://developers.openai.com/api/docs/models/gpt-4o-mini-tts). These live integrations remain untested here.

Cloud chat receives recent eligible history and retrieved notes. Cloud STT receives WAV utterances; cloud TTS receives sanitized speech text. OpenAI embeddings receive document chunks only when explicitly selected. Daily application request/character ceilings reserve retries; they are not billing guarantees. No pricing assumptions or paid services were added.
