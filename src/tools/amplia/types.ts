export type AmpliaMode =
  | "upscale"
  | "face_restore"
  | "bg_remove"
  | "magic_eraser"
  | "denoise_deblur"
  | "colorize"
  | "audio_studio"
  | "video_tools";

export interface EngineCapabilities {
  server_ai: boolean;
  face_restore: boolean;
  ffmpeg: boolean;
  audio: boolean;
  video_tools: boolean;
  models?: Record<string, boolean>;
}

export interface EngineStatus {
  connected: boolean;
  url: string;
  version?: string;
  capabilities?: EngineCapabilities;
  checking: boolean;
  error?: string;
}

export interface MediaAsset {
  id: string;
  file?: File;
  name: string;
  type: "image" | "audio" | "video";
  originalUrl: string;
  resultUrl?: string;
  resultBlob?: Blob;
  width?: number;
  height?: number;
  duration?: number;
  sizeBytes: number;
  status: "idle" | "processing" | "done" | "error";
  progress?: number;
  errorMessage?: string;
  processedAt?: number;
  meta?: Record<string, any>;
}

export interface UpscaleSettings {
  scale: 2 | 4 | 8;
  model: "realesrgan-x4plus" | "realesrgan-x4plus-anime" | "quick-cas" | "enhance";
  faceRestore: boolean;
  faceStrength: number;
  denoiseStrength: number;
}

export interface BgRemoveSettings {
  mode: "transparent" | "solid";
  solidColor: string;
  feathering: number;
}

export interface MagicEraserSettings {
  brushSize: number;
  maskDataUrl?: string;
}

export interface RestoreSettings {
  denoiseLevel: number;
  deblurLevel: number;
  colorizeSaturation: number;
  colorizeWarmth: number;
}

export interface AudioStudioSettings {
  subMode: "mastering" | "stem_split" | "voice_denoise";
  targetLufs: number; // e.g. -14 for Reels/TikTok/YT, -16 Podcast, -9 Club
  bassEnhance: number; // 0 to 100
  airPresence: number; // 0 to 100
  warmth: number; // 0 to 100
  limiterCeilingDb: number; // -0.5 dBFS
}

export interface VideoToolsSettings {
  subMode: "upscale_4k" | "compress" | "gif" | "clean_audio";
  targetSizeMb: number;
  gifFps: number;
  gifWidth: number;
  cleanAudioAction: "remove_noise" | "remove_music" | "remove_voice";
}

export interface CarameloPreset {
  id: string;
  title: string;
  description: string;
  mode: AmpliaMode;
  badge: string;
}
