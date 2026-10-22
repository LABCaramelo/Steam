// Mirrors server/steamData.ts (kept separate so the browser bundle never imports node modules).

export type ArtKind = "capsule" | "hero" | "heroBlur" | "logo" | "header" | "icon";

export interface DownloadInfo {
  state: "downloading" | "paused" | "queued" | "update_required";
  bytesDownloaded: number;
  bytesToDownload: number;
}

export interface ToolFeature {
  title: string;
  text: string;
}

/** What the store page tells about a tool before it is acquired. */
export interface ToolStoreInfo {
  /** Short line under the name (store rows and capsules). */
  tagline: string;
  eyebrow: string;
  /** Poster headline; "\n" breaks the line. */
  headline: string;
  features: ToolFeature[];
  steps: string[];
  about: [label: string, value: string][];
  /** Where the user's data lives, shown next to the acquire button. */
  dataNote: string;
  category: string;
}

export interface ToolMetadata {
  /** Same slug as public.lab_tools / public.user_tools. */
  slug: string;
  /** Whether new acquisitions are open in the store. */
  available: boolean;
  launchPath: string;
  publicPage: string;
  description: string;
  assets: Partial<Record<ArtKind, string>>;
  store: ToolStoreInfo;
  /** Visível exclusivamente para administradores do LAB */
  adminOnly?: boolean;
  /** Estágio de disponibilidade: 'beta' | 'stable' */
  stage?: "beta" | "stable";
  price_cents?: number;
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
  tool?: ToolMetadata;
}

export interface UserCollection {
  id: string;
  name: string;
  appids: number[];
  dynamic: boolean;
}

export interface LibrarySnapshot {
  steamPath: string | null;
  user: {
    personaName: string;
    steamId64?: string;
    accountId?: string;
    hasAvatar: boolean;
    avatarUrl?: string | null;
    bio?: string | null;
  } | null;
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

export type MediaType = "clip" | "screenshot" | "recording";

export interface TimelineEvent {
  timeMs: number;
  label: string;
  kind: "achievement" | "marker" | "kill";
}

export interface MediaItem {
  id: string;
  appid: number;
  appName: string;
  type: MediaType;
  timestamp: number;
  durationMs?: number;
  fileSizeBytes: number;
  thumbnailUrl?: string;
  mediaUrl?: string;
  caption?: string;
  width?: number;
  height?: number;
  timelineEvents?: TimelineEvent[];
}

export type MediaListSource = { type: "recents" } | { type: "app"; gameid: number };

export interface MediaFilter {
  mediaType: "all" | MediaType;
  listSource: MediaListSource;
  query?: string;
}

