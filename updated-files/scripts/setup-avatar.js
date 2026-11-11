import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = resolve(root, 'public/vendor/live2d');
const core = process.argv[2] ? resolve(process.argv[2]) : resolve(destination, 'live2dcubismcore.min.js');
const sources = [
  [core, 'live2dcubismcore.min.js'],
  [resolve(root, 'avatar-runtime/node_modules/pixi.js/dist/pixi.min.js'), 'pixi.min.js'],
  [resolve(root, 'avatar-runtime/node_modules/@pixi/unsafe-eval/dist/unsafe-eval.js'), 'unsafe-eval.js'],
  [resolve(root, 'avatar-runtime/node_modules/pixi-live2d-display-lipsyncpatch/dist/cubism4.min.js'), 'cubism4.min.js'],
];
const missing = sources.filter(([source]) => !existsSync(source));
if (missing.length) {
  console.error('Live2D runtime setup is incomplete.\n1. Run: npm --prefix avatar-runtime install\n2. Get Cubism SDK for Web from https://www.live2d.com/en/sdk/download/web/ and review its terms.\n3. Run: npm run setup:avatar -- "C:\\path\\to\\Core\\live2dcubismcore.min.js"\nMissing: ' + missing.map(([, name]) => name).join(', '));
  process.exitCode = 1;
} else {
  const coreText = readFileSync(core, 'utf8');
  if (!coreText.includes('Live2DCubismCore')) throw new Error('The supplied file is not a Cubism Core JavaScript runtime.');
  mkdirSync(destination, { recursive: true });
  for (const [source, name] of sources) if (resolve(source) !== resolve(destination, name)) copyFileSync(source, resolve(destination, name));
  for (const [pkg, target] of [['pixi.js', 'PIXI-LICENSE.txt'], ['@pixi/unsafe-eval', 'PIXI-CSP-LICENSE.txt'], ['pixi-live2d-display-lipsyncpatch', 'DISPLAY-LICENSE.txt']]) {
    const directory = resolve(root, 'avatar-runtime/node_modules', pkg);
    const license = ['LICENSE', 'LICENSE.txt', 'LICENSE.md'].map(name => resolve(directory, name)).find(existsSync);
    if (license) copyFileSync(license, resolve(destination, target));
  }
  writeFileSync(resolve(destination, 'RUNTIME-NOTICE.txt'), 'Cubism Core is obtained from the official Live2D SDK or the checksum-pinned official runtime URL and remains subject to its SDK terms. Preserve the SDK license documents. PixiJS 7.4.3 and pixi-live2d-display-lipsyncpatch 0.5.0-ls-8 retain their upstream licenses.\n');
  console.log('Mao browser runtime installed locally. Restart Zyrah and reload the page.');
}
