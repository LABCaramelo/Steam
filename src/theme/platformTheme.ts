// ==============================================================================
// LAB Caramelo — Motor de Customização Dinâmica de Cores da Plataforma
// Integração Brand Guardian -> LocalStorage Cache -> Supabase Profiles -> CSS Tokens
// ==============================================================================

import { supabase } from "../supabase.ts";

export interface PlatformThemeColors {
  accent: string;  // Acento Primário (padrão #FF701A Caramel Orange)
  surface: string; // Superfície Base / Chrome (padrão #101014 Ink Black)
  stage: string;   // Fundo Profundo do Canvas (padrão #0A0A0D Stage)
  text: string;    // Texto Principal / Títulos (padrão #FFF4E8 Warm Cream)
  focus: string;   // Acento Digital & Foco (padrão #25BFFF Electric Sky)
  danger: string;  // Acento Crítico / Perigo (padrão #FF3D8D Hot Pink)
  warning: string; // Acento de Alerta (padrão #FFD52A Acid Yellow)
  violet: string;  // Transição & Energia (padrão #7657FF Electric Violet)
  success: string; // Confirmação / Sucesso (padrão #3DDC97 Signal Mint)
}

export interface PlatformTheme {
  version: 1;
  colors: PlatformThemeColors;
  updatedAt: string;
  presetId?: string;
  sourceBrandName?: string;
}

export const DEFAULT_PLATFORM_COLORS: PlatformThemeColors = {
  accent: "#FF701A",
  surface: "#101014",
  stage: "#0A0A0D",
  text: "#FFF4E8",
  focus: "#25BFFF",
  danger: "#FF3D8D",
  warning: "#FFD52A",
  violet: "#7657FF",
  success: "#3DDC97",
};

export const PLATFORM_THEME_STORAGE_KEY = "caramelo_platform_theme_v1";
export const PLATFORM_THEME_CHANNEL = "caramelo_platform_theme_sync";

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: PlatformThemeColors;
}

export const PLATFORM_THEME_PRESETS: ThemePreset[] = [
  {
    id: "canonical",
    name: "Caramelo Canônico",
    description: "Paleta oficial V2 do Laboratório de Interação",
    colors: DEFAULT_PLATFORM_COLORS,
  },
  {
    id: "cyber-sky",
    name: "Cyber Sky",
    description: "Azul elétrico de alta definição e foco digital",
    colors: {
      accent: "#25BFFF",
      surface: "#0B0F14",
      stage: "#070A0E",
      text: "#E6F8FF",
      focus: "#7657FF",
      danger: "#FF3D8D",
      warning: "#FFD52A",
      violet: "#7657FF",
      success: "#3DDC97",
    },
  },
  {
    id: "electric-violet",
    name: "Electric Violet",
    description: "Vibração violeta cinematográfica de estúdio",
    colors: {
      accent: "#7657FF",
      surface: "#0F0B18",
      stage: "#0A0710",
      text: "#F3EFFF",
      focus: "#25BFFF",
      danger: "#FF3D8D",
      warning: "#FFD52A",
      violet: "#9A85FF",
      success: "#3DDC97",
    },
  },
  {
    id: "acid-yellow",
    name: "Acid Tokyo",
    description: "Amarelo ácido de alta visibilidade e contraste cortante",
    colors: {
      accent: "#FFD52A",
      surface: "#121210",
      stage: "#0A0A09",
      text: "#FFFBE8",
      focus: "#25BFFF",
      danger: "#FF3D8D",
      warning: "#FFE066",
      violet: "#7657FF",
      success: "#3DDC97",
    },
  },
  {
    id: "hot-pink",
    name: "Hot Velvet",
    description: "Rosa choque provocativo e audacioso",
    colors: {
      accent: "#FF3D8D",
      surface: "#140A10",
      stage: "#0D060B",
      text: "#FFEBF2",
      focus: "#25BFFF",
      danger: "#FF6BA8",
      warning: "#FFD52A",
      violet: "#7657FF",
      success: "#3DDC97",
    },
  },
  {
    id: "signal-mint",
    name: "Mint Terminal",
    description: "Verde menta tático inspirado em monitores de alta precisão",
    colors: {
      accent: "#3DDC97",
      surface: "#08140E",
      stage: "#050D09",
      text: "#E8FBF2",
      focus: "#25BFFF",
      danger: "#FF3D8D",
      warning: "#FFD52A",
      violet: "#7657FF",
      success: "#61E7AD",
    },
  },
  {
    id: "monochrome",
    name: "Monochrome Minimal",
    description: "Puro contraste em preto e branco editorial",
    colors: {
      accent: "#FFFFFF",
      surface: "#0D0D0E",
      stage: "#080808",
      text: "#FFFFFF",
      focus: "#D9D3CC",
      danger: "#FF3D8D",
      warning: "#FFD52A",
      violet: "#7657FF",
      success: "#3DDC97",
    },
  },
];

// Utilitários de Cor
export function hexToRgbValues(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return { r: 255, g: 112, b: 26 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function adjustRgb(
  rgb: { r: number; g: number; b: number },
  delta: number
): { r: number; g: number; b: number } {
  return {
    r: Math.max(0, Math.min(255, rgb.r + delta)),
    g: Math.max(0, Math.min(255, rgb.g + delta)),
    b: Math.max(0, Math.min(255, rgb.b + delta)),
  };
}

function mixRgb(
  rgbA: { r: number; g: number; b: number },
  rgbB: { r: number; g: number; b: number },
  weightA: number
): { r: number; g: number; b: number } {
  const wB = 1 - weightA;
  return {
    r: Math.round(rgbA.r * weightA + rgbB.r * wB),
    g: Math.round(rgbA.g * weightA + rgbB.g * wB),
    b: Math.round(rgbA.b * weightA + rgbB.b * wB),
  };
}

// Luminância relativa para cálculo de contraste WCAG
function getLuminance(rgb: { r: number; g: number; b: number }): number {
  const a = [rgb.r, rgb.g, rgb.b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Aplica os tokens CSS customizados no elemento root (ou limpa se for null/padrão)
 */
export function applyPlatformTheme(theme: PlatformTheme | null | undefined): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const s = root.style;

  if (!theme || !theme.colors) {
    // Remove estilos inline customizados para restaurar o styles.css original
    const customProps = [
      "--cm-accent",
      "--cm-accent-bright",
      "--cm-accent-ink",
      "--cm-accent-soft",
      "--cm-accent-contrast",
      "--c-accent",
      "--c-accent-hover",
      "--accent-caramel",
      "--caramelo-accent",
      "--cm-stage",
      "--cm-surface-1",
      "--cm-surface-2",
      "--cm-surface-3",
      "--cm-line-soft",
      "--cm-line",
      "--cm-line-strong",
      "--c-chrome",
      "--c-panel",
      "--c-panel-2",
      "--c-main",
      "--c-darkest",
      "--bg-primary",
      "--bg-secondary",
      "--bg-tertiary",
      "--bg-elevated",
      "--cm-fg",
      "--cm-fg-2",
      "--cm-fg-muted",
      "--cm-fg-dim",
      "--cm-fg-faint",
      "--c-text",
      "--c-text-2",
      "--c-text-3",
      "--c-text-4",
      "--text-main",
      "--cm-focus",
      "--cm-info",
      "--accent-sky",
      "--cm-danger",
      "--accent-pink",
      "--cm-warning",
      "--accent-yellow",
      "--cm-violet",
      "--accent-violet",
      "--cm-success",
      "--cm-spectrum-gradient",
      "--cm-spectrum",
      "--cm-spectrum-soft",
      "--g-play",
      "--border-accent",
    ];
    for (const p of customProps) {
      s.removeProperty(p);
    }
    return;
  }

  const { colors } = theme;
  const accentRgb = hexToRgbValues(colors.accent);
  const surfaceRgb = hexToRgbValues(colors.surface);
  const stageRgb = colors.stage ? hexToRgbValues(colors.stage) : adjustRgb(surfaceRgb, -6);
  const textRgb = hexToRgbValues(colors.text);
  const focusRgb = hexToRgbValues(colors.focus || "#25BFFF");
  const dangerRgb = hexToRgbValues(colors.danger || "#FF3D8D");
  const warningRgb = hexToRgbValues(colors.warning || "#FFD52A");
  const violetRgb = hexToRgbValues(colors.violet || "#7657FF");
  const successRgb = hexToRgbValues(colors.success || "#3DDC97");

  // Superfícies derivadas
  const surface2Rgb = adjustRgb(surfaceRgb, +8);
  const surface3Rgb = adjustRgb(surfaceRgb, +15);
  const surfaceElevatedRgb = adjustRgb(surfaceRgb, +22);

  // Linhas e divisores
  const lineSoftRgb = adjustRgb(surfaceRgb, +10);
  const lineRgb = adjustRgb(surfaceRgb, +23);
  const lineStrongRgb = adjustRgb(surfaceRgb, +42);

  // Níveis de texto
  const text2Rgb = mixRgb(textRgb, surfaceRgb, 0.85);
  const textMutedRgb = mixRgb(textRgb, surfaceRgb, 0.65);
  const textDimRgb = mixRgb(textRgb, surfaceRgb, 0.5);
  const textFaintRgb = mixRgb(textRgb, surfaceRgb, 0.35);

  // Acento e hover
  const accentBrightRgb = adjustRgb(accentRgb, +26);
  const accentSoftRgb = mixRgb(accentRgb, surfaceRgb, 0.16);

  // Contraste para texto sobre o botão de acento
  const lumAccent = getLuminance(accentRgb);
  const accentContrastVal = lumAccent > 0.4 ? "16 16 20" : "255 244 232";

  // Injeção de variáveis semânticas canônicas
  s.setProperty("--cm-accent", `${accentRgb.r} ${accentRgb.g} ${accentRgb.b}`);
  s.setProperty("--cm-accent-bright", `${accentBrightRgb.r} ${accentBrightRgb.g} ${accentBrightRgb.b}`);
  s.setProperty("--cm-accent-ink", `${accentRgb.r} ${accentRgb.g} ${accentRgb.b}`);
  s.setProperty("--cm-accent-soft", `${accentSoftRgb.r} ${accentSoftRgb.g} ${accentSoftRgb.b}`);
  s.setProperty("--cm-accent-contrast", accentContrastVal);

  s.setProperty("--c-accent", `rgb(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b})`);
  s.setProperty("--c-accent-hover", `rgb(${accentBrightRgb.r}, ${accentBrightRgb.g}, ${accentBrightRgb.b})`);
  s.setProperty("--accent-caramel", colors.accent);
  s.setProperty("--caramelo-accent", `rgb(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b})`);
  s.setProperty("--border-accent", `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.4)`);

  // Superfícies
  s.setProperty("--cm-stage", `${stageRgb.r} ${stageRgb.g} ${stageRgb.b}`);
  s.setProperty("--cm-surface-1", `${surfaceRgb.r} ${surfaceRgb.g} ${surfaceRgb.b}`);
  s.setProperty("--cm-surface-2", `${surface2Rgb.r} ${surface2Rgb.g} ${surface2Rgb.b}`);
  s.setProperty("--cm-surface-3", `${surface3Rgb.r} ${surface3Rgb.g} ${surface3Rgb.b}`);

  s.setProperty("--c-darkest", `rgb(${stageRgb.r}, ${stageRgb.g}, ${stageRgb.b})`);
  s.setProperty("--c-main", `rgb(${stageRgb.r}, ${stageRgb.g}, ${stageRgb.b})`);
  s.setProperty("--c-chrome", `rgb(${surfaceRgb.r}, ${surfaceRgb.g}, ${surfaceRgb.b})`);
  s.setProperty("--c-panel", `rgb(${surface2Rgb.r}, ${surface2Rgb.g}, ${surface2Rgb.b})`);
  s.setProperty("--c-panel-2", `rgb(${surface3Rgb.r}, ${surface3Rgb.g}, ${surface3Rgb.b})`);

  s.setProperty("--bg-primary", colors.surface);
  s.setProperty("--bg-secondary", rgbToHex(surface2Rgb.r, surface2Rgb.g, surface2Rgb.b));
  s.setProperty("--bg-tertiary", rgbToHex(surface3Rgb.r, surface3Rgb.g, surface3Rgb.b));
  s.setProperty("--bg-elevated", rgbToHex(surfaceElevatedRgb.r, surfaceElevatedRgb.g, surfaceElevatedRgb.b));

  // Divisores
  s.setProperty("--cm-line-soft", `${lineSoftRgb.r} ${lineSoftRgb.g} ${lineSoftRgb.b}`);
  s.setProperty("--cm-line", `${lineRgb.r} ${lineRgb.g} ${lineRgb.b}`);
  s.setProperty("--cm-line-strong", `${lineStrongRgb.r} ${lineStrongRgb.g} ${lineStrongRgb.b}`);
  s.setProperty("--c-line", `rgb(${lineRgb.r}, ${lineRgb.g}, ${lineRgb.b})`);

  // Textos
  s.setProperty("--cm-fg", `${textRgb.r} ${textRgb.g} ${textRgb.b}`);
  s.setProperty("--cm-fg-2", `${text2Rgb.r} ${text2Rgb.g} ${text2Rgb.b}`);
  s.setProperty("--cm-fg-muted", `${textMutedRgb.r} ${textMutedRgb.g} ${textMutedRgb.b}`);
  s.setProperty("--cm-fg-dim", `${textDimRgb.r} ${textDimRgb.g} ${textDimRgb.b}`);
  s.setProperty("--cm-fg-faint", `${textFaintRgb.r} ${textFaintRgb.g} ${textFaintRgb.b}`);

  s.setProperty("--c-text", `rgb(${textRgb.r}, ${textRgb.g}, ${textRgb.b})`);
  s.setProperty("--c-text-2", `rgb(${text2Rgb.r}, ${text2Rgb.g}, ${text2Rgb.b})`);
  s.setProperty("--c-text-3", `rgb(${textMutedRgb.r}, ${textMutedRgb.g}, ${textMutedRgb.b})`);
  s.setProperty("--c-text-4", `rgb(${textFaintRgb.r}, ${textFaintRgb.g}, ${textFaintRgb.b})`);
  s.setProperty("--text-main", colors.text);

  // Status & Acentos Auxiliares
  s.setProperty("--cm-focus", `${focusRgb.r} ${focusRgb.g} ${focusRgb.b}`);
  s.setProperty("--cm-info", `${focusRgb.r} ${focusRgb.g} ${focusRgb.b}`);
  s.setProperty("--accent-sky", colors.focus);

  s.setProperty("--cm-danger", `${dangerRgb.r} ${dangerRgb.g} ${dangerRgb.b}`);
  s.setProperty("--accent-pink", colors.danger);

  s.setProperty("--cm-warning", `${warningRgb.r} ${warningRgb.g} ${warningRgb.b}`);
  s.setProperty("--accent-yellow", colors.warning);

  s.setProperty("--cm-violet", `${violetRgb.r} ${violetRgb.g} ${violetRgb.b}`);
  s.setProperty("--accent-violet", colors.violet);

  s.setProperty("--cm-success", `${successRgb.r} ${successRgb.g} ${successRgb.b}`);

  // Espectro Dinâmico Combinado
  const spectrumGradient = `linear-gradient(110deg, ${colors.accent} 0%, ${colors.danger} 24%, ${colors.violet} 48%, ${colors.focus} 72%, ${colors.warning} 100%)`;
  s.setProperty("--cm-spectrum-gradient", spectrumGradient);
  s.setProperty("--cm-spectrum", spectrumGradient);
  s.setProperty("--g-play", spectrumGradient);
  s.setProperty("--g-spectrum", spectrumGradient);
}

/**
 * Lê o tema salvo localmente no navegador (0ms)
 */
export function getCachedPlatformTheme(): PlatformTheme | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(PLATFORM_THEME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 1 && parsed.colors) {
      return parsed as PlatformTheme;
    }
  } catch {
    // Retorna nulo se o storage estiver bloqueado ou corrompido
  }
  return null;
}

/**
 * Salva no localStorage e emite evento para outras abas
 */
export function cachePlatformTheme(theme: PlatformTheme | null): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (theme) {
      localStorage.setItem(PLATFORM_THEME_STORAGE_KEY, JSON.stringify(theme));
    } else {
      localStorage.removeItem(PLATFORM_THEME_STORAGE_KEY);
    }
  } catch {
    // localStorage indisponível
  }

  // Notifica outras abas/janelas via BroadcastChannel
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      const channel = new BroadcastChannel(PLATFORM_THEME_CHANNEL);
      channel.postMessage({ type: "THEME_CHANGED", theme });
      channel.close();
    } catch {
      // Ignora erro de canal
    }
  }
}

/**
 * Salva as cores no Supabase (se autenticado) e no cache local
 */
export async function savePlatformTheme(
  colors: PlatformThemeColors,
  metadata?: { presetId?: string; sourceBrandName?: string }
): Promise<{ success: boolean; message: string }> {
  const theme: PlatformTheme = {
    version: 1,
    colors,
    updatedAt: new Date().toISOString(),
    presetId: metadata?.presetId,
    sourceBrandName: metadata?.sourceBrandName,
  };

  // 1. Aplica na tela atual instantaneamente
  applyPlatformTheme(theme);

  // 2. Salva em cache local
  cachePlatformTheme(theme);

  // 3. Persiste no Supabase se logado
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id) {
      // Tenta RPC update_my_platform_theme
      const { error: rpcErr } = await supabase.rpc("update_my_platform_theme", {
        p_theme: theme,
      });

      if (!rpcErr) {
        return { success: true, message: "Cores da plataforma sincronizadas com sucesso!" };
      }

      // Fallback para update direto em profiles
      const { error: directErr } = await supabase
        .from("profiles")
        .update({ platform_theme: theme, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (!directErr) {
        return { success: true, message: "Cores da plataforma salvas com sucesso!" };
      }
    }

    return {
      success: true,
      message: "Salvo no navegador (faça login para sincronizar na nuvem).",
    };
  } catch {
    return {
      success: true,
      message: "Salvo localmente no navegador.",
    };
  }
}

/**
 * Restaura o padrão Caramelo canônico (limpa customização)
 */
export async function resetPlatformTheme(): Promise<{ success: boolean; message: string }> {
  // 1. Restaura estilos nativos
  applyPlatformTheme(null);

  // 2. Limpa cache local
  cachePlatformTheme(null);

  // 3. Limpa no Supabase se logado
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id) {
      const { error: rpcErr } = await supabase.rpc("update_my_platform_theme", { p_theme: null });
      if (rpcErr) {
        await supabase.from("profiles").update({ platform_theme: null }).eq("id", user.id);
      }
    }
  } catch {
    // Ignora erro remoto no reset
  }

  return { success: true, message: "Paleta padrão Caramelo restaurada com sucesso!" };
}

/**
 * Sincroniza tema remoto do Supabase para o cache local
 */
export async function syncPlatformThemeFromRemote(): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("platform_theme")
      .eq("id", user.id)
      .single();

    if (!error && data?.platform_theme) {
      const remoteTheme = data.platform_theme as PlatformTheme;
      if (remoteTheme.version === 1 && remoteTheme.colors) {
        const localTheme = getCachedPlatformTheme();
        // Se remoto for diferente ou local estiver vazio, atualiza
        if (
          !localTheme ||
          JSON.stringify(localTheme.colors) !== JSON.stringify(remoteTheme.colors)
        ) {
          cachePlatformTheme(remoteTheme);
          applyPlatformTheme(remoteTheme);
        }
      }
    }
  } catch {
    // Silencioso em caso de erro de rede
  }
}

/**
 * Instala o sincronizador global de tema:
 * Aplica o tema em cache imediatamente, escuta BroadcastChannel e storage,
 * e consulta o Supabase em segundo plano.
 */
export function installPlatformThemeSync(): () => void {
  // 1. Aplica o tema que já está no cache local
  const cached = getCachedPlatformTheme();
  if (cached) {
    applyPlatformTheme(cached);
  }

  // 2. Listener do BroadcastChannel para abas simultâneas
  let channel: BroadcastChannel | null = null;
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      channel = new BroadcastChannel(PLATFORM_THEME_CHANNEL);
      channel.onmessage = (event) => {
        if (event.data?.type === "THEME_CHANGED") {
          applyPlatformTheme(event.data.theme || null);
        }
      };
    } catch {
      // Ignora erro de channel
    }
  }

  // 3. Listener de storage (para browsers sem suporte a BroadcastChannel)
  const onStorage = (e: StorageEvent) => {
    if (e.key === PLATFORM_THEME_STORAGE_KEY) {
      if (e.newValue) {
        try {
          const theme = JSON.parse(e.newValue);
          applyPlatformTheme(theme);
        } catch {
          applyPlatformTheme(null);
        }
      } else {
        applyPlatformTheme(null);
      }
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  // 4. Sincroniza com Supabase em segundo plano
  syncPlatformThemeFromRemote().catch(() => {});

  return () => {
    if (channel) channel.close();
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}
