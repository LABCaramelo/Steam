import assert from "node:assert/strict";
import test from "node:test";
import {
  WELCOME_TEMPLATES,
  getNextWelcomeTemplate,
  parseGroupJoinEvent,
  sendWelcomeToGroup,
  handleWhatsAppWebhook,
  acquireWelcomeLock,
  resetMemoryLocksForTest,
} from "./whatsappWelcome.ts";
import type { IncomingMessage, ServerResponse } from "node:http";

test("WELCOME_TEMPLATES contém pelo menos 6 modelos concisos com menção @ e convite", () => {
  assert.ok(WELCOME_TEMPLATES.length >= 6, "Deve conter pelo menos 6 modelos");
  for (const t of WELCOME_TEMPLATES) {
    const rendered = t.format("5531985869015");
    assert.match(rendered, /@5531985869015/, "A mensagem deve conter @número para menção real do WhatsApp e notificação");
    assert.match(rendered, /descri[çc][ãa]o/i, "A mensagem deve convidar a ler a descrição do grupo");
    assert.match(rendered, /apresent/i, "A mensagem deve convidar a se apresentar");
    assert.ok(rendered.length <= 250, "A mensagem deve ser concisa (máximo 250 caracteres)");
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

test("parseGroupJoinEvent aceita variações de entrada por link de convite (invite, linked_group_join, joined)", () => {
  for (const act of ["invite", "invite_link", "linked_group_join", "joined", "member_add"]) {
    const payload = {
      event: "groups",
      data: {
        id: "120363111111111111@g.us",
        action: act,
        participants: ["5531985869015@s.whatsapp.net"],
      },
    };
    const event = parseGroupJoinEvent(payload);
    assert.ok(event, `Deve aceitar action '${act}'`);
    assert.deepEqual(event?.participants, ["5531985869015"]);
  }
});

test("parseGroupJoinEvent identifica formato real da uazapi com event.Join e event.JID (convite)", () => {
  const payload = {
    BaseUrl: "https://umcaracaramelo.uazapi.com",
    EventType: "groups",
    event: {
      JID: "120363411603021913@g.us",
      Notify: "invite",
      Timestamp: "2026-11-07T16:23:54Z",
      JoinReason: "invite",
      Join: ["5521965102475@s.whatsapp.net"],
      Leave: null,
      JoinLid: ["212609739526396@lid"],
    },
    instanceName: "lab",
    owner: "553185869015",
    token: "95846f2e-242b-4b4d-888b-c3df99aa989a",
    type: "Group",
  };
  const event = parseGroupJoinEvent(payload);
  assert.ok(event, "Deve detectar evento de entrada da uazapi");
  assert.equal(event?.groupJid, "120363411603021913@g.us");
  assert.deepEqual(event?.participants, ["5521965102475"]);
});

test("parseGroupJoinEvent ignora evento da uazapi quando event.Leave está preenchido e Join é null", () => {
  const payload = {
    EventType: "groups",
    event: {
      JID: "120363411603021913@g.us",
      Notify: "leave",
      Join: null,
      Leave: ["5521965102475@s.whatsapp.net"],
    },
    type: "Group",
  };
  assert.equal(parseGroupJoinEvent(payload), null);
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

test("sendWelcomeToGroup chama uazapi /send/text com dados corretos e fallback para número se não houver nome", async () => {
  const calls: { url: string; body: Record<string, unknown>; headers: Record<string, string> }[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const urlStr = String(input);
    const body = JSON.parse(String(init.body || "{}"));
    calls.push({
      url: urlStr,
      body,
      headers: init.headers as Record<string, string>,
    });
    if (urlStr.includes("/group/info")) {
      return new Response(JSON.stringify({ participant_profiles: [] }), { status: 200 });
    }
    if (urlStr.includes("/chat/find")) {
      return new Response(JSON.stringify({ chats: [] }), { status: 200 });
    }
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
    const sendCall = calls.find((c) => c.url.endsWith("/send/text"));
    assert.ok(sendCall, "Deve chamar /send/text");
    assert.equal(sendCall.headers.token, "token-123");
    assert.equal(sendCall.body.number, "120363000000000000@g.us");
    assert.equal(sendCall.body.mentions, "5531985869015");
    assert.match(String(sendCall.body.text), /@5531985869015/);
    assert.match(String(sendCall.body.text), /descri[çc][ãa]o/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sendWelcomeToGroup resolve nome do usuário nos metadados e mantém menção @ no texto para notificação real", async () => {
  const calls: { url: string; body: Record<string, unknown>; headers: Record<string, string> }[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const urlStr = String(input);
    const body = JSON.parse(String(init.body || "{}"));
    calls.push({
      url: urlStr,
      body,
      headers: init.headers as Record<string, string>,
    });
    if (urlStr.includes("/group/info")) {
      return new Response(
        JSON.stringify({
          participant_profiles: [
            {
              pn: "5531985869015@s.whatsapp.net",
              name: "Luiz Caramelo",
            },
          ],
        }),
        { status: 200 }
      );
    }
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
    assert.equal(result.resolvedNames?.["5531985869015"], "Luiz Caramelo");
    const sendCall = calls.find((c) => c.url.endsWith("/send/text"));
    assert.ok(sendCall);
    assert.equal(sendCall.body.mentions, "5531985869015");
    assert.match(String(sendCall.body.text), /@5531985869015/, "Deve manter @número no texto para o WhatsApp notificar o usuário");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sendWelcomeToGroup resolve LID para número de telefone real e nome", async () => {
  const calls: { url: string; body: Record<string, unknown>; headers: Record<string, string> }[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const urlStr = String(input);
    const body = JSON.parse(String(init.body || "{}"));
    calls.push({
      url: urlStr,
      body,
      headers: init.headers as Record<string, string>,
    });
    if (urlStr.includes("/group/info")) {
      return new Response(
        JSON.stringify({
          participant_profiles: [
            {
              lid: "248021644226779@lid",
              pn: "553188015544@s.whatsapp.net",
              name: "Camila Alves",
            },
          ],
        }),
        { status: 200 }
      );
    }
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
      participants: ["248021644226779"],
      rawParticipants: ["248021644226779@lid"],
    };

    const result = await sendWelcomeToGroup(config, event, 0);
    assert.equal(result.success, true);
    assert.equal(result.resolvedNames?.["248021644226779"], "Camila Alves");
    assert.equal(result.resolvedNames?.["553188015544"], "Camila Alves");
    const sendCall = calls.find((c) => c.url.endsWith("/send/text"));
    assert.ok(sendCall);
    assert.equal(sendCall.body.mentions, "553188015544", "Deve mencionar o número PN real, não o LID");
    assert.match(String(sendCall.body.text), /@553188015544/, "Deve conter @número PN real no texto para o WhatsApp notificar o usuário");
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

test("acquireWelcomeLock previne duplicatas imediatas para o mesmo número e grupo", async () => {
  resetMemoryLocksForTest();
  const phone = "5531999998888";
  const groupJid = "120363000000000000@g.us";

  const firstLock = await acquireWelcomeLock(phone, groupJid);
  assert.equal(firstLock, true, "Primeira chamada deve adquirir o lock com sucesso");

  const secondLock = await acquireWelcomeLock(phone, groupJid);
  assert.equal(secondLock, false, "Segunda chamada imediata deve ser bloqueada pelo lock");
});

test("handleWhatsAppWebhook ignora requisições duplicadas (retry / múltiplos eventos) para o mesmo participante", async () => {
  resetMemoryLocksForTest();
  const prevEnv = { ...process.env };
  process.env.UAZAPI_GROUP_JID = "120363111111111111@g.us";
  process.env.UAZAPI_URL = "https://uazapi.test";
  process.env.UAZAPI_TOKEN = "tok";

  const originalFetch = globalThis.fetch;
  let sendTextCalls = 0;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const urlStr = String(input);
    if (urlStr.endsWith("/send/text")) {
      sendTextCalls++;
    }
    return new Response(JSON.stringify({ status: "success" }), { status: 200 });
  }) as typeof fetch;

  try {
    const createReqRes = (phone: string) => {
      let statusCode = 0;
      let responseBody = "";
      const req = {
        method: "POST",
        headers: {},
        body: {
          EventType: "groups",
          event: {
            JID: "120363111111111111@g.us",
            Join: [`${phone}@s.whatsapp.net`],
            Leave: null,
          },
        },
        async *[Symbol.asyncIterator]() {
          yield Buffer.from("");
        },
      } as unknown as IncomingMessage;

      const res = {
        set statusCode(val: number) { statusCode = val; },
        setHeader() {},
        end(data: string) { responseBody = data; },
      } as unknown as ServerResponse;

      return { req, res, getStatus: () => statusCode, getBody: () => JSON.parse(responseBody) };
    };

    // Primeira entrega do webhook
    const first = createReqRes("5521977776666");
    await handleWhatsAppWebhook(first.req, first.res);
    assert.equal(first.getStatus(), 200);
    assert.equal(first.getBody().action, "welcome_sent");
    assert.equal(sendTextCalls, 1, "Deve ter disparado exatamente 1 mensagem");

    // Segunda entrega do webhook (duplicata / retry)
    const duplicate = createReqRes("5521977776666");
    await handleWhatsAppWebhook(duplicate.req, duplicate.res);
    assert.equal(duplicate.getStatus(), 200);
    assert.equal(duplicate.getBody().ignored, true);
    assert.match(duplicate.getBody().reason, /já enviadas recentemente/);
    assert.equal(sendTextCalls, 1, "Não deve enviar mensagem duplicada");
  } finally {
    globalThis.fetch = originalFetch;
    process.env = prevEnv;
  }
});
