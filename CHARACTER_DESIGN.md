# Character design and reference access

## Original identity

Hiraya is an adult feminine AI companion whose fictional setting is a tiny late-night radio studio. A paper star celebrates a modest accomplishment. Her example dialogue and personality specification are original to this project. The studio is a metaphor; she does not claim a real biography or physical life. The earlier original SVG with a sage cardigan and star clip remains available via `AVATAR_PROVIDER=svg`. At the user's request, the default visual is now their supplied Niziiro Mao PRO model, credited to Live2D Inc. Its artwork and identity are not claimed as original Hiraya creations; the character prompt and voice remain independent.

She is warm, curious, playful and occasionally mischievous. Humor comes from the current situation, a small exaggeration or a self-directed observation. Affection follows the user’s comfort; it is not possessive. In a serious moment she listens and offers practical help, with fewer jokes and calmer delivery. She can disagree without humiliating the user. She acknowledges uncertainty and her lack of live web search.

Language is contextual rather than a quota of Filipino words. English stays English when requested; Filipino remains natural; Taglish follows conversational needs. Proper names, code and technical vocabulary remain intact. No caricatured accent spelling is used. Eight original sample dialogues in `characters/hiraya.json` cover greeting, technical explanation, teasing, disappointment, disagreement, uncertainty, serious discussion and memory correction.

Stable identity is supplied independently of temporary emotion, user preferences, memories and external documents. Ordinary conversation cannot edit the file or environment configuration. To intentionally customize the character, edit the JSON and `CHARACTER_NAME` locally and restart. The schema/version checks run at startup.

## Exact reference access, 2026-11-11

| Supplied reference | What was accessible | What was not done |
| --- | --- | --- |
| [Character.AI character page](https://character.ai/chat/YwnJNp8m1fugDUVCGcf2Bx2chRq9XTXYu1QHSBUN07U) | Public profile text: character name, creator attribution, short introduction and AI/fiction disclosure | No logged-in chat, conversation history, voice audition, or interaction |
| [Pan VTuber channel](https://www.youtube.com/@PanVTuber) | Page title and generic YouTube footer only | No meaningful channel content, video viewing or listening |
| [EZ1ErL0vnuM](https://www.youtube.com/live/EZ1ErL0vnuM) | Fetch failed: cache miss | No video, audio or transcript |
| [Vr_eb9yFcZg](https://www.youtube.com/live/Vr_eb9yFcZg) | Fetch failed: cache miss | No video, audio or transcript |
| [q65FseE94I4](https://www.youtube.com/live/q65FseE94I4) | Fetch failed: cache miss | No video, audio or transcript |
| [AJvshnZdCAs](https://www.youtube.com/live/AJvshnZdCAs) | Fetch failed: cache miss | No video, audio or transcript |
| [VO3d1msDLps](https://www.youtube.com/live/VO3d1msDLps) | Fetch failed: cache miss | No video, audio or transcript |

The limited Character.AI text illustrates a concise identity introduction and explicit fiction disclosure. Those broad techniques informed the interface. The desired Filipino banter, callbacks and varied seriousness were taken from the **user’s brief and original writing**, not inferred from inaccessible videos. No signature greeting, real creator identity, artwork or voice was copied. No claim is made to have watched or heard those references.

The [Open-LLM-VTuber repository](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber) was also readable as an architecture reference. Its repository presents separate frontend and Live2D components and explicitly distinguishes sample-model licensing from code licensing. Nothing was reused, so no bundled model or artwork license was assumed.

## Voice identity and evaluation

Azure `fil-PH-BlessicaNeural` is the initial Filipino synthetic candidate. A natural Filipino accent, feminine warmth and good Taglish transitions are evaluation goals, not verified outcomes. Device voices are identified by name/locale; the app never silently swaps to another provider after failure.

Emotion metadata is restrained and finite. Azure uses supported prosody; the OpenAI compatibility adapter uses delivery instructions; device synthesis uses supported pitch/rate controls. No unlicensed reaction recording is bundled. A textual “hehe” in playful examples is ordinary synthesis input, not a claim of a natural laughter sound. Serious replies avoid it.

The voice-audition screen has 12 samples and exports human notes. Listening is still required. The separate 100-turn evaluation corpus in `tests/evaluation-scenarios.js` supplies expectations without making paid calls. Use it to review filler repetition, language adaptation, factual uncertainty, memory correctness and character stability before live release.
