import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { installSpotlight, installThemeSync, ToastProvider, ToolGate, type ToolInfo } from "./kit";
import "@caramelo/design-system/styles.css";
import "./kit.css";

/** Entry point shared by every tool page: theme, spotlight, toasts and the library gate. */
export function mountTool(tool: ToolInfo, app: ReactNode) {
  installThemeSync();
  installSpotlight();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ToastProvider>
        <ToolGate tool={tool}>{app}</ToolGate>
      </ToastProvider>
    </StrictMode>,
  );
}
