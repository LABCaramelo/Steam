// Parser for Valve's text KeyValues format (.vdf / .acf).
// Grammar: "key" "value" | "key" { ... } with // comments; keys are case-sensitive here.

export type VdfObject = { [key: string]: string | VdfObject };

export function parseVdf(text: string): VdfObject {
  let i = 0;
  const n = text.length;

  function skipWs() {
    while (i < n) {
      const c = text[i];
      if (c === " " || c === "\t" || c === "\r" || c === "\n" || c === "﻿") i++;
      else if (c === "/" && text[i + 1] === "/") {
        while (i < n && text[i] !== "\n") i++;
      } else break;
    }
  }

  function readToken(): string | null {
    skipWs();
    if (i >= n) return null;
    const c = text[i];
    if (c === "{" || c === "}") {
      i++;
      return c;
    }
    if (c === '"') {
      i++;
      let out = "";
      while (i < n && text[i] !== '"') {
        if (text[i] === "\\" && i + 1 < n) {
          const e = text[i + 1];
          out += e === "n" ? "\n" : e === "t" ? "\t" : e;
          i += 2;
        } else out += text[i++];
      }
      i++; // closing quote
      return out;
    }
    // unquoted token
    let out = "";
    while (i < n && !/[\s{}"]/.test(text[i])) out += text[i++];
    return out;
  }

  function parseObject(): VdfObject {
    const obj: VdfObject = {};
    for (;;) {
      const key = readToken();
      if (key === null || key === "}") return obj;
      skipWs();
      // conditional suffixes like [$WIN32] are ignored
      const value = readToken();
      if (value === "{") obj[key] = parseObject();
      else if (value !== null) obj[key] = value;
      skipWs();
      if (text[i] === "[") {
        while (i < n && text[i] !== "]") i++;
        i++;
      }
    }
  }

  return parseObject();
}

/** Case-insensitive child lookup; Steam is inconsistent about key casing ("apps" vs "Apps"). */
export function child(obj: VdfObject | undefined, key: string): VdfObject | undefined {
  if (!obj) return undefined;
  const k = Object.keys(obj).find((x) => x.toLowerCase() === key.toLowerCase());
  const v = k === undefined ? undefined : obj[k];
  return typeof v === "object" ? v : undefined;
}

export function str(obj: VdfObject | undefined, key: string): string | undefined {
  if (!obj) return undefined;
  const k = Object.keys(obj).find((x) => x.toLowerCase() === key.toLowerCase());
  const v = k === undefined ? undefined : obj[k];
  return typeof v === "string" ? v : undefined;
}

export function num(obj: VdfObject | undefined, key: string): number {
  const v = Number(str(obj, key));
  return Number.isFinite(v) ? v : 0;
}
