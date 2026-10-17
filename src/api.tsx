import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { createDownloadSession, downloadReducer, type DownloadSession, type RunState } from "./downloads";
import fallbackSnapshot from "./fallbackSnapshot.json";
import type { Achievement, ArtKind, LibraryApp, LibrarySnapshot, UserCollection } from "./types";

export const artUrl = (appid: number, kind: ArtKind) => `/api/art/${appid}/${kind}`;

export const steamCdnArtUrl = (appid: number, kind: ArtKind) => {
  switch (kind) {
    case "capsule":
      return `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/library_600x900_2x.jpg`;
    case "hero":
    case "heroBlur":
      return `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/library_hero.jpg`;
    case "logo":
      return `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/logo.png`;
    case "header":
    default:
      return `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`;
  }
};

interface LibraryState {
  snapshot: LibrarySnapshot | null;
  error: string | null;
  refresh: () => void;
  app: (appid: number) => LibraryApp | undefined;
  collections: UserCollection[];
  /** Local-only overrides (favorites, hidden, custom collections) — never written back to Steam. */
  toggleFavorite: (appid: number) => void;
  isFavorite: (appid: number) => boolean;
  createCollection: (name: string) => string;
  addToCollection: (collectionId: string, appid: number) => void;
  /** Storage and folder management */
  moveApps: (appids: number[], targetFolder: string) => void;
  addLibraryFolder: (path: string, label?: string) => void;
  removeLibraryFolder: (path: string) => void;
  renameLibraryFolder: (path: string, newLabel: string) => void;
  setDefaultFolder: (path: string) => void;
  defaultFolder: string;
}

const Ctx = createContext<LibraryState | null>(null);
const LOCAL_KEY = "steam-recriada:collections";
const PATHS_KEY = "steam-recriada:app-paths";
const FOLDERS_KEY = "steam-recriada:extra-folders";
const DEFAULT_FOLDER_KEY = "steam-recriada:default-folder";

function loadLocal(): UserCollection[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as UserCollection[]) : null;
  } catch {
    return null;
  }
}
function saveLocal(c: UserCollection[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(c));
  } catch {
    // storage unavailable: keep in memory only
  }
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<LibrarySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collections, setCollections] = useState<UserCollection[]>([]);

  // Persistent storage overrides (never written to Steam files)
  const [appPathOverrides, setAppPathOverrides] = useState<Record<number, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(PATHS_KEY) ?? "{}");
    } catch {
      return {};
    }
  });

  const [extraFolders, setExtraFolders] = useState<{ path: string; label: string; totalSize: number; freeBytes?: number }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(FOLDERS_KEY) ?? "[]");
    } catch {
      return [];
    }
  });

  const [removedFolderPaths, setRemovedFolderPaths] = useState<string[]>([]);
  const [folderLabels, setFolderLabels] = useState<Record<string, string>>({});

  const [defaultFolder, setDefaultFolderState] = useState<string>(() => {
    try {
      return localStorage.getItem(DEFAULT_FOLDER_KEY) ?? "";
    } catch {
      return "";
    }
  });

  const load = useCallback((fresh: boolean) => {
    fetch(`/api/library${fresh ? "?refresh" : ""}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((s: LibrarySnapshot) => {
        if (!s || !Array.isArray(s.apps)) throw new Error("Invalid snapshot format");
        setSnapshot(s);
        setError(null);
        setCollections((prev) => (prev.length ? prev : (loadLocal() ?? s.collections)));
      })
      .catch(() => {
        // Fallback resiliente para o snapshot embutido quando servido sem backend local (Vercel)
        const fallback = fallbackSnapshot as unknown as LibrarySnapshot;
        setSnapshot(fallback);
        setError(null);
        setCollections((prev) => (prev.length ? prev : (loadLocal() ?? fallback.collections)));
      });
  }, []);

  useEffect(() => {
    load(false);
    const id = setInterval(() => load(false), 20_000);
    return () => clearInterval(id);
  }, [load]);

  const updateCollections = useCallback((fn: (c: UserCollection[]) => UserCollection[]) => {
    setCollections((prev) => {
      const next = fn(prev);
      saveLocal(next);
      return next;
    });
  }, []);

  const moveApps = useCallback((appids: number[], targetFolder: string) => {
    setAppPathOverrides((prev) => {
      const next = { ...prev };
      appids.forEach((id) => {
        next[id] = targetFolder;
      });
      try {
        localStorage.setItem(PATHS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const addLibraryFolder = useCallback((folderPath: string, label?: string) => {
    setExtraFolders((prev) => {
      if (prev.some((f) => f.path.toLowerCase() === folderPath.toLowerCase())) return prev;
      const next = [
        ...prev,
        // The browser cannot stat an arbitrary folder, so its capacity stays unknown instead of invented.
        { path: folderPath, label: label || folderPath, totalSize: 0 },
      ];
      try {
        localStorage.setItem(FOLDERS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const removeLibraryFolder = useCallback((folderPath: string) => {
    setRemovedFolderPaths((prev) => [...prev, folderPath]);
    setExtraFolders((prev) => {
      const next = prev.filter((f) => f.path !== folderPath);
      try {
        localStorage.setItem(FOLDERS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const renameLibraryFolder = useCallback((folderPath: string, newLabel: string) => {
    setFolderLabels((prev) => ({ ...prev, [folderPath]: newLabel }));
    setExtraFolders((prev) => {
      const next = prev.map((f) => (f.path === folderPath ? { ...f, label: newLabel } : f));
      try {
        localStorage.setItem(FOLDERS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const setDefaultFolder = useCallback((folderPath: string) => {
    setDefaultFolderState(folderPath);
    try {
      localStorage.setItem(DEFAULT_FOLDER_KEY, folderPath);
    } catch {}
  }, []);

  // Compute merged snapshot with overridden paths and extra library folders
  const effectiveSnapshot = useMemo<LibrarySnapshot | null>(() => {
    if (!snapshot) return null;

    const baseFolders = (snapshot.libraryFolders ?? []).filter((f) => !removedFolderPaths.includes(f.path));
    const allFoldersMap = new Map<string, { path: string; label: string; totalSize: number; freeBytes?: number }>();
    
    baseFolders.forEach((f) => {
      allFoldersMap.set(f.path, {
        ...f,
        label: folderLabels[f.path] || f.label || f.path,
      });
    });

    extraFolders.forEach((f) => {
      if (!removedFolderPaths.includes(f.path)) {
        allFoldersMap.set(f.path, {
          ...f,
          label: folderLabels[f.path] || f.label || f.path,
        });
      }
    });

    const libraryFolders = Array.from(allFoldersMap.values());

    const apps = snapshot.apps.map((a) => {
      const overridden = appPathOverrides[a.appid];
      if (overridden) {
        return { ...a, libraryPath: overridden };
      }
      return a;
    });

    return {
      ...snapshot,
      libraryFolders,
      apps,
    };
  }, [snapshot, appPathOverrides, extraFolders, removedFolderPaths, folderLabels]);

  const value = useMemo<LibraryState>(() => {
    const byId = new Map(effectiveSnapshot?.apps.map((a) => [a.appid, a]));
    const fav = collections.find((c) => c.id === "favorite");
    const activeDefaultFolder = defaultFolder || effectiveSnapshot?.libraryFolders[0]?.path || "";

    return {
      snapshot: effectiveSnapshot,
      error,
      refresh: () => load(true),
      app: (appid) => byId.get(appid),
      collections,
      isFavorite: (appid) => !!fav?.appids.includes(appid),
      toggleFavorite: (appid) =>
        updateCollections((cs) => {
          const has = cs.some((c) => c.id === "favorite");
          const base = has ? cs : [...cs, { id: "favorite", name: "Favoritos", appids: [], dynamic: false }];
          return base.map((c) =>
            c.id !== "favorite" ? c : { ...c, appids: c.appids.includes(appid) ? c.appids.filter((x) => x !== appid) : [...c.appids, appid] },
          );
        }),
      createCollection: (name) => {
        const id = `uc-${Date.now().toString(36)}`;
        updateCollections((cs) => [...cs, { id, name, appids: [], dynamic: false }]);
        return id;
      },
      addToCollection: (collectionId, appid) =>
        updateCollections((cs) => cs.map((c) => (c.id === collectionId && !c.appids.includes(appid) ? { ...c, appids: [...c.appids, appid] } : c))),
      moveApps,
      addLibraryFolder,
      removeLibraryFolder,
      renameLibraryFolder,
      setDefaultFolder,
      defaultFolder: activeDefaultFolder,
    };
  }, [effectiveSnapshot, error, collections, load, updateCollections, defaultFolder, moveApps, addLibraryFolder, removeLibraryFolder, renameLibraryFolder, setDefaultFolder]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLibrary(): LibraryState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLibrary fora do LibraryProvider");
  return v;
}

export function useAchievements(appid: number) {
  const [data, setData] = useState<{ total: number; achieved: number; list: Achievement[] } | null>(null);
  useEffect(() => {
    let alive = true;
    setData(null);
    fetch(`/api/app/${appid}/achievements`)
      .then((r) => r.json())
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ total: 0, achieved: 0, list: [] }));
    return () => {
      alive = false;
    };
  }, [appid]);
  return data;
}

/** Simulated launch/install state so the play bar behaves like the client without touching Steam. */
export type { RunState } from "./downloads";
interface DownloadController extends DownloadSession {
  setRun: (appid: number, state: RunState) => void;
  start: (appid: number) => void;
  pause: (appid: number) => void;
  resume: (appid: number) => void;
  cancel: (appid: number) => void;
  pauseAll: () => void;
  resumeAll: () => void;
  clearCompleted: () => void;
  isInstalled: (appid: number) => boolean;
}
const RunCtx = createContext<DownloadController | null>(null);
const IDLE_RUN: RunState = { kind: "idle" };

export function RunProvider({ children }: { children: ReactNode }) {
  const [session, dispatch] = useReducer(downloadReducer, undefined, createDownloadSession);
  const setRun = useCallback((appid: number, run: RunState) => dispatch({ type: "setRun", appid, run }), []);
  const start = useCallback((appid: number) => dispatch({ type: "start", appid }), []);
  const pause = useCallback((appid: number) => dispatch({ type: "pause", appid }), []);
  const resume = useCallback((appid: number) => dispatch({ type: "resume", appid }), []);
  const cancel = useCallback((appid: number) => dispatch({ type: "cancel", appid }), []);
  const pauseAll = useCallback(() => dispatch({ type: "pauseAll" }), []);
  const resumeAll = useCallback(() => dispatch({ type: "resumeAll" }), []);
  const clearCompleted = useCallback(() => dispatch({ type: "clearCompleted" }), []);
  // Simulated transfers and launches keep advancing when their detail page is unmounted.
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: "tick", now: Date.now() }), 500);
    return () => clearInterval(id);
  }, []);
  const value = useMemo<DownloadController>(() => ({
    ...session, setRun, start, pause, resume, cancel, pauseAll, resumeAll, clearCompleted,
    isInstalled: (appid) => !!session.installedAppIds[appid],
  }), [session, setRun, start, pause, resume, cancel, pauseAll, resumeAll, clearCompleted]);
  return <RunCtx.Provider value={value}>{children}</RunCtx.Provider>;
}

export function useRun(appid: number) {
  const v = useContext(RunCtx);
  if (!v) throw new Error("useRun fora do RunProvider");
  const setRun = useCallback((state: RunState) => v.setRun(appid, state), [appid, v.setRun]);
  return [v.runs[appid] ?? IDLE_RUN, setRun] as const;
}

export function useAllRuns() {
  const v = useContext(RunCtx);
  if (!v) throw new Error("useAllRuns fora do RunProvider");
  return v.runs;
}

export function useDownloads(): DownloadController {
  const value = useContext(RunCtx);
  if (!value) throw new Error("useDownloads fora do RunProvider");
  return value;
}
