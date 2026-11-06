// ==============================================================================
// Brand Guardian — Brand Context Engine
// Camada de consumo padronizada para outras ferramentas do LAB (Prancheta, Prompts, CRM)
// ==============================================================================

import type { Brand, CompleteBrandData } from "./types.ts";
import { resolveAllTokens } from "./tokenEngine.ts";
import { brandGuardianRepo } from "./repo.ts";

export interface BrandContext {
  brandId: string;
  name: string;
  slug: string;
  kind: Brand["kind"];
  slogan: string;
  positioning: string;
  valueProposition: string;
  targetAudience: string;
  toneOfVoice: string;
  wordsToAvoid: string[];
  wordsToUse: string[];
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    surface: string;
    textPrimary: string;
    palette: Array<{ name: string; hex: string; role: string }>;
  };
  typography: {
    displayFamily: string;
    bodyFamily: string;
    monoFamily: string;
  };
  resolvedTokens: Record<string, string>;
  logos: {
    primaryUrl: string;
    symbolUrl: string;
    faviconUrl: string;
    darkUrl: string;
  };
  aiPromptSnippet: string;
  publishedVersion?: string;
  lastUpdated: string;
}

/**
 * Converte os dados completos de uma marca no contexto canônico serializado para consumo
 */
export function buildBrandContext(brand: Brand, data: CompleteBrandData, publishedVersion?: string): BrandContext {
  const resolved = resolveAllTokens(data.tokens, "light");
  const tokenMap: Record<string, string> = {};
  for (const r of resolved) {
    if (!r.hasCycle && r.resolvedValue !== "#NOT_FOUND#") {
      tokenMap[r.token.path] = r.resolvedValue;
    }
  }

  const primaryCol = data.colors.find((c) => c.role === "primary")?.hex || brand.primary_color || "#FF701A";
  const secondaryCol = data.colors.find((c) => c.role === "secondary")?.hex || brand.accent_color || "#25BFFF";
  const accentCol = data.colors.find((c) => c.role === "accent")?.hex || "#FF3D8D";
  const surfaceCol = data.colors.find((c) => c.role === "surface" || c.role === "neutral_dark")?.hex || "#101014";
  const textCol = data.colors.find((c) => c.role === "text_primary" || c.role === "neutral_light")?.hex || "#FFF4E8";

  const displayFont = data.typography.families.find((f) => f.role === "primary_display")?.familyName || "Montserrat";
  const bodyFont = data.typography.families.find((f) => f.role === "body_ui")?.familyName || "Inter";
  const monoFont = data.typography.families.find((f) => f.role === "monospace")?.familyName || "JetBrains Mono";

  const primaryLogo = data.logos.find((l) => l.key === "primary")?.fileUrl || brand.logo_url || "/favicon.svg";
  const symbolLogo = data.logos.find((l) => l.key === "symbol")?.fileUrl || primaryLogo;
  const faviconLogo = data.logos.find((l) => l.key === "favicon")?.fileUrl || symbolLogo;
  const darkLogo = data.logos.find((l) => l.key === "monochrome_dark")?.fileUrl || primaryLogo;

  // Gerador de snippet formatado para o Banco de Prompts do LAB e geradores de IA
  const aiPromptSnippet = `=== CONTEXTO DE MARCA: ${brand.name.toUpperCase()} ===
Slogan: ${data.foundations.slogan}
Posicionamento: ${data.foundations.positioning}
Tom de Voz: ${data.foundations.toneOfVoice}
Cores Principais: Primária (${primaryCol}), Secundária (${secondaryCol}), Acento (${accentCol}), Fundo (${surfaceCol}), Texto (${textCol})
Tipografia: Display (${displayFont}), Corpo (${bodyFont}), Código (${monoFont})
Palavras Mandatórias: ${data.foundations.wordsToUse.join(", ")}
Palavras Proibidas / Anti-Clichê: ${data.foundations.wordsToAvoid.join(", ")}
Diretrizes Visuais: ${data.foundations.visualPrinciples.join(" | ")}
Restrições: ${data.foundations.creativeRestrictions}
===================================================`;

  return {
    brandId: brand.id,
    name: brand.name,
    slug: brand.slug,
    kind: brand.kind,
    slogan: data.foundations.slogan,
    positioning: data.foundations.positioning,
    valueProposition: data.foundations.valueProposition,
    targetAudience: data.foundations.targetAudience,
    toneOfVoice: data.foundations.toneOfVoice,
    wordsToAvoid: data.foundations.wordsToAvoid,
    wordsToUse: data.foundations.wordsToUse,
    colors: {
      primary: primaryCol,
      secondary: secondaryCol,
      accent: accentCol,
      surface: surfaceCol,
      textPrimary: textCol,
      palette: data.colors.map((c) => ({ name: c.name, hex: c.hex, role: c.role })),
    },
    typography: {
      displayFamily: displayFont,
      bodyFamily: bodyFont,
      monoFamily: monoFont,
    },
    resolvedTokens: tokenMap,
    logos: {
      primaryUrl: primaryLogo,
      symbolUrl: symbolLogo,
      faviconUrl: faviconLogo,
      darkUrl: darkLogo,
    },
    aiPromptSnippet,
    publishedVersion,
    lastUpdated: brand.updated_at || new Date().toISOString(),
  };
}

/**
 * Consulta assíncrona do contexto de uma marca para qualquer ferramenta do LAB
 */
export async function getActiveBrandContext(brandId?: string): Promise<BrandContext | null> {
  const brands = await brandGuardianRepo.getBrands();
  if (brands.length === 0) return null;

  const targetBrand = (brandId ? brands.find((b) => b.id === brandId) : brands[0]) || brands[0];
  const brandData = await brandGuardianRepo.getBrandData(targetBrand.id);
  const releases = await brandGuardianRepo.getReleases(targetBrand.id);
  const latestRelease = releases[0]?.version;

  return buildBrandContext(targetBrand, brandData, latestRelease);
}
