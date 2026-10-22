// MediaRecorder & MP4 High-Quality Recording Service
export class RecordingService {
  constructor(compositor, audioEngine, config = {}) {
    this.compositor = compositor;
    this.audioEngine = audioEngine;
    this.format = config.format || 'mp4'; // 'mp4' or 'webm'
    this.bitrateKbps = config.bitrateKbps || 16000; // 16 Mbps for crisp Full HD
    this.fps = config.fps || 60;

    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.isPaused = false;
    this.startTime = 0;
    this.elapsedTime = 0;
    this.timerInterval = null;
    this.currentMimeType = '';

    this.onStateChange = null;
    this.onTimerUpdate = null;
  }

  setConfig(config = {}) {
    if (config.format) this.format = config.format.toLowerCase();
    if (config.bitrateKbps) this.bitrateKbps = parseInt(config.bitrateKbps, 10);
    if (config.fps) this.fps = parseInt(config.fps, 10);
  }

  startRecording() {
    if (this.isRecording) return;

    // Capture pristine 60FPS stream from the master offscreen canvas
    const videoStream = this.compositor.getStream(this.fps);
    if (!videoStream) {
      alert('Cannot start recording: canvas stream unavailable.');
      return;
    }

    // Combine Video + Audio
    const mixedStream = new MediaStream();
    videoStream.getVideoTracks().forEach(track => mixedStream.addTrack(track));

    const audioStream = this.audioEngine.getMixedAudioStream();
    if (audioStream) {
      audioStream.getAudioTracks().forEach(track => mixedStream.addTrack(track));
    }

    // Determine target MIME type according to user's configured format
    let selectedMime = '';
    const bps = this.bitrateKbps * 1000; // e.g. 16,000,000 bps = 16 Mbps

    if (this.format === 'mp4') {
      const mp4Candidates = [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1.4D401F,mp4a.40.2',
        'video/mp4;codecs=avc1.640028,mp4a.40.2',
        'video/mp4;codecs=avc1',
        'video/mp4;codecs=h264,opus',
        'video/mp4;codecs=h264',
        'video/mp4'
      ];
      selectedMime = mp4Candidates.find(t => MediaRecorder.isTypeSupported(t));

      if (!selectedMime) {
        // Fallback if browser doesn't have native MP4 in MediaRecorder
        console.warn('Native video/mp4 MediaRecorder not supported in this browser, using high-profile WebM fallback');
        selectedMime = 'video/webm;codecs=vp9,opus';
      }
    } else {
      const webmCandidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];
      selectedMime = webmCandidates.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
    }

    try {
      const recorderOptions = {
        videoBitsPerSecond: bps,
        audioBitsPerSecond: 320000 // 320 Kbps High Quality Audio
      };
      if (selectedMime) {
        recorderOptions.mimeType = selectedMime;
      }

      this.currentMimeType = selectedMime;
      this.mediaRecorder = new MediaRecorder(mixedStream, recorderOptions);
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this._finalizeRecording();
      };

      this.mediaRecorder.start(1000); // 1-second chunks
      this.isRecording = true;
      this.isPaused = false;
      this.startTime = Date.now();
      this.elapsedTime = 0;

      this.timerInterval = setInterval(() => {
        if (!this.isPaused) {
          this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
          if (this.onTimerUpdate) {
            this.onTimerUpdate(this.getFormattedTime());
          }
        }
      }, 1000);

      if (this.onStateChange) this.onStateChange(true);
      console.log(`Recording started in ${this.format.toUpperCase()} (${selectedMime}) at ${this.bitrateKbps} Kbps, ${this.fps} FPS.`);
    } catch (err) {
      console.error('Error starting MediaRecorder:', err);
      alert('Could not start recording: ' + err.message);
    }
  }

  pauseRecording() {
    if (!this.isRecording || !this.mediaRecorder) return;
    if (this.isPaused) {
      this.mediaRecorder.resume();
      this.isPaused = false;
    } else {
      this.mediaRecorder.pause();
      this.isPaused = true;
    }
  }

  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return;
    clearInterval(this.timerInterval);
    this.mediaRecorder.stop();
    this.isRecording = false;
    this.isPaused = false;
    if (this.onStateChange) this.onStateChange(false);
  }

  _finalizeRecording() {
    if (this.recordedChunks.length === 0) return;

    // Use user-requested format
    const isMp4 = this.format === 'mp4';
    const mime = this.currentMimeType || (isMp4 ? 'video/mp4' : 'video/webm');
    const blob = new Blob(this.recordedChunks, { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const ext = isMp4 ? 'mp4' : 'webm';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `Gravador_${timestamp}.${ext}`;
    a.href = url;
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 60000);
    this.recordedChunks = [];
  }

  getFormattedTime() {
    const s = this.elapsedTime;
    const hrs = String(Math.floor(s / 3600)).padStart(2, '0');
    const mins = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const secs = String(s % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  }
}
