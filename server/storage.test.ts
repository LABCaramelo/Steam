import test from "node:test";
import assert from "node:assert/strict";
import {
  inferDriveType,
  computeStorageDrives,
  filterAndSortDriveApps,
  moveAppsToDrive,
} from "../src/storage.ts";
import type { LibraryApp } from "../src/types.ts";

const MOCK_FOLDERS = [
  { path: "C:\\SteamLibrary", label: "Disco Local (C:)", totalSize: 500_000_000_000, freeBytes: 150_000_000_000 },
  { path: "D:\\SteamLibrary", label: "Jogos (D:)", totalSize: 1_000_000_000_000, freeBytes: 400_000_000_000 },
];

const MOCK_APPS: LibraryApp[] = [
  {
    appid: 730,
    name: "Counter-Strike 2",
    type: "game",
    installed: true,
    sizeOnDisk: 35_000_000_000,
    libraryPath: "C:\\SteamLibrary",
    lastPlayed: 1700000000,
    playtimeMinutes: 500,
    art: { capsule: true, header: true, hero: true, heroBlur: true, icon: true, logo: true },
  },
  {
    appid: 400,
    name: "Portal",
    type: "game",
    installed: true,
    sizeOnDisk: 5_000_000_000,
    libraryPath: "C:\\SteamLibrary",
    lastPlayed: 1690000000,
    playtimeMinutes: 120,
    art: { capsule: true, header: true, hero: true, heroBlur: true, icon: true, logo: true },
  },
  {
    appid: 570,
    name: "Dota 2",
    type: "game",
    installed: true,
    sizeOnDisk: 45_000_000_000,
    libraryPath: "D:\\SteamLibrary",
    lastPlayed: 1710000000,
    playtimeMinutes: 900,
    art: { capsule: true, header: true, hero: true, heroBlur: true, icon: true, logo: true },
  },
];

test("inferDriveType detects fixed, removable and microsd paths", () => {
  assert.equal(inferDriveType("C:\\SteamLibrary"), "fixed");
  assert.equal(inferDriveType("D:\\SteamLibrary"), "fixed");
  assert.equal(inferDriveType("/run/media/deck/microSD"), "microsd");
  assert.equal(inferDriveType("/home/deck/.local/share/Steam"), "internal");
});

test("computeStorageDrives calculates accurate breakdown and percentages", () => {
  const drives = computeStorageDrives(MOCK_FOLDERS, MOCK_APPS, [], "C:\\SteamLibrary");
  assert.equal(drives.length, 2);

  const cDrive = drives[0];
  assert.equal(cDrive.path, "C:\\SteamLibrary");
  assert.equal(cDrive.isDefault, true);
  assert.equal(cDrive.appCount, 2);
  assert.equal(cDrive.freeBytes, 150_000_000_000);
  assert.ok(cDrive.usedSteamBytes > 0);
  assert.ok(cDrive.breakdown.games > 0);
  assert.ok(cDrive.percentages.games > 0);
  assert.ok(cDrive.percentages.free > 0);

  const dDrive = drives[1];
  assert.equal(dDrive.path, "D:\\SteamLibrary");
  assert.equal(dDrive.isDefault, false);
  assert.equal(dDrive.appCount, 1);
});

test("filterAndSortDriveApps filters by drive and query", () => {
  const cApps = filterAndSortDriveApps(MOCK_APPS, "C:\\SteamLibrary", "");
  assert.equal(cApps.length, 2);
  assert.equal(cApps[0].appid, 730); // CS2 is larger than Portal, sorted by size descending by default

  const cFiltered = filterAndSortDriveApps(MOCK_APPS, "C:\\SteamLibrary", "portal");
  assert.equal(cFiltered.length, 1);
  assert.equal(cFiltered[0].appid, 400);

  const dApps = filterAndSortDriveApps(MOCK_APPS, "D:\\SteamLibrary", "");
  assert.equal(dApps.length, 1);
  assert.equal(dApps[0].appid, 570);
});

test("filterAndSortDriveApps supports sorting by name and lastPlayed", () => {
  const byName = filterAndSortDriveApps(MOCK_APPS, "C:\\SteamLibrary", "", "name");
  assert.equal(byName[0].name, "Counter-Strike 2");
  assert.equal(byName[1].name, "Portal");

  const byLastPlayed = filterAndSortDriveApps(MOCK_APPS, "C:\\SteamLibrary", "", "lastPlayed");
  assert.equal(byLastPlayed[0].appid, 730);
  assert.equal(byLastPlayed[1].appid, 400);
});

test("moveAppsToDrive shifts selected games to new library folder", () => {
  const moved = moveAppsToDrive(MOCK_APPS, [400], "D:\\SteamLibrary");
  const portal = moved.find((a) => a.appid === 400);
  assert.ok(portal);
  assert.equal(portal.libraryPath, "D:\\SteamLibrary");

  // Other apps remain unchanged
  const cs2 = moved.find((a) => a.appid === 730);
  assert.ok(cs2);
  assert.equal(cs2.libraryPath, "C:\\SteamLibrary");
});
