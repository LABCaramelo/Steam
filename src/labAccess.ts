/** Client side of /api/lab-access: the server holds the WhatsApp credentials and decides access. */

export type LabAccess =
  | { state: "granted" }
  | { state: "needs_phone" }
  | { state: "code_sent"; phone: string; resendIn: number }
  | { state: "not_member"; phone: string };

type LabAccessRequest =
  | { action: "status"; force?: boolean }
  | { action: "send"; phone: string }
  | { action: "verify"; code: string };

export class LabAccessError extends Error {
  readonly status: number;
  readonly resendIn?: number;
  constructor(status: number, message: string, resendIn?: number) {
    super(message);
    this.status = status;
    this.resendIn = resendIn;
  }
}

/** Convite da comunidade gratuita, o mesmo do site. */
export const COMMUNITY_URL = "https://chat.whatsapp.com/Ct6zFrGPh6HDC67G4SAYVm";

/** WhatsApp digitado no cadastro, enviado para confirmação assim que a sessão nova abre. */
export const PENDING_WHATSAPP_KEY = "lab:whatsapp-cadastro";

/** Mesma faixa que o servidor aceita: DDD + número, ou + código do país. */
export function isPlausiblePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export async function requestLabAccess(token: string, body: LabAccessRequest): Promise<LabAccess> {
  let response: Response;
  try {
    response = await fetch("/api/lab-access", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new LabAccessError(0, "Sem conexão. Confira sua internet e tente de novo.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new LabAccessError(response.status, data.error || "Não foi possível conferir seu acesso agora.", data.resendIn);
  }
  return data as LabAccess;
}
