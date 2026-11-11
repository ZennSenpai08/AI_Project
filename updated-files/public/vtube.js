// Optional local-only VTube Studio adapter. No connection until the user enables it.
export class VTubeAdapter {
  constructor({ onStatus = () => {}, socketFactory = url => new WebSocket(url) } = {}) {
    this.onStatus = onStatus; this.socketFactory = socketFactory; this.pending = new Map(); this.last = 0; this.ready = false; this.state = { mouth: 0, speaking: false }; this.generation = 0;
  }
  request(messageType, data = {}, timeout = 10000) {
    if (!this.socket || this.socket.readyState !== 1) return Promise.reject(new Error('VTube Studio is disconnected.'));
    const requestID = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(requestID); reject(new Error('VTube Studio request timed out.')); }, timeout);
      this.pending.set(requestID, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ apiName: 'VTubeStudioPublicAPI', apiVersion: '1.0', requestID, messageType, data }));
    });
  }
  async connect({ port = 8001, mouthParameter = 'MouthOpen', hotkeys = {} } = {}) {
    if (!Number.isInteger(port) || port < 1024 || port > 65535 || !/^[\w -]{1,64}$/.test(mouthParameter)) throw new Error('Invalid VTube Studio connection settings.');
    this.disconnect(); const generation = this.generation; this.mouthParameter = mouthParameter; this.hotkeys = hotkeys;
    this.onStatus('Connecting to local VTube Studio…');
    const socket = this.socketFactory(`ws://127.0.0.1:${port}`); this.socket = socket;
    socket.onmessage = ({ data }) => {
      let message; try { message = JSON.parse(data); } catch { return; }
      const pending = this.pending.get(message.requestID); if (!pending) return;
      clearTimeout(pending.timer); this.pending.delete(message.requestID);
      if (message.messageType === 'APIError') pending.reject(new Error(message.data?.message || 'VTube Studio rejected the request.')); else pending.resolve(message.data || {});
    };
    socket.onclose = () => { if (generation === this.generation) this.disconnect(); };
    try {
      await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Cannot connect to VTube Studio. Enable its local API.')), 5000); socket.onopen = () => { clearTimeout(timer); resolve(); }; socket.onerror = () => { clearTimeout(timer); reject(new Error('VTube Studio connection failed.')); }; });
      const identity = { pluginName: 'Hiraya Companion', pluginDeveloper: 'Hiraya Local App' };
      this.onStatus('Approve Hiraya Companion in VTube Studio…');
      const token = await this.request('AuthenticationTokenRequest', identity, 60000);
      if (generation !== this.generation) return;
      const result = await this.request('AuthenticationRequest', { ...identity, authenticationToken: token.authenticationToken });
      if (!result.authenticated) throw new Error('VTube Studio authentication was denied.');
      this.ready = true; this.onStatus('VTube Studio connected');
      this.timer = setInterval(() => this.sendState(), 100);
    } catch (error) { this.disconnect(); throw error; }
  }
  update(state) { this.state = { ...this.state, ...state }; }
  async sendState() {
    if (!this.ready || this.sending) return;
    this.sending = true;
    try {
      await this.request('InjectParameterDataRequest', { faceFound: true, mode: 'set', parameterValues: [{ id: this.mouthParameter, value: this.state.speaking ? Math.max(0, Math.min(1, this.state.mouth || 0)) : 0, weight: 1 }] });
      if (this.state.emotion !== this.lastEmotion && this.hotkeys[this.state.emotion]) await this.request('HotkeyTriggerRequest', { hotkeyID: this.hotkeys[this.state.emotion] });
      this.lastEmotion = this.state.emotion;
    } catch (error) { this.onStatus(error.message); this.disconnect(false); }
    finally { this.sending = false; }
  }
  disconnect(notify = true) {
    this.generation++; this.ready = false; clearInterval(this.timer);
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new Error('VTube Studio disconnected.')); } this.pending.clear();
    if (this.socket) { this.socket.onclose = null; this.socket.close(); this.socket = null; }
    if (notify) this.onStatus('VTube Studio off');
  }
}
