import type { LibraryApp } from "./types";

/** All transitions are local simulations; the Steam snapshot remains read-only. */
export type RunState =
  | { kind: "idle" }
  | { kind: "installed" }
  | { kind: "launching"; since: number }
  | { kind: "running"; since: number }
  | { kind: "installing"; progress: number; paused: boolean };

export interface DownloadSession {
  runs: Record<number, RunState>;
  completedInstalls: Record<number, number>;
  installedAppIds: Record<number, true>;
}

export type DownloadAction =
  | { type: "start" | "pause" | "resume" | "cancel"; appid: number }
  | { type: "pauseAll" }
  | { type: "resumeAll" }
  | { type: "clearCompleted" }
  | { type: "setRun"; appid: number; run: RunState }
  | { type: "tick"; now: number; increment?: number };

export function createDownloadSession(): DownloadSession {
  return { runs: {}, completedInstalls: {}, installedAppIds: {} };
}

export function downloadReducer(session: DownloadSession, action: DownloadAction): DownloadSession {
  if (action.type === "clearCompleted") {
    return Object.keys(session.completedInstalls).length ? { ...session, completedInstalls: {} } : session;
  }
  if (action.type === "setRun") {
    return { ...session, runs: { ...session.runs, [action.appid]: action.run } };
  }
  if (action.type === "tick") {
    let next = session;
    for (const [key, run] of Object.entries(session.runs)) {
      const appid = Number(key);
      if (run.kind === "launching" && action.now - run.since >= 1600) {
        next = { ...next, runs: { ...next.runs, [appid]: { kind: "running", since: action.now } } };
      }
      if (run.kind !== "installing" || run.paused) continue;
      const progress = Math.min(1, Math.max(0, run.progress + (action.increment ?? 0.035)));
      if (progress === run.progress) continue;
      next = progress >= 1
        ? {
            ...next,
            runs: { ...next.runs, [appid]: { kind: "installed" } },
            completedInstalls: { ...next.completedInstalls, [appid]: action.now },
            installedAppIds: { ...next.installedAppIds, [appid]: true },
          }
        : { ...next, runs: { ...next.runs, [appid]: { ...run, progress } } };
    }
    return next;
  }
  if (action.type === "pauseAll" || action.type === "resumeAll") {
    const paused = action.type === "pauseAll";
    let next = session;
    for (const [key, run] of Object.entries(session.runs)) {
      if (run.kind === "installing" && run.paused !== paused) {
        next = { ...next, runs: { ...next.runs, [Number(key)]: { ...run, paused } } };
      }
    }
    return next;
  }
  const run = session.runs[action.appid];
  if (action.type === "start") {
    if (session.installedAppIds[action.appid] || (run && run.kind !== "idle")) return session;
    return { ...session, runs: { ...session.runs, [action.appid]: { kind: "installing", progress: 0, paused: false } } };
  }
  if (run?.kind !== "installing") return session;
  const updated: RunState = action.type === "cancel" ? { kind: "idle" } : { ...run, paused: action.type === "pause" };
  return { ...session, runs: { ...session.runs, [action.appid]: updated } };
}

export type DownloadStatus = "downloading" | "paused" | "queued" | "update_required" | "completed";
export interface DownloadEntry {
  app: LibraryApp;
  source: "steam" | "simulation";
  state: DownloadStatus;
  progress: number;
  completedAt?: number;
}

export function selectDownloads(apps: LibraryApp[], runs: Record<number, RunState>, completedInstalls: Record<number, number>) {
  const active: DownloadEntry[] = [];
  const queued: DownloadEntry[] = [];
  const completed: DownloadEntry[] = [];
  const seen = new Set<number>();
  for (const app of apps) {
    if (seen.has(app.appid)) continue;
    seen.add(app.appid);
    const run = runs[app.appid];
    const completedAt = completedInstalls[app.appid];
    if (run?.kind === "installing") {
      active.push({ app, source: "simulation", state: run.paused ? "paused" : "downloading", progress: Math.min(1, Math.max(0, run.progress)) });
    } else if (completedAt !== undefined) {
      completed.push({ app, source: "simulation", state: "completed", progress: 1, completedAt });
    } else if (app.download) {
      const d = app.download;
      const entry: DownloadEntry = {
        app, source: "steam", state: d.state,
        progress: d.bytesToDownload > 0 ? Math.min(1, Math.max(0, d.bytesDownloaded / d.bytesToDownload)) : 0,
      };
      if (d.state === "queued" || d.state === "update_required") queued.push(entry);
      else active.push(entry);
    } else if (app.installed && app.lastUpdated) {
      completed.push({ app, source: "steam", state: "completed", progress: 1, completedAt: app.lastUpdated * 1000 });
    }
  }
  completed.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  return { active, queued, completed, transferring: active.filter((entry) => entry.state === "downloading") };
}
