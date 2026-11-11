import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.js';
import { configFromEnv } from '../server/config.js';
import { Store } from '../server/store.js';
import { encodeWav } from '../public/audio-core.js';
import { request as httpRequest } from 'node:http';

async function fixture(t, providers) {
  const app = createApp(configFromEnv({}), { store: new Store(':memory:'), ...(providers ? { providers } : {}) });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve)); t.after(() => app.close());
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const bootstrap = await (await fetch(base + '/api/bootstrap')).json();
  const call = async (path, method = 'GET', body, extra = {}) => {
    const response = await fetch(base + path, { method, headers: { 'X-Hiraya-Token': bootstrap.token, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...extra.headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), ...extra });
    return { status: response.status, data: response.headers.get('content-type')?.includes('json') && !response.headers.get('content-type').includes('ndjson') ? await response.json() : await response.text(), response };
  };
  return { app, base, bootstrap, call };
}
test('HTTP bootstrap exposes capabilities, never API credentials or paths', async t => {
  const { call, bootstrap } = await fixture(t); assert.equal(bootstrap.config.chatProvider, 'demo'); assert.equal(bootstrap.config.openaiKey, undefined); assert.equal(bootstrap.config.dataDir, undefined); assert.equal((await call('/api/health')).status, 200); const page = await call('/'); assert.equal(page.status, 200); assert.match(page.data, /Memory notebook/); assert.match(page.response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});
test('all shipped browser assets resolve and secrets are not served', async t => {
  const { call } = await fixture(t);
  for (const path of ['/app.js', '/audio.js', '/audio-core.js', '/mic-worklet.js', '/avatar.js', '/audition.js', '/styles.css', '/avatar.html', '/favicon.svg']) assert.equal((await call(path)).status, 200, path);
  for (const path of ['/.env', '/server/config.js', '/data/hiraya.sqlite', '/package.json']) assert.equal((await call(path)).status, 404, path);
});
test('cross-origin writes, missing tokens and rebinding hosts are rejected', async t => {
  const { base, bootstrap } = await fixture(t);
  assert.equal((await fetch(base + '/api/sessions', { method: 'POST' })).status, 403);
  assert.equal((await fetch(base + '/api/sessions', { method: 'POST', headers: { Origin: 'https://evil.example', 'X-Hiraya-Token': bootstrap.token } })).status, 403);
  const status = await new Promise((resolve, reject) => { const req = httpRequest(base + '/api/bootstrap', { headers: { Host: 'evil.example' } }, res => { res.resume(); resolve(res.statusCode); }); req.on('error', reject); req.end(); });
  assert.equal(status, 403);
});
test('conversation CRUD, streaming response, notes and export work end-to-end', async t => {
  const { call } = await fixture(t); const session = (await call('/api/sessions', 'POST')).data;
  const reply = await call('/api/chat/stream', 'POST', { sessionId: session.id, text: 'Remember I like tea' });
  assert.equal(reply.status, 200); const events = reply.data.trim().split('\n').map(JSON.parse); assert.ok(events.some(e => e.type === 'text')); assert.equal(events.at(-1).type, 'done'); assert.equal(events.at(-1).result.memorySuggestion, 'I like tea');
  assert.equal(events.at(-1).result.delivery.display_text, events.at(-1).result.text); assert.equal(typeof events.at(-1).result.delivery.spoken_text, 'string'); assert.ok(events.at(-1).result.delivery.intensity <= 1);
  const saved = await call('/api/memories', 'POST', { content: 'I like tea', kind: 'preference', sourceId: events.at(-1).result.user.id }); assert.equal(saved.status, 201);
  assert.equal((await call('/api/memories', 'POST', { content: 'I like coffee' })).status, 409);
  await call(`/api/memories/${saved.data.id}`, 'PATCH', { content: 'I like coffee' });
  await call(`/api/sessions/${session.id}`, 'PATCH', { title: 'Tea time' }); assert.equal((await call('/api/sessions')).data[0].title, 'Tea time');
  const exported = (await call('/api/export')).data; assert.equal(exported.sessions[0].messages.length, 2); assert.equal(exported.memories[0].content, 'I like coffee');
  await call(`/api/memories/${saved.data.id}`, 'DELETE'); assert.equal((await call('/api/memories')).data.length, 0);
  await call(`/api/sessions/${session.id}`, 'DELETE'); assert.equal((await call('/api/sessions')).data.length, 0);
});
test('invalid input and unconfirmed destructive operations fail safely', async t => {
  const { call } = await fixture(t);
  assert.equal((await call('/api/chat', 'POST', { text: 'x'.repeat(4001), sessionId: 'fake' })).status, 400);
  assert.equal((await call('/api/settings', 'PATCH', { volume: 2 })).status, 400);
  assert.equal((await call('/api/settings', 'PATCH', { apiKey: 'not allowed' })).status, 400);
  assert.equal((await call('/api/data', 'DELETE', { confirm: 'yes' })).status, 400);
  assert.equal((await call('/api/data', 'DELETE', { confirm: 'DELETE' })).status, 200);
});
test('disabled memory is not included in model context or proposed for saving', async t => {
  let received; const providers = { chat: async (...args) => { received = args; return { text: 'Hi', emotion: 'warm', memorySuggestion: 'I like tea' }; } };
  const { call } = await fixture(t, providers); const session = (await call('/api/sessions', 'POST')).data;
  await call('/api/memories', 'POST', { content: 'I like tea' }); await call('/api/settings', 'PATCH', { memoryEnabled: false, language: 'fil' });
  const result = await call('/api/chat', 'POST', { text: 'hello', sessionId: session.id }); assert.deepEqual(received[2], []); assert.equal(received[3], 'fil'); assert.equal(result.data.memorySuggestion, null);
});
test('a newer turn cancels the previous generation and only commits the new turn', async t => {
  let entered; const started = new Promise(resolve => { entered = resolve; }); let aborted = false;
  const providers = { chat: async (text, _history, _memories, _language, signal) => {
    if (text === 'slow') { entered(); await new Promise((resolve, reject) => { signal.addEventListener('abort', () => { aborted = true; reject(signal.reason); }, { once: true }); }); }
    return { text: 'New reply', emotion: 'warm', memorySuggestion: null };
  } };
  const { call, app } = await fixture(t, providers); const session = (await call('/api/sessions', 'POST')).data;
  const old = call('/api/chat', 'POST', { text: 'slow', sessionId: session.id }); await started;
  const fresh = await call('/api/chat', 'POST', { text: 'new', sessionId: session.id }); assert.equal(fresh.status, 200); assert.equal((await old).status, 409); assert.equal(aborted, true); assert.equal(app.store.messages(session.id).length, 2); assert.equal(app.store.messages(session.id)[0].content, 'new');
});
test('closing client response cancels provider work', async t => {
  let entered, cancelled; const started = new Promise(r => { entered = r; }); const cancellation = new Promise(r => { cancelled = r; });
  const providers = { chat: async (_t, _h, _m, _l, signal) => { entered(); return new Promise((resolve, reject) => signal.addEventListener('abort', () => { cancelled(); reject(signal.reason); }, { once: true })); } };
  const { call, base, bootstrap, app } = await fixture(t, providers); const session = (await call('/api/sessions', 'POST')).data;
  const controller = new AbortController(); const pending = fetch(base + '/api/chat', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', 'X-Hiraya-Token': bootstrap.token }, body: JSON.stringify({ sessionId: session.id, text: 'waiting' }) }).catch(() => {});
  await started; controller.abort(); await pending; await cancellation; assert.equal(app.store.messages(session.id).length, 0);
});
test('document ingest retrieves citations and rejects unsupported formats', async t => {
  const { call } = await fixture(t); assert.equal((await call('/api/documents', 'POST', { name: 'bad.pdf', content: 'text' })).status, 400);
  const doc = await call('/api/documents', 'POST', { name: 'studio.md', content: 'The studio mascot is a paper star made from folded paper.' }); assert.equal(doc.status, 201);
  const session = (await call('/api/sessions', 'POST')).data; const chat = await call('/api/chat', 'POST', { sessionId: session.id, text: 'What is the studio mascot paper star?' }); assert.equal(chat.data.references[0].name, 'studio.md');
  await call(`/api/documents/${doc.data.id}`, 'DELETE'); assert.equal((await call('/api/documents')).data.length, 0);
});
test('audio endpoints validate uploads and return provider audio with no caching', async t => {
  const providers = { transcribe: async () => 'Hello there', speech: async () => Buffer.from([1, 2, 3]) };
  const { base, bootstrap, call } = await fixture(t, providers);
  const headers = { 'X-Hiraya-Token': bootstrap.token, 'Content-Type': 'audio/wav' };
  assert.equal((await fetch(base + '/api/transcribe', { method: 'POST', headers, body: 'bad' })).status, 400);
  const response = await fetch(base + '/api/transcribe', { method: 'POST', headers, body: encodeWav(new Float32Array(16000), 16000) }); assert.equal((await response.json()).text, 'Hello there');
  const audio = await call('/api/speech', 'POST', { text: 'Hello', emotion: 'warm' }); assert.equal(audio.status, 200); assert.equal(audio.response.headers.get('cache-control'), 'no-store');
});
