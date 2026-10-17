import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LibraryProvider, RunProvider } from "./api";
import { App } from "./App";
import { AuthProvider, useAuth } from "./auth";
import { LoginScreen } from "./components/LoginScreen";
import { PointerTrail } from "./components/PointerTrail";
import { UiProvider } from "./ui";
import "./styles.css";

// Inicializa o tema e registra o rastreador de cursor para spotlight-surface (Caramelo Lumen)
if (typeof window !== "undefined") {
  try {
    const savedTheme = localStorage.getItem("caramelo:theme") || "lumen-dark";
    document.documentElement.setAttribute("data-caramelo-theme", savedTheme);
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
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <>
        {/* Rastro interativo oficial de figurinhas Caramelo exclusivo da tela de login */}
        <PointerTrail />
        <LoginScreen />
      </>
    );
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
