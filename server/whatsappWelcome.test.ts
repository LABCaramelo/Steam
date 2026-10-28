import assert from "node:assert/strict";
import test from "node:test";
import {
  WELCOME_TEMPLATES,
  getNextWelcomeTemplate,
  parseGroupJoinEvent,
  sendWelcomeToGroup,
  handleWhatsAppWebhook,
} from "./whatsappWelcome.ts";
import type { IncomingMessage, ServerResponse } from "node:http";

test("WELCOME_TEMPLATES contém pelo menos 6 modelos com menção e convite", () => {
  assert.ok(WELCOME_TEMPLATES.length >= 6, "Deve conter pelo menos 6 modelos");
  for (const t of WELCOME_TEMPLATES) {
    const rendered = t.format("5531985869015");
    assert.match(rendered, /@5531985869015/, "A mensagem deve mencionar o número do usuário");
    assert.match(rendered, /descri[çc][ãa]o/i, "A mensagem deve convidar a ler a descrição do grupo");
    assert.match(rendered, /apresent/i, "A mensagem deve convidar a se apresentar");
  }
});

test("getNextWelcomeTemplate cicla sequencialmente entre os modelos", () => {
  const chosenIndices: number[] = [];
  for (let i = 0; i < WELCOME_TEMPLATES.length * 2; i++) {
    const { index } = getNextWelcomeTemplate();
    chosenIndices.push(index);
  }
  // Os primeiros N índices devem cobrir todos os templates
  for (let i = 0; i < WELCOME_TEMPLATES.length; i++) {
    assert.equal(chosenIndices[i], i % WELCOME_TEMPLATES.length);
  }
});

test("parseGroupJoinEvent identifica formato padrão da uazapi (groups com action add)", () => {
  const payload = {
    EventType: "groups",
    data: {
      jid: "120363000000000000@g.us",
      action: "add",
      participants: ["5531985869015@s.whatsapp.net"],
    },
  };
  const event = parseGroupJoinEvent(payload);
  assert.ok(event, "Deve detectar evento de entrada");
  assert.equal(event?.groupJid, "120363000000000000@g.us");
  assert.deepEqual(event?.participants, ["5531985869015"]);
});

test("parseGroupJoinEvent aceita action 'join' e múltiplos participantes", () => {
  const payload = {
    event: "group.participants-update",
    data: {
      id: "120363111111111111@g.us",
      action: "join",
      participants: [
        "5511999999999@s.whatsapp.net",
        "5521988888888:12@s.whatsapp.net",
      ],
    },
  };
  const event = parseGroupJoinEvent(payload);
  assert.ok(event);
  assert.equal(event?.groupJid, "120363111111111111@g.us");
  assert.deepEqual(event?.participants, ["5511999999999", "5521988888888"]);
});

test("parseGroupJoinEvent ignora eventos de saída (remove / leave)", () => {
  const payload = {
    EventType: "groups",
    data: {
      jid: "120363000000000000@g.us",
      action: "remove",
      participants: ["5531985869015@s.whatsapp.net"],
    },
  };
  assert.equal(parseGroupJoinEvent(payload), null);
});

test("parseGroupJoinEvent ignora chats que não são grupos (@g.us)", () => {
  const payload = {
    action: "add",
    data: {
      jid: "5531985869015@s.whatsapp.net",
      participants: ["5531985869015"],
    },
  };
  assert.equal(parseGroupJoinEvent(payload), null);
});

test("sendWelcomeToGroup chama uazapi /send/text com dados corretos e menção", async () => {
  const calls: { url: string; body: Record<string, unknown>; headers: Record<string, string> }[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({
      url: String(input),
      body: JSON.parse(String(init.body || "{}")),
      headers: init.headers as Record<string, string>,
    });
    return new Response(JSON.stringify({ status: "success" }), { status: 200 });
  }) as typeof fetch;

  try {
    const config = {
      uazapiUrl: "https://uazapi.test",
      uazapiToken: "token-123",
      groupJid: "120363000000000000@g.us",
    };

    const event = {
      groupJid: "120363000000000000@g.us",
      action: "add" as const,
      participants: ["5531985869015"],
      rawParticipants: ["5531985869015@s.whatsapp.net"],
    };

    const result = await sendWelcomeToGroup(config, event, 0);
    assert.equal(result.success, true);
    assert.equal(result.messagesSent, 1);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://uazapi.test/send/text");
    assert.equal(calls[0].headers.token, "token-123");
    assert.equal(calls[0].body.number, "120363000000000000@g.us");
    assert.equal(calls[0].body.mentions, "5531985869015");
    assert.match(String(calls[0].body.text), /@5531985869015/);
    assert.match(String(calls[0].body.text), /descri[çc][ãa]o/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("handleWhatsAppWebhook responde 200 e ignora se não for o grupo correto", async () => {
  const prevEnv = { ...process.env };
  process.env.UAZAPI_GROUP_JID = "120363999999999999@g.us";
  process.env.UAZAPI_URL = "https://uazapi.test";
  process.env.UAZAPI_TOKEN = "tok";

  try {
    let statusCode = 0;
    let responseBody = "";
    const headers: Record<string, string> = {};

    const req = {
      method: "POST",
      headers: {},
      body: {
        EventType: "groups",
        data: {
          jid: "120363000000000000@g.us", // Outro grupo
          action: "add",
          participants: ["5531985869015"],
        },
      },
      async *[Symbol.asyncIterator]() {
        yield Buffer.from("");
      },
    } as unknown as IncomingMessage;

    const res = {
      set statusCode(val: number) { statusCode = val; },
      setHeader(k: string, v: string) { headers[k] = v; },
      end(data: string) { responseBody = data; },
    } as unknown as ServerResponse;

    await handleWhatsAppWebhook(req, res);
    assert.equal(statusCode, 200);
    const parsed = JSON.parse(responseBody);
    assert.equal(parsed.ignored, true);
    assert.match(parsed.reason, /Evento pertence a outro grupo/);
  } finally {
    process.env = prevEnv;
  }
});
