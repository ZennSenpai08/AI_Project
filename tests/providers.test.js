import test from 'node:test';
import assert from 'node:assert/strict';
import { Providers, escapeXml } from '../server/providers.js';
import { configFromEnv } from '../server/config.js';
const config = configFromEnv({ CHAT_PROVIDER: 'openai', OPENAI_API_KEY: 'test-secret', TTS_PROVIDER: 'openai' });
const reply = { text: 'Kumusta!', emotion: 'warm', memorySuggestion: null };
test('chat adapter sends protected persona, language, schema and relevant notes', async () => {
  let sent; const provider = new Providers(config, async (url, options) => { sent = { url, ...options }; return Response.json({ choices: [{ message: { content: JSON.stringify(reply) } }], usage: { total_tokens: 20 } }); });
  const result = await provider.chat('Hi', [], [{ content: 'tea', kind: 'preference' }], 'fil');
  const body = JSON.parse(sent.body); assert.equal(body.model, 'gpt-4.1-mini'); assert.match(body.messages[0].content, /Setting=fil/); assert.match(body.messages[0].content, /PROTECTED CHARACTER/); assert.equal(body.response_format.json_schema.strict, true); assert.equal(result.text, 'Kumusta!'); assert.equal(result.usage.total_tokens, 20);
});
test('streaming adapter emits actual text deltas and validates final JSON', async () => {
  const chunks = ['{"text":"Ku', 'musta!","emotion":"warm","memorySuggestion":null}'];
  const body = chunks.map(content => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`).join('') + 'data: [DONE]\n\n';
  const provider = new Providers(config, async () => new Response(body)); const seen = [];
  const result = await provider.chat('Hi', [], [], 'en', undefined, delta => seen.push(delta)); assert.equal(seen[0], 'Ku'); assert.equal(result.text, 'Kumusta!');
});
test('invalid model JSON is a useful provider error and never silently switches providers', async () => {
  let calls = 0; const provider = new Providers(config, async () => { calls++; return Response.json({ choices: [{ message: { content: 'not-json' } }] }); });
  await assert.rejects(provider.chat('hello', [], [], 'auto'), /incomplete or invalid/); assert.equal(calls, 1);
});
test('rate limits and authentication failures are redacted', async () => {
  for (const [status, message] of [[429, /rate or credit/], [401, /authentication/], [500, /HTTP 500/]]) {
    const provider = new Providers(config, async () => new Response('secret request content', { status })); await assert.rejects(provider.chat('hello', [], [], 'auto'), e => message.test(e.message) && !e.message.includes('secret'));
  }
});
test('timeouts become actionable errors and cancellation propagates', async () => {
  const provider = new Providers({ ...config, timeoutMs: 10 }, async (_url, options) => new Promise((resolve, reject) => { const timer = setTimeout(resolve, 1000); options.signal.addEventListener('abort', () => { clearTimeout(timer); reject(options.signal.reason); }, { once: true }); }));
  await assert.rejects(provider.chat('hello', [], [], 'auto'), /timed out/);
  const controller = new AbortController(); const promise = provider.chat('hello', [], [], 'auto', controller.signal); controller.abort(); await assert.rejects(promise, e => e.name === 'AbortError');
});
test('bounded retry only retries an explicit 503, not arbitrary failures', async () => {
  let calls = 0; const provider = new Providers({ ...config, retries: 1 }, async () => ++calls === 1 ? new Response('', { status: 503 }) : Response.json({ choices: [{ message: { content: JSON.stringify(reply) } }] }));
  assert.equal((await provider.chat('hello', [], [], 'auto')).text, 'Kumusta!'); assert.equal(calls, 2);
});
test('transcription uses multipart WAV, configurable model and no forced single language', async () => {
  let body; const provider = new Providers(config, async (_url, options) => { body = options.body; return Response.json({ text: 'Kumusta, how are you?' }); });
  assert.equal(await provider.transcribe(Buffer.from('test')), 'Kumusta, how are you?'); assert.equal(body.get('model'), 'gpt-transcribe'); assert.equal(body.get('file').type, 'audio/wav'); assert.equal(body.get('language'), null);
});
test('Azure speech escapes XML and uses supported Filipino voice and prosody', async () => {
  let request; const provider = new Providers({ ...config, ttsProvider: 'azure', azureKey: 'azure-test' }, async (url, options) => { request = { url, ...options }; return new Response(new Uint8Array([1, 2, 3])); });
  const audio = await provider.speech('Hello <tag> & friend', 'concerned', undefined, 1);
  assert.deepEqual([...audio], [1, 2, 3]); assert.match(request.body, /fil-PH-BlessicaNeural/); assert.match(request.body, /&lt;tag&gt; &amp;/); assert.doesNotMatch(request.body, /express-as/); assert.equal(escapeXml('"hi"'), '&quot;hi&quot;');
});
test('OpenAI compatibility TTS keeps supported model, voice and instructions separate', async () => {
  let body; const provider = new Providers(config, async (_url, options) => { body = JSON.parse(options.body); return new Response(new Uint8Array([1])); });
  await provider.speech('Hello', 'curious'); assert.equal(body.input, 'Hello'); assert.equal(body.voice, 'coral'); assert.match(body.instructions, /Filipino accent/);
});
