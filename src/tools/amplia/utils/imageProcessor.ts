/**
 * Client-side high-fidelity image filtering & canvas processing.
 * Powers the web-native mode and instant preview in Amplia.
 */

export async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem para processamento"));
    img.src = src;
  });
}

/**
 * High-performance Contrast Adaptive Sharpening (CAS) emulation on 2D canvas.
 */
export function applyCasFilter(ctx: CanvasRenderingContext2D, width: number, height: number, sharpness: number = 0.5) {
  if (sharpness <= 0) return;
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;
  const copy = new Uint8ClampedArray(d);

  // Kernel weight calculation based on sharpness (0.0 to 1.0)
  const peak = -0.15 * sharpness;
  const center = 1.0 - 4.0 * peak;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const top = ((y - 1) * width + x) * 4;
      const bottom = ((y + 1) * width + x) * 4;
      const left = (y * width + (x - 1)) * 4;
      const right = (y * width + (x + 1)) * 4;

      for (let c = 0; c < 3; c++) {
        const val =
          copy[idx + c] * center +
          copy[top + c] * peak +
          copy[bottom + c] * peak +
          copy[left + c] * peak +
          copy[right + c] * peak;
        d[idx + c] = Math.min(255, Math.max(0, val));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Adjusts color tone, warmth and saturation for old photos or stylized grading.
 */
export function adjustTones(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  saturation: number = 1.0,
  warmth: number = 0.0
) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;

  const warmthR = 1.0 + warmth * 0.15;
  const warmthB = 1.0 - warmth * 0.12;

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];

    // Saturation adjustment
    if (saturation !== 1.0) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * saturation;
      g = gray + (g - gray) * saturation;
      b = gray + (b - gray) * saturation;
    }

    // Warmth
    r = r * warmthR;
    b = b * warmthB;

    d[i] = Math.min(255, Math.max(0, r));
    d[i + 1] = Math.min(255, Math.max(0, g));
    d[i + 2] = Math.min(255, Math.max(0, b));
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Composites transparent cutout image on top of solid background color.
 */
export async function compositeWithBackground(
  imageSrc: string,
  bgColor: string,
  width: number,
  height: number
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context não disponível");

  if (bgColor !== "transparent") {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  }

  const img = await loadImageElement(imageSrc);
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Falha ao exportar blob"));
    }, "image/png");
  });
}

/**
 * Client-side fast upscale (2x or 4x with bicubic Lanczos-like canvas scaling & adaptive sharpening).
 */
export async function clientSideQuickUpscale(
  imageSrc: string,
  scale: 2 | 4 = 2,
  sharpness: number = 0.65
): Promise<{ url: string; blob: Blob; width: number; height: number }> {
  const img = await loadImageElement(imageSrc);
  const targetW = img.naturalWidth * scale;
  const targetH = img.naturalHeight * scale;

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Contexto 2D indisponível");

  // Step 1: High quality multi-step resize for smooth interpolation
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // Step 2: Apply adaptive sharpening
  applyCasFilter(ctx, targetW, targetH, sharpness);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Falha na geração do arquivo"));
      const url = URL.createObjectURL(blob);
      resolve({ url, blob, width: targetW, height: targetH });
    }, "image/png");
  });
}
