import { createApp } from '../server/index.js';
import { configFromEnv } from '../server/config.js';
import { Store } from '../server/store.js';
import { encodeWav } from '../public/audio-core.js';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { Providers } from '../server/providers.js';
const c = configFromEnv({ ...process.env, OFFLINE_ONLY:'true', CHAT_PROVIDER:'demo', STT_PROVIDER:'faster-whisper', TTS_PROVIDER:'disabled', EMBEDDING_PROVIDER:'local', WHISPER_MODEL_PATH:process.env.WHISPER_MODEL_PATH || resolve('speech/models/tiny'), PROVIDER_TIMEOUT_MS:'60000' });
const providers = new Providers(c);
const app = createApp(c, { store:new Store(':memory:'), providers });
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const results=[];
try {
  const base=`http://127.0.0.1:${app.server.address().port}`;
  const {token}=await(await fetch(base+'/api/bootstrap')).json();
  for(const [name,body] of [['silence',Buffer.from(encodeWav(new Float32Array(32000),16000))],...(existsSync('artifacts/speech/english.wav') && readFileSync('artifacts/speech/english.wav').length > 1000 ? [['synthetic English',readFileSync('artifacts/speech/english.wav')]]:[])]) {
    const start=performance.now();const response=await fetch(base+'/api/transcribe',{method:'POST',headers:{'X-Hiraya-Token':token,'Content-Type':'audio/wav'},body});const result=await response.json();
    assert.equal(response.status,200,JSON.stringify(result));if(name==='silence')assert.equal(result.text,'');
    results.push({sample:name,text:result.text,elapsedMs:Math.round(performance.now()-start)});
  }
  const cancellation = new AbortController();
  const cancelled = providers.localSTT.transcribe(Buffer.from(encodeWav(new Float32Array(32000),16000)),cancellation.signal);
  cancellation.abort();await assert.rejects(cancelled,e=>e.name==='AbortError');assert.equal(providers.localSTT.child,null);
  assert.equal(await providers.localSTT.transcribe(Buffer.from(encodeWav(new Float32Array(32000),16000))), '');
  mkdirSync('artifacts/speech',{recursive:true});writeFileSync('artifacts/speech/live-stt.json',JSON.stringify({engine:'faster-whisper 1.2.1',model:'Systran/faster-whisper-tiny',device:'cpu/int8',network:'worker socket connections denied; HF offline; loopback HTTP',results,cancelAndRestartPassed:true,humanSpeechReviewed:false},null,2));
  console.log(JSON.stringify(results));
} finally {await app.close();}
