import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
import { buildPromptDocument, isPromptRequest } from "../src/tools/prompt-library/bridge.ts";

type Rendered = { type: string; props: Record<string, any> };
interface FetchCall { path: string; options: RequestInit }
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((finish) => { resolve = finish; });
  return { promise, resolve };
};
const origin = "https://lab.example.test";
const request = (id: string, slug: string | null = null) => ({ type: "lab:prompts:request", id, slug });

/** Exercise the real component's effect and iframe boundary with deterministic SDK/fetch responses. */
function bridgeFixture() {
  const user = { id: "verified-owner" };
  const credential = "server-verified-owner-token";
  let sessionResult: any = { data: { session: { user, access_token: credential } }, error: null };
  let responseFactory: (call: FetchCall) => Response | Promise<Response> = () => Response.json({ items: [] });
  const calls: FetchCall[] = [];
  const sent: Array<{ message: any; target: string }> = [];
  const selections: URL[] = [];
  const frameWindow = { postMessage(message: any, target: string) { sent.push({ message, target }); } };
  const location = { href: `${origin}/tools/prompt-library/index.html?embed=1&prompt=motion-frame`, origin };
  const activeTimers = new Set<ReturnType<typeof setTimeout>>();
  const browser = Object.assign(new EventTarget(), { location,
    setTimeout(callback: () => void, delay: number) { const timer = setTimeout(() => { activeTimers.delete(timer); callback(); }, delay); activeTimers.add(timer); return timer; },
    clearTimeout(timer: ReturnType<typeof setTimeout>) { clearTimeout(timer); activeTimers.delete(timer); },
    history: { replaceState(_state: unknown, _title: string, url: URL) { selections.push(url); location.href = url.href; } },
  });
  const descriptors = new Map<string, PropertyDescriptor | undefined>();
  const replacements = {
    window: browser,
    fetch: async (path: string, options: RequestInit) => {
      const call = { path, options };
      calls.push(call);
      return new Promise<Response>((resolve, reject) => {
        options.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
        Promise.resolve(responseFactory(call)).then(resolve, reject);
      });
    },
  };
  for (const [key, value] of Object.entries(replacements)) {
    descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  const values: any[] = [], refs: any[] = [];
  let stateIndex = 0, refIndex = 0, initialized = false;
  const effects: Array<() => () => void> = [];
  let cleanupEffects: Array<() => void> = [];
  const source = fs.readFileSync(new URL("../src/tools/prompt-library/PromptLibraryApp.tsx", import.meta.url), "utf8");
  const presentation = fs.readFileSync(new URL("../src/tools/prompt-library/document.html", import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {} as { PromptLibraryApp: () => Rendered };
  const require = (name: string) => {
    if (name === "react") return {
      useState: (initial: any) => { const index = stateIndex++; if (!(index in values)) values[index] = initial; return [values[index], (next: any) => { values[index] = next; }]; },
      useRef: (initial: any) => { const index = refIndex++; return refs[index] ??= { current: initial }; },
      useMemo: (factory: () => unknown) => factory(),
      useEffect: (effect: () => () => void) => { if (!initialized) effects.push(effect); },
    };
    if (name === "react/jsx-runtime") return { jsx: (type: string, props: unknown) => ({ type, props }), jsxs: (type: string, props: unknown) => ({ type, props }) };
    if (name === "../../supabase") return { supabase: { auth: { getSession: async () => await sessionResult } } };
    if (name === "../shared/kit") return { useToolUser: () => user };
    if (name === "./bridge") return { buildPromptDocument, isPromptRequest };
    if (name === "./document.html?raw") return { default: presentation };
    throw new Error(`Unexpected bridge dependency: ${name}`);
  };
  new Function("exports", "require", output)(exports, require);
  const render = () => {
    stateIndex = 0; refIndex = 0;
    const result = exports.PromptLibraryApp();
    // React attaches refs before passive effects, and clears them when the iframe is removed.
    if (result.type === "iframe") result.props.ref.current = { contentWindow: frameWindow };
    else if (refs[0]) refs[0].current = null;
    if (!initialized) { initialized = true; cleanupEffects = effects.map((effect) => effect()); }
    return result;
  };
  return {
    credential, calls, sent, selections, render,
    emit(data: unknown, options: { origin?: string; source?: unknown } = {}) {
      browser.dispatchEvent(Object.assign(new Event("message"), { data, origin: options.origin ?? origin, source: options.source ?? frameWindow }));
    },
    setSessionResult(value: any) { sessionResult = value; },
    respond(factory: typeof responseFactory) { responseFactory = factory; },
    cleanup() {
      cleanupEffects.forEach((cleanup) => cleanup()); cleanupEffects = [];
      for (const timer of activeTimers) clearTimeout(timer);
      activeTimers.clear();
      for (const [key, descriptor] of descriptors) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

test("an authorized prompt iframe receives ready and catalog/text responses without receiving credentials", async () => {
  const bridge = bridgeFixture();
  try {
    bridge.respond(({ path }) => Response.json(path.includes("slug=") ? { prompt: "Private prompt text" } : { items: [{ slug: "motion-frame", title: "Motion Frame" }] }));
    const frame = bridge.render();
    assert.equal(frame.type, "iframe");
    assert.match(frame.props.srcDoc, /name="lab-account" content="verified-owner"/);
    assert.match(frame.props.srcDoc, /<base href="https:\/\/lab\.example\.test\/tools\/prompt-library\/">/);
    assert.equal(frame.props.srcDoc.includes(bridge.credential), false);
    frame.props.onLoad();
    assert.deepEqual(bridge.sent.shift(), { message: { type: "lab:prompts:ready" }, target: origin });
    bridge.emit(request("catalog"));
    bridge.emit(request("copy", "motion-frame"));
    await flush();
    assert.deepEqual(bridge.calls.map((call) => call.path), ["/api/prompt-library", "/api/prompt-library?slug=motion-frame"]);
    for (const call of bridge.calls) {
      assert.equal(new Headers(call.options.headers).get("Authorization"), `Bearer ${bridge.credential}`);
      assert.equal(call.options.cache, "no-store");
    }
    assert.deepEqual(bridge.sent, [
      { message: { type: "lab:prompts:response", id: "catalog", status: 200, body: { items: [{ slug: "motion-frame", title: "Motion Frame" }] } }, target: origin },
      { message: { type: "lab:prompts:response", id: "copy", status: 200, body: { prompt: "Private prompt text" } }, target: origin },
    ]);
    assert.equal(JSON.stringify(bridge.sent).includes(bridge.credential), false);
  } finally { bridge.cleanup(); }
});

test("foreign origins, sibling frames and malicious slugs cannot ask the prompt bridge to fetch", async () => {
  const bridge = bridgeFixture();
  try {
    bridge.render();
    bridge.emit(request("foreign"), { origin: "https://attacker.example" });
    bridge.emit(request("sibling"), { source: {} });
    for (const slug of ["../../api/upload", "https://attacker.example/steal", "x?access_token=steal", "<script>", "a".repeat(121)]) bridge.emit(request("bad-slug", slug));
    bridge.emit({ ...request("bad-url"), type: "fetch", url: "https://attacker.example" });
    bridge.emit(request("<invalid-id>"));
    await flush();
    assert.equal(bridge.calls.length, 0);
    assert.equal(bridge.sent.length, 0);
  } finally { bridge.cleanup(); }
});

for (const status of [401, 403]) test(`HTTP ${status} removes the prompt iframe instead of forwarding protected content`, async () => {
  const bridge = bridgeFixture();
  try {
    bridge.respond(() => Response.json({ error: "access denied" }, { status }));
    bridge.render();
    bridge.emit(request("denied", "motion-frame"));
    await flush();
    assert.equal(bridge.render().type, "main");
    assert.equal(bridge.sent.length, 0);
  } finally { bridge.cleanup(); }
});

test("a missing or changed session blocks the prompt frame without contacting the API", async () => {
  for (const sessionResult of [
    { data: { session: null }, error: null },
    { data: { session: { access_token: "other-user-token", user: { id: "another-user" } } }, error: null },
  ]) {
    const bridge = bridgeFixture();
    try {
      bridge.setSessionResult(sessionResult);
      bridge.render(); bridge.emit(request("changed"));
      await flush();
      assert.equal(bridge.render().type, "main");
      assert.equal(bridge.calls.length, 0);
    } finally { bridge.cleanup(); }
  }
});

test("unmount aborts pending fetches and discards late prompt responses", async () => {
  const bridge = bridgeFixture();
  const delayed = deferred<Response>();
  try {
    bridge.respond(() => delayed.promise);
    bridge.render(); bridge.emit(request("late"));
    await flush();
    assert.equal(bridge.calls.length, 1);
    const signal = bridge.calls[0].options.signal;
    bridge.cleanup();
    assert.equal(signal?.aborted, true);
    delayed.resolve(Response.json({ prompt: "Never deliver after logout" }));
    await flush();
    assert.equal(bridge.sent.length, 0);
  } finally { bridge.cleanup(); }
});

test("the prompt bridge accepts selection updates only from its own frame with a valid slug", () => {
  const bridge = bridgeFixture();
  try {
    bridge.render();
    bridge.emit({ type: "lab:prompts:select", slug: "../escape" });
    bridge.emit({ type: "lab:prompts:select", slug: "other" }, { origin: "https://attacker.example" });
    assert.equal(bridge.selections.length, 0);
    bridge.emit({ type: "lab:prompts:select", slug: "motion-frame" });
    assert.equal(bridge.selections[0].searchParams.get("prompt"), "motion-frame");
    assert.equal(bridge.selections[0].origin, origin);
    assert.equal(bridge.selections[0].searchParams.get("embed"), "1");
    bridge.emit({ type: "lab:prompts:select", slug: null });
    assert.equal(bridge.selections[1].searchParams.has("prompt"), false);
  } finally { bridge.cleanup(); }
});

test("duplicate requests share no extra credential fetch and the bridge caps concurrent operations", async () => {
  const bridge = bridgeFixture();
  const delayed = deferred<Response>();
  try {
    bridge.respond(() => delayed.promise);
    bridge.render();
    bridge.emit(request("same")); bridge.emit(request("same"));
    for (let index = 0; index < 20; index++) bridge.emit(request(`parallel-${index}`));
    await flush();
    assert.equal(bridge.calls.length, 12);
    bridge.cleanup();
    await flush();
  } finally { bridge.cleanup(); }
});
