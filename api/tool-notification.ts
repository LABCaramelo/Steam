import type { IncomingMessage, ServerResponse } from "node:http";
import {
  getUazapiNotificationConfig,
  sendNewToolNotification,
  buildToolNotificationData,
  formatNewToolMessage,
} from "../server/toolNotification.ts";
import { requireUser, rpcHeaders, ToolAccessError, type AuthenticatedRequest } from "../server/toolAccess.ts";

export const config = { maxDuration: 30 };

type Req = Pick<IncomingMessage, "method" | "headers"> & AsyncIterable<unknown> & { body?: unknown };

async function readJson(req: Req): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === "object") return req.body as Record<string, unknown>;
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

function reply(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

export default async function handler(req: Req, res: ServerResponse): Promise<void> {
  if (req.method === "GET") {
    return reply(res, 200, {
      status: "online",
      service: "lab-caramelo-tool-notification",
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return reply(res, 405, { error: "Método não permitido." });
  }

  // 1. Verificação de autorização (Bearer token de Admin do Supabase ou Secret no header)
  const webhookSecret = process.env.UAZAPI_WEBHOOK_SECRET || process.env.ADMIN_SECRET || "";
  const headerSecret = (req.headers["x-admin-secret"] || req.headers["x-webhook-secret"] || "").toString();
  const hasSecretAuth = Boolean(webhookSecret && headerSecret === webhookSecret);
  let userAccess: AuthenticatedRequest | undefined;

  if (!hasSecretAuth) {
    try {
      userAccess = await requireUser(req);
      // Valida se o usuário tem privilégio de administrador chamando admin_get_stats no Supabase
      const checkRes = await fetch(`${userAccess.supabaseUrl}/rest/v1/rpc/admin_get_stats`, {
        method: "POST",
        headers: rpcHeaders(userAccess),
        signal: AbortSignal.timeout(10_000),
      });

      if (!checkRes.ok) {
        return reply(res, 403, {
          error: "Acesso restrito: apenas administradores do LAB podem disparar avisos no grupo.",
        });
      }
    } catch (err) {
      if (err instanceof ToolAccessError) {
        return reply(res, err.status, { error: err.message });
      }
      return reply(res, 401, { error: "Autenticação necessária para notificar o grupo." });
    }
  }

  // 2. Extrai dados do corpo da requisição
  try {
    const body = await readJson(req);
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";

    if (!slug) {
      return reply(res, 400, { error: "O campo 'slug' da ferramenta é obrigatório." });
    }

    let stage = typeof body.stage === "string" && body.stage.trim() ? body.stage.trim() : undefined;

    // Se o estágio não foi informado explicitamente, busca o estágio real na tabela lab_tools
    if (!stage && userAccess) {
      try {
        const toolRes = await fetch(
          `${userAccess.supabaseUrl}/rest/v1/lab_tools?slug=eq.${encodeURIComponent(slug)}&select=slug,name,stage`,
          {
            headers: rpcHeaders(userAccess),
            signal: AbortSignal.timeout(5_000),
          }
        );
        if (toolRes.ok) {
          const list = (await toolRes.json()) as Array<{ slug: string; name: string; stage?: string }>;
          if (Array.isArray(list) && list[0]?.stage) {
            stage = list[0].stage;
          }
        }
      } catch {
        // Fallback para catálogo local
      }
    }

    const toolInput = {
      slug,
      name: typeof body.name === "string" ? body.name : undefined,
      category: typeof body.category === "string" ? body.category : undefined,
      tagline: typeof body.tagline === "string" ? body.tagline : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      customNote: typeof body.customNote === "string" ? body.customNote : undefined,
      stage,
    };

    // Modo preview (não envia, apenas devolve o texto formatado)
    if (body.preview === true) {
      const toolData = buildToolNotificationData(toolInput);
      const previewText = formatNewToolMessage(toolData);
      return reply(res, 200, {
        preview: true,
        tool: toolData,
        message: previewText,
      });
    }

    const uazapiConfig = getUazapiNotificationConfig();
    if (!uazapiConfig.uazapiUrl || !uazapiConfig.uazapiToken || !uazapiConfig.groupJid) {
      return reply(res, 500, {
        error: "Configuração da UAZAPI ausente no ambiente do servidor.",
      });
    }

    const result = await sendNewToolNotification(uazapiConfig, toolInput);

    return reply(res, 200, {
      success: true,
      action: "tool_notification_sent",
      tool: result.tool.name,
      slug: result.tool.slug,
      stage: result.tool.stage,
      message: result.message,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao processar notificação";
    console.error("[ToolNotification] Erro:", message);
    return reply(res, 500, { error: message });
  }
}
