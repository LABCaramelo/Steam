import type { StoryFilterConfig, StoryFilterId } from "../types";

export const STORY_FILTERS: StoryFilterConfig[] = [
  {
    id: "none",
    name: "Normal",
    subtitle: "Sem filtro",
    cssFilter: "none",
    intensity: 1,
    previewColor: "#222226",
  },
  {
    id: "paris",
    name: "Paris",
    subtitle: "Luz suave & Glow",
    cssFilter: "contrast(106%) brightness(108%) saturate(110%)",
    intensity: 1,
    previewColor: "linear-gradient(135deg, #FFB8D0 0%, #FFF0F5 100%)",
  },
  {
    id: "golden",
    name: "Golden Hour",
    subtitle: "Pôr do sol dourado",
    cssFilter: "sepia(28%) saturate(140%) brightness(106%) hue-rotate(-8deg)",
    intensity: 1,
    previewColor: "linear-gradient(135deg, #FF9E00 0%, #FFD000 100%)",
  },
  {
    id: "vintage",
    name: "Retro 35mm",
    subtitle: "Filme analógico",
    cssFilter: "contrast(115%) sepia(22%) saturate(85%) brightness(98%)",
    intensity: 1,
    previewColor: "linear-gradient(135deg, #8B5A2B 0%, #CDB896 100%)",
  },
  {
    id: "tokyo",
    name: "Tokyo P&B",
    subtitle: "Noir alto contraste",
    cssFilter: "grayscale(100%) contrast(145%) brightness(95%)",
    intensity: 1,
    previewColor: "linear-gradient(135deg, #111111 0%, #888888 100%)",
  },
  {
    id: "miami",
    name: "Miami Cyber",
    subtitle: "Neon elétrico",
    cssFilter: "saturate(165%) contrast(112%) hue-rotate(14deg)",
    intensity: 1,
    previewColor: "linear-gradient(135deg, #FF007F 0%, #7928CA 100%)",
  },
  {
    id: "oslo",
    name: "Oslo Cool",
    subtitle: "Tons frios nórdicos",
    cssFilter: "contrast(105%) hue-rotate(-22deg) saturate(92%) brightness(102%)",
    intensity: 1,
    previewColor: "linear-gradient(135deg, #0070F3 0%, #00DFD8 100%)",
  },
  {
    id: "vhs",
    name: "VHS 90s",
    subtitle: "Fita analógica & Tape",
    cssFilter: "contrast(125%) saturate(135%) brightness(104%)",
    intensity: 1,
    previewColor: "linear-gradient(135deg, #00FF66 0%, #FF0055 100%)",
  },
];

export function getFilterConfig(id?: StoryFilterId): StoryFilterConfig {
  return STORY_FILTERS.find((f) => f.id === id) || STORY_FILTERS[0];
}
