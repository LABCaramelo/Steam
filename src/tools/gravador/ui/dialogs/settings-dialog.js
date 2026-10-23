import { setupDialog, openDialog, closeDialog, destroyDialog } from './dialog-utils.js';

const RESOLUTIONS = ['1920x1080', '1280x720', '2560x1440', '3840x2160', '1080x1920', '1080x1080'];
const DEFAULTS = { canvasResolution: '1920x1080', fps: 30, bitrate: 16000, format: 'webm', theme: 'Caramelo' };
function validateSettings(value) {
  return {
    canvasResolution: RESOLUTIONS.includes(value?.canvasResolution) ? value.canvasResolution : DEFAULTS.canvasResolution,
    fps: [24, 30, 60].includes(value?.fps) ? value.fps : DEFAULTS.fps,
    bitrate: Number.isFinite(value?.bitrate) ? Math.min(60000, Math.max(2000, Math.round(value.bitrate))) : DEFAULTS.bitrate,
    format: ['mp4', 'webm'].includes(value?.format) ? value.format : DEFAULTS.format,
    theme: 'Caramelo'
  };
}
export class SettingsDialog {
  constructor(container, compositor, appState, onSettingsApply, options = {}) {
    Object.assign(this, { container, compositor, appState, onSettingsApply });
    this.storageKey = typeof options === 'string' ? options : options.storageKey || 'lab:tool:gravador:settings';
    this.isRecording = typeof options?.isRecording === 'function' ? options.isRecording : () => false;
    this.currentSettings = { ...DEFAULTS };
    this.isOpen = false;
    this.destroyed = false;
    this._loadSettings();
    this._setupUI();
    setupDialog(this, 'Configurações do No Ar');
  }
  _loadSettings() {
    try { const saved = localStorage.getItem(this.storageKey); if (saved) this.currentSettings = validateSettings(JSON.parse(saved)); } catch {}
  }
  _saveSettings() { try { localStorage.setItem(this.storageKey, JSON.stringify(this.currentSettings)); } catch {} }
  _setupUI() {
    this.container.innerHTML = `<div class="obs-modal" style="max-width:560px;width:100%">
      <div class="obs-modal-header"><span>Configurações</span><button class="obs-modal-close-btn" id="modal-settings-close" aria-label="Fechar configurações">&times;</button></div>
      <div class="obs-modal-body" style="gap:14px">
        <p style="font-size:12px;color:var(--obs-text-secondary)">A gravação salva a saída no seu dispositivo. Formatos disponíveis dependem do navegador.</p>
        <div class="form-group"><label class="form-label" for="settings-res-select">Resolução da saída</label><select class="obs-select" id="settings-res-select">${RESOLUTIONS.map(res => `<option value="${res}">${res.replace('x', ' × ')}${res === '1080x1920' ? ' · Vertical' : res === '1080x1080' ? ' · Quadrado' : ''}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label" for="settings-fps-select">Quadros por segundo</label><select class="obs-select" id="settings-fps-select"><option value="24">24 fps</option><option value="30">30 fps</option><option value="60">60 fps</option></select></div>
        <div class="form-group"><label class="form-label" for="settings-bitrate">Taxa de vídeo (kb/s)</label><input type="number" class="obs-input" id="settings-bitrate" min="2000" max="60000" step="1000"><span id="bitrate-preset-hint" style="font-size:11px;color:var(--obs-text-secondary)"></span></div>
        <div class="form-group"><label class="form-label" for="settings-format-select">Formato preferido</label><select class="obs-select" id="settings-format-select"><option value="webm">WebM · VP9 ou VP8 / Opus</option><option value="mp4">MP4 · quando disponível</option></select></div>
        <p id="settings-busy-message" role="status" style="font-size:12px;color:var(--obs-accent-blue);display:none">Encerre a gravação ou transmissão para alterar a saída ou importar cenas.</p>
        <div style="padding-top:12px;border-top:1px solid var(--obs-border);display:flex;gap:8px"><button class="obs-btn" id="btn-export-scenes">Exportar cenas</button><button class="obs-btn" id="btn-import-scenes">Importar cenas</button><input type="file" id="import-scenes-input" accept=".json,application/json" style="display:none"></div>
        <p style="font-size:11px;color:var(--obs-text-muted)">A coleção guarda o layout. Câmeras, microfones e arquivos locais precisam ser conectados novamente.</p>
      </div><div class="obs-modal-footer"><button class="obs-btn" id="btn-settings-cancel">Cancelar</button><button class="obs-btn primary" id="btn-settings-apply">Aplicar</button></div></div>`;
    this.container.querySelector('#modal-settings-close').addEventListener('click', () => this.close());
    this.container.querySelector('#btn-settings-cancel').addEventListener('click', () => this.close());
    this.container.querySelector('#settings-bitrate').addEventListener('input', event => this._updateBitrateHint(event.target.value));
    this.container.querySelector('#btn-settings-apply').addEventListener('click', () => {
      if (this.isRecording()) { this._syncBusyState(); return; }
      this.currentSettings = validateSettings({
        canvasResolution: this.container.querySelector('#settings-res-select').value,
        fps: Number(this.container.querySelector('#settings-fps-select').value),
        bitrate: Number(this.container.querySelector('#settings-bitrate').value),
        format: this.container.querySelector('#settings-format-select').value
      });
      this._saveSettings();
      this.onSettingsApply?.(this.currentSettings);
      this.close();
    });
    this.container.querySelector('#btn-export-scenes').addEventListener('click', () => {
      const blob = new Blob([this.appState.exportScenesJSON()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.download = `No-Ar_Cenas_${new Date().toISOString().slice(0, 10)}.json`;
      anchor.href = url;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    const input = this.container.querySelector('#import-scenes-input');
    this.container.querySelector('#btn-import-scenes').addEventListener('click', () => { if (!this.isRecording()) input.click(); });
    input.addEventListener('change', async event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file || this.isRecording()) return;
      if (file.size > 5_000_000) { alert('A coleção deve ter até 5 MB.'); return; }
      try {
        const content = await file.text();
        if (this.destroyed || this.isRecording()) return;
        this.appState.importScenesJSON(content);
        this.onSettingsApply?.(this.currentSettings, { collectionChanged: true });
        this.close();
      } catch (error) { if (!this.destroyed) alert(`Não foi possível importar: ${error.message}`); }
    });
    this.backdropClick = event => { if (event.target === this.container) this.close(); };
    this.container.addEventListener('click', this.backdropClick);
  }
  _updateBitrateHint(value) { this.container.querySelector('#bitrate-preset-hint').textContent = `${(Number(value) / 1000).toFixed(1)} Mb/s · qualidade depende das fontes e do navegador`; }
  _syncBusyState() {
    const busy = this.isRecording();
    ['settings-res-select', 'settings-fps-select', 'settings-bitrate', 'settings-format-select', 'btn-settings-apply', 'btn-import-scenes'].forEach(id => { this.container.querySelector(`#${id}`).disabled = busy; });
    this.container.querySelector('#settings-busy-message').style.display = busy ? 'block' : 'none';
  }
  _syncFormFromCurrentSettings() {
    const settings = this.currentSettings;
    this.container.querySelector('#settings-res-select').value = settings.canvasResolution;
    this.container.querySelector('#settings-fps-select').value = String(settings.fps);
    this.container.querySelector('#settings-bitrate').value = settings.bitrate;
    this.container.querySelector('#settings-format-select').value = settings.format;
    this._updateBitrateHint(settings.bitrate);
    this._syncBusyState();
  }
  open() { this._syncFormFromCurrentSettings(); openDialog(this); }
  close() { closeDialog(this); }
  destroy() { this.destroyed = true; this.container.removeEventListener('click', this.backdropClick); destroyDialog(this); }
}
