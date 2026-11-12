import test from 'node:test';
import assert from 'node:assert/strict';
import { NeuralTTS } from '../server/neural-tts.js';
import { Providers } from '../server/providers.js';
import { configFromEnv } from '../server/config.js';
import { Store } from '../server/store.js';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { PerformanceController } from '../public/performance.js';

test('explicit Filipino STT reaches the provider as tl without translation; automatic mode omits the hint',async()=>{
  const calls=[];const c=configFromEnv({OPENAI_API_KEY:'test',TTS_PROVIDER:'browser'});
  const p=new Providers(c,async(_url,options)=>{calls.push(options.body);return Response.json({text:'Zyrah, paki-check naman.'});});
  await p.transcribe(Buffer.from('wav'),undefined,'fil');assert.equal(calls[0].get('language'),'tl');
  await p.transcribe(Buffer.from('wav'),undefined,'en');assert.equal(calls[1].get('language'),'en');
  await p.transcribe(Buffer.from('wav'),undefined,'auto');assert.equal(calls[2].get('language'),null);
});
test('new recognition language and neural profile survive restart independently of legacy device voice',()=>{
  const dir=mkdtempSync(join(tmpdir(),'zyrah-voice-settings-'));try{let s=new Store(dir);s.saveSettings({...s.settings(),sttLanguage:'fil',speechVoice:'zyrah-soft-v1',voice:'old-system-voice'});s.close();s=new Store(dir);assert.equal(s.settings().speechVoice,'zyrah-soft-v1');assert.equal(s.settings().sttLanguage,'fil');assert.equal(s.settings().voice,'old-system-voice');s.close();}finally{rmSync(dir,{recursive:true,force:true});}
});
test('unavailable neural voice fails explicitly without invoking browser or cloud transport',async()=>{
  const engine=new NeuralTTS({neuralTtsExe:'missing',neuralTtsModel:'missing',neuralTtsCodec:'missing'});
  await assert.rejects(engine.speech('Kumusta','zyrah-warm-v1','fil'),/system voice fallback is disabled/);
});
test('neural cancellation kills only the owned synthesis process and leaves no pending child',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'zyrah-voice-cancel-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  for(const n of ['engine','model','codec','zyrah-warm-v1.wav','zyrah-warm-v1.txt'])writeFileSync(join(dir,n),'fixture');
  let child,started;const spawned=new Promise(r=>started=r);const engine=new NeuralTTS({neuralTtsExe:join(dir,'engine'),neuralTtsModel:join(dir,'model'),neuralTtsCodec:join(dir,'codec'),neuralTtsReferences:dir},(_exe,args,options)=>{
    assert.equal(options.windowsHide,true);assert.ok(args.includes('Filipino'));assert.ok(args.includes('--ref-wav'));
    child=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();child.stdin.end=()=>{};child.kill=()=>{child.killed=true;queueMicrotask(()=>child.emit('close',1));};started();return child;
  });
  const controller=new AbortController();const pending=engine.speech('Kumusta','zyrah-warm-v1','fil',controller.signal);await spawned;controller.abort();await assert.rejects(pending,e=>e.name==='AbortError');assert.equal(child.killed,true);assert.equal(engine.children.size,0);
});
test('listening, thinking and speaking drive supported posture controls while cancellation removes the gesture',()=>{
  let time=1000;const p=new PerformanceController(()=>time);p.setState('listening');assert.ok(p.sample().ParamAngleY>=1.5);p.setState('thinking');assert.equal(p.sample().ParamEyeBallX,.4);p.setState('speaking');assert.ok(Math.abs(p.sample().ParamBodyAngleX)>0);p.queue({emotion:'playful',gesture:'amused',intensity:.5},3,2);assert.equal(p.start(3,1),false);assert.equal(p.start(3,2),true);time+=800;assert.ok(Math.abs(p.sample().ParamLeftShoulderUp)>0);p.cancel();assert.equal(p.active,null);
});


test('a replacing neural request waits for owned process exit and never returns superseded audio',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'zyrah-replace-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  for(const name of ['engine','model','codec','zyrah-warm-v1.wav','zyrah-warm-v1.txt'])writeFileSync(join(dir,name),'fixture');
  const children=[];let notify;const firstStarted=new Promise(r=>notify=r);
  const engine=new NeuralTTS({neuralTtsExe:join(dir,'engine'),neuralTtsModel:join(dir,'model'),neuralTtsCodec:join(dir,'codec'),neuralTtsReferences:dir},(_exe,args)=>{
    assert.equal(engine.children.size,0,'never overlap GPU contexts');
    const child=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();child.stdin.end=()=>{};
    child.kill=()=>{child.killed=true;setTimeout(()=>child.emit('close',1),15);};children.push(child);
    if(children.length===1)notify();else {const wav=Buffer.alloc(44);wav.write('RIFF');writeFileSync(args[args.indexOf('-o')+1],wav);setTimeout(()=>child.emit('close',0),5);}
    return child;
  });
  const old=engine.speech('Old speech','zyrah-warm-v1','fil');const rejected=assert.rejects(old,e=>e.name==='AbortError');await firstStarted;
  const current=await engine.speech('Current speech','zyrah-warm-v1','fil');await rejected;
  assert.equal(children[0].killed,true);assert.equal(current.toString('ascii',0,4),'RIFF');assert.equal(engine.children.size,0);
});
