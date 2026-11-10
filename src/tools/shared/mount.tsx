import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { cleanToolUrl, installSpotlight, installThemeSync, ToastProvider, ToolGate, type ToolInfo } from "./kit";
import "@caramelo/design-system/styles.css";
import "./kit.css";
import "../../theme/apple.css";
import "../../theme/apple-tools.css";

interface MountOptions {
  forceTheme?: "dark" | "light";
  allowAnonymous?: boolean;
}

/** Entry point shared by every tool page: theme, spotlight, toasts and the library gate. */
export function mountTool(tool: ToolInfo, app: ReactNode, options?: MountOptions) {
  cleanToolUrl();
  // Escopo das paletas de cada ferramenta em theme/apple-tools.css.
  document.documentElement.dataset.tool = tool.slug;
  if (options?.forceTheme) {
    document.documentElement.setAttribute("data-caramelo-theme", options.forceTheme);
  } else {
    installThemeSync();
  }
  installSpotlight();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ToastProvider>
        <ToolGate tool={tool} allowAnonymous={options?.allowAnonymous}>{app}</ToolGate>
      </ToastProvider>
    </StrictMode>,
  );
}
