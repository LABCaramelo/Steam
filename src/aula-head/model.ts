export type DemoValue = string | number | boolean | number[];
export type Project = { brief: string[]; notes: string[]; completed: boolean[]; checks: boolean[]; demo: Record<string, DemoValue> };
export const STORAGE_KEY = "caramelo-head-lab-v1";
export const emptyProject = (): Project => ({ brief: Array(4).fill(""), notes: Array(16).fill(""), completed: Array(16).fill(false), checks: Array(10).fill(false), demo: {} });
export function readProject(): Project {
  const blank = emptyProject();
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!raw || typeof raw !== "object") return blank;
    for (const key of ["brief", "notes", "completed", "checks"] as const) {
      const source = raw[key];
      if (Array.isArray(source)) (blank[key] as (string | boolean)[]) = blank[key].map((fallback, i) => typeof source[i] === typeof fallback ? source[i] : fallback);
    }
    if (raw.demo && typeof raw.demo === "object" && !Array.isArray(raw.demo)) {
      for (const [key, value] of Object.entries(raw.demo)) {
        if (["string", "number", "boolean"].includes(typeof value) || (Array.isArray(value) && value.every(v => typeof v === "number"))) blank.demo[key] = value as DemoValue;
      }
    }
  } catch { /* A storage error is surfaced when saving in the app. */ }
  return blank;
}
export function hashSlide() {
  const match = location.hash.match(/^#slide-(\d+)$/);
  return match ? Math.min(15, Math.max(0, Number(match[1]) - 1)) : 0;
}
