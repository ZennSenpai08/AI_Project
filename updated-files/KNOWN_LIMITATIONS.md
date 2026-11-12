# Current update

Direct faster-whisper 1.2.1 CPU/int8 is now installed with a predownloaded pinned multilingual tiny model and has passed real silence/synthetic-English transcription through the API. The earlier absent-STT-service limitation below applies to the optional VoiceStudio adapter, not the new application-owned worker. Real microphone/Tagalog/Taglish listening checks remain unverified. Strict Offline Only now blocks unaudited external local services and cloud services; real offline LLM conversation and an OS-disconnected complete flow remain unimplemented/unverified.

# Known limitations and external blockers

- No running LLM, Ollama installation or cloud credentials: free-form chat and long-conversation personality quality are not live-verified. Demo is explicitly scripted.
- No installed/running local speech service or selected permitted voice: local audition failed to connect. No human accent, voice naturalness, transcription accuracy or audio latency scores exist.
- Real microphone, speaker echo and physical barge-in are untested. Native automation uses synthetic Chromium audio. Hands-free is half duplex; Stop/Record interrupts. STT operates on bounded recordings; TTS buffers each sentence.
- Device TTS cannot expose amplitude; mouth stays closed. Amusement moves face/body, but no verified generated laughter exists. Mao is a licensed sample, not an original Zyrah asset; open-palm wave remains approximate.
- Native tray is instantiated and uses the tested restore path, but physical tray clicks/global key presses, click-through over another application, mouse dragging and monitor hotplug/DPI changes still need human Windows checks. Geometry and drag thresholds have deterministic tests. Lock/suspend handlers exist but actual OS events were not exercised.
- Memory ranking is lexical; summaries are short source-attributed excerpts, not learned summaries. Only explicitly approved notes are stored. No retraining. SQLite is not encrypted; deletion does not erase backups, exports or filesystem remnants.
- No clean-machine installer or signing certificate. Portable packaging is local and private. Runtime/model notices must remain with the package. No project-wide distribution license was assigned.
- Local performance CPU/GPU, peak RAM/VRAM and first-audio behavior need a sustained benchmark with actual providers. Captured native metrics are a short process snapshot, not idle or peak hardware benchmarks.
