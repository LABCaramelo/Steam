import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"lumen-dark" | "lumen-light">(() => {
    try {
      return (localStorage.getItem("caramelo:theme") as "lumen-dark" | "lumen-light") ?? "lumen-dark";
    } catch {
      return "lumen-dark";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-caramelo-theme", theme);
    try {
      localStorage.setItem("caramelo:theme", theme);
    } catch {}
  }, [theme]);

  const toggle = () => {
    const next = theme === "lumen-dark" ? "lumen-light" : "lumen-dark";
    // theme-reveal: Troca de tema com corte cinematográfico diagonal via View Transitions API
    const doc = document as unknown as { startViewTransition?: (cb: () => void) => void };
    if (typeof doc.startViewTransition === "function") {
      doc.startViewTransition(() => {
        setTheme(next);
      });
    } else {
      setTheme(next);
    }
  };

  const isDark = theme === "lumen-dark";

  return (
    <button
      type="button"
      className="theme-toggle cm-spectrum-trigger"
      onClick={toggle}
      title={isDark ? "Alternar para tema claro (Print/Cream)" : "Alternar para tema escuro (Lumen/Ink)"}
      aria-label="Alternar tema"
      aria-pressed={!isDark}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {isDark ? "☀️" : "🌙"}
      </span>
      <span className="theme-toggle__label cm-glitch" data-text={isDark ? "CLARO" : "ESCURO"}>
        {isDark ? "CLARO" : "ESCURO"}
      </span>
    </button>
  );
}
