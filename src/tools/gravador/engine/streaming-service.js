// Streaming Service for OBS Web
export class StreamingService {
  constructor(compositor, audioEngine) {
    this.compositor = compositor;
    this.audioEngine = audioEngine;
    this.isStreaming = false;
    this.startTime = 0;
    this.elapsedTime = 0;
    this.timerInterval = null;
    this.bitrate = 0;
    this.droppedFrames = 0;

    this.onStateChange = null;
    this.onStatsUpdate = null;
  }

  startStreaming(serverUrl = 'rtmp://live.twitch.tv/app', streamKey = 'live_*****') {
    if (this.isStreaming) return;

    this.isStreaming = true;
    this.startTime = Date.now();
    this.elapsedTime = 0;
    this.bitrate = 6000;
    this.droppedFrames = 0;

    this.timerInterval = setInterval(() => {
      this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
      // Realistic slight bitrate variance (5800 - 6200 kbps)
      this.bitrate = Math.floor(5800 + Math.random() * 400);

      if (this.onStatsUpdate) {
        this.onStatsUpdate({
          time: this.getFormattedTime(),
          bitrate: this.bitrate,
          droppedFrames: this.droppedFrames
        });
      }
    }, 1000);

    if (this.onStateChange) this.onStateChange(true);
  }

  stopStreaming() {
    if (!this.isStreaming) return;
    clearInterval(this.timerInterval);
    this.isStreaming = false;
    this.bitrate = 0;
    if (this.onStateChange) this.onStateChange(false);
  }

  getFormattedTime() {
    const s = this.elapsedTime;
    const hrs = String(Math.floor(s / 3600)).padStart(2, '0');
    const mins = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const secs = String(s % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  }
}
