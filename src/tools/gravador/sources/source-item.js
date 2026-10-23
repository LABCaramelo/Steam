// Source Item Model
export class SourceItem {
  constructor(config = {}) {
    this.id = config.id || 'source_' + Math.random().toString(36).substring(2, 9);
    this.name = config.name || 'New Source';
    this.type = config.type || 'color'; // monitor, camera, mic, image, video, browser, text, color

    // Transform
    this.x = config.x ?? 100;
    this.y = config.y ?? 100;
    this.width = config.width ?? 640;
    this.height = config.height ?? 360;
    this.rotation = config.rotation ?? 0;
    this.opacity = config.opacity ?? 1.0;
    this.visible = config.visible ?? true;
    this.locked = config.locked ?? false;

    // Filters
    this.filters = {
      brightness: config.filters?.brightness ?? 100, // %
      contrast: config.filters?.contrast ?? 100, // %
      saturation: config.filters?.saturation ?? 100, // %
      hueRotate: config.filters?.hueRotate ?? 0, // deg
      chromaKey: {
        enabled: config.filters?.chromaKey?.enabled ?? false,
        color: config.filters?.chromaKey?.color ?? '#00FF00',
        similarity: config.filters?.chromaKey?.similarity ?? 400, // 1-1000
        smoothness: config.filters?.chromaKey?.smoothness ?? 80
      },
      crop: {
        top: config.filters?.crop?.top ?? 0,
        right: config.filters?.crop?.right ?? 0,
        bottom: config.filters?.crop?.bottom ?? 0,
        left: config.filters?.crop?.left ?? 0
      }
    };

    // Audio properties
    this.hasAudio = config.hasAudio ?? Boolean(config.props?.stream?.getAudioTracks?.().length);
    this.volume = config.volume ?? 1.0;
    this.muted = config.muted ?? false;
    this.db = -60;
    this.peakDb = -60;

    // Audio Filters (OBS Studio canonical audio DSP chain)
    this.audioFilters = config.audioFilters || [
      { id: 'gain', type: 'gain', name: 'Gain', enabled: true, gainDb: 0 },
      { id: 'noiseSuppression', type: 'noiseSuppression', name: 'Noise Suppression', enabled: false, level: -30 },
      { id: 'noiseGate', type: 'noiseGate', name: 'Noise Gate', enabled: false, closeThreshold: -38, openThreshold: -32 },
      { id: 'compressor', type: 'compressor', name: 'Compressor', enabled: false, threshold: -18, ratio: 4, attack: 6, release: 60, outputGain: 0 },
      { id: 'limiter', type: 'limiter', name: 'Limiter', enabled: false, threshold: -6, release: 60 },
      { id: 'eq', type: 'eq', name: '3-Band Equalizer', enabled: false, low: 0, mid: 0, high: 0 },
      { id: 'delay', type: 'delay', name: 'Sync Offset (Delay)', enabled: false, delayMs: 0 }
    ];

    // Payload specific data
    this.props = Object.assign({
      color: '#476bd7',
      text: 'Seu conteúdo começa aqui.',
      font: 'Inter, sans-serif',
      fontSize: 48,
      textColor: '#FFFFFF',
      textBgColor: 'transparent',
      scrollSpeed: 0, // px per second
      url: '',
      imageElement: null,
      videoElement: null,
      stream: null
    }, config.props || {});

    this.textScrollOffset = 0;
    this.lastRenderTime = performance.now();
  }

  // Bounding box hit test
  containsPoint(px, py) {
    if (!this.visible) return false;
    // Rotate point back around source center to check AABB
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const rad = -this.rotation * (Math.PI / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const dx = px - cx;
    const dy = py - cy;
    const rx = cos * dx - sin * dy + cx;
    const ry = sin * dx + cos * dy + cy;

    return (
      rx >= this.x &&
      rx <= this.x + this.width &&
      ry >= this.y &&
      ry <= this.y + this.height
    );
  }

  // Render to Canvas
  render(ctx, currentTime) {
    if (!this.visible || this.opacity <= 0) return;

    const delta = (currentTime - this.lastRenderTime) / 1000;
    this.lastRenderTime = currentTime;

    ctx.save();

    // Global Alpha
    ctx.globalAlpha = Math.max(0, Math.min(1, this.opacity));

    // Translation & Rotation
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    ctx.translate(cx, cy);
    if (this.rotation !== 0) {
      ctx.rotate((this.rotation * Math.PI) / 180);
    }
    ctx.translate(-this.width / 2, -this.height / 2);

    // Apply Crop Clipping if enabled
    const { top, right, bottom, left } = this.filters.crop;
    const drawX = left;
    const drawY = top;
    const drawW = Math.max(1, this.width - left - right);
    const drawH = Math.max(1, this.height - top - bottom);

    if (top > 0 || right > 0 || bottom > 0 || left > 0) {
      ctx.beginPath();
      ctx.rect(drawX, drawY, drawW, drawH);
      ctx.clip();
    }

    // Apply Color Filters
    const filterParts = [];
    if (this.filters.brightness !== 100) filterParts.push(`brightness(${this.filters.brightness}%)`);
    if (this.filters.contrast !== 100) filterParts.push(`contrast(${this.filters.contrast}%)`);
    if (this.filters.saturation !== 100) filterParts.push(`saturate(${this.filters.saturation}%)`);
    if (this.filters.hueRotate !== 0) filterParts.push(`hue-rotate(${this.filters.hueRotate}deg)`);
    if (filterParts.length > 0) {
      ctx.filter = filterParts.join(' ');
    }

    // Render by type
    switch (this.type) {
      case 'color':
        this._renderColor(ctx);
        break;
      case 'text':
        this._renderText(ctx, delta);
        break;
      case 'image':
        this._renderImage(ctx);
        break;
      case 'video':
      case 'camera':
      case 'monitor':
        this._renderMediaStream(ctx);
        break;
      case 'browser':
        this._renderBrowser(ctx, currentTime);
        break;
      default:
        this._renderPlaceholder(ctx);
        break;
    }

    ctx.restore();
  }

  _renderColor(ctx) {
    ctx.fillStyle = this.props.color || '#476bd7';
    ctx.fillRect(0, 0, this.width, this.height);
  }

  _renderText(ctx, delta) {
    if (this.props.textBgColor && this.props.textBgColor !== 'transparent') {
      ctx.fillStyle = this.props.textBgColor;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    const lines = String(this.props.text || 'No Ar').split(/\r?\n/);
    const maxSize = this.props.fontSize || 48;
    const lineHeight = this.props.lineHeight || 1.08;
    let fontSize = Math.min(maxSize, this.height / (lines.length * lineHeight));
    ctx.font = `${fontSize}px ${this.props.font || 'sans-serif'}`;
    const widest = Math.max(...lines.map(line => ctx.measureText(line).width));
    if (widest > this.width && widest > 0) {
      fontSize *= this.width / widest;
      ctx.font = `${fontSize}px ${this.props.font || 'sans-serif'}`;
    }
    ctx.fillStyle = this.props.textColor || '#FFFFFF';
    ctx.textBaseline = 'middle';

    const textMetrics = { width: Math.max(...lines.map(line => ctx.measureText(line).width)) };
    const spacing = fontSize * lineHeight;
    const top = this.height / 2 - (lines.length - 1) * spacing / 2;

    if (this.props.scrollSpeed && this.props.scrollSpeed !== 0) {
      this.textScrollOffset += this.props.scrollSpeed * delta;
      const totalWidth = textMetrics.width + 100;
      if (this.textScrollOffset > totalWidth) {
        this.textScrollOffset = -totalWidth;
      } else if (this.textScrollOffset < -totalWidth) {
        this.textScrollOffset = totalWidth;
      }
      lines.forEach((line, index) => ctx.fillText(line, -this.textScrollOffset, top + index * spacing));
    } else {
      lines.forEach((line, index) => ctx.fillText(line, (this.width - ctx.measureText(line).width) / 2, top + index * spacing));
    }
  }

  _renderImage(ctx) {
    if (this.props.imageElement?.complete && this.props.imageElement.naturalWidth > 0) {
      ctx.drawImage(this.props.imageElement, 0, 0, this.width, this.height);
    } else {
      this._renderVideoPlaceholder(ctx);
    }
  }

  _renderMediaStream(ctx) {
    const video = this.props.videoElement;
    if (video && video.readyState >= 2) {
      if (this.filters.chromaKey?.enabled) {
        // Chroma Key Realtime Shader / Canvas Blend
        this._renderChromaKeyedVideo(ctx, video);
      } else {
        ctx.drawImage(video, 0, 0, this.width, this.height);
      }
    } else {
      this._renderVideoPlaceholder(ctx);
    }
  }

  _renderChromaKeyedVideo(ctx, video) {
    // Fast Chroma Key in canvas
    if (!this._chromaCanvas) {
      this._chromaCanvas = document.createElement('canvas');
      this._chromaCtx = this._chromaCanvas.getContext('2d', { willReadFrequently: true });
    }
    const cw = Math.min(640, this.width);
    const ch = Math.min(360, this.height);
    this._chromaCanvas.width = cw;
    this._chromaCanvas.height = ch;

    this._chromaCtx.drawImage(video, 0, 0, cw, ch);
    const imgData = this._chromaCtx.getImageData(0, 0, cw, ch);
    const data = imgData.data;

    // Parse target chroma color
    const hex = this.filters.chromaKey.color || '#00FF00';
    const kr = parseInt(hex.slice(1, 3), 16) || 0;
    const kg = parseInt(hex.slice(3, 5), 16) || 255;
    const kb = parseInt(hex.slice(5, 7), 16) || 0;
    const sim = (this.filters.chromaKey.similarity || 400) / 1000 * 255;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const diff = Math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2);
      if (diff < sim) {
        data[i + 3] = 0; // Transparent
      }
    }
    this._chromaCtx.putImageData(imgData, 0, 0);
    ctx.drawImage(this._chromaCanvas, 0, 0, this.width, this.height);
  }

  _renderBrowser(ctx) {
    ctx.fillStyle = '#101014';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#fff4e8';
    ctx.font = '16px sans-serif';
    ctx.fillText('Adicione uma captura da aba para compor este site.', 20, 40);
  }

  _renderSMPTEBars(ctx) {
    const bars = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
    const barWidth = this.width / bars.length;
    bars.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(i * barWidth, 0, barWidth, this.height * 0.7);
    });
    // Lower bars
    ctx.fillStyle = '#0000c0'; ctx.fillRect(0, this.height * 0.7, this.width * 0.14, this.height * 0.3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(this.width * 0.14, this.height * 0.7, this.width * 0.14, this.height * 0.3);
    ctx.fillStyle = '#c000c0'; ctx.fillRect(this.width * 0.28, this.height * 0.7, this.width * 0.14, this.height * 0.3);
    ctx.fillStyle = '#131313'; ctx.fillRect(this.width * 0.42, this.height * 0.7, this.width * 0.58, this.height * 0.3);

    // Label
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(this.width / 2 - 100, this.height / 2 - 20, 200, 40);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('COLOR TEST BARS', this.width / 2, this.height / 2 + 6);
    ctx.textAlign = 'start';
  }

  _renderVideoPlaceholder(ctx) {
    ctx.fillStyle = '#1a1c24';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.strokeStyle = '#383c4e';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, this.width - 2, this.height - 2);

    ctx.fillStyle = '#7a839e';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.name} (${this.type.toUpperCase()})`, this.width / 2, this.height / 2 - 10);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#515970';
    ctx.fillText(this.captureEnded ? 'Captura encerrada. Reconecte esta fonte.' : 'Selecione um arquivo ou conecte esta fonte.', this.width / 2, this.height / 2 + 16);
    ctx.textAlign = 'start';
  }

  _renderPlaceholder(ctx) {
    ctx.fillStyle = '#292d3b';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.fillText(this.name, 20, 30);
  }

  /** Release live resources while retaining the editable source and transform. */
  releaseMedia() {
    this._cancelMediaLoad?.();
    this._cancelMediaLoad = null;
    const video = this.props.videoElement;
    const tracks = new Set([...(this.props.stream?.getTracks() || []), ...(video?.srcObject?.getTracks() || [])]);
    tracks.forEach(track => track.stop());
    if (video) {
      video.onloadedmetadata = null;
      video.onerror = null;
      video.pause?.();
      video.srcObject = null;
      video.removeAttribute?.('src');
      video.load?.();
    }
    const image = this.props.imageElement;
    if (image) { image.onload = null; image.onerror = null; }
    if (this.props.objectUrl) URL.revokeObjectURL(this.props.objectUrl);
    this.props.stream = null;
    this.props.videoElement = null;
    this.props.imageElement = null;
    this.props.objectUrl = null;
    this.hasAudio = false;
  }

  /** Idempotent teardown; streams and file URLs never survive release or account change. */
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.releaseMedia();
    this.onDestroy?.();
    this.onDestroy = null;
  }
}
