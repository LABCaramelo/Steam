/** Canvas + mixed audio recording with owned track cleanup. */
export function selectRecordingMime(format, Recorder = globalThis.MediaRecorder) {
  if (!Recorder) throw new Error('Este navegador não oferece gravação de vídeo.');
  const mp4 = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4'];
  const webm = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const types = format === 'mp4' ? [...mp4, ...webm] : [...webm, ...mp4];
  const mime = types.find(type => Recorder.isTypeSupported(type));
  if (!mime) throw new Error('Nenhum codec de gravação compatível está disponível.');
  return mime;
}

export class RecordingService {
  constructor(compositor, audioEngine, config = {}) {
    this.compositor = compositor;
    this.audioEngine = audioEngine;
    this.format = config.format || 'mp4';
    this.bitrateKbps = config.bitrateKbps || 16000;
    this.fps = config.fps || 60;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.isPaused = false;
    this.elapsedTime = 0;
    this.accumulatedMs = 0;
    this.startedAt = 0;
    this.timerInterval = null;
    this.currentMimeType = '';
    this.ownedTracks = new Set();
    this.exportUrls = new Map();
    this.onStateChange = null;
    this.onTimerUpdate = null;
    this.onExport = null;
    this.onError = null;
    this.destroyed = false;
    this.finalizing = false;
  }

  setConfig(config = {}) {
    if (this.isRecording) return false;
    if (config.format) this.format = config.format.toLowerCase();
    if (Number.isFinite(Number(config.bitrateKbps))) this.bitrateKbps = Math.max(500, Math.min(60000, Number(config.bitrateKbps)));
    if ([24, 25, 30, 50, 60].includes(Number(config.fps))) this.fps = Number(config.fps);
    return true;
  }

  startRecording() {
    if (this.destroyed || this.isRecording || this.finalizing) return false;
    try {
      const mimeType = selectRecordingMime(this.format);
      const videoStream = this.compositor.getStream(this.fps);
      videoStream?.getTracks().forEach(track => this.ownedTracks.add(track));
      if (!videoStream?.getVideoTracks().length) throw new Error('O canvas não disponibilizou uma faixa de vídeo.');
      const tracks = [...videoStream.getVideoTracks()];
      const audioStream = this.audioEngine.getMixedAudioStream();
      audioStream?.getAudioTracks().forEach(track => {
        const clone = track.clone();
        tracks.push(clone);
        this.ownedTracks.add(clone);
      });
      const recorder = new MediaRecorder(new MediaStream(tracks), {
        mimeType, videoBitsPerSecond: this.bitrateKbps * 1000, audioBitsPerSecond: 192000,
      });
      this.mediaRecorder = recorder;
      this.currentMimeType = recorder.mimeType || mimeType;
      this.recordedChunks = [];
      recorder.ondataavailable = event => {
        if (!this.destroyed && this.mediaRecorder === recorder && event.data?.size) this.recordedChunks.push(event.data);
      };
      recorder.onstop = () => this._finishRecording(recorder);
      recorder.onerror = event => {
        this.onError?.(event.error || new Error('A gravação foi interrompida pelo navegador.'));
        this.stopRecording();
      };
      recorder.start(1000);
      this.isRecording = true;
      this.isPaused = false;
      this.elapsedTime = 0;
      this.accumulatedMs = 0;
      this.startedAt = performance.now();
      this.timerInterval = setInterval(() => this._tick(), 250);
      this.onStateChange?.(true, false);
      return true;
    } catch (error) {
      this._releaseTracks();
      if (this.mediaRecorder) this.mediaRecorder.onstop = this.mediaRecorder.ondataavailable = this.mediaRecorder.onerror = null;
      this.mediaRecorder = null;
      this.isRecording = false;
      this.isPaused = false;
      this.recordedChunks = [];
      this.currentMimeType = '';
      this.onError?.(error);
      return false;
    }
  }

  _tick() {
    const ms = this.accumulatedMs + (this.isRecording && !this.isPaused ? performance.now() - this.startedAt : 0);
    this.elapsedTime = Math.floor(ms / 1000);
    this.onTimerUpdate?.(this.getFormattedTime());
  }

  pauseRecording() {
    if (!this.isRecording || !this.mediaRecorder || this.mediaRecorder.state === 'inactive') return false;
    try {
      if (this.isPaused) {
        this.mediaRecorder.resume();
        this.startedAt = performance.now();
        this.isPaused = false;
      } else {
        this.mediaRecorder.pause();
        this.accumulatedMs += performance.now() - this.startedAt;
        this.isPaused = true;
      }
      this._tick();
      this.onStateChange?.(true, this.isPaused);
      return true;
    } catch (error) { this.onError?.(error); return false; }
  }

  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return false;
    this._tick();
    clearInterval(this.timerInterval);
    this.isRecording = false;
    this.isPaused = false;
    this.finalizing = true;
    try {
      if (this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
      else this._finishRecording(this.mediaRecorder);
    } catch (error) { this.onError?.(error); this._finishRecording(this.mediaRecorder); }
    if (this.finalizing) this.onStateChange?.(false, false);
    return true;
  }

  _finishRecording(recorder) {
    if (!recorder || this.mediaRecorder !== recorder) return;
    this.isRecording = false;
    this.isPaused = false;
    clearInterval(this.timerInterval);
    this._releaseTracks();
    this.mediaRecorder = null;
    recorder.onstop = recorder.ondataavailable = recorder.onerror = null;
    try { this._finalizeRecording(); }
    catch (error) { this.onError?.(error); }
    finally {
      this.finalizing = false;
      this.onStateChange?.(false, false);
    }
  }

  _releaseTracks() {
    for (const track of this.ownedTracks) track.stop();
    this.ownedTracks.clear();
  }

  _finalizeRecording() {
    if (this.destroyed || !this.recordedChunks.length) { this.recordedChunks = []; return; }
    const mimeType = this.currentMimeType;
    const blob = new Blob(this.recordedChunks, { type: mimeType });
    const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
    const filename = 'Estudio_' + new Date().toISOString().replace(/[:.]/g, '-') + '.' + ext;
    this.recordedChunks = [];
    const url = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement('a');
      anchor.download = filename;
      anchor.href = url;
      anchor.click();
    } catch (error) { URL.revokeObjectURL(url); throw error; }
    const timeout = setTimeout(() => { URL.revokeObjectURL(url); this.exportUrls.delete(url); }, 60000);
    this.exportUrls.set(url, timeout);
    this.onExport?.({ blob, filename, mimeType });
  }

  getFormattedTime() {
    const seconds = this.elapsedTime;
    return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map(value => String(value).padStart(2, '0')).join(':');
  }

  destroy() {
    this.destroyed = true;
    this.stopRecording();
    clearInterval(this.timerInterval);
    this._releaseTracks();
    this.recordedChunks = [];
    for (const [url, timeout] of this.exportUrls) { clearTimeout(timeout); URL.revokeObjectURL(url); }
    this.exportUrls.clear();
    this.onExport = null;
    this.onStateChange = null;
    this.onTimerUpdate = null;
    this.onError = null;
  }
}
