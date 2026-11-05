export type StudioMode = "showcase" | "pulse-v2";

export type FrameKind = "mockup" | "construction" | "palette" | "gradient" | "solid";

export interface FrameItem {
  id: string;
  label: string;
  kind: FrameKind;
  imgSrc?: string;
  inverted: boolean;
  styleFilter?: string;
  bgColor?: string;
  gradient?: string;
  contrast?: number;
  durationFrames: number;
}

export interface LogoSettings {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  blendStrength: number;
}

export interface LogoAsset {
  src: string;
  isSvg: boolean;
  aspectRatio: number;
  width: number;
  height: number;
  svgText?: string;
  autoInvertedSrc?: string;
}

export interface Pulse3DSettings {
  cameraZoom: number;
  cameraMovement: boolean;
  extrusionDepth: number;
  bevelSize: number;
  lightIntensity: number;
  speed: number;
  particlesEnabled: boolean;
  gridExplode: boolean;
  ambientColor: string;
  pulseStrength: number;
}

export interface AudioTrackOption {
  id: string;
  name: string;
  bpm: number;
  url?: string;
  isCustom?: boolean;
}

export interface ExportState {
  isExporting: boolean;
  progress: number;
  status: string;
  format: "mp4" | "webm";
}

export interface BrandColor {
  id: string;
  hex: string;
  label: string;
}
