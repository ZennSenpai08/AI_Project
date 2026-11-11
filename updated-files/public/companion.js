import { Avatar } from './avatar.js';
const desktop = window.zyrahDesktop;
const avatar = new Avatar(document.querySelector('#avatar'), false);
await avatar.configure();
let hidden = false, pointer = null, timer;
desktop?.onAvatar(state => { if (hidden) return; avatar.update(state, false); document.querySelector('#status').textContent = state.speaking || state.state === 'speaking' ? 'Speaking' : state.state === 'listening' ? 'Mic on' : 'Mic off'; });
desktop?.onLifecycle(state => { hidden = state.hidden; avatar.update({ cancel: state.epoch, speaking: false, mouth: 0, cue: null }, false); avatar.setVisible(!hidden); document.querySelector('#pin').textContent = state.pinned ? '◆' : '◇'; document.querySelector('#status').textContent = 'Mic off'; if (hidden) desktop.acknowledge(state.epoch); });
document.querySelector('#chat').onclick = () => desktop?.action('chat');
document.querySelector('#hide').onclick = () => desktop?.action('hide');
document.querySelector('#pin').onclick = async () => { const state = await desktop.getState(); desktop.action('pin', !state.pinned); };
const character = document.querySelector('#character');
character.onpointerdown = event => { if (event.button !== 0) return; pointer = event.pointerId; character.setPointerCapture(pointer); desktop?.drag('start'); };
character.onpointermove = () => { if (pointer !== null) desktop?.drag('move'); };
character.onpointerup = event => { if (pointer === event.pointerId) { desktop?.drag('end'); character.releasePointerCapture(pointer); pointer = null; } };
character.onpointercancel = () => { pointer = null; desktop?.drag('cancel'); };
// Downsample actual rendered alpha, including visible setup errors and footer. No invisible rectangle.
const mask = document.createElement('canvas'); mask.width = 32; mask.height = 48;
const context = mask.getContext('2d', { willReadFrequently: true });
timer = setInterval(() => {
  if (hidden || !desktop) return; context.clearRect(0,0,32,48);
  const canvas = avatar.renderer?.canvas;
  if (canvas) { avatar.renderer.app.render(); context.drawImage(canvas, 0,0,32,44); }
  const data = context.getImageData(0,0,32,48).data; const map = Array.from({length:32*48},(_,i)=> data[i*4+3] > 20 ? 1 : 0);
  for(let y=44;y<48;y++)for(let x=1;x<31;x++)map[y*32+x]=1;
  if (!canvas) for(let y=8;y<40;y++)for(let x=2;x<30;x++)map[y*32+x]=1;
  desktop.hitMap(map);
},250);
window.addEventListener('pagehide', () => { clearInterval(timer); avatar.destroy(); });
if (desktop) { const state = await desktop.getState(); hidden = state.hidden; avatar.setVisible(!hidden); }
