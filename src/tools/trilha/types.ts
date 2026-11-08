export interface Track {
  id: string;
  title: string;
  prompt: string;
  style: string;
  lyrics: string;
  duration: number; // in seconds
  bpm: number;
  keyScale: string;
  timeSignature: string;
  tags: string[];
  coverUrl?: string;
  coverSeed: string;
  audioUrl: string;
  instrumental: boolean;
  vocalLanguage: string;
  inferenceSteps: number;
  guidanceScale: number;
  seed: number;
  ditModel: string;
  createdAt: string;
  isFavorite: boolean;
  playlistIds: string[];
  status: "ready" | "generating" | "failed";
  progress?: number;
  statusMessage?: string;
  stems?: {
    vocalsUrl?: string;
    drumsUrl?: string;
    bassUrl?: string;
    otherUrl?: string;
  };
}

export type GenerationMode = "simple" | "custom";

export interface GenerationParams {
  mode: GenerationMode;
  songDescription?: string;
  title: string;
  prompt: string;
  style: string;
  lyrics: string;
  instrumental: boolean;
  vocalLanguage: string;
  bpm: number;
  keyScale: string;
  timeSignature: string;
  duration: number; // 15 to 240 seconds
  inferenceSteps: number; // 10 to 60
  guidanceScale: number; // 1.0 to 10.0
  seed: number;
  randomSeed: boolean;
  ditModel: "acestep-1.5-base" | "acestep-1.5-turbo" | "acestep-1.5-thinking";
  inferMethod: "ode" | "sde";
  referenceAudioUrl?: string;
  referenceAudioName?: string;
  audioCoverStrength?: number;
  thinking?: boolean;
  enhance?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverSeed: string;
  trackIds: string[];
  createdAt: string;
}

export type StudioTab = "create" | "library" | "stems" | "playlists";

export interface EngineConfig {
  provider: "webaudio_synth" | "local_acestep" | "custom_remote";
  gradioApiUrl: string;
  remoteApiKey?: string;
  geminiApiKey?: string;
  autoEnhance: boolean;
  autoCover: boolean;
  outputFormat: "mp3" | "wav";
}

export interface StemMix {
  vocalsVolume: number; // 0 to 100
  drumsVolume: number;
  bassVolume: number;
  otherVolume: number;
  vocalsMuted: boolean;
  drumsMuted: boolean;
  bassMuted: boolean;
  otherMuted: boolean;
  vocalsSolo: boolean;
  drumsSolo: boolean;
  bassSolo: boolean;
  otherSolo: boolean;
}

export type VisualizerPreset = "bars" | "circle" | "oscilloscope" | "neon_wave" | "minimal";

export interface VisualizerConfig {
  aspect: "9:16" | "16:9" | "1:1";
  preset: VisualizerPreset;
  primaryColor: string;
  secondaryColor: string;
  showLyrics: boolean;
  showTitle: boolean;
  glitchEffect: boolean;
  scanlines: boolean;
  particles: boolean;
  vignette: boolean;
}

export interface StylePreset {
  id: string;
  name: string;
  genre: string;
  bpm: number;
  keyScale: string;
  tags: string[];
  description: string;
  prompt: string;
  color: string;
}
