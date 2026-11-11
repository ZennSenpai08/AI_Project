Act as a senior full-stack developer with expertise in conversational AI, machine learning integration, speech processing, desktop applications, and character animation.

Your task is to implement **Zyrah**, my expressive floating desktop AI companion, in the current project. Work on the actual application—not just a plan or demonstration interface.

Read `AGENTS.md` and `README.md` in the repository root first. Use them as the project requirements and development instructions. Follow the specifications below when making implementation decisions.

**1. Inspect the project and begin development**

- Inspect the existing code, dependencies, configuration, tests, and Git status.
- Identify working features, incomplete features, and reusable components.
- Preserve existing functionality, unrelated changes, credentials, and user data.
- If the requirements documents are missing, search the repository. If still missing, use this prompt to establish the requirements and continue useful work.
- Create a practical implementation plan and track progress in `DEVELOPMENT_PROGRESS.md`.
- Make routine technical decisions independently. Do not repeatedly ask whether to continue.
- Continue implementing, testing, and fixing within the authorized scope until the requested features work or a concrete external blocker prevents further progress.

**2. Choose a suitable foundation**

Evaluate these upstream projects where relevant:

- AIRI: https://github.com/moeru-ai/airi
- Amica: https://github.com/semperai/amica
- three-vrm: https://github.com/pixiv/three-vrm
- VoiceStudio: https://github.com/debpalash/VoiceStudio
- VoxCPM: https://github.com/OpenBMB/VoxCPM
- OmniVoice: https://github.com/k2-fsa/OmniVoice
- faster-whisper: https://github.com/SYSTRAN/faster-whisper
- Silero VAD: https://github.com/snakers4/silero-vad
- Ollama: https://github.com/ollama/ollama

Verify current documentation, compatibility, and licenses before adopting dependencies.

Evaluate AIRI separately as a possible foundation. If my existing application already provides a suitable foundation, extend it. Do not overwrite my project or merge multiple complete companion frameworks.

Keep the chosen framework’s conventions. Prefer free local components where practical, while keeping model providers replaceable. Do not assume that free software will run quickly on every computer.

Inspect the target machine’s CPU, RAM, GPU, VRAM, and operating system when accessible. If developing remotely, clearly distinguish the development environment from my Windows computer.

**3. Implement Zyrah’s personality**

Zyrah is an original character who is warm, playful, curious, and thoughtful. She uses situational Filipino humor and speaks English, Tagalog, and natural Taglish.

Her conversation should include:

- Natural responses that follow the actual topic.
- Appropriate humor, pauses, and occasional laughter.
- Serious, attentive responses during deeper conversations.
- Consistent identity across long conversations and restarts.
- Honest handling of uncertainty and missing memories.

Avoid repetitive introductions, forced jokes, excessive fillers, robotic phrasing, and unnecessary formal explanations during casual conversation.

Create a versioned runtime character profile and original dialogue examples. Keep her core identity separate from temporary emotions and user memories. Include her identity in every model request.

She must not claim to be Pan VTuber, Ninomae Ina’nis, or another existing performer.

**4. Implement the floating desktop experience**

Build:

- A transparent, frameless character window.
- Character dragging that does not accidentally trigger clicking.
- Click-to-open chat with previous conversation previews, history, and the current thread.
- An always-on-top toggle.
- Saved character position with recovery when monitors or display scaling change.
- Tray controls for show/hide, chat, microphone, speech mute, settings, and quit.
- A configurable restore shortcut with conflict detection.
- Clear microphone and speaking indicators.

Implement transparent-region hit testing or click-through where appropriate. Do not let an invisible rectangular window unnecessarily block other applications.

Closing the chat panel and hiding the entire companion must be distinct operations.

**5. Make Zyrah physically express her reactions**

This requirement is essential: Zyrah must express emotions through her actual face and body. Emoji bubbles alone are insufficient.

Examples:

- Greeting: smile, raise her arm, wave, and naturally lower it.
- Amusement: smile with her eyes, subtly move her shoulders, and laugh when appropriate.
- Thinking: glance aside, tilt her head, and optionally use a thinking pose.
- Embarrassment: blush when supported, look away briefly, and soften her posture.
- Teasing: a small playful smile and head tilt.
- Concern: softened facial expression, attentive posture, and gentle delivery.
- Celebration: bright expression and restrained celebratory movement.

Interpret emoji in the context of the entire conversation. Do not automatically laugh just because a message includes 😂.

Inspect the selected model’s actual skeleton, expression shapes, and available motions. Implement supported reactions with graceful fallbacks. Do not claim custom expressions exist when the model lacks them.

Use coordinated animation layers for:

- Subtle breathing and idle posture.
- Blinking and gaze.
- Facial emotion.
- Body and hand gestures.
- Speech mouth movement.

Blend transitions smoothly. Use gesture cooldowns and restrained variation. Avoid twitching, repeated gestures, exaggerated constant movement, and abrupt resets.

The language model should select bounded emotion and gesture cues. A deterministic performance controller should execute them; the model must not generate arbitrary executable animation code.

**6. Implement speech input and expressive output**

Start with reliable push-to-talk, then add hands-free speech and interruption.

- Test English, Tagalog, and mixed Taglish transcription.
- Prevent Zyrah from repeatedly transcribing her own voice.
- Compare available local TTS engines using identical audition samples.
- Select for pronunciation, Filipino accent, naturalness, voice consistency, latency, and hardware use.
- Keep STT, TTS, and LLM integrations behind replaceable adapters.
- Verify which speech styles and nonverbal controls the selected engine actually supports.
- Keep technical emotion tags out of spoken output.
- Provide text fallback when voice services fail.

Use an original designed voice or a voice with appropriate permission. Clone Pan VTuber’s exact voice only if I provide permission from the speaker. Otherwise, implement an original Zyrah voice with the broad vocal qualities described above.

Do not assume VoiceStudio supports every candidate engine. Check its current API and engine list; use a separate service adapter where necessary.

Synchronize gestures and lip movement with actual audio playback. Delayed synthesis must not cause her gestures to finish before she starts speaking.

**7. Enforce complete audio shutdown when hidden**

Implement a central, idempotent hide/cancellation operation that:

1. Marks the companion hidden and invalidates the current turn’s audio and animation events.
2. Stops and releases microphone capture.
3. Stops speech detection and transcription streams.
4. Cancels pending generation where supported.
5. Immediately stops playback and clears queued audio.
6. Clears pending gestures and rejects late responses.
7. Hides companion windows and pauses unnecessary rendering.

Restoring Zyrah must not automatically reactivate the microphone.

Apply appropriate cleanup on quit, crashes, session lock, and suspend. A provider that cannot cancel its request must never cause late audio to play locally.

**8. Implement persistent conversation and memory**

Provide:

- Persistent conversation history and searchable previews.
- Current conversation recovery after restart.
- Summaries for older conversations.
- Relevant long-term memory retrieval.
- Memory viewing, correction, deletion, and disabling.
- Conversation export and deletion.

Store memory provenance and timestamps. Distinguish confirmed facts from guesses, hypothetical statements, and roleplay.

Deleting information must also remove or update derived retrieval entries and summaries.

Learning initially means useful memory and retrieval. Do not automatically retrain model weights on private conversations.

**9. Keep the implementation secure and maintainable**

- Separate privileged desktop operations from rendered chat and model output.
- Validate IPC, service messages, asset paths, and performance cues.
- Keep credentials out of the renderer and repository.
- Bind local services to loopback and authenticate application connections.
- Avoid storing raw microphone recordings by default.
- Clearly identify any provider that sends data to the cloud.
- Preserve licenses and notices for code, weights, voices, models, and animations.
- Keep broad computer control, continuous screen monitoring, game-playing, and livestream integrations outside this initial implementation.

Do not purchase services, publish releases, push changes, delete unrelated files, or make irreversible changes without authorization.

**10. Build and verify in manageable stages**

Prioritize:

1. Repository audit and foundation selection.
2. A working model demonstration with natural expressions and gestures.
3. Voice audition and hardware measurements.
4. Text conversation with Zyrah’s consistent identity.
5. Speech, animation timing, and interruption.
6. Persistent history and memory.
7. Desktop controls and hidden-state cleanup.
8. Packaging and accurate documentation.

Do not stop after making a mockup, adding placeholders, or writing a plan. Implement functional connections between the components.

Run meaningful tests for:

- Clicking versus dragging.
- Tray and shortcut recovery.
- Monitor and display-scaling changes.
- Hiding during recording, transcription, generation, playback, and animation.
- Late responses after cancellation.
- Speech interruption and queued audio.
- Expression and lip-sync conflicts.
- English, Tagalog, and Taglish.
- Memory persistence, correction, and deletion.
- Long conversations and serious-topic transitions.
- Provider failures and offline behavior.
- Installation and shutdown on Windows when that environment is available.

Clearly distinguish mocked tests from real microphone, model, and native desktop tests. Never claim a test passed unless it was executed.

**11. Complete the handoff**

Update `README.md`, `AGENTS.md`, and `DEVELOPMENT_PROGRESS.md` to reflect the actual implementation.

Document:

- Exact tested installation and startup commands.
- Required runtime versions and configuration.
- Model and avatar setup.
- Voice-provider configuration.
- Hardware measurements and known limitations.
- Features completed and features still blocked.
- Test results and remaining manual checks.

If blocked by unavailable credentials, hardware, permissions, or assets, continue all independent work and state precisely what is missing. Do not fabricate a finished result.

Start now by inspecting the repository, summarizing the existing architecture briefly, and implementing the first useful end-to-end stage.