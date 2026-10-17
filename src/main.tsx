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

function AuthGatekeeper() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {/* Rastro interativo oficial de figurinhas Caramelo */}
      <PointerTrail />
      {!isAuthenticated ? (
        <LoginScreen />
      ) : (
        <BrowserRouter>
          <UiProvider>
            <LibraryProvider>
              <RunProvider>
                <App />
              </RunProvider>
            </LibraryProvider>
          </UiProvider>
        </BrowserRouter>
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <AuthGatekeeper />
    </AuthProvider>
  </StrictMode>,
);
