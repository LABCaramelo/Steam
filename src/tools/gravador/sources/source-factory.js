import { SourceItem } from './source-item.js';

/** Device and local-file resources are owned by the factory, never by a saved project. */
export class SourceFactory {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.sources = new Set();
    this.destroyed = false;
    this.onError = null;
  }

  async createSource(type, name = null) {
    try {
      switch (type) {
        case 'monitor': return await this.createDisplayCapture(name);
        case 'camera': return await this.createVideoCapture(name);
        case 'mic': return await this.createAudioInput(name);
        case 'image': return this.createImageSource(name);
        case 'video': return this.createMediaSource(name);
        case 'browser': throw new Error('Para compor um site, adicione uma captura da aba do navegador.');
        case 'text': return this.createTextSource(name);
        case 'color': return this.createColorSource(name);
        default: throw new Error('Tipo de fonte não suportado.');
      }
    } catch (error) {
      if (this.onError) { this.onError(error); return null; }
      throw error;
    }
  }

  _track(source) {
    if (this.destroyed) { source.destroy(); throw new Error('O estúdio já foi encerrado.'); }
    if (this.sources.has(source)) return source;
    this.sources.add(source);
    source.onDestroy = () => {
      this.audioEngine?.removeSourceAudio(source.id);
      this.sources.delete(source);
    };
    return source;
  }

  async _capture(type, name, acquire) {
    const source = this._track(new SourceItem({
      type, name, x: 0, y: 0, width: type === 'mic' ? 0 : 1280,
      height: type === 'mic' ? 0 : 720, visible: type !== 'mic',
    }));
    try {
      if (this.destroyed) throw new Error('O estúdio já foi encerrado.');
      const stream = await acquire();
      if (this.destroyed || source.destroyed) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error('A captura foi cancelada.');
      }
      source.props.stream = stream;
      if (type !== 'mic' && !stream.getVideoTracks().length) throw new Error('O dispositivo não disponibilizou vídeo.');
      if (type === 'mic' && !stream.getAudioTracks().length) throw new Error('O dispositivo não disponibilizou áudio.');
      source.hasAudio = stream.getAudioTracks().length > 0;
      if (type !== 'mic') {
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.srcObject = stream;
        source.props.videoElement = video;
        const resize = () => {
          if (source.destroyed) return;
          if (video.videoWidth && video.videoHeight) {
            source.width = video.videoWidth; source.height = video.videoHeight;
          }
        };
        video.addEventListener('loadedmetadata', resize, { once: true });
        await video.play();
        if (this.destroyed || source.destroyed) throw new Error('A captura foi cancelada.');
        resize();
      }
      if (stream.getAudioTracks().length) this.audioEngine?.attachSourceAudio(source, stream);
      stream.getTracks().forEach(track => track.addEventListener('ended', () => {
        if (type === 'mic' || track.kind === 'video') {
          source.captureEnded = true;
          this.releaseSource(source);
        }
      }, { once: true }));
      return source;
    } catch (error) { this.releaseSource(source); throw error; }
  }

  createDisplayCapture(name) {
    if (!navigator.mediaDevices?.getDisplayMedia) return Promise.reject(new Error('A captura de tela não está disponível. Use HTTPS e um navegador compatível.'));
    return this._capture('monitor', name || 'Captura de tela', () => navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 60 } }, audio: true,
    }));
  }

  createVideoCapture(name) {
    if (!navigator.mediaDevices?.getUserMedia) return Promise.reject(new Error('A câmera não está disponível neste navegador.'));
    // Microphones are separate sources to avoid recording the same device twice.
    return this._capture('camera', name || 'Câmera', () => navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } }, audio: false,
    }));
  }

  createAudioInput(name) {
    if (!navigator.mediaDevices?.getUserMedia) return Promise.reject(new Error('O microfone não está disponível neste navegador.'));
    return this._capture('mic', name || 'Microfone', () => navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    }));
  }

  createImageSource(name, file = null) {
    const source = this._track(new SourceItem({ name: name || 'Imagem', type: 'image', x: 200, y: 150, width: 800, height: 450 }));
    if (file) void this.loadMediaFile(source, file).catch(error => { if (error.name !== 'AbortError') this.onError?.(error); });
    return source;
  }

  createMediaSource(name, file = null) {
    const source = this._track(new SourceItem({ name: name || 'Vídeo', type: 'video', x: 0, y: 0, width: 1280, height: 720 }));
    if (file) void this.loadMediaFile(source, file).catch(error => { if (error.name !== 'AbortError') this.onError?.(error); });
    return source;
  }

  /** Stage a local file, retaining the last usable media until its replacement is ready. */
  async loadMediaFile(source, file) {
    if (this.destroyed || source?.destroyed) throw new Error('A fonte já foi encerrada.');
    if (!source || !['image', 'video'].includes(source.type)) throw new Error('Esta fonte não aceita arquivos de mídia.');
    const expected = source.type === 'image' ? 'image/' : 'video/';
    if (!file || (file.type && !file.type.startsWith(expected))) throw new Error('Escolha um arquivo do tipo indicado.');
    this._track(source);
    source._cancelMediaLoad?.();
    const isImage = source.type === 'image';
    // Resume Web Audio during the file-picker gesture, before asynchronous metadata arrives.
    if (!isImage) this.audioEngine?.ensureContext?.();
    const element = isImage ? new Image() : document.createElement('video');
    const url = URL.createObjectURL(file);
    return new Promise((resolve, reject) => {
      let settled = false;
      let loading = false;
      const detach = () => { element.onload = null; element.onloadedmetadata = null; element.onerror = null; };
      const fail = error => {
        if (settled) return;
        settled = true;
        detach();
        if (source._cancelMediaLoad === cancel) source._cancelMediaLoad = null;
        if (!isImage) { element.pause?.(); element.removeAttribute?.('src'); element.load?.(); }
        else element.removeAttribute?.('src');
        URL.revokeObjectURL(url);
        reject(error);
      };
      const cancel = () => fail(new DOMException('O carregamento foi cancelado.', 'AbortError'));
      source._cancelMediaLoad = cancel;
      const ready = async () => {
        if (settled || loading) return;
        loading = true;
        try {
          if (!isImage) await element.play();
          if (settled) return;
          if (this.destroyed || source.destroyed || source._cancelMediaLoad !== cancel) return cancel();
          const width = isImage ? element.naturalWidth : element.videoWidth;
          const height = isImage ? element.naturalHeight : element.videoHeight;
          if (!width || !height) throw new Error('O arquivo não contém uma imagem de vídeo válida.');
          // Nothing belonging to the old file is released before the new one decodes.
          source._cancelMediaLoad = null;
          this.audioEngine?.removeSourceAudio(source.id);
          source.releaseMedia();
          source.props.objectUrl = url;
          source.props[isImage ? 'imageElement' : 'videoElement'] = element;
          source.width = Math.min(8192, width);
          source.height = Math.min(8192, height);
          source.captureEnded = false;
          if (!isImage) this.audioEngine?.attachMediaElement(source, element);
          settled = true;
          detach();
          resolve(source);
        } catch (error) { fail(error); }
      };
      element.onerror = () => fail(new Error(isImage ? 'Não foi possível abrir a imagem.' : 'O vídeo não pôde ser aberto pelo navegador.'));
      if (isImage) element.onload = ready;
      else {
        element.loop = true;
        element.playsInline = true;
        element.muted = true;
        element.onloadedmetadata = ready;
      }
      try { element.src = url; } catch (error) { fail(error); }
    });
  }

  createTextSource(name) {
    return this._track(new SourceItem({
      name: name || 'Texto', type: 'text', x: 100, y: 900, width: 1720, height: 100,
      props: { text: 'Seu conteúdo começa aqui.', fontSize: 40, font: 'Inter, sans-serif', textColor: '#fff4e8', textBgColor: 'transparent', scrollSpeed: 0 },
    }));
  }

  createColorSource(name) {
    return this._track(new SourceItem({ name: name || 'Cor', type: 'color', x: 0, y: 0, width: 1920, height: 1080, props: { color: '#101014' } }));
  }

  createBrowserSource() {
    throw new Error('Para compor um site, adicione uma captura da aba do navegador.');
  }

  releaseSource(source) {
    source?.destroy?.();
  }

  destroy() {
    this.destroyed = true;
    [...this.sources].forEach(source => this.releaseSource(source));
    this.sources.clear();
    this.onError = null;
  }
}
