import type { IncomingMessage } from "node:http";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

/**
 * LAB access: a member of the official WhatsApp group confirms their number with a code sent
 * from the uazapi instance, and every LAB entry checks they are still in the group.
 * Credentials live only here (server env); the browser sends its Supabase session token.
 */

const CODE_TTL_MS = 10 * 60_000;
const CODE_ATTEMPTS = 5;
const RESEND_AFTER_MS = 60_000;
const SENDS_PER_HOUR = 5;
// When the WhatsApp instance is offline, a member confirmed this recently still gets in.
const MEMBER_GRACE_MS = 72 * 3_600_000;

const config = () => ({
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://fzhzpzxsttflgtassyex.supabase.co",
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  uazapiUrl: (process.env.UAZAPI_URL || "").replace(/\/+$/, ""),
  uazapiToken: process.env.UAZAPI_TOKEN || "",
  groupJid: process.env.UAZAPI_GROUP_JID || "",
});

export interface LabAccessResponse {
  statusCode: number;
  setHeader: (name: string, value: string) => unknown;
  end: (body: string) => unknown;
}

type Request = Pick<IncomingMessage, "method" | "headers"> & AsyncIterable<unknown> & { body?: unknown };

interface AccessRow {
  user_id: string;
  whatsapp: string | null;
  jid: string | null;
  lid: string | null;
  verified_at: string | null;
  member_at: string | null;
  code_hash: string | null;
  code_whatsapp: string | null;
  code_jid: string | null;
  code_lid: string | null;
  code_expires_at: string | null;
  code_attempts: number;
  code_sent_at: string | null;
  sends: number;
  sends_window_start: string | null;
}

interface Participant { JID?: string; LID?: string; PhoneNumber?: string }
interface ParticipantProfile { jid?: string; pn?: string; lid?: string }
export interface GroupInfo {
  JID?: string;
  IsParent?: boolean;
  DefaultSubGroupId?: string;
  Participants?: Participant[] | null;
  participant_profiles?: ParticipantProfile[];
}
export interface Identity { whatsapp: string; jid: string; lid?: string | null }

class HttpError extends Error {
  readonly status: number;
  readonly extra: Record<string, unknown>;
  constructor(status: number, message: string, extra: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}
/** uazapi or Supabase did not answer as expected. */
class UpstreamError extends Error {}

const UNAVAILABLE = "Não foi possível conferir seu acesso agora. Tente de novo em instantes.";

// ---------- phone numbers and WhatsApp ids ----------

/** Digits with country code. Without "+", 10–11 digits are a Brazilian number with area code. */
export function normalizePhone(input: string): string | null {
  const raw = input.trim();
  let digits = raw.replace(/\D/g, "");
  let international = raw.startsWith("+");
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
    international = true;
  }
  if (international) return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
  if (/^[1-9]{2}\d{8,9}$/.test(digits)) return `55${digits}`;
  if (/^55[1-9]{2}\d{8,9}$/.test(digits)) return digits;
  return null;
}

/** Brazilian mobiles exist on WhatsApp with or without the ninth digit (5531985869015 / 553185869015). */
export function phoneVariants(digits: string): Set<string> {
  const variants = new Set([digits]);
  const withNine = digits.match(/^55(\d{2})9(\d{8})$/);
  if (withNine) variants.add(`55${withNine[1]}${withNine[2]}`);
  const withoutNine = digits.match(/^55(\d{2})([6-9]\d{7})$/);
  if (withoutNine) variants.add(`55${withoutNine[1]}9${withoutNine[2]}`);
  return variants;
}

/** "5531…:12@s.whatsapp.net" → "5531…@s.whatsapp.net"; device and agent suffixes are dropped. */
export function jidKey(jid: string | null | undefined): string | null {
  const match = jid?.trim().toLowerCase().match(/^([^@:]+)(?::\d+)?@(.+)$/);
  return match ? `${match[1].split(".")[0]}@${match[2]}` : null;
}

const phoneOf = (key: string) => {
  const match = key.match(/^(\d+)@(?:s\.whatsapp\.net|c\.us)$/);
  return match ? match[1] : null;
};

export function isGroupMember(group: GroupInfo, identity: Identity): boolean {
  const ids = new Set([jidKey(identity.jid), jidKey(identity.lid)].filter(Boolean));
  const phones = phoneVariants(identity.whatsapp);
  const known = [
    ...(group.Participants ?? []).flatMap((p) => [p.JID, p.LID, p.PhoneNumber]),
    ...(group.participant_profiles ?? []).flatMap((p) => [p.jid, p.pn, p.lid]),
  ];
  return known.some((value) => {
    const key = jidKey(value);
    if (!key) return false;
    const phone = phoneOf(key);
    return ids.has(key) || (phone !== null && phones.has(phone));
  });
}

export function maskPhone(digits: string): string {
  const br = digits.match(/^55(\d{2})\d+(\d{4})$/);
  return br ? `+55 (${br[1]}) •••••-${br[2]}` : `+${digits.slice(0, -8)} •••• ${digits.slice(-4)}`;
}

const hashCode = (userId: string, code: string) => createHash("sha256").update(`${userId}:${code}`).digest("hex");

function sameHash(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

// ---------- upstream services ----------

async function uazapi<T>(path: string, body: unknown): Promise<T> {
  const { uazapiUrl, uazapiToken } = config();
  let response: Response;
  try {
    response = await fetch(`${uazapiUrl}${path}`, {
      method: "POST",
      headers: { token: uazapiToken, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new UpstreamError(`uazapi ${path} unreachable`);
  }
  if (!response.ok) throw new UpstreamError(`uazapi ${path} returned ${response.status}`);
  return response.json() as Promise<T>;
}

async function checkNumber(digits: string) {
  const [result] = await uazapi<{ jid?: string; lid?: string; isInWhatsapp?: boolean }[]>("/chat/check", { numbers: [digits] });
  const key = jidKey(result?.jid);
  const whatsapp = key ? phoneOf(key) : null;
  if (!result?.isInWhatsapp || !key || !whatsapp) return null;
  return { whatsapp, jid: key, lid: jidKey(result.lid) };
}

async function groupInfo(force: boolean): Promise<GroupInfo> {
  const group = await uazapi<GroupInfo>("/group/info", { groupjid: config().groupJid, force });
  // A community's members are all in its announcements subgroup.
  if (group.IsParent && group.DefaultSubGroupId) {
    return uazapi<GroupInfo>("/group/info", { groupjid: group.DefaultSubGroupId, force });
  }
  return group;
}

async function inGroup(identity: Identity, force: boolean) {
  if (isGroupMember(await groupInfo(force), identity)) return true;
  // A cached list can miss someone who has just joined.
  return !force && isGroupMember(await groupInfo(true), identity);
}

async function supabase(path: string, init: RequestInit = {}) {
  const { supabaseUrl, serviceKey } = config();
  try {
    return await fetch(`${supabaseUrl}${path}`, {
      ...init,
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", ...init.headers },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new UpstreamError(`supabase ${path} unreachable`);
  }
}

async function sessionUser(token: string): Promise<string | null> {
  const { supabaseUrl, serviceKey } = config();
  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new UpstreamError("supabase auth unreachable");
  }
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new UpstreamError(`supabase auth returned ${response.status}`);
  const user = await response.json() as { id?: string };
  return user.id ?? null;
}

async function readRows(query: string): Promise<AccessRow[]> {
  const response = await supabase(`/rest/v1/lab_access?${query}`);
  if (!response.ok) throw new UpstreamError(`lab_access read returned ${response.status}`);
  return response.json() as Promise<AccessRow[]>;
}

const readAccess = async (userId: string) => (await readRows(`user_id=eq.${userId}&select=*`))[0] ?? null;

async function writeAccess(userId: string, fields: Partial<AccessRow>) {
  const response = await supabase("/rest/v1/lab_access?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, ...fields, updated_at: new Date().toISOString() }),
  });
  if (response.status === 409) throw new HttpError(409, "Este WhatsApp já está ligado a outra conta do LAB.");
  if (!response.ok) throw new UpstreamError(`lab_access write returned ${response.status}`);
}

// ---------- actions ----------

type State =
  | { state: "granted" }
  | { state: "needs_phone" }
  | { state: "code_sent"; phone: string; resendIn: number }
  | { state: "not_member"; phone: string };

async function membership(userId: string, row: AccessRow, force: boolean): Promise<State> {
  const identity = { whatsapp: row.whatsapp!, jid: row.jid!, lid: row.lid };
  let member: boolean;
  try {
    member = await inGroup(identity, force);
  } catch (error) {
    if (!(error instanceof UpstreamError)) throw error;
    if (row.member_at && Date.now() - Date.parse(row.member_at) < MEMBER_GRACE_MS) return { state: "granted" };
    throw new HttpError(503, UNAVAILABLE);
  }
  await writeAccess(userId, { member_at: member ? new Date().toISOString() : null });
  return member ? { state: "granted" } : { state: "not_member", phone: maskPhone(row.whatsapp!) };
}

async function status(userId: string, force: boolean): Promise<State> {
  const row = await readAccess(userId);
  if (!row?.verified_at || !row.whatsapp || !row.jid) return { state: "needs_phone" };
  return membership(userId, row, force);
}

async function sendCode(userId: string, input: unknown): Promise<State> {
  const digits = typeof input === "string" ? normalizePhone(input) : null;
  if (!digits) throw new HttpError(400, "Informe seu WhatsApp com DDD. Fora do Brasil, comece com + e o código do país.");

  const now = Date.now();
  const row = await readAccess(userId);
  const waited = row?.code_sent_at ? now - Date.parse(row.code_sent_at) : Infinity;
  if (waited < RESEND_AFTER_MS) {
    const resendIn = Math.ceil((RESEND_AFTER_MS - waited) / 1000);
    throw new HttpError(429, `Aguarde ${resendIn}s para pedir outro código.`, { resendIn });
  }
  const windowOpen = row?.sends_window_start && now - Date.parse(row.sends_window_start) < 3_600_000;
  if (windowOpen && row.sends >= SENDS_PER_HOUR) throw new HttpError(429, "Você pediu muitos códigos. Tente de novo em uma hora.");

  const number = await checkNumber(digits);
  if (!number) throw new HttpError(400, "Esse número não tem WhatsApp. Confira o DDD e os dígitos.");
  const owners = await readRows(`whatsapp=eq.${number.whatsapp}&verified_at=not.is.null&select=user_id`);
  if (owners.some((owner) => owner.user_id !== userId)) throw new HttpError(409, "Este WhatsApp já está ligado a outra conta do LAB.");
  const since = new Date(now - RESEND_AFTER_MS).toISOString();
  const recent = await readRows(`code_whatsapp=eq.${number.whatsapp}&code_sent_at=gt.${since}&select=user_id`);
  if (recent.some((other) => other.user_id !== userId)) throw new HttpError(429, "Esse número acabou de receber um código. Aguarde um minuto.");

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await uazapi("/send/text", {
    number: number.whatsapp,
    text: `Seu código de acesso ao LAB é *${code}*.\nEle vale por 10 minutos. Se não foi você que pediu, ignore esta mensagem.`,
  });
  await writeAccess(userId, {
    code_hash: hashCode(userId, code),
    code_whatsapp: number.whatsapp,
    code_jid: number.jid,
    code_lid: number.lid,
    code_expires_at: new Date(now + CODE_TTL_MS).toISOString(),
    code_attempts: 0,
    code_sent_at: new Date(now).toISOString(),
    sends: windowOpen ? row.sends + 1 : 1,
    sends_window_start: windowOpen ? row.sends_window_start : new Date(now).toISOString(),
  });
  return { state: "code_sent", phone: maskPhone(number.whatsapp), resendIn: RESEND_AFTER_MS / 1000 };
}

async function verifyCode(userId: string, input: unknown): Promise<State> {
  const code = typeof input === "string" ? input.replace(/\D/g, "") : "";
  if (code.length !== 6) throw new HttpError(400, "Digite os 6 números do código.");
  const row = await readAccess(userId);
  if (!row?.code_hash || !row.code_whatsapp || !row.code_jid || !row.code_expires_at) {
    throw new HttpError(400, "Peça um código primeiro.");
  }
  if (Date.now() > Date.parse(row.code_expires_at)) throw new HttpError(400, "Esse código expirou. Peça um novo.");
  if (row.code_attempts >= CODE_ATTEMPTS) throw new HttpError(429, "Muitas tentativas. Peça um novo código.");
  if (!sameHash(hashCode(userId, code), row.code_hash)) {
    await writeAccess(userId, { code_attempts: row.code_attempts + 1 });
    const left = CODE_ATTEMPTS - row.code_attempts - 1;
    throw new HttpError(400, left > 0 ? `Código incorreto. Restam ${left} tentativa${left > 1 ? "s" : ""}.` : "Código incorreto. Peça um novo código.");
  }

  const verified = { ...row, whatsapp: row.code_whatsapp, jid: row.code_jid, lid: row.code_lid, verified_at: new Date().toISOString() };
  await writeAccess(userId, {
    whatsapp: verified.whatsapp,
    jid: verified.jid,
    lid: verified.lid,
    verified_at: verified.verified_at,
    code_hash: null,
    code_whatsapp: null,
    code_jid: null,
    code_lid: null,
    code_expires_at: null,
    code_attempts: 0,
  });
  return membership(userId, verified, true);
}

// ---------- HTTP ----------

function reply(res: LabAccessResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === "object") return req.body as Record<string, unknown>;
  let raw = typeof req.body === "string" ? req.body : "";
  if (!raw) {
    for await (const chunk of req) {
      raw += String(chunk);
      if (raw.length > 4096) throw new HttpError(413, "Requisição grande demais.");
    }
  }
  try {
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === "object" ? data : {};
  } catch {
    throw new HttpError(400, "Requisição inválida.");
  }
}

/** POST /api/lab-access { action: "status" | "send" | "verify", force?, phone?, code? } with the Supabase session as Bearer. */
export async function labAccess(req: Request, res: LabAccessResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return reply(res, 405, { error: "Método não permitido." });
  }
  const { serviceKey, uazapiUrl, uazapiToken, groupJid } = config();
  if (!serviceKey || !uazapiUrl || !uazapiToken || !groupJid) {
    return reply(res, 503, { error: "A verificação de acesso ao LAB ainda não foi configurada.", code: "NOT_CONFIGURED" });
  }

  try {
    const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    const userId = token ? await sessionUser(token) : null;
    if (!userId) return reply(res, 401, { error: "Sua sessão expirou. Entre de novo." });

    const body = await readJson(req);
    if (body.action === "status") return reply(res, 200, await status(userId, body.force === true));
    if (body.action === "send") return reply(res, 200, await sendCode(userId, body.phone));
    if (body.action === "verify") return reply(res, 200, await verifyCode(userId, body.code));
    return reply(res, 400, { error: "Ação inválida." });
  } catch (error) {
    if (error instanceof HttpError) return reply(res, error.status, { error: error.message, ...error.extra });
    return reply(res, 503, { error: UNAVAILABLE });
  }
}

export default labAccess;
