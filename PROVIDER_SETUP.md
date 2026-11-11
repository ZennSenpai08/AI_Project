# Provider setup

Research checked 2026-11-11. Identifiers and request shapes were verified against the linked official documentation; account access and subjective quality were not live-tested. All provider calls use server-side HTTP adapters, without SDK-version assumptions.

## Conversation

OpenAI:

```dotenv
CHAT_PROVIDER=openai
CHAT_MODEL=gpt-4.1-mini
OPENAI_API_KEY=your-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
```

Uses Chat Completions, strict JSON schema, and SSE streaming. The initial model was chosen for its documented structured output/streaming support and a compact conversational workload; no claim of superior Taglish quality is made without evaluation. Every request includes the protected character configuration, bounded history, user-approved notes, and references as untrusted data. See [model documentation](https://developers.openai.com/api/docs/models/gpt-4.1-mini) and [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

Ollama local alternative:

```dotenv
CHAT_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
OLLAMA_MODEL=qwen3:8b
```

Install Ollama separately and pull a model appropriate for your machine. The configured model must return JSON with `text`, `emotion`, and nullable `memorySuggestion`. The Qwen name is an editable example, not a tested installation or hardware recommendation. The adapter uses JSON-object mode because compatible servers differ in strict-schema support. See [Ollama’s compatibility documentation](https://docs.ollama.com/api/openai-compatibility). No local model was downloaded or tested.

## Speech recognition

Cloud recording and hands-free VAD use `OPENAI_API_KEY` with `/v1/audio/transcriptions`, mono PCM16 WAV and `STT_MODEL=gpt-transcribe`. The prompt allows Filipino, English, and Taglish without forcing a single language. See [file transcription](https://developers.openai.com/api/docs/guides/speech-to-text). Configure a model supported by your account if the default is unavailable. Current documentation marks legacy `gpt-4o-mini-transcribe` / `gpt-4o-transcribe` for shutdown on February 26, 2027; those can be configured only while supported.

Without an app key, Dictate and hands-free use Web Speech recognition where the browser supports it. Availability varies, and browser recognition can be server-backed. See [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition). Text chat remains available when recognition is absent or denied.

This release uses bounded utterance transcription, not a LiveKit/WebRTC audio streaming session. One browser voice controller owns capture and cancellation. ElevenLabs and faster-whisper are not implemented; they remain optional candidates rather than unverified fallback behavior.

## Speech synthesis

Preferred Filipino candidate:

```dotenv
TTS_PROVIDER=azure
AZURE_SPEECH_KEY=your-key-here
AZURE_SPEECH_REGION=southeastasia
AZURE_SPEECH_VOICE=fil-PH-BlessicaNeural
```

Set the region matching your Speech resource. Uses REST SSML, escapes user text, and requests mono MP3. The voice is listed as Filipino/feminine in [Azure language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support). It does not advertise every expressive style: this adapter uses rate/pitch prosody, not unsupported `express-as` styles. [Azure REST request documentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech) defines the region endpoint and required headers. Regional availability and Taglish pronunciation require audition.

Device fallback, selected explicitly:

```dotenv
TTS_PROVIDER=browser
```

Settings show installed device voices and prefer Filipino/Tagalog or Philippine English when available. Rate, pitch, and volume support varies by browser. The app **does not silently switch voice providers on failure**; text remains available. Device speech does not expose PCM amplitude, so its mouth remains still rather than pretending to be synchronized.

Optional OpenAI compatibility adapter:

```dotenv
TTS_PROVIDER=openai
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=coral
```

This is intentionally not the long-term default. The [current speech guide](https://developers.openai.com/api/docs/guides/text-to-speech) documents shutdown of the older Speech API models on **January 6, 2027**, and recommends migration to a Realtime workflow. `gpt-realtime-2.1-mini` must not be substituted into `/audio/speech`; that is a different API. The compatibility adapter requests a subtle adult feminine Filipino delivery but does not guarantee accent authenticity. A future transport migration can follow [official WebRTC guidance](https://developers.openai.com/api/docs/guides/voice-webrtc).

## Embeddings and reference retrieval

Default `EMBEDDING_PROVIDER=local` uses deterministic 256-dimensional word-hash vectors. This is lexical similarity, **not learned multilingual semantic understanding**. Optional real embeddings:

```dotenv
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
```

Uses the [documented embedding model](https://developers.openai.com/api/docs/models/text-embedding-3-small). Text is chunked with overlap; vectors retain model identity and source provenance. Re-ingest documents after switching embedding models; incompatible vectors are not compared. Up to four passages are supplied with source names/chunk numbers. User memory ranking currently uses lexical relevance and recency, not embedding ranking.

## Limits, timeouts and spending

| Variable | Default | Behavior |
| --- | --- | --- |
| `PORT` | 3210 | Loopback-only HTTP port |
| `APP_NAME`, `CHARACTER_NAME` | Hiraya AI, Hiraya | Display/identity names |
| `DATA_DIR` | ./data | Database directory |
| `PROVIDER_TIMEOUT_MS` | 60000 | Overall HTTP fetch/body timeout |
| `PROVIDER_RETRIES` | 0 | 0–2 retries only on explicit 429/503 |
| `DAILY_PROVIDER_REQUESTS` | 250 | Persistent UTC-day request reservations |
| `DAILY_SPEECH_CHARACTERS` | 25000 | Reserved synthesis characters per UTC day |

Requests reserve possible retries before work starts. Failed requests are not refunded by the app. These are conservative workload limits, not hard provider billing guarantees. Token usage is recorded only when reported. TTS characters and transcription durations are tracked. No stale price table is embedded: monetary estimates display unavailable, and actual charges must be checked at the provider. Configure lower ceilings before paid evaluation. The demo benchmark and normal unit/API tests never contact paid providers.

## Audition and live acceptance

Open settings → Voice audition. Run all 12 samples covering English, Filipino, Taglish, names, numbers, technical terms, humor, seriousness, interruptions, and different lengths. Enter ratings/notes and export them. Listen for naturalness, accent, consistency and emotion; compare transcription against the original sample and record meaning errors. Test with headphones first, then speakers to measure echo-related false interruptions. Notes are not a model-generated quality score.

Before calling live validation complete: check text streaming in all languages; save and recall a note after restart; test Record/Finish/edit/send; interrupt five consecutive replies; verify no stale audio resumes; test mic denial/disconnection, silence, a brief “mm-hmm”, and background speech; verify volume/speed and mute; check provider rate limits and billing. Record model/voice IDs, browser, OS, microphone, network, sample count, median/p95 latency, and failures.
