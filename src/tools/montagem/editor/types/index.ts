export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '2:1' | '2.35:1' | '3:4' | '1.85:1' | '21:9';

export type TrackType = 'video' | 'overlay' | 'text' | 'sticker' | 'audio' | 'sfx';

export type ClipType = 'video' | 'image' | 'text' | 'sticker' | 'audio' | 'sfx';

export type BlendMode = 'normal' | 'screen' | 'multiply' | 'overlay' | 'lighten' | 'darken' | 'color-dodge';

export type TransitionType = 
  | 'none'
  | 'dissolve' 
  | 'fadeBlack' 
  | 'fadeWhite' 
  | 'slideLeft' 
  | 'slideRight' 
  | 'zoomIn' 
  | 'whipPan'
  | 'glitch';

export type SpeedCurvePreset = 'none' | 'montage' | 'hero' | 'bullet' | 'flash';

export type SidebarTab = 'media' | 'audio' | 'text' | 'captions' | 'stickers' | 'effects' | 'transitions' | 'filters';

export interface Keyframe {
  time: number; // time relative to clip start (seconds)
  scale?: number;
  x?: number;
  y?: number;
  rotation?: number;
  opacity?: number;
}

export interface ChromaKeyConfig {
  enabled: boolean;
  color: string;      // hex like #00ff00
  similarity: number; // 0 to 1
  smoothness: number; // 0 to 1
}

export interface ColorAdjustments {
  brightness: number;   // -100 to 100
  contrast: number;     // -100 to 100
  saturation: number;   // -100 to 100
  temperature: number;  // -100 to 100
  vignette: number;     // 0 to 100
  blur: number;         // 0 to 50
  sharpness: number;    // 0 to 100
}

export interface AudioConfig {
  volume: number;       // 0 to 2 (1 = 100%)
  fadeIn: number;       // seconds
  fadeOut: number;      // seconds
  muted: boolean;
}

export interface TextConfig {
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bgColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  shadow?: boolean;
}

export interface Clip {
  id: string;
  trackId: string;
  type: ClipType;
  name: string;
  src?: string;
  assetId?: string;
  file?: File;
  element?: HTMLVideoElement | HTMLImageElement | HTMLAudioElement;

  // Timeline Positioning & Timing (seconds)
  start: number;          // Position on timeline
  duration: number;       // Length on timeline
  offset: number;         // Start offset in source media
  sourceDuration: number; // Original file duration
  waveform?: number[];    // Audio waveform amplitude points

  // Visual Transforms & Canvas Rendering
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  blendMode: BlendMode;
  chromaKey: ChromaKeyConfig;
  adjustments: ColorAdjustments;
  speed: number;           // 0.2x to 5.0x
  speedCurve?: SpeedCurvePreset;
  keyframes?: Keyframe[];

  // Audio / Text configs
  audio: AudioConfig;
  text?: TextConfig;

  // Transition at end of clip
  transition?: {
    type: TransitionType;
    duration: number;      // usually 0.5s
  };

  // Thumbnail cache for filmstrip
  thumbnails?: string[];
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  locked: boolean;
  muted: boolean;
  visible: boolean;
  clips: Clip[];
}

export interface Project {
  id: string;
  title: string;
  aspectRatio: AspectRatio;
  width: number;
  height: number;
  fps: number;
  duration: number;        // total timeline length in seconds
  tracks: Track[];
  selectedClipId: string | null;
  scenario?: string;       // e.g. 'youtube_ads', 'tiktok_ads'
}

export interface ExportOptions {
  resolution: '720p' | '1080p' | '2k' | '4k';
  fps: 24 | 30 | 60;
  format: 'mp4' | 'webm';
  quality: 'recommended' | 'high';
  width: number;
  height: number;
}
