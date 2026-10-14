import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LibraryProvider, RunProvider } from "./api";
import { App } from "./App";
import { UiProvider } from "./ui";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <UiProvider>
        <LibraryProvider>
          <RunProvider>
            <App />
          </RunProvider>
        </LibraryProvider>
      </UiProvider>
    </BrowserRouter>
  </StrictMode>,
);
