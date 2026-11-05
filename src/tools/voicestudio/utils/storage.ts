import type { VoicePreset, ScriptBlock, AudioTake, EngineConfig, FXRackConfig } from "../types";
import { CANONICAL_VOICE_PRESETS } from "./voiceCloning";

const STORAGE_KEYS = {
  VOICES: "voicestudio_voices_v1",
  SCRIPTS: "voicestudio_scripts_v1",
  TAKES: "voicestudio_takes_v1",
  ENGINE: "voicestudio_engine_v1",
  FX: "voicestudio_fx_v1",
};

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  activeEngine: "webspeech",
  localServerUrl: "http://localhost:8000",
  localServerStatus: "disconnected",
  elevenLabsApiKey: "",
  elevenLabsModel: "eleven_multilingual_v2",
  openAiApiKey: "",
  openAiModel: "tts-1-hd",
  useHardwareAcceleration: true,
};

export const DEFAULT_FX_CONFIG: FXRackConfig = {
  eqWarmth: 2.5,
  eqPresence: 1.8,
  eqAir: 3.0,
  deEsser: 40,
  compThreshold: -18,
  compRatio: 3.5,
  reverbAmount: 18,
  reverbType: "studio",
  masterGain: 0,
  targetLufsPreset: "reels",
};

export function loadStoredVoices(): VoicePreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VOICES);
    if (!raw) return CANONICAL_VOICE_PRESETS;
    const parsed = JSON.parse(raw) as VoicePreset[];
    // Ensure all canonical presets exist
    const map = new Map<string, VoicePreset>();
    CANONICAL_VOICE_PRESETS.forEach((v) => map.set(v.id, v));
    parsed.forEach((v) => map.set(v.id, v));
    return Array.from(map.values());
  } catch {
    return CANONICAL_VOICE_PRESETS;
  }
}

export function saveStoredVoices(voices: VoicePreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.VOICES, JSON.stringify(voices));
  } catch (err) {
    console.error("Erro ao salvar vozes no armazenamento local", err);
  }
}

export function loadStoredScripts(): ScriptBlock[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCRIPTS);
    if (!raw) {
      return [
        {
          id: "script-1",
          speakerId: "canonical-luiz-caramelo",
          text: "Estratégia precisa ser sentida. [pausa: 0.5s] Marca não é só o que ela diz. [pausa: 0.5s] [ênfase] É o que ela faz você fazer.",
          emotion: "confessional",
          pauseAfterSeconds: 0.8,
          speed: 1.0,
          pitchOffset: 0,
        },
        {
          id: "script-2",
          speakerId: "canonical-bianca-narrativa",
          text: "Quando o corte é sincado com o ritmo, o cérebro não assiste: ele participa. Menos ruído, mais foco.",
          emotion: "didatico",
          pauseAfterSeconds: 0.5,
          speed: 1.0,
          pitchOffset: 0,
        },
      ];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredScripts(scripts: ScriptBlock[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SCRIPTS, JSON.stringify(scripts));
  } catch (err) {
    console.error("Erro ao salvar roteiro", err);
  }
}

export function loadStoredTakes(): AudioTake[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TAKES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredTakes(takes: AudioTake[]): void {
  try {
    // Only persist metadata, not raw big blobs
    const sanitized = takes.slice(0, 30).map((t) => ({
      ...t,
      wavBlob: undefined,
    }));
    localStorage.setItem(STORAGE_KEYS.TAKES, JSON.stringify(sanitized));
  } catch (err) {
    console.error("Erro ao salvar takes", err);
  }
}

export function loadEngineConfig(): EngineConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ENGINE);
    return raw ? { ...DEFAULT_ENGINE_CONFIG, ...JSON.parse(raw) } : DEFAULT_ENGINE_CONFIG;
  } catch {
    return DEFAULT_ENGINE_CONFIG;
  }
}

export function saveEngineConfig(config: EngineConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ENGINE, JSON.stringify(config));
  } catch (err) {
    console.error("Erro ao salvar configuração de motores", err);
  }
}

export function loadFXConfig(): FXRackConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FX);
    return raw ? { ...DEFAULT_FX_CONFIG, ...JSON.parse(raw) } : DEFAULT_FX_CONFIG;
  } catch {
    return DEFAULT_FX_CONFIG;
  }
}

export function saveFXConfig(config: FXRackConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FX, JSON.stringify(config));
  } catch (err) {
    console.error("Erro ao salvar rack FX", err);
  }
}
