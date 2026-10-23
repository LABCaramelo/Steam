// No Ar scene collections store layout only. Device permissions and local files are never restored.
import { SourceItem } from './sources/source-item.js';

const STORAGE_KEY = 'lab:tool:gravador:state';
const TYPES = new Set(['monitor', 'camera', 'mic', 'image', 'video', 'browser', 'text', 'color']);
const AUDIO_TYPES = new Set(['gain', 'noiseSuppression', 'noiseGate', 'compressor', 'limiter', 'eq', 'delay']);
const uid = (prefix) => `${prefix}_${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 11)}`;
const number = (value, fallback, min, max) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const string = (value, fallback = '', max = 500) => typeof value === 'string' ? value.slice(0, max) : fallback;
const color = (value, fallback) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
const identifier = (value, prefix, used) => {
  let id = typeof value === 'string' && /^[A-Za-z_][A-Za-z0-9_-]{0,99}$/.test(value) && !used.has(value) ? value : uid(prefix);
  used.add(id);
  return id;
};

function normalizeCollection(data) {
  if (!data || ![1, 2].includes(data.formatVersion) || !Array.isArray(data.scenes) || data.scenes.length < 1 || data.scenes.length > 100) {
    throw new Error('Coleção inválida: use um arquivo JSON No Ar com 1 a 100 cenas.');
  }
  const sceneIds = new Set();
  const sourceIds = new Set();
  let count = 0;
  const scenes = data.scenes.map(sc => {
    if (!sc || typeof sc !== 'object' || !Array.isArray(sc.sources) || sc.sources.length > 100) throw new Error('Cena ou lista de fontes inválida.');
    return {
      id: identifier(sc.id, 'scene', sceneIds),
      name: string(sc.name, 'Cena', 150).trim() || 'Cena',
      sources: sc.sources.map(raw => {
        if (!raw || typeof raw !== 'object' || !TYPES.has(raw.type) || ++count > 1000) throw new Error('Tipo ou quantidade de fontes inválida.');
        const f = raw.filters || {};
        const p = raw.props || {};
        const audioFilters = Array.isArray(raw.audioFilters) ? raw.audioFilters.slice(0, 20).filter(a => a && AUDIO_TYPES.has(a.type)).map((a, index) => {
          const filter = { id: `filter_${index}`, type: a.type, name: string(a.name, 'Filtro', 100), enabled: a.enabled === true };
          for (const key of ['gainDb', 'level', 'closeThreshold', 'openThreshold', 'threshold', 'ratio', 'attack', 'release', 'outputGain', 'low', 'mid', 'high', 'delayMs']) {
            if (typeof a[key] === 'number' && Number.isFinite(a[key])) filter[key] = Math.max(-1000, Math.min(2000, a[key]));
          }
          return filter;
        }) : undefined;
        return new SourceItem({
          id: identifier(raw.id, 'source', sourceIds), name: string(raw.name, 'Fonte', 150).trim() || 'Fonte', type: raw.type,
          x: number(raw.x, 0, -16384, 16384), y: number(raw.y, 0, -16384, 16384),
          width: number(raw.width, 640, raw.type === 'mic' ? 0 : 1, 8192), height: number(raw.height, 360, raw.type === 'mic' ? 0 : 1, 8192),
          rotation: number(raw.rotation, 0, -360, 360), opacity: number(raw.opacity, 1, 0, 1),
          visible: raw.visible !== false, locked: raw.locked === true, volume: number(raw.volume, 1, 0, 1), muted: raw.muted === true,
          audioFilters,
          filters: {
            brightness: number(f.brightness, 100, 0, 200), contrast: number(f.contrast, 100, 0, 200), saturation: number(f.saturation, 100, 0, 200), hueRotate: number(f.hueRotate, 0, -360, 360),
            chromaKey: { enabled: f.chromaKey?.enabled === true, color: color(f.chromaKey?.color, '#00ff00'), similarity: number(f.chromaKey?.similarity, 400, 1, 1000), smoothness: number(f.chromaKey?.smoothness, 80, 0, 300) },
            crop: Object.fromEntries(['top', 'right', 'bottom', 'left'].map(key => [key, number(f.crop?.[key], 0, 0, 8192)]))
          },
          props: {
            color: color(p.color, '#ff701a'), text: string(p.text, 'No Ar', 10000), fontSize: number(p.fontSize, 48, 8, 500), font: string(p.font, 'Inter, sans-serif', 150),
            textColor: color(p.textColor, '#ffffff'), textBgColor: color(p.textBgColor, 'transparent'), scrollSpeed: number(p.scrollSpeed, 0, -1000, 1000), url: string(p.url, '', 2048)
          }
        });
      })
    };
  });
  return { scenes, currentSceneId: data.currentSceneId, previewSceneId: data.previewSceneId };
}

export class AppState {
  constructor(compositor, sourceFactory, options = {}) {
    this.compositor = compositor;
    this.sourceFactory = sourceFactory;
    this.storageKey = options.storageKey || STORAGE_KEY;
    this.scenes = [];
    this.currentScene = null;
    this.previewScene = null;
  }

  get editingScene() { return this.compositor.isStudioMode ? this.previewScene : this.currentScene; }

  async initDefaultSetup() {
    if (this.loadSavedSetup()) return;
    const scene = { id: uid('scene'), name: 'Cena 1', sources: [] };
    this.scenes = [scene];
    this.currentScene = this.previewScene = scene;
    this._syncCompositor();
    this.saveCurrentSetup();
  }

  _syncCompositor() {
    this.compositor.activeScene = this.currentScene;
    this.compositor.previewScene = this.previewScene;
    this.compositor.selectSource(null);
  }

  _serialize() {
    return {
      formatVersion: 2, generator: 'No Ar · Caramelo', savedAt: Date.now(),
      currentSceneId: this.currentScene?.id, previewSceneId: this.previewScene?.id,
      scenes: this.scenes.map(sc => ({ id: sc.id, name: sc.name, sources: sc.sources.map(s => ({
        id: s.id, name: s.name, type: s.type, x: s.x, y: s.y, width: s.width, height: s.height, rotation: s.rotation, opacity: s.opacity,
        visible: s.visible, locked: s.locked, volume: s.volume, muted: s.muted, filters: s.filters, audioFilters: s.audioFilters,
        props: Object.fromEntries(['color', 'text', 'fontSize', 'font', 'textColor', 'textBgColor', 'scrollSpeed', 'url'].map(key => [key, s.props?.[key]]))
      })) }))
    };
  }

  saveCurrentSetup() {
    if (!this.scenes.length) return;
    try { localStorage.setItem(this.storageKey, JSON.stringify(this._serialize())); }
    catch (error) { console.warn('No Ar: não foi possível salvar a coleção.', error); }
  }

  loadSavedSetup() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return false;
      this._replaceCollection(normalizeCollection(JSON.parse(raw)));
      return true;
    } catch (error) { console.warn('No Ar: coleção salva inválida; iniciando uma cena vazia.', error); return false; }
  }

  clearSavedSetup() { try { localStorage.removeItem(this.storageKey); } catch {} }

  _disposeSource(source) {
    this.sourceFactory.audioEngine?.removeSourceAudio?.(source.id);
    if (source.destroy) source.destroy();
    else {
      source.props?.stream?.getTracks?.().forEach(track => track.stop());
      source.props?.videoElement?.pause?.();
      if (source.props?.videoElement) source.props.videoElement.srcObject = null;
    }
  }

  _replaceCollection(data) {
    this.scenes.forEach(sc => sc.sources.forEach(source => this._disposeSource(source)));
    this.scenes = data.scenes;
    this.currentScene = this.scenes.find(sc => sc.id === data.currentSceneId) || this.scenes[0];
    this.previewScene = this.scenes.find(sc => sc.id === data.previewSceneId) || this.scenes[1] || this.currentScene;
    this._syncCompositor();
  }

  addScene(name) {
    const scene = { id: uid('scene'), name: string(name, `Cena ${this.scenes.length + 1}`, 150).trim() || 'Cena', sources: [] };
    this.scenes.push(scene);
    this.setCurrentScene(scene);
    return scene;
  }

  removeCurrentScene() {
    if (this.scenes.length <= 1 || this.compositor.transitions?.isTransitioning) return;
    const scene = this.editingScene;
    const index = this.scenes.indexOf(scene);
    if (index < 0) return;
    this.scenes.splice(index, 1);
    scene.sources.forEach(source => this._disposeSource(source));
    const fallback = this.scenes[Math.max(0, index - 1)];
    if (this.currentScene === scene) this.currentScene = fallback;
    if (this.previewScene === scene) this.previewScene = fallback;
    this._syncCompositor();
    this.saveCurrentSetup();
  }

  setCurrentScene(scene) {
    if (!this.scenes.includes(scene) || this.compositor.transitions?.isTransitioning) return;
    if (this.compositor.isStudioMode) this.previewScene = scene;
    else { this.currentScene = scene; this.previewScene = scene; }
    this._syncCompositor();
    this.saveCurrentSetup();
  }

  setPreviewScene(scene) {
    if (!this.scenes.includes(scene) || this.compositor.transitions?.isTransitioning) return;
    this.previewScene = scene;
    this.compositor.previewScene = scene;
    this.compositor.selectSource(null);
    this.saveCurrentSetup();
  }

  setStudioMode(enabled) {
    this.compositor.setStudioMode(!!enabled);
    this._syncCompositor();
  }

  commitTransition(fromScene, toScene) {
    // Ignore stale/double completions from a transition already committed.
    if (fromScene === toScene || this.currentScene !== fromScene || this.previewScene !== toScene || !this.scenes.includes(fromScene) || !this.scenes.includes(toScene)) return false;
    this.currentScene = toScene;
    this.previewScene = fromScene;
    this._syncCompositor();
    this.saveCurrentSetup();
    return true;
  }

  addSource(source) {
    if (!this.editingScene || !source || source.destroyed || this.scenes.some(scene => scene.sources.includes(source))) return;
    this.editingScene.sources.push(source);
    this.compositor.selectSource(source);
    this.saveCurrentSetup();
  }

  removeSource(source) {
    const list = this.editingScene?.sources;
    const index = list?.indexOf(source) ?? -1;
    if (index < 0) return;
    list.splice(index, 1);
    this._disposeSource(source);
    this.compositor.selectSource(null);
    this.saveCurrentSetup();
  }

  _moveSource(source, delta) {
    const list = this.editingScene?.sources;
    const index = list?.indexOf(source) ?? -1;
    if (index < 0 || index + delta < 0 || index + delta >= list.length) return;
    [list[index], list[index + delta]] = [list[index + delta], list[index]];
    this.saveCurrentSetup();
  }
  moveSourceUp(source) { this._moveSource(source, 1); }
  moveSourceDown(source) { this._moveSource(source, -1); }
  _moveScene(delta) {
    const index = this.scenes.indexOf(this.editingScene);
    if (index < 0 || index + delta < 0 || index + delta >= this.scenes.length) return;
    [this.scenes[index], this.scenes[index + delta]] = [this.scenes[index + delta], this.scenes[index]];
    this.saveCurrentSetup();
  }
  moveSceneUp() { this._moveScene(-1); }
  moveSceneDown() { this._moveScene(1); }

  exportScenesJSON() { return JSON.stringify({ ...this._serialize(), exportedAt: new Date().toISOString() }, null, 2); }
  importScenesJSON(jsonStr) {
    if (typeof jsonStr !== 'string' || jsonStr.length > 5_000_000) throw new Error('A coleção deve ter até 5 MB.');
    const data = normalizeCollection(JSON.parse(jsonStr));
    this._replaceCollection(data);
    this.saveCurrentSetup();
  }
  destroy() {
    this.scenes.forEach(scene => scene.sources.forEach(source => this._disposeSource(source)));
    this.scenes = [];
    this.currentScene = this.previewScene = null;
    this._syncCompositor();
  }
}
