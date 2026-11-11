import { MaoAvatar } from './mao-avatar.js';
export const avatarMarkup = `<svg class="avatar-svg" data-emotion="warm" viewBox="0 0 300 330" role="img" aria-label="Original illustrated companion with dark hair, a star clip and a sage cardigan">
  <ellipse cx="150" cy="309" rx="87" ry="10" fill="#b8c7a5" opacity=".35"/>
  <path d="M71 207C54 132 62 53 145 46c89-6 102 80 86 165l-18 61H85z" fill="#303e39"/>
  <path d="M71 305c1-59 24-88 79-88s79 29 79 88" fill="#869a79" stroke="#596f59" stroke-width="3"/>
  <path d="M121 216l29 30 29-30 8 91h-73z" fill="#f5ebce"/>
  <path d="M117 220l-12 45 32-11-16-34M183 220l12 45-32-11 16-34" fill="#a7b998" stroke="#73896a" stroke-width="2"/>
  <path d="M96 268l-4 37M204 268l4 37" stroke="#617958" stroke-width="3" stroke-linecap="round"/>
  <circle cx="154" cy="277" r="3" fill="#a1a382"/><circle cx="154" cy="295" r="3" fill="#a1a382"/>
  <g class="avatar-head">
    <path d="M132 190v32q18 19 36 0v-32" fill="#e6b990"/>
    <ellipse cx="88" cy="151" rx="12" ry="18" fill="#eac5a1"/><ellipse cx="212" cy="151" rx="12" ry="18" fill="#eac5a1"/>
    <path d="M87 117c0-48 126-49 126 0v39c0 40-29 61-63 61s-63-21-63-61z" fill="#f2d1ae"/>
    <path d="M78 127c-7-52 22-80 72-80 53 0 79 36 72 86-16-9-39-23-48-46-18 29-52 34-77 34l-7 47z" fill="#33453d"/>
    <path d="M92 99c21-27 39-33 61-34M180 66c18 7 30 19 34 37" fill="none" stroke="#526151" stroke-width="5" stroke-linecap="round"/>
    <path class="avatar-brow left" d="M111 131q11-7 22-1" fill="none" stroke="#59604a" stroke-width="3" stroke-linecap="round"/>
    <path class="avatar-brow right" d="M168 130q11-6 22 1" fill="none" stroke="#59604a" stroke-width="3" stroke-linecap="round"/>
    <g class="avatar-eye left"><ellipse cx="122" cy="150" rx="8" ry="11" fill="#384a3b"/><circle cx="125" cy="146" r="2.5" fill="#fff9e7"/><path d="M112 143l-3-3" stroke="#384a3b" stroke-width="3" stroke-linecap="round"/></g>
    <g class="avatar-eye right"><ellipse cx="179" cy="150" rx="8" ry="11" fill="#384a3b"/><circle cx="182" cy="146" r="2.5" fill="#fff9e7"/><path d="M188 143l3-3" stroke="#384a3b" stroke-width="3" stroke-linecap="round"/></g>
    <ellipse class="cheek" cx="107" cy="171" rx="13" ry="6" fill="#db8e7b" opacity=".35"/><ellipse class="cheek" cx="194" cy="171" rx="13" ry="6" fill="#db8e7b" opacity=".35"/>
    <path d="M151 158l-3 9 4 1" fill="none" stroke="#d5aa87" stroke-width="2" stroke-linecap="round"/>
    <path class="avatar-mouth-smile" d="M139 182q11 11 22 0" fill="none" stroke="#a96d5b" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse class="avatar-mouth-open" cx="150" cy="186" rx="9" ry="9" fill="#8c5044"/><path d="M213 100l4 8 9 1-6 7 1 9-8-4-8 4 1-9-6-7 9-1z" fill="#e8c475" stroke="#b89956" stroke-width="1.5"/>
    <path d="M78 154q-6 46 13 65M221 151q9 47-12 69" fill="none" stroke="#33453d" stroke-width="14" stroke-linecap="round"/>
  </g>
  <path d="M166 274h26v23q-13 8-26 0z" fill="#c6a079"/><path d="M192 279q14-1 10 11-2 6-10 4" fill="none" stroke="#c6a079" stroke-width="4"/>
  <path d="M175 267q-5-6 0-11M183 268q-5-7 0-12" fill="none" stroke="#c4ccb3" stroke-width="2" stroke-linecap="round"/>
</svg>`;

export class Avatar {
  constructor(element, broadcast = true) {
    this.element = element; element.innerHTML = avatarMarkup; this.svg = element.querySelector('svg');
    this.channel = !globalThis.zyrahDesktop && typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('hiraya-avatar-v1') : null;
    this.broadcast = broadcast;
    this.state = { emotion: 'warm', mouth: 0, speaking: false };
    this.visible = true; this.disposed = false;
    if (!broadcast && this.channel) this.channel.onmessage = event => this.update(event.data, false);
  }
  async configure() {
    try {
      const response = await fetch('/api/avatar'); if (!response.ok) throw new Error('Avatar configuration could not be loaded.');
      const config = await response.json(); if (this.disposed || config.provider === 'svg') return;
      this.element.classList.add('mao-selected');
      this.svg = null; this.element.replaceChildren();
      const info = document.querySelector('#avatar-model-info');
      if (info) {
        info.replaceChildren(); const link = document.createElement('a'); link.href = config.creditUrl; link.target = '_blank'; link.rel = 'noopener'; link.textContent = config.credit; info.append(link);
      }
      if (!config.modelReady) throw new Error(config.error);
      if (!config.runtimeReady) throw new Error('Mao is selected. Install the Live2D runtime using MODEL_SETUP.md, then reload.');
      this.renderer = new MaoAvatar(this.element); await this.renderer.mount(config);
      if (this.disposed) return;
      this.renderer.update(this.state); this.renderer.setVisible(this.visible);
    } catch (error) {
      if (this.disposed) return;
      this.renderer?.destroy(); this.renderer = null; this.svg = null;
      const message = document.createElement('p'); message.className = 'avatar-setup-message'; message.setAttribute('role', 'status'); message.textContent = error.message;
      this.element.replaceChildren(message);
    }
  }
  setVisible(visible) { this.visible = visible; this.renderer?.setVisible(visible); }
  destroy() { this.disposed = true; this.renderer?.destroy(); this.channel?.close(); }
  update(next, publish = true) {
    this.state = { ...this.state, ...next };
    const { emotion, mouth, speaking } = this.state;
    if (this.svg) {
      this.svg.dataset.emotion = emotion;
      this.svg.dataset.state = this.state.state || 'idle';
      this.svg.style.setProperty('--mouth', Math.max(.05, Math.min(1, Number(mouth) || 0)));
      this.svg.classList.toggle('speaking', speaking);
    }
    this.renderer?.update(this.state);
    if (this.broadcast && publish) this.channel?.postMessage({ version: 1, ...this.state });
    this.element.dispatchEvent(new CustomEvent('hiraya:avatar', { detail: { version: 1, ...this.state } }));
  }
}
