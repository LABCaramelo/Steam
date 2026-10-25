/**
 * Um Cara Caramelo — Caramelo Seed v1
 * Verifier Engine
 *
 * Supports:
 * - FORMAT A (canonical_meta_v1): meta[name="ucc:seed"], meta[name="ucc:prompt"], meta[name="ucc:source"]
 * - FORMAT B (legacy_comment_v1): HTML comments <!-- seed: ... -->, <!-- prompt: ... -->, /caramelo.js
 *
 * Strict priority: If canonical format is detected, canonical wins without mixing formats.
 */

function getMetaContent(html: string, name: string): string | null {
  if (!html || !name) return null;
  const regex1 = new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, "i");
  const regex2 = new RegExp(`<meta\\s+[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`, "i");
  const m1 = html.match(regex1);
  if (m1) return m1[1].trim();
  const m2 = html.match(regex2);
  if (m2) return m2[1].trim();
  return null;
}

export interface VerificationInput {
  html: string;
  expectedSeed: string;
  expectedSlug: string;
  expectedCanonicalUrl?: string;
}

export interface VerificationResult {
  verified: boolean;
  marker_format: "canonical_meta_v1" | "legacy_comment_v1" | "unknown";
  seed_match: boolean;
  prompt_match: boolean;
  source_match: boolean;
  generator_match: boolean;
  runtime_version: string | null;
}

export function verifyHtmlContent({
  html,
  expectedSeed,
  expectedSlug,
  expectedCanonicalUrl,
}: VerificationInput): VerificationResult {
  if (!html) {
    return {
      verified: false,
      marker_format: "unknown",
      seed_match: false,
      prompt_match: false,
      source_match: false,
      generator_match: false,
      runtime_version: null,
    };
  }

  const cleanSeed = String(expectedSeed || "").trim();
  const cleanSlug = String(expectedSlug || "").trim();
  const cleanCanonical = String(expectedCanonicalUrl || `https://www.umcaracaramelo.com.br/prompts/${cleanSlug}`).trim();

  // 1. Check FORMAT A: canonical_meta_v1
  const metaSeed = getMetaContent(html, "ucc:seed");
  const metaPrompt = getMetaContent(html, "ucc:prompt");
  const metaSource = getMetaContent(html, "ucc:source");
  const metaGenerator = getMetaContent(html, "generator");

  const hasCanonicalMeta = metaSeed !== null || metaPrompt !== null || metaSource !== null;

  if (hasCanonicalMeta) {
    const seed_match = metaSeed === cleanSeed;
    const prompt_match = metaPrompt === cleanSlug;
    const source_match = metaSource === cleanCanonical;
    const generator_match = metaGenerator === "Um Cara Caramelo";
    const verified = seed_match && prompt_match && source_match;

    return {
      verified,
      marker_format: "canonical_meta_v1",
      seed_match,
      prompt_match,
      source_match,
      generator_match,
      runtime_version: "v1",
    };
  }

  // 2. Check FORMAT B: legacy_comment_v1 (compatibility mode)
  const legacySeedMatch = html.match(/<!--\s*seed:\s*([a-zA-Z0-9_\-]+)\s*-->/i);
  const legacyPromptMatch = html.match(/<!--\s*prompt:\s*(\S+)\s*-->/i);
  const legacySourceMatch = html.match(/<!--\s*source:\s*(\S+)\s*-->/i);
  const hasScriptDataSeed = html.includes(`data-seed="${cleanSeed}"`);

  const hasLegacyMarkers = Boolean(legacySeedMatch || hasScriptDataSeed || legacyPromptMatch || legacySourceMatch);

  if (hasLegacyMarkers) {
    const foundSeed = legacySeedMatch ? legacySeedMatch[1].trim() : (hasScriptDataSeed ? cleanSeed : null);
    const seed_match = foundSeed === cleanSeed;
    const prompt_match = Boolean(legacyPromptMatch && legacyPromptMatch[1].includes(cleanSlug));
    const source_match = Boolean(
      legacySourceMatch && (legacySourceMatch[1].includes(cleanSlug) || legacySourceMatch[1].includes("umcaracaramelo.com.br"))
    );
    const verified = seed_match;

    return {
      verified,
      marker_format: "legacy_comment_v1",
      seed_match,
      prompt_match,
      source_match,
      generator_match: false,
      runtime_version: "v1",
    };
  }

  return {
    verified: false,
    marker_format: "unknown",
    seed_match: false,
    prompt_match: false,
    source_match: false,
    generator_match: false,
    runtime_version: null,
  };
}
