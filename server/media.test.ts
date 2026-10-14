import test from "node:test";
import assert from "node:assert/strict";
import { filterMedia, formatMediaDuration, groupMediaBySession } from "../src/media.ts";
import type { MediaItem } from "../src/types.ts";

const MOCK_ITEMS: MediaItem[] = [
  {
    id: "scr-1",
    appid: 400,
    appName: "Portal",
    type: "screenshot",
    timestamp: 1700000000000,
    fileSizeBytes: 2000000,
    caption: "Cheamber 08",
  },
  {
    id: "clip-1",
    appid: 400,
    appName: "Portal",
    type: "clip",
    timestamp: 1700000500000,
    durationMs: 45000,
    fileSizeBytes: 40000000,
    caption: "Fling trick",
  },
  {
    id: "rec-1",
    appid: 730,
    appName: "Counter-Strike 2",
    type: "recording",
    timestamp: 1700100000000,
    durationMs: 600000,
    fileSizeBytes: 500000000,
    caption: "Full match",
  },
  {
    id: "scr-2",
    appid: 730,
    appName: "Counter-Strike 2",
    type: "screenshot",
    timestamp: 1700100500000,
    fileSizeBytes: 3000000,
    caption: "Scoreboard",
  },
];

test("filterMedia filters by mediaType correctly", () => {
  const screenshots = filterMedia(MOCK_ITEMS, { mediaType: "screenshot", listSource: { type: "recents" } });
  assert.equal(screenshots.length, 2);
  assert.ok(screenshots.every((i) => i.type === "screenshot"));

  const clips = filterMedia(MOCK_ITEMS, { mediaType: "clip", listSource: { type: "recents" } });
  assert.equal(clips.length, 1);
  assert.equal(clips[0].id, "clip-1");

  const all = filterMedia(MOCK_ITEMS, { mediaType: "all", listSource: { type: "recents" } });
  assert.equal(all.length, 4);
});

test("filterMedia filters by app accurately", () => {
  const portalItems = filterMedia(MOCK_ITEMS, { mediaType: "all", listSource: { type: "app", gameid: 400 } });
  assert.equal(portalItems.length, 2);
  assert.ok(portalItems.every((i) => i.appid === 400));

  const csItems = filterMedia(MOCK_ITEMS, { mediaType: "all", listSource: { type: "app", gameid: 730 } });
  assert.equal(csItems.length, 2);
  assert.ok(csItems.every((i) => i.appid === 730));
});

test("filterMedia search query matches app name and caption", () => {
  const queryPortal = filterMedia(MOCK_ITEMS, { mediaType: "all", listSource: { type: "recents" }, query: "portal" });
  assert.equal(queryPortal.length, 2);

  const queryFling = filterMedia(MOCK_ITEMS, { mediaType: "all", listSource: { type: "recents" }, query: "fling" });
  assert.equal(queryFling.length, 1);
  assert.equal(queryFling[0].id, "clip-1");

  const queryNonExistent = filterMedia(MOCK_ITEMS, { mediaType: "all", listSource: { type: "recents" }, query: "nonexistent" });
  assert.equal(queryNonExistent.length, 0);
});

test("groupMediaBySession clusters by app and date", () => {
  const groups = groupMediaBySession(MOCK_ITEMS);
  assert.equal(groups.length, 2);
  const portalGroup = groups.find((g) => g.appid === 400);
  assert.ok(portalGroup);
  assert.equal(portalGroup.items.length, 2);

  const csGroup = groups.find((g) => g.appid === 730);
  assert.ok(csGroup);
  assert.equal(csGroup.items.length, 2);
});

test("formatMediaDuration formats seconds, minutes and hours correctly", () => {
  assert.equal(formatMediaDuration(5000), "0:05");
  assert.equal(formatMediaDuration(65000), "1:05");
  assert.equal(formatMediaDuration(3665000), "1:01:05");
});
