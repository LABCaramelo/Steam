import { setupDialog, openDialog, closeDialog, destroyDialog } from './dialog-utils.js';

const FILTERS = {
  gain: { name: 'Ganho', fields: [['gainDb', 'Ganho', 'dB', -30, 30, 0.5, 0]] },
  noiseSuppression: { name: 'Redução de graves', note: 'Filtro de 80 Hz para reduzir vibrações e ruídos graves. Não remove toda a interferência de fundo.', fields: [] },
  noiseGate: { name: 'Portão de ruído', fields: [['closeThreshold', 'Fechar abaixo de', 'dB', -96, 0, 1, -38], ['openThreshold', 'Abrir acima de', 'dB', -96, 0, 1, -32]] },
  compressor: { name: 'Compressor', fields: [['threshold', 'Limiar', 'dB', -60, 0, 1, -18], ['ratio', 'Proporção', ':1', 1, 32, 1, 4], ['attack', 'Ataque', 'ms', 1, 100, 1, 6], ['release', 'Liberação', 'ms', 10, 1000, 10, 60], ['outputGain', 'Ganho de saída', 'dB', 0, 32, 0.5, 0]] },
  limiter: { name: 'Limitador', fields: [['threshold', 'Teto', 'dB', -60, 0, 0.5, -6], ['release', 'Liberação', 'ms', 10, 1000, 10, 60]] },
  eq: { name: 'Equalizador de 3 bandas', fields: [['low', 'Graves · 120 Hz', 'dB', -12, 12, 0.5, 0], ['mid', 'Médios · 1 kHz', 'dB', -12, 12, 0.5, 0], ['high', 'Agudos · 8 kHz', 'dB', -12, 12, 0.5, 0]] },
  delay: { name: 'Atraso de áudio', fields: [['delayMs', 'Sincronização', 'ms', 0, 1000, 10, 0]] }
};
const bounded = (value, min, max, fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

export class AudioFiltersDialog {
  constructor(container, audioEngine, onUpdate) {
    Object.assign(this, { container, audioEngine, onUpdate });
    this.currentSource = null;
    this.selectedFilterId = null;
    this.isOpen = false;
    this.destroyed = false;
    this.listEvents = new AbortController();
    this.formEvents = new AbortController();
    this._setupUI();
    setupDialog(this, 'Filtros de áudio');
  }
  _setupUI() {
    this.container.innerHTML = `<div class="obs-modal" style="width:100%;max-width:780px">
      <div class="obs-modal-header"><span id="audio-filters-title">Filtros de áudio</span><button class="obs-modal-close-btn" id="modal-audio-filters-close" aria-label="Fechar filtros de áudio">&times;</button></div>
      <div class="obs-modal-body audio-filters-body" style="padding:12px;display:flex;gap:12px;min-height:320px">
        <div style="flex:0 1 220px;min-width:120px;display:flex;flex-direction:column;background:var(--obs-bg-darker);border:1px solid var(--obs-border);border-radius:8px;overflow:hidden">
          <div style="padding:10px;font-size:11px;font-weight:600">CADEIA DE FILTROS</div><div id="audio-filter-list" style="flex:1;overflow-y:auto"></div>
          <div class="obs-dock-toolbar"><select id="new-audio-filter-type" class="obs-select" aria-label="Tipo de filtro de áudio"></select><button class="obs-tool-btn" id="btn-add-audio-filter" title="Adicionar filtro" aria-label="Adicionar filtro">+</button></div>
          <div class="obs-dock-toolbar"><button class="obs-tool-btn" id="btn-remove-audio-filter" title="Remover filtro" aria-label="Remover filtro">−</button><button class="obs-tool-btn" id="btn-audio-filter-up" title="Mover filtro para cima" aria-label="Mover filtro para cima">▲</button><button class="obs-tool-btn" id="btn-audio-filter-down" title="Mover filtro para baixo" aria-label="Mover filtro para baixo">▼</button></div>
        </div><div id="audio-filter-settings-panel" style="flex:1;min-width:0;background:var(--obs-bg-darker);border:1px solid var(--obs-border);border-radius:8px;padding:14px;overflow-y:auto"></div>
      </div><div class="obs-modal-footer"><button class="obs-btn primary" id="btn-audio-filters-close">Concluir</button></div></div>`;
    const select = this.container.querySelector('#new-audio-filter-type');
    Object.entries(FILTERS).forEach(([type, config]) => {
      const option = document.createElement('option'); option.value = type; option.textContent = config.name; select.appendChild(option);
    });
    this.container.querySelector('#modal-audio-filters-close').addEventListener('click', () => this.close());
    this.container.querySelector('#btn-audio-filters-close').addEventListener('click', () => this.close());
    this.backdropClick = event => { if (event.target === this.container) this.close(); };
    this.container.addEventListener('click', this.backdropClick);
    this.container.querySelector('#btn-add-audio-filter').addEventListener('click', () => this._addNewFilter(select.value));
    this.container.querySelector('#btn-remove-audio-filter').addEventListener('click', () => {
      const list = this.currentSource?.audioFilters;
      const index = list?.findIndex(filter => filter.id === this.selectedFilterId) ?? -1;
      if (index < 0) return;
      list.splice(index, 1); this.selectedFilterId = list[Math.min(index, list.length - 1)]?.id || null;
      this._updateDSP(); this.renderFilterList(); this.renderFilterSettings();
    });
    this.container.querySelector('#btn-audio-filter-up').addEventListener('click', () => this._moveFilter(-1));
    this.container.querySelector('#btn-audio-filter-down').addEventListener('click', () => this._moveFilter(1));
  }
  open(source) {
    if (!source || source.destroyed || this.destroyed) return;
    this.currentSource = source;
    if (!Array.isArray(source.audioFilters)) source.audioFilters = [];
    this.selectedFilterId = source.audioFilters[0]?.id || null;
    this.container.querySelector('#audio-filters-title').textContent = `Filtros de áudio · ${source.name}`;
    this.renderFilterList(); this.renderFilterSettings(); openDialog(this);
  }
  close() { closeDialog(this); this.onUpdate?.(); }
  _addNewFilter(type) {
    const config = FILTERS[type];
    if (!this.currentSource || !config || this.currentSource.audioFilters.length >= 20) return;
    const filter = { id: `filter_${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`, type, name: config.name, enabled: true };
    config.fields.forEach(([key, , , , , , fallback]) => { filter[key] = fallback; });
    this.currentSource.audioFilters.push(filter); this.selectedFilterId = filter.id;
    this._updateDSP(); this.renderFilterList(); this.renderFilterSettings();
  }
  _moveFilter(delta) {
    const list = this.currentSource?.audioFilters;
    const index = list?.findIndex(filter => filter.id === this.selectedFilterId) ?? -1;
    if (index < 0 || index + delta < 0 || index + delta >= list.length) return;
    [list[index], list[index + delta]] = [list[index + delta], list[index]];
    this._updateDSP(); this.renderFilterList();
  }
  _updateDSP() {
    if (!this.currentSource || this.currentSource.destroyed || this.destroyed) return;
    this.audioEngine?.applyAudioFilters(this.currentSource.id, this.currentSource.audioFilters);
    this.onUpdate?.();
  }
  renderFilterList() {
    this.listEvents.abort(); this.listEvents = new AbortController();
    const list = this.container.querySelector('#audio-filter-list'); list.replaceChildren();
    const filters = this.currentSource?.audioFilters || [];
    if (!filters.length) { const empty = document.createElement('p'); empty.className = 'dock-empty-message'; empty.textContent = 'Escolha um filtro e toque em + para adicionar.'; list.appendChild(empty); }
    filters.forEach(filter => {
      const item = document.createElement('div'); item.className = `obs-list-item ${filter.id === this.selectedFilterId ? 'active' : ''}`; item.tabIndex = 0;
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = !!filter.enabled; checkbox.setAttribute('aria-label', `Ativar ${filter.name}`);
      const name = document.createElement('span'); name.className = 'obs-item-title'; name.textContent = filter.name;
      item.append(checkbox, name);
      checkbox.addEventListener('click', event => { event.stopPropagation(); filter.enabled = checkbox.checked; this._updateDSP(); this.renderFilterSettings(); }, { signal: this.listEvents.signal });
      const choose = () => { this.selectedFilterId = filter.id; this.renderFilterList(); this.renderFilterSettings(); };
      item.addEventListener('click', choose, { signal: this.listEvents.signal });
      item.addEventListener('keydown', event => { if (event.target === item && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); choose(); } }, { signal: this.listEvents.signal });
      list.appendChild(item);
    });
    const selected = filters.findIndex(filter => filter.id === this.selectedFilterId);
    this.container.querySelector('#btn-add-audio-filter').disabled = filters.length >= 20;
    this.container.querySelector('#btn-remove-audio-filter').disabled = selected < 0;
    this.container.querySelector('#btn-audio-filter-up').disabled = selected <= 0;
    this.container.querySelector('#btn-audio-filter-down').disabled = selected < 0 || selected >= filters.length - 1;
  }
  renderFilterSettings() {
    this.formEvents.abort(); this.formEvents = new AbortController();
    const panel = this.container.querySelector('#audio-filter-settings-panel'); panel.replaceChildren();
    const filter = this.currentSource?.audioFilters.find(item => item.id === this.selectedFilterId);
    if (!filter) { const empty = document.createElement('p'); empty.className = 'dock-empty-message'; empty.textContent = 'Selecione um filtro para ajustar.'; panel.appendChild(empty); return; }
    const title = document.createElement('h3'); title.style.cssText = 'font-size:13px;margin:0 0 18px'; title.textContent = filter.name; panel.appendChild(title);
    const config = FILTERS[filter.type];
    if (!config) return;
    if (config.note) { const note = document.createElement('p'); note.style.cssText = 'font-size:12px;line-height:1.5;color:var(--obs-text-secondary)'; note.textContent = config.note; panel.appendChild(note); }
    config.fields.forEach(([key, caption, unit, min, max, step, fallback]) => {
      const group = document.createElement('div'); group.className = 'form-group'; group.style.marginBottom = '18px';
      const label = document.createElement('label'); label.className = 'form-label'; label.textContent = caption;
      const value = document.createElement('span'); value.style.cssText = 'font:11px monospace;float:right';
      const slider = document.createElement('input'); slider.type = 'range'; slider.className = 'audio-fader'; slider.min = String(min); slider.max = String(max); slider.step = String(step);
      // IDs come from the fixed field definition, never from imported filter IDs.
      slider.id = `audio-filter-param-${key}`; label.htmlFor = slider.id;
      slider.value = String(bounded(filter[key], min, max, fallback));
      const showValue = () => { value.textContent = `${Number(slider.value).toFixed(step < 1 ? 1 : 0)} ${unit}`; };
      showValue(); slider.addEventListener('input', () => { filter[key] = bounded(Number(slider.value), min, max, fallback); showValue(); this._updateDSP(); }, { signal: this.formEvents.signal });
      label.appendChild(value); group.append(label, slider); panel.appendChild(group);
    });
  }
  destroy() {
    this.destroyed = true; this.listEvents.abort(); this.formEvents.abort();
    this.container.removeEventListener('click', this.backdropClick); destroyDialog(this);
  }
}
