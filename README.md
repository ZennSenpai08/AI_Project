# Zyrah — Expressive AI Desktop Companion

An original virtual companion who talks, listens, remembers useful context, and expresses herself through her voice, face, and body.

**Project direction:** Windows-first floating desktop companion with natural English–Tagalog conversation, persistent personality, expressive speech, and coordinated character animation.

> Status: development specification. These documents describe the intended product; they do not certify that any feature is implemented. The existing repository has not been audited for this document. Confirm capabilities in code and on the target machine before marking them complete.

## Meet Zyrah

Zyrah is a warm, playful, thoughtful original character. She enjoys light teasing and situational Filipino humor, switches naturally between English and Tagalog, and can settle into a serious conversation without losing her identity.

Her manner should feel conversational: varied sentence lengths, appropriate pauses, restrained laughter, and responses that follow what the user actually said. Avoid repetitive greetings, constant catchphrases, forced jokes, excessive fillers, and formal assistant-style speeches during casual chat. She remains honest about being an AI when asked.

Neuro-sama, character-chat experiences, and Filipino VTuber delivery are broad inspiration. Zyrah has her own identity, appearance, dialogue, and voice; she does not claim to be Ninomae Ina'nis, Pan VTuber, or a member of their organizations.

## Intended experience

1. Launch Zyrah and see her character floating on the desktop.
2. Drag her to a comfortable position. A click opens the chat panel; dragging does not accidentally open it.
3. Continue the current conversation or browse previews of previous conversations.
4. Type or enable the microphone to talk. Start with push-to-talk; add hands-free conversation after reliable audio handling.
5. Zyrah speaks while her face, gaze, mouth, and gestures follow the meaning and timing of her response.
6. Hide her through the tray. Microphone capture, speech playback, and pending reactions stop.
7. Restore her through the tray or a configurable shortcut. The microphone stays off until explicitly re-enabled.

## Planned features

All entries below are planned until implementation and verification establish otherwise.

| Area | Requirement |
| --- | --- |
| Desktop | Transparent, frameless, draggable character window |
| Chat | Separate panel with current thread, history previews, search, and persistent messages |
| Window controls | Always-on-top toggle, saved position, display-boundary recovery |
| Tray | Show/hide, open chat, microphone control, mute speech, settings, quit |
| Restore | Configurable global shortcut; proposed default `Ctrl+Alt+C`, with conflict handling |
| Voice | STT, TTS, adjustable voice settings, interruption and cancellation |
| Language | English, Tagalog, and contextual Taglish |
| Character | Facial expressions, lip sync, gaze, blinking, gestures, and subtle idle motion |
| Memory | Conversation summaries and editable, source-linked personal memories |
| Privacy | Local-first storage, clear cloud-provider disclosure, no raw-audio retention by default |
| Reliability | Text fallback, provider failure recovery, clean shutdown and data migrations |

Transparent areas require deliberate hit testing or click-through handling. Transparency alone does not make clicks pass through to another application.

## Expressions are performances

Emoji express intent; Zyrah performs that intent through her model. Floating symbols are optional secondary effects, never the only implementation of an emotional reaction.

| Cue | Proposed performance |
| --- | --- |
| 👋 Greeting | Smile, lift forearm, wave wrist, then smoothly relax the arm |
| 😂 Amusement | Lift cheeks, narrow eyes, lean slightly, move shoulders subtly, and laugh when appropriate |
| 🤔 Thinking | Glance aside, tilt head, and optionally bring a hand toward the chin |
| 😳 Embarrassment | Blush, briefly look away, soften posture, and hesitate naturally |
| 😏 Teasing | Small asymmetric smile, sideways head tilt, playful delivery |
| 🥺 Concern | Soften eyes and brows, lean slightly forward, speak attentively |
| 😤 Playful annoyance | Small pout or brow change with a brief pose, only when context supports it |
| 🎉 Celebration | Bright smile and restrained celebratory hand movement |
| 😴 Sleepiness | Lower eyelids, relaxed posture, optional yawn animation |

Interpret the whole message: “I failed my exam 😂” should not mechanically trigger laughter. Unknown emoji map to a supported contextual reaction or a neutral fallback; unique animation for every Unicode emoji is not promised.

### Animation requirements

- Blend idle, gaze, emotion, gesture, and speech layers smoothly.
- Give gestures an entrance, a main movement, and a relaxed exit.
- Use restrained variation and cooldowns so gestures do not repeat constantly.
- Synchronize performance cues with audio playback, not the arrival of generated text.
- Prevent expressions from fighting with blinking or mouth shapes.
- Stop or settle gestures when speech is interrupted; never replay canceled cues.

A VRM model is the initial recommendation for flexible body gestures. Inspect its actual skeleton, facial shapes, and usage terms before adoption. Standard expressions are not guaranteed to exist. Blush, heart eyes, tears, and exaggerated anime effects may need custom art or model work. Live2D remains an alternative when a suitable rig already exists.

## Reusable projects to evaluate

These are candidates and references, not installed dependencies. Pin compatible versions and verify licenses for the selected release, model weights, voices, motions, and assets.

| Project | Proposed use | Repository license reported during planning |
| --- | --- | --- |
| [AIRI](https://github.com/moeru-ai/airi) | First desktop-companion foundation to evaluate | MIT |
| [Amica](https://github.com/semperai/amica) | Reference for conversational emotion-to-avatar mapping | Mostly MIT; assets separate |
| [three-vrm](https://github.com/pixiv/three-vrm) | VRM rendering and animation | MIT |
| [VoiceStudio](https://github.com/debpalash/VoiceStudio) | Local voice auditioning, design, cloning, and speech API | AGPL-3.0; engines and assets separate |
| [VoxCPM](https://github.com/OpenBMB/VoxCPM) | Candidate expressive TTS; evaluate VoxCPM2 for Tagalog | Apache-2.0 repository; check weights |
| [OmniVoice](https://github.com/k2-fsa/OmniVoice) | Alternative voice-design and cloning candidate | Apache-2.0 repository; check weights |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | Local speech recognition | MIT |
| [Silero VAD](https://github.com/snakers4/silero-vad) | Speech boundary detection | Verify selected release |
| [Ollama](https://github.com/ollama/ollama) | Optional local language-model runner | Verify runtime and each model separately |

Evaluate one foundation before integrating. Do not combine entire competing applications. If AIRI is adopted, preserve its existing framework and conventions. If the current project already provides a strong desktop foundation, extend it rather than rewriting it unnecessarily.

Free software does not guarantee free cloud inference, fast CPU generation, or unrestricted redistribution of every bundled asset. Review license obligations before copying or distributing code; retain required notices.

## Voice strategy

Zyrah's target voice is an original, warm adult feminine voice with a Filipino accent, natural Taglish, and expressive but restrained delivery.

VoiceStudio is an optional local service and auditioning interface. Its presence does not prove that a particular engine, streaming mode, emotion tag, or export format is supported. Verify the installed version's capabilities and use an adapter. VoxCPM may require its own service rather than being available inside VoiceStudio.

Clone Pan VTuber's exact voice only with the speaker's permission. Without permission, design an original voice or use a licensed voice reference. Do not treat publicly available livestream audio as permission. Voice similarity does not transfer personality, humor, or conversational timing.

Audition candidate engines on identical English, Tagalog, Taglish, technical-name, laughter, teasing, and serious-conversation samples. Compare pronunciation, accent consistency, identity stability, first-audio delay, and memory use on the target PC. Do not select solely from a single demo or a vendor language list.

## Proposed architecture

| Component | Responsibility |
| --- | --- |
| Desktop host | Windows, tray, shortcuts, display recovery, app lifecycle |
| Character renderer | Avatar, animation blending, mouth movement, gaze, optional effects |
| Chat interface | Current conversation, history previews, search, settings, memory controls |
| Conversation service | Character profile, recent context, retrieval, provider requests |
| Audio service | Capture, speech detection, transcription, synthesis, playback, cancellation |
| Performance controller | Validates emotion/gesture cues and synchronizes them with playback |
| Persistence | SQLite or existing suitable storage, schema migrations, export and deletion |
| Provider adapters | Replaceable LLM, STT, TTS, and optional knowledge retrieval |

Prefer existing modules after the repository audit. For a custom foundation, Electron/TypeScript and a Python speech service are candidates, not mandatory replacements. Avoid adding a second backend or database when the existing architecture already covers the need.

## Personality and memory

Keep these separate:

1. **Core identity:** versioned Zyrah character profile, updated explicitly.
2. **Working context:** recent messages and the current topic.
3. **Summaries:** compact records of older conversation, linked to source messages.
4. **Long-term memories:** useful facts and preferences with provenance, timestamps, and correction/deletion controls.

Include the core identity on every conversation request. Retrieve only relevant memories. Preserve uncertainty: “I might study Japanese” is not “I speak Japanese.” Never invent shared history or treat roleplay as a confirmed personal fact.

Initial learning means retrieval and editable memory, not automatic model retraining. Optional document search and web access come later, with clear user controls. Perfect recall or zero personality drift is not guaranteed; evaluate consistency through long conversations.

## Hidden means quiet

Hiding the companion must stop microphone tracks, speech detection, transcription streams, current playback, queued speech, and pending performance cues. Cancel provider work where supported and reject all late results from canceled turns. Silence playback locally even if a remote provider cannot cancel generation.

Closing only the chat panel may leave Zyrah visible. Explicitly hiding the companion hides its windows and invokes the complete audio shutdown. Restoring never silently reactivates capture. Quit also shuts down application-owned child processes.

## Getting started with development

Place this file and [AGENTS.md](AGENTS.md) in the repository root after reviewing any existing instructions. These documents do not include application code or a verified installer.

1. Audit the repository and record working features and current setup commands.
2. Check Windows version, CPU, RAM, GPU/VRAM, microphone, and local/cloud preference.
3. Evaluate AIRI separately using its current upstream setup instructions. Do not overwrite the current project.
4. Approve a model and demonstrate greeting, laughter, thinking, concern, and teasing.
5. Audition local voice engines with a permitted or original voice.
6. Connect one LLM, one STT adapter, and one TTS adapter.
7. Implement synchronized performance, history, memory, and desktop lifecycle behavior.
8. Package and test on a clean target Windows machine.

Exact install/run/build commands, runtime versions, environment-variable names, and hardware requirements must be added after the repository is audited and the commands actually succeed. No placeholder command should be presented as verified setup.

## Roadmap and completion gates

- [ ] Audit: inventory, baseline build/test results, and foundation decision recorded.
- [ ] Character demo: smooth gestures and expressions on the actual Zyrah model.
- [ ] Voice demo: understandable English/Tagalog/Taglish and acceptable measured latency.
- [ ] Conversation: stable identity across casual and serious topics.
- [ ] Integration: speech, expressions, interruption, and playback stay coordinated.
- [ ] Persistence: history survives restart; memory correction and deletion work.
- [ ] Desktop: drag/click distinction, tray, shortcut, display recovery, hide shutdown.
- [ ] Release: installer, migrations, third-party notices, accurate setup documentation.

Measure end-of-speech-to-first-audio delay, cancellation delay, STT errors, memory accuracy, and idle resource use. Set numerical release targets after measuring the user's hardware; do not invent performance claims.

## Development instructions and references

Read [AGENTS.md](AGENTS.md) before modifying the project. Preserve existing user work and report the exact scope of testing.

Technical references: [AIRI development and source](https://github.com/moeru-ai/airi), [Amica emotion system](https://docs.heyamica.com/overview/emotion-system), [VRM expressions](https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/expressions.md), [VoiceStudio local API](https://voicestudio.sh/docs/local-api).

This README does not assign a license to the existing project. Preserve its current license and third-party obligations; select a project license deliberately before distribution.
