import { toolStorageKey } from '../../../toolLifecycle';
import { DEFAULT_PANELS, fitPanels, panelBounds, panelPreferences } from './layout-model';
import type { Panel, PanelSizes, WorkspaceSize } from './layout-model';

/** User workspace preferences are independent from the video project and its undo history. */
export class PanelLayout {
  private lifecycle = new AbortController();
  private observer: ResizeObserver;
  private preferences: PanelSizes;
  private current: PanelSizes;
  private defaults: PanelSizes;
  private key: string;
  private handles = new Map<Panel, HTMLElement>();
  private drag: { panel: Panel; pointer: number; origin: number; size: number; before: PanelSizes } | null = null;

  constructor(private root: HTMLElement, userId: string) {
    this.key = toolStorageKey(userId, 'montagem', 'layout');
    const css = getComputedStyle(root);
    this.defaults = panelPreferences({
      drawer: parseFloat(css.getPropertyValue('--drawer-width')),
      inspector: parseFloat(css.getPropertyValue('--inspector-width')),
      timeline: parseFloat(css.getPropertyValue('--timeline-height')),
    }, DEFAULT_PANELS);
    this.preferences = { ...this.defaults };
    try { this.preferences = panelPreferences(JSON.parse(localStorage.getItem(this.key) || 'null'), this.defaults); } catch { /* A restricted or stale store must not block editing. */ }
    this.current = { ...this.preferences };
    const workspace = root.querySelector<HTMLElement>('.montagem-workspace')!;
    const sidebar = workspace.querySelector<HTMLElement>('aside')!;
    sidebar.classList.add('montagem-sidebar');
    sidebar.id = 'montagem-media-panel';
    const inspector = workspace.querySelector<HTMLElement>('.montagem-inspector')!;
    inspector.id = 'montagem-properties-panel';
    const timeline = root.querySelector<HTMLElement>('.montagem-timeline-area')!;
    timeline.id = 'montagem-timeline-panel';
    sidebar.after(this.createHandle('drawer', 'Largura da biblioteca de mídia', sidebar.id));
    inspector.before(this.createHandle('inspector', 'Largura das propriedades', inspector.id));
    timeline.before(this.createHandle('timeline', 'Altura da timeline', timeline.id));
    this.observer = new ResizeObserver(() => this.apply());
    this.observer.observe(root);
    window.addEventListener('blur', () => this.endDrag(false), { signal: this.lifecycle.signal });
    this.apply();
  }

  private viewport(): WorkspaceSize {
    const visible = (selector: string) => {
      const element = this.root.querySelector<HTMLElement>(selector)!;
      const css = getComputedStyle(element);
      return css.display !== 'none' && css.position !== 'absolute';
    };
    return {
      width: this.root.clientWidth,
      height: this.root.clientHeight,
      rail: this.root.querySelector<HTMLElement>('.sider-rail')!.getBoundingClientRect().width,
      chrome: this.root.querySelector<HTMLElement>('.montagem-header')!.getBoundingClientRect().height
        + this.root.querySelector<HTMLElement>('.montagem-statusbar')!.getBoundingClientRect().height,
      drawerVisible: visible('.sider-drawer'),
      inspectorVisible: visible('.montagem-inspector'),
    };
  }

  private createHandle(panel: Panel, label: string, controls: string) {
    const handle = document.createElement('div');
    const vertical = panel !== 'timeline';
    handle.className = 'montagem-resize-handle';
    handle.dataset.axis = vertical ? 'x' : 'y';
    handle.dataset.panel = panel;
    handle.tabIndex = 0;
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-label', label);
    handle.setAttribute('aria-orientation', vertical ? 'vertical' : 'horizontal');
    handle.setAttribute('aria-controls', controls);
    handle.title = `${label}: arraste para ajustar. Setas: ajustar; Enter ou clique duplo: restaurar.`;
    this.handles.set(panel, handle);
    const signal = this.lifecycle.signal;
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || this.drag) return;
      event.preventDefault();
      event.stopPropagation();
      handle.focus({ preventScroll: true });
      handle.setPointerCapture(event.pointerId);
      this.drag = { panel, pointer: event.pointerId, origin: vertical ? event.clientX : event.clientY,
        size: this.current[panel], before: { ...this.preferences } };
      handle.classList.add('is-resizing');
      this.root.classList.add('is-resizing');
      this.root.dataset.resizeAxis = vertical ? 'x' : 'y';
    }, { signal });
    handle.addEventListener('pointermove', event => {
      if (!this.drag || event.pointerId !== this.drag.pointer) return;
      event.preventDefault();
      const delta = (vertical ? event.clientX : event.clientY) - this.drag.origin;
      this.setPanel(panel, this.drag.size + delta * (panel === 'drawer' ? 1 : -1));
    }, { signal });
    handle.addEventListener('pointerup', () => this.endDrag(true), { signal });
    handle.addEventListener('pointercancel', () => this.endDrag(false), { signal });
    handle.addEventListener('lostpointercapture', () => this.endDrag(true), { signal });
    handle.addEventListener('dblclick', () => this.reset(panel), { signal });
    handle.addEventListener('keydown', event => {
      // Do not let editor shortcuts act on clips while a separator has focus.
      event.stopPropagation();
      if (event.key === 'Escape' && this.drag) { event.preventDefault(); this.endDrag(false); return; }
      const [min, max] = panelBounds(panel, this.current, this.viewport());
      let next: number | undefined;
      const step = event.shiftKey ? 24 : 8;
      if (event.key === 'Enter') { event.preventDefault(); this.reset(panel); return; }
      if (event.key === 'Home') next = min;
      if (event.key === 'End') next = max;
      if (vertical && event.key === 'ArrowLeft') next = this.current[panel] + (panel === 'drawer' ? -step : step);
      if (vertical && event.key === 'ArrowRight') next = this.current[panel] + (panel === 'drawer' ? step : -step);
      if (!vertical && event.key === 'ArrowUp') next = this.current[panel] + step;
      if (!vertical && event.key === 'ArrowDown') next = this.current[panel] - step;
      if (next === undefined) return;
      event.preventDefault();
      this.setPanel(panel, next);
      this.save();
    }, { signal });
    return handle;
  }

  private setPanel(panel: Panel, value: number) {
    const [min, max] = panelBounds(panel, this.current, this.viewport());
    this.preferences[panel] = Math.max(min, Math.min(max, value));
    this.apply();
  }

  private apply() {
    const viewport = this.viewport();
    this.current = fitPanels(this.preferences, viewport);
    this.root.style.setProperty('--workspace-min-height', `${Math.min(160, Math.max(0, viewport.height - viewport.chrome - 6) / 2)}px`);
    for (const [panel, handle] of this.handles) {
      this.root.style.setProperty(`--${panel === 'timeline' ? 'timeline-height' : panel === 'drawer' ? 'drawer-width' : 'inspector-width'}`, `${this.current[panel]}px`);
      const [min, max] = panelBounds(panel, this.current, viewport);
      handle.setAttribute('aria-valuemin', String(Math.round(min)));
      handle.setAttribute('aria-valuemax', String(Math.round(max)));
      handle.setAttribute('aria-valuenow', String(Math.round(this.current[panel])));
      handle.setAttribute('aria-valuetext', `${Math.round(this.current[panel])} pixels`);
    }
  }

  private reset(panel: Panel) { this.preferences[panel] = this.defaults[panel]; this.apply(); this.save(); }
  private save() { try { localStorage.setItem(this.key, JSON.stringify(this.preferences)); } catch { /* Resizing still works without persistence. */ } }
  private endDrag(commit: boolean) {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    if (!commit) { this.preferences = drag.before; this.apply(); }
    else this.save();
    const handle = this.handles.get(drag.panel)!;
    handle.classList.remove('is-resizing');
    this.root.classList.remove('is-resizing');
    delete this.root.dataset.resizeAxis;
    if (handle.hasPointerCapture(drag.pointer)) handle.releasePointerCapture(drag.pointer);
  }

  dispose() { this.endDrag(false); this.lifecycle.abort(); this.observer.disconnect(); }
}
