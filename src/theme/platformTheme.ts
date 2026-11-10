// ==============================================================================
// LAB Caramelo — tema da plataforma
// O LAB segue o Apple Design System (tokens em public/apple/tokens.css, ponte
// --cm-* em src/theme/apple.css). Os presets e a paleta personalizada saíram:
// este módulo só limpa o que versões antigas gravaram (variáveis inline no
// <html> e o cache "caramelo_platform_theme_v1"), para todo mundo ver o visual Apple.
// ==============================================================================

const LEGACY_STORAGE_KEY = "caramelo_platform_theme_v1";

/** Variáveis que o antigo motor de temas escrevia no style do <html>. */
const LEGACY_INLINE_PROPS = [
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
  "--g-spectrum",
];

function clearLegacyPlatformTheme(): void {
  if (typeof document !== "undefined") {
    const style = document.documentElement.style;
    for (const prop of LEGACY_INLINE_PROPS) style.removeProperty(prop);
  }
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // localStorage indisponível
  }
}

/** Mantém o nome usado por main.tsx e tools/shared/kit.tsx. */
export function installPlatformThemeSync(): () => void {
  clearLegacyPlatformTheme();
  return () => {};
}
