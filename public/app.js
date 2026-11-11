import { Avatar } from './avatar.js';
import { SpeechOutput, VoiceInput, Recognition } from './audio.js';
import { speechSegments } from './audio-core.js';
import { auditionCases } from './audition.js';
import { VTubeAdapter } from './vtube.js';

const $ = selector => document.querySelector(selector);
const state = { token: '', config: {}, settings: {}, sessions: [], memories: [], session: null, messages: [], epoch: 0, voice: false };
const avatar = new Avatar($('#avatar'));
const vtube = new VTubeAdapter({ onStatus: text => { $('#vtube-status').textContent = text; } });
avatar.element.addEventListener('hiraya:avatar', event => vtube.update(event.detail));
let toastTimer, pendingConfirmation, recognition;
const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };

function toast(message, error = false) { clearTimeout(toastTimer); const box = $('#toast'); box.textContent = message; box.classList.toggle('error', error); box.hidden = false; toastTimer = setTimeout(() => { box.hidden = true; }, error ? 8000 : 3500); }
async function request(path, { method = 'GET', body, signal, raw = false } = {}) {
  const headers = { 'X-Hiraya-Token': state.token };
  if (body instanceof Blob) headers['Content-Type'] = body.type;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
  const response = await fetch(path, { method, headers, body, signal });
  if (!response.ok) { let message = `Request failed (${response.status}).`; try { message = (await response.json()).error || message; } catch {} throw new Error(message); }
  return raw ? response : response.json();
}
function voiceStatus(text) {
  if (/^Speaking/.test(text) && state.utteranceEnded) { request('/api/metrics', { method: 'POST', body: { kind: 'speech_to_playback_ms', durationMs: performance.now() - state.utteranceEnded, sessionId: state.session?.id } }).catch(() => {}); state.utteranceEnded = null; }
  $('#voice-status').textContent = text === 'Here with you' && state.voice ? 'Listening · speak naturally' : text;
  if (!/Speaking|Listening to/.test(text)) drawLevel(0);
  avatar.update({ state: /Speaking/.test(text) ? 'speaking' : /Thinking/.test(text) ? 'thinking' : /Listening/.test(text) ? 'listening' : 'idle' });
  $('#stop').disabled = !state.busy && !state.speaking && !state.transcribing;
}
function drawLevel(level) { $('#waveform').querySelectorAll('i').forEach((bar, index) => { bar.style.height = `${Math.max(2, Math.min(17, level * 160 * (1 - Math.abs(index - 3) / 6)))}px`; }); }
avatar.element.addEventListener('hiraya:avatar', event => { if (event.detail.speaking) drawLevel(event.detail.mouth / 5); });
const output = new SpeechOutput(avatar, voiceStatus);
function interrupt() {
  const stopping = state.speaking; const stopStart = performance.now();
  acknowledgePlayback('interrupted');
  state.epoch++;
  state.controller?.abort(); state.transcriptionController?.abort(); output.stop();
  if (stopping) request('/api/metrics', { method: 'POST', body: { kind: 'stop_playback_ms', durationMs: performance.now() - stopStart, sessionId: state.session?.id } }).catch(() => {});
  state.busy = false; state.speaking = false; state.transcribing = false;
  $('#activity').textContent = ''; voiceStatus('Here with you');
  if (state.pendingNode) { state.pendingNode.remove(); state.pendingNode = null; }
  if (state.streamingNode) { state.streamingNode.remove(); state.streamingNode = null; }
}
function acknowledgePlayback(status) {
  if (!state.playback) return;
  const playback = state.playback; state.playback = null;
  request('/api/delivery', { method: 'POST', body: { messageId: playback.id, spokenChars: playback.chars, status } }).catch(() => {});
}
const input = new VoiceInput({
  onStart: () => interrupt(), onState: voiceStatus, onLevel: drawLevel,
  onAudio: async blob => {
    state.utteranceEnded = performance.now();
    const epoch = state.epoch;
    state.transcriptionController?.abort(); const controller = new AbortController(); state.transcriptionController = controller;
    state.transcribing = true; voiceStatus('Transcribing…');
    try {
      const { text } = await request('/api/transcribe', { method: 'POST', body: blob, signal: controller.signal });
      if (epoch !== state.epoch || !state.voice) return;
      if (text) await send(text); else voiceStatus('Listening · try that again');
    } catch (e) { if (e.name !== 'AbortError' && epoch === state.epoch) { toast(e.message, true); endVoice(); } }
    finally { if (epoch === state.epoch) { state.transcribing = false; voiceStatus('Here with you'); } }
  },
  onText: text => { if (state.voice) send(text); },
  onError: error => { endVoice(); toast(error.name === 'NotAllowedError' ? 'Microphone permission was denied. Allow access in your browser or use text chat.' : error.message, true); },
});
const recorder = new VoiceInput({
  onStart: () => {}, onText: () => {}, onState: voiceStatus, onLevel: drawLevel,
  onAudio: async blob => {
    state.recording = false; $('#record').textContent = '● Record';
    const epoch = state.epoch; const controller = new AbortController(); state.transcriptionController = controller;
    state.transcribing = true; voiceStatus('Transcribing your draft…');
    try { const result = await request('/api/transcribe', { method: 'POST', body: blob, signal: controller.signal }); if (epoch === state.epoch) { $('#message').value = result.text; $('#message').focus(); toast('Transcript ready. Edit it, then press Send.'); } }
    catch (e) { if (e.name !== 'AbortError' && epoch === state.epoch) toast(e.message, true); }
    finally { if (epoch === state.epoch) { state.transcribing = false; voiceStatus('Here with you'); } }
  },
  onError: e => { state.recording = false; $('#record').textContent = '● Record'; toast(e.message, true); voiceStatus('Here with you'); },
});

function endVoice() {
  recorder.stop(); state.recording = false; $('#record').textContent = '● Record';
  state.voice = false; input.stop(); interrupt();
  $('#voice-toggle').classList.remove('active'); $('#voice-toggle').textContent = '◉  Start voice conversation';
  $('#voice-help').textContent = 'Your mic is off. Turn it on when you’re ready.';
  voiceStatus('Here with you');
}
async function toggleVoice() {
  if (state.voice) { endVoice(); return; }
  recognition?.abort(); recorder.stop(); state.recording = false; $('#record').textContent = '● Record'; interrupt();
  try { await output.unlock(); } catch { /* Device TTS does not need Web Audio. */ }
  state.voice = true; $('#voice-toggle').classList.add('active'); $('#voice-toggle').textContent = '■  End voice conversation';
  $('#voice-help').textContent = state.config.cloudStt ? 'Mic is on · speech is sent for transcription. Headphones help with interruptions.' : 'Mic is on · browser recognition may use cloud services. Headphones recommended.';
  await input.start(state.config.cloudStt, state.settings.language, state.settings);
}

async function speak(text, emotion = 'warm', messageId = null) {
  if (state.muted) return;
  const epoch = state.epoch; state.speaking = true; voiceStatus('Preparing voice…');
  if (messageId) state.playback = { id: messageId, chars: 0 };
  try {
    for (const segment of speechSegments(text)) {
      if (epoch !== state.epoch) break;
      await output.speak(segment, emotion, state.config, state.settings, request);
      if (epoch === state.epoch && state.playback) state.playback.chars += segment.length;
    }
    if (epoch === state.epoch) acknowledgePlayback('completed');
  }
  catch (e) { if (epoch === state.epoch && e.name !== 'AbortError') { acknowledgePlayback('interrupted'); output.stop(); toast(`Voice: ${e.message}`, true); } }
  finally { if (epoch === state.epoch) { state.speaking = false; voiceStatus('Here with you'); } }
}

function renderMessage(message, { provisional = false } = {}) {
  const node = el('article', `message ${message.role}`);
  const label = el('div', 'message-label');
  if (message.role === 'assistant') label.append(el('span', 'mini-star', '✳'));
  label.append(el('strong', '', message.role === 'user' ? 'You' : state.config.characterName));
  if (message.created_at) label.append(el('span', '', new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })));
  node.append(label, el('div', 'message-text', message.content));
  if (message.role === 'assistant' && !provisional) {
    const actions = el('div', 'message-actions');
      const listen = el('button', '', '♩ Listen'); listen.addEventListener('click', () => { interrupt(); speak(message.content, message.emotion || 'warm', message.id); });
    const save = el('button', '', '♧ Save a moment'); save.addEventListener('click', () => { $('#memory-content').value = message.content.slice(0, 500); $('#memory-kind').value = 'experience'; openMemories(); });
    actions.append(listen, save); node.append(actions);
  }
  $('#messages').append(node); return node;
}
function scrollChat() { $('#messages').scrollTop = $('#messages').scrollHeight; }
function renderConversation() {
  $('#messages').replaceChildren();
  $('#messages').append(el('div', 'welcome-date', 'A LITTLE MOMENT, JUST FOR YOU'));
  if (!state.messages.length) renderMessage({ role: 'assistant', content: `Uy, you made it. I’m ${state.config.characterName}. ✨\n\nLeave the busy day at the door for a bit. We can talk about your little wins, untangle a thought, or just share a silly joke.\n\nKumusta ka, really?`, emotion: 'warm' });
  else state.messages.forEach(m => renderMessage(m));
  $('#suggestions').hidden = state.messages.length > 0;
  $('#conversation-mode').textContent = state.config.chatProvider === 'demo' ? 'Scripted demo · connect a model for free-form chat' : 'Text & voice · your pace';
  scrollChat();
}
function renderSessions() {
  $('#sessions').replaceChildren();
  state.sessions.forEach(session => {
    const button = el('button', `session-button${session.id === state.session?.id ? ' active' : ''}`, session.title);
    button.title = session.title; button.setAttribute('aria-current', session.id === state.session?.id ? 'page' : 'false');
    button.addEventListener('click', () => loadSession(session.id).catch(e => toast(e.message, true))); $('#sessions').append(button);
  });
  $('#session-count').textContent = state.sessions.length;
  $('#session-picker').replaceChildren(...state.sessions.map(session => { const option = el('option', '', session.title); option.value = session.id; return option; }));
  $('#session-picker').value = state.session?.id || '';
}
async function refreshSessions() { state.sessions = await request('/api/sessions'); renderSessions(); }
async function loadSession(id) {
  endVoice(); recognition?.abort();
  const epoch = state.epoch;
  const session = await request(`/api/sessions/${id}`);
  if (epoch !== state.epoch) return;
  state.session = session; state.messages = session.messages;
  localStorage.setItem('hiraya-session', id); renderSessions(); renderConversation();
}
async function newSession() {
  endVoice(); recognition?.abort();
  const session = await request('/api/sessions', { method: 'POST' });
  state.sessions.unshift(session); await loadSession(session.id); $('#message').focus();
}
async function send(text) {
  text = text.trim(); if (!text || !state.session) return;
  if (/^(?:disable memory|stop remembering|huwag munang tandaan)[.!]?$/i.test(text)) { await saveSettings({ memoryEnabled: false }); toast('Memory retrieval and suggestions are now off. Existing notes remain in your notebook.'); return; }
  if (/^(?:enable memory|resume memory)[.!]?$/i.test(text)) { await saveSettings({ memoryEnabled: true }); toast('Memory retrieval and suggestions are on.'); return; }
  if (/^(?:forget this|that is incorrect|correct (?:this )?memory)[.!]?$/i.test(text)) { openMemories(); toast('Choose a note to correct or forget.'); return; }
  interrupt(); const epoch = state.epoch; const sessionId = state.session.id;
  state.busy = true; state.controller = new AbortController();
  const pending = renderMessage({ role: 'user', content: text, created_at: new Date().toISOString() }, { provisional: true }); state.pendingNode = pending;
  $('#suggestions').hidden = true; $('#activity').textContent = `${state.config.characterName} is thinking…`; voiceStatus('Thinking…'); scrollChat();
  try {
    const response = await request('/api/chat/stream', { method: 'POST', body: { sessionId, text }, signal: state.controller.signal, raw: true });
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '', result;
    const streamingNode = renderMessage({ role: 'assistant', content: '', emotion: 'warm' }, { provisional: true }); state.streamingNode = streamingNode;
    const handle = line => {
      if (!line.trim()) return; const event = JSON.parse(line);
      if (event.type === 'error') throw new Error(event.error);
      if (event.type === 'text' && epoch === state.epoch) { streamingNode.querySelector('.message-text').textContent = event.text; $('#activity').textContent = 'Writing…'; scrollChat(); }
      if (event.type === 'done') result = event.result;
    };
    try {
      while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); let split; while ((split = buffer.indexOf('\n')) >= 0) { handle(buffer.slice(0, split)); buffer = buffer.slice(split + 1); } }
      if (buffer.trim()) handle(buffer);
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    if (!result && epoch === state.epoch) throw new Error('The reply stream ended before completion. Please try again.');
    if (epoch !== state.epoch) return;
    streamingNode.remove(); state.streamingNode = null;
    state.pendingNode = null; state.messages.push(result.user, result.assistant);
    const node = renderMessage(result.assistant); avatar.update({ emotion: result.emotion }); $('#emotion').textContent = result.emotion;
    if (result.memorySuggestion) {
      const card = el('div', 'memory-suggestion'); card.append(el('p', '', `Keep a little note? ${result.memorySuggestion}`));
      const save = el('button', '', 'Save this memory'); const skip = el('button', '', 'Not now');
      save.addEventListener('click', async () => { save.disabled = true; try { await addMemory(result.memorySuggestion, 'fact', result.user.id); card.replaceChildren(el('span', '', '✓ Saved to your notebook')); } catch (e) { save.disabled = false; toast(e.message, true); } });
      skip.addEventListener('click', () => card.remove()); card.append(save, skip); node.append(card);
    }
    $('#activity').textContent = ''; state.busy = false; voiceStatus('Here with you'); scrollChat();
    $('#activity').textContent = `${result.latencyMs} ms reply${result.firstTokenMs !== null ? ` · ${result.firstTokenMs} ms first text` : ''}${result.usage?.total_tokens ? ` · ${result.usage.total_tokens} tokens` : ''}`;
    if (result.references?.length) node.append(el('small', 'reference-list', 'References supplied: ' + result.references.map(r => `${r.name}, chunk ${r.chunk}`).join(' · ')));
    await refreshSessions();
    if (epoch === state.epoch && (state.voice || state.settings.autoSpeak)) await speak(result.delivery?.spoken_text || result.text, result.emotion, result.assistant.id);
  } catch (e) {
    if (epoch === state.epoch && e.name !== 'AbortError') {
      pending.remove(); state.pendingNode = null; $('#message').value = text;
      state.streamingNode?.remove(); state.streamingNode = null;
      $('#activity').textContent = 'Your message was not completed. It’s back in the draft below.'; toast(e.message, true);
    }
  } finally { if (epoch === state.epoch) { state.busy = false; voiceStatus('Here with you'); } }
}

async function addMemory(content, kind, sourceId = null) {
  await request('/api/memories', { method: 'POST', body: { content, kind, sourceId } });
  state.memories = await request('/api/memories'); renderMemories(); toast('A little memory, saved.');
}
function renderMemories() {
  $('#memory-count').textContent = state.memories.length; const list = $('#memories-list'); list.replaceChildren();
  if (!state.memories.length) list.append(el('p', 'muted', 'A fresh page. Add something you’d like me to remember.'));
  state.memories.forEach(memory => {
    const note = el('article', 'memory-note'); note.append(el('small', '', memory.kind), el('p', '', memory.content));
    const actions = el('div', 'memory-note-actions'); const edit = el('button', '', 'Edit'); const remove = el('button', '', 'Forget');
    edit.addEventListener('click', () => {
      const field = el('textarea'); field.value = memory.content; field.maxLength = 500; field.rows = 3; field.setAttribute('aria-label', 'Edit memory');
      const save = el('button', 'primary', 'Save changes'); const cancel = el('button', 'secondary', 'Cancel');
      save.addEventListener('click', async () => { try { await request(`/api/memories/${memory.id}`, { method: 'PATCH', body: { content: field.value } }); state.memories = await request('/api/memories'); renderMemories(); } catch (e) { toast(e.message, true); } });
      cancel.addEventListener('click', renderMemories); note.replaceChildren(field, save, cancel); field.focus();
    });
    remove.addEventListener('click', async () => { try { await request(`/api/memories/${memory.id}`, { method: 'DELETE' }); state.memories = state.memories.filter(m => m.id !== memory.id); renderMemories(); toast('Memory forgotten.'); } catch (e) { toast(e.message, true); } });
    actions.append(edit, remove); note.append(actions); list.append(note);
  });
}
function openMemories() { renderMemories(); if (!$('#memories-dialog').open) $('#memories-dialog').showModal(); }
function populateVoices() {
  const select = $('#browser-voice'); select.replaceChildren(el('option', '', 'Automatic · prefer Filipino')); select.firstChild.value = '';
  globalThis.speechSynthesis?.getVoices().forEach(voice => { const option = el('option', '', `${voice.name} · ${voice.lang}`); option.value = voice.voiceURI; select.append(option); }); select.value = state.settings.voice;
}
function renderSettings() {
  $('#memory-enabled').checked = state.settings.memoryEnabled; $('#speech-speed').value = state.settings.speed; $('#speech-volume').value = state.settings.volume; $('#silence').value = state.settings.silenceMs; $('#noise-threshold').value = state.settings.vadThreshold;
  $('#language').value = state.settings.language; $('#auto-speak').checked = state.settings.autoSpeak; $('#show-avatar').checked = state.settings.avatar;
  $('.companion-card').classList.toggle('avatar-hidden', !state.settings.avatar); populateVoices();
  avatar.setVisible(state.settings.avatar);
  $('#provider-details').textContent = state.config.chatProvider === 'demo' ? 'You’re in the scripted offline demo. To enable real AI, set CHAT_PROVIDER=openai and OPENAI_API_KEY in .env, or use CHAT_PROVIDER=ollama with a local model. Restart the server after changes. Voice provider: ' + state.config.ttsProvider + '.' : `Conversation: ${state.config.chatProvider} / ${state.config.chatModel}. Voice: ${state.config.ttsProvider}. Change providers and your companion’s name in .env, then restart. Cloud voice quality and Filipino accent depend on the selected voice.`;
}
async function saveSettings(patch) {
  if (state.voice) endVoice();
  try { state.settings = await request('/api/settings', { method: 'PATCH', body: patch }); renderSettings(); }
  catch (e) { renderSettings(); toast(e.message, true); }
}
function confirmAction(title, description, typed = false) {
  $('#confirm-title').textContent = title; $('#confirm-description').textContent = description;
  $('#confirm-label').hidden = !typed; $('#confirm-input').hidden = !typed; $('#confirm-input').value = '';
  $('#confirm-input').required = typed; $('#confirm-submit').disabled = typed;
  $('#confirm-dialog').showModal();
  return new Promise(resolve => { pendingConfirmation = resolve; });
}

$('#chat-form').addEventListener('submit', event => { event.preventDefault(); const text = $('#message').value; if (!text.trim()) return; $('#message').value = ''; output.unlock().catch(() => {}); send(text); });
$('#message').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('#chat-form').requestSubmit(); } });
$('#new-chat').addEventListener('click', () => newSession().catch(e => toast(e.message, true)));
$('#session-picker').addEventListener('change', event => loadSession(event.target.value).catch(e => toast(e.message, true)));
$('#voice-toggle').addEventListener('click', toggleVoice);
$('#stop').addEventListener('click', interrupt);
document.addEventListener('keydown', event => { if (event.key === 'Escape') { interrupt(); if (state.voice) endVoice(); recognition?.abort(); } });
document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => send(button.dataset.prompt)));
$('#open-memories').addEventListener('click', openMemories); $('#privacy-link').addEventListener('click', openMemories);
$('#open-settings').addEventListener('click', () => { renderSettings(); refreshUsage(); refreshDocuments(); $('#settings-dialog').showModal(); });
document.querySelectorAll('.close-dialog').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
$('#memory-form').addEventListener('submit', async event => { event.preventDefault(); try { await addMemory($('#memory-content').value, $('#memory-kind').value); $('#memory-content').value = ''; } catch (e) { toast(e.message, true); } });
$('#language').addEventListener('change', event => saveSettings({ language: event.target.value }));
$('#auto-speak').addEventListener('change', event => saveSettings({ autoSpeak: event.target.checked }));
$('#show-avatar').addEventListener('change', event => saveSettings({ avatar: event.target.checked }));
$('#browser-voice').addEventListener('change', event => saveSettings({ voice: event.target.value }));
$('#memory-enabled').addEventListener('change', event => saveSettings({ memoryEnabled: event.target.checked }));
$('#speech-speed').addEventListener('change', event => saveSettings({ speed: Number(event.target.value) }));
$('#speech-volume').addEventListener('change', event => saveSettings({ volume: Number(event.target.value) }));
$('#silence').addEventListener('change', event => saveSettings({ silenceMs: Number(event.target.value) }));
$('#noise-threshold').addEventListener('change', event => saveSettings({ vadThreshold: Number(event.target.value) }));
globalThis.speechSynthesis?.addEventListener('voiceschanged', populateVoices);
$('#confirm-input').addEventListener('input', event => { $('#confirm-submit').disabled = event.target.value !== 'DELETE'; });
$('#confirm-cancel').addEventListener('click', () => $('#confirm-dialog').close());
$('#confirm-form').addEventListener('submit', event => { event.preventDefault(); pendingConfirmation?.(true); pendingConfirmation = null; $('#confirm-dialog').close(); });
$('#confirm-dialog').addEventListener('close', () => { pendingConfirmation?.(false); pendingConfirmation = null; });
$('#delete-chat').addEventListener('click', async () => {
  if (!state.session) return;
  const id = state.session.id;
  if (!await confirmAction('Let this conversation go?', 'This deletes the conversation from this computer. Saved memory notes stay in your notebook.')) return;
  try { endVoice(); await request(`/api/sessions/${id}`, { method: 'DELETE' }); await refreshSessions(); if (state.sessions.length) await loadSession(state.sessions[0].id); else await newSession(); toast('Conversation deleted.'); } catch (e) { toast(e.message, true); }
});
$('#export-data').addEventListener('click', async () => {
  try {
    const data = await request('/api/export'); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = el('a'); link.href = url; link.download = 'hiraya-memories-and-conversations.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (e) { toast(e.message, true); }
});
$('#erase-data').addEventListener('click', async () => {
  if (!await confirmAction('Start with a blank page?', 'All conversations, saved memories and preferences will be erased from this app. Export first if you want a copy.', true)) return;
  try { endVoice(); await request('/api/data', { method: 'DELETE', body: { confirm: 'DELETE' } }); localStorage.removeItem('hiraya-session'); location.reload(); } catch (e) { toast(e.message, true); }
});
$('#dictate').addEventListener('click', () => {
  if (recognition) { recognition.stop(); return; }
  if (!Recognition) { toast('One-shot browser dictation is unavailable. Use voice conversation with cloud transcription, or type a message.', true); return; }
  endVoice(); recognition = new Recognition(); recognition.lang = state.settings.language === 'en' ? 'en-PH' : 'fil-PH'; recognition.interimResults = true;
  const existing = $('#message').value;
  recognition.onresult = event => { $('#message').value = [existing, Array.from(event.results).map(result => result[0].transcript).join(' ')].filter(Boolean).join(' ').slice(0, 4000); };
  recognition.onerror = event => { if (event.error !== 'aborted') toast(`Dictation: ${event.error}. You can still type.`, true); };
  recognition.onend = () => { recognition = null; $('#dictate').innerHTML = '♩ <span>Dictate</span>'; $('#message').focus(); };
  try { recognition.start(); $('#dictate').innerHTML = '■ <span>Finish</span>'; toast('Listening. Dictation fills the draft; review it before sending.'); }
  catch (e) { recognition = null; toast(e.message, true); }
});
window.addEventListener('pagehide', () => { endVoice(); recognition?.abort(); vtube.disconnect(); avatar.destroy(); });
$('#vtube-connect').addEventListener('click', async () => {
  try {
    const hotkeys = JSON.parse($('#vtube-hotkeys').value || '{}');
    if (!hotkeys || typeof hotkeys !== 'object' || Array.isArray(hotkeys) || Object.entries(hotkeys).some(([key, value]) => !['warm', 'playful', 'curious', 'concerned', 'excited', 'calm'].includes(key) || typeof value !== 'string' || value.length > 100)) throw new Error('Use an object mapping supported emotions to hotkey names.');
    await vtube.connect({ mouthParameter: $('#vtube-mouth').value, hotkeys });
  } catch (e) { toast(e.message, true); }
});
$('#vtube-disconnect').addEventListener('click', () => vtube.disconnect());

$('#record').addEventListener('click', async () => {
  if (state.recording) { recorder.finishRecording(); state.recording = false; $('#record').textContent = '● Record'; return; }
  if (!state.config.cloudStt) { toast('Recording needs OPENAI_API_KEY for transcription. Browser Dictate is available without an app key.'); return; }
  endVoice(); recognition?.abort(); state.recording = true; $('#record').textContent = '■ Finish';
  toast('Recording up to 20 seconds. Press Finish, then review your transcript.');
  await recorder.start(true, state.settings.language, { manual: true });
});
$('#mute').addEventListener('click', () => { state.muted = !state.muted; if (state.muted) interrupt(); $('#mute').textContent = state.muted ? 'Unmute' : 'Mute'; $('#mute').setAttribute('aria-pressed', String(state.muted)); });
$('#rename-chat').addEventListener('click', () => { if (state.session) { $('#session-title').value = state.session.title; $('#rename-dialog').showModal(); } });
$('#rename-form').addEventListener('submit', async event => { event.preventDefault(); try { await request(`/api/sessions/${state.session.id}`, { method: 'PATCH', body: { title: $('#session-title').value } }); state.session.title = $('#session-title').value; await refreshSessions(); $('#rename-dialog').close(); } catch (e) { toast(e.message, true); } });
async function refreshUsage() {
  try { const usage = await request('/api/usage'); $('#usage-details').textContent = `Today (UTC): ${usage.requests}/${usage.requestLimit} provider request reservations · ${usage.speech_chars}/${usage.speechCharacterLimit} speech characters · ${usage.tokens} reported tokens · ${Math.round(usage.audio_seconds)} seconds transcribed. Cost estimate unavailable; check provider billing. Failed requests and retry reservations count toward limits.`; } catch (e) { toast(e.message, true); }
}
async function refreshDocuments() {
  try {
    const documents = await request('/api/documents'); const list = $('#documents-list'); list.replaceChildren();
    for (const doc of documents) { const row = el('div', 'document-row'); row.append(el('span', '', doc.name)); const remove = el('button', 'secondary', 'Remove'); remove.addEventListener('click', async () => { try { await request(`/api/documents/${doc.id}`, { method: 'DELETE' }); refreshDocuments(); } catch (e) { toast(e.message, true); } }); row.append(remove); list.append(row); }
  } catch (e) { toast(e.message, true); }
}
$('#document-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try { if (file.size > 48000) throw new Error('Document exceeds 48 KB. Use a smaller .txt or .md file.'); const content = await file.text(); await request('/api/documents', { method: 'POST', body: { name: file.name, content } }); await refreshDocuments(); toast('Reference document indexed.'); }
  catch (e) { toast(e.message, true); } finally { event.target.value = ''; }
});
auditionCases.forEach(([name], index) => { const option = el('option', '', name); option.value = index; $('#audition-case').append(option); });
const notes = {};
function selectAudition() { $('#audition-text').value = auditionCases[Number($('#audition-case').value)][2]; $('#audition-score').value = notes[$('#audition-case').value] || ''; }
$('#open-audition').addEventListener('click', () => { endVoice(); selectAudition(); $('#audition-dialog').showModal(); });
$('#audition-case').addEventListener('change', selectAudition);
$('#audition-score').addEventListener('input', event => { notes[$('#audition-case').value] = event.target.value; });
$('#audition-play').addEventListener('click', () => { interrupt(); output.unlock().catch(() => {}); speak($('#audition-text').value, auditionCases[Number($('#audition-case').value)][1]); });
$('#audition-stop').addEventListener('click', interrupt);
$('#audition-dialog').addEventListener('close', interrupt);
$('#audition-export').addEventListener('click', () => {
  const result = { date: new Date().toISOString(), provider: state.config.ttsProvider, voice: state.settings.voice, ratings: Object.entries(notes).map(([index, note]) => ({ sample: auditionCases[index][0], note })) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })); const link = el('a'); link.href = url; link.download = 'hiraya-voice-audition.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});

async function boot() {
  const bootstrap = await request('/api/bootstrap'); Object.assign(state, bootstrap);
  void avatar.configure();
  document.title = `${state.config.appName} · A little company`;
  document.querySelectorAll('[data-app-name]').forEach(node => { node.textContent = state.config.appName; });
  document.querySelectorAll('[data-character-name]').forEach(node => { node.textContent = state.config.characterName; });
  $('#provider-badge').textContent = state.config.chatProvider === 'demo' ? '◌  Offline demo' : `◌  ${state.config.chatProvider === 'ollama' ? 'Local AI configured' : 'Cloud AI configured'}`;
  renderMemories(); renderSettings();
  const saved = localStorage.getItem('hiraya-session');
  if (state.sessions.length) await loadSession(state.sessions.find(s => s.id === saved)?.id || state.sessions[0].id); else await newSession();
}
boot().catch(error => { toast(`Could not start: ${error.message}`, true); $('#activity').textContent = 'Could not connect to the local server. Start it with npm start, then reload.'; });
