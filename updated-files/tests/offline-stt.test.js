import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configFromEnv } from '../server/config.js';
import { Providers } from '../server/providers.js';
import { LocalSTT } from '../server/local-stt.js';
import { rendererRequestAllowed } from '../server/offline.js';
import { SpeechOutput } from '../public/audio.js';
import { contextualPerformance } from '../server/personality.js';

test('distress context suppresses amusement despite a laughing emoji or model cue', () => {
  const reply=contextualPerformance({text:'I can listen.',emotion:'playful',performance:{gesture:'amused'}},'I failed my exam 😂');
  assert.equal(reply.emotion,'concerned');assert.equal(reply.performance.gesture,'concern');
});

const offline = extra => configFromEnv({ OFFLINE_ONLY:'true', STT_PROVIDER:'disabled', TTS_PROVIDER:'disabled', ...extra });
test('strict offline configuration rejects cloud, browser recognition and unaudited loopback proxies', () => {
  for (const change of [{CHAT_PROVIDER:'openai'},{CHAT_PROVIDER:'ollama'},{STT_PROVIDER:'browser'},{STT_PROVIDER:'local'},{TTS_PROVIDER:'local'},{TTS_PROVIDER:'azure'},{EMBEDDING_PROVIDER:'openai',OPENAI_API_KEY:'test'}]) assert.throws(()=>offline(change),/Offline Only/);
  assert.equal(offline({STT_PROVIDER:'faster-whisper',TTS_PROVIDER:'browser'}).offlineOnly,true);
  assert.throws(()=>configFromEnv({OFFLINE_ONLY:'yes'}),/true or false/);
});
test('offline requests are rejected before invoking transport, even with internet available or mutated configuration', async () => {
  let attempted=0; const c=offline();const p=new Providers(c,async()=>{attempted++;throw new Error('internet available but prohibited');});
  for(const url of ['https://api.openai.com/v1/embeddings','http://127.0.0.1:3900/v1/audio/speech'])await assert.rejects(p.request(url,{}),/Offline Only/);
  assert.equal(attempted,0);
  assert.equal(rendererRequestAllowed('https://example.com/asset','http://127.0.0.1:3210',true),false);
  assert.equal(rendererRequestAllowed('ws://127.0.0.1:8001','http://127.0.0.1:3210',true),false);
  assert.equal(rendererRequestAllowed('http://127.0.0.1:3210/app.js','http://127.0.0.1:3210',true),true);
  assert.equal(rendererRequestAllowed('http://127.0.0.1:32100/app.js','http://127.0.0.1:3210',true),false);
});
test('local STT streams in memory, bounds concurrency, releases owned worker on abort and ignores late replies', async t => {
  const folder=mkdtempSync(join(tmpdir(),'zyrah-stt-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
  for(const f of ['model.bin','config.json','tokenizer.json'])writeFileSync(join(folder,f),'fixture');
  const children=[];const worker=new LocalSTT({...offline({STT_PROVIDER:'faster-whisper'}),whisperModelPath:folder},(_exe,_args,options)=>{
    assert.equal(options.windowsHide,true);assert.equal(options.env.HF_HUB_OFFLINE,'1');
    const child=new EventEmitter();child.stdout=new EventEmitter();child.stdin=new EventEmitter();child.stdin.write=line=>{child.request=JSON.parse(line);};child.kill=()=>child.killed=true;children.push(child);return child;
  });t.after(()=>worker.stop());
  const controller=new AbortController();const first=worker.transcribe(Buffer.from('private wav'),controller.signal);
  await assert.rejects(worker.transcribe(Buffer.from('another')),/busy/);assert.equal(children[0].request.audio,Buffer.from('private wav').toString('base64'));
  controller.abort();await assert.rejects(first,e=>e.name==='AbortError');assert.equal(children[0].killed,true);
  const second=worker.transcribe(Buffer.from('next'));children[0].stdout.emit('data',Buffer.from(JSON.stringify({id:1,text:'stale'})+'\n'));
  children[1].stdout.emit('data',Buffer.from(JSON.stringify({id:2,text:'Kumusta, how are you?'})+'\n'));assert.equal(await second,'Kumusta, how are you?');
});
test('missing local model is actionable and never launches/downloads a model', async () => {
  const worker=new LocalSTT(offline({STT_PROVIDER:'faster-whisper'}),()=>{throw new Error('must not spawn');});
  await assert.rejects(worker.transcribe(Buffer.from('wav')),/model is missing/);
});
test('offline speech refuses network voices before calling speech synthesis', async () => {
  const original=globalThis.speechSynthesis;const originalUtterance=globalThis.SpeechSynthesisUtterance;const oldCancel=globalThis.cancelAnimationFrame;
  globalThis.cancelAnimationFrame=()=>{};globalThis.speechSynthesis={cancel(){},getVoices:()=>[{voiceURI:'remote',lang:'fil-PH',localService:false}],speak(){throw new Error('must not speak');}};
  globalThis.SpeechSynthesisUtterance=class {};
  try { const output=new SpeechOutput({update(){}},()=>{});await assert.rejects(output.speak('hello','warm',{offlineOnly:true,ttsProvider:'browser'},{},()=>{}),/no installed local device voice/); }
  finally {globalThis.speechSynthesis=original;globalThis.SpeechSynthesisUtterance=originalUtterance;globalThis.cancelAnimationFrame=oldCancel;}
});
