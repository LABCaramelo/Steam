import type { IncomingMessage, ServerResponse } from "node:http";
import { assertToolAccess, requireLabAdmin, requireUser, ToolAccessError } from "../server/toolAccess.ts";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "0b85653a3fda604ea469fb2723afa5cb";
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const BUCKET = process.env.CLOUDFLARE_R2_BUCKET || "umcaracaramelo";
const PUBLIC_URL = (process.env.CLOUDFLARE_R2_PUBLIC_URL || "https://media.umcaracaramelo.com.br").replace(/\/$/, "");
const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

type Req = IncomingMessage & { body?: unknown };

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Método não permitido." });
  }

  try {
    const access = await requireUser(req);
    const requestedFolder = ((req.headers["x-folder"] as string) || "avatars").toLowerCase().trim();
    if (requestedFolder === "tool-banners") {
      await requireLabAdmin(access);
    } else if (requestedFolder === "media") {
      const slug = String(req.headers["x-tool-slug"] ?? "");
      if (!["claquete", "prancheta", "comunidade"].includes(slug)) {
        return send(res, 403, { error: "Informe a ferramenta responsável por este envio." });
      }
      await assertToolAccess(access, slug);
    } else if (requestedFolder !== "avatars") {
      return send(res, 400, { error: "Destino de upload inválido." });
    }

    if (!API_TOKEN) {
      return send(res, 503, { error: "Serviço de upload não configurado: CLOUDFLARE_API_TOKEN ausente." });
    }

    let buffer: Buffer;

    if (Buffer.isBuffer(req.body)) {
      buffer = req.body;
    } else if (req.body && typeof req.body === "object" && "data" in req.body) {
      const dataStr = (req.body as { data: string }).data;
      if (typeof dataStr !== "string") return send(res, 400, { error: "Arquivo inválido." });
      if (dataStr.length > Math.ceil(MAX_BYTES * 4 / 3) + 256) return send(res, 413, { error: "O arquivo excede o limite de 10 MB." });
      const base64Data = dataStr.replace(/^data:[^;]+;base64,/, "");
      buffer = Buffer.from(base64Data, "base64");
    } else {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += part.length;
        if (size > MAX_BYTES) return send(res, 413, { error: "O arquivo excede o limite de 10 MB." });
        chunks.push(part);
      }
      buffer = Buffer.concat(chunks);
    }

    if (buffer.length === 0) {
      return send(res, 400, { error: "Nenhum arquivo enviado." });
    }

    if (buffer.length > MAX_BYTES) {
      return send(res, 413, { error: "O arquivo excede o limite de 10 MB." });
    }

    const contentType = ((req.headers["content-type"] as string) || "image/png").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      return send(res, 400, { error: "Tipo de arquivo não permitido. Apenas imagens são aceitas." });
    }
    if (contentType === "image/svg+xml" && requestedFolder !== "tool-banners") {
      return send(res, 400, { error: "Use PNG, JPEG, WebP ou GIF neste envio." });
    }

    const ext = ({ "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg" } as Record<string, string>)[contentType];
    const safeUser = access.user.id;

    let key: string;

    if (requestedFolder === "tool-banners") {
      const rawSlug = (req.headers["x-tool-slug"] as string) || "tool";
      const rawKind = (req.headers["x-kind"] as string) || "banner";
      const cleanSlug = rawSlug.replace(/[^a-z0-9_-]/gi, "").toLowerCase();
      const cleanKind = rawKind.replace(/[^a-z0-9_-]/gi, "").toLowerCase();

      key = `tool-banners/${cleanSlug}/${cleanKind}-${Date.now()}.${ext}`;
    } else if (requestedFolder === "media") {
      key = `media/${safeUser}/${Date.now()}.${ext}`;
    } else {
      // Default: avatars
      key = `avatars/${safeUser}/avatar-${Date.now()}.${ext}`;
    }

    const r2Url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${key}`;
    const uploadRes = await fetch(r2Url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": contentType,
      },
      body: buffer,
      signal: AbortSignal.timeout(20_000),
    });

    if (!uploadRes.ok) {
      return send(res, 502, { error: "Falha ao enviar para o Cloudflare R2. Tente novamente." });
    }

    const publicFileUrl = `${PUBLIC_URL}/${key}`;
    return send(res, 200, { ok: true, url: publicFileUrl, key });
  } catch (err) {
    if (err instanceof ToolAccessError) return send(res, err.status, { error: err.message, code: err.code });
    return send(res, 502, { error: "Não foi possível concluir o envio. Tente novamente." });
  }
}
