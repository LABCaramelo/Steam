// Source Factory - handles creation and device acquisition
import { SourceItem } from './source-item.js';

export class SourceFactory {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
  }

  // Create source from type
  async createSource(type, name = null) {
    switch (type) {
      case 'monitor':
        return await this.createDisplayCapture(name);
      case 'camera':
        return await this.createVideoCapture(name);
      case 'mic':
        return await this.createAudioInput(name);
      case 'image':
        return this.createImageSource(name);
      case 'video':
        return this.createMediaSource(name);
      case 'browser':
        return this.createBrowserSource(name);
      case 'text':
        return this.createTextSource(name);
      case 'color':
        return this.createColorSource(name);
      default:
        return new SourceItem({ type, name: name || 'Source' });
    }
  }

  // Screen / Window Capture via getDisplayMedia
  async createDisplayCapture(name) {
    const source = new SourceItem({
      name: name || 'Display Capture',
      type: 'monitor',
      x: 0,
      y: 0,
      width: 1920,
      height: 1080
    });

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 60, cursor: 'always' },
          audio: true
        });

        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true; // Avoid feedback
        await video.play().catch(() => {});

        source.props.stream = stream;
        source.props.videoElement = video;

        // Auto size
        video.addEventListener('loadedmetadata', () => {
          if (video.videoWidth && video.videoHeight) {
            source.width = video.videoWidth;
            source.height = video.videoHeight;
          }
        });

        // Audio integration
        if (stream.getAudioTracks().length > 0 && this.audioEngine) {
          this.audioEngine.attachSourceAudio(source, stream);
        }

        // When user clicks browser "Stop Sharing"
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          source.props.stream = null;
          source.props.videoElement = null;
        });
      }
    } catch (err) {
      console.warn('Display capture canceled or failed:', err);
    }

    return source;
  }

  // Webcam Capture via getUserMedia
  async createVideoCapture(name) {
    const source = new SourceItem({
      name: name || 'Video Capture Device',
      type: 'camera',
      x: 1280,
      y: 720,
      width: 640,
      height: 360
    });

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, frameRate: 60 },
          audio: true
        });

        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        await video.play().catch(() => {});

        source.props.stream = stream;
        source.props.videoElement = video;

        if (stream.getAudioTracks().length > 0 && this.audioEngine) {
          this.audioEngine.attachSourceAudio(source, stream);
        }
      }
    } catch (err) {
      console.warn('Camera capture canceled or failed:', err);
    }

    return source;
  }

  // Audio Input Capture (Microphone)
  async createAudioInput(name) {
    const source = new SourceItem({
      name: name || 'Mic/Aux',
      type: 'mic',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      visible: false // Audio-only sources don't show on canvas
    });

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        source.props.stream = stream;
        if (this.audioEngine) {
          this.audioEngine.attachSourceAudio(source, stream);
        }
      }
    } catch (err) {
      console.warn('Microphone capture canceled or failed:', err);
    }

    return source;
  }

  // Image Source
  createImageSource(name, file = null) {
    const source = new SourceItem({
      name: name || 'Image',
      type: 'image',
      x: 200,
      y: 150,
      width: 800,
      height: 450
    });

    if (file) {
      const img = new Image();
      img.onload = () => {
        source.width = img.naturalWidth;
        source.height = img.naturalHeight;
        source.props.imageElement = img;
      };
      img.src = URL.createObjectURL(file);
    }

    return source;
  }

  // Media Source (Video / Audio)
  createMediaSource(name, file = null) {
    const source = new SourceItem({
      name: name || 'Media Source',
      type: 'video',
      x: 300,
      y: 200,
      width: 960,
      height: 540
    });

    const video = document.createElement('video');
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;

    if (file) {
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        source.width = video.videoWidth;
        source.height = video.videoHeight;
      };
    } else {
      // High-quality canvas synthetic animation loop video if no file
      this._generateSyntheticVideo(video);
    }

    source.props.videoElement = video;
    video.play().catch(() => {});

    return source;
  }

  _generateSyntheticVideo(video) {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext('2d');
    let t = 0;

    function draw() {
      t += 0.03;
      // Beautiful animated gradient background
      const grad = ctx.createLinearGradient(0, 0, 960, 540);
      grad.addColorStop(0, `hsl(${t * 40 % 360}, 70%, 25%)`);
      grad.addColorStop(0.5, `hsl(${(t * 40 + 60) % 360}, 75%, 20%)`);
      grad.addColorStop(1, `hsl(${(t * 40 + 120) % 360}, 80%, 15%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 960, 540);

      // Rotating cyber rings
      ctx.save();
      ctx.translate(480, 270);
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 80 + i * 40, t * (i % 2 === 0 ? 1 : -1) + i, t * (i % 2 === 0 ? 1 : -1) + i + Math.PI * 1.5);
        ctx.lineWidth = 6;
        ctx.strokeStyle = `hsla(${(t * 50 + i * 50) % 360}, 90%, 65%, 0.8)`;
        ctx.stroke();
      }
      ctx.restore();

      // Text badge
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SYNTHETIC MEDIA LOOP (60 FPS)', 480, 275);
      requestAnimationFrame(draw);
    }
    draw();

    try {
      const stream = canvas.captureStream(60);
      video.srcObject = stream;
    } catch (e) {
      console.warn('captureStream error:', e);
    }
  }

  // Text Source
  createTextSource(name) {
    return new SourceItem({
      name: name || 'Text (GDI+)',
      type: 'text',
      x: 100,
      y: 900,
      width: 1720,
      height: 100,
      props: {
        text: 'BREAKING NEWS: OBS STUDIO WEB EDITION RUNNING AT 60 FPS',
        fontSize: 40,
        font: 'Inter, sans-serif',
        textColor: '#FFFFFF',
        textBgColor: 'rgba(22, 23, 30, 0.85)',
        scrollSpeed: 120
      }
    });
  }

  // Color Source
  createColorSource(name) {
    return new SourceItem({
      name: name || 'Color Source',
      type: 'color',
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      props: {
        color: '#16171e'
      }
    });
  }

  // Browser Source
  createBrowserSource(name) {
    return new SourceItem({
      name: name || 'Browser',
      type: 'browser',
      x: 1400,
      y: 100,
      width: 480,
      height: 600,
      props: {
        url: 'https://twitch.tv/chat'
      }
    });
  }
}
