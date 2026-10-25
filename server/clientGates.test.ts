import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

type Element = { type: unknown; props: Record<string, any> };
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
};
const flush = () => new Promise<void>((r) => setImmediate(r));
const person = { id: "alice", email: "alice@example.test", user_metadata: { role: "admin", nickname: "Alice" } };
const session = () => ({ access_token: `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`, user: person, expires_at: Math.floor(Date.now() / 1000) + 3600 });

/** Run the real effects with deterministic SDK responses, including out-of-order responses. */
function clientFixture(path: string) {
  const states: any[] = [];
  const refs: any[] = [];
  const effects: Array<() => void | (() => void)> = [];
  let stateCursor = 0, refCursor = 0, initialized = false;
  let authEvent: (event: string, value: any) => void = () => {};
  let releaseEvent: (notice: any) => void = () => {};
  let cached: any = null;
  let userResult: any = { data: { user: person }, error: null };
  let profileResult: any = { data: { id: "alice", nickname: "Alice", role: "member", access_status: "active" }, error: null };
  let owned = false;
  let activeUser: string | null = null;
  let profileReads = 0;
  let signOutCalls = 0;
  const sdk = {
    auth: {
      getSession: async () => ({ data: { session: cached }, error: null }),
      getUser: async () => await userResult,
      onAuthStateChange: (callback: typeof authEvent) => { authEvent = callback; return { data: { subscription: { unsubscribe() {} } } }; },
      signOut: async () => { ++signOutCalls; cached = null; authEvent("SIGNED_OUT", null); return { error: null }; },
    },
    rpc: async (name: string) => ({ data: name === "has_tool" ? owned : false, error: null }),
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => { ++profileReads; return Promise.resolve(profileResult); } }) }) }),
  };
  const react = {
    createContext: () => ({ Provider: "provider" }),
    useContext() {},
    useCallback: (fn: unknown) => fn,
    useRef: (initial: any) => { const index = refCursor++; return refs[index] ??= { current: initial }; },
    useState: (initial: any) => {
      const index = stateCursor++;
      if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
      return [states[index], (next: any) => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
    },
    useEffect: (effect: () => void | (() => void)) => { if (!initialized) effects.push(effect); },
  };
  const browser = Object.assign(new EventTarget(), { setTimeout, clearTimeout, setInterval, clearInterval });
  const doc = Object.assign(new EventTarget(), { visibilityState: "visible", title: "" });
  const descriptors = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window: browser, document: doc })) {
    descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  const sourcePath = new URL(path, import.meta.url);
  const source = fs.readFileSync(fs.existsSync(sourcePath) ? sourcePath : new URL(`${path}.txt`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: Record<string, any> = {};
  const require = (name: string) => {
    if (name === "react") return react;
    if (name === "react/jsx-runtime") return { jsx: (type: unknown, props: unknown) => ({ type, props }), jsxs: (type: unknown, props: unknown) => ({ type, props }) };
    if (name === "react-dom" || name === "@caramelo/design-system") return {};
    if (name.endsWith("supabase")) return { supabase: sdk };
    if (name.endsWith("labAccess")) return { activateLabUser: (id: string | null) => { activeUser = id; } };
    if (name.endsWith("toolLifecycle")) return { subscribeToolReleases: (fn: typeof releaseEvent) => { releaseEvent = fn; return () => {}; } };
    throw new Error(`Unexpected client dependency: ${name}`);
  };
  new Function("exports", "require", output)(exports, require);
  let cleanups: Array<() => void> = [];
  return {
    render(name: string, props: unknown): Element {
      stateCursor = 0; refCursor = 0;
      const result = exports[name](props);
      if (!initialized) { initialized = true; cleanups = effects.map((fn) => fn()).filter((fn): fn is () => void => typeof fn === "function"); }
      return result;
    },
    setSession(value: any) { cached = value; },
    setUserResult(value: any) { userResult = value; },
    setProfileResult(value: any) { profileResult = value; },
    setOwned(value: boolean) { owned = value; },
    emitAuth(event: string, value: any) { cached = value; authEvent(event, value); },
    release() { releaseEvent({ userId: "alice", slug: "kanban", appid: 2 }); },
    profileReads: () => profileReads,
    signOutCalls: () => signOutCalls,
    activeUser: () => activeUser,
    cleanup() {
      cleanups.forEach((fn) => fn());
      for (const [key, descriptor] of descriptors) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

const toolProps = { tool: { slug: "kanban", appid: 2, name: "Kanban" }, children: "private editor" };

test("a forged cached session never opens a tool or loads its profile", async () => {
  const client = clientFixture("../src/tools/shared/kit.tsx");
  try {
    client.setSession(session());
    client.setOwned(true);
    client.setUserResult({ data: { user: null }, error: { message: "invalid JWT" } });
    client.render("ToolGate", toolProps);
    await flush();
    const gate = client.render("ToolGate", toolProps);
    assert.equal(gate.props.text, "Entre no LAB para usar esta ferramenta.");
    assert.equal(client.profileReads(), 0);
  } finally { client.cleanup(); }
});

test("a verified nonowner is blocked; editable user metadata never grants administrator", async () => {
  const client = clientFixture("../src/tools/shared/kit.tsx");
  try {
    client.setSession(session());
    client.render("ToolGate", toolProps);
    await flush();
    assert.match(client.render("ToolGate", toolProps).props.text, /ainda não está/);
    client.setOwned(true);
    client.emitAuth("TOKEN_REFRESHED", session());
    await new Promise((r) => setTimeout(r, 5));
    await flush();
    const ready = client.render("ToolGate", toolProps);
    assert.equal(ready.props.user.id, "alice");
    assert.equal(ready.props.user.role, "member");
    client.release();
    assert.match(client.render("ToolGate", toolProps).props.text, /ainda não está/);
  } finally { client.cleanup(); }
});

test("a late successful token verification cannot reopen a tool after logout", async () => {
  const client = clientFixture("../src/tools/shared/kit.tsx");
  const delayed = deferred<any>();
  try {
    client.setSession(session());
    client.setOwned(true);
    client.setUserResult(delayed.promise);
    client.render("ToolGate", toolProps);
    await flush();
    client.emitAuth("SIGNED_OUT", null);
    delayed.resolve({ data: { user: person }, error: null });
    await flush();
    assert.equal(client.render("ToolGate", toolProps).props.text, "Entre no LAB para usar esta ferramenta.");
  } finally { client.cleanup(); }
});

test("anonymous Supabase sign-ins cannot use LAB tools", async () => {
  const client = clientFixture("../src/tools/shared/kit.tsx");
  try {
    client.setSession(session());
    client.setOwned(true);
    client.setUserResult({ data: { user: { ...person, is_anonymous: true } }, error: null });
    client.render("ToolGate", toolProps);
    await flush();
    assert.equal(client.render("ToolGate", toolProps).props.text, "Entre no LAB para usar esta ferramenta.");
  } finally { client.cleanup(); }
});

test("AuthProvider rejects cached identity until Auth verifies it and ignores a profile arriving after logout", async () => {
  const client = clientFixture("../src/auth.tsx");
  const delayedProfile = deferred<any>();
  try {
    client.setSession(session());
    client.setProfileResult(delayedProfile.promise);
    assert.equal(client.render("AuthProvider", { children: "LAB" }).props.value.isAuthenticated, false);
    await flush();
    client.emitAuth("SIGNED_OUT", null);
    delayedProfile.resolve({ data: { id: "alice", role: "admin" }, error: null });
    await flush();
    const state = client.render("AuthProvider", { children: "LAB" }).props.value;
    assert.equal(state.isAuthenticated, false);
    assert.equal(state.user, null);
    assert.equal(state.profile, null);
  } finally { client.cleanup(); }
});

test("AuthProvider accepts server-verified users and clears them immediately when a replacement token is rejected", async () => {
  const client = clientFixture("../src/auth.tsx");
  try {
    client.setSession(session());
    client.render("AuthProvider", { children: "LAB" });
    await flush();
    assert.equal(client.render("AuthProvider", { children: "LAB" }).props.value.isAuthenticated, true);
    client.setUserResult({ data: { user: null }, error: { message: "revoked token" } });
    client.emitAuth("TOKEN_REFRESHED", { ...session(), access_token: "unverified.replacement.token" });
    assert.equal(client.render("AuthProvider", { children: "LAB" }).props.value.isAuthenticated, false);
    await new Promise((r) => setTimeout(r, 5));
    const state = client.render("AuthProvider", { children: "LAB" }).props.value;
    assert.equal(state.isAuthenticated, false);
    assert.equal(state.isLoading, false);
  } finally { client.cleanup(); }
});

test("the external Claquete mounts its editor only for a verified owner, then unmounts on logout", async () => {
  const client = clientFixture("../security/claquete/files/src/LabGate.tsx");
  try {
    client.setSession(session());
    client.setOwned(true);
    const props = { children: "private editor" };
    assert.notEqual(client.render("LabGate", props).props.children, "private editor");
    await flush();
    assert.equal(client.render("LabGate", props).props.children, "private editor");
    assert.equal(client.activeUser(), "alice");
    client.emitAuth("SIGNED_OUT", null);
    assert.notEqual(client.render("LabGate", props).props.children, "private editor");
    assert.equal(client.activeUser(), null);
  } finally { client.cleanup(); }
});

test("blocked legacy storage does not prevent the real Supabase logout", async () => {
  const client = clientFixture("../src/auth.tsx");
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("storage blocked"); } });
  try {
    client.setSession(session());
    client.render("AuthProvider", { children: "LAB" });
    await flush();
    await client.render("AuthProvider", { children: "LAB" }).props.value.logout();
    assert.equal(client.signOutCalls(), 1);
    assert.equal(client.render("AuthProvider", { children: "LAB" }).props.value.isAuthenticated, false);
  } finally {
    if (oldStorage) Object.defineProperty(globalThis, "localStorage", oldStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
    client.cleanup();
  }
});

test("the external Claquete rejects anonymous Auth users even when has_tool would return true", async () => {
  const client = clientFixture("../security/claquete/files/src/LabGate.tsx");
  try {
    client.setSession(session());
    client.setOwned(true);
    client.setUserResult({ data: { user: { ...person, is_anonymous: true } }, error: null });
    const props = { children: "private editor" };
    client.render("LabGate", props);
    await flush();
    assert.notEqual(client.render("LabGate", props).props.children, "private editor");
    assert.equal(client.activeUser(), null);
  } finally { client.cleanup(); }
});
