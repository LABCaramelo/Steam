import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Automação de Boas-Vindas no WhatsApp do LAB Caramelo via UAZAPI.
 *
 * Funcionalidade:
 * 1. Recebe webhook de eventos de grupo da uazapi (`groups` / `action: "add"` ou `"join"`).
 * 2. Valida o JID do grupo oficial do LAB (configurado em UAZAPI_GROUP_JID).
 * 3. Extrai o número do novo membro participante (removendo sufixos de device como :12).
 * 4. Revezamento automático entre múltiplos modelos de mensagens autorais com menção (@novo_membro).
 * 5. Dispara a mensagem formatada para o grupo via API `/send/text` da UAZAPI com parâmetro de menções.
 */

export interface WelcomeTemplate {
  id: string;
  title: string;
  format: (phone: string, name?: string) => string;
}

function formatMention(phone: string, name?: string): string {
  if (name && name.trim()) {
    return `*${name.trim()}*`;
  }
  return `@${phone}`;
}

export const WELCOME_TEMPLATES: WelcomeTemplate[] = [
  {
    id: "puxa-uma-cadeira",
    title: "Acolhedor & Informal (O clássico Caramelo)",
    format: (phone: string, name?: string) => {
      const target = formatMention(phone, name);
      return (
        `Opa, ${target}! Puxa uma cadeira e chega mais. Seja muito bem-vindo(a) ao *LAB Caramelo*! 🐕✨\n\n` +
        `Aqui é o nosso espaço de troca sobre conteúdo, direção criativa, design, IA e projetos reais na prática.\n\n` +
        `Pra começar com o pé direito:\n` +
        `📌 *Dá um pulo na descrição do grupo:* lá estão as regras da comunidade e o link do nosso acervo de ferramentas.\n` +
        `💬 *Manda uma mensagem se apresentando:* conta pra gente quem é você, de onde fala e com o que você trabalha ou gosta de criar?\n\n` +
        `Sinta-se em casa! ☕`
      );
    },
  },
  {
    id: "cerebro-inquieto",
    title: "Repertório & Bastidores",
    format: (phone: string, name?: string) => {
      const target = formatMention(phone, name);
      return (
        `Mais um cérebro inquieto na área! Boas-vindas ao LAB, ${target}! 🚀🎨\n\n` +
        `A gente acredita que *trabalho bom não deveria parecer comum*. O objetivo do grupo é compartilhar referências de alto nível, ferramentas, testes e bastidores sem filtro.\n\n` +
        `Dois passos rápidos de chegada:\n` +
        `1️⃣ *Leia as regras na descrição do grupo* para manter a nossa convivência leve e produtiva.\n` +
        `2️⃣ *Solta uma mensagem se apresentando aqui no chat:* qual é o seu universo criativo e o que você anda construindo ultimamente?\n\n` +
        `Bora trocar repertório! ⚡`
      );
    },
  },
  {
    id: "bancada-de-testes",
    title: "Laboratório & Bancada de Testes",
    format: (phone: string, name?: string) => {
      const target = formatMention(phone, name);
      return (
        `Salve, ${target}! A bancada de testes tá aberta. Seja muito bem-vindo(a)! 🧪✨\n\n` +
        `O *LAB* é onde a gente experimenta de tudo: inteligência artificial, código, narrativa visual e estratégias que tiram ideias do papel.\n\n` +
        `Pra você se enturmar:\n` +
        `👉 *Confira as regras na descrição do grupo:* é jogo rápido e essencial pra manter o foco da comunidade.\n` +
        `👉 *Dá um alô e se apresente pra turma:* seu nome, sua área de atuação e qual curiosidade te trouxe até aqui!\n\n` +
        `Chega junto que a conversa aqui não para! 🔥`
      );
    },
  },
  {
    id: "primeiro-a-intencao",
    title: "Filosofia Caramelo (Primeiro a Intenção)",
    format: (phone: string, name?: string) => {
      const target = formatMention(phone, name);
      return (
        `Olá, ${target}! Que massa ter você com a gente no *LAB Caramelo*! 🤝\n\n` +
        `A nossa regra de ouro é: *primeiro a intenção, depois a ferramenta*. Se você curte criar com propósito, debater ideias e explorar o futuro da comunicação, você tá no lugar certo.\n\n` +
        `Recadinhos rápidos:\n` +
        `📖 *Dê uma lida nas regras na descrição do grupo:* lá também tem links úteis da comunidade.\n` +
        `🎙️ *Apresente-se pra gente:* de onde você é, o que faz no dia a dia e o que anda estudando ou criando?\n\n` +
        `A casa é sua! 💡`
      );
    },
  },
  {
    id: "sem-cracha",
    title: "Direto ao Ponto & Sem Crachá",
    format: (phone: string, name?: string) => {
      const target = formatMention(phone, name);
      return (
        `Opa, ${target}, tudo bem? Seja muito bem-vindo(a) ao grupo! 👋🐕\n\n` +
        `Aqui no LAB ninguém precisa parecer corporativo demais: o foco é trocar ideias de verdade entre criadores, designers, desenvolvedores e cabeças inquietas.\n\n` +
        `Pra entrar na sintonia:\n` +
        `⚠️ *Não deixe de ler as regrinhas na descrição do grupo* (respeito e troca genuína em primeiro lugar).\n` +
        `🙋 *Manda um alô se apresentando:* quem é você, qual seu projeto do momento e que assunto mais faz seus olhos brilharem por aqui?\n\n` +
        `Bora pra cima! ⚡`
      );
    },
  },
  {
    id: "pasta-de-salvos",
    title: "De Pasta de Salvos a Trabalho Real",
    format: (phone: string, name?: string) => {
      const target = formatMention(phone, name);
      return (
        `Boas-vindas ao LAB, ${target}! 🎉✨\n\n` +
        `O propósito desta comunidade é simples: transformar pastas de referências salvas em projetos reais, com direção e identidade.\n\n` +
        `Antes de qualquer coisa:\n` +
        `🔍 *Passe na descrição do grupo e leia as regras* da comunidade.\n` +
        `💬 *Mande uma mensagem se apresentando:* seu nome, qual a sua área de criação e que tipo de desafio você mais curte resolver?\n\n` +
        `Muito bom ter você somando na nossa comunidade! 🚀`
      );
    },
  },
];

let globalTemplateCounter = 0;

/**
 * Seleciona o próximo template na rotação cíclica.
 * Pode receber um índice forçado (útil para testes ou preview).
 */
export function getNextWelcomeTemplate(forcedIndex?: number): { template: WelcomeTemplate; index: number } {
  if (typeof forcedIndex === "number" && forcedIndex >= 0 && forcedIndex < WELCOME_TEMPLATES.length) {
    return { template: WELCOME_TEMPLATES[forcedIndex], index: forcedIndex };
  }
  const index = globalTemplateCounter % WELCOME_TEMPLATES.length;
  globalTemplateCounter++;
  return { template: WELCOME_TEMPLATES[index], index };
}

export interface GroupJoinParticipant {
  phone: string;
  name?: string;
  raw: string;
}

export interface GroupJoinEvent {
  groupJid: string;
  action: "add" | "join";
  participants: string[]; // apenas dígitos numéricos para menções (ex: "5531985869015")
  rawParticipants: string[];
  participantDetails?: GroupJoinParticipant[];
}

function cleanDigits(value: unknown): string | null {
  if (typeof value === "string") {
    // Remove sufixo de servidor (@s.whatsapp.net) e sufixo de device (:12)
    const withoutServer = value.split("@")[0].trim();
    const withoutDevice = withoutServer.split(":")[0].trim();
    const raw = withoutDevice.replace(/\D/g, "");
    return raw.length >= 8 ? raw : null;
  }
  if (value && typeof value === "object" && "id" in value && typeof (value as { id: unknown }).id === "string") {
    const withoutServer = (value as { id: string }).id.split("@")[0].trim();
    const withoutDevice = withoutServer.split(":")[0].trim();
    const raw = withoutDevice.replace(/\D/g, "");
    return raw.length >= 8 ? raw : null;
  }
  return null;
}

function extractItemName(item: unknown): string | undefined {
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    for (const key of ["name", "pushName", "notify", "DisplayName", "wa_name", "wa_contactName"]) {
      if (typeof obj[key] === "string" && (obj[key] as string).trim()) {
        return (obj[key] as string).trim();
      }
    }
  }
  return undefined;
}

/**
 * Analisa o payload HTTP recebido pelo webhook da UAZAPI e extrai
 * o evento de novos membros se for uma adição ou entrada no grupo.
 */
export function parseGroupJoinEvent(body: unknown): GroupJoinEvent | null {
  if (!body || typeof body !== "object") return null;

  const payload = body as Record<string, unknown>;
  const data = (payload.data && typeof payload.data === "object" ? payload.data : payload) as Record<string, unknown>;

  // Detecta ação
  const rawAction = String(data.action || payload.action || data.actionType || "").toLowerCase();
  const isJoin = rawAction === "add" || rawAction === "join" || rawAction === "invite";
  if (!isJoin) return null;

  // Detecta JID do grupo
  const groupJid = String(data.jid || data.id || data.groupId || payload.jid || payload.group || payload.chatId || "").trim();
  if (!groupJid.endsWith("@g.us")) return null;

  // Extrai participantes
  const listRaw = Array.isArray(data.participants)
    ? data.participants
    : Array.isArray(payload.participants)
    ? payload.participants
    : data.participant
    ? [data.participant]
    : payload.participant
    ? [payload.participant]
    : [];

  const participants: string[] = [];
  const rawParticipants: string[] = [];
  const participantDetails: GroupJoinParticipant[] = [];

  // Verifica se há perfil nos campos de nível superior do webhook
  const fallbackSingleName =
    typeof data.pushName === "string"
      ? data.pushName.trim()
      : typeof payload.pushName === "string"
      ? payload.pushName.trim()
      : undefined;

  for (const item of listRaw) {
    const digits = cleanDigits(item);
    if (digits && !participants.includes(digits)) {
      participants.push(digits);
      const raw = typeof item === "string" ? item : JSON.stringify(item);
      rawParticipants.push(raw);
      const name = extractItemName(item) || (listRaw.length === 1 ? fallbackSingleName : undefined);
      participantDetails.push({ phone: digits, name, raw });
    }
  }

  if (participants.length === 0) return null;

  return {
    groupJid,
    action: "add",
    participants,
    rawParticipants,
    participantDetails,
  };
}

export interface UazapiConfig {
  uazapiUrl: string;
  uazapiToken: string;
  groupJid: string;
  webhookSecret?: string;
}

export function getUazapiConfig(): UazapiConfig {
  return {
    uazapiUrl: (process.env.UAZAPI_URL || "").replace(/\/+$/, ""),
    uazapiToken: process.env.UAZAPI_TOKEN || "",
    groupJid: (process.env.UAZAPI_GROUP_JID || "").trim(),
    webhookSecret: process.env.UAZAPI_WEBHOOK_SECRET || "",
  };
}

/**
 * Busca o nome de perfil do usuário no WhatsApp via UAZAPI.
 * 1. Se já fornecido pelo webhook, usa de imediato.
 * 2. Consulta /group/info (participantes e seus perfis com nome).
 * 3. Consulta /chat/find como fallback de perfil.
 * 4. Retorna null se não houver nome público configurado.
 */
export async function resolveMemberName(
  config: UazapiConfig,
  groupJid: string,
  phone: string,
  initialName?: string
): Promise<string | null> {
  if (initialName && initialName.trim()) {
    return initialName.trim();
  }

  if (!config.uazapiUrl || !config.uazapiToken) {
    return null;
  }

  const cleanTarget = phone.replace(/\D/g, "");

  // 1. Tenta POST /group/info
  try {
    const res = await fetch(`${config.uazapiUrl}/group/info`, {
      method: "POST",
      headers: {
        token: config.uazapiToken,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ groupJid }),
      signal: AbortSignal.timeout(5_000),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        participant_profiles?: Array<{ pn?: string; jid?: string; name?: string }>;
      };
      const profiles = data.participant_profiles || [];
      for (const p of profiles) {
        const pNum = (p.pn || p.jid || "").split("@")[0].replace(/\D/g, "");
        if (pNum && (pNum === cleanTarget || pNum.endsWith(cleanTarget.slice(-8)))) {
          if (p.name && p.name.trim()) {
            return p.name.trim();
          }
        }
      }
    }
  } catch {
    // Silencioso para não travar o envio de boas-vindas
  }

  // 2. Fallback: POST /chat/find
  try {
    const res = await fetch(`${config.uazapiUrl}/chat/find`, {
      method: "POST",
      headers: {
        token: config.uazapiToken,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ wa_chatid: `${cleanTarget}@s.whatsapp.net` }),
      signal: AbortSignal.timeout(5_000),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        chats?: Array<{ wa_name?: string; name?: string; wa_contactName?: string; lead_name?: string }>;
      };
      const chat = (data.chats || [])[0];
      if (chat) {
        const found = chat.wa_name || chat.name || chat.wa_contactName || chat.lead_name;
        if (found && found.trim()) {
          return found.trim();
        }
      }
    }
  } catch {
    // Silencioso para não travar o envio de boas-vindas
  }

  return null;
}

/**
 * Envia mensagem para o grupo mencionando os novos membros participantes.
 */
export async function sendWelcomeToGroup(
  config: UazapiConfig,
  event: GroupJoinEvent,
  forcedTemplateIndex?: number
): Promise<{ success: boolean; messagesSent: number; templateId: string; responseText?: string; resolvedNames?: Record<string, string> }> {
  if (!config.uazapiUrl || !config.uazapiToken) {
    throw new Error("UAZAPI_URL e UAZAPI_TOKEN não foram configurados no ambiente.");
  }

  let count = 0;
  let lastTemplateId = "";
  const resolvedNames: Record<string, string> = {};

  for (const phone of event.participants) {
    const detail = event.participantDetails?.find((d) => d.phone === phone);
    const memberName = await resolveMemberName(config, event.groupJid, phone, detail?.name);
    if (memberName) {
      resolvedNames[phone] = memberName;
    }

    const { template } = getNextWelcomeTemplate(forcedTemplateIndex);
    lastTemplateId = template.id;
    const messageText = template.format(phone, memberName || undefined);

    const payload = {
      number: event.groupJid,
      text: messageText,
      mentions: phone,
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
      throw new Error(`UAZAPI /send/text falhou com status ${response.status}: ${errText}`);
    }

    count++;
  }

  return { success: true, messagesSent: count, templateId: lastTemplateId, resolvedNames };
}

type Req = Pick<IncomingMessage, "method" | "headers"> & AsyncIterable<unknown> & { body?: unknown };

async function readJson(req: Req): Promise<unknown> {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function replyJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

/**
 * Manipulador HTTP universal para o Webhook da UAZAPI.
 * Compatível com Vercel Serverless Function e middleware Vite/Node local.
 */
export async function handleWhatsAppWebhook(req: Req, res: ServerResponse): Promise<void> {
  // Verificação de método
  if (req.method === "GET") {
    // Healthcheck / Verificação de endpoint ativo
    return replyJson(res, 200, {
      status: "online",
      service: "lab-caramelo-whatsapp-welcome",
      templatesAvailable: WELCOME_TEMPLATES.length,
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return replyJson(res, 405, { error: "Método não permitido." });
  }

  const config = getUazapiConfig();

  // Opcional: validação de token secreto no header (ex: x-webhook-secret ou Authorization)
  if (config.webhookSecret) {
    const headerSecret = (req.headers["x-webhook-secret"] || req.headers["x-api-key"] || "").toString();
    if (headerSecret !== config.webhookSecret) {
      return replyJson(res, 401, { error: "Webhook secret inválido." });
    }
  }

  try {
    const body = await readJson(req);
    const event = parseGroupJoinEvent(body);

    if (!event) {
      // Eventos normais que não sejam de novo membro no grupo (ex: mensagens comuns, saídas, etc.)
      return replyJson(res, 200, {
        ignored: true,
        reason: "Evento não é de entrada de participante em grupo (@g.us).",
      });
    }

    // Se um JID de grupo específico foi configurado, valida se é o grupo do LAB
    if (config.groupJid && event.groupJid !== config.groupJid) {
      return replyJson(res, 200, {
        ignored: true,
        reason: `Evento pertence a outro grupo (${event.groupJid}). Grupo monitorado: ${config.groupJid}`,
      });
    }

    // Dispara a mensagem com menção e rotação de template
    const result = await sendWelcomeToGroup(config, event);

    return replyJson(res, 200, {
      received: true,
      action: "welcome_sent",
      ...result,
      participants: event.participants,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[WhatsAppWebhook] Erro ao processar evento:", message);
    return replyJson(res, 500, { error: message });
  }
}
