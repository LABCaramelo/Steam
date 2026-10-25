import type { IncomingMessage, ServerResponse } from "node:http";
import { runScan } from "../../../server/scanner.ts";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://fzhzpzxsttflgtassyex.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6aHpwenhzdHRmbGd0YXNzeWV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTM1NTY1MiwiZXhwIjoyMTA0OTMxNjUyfQ.oAqUzsOayHlvhf639LoletvA350gklOZbWz8OfYMzhg";

const SEED_REGEX = /^ucc_v1_[A-Za-z0-9_-]{20,64}$/;

type Req = IncomingMessage & { body?: unknown };

async function readBodyText(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let totalLength = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalLength += buf.length;
    if (totalLength > 16384) {
      break;
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(req: Req, res: ServerResponse) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Method not allowed. Only POST and OPTIONS are supported." }));
  }

  try {
    // 1. Origin Header Validation (Anti-Abuse Prefilter)
    const origin = (req.headers["origin"] as string | undefined) || "";
    if (!origin) {
      res.statusCode = 204;
      return res.end();
    }

    let originHost = "";
    try {
      originHost = new URL(origin).hostname.toLowerCase();
    } catch {
      res.statusCode = 204;
      return res.end();
    }

    if (!originHost || originHost === "localhost" || originHost === "127.0.0.1") {
      res.statusCode = 204;
      return res.end();
    }

    // 2. Parse Payload
    let payload = req.body;
    if (!payload || typeof payload !== "object") {
      const rawText = await readBodyText(req);
      if (rawText) {
        try {
          payload = JSON.parse(rawText);
        } catch {
          res.statusCode = 204;
          return res.end();
        }
      }
    }

    if (!payload || typeof payload !== "object") {
      res.statusCode = 204;
      return res.end();
    }

    const { seed, domain } = payload as { seed?: string; domain?: string };
    if (!seed || !domain || typeof seed !== "string" || typeof domain !== "string") {
      res.statusCode = 204;
      return res.end();
    }

    const cleanSeed = seed.trim();
    const cleanDomain = domain.trim().toLowerCase();

    // 3. Schema & Length Rules
    if (!SEED_REGEX.test(cleanSeed) || cleanDomain.length > 253) {
      res.statusCode = 204;
      return res.end();
    }

    // 4. Origin Matching: hostname(Origin) must strictly match normalized_domain
    if (originHost !== cleanDomain && !originHost.endsWith("." + cleanDomain)) {
      res.statusCode = 204;
      return res.end();
    }

    // 5. Await registration RPC synchronously before responding
    const regRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/register_caramelo_presence`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_seed: cleanSeed,
        p_domain: cleanDomain,
      }),
    });

    if (regRes.ok) {
      const regData = await regRes.json();
      const publicationId = regData?.publication_id;
      const shouldVerifyNow = Boolean(regData?.should_verify_now);

      if (shouldVerifyNow && publicationId) {
        // Kick off immediate verification in background
        runScan({ publicationId, limit: 1, force: false }).catch((err) => {
          console.warn("[presence] Immediate scan background error:", err.message);
        });
      }
    }

    res.statusCode = 204;
    return res.end();
  } catch (err: any) {
    console.error("[presence] Handler error:", err.message);
    res.statusCode = 204;
    return res.end();
  }
}
