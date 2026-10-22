import { slides } from "./data";

export type DemoValue = string | number | boolean | number[];
export type LabState = { demo: Record<string, DemoValue>; checks: boolean[] };
export const emptyLabState = (): LabState => ({ demo: {}, checks: Array(10).fill(false) });
export function hashSlide() {
  const match = location.hash.match(/^#slide-(\d+)$/);
  return match ? Math.min(slides.length - 1, Math.max(0, Number(match[1]) - 1)) : 0;
}
