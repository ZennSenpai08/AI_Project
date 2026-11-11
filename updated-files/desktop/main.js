import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, globalShortcut, powerMonitor, session } from 'electron';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createApp } from '../server/index.js';
import { configFromEnv } from '../server/config.js';
import { recoverBounds, DragTracker, registerRestore } from './geometry.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
app.setName('Zyrah');
if (process.env.ZYRAH_TEST_DATA) app.setPath('userData', process.env.ZYRAH_TEST_DATA);
const single = app.requestSingleInstanceLock();
if (!single) app.quit();
let companion, chat, tray, backend, origin, prefs, prefsPath, quitting = false, quietTimer, hitTimer;
let hidden = false, epoch = 0, hitMap = null, drag = new DragTracker(), quiet = new Set();
const live = win => win && !win.isDestroyed();
const windows = () => [companion, chat].filter(live);
function save() { mkdirSync(dirname(prefsPath), { recursive: true }); writeFileSync(prefsPath, JSON.stringify(prefs, null, 2)); }
function snapshot() { return { hidden, epoch, pinned: prefs.pinned, muted: prefs.muted, shortcut: prefs.shortcut, shortcutError: prefs.shortcutError || '', microphone: prefs.microphone || false }; }
function notify() { for (const win of windows()) win.webContents.send('zyrah:lifecycle', snapshot()); }
function command(name) { if (live(chat) && !hidden) { if (chat.webContents.isLoading()) chat.webContents.once('did-finish-load', () => { if (!hidden && live(chat)) chat.webContents.send('zyrah:command', name); }); else chat.webContents.send('zyrah:command', name); } }
function hide(reason = 'hide') {
  if (hidden) return;
  hidden = true; epoch++; prefs.microphone = false; hitMap = null; drag.end(); quiet.clear(); backend?.cancelAll();
  for (const win of windows()) { win.webContents.setAudioMuted(true); win.webContents.send('zyrah:lifecycle', { ...snapshot(), reason }); win.hide(); }
  // Fail closed: an unresponsive renderer must not retain capture or queued playback.
  clearTimeout(quietTimer); quietTimer = setTimeout(() => { if (hidden) for (const win of windows()) if (!quiet.has(win.webContents.id)) win.destroy(); }, 350);
  updateTray();
}
function restore(openChat = false) {
  if (quitting) return; clearTimeout(quietTimer);
  // A restore before cleanup acknowledgement replaces the old renderers.
  if (hidden) for (const win of windows()) if (!quiet.has(win.webContents.id)) win.destroy();
  if (hidden) { epoch++; prefs.microphone = false; }
  hidden = false;
  createWindows(); companion.setBounds(recoverBounds(companion.getBounds(), screen.getAllDisplays())); companion.showInactive();
  for (const win of windows()) win.webContents.setAudioMuted(Boolean(prefs.muted));
  if (openChat) { chat.show(); chat.focus(); }
  notify(); updateTray();
}
function updateTray() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: hidden ? 'Show Zyrah' : 'Hide companion (stop all audio)', click: () => hidden ? restore() : hide() },
    { label: 'Open chat', click: () => restore(true) },
    { label: 'Microphone', type: 'checkbox', checked: Boolean(prefs.microphone), enabled: !hidden, click: () => command('microphone') },
    { label: 'Mute speech', type: 'checkbox', checked: Boolean(prefs.muted), click: item => setMute(item.checked) },
    { label: 'Always on top', type: 'checkbox', checked: prefs.pinned, click: item => setPin(item.checked) },
    { label: 'Settings', click: () => { restore(true); command('settings'); } },
    { type: 'separator' }, { label: 'Quit Zyrah', click: () => app.quit() },
  ]));
}
function setMute(value) { prefs.muted = value; for (const win of windows()) win.webContents.setAudioMuted(value || hidden); save(); notify(); command(value ? 'mute' : 'unmute'); updateTray(); }
function setPin(value) { prefs.pinned = value; if (live(companion)) companion.setAlwaysOnTop(value); save(); notify(); updateTray(); }
function createWindow(kind) {
  const floating = kind === 'companion';
  const bounds = recoverBounds(floating ? prefs.bounds : prefs.chatBounds, screen.getAllDisplays(), floating ? { width: 340, height: 480 } : { width: 1080, height: 760 });
  const win = new BrowserWindow({ ...bounds, show: false, frame: !floating, transparent: floating, backgroundColor: floating ? '#00000000' : '#f8f6ee', resizable: !floating,
    skipTaskbar: floating, alwaysOnTop: floating && prefs.pinned, title: 'Zyrah',
    webPreferences: { preload: join(root, 'desktop/preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false, webSecurity: true, partition: 'persist:zyrah' } });
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => { if (url !== `${origin}/${floating ? 'companion.html' : ''}`) event.preventDefault(); });
  win.webContents.on('render-process-gone', () => { if (!quitting) { hide('renderer-failure'); for (const other of windows()) other.destroy(); } });
  win.webContents.on('did-finish-load', () => { win.webContents.send('zyrah:lifecycle', snapshot()); if (floating && !hidden) win.showInactive(); });
  win.on('close', event => { if (!quitting) { event.preventDefault(); if (floating) hide(); else win.hide(); } });
  win.on('minimize', () => hide('minimize'));
  win.on('moved', () => { if (quitting) return; prefs[floating ? 'bounds' : 'chatBounds'] = win.getBounds(); save(); });
  win.loadURL(`${origin}/${floating ? 'companion.html' : ''}`);
  return win;
}
function createWindows() { if (!live(companion)) companion = createWindow('companion'); if (!live(chat)) chat = createWindow('chat'); }
function senderKind(event) {
  if (event.senderFrame !== event.sender.mainFrame || !event.senderFrame?.url.startsWith(origin + '/')) return null;
  return live(chat) && event.sender === chat.webContents ? 'chat' : live(companion) && event.sender === companion.webContents ? 'companion' : null;
}
async function start() {
  // dotenv is read in main only; secrets never enter preload or the renderer.
  try { if (existsSync(join(root, '.env'))) process.loadEnvFile(join(root, '.env')); } catch { throw new Error('Could not load application .env'); }
  prefsPath = join(app.getPath('userData'), 'desktop.json');
  try { prefs = JSON.parse(readFileSync(prefsPath, 'utf8')); } catch { prefs = {}; }
  prefs = { pinned: true, muted: false, shortcut: 'Ctrl+Alt+C', ...prefs, microphone: false };
  const secret = randomBytes(32).toString('hex');
  backend = createApp({ ...configFromEnv({ ...process.env, PORT: '0', DATA_DIR: process.env.DATA_DIR || join(app.getPath('userData'), 'data') }), desktopSecret: secret });
  await new Promise((resolve, reject) => { backend.server.once('error', reject); backend.server.listen(0, '127.0.0.1', resolve); });
  origin = `http://127.0.0.1:${backend.server.address().port}`;
  const ses = session.fromPartition('persist:zyrah');
  await ses.cookies.set({ url: origin, name: 'zyrah-app', value: secret, httpOnly: true, sameSite: 'strict', path: '/' });
  const permitted = (webContents, permission, details) => permission === 'media' && !hidden && live(chat) && webContents === chat.webContents && (details.requestingUrl || details.securityOrigin || origin).startsWith(origin) && (!details.mediaTypes || details.mediaTypes.every(type => type === 'audio'));
  ses.setPermissionRequestHandler((wc, permission, callback, details) => callback(permitted(wc, permission, details)));
  ses.setPermissionCheckHandler((wc, permission, _origin, details) => permitted(wc, permission, details));
  ipcMain.handle('zyrah:state', event => { if (!senderKind(event)) throw new Error('Untrusted sender'); return snapshot(); });
  ipcMain.handle('zyrah:action', (event, name, value) => {
    if (!senderKind(event)) throw new Error('Untrusted sender');
    if (name === 'hide') hide();
    else if (name === 'chat') restore(true);
    else if (name === 'pin' && typeof value === 'boolean') setPin(value);
    else if (name === 'mute' && typeof value === 'boolean') setMute(value);
    else if (name === 'microphone' && senderKind(event) === 'chat' && typeof value === 'boolean') { prefs.microphone = !hidden && value; updateTray(); }
    else if (name === 'shortcut') { const result = registerRestore(globalShortcut, prefs.shortcut, value, () => restore()); if (!result.ok) return result; prefs.shortcut = value; prefs.shortcutError = ''; save(); }
    else if (name === 'settings') { restore(true); command('settings'); }
    else throw new Error('Unsupported desktop operation');
    return { ok: true, ...snapshot() };
  });
  ipcMain.on('zyrah:quiet', (event, value) => { if (senderKind(event) && value === epoch && hidden) quiet.add(event.sender.id); });
  ipcMain.on('zyrah:avatar', (event, state) => {
    if (senderKind(event) !== 'chat' || hidden || !state || state.desktopEpoch !== epoch || !live(companion)) return;
    if (!['warm', 'playful', 'curious', 'concerned', 'excited', 'calm', 'embarrassed'].includes(state.emotion)) return;
    const safe = { emotion: state.emotion, mouth: Math.max(0, Math.min(1, Number(state.mouth) || 0)), speaking: state.speaking === true, state: ['idle', 'thinking', 'listening', 'speaking'].includes(state.state) ? state.state : 'idle', cancel: Number(state.cancel) || 0 };
    if (state.cue && typeof state.cue.id === 'string' && state.cue.id.length < 100 && ['none','wave','amused','thinking','embarrassed','tease','concern','celebrate'].includes(state.cue.gesture)) safe.cue = { id: state.cue.id, emotion: safe.emotion, gesture: state.cue.gesture, intensity: Math.max(0, Math.min(.7, Number(state.cue.intensity) || .35)) };
    companion.webContents.send('zyrah:avatar', safe);
  });
  ipcMain.on('zyrah:hit-map', (event, value) => { if (senderKind(event) === 'companion' && Array.isArray(value) && value.length === 32 * 48 && value.every(n => n === 0 || n === 1)) hitMap = value; });
  ipcMain.on('zyrah:drag', (event, phase) => {
    if (senderKind(event) !== 'companion' || hidden) return;
    if (phase === 'start') { drag.begin(screen.getCursorScreenPoint(), companion.getBounds()); companion.setIgnoreMouseEvents(false); }
    if (phase === 'move') { const position = drag.move(screen.getCursorScreenPoint()); if (position) companion.setPosition(Math.round(position.x), Math.round(position.y)); }
    if (phase === 'end') { if (drag.end()) restore(true); prefs.bounds = recoverBounds(companion.getBounds(), screen.getAllDisplays()); companion.setBounds(prefs.bounds); save(); }
    if (phase === 'cancel') drag.end();
  });
  createWindows();
  // Native cursor polling also recovers hit testing when an ignored window receives no DOM events.
  hitTimer = setInterval(() => { if (!live(companion) || hidden || drag.start) return; const point = screen.getCursorScreenPoint(), b = companion.getBounds();
    const x = Math.floor((point.x - b.x) / b.width * 32), y = Math.floor((point.y - b.y) / b.height * 48);
    const hit = x >= 0 && y >= 0 && x < 32 && y < 48 && (hitMap ? hitMap[y * 32 + x] === 1 : y >= 43);
    companion.setIgnoreMouseEvents(!hit, { forward: true });
  }, 50);
  const pixels = Buffer.alloc(16 * 16 * 4); for (let y=0;y<16;y++) for(let x=0;x<16;x++){ const i=(y*16+x)*4; pixels[i]=130;pixels[i+1]=170;pixels[i+2]=110;pixels[i+3]=Math.abs(x-7.5)+Math.abs(y-7.5)<7?255:0; }
  tray = new Tray(nativeImage.createFromBitmap(pixels, { width: 16, height: 16 })); tray.setToolTip('Zyrah · AI companion'); tray.on('click', () => restore(true)); updateTray();
  const registered = registerRestore(globalShortcut, null, prefs.shortcut, () => restore()); prefs.shortcutError = registered.error || ''; notify();
  for (const event of ['display-removed', 'display-metrics-changed', 'display-added']) screen.on(event, () => { for (const win of windows()) win.setBounds(recoverBounds(win.getBounds(), screen.getAllDisplays(), win === companion ? { width: 340, height: 480 } : { width: 1080, height: 760 })); });
  powerMonitor.on('suspend', () => hide('suspend')); powerMonitor.on('lock-screen', () => hide('lock-screen'));
  app.on('second-instance', () => restore(true));
  if (process.env.ZYRAH_OPEN_CHAT === '1') chat.once('ready-to-show', () => chat.show());
}
app.on('window-all-closed', () => {});
app.on('before-quit', event => {
  if (quitting) return; event.preventDefault(); hide('quit'); quitting = true; clearInterval(hitTimer); clearTimeout(quietTimer); globalShortcut.unregisterAll();
  for (const win of windows()) win.destroy(); tray?.destroy(); backend?.close().finally(() => app.exit(0));
});
if (single) app.whenReady().then(start).catch(error => { console.error('Zyrah startup failed:', error.message); quitting = true; app.exit(1); });
