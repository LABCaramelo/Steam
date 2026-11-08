export type PeliculaTab = "image" | "video" | "workflow" | "director" | "gallery";

export interface HardwareInfo {
  has_gpu: boolean;
  device_name: string;
  vram_total_gb: number;
  vram_free_gb: number;
  platform: string;
}

export interface EngineStatus {
  connected: boolean;
  url: string;
  checking: boolean;
  hardware?: HardwareInfo;
  local_runners?: {
    sd_cpp: boolean;
    wan2gp: boolean;
  };
}

export interface ImageModelOption {
  id: string;
  name: string;
  type: "hybrid" | "local" | "cloud";
  category: string;
  recommendedSteps: number;
}

export interface VideoModelOption {
  id: string;
  name: string;
  type: "hybrid" | "local" | "cloud";
  category: string;
  maxDuration: number;
}

export interface ImageGenParams {
  prompt: string;
  negativePrompt: string;
  model: string;
  aspectRatio: "1:1" | "9:16" | "16:9" | "4:5";
  width: number;
  height: number;
  steps: number;
  guidanceScale: number;
  seed: number;
  useStylePrefix: boolean;
}

export interface VideoGenParams {
  prompt: string;
  imageUrl?: string;
  model: string;
  durationSeconds: number;
  aspectRatio: "9:16" | "16:9" | "1:1";
  cameraMotion: "static" | "dolly-in" | "dolly-out" | "pan-left" | "pan-right" | "tilt-up" | "tilt-down" | "fpv-drone" | "handheld";
  fps: number;
  seed: number;
  motionStrength: number;
}

export interface ShotCard {
  id: string;
  sceneNumber: number;
  takeNumber: number;
  title: string;
  shotType: "Close-up" | "Medium Shot" | "Wide Shot" | "Extreme Wide" | "Dutch Angle";
  lensMm: string;
  cameraHeight: string;
  cameraMotion: string;
  energyCurve: "Antecipação" | "Ação" | "Impacto" | "Reação" | "Recuperação";
  promptEn: string;
  audioPt: string;
  imageUrl?: string;
  videoUrl?: string;
}

export interface WorkflowNode {
  id: string;
  title: string;
  type: "prompt" | "image" | "video" | "audio" | "upscale" | "export";
  x: number;
  y: number;
  data: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
}

export interface RenderItem {
  id: string;
  title: string;
  type: "image" | "video";
  url: string;
  localPath?: string;
  prompt: string;
  model: string;
  aspectRatio: string;
  createdAt: string;
  seed: number;
  fileSize?: string;
}

export interface ApiKeysConfig {
  muapi?: string;
  fal?: string;
  replicate?: string;
  together?: string;
  openai?: string;
  elevenlabs?: string;
}
