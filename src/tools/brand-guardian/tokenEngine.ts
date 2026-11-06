// ==============================================================================
// Brand Guardian — Motor de Design Tokens (DTCG 2025.10)
// Resolução determinística de aliases, prevenção de ciclos e exportadores interoperáveis
// ==============================================================================

import type { DesignToken } from "./types.ts";

export interface ResolvedToken {
  token: DesignToken;
  resolvedValue: string;
  hasCycle: boolean;
  dependencyChain: string[];
}

export function resolveTokenValue(
  token: DesignToken,
  allTokens: DesignToken[],
  mode: "light" | "dark" = "light",
  visited: Set<string> = new Set()
): { value: string; hasCycle: boolean; chain: string[] } {
  const tokenMap = new Map(allTokens.map((t) => [t.path, t]));
  const chain: string[] = [token.path];

  const resolve = (_currentPath: string, currentVal: string, seen: Set<string>): { value: string; hasCycle: boolean } => {
    // Verifica se é alias formato {path.to.token}
    const aliasMatch = currentVal.match(/^\{([a-zA-Z0-9._-]+)\}$/);
    if (!aliasMatch) {
      return { value: currentVal, hasCycle: false };
    }

    const targetPath = aliasMatch[1];
    chain.push(targetPath);

    if (seen.has(targetPath)) {
      return { value: "#CYCLE_ERROR#", hasCycle: true };
    }

    const targetToken = tokenMap.get(targetPath);
    if (!targetToken) {
      return { value: "#NOT_FOUND#", hasCycle: false };
    }

    const nextSeen = new Set(seen);
    nextSeen.add(targetPath);

    const modeVal = mode === "dark" && targetToken.modeValues?.dark ? targetToken.modeValues.dark : targetToken.value;
    return resolve(targetPath, modeVal, nextSeen);
  };

  const initialVal = mode === "dark" && token.modeValues?.dark ? token.modeValues.dark : token.value;
  const initialSeen = new Set(visited);
  initialSeen.add(token.path);

  const res = resolve(token.path, initialVal, initialSeen);
  return { value: res.value, hasCycle: res.hasCycle, chain };
}

export function resolveAllTokens(tokens: DesignToken[], mode: "light" | "dark" = "light"): ResolvedToken[] {
  return tokens.map((token) => {
    const res = resolveTokenValue(token, tokens, mode);
    return {
      token,
      resolvedValue: res.value,
      hasCycle: res.hasCycle,
      dependencyChain: res.chain,
    };
  });
}

// Exportador 1: DTCG 2025.10 JSON Format
export function exportToDtcgJson(tokens: DesignToken[]): string {
  const root: Record<string, any> = {
    $name: "Brand Guardian Design Tokens",
    $version: "2025.10",
  };

  for (const token of tokens) {
    const segments = token.path.split(".");
    let current = root;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (i === segments.length - 1) {
        current[seg] = {
          $value: token.value,
          $type: token.type,
          $description: token.description,
          ...(token.modeValues ? { $extensions: { "mode.dark": token.modeValues.dark } } : {}),
        };
      } else {
        current[seg] = current[seg] || {};
        current = current[seg];
      }
    }
  }

  return JSON.stringify(root, null, 2);
}

// Exportador 2: CSS Custom Properties (:root e [data-theme="dark"])
export function exportToCssCustomProperties(tokens: DesignToken[]): string {
  const lightResolved = resolveAllTokens(tokens, "light");
  const darkResolved = resolveAllTokens(tokens, "dark");

  const toVarName = (path: string) => "--" + path.replace(/\./g, "-");

  const lightLines = lightResolved.map((t) => `  ${toVarName(t.token.path)}: ${t.resolvedValue}; /* ${t.token.description} */`);

  // Apenas variáveis com valores distintos no modo escuro
  const darkOverrides = darkResolved.filter((t) => {
    const light = lightResolved.find((l) => l.token.path === t.token.path);
    return light && light.resolvedValue !== t.resolvedValue;
  });

  const darkLines = darkOverrides.map((t) => `  ${toVarName(t.token.path)}: ${t.resolvedValue};`);

  return `/**
 * Brand Guardian — Tokens CSS Custom Properties
 * Padrão DTCG 2025.10 / LAB Caramelo
 */

:root {
${lightLines.join("\n")}
}

[data-theme="dark"] {
${darkLines.length > 0 ? darkLines.join("\n") : "  /* Nenhuma sobreposição de modo escuro */"}
}
`;
}

// Exportador 3: Tailwind Theme Config Object
export function exportToTailwindConfig(tokens: DesignToken[]): string {
  const resolved = resolveAllTokens(tokens, "light");
  const colors: Record<string, string> = {};
  const spacing: Record<string, string> = {};
  const borderRadius: Record<string, string> = {};

  for (const r of resolved) {
    if (r.token.type === "color") {
      colors[r.token.path.replace(/^color\./, "")] = `var(--${r.token.path.replace(/\./g, "-")}, ${r.resolvedValue})`;
    } else if (r.token.type === "dimension") {
      spacing[r.token.path.replace(/^dimension\./, "")] = r.resolvedValue;
    } else if (r.token.type === "borderRadius") {
      borderRadius[r.token.path.replace(/^borderRadius\./, "")] = r.resolvedValue;
    }
  }

  const config = {
    theme: {
      extend: {
        colors,
        spacing,
        borderRadius,
      },
    },
  };

  return `// tailwind.config.js — Brand Guardian Tokens
module.exports = ${JSON.stringify(config, null, 2)};
`;
}

// Exportador 4: Markdown Documentation
export function exportToMarkdown(tokens: DesignToken[]): string {
  const resolved = resolveAllTokens(tokens, "light");
  let md = "# Design Tokens da Marca\n\n";
  md += "| Token Path | Tipo | Tier | Valor / Alias | Valor Resolvido | Descrição |\n";
  md += "| :--- | :--- | :--- | :--- | :--- | :--- |\n";

  for (const r of resolved) {
    md += `| \`${r.token.path}\` | ${r.token.type} | ${r.token.tier} | \`${r.token.value}\` | **\`${r.resolvedValue}\`** | ${r.token.description} |\n`;
  }

  return md;
}
