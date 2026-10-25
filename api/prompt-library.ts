import type { IncomingMessage } from "node:http";
import catalog from "./data/prompt-catalog.json" with { type: "json" };
import { requireToolAccess, rpcHeaders, ToolAccessError } from "../server/toolAccess.ts";

export interface PromptLibraryResponse {
  statusCode: number;
  setHeader: (name: string, value: string) => unknown;
  end: (body: string) => unknown;
}

function reply(res: PromptLibraryResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization");
  res.end(JSON.stringify(data));
}

/** Metadata and full texts both require a verified session and ownership of this tool. */
export async function promptLibrary(
  req: Pick<IncomingMessage, "method" | "url" | "headers">,
  res: PromptLibraryResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return reply(res, 405, { error: "Método não permitido." });
  }

  try {
    const access = await requireToolAccess(req, "prompt-library");
    const slug = new URL(req.url ?? "/", "https://library.invalid").searchParams.get("slug");
    if (slug === null) return reply(res, 200, catalog);
    if (!/^[a-z0-9][a-z0-9-]{0,179}$/.test(slug)) return reply(res, 400, { error: "Prompt inválido." });
    if (!catalog.items.some((item) => item.slug === slug)) return reply(res, 404, { error: "Prompt não encontrado ou indisponível." });

    // Consulta canônica e direta à RPC do Supabase
    const response = await fetch(`${access.supabaseUrl}/rest/v1/rpc/get_caramelo_prompt_copy`, {
      method: "POST",
      headers: rpcHeaders(access),
      body: JSON.stringify({ p_slug: slug }),
      signal: AbortSignal.timeout(20_000),
    });

    if (response.status === 401) return reply(res, 401, { error: "Sua sessão expirou. Entre novamente." });
    if (response.status === 403) return reply(res, 403, { error: "Você não tem acesso a este conteúdo." });
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
  } catch (error) {
    if (error instanceof ToolAccessError) return reply(res, error.status, { error: error.message, code: error.code });
    return reply(res, 502, { error: "Não foi possível consultar o acervo. Tente novamente." });
  }
}

export default promptLibrary;
