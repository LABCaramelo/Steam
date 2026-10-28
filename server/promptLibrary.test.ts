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


test("prompt catalog has no Movimentos de Câmera or camera-typed items", () => {
  const camItems = catalog.items.filter(
    (item) => item.category === "Movimentos de Câmera" || item.type === "camera" || item.id.startsWith("cam-")
  );
  assert.equal(camItems.length, 0, "Movimentos de Câmera must be completely removed");
});

test("PromptLibraryControls.compare orders Web prompts ahead of motion", async () => {
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
  const design = { id: "oda-01", title: "Oda Nobunaga Hero", category: "Design & Criativo", type: "hero", created_at: "2026-10-28T00:00:00Z", verified_count: 0 };
  const ai = { id: "nova-01", title: "Nova Agent Hero", category: "AI & Tech", type: "hero", created_at: "2026-10-28T00:00:00Z", verified_count: 0 };
  const saas = { id: "saas-01", title: "Dashboard Pro", category: "SaaS", created_at: "2026-10-25T00:00:00Z", verified_count: 0 };
  const motion = { id: "cui-01", title: "Liquid Shaders", category: "Design & Criativo", type: "motion", created_at: "2026-10-26T00:00:00Z", verified_count: 0 };

  // All web prompts are Tier 1; Motion is Tier 2
  assert.equal(getPriorityTier(landing), 1);
  assert.equal(getPriorityTier(hero), 1);
  assert.equal(getPriorityTier(ui), 1);
  assert.equal(getPriorityTier(design), 1);
  assert.equal(getPriorityTier(ai), 1);
  assert.equal(getPriorityTier(saas), 1);
  assert.equal(getPriorityTier(motion), 2);

  // Across modes, Tier 1 > Tier 2
  for (const order of ["popular", "recent", "title"]) {
    assert.ok(compare(landing, motion, order) < 0, `Landing Pages should come before Motion in ${order}`);
    assert.ok(compare(design, motion, order) < 0, `Design & Criativo should come before Motion in ${order}`);
    assert.ok(compare(ai, motion, order) < 0, `AI & Tech should come before Motion in ${order}`);
    assert.ok(compare(saas, motion, order) < 0, `SaaS should come before Motion in ${order}`);
  }

  // Inside Tier 1, recency order respects creation date
  assert.ok(compare(design, landing, "recent") < 0, "Newer prompt (Oda) should come before older prompt in recent order");
  assert.ok(compare(ai, landing, "recent") < 0, "Newer prompt (Nova) should come before older prompt in recent order");
});
