import { LocalSTT } from '../server/local-stt.js';
import { configFromEnv } from '../server/config.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const normalize = s => s.normalize('NFC').toLowerCase().replace(/[\p{P}\p{S}]/gu,' ').trim().split(/\s+/).filter(Boolean);
function errors(reference, actual) {
  const a=normalize(reference),b=normalize(actual),d=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
  for(let i=0;i<=a.length;i++)d[i][0]=i;for(let j=0;j<=b.length;j++)d[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  let i=a.length,j=b.length,substitutions=0,omissions=0,insertions=0;
  while(i||j){if(i&&j&&d[i][j]===d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)){if(a[i-1]!==b[j-1])substitutions++;i--;j--;}else if(i&&d[i][j]===d[i-1][j]+1){omissions++;i--;}else{insertions++;j--;}}
  return {substitutions,omissions,insertions,referenceWords:a.length,wordErrorRate:a.length?d[a.length][b.length]/a.length:null};
}
const samples=[{file:'artifacts/voice-v2/zyrah-warm-v1-1.wav',reference:'Hi! Ako si Zyrah. Kumusta ang araw mo?'},{file:'artifacts/speech/english.wav',reference:'Hello Zyrah. The database connection is ready.'}].filter(x=>existsSync(x.file));
const results=[];
for(const model of ['tiny','base']){
  const engine=new LocalSTT(configFromEnv({WHISPER_MODEL_PATH:`speech/models/${model}`}));
  try{for(const sample of samples)for(const language of ['auto','fil','en']){const start=performance.now();const text=await engine.transcribe(readFileSync(sample.file),undefined,language);results.push({model,language,file:sample.file,reference:sample.reference,rawTranscript:text,elapsedMs:Math.round(performance.now()-start),diagnostics:engine.diagnostics,...errors(sample.reference,text)});}}
  finally{engine.stop();}
}
writeFileSync('artifacts/voice-v2/stt-comparison.json',JSON.stringify({source:'synthetic speech only; not human microphone quality evidence',normalization:'NFC, lowercase, punctuation/symbols replaced with spaces, whitespace tokens; names not corrected',results},null,2));
console.log(JSON.stringify(results.map(({model,language,rawTranscript,elapsedMs,wordErrorRate})=>({model,language,rawTranscript,elapsedMs,wordErrorRate}))));
