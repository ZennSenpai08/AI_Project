import test from 'node:test';
import assert from 'node:assert/strict';
import { _electron as electron } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';

// Real native speech/model/playback. Scripted chat and fake capture are labeled.
test('speech-v2: actual neural preview/chat, animated playback, hide, restart persistence', {timeout:420000}, async t=>{
  const out=resolve('artifacts/performance-v2');mkdirSync(out,{recursive:true});
  const data=resolve('.test-data/speech-v2-'+Date.now());
  const env={...process.env,ZYRAH_TEST_DATA:data,OFFLINE_ONLY:'true',CHAT_PROVIDER:'demo',STT_PROVIDER:'faster-whisper',WHISPER_MODEL_PATH:resolve('speech/models/tiny'),WHISPER_PYTHON:resolve('speech/.venv/Scripts/python.exe'),TTS_PROVIDER:'omnivoice',NEURAL_TTS_EXE:resolve('speech/tools/omnivoice-vulkan/omnivoice-tts.exe'),NEURAL_TTS_DEVICE:'Vulkan1',EMBEDDING_PROVIDER:'local',OPENAI_API_KEY:'',ZYRAH_OPEN_CHAT:'1'};
  const launch=()=>electron.launch({args:['.','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'],cwd:process.cwd(),env});
  let app=await launch();t.after(async()=>{if(app)await app.close();});await app.firstWindow();
  let chat,floating;for(let i=0;i<100;i++){chat=app.windows().find(p=>/\/$/.test(p.url()));floating=app.windows().find(p=>p.url().endsWith('companion.html'));if(chat&&floating)break;await new Promise(r=>setTimeout(r,100));}
  assert.ok(chat&&floating,'Both native windows load');chat.setDefaultTimeout(30000);floating.setDefaultTimeout(30000);
  await chat.waitForSelector('#sessions button');await floating.waitForSelector('#avatar canvas');
  await chat.evaluate(()=>{window.audioContexts=[];const RealContext=window.AudioContext;window.AudioContext=class extends RealContext{constructor(...args){super(...args);window.audioContexts.push(this);}};});
  const heartbeat=setInterval(()=>chat.evaluate(async()=>({at:Date.now(),status:document.querySelector('#voice-status').textContent,toast:document.querySelector('#toast').textContent,native:await window.zyrahDesktop.getState(),contexts:window.audioContexts.map(c=>c.state),responses:window.speechResponses})).then(v=>appendFileSync(resolve(out,'trace.jsonl'),JSON.stringify(v)+'\n')).catch(()=>{}),2000);t.after(()=>clearInterval(heartbeat));
  const errors=[];for(const page of [chat,floating])page.on('pageerror',e=>errors.push(e.message));
  await chat.evaluate(()=>{window.speechResponses=[];const original=window.fetch;window.fetch=async(...args)=>{const response=await original(...args);if(String(args[0])==='/api/speech')window.speechResponses.push({status:response.status,headers:Object.fromEntries([...response.headers].filter(([k])=>k.startsWith('x-zyrah-')||k==='content-type'))});return response;};});
  await floating.evaluate(()=>{window.samples=[];document.querySelector('#avatar').addEventListener('hiraya:avatar',e=>{window.samples.push({at:performance.now(),mouth:e.detail.mouth,speaking:e.detail.speaking,state:e.detail.state,cue:e.detail.cue});if(window.samples.length>3000)window.samples.shift();});});
  await floating.waitForTimeout(1000);await floating.screenshot({path:resolve(out,'idle.png'),omitBackground:true});
  await chat.locator('#open-settings').click();await chat.locator('#neural-voice').selectOption('zyrah-soft-v1');await chat.waitForFunction(()=>document.querySelector('#speech-runtime').textContent.includes('zyrah-soft-v1'));
  await chat.locator('#open-audition').click();await chat.locator('#audition-case').selectOption('0');
  await chat.locator('#audition-play').evaluate(b=>b.click());await chat.waitForFunction(()=>window.speechResponses.length>0,null,{timeout:180000,polling:100});
  assert.equal(await chat.evaluate(()=>window.speechResponses[0].status),200,'Native neural preview returns WAV status');
  await floating.waitForFunction(()=>window.samples.some(s=>s.speaking&&s.mouth>.05));console.log('Actual preview playback has nonzero floating mouth movement');
  await floating.screenshot({path:resolve(out,'speaking.png'),omitBackground:true});
  const before=await floating.evaluate(()=>window.samples.length);await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>!w.webContents.getURL().includes('companion.html')).close());
  await floating.waitForFunction(n=>window.samples.length>n+8&&window.samples.slice(-5).some(s=>s.mouth>.02),before);
  await floating.evaluate(()=>window.zyrahDesktop.action('hide'));await floating.waitForTimeout(450);
  assert.ok((await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(w=>({visible:w.isVisible(),muted:w.webContents.isAudioMuted()})))).every(w=>!w.visible&&w.muted));
  assert.equal((await chat.evaluate(()=>window.zyrahDesktop.getState())).microphone,false);
  await app.evaluate(({app})=>app.emit('second-instance'));await chat.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
  await chat.locator('#open-settings').click();await chat.locator('#auto-speak').check();await chat.waitForFunction(async()=>(await(await fetch('/api/bootstrap')).json()).settings.autoSpeak);await chat.evaluate(()=>document.querySelector('#settings-dialog').close());
  await floating.evaluate(()=>{window.samples=[];});
  await chat.locator('#message').fill('Zyrah, kumusta? Medyo pagod ako today. Pwede mo ba akong kausapin?');await chat.getByRole('button',{name:'Send message',exact:true}).click();
  await chat.waitForFunction(()=>document.querySelector('#voice-status').textContent.startsWith('Speaking'),null,{timeout:180000,polling:100}).catch(async e=>{writeFileSync(resolve(out,'failed-start.json'),JSON.stringify({native:await chat.evaluate(()=>window.zyrahDesktop.getState()),chat:await chat.evaluate(async()=>({status:document.querySelector('#voice-status').textContent,toast:document.querySelector('#toast').textContent,responses:window.speechResponses,settings:(await(await fetch('/api/bootstrap')).json()).settings}))},null,2));throw e;});
  await floating.waitForFunction(()=>window.samples.some(s=>s.speaking&&s.mouth>.05&&Number.isInteger(s.cue?.turn)&&Number.isInteger(s.cue?.segment)),null,{polling:100}).catch(async e=>{writeFileSync(resolve(out,'failed-playback.json'),JSON.stringify({native:await chat.evaluate(()=>window.zyrahDesktop.getState()),chat:await chat.evaluate(()=>({status:document.querySelector('#voice-status').textContent,toast:document.querySelector('#toast').textContent})),floating:await floating.evaluate(()=>({count:window.samples.length,max:Math.max(...window.samples.map(s=>s.mouth||0)),tail:window.samples.slice(-20)}))},null,2));throw e;});
  await floating.screenshot({path:resolve(out,'conversation.png'),omitBackground:true});console.log('Actual conversational playback has turn/segment cues and amplitude lip sync');
  await chat.locator('#stop').click();await floating.waitForFunction(()=>{const s=window.samples.at(-1);return s&&s.mouth===0&&!s.speaking&&!s.cue;});
  await chat.locator('#open-settings').click();await chat.locator('summary').filter({hasText:'Character performance preview'}).click();
  for(const gesture of ['wave','amused','concern','tease','thinking']){await chat.locator(`[data-performance="${gesture}"]`).click();await floating.waitForTimeout(1000);await floating.screenshot({path:resolve(out,gesture+'.png'),omitBackground:true});await floating.waitForTimeout(3700);}
  const diag=await chat.evaluate(async()=>{const b=await(await fetch('/api/bootstrap')).json();return(await fetch('/api/runtime',{headers:{'X-Hiraya-Token':b.token}})).json();});
  assert.equal(diag.tts.provider,'omnivoice');assert.equal(diag.tts.last.voice,'zyrah-soft-v1');assert.equal(diag.tts.last.backend,'Vulkan1');assert.equal(diag.tts.fallback,'none');assert.equal(diag.stt.language,'fil');
  const responses=await chat.evaluate(()=>window.speechResponses);assert.ok(responses.length>=2);assert.ok(responses.every(r=>r.status===200&&r.headers['x-zyrah-tts-voice']==='zyrah-soft-v1'));assert.deepEqual(errors,[]);
  // Hide a real native synthesis, then ensure the owned process exits and no late playback starts.
  await chat.locator('#open-audition').click();await chat.locator('#audition-play').evaluate(b=>b.click());
  await chat.waitForFunction(async()=>{const b=await(await fetch('/api/bootstrap')).json();return(await(await fetch('/api/runtime',{headers:{'X-Hiraya-Token':b.token}})).json()).tts.synthesizing;},null,{polling:100});
  await chat.evaluate(()=>window.zyrahDesktop.action('hide'));await chat.waitForTimeout(500);await app.evaluate(({app})=>app.emit('second-instance'));
  await chat.waitForFunction(async()=>{const b=await(await fetch('/api/bootstrap')).json();return!(await(await fetch('/api/runtime',{headers:{'X-Hiraya-Token':b.token}})).json()).tts.synthesizing;},null,{polling:100});
  assert.equal((await chat.evaluate(()=>window.zyrahDesktop.getState())).microphone,false);
  await chat.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
  await chat.locator('#record').click();await chat.waitForFunction(()=>document.querySelector('#voice-status').textContent.includes('Recording'));await floating.waitForTimeout(1000);await floating.screenshot({path:resolve(out,'listening.png'),omitBackground:true});await chat.evaluate(()=>window.zyrahDesktop.action('hide'));
  writeFileSync(resolve(out,'evidence.json'),JSON.stringify({diag,responses,note:'Real native neural preview/chat, owned synthesis cancellation, playback amplitude and Live2D. Scripted conversation and fake microphone. No human listening approval or human STT accuracy claim.'},null,2));
  await app.close();app=null;
  app=await launch();await app.firstWindow();let restarted;for(let i=0;i<100;i++){restarted=app.windows().find(p=>/\/$/.test(p.url()));if(restarted)break;await new Promise(r=>setTimeout(r,100));}await restarted.waitForSelector('#sessions button');
  const settings=await restarted.evaluate(async()=>(await(await fetch('/api/bootstrap')).json()).settings);assert.equal(settings.speechVoice,'zyrah-soft-v1');assert.equal(settings.sttLanguage,'fil');assert.equal((await restarted.evaluate(()=>window.zyrahDesktop.getState())).microphone,false);
});

