import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverBounds, DragTracker, registerRestore } from '../desktop/geometry.js';
import { PerformanceController, cueFor } from '../public/performance.js';
import { Store } from '../server/store.js';
import { configFromEnv } from '../server/config.js';
import { Providers } from '../server/providers.js';
import { createApp } from '../server/index.js';

test('drag crosses a movement threshold and never becomes a click after returning', () => {
  const drag = new DragTracker(); drag.begin({x:100,y:100},{x:10,y:20}); assert.equal(drag.move({x:103,y:102}),null); assert.equal(drag.end(),true);
  drag.begin({x:100,y:100},{x:10,y:20}); assert.deepEqual(drag.move({x:120,y:125}),{x:30,y:45}); drag.move({x:100,y:100}); assert.equal(drag.end(),false); assert.equal(drag.end(),false);
});
test('monitor removal, negative coordinates and DPI work-area changes recover the entire window', () => {
  const displays=[{workArea:{x:-1280,y:0,width:1280,height:720}},{workArea:{x:0,y:0,width:1920,height:1040}}];
  assert.equal(recoverBounds({x:-500,y:500,width:340,height:480},displays).x,-500);
  const recovered=recoverBounds({x:3000,y:1800,width:340,height:480},[displays[1]]);
  assert.deepEqual(recovered,{x:1580,y:560,width:340,height:480});
  const small=recoverBounds(recovered,[{workArea:{x:0,y:0,width:600,height:400}}]); assert.equal(small.height,400); assert.equal(small.y,0);
});
test('shortcut conflict preserves old registration and rejects malformed input', () => {
  const registered=new Set(['Ctrl+Alt+C','Ctrl+Alt+X']);const adapter={isRegistered:k=>registered.has(k),register:k=>registered.has(k)?false:(registered.add(k),true),unregister:k=>registered.delete(k)};
  assert.equal(registerRestore(adapter,'Ctrl+Alt+C','Ctrl+Alt+X',()=>{}).ok,false); assert.ok(registered.has('Ctrl+Alt+C'));
  assert.equal(registerRestore(adapter,'Ctrl+Alt+C','Alt+Z',()=>{}).ok,true);assert.ok(!registered.has('Ctrl+Alt+C'));
  assert.equal(registerRestore(adapter,'Alt+Z','exec(x)',()=>{}).ok,false);
});
test('performances wait for playback, reject old turns, respect cooldowns and hide invalidation', () => {
  let now=0;const p=new PerformanceController(()=>now);p.queue(cueFor('playful','wave',50),'t1');now=6000;assert.equal(p.active,null);
  assert.equal(p.start('t0'),false);assert.equal(p.start('t1'),true);now=7000;assert.ok(p.sample().PartArmLB>0);
  p.queue(cueFor('excited','celebrate'),'t2');p.start('t2');assert.equal(p.active.turn,'t1');
  p.cancel(true);assert.deepEqual(p.sample(),{});assert.equal(p.queue(cueFor('warm','wave'),'late'),false);assert.equal(p.start('t1'),false);
  p.restore();assert.equal(p.pending,null);assert.equal(p.active,null);
});
test('untrusted animation input is bounded and unknown gestures never execute', () => {
  assert.deepEqual(cueFor('evil','eval(script)',Infinity),{emotion:'calm',gesture:'none',intensity:.35});
  assert.equal(cueFor('warm','wave',300).intensity,.7);
});
test('forgetting excludes source from recent context and deleting a conversation removes source-linked memories', () => {
  const s=new Store(':memory:');try { const c=s.createSession();const turn=s.commitTurn(c.id,'I like tea',{text:'Tea it is.',emotion:'warm'});const m=s.addMemory('I like tea','fact',turn.user.id);
    s.deleteMemory(m.id);assert.ok(!JSON.stringify(s.history(c.id)).includes('I like tea'));
    s.addMemory('I like tea','fact',turn.user.id);s.addMemory('I like drawing','preference');s.deleteSession(c.id);assert.deepEqual(s.memories().map(m=>m.content),['I like drawing']);
  } finally {s.close();}
});
test('local speech uses separate endpoint, multilingual STT and plain speech without speculative controls', async () => {
  const c=configFromEnv({TTS_PROVIDER:'local',STT_PROVIDER:'local',LOCAL_TTS_MODEL:'omnivoice'});const requests=[];
  const provider=new Providers(c,async(url,options)=>{requests.push({url,options});return url.endsWith('transcriptions')?Response.json({text:'Kumusta, are you okay?'}):new Response(new Uint8Array([1,2]),{headers:{'Content-Type':'audio/mpeg'}});});
  assert.equal(await provider.transcribe(Buffer.from('wav')),'Kumusta, are you okay?');assert.equal(requests[0].options.body.get('language'),null);
  await provider.speech('Kumusta!','playful',undefined,.9);const body=JSON.parse(requests[1].options.body);assert.equal(body.speed,.9);assert.equal(body.input,'Kumusta!');assert.equal(body.instructions,undefined);assert.ok(requests.every(r=>r.url.startsWith('http://127.0.0.1:3900/v1/')));
  assert.throws(()=>configFromEnv({LOCAL_SPEECH_BASE_URL:'http://example.com/v1'}));
});
test('desktop bootstrap and assets require private cookie; global shutdown aborts provider work', async t => {
  let entered;const called=new Promise(r=>entered=r);let signal;
  const providers={chat:async(_t,_h,_m,_l,s)=>{signal=s;entered();await new Promise((_,reject)=>s.addEventListener('abort',()=>reject(new Error('cancelled'))));}};
  const app=createApp({...configFromEnv({}),desktopSecret:'private-test-cookie'},{store:new Store(':memory:'),providers});
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());const base=`http://127.0.0.1:${app.server.address().port}`;
  assert.equal((await fetch(base+'/api/bootstrap')).status,403);assert.equal((await fetch(base+'/companion.html')).status,403);
  const headers={Cookie:'zyrah-app=private-test-cookie'};const boot=await(await fetch(base+'/api/bootstrap',{headers})).json();headers['X-Hiraya-Token']=boot.token;headers['Content-Type']='application/json';
  const c=await(await fetch(base+'/api/sessions',{headers,method:'POST'})).json();const response=fetch(base+'/api/chat',{headers,method:'POST',body:JSON.stringify({sessionId:c.id,text:'hello'})});await called;app.cancelAll();assert.equal(signal.aborted,true);assert.equal((await response).status,409);
});
