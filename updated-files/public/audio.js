import { VoiceActivityDetector, encodeWav, rms } from './audio-core.js';

export const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;

export class VoiceInput {
  constructor({ onStart, onAudio, onText, onState, onError, onLevel }) { Object.assign(this, { onStart, onAudio, onText, onState, onError, onLevel }); this.running = false; this.generation = 0; }
  async start(cloud, language, options = {}) {
    if (this.running) return;
    this.running = true; const generation = ++this.generation;
    try {
      if (!cloud) {
        if (!Recognition) throw new Error('Browser dictation is unavailable. Use Chrome/Edge with speech recognition, configure cloud transcription, or type a message.');
        this.startRecognition(language, generation); return;
      }
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access requires localhost or HTTPS in a supported browser.');
      this.onState('Allow microphone access…');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (!this.running || generation !== this.generation) { stream.getTracks().forEach(t => t.stop()); return; }
      this.stream = stream;
      const context = new AudioContext(); this.context = context;
      await context.audioWorklet.addModule('/mic-worklet.js');
      if (!this.running || generation !== this.generation) return;
      await context.resume();
      if (!this.running || generation !== this.generation) { stream.getTracks().forEach(t => t.stop()); await context.close().catch(() => {}); return; }
      const detector = new VoiceActivityDetector(context.sampleRate, { endMs: options.silenceMs || 850, threshold: options.vadThreshold || .016 });
      this.manual = Boolean(options.manual); this.manualChunks = []; this.manualSamples = 0;
      this.node = new AudioWorkletNode(context, 'hiraya-mic');
      this.source = context.createMediaStreamSource(stream);
      // The worklet emits silence; connection keeps processing alive without mic monitoring.
      this.source.connect(this.node); this.node.connect(context.destination);
      this.node.port.onmessage = ({ data }) => {
        if (!this.running || generation !== this.generation) return;
        this.onLevel?.(rms(data));
        if (this.manual) {
          this.manualChunks.push(data); this.manualSamples += data.length;
          if (this.manualSamples >= context.sampleRate * 20) this.finishRecording();
          return;
        }
        const event = detector.push(data);
        if (event.type === 'start') { this.onStart(); this.onState('Listening to you…'); }
        if (event.type === 'end') { this.onState('Transcribing…'); this.onAudio(new Blob([encodeWav(event.pcm, context.sampleRate)], { type: 'audio/wav' })); }
      };
      stream.getTracks().forEach(track => { track.onended = () => { if (this.running) { this.stop(); this.onError(new Error('Microphone disconnected. Start voice again to reconnect.')); } }; });
      this.onState('Listening · speak naturally');
    } catch (error) { if (generation === this.generation) { this.stop(); this.onError(error); } }
  }
  finishRecording() {
    if (!this.context || !this.manual) { this.stop(); return; }
    const pcm = new Float32Array(this.manualSamples); let offset = 0;
    for (const chunk of this.manualChunks) { pcm.set(chunk, offset); offset += chunk.length; }
    const rate = this.context.sampleRate; this.stop();
    if (pcm.length / rate >= .2) this.onAudio(new Blob([encodeWav(pcm, rate)], { type: 'audio/wav' }));
    else this.onError(new Error('Recording was too short. Try again.'));
  }
  startRecognition(language, generation) {
    const recognition = new Recognition(); this.recognition = recognition;
    recognition.lang = language === 'en' ? 'en-PH' : 'fil-PH';
    recognition.continuous = true; recognition.interimResults = true;
    recognition.onspeechstart = () => { if (this.running && generation === this.generation) { this.onStart(); this.onState('Listening to you…'); } };
    recognition.onresult = event => {
      if (!this.running || generation !== this.generation) return;
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
      if (final.trim()) this.onText(final.trim());
    };
    recognition.onerror = event => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      this.stop(); this.onError(new Error(`Browser recognition: ${event.error}. Check microphone access or use text chat.`));
    };
    recognition.onend = () => {
      if (this.running && generation === this.generation) this.onState('Reconnecting microphone…');
      if (this.running && generation === this.generation) this.restartTimer = setTimeout(() => {
        if (this.running && generation === this.generation) { try { recognition.start(); } catch { this.stop(); this.onError(new Error('Recognition stopped. Start voice again.')); } }
      }, 350);
    };
    recognition.start(); this.onState('Listening · browser recognition');
  }
  stop() {
    this.running = false; this.generation++; clearTimeout(this.restartTimer);
    this.recognition?.abort(); this.recognition = null;
    if (this.node) { this.node.port.onmessage = null; this.node.disconnect(); }
    this.source?.disconnect(); this.stream?.getTracks().forEach(t => t.stop());
    this.manualChunks = []; this.manualSamples = 0;
    this.context?.close().catch(() => {}); this.context = null; this.node = null; this.source = null; this.stream = null;
  }
}

export class SpeechOutput {
  constructor(avatar, state) { this.avatar = avatar; this.state = state; this.generation = 0; }
  async unlock() {
    if (!this.context || this.context.state === 'closed') this.context = new AudioContext();
    if (this.context.state === 'suspended') await this.context.resume();
  }
  stop() {
    this.generation++; this.controller?.abort();
    globalThis.speechSynthesis?.cancel();
    if (this.audio) { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); this.audio = null; }
    if (this.url) { URL.revokeObjectURL(this.url); this.url = null; }
    this.source?.disconnect(); this.source = null; this.analyser = null;
    cancelAnimationFrame(this.frame); clearInterval(this.timer); clearTimeout(this.watchdog);
    this.finish?.(); this.finish = null;
    this.avatar.update({ speaking: false, mouth: 0 });
  }
  async speak(text, emotion, config, settings, request, onPlayback = () => {}) {
    this.stop(); const generation = this.generation;
    this.avatar.update({ emotion }); this.state('Preparing voice…');
    if (config.ttsProvider === 'browser') {
      if (!globalThis.speechSynthesis) throw new Error('Speech synthesis is unavailable on this device.');
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = speechSynthesis.getVoices();
      utterance.voice = voices.find(v => v.voiceURI === settings.voice) || voices.find(v => /^(fil|tl)(-|$)/i.test(v.lang)) || voices.find(v => /^en-PH/i.test(v.lang)) || null;
      utterance.lang = settings.language === 'en' ? 'en-PH' : 'fil-PH';
      utterance.rate = emotion === 'concerned' ? .9 : emotion === 'excited' ? 1.05 : .97;
      utterance.rate *= settings.speed || 1; utterance.volume = settings.volume ?? .85;
      utterance.pitch = 1.08;
      await new Promise((resolve, reject) => {
        this.finish = resolve;
        utterance.onstart = () => { if (generation !== this.generation) return; this.state('Speaking · device voice'); onPlayback(); this.avatar.update({ speaking: false, mouth: 0 }); };
        utterance.onend = resolve;
        utterance.onerror = e => e.error === 'interrupted' || e.error === 'canceled' ? resolve() : reject(new Error(`Device voice failed: ${e.error}`));
        this.watchdog = setTimeout(() => { speechSynthesis.cancel(); reject(new Error('Device voice timed out. Try another voice.')); }, 90000);
        speechSynthesis.speak(utterance);
      });
    } else {
      this.controller = new AbortController();
      const response = await request('/api/speech', { method: 'POST', body: { text, emotion }, signal: this.controller.signal, raw: true });
      const blob = await response.blob(); if (generation !== this.generation) return;
      await this.unlock(); if (generation !== this.generation) return;
      this.url = URL.createObjectURL(blob); this.audio = new Audio(this.url);
      this.audio.volume = settings.volume ?? .85;
      if (config.ttsProvider === 'openai') this.audio.playbackRate = settings.speed || 1;
      this.source = this.context.createMediaElementSource(this.audio);
      this.analyser = this.context.createAnalyser(); this.analyser.fftSize = 512;
      this.source.connect(this.analyser); this.analyser.connect(this.context.destination);
      const wave = new Float32Array(this.analyser.fftSize);
      const tick = () => { if (generation !== this.generation || !this.analyser) return; this.analyser.getFloatTimeDomainData(wave); this.avatar.update({ speaking: true, mouth: Math.min(1, rms(wave) * 8) }); this.frame = requestAnimationFrame(tick); };
      await new Promise((resolve, reject) => {
        this.finish = resolve; this.audio.onended = resolve; this.audio.onerror = () => reject(new Error('Audio playback failed.'));
        this.watchdog = setTimeout(() => reject(new Error('Audio playback timed out.')), 90000);
        this.audio.play().then(() => { if (generation === this.generation) { this.state('Speaking…'); onPlayback(); tick(); } }).catch(reject);
      });
    }
    if (generation === this.generation) { this.stop(); this.state('Here with you'); }
  }
}
