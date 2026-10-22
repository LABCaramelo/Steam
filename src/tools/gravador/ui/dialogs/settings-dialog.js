// Settings Dialog - Full State Persistence & Configuration
export class SettingsDialog {
  constructor(container, compositor, appState, onSettingsApply) {
    this.container = container;
    this.compositor = compositor;
    this.appState = appState;
    this.onSettingsApply = onSettingsApply;
    this.isOpen = false;

    // Default settings
    this.currentSettings = {
      canvasResolution: '1920x1080',
      fps: 60,
      bitrate: 16000, // 16 Mbps for crisp Full HD 1080p60
      format: 'mp4',
      theme: 'Yami'
    };

    this._loadSettings();
    this._setupUI();
  }

  _loadSettings() {
    try {
      const saved = localStorage.getItem('obs_web_settings');
      if (saved) {
        this.currentSettings = Object.assign(this.currentSettings, JSON.parse(saved));
      }
    } catch (e) {}
  }

  _saveSettings() {
    try {
      localStorage.setItem('obs_web_settings', JSON.stringify(this.currentSettings));
    } catch (e) {}
  }

  _setupUI() {
    this.container.innerHTML = `
      <div class="obs-modal" style="min-width: 480px; max-width: 520px;">
        <div class="obs-modal-header">
          <span>Settings</span>
          <button class="obs-modal-close-btn" id="modal-settings-close">&times;</button>
        </div>
        <div class="obs-modal-body" style="gap: 14px;">
          <div class="form-group">
            <label class="form-label">Base (Canvas) Resolution</label>
            <select class="obs-select" id="settings-res-select">
              <option value="1920x1080">1920x1080 (16:9 Full HD)</option>
              <option value="1280x720">1280x720 (16:9 HD)</option>
              <option value="2560x1440">2560x1440 (16:9 2K QHD)</option>
              <option value="3840x2160">3840x2160 (16:9 4K UHD)</option>
              <option value="1080x1920">1080x1920 (9:16 Vertical / Shorts / Reels)</option>
              <option value="1080x1080">1080x1080 (1:1 Square)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Common FPS Values</label>
            <select class="obs-select" id="settings-fps-select">
              <option value="60">60 FPS (Smooth / High Frame Rate)</option>
              <option value="30">30 FPS (Standard)</option>
              <option value="24">24 FPS (Cinematic)</option>
            </select>
          </div>

          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <label class="form-label">Recording Video Bitrate (Kbps)</label>
              <span style="font-size: 10px; color: var(--obs-accent-blue); font-weight: 600;" id="bitrate-preset-hint">16 Mbps (High Quality)</span>
            </div>
            <input type="number" class="obs-input" id="settings-bitrate" min="2000" max="60000" step="1000" value="16000">
            <div style="display: flex; gap: 4px; margin-top: 4px;">
              <button type="button" class="obs-btn" style="padding: 2px 6px; font-size: 10px;" data-bitrate="6000">6,000 (Stream)</button>
              <button type="button" class="obs-btn" style="padding: 2px 6px; font-size: 10px;" data-bitrate="16000">16,000 (High 1080p)</button>
              <button type="button" class="obs-btn" style="padding: 2px 6px; font-size: 10px;" data-bitrate="25000">25,000 (Ultra Crisp)</button>
              <button type="button" class="obs-btn" style="padding: 2px 6px; font-size: 10px;" data-bitrate="40000">40,000 (Lossless)</button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Recording Format</label>
            <select class="obs-select" id="settings-format-select">
              <option value="mp4">MP4 (MPEG-4 / H.264 / AAC - High Compatibility)</option>
              <option value="webm">WebM (VP9 / Opus - Web Container)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Theme</label>
            <select class="obs-select" id="settings-theme-select">
              <option value="Yami">Yami (Default Dark)</option>
              <option value="Rachni">Rachni</option>
              <option value="Acri">Acri</option>
              <option value="Light">Light</option>
            </select>
          </div>

          <div style="margin-top: 6px; padding-top: 10px; border-top: 1px solid var(--obs-border); display: flex; gap: 8px;">
            <button class="obs-btn" id="btn-export-scenes" style="flex: 1;">Export Scene Collection (JSON)</button>
            <button class="obs-btn" id="btn-import-scenes" style="flex: 1;">Import Scene Collection</button>
            <input type="file" id="import-scenes-input" accept=".json" style="display: none;">
          </div>
        </div>
        <div class="obs-modal-footer">
          <button class="obs-btn" id="btn-settings-cancel">Cancel</button>
          <button class="obs-btn primary" id="btn-settings-apply">Apply</button>
        </div>
      </div>
    `;

    const closeBtn = this.container.querySelector('#modal-settings-close');
    const cancelBtn = this.container.querySelector('#btn-settings-cancel');
    const applyBtn = this.container.querySelector('#btn-settings-apply');

    closeBtn.addEventListener('click', () => this.close());
    cancelBtn.addEventListener('click', () => this.close());

    // Bitrate quick preset buttons
    this.container.querySelectorAll('button[data-bitrate]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.bitrate;
        this.container.querySelector('#settings-bitrate').value = val;
        this._updateBitrateHint(val);
      });
    });

    const bitrateInput = this.container.querySelector('#settings-bitrate');
    bitrateInput.addEventListener('input', () => {
      this._updateBitrateHint(bitrateInput.value);
    });

    applyBtn.addEventListener('click', () => {
      const resVal = this.container.querySelector('#settings-res-select').value;
      const fpsVal = parseInt(this.container.querySelector('#settings-fps-select').value, 10) || 60;
      const bitrateVal = parseInt(this.container.querySelector('#settings-bitrate').value, 10) || 16000;
      const formatVal = this.container.querySelector('#settings-format-select').value;
      const themeVal = this.container.querySelector('#settings-theme-select').value;

      this.currentSettings = {
        canvasResolution: resVal,
        fps: fpsVal,
        bitrate: bitrateVal,
        format: formatVal,
        theme: themeVal
      };

      this._saveSettings();

      if (this.onSettingsApply) {
        this.onSettingsApply(this.currentSettings);
      }
      this.close();
    });

    // Scene collection export
    this.container.querySelector('#btn-export-scenes').addEventListener('click', () => {
      const data = this.appState.exportScenesJSON();
      const blob = new Blob([data], { type: 'application/json' });
      const a = document.createElement('a');
      a.download = `OBS_SceneCollection_${new Date().toISOString().slice(0, 10)}.json`;
      a.href = URL.createObjectURL(blob);
      a.click();
    });

    // Scene collection import
    const fileInput = this.container.querySelector('#import-scenes-input');
    this.container.querySelector('#btn-import-scenes').addEventListener('click', () => {
      fileInput.click();
    });
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          this.appState.importScenesJSON(evt.target.result);
          alert('Scene collection imported successfully!');
          this.close();
        } catch (err) {
          alert('Failed to import scene collection: ' + err.message);
        }
      };
      reader.readAsText(file);
    });

    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) this.close();
    });
  }

  _updateBitrateHint(val) {
    const hint = this.container.querySelector('#bitrate-preset-hint');
    const kbps = parseInt(val, 10);
    if (!hint || isNaN(kbps)) return;
    const mbps = (kbps / 1000).toFixed(1);
    let desc = 'Standard';
    if (kbps >= 25000) desc = 'Ultra Crisp';
    else if (kbps >= 15000) desc = 'High Quality 1080p';
    else if (kbps >= 8000) desc = 'Balanced';
    hint.textContent = `${mbps} Mbps (${desc})`;
  }

  open() {
    this._syncFormFromCurrentSettings();
    this.container.classList.add('open');
    this.isOpen = true;
  }

  _syncFormFromCurrentSettings() {
    const s = this.currentSettings;
    const resSelect = this.container.querySelector('#settings-res-select');
    const fpsSelect = this.container.querySelector('#settings-fps-select');
    const bitrateInput = this.container.querySelector('#settings-bitrate');
    const formatSelect = this.container.querySelector('#settings-format-select');
    const themeSelect = this.container.querySelector('#settings-theme-select');

    if (resSelect) resSelect.value = s.canvasResolution;
    if (fpsSelect) fpsSelect.value = String(s.fps);
    if (bitrateInput) {
      bitrateInput.value = s.bitrate;
      this._updateBitrateHint(s.bitrate);
    }
    if (formatSelect) formatSelect.value = s.format;
    if (themeSelect) themeSelect.value = s.theme;
  }

  close() {
    this.container.classList.remove('open');
    this.isOpen = false;
  }
}
