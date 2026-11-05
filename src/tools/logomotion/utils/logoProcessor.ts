import type { LogoAsset } from "../types";

/**
 * Reads user file, detects background luminance, auto-removes solid white/black backdrops
 * and generates high-contrast inverted versions for Match Cuts.
 */
export async function processLogoFile(file: File): Promise<LogoAsset> {
  const isSvg = file.type === "image/svg+xml" || file.name.endsWith(".svg");

  if (isSvg) {
    const text = await file.text();
    // Parse SVG viewBox or width/height
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    let width = 500;
    let height = 500;

    if (svgEl) {
      const viewBox = svgEl.getAttribute("viewBox");
      if (viewBox) {
        const parts = viewBox.split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
          width = parts[2];
          height = parts[3];
        }
      } else {
        const w = parseFloat(svgEl.getAttribute("width") || "500");
        const h = parseFloat(svgEl.getAttribute("height") || "500");
        if (w > 0 && h > 0) {
          width = w;
          height = h;
        }
      }
    }

    const blob = new Blob([text], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    // Create inverted version
    const invertedSvg = text
      .replace(/fill="#([0-9a-fA-F]{3,8})"/gi, (match, hex) => {
        if (/^([fF]{3,6})$/.test(hex)) return 'fill="#101014"';
        if (/^([0-9]{3,6})$/.test(hex)) return 'fill="#FFF4E8"';
        return match;
      })
      .replace(/fill:\s*#([0-9a-fA-F]{3,8})/gi, (match, hex) => {
        if (/^([fF]{3,6})$/.test(hex)) return "fill: #101014";
        if (/^([0-9]{3,6})$/.test(hex)) return "fill: #FFF4E8";
        return match;
      });

    const invertedBlob = new Blob([invertedSvg], { type: "image/svg+xml" });
    const invertedUrl = URL.createObjectURL(invertedBlob);

    return {
      src: url,
      isSvg: true,
      aspectRatio: width / height,
      width,
      height,
      svgText: text,
      autoInvertedSrc: invertedUrl,
    };
  }

  // Handle Raster (PNG / JPG / WebP)
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not initialize canvas context");

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Check if corners have uniform solid color (e.g. white or black backdrop)
  const corners = [
    [0, 0],
    [canvas.width - 1, 0],
    [0, canvas.height - 1],
    [canvas.width - 1, canvas.height - 1],
  ];

  let sumR = 0, sumG = 0, sumB = 0, sampleCount = 0;
  for (const [cx, cy] of corners) {
    const idx = (cy * canvas.width + cx) * 4;
    sumR += data[idx];
    sumG += data[idx + 1];
    sumB += data[idx + 2];
    sampleCount++;
  }
  const bgR = sumR / sampleCount;
  const bgG = sumG / sampleCount;
  const bgB = sumB / sampleCount;

  const isWhiteBg = bgR > 240 && bgG > 240 && bgB > 240;
  const isBlackBg = bgR < 20 && bgG < 20 && bgB < 20;

  // If there's an opaque white or black background, make it transparent
  if (isWhiteBg || isBlackBg) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
      if (dist < 42) {
        data[i + 3] = 0; // Transparent
      } else if (dist < 70) {
        data[i + 3] = Math.round(((dist - 42) / 28) * 255);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  const cleanedSrc = canvas.toDataURL("image/png");

  // Create inverted version
  const invCanvas = document.createElement("canvas");
  invCanvas.width = canvas.width;
  invCanvas.height = canvas.height;
  const invCtx = invCanvas.getContext("2d");
  if (invCtx) {
    invCtx.filter = "invert(1) contrast(1.15)";
    invCtx.drawImage(canvas, 0, 0);
  }
  const autoInvertedSrc = invCanvas.toDataURL("image/png");

  return {
    src: cleanedSrc,
    isSvg: false,
    aspectRatio: img.width / img.height,
    width: img.width,
    height: img.height,
    autoInvertedSrc,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}
