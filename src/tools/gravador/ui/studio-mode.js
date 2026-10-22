// Studio Mode Manager
export class StudioModeView {
  constructor(container, compositor, transitions) {
    this.container = container;
    this.compositor = compositor;
    this.transitions = transitions;
    this.previewCanvas = null;
    this.programCanvas = null;
    this.tbar = null;

    this.onTransition = null;
    this._setupUI();
  }

  _setupUI() {
    this.container.innerHTML = `
      <div class="studio-pane">
        <div class="studio-pane-header studio-preview-header">
          <span>● PREVIEW</span>
        </div>
        <div class="canvas-viewport-wrapper" id="studio-preview-wrapper" style="width: 100%; height: 100%;">
          <canvas class="obs-render-canvas" id="studio-preview-canvas"></canvas>
        </div>
      </div>

      <div class="studio-transition-col">
        <button class="obs-btn primary" id="btn-studio-cut" style="width: 100%;">Cut</button>
        <button class="obs-btn primary" id="btn-studio-fade" style="width: 100%;">Fade</button>
        <div class="studio-tbar-container">
          <span style="font-size: 10px; color: var(--obs-text-muted); font-weight: 600;">T-BAR</span>
          <input type="range" class="studio-tbar" id="studio-tbar" min="0" max="100" value="0">
        </div>
      </div>

      <div class="studio-pane">
        <div class="studio-pane-header studio-program-header">
          <span>● PROGRAM</span>
        </div>
        <div class="canvas-viewport-wrapper" id="studio-program-wrapper" style="width: 100%; height: 100%;">
          <canvas class="obs-render-canvas" id="studio-program-canvas"></canvas>
        </div>
      </div>
    `;

    this.previewCanvas = this.container.querySelector('#studio-preview-canvas');
    this.programCanvas = this.container.querySelector('#studio-program-canvas');
    this.tbar = this.container.querySelector('#studio-tbar');

    // Attach Cut button
    this.container.querySelector('#btn-studio-cut').addEventListener('click', () => {
      if (this.onTransition) this.onTransition('cut', 0);
    });

    // Attach Fade button
    this.container.querySelector('#btn-studio-fade').addEventListener('click', () => {
      if (this.onTransition) this.onTransition('fade', this.transitions.duration);
    });

    // Attach T-Bar
    this.tbar.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) / 100;
      this.transitions.setManualProgress(val, this.compositor.activeScene, this.compositor.previewScene);
    });

    this.tbar.addEventListener('change', () => {
      // Snap to end when released
      if (parseFloat(this.tbar.value) > 90) {
        if (this.onTransition) this.onTransition('fade', 0);
        this.tbar.value = 0;
      }
    });

    this.compositor.previewCanvas = this.previewCanvas;
    this.compositor.previewCanvas.width = this.compositor.width;
    this.compositor.previewCanvas.height = this.compositor.height;
    this.compositor.previewCtx = this.previewCanvas.getContext('2d', { alpha: false });
    this.compositor.setStudioProgramCanvas(this.programCanvas);

    this.updateLayout();
    window.addEventListener('resize', () => this.updateLayout());
  }

  updateLayout() {
    const panes = this.container.querySelectorAll('.studio-pane');
    panes.forEach(pane => {
      const rect = pane.getBoundingClientRect();
      const availW = rect.width - 24;
      const availH = rect.height - 40;
      const scale = Math.min(availW / this.compositor.width, availH / this.compositor.height, 1.0);
      const dw = Math.floor(this.compositor.width * scale);
      const dh = Math.floor(this.compositor.height * scale);

      const canvas = pane.querySelector('canvas');
      const wrapper = pane.querySelector('.canvas-viewport-wrapper');
      if (canvas && wrapper) {
        canvas.style.width = `${dw}px`;
        canvas.style.height = `${dh}px`;
        wrapper.style.width = `${dw}px`;
        wrapper.style.height = `${dh}px`;
      }
    });
  }
}
