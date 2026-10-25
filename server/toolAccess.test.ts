import assert from "node:assert/strict";
import test from "node:test";
import { requireLabAdmin, requireToolAccess, requireUser, ToolAccessError } from "./toolAccess.ts";

const USER_ID = "00000000-0000-4000-8000-000000000001";
type MockResponse = { status?: number; body?: unknown } | Error;

async function check(responses: MockResponse[], authorization: string | undefined = "Bearer verified-token", tool: string | null = "kanban") {
  const original = globalThis.fetch;
  const calls: { url: string; options?: RequestInit }[] = [];
  globalThis.fetch = async (input, options) => {
    calls.push({ url: String(input), options });
    const next = responses.shift();
    assert.ok(next, "unexpected upstream call");
    if (next instanceof Error) throw next;
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
  };
  try {
    const req = { headers: authorization ? { authorization } : {} };
    const access = tool === null ? await requireUser(req) : await requireToolAccess(req, tool);
    return { access, calls, error: null };
  } catch (error) {
    assert.ok(error instanceof ToolAccessError);
    return { access: null, calls, error };
  } finally {
    globalThis.fetch = original;
  }
}

test("missing and malformed Bearer credentials fail before any network call", async () => {
  for (const header of ["", "Basic opaque", "Bearer", "Bearer token with spaces"]) {
    const result = await check([], header);
    assert.equal(result.error?.status, 401);
    assert.equal(result.calls.length, 0);
  }
});

test("invalid, expired or anonymous sessions never reach ownership checks", async () => {
  for (const response of [{ status: 401 }, { status: 403 }, { body: {} }, { body: { id: USER_ID, is_anonymous: true } }]) {
    const result = await check([response]);
    assert.equal(result.error?.status, 401);
    assert.equal(result.calls.length, 1);
  }
});

test("Auth network and server failures fail closed without leaking details", async () => {
  for (const response of [new Error("private-upstream-details"), { status: 500 }]) {
    const result = await check([response]);
    assert.equal(result.error?.status, 503);
    assert.equal(result.calls.length, 1);
    assert.doesNotMatch(result.error?.message ?? "", /private-upstream-details/);
  }
});

test("only a strict true ownership RPC authorizes, using the exact verified caller token", async () => {
  const result = await check([{ body: { id: USER_ID } }, { body: true }]);
  assert.equal(result.error, null);
  assert.equal(result.access?.user.id, USER_ID);
  assert.match(result.calls[0].url, /\/auth\/v1\/user$/);
  assert.match(result.calls[1].url, /\/rest\/v1\/rpc\/has_tool$/);
  assert.equal(new Headers(result.calls[1].options?.headers).get("Authorization"), "Bearer verified-token");
  assert.deepEqual(JSON.parse(String(result.calls[1].options?.body)), { p_slug: "kanban" });
  const denied = await check([{ body: { id: USER_ID } }, { body: false }]);
  assert.equal(denied.error?.status, 403);
});

test("missing RPC, malformed result, expired JWT and network errors never authorize", async () => {
  for (const [response, status] of [
    [{ status: 404 }, 503], [{ status: 500 }, 503], [{ status: 401 }, 401],
    [{ body: "true" }, 503], [{ body: { allowed: true } }, 503], [new Error("private-error"), 503],
  ] as [MockResponse, number][]) {
    const result = await check([{ body: { id: USER_ID } }, response]);
    assert.equal(result.error?.status, status);
    assert.equal(result.access, null);
  }
});

test("profile operations can require login alone, without granting any tool", async () => {
  const result = await check([{ body: { id: USER_ID } }], "Bearer verified-token", null);
  assert.equal(result.error, null);
  assert.equal(result.calls.length, 1);
});

test("administrator checks also fail closed on the caller JWT", async () => {
  const access = { user: { id: USER_ID }, token: "verified-token", supabaseUrl: "https://audit.invalid", supabaseKey: "public-key" };
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("false");
    await assert.rejects(requireLabAdmin(access), (error: unknown) => error instanceof ToolAccessError && error.status === 403);
    globalThis.fetch = async () => new Response("true", { status: 500 });
    await assert.rejects(requireLabAdmin(access), (error: unknown) => error instanceof ToolAccessError && error.status === 503);
  } finally { globalThis.fetch = original; }
});
