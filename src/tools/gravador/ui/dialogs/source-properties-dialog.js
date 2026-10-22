// Source Properties & Filters Dialog
export class SourcePropertiesDialog {
  constructor(container, compositor, onUpdate, onOpenAudioFilters) {
    this.container = container;
    this.compositor = compositor;
    this.onUpdate = onUpdate;
    this.onOpenAudioFilters = onOpenAudioFilters;
    this.currentSource = null;
    this.isOpen = false;

    this._setupUI();
  }

  _setupUI() {
    this.container.innerHTML = `
      <div class="obs-modal" style="min-width: 580px;">
        <div class="obs-modal-header">
          <span id="props-title">Properties for 'Source'</span>
          <button class="obs-modal-close-btn" id="modal-props-close">&times;</button>
        </div>
        <div class="obs-modal-body" id="props-body">
          <!-- Dynamic Tabs and Controls -->
        </div>
        <div class="obs-modal-footer">
          <button class="obs-btn" id="btn-open-audio-filters" style="display: none; color: var(--obs-accent-blue); font-weight: 600;">Audio Filters (⚙)</button>
          <button class="obs-btn" id="btn-fit-screen">Fit to Screen</button>
          <button class="obs-btn" id="btn-center-screen">Center</button>
          <button class="obs-btn primary" id="btn-props-ok">OK</button>
        </div>
      </div>
    `;

    this.container.querySelector('#modal-props-close').addEventListener('click', () => this.close());
    this.container.querySelector('#btn-props-ok').addEventListener('click', () => this.close());
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) this.close();
    });

    this.container.querySelector('#btn-fit-screen').addEventListener('click', () => {
      if (this.currentSource) {
        this.compositor.fitToScreen(this.currentSource);
        this.renderForm();
        if (this.onUpdate) this.onUpdate();
      }
    });

    this.container.querySelector('#btn-center-screen').addEventListener('click', () => {
      if (this.currentSource) {
        this.compositor.centerToScreen(this.currentSource);
        this.renderForm();
        if (this.onUpdate) this.onUpdate();
      }
    });
  }

  open(source) {
    this.currentSource = source;
    this.container.querySelector('#props-title').textContent = `Properties for '${source.name}'`;
    
    const btnAf = this.container.querySelector('#btn-open-audio-filters');
    if (btnAf) {
      btnAf.style.display = source.hasAudio ? 'inline-block' : 'none';
      btnAf.onclick = () => {
        this.close();
        if (this.onOpenAudioFilters) {
          this.onOpenAudioFilters(source);
        }
      };
    }

    this.renderForm();
    this.container.classList.add('open');
    this.isOpen = true;
  }

  close() {
    this.container.classList.remove('open');
    this.isOpen = false;
    if (this.onUpdate) this.onUpdate();
  }

  renderForm() {
    const s = this.currentSource;
    if (!s) return;

    const body = this.container.querySelector('#props-body');
    body.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">Source Name</label>
          <input type="text" class="obs-input" id="prop-name" value="${s.name}">
        </div>
        <div class="form-group">
          <label class="form-label">Opacity (${Math.round(s.opacity * 100)}%)</label>
          <input type="range" class="audio-fader" id="prop-opacity" min="0" max="1" step="0.05" value="${s.opacity}">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
        <div class="form-group">
          <label class="form-label">Position X</label>
          <input type="number" class="obs-input" id="prop-x" value="${s.x}">
        </div>
        <div class="form-group">
          <label class="form-label">Position Y</label>
          <input type="number" class="obs-input" id="prop-y" value="${s.y}">
        </div>
        <div class="form-group">
          <label class="form-label">Width</label>
          <input type="number" class="obs-input" id="prop-w" value="${s.width}">
        </div>
        <div class="form-group">
          <label class="form-label">Height</label>
          <input type="number" class="obs-input" id="prop-h" value="${s.height}">
        </div>
      </div>

      <!-- Type-specific settings -->
      <div id="type-specific-container" style="background: var(--obs-bg-darker); padding: 10px; border-radius: 4px; border: 1px solid var(--obs-border);">
        ${this._getTypeSpecificHTML(s)}
      </div>

      <!-- Filters Section -->
      <div style="border-top: 1px solid var(--obs-border); padding-top: 10px;">
        <h4 style="font-size: 11.5px; font-weight: 700; color: var(--obs-accent-blue); margin-bottom: 8px;">EFFECT FILTERS</h4>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="form-group">
            <label class="form-label">Brightness (${s.filters.brightness}%)</label>
            <input type="range" class="audio-fader" id="prop-bright" min="0" max="200" value="${s.filters.brightness}">
          </div>
          <div class="form-group">
            <label class="form-label">Contrast (${s.filters.contrast}%)</label>
            <input type="range" class="audio-fader" id="prop-contrast" min="0" max="200" value="${s.filters.contrast}">
          </div>
        </div>

        <!-- Chroma Key (Green Screen) -->
        <div style="margin-top: 10px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px;">
          <label style="display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 11px; cursor: pointer;">
            <input type="checkbox" id="prop-chroma-enable" ${s.filters.chromaKey?.enabled ? 'checked' : ''}>
            Chroma Key (Green Screen Removal)
          </label>
          
          <div id="chroma-options" style="display: ${s.filters.chromaKey?.enabled ? 'grid' : 'none'}; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 8px;">
            <div class="form-group">
              <label class="form-label">Key Color</label>
              <input type="color" class="obs-input" id="prop-chroma-color" value="${s.filters.chromaKey?.color || '#00FF00'}" style="height: 32px; padding: 2px;">
            </div>
            <div class="form-group">
              <label class="form-label">Similarity (${s.filters.chromaKey?.similarity || 400})</label>
              <input type="range" class="audio-fader" id="prop-chroma-sim" min="50" max="800" value="${s.filters.chromaKey?.similarity || 400}">
            </div>
            <div class="form-group">
              <label class="form-label">Smoothness (${s.filters.chromaKey?.smoothness || 80})</label>
              <input type="range" class="audio-fader" id="prop-chroma-smooth" min="10" max="300" value="${s.filters.chromaKey?.smoothness || 80}">
            </div>
          </div>
        </div>
      </div>
    `;

    this._attachFormListeners(s);
  }

  _getTypeSpecificHTML(s) {
    if (s.type === 'text') {
      return `
        <div class="form-group" style="margin-bottom: 8px;">
          <label class="form-label">Text</label>
          <input type="text" class="obs-input" id="prop-text-val" value="${s.props.text || ''}">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
          <div class="form-group">
            <label class="form-label">Font Size</label>
            <input type="number" class="obs-input" id="prop-font-size" value="${s.props.fontSize || 48}">
          </div>
          <div class="form-group">
            <label class="form-label">Text Color</label>
            <input type="color" class="obs-input" id="prop-text-color" value="${s.props.textColor || '#FFFFFF'}" style="height: 32px; padding: 2px;">
          </div>
          <div class="form-group">
            <label class="form-label">Marquee Scroll Speed</label>
            <input type="number" class="obs-input" id="prop-scroll-speed" value="${s.props.scrollSpeed || 0}">
          </div>
        </div>
      `;
    }

    if (s.type === 'color') {
      return `
        <div class="form-group">
          <label class="form-label">Background Color</label>
          <input type="color" class="obs-input" id="prop-color-val" value="${s.props.color || '#476bd7'}" style="height: 36px; padding: 2px;">
        </div>
      `;
    }

    if (s.type === 'browser') {
      return `
        <div class="form-group">
          <label class="form-label">URL / Overlay Source</label>
          <input type="text" class="obs-input" id="prop-browser-url" value="${s.props.url || 'https://twitch.tv/chat'}">
        </div>
      `;
    }

    if (s.type === 'image' || s.type === 'video') {
      return `
        <div class="form-group">
          <label class="form-label">Upload Local ${s.type === 'image' ? 'Image File (PNG, JPG, SVG, GIF)' : 'Video File (MP4, WebM)'}</label>
          <input type="file" class="obs-input" id="prop-file-upload" accept="${s.type === 'image' ? 'image/*' : 'video/*'}">
        </div>
      `;
    }

    return `<div style="font-size: 11px; color: var(--obs-text-muted);">Standard stream capture device properties active.</div>`;
  }

  _attachFormListeners(s) {
    const body = this.container.querySelector('#props-body');

    // General props
    body.querySelector('#prop-name').addEventListener('input', (e) => { s.name = e.target.value; if (this.onUpdate) this.onUpdate(); });
    body.querySelector('#prop-opacity').addEventListener('input', (e) => { s.opacity = parseFloat(e.target.value); });
    body.querySelector('#prop-x').addEventListener('change', (e) => { s.x = parseInt(e.target.value, 10) || 0; });
    body.querySelector('#prop-y').addEventListener('change', (e) => { s.y = parseInt(e.target.value, 10) || 0; });
    body.querySelector('#prop-w').addEventListener('change', (e) => { s.width = parseInt(e.target.value, 10) || 100; });
    body.querySelector('#prop-h').addEventListener('change', (e) => { s.height = parseInt(e.target.value, 10) || 100; });

    // Filters
    body.querySelector('#prop-bright').addEventListener('input', (e) => { s.filters.brightness = parseInt(e.target.value, 10); });
    body.querySelector('#prop-contrast').addEventListener('input', (e) => { s.filters.contrast = parseInt(e.target.value, 10); });

    // Chroma key
    const chromaCheck = body.querySelector('#prop-chroma-enable');
    const chromaOpts = body.querySelector('#chroma-options');
    chromaCheck.addEventListener('change', (e) => {
      s.filters.chromaKey.enabled = e.target.checked;
      chromaOpts.style.display = e.target.checked ? 'grid' : 'none';
    });
    body.querySelector('#prop-chroma-color')?.addEventListener('input', (e) => { s.filters.chromaKey.color = e.target.value; });
    body.querySelector('#prop-chroma-sim')?.addEventListener('input', (e) => { s.filters.chromaKey.similarity = parseInt(e.target.value, 10); });
    body.querySelector('#prop-chroma-smooth')?.addEventListener('input', (e) => { s.filters.chromaKey.smoothness = parseInt(e.target.value, 10); });

    // Type specifics
    body.querySelector('#prop-text-val')?.addEventListener('input', (e) => { s.props.text = e.target.value; });
    body.querySelector('#prop-font-size')?.addEventListener('change', (e) => { s.props.fontSize = parseInt(e.target.value, 10) || 24; });
    body.querySelector('#prop-text-color')?.addEventListener('input', (e) => { s.props.textColor = e.target.value; });
    body.querySelector('#prop-scroll-speed')?.addEventListener('change', (e) => { s.props.scrollSpeed = parseInt(e.target.value, 10) || 0; });
    body.querySelector('#prop-color-val')?.addEventListener('input', (e) => { s.props.color = e.target.value; });
    body.querySelector('#prop-browser-url')?.addEventListener('input', (e) => { s.props.url = e.target.value; });

    // File upload
    body.querySelector('#prop-file-upload')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (s.type === 'image') {
        const img = new Image();
        img.onload = () => {
          s.width = img.naturalWidth;
          s.height = img.naturalHeight;
          s.props.imageElement = img;
          this.renderForm();
        };
        img.src = URL.createObjectURL(file);
      } else if (s.type === 'video') {
        const video = document.createElement('video');
        video.loop = true;
        video.autoplay = true;
        video.playsInline = true;
        video.src = URL.createObjectURL(file);
        video.onloadedmetadata = () => {
          s.width = video.videoWidth;
          s.height = video.videoHeight;
          this.renderForm();
        };
        video.play().catch(() => {});
        s.props.videoElement = video;
      }
    });
  }
}
