import type { BrandKit, CustomFont } from "../types";

export const DEFAULT_BRAND_KITS: BrandKit[] = [
  {
    id: "caramelo",
    name: "Laboratório Caramelo",
    isDefault: true,
    colors: {
      primary: "#FF701A", // Caramel Orange
      secondary: "#25BFFF", // Electric Sky
      accent: "#FFD52A", // Acid Yellow
      background: "#101014", // Ink Black
      textDark: "#101014",
      textLight: "#FFF4E8", // Warm Cream
      custom: ["#FF3D8D", "#7657FF", "#2E8B57", "#FFFFFF"],
    },
    fonts: {
      headline: "Space Grotesk",
      body: "Inter",
      customFonts: [],
    },
  },
  {
    id: "editorial",
    name: "Editorial Elegante",
    colors: {
      primary: "#C5A059", // Vintage Gold
      secondary: "#8C7A6B",
      accent: "#E2D4C3",
      background: "#1A1918",
      textDark: "#1A1918",
      textLight: "#FBF9F5",
      custom: ["#4A5568", "#2D3748", "#E2E8F0"],
    },
    fonts: {
      headline: "Playfair Display",
      body: "Montserrat",
      customFonts: [],
    },
  },
  {
    id: "tech-neon",
    name: "Vibe Tech / Neon",
    colors: {
      primary: "#00F5D4", // Neon Cyan
      secondary: "#7B2CBF", // Electric Purple
      accent: "#FF007F", // Neon Pink
      background: "#08070D",
      textDark: "#08070D",
      textLight: "#FFFFFF",
      custom: ["#70E000", "#FFD166", "#3A86FF"],
    },
    fonts: {
      headline: "Bebas Neue",
      body: "Outfit",
      customFonts: [],
    },
  },
];

const STORAGE_KEY = "stories_maker_brand_kits_v1";
const ACTIVE_KIT_KEY = "stories_maker_active_brand_kit_id";

export function loadBrandKits(): BrandKit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BRAND_KITS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_BRAND_KITS;
  } catch {
    return DEFAULT_BRAND_KITS;
  }
}

export function saveBrandKits(kits: BrandKit[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kits));
  } catch (err) {
    console.error("Falha ao salvar Brand Kits:", err);
  }
}

export function getActiveBrandKitId(): string {
  return localStorage.getItem(ACTIVE_KIT_KEY) || DEFAULT_BRAND_KITS[0].id;
}

export function setActiveBrandKitId(id: string): void {
  localStorage.setItem(ACTIVE_KIT_KEY, id);
}

/**
 * Registra uma fonte customizada (.woff, .woff2, .ttf, .otf) no navegador via FontFace API
 */
export async function registerCustomFontInDOM(font: CustomFont): Promise<boolean> {
  if (!font.name || !font.dataBase64) return false;
  try {
    // Converte base64 para ArrayBuffer
    const binary = atob(font.dataBase64.split(",")[1] || font.dataBase64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const fontFace = new FontFace(font.name, bytes.buffer);
    const loadedFace = await fontFace.load();
    document.fonts.add(loadedFace);
    return true;
  } catch (err) {
    console.warn("Erro ao registrar fonte customizada:", font.name, err);
    return false;
  }
}

/**
 * Inicializa e carrega todas as fontes salvas pelo usuário ao iniciar o app
 */
export async function initCustomFonts(): Promise<void> {
  const kits = loadBrandKits();
  for (const kit of kits) {
    for (const font of kit.fonts.customFonts) {
      await registerCustomFontInDOM(font);
    }
  }
}
