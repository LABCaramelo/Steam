import assert from "node:assert/strict";
import test from "node:test";
import {
  formatNewPromptsMessage,
  getUazapiNotificationConfig,
  sendNewPromptsNotification,
  type PromptNotificationItem,
  type UazapiNotificationConfig,
} from "./promptNotification.ts";

const samplePrompts: PromptNotificationItem[] = [
  {
    slug: "offline-footer",
    title: "Offline Footer",
    category: "Componentes UI",
  },
  {
    slug: "wild-pill-hero",
    title: "Wild Pill Hero",
    category: "Landing Pages",
  },
  {
    slug: "tana-elephant-sections",
    title: "Tana Elephant Sections",
    category: "Landing Pages",
  },
];

test("formatNewPromptsMessage retorna string vazia quando não há prompts", () => {
  assert.equal(formatNewPromptsMessage([]), "");
  // @ts-expect-error teste com valor nulo
  assert.equal(formatNewPromptsMessage(null), "");
});

test("formatNewPromptsMessage formata no singular quando há 1 prompt", () => {
  const single = [samplePrompts[0]];
  const msg = formatNewPromptsMessage(single);

  assert.match(msg, /NOVO PROMPT NO ACERVO DO LAB/);
  assert.match(msg, /Acabamos de subir 1 novo prompt exclusivo/);
  assert.match(msg, /\*Offline Footer\* \(Componentes UI\)/);
  assert.match(msg, /prompt=offline-footer/);
  assert.match(msg, /umcaracaramelo\.com\.br\/library\/home/);
  assert.doesNotMatch(msg, /\.html/);
});

test("formatNewPromptsMessage lista links individuais para até 6 prompts", () => {
  const msg = formatNewPromptsMessage(samplePrompts);

  assert.match(msg, /NOVO ACERVO LIBERADO NO LAB/);
  assert.match(msg, /\*3 novos prompts\*/);
  assert.match(msg, /prompt=offline-footer/);
  assert.match(msg, /prompt=wild-pill-hero/);
  assert.match(msg, /prompt=tana-elephant-sections/);
});

test("formatNewPromptsMessage usa lista condensada quando há mais de 6 prompts", () => {
  const many: PromptNotificationItem[] = Array.from({ length: 12 }, (_, i) => ({
    slug: `prompt-${i + 1}`,
    title: `Prompt Titulo ${i + 1}`,
    category: "Design",
  }));

  const msg = formatNewPromptsMessage(many);

  assert.match(msg, /\*12 novos prompts\*/);
  assert.match(msg, /Destaques do acervo atualizado:/);
  assert.match(msg, /Prompt Titulo 1/);
  assert.match(msg, /Prompt Titulo 10/);
  assert.match(msg, /\+2 novos prompts adicionados/);
  // No modo condensado não inclui link individual por item
  assert.doesNotMatch(msg, /prompt=prompt-1/);
  // Mas sempre inclui link geral da biblioteca no rodapé
  assert.match(msg, /library\/home/);
  assert.doesNotMatch(msg, /\.html/);
});

test("formatNewPromptsMessage respeita baseUrl customizado", () => {
  const msg = formatNewPromptsMessage([samplePrompts[0]], {
    baseUrl: "https://staging.umcaracaramelo.com.br",
  });

  assert.match(msg, /https:\/\/staging\.umcaracaramelo\.com\.br\/tools\/prompt-library\?prompt=offline-footer/);
  assert.match(msg, /https:\/\/staging\.umcaracaramelo\.com\.br\/library\/home/);
  assert.doesNotMatch(msg, /\.html/);
});

test("getUazapiNotificationConfig remove barras extras da URL", () => {
  const origUrl = process.env.UAZAPI_URL;
  try {
    process.env.UAZAPI_URL = "https://example.uazapi.com///";
    const config = getUazapiNotificationConfig();
    assert.equal(config.uazapiUrl, "https://example.uazapi.com");
  } finally {
    process.env.UAZAPI_URL = origUrl;
  }
});

test("sendNewPromptsNotification retorna sucesso sem chamar API se lista vazia", async () => {
  const config: UazapiNotificationConfig = {
    uazapiUrl: "https://mock.uazapi.com",
    uazapiToken: "token-mock",
    groupJid: "123@g.us",
  };

  const res = await sendNewPromptsNotification(config, []);
  assert.equal(res.success, true);
  assert.equal(res.count, 0);
});

test("sendNewPromptsNotification valida presença de credenciais", async () => {
  const invalidConfig: UazapiNotificationConfig = {
    uazapiUrl: "",
    uazapiToken: "",
    groupJid: "",
  };

  await assert.rejects(
    async () => {
      await sendNewPromptsNotification(invalidConfig, samplePrompts);
    },
    {
      name: "Error",
      message: /Configuração da UAZAPI incompleta/,
    }
  );
});

test("sendNewPromptsNotification dispara POST /send/text com headers e payload corretos", async () => {
  const calls: { url: string; headers: Record<string, string>; body: any }[] = [];
  const origFetch = globalThis.fetch;

  globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    const headers = (init.headers as Record<string, string>) || {};
    const body = JSON.parse(String(init.body || "{}"));
    calls.push({ url, headers, body });

    return new Response(JSON.stringify({ messageId: "msg-12345", status: "PENDING" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const config: UazapiNotificationConfig = {
      uazapiUrl: "https://mock.uazapi.com",
      uazapiToken: "secret-caramelo-token",
      groupJid: "120363411603021913@g.us",
    };

    const result = await sendNewPromptsNotification(config, samplePrompts);

    assert.equal(result.success, true);
    assert.equal(result.count, 3);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://mock.uazapi.com/send/text");
    assert.equal(calls[0].headers.token, "secret-caramelo-token");
    assert.equal(calls[0].headers["Content-Type"], "application/json");
    assert.equal(calls[0].body.number, "120363411603021913@g.us");
    assert.match(calls[0].body.text, /NOVO ACERVO LIBERADO NO LAB/);
    assert.match(calls[0].body.text, /Offline Footer/);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("sendNewPromptsNotification propaga erro quando a API da UAZAPI retorna status de erro", async () => {
  const origFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    return new Response("Unauthorized / Token inválido", {
      status: 401,
      statusText: "Unauthorized",
    });
  }) as typeof fetch;

  try {
    const config: UazapiNotificationConfig = {
      uazapiUrl: "https://mock.uazapi.com",
      uazapiToken: "bad-token",
      groupJid: "120363411603021913@g.us",
    };

    await assert.rejects(
      async () => {
        await sendNewPromptsNotification(config, samplePrompts);
      },
      {
        name: "Error",
        message: /UAZAPI \/send\/text falhou \(401\)/,
      }
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});
