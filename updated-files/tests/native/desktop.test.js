import test from 'node:test';
import assert from 'node:assert/strict';
import { _electron as electron } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

test('Windows Electron: sandbox, actual model, chat close, hide/restore, shortcut conflicts, crash recovery', {timeout:120000}, async t => {
  mkdirSync('artifacts/native',{recursive:true});
  const application=await electron.launch({args:['.','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'],cwd:process.cwd(),env:{...process.env,ZYRAH_TEST_DATA:resolve('.test-data/native-'+Date.now()),CHAT_PROVIDER:'demo',TTS_PROVIDER:'browser',STT_PROVIDER:'local',OPENAI_API_KEY:'',ZYRAH_OPEN_CHAT:'1'}});
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
  await new Promise(r=>setTimeout(r,500));
  assert.equal(await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length),0);
  await application.evaluate(({app})=>app.emit('second-instance'));
  for(let n=0;n<100&&application.windows().length<2;n++)await new Promise(r=>setTimeout(r,100));
  assert.equal(application.windows().length,2);
});
