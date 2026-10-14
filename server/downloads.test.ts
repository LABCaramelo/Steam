import assert from "node:assert/strict";
import test from "node:test";
import { createDownloadSession, downloadReducer, selectDownloads } from "../src/downloads.ts";
import type { LibraryApp } from "../src/types.ts";

function app(appid: number, extra: Partial<LibraryApp> = {}): LibraryApp {
  return { appid, name: `Game ${appid}`, type: "game", installed: false, sizeOnDisk: 0, lastPlayed: 0, playtimeMinutes: 0,
    art: { capsule: false, hero: false, heroBlur: false, logo: false, header: false, icon: false }, ...extra };
}

test("pause preserves progress across ticks and resume continues from it", () => {
  let session = downloadReducer(createDownloadSession(), { type: "start", appid: 10 });
  session = downloadReducer(session, { type: "tick", now: 1000, increment: 0.4 });
  session = downloadReducer(session, { type: "pause", appid: 10 });
  const paused = session;
  session = downloadReducer(session, { type: "tick", now: 5000, increment: 0.4 });
  assert.equal(session, paused);
  assert.deepEqual(session.runs[10], { kind: "installing", progress: 0.4, paused: true });
  session = downloadReducer(session, { type: "resume", appid: 10 });
  session = downloadReducer(session, { type: "tick", now: 5500, increment: 0.2 });
  const run = session.runs[10];
  assert.equal(run.kind, "installing");
  if (run.kind === "installing") assert.ok(Math.abs(run.progress - 0.6) < 0.00001);
});

test("cancel active or paused download removes progress and allows a new install", () => {
  for (const paused of [false, true]) {
    let session = downloadReducer(createDownloadSession(), { type: "start", appid: 10 });
    session = downloadReducer(session, { type: "tick", now: 1000, increment: 0.4 });
    if (paused) session = downloadReducer(session, { type: "pause", appid: 10 });
    session = downloadReducer(session, { type: "cancel", appid: 10 });
    session = downloadReducer(session, { type: "tick", now: 2000, increment: 1 });
    assert.deepEqual(session.runs[10], { kind: "idle" });
    assert.deepEqual(session.completedInstalls, {});
    session = downloadReducer(session, { type: "start", appid: 10 });
    assert.deepEqual(session.runs[10], { kind: "installing", progress: 0, paused: false });
  }
});

test("completion is recorded once and survives launch, stop and clearing history", () => {
  let session = downloadReducer(createDownloadSession(), { type: "start", appid: 10 });
  session = downloadReducer(session, { type: "tick", now: 2000, increment: 1.5 });
  assert.deepEqual(session.runs[10], { kind: "installed" });
  assert.equal(session.completedInstalls[10], 2000);
  session = downloadReducer(session, { type: "tick", now: 2500 });
  assert.equal(session.completedInstalls[10], 2000);
  session = downloadReducer(session, { type: "setRun", appid: 10, run: { kind: "launching", since: 2500 } });
  session = downloadReducer(session, { type: "start", appid: 20 });
  session = downloadReducer(session, { type: "tick", now: 4200 });
  assert.deepEqual(session.runs[10], { kind: "running", since: 4200 });
  assert.equal(selectDownloads([app(10)], session.runs, session.completedInstalls).completed.length, 1);
  session = downloadReducer(session, { type: "clearCompleted" });
  assert.deepEqual(session.completedInstalls, {});
  assert.equal(session.installedAppIds[10], true);
  session = downloadReducer(session, { type: "setRun", appid: 10, run: { kind: "idle" } });
  assert.equal(session.installedAppIds[10], true);
  assert.equal(downloadReducer(session, { type: "start", appid: 10 }), session);
});

test("global pause/resume only changes local downloads and repeated start keeps progress", () => {
  let session = downloadReducer(createDownloadSession(), { type: "start", appid: 10 });
  session = downloadReducer(session, { type: "start", appid: 20 });
  session = downloadReducer(session, { type: "setRun", appid: 30, run: { kind: "running", since: 0 } });
  session = downloadReducer(session, { type: "tick", now: 1000, increment: 0.3 });
  assert.equal(downloadReducer(session, { type: "start", appid: 10 }), session);
  session = downloadReducer(session, { type: "pauseAll" });
  assert.equal(selectDownloads([app(10), app(20)], session.runs, session.completedInstalls).transferring.length, 0);
  assert.deepEqual(session.runs[30], { kind: "running", since: 0 });
  session = downloadReducer(session, { type: "resumeAll" });
  assert.equal(selectDownloads([app(10), app(20)], session.runs, session.completedInstalls).transferring.length, 2);
});

test("selectors distinguish Steam queue/paused state and never duplicate apps", () => {
  const apps = [
    app(1, { download: { state: "queued", bytesDownloaded: 0, bytesToDownload: 100 } }),
    app(2, { download: { state: "paused", bytesDownloaded: 30, bytesToDownload: 100 } }),
    app(3, { download: { state: "downloading", bytesDownloaded: 150, bytesToDownload: 100 } }),
    app(4, { download: { state: "update_required", bytesDownloaded: 0, bytesToDownload: 0 } }),
    app(5, { installed: true, lastUpdated: 200 }),
  ];
  const original = structuredClone(apps);
  const selected = selectDownloads([...apps, apps[0]], { 1: { kind: "installing", progress: 0.4, paused: true } }, { 5: 300000 });
  assert.deepEqual(selected.active.map((entry) => entry.app.appid), [1, 2, 3]);
  assert.deepEqual(selected.queued.map((entry) => entry.app.appid), [4]);
  assert.deepEqual(selected.transferring.map((entry) => entry.app.appid), [3]);
  assert.equal(selected.active[0].source, "simulation");
  assert.equal(selected.active[2].progress, 1);
  assert.equal(selected.completed.length, 1);
  assert.equal(selected.completed[0].source, "simulation");
  assert.deepEqual(apps, original);
});
