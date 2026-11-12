import test from 'node:test';
import assert from 'node:assert/strict';
import { SpeechOutput, VoiceInput } from '../public/audio.js';
import { VTubeAdapter } from '../public/vtube.js';
globalThis.cancelAnimationFrame = () => {};
globalThis.requestAnimationFrame = () => 1;
globalThis.speechSynthesis = { cancel() {}, getVoices() { return []; } };
const avatar = () => ({ states: [], update(value) { this.states.push(value); } });

test('late TTS result is discarded after interruption before playback or AudioContext creation', async () => {
  let release; const response = new Promise(resolve => { release = resolve; }); const portrait = avatar();
  const output = new SpeechOutput(portrait, () => {});
  let unlocked = 0; output.unlock = async () => { unlocked++; };
  const pending = output.speak('Hello', 'warm', { ttsProvider: 'azure' }, {}, async () => response);
  output.stop(); release(new Response(new Uint8Array([1, 2, 3]))); await pending;
  assert.equal(unlocked, 0); assert.equal(output.audio, undefined); assert.deepEqual(portrait.states.at(-1), { speaking: false, mouth: 0 });
});
test('repeated interruptions abort pending synthesis requests and clear playback state', async () => {
  const output = new SpeechOutput(avatar(), () => {}); let aborted = 0;
  for (let i = 0; i < 5; i++) {
    const request = (_path, options) => new Promise((resolve, reject) => options.signal.addEventListener('abort', () => { aborted++; reject(options.signal.reason); }));
    const promise = output.speak('Hello', 'calm', { ttsProvider: 'azure' }, {}, request); output.stop(); await assert.rejects(promise, e => e.name === 'AbortError');
  }
  assert.equal(aborted, 5);
});
test('microphone permission resolving after stop immediately releases acquired tracks', async () => {
  let resolvePermission, stopped = 0;
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: () => new Promise(resolve => { resolvePermission = resolve; }) } } });
  try {
    const input = new VoiceInput({ onState() {}, onError(e) { throw e; } }); const start = input.start(true, 'en'); input.stop(); resolvePermission({ getTracks: () => [{ stop() { stopped++; } }] }); await start; assert.equal(stopped, 1); assert.equal(input.running, false);
  } finally { if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator); else delete globalThis.navigator; }
});
test('VTube Studio uses documented token/authentication flow then bounded mouth parameters', async () => {
  const sent = []; let socket;
  const factory = () => {
    socket = { readyState: 1, close() { this.readyState = 3; }, send(text) {
      const request = JSON.parse(text); sent.push(request);
      queueMicrotask(() => socket.onmessage({ data: JSON.stringify({ requestID: request.requestID, messageType: request.messageType.replace('Request', 'Response'), data: request.messageType === 'AuthenticationTokenRequest' ? { authenticationToken: 'temporary-test-token' } : request.messageType === 'AuthenticationRequest' ? { authenticated: true } : {} }) }));
    } };
    setTimeout(() => socket.onopen(), 0); return socket;
  };
  const adapter = new VTubeAdapter({ socketFactory: factory });
  await adapter.connect(); adapter.update({ speaking: true, mouth: 8, emotion: 'warm' }); await adapter.sendState(); adapter.disconnect();
  assert.equal(sent[0].messageType, 'AuthenticationTokenRequest'); assert.equal(sent[1].messageType, 'AuthenticationRequest'); assert.equal(sent[2].data.parameterValues[0].value, 1); assert.equal(socket.readyState, 3); assert.equal(adapter.ready, false);
});


test('a late disconnect from an old microphone cannot stop newly restored capture', async () => {
  const previousNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');const previousContext=globalThis.AudioContext;const previousNode=globalThis.AudioWorkletNode;
  const tracks=[];Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>{const track={stop(){}};tracks.push(track);return {getTracks:()=>[track]};}}}});
  globalThis.AudioContext=class {constructor(){this.sampleRate=16000;this.audioWorklet={addModule:async()=>{}};}async resume(){}async close(){}createMediaStreamSource(){return {connect(){},disconnect(){}};}};
  globalThis.AudioWorkletNode=class {constructor(){this.port={};}connect(){}disconnect(){}};
  const input=new VoiceInput({onState(){},onError(){throw new Error('stale disconnect');}});
  try{await input.start(true,'auto');const oldEnded=tracks[0].onended;input.stop();assert.equal(tracks[0].onended,null);await input.start(true,'auto');oldEnded();assert.equal(input.running,true);}
  finally {input.stop();if(previousNavigator)Object.defineProperty(globalThis,'navigator',previousNavigator);else delete globalThis.navigator;globalThis.AudioContext=previousContext;globalThis.AudioWorkletNode=previousNode;}
});

test('a suspended output device cannot leave voice preparation waiting forever',async t=>{
  const previous=globalThis.AudioContext;t.after(()=>{globalThis.AudioContext=previous;});
  t.mock.timers.enable({apis:['setTimeout']});
  globalThis.AudioContext=class {constructor(){this.state='suspended';}resume(){return new Promise(()=>{});}};
  const output=new SpeechOutput(avatar(),()=>{});
  const rejected=assert.rejects(output.unlock(),/Click Play sample or Send again/);
  t.mock.timers.tick(5000);await rejected;
});
