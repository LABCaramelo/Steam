import type { DocumentData } from './model/types';
import { ALL_GOOGLE_FONTS } from './googleFontsList';

export interface FontDef {
  family: string;
  category?: 'sans-serif' | 'serif' | 'display' | 'handwriting' | 'monospace' | string;
  axis: string | null;
  weights: number[];
  popular?: boolean;
  caramelo?: boolean;
}

const range = (a: number, b: number) => [100, 200, 300, 400, 500, 600, 700, 800, 900].filter((w) => w >= a && w <= b);

// Destaques oficiais do LAB e fontes de maior impacto no design visual
export const FEATURED_FONTS: FontDef[] = [
  { family: 'Montserrat', axis: 'wght@100..900', weights: range(100, 900), popular: true, caramelo: true, category: 'sans-serif' },
  { family: 'Bowlby One SC', axis: null, weights: [400], popular: true, category: 'display' },
  { family: 'Covered By Your Grace', axis: null, weights: [400], popular: true, caramelo: true, category: 'handwriting' },
  { family: 'Inter', axis: 'wght@100..900', weights: range(100, 900), popular: true, caramelo: true, category: 'sans-serif' },
  { family: 'Poppins', axis: 'wght@100..900', weights: range(100, 900), popular: true, category: 'sans-serif' },
  { family: 'Bebas Neue', axis: null, weights: [400], popular: true, category: 'display' },
  { family: 'Roboto', axis: 'wght@100..900', weights: range(100, 900), popular: true, category: 'sans-serif' },
  { family: 'Open Sans', axis: 'wght@300..800', weights: range(300, 800), popular: true, category: 'sans-serif' },
  { family: 'Oswald', axis: 'wght@200..700', weights: range(200, 700), popular: true, category: 'sans-serif' },
  { family: 'Playfair Display', axis: 'wght@400..900', weights: range(400, 900), popular: true, category: 'serif' },
  { family: 'Space Grotesk', axis: 'wght@300..700', weights: range(300, 700), popular: true, category: 'sans-serif' },
  { family: 'Raleway', axis: 'wght@100..900', weights: range(100, 900), popular: true, category: 'sans-serif' },
  { family: 'Nunito', axis: 'wght@200..900', weights: range(200, 900), popular: true, category: 'sans-serif' },
  { family: 'Lato', axis: 'wght@100;300;400;700;900', weights: [100, 300, 400, 700, 900], popular: true, category: 'sans-serif' },
  { family: 'DM Sans', axis: 'wght@100..900', weights: range(100, 900), popular: true, category: 'sans-serif' },
  { family: 'Syne', axis: 'wght@400..800', weights: range(400, 800), popular: true, category: 'display' },
  { family: 'Anton', axis: null, weights: [400], popular: true, category: 'display' },
  { family: 'Cinzel', axis: 'wght@400..900', weights: range(400, 900), popular: true, category: 'serif' },
  { family: 'Plus Jakarta Sans', axis: 'wght@200..800', weights: range(200, 800), popular: true, category: 'sans-serif' },
  { family: 'Outfit', axis: 'wght@100..900', weights: range(100, 900), popular: true, category: 'sans-serif' },
  { family: 'Pacifico', axis: null, weights: [400], popular: true, category: 'handwriting' },
  { family: 'Caveat', axis: 'wght@400..700', weights: range(400, 700), popular: true, category: 'handwriting' },
  { family: 'Comfortaa', axis: 'wght@300..700', weights: range(300, 700), popular: true, category: 'display' },
  { family: 'Righteous', axis: null, weights: [400], popular: true, category: 'display' },
  { family: 'Archivo Black', axis: null, weights: [400], popular: true, category: 'display' },
  { family: 'Rubik', axis: 'wght@300..900', weights: range(300, 900), popular: true, category: 'sans-serif' },
  { family: 'Lora', axis: 'wght@400..700', weights: range(400, 700), popular: true, category: 'serif' },
  { family: 'Merriweather', axis: 'wght@300;400;700;900', weights: [300, 400, 700, 900], popular: true, category: 'serif' },
  { family: 'Abril Fatface', axis: null, weights: [400], popular: true, category: 'display' },
  { family: 'Lobster', axis: null, weights: [400], popular: true, category: 'display' },
  { family: 'Permanent Marker', axis: null, weights: [400], popular: true, category: 'handwriting' },
  { family: 'Bangers', axis: null, weights: [400], popular: true, category: 'display' },
  { family: 'Fredoka', axis: 'wght@300..700', weights: range(300, 700), popular: true, category: 'sans-serif' },
  { family: 'Work Sans', axis: 'wght@100..900', weights: range(100, 900), popular: true, category: 'sans-serif' },
  { family: 'Great Vibes', axis: null, weights: [400], popular: true, category: 'handwriting' },
  { family: 'Dancing Script', axis: 'wght@400..700', weights: range(400, 700), popular: true, category: 'handwriting' },
  { family: 'Kalam', axis: 'wght@300;400;700', weights: [300, 400, 700], popular: true, category: 'handwriting' },
  { family: 'Press Start 2P', axis: null, weights: [400], popular: true, category: 'display' },
  { family: 'Satisfy', axis: null, weights: [400], popular: true, category: 'handwriting' },
  { family: 'Shadows Into Light', axis: null, weights: [400], popular: true, category: 'handwriting' },
  { family: 'Courgette', axis: null, weights: [400], popular: true, category: 'handwriting' },
  { family: 'Sacramento', axis: null, weights: [400], popular: true, category: 'handwriting' },
  { family: 'Special Elite', axis: null, weights: [400], popular: true, category: 'display' },
  { family: 'Unbounded', axis: 'wght@200..900', weights: range(200, 900), popular: true, category: 'display' },
  { family: 'Monoton', axis: null, weights: [400], popular: true, category: 'display' },
  { family: 'Source Code Pro', axis: 'wght@200..900', weights: range(200, 900), popular: true, category: 'monospace' },
  { family: 'Fira Code', axis: 'wght@300..700', weights: range(300, 700), popular: true, category: 'monospace' },
  { family: 'JetBrains Mono', axis: 'wght@100..800', weights: range(100, 800), popular: true, category: 'monospace' },
];

const featuredMap = new Map<string, FontDef>(FEATURED_FONTS.map((f) => [f.family.toLowerCase(), f]));

// Todas as 1.580+ fontes do Google Fonts catalogadas
export const FONTS: FontDef[] = [
  ...FEATURED_FONTS,
  ...ALL_GOOGLE_FONTS.filter((g) => !featuredMap.has(g.family.toLowerCase())).map((g) => ({
    family: g.family,
    category: g.category,
    axis:
      g.weights.length > 1 && g.weights.length === 9 && g.weights[0] === 100 && g.weights[8] === 900
        ? 'wght@100..900'
        : g.weights.length > 1
          ? `wght@${g.weights.join(';')}`
          : null,
    weights: g.weights && g.weights.length ? g.weights : [400],
    popular: false,
  })),
];

const fontIndex = new Map<string, FontDef>(FONTS.map((f) => [f.family.toLowerCase(), f]));

export const WEIGHT_NAMES: Record<number, string> = {
  100: 'Thin',
  200: 'Extra Light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semi Bold',
  700: 'Bold',
  800: 'Extra Bold',
  900: 'Black',
};

export const fontDef = (family: string): FontDef => {
  if (!family) return FONTS[0];
  const found = fontIndex.get(family.toLowerCase());
  if (found) return found;
  const dynamic: FontDef = {
    family,
    axis: null,
    weights: [400, 700],
    category: 'sans-serif',
  };
  fontIndex.set(family.toLowerCase(), dynamic);
  return dynamic;
};

const links = new Map<string, Promise<void>>();

export function ensureFont(family: string): Promise<void> {
  if (!family || family === 'Inter') return Promise.resolve();
  const existing = links.get(family);
  if (existing) return existing;

  const def = fontDef(family);
  const p = new Promise<void>((resolve) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    const famEncoded = encodeURIComponent(family).replace(/%20/g, '+');
    const axisParam = def?.axis ? `:${def.axis}` : '';
    link.href = `https://fonts.googleapis.com/css2?family=${famEncoded}${axisParam}&display=swap`;
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
  links.set(family, p);
  return p;
}

export async function ensureFontFace(family: string, weight: number) {
  await ensureFont(family);
  try {
    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.load(`${weight} 16px "${family}"`);
    }
  } catch {
    /* fonte indisponível: o canvas usa a alternativa */
  }
}

export function ensureDocFonts(doc: DocumentData) {
  const seen = new Set<string>();
  for (const n of Object.values(doc.nodes)) {
    if (n.type !== 'TEXT') continue;
    const key = `${n.fontFamily}|${n.fontWeight}`;
    if (seen.has(key)) continue;
    seen.add(key);
    void ensureFontFace(n.fontFamily ?? 'Inter', n.fontWeight ?? 400);
  }
}

// Pré-carrega no cliente as principais fontes do Caramelo
if (typeof document !== 'undefined') {
  void ensureFont('Montserrat');
  void ensureFont('Bowlby One SC');
  void ensureFont('Covered By Your Grace');
}
