import type { TakeRecord, CanvasDressing, ZoomKeyframe } from "../types";

export const DEFAULT_DRESSING: CanvasDressing = {
  background: "sunset",
  padding: 48,
  borderRadius: 16,
  shadow: "deep",
  windowChrome: "macos",
  windowTitle: "lab.caramelo/visao-geral",
  aspectRatio: "16:9",
  videoFit: "cover",
};

export const INITIAL_ZOOM_KEYFRAMES: ZoomKeyframe[] = [
  {
    id: "zoom-1",
    time: 1.5,
    duration: 3.5,
    scale: 1.6,
    focusX: 0.28,
    focusY: 0.35,
    label: "Métricas & Crescimento",
  },
  {
    id: "zoom-2",
    time: 5.5,
    duration: 3.5,
    scale: 1.7,
    focusX: 0.72,
    focusY: 0.42,
    label: "Taxa de Conversão",
  },
];

/**
 * Generates an animated video blob of a sample screen recording with simulated mouse cursor
 * and UI interactions, ready for immediate testing in the studio!
 */
export async function generateSampleTake(): Promise<TakeRecord> {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d")!;

  const stream = canvas.captureStream(30);
  const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm; codecs=vp9" });
  const chunks: BlobPart[] = [];

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const durationSec = 10;
  const fps = 30;
  const totalFrames = durationSec * fps;
  let currentFrame = 0;

  return new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const videoUrl = URL.createObjectURL(blob);

      // Generate a thumbnail frame
      const thumbCanvas = document.createElement("canvas");
      thumbCanvas.width = 320;
      thumbCanvas.height = 180;
      const tCtx = thumbCanvas.getContext("2d")!;
      tCtx.drawImage(canvas, 0, 0, 320, 180);
      const thumbnailUrl = thumbCanvas.toDataURL("image/jpeg", 0.85);

      resolve({
        id: `demo-${Date.now()}`,
        title: "Demo Oficial — Dashboard do LAB",
        createdAt: Date.now(),
        duration: durationSec,
        blob,
        videoUrl,
        thumbnailUrl,
        dressing: DEFAULT_DRESSING,
        zoomKeyframes: INITIAL_ZOOM_KEYFRAMES,
        trimStart: 0,
        trimEnd: durationSec,
      });
    };

    mediaRecorder.start();

    const interval = setInterval(() => {
      currentFrame++;
      const progress = currentFrame / totalFrames;
      const timeSec = progress * durationSec;

      // Draw synthetic UI background
      ctx.fillStyle = "#101014";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header bar
      ctx.fillStyle = "#18181D";
      ctx.fillRect(0, 0, canvas.width, 60);

      // Brand Logo mark
      ctx.fillStyle = "#FF701A";
      ctx.beginPath();
      ctx.roundRect(24, 16, 28, 28, 6);
      ctx.fill();

      ctx.fillStyle = "#101014";
      ctx.font = "900 16px Inter, sans-serif";
      ctx.fillText("C", 32, 36);

      ctx.fillStyle = "#FFF4E8";
      ctx.font = "700 16px Inter, sans-serif";
      ctx.fillText("Um Cara Caramelo · LAB Studio", 62, 35);

      // Status pill
      ctx.fillStyle = "rgba(37, 191, 255, 0.15)";
      ctx.beginPath();
      ctx.roundRect(1080, 16, 170, 28, 14);
      ctx.fill();

      ctx.fillStyle = "#25BFFF";
      ctx.beginPath();
      ctx.arc(1098, 30, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "600 12px Inter, sans-serif";
      ctx.fillText("SISTEMA ONLINE", 1112, 34);

      // Metric Card 1 (Left)
      ctx.fillStyle = "#18181D";
      ctx.beginPath();
      ctx.roundRect(40, 90, 360, 220, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 244, 232, 0.08)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 112, 26, 0.2)";
      ctx.beginPath();
      ctx.roundRect(60, 110, 40, 40, 8);
      ctx.fill();

      ctx.fillStyle = "#FF701A";
      ctx.font = "700 18px Inter, sans-serif";
      ctx.fillText("▲", 72, 136);

      ctx.fillStyle = "rgba(255, 244, 232, 0.6)";
      ctx.font = "600 13px Inter, sans-serif";
      ctx.fillText("ALCANCE TOTAL", 112, 126);

      ctx.fillStyle = "#FFF4E8";
      ctx.font = "800 28px Space Grotesk, sans-serif";
      ctx.fillText("428.950", 112, 154);

      // Animated mini sparkline in Card 1
      ctx.strokeStyle = "#FF701A";
      ctx.lineWidth = 3;
      ctx.beginPath();
      const sparkY = [170, 165, 180, 150, 155, 130, 120, 110];
      sparkY.forEach((y, i) => {
        const x = 60 + i * 40;
        if (i === 0) ctx.moveTo(x, y + 80);
        else ctx.lineTo(x, y + 80);
      });
      ctx.stroke();

      // Metric Card 2 (Right)
      ctx.fillStyle = "#18181D";
      ctx.beginPath();
      ctx.roundRect(440, 90, 360, 220, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 244, 232, 0.08)";
      ctx.stroke();

      ctx.fillStyle = "rgba(37, 191, 255, 0.2)";
      ctx.beginPath();
      ctx.roundRect(460, 110, 40, 40, 8);
      ctx.fill();

      ctx.fillStyle = "#25BFFF";
      ctx.font = "700 18px Inter, sans-serif";
      ctx.fillText("★", 472, 136);

      ctx.fillStyle = "rgba(255, 244, 232, 0.6)";
      ctx.font = "600 13px Inter, sans-serif";
      ctx.fillText("TAXA DE CONVERSÃO", 512, 126);

      ctx.fillStyle = "#FFF4E8";
      ctx.font = "800 28px Space Grotesk, sans-serif";
      ctx.fillText("14,8%", 512, 154);

      // Card 3 (Bottom Table / Big graph)
      ctx.fillStyle = "#18181D";
      ctx.beginPath();
      ctx.roundRect(40, 340, 1200, 340, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 244, 232, 0.08)";
      ctx.stroke();

      ctx.fillStyle = "#FFF4E8";
      ctx.font = "700 16px Inter, sans-serif";
      ctx.fillText("Histórico de Interações por Minuto", 64, 380);

      // Draw animated bar charts in card 3
      for (let b = 0; b < 18; b++) {
        const bx = 64 + b * 64;
        const wave = Math.sin(progress * 10 + b * 0.4) * 0.3 + 0.7;
        const bh = 140 * wave;
        const by = 640 - bh;

        ctx.fillStyle = b % 2 === 0 ? "rgba(255, 112, 26, 0.85)" : "rgba(37, 191, 255, 0.85)";
        ctx.beginPath();
        ctx.roundRect(bx, by, 32, bh, 4);
        ctx.fill();
      }

      // Simulated smooth mouse cursor movement
      let curX = 300;
      let curY = 200;
      if (timeSec < 3.5) {
        // Move towards Card 1
        const t = Math.min(1, timeSec / 3);
        curX = 150 + t * 150;
        curY = 120 + t * 80;
      } else if (timeSec < 7.0) {
        // Move towards Card 2
        const t = (timeSec - 3.5) / 3.5;
        curX = 300 + t * 300;
        curY = 200 - t * 20;
      } else {
        // Move towards bottom chart
        const t = (timeSec - 7.0) / 3.0;
        curX = 600 - t * 200;
        curY = 180 + t * 300;
      }

      // Draw cursor pointer
      ctx.save();
      ctx.translate(curX, curY);

      // Click ripple effect around cursor
      if (timeSec % 2.5 < 0.6) {
        const rip = (timeSec % 2.5) / 0.6;
        ctx.strokeStyle = `rgba(255, 112, 26, ${1 - rip})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, rip * 35, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Mouse arrow
      ctx.fillStyle = "#FFF4E8";
      ctx.strokeStyle = "#101014";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 18);
      ctx.lineTo(5, 14);
      ctx.lineTo(10, 22);
      ctx.lineTo(13, 20);
      ctx.lineTo(8, 12);
      ctx.lineTo(14, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      if (currentFrame >= totalFrames) {
        clearInterval(interval);
        mediaRecorder.stop();
      }
    }, 1000 / fps);
  });
}
