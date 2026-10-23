import type { IncomingMessage, ServerResponse } from "node:http";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "0b85653a3fda604ea469fb2723afa5cb";
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const BUCKET = process.env.CLOUDFLARE_R2_BUCKET || "umcaracaramelo";
const PUBLIC_URL = (process.env.CLOUDFLARE_R2_PUBLIC_URL || "https://media.umcaracaramelo.com.br").replace(/\/$/, "");
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://fzhzpzxsttflgtassyex.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6aHpwenhzdHRmbGd0YXNzeWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNTU2NTIsImV4cCI6MjEwNDkzMTY1Mn0.rWO90rI-O8XVOWAlvuylkFWMNpjkocC0HRHBNbmrJj4";

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

  // Verificação de autenticação: impede envio anônimo / abuso de armazenamento
  const authHeader = (req.headers["authorization"] as string) || "";
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) {
    return send(res, 401, { error: "Autenticação necessária para envio de arquivos." });
  }

  const token = tokenMatch[1];
  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!userRes.ok) {
      return send(res, 401, { error: "Sessão inválida ou expirada." });
    }

    const userData = (await userRes.json()) as { id?: string };
    if (!userData.id) {
      return send(res, 401, { error: "Usuário inválido." });
    }

    if (!API_TOKEN) {
      return send(res, 503, { error: "Serviço de upload não configurado: CLOUDFLARE_API_TOKEN ausente." });
    }

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

    if (buffer.length > 10 * 1024 * 1024) {
      return send(res, 413, { error: "O arquivo excede o limite de 10 MB." });
    }

    const contentType = ((req.headers["content-type"] as string) || "image/png").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      return send(res, 400, { error: "Tipo de arquivo não permitido. Apenas imagens são aceitas." });
    }

    const rawFilename = (req.headers["x-filename"] as string) || "banner.png";
    const ext =
      rawFilename.split(".").pop()?.toLowerCase() ||
      (contentType.includes("webp")
        ? "webp"
        : contentType.includes("jpeg") || contentType.includes("jpg")
        ? "jpg"
        : contentType.includes("gif")
        ? "gif"
        : contentType.includes("svg")
        ? "svg"
        : "png");

    const safeUser = userData.id.replace(/[^a-zA-Z0-9_-]/g, "");
    const requestedFolder = ((req.headers["x-folder"] as string) || "avatars").toLowerCase().trim();

    let key: string;

    if (requestedFolder === "tool-banners") {
      // Verificar se o usuário possui papel de administrador no LAB
      const adminRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_lab_admin`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const isAdmin = (await adminRes.json().catch(() => false)) === true;
      if (!isAdmin) {
        return send(res, 403, { error: "Acesso negado: apenas administradores podem alterar banners de ferramentas." });
      }

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
      const errData = await uploadRes.json().catch(() => ({}));
      return send(res, uploadRes.status, { error: "Falha ao enviar para o Cloudflare R2.", details: errData });
    }

    const publicFileUrl = `${PUBLIC_URL}/${key}`;
    return send(res, 200, { ok: true, url: publicFileUrl, key });
  } catch (err) {
    return send(res, 500, { error: err instanceof Error ? err.message : "Erro interno no servidor." });
  }
}
