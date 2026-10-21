import type { VideoKind } from "./types";

/** Only same-origin paths and HTTPS media; no script/data URLs or credentials. */
export function safeMedia(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")) {
    const url = new URL(raw, "https://lab.invalid");
    return `${url.pathname}${url.search}${url.hash}`;
  }
  try { const url = new URL(raw); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; }
}

export function videoId(kind: "youtube" | "vimeo", value: string): string | null {
  const valid = (id: string) => kind === "youtube" ? /^[\w-]{11}$/.test(id) : /^\d{5,15}$/.test(id);
  if (valid(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (kind === "youtube" && ["youtube.com", "www.youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(url.hostname)) {
      const id = url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).at(-1) ?? "";
      return valid(id) ? id : null;
    }
    if (kind === "vimeo" && ["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(url.hostname)) {
      const id = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
      return valid(id) ? id : null;
    }
  } catch { /* invalid URL */ }
  return null;
}

export function validLessonMedia(kind: VideoKind, ref: string): boolean {
  return kind === "youtube" || kind === "vimeo" ? !!videoId(kind, ref) : kind === "page" ? /^\/aula-head(?:\/|$)/.test(safeMedia(ref) ?? "") : !!safeMedia(ref);
}

export const duration = (seconds: number) => seconds > 0 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "Aula interativa";
