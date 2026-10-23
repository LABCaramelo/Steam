import { setupDialog, openDialog, closeDialog, destroyDialog } from './dialog-utils.js';

const finite = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
export class SourcePropertiesDialog {
  constructor(container, compositor, onUpdate, onOpenAudioFilters, loadMediaFile) {
    Object.assign(this, { container, compositor, onUpdate, onOpenAudioFilters, loadMediaFile });
    this.currentSource = null;
    this.isOpen = false;
    this.destroyed = false;
    this.fileRequest = 0;
    this._setupUI();
    setupDialog(this, 'Propriedades da fonte');
  }
  _setupUI() {
    this.container.innerHTML = `<div class="obs-modal" style="max-width:640px;width:100%"><div class="obs-modal-header"><span id="props-title">Propriedades da fonte</span><button class="obs-modal-close-btn" id="modal-props-close" aria-label="Fechar propriedades">&times;</button></div><div class="obs-modal-body" id="props-body"></div><div class="obs-modal-footer"><button class="obs-btn" id="btn-open-audio-filters" style="display:none">Filtros de áudio</button><button class="obs-btn" id="btn-fit-screen">Ajustar à tela</button><button class="obs-btn" id="btn-center-screen">Centralizar</button><button class="obs-btn primary" id="btn-props-ok">Concluir</button></div></div>`;
    this.container.querySelector('#modal-props-close').addEventListener('click', () => this.close());
    this.container.querySelector('#btn-props-ok').addEventListener('click', () => this.close());
    this.backdropClick = event => { if (event.target === this.container) this.close(); };
    this.container.addEventListener('click', this.backdropClick);
    this.container.querySelector('#btn-fit-screen').addEventListener('click', () => { if (this.currentSource?.width && this.currentSource?.height) { this.compositor.fitToScreen(this.currentSource); this.renderForm(); this.onUpdate?.(); } });
    this.container.querySelector('#btn-center-screen').addEventListener('click', () => { if (this.currentSource) { this.compositor.centerToScreen(this.currentSource); this.renderForm(); this.onUpdate?.(); } });
    this.container.querySelector('#btn-open-audio-filters').addEventListener('click', () => { const source = this.currentSource; this.close(); if (source) this.onOpenAudioFilters?.(source); });
  }
  open(source) {
    if (!source || source.destroyed || this.destroyed) return;
    this.currentSource = source;
    this.container.querySelector('#props-title').textContent = `Propriedades · ${source.name}`;
    this.container.querySelector('#btn-open-audio-filters').style.display = source.hasAudio ? 'inline-block' : 'none';
    this.renderForm();
    openDialog(this);
  }
  close() { closeDialog(this); this.onUpdate?.(); }
  _field(id, label, type = 'number', attributes = '') { return `<div class="form-group"><label class="form-label" for="${id}">${label}</label><input class="obs-input" id="${id}" type="${type}" ${attributes}></div>`; }
  renderForm() {
    const source = this.currentSource;
    if (!source) return;
    const field = (id, label, type, attributes) => this._field(id, label, type, attributes);
    const body = this.container.querySelector('#props-body');
    body.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${field('prop-name', 'Nome da fonte', 'text', 'maxlength="150"')}${field('prop-opacity', 'Opacidade', 'range', 'min="0" max="1" step="0.05"')}</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${field('prop-x', 'Posição X')}${field('prop-y', 'Posição Y')}${field('prop-w', 'Largura', 'number', 'min="1" max="8192"')}${field('prop-h', 'Altura', 'number', 'min="1" max="8192"')}</div>
      ${field('prop-rotation', 'Rotação (graus)', 'number', 'min="-360" max="360"')}
      <div id="type-specific-container" style="background:var(--obs-bg-darker);padding:12px;border-radius:6px;border:1px solid var(--obs-border)"></div>
      <div style="border-top:1px solid var(--obs-border);padding-top:12px"><h4 style="font-size:12px;margin-bottom:10px">Filtros de imagem</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${field('prop-bright', 'Brilho (%)', 'range', 'min="0" max="200"')}${field('prop-contrast', 'Contraste (%)', 'range', 'min="0" max="200"')}</div>
      <label style="display:flex;align-items:center;gap:8px;font-size:12px"><input type="checkbox" id="prop-chroma-enable"> Remover fundo por cor (chroma key)</label>
      <div id="chroma-options" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">${field('prop-chroma-color', 'Cor a remover', 'color')}${field('prop-chroma-sim', 'Tolerância', 'range', 'min="1" max="1000"')}</div></div>`;
    const type = body.querySelector('#type-specific-container');
    if (source.type === 'text') type.innerHTML = `${field('prop-text-val', 'Conteúdo do texto', 'text', 'maxlength="10000"')}<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">${field('prop-font-size', 'Tamanho', 'number', 'min="8" max="500"')}${field('prop-text-color', 'Cor do texto', 'color')}${field('prop-scroll-speed', 'Rolagem (px/s)', 'number', 'min="-1000" max="1000"')}</div>`;
    else if (source.type === 'color') type.innerHTML = field('prop-color-val', 'Cor do fundo', 'color');
    else if (source.type === 'image' || source.type === 'video') type.innerHTML = `${field('prop-file-upload', source.type === 'image' ? 'Arquivo de imagem' : 'Arquivo de vídeo', 'file', source.type === 'image' ? 'accept="image/*"' : 'accept="video/*"')}<p id="prop-media-status" role="status" style="font-size:12px;color:var(--obs-text-secondary)">Escolha um arquivo local. Ele não é incluído na exportação da coleção.</p>`;
    else { const note = document.createElement('p'); note.style.cssText = 'font-size:12px;color:var(--obs-text-secondary)'; note.textContent = source.type === 'browser' ? 'Para gravar um site ou chat, adicione uma captura da aba do navegador.' : source.props.stream?.active ? 'Captura conectada. Você pode ajustar a posição e os filtros.' : 'Esta captura está desconectada. Adicione novamente a fonte e autorize o acesso.'; type.appendChild(note); }
    const set = (id, value) => { const element = body.querySelector(`#${id}`); if (element) element.value = value ?? ''; };
    [['prop-name', source.name], ['prop-opacity', source.opacity], ['prop-x', source.x], ['prop-y', source.y], ['prop-w', source.width], ['prop-h', source.height], ['prop-rotation', source.rotation], ['prop-bright', source.filters.brightness], ['prop-contrast', source.filters.contrast], ['prop-chroma-color', source.filters.chromaKey.color], ['prop-chroma-sim', source.filters.chromaKey.similarity], ['prop-text-val', source.props.text], ['prop-font-size', source.props.fontSize], ['prop-text-color', source.props.textColor], ['prop-scroll-speed', source.props.scrollSpeed], ['prop-color-val', source.props.color]].forEach(([id, value]) => set(id, value));
    body.querySelector('#prop-chroma-enable').checked = source.filters.chromaKey.enabled;
    body.querySelector('#chroma-options').style.display = source.filters.chromaKey.enabled ? 'grid' : 'none';
    const listen = (id, update, event = 'input') => body.querySelector(`#${id}`)?.addEventListener(event, e => { update(e.target); this.onUpdate?.(); });
    listen('prop-name', input => { source.name = input.value.slice(0, 150); this.container.querySelector('#props-title').textContent = `Propriedades · ${source.name}`; });
    [['prop-opacity', 'opacity', 0, 1], ['prop-x', 'x', -16384, 16384], ['prop-y', 'y', -16384, 16384], ['prop-w', 'width', 1, 8192], ['prop-h', 'height', 1, 8192], ['prop-rotation', 'rotation', -360, 360]].forEach(([id, key, min, max]) => listen(id, input => { source[key] = finite(input.value, source[key], min, max); }));
    listen('prop-bright', input => { source.filters.brightness = finite(input.value, 100, 0, 200); });
    listen('prop-contrast', input => { source.filters.contrast = finite(input.value, 100, 0, 200); });
    listen('prop-chroma-enable', input => { source.filters.chromaKey.enabled = input.checked; body.querySelector('#chroma-options').style.display = input.checked ? 'grid' : 'none'; }, 'change');
    listen('prop-chroma-color', input => { source.filters.chromaKey.color = input.value; });
    listen('prop-chroma-sim', input => { source.filters.chromaKey.similarity = finite(input.value, 400, 1, 1000); });
    listen('prop-text-val', input => { source.props.text = input.value; });
    listen('prop-font-size', input => { source.props.fontSize = finite(input.value, 48, 8, 500); });
    listen('prop-text-color', input => { source.props.textColor = input.value; });
    listen('prop-scroll-speed', input => { source.props.scrollSpeed = finite(input.value, 0, -1000, 1000); });
    listen('prop-color-val', input => { source.props.color = input.value; });
    body.querySelector('#prop-file-upload')?.addEventListener('change', event => { const file = event.target.files?.[0]; if (file) this._loadFile(source, file); });
  }
  async _loadFile(source, file) {
    const expected = source.type === 'image' ? 'image/' : 'video/';
    const status = this.container.querySelector('#prop-media-status');
    if (file.type && !file.type.startsWith(expected)) { status.textContent = 'Escolha um arquivo do tipo indicado.'; return; }
    const request = ++this.fileRequest;
    status.textContent = 'Abrindo arquivo…';
    try {
      if (!this.loadMediaFile) throw new Error('O carregador de mídia está indisponível.');
      await this.loadMediaFile(source, file);
      if (this.destroyed || source.destroyed) return;
      if (request === this.fileRequest && this.currentSource === source && this.isOpen) {
        this.renderForm();
        this.container.querySelector('#prop-media-status').textContent = `Arquivo conectado: ${file.name}`;
      }
      this.onUpdate?.();
    } catch (error) {
      if (!this.destroyed && request === this.fileRequest && this.currentSource === source) {
        const element = this.container.querySelector('#prop-media-status');
        if (element) element.textContent = error?.message || 'Não foi possível abrir este arquivo neste navegador.';
      }
    }
  }
  destroy() { this.destroyed = true; this.fileRequest++; this.container.removeEventListener('click', this.backdropClick); destroyDialog(this); }
}
