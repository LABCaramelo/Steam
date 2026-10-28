import type { IncomingMessage, ServerResponse } from "node:http";
import { handleWhatsAppWebhook } from "../server/whatsappWelcome.ts";

export const config = { maxDuration: 30 };

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  return handleWhatsAppWebhook(req, res);
}
