import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export class Store {
  constructor(directory, owner = 'local') {
    this.owner = owner;
    if (directory !== ':memory:') mkdirSync(directory, { recursive: true });
    this.db = new DatabaseSync(directory === ':memory:' ? directory : join(directory, 'hiraya.sqlite'));
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, title TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('user','assistant')), content TEXT NOT NULL, emotion TEXT, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS memories(id TEXT PRIMARY KEY, content TEXT NOT NULL, kind TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS messages_session ON messages(session_id);
      CREATE TABLE IF NOT EXISTS memory_metadata(id TEXT PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE, owner TEXT NOT NULL, source_id TEXT, updated_at TEXT, confidence REAL DEFAULT 1, confirmed INTEGER DEFAULT 1, supersedes TEXT, expires_at TEXT);
      CREATE TABLE IF NOT EXISTS summaries(session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE, content TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY, owner TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS chunks(id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE, ordinal INTEGER, content TEXT, vector TEXT, model TEXT);
      CREATE TABLE IF NOT EXISTS usage(day TEXT PRIMARY KEY, requests INTEGER NOT NULL DEFAULT 0, speech_chars INTEGER NOT NULL DEFAULT 0, tokens INTEGER NOT NULL DEFAULT 0, audio_seconds REAL NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS metrics(id TEXT PRIMARY KEY, session_id TEXT, kind TEXT, duration_ms REAL, created_at TEXT);
      CREATE TABLE IF NOT EXISTS delivery(message_id TEXT PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE, spoken_chars INTEGER, status TEXT, precision TEXT);
      CREATE TABLE IF NOT EXISTS summary_exclusions(message_id TEXT PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE);
      PRAGMA user_version=2;`);
    for (const table of ['sessions', 'memories']) if (!this.db.prepare(`PRAGMA table_info(${table})`).all().some(column => column.name === 'owner')) this.db.exec(`ALTER TABLE ${table} ADD COLUMN owner TEXT NOT NULL DEFAULT 'local'`);
  }
  sessions() { return this.db.prepare('SELECT s.*, (SELECT substr(content,1,140) FROM messages WHERE session_id=s.id ORDER BY rowid DESC LIMIT 1) AS preview FROM sessions s WHERE owner=? ORDER BY rowid DESC').all(this.owner); }
  session(id) { return this.db.prepare('SELECT * FROM sessions WHERE id=? AND owner=?').get(id, this.owner); }
  createSession() {
    const item = { id: randomUUID(), title: 'A little catch-up', created_at: new Date().toISOString() };
    this.db.prepare('INSERT INTO sessions(id,title,created_at,owner) VALUES(?,?,?,?)').run(item.id, item.title, item.created_at, this.owner);
    return item;
  }
  messages(id) { return this.session(id) ? this.db.prepare('SELECT m.*, d.spoken_chars, d.status AS delivery_status FROM messages m LEFT JOIN delivery d ON d.message_id=m.id WHERE session_id=? ORDER BY m.rowid').all(id) : []; }
  history(id) { const excluded = new Set(this.db.prepare('SELECT message_id FROM summary_exclusions').all().map(r => r.message_id)); return this.messages(id).filter(m => !excluded.has(m.id)).slice(-24).map(m => ({ role: m.role, content: m.content + (m.delivery_status === 'interrupted' ? '\n[Audio was interrupted; only a prefix may have been heard. The full text was displayed.]' : '') })); }
  renameSession(id, title) { return this.db.prepare('UPDATE sessions SET title=? WHERE id=? AND owner=?').run(title, id, this.owner).changes; }
  commitTurn(id, text, reply) {
    if (!this.session(id)) throw new Error('Conversation not found');
    const user = { id: randomUUID(), session_id: id, role: 'user', content: text, emotion: null, created_at: new Date().toISOString() };
    const assistant = { id: randomUUID(), session_id: id, role: 'assistant', content: reply.text, emotion: reply.emotion, created_at: new Date().toISOString() };
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const insert = this.db.prepare('INSERT INTO messages VALUES(?,?,?,?,?,?)');
      for (const m of [user, assistant]) insert.run(m.id, m.session_id, m.role, m.content, m.emotion, m.created_at);
      if (this.messages(id).length === 2) this.db.prepare('UPDATE sessions SET title=? WHERE id=?').run(text.slice(0, 55), id);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return { user, assistant };
  }
  deleteSession(id) {
    if (!this.session(id)) return 0;
    this.db.exec('BEGIN');
    try {
      this.db.prepare('DELETE FROM memories WHERE owner=? AND id IN (SELECT id FROM memory_metadata WHERE source_id IN (SELECT id FROM messages WHERE session_id=?))').run(this.owner, id);
      const changed = this.db.prepare('DELETE FROM sessions WHERE id=? AND owner=?').run(id, this.owner).changes;
      this.db.exec('COMMIT'); return changed;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  memories() { return this.db.prepare('SELECT m.*, meta.source_id, meta.updated_at, meta.confidence, meta.confirmed, meta.supersedes, meta.expires_at FROM memories m LEFT JOIN memory_metadata meta ON m.id=meta.id WHERE m.owner=? ORDER BY m.rowid DESC').all(this.owner); }
  relevantMemories(text) {
    const words = new Set(text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []);
    const recallAll = /what.*remember|ano.*(?:alala|tanda)|memories/i.test(text);
    return this.memories().filter(m => m.confirmed && (!m.expires_at || Date.parse(m.expires_at) > Date.now())).map((m, index) => ({ ...m, score: [...words].filter(w => m.content.toLowerCase().includes(w)).length * 10 - index / 1000 })).filter(m => recallAll || m.score >= 1)
      .sort((a, b) => b.score - a.score).slice(0, 12).map(({ score, ...m }) => m);
  }
  addMemory(content, kind, sourceId = null, supersedes = null) {
    const old = this.db.prepare('SELECT * FROM memories WHERE lower(content)=lower(?) AND owner=?').get(content, this.owner);
    if (old) return old;
    const m = { id: randomUUID(), content, kind, created_at: new Date().toISOString() };
    this.db.prepare('INSERT INTO memories(id,content,kind,created_at,owner) VALUES(?,?,?,?,?)').run(m.id, m.content, m.kind, m.created_at, this.owner);
    this.db.prepare('INSERT INTO memory_metadata(id,owner,source_id,updated_at,supersedes) VALUES(?,?,?,?,?)').run(m.id, this.owner, sourceId, m.created_at, supersedes);
    return m;
  }
  editMemory(id, content) {
    const previous = this.memories().find(m => m.id === id);
    if (previous) this.excludeFromSummary(previous);
    const changed = this.db.prepare('UPDATE memories SET content=? WHERE id=? AND owner=?').run(content, id, this.owner).changes;
    if (changed) { this.db.prepare('UPDATE memory_metadata SET updated_at=? WHERE id=?').run(new Date().toISOString(), id); this.db.exec('DELETE FROM summaries'); }
    return changed;
  }
  deleteMemory(id) { const previous = this.memories().find(m => m.id === id); if (previous) this.excludeFromSummary(previous); const changed = this.db.prepare('DELETE FROM memories WHERE id=? AND owner=?').run(id, this.owner).changes; if (changed) this.db.exec('DELETE FROM summaries'); return changed; }
  excludeFromSummary(memory) {
    for (const session of this.sessions()) for (const message of this.messages(session.id)) {
      if (message.id === memory.source_id || message.content.toLowerCase().includes(memory.content.toLowerCase())) this.db.prepare('INSERT OR IGNORE INTO summary_exclusions VALUES(?)').run(message.id);
    }
  }
  settings() { return { speechVoice:'zyrah-warm-v1', sttLanguage: 'fil', language: 'auto', autoSpeak: false, voice: '', avatar: true, memoryEnabled: true, speed: 1, volume: .85, silenceMs: 850, vadThreshold: .016, ...(JSON.parse(this.db.prepare('SELECT json FROM settings WHERE id=1').get()?.json || '{}')) }; }
  saveSettings(settings) { this.db.prepare('INSERT INTO settings VALUES(1,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json').run(JSON.stringify(settings)); return this.settings(); }
  export() { return { version: 2, exportedAt: new Date().toISOString(), settings: this.settings(), memories: this.memories(), sessions: this.sessions().map(s => ({ ...s, messages: this.messages(s.id) })), documents: this.documents().map(d => ({ ...d, chunks: this.documentChunks(d.id) })), usage: this.usage() }; }
  clear() { this.db.exec('BEGIN; DELETE FROM messages; DELETE FROM sessions; DELETE FROM memories; DELETE FROM documents; DELETE FROM summaries; DELETE FROM settings; DELETE FROM metrics; COMMIT; PRAGMA wal_checkpoint(TRUNCATE);'); }
  usage() { return this.db.prepare('SELECT * FROM usage WHERE day=?').get(new Date().toISOString().slice(0, 10)) || { requests: 0, speech_chars: 0, tokens: 0, audio_seconds: 0 }; }
  reserveUsage(config, speechChars = 0) {
    const day = new Date().toISOString().slice(0, 10); const current = this.usage();
    const reservation = 1 + (config.retries || 0);
    if (current.requests + reservation > config.dailyRequests || current.speech_chars + speechChars * reservation > config.dailySpeechChars) throw Object.assign(new Error('Daily application usage ceiling reached. Adjust .env or wait until the next UTC day.'), { status: 429 });
    this.db.prepare('INSERT INTO usage(day,requests,speech_chars) VALUES(?,?,?) ON CONFLICT(day) DO UPDATE SET requests=requests+excluded.requests,speech_chars=speech_chars+excluded.speech_chars').run(day, reservation, speechChars * reservation);
  }
  recordUsage(tokens = 0, seconds = 0) { this.db.prepare('INSERT INTO usage(day,tokens,audio_seconds) VALUES(?,?,?) ON CONFLICT(day) DO UPDATE SET tokens=tokens+excluded.tokens,audio_seconds=audio_seconds+excluded.audio_seconds').run(new Date().toISOString().slice(0, 10), Math.max(0, Number(tokens) || 0), Math.max(0, seconds)); }
  metric(session, kind, duration) { this.db.prepare('INSERT INTO metrics VALUES(?,?,?,?,?)').run(randomUUID(), session, kind, duration, new Date().toISOString()); }
  delivery(id, count, status) {
    const message = this.db.prepare('SELECT * FROM messages WHERE id=?').get(id);
    if (!message || !this.session(message.session_id) || message.role !== 'assistant') return false;
    this.db.prepare('INSERT INTO delivery VALUES(?,?,?,?) ON CONFLICT(message_id) DO UPDATE SET spoken_chars=excluded.spoken_chars,status=excluded.status,precision=excluded.precision').run(id, Math.min(message.content.length, count), status, 'completed-sentence-boundary'); return true;
  }
  summary(id) { if (!this.session(id)) return ''; return this.db.prepare('SELECT content FROM summaries WHERE session_id=?').get(id)?.content || ''; }
  summarize(id) {
    const old = this.messages(id).slice(0, -24); if (!old.length) return;
    // Extractive, explicitly attributed excerpts. Never model-authored user facts.
    const excluded = new Set(this.db.prepare('SELECT message_id FROM summary_exclusions').all().map(r => r.message_id));
    const content = old.filter(m => m.role === 'user' && !excluded.has(m.id)).slice(-8).map(m => `Earlier user message (${m.id}): ${m.content.slice(0, 160)}`).join('\n');
    this.db.prepare('INSERT INTO summaries VALUES(?,?) ON CONFLICT(session_id) DO UPDATE SET content=excluded.content').run(id, content);
  }
  documents() { return this.db.prepare('SELECT * FROM documents WHERE owner=? ORDER BY rowid DESC').all(this.owner); }
  documentChunks(id) { return this.documents().some(d => d.id === id) ? this.db.prepare('SELECT * FROM chunks WHERE document_id=? ORDER BY ordinal').all(id) : []; }
  addDocument(name, parts, vectors, model) {
    const id = randomUUID(); this.db.exec('BEGIN');
    try { this.db.prepare('INSERT INTO documents VALUES(?,?,?,?)').run(id, this.owner, name, new Date().toISOString()); parts.forEach((part, index) => this.db.prepare('INSERT INTO chunks VALUES(?,?,?,?,?,?)').run(randomUUID(), id, index + 1, part, JSON.stringify(vectors[index]), model)); this.db.exec('COMMIT'); }
    catch (e) { this.db.exec('ROLLBACK'); throw e; }
    return id;
  }
  deleteDocument(id) { return this.db.prepare('DELETE FROM documents WHERE id=? AND owner=?').run(id, this.owner).changes; }
  close() { this.db.close(); }
}
