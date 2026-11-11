// Shared bounded intent contract. No provider can choose raw parameters or executable code.
export const gestures = Object.freeze(['none', 'wave', 'amused', 'thinking', 'embarrassed', 'tease', 'concern', 'celebrate']);
export const cueEmotions = Object.freeze(['warm', 'playful', 'curious', 'concerned', 'excited', 'calm', 'embarrassed']);
export function cueFor(emotion = 'warm', gesture = 'none', intensity = .35) {
  return { emotion: cueEmotions.includes(emotion) ? emotion : 'calm', gesture: gestures.includes(gesture) ? gesture : 'none', intensity: Math.max(0, Math.min(.7, Number.isFinite(intensity) ? intensity : .35)) };
}
export class PerformanceController {
  constructor(now = () => performance.now()) { this.now = now; this.epoch = 0; this.hidden = false; this.lastGesture = -Infinity; this.cancel(); }
  cancel(hidden = this.hidden) { this.epoch++; this.hidden = hidden; this.pending = null; this.active = null; this.emotion = 'calm'; this.intensity = .2; return this.epoch; }
  restore() { this.hidden = false; }
  queue(cue, turn, segment = 0) { if (this.hidden) return false; this.pending = { ...cueFor(cue?.emotion, cue?.gesture, cue?.intensity), turn, segment, epoch: this.epoch }; return true; }
  start(turn, segment = 0) {
    const cue = this.pending;
    if (this.hidden || !cue || cue.epoch !== this.epoch || cue.turn !== turn || cue.segment !== segment) return false;
    this.pending = null; this.emotion = cue.emotion; this.intensity = cue.intensity;
    const now = this.now();
    if (cue.gesture === 'none' || cue.emotion === 'concerned' || cue.emotion === 'calm') this.active = null;
    if (cue.gesture !== 'none' && (cue.gesture === 'thinking' || cue.gesture === 'concern' || now - this.lastGesture >= 4500)) {
      this.active = { ...cue, start: now, duration: cue.gesture === 'wave' ? 3000 : 2400 };
      if (!['thinking','concern'].includes(cue.gesture)) this.lastGesture = now;
    }
    return true;
  }
  sample() {
    if (this.hidden) return {};
    const t = this.now() / 1000; const amount = this.intensity;
    const p = { ParamBreath: .5 + Math.sin(t * 1.4) * .18, ParamAngleZ: Math.sin(t * .6) * 1.1,
      ParamBodyAngleZ: Math.sin(t * .5) * .5, ParamEyeBallX: Math.sin(t * .23) * .12,
      ParamEyeBallY: 0, ParamCheek: 0, ParamEyeLSmile: 0, ParamEyeRSmile: 0, ParamMouthUp: 0, ParamMouthDown: 0,
      PartArmLA: 1, PartArmLB: 0 };
    if (['warm', 'playful', 'excited'].includes(this.emotion)) { p.ParamMouthUp = amount; p.ParamEyeLSmile = p.ParamEyeRSmile = amount * .55; }
    if (this.emotion === 'concerned') { p.ParamMouthDown = .15; p.ParamAngleZ = -3; p.ParamBodyAngleY = 2; }
    if (this.emotion === 'embarrassed') { p.ParamCheek = amount; p.ParamEyeBallX = .35; p.ParamAngleY = -3; }
    const a = this.active;
    if (!a) return p;
    const u = (this.now() - a.start) / a.duration;
    if (u >= 1) { this.active = null; return p; }
    const smooth = x => x * x * (3 - 2 * x);
    const envelope = smooth(Math.min(1, u / .25)) * smooth(Math.min(1, (1 - u) / .25));
    const e = envelope * a.intensity / .5;
    switch (a.gesture) {
      // Mao has arm transforms, not a VRM skeleton; names/ranges are checked at runtime.
      case 'wave': p.PartArmLA = 1 - envelope; p.PartArmLB = envelope; p.ParamArmLB01 = -8 * e; p.ParamArmLB02 = 8 * e; p.ParamArmLB03 = (-8 + 12 * Math.sin(u * Math.PI * 8)) * e; p.ParamHandLB = 10 * e; p.ParamAngleZ += 4 * e; break;
      case 'amused': p.ParamEyeLSmile = p.ParamEyeRSmile = .65 * e; p.ParamBodyAngleY = Math.sin(u * Math.PI * 8) * 1.4 * e; p.ParamLeftShoulderUp = p.ParamRightShoulderUp = Math.sin(u * Math.PI * 8) * 2 * e; break;
      case 'thinking': p.ParamEyeBallX = .45 * e; p.ParamAngleZ += 6 * e; p.ParamAngleY = 3 * e; break;
      case 'embarrassed': p.ParamCheek = .6 * e; p.ParamEyeBallX = -.5 * e; p.ParamAngleY = -5 * e; break;
      case 'tease': p.ParamAngleZ += 7 * e; p.ParamMouthUp = .55 * e; break;
      case 'concern': p.ParamBodyAngleY = 3 * e; p.ParamAngleZ = -4 * e; break;
      case 'celebrate': p.ParamArmRA01 = p.ParamArmLA01 = 14 * e; p.ParamArmLA02 = p.ParamArmRA02 = -12 * e; p.ParamBodyAngleY = 2 * e; p.ParamEyeLSmile = p.ParamEyeRSmile = .5 * e; break;
    }
    return p;
  }
}
