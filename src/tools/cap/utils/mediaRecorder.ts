import type { CanvasDressing, ZoomKeyframe } from "../types";

export interface ExportProgress {
  currentSec: number;
  totalSec: number;
  percent: number;
}

export function drawWindowChrome(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  title: string
) {
  const h = 38;
  ctx.save();
  ctx.fillStyle = "#18181D";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, [12, 12, 0, 0]);
  ctx.fill();

  // Traffic lights
  const dots = [
    { color: "#FF5F56", cx: x + 18 },
    { color: "#FFBD2E", cx: x + 36 },
    { color: "#27C93F", cx: x + 54 },
  ];
  dots.forEach(({ color, cx }) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, y + 19, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // URL / Title pill
  const pillW = Math.min(280, w - 160);
  const pillX = x + (w - pillW) / 2;
  ctx.fillStyle = "rgba(255, 244, 232, 0.08)";
  ctx.beginPath();
  ctx.roundRect(pillX, y + 8, pillW, 22, 6);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 244, 232, 0.7)";
  ctx.font = "600 11px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title || "lab.caramelo/cap", pillX + pillW / 2, y + 23);

  ctx.restore();
}

/**
 * Calculates current active zoom scale and focal point based on keyframes.
 * Uses smooth cubic easing for natural cinematic motion.
 */
export function getInterpolatedZoom(
  keyframes: ZoomKeyframe[],
  timeSec: number
): { scale: number; focusX: number; focusY: number } {
  // Find if within any keyframe
  const active = keyframes.find(
    (k) => timeSec >= k.time && timeSec <= k.time + k.duration
  );

  if (!active) {
    return { scale: 1.0, focusX: 0.5, focusY: 0.5 };
  }

  const elapsed = timeSec - active.time;
  const rampSec = 0.6; // ramp in/out time

  let factor = 1.0;
  if (elapsed < rampSec) {
    // Ease in
    const t = elapsed / rampSec;
    factor = t * t * (3 - 2 * t);
  } else if (elapsed > active.duration - rampSec) {
    // Ease out
    const t = (active.duration - elapsed) / rampSec;
    factor = t * t * (3 - 2 * t);
  }

  const currentScale = 1.0 + (active.scale - 1.0) * factor;
  const currentFocusX = 0.5 + (active.focusX - 0.5) * factor;
  const currentFocusY = 0.5 + (active.focusY - 0.5) * factor;

  return { scale: currentScale, focusX: currentFocusX, focusY: currentFocusY };
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dressing: CanvasDressing
) {
  ctx.save();
  switch (dressing.background) {
    case "sunset": {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#FF701A");
      grad.addColorStop(0.5, "#FF3D8D");
      grad.addColorStop(1, "#7657FF");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "cyber": {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#7657FF");
      grad.addColorStop(0.6, "#25BFFF");
      grad.addColorStop(1, "#101014");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "acid": {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#FFD52A");
      grad.addColorStop(1, "#FF701A");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "cream": {
      ctx.fillStyle = "#FFF4E8";
      ctx.fillRect(0, 0, w, h);
      // Subtle dot pattern
      ctx.fillStyle = "rgba(16, 16, 20, 0.05)";
      for (let x = 0; x < w; x += 16) {
        for (let y = 0; y < h; y += 16) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "mesh": {
      ctx.fillStyle = "#101014";
      ctx.fillRect(0, 0, w, h);
      // Ambient glowing orbs
      const g1 = ctx.createRadialGradient(w * 0.2, h * 0.3, 20, w * 0.2, h * 0.3, w * 0.45);
      g1.addColorStop(0, "rgba(255, 112, 26, 0.35)");
      g1.addColorStop(1, "transparent");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      const g2 = ctx.createRadialGradient(w * 0.8, h * 0.7, 30, w * 0.8, h * 0.7, w * 0.45);
      g2.addColorStop(0, "rgba(118, 87, 255, 0.4)");
      g2.addColorStop(1, "transparent");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "studio": {
      ctx.fillStyle = "#141418";
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "solid":
    default: {
      ctx.fillStyle = dressing.customColor || "#101014";
      ctx.fillRect(0, 0, w, h);
      break;
    }
  }
  ctx.restore();
}

/**
 * High quality export engine that renders the trimmed video with background,
 * padding, corner radius, drop shadow, macOS chrome, and animated smooth zooms!
 */
export async function renderExportedVideo(
  videoElement: HTMLVideoElement,
  dressing: CanvasDressing,
  keyframes: ZoomKeyframe[],
  trimStart: number,
  trimEnd: number,
  onProgress?: (progress: ExportProgress) => void
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d")!;

  const totalDuration = trimEnd - trimStart;
  const stream = canvas.captureStream(30);

  // Capture audio from video element if available
  let combinedStream = stream;
  try {
    const audioCtx = new AudioContext();
    const sourceNode = audioCtx.createMediaElementSource(videoElement);
    const dest = audioCtx.createMediaStreamDestination();
    sourceNode.connect(dest);
    sourceNode.connect(audioCtx.destination);
    combinedStream = new MediaStream([
      ...stream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);
  } catch {
    // If audio extraction is not supported/restricted, keep video stream
  }

  const mimeType = MediaRecorder.isTypeSupported("video/mp4")
    ? "video/mp4"
    : "video/webm; codecs=vp9";

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 8_000_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
    recorder.onerror = (err) => reject(err);

    videoElement.currentTime = trimStart;
    videoElement.pause();

    const chromeH = dressing.windowChrome === "macos" ? 38 : 0;
    const padding = dressing.padding * 1.5; // Scale for 1080p canvas

    const innerW = canvas.width - padding * 2;
    const innerH = canvas.height - padding * 2 - chromeH;
    const innerX = padding;
    const innerY = padding + chromeH;

    recorder.start();
    videoElement.play();

    const checkInterval = setInterval(() => {
      const cur = videoElement.currentTime;
      if (cur >= trimEnd || videoElement.ended) {
        clearInterval(checkInterval);
        videoElement.pause();
        recorder.stop();
        return;
      }

      const elapsed = cur - trimStart;
      onProgress?.({
        currentSec: elapsed,
        totalSec: totalDuration,
        percent: Math.min(100, Math.round((elapsed / totalDuration) * 100)),
      });

      // 1. Draw Background
      drawBackground(ctx, canvas.width, canvas.height, dressing);

      // 2. Draw Window Shadow
      ctx.save();
      if (dressing.shadow === "deep") {
        ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
        ctx.shadowBlur = 48;
        ctx.shadowOffsetY = 24;
      } else if (dressing.shadow === "glowCaramel") {
        ctx.shadowColor = "rgba(255, 112, 26, 0.4)";
        ctx.shadowBlur = 40;
      } else if (dressing.shadow === "glowCyan") {
        ctx.shadowColor = "rgba(37, 191, 255, 0.4)";
        ctx.shadowBlur = 40;
      } else if (dressing.shadow === "subtle") {
        ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 8;
      }

      // Draw backdrop base for shadow
      ctx.fillStyle = "#101014";
      ctx.beginPath();
      ctx.roundRect(
        innerX,
        padding,
        innerW,
        innerH + chromeH,
        dressing.borderRadius * 1.5
      );
      ctx.fill();
      ctx.restore();

      // 3. Draw Window Chrome
      if (dressing.windowChrome === "macos") {
        drawWindowChrome(ctx, innerX, padding, innerW, dressing.windowTitle);
      }

      // 4. Draw Video with Zoom & Pan Clipping
      ctx.save();
      ctx.beginPath();
      const r = dressing.borderRadius * 1.5;
      if (dressing.windowChrome === "macos") {
        ctx.roundRect(innerX, innerY, innerW, innerH, [0, 0, r, r]);
      } else {
        ctx.roundRect(innerX, innerY, innerW, innerH, r);
      }
      ctx.clip();

      // Compute animated zoom
      const { scale, focusX, focusY } = getInterpolatedZoom(keyframes, cur);

      // Draw zoomed video
      const vW = innerW * scale;
      const vH = innerH * scale;
      const offsetX = innerX - (focusX * scale - 0.5) * innerW;
      const offsetY = innerY - (focusY * scale - 0.5) * innerH;

      ctx.drawImage(videoElement, offsetX, offsetY, vW, vH);
      ctx.restore();
    }, 1000 / 30);
  });
}
