// ==============================================================================
// Brand Guardian — Motor Cromático & Color Lab
// Conversões determinísticas (HEX/RGB/HSL/OKLCH/CMYK), Harmonias, Escalas e WCAG 2.2
// ==============================================================================

import type { ColorHarmonyType, ContrastResult } from "./types";

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number; // 0..360
  s: number; // 0..100
  l: number; // 0..100
}

export interface OKLCH {
  l: number; // 0..1
  c: number; // 0..0.4
  h: number; // 0..360
}

export function cleanHex(hex: string): string {
  let cleaned = hex.trim().replace(/^#/, "");
  if (cleaned.length === 3) {
    cleaned = cleaned.split("").map((c) => c + c).join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return "101014"; // fallback seguro
  }
  return cleaned.toUpperCase();
}

export function hexToRgb(hex: string): RGB {
  const c = cleanHex(hex);
  return {
    r: parseInt(c.substring(0, 2), 16),
    g: parseInt(c.substring(2, 4), 16),
    b: parseInt(c.substring(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const hNorm = (h % 360 + 360) % 360 / 360;
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const lNorm = Math.max(0, Math.min(100, l)) / 100;

  if (sNorm === 0) {
    const val = Math.round(lNorm * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tNorm = t;
    if (tNorm < 0) tNorm += 1;
    if (tNorm > 1) tNorm -= 1;
    if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
    if (tNorm < 1 / 2) return q;
    if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
    return p;
  };

  const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
  const p = 2 * lNorm - q;

  return {
    r: Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hNorm) * 255),
    b: Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255),
  };
}

// Conversão aproximada RGB para OKLCH para cálculos perceptualmente uniformes
export function rgbToOklch(r: number, g: number, b: number): OKLCH {
  // sRGB linear
  const toLinear = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  // sRGB para LMS
  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  // LMS para Oklab
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bOklab = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  const C = Math.sqrt(a * a + bOklab * bOklab);
  let H = (Math.atan2(bOklab, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return {
    l: Math.round(L * 1000) / 1000,
    c: Math.round(C * 1000) / 1000,
    h: Math.round(H * 10) / 10,
  };
}

// CMYK referencial para especificações com alerta profissional
export function rgbToCmykApprox(r: number, g: number, b: number): string {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const k = 1 - Math.max(rNorm, gNorm, bNorm);
  if (k === 1) return "C:0 M:0 Y:0 K:100 (Aprox)";
  const c = Math.round(((1 - rNorm - k) / (1 - k)) * 100);
  const m = Math.round(((1 - gNorm - k) / (1 - k)) * 100);
  const y = Math.round(((1 - bNorm - k) / (1 - k)) * 100);
  const kPercent = Math.round(k * 100);
  return `C:${c} M:${m} Y:${y} K:${kPercent} (Aprox)`;
}

// Luminância relativa WCAG 2.2
export function getRelativeLuminance(rgb: RGB): number {
  const srgb = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  const linear = srgb.map((val) => (val <= 0.04045 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

// Cálculo de Contraste WCAG 2.2 (L1 + 0.05) / (L2 + 0.05)
export function evaluateContrast(fgHex: string, bgHex: string): ContrastResult {
  const fgRgb = hexToRgb(fgHex);
  const bgRgb = hexToRgb(bgHex);
  const l1 = getRelativeLuminance(fgRgb);
  const l2 = getRelativeLuminance(bgRgb);
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = Math.round(((brighter + 0.05) / (darker + 0.05)) * 100) / 100;

  return {
    fgHex: `#${cleanHex(fgHex)}`,
    bgHex: `#${cleanHex(bgHex)}`,
    ratio,
    normalTextAA: ratio >= 4.5,
    normalTextAAA: ratio >= 7.0,
    largeTextAA: ratio >= 3.0,
    largeTextAAA: ratio >= 4.5,
    uiComponentsAA: ratio >= 3.0,
  };
}

// Gerador de Harmonias Cromáticas
export function generateHarmonies(baseHex: string, harmonyType: ColorHarmonyType): string[] {
  const rgb = hexToRgb(baseHex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const rotate = (angle: number): string => {
    const newHue = (hsl.h + angle + 360) % 360;
    const newRgb = hslToRgb(newHue, hsl.s, hsl.l);
    return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
  };

  switch (harmonyType) {
    case "complementary":
      return [`#${cleanHex(baseHex)}`, rotate(180)];
    case "analogous":
      return [rotate(-30), `#${cleanHex(baseHex)}`, rotate(30)];
    case "triadic":
      return [`#${cleanHex(baseHex)}`, rotate(120), rotate(240)];
    case "tetradic":
      return [`#${cleanHex(baseHex)}`, rotate(90), rotate(180), rotate(270)];
    case "split_complementary":
      return [`#${cleanHex(baseHex)}`, rotate(150), rotate(210)];
    case "monochromatic": {
      const stops = [92, 75, 58, 42, 25];
      return stops.map((lVal) => {
        const newRgb = hslToRgb(hsl.h, hsl.s, lVal);
        return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
      });
    }
    default:
      return [`#${cleanHex(baseHex)}`];
  }
}

// Gerador de Escalas Tonais (50 a 900)
export function generateTonalScale(baseHex: string): Record<string, string> {
  const rgb = hexToRgb(baseHex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const scaleKeys = [
    { key: "50", lightness: 97, satMult: 0.7 },
    { key: "100", lightness: 92, satMult: 0.8 },
    { key: "200", lightness: 84, satMult: 0.9 },
    { key: "300", lightness: 73, satMult: 0.95 },
    { key: "400", lightness: 60, satMult: 1.0 },
    { key: "500", lightness: 50, satMult: 1.0 }, // Base ou centro
    { key: "600", lightness: 40, satMult: 1.05 },
    { key: "700", lightness: 30, satMult: 1.1 },
    { key: "800", lightness: 20, satMult: 1.15 },
    { key: "900", lightness: 12, satMult: 1.2 },
  ];

  const result: Record<string, string> = {};
  for (const stop of scaleKeys) {
    const s = Math.min(100, Math.round(hsl.s * stop.satMult));
    const newRgb = hslToRgb(hsl.h, s, stop.lightness);
    result[stop.key] = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
  }
  return result;
}

// Extração de Paleta de Imagem via HTML5 Canvas (Pixel sampling)
export async function extractPaletteFromImage(file: File, sampleCount = 6): Promise<string[]> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(["#FF701A", "#25BFFF", "#101014", "#FFF4E8"]);

        const width = (canvas.width = Math.min(img.naturalWidth, 120));
        const height = (canvas.height = Math.min(img.naturalHeight, 120));
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height).data;
        const colorCounts: Record<string, number> = {};

        // Amostragem com quantização (passo de 16 para agrupar tons similares)
        for (let i = 0; i < imgData.length; i += 16) {
          const r = Math.round(imgData[i] / 24) * 24;
          const g = Math.round(imgData[i + 1] / 24) * 24;
          const b = Math.round(imgData[i + 2] / 24) * 24;
          const alpha = imgData[i + 3];
          if (alpha > 128) {
            const hex = rgbToHex(r, g, b);
            colorCounts[hex] = (colorCounts[hex] || 0) + 1;
          }
        }

        const sorted = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([hex]) => hex);

        resolve(sorted.slice(0, sampleCount));
      };
      img.onerror = () => resolve(["#FF701A", "#25BFFF", "#101014", "#FFF4E8"]);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(["#FF701A", "#25BFFF", "#101014", "#FFF4E8"]);
    reader.readAsDataURL(file);
  });
}
