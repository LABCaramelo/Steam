import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { installPlatformThemeSync } from "../src/theme/platformTheme.ts";

// O LAB segue o Apple Design System e não tem mais presets nem paleta personalizada.
// installPlatformThemeSync só apaga o que o motor antigo deixou para trás.
describe("LAB — limpeza do tema de plataforma antigo", () => {
  test("remove o cache local e as variáveis inline gravadas pelo motor antigo", () => {
    const store = new Map<string, string>([["caramelo_platform_theme_v1", "{\"version\":1}"], ["outra-chave", "fica"]]);
    const removed: string[] = [];
    const g = globalThis as Record<string, unknown>;
    const previous = { localStorage: g.localStorage, document: g.document };
    g.localStorage = { removeItem: (k: string) => store.delete(k) };
    g.document = { documentElement: { style: { removeProperty: (p: string) => removed.push(p) } } };
    try {
      const stop = installPlatformThemeSync();
      assert.equal(typeof stop, "function");
      assert.equal(store.has("caramelo_platform_theme_v1"), false);
      assert.equal(store.get("outra-chave"), "fica");
      for (const prop of ["--cm-accent", "--cm-stage", "--cm-fg", "--c-accent", "--accent-caramel", "--g-play"]) {
        assert.ok(removed.includes(prop), `deveria limpar ${prop}`);
      }
    } finally {
      g.localStorage = previous.localStorage;
      g.document = previous.document;
    }
  });

  test("funciona sem localStorage (navegação privada ou bloqueada)", () => {
    const g = globalThis as Record<string, unknown>;
    const previous = { localStorage: g.localStorage, document: g.document };
    g.localStorage = { removeItem: () => { throw new Error("bloqueado"); } };
    g.document = undefined;
    try {
      assert.doesNotThrow(() => installPlatformThemeSync());
    } finally {
      g.localStorage = previous.localStorage;
      g.document = previous.document;
    }
  });
});
