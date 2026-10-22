// Status Bar UI
export class StatusBarView {
  constructor(compositor, recordingService, streamingService) {
    this.compositor = compositor;
    this.recordingService = recordingService;
    this.streamingService = streamingService;

    this.liveDot = document.getElementById('status-live-dot');
    this.liveText = document.getElementById('status-live-text');
    this.recDot = document.getElementById('status-rec-dot');
    this.recText = document.getElementById('status-rec-text');
    this.cpuText = document.getElementById('status-cpu-text');
    this.fpsText = document.getElementById('status-fps-text');
    this.droppedText = document.getElementById('status-dropped-text');
    this.bitrateText = document.getElementById('status-bitrate-text');

    this._setupListeners();
  }

  _setupListeners() {
    // Compositor Stats (FPS, render time)
    this.compositor.onStatsUpdate = (stats) => {
      if (this.fpsText) {
        this.fpsText.textContent = `${stats.fps.toFixed(2)} fps`;
      }
      if (this.cpuText) {
        // Calculate estimated simulated CPU from render time
        const cpuPercent = Math.min(12, Math.max(0.8, (stats.renderTimeMs / 16.6) * 4)).toFixed(1);
        this.cpuText.textContent = `CPU: ${cpuPercent}%`;
      }
    };

    // Recording Service
    this.recordingService.onStateChange = (isRecording) => {
      if (this.recDot) {
        this.recDot.classList.toggle('active-red', isRecording);
      }
      if (!isRecording && this.recText) {
        this.recText.textContent = 'REC: 00:00:00';
      }
    };

    this.recordingService.onTimerUpdate = (timeStr) => {
      if (this.recText) {
        this.recText.textContent = `REC: ${timeStr}`;
      }
    };

    // Streaming Service
    this.streamingService.onStateChange = (isStreaming) => {
      if (this.liveDot) {
        this.liveDot.classList.toggle('active-green', isStreaming);
      }
      if (!isStreaming) {
        if (this.liveText) this.liveText.textContent = 'LIVE: 00:00:00';
        if (this.bitrateText) this.bitrateText.textContent = 'kb/s: 0';
        if (this.droppedText) this.droppedText.textContent = 'Dropped Frames: 0 (0.0%)';
      }
    };

    this.streamingService.onStatsUpdate = (stats) => {
      if (this.liveText) this.liveText.textContent = `LIVE: ${stats.time}`;
      if (this.bitrateText) this.bitrateText.textContent = `kb/s: ${stats.bitrate}`;
      if (this.droppedText) this.droppedText.textContent = `Dropped Frames: ${stats.droppedFrames} (0.0%)`;
    };
  }
}
