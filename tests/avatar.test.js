import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AvatarAssets, containedPath } from '../server/avatar-assets.js';
import { applyMaoLipSync, maoExpressions, fitModel, MaoAvatar } from '../public/mao-avatar.js';
import { createApp } from '../server/index.js';
import { configFromEnv } from '../server/config.js';
import { Store } from '../server/store.js';

test('Mao manifest resolves every declared runtime file without exposing editor sources', () => {
  const assets = new AvatarAssets(); const status = assets.status();
  assert.equal(status.modelReady, true); assert.equal(status.provider, 'live2d'); assert.deepEqual(status.lipSyncIds, ['ParamA']);
  assert.ok(assets.paths.size >= 20);
  for (const url of assets.paths.keys()) assert.ok(readFileSync(assets.asset(url).path).length > 0, url);
  assert.equal(assets.asset('/models/mao/../mao_pro_t06.cmo3'), null);
  assert.equal(assets.asset('/models/mao/mao_pro_t06.can3'), null);
  assert.equal(assets.asset('/vendor/live2d/../../server/config.js'), null);
  assert.match(readFileSync(assets.asset('/models/mao-license.txt').path, 'utf8'), /Illustration: Live2D Inc/);
});
test('asset containment rejects traversal, absolute paths and Windows separators', () => {
  for (const name of ['../.env', '/etc/passwd', 'C:\\Windows\\win.ini', 'motions/../../.env', 'motions\\file.json']) assert.throws(() => containedPath(process.cwd(), name));
});
test('Mao lip sync uses ParamA, clamps amplitude and closes on interruption', () => {
  const values = {}; const core = { setParameterValueById(id, value) { values[id] = value; } };
  applyMaoLipSync(core, ['ParamA'], { speaking: true, mouth: .6 }); assert.equal(values.ParamA, .6);
  applyMaoLipSync(core, ['ParamA'], { speaking: true, mouth: 2 }); assert.equal(values.ParamA, 1);
  applyMaoLipSync(core, ['ParamA'], { speaking: false, mouth: .9 }); assert.equal(values.ParamA, 0);
  applyMaoLipSync(core, ['ParamA'], { speaking: true, mouth: NaN }); assert.equal(values.ParamA, 0);
});
test('emotion mapping uses only supplied expressions; fit contains the complete model', () => {
  const manifest = JSON.parse(readFileSync(new URL('../mao_en/runtime/mao_pro.model3.json', import.meta.url)));
  const expressions = new Set(manifest.FileReferences.Expressions.map(expression => expression.Name));
  Object.values(maoExpressions).forEach(name => assert.ok(expressions.has(name)));
  let scale, position; fitModel({ scale: { set: value => { scale = value; } }, position: { set: (x, y) => { position = [x, y]; } } }, 300, 400, 1000, 2000);
  assert.ok(scale * 1000 <= 300 && scale * 2000 <= 400); assert.ok(position.every(value => value >= 0));
});
test('renderer mounts, drives model updates, deduplicates expressions and releases resources with a mock runtime', async () => {
  const oldDocument = globalThis.document; const events = new Map(); let destroyed = 0, resized = 0, ticks = 0; const values = {}; const expressions = [];
  const internal = { coreModel: { setParameterValueById: (id, value) => { values[id] = value; } }, on(name, fn) { events.set(name, fn); }, off(name) { events.delete(name); } };
  const model = { width: 1000, height: 2000, scale: { set() {} }, position: { set() {} }, internalModel: internal, update() { ticks++; events.get('beforeModelUpdate')?.(); }, expression(name) { expressions.push(name); }, destroy() { destroyed++; } };
  const app = { stage: { addChild() {} }, ticker: { deltaMS: 16, add(fn) { this.fn = fn; } }, renderer: { resize() { resized++; } }, start() {}, stop() {}, destroy() { destroyed++; } };
  globalThis.document = { createElement: () => ({ setAttribute() {} }), addEventListener() {}, removeEventListener() {}, hidden: false };
  try {
    const renderer = new MaoAvatar({ clientWidth: 245, clientHeight: 270, replaceChildren() {}, classList: { add() {} } }, { runtime: async () => ({ Application: function() { return app; }, live2d: { Live2DModel: { from: async () => model } } }), observer: () => ({ observe() {}, disconnect() {} }) });
    await renderer.mount({ modelUrl: '/models/mao/mao_pro.model3.json', lipSyncIds: ['ParamA'] });
    renderer.update({ emotion: 'playful', mouth: .7, speaking: true }); renderer.update({ mouth: .5 }); app.ticker.fn();
    assert.equal(values.ParamA, .5); assert.equal(ticks, 1); assert.equal(resized, 1); assert.deepEqual(expressions, ['exp_01', 'exp_02']);
    renderer.update({ speaking: false }); assert.equal(values.ParamA, 0); renderer.destroy(); assert.equal(destroyed, 1); assert.equal(events.size, 0);
  } finally { globalThis.document = oldDocument; }
});
test('model HTTP routes serve manifest, moc3 and textures but not authoring files', async t => {
  const app = createApp(configFromEnv({}), { store: new Store(':memory:') });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve)); t.after(() => app.close());
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const status = await (await fetch(base + '/api/avatar')).json(); assert.equal(status.modelReady, true); assert.equal(status.provider, 'live2d');
  assert.equal((await fetch(base + status.modelUrl)).status, 200);
  const binary = await fetch(base + '/models/mao/mao_pro.moc3'); assert.equal(binary.headers.get('content-type'), 'application/octet-stream'); assert.ok((await binary.arrayBuffer()).byteLength > 1000);
  const texture = await fetch(base + '/models/mao/mao_pro.4096/texture_00.png', { method: 'HEAD' }); assert.equal(texture.status, 200); assert.equal(texture.headers.get('content-type'), 'image/png');
  for (const path of ['/mao_en/mao_pro_t06.cmo3', '/models/mao/mao_pro_t06.cmo3', '/models/mao/.env']) assert.equal((await fetch(base + path)).status, 404);
  const page = await fetch(base); const policy = page.headers.get('content-security-policy'); assert.match(policy, /wasm-unsafe-eval/); assert.ok(!policy.includes("'unsafe-eval'"));
});
