import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { configFromEnv } from './config.js';
import { Store } from './store.js';
import { Providers } from './providers.js';
import { emotions } from './personality.js';
import { EmbeddingProvider, chunkText } from './knowledge.js';
import { memoryConflict } from './memory.js';
import { deliveryPlan } from './delivery.js';
import { spokenText } from '../public/audio-core.js';
import { AvatarAssets } from './avatar-assets.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const error = (message, status = 400) => Object.assign(new Error(message), { status });
const textField = (value, max, label) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw error(`${label} must be 1–${max} characters.`);
  return value.trim();
};
async function readBody(req, limit = 20000) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw error('Request is too large.', 413); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
async function readJson(req, limit = 20000) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw error('Expected application/json.', 415);
  try { const value = JSON.parse((await readBody(req, limit)).toString()); if (!value || typeof value !== 'object' || Array.isArray(value)) throw error('Expected a JSON object.'); return value; }
  catch (e) { if (e.status) throw e; throw error('Invalid JSON.'); }
}
function json(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); }
const staticFiles = new Set(['index.html', 'styles.css', 'app.js', 'audio.js', 'audio-core.js', 'avatar.js', 'mao-avatar.js', 'mic-worklet.js', 'avatar.html', 'avatar-page.js', 'favicon.svg', 'audition.js', 'vtube.js']);

export function createApp(config, { store = new Store(config.dataDir), providers = new Providers(config) } = {}) {
  const token = randomBytes(32).toString('hex');
  const active = new Map();
  const embeddings = new EmbeddingProvider(config, providers, store);
  const avatarAssets = new AvatarAssets({ provider: config.avatarProvider });
  let rateCount = 0; let rateStart = Date.now();
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' ws://127.0.0.1:8001; worker-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    res.setHeader('Permissions-Policy', 'microphone=(self), camera=()');
    const abort = new AbortController();
    res.on('close', () => { if (!res.writableEnded) abort.abort(); });
    try {
      // Loopback-only, DNS-rebinding and cross-origin request protection.
      const expectedPort = server.address()?.port;
      if (![`127.0.0.1:${expectedPort}`, `localhost:${expectedPort}`, `[::1]:${expectedPort}`].includes(req.headers.host)) throw error('Untrusted host.', 403);
      if (req.headers.origin && ![`http://127.0.0.1:${expectedPort}`, `http://localhost:${expectedPort}`, `http://[::1]:${expectedPort}`].includes(req.headers.origin)) throw error('Cross-origin requests are not allowed.', 403);
      if (req.headers['sec-fetch-site'] === 'cross-site') throw error('Cross-site requests are not allowed.', 403);
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path === '/api/avatar' && req.method === 'GET') { json(res, 200, avatarAssets.status()); return; }
      if (!path.startsWith('/api/')) {
        if (req.method !== 'GET' && req.method !== 'HEAD') throw error('Method not allowed.', 405);
        const asset = avatarAssets.asset(path);
        if (asset) { const data = await readFile(asset.path); res.writeHead(200, { 'Content-Type': asset.type, 'Cache-Control': 'no-cache' }); res.end(req.method === 'HEAD' ? undefined : data); return; }
        const file = path === '/' ? 'index.html' : path.slice(1);
        if (!staticFiles.has(file)) throw error('Not found.', 404);
        const data = await readFile(join(root, file));
        res.writeHead(200, { 'Content-Type': ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' })[extname(file)], 'Cache-Control': 'no-cache' });
        res.end(req.method === 'HEAD' ? undefined : data); return;
      }
      if (req.method === 'GET' && path === '/api/bootstrap') {
        json(res, 200, { token, config: { appName: config.appName, characterName: config.characterName, chatProvider: config.chatProvider, chatModel: config.chatProvider === 'ollama' ? config.ollamaModel : config.chatModel, ttsProvider: config.ttsProvider, cloudStt: Boolean(config.openaiKey) }, settings: store.settings(), sessions: store.sessions(), memories: store.memories() }); return;
      }
      const supplied = Buffer.from(req.headers['x-hiraya-token'] || '');
      if (supplied.length !== token.length || !timingSafeEqual(supplied, Buffer.from(token))) throw error('Session expired. Reload this page.', 403);
      if (req.method !== 'GET') {
        if (Date.now() - rateStart > 60000) { rateCount = 0; rateStart = Date.now(); }
        if (++rateCount > 100) throw error('Too many requests. Please wait a minute.', 429);
      }
      if (req.method === 'GET' && path === '/api/health') { json(res, 200, { ok: true }); return; }
      if (path === '/api/sessions' && req.method === 'POST') { if (store.sessions().length >= 200) throw error('Conversation limit reached. Delete an old conversation first.'); json(res, 201, store.createSession()); return; }
      if (path === '/api/sessions' && req.method === 'GET') { json(res, 200, store.sessions()); return; }
      const sessionMatch = path.match(/^\/api\/sessions\/([a-f0-9-]+)$/);
      if (sessionMatch) {
        const id = sessionMatch[1];
        if (!store.session(id)) throw error('Conversation not found.', 404);
        if (req.method === 'GET') { json(res, 200, { ...store.session(id), messages: store.messages(id) }); return; }
        if (req.method === 'PATCH') { const body = await readJson(req); store.renameSession(id, textField(body.title, 80, 'Title')); json(res, 200, { ok: true }); return; }
        if (req.method === 'DELETE') { active.get(id)?.abort(); store.deleteSession(id); json(res, 200, { ok: true }); return; }
      }
      if (['/api/chat', '/api/chat/stream'].includes(path) && req.method === 'POST') {
        const body = await readJson(req);
        const text = textField(body.text, 4000, 'Message');
        const id = textField(body.sessionId, 40, 'Conversation ID');
        if (!store.session(id)) throw error('Conversation not found.', 404);
        // A newer turn supersedes a pending generation for this conversation.
        active.get(id)?.abort();
        active.set(id, abort);
        const started = performance.now();
        try {
          const references = await embeddings.retrieve(text, abort.signal);
          const settings = store.settings();
          if (config.chatProvider !== 'demo') store.reserveUsage(config);
          const streaming = path.endsWith('/stream'); let firstTokenMs = null;
          if (streaming) res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
          const onText = streaming ? text => { if (text && !abort.signal.aborted) { if (firstTokenMs === null) firstTokenMs = Math.round(performance.now() - started); res.write(JSON.stringify({ type: 'text', text }) + '\n'); } } : undefined;
          const context = [settings.memoryEnabled ? store.summary(id) : '', ...references.map(r => `[${r.name}, chunk ${r.chunk}]: ${r.content}`)].filter(Boolean).join('\n');
          const reply = await providers.chat(text, store.history(id), settings.memoryEnabled ? store.relevantMemories(text) : [], settings.language, abort.signal, onText, context);
          if (abort.signal.aborted) throw error('Turn interrupted.', 409);
          if (!settings.memoryEnabled) reply.memorySuggestion = null;
          const messages = store.commitTurn(id, text, reply);
          const latencyMs = Math.round(performance.now() - started);
          store.metric(id, 'chat_ms', latencyMs); store.recordUsage(reply.usage?.total_tokens);
          if (settings.memoryEnabled) store.summarize(id);
          if (firstTokenMs !== null) store.metric(id, 'first_text_ms', firstTokenMs);
          const result = { ...reply, ...messages, delivery: deliveryPlan(reply), latencyMs, firstTokenMs, references: references.map(({ content, score, ...r }) => r), usageToday: store.usage() };
          if (streaming) { res.end(JSON.stringify({ type: 'done', result }) + '\n'); } else json(res, 200, result);
        } finally { if (active.get(id) === abort) active.delete(id); }
        return;
      }
      if (path === '/api/memories' && req.method === 'GET') { json(res, 200, store.memories()); return; }
      if (path === '/api/memories' && req.method === 'POST') {
        const body = await readJson(req); const content = textField(body.content, 500, 'Memory');
        const kind = body.kind || 'fact';
        if (!['fact', 'preference', 'experience'].includes(kind)) throw error('Invalid memory kind.');
        if (store.memories().length >= 200) throw error('Memory notebook is full (200 notes). Remove an old note first.');
        const conflicts = memoryConflict(content, store.memories());
        if (conflicts.length && !body.allowConflict) { json(res, 409, { error: 'A similar note may conflict. Edit the existing note, or explicitly keep both.', conflicts }); return; }
        let sourceId = body.sourceId || null;
        if (sourceId && !store.sessions().some(s => store.messages(s.id).some(m => m.id === sourceId))) throw error('Invalid source message.');
        json(res, 201, store.addMemory(content, kind, sourceId)); return;
      }
      const memoryMatch = path.match(/^\/api\/memories\/([a-f0-9-]+)$/);
      if (memoryMatch && req.method === 'PATCH') {
        const { content } = await readJson(req);
        if (!store.editMemory(memoryMatch[1], textField(content, 500, 'Memory'))) throw error('Memory not found.', 404);
        json(res, 200, { ok: true }); return;
      }
      if (memoryMatch && req.method === 'DELETE') { if (!store.deleteMemory(memoryMatch[1])) throw error('Memory not found.', 404); json(res, 200, { ok: true }); return; }
      if (path === '/api/settings' && req.method === 'PATCH') {
        const body = await readJson(req); const settings = store.settings();
        for (const [key, value] of Object.entries(body)) {
          if (!(key in settings)) throw error('Unknown setting.');
          if (key === 'language' && !['auto', 'en', 'fil', 'taglish'].includes(value)) throw error('Invalid language.');
          if (['autoSpeak', 'avatar', 'memoryEnabled'].includes(key) && typeof value !== 'boolean') throw error('Invalid setting type.');
          const ranges = { speed: [.7, 1.3], volume: [0, 1], silenceMs: [400, 2000], vadThreshold: [.005, .1] };
          if (key in ranges && (!Number.isFinite(value) || value < ranges[key][0] || value > ranges[key][1])) throw error('Setting is outside its supported range.');
          if (key === 'voice' && (typeof value !== 'string' || value.length > 300)) throw error('Invalid voice.');
          settings[key] = value;
        }
        json(res, 200, store.saveSettings(settings)); return;
      }
      if (path === '/api/transcribe' && req.method === 'POST') {
        if (!req.headers['content-type']?.startsWith('audio/wav')) throw error('Expected WAV audio.', 415);
        const wav = await readBody(req, 3_000_000);
        if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') throw error('Invalid WAV recording.');
        store.reserveUsage(config); const started = performance.now();
        const transcript = await providers.transcribe(wav, abort.signal);
        const seconds = (wav.length - 44) / Math.max(1, wav.readUInt32LE(28)); store.recordUsage(0, seconds);
        const latencyMs = Math.round(performance.now() - started); store.metric(null, 'stt_ms', latencyMs);
        json(res, 200, { text: transcript, latencyMs }); return;
      }
      if (path === '/api/speech' && req.method === 'POST') {
        const body = await readJson(req); const text = spokenText(textField(body.text, 4000, 'Speech'));
        if (!text) throw error('No speakable text.');
        if (!emotions.includes(body.emotion)) throw error('Invalid emotion.');
        store.reserveUsage(config, text.length); const started = performance.now();
        const audio = await providers.speech(text, body.emotion, abort.signal, store.settings().speed);
        store.metric(null, 'tts_ready_ms', Math.round(performance.now() - started));
        if (abort.signal.aborted) return;
        res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' }); res.end(audio); return;
      }
      if (path === '/api/export' && req.method === 'GET') { json(res, 200, store.export()); return; }
      if (path === '/api/usage' && req.method === 'GET') { json(res, 200, { ...store.usage(), requestLimit: config.dailyRequests, speechCharacterLimit: config.dailySpeechChars, costEstimate: null, costNote: 'No pricing assumptions configured. Application reservations are not provider billing.' }); return; }
      if (path === '/api/metrics' && req.method === 'POST') {
        const body = await readJson(req);
        if (!['speech_to_playback_ms', 'stop_playback_ms'].includes(body.kind) || !Number.isFinite(body.durationMs) || body.durationMs < 0 || body.durationMs > 300000) throw error('Invalid timing measurement.');
        if (body.sessionId && !store.session(body.sessionId)) throw error('Conversation not found.', 404);
        store.metric(body.sessionId || null, body.kind, body.durationMs); json(res, 200, { ok: true }); return;
      }
      if (path === '/api/delivery' && req.method === 'POST') {
        const body = await readJson(req);
        if (!['completed', 'interrupted'].includes(body.status) || !Number.isInteger(body.spokenChars) || body.spokenChars < 0 || typeof body.messageId !== 'string') throw error('Invalid playback acknowledgement.');
        if (!store.delivery(body.messageId, body.spokenChars, body.status)) throw error('Message not found.', 404);
        json(res, 200, { ok: true }); return;
      }
      if (path === '/api/documents' && req.method === 'GET') { json(res, 200, store.documents()); return; }
      if (path === '/api/documents' && req.method === 'POST') {
        const body = await readJson(req, 60000); const name = textField(body.name, 100, 'Document name');
        if (!/\.(txt|md)$/i.test(name)) throw error('Only .txt and .md text documents are supported.');
        if (store.documents().length >= 20) throw error('Document limit reached (20).');
        const content = textField(body.content, 12000, 'Document content');
        if (content.includes('\0')) throw error('Binary documents are not supported.');
        const parts = chunkText(content); const vectors = await embeddings.embed(parts, abort.signal);
        if (abort.signal.aborted) return;
        json(res, 201, { id: store.addDocument(name, parts, vectors, embeddings.model), chunks: parts.length }); return;
      }
      const docMatch = path.match(/^\/api\/documents\/([a-f0-9-]+)$/);
      if (docMatch && req.method === 'DELETE') { if (!store.deleteDocument(docMatch[1])) throw error('Document not found.', 404); json(res, 200, { ok: true }); return; }
      if (path === '/api/data' && req.method === 'DELETE') {
        const body = await readJson(req);
        if (body.confirm !== 'DELETE') throw error('Type DELETE to erase all data.');
        for (const controller of active.values()) controller.abort();
        store.clear(); json(res, 200, { ok: true }); return;
      }
      throw error('Not found.', 404);
    } catch (e) {
      if (res.destroyed) return;
      const status = abort.signal.aborted ? 409 : e.name === 'TimeoutError' ? 504 : e.status || 500;
      if (status === 500) console.error('Request failed:', e.name); // Never log user content or keys.
      const message = status === 500 ? 'Something went wrong on the server.' : status === 504 ? 'The provider timed out. Please try again.' : abort.signal.aborted ? 'Turn interrupted.' : e.message;
      if (res.headersSent) res.end(JSON.stringify({ type: 'error', error: message }) + '\n'); else json(res, status, { error: message });
    }
  });
  server.requestTimeout = 70000;
  server.headersTimeout = 10000;
  return { server, store, close: () => { for (const controller of active.values()) controller.abort(); server.closeAllConnections(); return new Promise(resolve => server.close(() => { store.close(); resolve(); })); } };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const config = configFromEnv(); const app = createApp(config);
    app.server.listen(config.port, config.host, () => console.log(`${config.appName} · http://${config.host}:${app.server.address().port}\nChat: ${config.chatProvider} | Voice: ${config.ttsProvider} | Data stays in ${config.dataDir}`));
    for (const event of ['SIGINT', 'SIGTERM']) process.once(event, async () => { await app.close(); process.exit(0); });
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
