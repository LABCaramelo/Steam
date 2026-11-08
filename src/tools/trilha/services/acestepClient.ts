import { GenerationParams, EngineConfig } from "../types";
import { synthesizeProceduralTrack, SynthesizedTrackData } from "./audioEngine";

export interface GenerationProgressCallback {
  (progress: number, stage: string): void;
}

/**
 * Enhances a simple musical prompt with acoustic engineering details
 */
export function enhancePrompt(prompt: string, style: string, bpm: number, keyScale: string): string {
  const cleanPrompt = prompt.trim();
  const cleanStyle = style.trim();

  const acoustics = [
    "warm analog master",
    "rich dynamic range",
    "spatial stereo reverb",
    "tight low-end sub-bass",
    "clarity in high transients",
    "organic instrumentation",
  ];

  const selectedAcoustics = acoustics.slice(0, 3).join(", ");
  return `${cleanPrompt ? cleanPrompt + ". " : ""}${cleanStyle ? "Style: " + cleanStyle + ". " : ""}BPM: ${bpm}, Key: ${keyScale}. Acoustic profile: ${selectedAcoustics}. Studio production.`;
}

/**
 * Generates music using either ACE-Step 1.5 backend or the built-in Web Audio synthesis engine.
 */
export async function generateMusic(
  params: GenerationParams,
  config: EngineConfig,
  onProgress?: GenerationProgressCallback
): Promise<SynthesizedTrackData> {
  // If user selected real local ACE-Step backend
  if (config.provider === "local_acestep" || config.provider === "custom_remote") {
    try {
      onProgress?.(10, "Conectando ao servidor ACE-Step 1.5...");
      const targetUrl = config.gradioApiUrl.replace(/\/+$/, "");

      // Check if server is reachable
      const checkRes = await fetch(`${targetUrl}/api/predict/`, {
        method: "HEAD",
      }).catch(() => null);

      if (checkRes && checkRes.ok) {
        onProgress?.(30, "Enviando parâmetros de inferência para ACE-Step...");
        // Call Gradio predict or custom endpoint
        const payload = {
          data: [
            params.prompt,
            params.lyrics,
            params.style,
            params.title,
            params.instrumental,
            params.vocalLanguage,
            params.bpm,
            params.keyScale,
            params.timeSignature,
            params.duration,
            params.inferenceSteps,
            params.guidanceScale,
            params.seed,
            params.ditModel,
            params.inferMethod,
          ],
        };

        const response = await fetch(`${targetUrl}/api/predict/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const json = await response.json();
          if (json.data && json.data[0]) {
            const audioUrl = json.data[0];
            onProgress?.(90, "Baixando áudio gerado pelo ACE-Step...");
            const audioFetch = await fetch(audioUrl);
            const blob = await audioFetch.blob();
            onProgress?.(100, "Concluído!");
            return {
              fullAudioBlob: blob,
              fullAudioUrl: URL.createObjectURL(blob),
              duration: params.duration,
              stems: {
                drumsUrl: "",
                bassUrl: "",
                otherUrl: "",
              },
            };
          }
        }
      }
      console.warn("Servidor ACE-Step não respondeu adequadamente. Ativando motor de síntese nativo LAB...");
    } catch (err) {
      console.warn("Falha de conexão com ACE-Step, usando motor nativo Web Audio:", err);
    }
  }

  // Built-in Web Audio synthesis engine
  return await synthesizeProceduralTrack(params, onProgress);
}
