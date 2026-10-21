import { Isotype, MagneticButton } from "@caramelo/design-system";
import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../supabase";

/**
 * Shared runtime of the LAB tools (Kanban, Prancheta, Automation, Academy). Each tool is its
 * own page under /tools/<slug>/, embedded by the LAB in an iframe and also usable in a tab of
 * its own. Same origin as the LAB, so the Supabase session and the Caramelo theme are shared.
 */

export const STORE_URL = (appid: number) => `/store/app/${appid}`;
export const isEmbedded = () => new URLSearchParams(location.search).get("embed") === "1";

// ---------------------------------------------------------------------------------------------
// Theme: same key and attribute as the LAB (src/theme.ts) and the static pages.
// ---------------------------------------------------------------------------------------------

const THEME_KEY = "caramelo-theme";

export function installThemeSync() {
  const root = document.documentElement;
  const apply = (value: string | null) => {
    if (value === "light" || value === "dark") root.setAttribute("data-caramelo-theme", value);
  };
  try {
    apply(localStorage.getItem(THEME_KEY));
  } catch {
    // storage blocked: keep the default (dark)
  }
  // A toggle in the LAB (or in another tool) reaches this page.
  window.addEventListener("storage", (e) => {
    if (e.key === THEME_KEY) apply(e.newValue);
  });
  if (isEmbedded()) root.dataset.embedded = "true";
}

/** Live data-caramelo-theme of <html>. */
export function useTheme(): "dark" | "light" {
  const read = (): "dark" | "light" => (document.documentElement.getAttribute("data-caramelo-theme") === "light" ? "light" : "dark");
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-caramelo-theme"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

/** spotlight-surface: --mx/--my for any .cm-surface--spotlight, as in the LAB. */
export function installSpotlight() {
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

// ---------------------------------------------------------------------------------------------
// Session and library gate
// ---------------------------------------------------------------------------------------------

export interface ToolUser {
  id: string;
  email: string;
  name: string;
}

export interface ToolInfo {
  slug: string;
  appid: number;
  name: string;
}

type GateState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "locked" }
  | { kind: "unconfigured" }
  | { kind: "error"; message: string }
  | { kind: "ready"; user: ToolUser };

const UserCtx = createContext<ToolUser | null>(null);
const MISSING = new Set(["PGRST202", "PGRST205", "42P01"]);

function toUser(session: Session): ToolUser {
  const meta = session.user.user_metadata ?? {};
  const email = session.user.email ?? "";
  return { id: session.user.id, email, name: (meta.nickname as string) || (meta.name as string) || email.split("@")[0] || "Você" };
}

/** Renders the tool only for a signed-in person who has it in the library. */
export function ToolGate({ tool, children }: { tool: ToolInfo; children: ReactNode }) {
  const [state, setState] = useState<GateState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const userId = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    let request = 0;
    const check = async (session: Session | null) => {
      const version = ++request;
      if (!session) {
        userId.current = null;
        if (alive) setState({ kind: "signed_out" });
        return;
      }
      if (session.user.id !== userId.current && alive) setState({ kind: "loading" });
      const { data, error } = await supabase.rpc("has_tool", { p_slug: tool.slug });
      if (!alive || version !== request) return;
      if (error) setState(MISSING.has(error.code) ? { kind: "unconfigured" } : { kind: "error", message: "Não foi possível abrir a ferramenta agora." });
      else if (!data) setState({ kind: "locked" });
      else {
        userId.current = session.user.id;
        setState({ kind: "ready", user: toUser(session) });
      }
    };
    supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Token refreshes keep the same person: nothing to re-check.
      if (event === "TOKEN_REFRESHED" && session?.user.id === userId.current) return;
      if (event === "INITIAL_SESSION") return;
      check(session);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [tool.slug, attempt]);

  useEffect(() => {
    document.title = `${tool.name} — LAB`;
  }, [tool.name]);

  if (state.kind === "ready") return <ToolUserProvider key={state.user.id} user={state.user}>{children}</ToolUserProvider>;
  if (state.kind === "loading") return <GateScreen title={tool.name} busy text="Abrindo…" />;
  if (state.kind === "signed_out")
    return <GateScreen title={tool.name} text="Entre no LAB para usar esta ferramenta." action={{ label: "Entrar no LAB", href: "/library/home" }} />;
  if (state.kind === "locked")
    return (
      <GateScreen
        title={tool.name}
        text={`${tool.name} ainda não está na sua biblioteca. Adquira na Loja do LAB para começar.`}
        action={{ label: "Ver na Loja", href: STORE_URL(tool.appid) }}
      />
    );
  if (state.kind === "unconfigured")
    return <GateScreen title={tool.name} text="O banco das ferramentas ainda não foi configurado no Supabase (supabase/lab-tools.sql)." />;
  return <GateScreen title={tool.name} text={state.message} action={{ label: "Tentar de novo", onClick: () => setAttempt((n) => n + 1) }} />;
}

/** Provides the signed-in person to a tool (ToolGate does it after checking the session). */
export function ToolUserProvider({ user, children }: { user: ToolUser; children: ReactNode }) {
  return <UserCtx.Provider value={user}>{children}</UserCtx.Provider>;
}

export function useToolUser(): ToolUser {
  const user = useContext(UserCtx);
  if (!user) throw new Error("useToolUser fora do ToolGate");
  return user;
}

function GateScreen({ title, text, busy, action }: { title: string; text: string; busy?: boolean; action?: { label: string; href?: string; onClick?: () => void } }) {
  return (
    <main className="tk-gate">
      <div className="tk-gate__card cm-surface cm-surface--spotlight" role={busy ? "status" : undefined} aria-busy={busy}>
        <Isotype size={56} decorative interactive />
        <span className="tk-eyebrow">UM CARA CARAMELO · LAB</span>
        <h1 className="tk-gate__title">{title}</h1>
        <p className="tk-gate__text">{text}</p>
        {action &&
          (action.href ? (
            <MagneticButton variant="accent" href={action.href} target="_top">
              {action.label}
            </MagneticButton>
          ) : (
            <MagneticButton variant="accent" onClick={action.onClick}>
              {action.label}
            </MagneticButton>
          ))}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------------------------

type Tone = "info" | "success" | "error";
interface Toast {
  id: number;
  text: string;
  tone: Tone;
}
const ToastCtx = createContext<(text: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const push = useCallback((text: string, tone: Tone = "info") => {
    const id = ++seq.current;
    setToasts((list) => [...list.slice(-3), { id, text, tone }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), tone === "error" ? 6000 : 3400);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="tk-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`tk-toast tk-toast--${t.tone}`} role={t.tone === "error" ? "alert" : "status"}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

// ---------------------------------------------------------------------------------------------
// Modal and confirm dialog
// ---------------------------------------------------------------------------------------------

const modalStack: object[] = [];

export function Modal({
  title,
  onClose,
  children,
  width = 560,
  footer,
  labelledBy,
}: {
  title?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  footer?: ReactNode;
  labelledBy?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const token = {};
    modalStack.push(token);
    const previous = document.activeElement as HTMLElement | null;
    // Only the dialog on top answers Esc (a confirmation above a card window, for example).
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalStack[modalStack.length - 1] === token) {
        e.stopPropagation();
        close.current();
      }
    };
    window.addEventListener("keydown", onKey);
    const focusable = panel.current?.querySelector<HTMLElement>("[autofocus], input, textarea, select, button:not(.tk-modal__close)");
    (focusable ?? panel.current)?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      modalStack.splice(modalStack.indexOf(token), 1);
      previous?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="tk-modal-backdrop cm-overlay-in" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        className="tk-modal cm-surface cm-surface--3 cm-modal-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? (title ? "tk-modal-title" : undefined)}
        tabIndex={-1}
        style={{ width: `min(${width}px, calc(100vw - 32px))` }}
      >
        <button className="tk-iconbtn tk-modal__close" onClick={onClose} aria-label="Fechar">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        {title && (
          <h2 className="tk-modal__title" id="tk-modal-title">
            {title}
          </h2>
        )}
        <div className="tk-modal__body">{children}</div>
        {footer && <div className="tk-modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Confirm({
  title,
  text,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  text: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={title}
      onClose={onClose}
      width={440}
      footer={
        <>
          <button className="cm-btn cm-btn--ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            className={`cm-btn ${danger ? "tk-btn--danger" : "cm-btn--accent"}`}
            disabled={busy}
            autoFocus
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onClose();
              } catch {
                // The caller reports the failure; keep the confirmation open for another attempt.
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="tk-modal__text">{text}</div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------------------------
// Small controls
// ---------------------------------------------------------------------------------------------

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`tk-switch ${checked ? "is-on" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onChange(!checked);
      }}
    >
      <span className="tk-switch__thumb" />
    </button>
  );
}

export function Spinner({ size = 18, label }: { size?: number; label?: string }) {
  return <span className="tk-spinner" style={{ width: size, height: size }} role={label ? "status" : undefined} aria-label={label} />;
}

export function EmptyState({ title, text, action }: { title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="tk-empty">
      <Isotype size={40} decorative />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

/** Downloads a text file built in the browser. */
export function downloadFile(name: string, content: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens the file picker and resolves with the chosen file's text. */
export function pickTextFile(accept: string): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];
      resolve(file ? { name: file.name, text: await file.text() } : null);
    };
    input.click();
  });
}

export const relativeTime = (iso: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `há ${days} ${days === 1 ? "dia" : "dias"}`;
  return new Date(iso).toLocaleDateString("pt-BR");
};
