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

function formatMention(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `@${digits}`;
}

export const WELCOME_TEMPLATES: WelcomeTemplate[] = [
  {
    id: "puxa-uma-cadeira",
    title: "Acolhedor & Informal (O clássico Caramelo)",
    format: (phone: string) => {
      const target = formatMention(phone);
      return (
        `Opa, ${target}! Puxa uma cadeira e chega mais. Boas-vindas ao *LAB Caramelo*! 🐕✨\n\n` +
        `Dá uma olhada rápida nas regras na descrição do grupo e manda uma mensagem aqui se apresentando!`
      );
    },
  },
  {
    id: "cerebro-inquieto",
    title: "Repertório & Bastidores",
    format: (phone: string) => {
      const target = formatMention(phone);
      return (
        `Mais um cérebro inquieto na área! Boas-vindas ao *LAB Caramelo*, ${target}! 🚀🎨\n\n` +
        `Confere as regras na descrição do grupo e se apresente contando quem é você e o que anda criando.`
      );
    },
  },
  {
    id: "bancada-de-testes",
    title: "Laboratório & Bancada de Testes",
    format: (phone: string) => {
      const target = formatMention(phone);
      return (
        `Salve, ${target}! A bancada de testes tá aberta. Seja muito bem-vindo(a) ao *LAB*! 🧪⚡\n\n` +
        `Dá um pulo na descrição do grupo pras regras e solta uma mensagem se apresentando pra turma!`
      );
    },
  },
  {
    id: "primeiro-a-intencao",
    title: "Filosofia Caramelo (Primeiro a Intenção)",
    format: (phone: string) => {
      const target = formatMention(phone);
      return (
        `Olá, ${target}! Que bom ter você com a gente no *LAB Caramelo*! 💡\n\n` +
        `Passe na descrição do grupo pra ver as regras e solta um alô se apresentando: de onde você é e o que curte criar!`
      );
    },
  },
  {
    id: "sem-cracha",
    title: "Direto ao Ponto & Sem Crachá",
    format: (phone: string) => {
      const target = formatMention(phone);
      return (
        `Opa, ${target}! Seja muito bem-vindo(a) ao *LAB*! 👋🐕\n\n` +
        `Dá uma conferida nas regras na descrição do grupo e se apresenta por aqui: qual é o seu universo criativo?`
      );
    },
  },
  {
    id: "pasta-de-salvos",
    title: "De Pasta de Salvos a Trabalho Real",
    format: (phone: string) => {
      const target = formatMention(phone);
      return (
        `Boas-vindas ao *LAB Caramelo*, ${target}! 🎉✨\n\n` +
        `Aqui é lugar de tirar ideia do papel. Confere as regras na descrição e manda uma mensagem se apresentando!`
      );
    },
  },
  {
    id: "mao-na-massa",
    title: "Mão na Massa & Construção Prática",
    format: (phone: string) => {
      const target = formatMention(phone);
      return (
        `Chegou na hora certa, ${target}! Boas-vindas ao *LAB Caramelo*! ⚡🛠️\n\n` +
        `Dá uma passada rápida nas regras na descrição do grupo e se apresente: conta com o que você trabalha ou gosta de criar!`
      );
    },
  },
  {
    id: "ecossistema-criativo",
    title: "Ecossistema & Troca Real",
    format: (phone: string) => {
      const target = formatMention(phone);
      return (
        `Muito bom ter você por aqui, ${target}! Boas-vindas ao *LAB Caramelo*! 🐕💫\n\n` +
        `Dá uma olhada nas regras na descrição do grupo e solta um alô se apresentando pra turma!`
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
  participants: string[]; // dígitos numéricos para menções (ex: "5531985869015" ou LID)
  rawParticipants: string[];
  participantDetails?: GroupJoinParticipant[];
}

function cleanDigits(value: unknown): string | null {
  if (typeof value === "string") {
    // Pode vir como 5531985869015@s.whatsapp.net, 261211841101990@lid, ou 5531985869015:12@s.whatsapp.net
    const withoutServer = value.split("@")[0].trim();
    const withoutDevice = withoutServer.split(":")[0].trim();
    const raw = withoutDevice.replace(/\D/g, "");
    return raw.length >= 8 ? raw : null;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of ["id", "jid", "user", "phone", "pn", "number"]) {
      if (typeof obj[key] === "string") {
        const res = cleanDigits(obj[key]);
        if (res) return res;
      }
    }
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
  const eventObj = (payload.event && typeof payload.event === "object" ? payload.event : null) as Record<string, unknown> | null;

  // Detecta listas específicas de entrada/saída (formato nativo UAZAPI event.Join / event.Leave)
  const joinList = Array.isArray(eventObj?.Join)
    ? eventObj.Join
    : Array.isArray(data.Join)
    ? data.Join
    : Array.isArray(eventObj?.join)
    ? eventObj.join
    : Array.isArray(data.join)
    ? data.join
    : null;

  const leaveList = Array.isArray(eventObj?.Leave)
    ? eventObj.Leave
    : Array.isArray(data.Leave)
    ? data.Leave
    : Array.isArray(eventObj?.leave)
    ? eventObj.leave
    : Array.isArray(data.leave)
    ? data.leave
    : null;

  // Se for explicitamente saída na lista nativa da UAZAPI e não tiver ninguém entrando
  if (leaveList && leaveList.length > 0 && (!joinList || joinList.length === 0)) {
    return null;
  }

  // Detecta ação
  const rawAction = String(
    eventObj?.action ||
      data.action ||
      payload.action ||
      data.actionType ||
      data.subType ||
      eventObj?.JoinReason ||
      eventObj?.Notify ||
      data.type ||
      payload.type ||
      ""
  ).toLowerCase().trim();

  // Ignora ações explícitas de saída
  const isLeave =
    rawAction === "remove" ||
    rawAction === "leave" ||
    rawAction === "left" ||
    rawAction === "kick" ||
    rawAction === "delete" ||
    rawAction === "promote" ||
    rawAction === "demote";
  if (isLeave) return null;

  // Ações que configuram entrada no grupo
  const eventName = (
    typeof payload.event === "string"
      ? payload.event
      : typeof payload.EventType === "string"
      ? payload.EventType
      : typeof payload.eventType === "string"
      ? payload.eventType
      : typeof data.event === "string"
      ? data.event
      : ""
  ).toLowerCase();

  const isJoinAction =
    (joinList && joinList.length > 0) ||
    rawAction === "add" ||
    rawAction === "join" ||
    rawAction === "joined" ||
    rawAction === "invite" ||
    rawAction === "invited" ||
    rawAction === "invite_link" ||
    rawAction === "linked_group_join" ||
    rawAction === "member_add" ||
    rawAction === "participant_add" ||
    rawAction === "approval" ||
    rawAction.includes("add") ||
    rawAction.includes("join") ||
    rawAction.includes("invite");

  // Se não foi informada uma ação explícita, mas o evento é de grupo e temos participantes
  const isGroupEvent =
    eventName === "groups" ||
    eventName === "group" ||
    eventName.includes("participant") ||
    eventName.includes("group");

  if (!isJoinAction && !isGroupEvent && rawAction !== "") return null;

  // Detecta JID do grupo
  const rawGroupJid = String(
    eventObj?.JID ||
      eventObj?.jid ||
      data.jid ||
      data.id ||
      data.groupId ||
      data.groupJid ||
      data.group_jid ||
      data.chatId ||
      data.chat ||
      data.remoteJid ||
      payload.jid ||
      payload.id ||
      payload.groupId ||
      payload.groupJid ||
      payload.group ||
      payload.chatId ||
      ""
  ).trim();

  if (!rawGroupJid.includes("@g.us")) return null;
  const groupJid = rawGroupJid.split(":")[0].replace(/@.*$/, "") + "@g.us";

  // Extrai participantes
  const listRaw =
    joinList && joinList.length > 0
      ? joinList
      : Array.isArray(data.participants)
      ? data.participants
      : Array.isArray(payload.participants)
      ? payload.participants
      : data.participant
      ? [data.participant]
      : payload.participant
      ? [payload.participant]
      : Array.isArray(data.users)
      ? data.users
      : data.user
      ? [data.user]
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
      : typeof eventObj?.pushName === "string"
      ? (eventObj.pushName as string).trim()
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

export interface ResolvedMember {
  phone: string; // número limpo para menção (ex: 553188015544)
  name?: string;  // nome público de perfil se houver
}

/**
 * Busca o nome e o número real do participante no WhatsApp via UAZAPI.
 * Mapeia LID (@lid) para número de telefone real (PN) e extrai o nome do perfil.
 */
export async function resolveMemberDetails(
  config: UazapiConfig,
  groupJid: string,
  rawPhoneOrLid: string,
  initialName?: string
): Promise<ResolvedMember> {
  const cleanTarget = rawPhoneOrLid.replace(/\D/g, "");
  let resolvedName = initialName && initialName.trim() ? initialName.trim() : undefined;
  let resolvedPhone = cleanTarget;

  if (!config.uazapiUrl || !config.uazapiToken) {
    return { phone: resolvedPhone, name: resolvedName };
  }

  // 1. Tenta POST /group/info para mapear LID -> PN e capturar Name
  try {
    const res = await fetch(`${config.uazapiUrl}/group/info`, {
      method: "POST",
      headers: {
        token: config.uazapiToken,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ groupJid }),
      signal: AbortSignal.timeout(6_000),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        participant_profiles?: Array<{ pn?: string; jid?: string; lid?: string; name?: string }>;
      };
      const profiles = data.participant_profiles || [];
      for (const p of profiles) {
        const pLid = (p.lid || p.jid || "").split("@")[0].replace(/\D/g, "");
        const pPn = (p.pn || "").split("@")[0].replace(/\D/g, "");

        const matchesLid = pLid && (pLid === cleanTarget || pLid.endsWith(cleanTarget));
        const matchesPn = pPn && (pPn === cleanTarget || pPn.endsWith(cleanTarget.slice(-8)));

        if (matchesLid || matchesPn) {
          if (pPn && pPn.length >= 8) {
            resolvedPhone = pPn;
          }
          if (!resolvedName && p.name && p.name.trim()) {
            resolvedName = p.name.trim();
          }
          break;
        }
      }
    }
  } catch {
    // Silencioso para não travar o envio de boas-vindas
  }

  // 2. Se ainda não tiver nome, tenta POST /chat/find usando o número resolvido
  if (!resolvedName) {
    try {
      const res = await fetch(`${config.uazapiUrl}/chat/find`, {
        method: "POST",
        headers: {
          token: config.uazapiToken,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ wa_chatid: `${resolvedPhone}@s.whatsapp.net` }),
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
            resolvedName = found.trim();
          }
        }
      }
    } catch {
      // Silencioso para não travar o envio de boas-vindas
    }
  }

  return { phone: resolvedPhone, name: resolvedName };
}

/**
 * Retorna o nome do membro (compatibilidade com versões anteriores).
 */
export async function resolveMemberName(
  config: UazapiConfig,
  groupJid: string,
  phone: string,
  initialName?: string
): Promise<string | null> {
  const details = await resolveMemberDetails(config, groupJid, phone, initialName);
  return details.name || null;
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

  for (const rawPhone of event.participants) {
    const detail = event.participantDetails?.find((d) => d.phone === rawPhone);
    const member = await resolveMemberDetails(config, event.groupJid, rawPhone, detail?.name);
    const finalPhone = member.phone || rawPhone;

    if (member.name) {
      resolvedNames[rawPhone] = member.name;
      resolvedNames[finalPhone] = member.name;
    }

    const { template } = getNextWelcomeTemplate(forcedTemplateIndex);
    lastTemplateId = template.id;
    const messageText = template.format(finalPhone, member.name);

    const payload = {
      number: event.groupJid,
      text: messageText,
      mentions: finalPhone,
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
  if (typeof req.body === "string" && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
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
    console.log("[WhatsAppWebhook] Payload recebido:", JSON.stringify(body));

    const event = parseGroupJoinEvent(body);

    if (!event) {
      console.log("[WhatsAppWebhook] Evento ignorado (não é entrada de participante):", JSON.stringify(body));
      return replyJson(res, 200, {
        ignored: true,
        reason: "Evento não é de entrada de participante em grupo (@g.us).",
      });
    }

    // Se um JID de grupo específico foi configurado, valida se é o grupo do LAB (ignorando sufixos)
    if (config.groupJid) {
      const targetClean = config.groupJid.split(":")[0].replace(/@.*$/, "");
      const eventClean = event.groupJid.split(":")[0].replace(/@.*$/, "");
      if (targetClean && eventClean !== targetClean) {
        console.log(`[WhatsAppWebhook] Evento ignorado (grupo diferente: ${event.groupJid}, monitorado: ${config.groupJid})`);
        return replyJson(res, 200, {
          ignored: true,
          reason: `Evento pertence a outro grupo (${event.groupJid}). Grupo monitorado: ${config.groupJid}`,
        });
      }
    }

    console.log("[WhatsAppWebhook] Processando boas-vindas para participantes:", event.participants);

    // Dispara a mensagem com menção e rotação de template
    const result = await sendWelcomeToGroup(config, event);
    console.log("[WhatsAppWebhook] Boas-vindas enviadas com sucesso:", result);

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
