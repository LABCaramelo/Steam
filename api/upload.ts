import type { IncomingMessage, ServerResponse } from "node:http";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "0b85653a3fda604ea469fb2723afa5cb";
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const BUCKET = process.env.CLOUDFLARE_R2_BUCKET || "umcaracaramelo";
const PUBLIC_URL = (process.env.CLOUDFLARE_R2_PUBLIC_URL || "https://media.umcaracaramelo.com.br").replace(/\/$/, "");

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

  if (!API_TOKEN) {
    return send(res, 503, { error: "Serviço de upload não configurado: CLOUDFLARE_API_TOKEN ausente." });
  }

  try {
    let buffer: Buffer;

    if (Buffer.isBuffer(req.body)) {
      buffer = req.body;
    } else if (req.body && typeof req.body === "object" && "data" in req.body) {
      const dataStr = (req.body as { data: string }).data;
      const base64Data = dataStr.replace(/^data:[^;]+;base64,/, "");
      buffer = Buffer.from(base64Data, "base64");
    } else {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      buffer = Buffer.concat(chunks);
    }

    if (buffer.length === 0) {
      return send(res, 400, { error: "Nenhum arquivo enviado." });
    }

    if (buffer.length > 5 * 1024 * 1024) {
      return send(res, 413, { error: "O arquivo excede o limite de 5 MB." });
    }

    const contentType = ((req.headers["content-type"] as string) || "image/png").split(";")[0].trim().toLowerCase();
    const rawFilename = (req.headers["x-filename"] as string) || "avatar.png";
    const ext =
      rawFilename.split(".").pop()?.toLowerCase() ||
      (contentType.includes("webp")
        ? "webp"
        : contentType.includes("jpeg") || contentType.includes("jpg")
        ? "jpg"
        : contentType.includes("gif")
        ? "gif"
        : "png");
    const userId = (req.headers["x-user-id"] as string) || "user";
    const folder = (req.headers["x-folder"] as string) || "avatars";

    const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "");
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "");
    const key = `${safeFolder}/${safeUser ? `${safeUser}/` : ""}avatar-${Date.now()}.${ext}`;

    const r2Url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${key}`;
    const uploadRes = await fetch(r2Url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": contentType.startsWith("image/") ? contentType : "image/png",
      },
      body: buffer,
    });

    if (!uploadRes.ok) {
      const errData = await uploadRes.json().catch(() => ({}));
      return send(res, uploadRes.status, { error: "Falha ao enviar para o Cloudflare R2.", details: errData });
    }

    const publicFileUrl = `${PUBLIC_URL}/${key}`;
    return send(res, 200, { ok: true, url: publicFileUrl, key });
  } catch (err) {
    return send(res, 500, { error: err instanceof Error ? err.message : "Erro interno no servidor." });
  }
}
