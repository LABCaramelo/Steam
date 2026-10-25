import type { IncomingMessage } from "node:http";

const DEFAULT_URL = "https://fzhzpzxsttflgtassyex.supabase.co";
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6aHpwenhzdHRmbGd0YXNzeWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNTU2NTIsImV4cCI6MjEwNDkzMTY1Mn0.rWO90rI-O8XVOWAlvuylkFWMNpjkocC0HRHBNbmrJj4";

export class ToolAccessError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, message: string, code = "ACCESS_DENIED") {
    super(message);
    this.name = "ToolAccessError";
    this.status = status;
    this.code = code;
  }
}

export interface AuthenticatedRequest {
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> };
  token: string;
  supabaseUrl: string;
  supabaseKey: string;
}

type Request = Pick<IncomingMessage, "headers">;

/** Never trusts decoded claims or a browser-provided user id: Auth verifies this token remotely. */
export async function requireUser(req: Request): Promise<AuthenticatedRequest> {
  const authorization = req.headers.authorization;
  const token = typeof authorization === "string" ? authorization.match(/^Bearer\s+(\S+)$/i)?.[1] : undefined;
  if (!token) throw new ToolAccessError(401, "Entre no LAB para continuar.", "AUTH_REQUIRED");

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_URL).replace(/\/+$/, "");
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;
  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ToolAccessError(503, "Não foi possível verificar sua sessão. Tente novamente.", "AUTH_UNAVAILABLE");
  }
  if (response.status === 401 || response.status === 403) {
    throw new ToolAccessError(401, "Sua sessão expirou. Entre novamente.", "INVALID_SESSION");
  }
  if (!response.ok) throw new ToolAccessError(503, "Não foi possível verificar sua sessão. Tente novamente.", "AUTH_UNAVAILABLE");
  const user = await response.json().catch(() => null);
  if (!user || typeof user.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
    || user.is_anonymous === true) {
    throw new ToolAccessError(401, "Sua sessão é inválida. Entre novamente.", "INVALID_SESSION");
  }
  return { user, token, supabaseUrl, supabaseKey };
}

/** All database calls use the caller's JWT, so auth.uid() and RLS retain their meaning. */
export function rpcHeaders(access: AuthenticatedRequest): Record<string, string> {
  return { apikey: access.supabaseKey, Authorization: `Bearer ${access.token}`, "Content-Type": "application/json", Accept: "application/json" };
}

async function booleanRpc(access: AuthenticatedRequest, name: string, args: Record<string, unknown>): Promise<boolean> {
  let response: Response;
  try {
    response = await fetch(`${access.supabaseUrl}/rest/v1/rpc/${name}`, {
      method: "POST", headers: rpcHeaders(access), body: JSON.stringify(args), signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ToolAccessError(503, "Não foi possível verificar seu acesso. Tente novamente.", "ACCESS_UNAVAILABLE");
  }
  if (response.status === 401) throw new ToolAccessError(401, "Sua sessão expirou. Entre novamente.", "INVALID_SESSION");
  if (!response.ok) throw new ToolAccessError(503, "Não foi possível verificar seu acesso. Tente novamente.", "ACCESS_UNAVAILABLE");
  const result = await response.json().catch(() => null);
  if (result !== true && result !== false) {
    throw new ToolAccessError(503, "Não foi possível verificar seu acesso. Tente novamente.", "ACCESS_UNAVAILABLE");
  }
  return result;
}

export async function assertToolAccess(access: AuthenticatedRequest, slug: string): Promise<void> {
  if (!await booleanRpc(access, "has_tool", { p_slug: slug })) {
    throw new ToolAccessError(403, "Esta ferramenta não está disponível na sua biblioteca.", "TOOL_REQUIRED");
  }
}

export async function requireToolAccess(req: Request, slug: string): Promise<AuthenticatedRequest> {
  const access = await requireUser(req);
  await assertToolAccess(access, slug);
  return access;
}

export async function requireLabAdmin(access: AuthenticatedRequest): Promise<void> {
  let failure: unknown;
  for (const rpc of ["is_lab_admin", "is_admin"]) {
    try {
      if (await booleanRpc(access, rpc, {})) return;
    } catch (error) {
      failure = error;
    }
  }
  if (failure) throw failure;
  throw new ToolAccessError(403, "Apenas administradores podem alterar as artes do LAB.", "ADMIN_REQUIRED");
}
