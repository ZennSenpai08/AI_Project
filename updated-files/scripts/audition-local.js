import { configFromEnv } from '../server/config.js';
import { Providers } from '../server/providers.js';
import { auditionCases } from '../public/audition.js';
import { spokenText } from '../public/audio-core.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const config=configFromEnv({...process.env,TTS_PROVIDER:'local'});
const engines=(process.env.AUDITION_ENGINES||config.localTtsModel).split(',').map(s=>s.trim()).filter(s=>/^[a-z0-9._-]{1,60}$/i.test(s)).slice(0,3);
const folder=join('artifacts','audition',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(folder,{recursive:true});
const results=[];
for(const engine of engines){const provider=new Providers({...config,localTtsModel:engine});for(const [index,sample] of auditionCases.entries()){
  const start=performance.now();try{const audio=await provider.speech(spokenText(sample[2]),sample[1],undefined,1);const name=`${engine}-${index+1}.mp3`;writeFileSync(join(folder,name),audio);results.push({engine,sample:sample[0],text:sample[2],file:name,synthesisMs:Math.round(performance.now()-start),bytes:audio.length,listeningReview:null});}
  catch(error){results.push({engine,sample:sample[0],error:error.message});break;}
}}
writeFileSync(join(folder,'results.json'),JSON.stringify({at:new Date().toISOString(),voice:config.localTtsVoice,results,note:'Synthesis readiness, not end-to-end playback latency. Human ratings and GPU measurements are not fabricated.'},null,2));
console.log(folder);if(results.some(r=>r.error))process.exitCode=1;
