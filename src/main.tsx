import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LibraryProvider, RunProvider } from "./api";
import { App } from "./App";
import { AuthProvider, useAuth } from "./auth";
import { IconMark } from "./components/Icons";
import { LoginScreen } from "./components/LoginScreen";
import { UiProvider } from "./ui";
import "@caramelo/design-system/styles.css";
import "./styles.css";

// spotlight-surface: a mesma escrita de --mx/--my do usePointerVars do pacote, delegada para
// qualquer .cm-surface--spotlight (cartões, painéis e modais que não são <Surface>).
if (typeof window !== "undefined") {
  let frame = 0;
  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType === "touch" || !(e.target instanceof Element)) return;
      const surface = e.target.closest<HTMLElement>(".cm-surface--spotlight");
      if (!surface) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = surface.getBoundingClientRect();
        surface.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        surface.style.setProperty("--my", `${e.clientY - rect.top}px`);
      });
    },
    { passive: true },
  );
}

function AuthGatekeeper() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="login-screen" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
          <div className="login-modal__badge login-modal__badge--loading">
            <IconMark size={46} decorative />
          </div>
          <span style={{ fontFamily: "Montserrat", fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em", color: "rgb(var(--cm-fg-muted))" }}>
            CARREGANDO SESSÃO…
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <BrowserRouter>
      <UiProvider>
        <LibraryProvider>
          <RunProvider>
            <App />
          </RunProvider>
        </LibraryProvider>
      </UiProvider>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <AuthGatekeeper />
    </AuthProvider>
  </StrictMode>,
);
