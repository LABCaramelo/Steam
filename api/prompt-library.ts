import type { IncomingMessage } from "node:http";
import catalog from "./data/prompt-catalog.json" with { type: "json" };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://fzhzpzxsttflgtassyex.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6aHpwenhzdHRmbGd0YXNzeWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNTU2NTIsImV4cCI6MjEwNDkzMTY1Mn0.rWO90rI-O8XVOWAlvuylkFWMNpjkocC0HRHBNbmrJj4";
const getCopyOrigin = () => process.env.PROMPT_LIBRARY_ORIGIN;
const SERVICE_UNAVAILABLE = "O serviço de textos está indisponível. Você pode continuar explorando o acervo e tentar novamente mais tarde.";

export interface PromptLibraryResponse {
  statusCode: number;
  setHeader: (name: string, value: string) => unknown;
  end: (body: string) => unknown;
}

function reply(res: PromptLibraryResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", status === 200
    ? "public, max-age=0, s-maxage=300, stale-while-revalidate=600"
    : "no-store");
  res.end(JSON.stringify(data));
}

/** Public catalog and prompt-text proxy connected to Supabase and shared by the local server and Vercel. */
export async function promptLibrary(
  req: Pick<IncomingMessage, "method" | "url">,
  res: PromptLibraryResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return reply(res, 405, { error: "Método não permitido." });
  }

  const slug = new URL(req.url ?? "/", "https://library.invalid").searchParams.get("slug");
  if (slug === null) return reply(res, 200, catalog);
  if (!/^[a-z0-9][a-z0-9-]{0,179}$/.test(slug)) {
    return reply(res, 400, { error: "Prompt inválido." });
  }
  if (!catalog.items.some((item) => item.slug === slug)) {
    return reply(res, 404, { error: "Prompt não encontrado ou indisponível." });
  }

  try {
    const copyOrigin = getCopyOrigin();
    if (copyOrigin) {
      const response = await fetch(`${copyOrigin}/api/prompts/${encodeURIComponent(slug)}/copy`, {
        method: "POST",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      });
      if (response.status === 404) {
        const text = await response.text();
        if (/DEPLOYMENT_NOT_FOUND|deployment could not be found/i.test(text)) {
          return reply(res, 503, { error: SERVICE_UNAVAILABLE, code: "TEXT_SERVICE_UNAVAILABLE" });
        }
        return reply(res, 404, { error: "Prompt não encontrado ou indisponível." });
      }
      if (!response.ok) throw new Error("copy unavailable");
      const data = await response.json();
      if (!data.success || typeof data.prompt !== "string" || !data.prompt.trim()) {
        return reply(res, 404, { error: "Prompt não encontrado ou indisponível." });
      }
      return reply(res, 200, { slug: data.slug || slug, title: data.title, prompt: data.prompt });
    }

    // Consulta canônica e direta à RPC do Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_caramelo_prompt_copy`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ p_slug: slug }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return reply(res, 404, { error: "Prompt não encontrado ou indisponível." });
      }
      throw new Error(`Supabase RPC returned ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || typeof data.prompt !== "string" || !data.prompt.trim()) {
      return reply(res, 404, { error: "Prompt não encontrado ou indisponível." });
    }

    return reply(res, 200, { slug: data.slug || slug, title: data.title, prompt: data.prompt });
  } catch {
    return reply(res, 502, { error: "Não foi possível consultar o acervo. Tente novamente." });
  }
}

export default promptLibrary;
