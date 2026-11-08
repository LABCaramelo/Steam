import type { StylePreset } from './types';

export const STYLE_PRESETS: StylePreset[] = [];

export function findStyle(id: string | null | undefined, custom: StylePreset[] = []): StylePreset | undefined {
  if (!id) return undefined;
  return custom.find((s) => s.id === id);
}
