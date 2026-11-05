/**
 * Módulo de Remoção de Plano de Fundo com IA (MediaPipe ImageSegmenter)
 * Processamento acelerado por WebGL/GPU diretamente no navegador, sem custos de servidor.
 * Um Cara Caramelo — Laboratório de Interação
 */

let cachedSegmenter: any = null;

async function getSegmenter(onProgress?: (msg: string) => void) {
  if (cachedSegmenter) return cachedSegmenter;

  onProgress?.('Carregando motor neural...');
  // Dynamic import via function constructor para evitar avisos do TypeScript e Vite
  const importDynamic = new Function('url', 'return import(url)');

  let vision: any;
  try {
    vision = await importDynamic(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs'
    );
  } catch (errJsdelivr) {
    console.warn('Falha no CDN jsdelivr, tentando unpkg...', errJsdelivr);
    vision = await importDynamic(
      'https://unpkg.com/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs'
    );
  }

  const { FilesetResolver, ImageSegmenter } = vision;

  onProgress?.('Inicializando WebAssembly / GPU...');
  let filesetResolver: any;
  try {
    filesetResolver = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );
  } catch (errWasm) {
    console.warn('Falha no wasm jsdelivr, tentando unpkg...', errWasm);
    filesetResolver = await FilesetResolver.forVisionTasks(
      'https://unpkg.com/@mediapipe/tasks-vision@0.10.14/wasm'
    );
  }

  onProgress?.('Carregando modelo neural...');

  // Modelo oficial selfie_segmenter float16 (249 KB)
  // 1. Host local (servido estático do LAB via /models/selfie_segmenter.tflite)
  // 2. Google Cloud Storage oficial float16
  const candidateUrls: string[] = [];
  if (typeof window !== 'undefined' && window.location) {
    candidateUrls.push(`${window.location.origin}/models/selfie_segmenter.tflite`);
    candidateUrls.push('/models/selfie_segmenter.tflite');
  }
  candidateUrls.push(
    'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite'
  );

  let lastError: any = null;

  for (const modelPath of candidateUrls) {
    // 1. Tentar com GPU (WebGL / WebGPU)
    try {
      cachedSegmenter = await ImageSegmenter.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: modelPath,
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
      if (cachedSegmenter) break;
    } catch (errGPU) {
      console.warn(`Tentativa GPU falhou com modelo ${modelPath}, tentando CPU...`, errGPU);
      // 2. Fallback para CPU
      try {
        cachedSegmenter = await ImageSegmenter.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'CPU',
          },
          runningMode: 'IMAGE',
          outputCategoryMask: false,
          outputConfidenceMasks: true,
        });
        if (cachedSegmenter) break;
      } catch (errCPU) {
        lastError = errCPU;
        console.warn(`Tentativa CPU falhou com modelo ${modelPath}:`, errCPU);
      }
    }
  }

  if (!cachedSegmenter) {
    throw lastError || new Error('Não foi possível carregar o modelo de recorte neural.');
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
    const isDataOrBlob = imageSrc.startsWith('data:') || imageSrc.startsWith('blob:');
    if (!isDataOrBlob) {
      img.crossOrigin = 'anonymous';
    }

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => {
        if (img.crossOrigin) {
          // Se falhou com crossOrigin, tenta sem
          const retryImg = new Image();
          retryImg.onload = () => resolve();
          retryImg.onerror = () => reject(new Error('Falha ao decodificar imagem para recorte.'));
          retryImg.src = imageSrc;
        } else {
          reject(new Error('Falha ao decodificar imagem para recorte.'));
        }
      };
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
    const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
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

    // Libera texturas GPU para evitar memory leak
    for (const m of confidenceMasks) {
      try {
        m.close?.();
      } catch {}
    }

    onProgress?.('Concluído!');
    return outCanvas.toDataURL('image/png');
  } catch (err: any) {
    console.error('Erro no recorte neural:', err);
    cachedSegmenter = null;
    throw new Error(err?.message || 'Falha ao processar recorte de fundo com IA.');
  }
}
