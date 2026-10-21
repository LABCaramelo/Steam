import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LibraryProvider, RunProvider } from "./api";
import { App } from "./App";
import { AuthProvider, useAuth } from "./auth";
import { CommunityProvider } from "./community";
import { LoginScreen } from "./components/LoginScreen";
import { LabAccessGate, LoadingScreen } from "./components/WhatsAppGate";
import { EntitlementsProvider } from "./entitlements";
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
    return <LoadingScreen label="CARREGANDO SESSÃO…" />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Só membros do grupo oficial no WhatsApp entram: o servidor confere a cada entrada.
  return (
    <LabAccessGate>
      <BrowserRouter>
        <UiProvider>
          <EntitlementsProvider>
            <LibraryProvider>
              <RunProvider>
                <CommunityProvider>
                  <App />
                </CommunityProvider>
              </RunProvider>
            </LibraryProvider>
          </EntitlementsProvider>
        </UiProvider>
      </BrowserRouter>
    </LabAccessGate>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <AuthGatekeeper />
    </AuthProvider>
  </StrictMode>,
);
