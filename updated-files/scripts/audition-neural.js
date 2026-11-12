import { configFromEnv } from '../server/config.js';
import { NeuralTTS, neuralVoices } from '../server/neural-tts.js';
import { auditionCases } from '../public/audition.js';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
const config=configFromEnv({...process.env,TTS_PROVIDER:'omnivoice'});
const folder='artifacts/voice-v2';mkdirSync(folder,{recursive:true});mkdirSync(config.neuralTtsReferences,{recursive:true});
const results=existsSync(join(folder,'results.json')) ? JSON.parse((await import('node:fs')).readFileSync(join(folder,'results.json'),'utf8')).results : [];
for(const voice of neuralVoices.slice(0,2)) {
  const reference=join(config.neuralTtsReferences,voice.id+'.wav');
  if(!existsSync(reference)) {
    const design=new NeuralTTS({...config,neuralDesignMode:true});
    // Original generated voice, no real speaker reference. Use English design,
    // the engine's documented stronger design language, then hold its identity
    // through the same generated reference for all Filipino/Taglish speech.
    const anchor='Hello, I am Zyrah. We can take our time, share a little story, and figure things out together.';
    const wav=await design.speech(anchor,voice.id,'en');
    writeFileSync(reference,wav);writeFileSync(join(config.neuralTtsReferences,voice.id+'.txt'),anchor);
    console.log(JSON.stringify({stage:'original-reference',voice:voice.id,...design.last}));
  }
  const rvq=join(config.neuralTtsReferences,voice.id+'.rvq');
  if(!existsSync(rvq))execFileSync(join(dirname(config.neuralTtsExe),'omnivoice-codec.exe'),['--model',config.neuralTtsCodec,'--device',config.neuralTtsDevice,'-i',reference],{windowsHide:true,stdio:'ignore',timeout:180000});
  const engine=new NeuralTTS(config);
  for(const [i,[name,_emotion,text]] of auditionCases.slice(0,6).entries()) {
    const file=`${voice.id}-${i+1}.wav`;
    if(existsSync(join(folder,file)))continue;
    const wav=await engine.speech(text,voice.id,'fil');writeFileSync(join(folder,file),wav);
    results.push({sample:i+1,name,text,file,...engine.last});
    writeFileSync(join(folder,'results.json'),JSON.stringify({humanPreference:null,qualityApproved:false,results},null,2));
    console.log(JSON.stringify(results.at(-1)));
  }
  const file=`${voice.id}-laugh.wav`;
  if(!existsSync(join(folder,file))){const wav=await engine.speech('[laughter] Uy, gumagana na!',voice.id,'fil');writeFileSync(join(folder,file),wav);console.log(JSON.stringify({file,...engine.last}));}
}
