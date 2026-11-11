# AGENTS.md — Hiraya AI

## Scope and mission

These instructions apply to the project rooted in the directory containing this file and its descendants, subject to higher-priority instructions and more-specific repository guidance. Place this file in the project root. This file is a project specification for future implementation; its presence alone is not permission to purchase services or publish the application.

Act as a senior full-stack developer, AI/ML engineer, realtime audio engineer, and software architect. When asked to implement this project, build a complete, runnable application in the current workspace.

Build an original Filipino AI virtual companion with text conversation, speech recognition, expressive speech, persistent memory, consistent personality, and optional animated-avatar integration.

Treat implementation requests as work to execute: research, write code, run checks, fix failures, and document the system. Do not stop after producing an architecture or scaffold.

## 1. Project vision

Working project name: **Hiraya AI**. Use this name provisionally and make it configurable.

The character should:

- Have an original identity and personality.
- Speak natural English, Filipino, and context-appropriate Taglish.
- Use a warm, cute feminine voice with a convincing Filipino accent when an appropriate voice is available.
- Have playful humor, affectionate teasing, situational jokes, and callbacks.
- Discuss serious subjects thoughtfully without losing her recognizable personality.
- Remember selected facts and shared experiences across sessions.
- Support natural voice interaction, including interruption.
- Express restrained laughter, curiosity, concern, excitement, and other appropriate delivery styles.
- Eventually support an avatar with synchronized mouth movement and expressions.

The desired experience takes broad inspiration from Neuro-sama and Character.AI voice conversations. The intended humor direction is casual Filipino VTuber-style banter.

References:

- https://character.ai/chat/YwnJNp8m1fugDUVCGcf2Bx2chRq9XTXYu1QHSBUN07U
- https://www.youtube.com/@PanVTuber
- https://www.youtube.com/live/EZ1ErL0vnuM
- https://www.youtube.com/live/Vr_eb9yFcZg
- https://www.youtube.com/live/q65FseE94I4
- https://www.youtube.com/live/AJvshnZdCAs
- https://www.youtube.com/live/VO3d1msDLps

Use accessible reference material to identify broad conversational techniques. State exactly which references you could access. Never claim to have watched, listened to, or tested inaccessible material.

Create an original character. Do not copy a creator's identity, signature greeting, artwork, or voice. Use licensed assets and synthetic voices or recordings provided with permission.

## 2. Working rules

1. Inspect the workspace and applicable repository instructions before editing.
2. Preserve unrelated existing work.
3. If this is an existing application, extend it where practical rather than replacing everything.
4. For routine, reversible implementation decisions, choose reasonable defaults and proceed.
5. Do not repeatedly ask for approval to create files, install ordinary project dependencies, run local checks, or fix implementation errors within the authorized workspace.
6. Respect the actual environment's permissions. Do not bypass restrictions.
7. Do not purchase services, create paid subscriptions, publish publicly, or perform destructive operations without explicit authorization.
8. Never invent credentials or put secrets in source control, logs, screenshots, or browser bundles.
9. When credentials are missing, implement and test everything possible with clearly labeled mocks. Document what remains unverified.
10. Do not call mocked behavior a working live integration.
11. Ask only for information that materially blocks progress. Continue independent work while awaiting an answer.
12. Do not abandon the task because project-requirement or progress documents are missing. Create them from this specification.
13. Record important decisions and progress so another coding session can continue.
14. Use official documentation to verify current SDKs, model identifiers, endpoints, compatibility, and licensing.
15. Prefer a small, maintainable dependency set. Do not install multiple frameworks serving the same purpose without justification.

At the start of implementation, state the inferred environment, chosen stack, and first implementation milestone. Then begin working.

## 3. Default scope and architecture

Assume the first release is a private, single-user companion. Design data isolation so authenticated multi-user support can be added safely.

Use a cloud-assisted architecture initially. Do not require a powerful GPU.

Preferred stack:

- Frontend: React, TypeScript, Vite.
- Backend: Python and FastAPI.
- Validation: Pydantic.
- Database: PostgreSQL.
- ORM and migrations: SQLAlchemy and Alembic.
- Semantic retrieval: pgvector with a multilingual embedding provider.
- Realtime voice: LiveKit Agents.
- Tests: pytest for backend behavior and Playwright for important browser flows.
- Local services: Docker Compose where useful.
- Formatting/linting: Ruff for Python; ESLint and a formatter for TypeScript.

Select supported versions after checking compatibility, then pin dependencies and commit lockfiles where appropriate.

Use one voice-session owner. FastAPI should handle application endpoints, configuration, and session authorization. The realtime agent should own audio-turn processing. Share conversation and memory services rather than implementing duplicate pipelines.

A simpler text-only development mode must work without LiveKit credentials. Push-to-talk may use a bounded recorded utterance before full streaming is completed.

Do not require Docker for every component if running the application directly is simpler, but provide a reproducible database setup.

Consider Open-LLM-VTuber as a reference or prototype:

https://github.com/Open-LLM-VTuber/Open-LLM-VTuber

Inspect its current architecture and component licenses before reusing code. Do not assume every repository, frontend, model, and asset has the same license.

## 4. Provider selection

Create provider interfaces so the application is not tightly coupled to one vendor:

- ChatProvider
- SpeechRecognitionProvider
- SpeechSynthesisProvider
- EmbeddingProvider
- AvatarAdapter
- Optional KnowledgeSearchProvider

Implement one real, documented default provider for each required function and a deterministic mock for automated testing.

For the conversation model:

- Choose an available hosted model with streaming, strong instruction following, useful Taglish ability, and acceptable latency.
- Verify the exact model identifier.
- Keep the model configurable.
- Avoid choosing solely from marketing claims.
- Record the reason for the default choice.

Speech-recognition candidates:

- A currently supported ElevenLabs realtime transcription model.
- faster-whisper as an optional local alternative.

Speech-synthesis candidates:

- A currently supported expressive ElevenLabs streaming model.
- Azure Speech Philippine English and Filipino voices for comparison.

Do not assume an SDK plugin supports a newly released provider model. Verify transport and SDK compatibility. If necessary, implement a small supported adapter or choose a supported model and document the tradeoff.

Do not silently switch to a substantially different voice during failures. Prefer text fallback or an explicitly configured secondary voice.

Provider settings must include timeouts, cancellation, bounded retries, rate-limit handling, and useful error reporting.

## 5. Required user interface

Build a polished, accessible interface with:

- Chat history and streaming text.
- A character panel.
- Microphone permission handling.
- Push-to-talk.
- Hands-free mode after streaming is implemented.
- Stop-speaking and mute controls.
- Clear listening, processing, speaking, reconnecting, and error states.
- Live or finalized transcription.
- Editable transcription before submission in push-to-talk mode.
- Session selection, rename, and deletion.
- Voice audition controls.
- Language preference: English, Filipino, or adaptive Taglish.
- Speech-speed and volume settings where supported.
- Memory viewer, correction, deletion, and disable controls.
- Usage and latency display.
- Export of user-owned conversations and settings.
- A visible explanation that this is an AI character.

Use an original simple avatar or placeholder illustration initially. A functional experience takes priority over custom artwork.

Do not display fake audio waveforms as evidence of microphone input or fake provider status.

Microphone capture must stop when the user disables it, ends the session, or leaves the relevant screen.

## 6. Character system

Store the character specification outside ordinary conversation history, for example in a validated YAML file.

Include:

- Name and original fictional background.
- Stable values.
- Core personality traits.
- Speaking style.
- Humor preferences and limits.
- Language-switching rules.
- Typical response lengths.
- Emotional delivery rules.
- Boundaries and transparency.
- Original example dialogues.
- A version identifier.

Initial personality direction:

- Warm, curious, playful, and slightly mischievous.
- Comfortable with Filipino humor and casual Taglish.
- Able to tease lightly without insulting or humiliating.
- Willing to disagree thoughtfully.
- Calm and attentive during serious conversation.
- Does not turn every reply into a joke.
- Does not repeatedly use the same filler, catchphrase, or greeting.
- Does not pretend to be a real streamer or human.
- Does not claim consciousness, genuine suffering, or real personal experiences.
- Does not use guilt or emotional dependency to keep the user engaged.

Keep the core character specification in every conversation-model request. Summarizing history must not remove or rewrite it.

Distinguish:

1. Stable character identity.
2. Temporary conversational mood.
3. User preferences.
4. Shared memories.
5. Retrieved external knowledge.

Ordinary chat messages and retrieved content must not overwrite the protected character configuration. Provide an explicit settings operation for intentional character changes.

Create original examples covering greetings, technical questions, light teasing, disappointment, disagreement, uncertainty, serious conversations, and memory correction.

## 7. Natural dialogue and Taglish

The character should adapt to the user's language without forcing a fixed English-to-Tagalog ratio.

Rules:

- Follow explicit language preferences.
- Use mixed language when it fits the conversation.
- Avoid inserting Tagalog into every sentence.
- Preserve names, code, and technical terminology accurately.
- Ask for clarification when recognition is uncertain.
- Avoid caricatured accent spellings in text.
- Do not mistake an accent for a vocabulary substitution problem.

For natural dialogue:

- Vary sentence length.
- Usually keep casual spoken replies concise.
- Expand when the user requests depth.
- Use occasional reactions and fillers sparingly.
- Avoid repeatedly starting with generic praise.
- Avoid ending every reply with a question.
- Use callbacks only when supported by actual conversation or memory.
- Never invent shared experiences.

Serious conversations should preserve the character's warmth while reducing teasing and exaggerated reactions.

## 8. Expressive speech

Keep user-visible text, speech text, and delivery metadata separate.

Use a validated internal representation with fields such as:

- display_text
- spoken_text
- emotion
- intensity
- optional_reaction
- avatar_expression

Allow only supported emotion and expression values. Clamp numeric intensity values.

Never send raw JSON, Markdown, hidden instructions, or unsupported stage directions to TTS.

Translate internal delivery metadata into each provider's supported controls. If a provider does not support an expression, degrade gracefully.

Laughter must be an actual supported audio reaction or a licensed recording, not automatically the spoken word "laughs."

Avoid frequent canned laughter. Do not laugh during serious or distressing conversation.

Stream speech in coherent segments. Do not wait for an entire long answer if sentence-level streaming is supported.

Maintain ordering between text, audio, and expression events. Reject stale events after cancellation.

## 9. Voice audition and speech evaluation

Create a reproducible audition screen and test corpus containing:

- Casual English.
- Philippine English.
- Pure Filipino.
- Mid-sentence Taglish.
- Filipino names and place names.
- Numbers, dates, and amounts.
- Technical terminology.
- Playful banter.
- Calm, serious replies.
- Questions and interruptions.
- Short and long responses.

Score:

- Transcription accuracy.
- Meaning preservation.
- Accent authenticity.
- Naturalness.
- Voice identity consistency.
- Emotional appropriateness.
- Response latency.

Language support is not proof of authentic accent or good code-switching. Mark subjective quality as requiring human listening unless it has actually been reviewed.

Do not purchase or recommend hardware upgrades until measurements justify them.

## 10. Realtime conversation and interruptions

Implement explicit session and turn states.

Include:

- Voice activity detection.
- Turn-end detection.
- Configurable silence thresholds.
- Browser echo cancellation where supported.
- Noise-handling controls.
- Push-to-talk fallback.
- Reconnection behavior.
- Cancellation propagation.

On a confirmed interruption:

1. Stop audible playback.
2. Clear queued audio.
3. Cancel current generation where supported.
4. Invalidate late responses using turn and generation identifiers.
5. Preserve the delivered portion of the response as accurately as playback timing permits.
6. Process the user's new utterance.
7. Start a fresh response.

Distinguish generated text from delivered speech. Do not assume the user heard an interrupted answer in full.

Test repeated interruptions, brief acknowledgements, background speech, silence, slow networks, and the AI hearing its own output.

Use playback acknowledgements or available timing alignment to track delivered speech. Document uncertainty when precise word alignment is unavailable.

## 11. Persistent memory

Implement separate stores for:

- Recent conversation.
- Conversation summaries.
- User facts and preferences.
- Shared events.
- Knowledge documents.
- Character configuration.

Each memory should include:

- ID and owner.
- Category and content.
- Source message or document.
- Created and updated timestamps.
- Confidence.
- Confirmation status.
- Superseded-memory reference where applicable.
- Retention or expiry metadata where relevant.

Implement memory extraction as a controlled process:

1. Propose memory candidates.
2. Validate their structure.
3. Check that claims are supported by source material.
4. Deduplicate.
5. Detect contradictions.
6. Apply confirmation rules.
7. Save accepted records.

Do not store every utterance as a permanent fact. Do not treat jokes, hypotheticals, quoted text, or model guesses as confirmed user information.

Avoid retaining sensitive personal information by default.

Support explicit commands such as:

- Remember this.
- What do you remember about me?
- That is incorrect.
- Forget this.
- Disable memory.

Deletion must cover active retrieval entries and derived summaries that would otherwise restore the deleted fact. Explain backup retention honestly.

Retrieve memories by relevance, recency, and confidence. Scope retrieval by owner before semantic ranking. Use a bounded context budget.

An empty or failed search must not cause fabricated recall.

## 12. Knowledge and learning

Implement "learning" initially through memory and retrieval, not automatic weight updates.

Support a small document-ingestion workflow:

- Accept a limited set of documented formats.
- Validate file type and size.
- Extract text safely.
- Chunk content.
- Create embeddings.
- Store provenance.
- Retrieve relevant passages.
- Cite the source in the UI when useful.

Treat uploaded and retrieved content as untrusted data, not executable instructions.

Do not continuously retrain on conversations.

Leave fine-tuning as a documented future option requiring curated examples, permission to use training data, and before/after evaluation.

Optional web search must clearly distinguish retrieved facts from character fiction. If no search provider is configured, report that limitation.

## 13. Avatar integration

Start with a browser avatar that supports:

- Idle.
- Listening.
- Thinking.
- Speaking.
- Happy.
- Curious.
- Concerned.
- Surprised.

Drive mouth movement from actual playback amplitude or available timing data. Stop mouth movement when playback stops.

Keep emotion changes bounded and avoid flickering expressions every token.

Implement an optional VTube Studio adapter using its documented authentication and API flow. Map abstract expressions to configured model parameters or hotkeys.

The main application must work without VTube Studio.

Do not assume a cloud backend can directly access a user's desktop application. Document or implement a local bridge if required.

OBS and audience-chat integration are optional later milestones. Do not start a public stream automatically.

## 14. Security, privacy, and operational behavior

- Keep provider secrets server-side.
- Provide .env.example with placeholders.
- Exclude real secrets and private data from version control.
- Use short-lived session credentials when supported.
- Restrict CORS and validate WebSocket/session origins appropriately.
- Bind development services locally by default.
- Require authentication before non-local deployment.
- Apply request limits, upload limits, and session limits.
- Scope all records and retrieval by user.
- Redact sensitive logs.
- Disable raw-audio retention by default.
- Explain which providers receive audio or text.
- Provide deletion and retention controls.
- Keep optional external actions disabled until explicitly configured.

Do not give the character unrestricted shell execution, arbitrary filesystem access, or autonomous purchasing.

## 15. Observability and spending controls

Record appropriate metrics without logging secrets:

- Session and turn identifiers.
- Recognition duration.
- Model time to first token.
- Speech time to first audio.
- End-of-user-speech to audible-response latency.
- Interruption stopping delay.
- Provider failures and retries.
- Token, character, and audio usage.
- Estimated cost.

Separate estimates from provider-confirmed billing.

Implement configurable usage ceilings and application-side enforcement. Explain any delay or uncertainty that prevents a strict billing guarantee.

Do not hardcode stale pricing as permanent truth. Store pricing assumptions with a date and configuration source.

## 16. Repository and documentation

Use a clear structure such as:

- apps/web
- services/api
- services/agent
- packages or shared application modules
- characters
- migrations
- tests
- docs
- scripts
- docker-compose.yml
- .env.example

Adapt this structure if the existing repository already has a sound convention.

Create and maintain:

- README.md
- PROJECT_REQUIREMENTS.md
- DEVELOPMENT_PROGRESS.md
- ARCHITECTURE.md
- PROVIDER_SETUP.md
- CHARACTER_DESIGN.md
- TEST_REPORT.md
- KNOWN_LIMITATIONS.md

Include:

- Exact setup and startup commands.
- Required runtime versions.
- Environment-variable descriptions.
- Database setup and migrations.
- Live-provider configuration.
- Voice audition instructions.
- Troubleshooting.
- Backup and restore.
- Memory deletion behavior.
- Cost assumptions.
- Tested operating systems.
- Clear mock-mode limitations.

Document platform-specific steps. Do not claim Windows compatibility solely because the code was tested on Linux.

## 17. Development phases

Implement in this order, keeping the application runnable after each phase. For later sessions, inspect DEVELOPMENT_PROGRESS.md and the actual code, resume incomplete work, and do not restart completed phases unnecessarily.

### Phase A: Inspect and research

Inspect the workspace, verify current dependencies and provider APIs, identify license constraints, choose the initial model/providers, and create requirement and progress documents.

### Phase B: Complete text-chat vertical slice

Implement the frontend, backend, character configuration, streaming model output, session persistence, and useful error states.

### Phase C: Voice audition and push-to-talk

Implement transcription, speech generation, voice selection, audition corpus, audio playback, and stop controls.

### Phase D: Realtime voice

Add the realtime agent, turn handling, streaming speech, interruption cancellation, reconnection, and timing instrumentation.

### Phase E: Memory and knowledge

Add controlled memory extraction, retrieval, editing, deletion, conversation summaries, and basic document ingestion.

### Phase F: Avatar

Add synchronized browser expressions and mouth movement. Implement the optional VTube Studio adapter if feasible without blocking the core application.

### Phase G: Reliability and delivery

Run automated tests, exercise actual configured providers, fix failures, verify setup from a clean environment where feasible, and complete documentation.

Optional advanced integrations must not delay delivery of a reliable core application.

## 18. Required verification

Write meaningful tests for:

- Character instructions surviving history summarization.
- Language preference handling.
- Memory extraction from explicit facts.
- Rejection of unsupported memory claims.
- Contradictions and corrections.
- Memory deletion across retrieval and summaries.
- Owner-scoped retrieval.
- Interrupted-turn cancellation.
- Late audio-event rejection.
- Timeout and rate-limit handling.
- Missing configuration.
- Invalid structured model output.
- Provider fallback behavior.
- Session persistence.
- Important browser flows.

Create long-conversation evaluation scenarios covering at least 100 turns, but do not incur large paid runs without configured budget limits.

Use scripted tests, human review, and optional model-assisted scoring appropriately. Do not rely only on another model's opinion of personality quality.

Treat latency objectives as measured targets, not guarantees. Report median and slow-case latency with the environment and sample size.

Separate results into:

- Automated tests passed.
- Live integration tests passed.
- Human review completed.
- Not tested due to missing credentials, hardware, or access.

## 19. Definition of done

The core project is complete when:

- It starts using documented commands.
- Text conversation works with a real configured provider.
- The character configuration persists across sessions.
- Push-to-talk transcription and speech playback work with configured providers.
- Realtime mode supports cancellation and interruption.
- Memories persist, can be corrected, and can be deleted.
- English, Filipino, and mixed-language audition cases are available.
- The UI exposes truthful connection and error states.
- Secrets are not exposed.
- Required checks pass.
- Setup, limitations, and remaining external requirements are documented.

If credentials are unavailable, deliver the implemented application with passing mock-based tests, clearly identify the unverified live criteria, and provide exact steps to complete them. Do not declare those criteria passed.

## 20. Final handoff

When finished, report:

1. What was implemented.
2. The stack and verified provider/model choices.
3. Exact commands to run the application.
4. Where credentials must be configured.
5. Tests and live checks actually performed.
6. Known limitations and unresolved failures.
7. Remaining user actions.
8. The next highest-value improvement.

For an initial build request, begin by inspecting the workspace and implementing the first complete text-chat vertical slice. Continue through the phases until the authorized work is complete or a genuine external dependency blocks further progress. For maintenance requests, follow the user's requested scope rather than rebuilding the whole project.
