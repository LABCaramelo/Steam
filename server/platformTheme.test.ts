import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  DEFAULT_PLATFORM_COLORS,
  PLATFORM_THEME_PRESETS,
  PLATFORM_THEME_STORAGE_KEY,
  PLATFORM_THEME_CHANNEL,
  hexToRgbValues,
  rgbToHex,
} from "../src/theme/platformTheme.ts";

describe("LAB Caramelo — Motor de Customização Dinâmica de Cores", () => {
  test("Constantes e paleta canônica padrão V2 estão íntegras", () => {
    assert.equal(DEFAULT_PLATFORM_COLORS.accent, "#FF701A");
    assert.equal(DEFAULT_PLATFORM_COLORS.surface, "#101014");
    assert.equal(DEFAULT_PLATFORM_COLORS.stage, "#0A0A0D");
    assert.equal(DEFAULT_PLATFORM_COLORS.text, "#FFF4E8");
    assert.equal(DEFAULT_PLATFORM_COLORS.focus, "#25BFFF");
    assert.equal(DEFAULT_PLATFORM_COLORS.danger, "#FF3D8D");
    assert.equal(DEFAULT_PLATFORM_COLORS.warning, "#FFD52A");
    assert.equal(DEFAULT_PLATFORM_COLORS.violet, "#7657FF");
    assert.equal(DEFAULT_PLATFORM_COLORS.success, "#3DDC97");

    assert.equal(PLATFORM_THEME_STORAGE_KEY, "caramelo_platform_theme_v1");
    assert.equal(PLATFORM_THEME_CHANNEL, "caramelo_platform_theme_sync");
  });

  test("Presets de tema estão íntegros e contêm todas as cores obrigatórias", () => {
    assert.ok(PLATFORM_THEME_PRESETS.length >= 7);
    const requiredKeys = ["accent", "surface", "stage", "text", "focus", "danger", "warning", "violet", "success"] as const;

    for (const preset of PLATFORM_THEME_PRESETS) {
      assert.ok(preset.id, "Preset deve possuir id");
      assert.ok(preset.name, "Preset deve possuir nome");
      assert.ok(preset.description, "Preset deve possuir descrição");

      for (const k of requiredKeys) {
        assert.ok(preset.colors[k], `Preset ${preset.id} deve definir ${k}`);
        assert.match(preset.colors[k], /^#[0-9A-Fa-f]{6}$/, `Cor ${k} de ${preset.id} deve ser um HEX válido`);
      }
    }
  });

  test("hexToRgbValues converte com precisão", () => {
    const caramel = hexToRgbValues("#FF701A");
    assert.equal(caramel.r, 255);
    assert.equal(caramel.g, 112);
    assert.equal(caramel.b, 26);

    const ink = hexToRgbValues("#101014");
    assert.equal(ink.r, 16);
    assert.equal(ink.g, 16);
    assert.equal(ink.b, 20);

    const shortHex = hexToRgbValues("#FFF");
    assert.equal(shortHex.r, 255);
    assert.equal(shortHex.g, 255);
    assert.equal(shortHex.b, 255);
  });

  test("rgbToHex formata em hexadecimal maiúsculo com zero padding", () => {
    assert.equal(rgbToHex(255, 112, 26), "#FF701A");
    assert.equal(rgbToHex(16, 16, 20), "#101014");
    assert.equal(rgbToHex(0, 0, 0), "#000000");
  });
});
