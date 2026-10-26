import crypto from "node:crypto";
import { verifyHtmlContent } from "./verifier.ts";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://fzhzpzxsttflgtassyex.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6aHpwenhzdHRmbGd0YXNzeWV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTM1NTY1MiwiZXhwIjoyMTA0OTMxNjUyfQ.oAqUzsOayHlvhf639LoletvA350gklOZbWz8OfYMzhg";

function isPrivateIpOrHost(domain: string): boolean {
  const d = String(domain || "").toLowerCase().trim();
  if (!d) return true;
  if (d === "localhost" || d === "127.0.0.1" || d === "0.0.0.0" || d === "::1") return true;
  if (
    d.startsWith("10.") ||
    d.startsWith("192.168.") ||
    d.startsWith("172.16.") ||
    d.startsWith("172.17.") ||
    d.startsWith("172.18.") ||
    d.startsWith("172.19.") ||
    d.startsWith("172.20.") ||
    d.startsWith("172.21.") ||
    d.startsWith("172.22.") ||
    d.startsWith("172.23.") ||
    d.startsWith("172.24.") ||
    d.startsWith("172.25.") ||
    d.startsWith("172.26.") ||
    d.startsWith("172.27.") ||
    d.startsWith("172.28.") ||
    d.startsWith("172.29.") ||
    d.startsWith("172.30.") ||
    d.startsWith("172.31.") ||
    d.startsWith("169.254.")
  )
    return true;
  if (
    d.endsWith(".local") ||
    d.endsWith(".internal") ||
    d.endsWith(".test") ||
    d.endsWith(".example") ||
    d.endsWith(".invalid")
  )
    return true;
  return false;
}

export interface RunScanOptions {
  publicationId?: string | null;
  limit?: number;
  force?: boolean;
}

export async function runScan({
  publicationId = null,
  limit = 10,
  force = false,
}: RunScanOptions = {}) {
  try {
    // Opportunistic automatic purge of offline and not_confirmed publications older than 7 days
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/purge_caramelo_inactive_publications`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_older_than_days: 7,
          p_statuses: ["offline", "not_confirmed"],
        }),
      });
    } catch (cleanErr: any) {
      console.warn("[scanner] auto-purge inactive publications error:", cleanErr?.message);
    }

    // 1. Claim available jobs atomically
    const claimRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/claim_caramelo_scan_jobs`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_limit: limit || 10,
        p_lease_minutes: 5,
        p_publication_id: publicationId || null,
        p_force: Boolean(force),
      }),
    });

    if (!claimRes.ok) {
      const errText = await claimRes.text();
      return { success: false, error: "Falha ao reivindicar scan jobs: " + errText };
    }

    const jobs = await claimRes.json();
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return { success: true, processed: 0, results: [], message: "Nenhum job disponível para processamento" };
    }

    const results = [];

    // 2. Process each claimed job
    for (const job of jobs) {
      const { job_id, publication_id, prompt_id, seed, normalized_domain, failure_count } = job;

      if (isPrivateIpOrHost(normalized_domain)) {
        continue;
      }

      let verified = false;
      let htmlSnippet = "";
      let isNetworkError = false;
      let verifResult = null;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

        const siteUrl = new URL(`https://${normalized_domain}`);
        const siteRes = await fetch(siteUrl.toString(), {
          signal: controller.signal,
          headers: {
            "User-Agent": "CarameloSeedVerifier/1.0 (+https://www.umcaracaramelo.com.br)",
          },
        });
        clearTimeout(timeout);

        if (siteRes.ok) {
          const text = await siteRes.text();
          htmlSnippet = text.substring(0, 262144);

          let expectedSlug = "";
          let expectedCanonical = "";

          try {
            const pRes = await fetch(
              `${SUPABASE_URL}/rest/v1/prompts?id=eq.${encodeURIComponent(prompt_id)}&select=slug,canonical_url&limit=1`,
              {
                headers: {
                  apikey: SUPABASE_SERVICE_ROLE_KEY,
                  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
              }
            );
            if (pRes.ok) {
              const pRows = await pRes.json();
              if (pRows && pRows[0]) {
                expectedSlug = pRows[0].slug || "";
                expectedCanonical = pRows[0].canonical_url || "";
              }
            }
          } catch {}

          verifResult = verifyHtmlContent({
            html: htmlSnippet,
            expectedSeed: seed,
            expectedSlug,
            expectedCanonicalUrl: expectedCanonical,
          });

          if (verifResult.verified) {
            verified = true;
          }
        } else {
          isNetworkError = siteRes.status >= 500;
        }
      } catch {
        isNetworkError = true;
      }

      const nowIso = new Date().toISOString();

      if (verified && verifResult) {
        const evidenceDigest = crypto.createHash("sha256").update(htmlSnippet, "utf8").digest("hex");
        const evidenceSummary = {
          marker_format: verifResult.marker_format,
          seed_match: verifResult.seed_match,
          prompt_match: verifResult.prompt_match,
          source_match: verifResult.source_match,
          generator_match: verifResult.generator_match,
          runtime_version: verifResult.runtime_version,
          verified_at: nowIso,
        };

        let isFirst = true;
        try {
          const pubCheck = await fetch(
            `${SUPABASE_URL}/rest/v1/caramelo_publications?id=eq.${publication_id}&select=first_verified_at`,
            {
              headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
            }
          );
          if (pubCheck.ok) {
            const pubRows = await pubCheck.json();
            if (pubRows && pubRows[0] && pubRows[0].first_verified_at) {
              isFirst = false;
            }
          }
        } catch {}

        const pubPatch: Record<string, unknown> = {
          status: "verified",
          last_verified_at: nowIso,
          evidence_digest: evidenceDigest,
          evidence_summary: evidenceSummary,
        };
        if (isFirst) {
          pubPatch.first_verified_at = nowIso;
        }

        await fetch(`${SUPABASE_URL}/rest/v1/caramelo_publications?id=eq.${publication_id}`, {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(pubPatch),
        });

        const nextScan = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await fetch(`${SUPABASE_URL}/rest/v1/caramelo_scan_jobs?id=eq.${job_id}`, {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "queued",
            available_at: nextScan,
            lease_until: null,
            failure_count: 0,
          }),
        });

        results.push({
          job_id,
          publication_id,
          domain: normalized_domain,
          status: "verified",
          first_verified: isFirst,
          next_scan: nextScan,
          marker_format: verifResult.marker_format,
        });
      } else {
        const newFailCount = (failure_count || 0) + 1;

        if (newFailCount < 4) {
          const backoffMinutes = [1, 5, 30, 360][newFailCount - 1] || 60;
          const nextScan = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();

          await fetch(`${SUPABASE_URL}/rest/v1/caramelo_scan_jobs?id=eq.${job_id}`, {
            method: "PATCH",
            headers: {
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "queued",
              available_at: nextScan,
              lease_until: null,
              failure_count: newFailCount,
            }),
          });

          results.push({
            job_id,
            publication_id,
            domain: normalized_domain,
            status: "retry_scheduled",
            retry: newFailCount,
            next_scan: nextScan,
          });
        } else {
          const finalStatus = isNetworkError ? "offline" : "not_confirmed";
          await fetch(`${SUPABASE_URL}/rest/v1/caramelo_publications?id=eq.${publication_id}`, {
            method: "PATCH",
            headers: {
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: finalStatus }),
          });

          const recheckDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
          await fetch(`${SUPABASE_URL}/rest/v1/caramelo_scan_jobs?id=eq.${job_id}`, {
            method: "PATCH",
            headers: {
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "idle",
              available_at: recheckDate,
              lease_until: null,
              failure_count: newFailCount,
            }),
          });

          results.push({
            job_id,
            publication_id,
            domain: normalized_domain,
            status: finalStatus,
            retries_exhausted: true,
          });
        }
      }
    }

    return { success: true, processed: results.length, results };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
