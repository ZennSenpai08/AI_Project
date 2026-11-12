import test from 'node:test';
import assert from 'node:assert/strict';
import { _electron as electron } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

test('Windows Electron: sandbox, actual model, chat close, hide/restore, shortcut conflicts, crash recovery', {timeout:120000}, async t => {
  mkdirSync('artifacts/native',{recursive:true});
  const application=await electron.launch({...(process.env.ZYRAH_EXECUTABLE?{executablePath:process.env.ZYRAH_EXECUTABLE}:{}),args:[...(process.env.ZYRAH_EXECUTABLE?[]:['.']),'--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'],cwd:process.cwd(),env:{...process.env,ZYRAH_TEST_DATA:resolve('.test-data/native-'+Date.now()),CHAT_PROVIDER:'demo',TTS_PROVIDER:'browser',STT_PROVIDER:'local',OPENAI_API_KEY:'',ZYRAH_OPEN_CHAT:'1'}});
  t.after(()=>application.close());
  const errors=[];application.on('window',page=>page.on('pageerror',e=>errors.push(e.message)));
  await application.firstWindow();
  let pages;for(let n=0;n<100;n++){pages=application.windows();if(pages.length===2&&pages.some(p=>p.url().endsWith('companion.html'))&&pages.some(p=>/\/$/.test(p.url())))break;await new Promise(r=>setTimeout(r,100));}
  const floating=pages.find(p=>p.url().endsWith('companion.html')); const chat=pages.find(p=>/\/$/.test(p.url()));assert.ok(floating&&chat);
  await chat.waitForSelector('#sessions button');await floating.waitForSelector('#avatar canvas',{timeout:30000});
  assert.deepEqual(await chat.evaluate(()=>({node:typeof require,bridge:typeof window.zyrahDesktop.action})),{node:'undefined',bridge:'function'});
  const browserPrefs=await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(w=>w.webContents.getLastWebPreferences()));
  assert.ok(browserPrefs.every(p=>p.sandbox&&p.contextIsolation&&!p.nodeIntegration));
  await floating.screenshot({path:'artifacts/native/companion.png',omitBackground:true});
  await chat.locator('#message').fill('I failed my exam 😂');await chat.locator('#chat-form').evaluate(form=>form.requestSubmit());
  await chat.waitForSelector('.message.assistant .message-actions');
  await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>!w.webContents.getURL().includes('companion.html')).close());
  assert.equal((await chat.evaluate(()=>window.zyrahDesktop.getState())).hidden,false);
  // Synthetic Chromium input, never the user's real microphone.
  await chat.evaluate(()=>{const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async(...args)=>{const stream=await original(...args);window.capturedTracks=stream.getTracks();return stream;};document.querySelector('#record').click();});
  await chat.waitForFunction(()=>window.capturedTracks?.some(t=>t.readyState==='live'));
  await floating.evaluate(()=>window.zyrahDesktop.action('hide'));
  await new Promise(r=>setTimeout(r,500));
  assert.equal((await chat.evaluate(()=>window.zyrahDesktop.getState())).hidden,true);
  assert.equal(await chat.evaluate(()=>window.capturedTracks.every(t=>t.readyState==='ended')),true);
  assert.ok((await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(w=>({visible:w.isVisible(),muted:w.webContents.isAudioMuted()})))).every(w=>!w.visible&&w.muted));
  await application.evaluate(({app})=>app.emit('second-instance'));
  assert.equal((await chat.evaluate(()=>window.zyrahDesktop.getState())).microphone,false);
  const conflict=await application.evaluate(({globalShortcut})=>globalShortcut.register('Ctrl+Alt+F9',()=>{}));assert.equal(conflict,true);
  const result=await chat.evaluate(()=>window.zyrahDesktop.action('shortcut','Ctrl+Alt+F9'));assert.equal(result.ok,false);
  await application.evaluate(({globalShortcut})=>globalShortcut.unregister('Ctrl+Alt+F9'));
  await chat.screenshot({path:'artifacts/native/chat.png'});
  writeFileSync('artifacts/native/metrics.json',JSON.stringify(await application.evaluate(({app})=>({versions:process.versions,metrics:app.getAppMetrics().map(m=>({type:m.type,cpu:m.cpu,memory:m.memory}))})),null,2));
  assert.deepEqual(errors,[]);
  await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('companion.html')).webContents.forcefullyCrashRenderer());
  for(let i=0;i<50 && await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length)!==0;i++) await new Promise(r=>setTimeout(r,100));
  assert.equal(await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length),0);
  await application.evaluate(({app})=>app.emit('second-instance'));
  for(let n=0;n<100&&application.windows().length<2;n++)await new Promise(r=>setTimeout(r,100));
  assert.equal(application.windows().length,2);
});


test('Offline Only: native renderers block external requests and expose enforced privacy state', {timeout:60000}, async t => {
  const application=await electron.launch({...(process.env.ZYRAH_EXECUTABLE?{executablePath:process.env.ZYRAH_EXECUTABLE}:{}),args:process.env.ZYRAH_EXECUTABLE?[]:['.'],cwd:process.cwd(),env:{...process.env,ZYRAH_TEST_DATA:resolve('.test-data/offline-'+Date.now()),OFFLINE_ONLY:'true',CHAT_PROVIDER:'demo',STT_PROVIDER:'disabled',TTS_PROVIDER:'disabled',EMBEDDING_PROVIDER:'local',OPENAI_API_KEY:'',ZYRAH_OPEN_CHAT:'1'}});
  t.after(()=>application.close());await application.firstWindow();
  let chat;for(let i=0;i<100;i++){chat=application.windows().find(p=>/\/$/.test(p.url()));if(chat)break;await new Promise(r=>setTimeout(r,100));}
  await chat.waitForSelector('#sessions button');
  assert.equal(await chat.locator('#privacy-mode').textContent(),'Offline Only enforced · external providers disabled');
  const result=await chat.evaluate(async()=>{const attempts=[];for(const url of ['https://example.com','http://127.0.0.1:3900/v1/models']){try{await fetch(url);attempts.push({url,blocked:false});}catch{attempts.push({url,blocked:true});}}return attempts;});
  assert.ok(result.every(r=>r.blocked));
  const before=await application.evaluate(({session})=>new Promise(resolve=>{const ses=session.fromPartition('persist:zyrah');ses.fetch('https://example.com').then(()=>resolve(false),()=>resolve(true));}));
  assert.equal(before,true);
  mkdirSync('artifacts/native',{recursive:true});writeFileSync('artifacts/native/offline-egress.json',JSON.stringify({renderer:result,electronSessionFetchBlocked:before,note:'App egress checks while internet remains available. OS network was not disconnected. No real local LLM configured.'},null,2));
});


test('application-owned STT: synthetic capture, hide during transcription, restore and retry', {timeout:90000}, async t => {
  const application=await electron.launch({...(process.env.ZYRAH_EXECUTABLE?{executablePath:process.env.ZYRAH_EXECUTABLE}:{}),args:[...(process.env.ZYRAH_EXECUTABLE?[]:['.']),'--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'],cwd:process.cwd(),env:{...process.env,ZYRAH_TEST_DATA:resolve('.test-data/direct-stt-'+Date.now()),OFFLINE_ONLY:'true',CHAT_PROVIDER:'demo',STT_PROVIDER:'faster-whisper',WHISPER_MODEL_PATH:resolve('speech/models/tiny'),WHISPER_PYTHON:resolve('speech/.venv/Scripts/python.exe'),TTS_PROVIDER:'disabled',EMBEDDING_PROVIDER:'local',OPENAI_API_KEY:'',ZYRAH_OPEN_CHAT:'1'}});
  t.after(()=>application.close());await application.firstWindow();let chat;for(let i=0;i<100;i++){chat=application.windows().find(p=>/\/$/.test(p.url()));if(chat)break;await new Promise(r=>setTimeout(r,100));}
  await chat.waitForSelector('#sessions button');
  await chat.locator('#dictate').click();await chat.waitForFunction(()=>document.querySelector('#voice-status').textContent.includes('Recording'),null,{timeout:10000});await chat.waitForTimeout(700);await chat.evaluate(()=>{const b=document.querySelector('#record');if(b.textContent.includes('Finish'))b.click();});await chat.waitForFunction(()=>document.querySelector('#voice-status').textContent.includes('Transcribing'));
  await chat.evaluate(()=>window.zyrahDesktop.action('hide'));await chat.waitForTimeout(450);assert.equal((await chat.evaluate(()=>window.zyrahDesktop.getState())).microphone,false);
  await application.evaluate(({app})=>app.emit('second-instance'));await chat.locator('#record').click();await chat.waitForFunction(()=>document.querySelector('#voice-status').textContent.includes('Recording'),null,{timeout:10000});await chat.waitForTimeout(700);
  await chat.evaluate(()=>{const b=document.querySelector('#record');if(b.textContent.includes('Finish'))b.click();});await chat.waitForFunction(()=>/Transcript ready|No speech recognized/.test(document.querySelector('#toast').textContent),null,{timeout:30000}).catch(async error=>{throw new Error(error.message+' '+JSON.stringify(await chat.evaluate(()=>({status:document.querySelector('#voice-status').textContent,toast:document.querySelector('#toast').textContent}))));});
});
