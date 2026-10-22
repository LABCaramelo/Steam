// Application State Manager — Gravador LAB Caramelo
import { SourceItem } from './sources/source-item.js';

const STORAGE_KEY = 'lab:tool:gravador:state';

export class AppState {
  constructor(compositor, sourceFactory) {
    this.compositor = compositor;
    this.sourceFactory = sourceFactory;
    this.scenes = [];
    this.currentScene = null;
    this.previewScene = null;
  }

  async initDefaultSetup() {
    // 1. Tenta carregar a última configuração salva pelo usuário
    if (this.loadSavedSetup()) {
      return;
    }

    // 2. Sem templates: inicia com uma cena limpa e sem fontes
    const scene1 = {
      id: 'scene_' + Math.random().toString(36).substring(2, 9),
      name: 'Cena 1',
      sources: []
    };

    this.scenes = [scene1];
    this.currentScene = scene1;
    this.previewScene = scene1;

    this.compositor.activeScene = this.currentScene;
    this.compositor.previewScene = this.previewScene;
    this.saveCurrentSetup();
  }

  saveCurrentSetup() {
    try {
      const payload = {
        formatVersion: 2,
        savedAt: Date.now(),
        currentSceneId: this.currentScene ? this.currentScene.id : null,
        previewSceneId: this.previewScene ? this.previewScene.id : null,
        scenes: this.scenes.map(sc => ({
          id: sc.id,
          name: sc.name,
          sources: (sc.sources || []).map(s => ({
            id: s.id,
            name: s.name,
            type: s.type,
            x: s.x,
            y: s.y,
            width: s.width,
            height: s.height,
            rotation: s.rotation,
            opacity: s.opacity,
            visible: s.visible,
            locked: s.locked,
            volume: s.volume,
            muted: s.muted,
            filters: s.filters,
            audioFilters: s.audioFilters,
            props: {
              color: s.props?.color,
              text: s.props?.text,
              fontSize: s.props?.fontSize,
              font: s.props?.font,
              textColor: s.props?.textColor,
              textBgColor: s.props?.textBgColor,
              scrollSpeed: s.props?.scrollSpeed,
              url: s.props?.url
            }
          }))
        }))
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Gravador: não foi possível salvar o estado no localStorage', e);
    }
  }

  loadSavedSetup() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.scenes) || data.scenes.length === 0) return false;

      this.scenes = data.scenes.map(sc => ({
        id: sc.id || 'scene_' + Math.random().toString(36).substring(2, 9),
        name: sc.name || 'Cena',
        sources: (sc.sources || []).map(s => new SourceItem(s))
      }));

      const active = this.scenes.find(s => s.id === data.currentSceneId) || this.scenes[0];
      const preview = this.scenes.find(s => s.id === data.previewSceneId) || this.scenes[1] || active;

      this.currentScene = active;
      this.previewScene = preview;
      this.compositor.activeScene = active;
      this.compositor.previewScene = preview;
      return true;
    } catch (e) {
      console.warn('Gravador: erro ao carregar configuração salva, iniciando limpo', e);
      return false;
    }
  }

  clearSavedSetup() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  addScene(name) {
    const newScene = {
      id: 'scene_' + Math.random().toString(36).substring(2, 9),
      name: name || `Cena ${this.scenes.length + 1}`,
      sources: []
    };
    this.scenes.push(newScene);
    this.setCurrentScene(newScene);
    this.saveCurrentSetup();
    return newScene;
  }

  removeCurrentScene() {
    if (this.scenes.length <= 1) return;
    const idx = this.scenes.indexOf(this.currentScene);
    if (idx !== -1) {
      this.scenes.splice(idx, 1);
      this.setCurrentScene(this.scenes[Math.max(0, idx - 1)]);
      this.saveCurrentSetup();
    }
  }

  setCurrentScene(scene) {
    this.currentScene = scene;
    this.compositor.activeScene = scene;
    this.compositor.selectSource(null);
    this.saveCurrentSetup();
  }

  setPreviewScene(scene) {
    this.previewScene = scene;
    this.compositor.previewScene = scene;
    this.saveCurrentSetup();
  }

  addSource(source) {
    if (!this.currentScene) return;
    this.currentScene.sources.push(source);
    this.compositor.selectSource(source);
    this.saveCurrentSetup();
  }

  removeSource(source) {
    if (!this.currentScene) return;
    const idx = this.currentScene.sources.indexOf(source);
    if (idx !== -1) {
      this.currentScene.sources.splice(idx, 1);
      this.saveCurrentSetup();
    }
  }

  moveSourceUp(source) {
    if (!this.currentScene) return;
    const list = this.currentScene.sources;
    const idx = list.indexOf(source);
    if (idx < list.length - 1 && idx !== -1) {
      const temp = list[idx];
      list[idx] = list[idx + 1];
      list[idx + 1] = temp;
      this.saveCurrentSetup();
    }
  }

  moveSourceDown(source) {
    if (!this.currentScene) return;
    const list = this.currentScene.sources;
    const idx = list.indexOf(source);
    if (idx > 0) {
      const temp = list[idx];
      list[idx] = list[idx - 1];
      list[idx - 1] = temp;
      this.saveCurrentSetup();
    }
  }

  moveSceneUp() {
    const idx = this.scenes.indexOf(this.currentScene);
    if (idx > 0) {
      const temp = this.scenes[idx];
      this.scenes[idx] = this.scenes[idx - 1];
      this.scenes[idx - 1] = temp;
      this.saveCurrentSetup();
    }
  }

  moveSceneDown() {
    const idx = this.scenes.indexOf(this.currentScene);
    if (idx < this.scenes.length - 1 && idx !== -1) {
      const temp = this.scenes[idx];
      this.scenes[idx] = this.scenes[idx + 1];
      this.scenes[idx + 1] = temp;
      this.saveCurrentSetup();
    }
  }

  exportScenesJSON() {
    const data = {
      formatVersion: 1,
      generator: 'Gravador LAB Caramelo',
      exportedAt: new Date().toISOString(),
      scenes: this.scenes.map(sc => ({
        id: sc.id,
        name: sc.name,
        sources: (sc.sources || []).map(s => ({
          id: s.id,
          name: s.name,
          type: s.type,
          x: s.x,
          y: s.y,
          width: s.width,
          height: s.height,
          rotation: s.rotation,
          opacity: s.opacity,
          visible: s.visible,
          locked: s.locked,
          volume: s.volume,
          muted: s.muted,
          filters: s.filters,
          audioFilters: s.audioFilters,
          props: {
            color: s.props?.color,
            text: s.props?.text,
            fontSize: s.props?.fontSize,
            font: s.props?.font,
            textColor: s.props?.textColor,
            textBgColor: s.props?.textBgColor,
            scrollSpeed: s.props?.scrollSpeed,
            url: s.props?.url
          }
        }))
      }))
    };
    return JSON.stringify(data, null, 2);
  }

  importScenesJSON(jsonStr) {
    const data = JSON.parse(jsonStr);
    if (!data.scenes || !Array.isArray(data.scenes)) {
      throw new Error('Arquivo de coleção de cenas inválido');
    }

    this.scenes = data.scenes.map(sc => ({
      id: sc.id || 'scene_' + Math.random().toString(36).substring(2, 9),
      name: sc.name || 'Cena',
      sources: (sc.sources || []).map(s => new SourceItem(s))
    }));

    if (this.scenes.length > 0) {
      this.setCurrentScene(this.scenes[0]);
      this.setPreviewScene(this.scenes[1] || this.scenes[0]);
    }
    this.saveCurrentSetup();
  }
}
