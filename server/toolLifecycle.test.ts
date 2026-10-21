import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import ts from "typescript";
import { clearToolLocalData, publishToolRelease, subscribeToolReleases, toolAttachmentDatabaseName, toolStorageKey } from "../src/toolLifecycle.ts";

function memoryStorage(): Storage {
  const values: Record<string, string> = Object.create(null);
  Object.defineProperties(values, {
    getItem: { value: (key: string) => values[key] ?? null },
    setItem: { value: (key: string, value: string) => { values[key] = String(value); } },
    removeItem: { value: (key: string) => { delete values[key]; } },
    clear: { value: () => { for (const key of Object.keys(values)) delete values[key]; } },
    key: { value: (index: number) => Object.keys(values)[index] ?? null },
    length: { get: () => Object.keys(values).length },
  });
  return values as unknown as Storage;
}

function browserFixture() {
  const local = memoryStorage();
  const session = memoryStorage();
  const browser = Object.assign(new EventTarget(), { localStorage: local, sessionStorage: session });
  const databases: string[] = [];
  const channels = new Set<FakeBroadcastChannel>();
  class FakeBroadcastChannel extends EventTarget {
    readonly name: string;
    constructor(name: string) { super(); this.name = name; channels.add(this); }
    postMessage(data: unknown) {
      for (const channel of channels) if (channel !== this && channel.name === this.name) channel.dispatchEvent(new MessageEvent("message", { data }));
    }
    close() { channels.delete(this); }
  }
  const replacements = {
    window: browser,
    localStorage: local,
    sessionStorage: session,
    BroadcastChannel: FakeBroadcastChannel,
    indexedDB: { deleteDatabase(name: string) {
      databases.push(name);
      const request = { onsuccess: null as (() => void) | null };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    } },
  };
  const descriptors = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries(replacements)) {
    descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  return { local, session, browser, databases, restore() {
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  } };
}

test("release cleanup preserves other accounts, other tools, and unowned legacy caches", async () => {
  const browser = browserFixture();
  try {
    const owned = toolStorageKey("alice", "comunidade");
    const otherAccount = toolStorageKey("alice:other", "comunidade");
    const otherTool = toolStorageKey("alice", "academy", "notes");
    const keep = [otherAccount, otherTool, "discord-clone:v1", "caramelo-library-saved", "steam-recriada:collections", "caramelo-theme", "sb-project-auth-token"];
    for (const key of [owned, ...keep]) browser.local.setItem(key, "keep");
    browser.session.setItem(toolStorageKey("alice", "comunidade", "draft"), "draft");
    await clearToolLocalData({ userId: "alice", slug: "comunidade", appid: 7 });
    assert.equal(browser.local.getItem(owned), null);
    assert.equal(browser.session.length, 0);
    for (const key of keep) assert.equal(browser.local.getItem(key), "keep", key);
    assert.deepEqual(browser.databases, [toolAttachmentDatabaseName("alice")]);
  } finally { browser.restore(); }
});

test("Kanban cleanup removes only the exact account selection", async () => {
  const browser = browserFixture();
  try {
    browser.local.setItem("lab:kanban:board:alice", "one");
    browser.local.setItem("lab:kanban:board:bruno", "two");
    await clearToolLocalData({ userId: "alice", slug: "kanban", appid: 2 });
    assert.equal(browser.local.getItem("lab:kanban:board:alice"), null);
    assert.equal(browser.local.getItem("lab:kanban:board:bruno"), "two");
    assert.deepEqual(browser.databases, []);
  } finally { browser.restore(); }
});

test("release signals deliver once across local, broadcast and storage transports", () => {
  const browser = browserFixture();
  const received: unknown[] = [];
  const unsubscribe = subscribeToolReleases((notice) => received.push(notice));
  try {
    const notice = { userId: "alice", slug: "kanban", appid: 2 };
    publishToolRelease(notice);
    assert.deepEqual(received, [notice]);
    const signal = browser.local.getItem("lab:tool-release:signal");
    const storageEvent = Object.assign(new Event("storage"), { key: "lab:tool-release:signal", newValue: signal });
    browser.browser.dispatchEvent(storageEvent);
    assert.equal(received.length, 1, "A duplicate transport must not repeat destructive cleanup");
    browser.browser.dispatchEvent(Object.assign(new Event("storage"), { key: "lab:tool-release:signal", newValue: '{"id":"bad","notice":{"userId":"alice","slug":"../bad","appid":2}}' }));
    assert.equal(received.length, 1);
    unsubscribe();
    publishToolRelease(notice);
    assert.equal(received.length, 1);
  } finally { unsubscribe(); browser.restore(); }
});

test("storage restrictions do not reject cleanup after a committed server release", async () => {
  const browser = browserFixture();
  try {
    Object.defineProperty(browser.browser, "localStorage", { get() { throw new Error("blocked"); } });
    Object.defineProperty(browser.browser, "sessionStorage", { get() { throw new Error("blocked"); } });
    await assert.doesNotReject(clearToolLocalData({ userId: "alice", slug: "academy", appid: 5 }));
  } finally { browser.restore(); }
});

test("an IndexedDB deletion blocked by another tab does not strand the server release", async () => {
  const browser = browserFixture();
  try {
    Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: {
      deleteDatabase() {
        const request = { onblocked: null as (() => void) | null };
        queueMicrotask(() => request.onblocked?.());
        return request;
      },
    } });
    await assert.doesNotReject(clearToolLocalData({ userId: "alice", slug: "comunidade", appid: 7 }));
  } finally { browser.restore(); }
});

test("attachment decoding captured by an old account cannot write to the next account", async () => {
  const browser = browserFixture();
  try {
    const source = fs.readFileSync(new URL("../src/tools/comunidade/attachments.ts", import.meta.url), "utf8");
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const module = { exports: {} as {
      activateAttachmentOwner: (userId: string) => () => void;
      captureAttachmentSession: () => { load: (id: string) => Promise<Blob | undefined>; save: (id: string, blob: Blob) => Promise<void> };
      loadBlob: (id: string) => Promise<Blob | undefined>;
    } };
    const require = (name: string) => {
      if (name === "react") return { useEffect() {}, useState() {} };
      if (name === "../../toolLifecycle") return { subscribeToolReleases, toolAttachmentDatabaseName };
      throw new Error(`Unexpected runtime dependency: ${name}`);
    };
    new Function("exports", "require", output)(module.exports, require);
    const files = module.exports;
    const closeAlice = files.activateAttachmentOwner("alice");
    const aliceDecoding = files.captureAttachmentSession();
    await aliceDecoding.save("alice-file", new Blob(["private"]));
    assert.equal(await (await files.loadBlob("alice-file"))?.text(), "private");
    const closeBruno = files.activateAttachmentOwner("bruno");
    closeAlice();
    await aliceDecoding.save("late-file", new Blob(["old decoding finished late"]));
    assert.equal(await files.loadBlob("alice-file"), undefined);
    assert.equal(await files.loadBlob("late-file"), undefined);
    const bruno = files.captureAttachmentSession();
    await bruno.save("bruno-file", new Blob(["current"]));
    assert.equal(await (await files.loadBlob("bruno-file"))?.text(), "current");
    publishToolRelease({ userId: "bruno", slug: "comunidade", appid: 7 });
    await bruno.save("after-release", new Blob(["ignored"]));
    assert.equal(await files.loadBlob("bruno-file"), undefined);
    assert.equal(await files.loadBlob("after-release"), undefined);
    closeBruno();
  } finally { browser.restore(); }
});
