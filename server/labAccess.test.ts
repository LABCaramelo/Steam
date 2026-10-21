import assert from "node:assert/strict";
import test from "node:test";
import { isGroupMember, jidKey, labAccess, maskPhone, normalizePhone, phoneVariants } from "./labAccess.ts";

const ENV = {
  SUPABASE_URL: "https://sb.test",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
  UAZAPI_URL: "https://uaz.test/",
  UAZAPI_TOKEN: "instance-token",
  UAZAPI_GROUP_JID: "120363000000000001@g.us",
};

type Row = Record<string, unknown> & { user_id: string };

/** In-memory Supabase (auth + lab_access) and uazapi, routed by URL. */
function backend(options: { participants?: unknown[]; uazapiDown?: boolean; number?: { jid: string; lid?: string } } = {}) {
  const rows = new Map<string, Row>();
  const sent: { number: string; text: string }[] = [];
  const groupCalls: { force: boolean }[] = [];
  const users: Record<string, string> = { "token-a": "user-a", "token-b": "user-b" };

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const headers = init.headers as Record<string, string>;
    const body = init.body ? JSON.parse(String(init.body)) : undefined;

    if (url.host === "sb.test") {
      assert.equal(headers.apikey, "service-key");
      if (url.pathname === "/auth/v1/user") {
        const id = users[headers.Authorization.replace("Bearer ", "")];
        return id ? json({ id }) : json({ msg: "invalid" }, 401);
      }
      assert.equal(url.pathname, "/rest/v1/lab_access");
      if (init.method === "POST") {
        const merged = { ...rows.get(body.user_id), ...body } as Row;
        const clash = [...rows.values()].some((row) => row.user_id !== body.user_id && merged.whatsapp && row.whatsapp === merged.whatsapp);
        if (clash) return json({ code: "23505" }, 409);
        rows.set(body.user_id, merged);
        return new Response(null, { status: 201 });
      }
      const filters = [...url.searchParams].filter(([key]) => key !== "select");
      return json([...rows.values()].filter((row) => filters.every(([key, value]) => {
        if (value === "not.is.null") return row[key] != null;
        if (value.startsWith("eq.")) return String(row[key]) === value.slice(3);
        if (value.startsWith("gt.")) return row[key] != null && String(row[key]) > value.slice(3);
        throw new Error(`unsupported filter ${key}=${value}`);
      })));
    }

    assert.equal(url.host, "uaz.test");
    assert.equal(headers.token, "instance-token");
    if (options.uazapiDown) throw new TypeError("fetch failed");
    if (url.pathname === "/chat/check") {
      const number = options.number ?? { jid: "553185869015@s.whatsapp.net", lid: "99887766@lid" };
      return json([{ query: body.numbers[0], isInWhatsapp: true, ...number }]);
    }
    if (url.pathname === "/send/text") {
      sent.push(body);
      return json({ id: "msg" });
    }
    if (url.pathname === "/group/info") {
      assert.equal(body.groupjid, ENV.UAZAPI_GROUP_JID);
      groupCalls.push({ force: body.force });
      return json({ JID: body.groupjid, Participants: options.participants ?? [] });
    }
    throw new Error(`unexpected ${url}`);
  };
  return { rows, sent, groupCalls, fetch };
}

async function call(server: ReturnType<typeof backend>, body: unknown, token: string | null = "token-a", method = "POST") {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  Object.assign(process.env, ENV);
  globalThis.fetch = server.fetch as typeof fetch;
  let status = 0;
  let data: Record<string, unknown> = {};
  const res = {
    statusCode: 200,
    setHeader() {},
    end(value: string) { status = this.statusCode; data = JSON.parse(value); },
  };
  const req = {
    method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body,
    async *[Symbol.asyncIterator]() {},
  };
  try {
    await labAccess(req, res);
    return { status, data };
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
}

const codeFrom = (text: string) => text.match(/\*(\d{6})\*/)![1];

test("phone numbers are normalized with the Brazilian country code by default", () => {
  assert.equal(normalizePhone("(31) 98586-9015"), "5531985869015");
  assert.equal(normalizePhone("31 8586-9015"), "553185869015");
  assert.equal(normalizePhone("+55 31 98586-9015"), "5531985869015");
  assert.equal(normalizePhone("5531985869015"), "5531985869015");
  assert.equal(normalizePhone("+351 912 345 678"), "351912345678");
  assert.equal(normalizePhone("0044 7700 900123"), "447700900123");
  assert.equal(normalizePhone("98586-9015"), null);
  assert.equal(normalizePhone("(01) 98586-9015"), null);
  assert.equal(normalizePhone(""), null);
});

test("Brazilian mobiles match with and without the ninth digit", () => {
  assert.deepEqual([...phoneVariants("5531985869015")], ["5531985869015", "553185869015"]);
  assert.deepEqual([...phoneVariants("553185869015")], ["553185869015", "5531985869015"]);
  assert.deepEqual([...phoneVariants("553132221100")], ["553132221100"]);
  assert.equal(jidKey("553185869015:12@s.whatsapp.net"), "553185869015@s.whatsapp.net");
  assert.equal(maskPhone("553185869015"), "+55 (31) •••••-9015");
});

test("membership matches the phone JID, the LID or the participant profile", () => {
  const identity = { whatsapp: "553185869015", jid: "553185869015@s.whatsapp.net", lid: "99887766@lid" };
  assert.ok(isGroupMember({ Participants: [{ JID: "5531985869015@s.whatsapp.net" }] }, identity));
  assert.ok(isGroupMember({ Participants: [{ JID: "99887766:3@lid" }] }, identity));
  assert.ok(isGroupMember({ Participants: [], participant_profiles: [{ lid: "1@lid", pn: "553185869015@s.whatsapp.net" }] }, identity));
  assert.ok(isGroupMember({ Participants: [{ JID: "1@lid", PhoneNumber: "553185869015@s.whatsapp.net" }] }, identity));
  assert.ok(!isGroupMember({ Participants: [{ JID: "553185869016@s.whatsapp.net" }, { LID: "11@lid" }] }, identity));
  assert.ok(!isGroupMember({ Participants: null }, identity));
});

test("requests need configuration, POST and a valid session", async () => {
  const server = backend();
  const originalEnv = { ...process.env };
  try {
    delete process.env.UAZAPI_TOKEN;
    const res = { statusCode: 200, setHeader() {}, end() {} };
    await labAccess({ method: "POST", headers: {}, async *[Symbol.asyncIterator]() {} }, res);
    assert.equal(res.statusCode, 503);
  } finally {
    process.env = originalEnv;
  }
  assert.equal((await call(server, {}, "token-a", "GET")).status, 405);
  assert.equal((await call(server, { action: "status" }, null)).status, 401);
  assert.equal((await call(server, { action: "status" }, "expired")).status, 401);
  assert.equal((await call(server, { action: "nope" })).status, 400);
});

test("a confirmed member of the group gets in, and is checked again on every entry", async () => {
  const server = backend({ participants: [{ JID: "99887766@lid" }] });
  assert.deepEqual((await call(server, { action: "status" })).data, { state: "needs_phone" });

  const sent = await call(server, { action: "send", phone: "(31) 98586-9015" });
  assert.deepEqual(sent.data, { state: "code_sent", phone: "+55 (31) •••••-9015", resendIn: 60 });
  assert.equal(server.sent.length, 1);
  assert.equal(server.sent[0].number, "553185869015");
  assert.ok(!JSON.stringify(server.rows.get("user-a")).includes(codeFrom(server.sent[0].text)), "the code is stored hashed");

  const verified = await call(server, { action: "verify", code: codeFrom(server.sent[0].text) });
  assert.deepEqual(verified.data, { state: "granted" });
  const row = server.rows.get("user-a")!;
  assert.equal(row.whatsapp, "553185869015");
  assert.equal(row.code_hash, null);
  assert.ok(row.verified_at && row.member_at);

  server.groupCalls.length = 0;
  assert.deepEqual((await call(server, { action: "status" })).data, { state: "granted" });
  assert.deepEqual(server.groupCalls, [{ force: false }]);
});

test("someone outside the group is told to join, and a recheck forces a fresh list", async () => {
  const server = backend({ participants: [{ JID: "5511999990000@s.whatsapp.net" }] });
  await call(server, { action: "send", phone: "31985869015" });
  const verified = await call(server, { action: "verify", code: codeFrom(server.sent[0].text) });
  assert.deepEqual(verified.data, { state: "not_member", phone: "+55 (31) •••••-9015" });
  assert.equal(server.rows.get("user-a")!.member_at, null);

  server.groupCalls.length = 0;
  assert.equal((await call(server, { action: "status" })).data.state, "not_member");
  assert.deepEqual(server.groupCalls, [{ force: false }, { force: true }], "a miss on the cached list is retried fresh");

  server.groupCalls.length = 0;
  await call(server, { action: "status", force: true });
  assert.deepEqual(server.groupCalls, [{ force: true }]);
});

test("wrong codes count attempts, and a code cannot be requested again within a minute", async () => {
  const server = backend();
  await call(server, { action: "send", phone: "31985869015" });
  const again = await call(server, { action: "send", phone: "31985869015" });
  assert.equal(again.status, 429);
  assert.ok(Number(again.data.resendIn) > 0);

  const code = codeFrom(server.sent[0].text);
  const wrong = code === "000000" ? "111111" : "000000";
  for (let left = 4; left >= 1; left--) {
    const res = await call(server, { action: "verify", code: wrong });
    assert.equal(res.status, 400);
    assert.match(String(res.data.error), new RegExp(`Restam? ${left}`));
  }
  assert.equal((await call(server, { action: "verify", code: wrong })).status, 400);
  assert.equal((await call(server, { action: "verify", code })).status, 429, "the right code no longer works after 5 misses");
  assert.equal((await call(server, { action: "verify", code: "12" })).status, 400);
});

test("expired codes and numbers already linked to another account are refused", async () => {
  const server = backend({ participants: [{ JID: "553185869015@s.whatsapp.net" }] });
  await call(server, { action: "send", phone: "31985869015" });
  server.rows.get("user-a")!.code_expires_at = new Date(Date.now() - 1000).toISOString();
  assert.equal((await call(server, { action: "verify", code: codeFrom(server.sent[0].text) })).status, 400);

  server.rows.get("user-a")!.code_sent_at = new Date(Date.now() - 120_000).toISOString();
  await call(server, { action: "send", phone: "31985869015" });
  assert.equal((await call(server, { action: "verify", code: codeFrom(server.sent[1].text) })).data.state, "granted");

  const other = await call(server, { action: "send", phone: "+55 31 8586-9015" }, "token-b");
  assert.equal(other.status, 409);
  assert.equal(server.sent.length, 2, "no code goes to a number another account owns");
});

test("when the WhatsApp instance is offline, only a recently confirmed member gets in", async () => {
  const server = backend({ participants: [{ JID: "553185869015@s.whatsapp.net" }] });
  await call(server, { action: "send", phone: "31985869015" });
  await call(server, { action: "verify", code: codeFrom(server.sent[0].text) });

  const offline = backend({ uazapiDown: true });
  offline.rows.set("user-a", { ...server.rows.get("user-a")! });
  assert.deepEqual((await call(offline, { action: "status" })).data, { state: "granted" });

  offline.rows.get("user-a")!.member_at = new Date(Date.now() - 73 * 3_600_000).toISOString();
  assert.equal((await call(offline, { action: "status" })).status, 503);
  offline.rows.get("user-a")!.code_sent_at = new Date(Date.now() - 120_000).toISOString();
  assert.equal((await call(offline, { action: "send", phone: "31985869015" })).status, 503);
});
