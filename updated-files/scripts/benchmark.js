import { createApp } from '../server/index.js';
import { Store } from '../server/store.js';
import { configFromEnv } from '../server/config.js';
import { mkdirSync, writeFileSync } from 'node:fs';
const app = createApp(configFromEnv({ CHAT_PROVIDER: 'demo' }), { store: new Store(':memory:') });
await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
try {
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const { token } = await (await fetch(base + '/api/bootstrap')).json();
  const headers = { 'Content-Type': 'application/json', 'X-Hiraya-Token': token };
  const session = await (await fetch(base + '/api/sessions', { method: 'POST', headers })).json();
  const values = [];
  for (let i = 0; i < 30; i++) {
    const start = performance.now(); const response = await fetch(base + '/api/chat', { method: 'POST', headers, body: JSON.stringify({ sessionId: session.id, text: 'Tell me a joke' }) });
    if (!response.ok) throw new Error('Benchmark request failed'); await response.json(); values.push(performance.now() - start);
  }
  const sorted = [...values].sort((a, b) => a - b);
  const report = { measuredAt: new Date().toISOString(), os: process.platform, node: process.version, mode: 'deterministic demo, loopback HTTP, in-memory SQLite; no model or audio latency', samples: 30, medianMs: +sorted[15].toFixed(2), p95Ms: +sorted[28].toFixed(2), maxMs: +sorted[29].toFixed(2) };
  mkdirSync('artifacts', { recursive: true }); writeFileSync('artifacts/benchmark.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
} finally { await app.close(); }
