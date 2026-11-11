import { Avatar } from './avatar.js';
const avatar = new Avatar(document.querySelector('#avatar'), false);
void avatar.configure();
window.addEventListener('pagehide', () => avatar.destroy());
// Avoid leaving an open mouth if the chat page is closed unexpectedly.
let received = Date.now();
avatar.element.addEventListener('hiraya:avatar', () => { received = Date.now(); });
setInterval(() => { if (Date.now() - received > 1500) avatar.update({ mouth: 0, speaking: false }, false); }, 1000);
