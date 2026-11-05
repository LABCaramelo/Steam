export type LayerType = "text" | "widget" | "sticker" | "image" | "video";

export type TextBackgroundMode = "none" | "pill" | "box" | "outline" | "neon";
export type TextAlign = "left" | "center" | "right";

export interface BaseLayer {
  id: string;
  type: LayerType;
  x: number; // 0 to 1080 (canvas coordinate)
  y: number; // 0 to 1920 (canvas coordinate)
  rotation: number; // degrees
  scale: number; // multiplier, default 1
  opacity: number; // 0 to 1
  locked?: boolean;
}

export interface TextLayer extends BaseLayer {
  type: "text";
  text: string;
  font: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  color: string;
  align: TextAlign;
  backgroundMode: TextBackgroundMode;
  backgroundColor: string;
  isUppercase: boolean;
  isBold: boolean;
  isItalic: boolean;
  maxWidth?: number;
}

export type WidgetType =
  | "question"
  | "poll"
  | "slider"
  | "countdown"
  | "link"
  | "music"
  | "mention";

export interface WidgetData {
  question?: string;
  authorName?: string;
  authorAvatar?: string;
  optionA?: string;
  optionB?: string;
  votesA?: number;
  votesB?: number;
  emoji?: string;
  sliderPosition?: number;
  countdownTitle?: string;
  targetDate?: string;
  url?: string;
  linkText?: string;
  musicTitle?: string;
  musicArtist?: string;
  musicCover?: string;
  username?: string;
  primaryColor?: string;
  textColor?: string;
}

export interface WidgetLayer extends BaseLayer {
  type: "widget";
  widgetType: WidgetType;
  data: WidgetData;
  width?: number;
}

export interface StickerLayer extends BaseLayer {
  type: "sticker";
  stickerType: "badge" | "emoji" | "shape" | "gif";
  content: string; // text for badge, emoji, svg/path, or url for gif
  color?: string;
  bgColor?: string;
  width?: number;
  height?: number;
}

export interface ImageLayer extends BaseLayer {
  type: "image";
  url: string;
  width: number;
  height: number;
  borderRadius: number;
  shadow: boolean;
  border: boolean;
  borderColor: string;
  borderWidth: number;
}

export interface VideoLayer extends BaseLayer {
  type: "video";
  url: string;
  width: number;
  height: number;
  loop: boolean;
  muted: boolean;
}

export type StoryLayer = TextLayer | WidgetLayer | StickerLayer | ImageLayer | VideoLayer;

export type StoryFilterId =
  | "none"
  | "paris"
  | "golden"
  | "vintage"
  | "tokyo"
  | "miami"
  | "oslo"
  | "vhs";

export interface StoryFilterConfig {
  id: StoryFilterId;
  name: string;
  subtitle: string;
  cssFilter: string;
  intensity: number;
  previewColor: string;
}

export interface StoryBackground {
  type: "color" | "gradient" | "image" | "video";
  value: string; // hex, gradient string, or media data URL
  blur?: number; // px blur
  overlayOpacity?: number; // 0 to 1
  overlayColor?: string; // hex
  filter?: StoryFilterId;
  filterIntensity?: number; // 0 to 1
}

export interface CustomFont {
  name: string;
  dataBase64?: string;
  format?: string;
}

export interface BrandKit {
  id: string;
  name: string;
  isDefault?: boolean;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    textDark: string;
    textLight: string;
    custom: string[];
  };
  fonts: {
    headline: string;
    body: string;
    customFonts: CustomFont[];
  };
  logoUrl?: string;
}

export type TemplateCategory =
  | "urgente"
  | "frases"
  | "perguntas"
  | "lancamento"
  | "dicas"
  | "social"
  | "personalizado";

export interface StoryTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  isUserTemplate?: boolean;
  background: StoryBackground;
  layers: StoryLayer[];
  previewDescription?: string;
}

export type ActiveDrawer =
  | "none"
  | "text"
  | "stickers"
  | "brand"
  | "templates"
  | "background"
  | "export"
  | "qrcode"
  | "filters"
  | "drawing"
  | "menu";

export type DayOfWeek =
  | "segunda"
  | "terca"
  | "quarta"
  | "quinta"
  | "sexta"
  | "sabado"
  | "domingo";

export type StoryStatus = "planejado" | "editando" | "pronto";

export interface ScheduledStorySlot {
  id: string;
  dayId: DayOfWeek;
  dayName: string;
  time: string; // "08h", "10h", "12h", "15h", "18h", "20h", "16h"
  title: string;
  editorialTip: string;
  status: StoryStatus;
  background: StoryBackground;
  layers: StoryLayer[];
}

export interface DaySchedule {
  id: DayOfWeek;
  name: string;
  shortName: string;
  slots: ScheduledStorySlot[];
}
