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
});

test("buildToolNotificationData preenche dados canônicos a partir do slug", () => {
  const tool = buildToolNotificationData({ slug: "automation" });
  assert.equal(tool.name, "Trama");
  assert.equal(tool.category, "Automação");
  assert.equal(tool.stage, "beta");
  assert.ok(tool.features && tool.features.length >= 3);
});

test("formatNewToolMessage formata mensagem com identidade Caramelo e links", () => {
  const tool = buildToolNotificationData({
    slug: "gabinete",
    customNote: "Acabamos de subir os novos templates de carrossel!",
  });
  const text = formatNewToolMessage(tool, { baseUrl: "https://www.umcaracaramelo.com.br" });

  assert.match(text, /NOVA FERRAMENTA LIBERADA NO LAB/i);
  assert.match(text, /\*Gabinete\*/);
  assert.match(text, /https:\/\/www\.umcaracaramelo\.com\.br\/tools\/gabinete\/index\.html/);
  assert.match(text, /Acabamos de subir os novos templates/);
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

    const result = await sendNewToolNotification(config, { slug: "trama" });
    assert.equal(result.success, true);
    assert.equal(result.tool.name, "Trama");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://uazapi.test/send/text");
    assert.equal(calls[0].headers.token, "token-123");
    assert.equal(calls[0].body.number, "120363000000000000@g.us");
    assert.match(String(calls[0].body.text), /Trama/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
