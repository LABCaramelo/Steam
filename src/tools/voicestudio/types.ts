export type StudioTab =
  | "tts"
  | "cloning"
  | "designer"
  | "dubbing"
  | "dictation"
  | "batch"
  | "fx"
  | "engines";

export type VoiceCategory = "canonical" | "cloned" | "system" | "designed";

export interface VoicePreset {
  id: string;
  name: string;
  category: VoiceCategory;
  gender: "masculino" | "feminino" | "neutro";
  age: "jovem" | "adulto" | "senior";
  accent: string;
  lang: string;
  description: string;
  avatarBg: string;
  tags: string[];
  samplePhrase: string;
  // Acoustic & biometric parameters
  pitchOffset: number; // -12 to +12 semitones
  speed: number; // 0.5 to 2.0
  similarity: number; // 0 to 100%
  stability: number; // 0 to 100%
  styleExaggeration: number; // 0 to 100%
  breathiness: number; // 0 to 100%
  timbreProfile?: {
    avgPitchHz: number;
    formantF1: number;
    formantF2: number;
    snrDb: number;
    sampleDurationSec: number;
  };
}

export interface ScriptBlock {
  id: string;
  speakerId: string;
  text: string;
  emotion: "neutro" | "confessional" | "epico" | "comercial" | "didatico" | "humor";
  pauseAfterSeconds: number;
  speed: number;
  pitchOffset: number;
  isRendering?: boolean;
  audioBlobUrl?: string;
  duration?: number;
}

export interface AudioTake {
  id: string;
  title: string;
  speakerName: string;
  category: string;
  durationSeconds: number;
  blobUrl: string;
  wavBlob?: Blob;
  createdAt: string;
  engineUsed: string;
  estimatedLufs?: number;
}

export interface DubbingSegment {
  id: string;
  startTime: number;
  endTime: number;
  originalText: string;
  translatedText: string;
  speaker?: string;
  dubbedAudioUrl?: string;
  isDubbing?: boolean;
}

export interface DubbingProject {
  id: string;
  title: string;
  videoUrl?: string;
  videoName?: string;
  originalLang: string;
  targetLang: string;
  targetSpeakerId: string;
  duckingDb: number; // e.g. -14dB
  originalVolume: number; // 0 to 1
  dubbedVolume: number; // 0 to 1
  segments: DubbingSegment[];
}

export interface DictationEntry {
  id: string;
  timestamp: string;
  rawText: string;
  polishedCopy: string;
  wordsCount: number;
  durationSec: number;
}

export interface BatchItem {
  id: string;
  title: string;
  speakerId: string;
  text: string;
  status: "idle" | "rendering" | "ready" | "error";
  progress: number;
  audioUrl?: string;
  duration?: number;
}

export interface FXRackConfig {
  eqWarmth: number; // -12dB to +12dB (150Hz)
  eqPresence: number; // -12dB to +12dB (2.5kHz)
  eqAir: number; // -12dB to +12dB (10kHz)
  deEsser: number; // 0 to 100%
  compThreshold: number; // -40dB to 0dB
  compRatio: number; // 1:1 to 8:1
  reverbAmount: number; // 0 to 100%
  reverbType: "dry" | "room" | "studio" | "hall";
  masterGain: number; // -12dB to +12dB
  targetLufsPreset: "podcast" | "reels" | "cinema" | "off";
}

export interface EngineConfig {
  activeEngine: "webspeech" | "procedural" | "local_server" | "elevenlabs" | "openai";
  localServerUrl: string;
  localServerStatus: "disconnected" | "connected" | "checking";
  elevenLabsApiKey: string;
  elevenLabsModel: string;
  openAiApiKey: string;
  openAiModel: string;
  useHardwareAcceleration: boolean;
}
