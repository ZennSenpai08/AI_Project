# Speech and movement repair — 2026-11-12

This checkout runs Electron 45.3.0 / built-in Node HTTP + SQLite / Pixi 7.4.3 / Mao PRO Live2D. Colors and the capture worklet were preserved. Earlier portable folders contain older code: launch this source using `npm run desktop` from updated-files, or root `Start-Zyrah.ps1`. Quit an older running copy before switching. Settings → Speech diagnostics identifies `speech-v2`, the executable/application directory and active providers; no credentials or raw recordings are logged.

## Causes confirmed in code/configuration

- Private .env selected **browser TTS**. There was no neural TTS runtime/model installed and no saved Filipino voice. The automatic browser branch could resolve to the installed English OS default. A profile/config change elsewhere could not change that playback path. No response-audio cache existed.
- Direct faster-whisper hard-coded `language=None`. Chat language preferences never reached it. The separate Dictate button could use browser recognition despite local STT being configured.
- Browser TTS supplied no analyzable audio, so the application deliberately left its mouth closed. Listening lacked a posture, and body/smile amplitudes were weak. RAF sampling in a hidden chat was unsuitable for relaying speech amplitude to the floating window. The desktop bridge also omitted an explicit null cue on interruption, permitting stale cue retention.
- No Zyrah process was running during the initial audit. Which historical executable produced the user's earlier session could not be established; diagnostics and the source launcher now make the current entry explicit.

## Actual voice installed here

`TTS_PROVIDER=omnivoice`, local **OmniVoice Q4_K_M**, 24 kHz mono WAV, native runtime `speech/tools/omnivoice-vulkan/omnivoice-tts.exe`, `NEURAL_TTS_DEVICE=Vulkan1` on this machine (RTX 2050). Vulkan0 is the AMD integrated GPU here; device numbering is machine-specific. One request at a time, latest request supersedes the previous request, waits for owned process exit and discards stale output. Timeout 180 seconds. No OS/cloud fallback; errors leave the text available.

Profiles `zyrah-warm-v1` (A) and `zyrah-soft-v1` (B) have different original model-designed identities, fixed seeds and versioned generated reference WAV/text/RVQ files under speech/voices. Neither is a recording or imitation of a real speaker. A is provisional; no human preference has been recorded. The native design controls are gender/age/pitch categories, not arbitrary acting directions. Filipino accent quality and voice consistency require listening; the model's language list alone is not acceptance evidence. Normal chat is sanitized; the engine-specific `[laughter]` control is inserted internally only for bounded amusement/audition. Other engines never receive it.

Preview and conversation both call SpeechOutput → authenticated `/api/speech` → Providers.speech → NeuralTTS → the same selected reference. speechVoice is persisted separately from the legacy OS voice setting. Changing voice interrupts old work. Output is freshly synthesized with no-store; reference RVQ files are stable voice anchors, not response caches. Technical cues carry numeric turn/segment identities and start at audio playback. Mouth opening is measured amplitude, **not phoneme-accurate lip sync**.

## Listen and choose

Open artifacts/voice-v2/index.html for all six identical requested lines, two laughter samples, and a reconstructed Microsoft David Desktop en-US baseline. The baseline is not a recording of the previous browser session. WAVs and results.json remain local ignored artifacts. Both candidates are unapproved.

In the actual app: **Make yourself at home → Neural character voice → A or B → Try voices → sample → Play sample**. Stop cancels generation/playback; Laugh then speak exercises the engine's supported nonverbal marker. Enable **Read replies aloud** to hear the same voice in chat. Close auditions/settings to return to chat. Profile selection survives restart. Chat is still the clearly labeled scripted demo unless a real conversation provider is configured; native speech tests do not certify a live LLM.

## Tagalog recognition

Actual selected engine: faster-whisper 1.2.1, Systran/faster-whisper-tiny multilingual, CPU/int8, 4 threads. Default **Tagalog / Filipino** maps to `language='tl', task='transcribe'`. English uses en; Automatic/mixed omits the language hint and may misidentify short Taglish. No translation or LLM transcript rewrite. A Zyrah hotword is a recognition hint only. English-only checkpoints are rejected in Tagalog mode. Dictate now uses the selected local adapter too; it cannot silently switch to browser recognition in this configuration.

Record/Dictate → Finish yields the raw editable draft; review, correct and Send. Empty recognition asks for another recording. VAD/no-speech/log-probability thresholds reject silence, without fabricated confidence percentages. Half duplex releases capture before speech. Raw microphone recordings are not retained.

The worklet encodes the actual AudioContext rate as mono PCM16 WAV; it does not relabel samples as 16 kHz. faster-whisper/PyAV performs real decoding/resampling to its 16 kHz feature extractor. Diagnostics distinguish capture sample rate from engine sample rate, requested/effective language, automatic detection (null when explicitly forced), task and timing.

Synthetic comparison: artifacts/voice-v2/stt-comparison.json. On the same generated Filipino greeting, tiny/auto selected English (WER 1.0); tiny/tl WER .5; base/tl WER .625. Both recognized the synthetic English fixture with WER 0. Normalization: NFC, lowercase, punctuation/symbols to spaces, whitespace tokens; names uncorrected. This tiny synthetic set cannot establish human microphone accuracy or general superiority. Base was downloaded for comparison but did not justify changing the provisional checkpoint. Human Tagalog/Taglish, names, quiet speech and background noise still need recorded references and review.

## Visible performance

The actual Mao rig supplies face, gaze, head/body, shoulder, blush, vowel and arm-A/B parameters. The controller validates names/ranges, blends after authored motion/expression updates, disables competing authored idle motions and reserves vowel opening for playback. Listening looks attentive; thinking glances/tilts; concern softens posture/brows; amusement uses smiling eyes and shoulders; teasing tilts; idle breathes/blinks. Gesture cooldown 4.5 seconds. Larger gestures occur on the first speech segment and begin at playback, not synthesis.

The greeting **raises an arm and moves the wrist using the supplied alternate arm art**. It is not a verified open-palm/finger wave. Additional hand art/rigging is needed for that. Actual screenshots are in artifacts/performance-v2. Reproduce: Settings → Character performance preview → wave, amused, concern, tease, thinking, allowing five seconds between gestures. Record shows listening; actual neural speech drives speaking/mouth; Stop or Hide clears it. No full desktop/screen recording was made. Playwright video capture stalled initial navigation, so screenshots and the repeatable sequence are used.

## Hardware and latency actually measured

Windows 11 Home 26200, Ryzen 5 6600H (6C/12T), 16.4 GB RAM, RTX 2050 4096 MiB. Development and native tests were on this Windows machine. Q4 weights total 659,959,328 bytes. CPU anchored synthesis took 120–154 seconds for early samples and a later sample hit timeout. Pre-encoding references with the matching tokenizer removed repeated reference encoding. Latest standalone RTX/RVQ samples took roughly 15–24 seconds. The final native run with both rendered windows measured 31,601 ms preview synthesis and 42,527 ms conversational synthesis. These are individual synthesis measurements, not first-audio latency distributions, speaker latency or real-time performance. GPU usage snapshot ~2974 MiB was observed; isolated peak utilization was not established.

## Rebuild/setup

Existing checkout startup: `npm run desktop`. Root `./Start-Zyrah.ps1` was also executed successfully and left the current source running with normal AppData; process paths were verified. Native test startup uses the same project Electron executable and source entry with disposable test data. Node 22.18.0/npm 11.10.0 tested; embedded Electron Node 24.22.2. Python speech environment is the existing project-local Python 3.9 environment.

Explicit initial STT setup (already executed in this checkout):

```powershell
python -m venv speech/.venv
speech/.venv/Scripts/python.exe -m pip install -r speech/requirements-lock.txt
speech/.venv/Scripts/python.exe speech/setup-model.py speech/models/tiny
```

Explicit neural build/download entry: `./speech/setup-neural.ps1`. It pins source, ggml, compiler, shader compiler, headers and model revision/hashes; writes only speech/tools and speech/models; never changes .env, drivers or user data. `./speech/setup-neural.ps1 -Offline` was executed successfully against the installed toolchain and verified weight hashes. A fresh-machine full script run is **not verified**; the equivalent individual download/build operations worked here. `-CpuOnly` is an explicit much slower build option, not a silent fallback. Native source revision dbfc792d6fbe0cc3a776817f56de35a3744d7594; models Serveurperso/OmniVoice-GGUF revision 361609388ae572a820d085185bbbe2a2aac4b30e. References are committed; do not regenerate a named profile silently.

Configure the private .env with TTS_PROVIDER=omnivoice, NEURAL_TTS_EXE to the built executable, NEURAL_TTS_DEVICE to an enumerated device, STT_PROVIDER=faster-whisper, WHISPER_PYTHON and WHISPER_MODEL_PATH. Here the existing .env selects Vulkan1 and tiny. Offline Only permits application-owned OmniVoice/STT; no download or cloud fallback during inference. Arbitrary localhost proxies remain prohibited. A fully disconnected real LLM conversation remains blocked by absent verified local LLM.

## Candidate evaluation and notices

[OmniVoice](https://github.com/k2-fsa/OmniVoice) provides voice design and a documented nonverbal marker. The [native runtime](https://github.com/ServeurpersoCom/omnivoice.cpp/tree/dbfc792d6fbe0cc3a776817f56de35a3744d7594) uses MIT; model/tokenizer cards use Apache-2.0. Licenses and generated-reference provenance are retained in speech/voices and ASSET_LICENSES.md.

[VoxCPM2](https://github.com/OpenBMB/VoxCPM) documents Tagalog among 30 languages and Apache-2.0 code/weights, Python >=3.10 and roughly 8 GB VRAM for the normal model. This machine has 4 GB and the existing speech environment is Python 3.9. It was not downloaded or quality-auditioned; small English/Chinese checkpoints are not a substitute for verified Tagalog output.

[VoiceStudio](https://github.com/debpalash/VoiceStudio) is an AGPL application with engine-specific model terms and APIs. The inspected 0.5.7 Windows release did not provide the required native executable; repository binary placeholders were not usable. It is not installed or active in Zyrah. A standalone native build avoided importing another application or assuming its service supports every engine. No purchase, cloud voice, real-speaker cloning, release publication or push occurred.

## Final automated checks

70 deterministic tests, five Edge browser cases, three native desktop cases and the actual-neural native case passed; JavaScript syntax checked 51 files. See TEST_REPORT.md for exact commands/results and failed intermediate runs. The neural test used a real Send activation, the renderer's own response/amplitude signals, and native process cancellation. It did not substitute generated transcript/audio mocks for OmniVoice. Human voice approval and physical microphone acceptance remain open.
## Changed components

- Native speech: server/neural-tts.js, config.js, providers.js, index.js and offline.js; profile defaults in store.js; fixed generated anchors and notices in speech/voices.
- Recognition: speech/worker.py and server/local-stt.js; separate saved language, same-adapter Dictate/Record and editable draft controls in public/app.js/index.html.
- Playback/performance: public/audio.js, performance.js, mao-avatar.js and desktop/main.js; playback identifiers, sample timer, bounded device resume, null cue clearing and post-motion blending.
- Auditions/setup: public/audition.js; scripts/audition-neural.js, audition-index.js, compare-stt-v2.js and debug-speech.js; speech/setup-neural.ps1/build-requirements.txt, .env.example, Start-Zyrah.ps1 and package source allowlist/reference copying.
- Verification: tests/speech-v2.test.js, audio-lifecycle.test.js and native/speech-v2.test.js; existing native suite now verifies local Dictate and accepts an honest empty-speech retry result. Root and application requirements/progress/acceptance/provider/license documents reflect the actual tested state.
