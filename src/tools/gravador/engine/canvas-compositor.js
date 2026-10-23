// High-Performance 60FPS 2D Canvas Compositor with Dedicated Master Render Surface
export class CanvasCompositor {
  constructor(config = {}) {
    this.width = config.width || 1920;
    this.height = config.height || 1080;
    this.targetFps = config.fps || 60;

    // Master offscreen render canvas (Crystal clear 1080p, never throttled by DOM)
    this.masterCanvas = document.createElement('canvas');
    this.masterCanvas.width = this.width;
    this.masterCanvas.height = this.height;
    this.masterCtx = this.masterCanvas.getContext('2d', { alpha: false, desynchronized: true });
    this.masterCtx.imageSmoothingEnabled = true;
    this.masterCtx.imageSmoothingQuality = 'high';

    // Display canvases (bound to DOM viewports)
    this.programCanvas = null;
    this.programCtx = null;

    this.studioProgramCanvas = null;
    this.studioProgramCtx = null;

    this.previewCanvas = null;
    this.previewCtx = null;

    this.isStudioMode = false;
    this.activeScene = null; // Live Program scene
    this.previewScene = null; // Edit Preview scene in Studio Mode
    this.selectedSource = null;

    this.transitions = config.transitions;
    this.audioEngine = config.audioEngine;

    // Interaction state
    this.dragState = {
      isDragging: false,
      isResizing: false,
      handle: null,
      startX: 0,
      startY: 0,
      sourceStartX: 0,
      sourceStartY: 0,
      sourceStartW: 0,
      sourceStartH: 0
    };

    // Performance Stats
    this.stats = {
      fps: 60.0,
      frames: 0,
      lastTime: performance.now(),
      renderTimeMs: 0,
      droppedFrames: 0
    };

    this.onSelectionChange = null;
    this.onStatsUpdate = null;
    this.animationFrameId = null;
  }

  init(programCanvas, previewCanvas = null) {
    this.programCanvas = programCanvas;
    this.programCanvas.width = this.width;
    this.programCanvas.height = this.height;
    this.programCtx = this.programCanvas.getContext('2d', { alpha: false });
    this.programCtx.imageSmoothingEnabled = true;
    this.programCtx.imageSmoothingQuality = 'high';

    if (previewCanvas) {
      this.previewCanvas = previewCanvas;
      this.previewCanvas.width = this.width;
      this.previewCanvas.height = this.height;
      this.previewCtx = this.previewCanvas.getContext('2d', { alpha: false });
      this.previewCtx.imageSmoothingEnabled = true;
      this.previewCtx.imageSmoothingQuality = 'high';
    }

    this._startRenderLoop();
  }

  setStudioProgramCanvas(canvas) {
    if (!canvas) return;
    this.studioProgramCanvas = canvas;
    this.studioProgramCanvas.width = this.width;
    this.studioProgramCanvas.height = this.height;
    this.studioProgramCtx = this.studioProgramCanvas.getContext('2d', { alpha: false });
    this.studioProgramCtx.imageSmoothingEnabled = true;
    this.studioProgramCtx.imageSmoothingQuality = 'high';
  }

  setResolution(w, h) {
    this.width = w;
    this.height = h;

    this.masterCanvas.width = w;
    this.masterCanvas.height = h;
    this.masterCtx.imageSmoothingEnabled = true;
    this.masterCtx.imageSmoothingQuality = 'high';

    if (this.programCanvas) {
      this.programCanvas.width = w;
      this.programCanvas.height = h;
      this.programCtx.imageSmoothingEnabled = true;
      this.programCtx.imageSmoothingQuality = 'high';
    }
    if (this.studioProgramCanvas) {
      this.studioProgramCanvas.width = w;
      this.studioProgramCanvas.height = h;
      this.studioProgramCtx.imageSmoothingEnabled = true;
      this.studioProgramCtx.imageSmoothingQuality = 'high';
    }
    if (this.previewCanvas) {
      this.previewCanvas.width = w;
      this.previewCanvas.height = h;
      this.previewCtx.imageSmoothingEnabled = true;
      this.previewCtx.imageSmoothingQuality = 'high';
    }
  }

  setFps(fps) {
    this.targetFps = fps;
  }

  setStudioMode(enabled) {
    this.isStudioMode = enabled;
  }

  _startRenderLoop() {
    let frameCount = 0;
    let fpsTimer = performance.now();
    let previousRender = -Infinity;

    const loop = (currentTime) => {
      this.animationFrameId = requestAnimationFrame(loop);
      const interval = 1000 / this.targetFps;
      if (currentTime - previousRender < interval - 0.5) return;
      previousRender = currentTime - (Number.isFinite(previousRender) ? (currentTime - previousRender) % interval : 0);
      const renderStart = performance.now();

      // Update Transitions
      if (this.transitions) {
        this.transitions.update(currentTime);
      }
      this.audioEngine?.syncActiveSources?.(this.activeScene?.sources || []);

      // 1. Render Master Broadcast Output (Always un-throttled, pristine 1080p)
      this._renderMasterProgram(currentTime);

      // 2. Blit Master onto Active Viewport Canvas
      if (this.isStudioMode) {
        // Blit to Studio Program Canvas
        if (this.studioProgramCtx) {
          this.studioProgramCtx.drawImage(this.masterCanvas, 0, 0, this.width, this.height);
        }
        // Render Studio Preview Canvas
        if (this.previewCtx) {
          this._renderPreviewOutput(this.previewCtx, currentTime);
        }
      } else {
        // Blit to Single Main Canvas
        if (this.programCtx) {
          this.programCtx.drawImage(this.masterCanvas, 0, 0, this.width, this.height);
        }
      }

      // Stats calculation
      frameCount++;
      const renderDuration = performance.now() - renderStart;
      this.stats.renderTimeMs = renderDuration;

      if (currentTime - fpsTimer >= 500) {
        this.stats.fps = (frameCount * 1000) / (currentTime - fpsTimer);
        frameCount = 0;
        fpsTimer = currentTime;
        if (this.onStatsUpdate) {
          this.onStatsUpdate(this.stats);
        }
      }

    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  _renderMasterProgram(currentTime) {
    const ctx = this.masterCtx;
    // Clear / background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.transitions && this.transitions.isTransitioning) {
      this.transitions.renderTransition(ctx, this.width, this.height, currentTime, (c, scene, t) => {
        this._renderScene(c, scene, t);
      });
    } else {
      this._renderScene(ctx, this.activeScene, currentTime);
    }
  }

  _renderPreviewOutput(ctx, currentTime) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.width, this.height);
    this._renderScene(ctx, this.previewScene || this.activeScene, currentTime);
  }

  _renderScene(ctx, scene, currentTime) {
    if (!scene || !scene.sources) return;

    // Render sources from bottom to top
    for (let i = 0; i < scene.sources.length; i++) {
      const source = scene.sources[i];
      if (source.visible) {
        source.render(ctx, currentTime);
      }
    }
  }

  // Find source under mouse coordinates
  hitTestSource(x, y, scene = null) {
    const targetScene = scene || (this.isStudioMode ? (this.previewScene || this.activeScene) : this.activeScene);
    if (!targetScene || !targetScene.sources) return null;

    for (let i = targetScene.sources.length - 1; i >= 0; i--) {
      const s = targetScene.sources[i];
      if (s.visible && s.containsPoint(x, y)) {
        return s;
      }
    }
    return null;
  }

  selectSource(source) {
    this.selectedSource = source;
    if (this.onSelectionChange) {
      this.onSelectionChange(source);
    }
  }

  fitToScreen(source) {
    if (!source) return;
    const aspect = source.width / source.height;
    const canvasAspect = this.width / this.height;

    if (aspect > canvasAspect) {
      source.width = this.width;
      source.height = Math.round(this.width / aspect);
      source.x = 0;
      source.y = Math.round((this.height - source.height) / 2);
    } else {
      source.height = this.height;
      source.width = Math.round(this.height * aspect);
      source.y = 0;
      source.x = Math.round((this.width - source.width) / 2);
    }
  }

  stretchToScreen(source) {
    if (!source) return;
    source.x = 0;
    source.y = 0;
    source.width = this.width;
    source.height = this.height;
  }

  centerToScreen(source) {
    if (!source) return;
    source.x = Math.round((this.width - source.width) / 2);
    source.y = Math.round((this.height - source.height) / 2);
  }

  saveScreenshot() {
    const a = document.createElement('a');
    a.download = `NoAr_Captura_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    a.href = this.masterCanvas.toDataURL('image/png', 1.0);
    a.click();
  }

  // Master crystal-clear output stream for recording and broadcasting
  getStream(fps = this.targetFps) {
    return this.masterCanvas.captureStream(fps || this.targetFps || 60);
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
