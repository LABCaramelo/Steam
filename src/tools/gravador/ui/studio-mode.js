export class StudioModeView {
  constructor(container, compositor, transitions) {
    Object.assign(this, { container, compositor, transitions });
    this.events = new AbortController();
    this.onTransition = null;
    this.onTransformEnd = null;
    this.drag = null;
    this._setupUI();
  }
  _setupUI() {
    this.container.innerHTML = `
      <div class="studio-pane">
        <div class="studio-pane-header studio-preview-header"><span>● PRÉVIA</span></div>
        <div class="canvas-viewport-wrapper" id="studio-preview-wrapper"><canvas class="obs-render-canvas" id="studio-preview-canvas" aria-label="Prévia: selecione e arraste uma fonte"></canvas></div>
      </div>
      <div class="studio-transition-col">
        <button class="obs-btn primary" id="btn-studio-cut" style="width:100%">Cortar</button>
        <button class="obs-btn" id="btn-studio-fade" style="width:100%">Esmaecer</button>
      </div>
      <div class="studio-pane">
        <div class="studio-pane-header studio-program-header"><span>● SAÍDA</span></div>
        <div class="canvas-viewport-wrapper" id="studio-program-wrapper"><canvas class="obs-render-canvas" id="studio-program-canvas" aria-label="Saída da gravação e transmissão"></canvas></div>
      </div>`;
    this.previewCanvas = this.container.querySelector('#studio-preview-canvas');
    this.programCanvas = this.container.querySelector('#studio-program-canvas');
    const signal = this.events.signal;
    const transition = (type, duration) => {
      if (this.transitions.isTransitioning || this.compositor.activeScene === this.compositor.previewScene) return;
      this.onTransition?.(type, duration);
    };
    this.container.querySelector('#btn-studio-cut').addEventListener('click', () => transition('cut', 0), { signal });
    this.container.querySelector('#btn-studio-fade').addEventListener('click', () => transition(this.transitions.type, this.transitions.duration), { signal });
    this.previewCanvas.addEventListener('pointerdown', event => {
      if (!this.compositor.isStudioMode || this.transitions.isTransitioning || event.button !== 0) return;
      const rect = this.previewCanvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const source = this.compositor.hitTestSource((event.clientX - rect.left) * this.compositor.width / rect.width, (event.clientY - rect.top) * this.compositor.height / rect.height, this.compositor.previewScene);
      this.compositor.selectSource(source);
      if (source && !source.locked) {
        this.drag = { source, x: event.clientX, y: event.clientY, sourceX: source.x, sourceY: source.y, scaleX: this.compositor.width / rect.width, scaleY: this.compositor.height / rect.height };
        this.previewCanvas.setPointerCapture?.(event.pointerId);
        event.preventDefault();
      }
    }, { signal });
    this.previewCanvas.addEventListener('pointermove', event => {
      if (!this.drag) return;
      const drag = this.drag;
      if (!this.compositor.isStudioMode || this.transitions.isTransitioning || drag.source.destroyed || drag.source.locked || !this.compositor.previewScene?.sources.includes(drag.source)) { this.drag = null; return; }
      drag.source.x = Math.round(drag.sourceX + (event.clientX - drag.x) * drag.scaleX);
      drag.source.y = Math.round(drag.sourceY + (event.clientY - drag.y) * drag.scaleY);
    }, { signal });
    const endDrag = () => { if (this.drag) { this.drag = null; this.onTransformEnd?.(); } };
    this.previewCanvas.addEventListener('pointerup', endDrag, { signal });
    this.previewCanvas.addEventListener('pointercancel', endDrag, { signal });
    this.previewCanvas.addEventListener('lostpointercapture', endDrag, { signal });
    window.addEventListener('blur', endDrag, { signal });
    this.compositor.previewCanvas = this.previewCanvas;
    this.previewCanvas.width = this.compositor.width;
    this.previewCanvas.height = this.compositor.height;
    this.compositor.previewCtx = this.previewCanvas.getContext('2d', { alpha: false });
    this.compositor.setStudioProgramCanvas(this.programCanvas);
    this.updateLayout();
    window.addEventListener('resize', () => this.updateLayout(), { signal });
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.updateLayout());
      this.resizeObserver.observe(this.container);
    }
  }
  updateLayout() {
    this.container.querySelectorAll('.studio-pane').forEach(pane => {
      const rect = pane.getBoundingClientRect();
      const scale = Math.max(0, Math.min((rect.width - 24) / this.compositor.width, (rect.height - 40) / this.compositor.height, 1));
      const width = `${Math.floor(this.compositor.width * scale)}px`;
      const height = `${Math.floor(this.compositor.height * scale)}px`;
      [pane.querySelector('canvas'), pane.querySelector('.canvas-viewport-wrapper')].forEach(element => { if (element) { element.style.width = width; element.style.height = height; } });
    });
  }
  destroy() {
    this.events.abort();
    this.resizeObserver?.disconnect();
    this.drag = null;
    if (this.compositor.previewCanvas === this.previewCanvas) { this.compositor.previewCanvas = null; this.compositor.previewCtx = null; }
    if (this.compositor.studioProgramCanvas === this.programCanvas) { this.compositor.studioProgramCanvas = null; this.compositor.studioProgramCtx = null; }
  }
}
