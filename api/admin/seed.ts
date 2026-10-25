import type { IncomingMessage, ServerResponse } from "node:http";
import { requireLabAdmin, requireUser, ToolAccessError } from "../../server/toolAccess.ts";
import { runScan } from "../../server/scanner.ts";

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

    return send(res, 400, { error: "Ação não reconhecida." });
  } catch (err: any) {
    if (err instanceof ToolAccessError) {
      return send(res, err.status, { error: err.message, code: err.code });
    }
    return send(res, 500, { error: err.message || "Erro interno." });
  }
}
