import { cpSync, existsSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { resolve, join } from 'node:path';
// Explicit allowlist: .env, private databases, logs, tests and editor source assets never enter the package.
const root=resolve('.');const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const target=join(root,'artifacts',`Zyrah-win32-x64-${stamp}`);
if(process.platform!=='win32'||process.arch!=='x64')throw new Error('Build this portable Windows artifact on Windows x64.');
for(const file of ['node_modules/electron/dist/electron.exe','public/vendor/live2d/live2dcubismcore.min.js','public/vendor/live2d/cubism4.min.js'])if(!existsSync(file))throw new Error(`Missing ${file}. Run desktop and avatar setup first.`);
mkdirSync(target,{recursive:true});cpSync('node_modules/electron/dist',target,{recursive:true});
renameSync(join(target,'electron.exe'),join(target,'Zyrah.exe'));
const destination=join(target,'resources/app');mkdirSync(destination,{recursive:true});
for(const name of ['desktop','server','public','characters'])cpSync(name,join(destination,name),{recursive:true});
for(const name of ['README.md','.env.example','ASSET_LICENSES.md','PROVIDER_SETUP.md','KNOWN_LIMITATIONS.md'])if(existsSync(name))cpSync(name,join(destination,name));
cpSync('../mao_en/runtime',join(destination,'mao_en/runtime'),{recursive:true});cpSync('../mao_en/ReadMe.txt',join(destination,'mao_en/ReadMe.txt'));
writeFileSync(join(destination,'package.json'),JSON.stringify({name:'zyrah-companion',version:'1.0.0',private:true,type:'module',main:'desktop/main.js'},null,2));
writeFileSync(join(target,'START-HERE.txt'),'Run Zyrah.exe. No installer or administrator access is needed. Configuration: resources/app/.env (copy .env.example). User data: %APPDATA%/Zyrah. This is an unsigned private development build; see resources/app/KNOWN_LIMITATIONS.md.\r\n');
writeFileSync('artifacts/latest-package.json',JSON.stringify({path:target,createdAt:new Date().toISOString()},null,2));
console.log(target);
