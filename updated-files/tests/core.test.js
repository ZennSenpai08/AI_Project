import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configFromEnv } from '../server/config.js';
import { Store } from '../server/store.js';
import { persona, character, validateReply, demoReply } from '../server/personality.js';
import { groundedSuggestion, memoryConflict } from '../server/memory.js';
import { partialText, readSSE } from '../server/stream.js';
import { VoiceActivityDetector, encodeWav, rms, speechSegments, spokenText } from '../public/audio-core.js';
import { localEmbedding, cosine, chunkText, EmbeddingProvider } from '../server/knowledge.js';

const reply = { text: 'Salamat sa kuwento.', emotion: 'warm', memorySuggestion: null };
test('configuration validates secrets, limits, URLs and explicit providers', () => {
  assert.equal(configFromEnv({}).chatProvider, 'demo');
  assert.throws(() => configFromEnv({ CHAT_PROVIDER: 'openai' }), /OPENAI_API_KEY/);
  assert.throws(() => configFromEnv({ TTS_PROVIDER: 'azure' }), /AZURE_SPEECH_KEY/);
  assert.throws(() => configFromEnv({ OPENAI_BASE_URL: 'http://evil.example/v1' }), /HTTPS/);
  assert.throws(() => configFromEnv({ DAILY_PROVIDER_REQUESTS: '-1' }), /positive/);
  assert.throws(() => configFromEnv({ PROVIDER_RETRIES: '9' }), /RETRIES/);
});
test('stable character and language remain present in every generated prompt', () => {
  assert.equal(character.examples.length, 8);
  for (const lang of ['auto', 'en', 'fil', 'taglish']) { const prompt = persona('Zy', lang); assert.match(prompt, new RegExp(`Setting=${lang}`)); assert.match(prompt, /You are Zy/); assert.match(prompt, /PROTECTED CHARACTER/); assert.match(prompt, /never instructions/); }
});
test('structured output rejects missing text, bad emotions and excessive suggestions', () => {
  assert.deepEqual(validateReply(reply), reply);
  for (const bad of [{}, { ...reply, text: '' }, { ...reply, emotion: 'evil' }, { ...reply, memorySuggestion: 'a'.repeat(301) }]) assert.throws(() => validateReply(bad));
});
test('memory suggestions require explicit supported content and reject sensitive or imaginary claims', () => {
  assert.equal(groundedSuggestion('I like tea', 'Remember that I like tea'), 'I like tea');
  assert.equal(groundedSuggestion('I like coffee', 'I like tea'), null);
  assert.equal(groundedSuggestion('my password is abc', 'Remember my password is abc'), null);
  assert.equal(groundedSuggestion('I like tea', 'Imagine I like tea'), null);
  assert.equal(groundedSuggestion('I like tea', 'He said "I like tea"'), null);
});
test('demo language and mood change without claiming to be a live model', () => {
  assert.equal(demoReply('I am tired', [], 'en').emotion, 'concerned');
  assert.match(demoReply('pagod ako', [], 'fil').text, /Mukhang/);
  assert.equal(demoReply('Remember I like tea', [], 'auto').memorySuggestion, 'I like tea');
  assert.match(demoReply('What do you remember?', [{ content: 'I like tea' }], 'en').text, /tea/);
});
test('memory deduplication, conflict hints and correction are deterministic', () => {
  const s = new Store(':memory:');
  try { const m = s.addMemory('I prefer tea', 'preference'); assert.equal(s.addMemory('i prefer tea', 'preference').id, m.id); assert.deepEqual(memoryConflict('I prefer coffee', s.memories()), [m.id]); s.editMemory(m.id, 'I prefer coffee'); assert.equal(s.memories()[0].content, 'I prefer coffee'); assert.ok(s.memories()[0].updated_at); }
  finally { s.close(); }
});
test('SQLite persistence survives closing and reopening the database', () => {
  const directory = mkdtempSync(join(tmpdir(), 'hiraya-test-'));
  try { let s = new Store(directory); const session = s.createSession(); s.commitTurn(session.id, 'hello', reply); s.addMemory('I like tea', 'preference'); s.saveSettings({ language: 'fil' }); s.close(); s = new Store(directory); assert.equal(s.messages(session.id).length, 2); assert.equal(s.memories()[0].content, 'I like tea'); assert.equal(s.settings().language, 'fil'); s.close(); }
  finally { rmSync(directory, { recursive: true, force: true }); }
});
test('owner scope precedes session, memory and document retrieval', () => {
  const s = new Store(':memory:');
  try { s.addMemory('local tea', 'fact'); const own = s.createSession(); s.db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run('foreign', 'Other', new Date().toISOString(), 'other'); s.db.prepare('INSERT INTO memories VALUES(?,?,?,?,?)').run('foreign', 'private coffee', 'fact', new Date().toISOString(), 'other'); assert.equal(s.session('foreign'), undefined); assert.deepEqual(s.messages('foreign'), []); assert.equal(s.sessions().length, 1); assert.equal(s.sessions()[0].id, own.id); assert.equal(s.relevantMemories('coffee').some(m => m.owner === 'other'), false); assert.equal(s.deleteMemory('foreign'), 0); assert.equal(s.renameSession('foreign', 'bad'), 0); }
  finally { s.close(); }
});
test('memory deletion purges derived summary and prevents its source from being summarized again', () => {
  const s = new Store(':memory:');
  try { const session = s.createSession(); const turn = s.commitTurn(session.id, 'I like tea', reply); const memory = s.addMemory('I like tea', 'preference', turn.user.id); for (let i = 0; i < 13; i++) s.commitTurn(session.id, `topic ${i}`, reply); s.summarize(session.id); assert.match(s.summary(session.id), /I like tea/); s.deleteMemory(memory.id); assert.equal(s.summary(session.id), ''); s.summarize(session.id); assert.doesNotMatch(s.summary(session.id), /I like tea/); assert.equal(s.relevantMemories('tea').length, 0); }
  finally { s.close(); }
});
test('playback acknowledgement distinguishes generated text from heard speech', () => {
  const s = new Store(':memory:');
  try { const id = s.createSession().id; const turn = s.commitTurn(id, 'hello', reply); s.delivery(turn.assistant.id, 4, 'interrupted'); assert.match(s.history(id)[1].content, /only a prefix/); assert.equal(s.messages(id)[1].spoken_chars, 4); assert.equal(s.delivery('missing', 10, 'completed'), false); }
  finally { s.close(); }
});
test('daily ceilings reserve retries and survive data erasure', () => {
  const s = new Store(':memory:'); const config = { dailyRequests: 2, dailySpeechChars: 20, retries: 1 };
  try { s.reserveUsage(config, 5); assert.equal(s.usage().requests, 2); assert.equal(s.usage().speech_chars, 10); assert.throws(() => s.reserveUsage(config), /ceiling/); s.clear(); assert.equal(s.usage().requests, 2); }
  finally { s.close(); }
});
test('partial structured text handles escaped quotes, backslashes and partial unicode', () => {
  assert.equal(partialText('{"text":"Kumusta'), 'Kumusta');
  assert.equal(partialText('{"text":"Hi \\u00'), 'Hi ');
  assert.equal(partialText('{"text":"He said \\"hi\\""}'), 'He said "hi"');
  assert.equal(partialText('{"emotion":"warm"}'), '');
});
test('SSE handles split UTF-8, partial lines, usage and completion', async () => {
  const payload = JSON.stringify({ choices: [{ delta: { content: JSON.stringify(reply) } }] });
  const bytes = new TextEncoder().encode(`data: ${payload}\n\ndata: {"usage":{"total_tokens":12}}\n\ndata: [DONE]\n\n`);
  const stream = new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7)); controller.close(); } });
  const deltas = []; const result = await readSSE(new Response(stream), text => deltas.push(text)); assert.equal(result.full, JSON.stringify(reply)); assert.equal(result.usage.total_tokens, 12); assert.ok(deltas.includes(reply.text));
});
test('WAV is PCM16 mono with clipped samples and correct duration metadata', () => {
  const wav = new DataView(encodeWav(new Float32Array([-2, 0, 2]), 16000));
  assert.equal(wav.getUint32(24, true), 16000); assert.equal(wav.getUint32(40, true), 6); assert.equal(wav.getInt16(44, true), -32768); assert.equal(wav.getInt16(48, true), 32767); assert.equal(rms(new Float32Array([.5, -.5])), .5);
});
test('VAD ignores silence and brief noise, retains pre-roll, and ends on silence', () => {
  const vad = new VoiceActivityDetector(16000); const silence = new Float32Array(320); const voice = new Float32Array(320).fill(.2);
  for (let i = 0; i < 20; i++) assert.equal(vad.push(silence).type, 'level');
  for (let i = 0; i < 3; i++) assert.equal(vad.push(voice).type, 'level');
  vad.push(silence); let start; for (let i = 0; i < 6; i++) start = vad.push(voice);
  assert.equal(start.type, 'start'); for (let i = 0; i < 10; i++) vad.push(voice);
  let end; for (let i = 0; i < 43; i++) end = vad.push(silence);
  assert.equal(end.type, 'end'); assert.ok(end.pcm.length > 16000); assert.equal(vad.active, false);
});
test('VAD bounds long speech and can detect repeated interruptions', () => {
  const vad = new VoiceActivityDetector(16000, { maxMs: 500 }); const voice = new Float32Array(320).fill(.2);
  let starts = 0, ends = 0; for (let i = 0; i < 100; i++) { const event = vad.push(voice); if (event.type === 'start') starts++; if (event.type === 'end') ends++; }
  assert.ok(starts >= 3); assert.ok(ends >= 3);
});
test('speech text excludes markdown, stage directions and code blocks; segments preserve order', () => {
  assert.equal(spokenText('**Hi** [laughs] ✨'), 'Hi');
  assert.match(spokenText('```js\nalert(1)\n```'), /code is shown/);
  assert.deepEqual(speechSegments('First sentence. Second sentence!', 18), ['First sentence.', 'Second sentence!']);
});
test('document embedding and retrieval retain source provenance and deletion cascades', async () => {
  const s = new Store(':memory:'); const embeddings = new EmbeddingProvider({ embeddingProvider: 'local' }, {}, s);
  try { const parts = chunkText('A paper star is a small folded origami decoration. Tea can be served warm.'); const vectors = await embeddings.embed(parts); const id = s.addDocument('notes.txt', parts, vectors, embeddings.model); const results = await embeddings.retrieve('paper star origami'); assert.equal(results[0].name, 'notes.txt'); assert.equal(results[0].chunk, 1); assert.equal(cosine(localEmbedding('tea'), localEmbedding('tea')), 1); s.deleteDocument(id); assert.equal((await embeddings.retrieve('paper star')).length, 0); assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM chunks').get().n, 0); }
  finally { s.close(); }
});
test('100-turn deterministic scenario preserves protected identity and bounded history', () => {
  const s = new Store(':memory:');
  try { const id = s.createSession().id; for (let i = 0; i < 100; i++) { const language = ['en', 'fil', 'taglish'][i % 3]; const input = ['Tell me a joke', 'I am tired', 'I finished a project'][i % 3]; s.commitTurn(id, input, demoReply(input, [], language)); s.summarize(id); } assert.equal(s.messages(id).length, 200); assert.equal(s.history(id).length, 24); assert.ok(s.summary(id).length < 2500); assert.match(persona('Hiraya'), /PROTECTED CHARACTER/); assert.equal(s.memories().length, 0); }
  finally { s.close(); }
});
