import { PerformanceController } from './performance.js';
export const maoExpressions = Object.freeze({ warm: 'exp_01', calm: 'exp_01', playful: 'exp_02', curious: 'exp_01', concerned: 'exp_05', excited: 'exp_04', embarrassed: 'exp_01' });
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
    this.performance = new PerformanceController(); this.blended = {};
  }
  async mount(configuration) {
    const PIXI = await this.runtime(); if (this.disposed) return;
    this.lipSyncIds = configuration.lipSyncIds || ['ParamA'];
    this.canvas = document.createElement('canvas'); this.canvas.setAttribute('aria-label', 'Zyrah avatar using the Niziiro Mao Live2D model'); this.canvas.setAttribute('role', 'img');
    this.app = new PIXI.Application({ view: this.canvas, width: 300, height: 360, backgroundAlpha: 0, antialias: true, preserveDrawingBuffer: true, autoDensity: true, resolution: Math.min(globalThis.devicePixelRatio || 1, 2) });
    this.model = await PIXI.live2d.Live2DModel.from(configuration.modelUrl, { autoInteract: false, autoUpdate: false });
    if (this.disposed) { this.model.destroy(); return; }
    this.width = this.model.width; this.height = this.model.height;
    this.app.stage.addChild(this.model);
    this.app.ticker.add(() => this.model.update(this.app.ticker.deltaMS));
    const core = this.model.internalModel.coreModel;
    const parameters = core._model?.parameters;
    this.parameters = parameters ? Array.from(parameters.ids).map((id, i) => ({ id, min: parameters.minimumValues[i], max: parameters.maximumValues[i], default: parameters.defaultValues[i] })) : [];
    this.parameterMap = new Map(this.parameters.map(p => [p.id, p]));
    // Disable authored idle motions: their arm/mouth curves fight the controlled layers.
    if (this.model.internalModel.motionManager) { this.model.internalModel.motionManager.stopAllMotions?.(); this.model.internalModel.motionManager.groups.idle = '__controlled_idle'; }
    this.beforeUpdate = () => {
      const targets = this.performance.sample();
      const blend = 1 - Math.exp(-Math.min(100, this.app.ticker.deltaMS || 16) / 150);
      for (const id of new Set([...Object.keys(this.blended), ...Object.keys(targets)])) {
        if (['PartArmLA','PartArmLB'].includes(id) && core.getPartIndex?.(id) >= 0) {
          const initial = id === 'PartArmLA' ? 1 : 0;
          this.blended[id] = (this.blended[id] ?? initial) + ((targets[id] ?? initial) - (this.blended[id] ?? initial)) * blend;
          core.setPartOpacityById(id, this.blended[id]); continue;
        }
        const parameter = this.parameterMap.get(id); if (!parameter) continue;
        const target = Math.max(parameter.min, Math.min(parameter.max, targets[id] ?? parameter.default));
        this.blended[id] = (this.blended[id] ?? parameter.default) + (target - (this.blended[id] ?? parameter.default)) * blend;
        core.setParameterValueById(id, this.blended[id]);
      }
      // Mouth vowels have exclusive playback ownership; expressions never open a silent mouth.
      for (const id of ['ParamI', 'ParamU', 'ParamE', 'ParamO']) if (this.parameterMap.has(id)) core.setParameterValueById(id, 0);
      applyMaoLipSync(core, this.lipSyncIds, this.state);
    };
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
    if (state.state) this.performance.setState(state.state);
    if (state.cancel !== undefined && state.cancel !== this.cancelToken) { this.cancelToken = state.cancel; this.performance.cancel(); this.cueToken = null; }
    if (state.cue && state.cue.id !== this.cueToken) {
      this.cueToken = state.cue.id; this.performance.queue(state.cue, state.cue.turn ?? state.cue.id, state.cue.segment || 0); this.performance.start(state.cue.turn ?? state.cue.id, state.cue.segment || 0);
    }
    if (state.emotion) this.performance.emotion = state.emotion;
    if (!this.model || this.disposed) return;
    // Stop the mouth immediately as well as on the next rendering frame.
    applyMaoLipSync(this.model.internalModel.coreModel, this.lipSyncIds, this.state);
    const expression = maoExpressions[this.state.emotion] || 'exp_01';
    if (expression !== this.expression) { this.expression = expression; Promise.resolve(this.model.expression(expression)).catch(() => {}); }
  }
  setVisible(visible) { this.visible = visible; if (!visible) this.performance.cancel(true); else this.performance.restore(); this.visibility?.(); }
  hitTest(x, y) {
    if (!this.model || !this.app) return false;
    const local = this.model.toLocal(new globalThis.PIXI.Point(x, y));
    return ['HitAreaHead', 'HitAreaBody'].some(id => this.model.internalModel.isHit?.(id, local.x, local.y));
  }
  destroy() {
    this.disposed = true; this.observer?.disconnect();
    if (this.visibility) document.removeEventListener('visibilitychange', this.visibility);
    this.model?.internalModel?.off('beforeModelUpdate', this.beforeUpdate);
    this.app?.destroy(true, { children: true, texture: true, baseTexture: true }); this.app = null;
  }
}
