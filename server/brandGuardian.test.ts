import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

import {
  cleanHex,
  evaluateContrast,
  generateHarmonies,
  generateTonalScale,
  hexToRgb,
  rgbToCmykApprox,
  rgbToHsl,
  rgbToOklch,
} from "../src/tools/brand-guardian/colorEngine.ts";
import {
  exportToCssCustomProperties,
  exportToDtcgJson,
  exportToMarkdown,
  exportToTailwindConfig,
  resolveAllTokens,
  resolveTokenValue,
} from "../src/tools/brand-guardian/tokenEngine.ts";
import { auditBrandConsistency } from "../src/tools/brand-guardian/validatorEngine.ts";
import { buildBrandContext } from "../src/tools/brand-guardian/brandContext.ts";
import { createDefaultBrandData } from "../src/tools/brand-guardian/repo.ts";
import type { Brand, DesignToken } from "../src/tools/brand-guardian/types.ts";

describe("Brand Guardian — Motor Cromático (Color Lab & WCAG 2.2)", () => {
  test("Limpeza e conversão precisa HEX para RGB", () => {
    assert.equal(cleanHex(" #ff701a "), "FF701A");
    assert.equal(cleanHex("#111"), "111111");

    const rgb = hexToRgb("#FF701A");
    assert.equal(rgb.r, 255);
    assert.equal(rgb.g, 112);
    assert.equal(rgb.b, 26);
  });

  test("Conversão RGB para HSL e OKLCH", () => {
    const hsl = rgbToHsl(255, 112, 26);
    assert.equal(hsl.h, 23);
    assert.equal(hsl.s, 100);
    assert.equal(hsl.l, 55);

    const oklch = rgbToOklch(255, 112, 26);
    assert.ok(oklch.l > 0.5 && oklch.l < 0.8);
    assert.ok(oklch.c > 0.15);
  });

  test("Cálculo referencial CMYK", () => {
    const cmyk = rgbToCmykApprox(255, 112, 26);
    assert.ok(cmyk.includes("C:0"));
    assert.ok(cmyk.includes("(Aprox)"));
  });

  test("Geração determinística de harmonias cromáticas", () => {
    const comp = generateHarmonies("#FF701A", "complementary");
    assert.equal(comp.length, 2);
    assert.equal(comp[0], "#FF701A");

    const triadic = generateHarmonies("#FF701A", "triadic");
    assert.equal(triadic.length, 3);

    const analogous = generateHarmonies("#FF701A", "analogous");
    assert.equal(analogous.length, 3);
  });

  test("Geração de escala tonal completa (50 a 900)", () => {
    const scale = generateTonalScale("#FF701A");
    const stops = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"];
    for (const stop of stops) {
      assert.ok(scale[stop], `Stop ${stop} deve existir`);
      assert.match(scale[stop], /^#[0-9A-F]{6}$/i);
    }
  });

  test("Avaliação rigorosa de contraste WCAG 2.2", () => {
    // Alto contraste: Warm Cream (#FFF4E8) sobre Ink Black (#101014)
    const highContrast = evaluateContrast("#FFF4E8", "#101014");
    assert.ok(highContrast.ratio > 15, `Razão deve ser superior a 15:1 (atual: ${highContrast.ratio})`);
    assert.equal(highContrast.normalTextAA, true);
    assert.equal(highContrast.normalTextAAA, true);
    assert.equal(highContrast.uiComponentsAA, true);

    // Baixo contraste: Cinza claro sobre branco
    const lowContrast = evaluateContrast("#CCCCCC", "#FFFFFF");
    assert.ok(lowContrast.ratio < 2.0);
    assert.equal(lowContrast.normalTextAA, false);
    assert.equal(lowContrast.normalTextAAA, false);
  });
});

describe("Brand Guardian — Motor de Tokens DTCG 2025.10", () => {
  const sampleTokens: DesignToken[] = [
    {
      id: "t1",
      path: "color.primitive.orange.500",
      tier: "primitive",
      type: "color",
      value: "#FF701A",
      description: "Laranja",
      status: "approved",
    },
    {
      id: "t2",
      path: "color.brand.primary",
      tier: "semantic",
      type: "color",
      value: "{color.primitive.orange.500}",
      description: "Primária semântica",
      status: "approved",
    },
    {
      id: "t3",
      path: "button.primary.bg",
      tier: "component",
      type: "color",
      value: "{color.brand.primary}",
      description: "Botão bg",
      status: "approved",
    },
  ];

  test("Resolução de aliases encadeados", () => {
    const resolved = resolveTokenValue(sampleTokens[2], sampleTokens, "light");
    assert.equal(resolved.value, "#FF701A");
    assert.equal(resolved.hasCycle, false);
    assert.deepEqual(resolved.chain, ["button.primary.bg", "color.brand.primary", "color.primitive.orange.500"]);
  });

  test("Detecção de referências circulares (DFS)", () => {
    const cyclicTokens: DesignToken[] = [
      {
        id: "c1",
        path: "loop.a",
        tier: "semantic",
        type: "color",
        value: "{loop.b}",
        description: "A aponta para B",
        status: "approved",
      },
      {
        id: "c2",
        path: "loop.b",
        tier: "semantic",
        type: "color",
        value: "{loop.a}",
        description: "B aponta para A",
        status: "approved",
      },
    ];

    const resolved = resolveTokenValue(cyclicTokens[0], cyclicTokens, "light");
    assert.equal(resolved.hasCycle, true);
    assert.equal(resolved.value, "#CYCLE_ERROR#");
  });

  test("Resolução de modos Light e Dark", () => {
    const themeToken: DesignToken = {
      id: "th1",
      path: "color.surface",
      tier: "semantic",
      type: "color",
      value: "#FFFFFF",
      modeValues: {
        light: "#FFFFFF",
        dark: "#101014",
      },
      description: "Superfície",
      status: "approved",
    };

    const lightRes = resolveTokenValue(themeToken, [themeToken], "light");
    assert.equal(lightRes.value, "#FFFFFF");

    const darkRes = resolveTokenValue(themeToken, [themeToken], "dark");
    assert.equal(darkRes.value, "#101014");
  });

  test("Exportadores de Tokens (DTCG JSON, CSS, Tailwind, Markdown)", () => {
    const allResolved = resolveAllTokens(sampleTokens);
    assert.equal(allResolved.length, 3);

    const json = exportToDtcgJson(sampleTokens);
    const parsed = JSON.parse(json);
    assert.equal(parsed.$version, "2025.10");
    assert.ok(parsed.color.brand.primary.$value);

    const css = exportToCssCustomProperties(sampleTokens);
    assert.ok(css.includes("--button-primary-bg: #FF701A;"));

    const tailwind = exportToTailwindConfig(sampleTokens);
    assert.ok(tailwind.includes("button.primary.bg"));

    const md = exportToMarkdown(sampleTokens);
    assert.ok(md.includes("| `color.brand.primary` |"));
  });
});

describe("Brand Guardian — Brand Guard & Brand Context Engine", () => {
  const brand: Brand = {
    id: "b-test",
    name: "Marca Teste",
    slug: "marca-teste",
    kind: "client",
    description: "Descrição teste",
    status: "published",
    logo_url: "/logo.svg",
    primary_color: "#FF701A",
    accent_color: "#25BFFF",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  test("Brand Guard audita integridade e gera apontamentos", () => {
    const completeData = createDefaultBrandData("Marca Teste", "#FF701A");
    const findings = auditBrandConsistency(completeData);
    const errors = findings.filter((f) => f.severity === "error");
    assert.equal(errors.length, 0, "Template padrão não deve conter erros críticos");
  });

  test("Brand Guard detecta quebra de contraste forçada", () => {
    const brokenData = createDefaultBrandData("Marca Quebrada", "#FF701A");
    brokenData.colors[1].hex = "#15151A"; // Quase idêntico a #101014
    const findings = auditBrandConsistency(brokenData);
    const contrastErrors = findings.filter((f) => f.module.includes("Cores") && f.severity === "error");
    assert.ok(contrastErrors.length > 0, "Deve acusar erro de contraste insuficiente");
  });

  test("Brand Context Engine gera contrato completo e snippet para IA", () => {
    const data = createDefaultBrandData("Caramelo Studio", "#FF701A");
    const context = buildBrandContext(brand, data, "1.0.0");

    assert.equal(context.name, "Marca Teste");
    assert.equal(context.colors.primary, "#FF701A");
    assert.ok(context.typography.displayFamily);
    assert.ok(context.resolvedTokens["button.primary.bg"]);
    assert.ok(context.aiPromptSnippet.includes("CONTEXTO DE MARCA"));
  });
});

describe("Brand Guardian — Validação Estrutural da Migration DDL e RLS", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const sqlContent = fs.readFileSync(path.join(root, "supabase", "brand-guardian.sql"), "utf8");

  test("Registro oficial de AppID 19 e slug brand-guardian", () => {
    assert.ok(sqlContent.includes("values ('brand-guardian', 19, 'Brand Guardian'"));
    assert.ok(sqlContent.includes("alter table public.lab_tools add column if not exists stage text"));
  });

  test("Criação das 3 tabelas relacionais canônicas", () => {
    assert.ok(sqlContent.includes("create table if not exists public.brand_guardian_brands"));
    assert.ok(sqlContent.includes("create table if not exists public.brand_guardian_assets"));
    assert.ok(sqlContent.includes("create table if not exists public.brand_guardian_releases"));
  });

  test("Habilitação explícita de RLS em todas as tabelas", () => {
    assert.ok(sqlContent.includes("alter table public.brand_guardian_brands enable row level security;"));
    assert.ok(sqlContent.includes("alter table public.brand_guardian_assets enable row level security;"));
    assert.ok(sqlContent.includes("alter table public.brand_guardian_releases enable row level security;"));
  });

  test("Políticas de isolamento RLS por owner_id e workspace_id", () => {
    assert.ok(sqlContent.includes('create policy "brand_guardian_brands_owner_all"'));
    assert.ok(sqlContent.includes('create policy "brand_guardian_assets_owner_all"'));
    assert.ok(sqlContent.includes('create policy "brand_guardian_releases_owner_all"'));
  });

  test("Definição de índices de performance para consultas relacionais", () => {
    assert.ok(sqlContent.includes("idx_brand_guardian_brands_owner"));
    assert.ok(sqlContent.includes("idx_brand_guardian_brands_workspace"));
    assert.ok(sqlContent.includes("idx_brand_guardian_assets_brand"));
    assert.ok(sqlContent.includes("idx_brand_guardian_releases_brand"));
  });
});

describe("Brand Guardian — Component Studio Engine & DaisyUI 5", () => {
  const brand: Brand = {
    id: "b-caramelo",
    name: "Caramelo Studio",
    slug: "caramelo-studio",
    kind: "agency",
    description: "Estúdio de Interação",
    status: "published",
    logo_url: "/logo.svg",
    primary_color: "#FF701A",
    accent_color: "#25BFFF",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const brandData = createDefaultBrandData("Caramelo Studio", "#FF701A");

  test("Biblioteca de componentes DaisyUI inclui todos os componentes essenciais", async () => {
    const { CANONICAL_DAISY_COMPONENTS } = await import("../src/tools/brand-guardian/componentStudioEngine.ts");
    assert.ok(CANONICAL_DAISY_COMPONENTS.length >= 18);

    const requiredTags = [
      "btn",
      "modal",
      "drawer",
      "dropdown",
      "tooltip",
      "table",
      "join",
      "skeleton",
      "toast",
      "loading",
      "steps",
      "tabs",
      "collapse",
      "breadcrumbs",
      "alert",
      "progress",
    ];

    for (const tag of requiredTags) {
      const found = CANONICAL_DAISY_COMPONENTS.some((c) => c.daisyTag === tag);
      assert.ok(found, `Componente com tag '${tag}' deve estar presente na biblioteca`);
    }
  });

  test("Exportador de Tema DaisyUI 5 gera sintaxe oficial @plugin 'daisyui/theme'", async () => {
    const { exportDaisyUi5ThemeCss } = await import("../src/tools/brand-guardian/componentStudioEngine.ts");
    const css = exportDaisyUi5ThemeCss(brand, brandData);

    assert.ok(css.includes('@plugin "daisyui"'));
    assert.ok(css.includes('@plugin "daisyui/theme"'));
    assert.ok(css.includes('name: "caramelo-studio"'));
    assert.ok(css.includes("--color-primary: #FF701A"));
    assert.ok(css.includes("--color-accent: #25BFFF"));
    assert.ok(css.includes("--color-base-100: #101014"));
  });

  test("Exportador DaisyUI 4 gera configuração compatível com Tailwind v3", async () => {
    const { exportDaisyUi4TailwindConfig } = await import("../src/tools/brand-guardian/componentStudioEngine.ts");
    const config = exportDaisyUi4TailwindConfig(brand, brandData);

    assert.ok(config.includes('plugins: [require("daisyui")]'));
    assert.ok(config.includes('"caramelo-studio": {'));
    assert.ok(config.includes('"primary": "#FF701A"'));
    assert.ok(config.includes('"accent": "#25BFFF"'));
  });

  test("Exportador de manifesto package.json declara dependências limpas", async () => {
    const { exportComponentPackageJson } = await import("../src/tools/brand-guardian/componentStudioEngine.ts");
    const jsonStr = exportComponentPackageJson(brand, "1.2.0");
    const pkg = JSON.parse(jsonStr);

    assert.equal(pkg.name, "@caramelo-studio/design-system");
    assert.equal(pkg.version, "1.2.0");
    assert.ok(pkg.peerDependencies.daisyui);
    assert.ok(pkg.peerDependencies.tailwindcss);
  });

  test("Gerador de snippets produz marcação oficial DaisyUI 5 para botões e modais", async () => {
    const { CANONICAL_DAISY_COMPONENTS, generateDaisyUi5Snippet } = await import(
      "../src/tools/brand-guardian/componentStudioEngine.ts"
    );

    const btnComp = CANONICAL_DAISY_COMPONENTS.find((c) => c.id === "btn")!;
    const btnSnippet = generateDaisyUi5Snippet(btnComp, { ...btnComp.defaultProps, variant: "primary", size: "sm" }, brand);
    assert.ok(btnSnippet.includes("btn btn-primary btn-sm"));

    const modalComp = CANONICAL_DAISY_COMPONENTS.find((c) => c.id === "modal")!;
    const modalSnippet = generateDaisyUi5Snippet(modalComp, { ...modalComp.defaultProps, open: true }, brand);
    assert.ok(modalSnippet.includes("modal modal-open"));
    assert.ok(modalSnippet.includes("modal-box"));
  });
});
