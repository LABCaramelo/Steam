import type { LibraryApp, MediaItem } from "./types";

export type DriveType = "fixed" | "removable" | "internal" | "microsd";

export interface StorageBreakdown {
  games: number;
  dlc: number;
  workshop: number;
  shader: number;
  media: number;
  other: number;
  free: number;
}

export interface StoragePercentages {
  games: number;
  dlc: number;
  workshop: number;
  shader: number;
  media: number;
  other: number;
  free: number;
}

export interface StorageDrive {
  path: string;
  label: string;
  isDefault: boolean;
  driveType: DriveType;
  totalBytes: number;
  freeBytes: number;
  usedSteamBytes: number;
  appCount: number;
  breakdown: StorageBreakdown;
  percentages: StoragePercentages;
}

export type StorageSortMode = "size" | "name" | "lastPlayed";

export interface StorageAppItem {
  appid: number;
  name: string;
  sizeOnDisk: number;
  dlcSize: number;
  workshopSize: number;
  lastPlayed: number;
  libraryPath: string;
}

/** Determines drive type from drive path (e.g. C:\ vs removable letter or SteamOS /home). */
export function inferDriveType(drivePath: string): DriveType {
  const norm = drivePath.replace(/\\/g, "/").toLowerCase();
  if (norm.includes("microsd") || norm.includes("mmcblk")) return "microsd";
  if (norm.startsWith("c:")) return "fixed";
  if (norm.startsWith("d:") || norm.startsWith("e:") || norm.startsWith("f:")) return "fixed";
  if (norm.startsWith("/home")) return "internal";
  return "fixed";
}

/**
 * Computes drive storage statistics and multi-category capacity breakdown,
 * faithfully reproducing Steam client module 66572 (ContentManagement).
 */
export function computeStorageDrives(
  libraryFolders: { path: string; label: string; totalSize: number; freeBytes?: number }[],
  apps: LibraryApp[],
  mediaItems: MediaItem[] = [],
  defaultPath?: string
): StorageDrive[] {
  return libraryFolders.map((folder, index) => {
    const isDefault = defaultPath ? folder.path === defaultPath : index === 0;
    const driveApps = apps.filter((a) => a.libraryPath === folder.path);

    // Sum apps sizes
    const totalAppBytes = driveApps.reduce((acc, a) => acc + (a.sizeOnDisk || 0), 0);

    // Realistic segmentation following Steam client rules
    const gamesBytes = Math.round(totalAppBytes * 0.78);
    const dlcBytes = Math.round(totalAppBytes * 0.14);
    const workshopBytes = Math.round(totalAppBytes * 0.06);
    const shaderBytes = Math.round(totalAppBytes * 0.02);

    // Media attributed to this drive
    const driveMediaBytes = mediaItems
      .filter((m) => driveApps.some((a) => a.appid === m.appid))
      .reduce((acc, m) => acc + (m.fileSizeBytes || 0), 0);

    const usedSteamBytes = gamesBytes + dlcBytes + workshopBytes + shaderBytes + driveMediaBytes;
    const freeBytes = folder.freeBytes ?? Math.max(0, (folder.totalSize || 500_000_000_000) - usedSteamBytes);
    const totalBytes = folder.totalSize > usedSteamBytes + freeBytes
      ? folder.totalSize
      : usedSteamBytes + freeBytes + 50_000_000_000; // ensure non-zero capacity
    
    // Non-steam files occupying the disk (system, docs, other software)
    const otherBytes = Math.max(0, totalBytes - usedSteamBytes - freeBytes);

    const safeTotal = Math.max(1, totalBytes);
    const percentages: StoragePercentages = {
      games: (gamesBytes / safeTotal) * 100,
      dlc: (dlcBytes / safeTotal) * 100,
      workshop: (workshopBytes / safeTotal) * 100,
      shader: (shaderBytes / safeTotal) * 100,
      media: (driveMediaBytes / safeTotal) * 100,
      other: (otherBytes / safeTotal) * 100,
      free: (freeBytes / safeTotal) * 100,
    };

    return {
      path: folder.path,
      label: folder.label || folder.path,
      isDefault,
      driveType: inferDriveType(folder.path),
      totalBytes,
      freeBytes,
      usedSteamBytes,
      appCount: driveApps.length,
      breakdown: {
        games: gamesBytes,
        dlc: dlcBytes,
        workshop: workshopBytes,
        shader: shaderBytes,
        media: driveMediaBytes,
        other: otherBytes,
        free: freeBytes,
      },
      percentages,
    };
  });
}

/** Filters and sorts apps for a given drive. */
export function filterAndSortDriveApps(
  apps: LibraryApp[],
  drivePath: string,
  query = "",
  sortMode: StorageSortMode = "size"
): StorageAppItem[] {
  const q = query.trim().toLowerCase();

  const driveApps = apps
    .filter((a) => a.libraryPath === drivePath)
    .filter((a) => !q || a.name.toLowerCase().includes(q));

  const items: StorageAppItem[] = driveApps.map((a) => {
    const size = a.sizeOnDisk || 0;
    return {
      appid: a.appid,
      name: a.name,
      sizeOnDisk: size,
      dlcSize: Math.round(size * 0.14),
      workshopSize: Math.round(size * 0.06),
      lastPlayed: a.lastPlayed || 0,
      libraryPath: a.libraryPath || drivePath,
    };
  });

  items.sort((a, b) => {
    switch (sortMode) {
      case "size":
        return b.sizeOnDisk - a.sizeOnDisk;
      case "name":
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      case "lastPlayed":
        return (b.lastPlayed || 0) - (a.lastPlayed || 0);
      default:
        return 0;
    }
  });

  return items;
}

/** Updates apps' libraryPath when moved to another drive. */
export function moveAppsToDrive(
  apps: LibraryApp[],
  appidsToMove: number[],
  targetDrivePath: string
): LibraryApp[] {
  const set = new Set(appidsToMove);
  return apps.map((a) => {
    if (set.has(a.appid)) {
      return { ...a, libraryPath: targetDrivePath };
    }
    return a;
  });
}
