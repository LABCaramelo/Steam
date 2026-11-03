import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { installSpotlight, installThemeSync, ToastProvider, ToolGate, type ToolInfo } from "./kit";
import "@caramelo/design-system/styles.css";
import "./kit.css";

interface MountOptions {
  forceTheme?: "dark" | "light";
}

/** Entry point shared by every tool page: theme, spotlight, toasts and the library gate. */
export function mountTool(tool: ToolInfo, app: ReactNode, options?: MountOptions) {
  if (options?.forceTheme) {
    document.documentElement.setAttribute("data-caramelo-theme", options.forceTheme);
  } else {
    installThemeSync();
  }
  installSpotlight();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ToastProvider>
        <ToolGate tool={tool}>{app}</ToolGate>
      </ToastProvider>
    </StrictMode>,
  );
}
