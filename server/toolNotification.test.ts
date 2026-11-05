import assert from "node:assert/strict";
import test from "node:test";
import {
  buildToolNotificationData,
  formatNewToolMessage,
  sendNewToolNotification,
  KNOWN_LAB_TOOLS,
} from "./toolNotification.ts";

test("KNOWN_LAB_TOOLS contém ferramentas principais do ecossistema", () => {
  assert.ok(KNOWN_LAB_TOOLS.automation, "Deve conter automation/trama");
  assert.ok(KNOWN_LAB_TOOLS.gabinete, "Deve conter gabinete");
  assert.ok(KNOWN_LAB_TOOLS.claquete, "Deve conter claquete");
  assert.ok(KNOWN_LAB_TOOLS.prancheta, "Deve conter prancheta");
  assert.ok(KNOWN_LAB_TOOLS.montagem, "Deve conter montagem");
  assert.ok(KNOWN_LAB_TOOLS.kanban, "Deve conter kanban");
  assert.ok(KNOWN_LAB_TOOLS.academy, "Deve conter academy");
  assert.ok(KNOWN_LAB_TOOLS.comunidade, "Deve conter comunidade");
  assert.ok(KNOWN_LAB_TOOLS["prompt-library"], "Deve conter prompt-library");
});

test("buildToolNotificationData preenche dados canônicos a partir do slug", () => {
  const tool = buildToolNotificationData({ slug: "automation" });
  assert.equal(tool.name, "Trama");
  assert.equal(tool.category, "Automação");
  assert.equal(tool.stage, "beta");
  assert.ok(tool.features && tool.features.length >= 3);
});

test("formatNewToolMessage avisa explicitamente modo BETA e restrição exclusiva a usuários beta", () => {
  const betaTool = buildToolNotificationData({
    slug: "kanban",
    stage: "beta",
    customNote: "Organize sua semana com a Rotina Superprodutiva!",
  });
  const text = formatNewToolMessage(betaTool, { baseUrl: "https://www.umcaracaramelo.com.br" });

  // 1. Título indicando modo beta
  assert.match(text, /NOVA FERRAMENTA EM MODO BETA LIBERADA NO LAB/i);
  assert.match(text, /\[BETA\]/);

  // 2. Explicação de que foi publicada em modo beta
  assert.match(text, /publicar uma nova ferramenta na plataforma: \*Kanban\* \(Organização\)/);
  assert.match(text, /Esta ferramenta foi lançada em \*modo BETA\*/i);

  // 3. Aviso obrigatório de que ferramentas em modo beta são apenas para usuários beta
  assert.match(text, /ACESSO EXCLUSIVO: FERRAMENTA EM MODO BETA/);
  assert.match(text, /apenas para usuários com acesso Beta no LAB/i);
  assert.match(text, /Se você é usuário Beta/i);

  // 4. Links e chamada para testadores beta
  assert.match(text, /https:\/\/www\.umcaracaramelo\.com\.br\/tools\/kanban/);
  assert.match(text, /Organize sua semana com a Rotina Superprodutiva!/);
  assert.match(text, /Usuários Beta: testem sem moderação/i);
});

test("formatNewToolMessage formata anúncio padrão para ferramentas em versão estável", () => {
  const stableTool = buildToolNotificationData({
    slug: "prompt-library",
    stage: "stable",
  });
  const text = formatNewToolMessage(stableTool, { baseUrl: "https://www.umcaracaramelo.com.br" });

  assert.match(text, /NOVA FERRAMENTA LIBERADA NO LAB/i);
  assert.doesNotMatch(text, /ACESSO EXCLUSIVO: FERRAMENTA EM MODO BETA/);
  assert.doesNotMatch(text, /apenas para usuários com acesso Beta/i);
  assert.match(text, /Bora testar/i);
});

test("sendNewToolNotification envia payload correto para UAZAPI /send/text", async () => {
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

    const result = await sendNewToolNotification(config, { slug: "kanban", stage: "beta" });
    assert.equal(result.success, true);
    assert.equal(result.tool.name, "Kanban");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://uazapi.test/send/text");
    assert.equal(calls[0].headers.token, "token-123");
    assert.equal(calls[0].body.number, "120363000000000000@g.us");
    assert.match(String(calls[0].body.text), /Kanban/);
    assert.match(String(calls[0].body.text), /apenas para usuários com acesso Beta no LAB/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
