// Pure audio utilities: shared by the browser and deterministic Node tests.
export function rms(samples) {
  if (!samples.length) return 0;
  let sum = 0; for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / samples.length);
}

export function spokenText(text) {
  return text.replace(/```[\s\S]*?```/g, 'The code is shown in the chat.').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`#>]/g, '').replace(/\p{Extended_Pictographic}/gu, '').replace(/\[(?:laughs?|sighs?|giggles?|whispers?)[^\]]*\]/gi, '').trim();
}
export function speechSegments(text, max = 260) {
  const parts = spokenText(text).match(/[^.!?\n]+[.!?\n]*|[.!?]/g) || [];
  const segments = []; let current = '';
  for (const part of parts) {
    if (current.length + part.length > max && current.trim()) { segments.push(current.trim()); current = ''; }
    for (const word of part.split(/\s+/)) {
      if (current.length + word.length > max && current.trim()) { segments.push(current.trim()); current = ''; }
      current += word + ' ';
    }
  }
  if (current.trim()) segments.push(current.trim()); return segments;
}

export function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset, text) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
  write(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36, 'data'); view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) { const s = Math.max(-1, Math.min(1, samples[i])); view.setInt16(44 + i * 2, s < 0 ? s * 32768 : s * 32767, true); }
  return buffer;
}

export class VoiceActivityDetector {
  constructor(sampleRate, { startMs = 120, endMs = 850, maxMs = 20000, threshold = .016 } = {}) {
    this.sampleRate = sampleRate; this.startMs = startMs; this.endMs = endMs; this.maxMs = maxMs; this.threshold = threshold; this.noise = .003; this.reset();
  }
  reset() { this.active = false; this.loudMs = 0; this.quietMs = 0; this.elapsedMs = 0; this.preRoll = []; this.preMs = 0; this.chunks = []; }
  push(samples) {
    const level = rms(samples); const ms = samples.length / this.sampleRate * 1000;
    const voiced = level > Math.max(this.threshold, this.noise * 3.5);
    if (!this.active) {
      this.preRoll.push(samples); this.preMs += ms;
      while (this.preMs > 350 && this.preRoll.length > 1) this.preMs -= this.preRoll.shift().length / this.sampleRate * 1000;
      if (!voiced) this.noise = this.noise * .98 + Math.min(level, .02) * .02;
      this.loudMs = voiced ? this.loudMs + ms : 0;
      if (this.loudMs >= this.startMs) {
        this.active = true; this.chunks = [...this.preRoll]; this.elapsedMs = this.preMs; this.quietMs = 0;
        return { type: 'start', level };
      }
    } else {
      this.chunks.push(samples); this.elapsedMs += ms; this.quietMs = voiced ? 0 : this.quietMs + ms;
      if (this.quietMs >= this.endMs || this.elapsedMs >= this.maxMs) {
        const pcm = new Float32Array(this.chunks.reduce((n, c) => n + c.length, 0));
        let offset = 0; for (const chunk of this.chunks) { pcm.set(chunk, offset); offset += chunk.length; }
        this.reset(); return { type: 'end', level, pcm };
      }
    }
    return { type: 'level', level };
  }
}
