// Reads the local Steam installation and builds the library model served to the UI.
// Sources (all read-only): libraryfolders.vdf, appmanifest_*.acf, appcache/appinfo.vdf,
// userdata/<id>/config/localconfig.vdf, userdata/<id>/config/librarycache/*.json,
// config/loginusers.vdf and appcache/librarycache/<appid>/ (art).

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { parseVdf, child, str, num, type VdfObject } from "./vdf.ts";
import { parseAppInfo, type BinKv } from "./appinfo.ts";

export type ArtKind = "capsule" | "hero" | "heroBlur" | "logo" | "header" | "icon";

export interface DownloadInfo {
  state: "downloading" | "paused" | "queued" | "update_required";
  bytesDownloaded: number;
  bytesToDownload: number;
}

export interface LibraryApp {
  appid: number;
  name: string;
  type: string;
  installed: boolean;
  sizeOnDisk: number;
  installdir?: string;
  libraryPath?: string;
  buildid?: string;
  lastUpdated?: number;
  lastPlayed: number;
  playtimeMinutes: number;
  art: Record<ArtKind, boolean>;
  achievements?: { total: number; achieved: number };
  releaseDate?: number;
  developer?: string;
  publisher?: string;
  reviewPercentage?: number;
  metacritic?: number;
  download?: DownloadInfo;
}

export interface SteamUser {
  personaName: string;
  steamId64?: string;
  accountId?: string;
  hasAvatar: boolean;
}

export interface UserCollection {
  id: string;
  name: string;
  appids: number[];
  dynamic: boolean;
}

export interface LibrarySnapshot {
  steamPath: string | null;
  user: SteamUser | null;
  apps: LibraryApp[];
  collections: UserCollection[];
  libraryFolders: { path: string; label: string; totalSize: number; freeBytes?: number }[];
  source: "local" | "demo";
  generatedAt: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  achieved: boolean;
  unlocked?: number;
  image?: string;
  globalPercent?: number;
  hidden: boolean;
  progress?: { current: number; max: number };
}

const STEAMID64_BASE = 76561197960265728n;
const HIDDEN_TYPES = new Set(["tool", "config", "dlc", "music", "video", "series", "episode", "hardware"]);

// Steam EAppState flags (subset)
const STATE_UPDATE_REQUIRED = 2;
const STATE_FULLY_INSTALLED = 4;
const STATE_UPDATE_RUNNING = 256;
const STATE_UPDATE_PAUSED = 512;
const STATE_UPDATE_STARTED = 1024;
const STATE_DOWNLOADING = 1048576;

export function findSteamPath(): string | null {
  const candidates: string[] = [];
  if (process.env.STEAM_PATH) candidates.push(process.env.STEAM_PATH);
  if (process.platform === "win32") {
    try {
      const out = execFileSync("reg", ["query", "HKCU\\Software\\Valve\\Steam", "/v", "SteamPath"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const m = out.match(/SteamPath\s+REG_SZ\s+(.+)/);
      if (m) candidates.push(m[1].trim());
    } catch {
      // registry key absent: fall through to default locations
    }
    candidates.push("C:\\Program Files (x86)\\Steam", "D:\\Steam");
  } else {
    const home = process.env.HOME ?? "";
    candidates.push(path.join(home, ".steam/steam"), path.join(home, ".local/share/Steam"));
  }
  for (const c of candidates) {
    const p = path.normalize(c);
    if (fs.existsSync(path.join(p, "steamapps")) && fs.existsSync(path.join(p, "appcache"))) return p;
  }
  return null;
}

function readVdf(file: string): VdfObject | undefined {
  try {
    return parseVdf(fs.readFileSync(file, "utf8"));
  } catch {
    return undefined;
  }
}

function kvStr(o: BinKv | undefined, key: string): string | undefined {
  const v = o?.[key];
  if (v === undefined || typeof v === "object") return undefined;
  return String(v);
}
function kvObj(o: BinKv | undefined, key: string): BinKv | undefined {
  const v = o?.[key];
  return v && typeof v === "object" ? (v as BinKv) : undefined;
}

function readUser(steamPath: string): SteamUser | null {
  const users = readVdf(path.join(steamPath, "config", "loginusers.vdf"));
  const root = child(users, "users");
  if (!root) return null;
  const ids = Object.keys(root);
  const id = ids.find((k) => str(child(root, k), "MostRecent") === "1") ?? ids[0];
  if (!id) return null;
  const u = child(root, id);
  const accountId = (BigInt(id) - STEAMID64_BASE).toString();
  return {
    personaName: str(u, "PersonaName") ?? "Jogador",
    steamId64: id,
    accountId,
    hasAvatar: fs.existsSync(path.join(steamPath, "config", "avatarcache", `${id}.png`)),
  };
}

function findUserdataDir(steamPath: string, user: SteamUser | null): string | null {
  const base = path.join(steamPath, "userdata");
  if (user?.accountId && fs.existsSync(path.join(base, user.accountId))) return path.join(base, user.accountId);
  try {
    const dirs = fs.readdirSync(base).filter((d) => /^\d+$/.test(d));
    return dirs.length ? path.join(base, dirs[0]) : null;
  } catch {
    return null;
  }
}

/** Recursively lists files under librarycache/<appid> (newer clients nest art in hash folders). */
function listArtFiles(steamPath: string, appid: number): string[] {
  const root = path.join(steamPath, "appcache", "librarycache", String(appid));
  const out: string[] = [];
  const walk = (dir: string, depth: number) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && depth < 3) walk(full, depth + 1);
      else if (e.isFile()) out.push(full);
    }
  };
  walk(root, 0);
  return out;
}

const ART_NAMES: Record<Exclude<ArtKind, "icon">, string[]> = {
  capsule: ["library_600x900_brazilian.jpg", "library_600x900.jpg", "library_capsule.jpg"],
  hero: ["library_hero_brazilian.jpg", "library_hero.jpg"],
  heroBlur: ["library_hero_blur.jpg"],
  logo: ["logo_brazilian.png", "logo.png"],
  header: ["header_brazilian.jpg", "header.jpg", "library_header_brazilian.jpg", "library_header.jpg"],
};

export function resolveArt(steamPath: string, appid: number, kind: ArtKind): string | null {
  const files = listArtFiles(steamPath, appid);
  if (kind === "icon") return files.find((f) => /^[0-9a-f]{40}\.(jpg|png|ico)$/i.test(path.basename(f))) ?? null;
  for (const name of ART_NAMES[kind]) {
    const hit = files.find((f) => path.basename(f).toLowerCase() === name);
    if (hit) return hit;
  }
  return null;
}

function readLibraryCacheJson(userdata: string | null, appid: number): unknown[] | null {
  if (!userdata) return null;
  try {
    const raw = fs.readFileSync(path.join(userdata, "config", "librarycache", `${appid}.json`), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

interface RawAchievements {
  vecHighlight?: RawAch[];
  vecUnachieved?: RawAch[];
  vecAchievedHidden?: RawAch[];
  nTotal?: number;
  nAchieved?: number;
}
interface RawAch {
  strID: string;
  strName: string;
  strDescription: string;
  bAchieved: boolean;
  rtUnlocked?: number;
  strImage?: string;
  bHidden?: boolean;
  flAchieved?: number;
  flCurrentProgress?: number;
  flMaxProgress?: number;
}

function rawAchievements(userdata: string | null, appid: number): RawAchievements | null {
  const entries = readLibraryCacheJson(userdata, appid);
  const hit = entries?.find((e) => Array.isArray(e) && e[0] === "achievements") as [string, { data?: RawAchievements }] | undefined;
  return hit?.[1]?.data ?? null;
}

function toAchievement(a: RawAch): Achievement {
  return {
    id: a.strID,
    name: a.strName,
    description: a.strDescription,
    achieved: !!a.bAchieved,
    unlocked: a.rtUnlocked || undefined,
    image: a.strImage,
    globalPercent: a.flAchieved,
    hidden: !!a.bHidden,
    progress: a.flMaxProgress ? { current: a.flCurrentProgress ?? 0, max: a.flMaxProgress } : undefined,
  };
}

export function readAchievements(steamPath: string, appid: number): { total: number; achieved: number; list: Achievement[] } | null {
  const user = readUser(steamPath);
  const raw = rawAchievements(findUserdataDir(steamPath, user), appid);
  if (!raw) return null;
  const list = [...(raw.vecHighlight ?? []), ...(raw.vecAchievedHidden ?? []), ...(raw.vecUnachieved ?? [])].map(toAchievement);
  return { total: raw.nTotal ?? list.length, achieved: raw.nAchieved ?? list.filter((a) => a.achieved).length, list };
}

/** Collections live in the client's cloud-storage namespace 1 as "user-collections.<id>" entries. */
function readCollections(userdata: string | null): UserCollection[] {
  if (!userdata) return [];
  let entries: unknown;
  try {
    entries = JSON.parse(fs.readFileSync(path.join(userdata, "config", "cloudstorage", "cloud-storage-namespace-1.json"), "utf8"));
  } catch {
    return [];
  }
  if (!Array.isArray(entries)) return [];
  const out: UserCollection[] = [];
  for (const e of entries) {
    if (!Array.isArray(e) || typeof e[0] !== "string" || !e[0].startsWith("user-collections.")) continue;
    const rec = e[1] as { is_deleted?: boolean; value?: string };
    if (rec?.is_deleted || !rec?.value) continue;
    try {
      const v = JSON.parse(rec.value) as { id: string; name: string; added?: number[]; filterSpec?: unknown };
      out.push({ id: v.id, name: v.name, appids: v.added ?? [], dynamic: !!v.filterSpec });
    } catch {
      // skip malformed entry
    }
  }
  return out;
}

function downloadState(manifest: VdfObject | undefined): DownloadInfo | undefined {
  const flags = num(manifest, "StateFlags");
  const toDl = num(manifest, "BytesToDownload");
  const done = num(manifest, "BytesDownloaded");
  if (flags & STATE_DOWNLOADING || flags & STATE_UPDATE_RUNNING) return { state: "downloading", bytesDownloaded: done, bytesToDownload: toDl };
  if (flags & STATE_UPDATE_PAUSED) return { state: "paused", bytesDownloaded: done, bytesToDownload: toDl };
  if (flags & STATE_UPDATE_STARTED) return { state: "queued", bytesDownloaded: done, bytesToDownload: toDl };
  if (flags & STATE_UPDATE_REQUIRED) return { state: "update_required", bytesDownloaded: done, bytesToDownload: toDl };
  return undefined;
}

function freeBytes(dir: string): number | undefined {
  try {
    const s = fs.statfsSync(dir);
    return Number(s.bavail) * Number(s.bsize);
  } catch {
    return undefined;
  }
}

export function buildSnapshot(steamPath: string | null): LibrarySnapshot {
  if (!steamPath) return demoSnapshot();

  const user = readUser(steamPath);
  const userdata = findUserdataDir(steamPath, user);

  // 1. Library folders and installed manifests
  const lf = child(readVdf(path.join(steamPath, "steamapps", "libraryfolders.vdf")), "libraryfolders");
  const folders: LibrarySnapshot["libraryFolders"] = [];
  const manifests = new Map<number, { m: VdfObject; lib: string }>();
  const libPaths = lf ? Object.values(lf).filter((v): v is VdfObject => typeof v === "object").map((v) => str(v, "path") ?? "") : [steamPath];
  for (const lib of libPaths.length ? libPaths : [steamPath]) {
    const entry = lf ? Object.values(lf).find((v) => typeof v === "object" && str(v as VdfObject, "path") === lib) : undefined;
    folders.push({ path: lib, label: str(entry as VdfObject, "label") ?? "", totalSize: num(entry as VdfObject, "totalsize"), freeBytes: freeBytes(lib) });
    const dir = path.join(lib, "steamapps");
    let files: string[] = [];
    try {
      files = fs.readdirSync(dir).filter((f) => /^appmanifest_\d+\.acf$/.test(f));
    } catch {
      continue;
    }
    for (const f of files) {
      const m = child(readVdf(path.join(dir, f)), "AppState");
      if (m) manifests.set(num(m, "appid"), { m, lib });
    }
  }

  // 2. Per-user playtime
  const lc = readVdf(userdata ? path.join(userdata, "config", "localconfig.vdf") : "");
  const appsCfg = child(child(child(child(child(lc, "UserLocalConfigStore"), "Software"), "Valve"), "Steam"), "apps");

  // 3. Metadata from appinfo.vdf
  const info = new Map<number, BinKv>();
  try {
    for (const e of parseAppInfo(fs.readFileSync(path.join(steamPath, "appcache", "appinfo.vdf")))) info.set(e.appid, e.data);
  } catch {
    // appinfo unreadable: names fall back to manifests
  }

  // 4. Candidate app ids
  const ids = new Set<number>(manifests.keys());
  if (appsCfg) for (const k of Object.keys(appsCfg)) if (/^\d+$/.test(k)) ids.add(Number(k));
  try {
    for (const d of fs.readdirSync(path.join(steamPath, "appcache", "librarycache"))) if (/^\d+$/.test(d)) ids.add(Number(d));
  } catch {
    // no art cache
  }
  if (userdata) {
    try {
      for (const f of fs.readdirSync(path.join(userdata, "config", "librarycache"))) {
        const m = f.match(/^(\d+)\.json$/);
        if (m) ids.add(Number(m[1]));
      }
    } catch {
      // no per-user cache
    }
  }

  const apps: LibraryApp[] = [];
  for (const appid of ids) {
    if (appid === 7 || appid === 0) continue; // 7 = Steam client itself
    const man = manifests.get(appid);
    const meta = info.get(appid);
    const common = kvObj(meta, "common");
    const extended = kvObj(meta, "extended");
    const cfg = child(appsCfg, String(appid));
    const type = (kvStr(common, "type") ?? "game").toLowerCase();
    const name = kvStr(common, "name") ?? str(man?.m, "name");
    const artFiles = listArtFiles(steamPath, appid).map((f) => path.basename(f).toLowerCase());
    const art: Record<ArtKind, boolean> = {
      capsule: ART_NAMES.capsule.some((n) => artFiles.includes(n)),
      hero: ART_NAMES.hero.some((n) => artFiles.includes(n)),
      heroBlur: ART_NAMES.heroBlur.some((n) => artFiles.includes(n)),
      logo: ART_NAMES.logo.some((n) => artFiles.includes(n)),
      header: ART_NAMES.header.some((n) => artFiles.includes(n)),
      icon: artFiles.some((n) => /^[0-9a-f]{40}\.(jpg|png|ico)$/.test(n)),
    };
    const installed = !!man && (num(man.m, "StateFlags") & STATE_FULLY_INSTALLED) !== 0;
    if (HIDDEN_TYPES.has(type)) continue; // tools such as Steamworks Redistributables stay out of the game list
    if (!name && !art.capsule && !art.header) continue; // nothing to show
    const ach = rawAchievements(userdata, appid);
    const assoc = kvObj(common, "associations");
    const assocName = (t: string) =>
      kvStr(
        Object.values(assoc ?? {})
          .filter((a): a is BinKv => typeof a === "object")
          .find((a) => kvStr(a, "type") === t),
        "name",
      );
    const release = Number(kvStr(common, "steam_release_date") ?? kvStr(common, "original_release_date") ?? 0);
    apps.push({
      appid,
      name: name ?? `App ${appid}`,
      type,
      installed,
      sizeOnDisk: num(man?.m, "SizeOnDisk"),
      installdir: str(man?.m, "installdir"),
      libraryPath: man?.lib,
      buildid: str(man?.m, "buildid"),
      lastUpdated: num(man?.m, "lastupdated") || undefined,
      lastPlayed: Math.max(num(cfg, "LastPlayed"), num(man?.m, "LastPlayed")),
      playtimeMinutes: num(cfg, "Playtime"),
      art,
      achievements: ach && (ach.nTotal ?? 0) > 0 ? { total: ach.nTotal ?? 0, achieved: ach.nAchieved ?? 0 } : undefined,
      releaseDate: release || undefined,
      developer: kvStr(extended, "developer") ?? assocName("developer"),
      publisher: kvStr(extended, "publisher") ?? assocName("publisher"),
      reviewPercentage: Number(kvStr(common, "review_percentage")) || undefined,
      metacritic: Number(kvStr(common, "metacritic_score")) || undefined,
      download: man ? downloadState(man.m) : undefined,
    });
  }

  apps.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  return { steamPath, user, apps, collections: readCollections(userdata), libraryFolders: folders, source: "local", generatedAt: Date.now() };
}

/** Used when no Steam installation is found, so the UI still renders. */
export function demoSnapshot(): LibrarySnapshot {
  const now = Math.floor(Date.now() / 1000);
  const mk = (appid: number, name: string, installed: boolean, hours: number, daysAgo: number): LibraryApp => ({
    appid,
    name,
    type: "game",
    installed,
    sizeOnDisk: installed ? 12_000_000_000 : 0,
    lastPlayed: daysAgo >= 0 ? now - daysAgo * 86400 : 0,
    playtimeMinutes: hours * 60,
    art: { capsule: false, hero: false, heroBlur: false, logo: false, header: false, icon: false },
  });
  return {
    steamPath: null,
    user: { personaName: "Jogador", hasAvatar: false },
    apps: [
      mk(1, "Aventura Espacial", true, 42, 1),
      mk(2, "Corrida Noturna", false, 7, 20),
      mk(3, "Fazenda Tranquila", true, 120, 3),
      mk(4, "Masmorra Infinita", false, 0, -1),
    ],
    collections: [{ id: "favorite", name: "Favoritos", appids: [1, 3], dynamic: false }],
    libraryFolders: [],
    source: "demo",
    generatedAt: Date.now(),
  };
}
