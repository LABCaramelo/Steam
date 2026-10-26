import type { IncomingMessage, ServerResponse } from "node:http";
import { requireLabAdmin, requireUser, ToolAccessError } from "../../server/toolAccess.ts";
import { runScan } from "../../server/scanner.ts";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://fzhzpzxsttflgtassyex.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6aHpwenhzdHRmbGd0YXNzeWV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTM1NTY1MiwiZXhwIjoyMTA0OTMxNjUyfQ.oAqUzsOayHlvhf639LoletvA350gklOZbWz8OfYMzhg";

type Req = IncomingMessage & { body?: unknown };

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function readBodyJson(req: IncomingMessage): Promise<Record<string, any>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const str = Buffer.concat(chunks).toString("utf8").trim();
  if (!str) return {};
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Método não permitido." });
  }

  try {
    const access = await requireUser(req);
    await requireLabAdmin(access);

    let body: any = req.body;
    if (!body || typeof body !== "object") {
      body = await readBodyJson(req);
    }

    const action = body?.action;

    if (action === "verify-now") {
      const publicationId = body?.publication_id;
      if (!publicationId || typeof publicationId !== "string") {
        return send(res, 400, { error: "publication_id é obrigatório." });
      }
      const scanResult = await runScan({ publicationId, limit: 1, force: true });
      return send(res, 200, { success: true, scanResult });
    }

    if (action === "scan-batch") {
      const limit = Number(body?.limit || 10);
      const scanResult = await runScan({ limit, force: false });
      return send(res, 200, { success: true, scanResult });
    }

    if (action === "delete-publication") {
      const publicationId = body?.publication_id;
      if (!publicationId || typeof publicationId !== "string") {
        return send(res, 400, { error: "publication_id é obrigatório." });
      }
      const delRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_caramelo_publication_admin`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_id: publicationId }),
      });
      const data = await delRes.json();
      if (!delRes.ok) {
        return send(res, 400, { error: data?.message || "Falha ao remover publicação." });
      }
      return send(res, 200, { success: true, ...data });
    }

    if (action === "purge-inactive") {
      const olderThanDays = typeof body?.older_than_days === "number" ? body.older_than_days : null;
      const purgeRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/purge_caramelo_inactive_publications`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_older_than_days: olderThanDays,
          p_statuses: ["offline", "not_confirmed"],
        }),
      });
      const data = await purgeRes.json();
      if (!purgeRes.ok) {
        return send(res, 400, { error: data?.message || "Falha ao limpar publicações inativas." });
      }
      return send(res, 200, { success: true, ...data });
    }

    return send(res, 400, { error: "Ação não reconhecida." });
  } catch (err: any) {
    if (err instanceof ToolAccessError) {
      return send(res, err.status, { error: err.message, code: err.code });
    }
    return send(res, 500, { error: err.message || "Erro interno." });
  }
}
