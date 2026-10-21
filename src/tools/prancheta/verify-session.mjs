// Persistence regression checks. Run: node src/tools/prancheta/verify-session.mjs
// Executes the real session/repository TypeScript with controlled IO; never contacts a database.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.dirname(fileURLToPath(import.meta.url));
const modulePath = (file) => path.join(root, file);
const modules = new Map();
const listeners = new Set();
const timers = new Map();
let timerId = 0;
const store = { state: { doc: null }, subscribe(callback) { listeners.add(callback); return () => listeners.delete(callback); } };
const events = { addEventListener() {}, removeEventListener() {}, hidden: false };
const queryLog = [];
let response = { data: null, error: null };
const query = new Proxy({}, { get(_target, method) {
  return (...args) => {
    queryLog.push([method, ...args]);
    return ["single", "maybeSingle"].includes(method) ? Promise.resolve(response) : query;
  };
} });
const mocks = new Map([
  [modulePath("editor/store/store.ts"), { store }],
  [modulePath("editor/io/persist.ts"), { compactDocument: (document) => structuredClone(document) }],
  [path.resolve(root, "../../supabase.ts"), { supabase: query }],
]);

function load(file) {
  if (mocks.has(file)) return mocks.get(file);
  if (modules.has(file)) return modules.get(file).exports;
  const source = fs.readFileSync(file, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  modules.set(file, module);
  const require = (name) => {
    assert.ok(name.startsWith("."), `Unexpected runtime import: ${name}`);
    const resolved = path.resolve(path.dirname(file), name);
    return load(path.extname(resolved) ? resolved : `${resolved}.ts`);
  };
  const run = new Function("exports", "module", "require", "window", "document", "setTimeout", "clearTimeout", output);
  run(module.exports, module, require, events, events,
    (callback) => { timers.set(++timerId, callback); return timerId; },
    (id) => timers.delete(id));
  return module.exports;
}

const { PranchetaSession } = load(modulePath("session.ts"));
const { createSupabasePranchetaRepo, PranchetaConflictError, documentPayload } = load(modulePath("repo.ts"));
const doc = (name) => ({ version: 1, name, pages: [{ id: "page", name: "Página 1", children: [], background: null }], nodes: {}, images: {} });
const file = (name = "Original") => ({ id: "file-one", name, document: doc(name), size_bytes: 100, created_at: "v0", updated_at: "v0" });
const tick = () => new Promise((resolve) => setImmediate(resolve));

{
  const writes = [];
  const pending = [];
  const repo = { saveFile(id, document, expected) {
    writes.push({ id, document, expected });
    return new Promise((resolve) => pending.push(() => resolve({ ...file(document.name), updated_at: `v${writes.length}` })));
  } };
  const session = new PranchetaSession(repo, file());
  store.state.doc = doc("Original");
  assert.equal(await session.save(), true);
  assert.equal(writes.length, 0, "An unchanged document does not write");
  store.state.doc.name = "First";
  const first = session.save();
  store.state.doc.name = "Second";
  const second = session.save();
  assert.equal(writes.length, 1, "Only one write can be in flight");
  assert.equal(writes[0].document.name, "First", "An in-flight payload is immutable");
  pending.shift()();
  await tick();
  assert.equal(writes.length, 2);
  assert.equal(writes[1].expected, "v1", "Next write uses the server revision returned by its predecessor");
  assert.equal(writes[1].document.name, "Second");
  pending.shift()();
  assert.equal(await first, true);
  assert.equal(await second, true);
  assert.equal(session.state.kind, "saved");
  assert.equal(session.dirty, false);
  session.dispose();
  console.log("PASS immutable snapshots and ordered overlapping writes");
}

{
  let fail = true;
  const session = new PranchetaSession({ async saveFile() {
    if (fail) throw new Error("offline");
    return { ...file("New"), updated_at: "v1" };
  } }, file());
  store.state.doc = doc("New");
  assert.equal(await session.save(), false);
  assert.equal(session.state.kind, "error");
  assert.equal(session.dirty, true, "Failed writes cannot be reported as saved");
  fail = false;
  assert.equal(await session.save(), true);
  assert.equal(session.dirty, false);
  session.dispose();
  console.log("PASS failure retains edits and retry acknowledges only successful save");
}

{
  const session = new PranchetaSession({ async saveFile() { throw new PranchetaConflictError(); } }, file());
  store.state.doc = doc("Unsaved work");
  session.start();
  assert.equal(await session.save(), false);
  assert.equal(session.state.kind, "conflict");
  store.state.doc.name = "Preserved work";
  for (const notify of listeners) notify();
  assert.equal(timers.size, 0, "A conflict stops background writes instead of overwriting another tab");
  session.dispose();
  assert.equal(listeners.size, 0);
  assert.equal(await session.save(), false, "A disposed owner session cannot write");
  console.log("PASS conflict preserves local work and stops stale session writes");
}

{
  const repo = createSupabasePranchetaRepo("owner-user");
  response = { data: { ...file(), document: doc("Original") }, error: null };
  await repo.createFile(doc("Original"));
  assert.equal(queryLog.find(([method]) => method === "insert")[1].user_id, "owner-user");
  queryLog.length = 0;
  await repo.saveFile("file-one", doc("Updated"), "expected-revision");
  assert.ok(queryLog.some(([method, column, value]) => method === "eq" && column === "user_id" && value === "owner-user"));
  assert.ok(queryLog.some(([method, column, value]) => method === "eq" && column === "updated_at" && value === "expected-revision"));
  response = { data: null, error: null };
  await assert.rejects(repo.saveFile("file-one", doc("Updated"), "stale-revision"), PranchetaConflictError);
  await assert.rejects(repo.deleteFile("file-one", "stale-revision"), PranchetaConflictError);
  assert.throws(() => documentPayload(doc(" ")), /nome/);
  assert.throws(() => documentPayload(doc("a".repeat(201))), /nome/);
  console.log("PASS explicit owner filters, optimistic conflicts and document name limits");
}
