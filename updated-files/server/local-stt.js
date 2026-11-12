import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export class LocalSTT {
  constructor(config, spawnWorker = spawn) { this.config = config; this.spawnWorker = spawnWorker; this.serial = 0; }
  status() {
    return { configured: this.config.sttProvider === 'faster-whisper', modelReady: Boolean(this.config.whisperModelPath && ['model.bin','config.json','tokenizer.json'].every(f => existsSync(resolve(this.config.whisperModelPath, f)))), running: Boolean(this.child), engine: 'faster-whisper', network: 'disabled' };
  }
  transcribe(wav, signal, language = 'auto') {
    if (!['fil','en','auto'].includes(language)) return Promise.reject(new Error('Invalid recognition language.'));
    if (signal?.aborted) return Promise.reject(signal.reason);
    if (this.pending) return Promise.reject(Object.assign(new Error('Transcription is busy. Stop the current recording before starting another.'), { status: 409 }));
    if (!this.status().modelReady) return Promise.reject(Object.assign(new Error('Local STT model is missing. Run the explicit speech setup and set WHISPER_MODEL_PATH to its downloaded model directory.'), { status: 503 }));
    if (!this.child) {
      this.buffer = '';
      this.child = this.spawnWorker(this.config.whisperPython, ['-u', fileURLToPath(new URL('../speech/worker.py', import.meta.url)), this.config.whisperModelPath], {
        windowsHide: true, stdio: ['pipe','pipe','ignore'], env: { ...process.env, HF_HUB_OFFLINE:'1', TRANSFORMERS_OFFLINE:'1', HF_HUB_DISABLE_TELEMETRY:'1', DO_NOT_TRACK:'1' },
      });
      const child = this.child;
      child.stdout.on('data', chunk => {
        if (this.child !== child) return;
        this.buffer += chunk.toString('utf8');
        if (this.buffer.length > 20000) { this.stop(new Error('Local STT returned an oversized response.')); return; }
        let end; while ((end = this.buffer.indexOf('\n')) >= 0) {
          const line = this.buffer.slice(0,end); this.buffer = this.buffer.slice(end+1);
          let result; try { result = JSON.parse(line); } catch { this.stop(new Error('Local STT returned an invalid response.')); return; }
          if (!this.pending || result.id !== this.pending.id) continue;
          if (result.error) this.complete(new Error('Local STT could not load or transcribe. Check speech dependencies and the complete model directory.'));
          else if (typeof result.text !== 'string' || result.text.length > 4000) this.stop(new Error('Local STT returned invalid text.'));
          else { this.diagnostics = result.diagnostics || null; this.complete(null, result.text.trim()); }
        }
      });
      child.once('error', () => { if (this.child === child) this.stop(new Error('Local speech Python could not start. Run speech setup and configure WHISPER_PYTHON.')); });
      child.once('exit', () => { if (this.child === child) { this.child = null; this.complete(new Error('Local STT stopped. Check the Python environment and downloaded model.')); } });
      child.stdin.on('error', () => { if (this.child === child) this.stop(new Error('Local STT input closed. Try recording again.')); });
    }
    return new Promise((resolveResult, reject) => {
      const cancel = () => this.stop(signal.reason);
      const timeout = setTimeout(() => this.stop(new Error('Local transcription timed out. Try a shorter recording.')), this.config.timeoutMs);
      this.pending = { id: ++this.serial, resolve: resolveResult, reject, timeout, signal, cancel };
      signal?.addEventListener('abort', cancel, { once:true });
      if (signal?.aborted) { cancel(); return; }
      this.child.stdin.write(JSON.stringify({ id:this.pending.id, audio:wav.toString('base64'), language: language === 'fil' ? 'tl' : language === 'en' ? 'en' : null })+'\n');
    });
  }
  complete(error, text) { const p = this.pending; if (!p) return; this.pending = null; clearTimeout(p.timeout); p.signal?.removeEventListener('abort', p.cancel); if (error) p.reject(error); else p.resolve(text); }
  stop(error = new DOMException('Transcription cancelled','AbortError')) { const child = this.child; this.child = null; this.buffer = ''; this.complete(error); child?.kill(); }
}
