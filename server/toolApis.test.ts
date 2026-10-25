import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import test from "node:test";
import livekit from "../api/livekit.ts";
import { promptLibrary } from "../api/prompt-library.ts";

const oldR2Token = process.env.CLOUDFLARE_API_TOKEN;
process.env.CLOUDFLARE_API_TOKEN = "test-r2-key";
const { default: upload } = await import("../api/upload.ts");
if (oldR2Token === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
else process.env.CLOUDFLARE_API_TOKEN = oldR2Token;

const USER_ID = "00000000-0000-4000-8000-000000000001";
const USER = { id: USER_ID, email: "member@lab.test", user_metadata: { nickname: "Verified member" } };
type MockResponse = { status?: number; body?: unknown } | Error;
type Handler = (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => Promise<unknown>;

async function call(handler: Handler, url: string, responses: MockResponse[], options: {
  method?: string; token?: string | null; body?: unknown; headers?: Record<string, string>;
} = {}) {
  const original = globalThis.fetch;
  const calls: { url: string; options?: RequestInit }[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), options: init });
    const next = responses.shift();
    assert.ok(next, "unexpected upstream call");
    if (next instanceof Error) throw next;
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
  };
  const token = options.token === undefined ? "verified-user-token" : options.token;
  const req = Object.assign(Readable.from([]), {
    method: options.method ?? "POST", url, body: options.body,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...options.headers },
  }) as unknown as IncomingMessage & { body?: unknown };
  const headers: Record<string, string> = {};
  let body: unknown;
  const res = {
    statusCode: 200,
    setHeader(name: string, value: string) { headers[name] = value; },
    end(value: string) { body = JSON.parse(value); },
  };
  try {
    await handler(req, res as unknown as ServerResponse);
    return { status: res.statusCode, body, headers, calls };
  } finally { globalThis.fetch = original; }
}

test("anonymous requests never reach prompt data, LiveKit or R2", async () => {
  for (const [handler, url, method] of [
    [promptLibrary, "/api/prompt-library", "GET"], [livekit, "/api/livekit?action=rooms", "GET"],
    [livekit, "/api/livekit?action=token", "POST"], [upload, "/api/upload", "POST"],
  ] as [Handler, string, string][]) {
    const result = await call(handler, url, [], { token: null, method });
    assert.equal(result.status, 401, url);
    assert.equal(result.calls.length, 0, url);
  }
});

test("invalid or expired credentials stop every protected API before its provider", async () => {
  for (const [handler, url, method] of [
    [promptLibrary, "/api/prompt-library", "GET"], [livekit, "/api/livekit?action=token", "POST"], [upload, "/api/upload", "POST"],
  ] as [Handler, string, string][]) {
    const result = await call(handler, url, [{ status: 401 }], { method });
    assert.equal(result.status, 401);
    assert.equal(result.calls.length, 1);
    assert.match(result.calls[0].url, /\/auth\/v1\/user$/);
  }
});

test("anonymous Supabase accounts cannot use protected APIs even with a valid Auth response", async () => {
  for (const [handler, url, method] of [
    [promptLibrary, "/api/prompt-library", "GET"], [livekit, "/api/livekit?action=rooms", "GET"],
    [livekit, "/api/livekit?action=token", "POST"], [upload, "/api/upload", "POST"],
  ] as [Handler, string, string][]) {
    const result = await call(handler, url, [{ body: { ...USER, is_anonymous: true } }], { method });
    assert.equal(result.status, 401, url);
    assert.equal(result.calls.length, 1, url);
  }
});

test("voice occupancy and token issuance deny non-owners and fail closed on ownership outages", async () => {
  for (const [action, method] of [["rooms", "GET"], ["token", "POST"]]) {
    for (const [response, status] of [[{ body: false }, 403], [{ status: 500, body: true }, 503]] as [MockResponse, number][]) {
      const result = await call(livekit, `/api/livekit?action=${action}`, [{ body: USER }, response], { method });
      assert.equal(result.status, status);
      assert.equal(result.calls.length, 2);
      assert.deepEqual(JSON.parse(String(result.calls[1].options?.body)), { p_slug: "comunidade" });
    }
  }
});

test("voice owner token uses the verified identity and name, ignoring spoofed body fields", async () => {
  const prior = { url: process.env.LIVEKIT_URL, key: process.env.LIVEKIT_API_KEY, secret: process.env.LIVEKIT_API_SECRET };
  process.env.LIVEKIT_URL = "wss://audit.invalid";
  process.env.LIVEKIT_API_KEY = "test-livekit-key";
  process.env.LIVEKIT_API_SECRET = "test-livekit-secret-long-enough-for-signing";
  try {
    const result = await call(livekit, "/api/livekit?action=token", [{ body: USER }, { body: true }], {
      body: { channelId: "general-voice", identity: "another-account", name: "Another person", color: "#ffaa00" },
    });
    assert.equal(result.status, 200);
    const body = result.body as { token: string; identity: string };
    const claims = JSON.parse(Buffer.from(body.token.split(".")[1], "base64url").toString());
    assert.equal(body.identity, USER_ID);
    assert.equal(claims.sub, USER_ID);
    assert.equal(claims.name, "Verified member");
    assert.equal(claims.video.room, "discord-clone_general-voice");
    assert.equal(claims.exp - claims.nbf, 900);
    assert.equal(result.calls.length, 2);
    const invalidRoom = await call(livekit, "/api/livekit?action=token", [{ body: USER }, { body: true }], { body: { channelId: "../another-app" } });
    assert.equal(invalidRoom.status, 400);
  } finally {
    for (const [name, value] of [["LIVEKIT_URL", prior.url], ["LIVEKIT_API_KEY", prior.key], ["LIVEKIT_API_SECRET", prior.secret]]) {
      if (value === undefined) delete process.env[name as string]; else process.env[name as string] = value;
    }
  }
});

test("profile upload requires login and derives the owner and extension on the server", async () => {
  const result = await call(upload, "/api/upload", [{ body: USER }, { body: {} }], {
    body: Buffer.from("image fixture"), headers: { "content-type": "image/png", "x-user-id": "victim", "x-filename": "danger.html", "x-folder": "avatars" },
  });
  assert.equal(result.status, 200);
  assert.match((result.body as { key: string }).key, new RegExp(`^avatars/${USER_ID}/avatar-.*\\.png$`));
  assert.equal(result.calls.length, 2);
  assert.equal(result.calls[1].options?.method, "PUT");
  assert.ok(!result.calls.some((c) => c.url.includes("has_tool")), "profile avatar does not require a tool purchase");
});

test("upload provider failures do not expose private provider responses", async () => {
  const result = await call(upload, "/api/upload", [{ body: USER }, { status: 403, body: { private: "provider-account-details" } }], {
    body: Buffer.from("image fixture"), headers: { "content-type": "image/png", "x-folder": "avatars" },
  });
  assert.equal(result.status, 502);
  assert.doesNotMatch(JSON.stringify(result.body), /provider-account-details/);
});

test("media upload requires the consuming tool and never reaches R2 without ownership", async () => {
  const options = { body: Buffer.from("image fixture"), headers: { "content-type": "image/png", "x-folder": "media", "x-tool-slug": "claquete" } };
  const denied = await call(upload, "/api/upload", [{ body: USER }, { body: false }], options);
  assert.equal(denied.status, 403);
  assert.equal(denied.calls.length, 2);
  const failed = await call(upload, "/api/upload", [{ body: USER }, new Error("private-outage")], options);
  assert.equal(failed.status, 503);
  assert.equal(failed.calls.length, 2);
  const owner = await call(upload, "/api/upload", [{ body: USER }, { body: true }, { body: {} }], options);
  assert.equal(owner.status, 200);
  assert.match((owner.body as { key: string }).key, new RegExp(`^media/${USER_ID}/`));
});

test("tool banner uploads accept verified administrators and reject editable metadata as authority", async () => {
  const options = { body: Buffer.from("image fixture"), headers: { "content-type": "image/png", "x-folder": "tool-banners", "x-tool-slug": "kanban", "x-kind": "hero" } };
  const forgedMetadata = { ...USER, user_metadata: { role: "admin", is_admin: true } };
  const denied = await call(upload, "/api/upload", [{ body: forgedMetadata }, { body: false }, { body: false }], options);
  assert.equal(denied.status, 403);
  assert.equal(denied.calls.length, 3);
  const legacyAdmin = await call(upload, "/api/upload", [{ body: USER }, { body: false }, { body: true }, { body: {} }], options);
  assert.equal(legacyAdmin.status, 200);
  assert.match((legacyAdmin.body as { key: string }).key, /^tool-banners\/kanban\/hero-/);
  assert.match(legacyAdmin.calls[2].url, /\/is_admin$/);
});
