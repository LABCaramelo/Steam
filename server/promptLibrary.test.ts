import assert from "node:assert/strict";
import test from "node:test";
import catalog from "../api/data/prompt-catalog.json" with { type: "json" };
import { promptLibrary } from "./promptLibrary.ts";

type MockResponse = { status?: number; body?: unknown } | Error;

async function call(url: string, responses: MockResponse[] = [], method = "GET") {
  const original = globalThis.fetch;
  const calls: { url: string; options: RequestInit | undefined }[] = [];
  globalThis.fetch = async (input, options) => {
    calls.push({ url: String(input), options });
    const response = responses.shift();
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
    await promptLibrary({ url, method }, res);
    return { status: res.statusCode, body, headers, calls };
  } finally {
    globalThis.fetch = original;
  }
}

test("prompt catalog is served without credentials or upstream calls", async () => {
  const result = await call("/api/prompt-library");
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, catalog);
  assert.ok(catalog.items.length > 0);
  assert.equal(result.calls.length, 0);
});

test("unknown or malformed slugs never reach the upstream service", async () => {
  const unknown = await call("/api/prompt-library?slug=unknown-unpublished-fixture");
  assert.equal(unknown.status, 404);
  assert.equal(unknown.calls.length, 0);
  for (const slug of ["", "../private", "prompt&select=*"]) {
    const result = await call(`/api/prompt-library?slug=${encodeURIComponent(slug)}`);
    assert.equal(result.status, 400);
    assert.equal(result.calls.length, 0);
  }
});

test("mutation methods are rejected before fetching prompt data", async () => {
  const result = await call("/api/prompt-library", [], "DELETE");
  assert.equal(result.status, 405);
  assert.equal(result.headers.Allow, "GET");
  assert.equal(result.calls.length, 0);
});

test("copy returns only public prompt fields without forwarding credentials", async () => {
  const slug = catalog.items[0].slug;
  const result = await call(`/api/prompt-library?slug=${slug}`, [{
    body: { success: true, slug, title: "Example", prompt: "Original prompt", internal: "private-value" },
  }]);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { slug, title: "Example", prompt: "Original prompt" });
  assert.equal(result.calls[0].url, "https://fzhzpzxsttflgtassyex.supabase.co/rest/v1/rpc/get_caramelo_prompt_copy");
  assert.equal(result.calls[0].options?.method, "POST");
  assert.match(result.headers["Cache-Control"], /s-maxage=300/);
});

test("deleted or empty prompts are not cached", async () => {
  const slug = catalog.items[0].slug;
  for (const response of [{ status: 404 }, { body: { success: true, prompt: " " } }]) {
    const result = await call(`/api/prompt-library?slug=${slug}`, [response]);
    assert.equal(result.status, 404);
    assert.equal(result.headers["Cache-Control"], "no-store");
  }
});

test("upstream failures return a retryable error without leaking details", async () => {
  const slug = catalog.items[0].slug;
  const result = await call(`/api/prompt-library?slug=${slug}`, [new Error("private-value")]);
  assert.equal(result.status, 502);
  assert.equal(result.headers["Cache-Control"], "no-store");
  assert.doesNotMatch(JSON.stringify(result.body), /private-value/);
});

test("a removed deployment is reported as a service outage, not a deleted prompt", async () => {
  process.env.PROMPT_LIBRARY_ORIGIN = "https://banco-de-prompts-three.vercel.app";
  try {
    const result = await call(`/api/prompt-library?slug=${catalog.items[0].slug}`, [{
      status: 404,
      body: { error: { code: "404", message: "The deployment could not be found on Vercel." } },
    }]);
    assert.equal(result.status, 503);
    assert.equal((result.body as { code: string }).code, "TEXT_SERVICE_UNAVAILABLE");
    assert.equal(result.headers["Cache-Control"], "no-store");
  } finally {
    delete process.env.PROMPT_LIBRARY_ORIGIN;
  }
});
