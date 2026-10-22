// Dedicated OBS Audio Filters Dialog
import { ICONS } from '../../assets/icons.js';

export class AudioFiltersDialog {
  constructor(container, audioEngine, onUpdate) {
    this.container = container;
    this.audioEngine = audioEngine;
    this.onUpdate = onUpdate;
    this.currentSource = null;
    this.selectedFilterId = null;
    this.isOpen = false;

    this._setupUI();
  }

  _setupUI() {
    this.container.innerHTML = `
      <div class="obs-modal" style="min-width: 680px; max-width: 780px;">
        <div class="obs-modal-header">
          <span id="audio-filters-title">Audio Filters for 'Source'</span>
          <button class="obs-modal-close-btn" id="modal-audio-filters-close">&times;</button>
        </div>
        <div class="obs-modal-body" style="padding: 10px; display: flex; flex-direction: row; gap: 12px; height: 420px;">
          <!-- Left Column: Filter List & Toolbar -->
          <div style="width: 220px; display: flex; flex-direction: column; background: var(--obs-bg-darker); border: 1px solid var(--obs-border); border-radius: 4px; overflow: hidden;">
            <div style="padding: 6px 8px; background: var(--obs-bg-panel-header); border-bottom: 1px solid var(--obs-border); font-size: 11px; font-weight: 600; text-transform: uppercase;">
              Active Audio Filters
            </div>
            <div id="audio-filter-list" style="flex: 1; overflow-y: auto;">
              <!-- Filter items -->
            </div>
            <div class="obs-dock-toolbar">
              <button class="obs-tool-btn" id="btn-add-audio-filter" title="Add Audio Filter">+</button>
              <button class="obs-tool-btn" id="btn-remove-audio-filter" title="Remove Filter">-</button>
              <button class="obs-tool-btn" id="btn-audio-filter-up" title="Move Up">▲</button>
              <button class="obs-tool-btn" id="btn-audio-filter-down" title="Move Down">▼</button>
            </div>
          </div>

          <!-- Right Column: Filter Settings Panel -->
          <div id="audio-filter-settings-panel" style="flex: 1; background: var(--obs-bg-darker); border: 1px solid var(--obs-border); border-radius: 4px; padding: 14px; display: flex; flex-direction: column; overflow-y: auto;">
            <!-- Dynamic parameters -->
          </div>
        </div>

        <div class="obs-modal-footer">
          <button class="obs-btn primary" id="btn-audio-filters-close">Close</button>
        </div>
      </div>

      <!-- Add Filter Context Menu -->
      <div id="add-filter-dropdown" style="display: none; position: absolute; background: var(--obs-bg-panel); border: 1px solid var(--obs-border); border-radius: 4px; box-shadow: 0 4px 16px rgba(0,0,0,0.5); z-index: 3000; padding: 4px 0; min-width: 180px;">
        <div class="obs-dropdown-item" data-filter-type="gain">Gain</div>
        <div class="obs-dropdown-item" data-filter-type="noiseSuppression">Noise Suppression</div>
        <div class="obs-dropdown-item" data-filter-type="noiseGate">Noise Gate</div>
        <div class="obs-dropdown-item" data-filter-type="compressor">Compressor</div>
        <div class="obs-dropdown-item" data-filter-type="limiter">Limiter</div>
        <div class="obs-dropdown-item" data-filter-type="eq">3-Band Equalizer</div>
        <div class="obs-dropdown-item" data-filter-type="delay">Sync Offset (Delay)</div>
      </div>
    `;

    this.container.querySelector('#modal-audio-filters-close').addEventListener('click', () => this.close());
    this.container.querySelector('#btn-audio-filters-close').addEventListener('click', () => this.close());
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) this.close();
    });

    // Add filter dropdown
    const addBtn = this.container.querySelector('#btn-add-audio-filter');
    const menu = this.container.querySelector('#add-filter-dropdown');
    addBtn.addEventListener('click', (e) => {
      const rect = addBtn.getBoundingClientRect();
      menu.style.left = `${rect.left}px`;
      menu.style.top = `${rect.bottom + 4}px`;
      menu.style.display = 'block';
      e.stopPropagation();
    });

    document.addEventListener('click', () => {
      menu.style.display = 'none';
    });

    menu.querySelectorAll('.obs-dropdown-item[data-filter-type]').forEach(item => {
      item.addEventListener('click', (e) => {
        const type = item.dataset.filterType;
        this._addNewFilter(type);
        menu.style.display = 'none';
        e.stopPropagation();
      });
    });

    // Remove filter
    this.container.querySelector('#btn-remove-audio-filter').addEventListener('click', () => {
      if (!this.currentSource || !this.selectedFilterId) return;
      const idx = this.currentSource.audioFilters.findIndex(f => f.id === this.selectedFilterId);
      if (idx !== -1) {
        this.currentSource.audioFilters.splice(idx, 1);
        this.selectedFilterId = this.currentSource.audioFilters[0]?.id || null;
        this._updateDSP();
        this.renderFilterList();
        this.renderFilterSettings();
      }
    });

    // Move up
    this.container.querySelector('#btn-audio-filter-up').addEventListener('click', () => {
      if (!this.currentSource || !this.selectedFilterId) return;
      const list = this.currentSource.audioFilters;
      const idx = list.findIndex(f => f.id === this.selectedFilterId);
      if (idx > 0) {
        const temp = list[idx];
        list[idx] = list[idx - 1];
        list[idx - 1] = temp;
        this.renderFilterList();
      }
    });

    // Move down
    this.container.querySelector('#btn-audio-filter-down').addEventListener('click', () => {
      if (!this.currentSource || !this.selectedFilterId) return;
      const list = this.currentSource.audioFilters;
      const idx = list.findIndex(f => f.id === this.selectedFilterId);
      if (idx < list.length - 1 && idx !== -1) {
        const temp = list[idx];
        list[idx] = list[idx + 1];
        list[idx + 1] = temp;
        this.renderFilterList();
      }
    });
  }

  open(source) {
    this.currentSource = source;
    if (!source.audioFilters) {
      source.audioFilters = [];
    }
    this.selectedFilterId = source.audioFilters[0]?.id || null;
    this.container.querySelector('#audio-filters-title').textContent = `Audio Filters for '${source.name}'`;
    this.renderFilterList();
    this.renderFilterSettings();
    this.container.classList.add('open');
    this.isOpen = true;
  }

  close() {
    this.container.classList.remove('open');
    this.isOpen = false;
    if (this.onUpdate) this.onUpdate();
  }

  _addNewFilter(type) {
    if (!this.currentSource) return;
    const newId = type + '_' + Math.random().toString(36).substring(2, 6);
    let newFilter = { id: newId, type, enabled: true };

    switch (type) {
      case 'gain':
        newFilter.name = 'Gain';
        newFilter.gainDb = 0;
        break;
      case 'noiseSuppression':
        newFilter.name = 'Noise Suppression';
        newFilter.level = -30;
        break;
      case 'noiseGate':
        newFilter.name = 'Noise Gate';
        newFilter.closeThreshold = -38;
        newFilter.openThreshold = -32;
        break;
      case 'compressor':
        newFilter.name = 'Compressor';
        newFilter.threshold = -18;
        newFilter.ratio = 4;
        newFilter.attack = 6;
        newFilter.release = 60;
        newFilter.outputGain = 0;
        break;
      case 'limiter':
        newFilter.name = 'Limiter';
        newFilter.threshold = -6;
        newFilter.release = 60;
        break;
      case 'eq':
        newFilter.name = '3-Band Equalizer';
        newFilter.low = 0;
        newFilter.mid = 0;
        newFilter.high = 0;
        break;
      case 'delay':
        newFilter.name = 'Sync Offset (Delay)';
        newFilter.delayMs = 0;
        break;
    }

    this.currentSource.audioFilters.push(newFilter);
    this.selectedFilterId = newFilter.id;
    this._updateDSP();
    this.renderFilterList();
    this.renderFilterSettings();
  }

  _updateDSP() {
    if (this.currentSource && this.audioEngine) {
      this.audioEngine.applyAudioFilters(this.currentSource.id, this.currentSource.audioFilters);
    }
  }

  renderFilterList() {
    const listEl = this.container.querySelector('#audio-filter-list');
    listEl.innerHTML = '';

    if (!this.currentSource || this.currentSource.audioFilters.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 12px; font-size: 11px; color: var(--obs-text-muted); text-align: center;">
          No filters applied.<br>Click '+' to add one.
        </div>
      `;
      return;
    }

    this.currentSource.audioFilters.forEach(f => {
      const item = document.createElement('div');
      item.className = `obs-list-item ${f.id === this.selectedFilterId ? 'active' : ''}`;
      item.innerHTML = `
        <input type="checkbox" ${f.enabled ? 'checked' : ''} style="cursor: pointer;" data-id="${f.id}">
        <span class="obs-item-title">${f.name}</span>
      `;

      item.querySelector('input').addEventListener('click', (e) => {
        f.enabled = e.target.checked;
        this._updateDSP();
        e.stopPropagation();
      });

      item.addEventListener('click', () => {
        this.selectedFilterId = f.id;
        this.renderFilterList();
        this.renderFilterSettings();
      });

      listEl.appendChild(item);
    });
  }

  renderFilterSettings() {
    const panel = this.container.querySelector('#audio-filter-settings-panel');
    panel.innerHTML = '';

    const filter = this.currentSource?.audioFilters.find(f => f.id === this.selectedFilterId);
    if (!filter) {
      panel.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--obs-text-muted); font-size: 12px;">
          Select a filter on the left to configure its parameters.
        </div>
      `;
      return;
    }

    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--obs-border); padding-bottom: 8px; margin-bottom: 14px;';
    titleEl.innerHTML = `
      <span style="font-weight: 700; font-size: 13px; color: var(--obs-text-primary);">${filter.name}</span>
      <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer;">
        <input type="checkbox" id="chk-filter-enabled" ${filter.enabled ? 'checked' : ''}>
        Enabled
      </label>
    `;
    panel.appendChild(titleEl);

    titleEl.querySelector('#chk-filter-enabled').addEventListener('change', (e) => {
      filter.enabled = e.target.checked;
      this._updateDSP();
      this.renderFilterList();
    });

    const form = document.createElement('div');
    form.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

    switch (filter.type) {
      case 'gain': {
        form.innerHTML = `
          <div class="form-group">
            <div style="display: flex; justify-content: space-between;">
              <label class="form-label">Gain (dB)</label>
              <span style="font-size: 11px; font-family: monospace;" id="val-gain">${(filter.gainDb || 0).toFixed(1)} dB</span>
            </div>
            <input type="range" class="audio-fader" id="fader-gain" min="-30" max="30" step="0.5" value="${filter.gainDb || 0}">
          </div>
          <button class="obs-btn" id="btn-reset-gain" style="align-self: flex-start;">Reset to 0.0 dB</button>
        `;
        form.querySelector('#fader-gain').addEventListener('input', (e) => {
          filter.gainDb = parseFloat(e.target.value);
          form.querySelector('#val-gain').textContent = `${filter.gainDb.toFixed(1)} dB`;
          this._updateDSP();
        });
        form.querySelector('#btn-reset-gain').addEventListener('click', () => {
          filter.gainDb = 0;
          form.querySelector('#fader-gain').value = 0;
          form.querySelector('#val-gain').textContent = '0.0 dB';
          this._updateDSP();
        });
        break;
      }

      case 'compressor': {
        form.innerHTML = `
          <div class="form-group">
            <div style="display: flex; justify-content: space-between;">
              <label class="form-label">Ratio</label>
              <span style="font-size: 11px; font-family: monospace;" id="val-ratio">${filter.ratio || 4}:1</span>
            </div>
            <input type="range" class="audio-fader" id="fader-ratio" min="1" max="32" step="1" value="${filter.ratio || 4}">
          </div>
          <div class="form-group">
            <div style="display: flex; justify-content: space-between;">
              <label class="form-label">Threshold (dB)</label>
              <span style="font-size: 11px; font-family: monospace;" id="val-thresh">${filter.threshold || -18} dB</span>
            </div>
            <input type="range" class="audio-fader" id="fader-thresh" min="-60" max="0" step="1" value="${filter.threshold || -18}">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="form-group">
              <label class="form-label">Attack: <span id="val-attack">${filter.attack || 6} ms</span></label>
              <input type="range" class="audio-fader" id="fader-attack" min="1" max="100" step="1" value="${filter.attack || 6}">
            </div>
            <div class="form-group">
              <label class="form-label">Release: <span id="val-release">${filter.release || 60} ms</span></label>
              <input type="range" class="audio-fader" id="fader-release" min="10" max="1000" step="10" value="${filter.release || 60}">
            </div>
          </div>
          <div class="form-group">
            <div style="display: flex; justify-content: space-between;">
              <label class="form-label">Output Makeup Gain (dB)</label>
              <span style="font-size: 11px; font-family: monospace;" id="val-output-gain">${(filter.outputGain || 0).toFixed(1)} dB</span>
            </div>
            <input type="range" class="audio-fader" id="fader-output-gain" min="0" max="32" step="0.5" value="${filter.outputGain || 0}">
          </div>
        `;
        form.querySelector('#fader-ratio').addEventListener('input', (e) => {
          filter.ratio = parseFloat(e.target.value);
          form.querySelector('#val-ratio').textContent = `${filter.ratio}:1`;
          this._updateDSP();
        });
        form.querySelector('#fader-thresh').addEventListener('input', (e) => {
          filter.threshold = parseFloat(e.target.value);
          form.querySelector('#val-thresh').textContent = `${filter.threshold} dB`;
          this._updateDSP();
        });
        form.querySelector('#fader-attack').addEventListener('input', (e) => {
          filter.attack = parseInt(e.target.value, 10);
          form.querySelector('#val-attack').textContent = `${filter.attack} ms`;
          this._updateDSP();
        });
        form.querySelector('#fader-release').addEventListener('input', (e) => {
          filter.release = parseInt(e.target.value, 10);
          form.querySelector('#val-release').textContent = `${filter.release} ms`;
          this._updateDSP();
        });
        form.querySelector('#fader-output-gain').addEventListener('input', (e) => {
          filter.outputGain = parseFloat(e.target.value);
          form.querySelector('#val-output-gain').textContent = `${filter.outputGain.toFixed(1)} dB`;
          this._updateDSP();
        });
        break;
      }

      case 'noiseGate': {
        form.innerHTML = `
          <div class="form-group">
            <div style="display: flex; justify-content: space-between;">
              <label class="form-label">Close Threshold (dB)</label>
              <span style="font-size: 11px; font-family: monospace;" id="val-gate-close">${filter.closeThreshold || -38} dB</span>
            </div>
            <input type="range" class="audio-fader" id="fader-gate-close" min="-96" max="0" step="1" value="${filter.closeThreshold || -38}">
          </div>
          <div class="form-group">
            <div style="display: flex; justify-content: space-between;">
              <label class="form-label">Open Threshold (dB)</label>
              <span style="font-size: 11px; font-family: monospace;" id="val-gate-open">${filter.openThreshold || -32} dB</span>
            </div>
            <input type="range" class="audio-fader" id="fader-gate-open" min="-96" max="0" step="1" value="${filter.openThreshold || -32}">
          </div>
          <div style="padding: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; font-size: 11px; color: var(--obs-text-secondary); line-height: 1.4;">
            💡 <b>Dica OBS:</b> O portão de ruído silencia automaticamente o áudio quando você para de falar, eliminando teclado, cliques e ruído de fundo.
          </div>
        `;
        form.querySelector('#fader-gate-close').addEventListener('input', (e) => {
          filter.closeThreshold = parseFloat(e.target.value);
          form.querySelector('#val-gate-close').textContent = `${filter.closeThreshold} dB`;
          this._updateDSP();
        });
        form.querySelector('#fader-gate-open').addEventListener('input', (e) => {
          filter.openThreshold = parseFloat(e.target.value);
          form.querySelector('#val-gate-open').textContent = `${filter.openThreshold} dB`;
          this._updateDSP();
        });
        break;
      }

      case 'noiseSuppression': {
        form.innerHTML = `
          <div class="form-group">
            <label class="form-label">Method</label>
            <select class="obs-select">
              <option selected>High-Pass Rumble Cut + Vocal Clarity (80 Hz)</option>
            </select>
          </div>
          <div style="padding: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; font-size: 11px; color: var(--obs-text-secondary); line-height: 1.4;">
            Corta ruídos graves e vibrações de mesa mantendo a clareza da voz natural.
          </div>
        `;
        break;
      }

      case 'limiter': {
        form.innerHTML = `
          <div class="form-group">
            <div style="display: flex; justify-content: space-between;">
              <label class="form-label">Threshold (Limit Ceiling)</label>
              <span style="font-size: 11px; font-family: monospace;" id="val-limit-thresh">${filter.threshold || -6} dB</span>
            </div>
            <input type="range" class="audio-fader" id="fader-limit-thresh" min="-60" max="0" step="0.5" value="${filter.threshold || -6}">
          </div>
          <div class="form-group">
            <div style="display: flex; justify-content: space-between;">
              <label class="form-label">Release (ms)</label>
              <span style="font-size: 11px; font-family: monospace;" id="val-limit-rel">${filter.release || 60} ms</span>
            </div>
            <input type="range" class="audio-fader" id="fader-limit-rel" min="10" max="1000" step="10" value="${filter.release || 60}">
          </div>
        `;
        form.querySelector('#fader-limit-thresh').addEventListener('input', (e) => {
          filter.threshold = parseFloat(e.target.value);
          form.querySelector('#val-limit-thresh').textContent = `${filter.threshold} dB`;
          this._updateDSP();
        });
        form.querySelector('#fader-limit-rel').addEventListener('input', (e) => {
          filter.release = parseInt(e.target.value, 10);
          form.querySelector('#val-limit-rel').textContent = `${filter.release} ms`;
          this._updateDSP();
        });
        break;
      }

      case 'eq': {
        form.innerHTML = `
          <div class="form-group">
            <div style="display: flex; justify-content: space-between;">
              <label class="form-label">Low (120 Hz)</label>
              <span style="font-size: 11px; font-family: monospace;" id="val-eq-low">${(filter.low || 0).toFixed(1)} dB</span>
            </div>
            <input type="range" class="audio-fader" id="fader-eq-low" min="-12" max="12" step="0.5" value="${filter.low || 0}">
          </div>
          <div class="form-group">
            <div style="display: flex; justify-content: space-between;">
              <label class="form-label">Mid (1000 Hz)</label>
              <span style="font-size: 11px; font-family: monospace;" id="val-eq-mid">${(filter.mid || 0).toFixed(1)} dB</span>
            </div>
            <input type="range" class="audio-fader" id="fader-eq-mid" min="-12" max="12" step="0.5" value="${filter.mid || 0}">
          </div>
          <div class="form-group">
            <div style="display: flex; justify-content: space-between;">
              <label class="form-label">High (7500 Hz)</label>
              <span style="font-size: 11px; font-family: monospace;" id="val-eq-high">${(filter.high || 0).toFixed(1)} dB</span>
            </div>
            <input type="range" class="audio-fader" id="fader-eq-high" min="-12" max="12" step="0.5" value="${filter.high || 0}">
          </div>
        `;
        form.querySelector('#fader-eq-low').addEventListener('input', (e) => {
          filter.low = parseFloat(e.target.value);
          form.querySelector('#val-eq-low').textContent = `${filter.low.toFixed(1)} dB`;
          this._updateDSP();
        });
        form.querySelector('#fader-eq-mid').addEventListener('input', (e) => {
          filter.mid = parseFloat(e.target.value);
          form.querySelector('#val-eq-mid').textContent = `${filter.mid.toFixed(1)} dB`;
          this._updateDSP();
        });
        form.querySelector('#fader-eq-high').addEventListener('input', (e) => {
          filter.high = parseFloat(e.target.value);
          form.querySelector('#val-eq-high').textContent = `${filter.high.toFixed(1)} dB`;
          this._updateDSP();
        });
        break;
      }

      case 'delay': {
        form.innerHTML = `
          <div class="form-group">
            <div style="display: flex; justify-content: space-between;">
              <label class="form-label">Sync Offset (Delay in ms)</label>
              <span style="font-size: 11px; font-family: monospace;" id="val-delay">${filter.delayMs || 0} ms</span>
            </div>
            <input type="range" class="audio-fader" id="fader-delay" min="0" max="1000" step="10" value="${filter.delayMs || 0}">
          </div>
        `;
        form.querySelector('#fader-delay').addEventListener('input', (e) => {
          filter.delayMs = parseInt(e.target.value, 10);
          form.querySelector('#val-delay').textContent = `${filter.delayMs} ms`;
          this._updateDSP();
        });
        break;
      }
    }

    panel.appendChild(form);
  }
}
