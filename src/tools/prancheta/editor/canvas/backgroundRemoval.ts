/**
 * Módulo de Remoção de Plano de Fundo com IA (MediaPipe ImageSegmenter)
 * Processamento acelerado por WebGL/GPU diretamente no navegador, sem custos de servidor.
 * Um Cara Caramelo — Laboratório de Interação
 */

let cachedSegmenter: any = null;

async function getSegmenter(onProgress?: (msg: string) => void) {
  if (cachedSegmenter) return cachedSegmenter;

  onProgress?.('Carregando motor de visão neural...');
  const moduleUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
  // Dynamic import via function constructor para evitar avisos do TypeScript e Vite
  const importDynamic = new Function('url', 'return import(url)');
  const vision = await importDynamic(moduleUrl);

  const { FilesetResolver, ImageSegmenter } = vision;

  onProgress?.('Inicializando WebAssembly/GPU...');
  const filesetResolver = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
  );

  onProgress?.('Carregando modelo de recorte...');
  try {
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
  } catch (err) {
    console.warn('Falha ao inicializar com GPU, tentando CPU...', err);
    cachedSegmenter = await ImageSegmenter.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float32/latest/selfie_segmenter.tflite',
        delegate: 'CPU',
      },
      runningMode: 'IMAGE',
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });
  }

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
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
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
  } catch (err: any) {
    console.error('Erro no recorte neural:', err);
    throw new Error(err?.message || 'Falha ao processar recorte de fundo com IA.');
  }
}
