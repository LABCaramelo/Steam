import type { LibraryApp, MediaFilter, MediaItem } from "./types";

/**
 * Filter media items according to the official MediaManager filter contract:
 * - mediaType: "all" | "clip" | "screenshot" | "recording"
 * - listSource: { type: "recents" } (all apps) or { type: "app", gameid: number }
 * - query: search string matching appName or caption
 */
export function filterMedia(items: MediaItem[], filter: MediaFilter): MediaItem[] {
  return items.filter((item) => {
    if (filter.mediaType !== "all" && item.type !== filter.mediaType) {
      return false;
    }
    if (filter.listSource.type === "app" && item.appid !== filter.listSource.gameid) {
      return false;
    }
    if (filter.query && filter.query.trim()) {
      const q = filter.query.toLowerCase().trim();
      const matchName = item.appName.toLowerCase().includes(q);
      const matchCaption = (item.caption ?? "").toLowerCase().includes(q);
      if (!matchName && !matchCaption) return false;
    }
    return true;
  });
}

export interface MediaSessionGroup {
  sessionKey: string;
  sessionTitle: string;
  date: number;
  appid: number;
  appName: string;
  items: MediaItem[];
}

/**
 * Groups media items for the ListView ("Exibição em sessões"),
 * clustering items by app and day.
 */
export function groupMediaBySession(items: MediaItem[]): MediaSessionGroup[] {
  const groups: Map<string, MediaSessionGroup> = new Map();

  for (const item of items) {
    const d = new Date(item.timestamp);
    const dayKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const key = `${item.appid}-${dayKey}`;

    let g = groups.get(key);
    if (!g) {
      const formattedDate = d.toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      g = {
        sessionKey: key,
        sessionTitle: `${item.appName} — ${formattedDate}`,
        date: item.timestamp,
        appid: item.appid,
        appName: item.appName,
        items: [],
      };
      groups.set(key, g);
    }
    g.items.push(item);
  }

  // Sort groups by newest session first, and within each group newest items first
  const result = Array.from(groups.values()).sort((a, b) => b.date - a.date);
  for (const g of result) {
    g.items.sort((a, b) => b.timestamp - a.timestamp);
  }
  return result;
}

/** Format duration in mm:ss or hh:mm:ss */
export function formatMediaDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Generate realistic initial sample media items for the user's library apps */
export function generateInitialMedia(apps: LibraryApp[]): MediaItem[] {
  const media: MediaItem[] = [];
  const now = Date.now();
  const dayMs = 86400000;

  // Prefer apps that are installed or played
  const eligible = apps.filter((a) => a.art.hero || a.art.header);
  const sampleApps = (eligible.length > 0 ? eligible : apps).slice(0, 5);

  sampleApps.forEach((a, idx) => {
    const baseTime = now - (idx * 2 + 1) * dayMs;
    // 1 screenshot
    media.push({
      id: `scr-${a.appid}-1`,
      appid: a.appid,
      appName: a.name,
      type: "screenshot",
      timestamp: baseTime,
      fileSizeBytes: 2_450_000 + idx * 300_000,
      thumbnailUrl: `/api/art/${a.appid}/${a.art.hero ? "hero" : "header"}`,
      mediaUrl: `/api/art/${a.appid}/${a.art.hero ? "hero" : "header"}`,
      caption: `Momento épico em ${a.name}`,
      width: 1920,
      height: 1080,
    });

    // 1 clip
    media.push({
      id: `clip-${a.appid}-1`,
      appid: a.appid,
      appName: a.name,
      type: "clip",
      timestamp: baseTime + 1_800_000,
      durationMs: 35_000 + idx * 12_000,
      fileSizeBytes: 45_000_000 + idx * 8_000_000,
      thumbnailUrl: `/api/art/${a.appid}/${a.art.heroBlur ? "heroBlur" : a.art.hero ? "hero" : "header"}`,
      mediaUrl: `/api/art/${a.appid}/${a.art.hero ? "hero" : "header"}`,
      caption: `Jogada destacada`,
      width: 1920,
      height: 1080,
      timelineEvents: [
        { timeMs: 5000, label: "Início da partida", kind: "marker" },
        { timeMs: 22000, label: "Conquista desbloqueada", kind: "achievement" },
        { timeMs: 31000, label: "Vitória", kind: "kill" },
      ],
    });

    // 1 background recording
    if (idx < 2) {
      media.push({
        id: `rec-${a.appid}-1`,
        appid: a.appid,
        appName: a.name,
        type: "recording",
        timestamp: baseTime - 3_600_000,
        durationMs: 720_000, // 12 min
        fileSizeBytes: 380_000_000,
        thumbnailUrl: `/api/art/${a.appid}/${a.art.hero ? "hero" : "header"}`,
        mediaUrl: `/api/art/${a.appid}/${a.art.hero ? "hero" : "header"}`,
        caption: `Gravação de sessão completa`,
        width: 1920,
        height: 1080,
        timelineEvents: [
          { timeMs: 120_000, label: "Fase 1", kind: "marker" },
          { timeMs: 450_000, label: "Conquista obtida", kind: "achievement" },
        ],
      });
    }
  });

  return media.sort((a, b) => b.timestamp - a.timestamp);
}
