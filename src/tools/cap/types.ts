export type CapMode = "recorder" | "studio" | "library";

export type WebcamShape = "circle" | "squircle" | "rounded";
export type WebcamSize = "sm" | "md" | "lg";
export type WebcamBorder = "caramel" | "cyan" | "ink" | "none";

export interface WebcamSettings {
  enabled: boolean;
  deviceId?: string;
  shape: WebcamShape;
  size: WebcamSize;
  border: WebcamBorder;
  mirrored: boolean;
  position: { x: number; y: number }; // percentage 0-100 relative to screen
}

export interface AudioSettings {
  enabled: boolean;
  deviceId?: string;
  volume: number; // 0 to 1
  systemAudio: boolean;
}

export type BackgroundPreset =
  | "sunset"
  | "cyber"
  | "mesh"
  | "studio"
  | "cream"
  | "acid"
  | "blur"
  | "solid";

export type WindowShadow = "none" | "subtle" | "deep" | "glowCaramel" | "glowCyan";
export type WindowChrome = "none" | "macos" | "minimal" | "glass";
export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "fit";
export type VideoFit = "cover" | "contain";

export interface CanvasDressing {
  background: BackgroundPreset;
  customColor?: string;
  padding: number; // in pixels (e.g. 0 to 120)
  borderRadius: number; // in pixels (0 to 32)
  shadow: WindowShadow;
  windowChrome: WindowChrome;
  windowTitle: string;
  aspectRatio: AspectRatio;
  videoFit?: VideoFit;
}

export interface ZoomKeyframe {
  id: string;
  time: number; // start time in seconds
  duration: number; // duration in seconds
  scale: number; // 1.0 to 2.5
  focusX: number; // 0 to 1 (0.5 is center)
  focusY: number; // 0 to 1 (0.5 is center)
  label?: string;
}

export interface TakeRecord {
  id: string;
  title: string;
  createdAt: number;
  duration: number;
  blob?: Blob;
  videoUrl: string;
  thumbnailUrl: string;
  dressing: CanvasDressing;
  zoomKeyframes: ZoomKeyframe[];
  trimStart: number;
  trimEnd: number;
}
