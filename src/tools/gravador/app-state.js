// Application State Manager
import { SourceItem } from './sources/source-item.js';

export class AppState {
  constructor(compositor, sourceFactory) {
    this.compositor = compositor;
    this.sourceFactory = sourceFactory;
    this.scenes = [];
    this.currentScene = null;
    this.previewScene = null;
  }

  async initDefaultSetup() {
    // Scene 1: Main Stream / Gaming / Presentation
    const scene1 = {
      id: 'scene_main',
      name: 'Main Stream',
      sources: []
    };

    // Color background
    const bg = this.sourceFactory.createColorSource('Background');
    bg.props.color = '#12141c';
    scene1.sources.push(bg);

    // Color Test Pattern / Main content
    const testPattern = this.sourceFactory.createImageSource('SMPTE Color Bars');
    testPattern.x = 200;
    testPattern.y = 120;
    testPattern.width = 1100;
    testPattern.height = 620;
    scene1.sources.push(testPattern);

    // Webcam source box
    const webcam = new SourceItem({
      name: 'Facecam Overlay',
      type: 'camera',
      x: 1340,
      y: 120,
      width: 480,
      height: 270
    });
    scene1.sources.push(webcam);

    // Twitch Chat overlay
    const chat = this.sourceFactory.createBrowserSource('Stream Chat Overlay');
    chat.x = 1340;
    chat.y = 410;
    chat.width = 480;
    chat.height = 480;
    scene1.sources.push(chat);

    // Lower-third scrolling ticker
    const ticker = this.sourceFactory.createTextSource('Lower Third Ticker');
    ticker.x = 80;
    ticker.y = 920;
    ticker.width = 1760;
    ticker.height = 90;
    ticker.props.text = '🔴 LIVE: OBS STUDIO WEB EDITION • 60 FPS CANVAS COMPOSITING • REAL WEBRTC & RECORDING • DEVELOPED WITH REA';
    ticker.props.fontSize = 32;
    ticker.props.scrollSpeed = 80;
    ticker.props.textBgColor = '#1f2433';
    scene1.sources.push(ticker);

    // Scene 2: Be Right Back (BRB)
    const scene2 = {
      id: 'scene_brb',
      name: 'Be Right Back',
      sources: []
    };

    const brbMedia = this.sourceFactory.createMediaSource('BRB Cyber Loop');
    brbMedia.x = 0;
    brbMedia.y = 0;
    brbMedia.width = 1920;
    brbMedia.height = 1080;
    scene2.sources.push(brbMedia);

    const brbText = this.sourceFactory.createTextSource('BRB Title');
    brbText.x = 360;
    brbText.y = 460;
    brbText.width = 1200;
    brbText.height = 160;
    brbText.props.text = 'BE RIGHT BACK';
    brbText.props.fontSize = 80;
    brbText.props.textColor = '#FF701A';
    brbText.props.textBgColor = 'rgba(0, 0, 0, 0.7)';
    brbText.props.scrollSpeed = 0;
    scene2.sources.push(brbText);

    this.scenes = [scene1, scene2];
    this.currentScene = scene1;
    this.previewScene = scene2;

    this.compositor.activeScene = this.currentScene;
    this.compositor.previewScene = this.previewScene;
  }

  addScene(name) {
    const newScene = {
      id: 'scene_' + Math.random().toString(36).substring(2, 9),
      name: name || `Scene ${this.scenes.length + 1}`,
      sources: []
    };
    this.scenes.push(newScene);
    this.setCurrentScene(newScene);
    return newScene;
  }

  removeCurrentScene() {
    if (this.scenes.length <= 1) return;
    const idx = this.scenes.indexOf(this.currentScene);
    if (idx !== -1) {
      this.scenes.splice(idx, 1);
      this.setCurrentScene(this.scenes[Math.max(0, idx - 1)]);
    }
  }

  setCurrentScene(scene) {
    this.currentScene = scene;
    this.compositor.activeScene = scene;
    this.compositor.selectSource(null);
  }

  setPreviewScene(scene) {
    this.previewScene = scene;
    this.compositor.previewScene = scene;
  }

  addSource(source) {
    if (!this.currentScene) return;
    this.currentScene.sources.push(source);
    this.compositor.selectSource(source);
  }

  removeSource(source) {
    if (!this.currentScene) return;
    const idx = this.currentScene.sources.indexOf(source);
    if (idx !== -1) {
      this.currentScene.sources.splice(idx, 1);
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
    }
  }

  moveSceneUp() {
    const idx = this.scenes.indexOf(this.currentScene);
    if (idx > 0) {
      const temp = this.scenes[idx];
      this.scenes[idx] = this.scenes[idx - 1];
      this.scenes[idx - 1] = temp;
    }
  }

  moveSceneDown() {
    const idx = this.scenes.indexOf(this.currentScene);
    if (idx < this.scenes.length - 1 && idx !== -1) {
      const temp = this.scenes[idx];
      this.scenes[idx] = this.scenes[idx + 1];
      this.scenes[idx + 1] = temp;
    }
  }

  exportScenesJSON() {
    const data = {
      formatVersion: 1,
      generator: 'OBS Studio Web Edition',
      exportedAt: new Date().toISOString(),
      scenes: this.scenes.map(sc => ({
        id: sc.id,
        name: sc.name,
        sources: sc.sources.map(s => ({
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
          props: {
            color: s.props.color,
            text: s.props.text,
            fontSize: s.props.fontSize,
            font: s.props.font,
            textColor: s.props.textColor,
            textBgColor: s.props.textBgColor,
            scrollSpeed: s.props.scrollSpeed,
            url: s.props.url
          }
        }))
      }))
    };
    return JSON.stringify(data, null, 2);
  }

  importScenesJSON(jsonStr) {
    const data = JSON.parse(jsonStr);
    if (!data.scenes || !Array.isArray(data.scenes)) {
      throw new Error('Invalid scene collection file');
    }

    this.scenes = data.scenes.map(sc => ({
      id: sc.id || 'scene_' + Math.random().toString(36).substring(2, 9),
      name: sc.name || 'Scene',
      sources: (sc.sources || []).map(s => new SourceItem(s))
    }));

    if (this.scenes.length > 0) {
      this.setCurrentScene(this.scenes[0]);
      this.setPreviewScene(this.scenes[1] || this.scenes[0]);
    }
  }
}
