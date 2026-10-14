import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type PersonaStatus = "online" | "away" | "invisible" | "offline";

export interface ClientSettings {
  /** When on, Play/Install hand off to the real client through steam:// URLs. */
  launchViaSteamProtocol: boolean;
  startPage: "library" | "store";
  showGameIconsInList: boolean;
  lowPerfMode: boolean;
  downloadThrottleKbps: number;
  notificationsToasts: boolean;
}

const DEFAULT_SETTINGS: ClientSettings = {
  launchViaSteamProtocol: false,
  startPage: "library",
  showGameIconsInList: true,
  lowPerfMode: false,
  downloadThrottleKbps: 0,
  notificationsToasts: true,
};

interface UiState {
  smallMode: boolean;
  setSmallMode: (v: boolean) => void;
  friendsOpen: boolean;
  setFriendsOpen: (v: boolean) => void;
  aboutOpen: boolean;
  setAboutOpen: (v: boolean) => void;
  status: PersonaStatus;
  setStatus: (s: PersonaStatus) => void;
  toast: (msg: string) => void;
  toasts: { id: number; msg: string }[];
  settings: ClientSettings;
  setSetting: <K extends keyof ClientSettings>(k: K, v: ClientSettings[K]) => void;
}

const Ctx = createContext<UiState | null>(null);
const SETTINGS_KEY = "steam-recriada:settings";

function loadSettings(): ClientSettings {
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<ClientSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [smallMode, setSmallMode] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [status, setStatus] = useState<PersonaStatus>("online");
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [settings, setSettings] = useState<ClientSettings>(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // storage unavailable
    }
    document.documentElement.classList.toggle("low-perf", settings.lowPerfMode);
  }, [settings]);

  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const setSetting = useCallback(<K extends keyof ClientSettings>(k: K, v: ClientSettings[K]) => setSettings((s) => ({ ...s, [k]: v })), []);

  return (
    <Ctx.Provider
      value={{ smallMode, setSmallMode, friendsOpen, setFriendsOpen, aboutOpen, setAboutOpen, status, setStatus, toast, toasts, settings, setSetting }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useUi(): UiState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUi fora do UiProvider");
  return v;
}

export const STATUS_LABEL: Record<PersonaStatus, string> = {
  online: "Disponível",
  away: "Ausente",
  invisible: "Invisível",
  offline: "Off-line",
};
