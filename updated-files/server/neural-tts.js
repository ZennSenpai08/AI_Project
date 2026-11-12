import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';

export const neuralVoices = Object.freeze([
  { id:'zyrah-warm-v1', name:'Candidate A · warm adult', instruct:'female, young adult, moderate pitch', seed:41 },
  { id:'zyrah-soft-v1', name:'Candidate B · softer adult', instruct:'female, young adult, low pitch', seed:73 },
]);
const cancelled = () => new DOMException('Speech replaced or cancelled','AbortError');
export class NeuralTTS {
  constructor(config, spawnWorker = spawn) { this.config=config; this.spawnWorker=spawnWorker; this.children=new Set(); this.exits=new Map(); this.generation=0; this.last=null; }
  ready() { return [this.config.neuralTtsExe,this.config.neuralTtsModel,this.config.neuralTtsCodec].every(p=>p && existsSync(p)); }
  stop() { this.generation++; for (const child of this.children) child.kill(); }
  async speech(text, voiceId, language, signal) {
    const voice=neuralVoices.find(v=>v.id===voiceId);
    if (!voice) throw Object.assign(new Error('Choose an installed neural voice profile.'),{status:400});
    if (!this.ready()) throw Object.assign(new Error('Neural voice files are missing. Run the explicit neural voice setup; system voice fallback is disabled.'),{status:503});
    if(signal?.aborted)throw signal.reason;
    // Latest request owns synthesis. Wait for owned processes to exit before
    // allocating the next GPU context; HTTP abort delivery can lag the next turn.
    this.stop(); const generation=this.generation;
    await Promise.all(this.exits.values());
    const check=()=>{if(signal?.aborted)throw signal.reason;if(generation!==this.generation)throw cancelled();};check();
    const directory=await mkdtemp(join(tmpdir(),'zyrah-tts-')); const output=join(directory,'speech.wav');
    const reference=join(this.config.neuralTtsReferences,voice.id+'.wav');
    const transcript=join(this.config.neuralTtsReferences,voice.id+'.txt');
    const encodedReference=join(this.config.neuralTtsReferences,voice.id+'.rvq');
    const started=performance.now();let ownedChild;
    try {
      check();
      if(!this.config.neuralDesignMode && (!existsSync(reference)||!existsSync(transcript))) throw new Error('The selected original neural voice reference is missing. Run the explicit voice audition/setup; no fallback was used.');
      const useReference=!this.config.neuralDesignMode && existsSync(reference) && existsSync(transcript);
      const words=text.trim().split(/\s+/).length;
      const duration=Math.min(28,Math.max(2,words/2.5+.25));
      await new Promise((resolve,reject)=>{
        const child=this.spawnWorker(this.config.neuralTtsExe,['--device',this.config.neuralTtsDevice || 'CPU','--model',this.config.neuralTtsModel,'--codec',this.config.neuralTtsCodec,
          '--lang',language==='en'?'English':'Filipino','--instruct',voice.instruct,'--seed',String(voice.seed),'--steps','32','--duration',String(duration),...(useReference?[existsSync(encodedReference)?'--ref-rvq':'--ref-wav',existsSync(encodedReference)?encodedReference:reference,'--ref-text',transcript]:[]),'-o',output],
          {windowsHide:true,stdio:['pipe','ignore','pipe'],env:{...process.env,OMP_NUM_THREADS:'4'}});
        ownedChild=child;this.children.add(child);let exited;this.exits.set(child,new Promise(r=>exited=r));let settled=false;
        const release=()=>{this.children.delete(child);this.exits.delete(child);exited();};
        const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);error?reject(error):resolve();};
        const cancel=()=>{child.kill();finish(signal.reason);};
        const timer=setTimeout(()=>{child.kill();finish(new Error('Neural speech timed out. Text remains available; no system voice was substituted.'));},this.config.neuralTtsTimeoutMs || 180000);
        // Native logs may include input. Drain without forwarding text or recordings.
        child.stderr.on('data',()=>{});
        child.on('error',()=>{release();finish(new Error('The neural speech runtime could not start. Check its local runtime files.'));});
        child.on('close',code=>{release();finish(signal?.aborted?signal.reason:generation!==this.generation?cancelled():code===0?null:new Error(`Neural speech failed (exit ${code}). No system voice fallback was used.`));});
        child.stdin.on('error',()=>{});signal?.addEventListener('abort',cancel,{once:true});
        if(signal?.aborted)cancel();else child.stdin.end(text,'utf8');
      });
      check();const wav=await readFile(output);check();
      if(wav.length<44 || wav.toString('ascii',0,4)!=='RIFF')throw new Error('Neural speech produced invalid audio.');
      this.last={provider:'omnivoice',model:basename(this.config.neuralTtsModel),backend:this.config.neuralTtsDevice || 'CPU',voice:voice.id,language:language==='en'?'en':'fil',synthesisMs:Math.round(performance.now()-started),bytes:wav.length,referenceVersion:useReference?voice.id:'design-bootstrap',referenceEncoding:useReference && existsSync(encodedReference)?'rvq':'wav',fallback:null};
      return wav;
    } finally {await this.exits.get(ownedChild);await rm(directory,{recursive:true,force:true});}
  }
}

