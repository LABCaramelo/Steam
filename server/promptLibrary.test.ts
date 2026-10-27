import assert from "node:assert/strict";
import test from "node:test";
import catalog from "../api/data/prompt-catalog.json" with { type: "json" };
import { promptLibrary } from "./promptLibrary.ts";

type MockResponse = { status?: number; body?: unknown } | Error;
const TOKEN = "test-verified-user-token";
const USER_ID = "00000000-0000-4000-8000-000000000001";

async function call(url: string, responses: MockResponse[] = [], method = "GET", token: string | null = TOKEN, owns = true) {
  const original = globalThis.fetch;
  const calls: { url: string; options: RequestInit | undefined }[] = [];
  const pending: MockResponse[] = token ? [{ body: { id: USER_ID } }, { body: owns }, ...responses] : responses;
  globalThis.fetch = async (input, options) => {
    calls.push({ url: String(input), options });
    const response = pending.shift();
    assert.ok(response, "unexpected upstream request");
    if (response instanceof Error) throw response;
    return new Response(JSON.stringify(response.body), { status: response.status ?? 200 });
  };
  const headers: Record<string, string> = {};
  let body: unknown;
  const res = {
    statusCode: 200,
    setHeader(name: string, value: string) { headers[name] = value; },
    end(value: string) { body = JSON.parse(value); },
  };
  try {
    await promptLibrary({ url, method, headers: token ? { authorization: `Bearer ${token}` } : {} }, res);
    return { status: res.statusCode, body, headers, calls };
  } finally {
    globalThis.fetch = original;
  }
}

test("prompt catalog requires a verified session and ownership and is never cached publicly", async () => {
  const result = await call("/api/prompt-library");
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, catalog);
  assert.ok(catalog.items.length > 0);
  assert.equal(result.calls.length, 2);
  assert.equal(result.headers["Cache-Control"], "private, no-store");
  assert.equal(result.headers.Vary, "Authorization");
});

test("unknown or malformed slugs never reach the upstream service", async () => {
  const unknown = await call("/api/prompt-library?slug=unknown-unpublished-fixture");
  assert.equal(unknown.status, 404);
  assert.equal(unknown.calls.length, 2);
  for (const slug of ["", "../private", "prompt&select=*"]) {
    const result = await call(`/api/prompt-library?slug=${encodeURIComponent(slug)}`);
    assert.equal(result.status, 400);
    assert.equal(result.calls.length, 2);
  }
});

test("mutation methods are rejected before fetching prompt data", async () => {
  const result = await call("/api/prompt-library", [], "DELETE");
  assert.equal(result.status, 405);
  assert.equal(result.headers.Allow, "GET");
  assert.equal(result.calls.length, 0);
});

test("copy returns only prompt fields and uses the verified caller JWT in the canonical RPC", async () => {
  const slug = catalog.items[0].slug;
  const result = await call(`/api/prompt-library?slug=${slug}`, [{
    body: { success: true, slug, title: "Example", prompt: "Original prompt", internal: "private-value" },
  }]);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { slug, title: "Example", prompt: "Original prompt" });
  assert.match(result.calls[2].url, /\/rest\/v1\/rpc\/get_caramelo_prompt_copy$/);
  assert.equal(result.calls[2].options?.method, "POST");
  assert.equal(new Headers(result.calls[2].options?.headers).get("Authorization"), `Bearer ${TOKEN}`);
  assert.equal(result.headers["Cache-Control"], "private, no-store");
});

test("deleted or empty prompts are not cached", async () => {
  const slug = catalog.items[0].slug;
  for (const response of [{ status: 404 }, { body: { success: true, prompt: " " } }]) {
    const result = await call(`/api/prompt-library?slug=${slug}`, [response]);
    assert.equal(result.status, 404);
    assert.equal(result.headers["Cache-Control"], "private, no-store");
  }
});

test("upstream failures return a retryable error without leaking details", async () => {
  const slug = catalog.items[0].slug;
  const result = await call(`/api/prompt-library?slug=${slug}`, [new Error("private-value")]);
  assert.equal(result.status, 502);
  assert.equal(result.headers["Cache-Control"], "private, no-store");
  assert.doesNotMatch(JSON.stringify(result.body), /private-value/);
});

test("anonymous and non-owning callers cannot read catalog or texts and never call the copy upstream", async () => {
  for (const url of ["/api/prompt-library", `/api/prompt-library?slug=${catalog.items[0].slug}`]) {
    const anonymous = await call(url, [], "GET", null);
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.calls.length, 0);
    const nonOwner = await call(url, [], "GET", TOKEN, false);
    assert.equal(nonOwner.status, 403);
    assert.equal(nonOwner.calls.length, 2);
    assert.ok(nonOwner.calls.every((c) => !c.url.includes("get_caramelo_prompt_copy")));
  }
});


test("prompt catalog places Movimentos de Câmera at the very end of the items list", () => {
  const camIndices = catalog.items
    .map((item, idx) => ({ category: item.category, idx }))
    .filter((entry) => entry.category === "Movimentos de Câmera")
    .map((entry) => entry.idx);

  assert.ok(camIndices.length > 0, "should have camera movement items");
  const firstCamIndex = camIndices[0];
  const lastCamIndex = camIndices[camIndices.length - 1];

  // All camera movements must be contiguous at the end of the catalog
  assert.equal(lastCamIndex, catalog.items.length - 1);
  assert.equal(firstCamIndex, catalog.items.length - camIndices.length);
});

test("PromptLibraryControls.compare orders Web essentials ahead of niches, motion and camera", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const filePath = path.resolve("public/tools/prompt-library/assets/js/prompt-library-controls.js");
  const code = fs.readFileSync(filePath, "utf8");
  const fn = new Function("module", "exports", "globalThis", code);
  const m = { exports: {} as Record<string, any> };
  fn(m, m.exports, globalThis);
  const { compare, getPriorityTier } = m.exports;

  const landing = { id: "lp-01", title: "Landing Page Alpha", category: "Landing Pages", created_at: "2026-10-20T00:00:00Z", verified_count: 0 };
  const hero = { id: "hero-01", title: "Hero Bold", category: "Hero Sections", created_at: "2026-10-20T00:00:00Z", verified_count: 0 };
  const ui = { id: "ui-01", title: "Navbar Minimal", category: "Componentes UI", created_at: "2026-10-20T00:00:00Z", verified_count: 0 };
  const saas = { id: "saas-01", title: "Dashboard Pro", category: "SaaS", created_at: "2026-10-25T00:00:00Z", verified_count: 0 };
  const motion = { id: "cui-01", title: "Liquid Shaders", category: "Design & Criativo", type: "motion", created_at: "2026-10-26T00:00:00Z", verified_count: 0 };
  const camera = { id: "cam-01", title: "Plano Estático", category: "Movimentos de Câmera", created_at: "2026-08-02T00:00:00Z", verified_count: 0 };

  // Tier checks (1 to 4)
  assert.equal(getPriorityTier(landing), 1);
  assert.equal(getPriorityTier(hero), 1);
  assert.equal(getPriorityTier(ui), 1);
  assert.equal(getPriorityTier(saas), 2);
  assert.equal(getPriorityTier(motion), 3);
  assert.equal(getPriorityTier(camera), 4);

  // Across modes, Tier 1 > Tier 2 > Tier 3 > Tier 4
  for (const order of ["popular", "recent", "title"]) {
    assert.ok(compare(landing, saas, order) < 0, `Landing Pages should come before SaaS in ${order}`);
    assert.ok(compare(hero, saas, order) < 0, `Hero Sections should come before SaaS in ${order}`);
    assert.ok(compare(ui, saas, order) < 0, `Componentes UI should come before SaaS in ${order}`);
    assert.ok(compare(saas, motion, order) < 0, `SaaS should come before Motion in ${order}`);
    assert.ok(compare(motion, camera, order) < 0, `Motion should come before Camera in ${order}`);
  }
});
