/**
 * Módulo de Remoção de Plano de Fundo com IA (MediaPipe ImageSegmenter)
 * Processamento acelerado por WebGL/GPU diretamente no navegador, sem custos de servidor.
 * Um Cara Caramelo — Laboratório de Interação
 */

let cachedSegmenter: any = null;

async function getSegmenter(onProgress?: (msg: string) => void) {
  if (cachedSegmenter) return cachedSegmenter;

  onProgress?.('Carregando motor de visão neural...');
  const vision = await import(
    /* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs'
  );

  const { FilesetResolver, ImageSegmenter } = vision;

  onProgress?.('Inicializando WebAssembly/GPU...');
  const filesetResolver = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
  );

  onProgress?.('Carregando modelo de recorte...');
  cachedSegmenter = await ImageSegmenter.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float32/latest/selfie_segmenter.tflite',
      delegate: 'GPU',
    },
    runningMode: 'IMAGE',
    outputCategoryMask: false,
    outputConfidenceMasks: true,
  });

  return cachedSegmenter;
}

/**
 * Remove o fundo de uma imagem e retorna uma DataURL em formato PNG transparente.
 */
export async function removeImageBackground(
  imageSrc: string,
  onProgress?: (msg: string) => void
): Promise<string> {
  try {
    const segmenter = await getSegmenter(onProgress);

    onProgress?.('Decodificando imagem...');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Falha ao decodificar imagem para recorte.'));
      img.src = imageSrc;
    });

    onProgress?.('Segmentando assunto com IA...');
    const result = await segmenter.segment(img);
    const confidenceMasks = result.confidenceMasks;

    if (!confidenceMasks || confidenceMasks.length === 0) {
      throw new Error('Assunto não identificado pelo modelo.');
    }

    onProgress?.('Refinando bordas e transparência...');
    const mask = confidenceMasks[0];
    const maskData: Float32Array = mask.getAsFloat32Array();
    const maskWidth: number = mask.width;
    const maskHeight: number = mask.height;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = img.naturalWidth || img.width;
    outCanvas.height = img.naturalHeight || img.height;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) throw new Error('Falha ao criar contexto 2D');

    outCtx.drawImage(img, 0, 0);
    const imgData = outCtx.getImageData(0, 0, outCanvas.width, outCanvas.height);
    const pixels = imgData.data;

    const scaleX = maskWidth / outCanvas.width;
    const scaleY = maskHeight / outCanvas.height;

    for (let y = 0; y < outCanvas.height; y++) {
      const my = Math.min(maskHeight - 1, Math.floor(y * scaleY));
      const rowOffset = my * maskWidth;
      for (let x = 0; x < outCanvas.width; x++) {
        const mx = Math.min(maskWidth - 1, Math.floor(x * scaleX));
        const conf = maskData[rowOffset + mx]; // 0.0 (fundo) .. 1.0 (assunto)
        const pIndex = (y * outCanvas.width + x) * 4;

        // Curva suave anti-aliased de transição de borda
        let alpha = 0;
        if (conf >= 0.65) {
          alpha = 1;
        } else if (conf <= 0.25) {
          alpha = 0;
        } else {
          alpha = (conf - 0.25) / 0.4;
        }

        pixels[pIndex + 3] = Math.round(pixels[pIndex + 3] * alpha);
      }
    }

    outCtx.putImageData(imgData, 0, 0);
    onProgress?.('Concluído!');
    return outCanvas.toDataURL('image/png');
  } catch (err) {
    console.warn('MediaPipe segmentation falhou, usando algoritmo de fallback:', err);
    return fallbackBackgroundRemoval(imageSrc, onProgress);
  }
}

/**
 * Fallback de remoção de fundo por amostragem de cantos e luminância/croma
 */
async function fallbackBackgroundRemoval(
  imageSrc: string,
  onProgress?: (msg: string) => void
): Promise<string> {
  onProgress?.('Processando recorte por contraste...');
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Contexto 2D não suportado');

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imgData.data;

  // Amostra a cor média dos 4 cantos como cor de fundo provável
  const corners = [
    [0, 0],
    [canvas.width - 1, 0],
    [0, canvas.height - 1],
    [canvas.width - 1, canvas.height - 1],
  ];

  let bgR = 0, bgG = 0, bgB = 0;
  for (const [cx, cy] of corners) {
    const idx = (cy * canvas.width + cx) * 4;
    bgR += pixels[idx];
    bgG += pixels[idx + 1];
    bgB += pixels[idx + 2];
  }
  bgR /= 4;
  bgG /= 4;
  bgB /= 4;

  const threshold = 45;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
    if (dist < threshold) {
      const alpha = Math.max(0, (dist - 15) / (threshold - 15));
      pixels[i + 3] = Math.round(pixels[i + 3] * alpha);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}
