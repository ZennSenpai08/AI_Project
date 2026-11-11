import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { resolve, relative, isAbsolute, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const runtimeNames = ['live2dcubismcore.min.js', 'pixi.min.js', 'unsafe-eval.js', 'cubism4.min.js'];
export function containedPath(base, name) {
  if (typeof name !== 'string' || !name || name.includes('\\') || name.includes('\0') || name.split('/').some(s => s === '..') || isAbsolute(name)) throw new Error('Invalid model asset path');
  const target = resolve(base, name); const rel = relative(base, target);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error('Invalid model asset path');
  if (existsSync(target)) {
    const realRelative = relative(realpathSync(base), realpathSync(target));
    if (realRelative.startsWith('..') || isAbsolute(realRelative)) throw new Error('Model asset escapes its directory');
  }
  return target;
}
export class AvatarAssets {
  constructor({ root = project, provider = 'live2d' } = {}) {
    this.root = root; this.provider = provider; this.modelRoot = resolve(root, 'mao_en/runtime');
    this.vendorRoot = resolve(root, 'public/vendor/live2d'); this.paths = new Map(); this.problem = null;
    try {
      this.manifest = JSON.parse(readFileSync(resolve(this.modelRoot, 'mao_pro.model3.json'), 'utf8'));
      const refs = this.manifest.FileReferences;
      if (this.manifest.Version !== 3 || !refs?.Moc || !Array.isArray(refs.Textures)) throw new Error('Invalid Mao model manifest');
      const names = ['mao_pro.model3.json', refs.Moc, ...refs.Textures, refs.Physics, refs.Pose, refs.DisplayInfo,
        ...(refs.Expressions || []).map(e => e.File), ...Object.values(refs.Motions || {}).flat().map(m => m.File)].filter(Boolean);
      for (const name of new Set(names)) {
        if (!['.json', '.moc3', '.png'].includes(extname(name))) throw new Error('Unsupported model asset');
        const file = containedPath(this.modelRoot, name);
        if (!statSync(file).isFile()) throw new Error('Missing model asset');
        this.paths.set(`/models/mao/${name}`, name);
      }
    } catch { this.problem = 'Mao model assets are incomplete. Restore mao_en/runtime from your supplied model.'; this.paths.clear(); }
  }
  status() {
    const missing = runtimeNames.filter(name => !existsSync(resolve(this.vendorRoot, name)));
    return { provider: this.provider, modelUrl: '/models/mao/mao_pro.model3.json', modelReady: !this.problem, runtimeReady: missing.length === 0,
      missingRuntime: missing, error: this.problem, credit: 'Niziiro Mao · Illustration & modeling © Live2D Inc.', creditUrl: '/models/mao-license.txt',
      lipSyncIds: this.manifest?.Groups?.find(g => g.Name === 'LipSync')?.Ids || ['ParamA'] };
  }
  asset(path) {
    if (this.paths.has(path)) { const name = this.paths.get(path); return { path: containedPath(this.modelRoot, name), type: extname(name) === '.json' ? 'application/json' : extname(name) === '.png' ? 'image/png' : 'application/octet-stream' }; }
    const name = path.startsWith('/vendor/live2d/') ? path.slice('/vendor/live2d/'.length) : '';
    if (runtimeNames.includes(name) && existsSync(resolve(this.vendorRoot, name))) return { path: containedPath(this.vendorRoot, name), type: 'text/javascript; charset=utf-8' };
    if (path === '/models/mao-license.txt') return { path: containedPath(resolve(this.root, 'mao_en'), 'ReadMe.txt'), type: 'text/plain; charset=utf-8' };
    return null;
  }
}
