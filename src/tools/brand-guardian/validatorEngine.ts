// ==============================================================================
// Brand Guardian — Validador de Consistência (Brand Guard)
// Verificações determinísticas de contraste, conformidade de tokens, logotipos e diretrizes
// ==============================================================================

import { evaluateContrast } from "./colorEngine";
import { resolveAllTokens } from "./tokenEngine";
import type { BrandGuardFinding, CompleteBrandData } from "./types";

export function auditBrandConsistency(data: CompleteBrandData): BrandGuardFinding[] {
  const findings: BrandGuardFinding[] = [];

  // 1. Auditoria de Contraste e Cores
  const textColors = data.colors.filter((c) => c.role === "text_primary" || c.role === "text_secondary");
  const surfaceColors = data.colors.filter((c) => c.role === "surface" || c.role === "neutral_dark" || c.role === "neutral_light");

  for (const text of textColors) {
    for (const surface of surfaceColors) {
      const contrast = evaluateContrast(text.hex, surface.hex);
      if (!contrast.normalTextAA) {
        findings.push({
          id: `contrast-${text.id}-${surface.id}`,
          severity: "error",
          module: "Cores & Acessibilidade",
          ruleTitle: "Contraste WCAG 2.2 Insuficiente",
          description: `A combinação entre o texto '${text.name}' (${text.hex}) e a superfície '${surface.name}' (${surface.hex}) tem razão de contraste ${contrast.ratio}:1, abaixo do mínimo exigido de 4.5:1 para texto normal.`,
          targetElement: `${text.name} em ${surface.name}`,
          suggestedFix: "Ajuste a luminosidade de uma das cores no Color Lab para atingir no mínimo 4.5:1.",
        });
      } else if (!contrast.normalTextAAA) {
        findings.push({
          id: `contrast-aaa-${text.id}-${surface.id}`,
          severity: "recommendation",
          module: "Cores & Acessibilidade",
          ruleTitle: "Oportunidade de Conformidade AAA",
          description: `O contraste entre '${text.name}' e '${surface.name}' é ${contrast.ratio}:1 (atende AA, mas não atinge AAA 7.0:1).`,
          targetElement: `${text.name} em ${surface.name}`,
          suggestedFix: "Para marcas com foco em acessibilidade máxima, aumente o contraste para 7.0:1.",
        });
      }
    }
  }

  // 2. Auditoria de Logotipos
  const hasPrimary = data.logos.some((l) => l.key === "primary" && l.fileUrl);
  if (!hasPrimary) {
    findings.push({
      id: "logo-missing-primary",
      severity: "error",
      module: "Logotipos",
      ruleTitle: "Logotipo Principal Ausente",
      description: "A marca não possui um logotipo principal oficial cadastrado com arquivo válido.",
      targetElement: "Logotipo Principal",
      suggestedFix: "Envie um arquivo vetorial (SVG) ou imagem de alta resolução na variante Principal.",
    });
  }

  const hasFavicon = data.logos.some((l) => l.key === "favicon" && l.fileUrl);
  if (!hasFavicon) {
    findings.push({
      id: "logo-missing-favicon",
      severity: "warning",
      module: "Logotipos",
      ruleTitle: "Favicon / Símbolo Reduzido Ausente",
      description: "A marca ainda não cadastrou um favicon ou versão compacta para abas de navegador e ícones de app.",
      targetElement: "Favicon",
      suggestedFix: "Adicione uma versão simplificada do símbolo com dimensões mínimas legíveis em 16x16 ou 32x32.",
    });
  }

  // 3. Auditoria de Tipografia
  const hasDisplay = data.typography.families.some((f) => f.role === "primary_display");
  const hasBody = data.typography.families.some((f) => f.role === "body_ui");

  if (!hasDisplay) {
    findings.push({
      id: "type-missing-display",
      severity: "warning",
      module: "Tipografia",
      ruleTitle: "Família Display não Configurada",
      description: "Não há família tipográfica definida para a voz principal de cartaz e títulos de impacto.",
      targetElement: "Fonte Display",
      suggestedFix: "Defina uma fonte display expressiva (ex: Montserrat 900, Syne 800 ou Anton).",
    });
  }

  if (!hasBody) {
    findings.push({
      id: "type-missing-body",
      severity: "error",
      module: "Tipografia",
      ruleTitle: "Família de Corpo e UI não Configurada",
      description: "A marca precisa de uma fonte legível para corpo de texto, botões e navegação (ex: Inter).",
      targetElement: "Fonte Body / UI",
      suggestedFix: "Adicione uma família funcional para leitura contínua.",
    });
  }

  // 4. Auditoria de Design Tokens (DTCG)
  const resolvedTokens = resolveAllTokens(data.tokens, "light");
  for (const r of resolvedTokens) {
    if (r.hasCycle) {
      findings.push({
        id: `token-cycle-${r.token.id}`,
        severity: "error",
        module: "Design Tokens",
        ruleTitle: "Referência Circular Detectada",
        description: `O token '${r.token.path}' faz parte de um ciclo infinito de dependências: ${r.dependencyChain.join(" → ")}.`,
        targetElement: r.token.path,
        suggestedFix: "Aponte o token para um valor primitivo ou quebre o loop de aliases.",
      });
    } else if (r.resolvedValue === "#NOT_FOUND#") {
      findings.push({
        id: `token-missing-alias-${r.token.id}`,
        severity: "error",
        module: "Design Tokens",
        ruleTitle: "Alias Inexistente",
        description: `O token '${r.token.path}' referencia o caminho '${r.token.value}', que não existe no catálogo de tokens.`,
        targetElement: r.token.path,
        suggestedFix: "Corrija o nome do token referenciado ou cadastre o token primitivo de destino.",
      });
    }
  }

  // 5. Fundamentos da Marca
  if (!data.foundations.slogan || data.foundations.slogan.length < 3) {
    findings.push({
      id: "foundations-slogan",
      severity: "recommendation",
      module: "Fundamentos",
      ruleTitle: "Slogan / Assinatura Incompleta",
      description: "A marca ainda não possui uma assinatura ou slogan oficial registrado.",
      targetElement: "Slogan Institucional",
      suggestedFix: "Adicione uma frase síntese que comunique a proposta de valor em uma linha.",
    });
  }

  if (data.foundations.wordsToAvoid.length === 0) {
    findings.push({
      id: "foundations-words-avoid",
      severity: "info",
      module: "Fundamentos",
      ruleTitle: "Diretrizes de Vocabulário a Evitar",
      description: "Registrar termos proibidos ou clichês ajuda a manter a voz da marca autêntica em redação e IAs.",
      targetElement: "Palavras a Evitar",
      suggestedFix: "Liste de 3 a 5 palavras genéricas que a marca nunca deve utilizar.",
    });
  }

  return findings;
}
