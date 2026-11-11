export const maoExpressions = Object.freeze({ warm: 'exp_01', calm: 'exp_01', playful: 'exp_02', curious: 'exp_01', concerned: 'exp_05', excited: 'exp_04' });
let runtimePromise;
function script(source) {
  return new Promise((resolve, reject) => {
    const element = document.createElement('script'); element.src = source;
    const timer = setTimeout(() => { element.remove(); reject(new Error('Live2D runtime loading timed out.')); }, 15000);
    element.onload = () => { clearTimeout(timer); resolve(); }; element.onerror = () => { clearTimeout(timer); element.remove(); reject(new Error('Live2D runtime is missing. Run npm run setup:avatar.')); };
    document.head.append(element);
  });
}
export function loadRuntime() {
  if (!runtimePromise) runtimePromise = (async () => {
    if (!globalThis.Live2DCubismCore) await script('/vendor/live2d/live2dcubismcore.min.js');
    if (!globalThis.PIXI) await script('/vendor/live2d/pixi.min.js');
    // Pixi's official patch removes new Function usage so CSP need not allow JavaScript eval.
    await script('/vendor/live2d/unsafe-eval.js');
    if (!globalThis.PIXI?.live2d?.Live2DModel) await script('/vendor/live2d/cubism4.min.js');
    if (!globalThis.Live2DCubismCore || !globalThis.PIXI?.live2d?.Live2DModel) throw new Error('The Live2D runtime is incompatible. See MODEL_SETUP.md.');
    return globalThis.PIXI;
  })().catch(error => { runtimePromise = null; throw error; });
  return runtimePromise;
}
export function applyMaoLipSync(core, ids, state) {
  const value = state.speaking ? Math.max(0, Math.min(1, Number(state.mouth) || 0)) : 0;
  // Explicit replacement, after motions/expressions: the idle motion must not move the mouth when silent.
  for (const id of ids) core.setParameterValueById(id, value);
}
export function fitModel(model, width, height, originalWidth, originalHeight) {
  const scale = Math.min(width / originalWidth, height / originalHeight) * .98;
  model.scale.set(scale); model.position.set((width - originalWidth * scale) / 2, height - originalHeight * scale);
}
export class MaoAvatar {
  constructor(element, { runtime = loadRuntime, observer = callback => new ResizeObserver(callback) } = {}) {
    this.element = element; this.runtime = runtime; this.observerFactory = observer; this.state = { emotion: 'warm', mouth: 0, speaking: false }; this.disposed = false;
  }
  async mount(configuration) {
    const PIXI = await this.runtime(); if (this.disposed) return;
    this.lipSyncIds = configuration.lipSyncIds || ['ParamA'];
    this.canvas = document.createElement('canvas'); this.canvas.setAttribute('aria-label', 'Hiraya avatar using the Niziiro Mao Live2D model'); this.canvas.setAttribute('role', 'img');
    this.app = new PIXI.Application({ view: this.canvas, width: 300, height: 360, backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: Math.min(globalThis.devicePixelRatio || 1, 2) });
    this.model = await PIXI.live2d.Live2DModel.from(configuration.modelUrl, { autoInteract: false, autoUpdate: false });
    if (this.disposed) { this.model.destroy(); return; }
    this.width = this.model.width; this.height = this.model.height;
    this.app.stage.addChild(this.model);
    this.app.ticker.add(() => this.model.update(this.app.ticker.deltaMS));
    this.beforeUpdate = () => applyMaoLipSync(this.model.internalModel.coreModel, this.lipSyncIds, this.state);
    this.model.internalModel.on('beforeModelUpdate', this.beforeUpdate);
    this.element.replaceChildren(this.canvas); this.element.classList.add('live2d-avatar');
    this.resize = () => { const width = this.element.clientWidth || 245, height = this.element.clientHeight || 270; this.app.renderer.resize(width, height); fitModel(this.model, width, height, this.width, this.height); };
    this.observer = this.observerFactory(this.resize); this.observer.observe(this.element); this.resize();
    this.visibility = () => { if (document.hidden || !this.visible) this.app.stop(); else this.app.start(); };
    document.addEventListener('visibilitychange', this.visibility); this.visible = true; this.visibility();
    this.update(this.state);
  }
  update(state) {
    this.state = { ...this.state, ...state };
    if (!this.model || this.disposed) return;
    // Stop the mouth immediately as well as on the next rendering frame.
    applyMaoLipSync(this.model.internalModel.coreModel, this.lipSyncIds, this.state);
    const expression = maoExpressions[this.state.emotion] || 'exp_01';
    if (expression !== this.expression) { this.expression = expression; Promise.resolve(this.model.expression(expression)).catch(() => {}); }
  }
  setVisible(visible) { this.visible = visible; this.visibility?.(); }
  destroy() {
    this.disposed = true; this.observer?.disconnect();
    if (this.visibility) document.removeEventListener('visibilitychange', this.visibility);
    this.model?.internalModel?.off('beforeModelUpdate', this.beforeUpdate);
    this.app?.destroy(true, { children: true, texture: true, baseTexture: true }); this.app = null;
  }
}
