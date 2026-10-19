import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LibraryProvider, RunProvider } from "./api";
import { App } from "./App";
import { AuthProvider, useAuth } from "./auth";
import { IconMark } from "./components/Icons";
import { LoginScreen } from "./components/LoginScreen";
import { UiProvider } from "./ui";
import "./styles.css";

// O aplicativo opera soberanamente no material Lumen Dark (#101014 Ink Black)
if (typeof window !== "undefined") {
  document.documentElement.setAttribute("data-caramelo-theme", "lumen-dark");
  try {
    localStorage.removeItem("caramelo:theme");
  } catch {}

  window.addEventListener(
    "pointermove",
    (e) => {
      const targets = document.querySelectorAll<HTMLElement>(".cm-surface--spotlight, .cm-surface-spotlight");
      targets.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (
          e.clientX >= rect.left - 80 &&
          e.clientX <= rect.right + 80 &&
          e.clientY >= rect.top - 80 &&
          e.clientY <= rect.bottom + 80
        ) {
          el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
          el.style.setProperty("--my", `${e.clientY - rect.top}px`);
        }
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
