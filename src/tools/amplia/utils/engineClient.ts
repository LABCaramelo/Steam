import type { EngineStatus } from "../types";

export const DEFAULT_ENGINE_URL = "http://127.0.0.1:18790";

/**
 * Client to connect with NextGenUp local Python backend (Flask API).
 * Runs completely offline on localhost without cloud dependencies.
 */
export async function checkEngineHealth(url: string = DEFAULT_ENGINE_URL): Promise<EngineStatus> {
  const normalized = url.replace(/\/+$/, "");
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${normalized}/api/capabilities`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        connected: false,
        url: normalized,
        checking: false,
        error: `Servidor retornou status ${res.status}`,
      };
    }

    const data = await res.json();
    return {
      connected: true,
      url: normalized,
      version: data.version || "1.3.0",
      capabilities: {
        server_ai: !!data.server_ai,
        face_restore: !!data.face_restore,
        ffmpeg: !!data.ffmpeg,
        audio: !!data.audio,
        video_tools: !!data.video_tools,
        models: data.models || {},
      },
      checking: false,
    };
  } catch (err: any) {
    return {
      connected: false,
      url: normalized,
      checking: false,
      error: err?.name === "AbortError" ? "Tempo limite esgotado" : "Motor local desligado",
    };
  }
}

export async function uploadImageToEngine(file: File, baseUrl: string = DEFAULT_ENGINE_URL): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Falha no upload: ${res.statusText}`);
  }

  const json = await res.json();
  return json.task_id;
}

export async function triggerImageUpscale(
  taskId: string,
  options: { scale: number; model: string; faceRestore: boolean; faceStrength: number; denoise: number },
  baseUrl: string = DEFAULT_ENGINE_URL
): Promise<string> {
  const norm = baseUrl.replace(/\/+$/, "");
  const res = await fetch(`${norm}/api/image/upscale`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task_id: taskId,
      scale: options.scale,
      model: options.model,
      face_restore: options.faceRestore,
      face_strength: options.faceStrength / 100,
      denoise: options.denoise / 100,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Falha ao iniciar upscale: ${res.statusText}`);
  }

  return pollImageTask(taskId, norm);
}

export async function triggerBgRemove(file: File, baseUrl: string = DEFAULT_ENGINE_URL): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/bg/remove`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro na remoção de fundo com BiRefNet");
  }

  return await res.blob();
}

export async function triggerMagicEraser(
  file: File,
  maskBlob: Blob,
  baseUrl: string = DEFAULT_ENGINE_URL
): Promise<Blob> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("mask", maskBlob, "mask.png");

  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/erase`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro no inpainting generativo com LaMa");
  }

  return await res.blob();
}

export async function triggerRestoreOldPhoto(
  file: File,
  options: { colorize: boolean; faceRestore: boolean },
  baseUrl: string = DEFAULT_ENGINE_URL
): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("colorize", String(options.colorize));
  formData.append("face_restore", String(options.faceRestore));

  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/restore`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro na restauração / colorização");
  }

  return await res.blob();
}

export async function triggerAudioSeparation(
  file: File,
  baseUrl: string = DEFAULT_ENGINE_URL
): Promise<{ vocalsUrl: string; instrumentalUrl: string }> {
  const norm = baseUrl.replace(/\/+$/, "");
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${norm}/api/audio/separate`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro na separação de faixas com MDX-Net");
  }

  const data = await res.json();
  return {
    vocalsUrl: `${norm}/api/audio/download/${data.vocals_task_id}`,
    instrumentalUrl: `${norm}/api/audio/download/${data.instrumental_task_id}`,
  };
}

export async function triggerAudioDenoise(file: File, baseUrl: string = DEFAULT_ENGINE_URL): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/audio/denoise`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro no denoise vocal com DeepFilterNet3");
  }

  return await res.blob();
}

async function pollImageTask(taskId: string, baseUrl: string): Promise<string> {
  while (true) {
    await new Promise((r) => setTimeout(r, 600));
    const res = await fetch(`${baseUrl}/api/image/status/${taskId}`);
    if (!res.ok) throw new Error("Erro ao consultar progresso do processamento");

    const data = await res.json();
    if (data.status === "done") {
      return `${baseUrl}/api/image/download/${taskId}`;
    }
    if (data.status === "error") {
      throw new Error(data.error || "O processamento de imagem falhou");
    }
  }
}
