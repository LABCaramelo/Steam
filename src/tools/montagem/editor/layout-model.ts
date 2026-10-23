export type Panel = 'drawer' | 'inspector' | 'timeline';
export interface PanelSizes { drawer: number; inspector: number; timeline: number }
export interface WorkspaceSize {
  width: number;
  height: number;
  rail: number;
  chrome: number;
  drawerVisible: boolean;
  inspectorVisible: boolean;
}
export const DEFAULT_PANELS: PanelSizes = { drawer: 224, inspector: 252, timeline: 270 };
const clamp = (value: number, min: number, max: number) => Math.round(Math.max(min, Math.min(max, value)));

export function panelPreferences(value: unknown, fallback = DEFAULT_PANELS): PanelSizes {
  const record = value && typeof value === 'object' ? value as Partial<PanelSizes> : {};
  const result = { ...fallback };
  for (const panel of ['drawer', 'inspector', 'timeline'] as const) {
    const number = record[panel];
    if (typeof number === 'number' && Number.isFinite(number) && number > 0) result[panel] = number;
  }
  return result;
}

/** Leave room for the preview, even after restoring a layout on a smaller screen. */
export function fitPanels(preferred: PanelSizes, viewport: WorkspaceSize): PanelSizes {
  const value = panelPreferences(preferred);
  const available = Math.max(0, viewport.width - viewport.rail - 220
    - (viewport.drawerVisible ? 6 : 0) - (viewport.inspectorVisible ? 6 : 0));
  let drawer = viewport.drawerVisible ? clamp(value.drawer, 160, 480) : 0;
  let inspector = viewport.inspectorVisible ? clamp(value.inspector, 200, 440) : 0;
  const minimum = (drawer ? 160 : 0) + (inspector ? 200 : 0);
  if (drawer + inspector > available) {
    const extra = drawer + inspector - minimum;
    const scale = extra > 0 ? Math.max(0, (available - minimum) / extra) : 0;
    if (drawer) drawer = 160 + (drawer - 160) * scale;
    if (inspector) inspector = 200 + (inspector - 200) * scale;
    if (available < minimum) {
      drawer *= available / minimum;
      inspector *= available / minimum;
    }
  }
  const body = Math.max(0, viewport.height - viewport.chrome - 6);
  const maxTimeline = Math.min(640, Math.max(0, body - Math.min(160, body / 2)));
  return {
    drawer: viewport.drawerVisible ? Math.floor(drawer) : value.drawer,
    inspector: viewport.inspectorVisible ? Math.floor(inspector) : value.inspector,
    timeline: clamp(value.timeline, Math.min(132, maxTimeline), maxTimeline),
  };
}

export function panelBounds(panel: Panel, current: PanelSizes, viewport: WorkspaceSize): [number, number] {
  if (panel === 'timeline') {
    const body = Math.max(0, viewport.height - viewport.chrome - 6);
    const max = Math.min(640, Math.max(0, body - Math.min(160, body / 2)));
    return [Math.min(132, max), max];
  }
  const other = panel === 'drawer'
    ? (viewport.inspectorVisible ? current.inspector : 0)
    : (viewport.drawerVisible ? current.drawer : 0);
  const budget = viewport.width - viewport.rail - 220 - other
    - (viewport.drawerVisible ? 6 : 0) - (viewport.inspectorVisible ? 6 : 0);
  const max = Math.max(0, Math.min(panel === 'drawer' ? 480 : 440, budget));
  return [Math.min(panel === 'drawer' ? 160 : 200, max), max];
}
