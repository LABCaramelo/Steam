/**
 * Um Cara Caramelo — Notificação de Novos Prompts no WhatsApp via UAZAPI
 *
 * Formata e dispara aviso no grupo oficial do LAB Caramelo sempre que
 * novos prompts forem importados ou publicados no acervo.
 */

export interface PromptNotificationItem {
  id?: string;
  slug: string;
  title: string;
  category: string;
  type?: string;
  author?: string;
}

export interface UazapiNotificationConfig {
  uazapiUrl: string;
  uazapiToken: string;
  groupJid: string;
}

export function getUazapiNotificationConfig(): UazapiNotificationConfig {
  if (typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile();
    } catch {
      // Ignora se arquivo não existir no ambiente
    }
  }

  return {
    uazapiUrl: (process.env.UAZAPI_URL || "").replace(/\/+$/, ""),
    uazapiToken: process.env.UAZAPI_TOKEN || "",
    groupJid: (process.env.UAZAPI_GROUP_JID || "").trim(),
  };
}

/**
 * Formata a mensagem com identidade Caramelo para envio no WhatsApp.
 */
export function formatNewPromptsMessage(
  prompts: PromptNotificationItem[],
  options: { baseUrl?: string } = {}
): string {
  if (!prompts || prompts.length === 0) return "";

  const baseUrl = options.baseUrl || "https://www.umcaracaramelo.com.br";
  const count = prompts.length;

  const header =
    count === 1
      ? `🐕⚡ *NOVO PROMPT NO ACERVO DO LAB*\n\nAcabamos de subir 1 novo prompt exclusivo para a plataforma!`
      : `🐕⚡ *NOVO ACERVO LIBERADO NO LAB*\n\nAcabamos de atualizar a plataforma com *${count} novos prompts* prontos para uso!`;

  let body = "";

  if (count <= 6) {
    // Lista detalhada com link direto para cada prompt
    const lines = prompts.map((p) => {
      const link = `${baseUrl}/tools/prompt-library/index.html?prompt=${encodeURIComponent(p.slug)}`;
      return `• *${p.title}* (${p.category})\n  🔗 ${link}`;
    });
    body = `\n\n📦 *O que acabou de entrar:*\n\n` + lines.join("\n\n");
  } else {
    // Lista para muitos prompts (estilo condensado e elegante)
    const topPrompts = prompts.slice(0, 10);
    const remaining = count - topPrompts.length;

    const lines = topPrompts.map((p) => `• *${p.title}* — _${p.category}_`);
    if (remaining > 0) {
      lines.push(`• _... e mais +${remaining} novos prompts adicionados!_`);
    }

    body = `\n\n📦 *Destaques do acervo atualizado:*\n\n` + lines.join("\n");
  }

  const footer =
    `\n\n👉 *Acesse a Biblioteca do LAB e copie agora:*\n` +
    `${baseUrl}/tools/prompt-library/index.html\n\n` +
    `_Bora testar e colocar no ar!_ 🚀`;

  return `${header}${body}${footer}`;
}

/**
 * Envia o aviso de novos prompts para o grupo oficial via UAZAPI.
 */
export async function sendNewPromptsNotification(
  config: UazapiNotificationConfig,
  prompts: PromptNotificationItem[],
  options: { baseUrl?: string } = {}
): Promise<{ success: boolean; count: number; response?: unknown }> {
  if (!prompts || prompts.length === 0) {
    return { success: true, count: 0 };
  }

  if (!config.uazapiUrl || !config.uazapiToken || !config.groupJid) {
    throw new Error(
      "Configuração da UAZAPI incompleta (UAZAPI_URL, UAZAPI_TOKEN ou UAZAPI_GROUP_JID ausentes)."
    );
  }

  const messageText = formatNewPromptsMessage(prompts, options);

  const payload = {
    number: config.groupJid,
    text: messageText,
  };

  const response = await fetch(`${config.uazapiUrl}/send/text`, {
    method: "POST",
    headers: {
      token: config.uazapiToken,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`UAZAPI /send/text falhou (${response.status}): ${errText}`);
  }

  const data = await response.json().catch(() => ({}));
  return { success: true, count: prompts.length, response: data };
}
