// Canvas View & Interactive Gizmo
export class CanvasView {
  constructor(container, compositor) {
    this.container = container;
    this.compositor = compositor;
    this.viewportCanvas = null;
    this.gizmo = null;
    this.scale = 1.0;
    this.offsetX = 0;
    this.offsetY = 0;

    this.activeHandle = null;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.sourceStart = { x: 0, y: 0, w: 0, h: 0 };

    this._setupUI();
    this._attachEvents();
  }

  _setupUI() {
    this.container.innerHTML = `
      <div class="canvas-viewport-wrapper" id="viewport-wrapper">
        <canvas class="obs-render-canvas" id="main-render-canvas"></canvas>
        <div class="transform-bounding-box" id="transform-gizmo" style="display: none;">
          <div class="transform-handle nw" data-handle="nw"></div>
          <div class="transform-handle n" data-handle="n"></div>
          <div class="transform-handle ne" data-handle="ne"></div>
          <div class="transform-handle e" data-handle="e"></div>
          <div class="transform-handle se" data-handle="se"></div>
          <div class="transform-handle s" data-handle="s"></div>
          <div class="transform-handle sw" data-handle="sw"></div>
          <div class="transform-handle w" data-handle="w"></div>
        </div>
      </div>
    `;

    this.viewportCanvas = this.container.querySelector('#main-render-canvas');
    this.gizmo = this.container.querySelector('#transform-gizmo');
    this.wrapper = this.container.querySelector('#viewport-wrapper');

    this.compositor.init(this.viewportCanvas);
    this._updateViewportScale();
    window.addEventListener('resize', () => this._updateViewportScale());
  }

  _updateViewportScale() {
    const parentRect = this.container.getBoundingClientRect();
    const pad = 24;
    const availW = parentRect.width - pad;
    const availH = parentRect.height - pad;

    const canvasW = this.compositor.width;
    const canvasH = this.compositor.height;

    const scaleX = availW / canvasW;
    const scaleY = availH / canvasH;
    this.scale = Math.min(scaleX, scaleY, 1.0); // Don't upscale past 1:1

    const displayW = Math.floor(canvasW * this.scale);
    const displayH = Math.floor(canvasH * this.scale);

    this.wrapper.style.width = `${displayW}px`;
    this.wrapper.style.height = `${displayH}px`;
    this.viewportCanvas.style.width = `${displayW}px`;
    this.viewportCanvas.style.height = `${displayH}px`;

    this.updateGizmo();
  }

  updateGizmo() {
    const s = this.compositor.selectedSource;
    if (!s || !s.visible || this.compositor.isStudioMode) {
      this.gizmo.style.display = 'none';
      return;
    }

    this.gizmo.style.display = 'block';
    this.gizmo.style.left = `${s.x * this.scale}px`;
    this.gizmo.style.top = `${s.y * this.scale}px`;
    this.gizmo.style.width = `${s.width * this.scale}px`;
    this.gizmo.style.height = `${s.height * this.scale}px`;
    this.gizmo.classList.toggle('locked', s.locked);
  }

  _attachEvents() {
    // Mouse down on canvas or gizmo
    this.wrapper.addEventListener('mousedown', (e) => {
      const rect = this.wrapper.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / this.scale;
      const clickY = (e.clientY - rect.top) / this.scale;

      const handle = e.target.dataset.handle;
      const selected = this.compositor.selectedSource;

      if (handle && selected && !selected.locked) {
        // Start Resizing via Gizmo Handle
        this.activeHandle = handle;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.sourceStart = { x: selected.x, y: selected.y, w: selected.width, h: selected.height };
        e.stopPropagation();
        return;
      }

      // Check hit test for source selection
      const hit = this.compositor.hitTestSource(clickX, clickY);
      this.compositor.selectSource(hit);
      this.updateGizmo();

      if (hit && !hit.locked) {
        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.sourceStart = { x: hit.x, y: hit.y, w: hit.width, h: hit.height };
      }
    });

    window.addEventListener('mousemove', (e) => {
      const selected = this.compositor.selectedSource;
      if (!selected || selected.locked) return;

      const dx = (e.clientX - this.dragStart.x) / this.scale;
      const dy = (e.clientY - this.dragStart.y) / this.scale;

      if (this.isDragging) {
        selected.x = Math.round(this.sourceStart.x + dx);
        selected.y = Math.round(this.sourceStart.y + dy);

        // Snap to center
        const centerX = (this.compositor.width - selected.width) / 2;
        const centerY = (this.compositor.height - selected.height) / 2;
        if (Math.abs(selected.x - centerX) < 10) selected.x = centerX;
        if (Math.abs(selected.y - centerY) < 10) selected.y = centerY;

        this.updateGizmo();
      } else if (this.activeHandle) {
        const h = this.activeHandle;
        let newX = this.sourceStart.x;
        let newY = this.sourceStart.y;
        let newW = this.sourceStart.w;
        let newH = this.sourceStart.h;

        if (h.includes('e')) newW = Math.max(20, this.sourceStart.w + dx);
        if (h.includes('s')) newH = Math.max(20, this.sourceStart.h + dy);
        if (h.includes('w')) {
          const clampedDx = Math.min(dx, this.sourceStart.w - 20);
          newX = this.sourceStart.x + clampedDx;
          newW = this.sourceStart.w - clampedDx;
        }
        if (h.includes('n')) {
          const clampedDy = Math.min(dy, this.sourceStart.h - 20);
          newY = this.sourceStart.y + clampedDy;
          newH = this.sourceStart.h - clampedDy;
        }

        selected.x = Math.round(newX);
        selected.y = Math.round(newY);
        selected.width = Math.round(newW);
        selected.height = Math.round(newH);
        this.updateGizmo();
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.activeHandle = null;
    });

    // Keyboard Nudge
    window.addEventListener('keydown', (e) => {
      const s = this.compositor.selectedSource;
      if (!s || s.locked) return;

      const step = e.shiftKey ? 10 : 1;
      let handled = false;

      if (e.key === 'ArrowLeft') { s.x -= step; handled = true; }
      else if (e.key === 'ArrowRight') { s.x += step; handled = true; }
      else if (e.key === 'ArrowUp') { s.y -= step; handled = true; }
      else if (e.key === 'ArrowDown') { s.y += step; handled = true; }

      if (handled) {
        e.preventDefault();
        this.updateGizmo();
      }
    });
  }
}
