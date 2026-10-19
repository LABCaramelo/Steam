import { useEffect, useState } from "react";
import type { CarameloTheme } from "@caramelo/design-system";

/** Mesma chave do ThemeToggle do pacote e da ponte das páginas estáticas (LP, workshop, biblioteca). */
const STORAGE_KEY = "caramelo-theme";
const THEME_COLOR: Record<CarameloTheme, string> = { dark: "#101014", light: "#FFF4E8" };

const readTheme = (): CarameloTheme =>
  document.documentElement.getAttribute("data-caramelo-theme") === "light" ? "light" : "dark";

/**
 * Tema do <html>, escrito pelo ThemeToggle de @caramelo/design-system. Os toggles da barra de título e
 * das Configurações ficam em sincronia, e uma troca feita na biblioteca embutida chega ao LAB.
 */
export function useCarameloTheme(): CarameloTheme {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(root, { attributes: true, attributeFilter: ["data-caramelo-theme"] });
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === "light" || e.newValue === "dark")) root.setAttribute("data-caramelo-theme", e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
  }, [theme]);

  return theme;
}
