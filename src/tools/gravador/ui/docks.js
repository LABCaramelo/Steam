import { ICONS } from '../assets/icons.js';

export class DocksView {
  constructor(options = {}) {
    Object.assign(this, options);
    this.events = new AbortController();
    this.sceneEvents = new AbortController();
    this.sourceEvents = new AbortController();
    this._setupScenesDock();
    this._setupSourcesDock();
    this._setupTransitionsDock();
    this._setupControlsDock();
  }
  _listen(element, event, fn, events = this.events) { element?.addEventListener(event, fn, { signal: events.signal }); }
  _changed() {
    this.renderScenes();
    this.renderSources();
    this.onSceneChange?.(this.appState.editingScene);
  }
  _setupScenesDock() {
    this._listen(document.getElementById('btn-add-scene'), 'click', () => {
      if (this.onAddSceneClick) { this.onAddSceneClick(); return; }
      const name = prompt('Nome da nova cena:', `Cena ${this.appState.scenes.length + 1}`);
      if (name?.trim()) { this.appState.addScene(name); this._changed(); }
    });
    this._listen(document.getElementById('btn-remove-scene'), 'click', () => {
      if (this.appState.scenes.length <= 1) { alert('Mantenha pelo menos uma cena no estúdio.'); return; }
      if (confirm(`Remover a cena “${this.appState.editingScene.name}”?`)) { this.appState.removeCurrentScene(); this._changed(); }
    });
    this._listen(document.getElementById('btn-scene-up'), 'click', () => { this.appState.moveSceneUp(); this.renderScenes(); });
    this._listen(document.getElementById('btn-scene-down'), 'click', () => { this.appState.moveSceneDown(); this.renderScenes(); });
    this.renderScenes();
  }
  renderScenes() {
    this.sceneEvents.abort(); this.sceneEvents = new AbortController();
    const list = document.getElementById('scenes-list');
    list.replaceChildren();
    this.appState.scenes.forEach(scene => {
      const item = document.createElement('div');
      item.className = `obs-list-item ${scene === this.appState.editingScene ? 'active' : ''}`;
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
      item.setAttribute('aria-pressed', String(scene === this.appState.editingScene));
      const name = document.createElement('span');
      name.className = 'obs-item-title';
      name.textContent = scene.name;
      item.appendChild(name);
      if (this.compositor.isStudioMode && scene === this.appState.currentScene) {
        const badge = document.createElement('span');
        badge.className = 'scene-program-badge';
        badge.textContent = 'NO AR';
        item.appendChild(badge);
      }
      const choose = () => { if (this.transitions.isTransitioning) return; this.appState.setCurrentScene(scene); this._changed(); };
      this._listen(item, 'click', choose, this.sceneEvents);
      this._listen(item, 'keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); } }, this.sceneEvents);
      list.appendChild(item);
    });
  }
  _setupSourcesDock() {
    this._listen(document.getElementById('btn-add-source'), 'click', () => this.onAddSourceClick?.());
    this._listen(document.getElementById('btn-remove-source'), 'click', () => {
      const source = this.compositor.selectedSource;
      if (source && confirm(`Remover a fonte “${source.name}”?`)) { this.appState.removeSource(source); this._changed(); }
    });
    this._listen(document.getElementById('btn-source-up'), 'click', () => { this.appState.moveSourceUp(this.compositor.selectedSource); this.renderSources(); });
    this._listen(document.getElementById('btn-source-down'), 'click', () => { this.appState.moveSourceDown(this.compositor.selectedSource); this.renderSources(); });
    this._listen(document.getElementById('btn-source-props'), 'click', () => { if (this.compositor.selectedSource) this.onSourcePropertiesClick?.(this.compositor.selectedSource); });
    this.renderSources();
  }
  renderSources() {
    const list = document.getElementById('sources-list');
    const sources = this.appState.editingScene?.sources || [];
    const ordered = [...sources].reverse();
    // Keep existing rows while selecting or editing a source: rebuilding on the
    // first click would remove its target before a double-click can be emitted.
    if (this.renderedSources?.length === ordered.length && ordered.every((source, index) => this.renderedSources[index] === source)) {
      this.sourceRows.forEach((item, index) => this._updateSourceRow(item, ordered[index]));
      return;
    }
    this.sourceEvents.abort(); this.sourceEvents = new AbortController();
    this.renderedSources = ordered;
    this.sourceRows = [];
    list.replaceChildren();
    if (!sources.length) {
      const empty = document.createElement('p');
      empty.className = 'dock-empty-message';
      empty.textContent = 'Adicione uma fonte para começar.';
      list.appendChild(empty);
    }
    ordered.forEach(source => {
      const item = document.createElement('div');
      item.className = `obs-list-item ${this.compositor.selectedSource === source ? 'active' : ''}`;
      item.tabIndex = 0;
      item.setAttribute('role', 'group');
      item.setAttribute('aria-label', source.name);
      item.innerHTML = `
        <button class="obs-item-icon-btn ${source.visible ? '' : 'off'}" data-action="toggle-vis" title="Mostrar ou ocultar fonte" aria-label="Mostrar ou ocultar fonte">${source.visible ? ICONS.eye : ICONS.eyeOff}</button>
        <button class="obs-item-icon-btn ${source.locked ? 'off' : ''}" data-action="toggle-lock" title="Travar posição" aria-label="Travar posição">${source.locked ? ICONS.lock : ICONS.unlock}</button>
        <span style="display:flex;width:14px;height:14px;color:var(--obs-text-secondary)">${ICONS[source.type] || ICONS.monitor}</span>
        <span class="obs-item-title"></span>`;
      this._updateSourceRow(item, source);
      this._listen(item, 'click', event => {
        const action = event.target.closest('button[data-action]')?.dataset.action;
        if (action === 'toggle-vis') source.visible = !source.visible;
        if (action === 'toggle-lock') source.locked = !source.locked;
        if (action) { this.appState.saveCurrentSetup(); this.onSceneChange?.(this.appState.editingScene); }
        else this.compositor.selectSource(source);
        this.renderSources();
      }, this.sourceEvents);
      this._listen(item, 'dblclick', event => { if (!event.target.closest('button')) this.onSourcePropertiesClick?.(source); }, this.sourceEvents);
      this._listen(item, 'keydown', event => { if (event.target === item && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); this.compositor.selectSource(source); this.renderSources(); } }, this.sourceEvents);
      list.appendChild(item);
      this.sourceRows.push(item);
    });
  }
  _updateSourceRow(item, source) {
    item.classList.toggle('active', this.compositor.selectedSource === source);
    item.setAttribute('aria-label', source.name);
    item.querySelector('.obs-item-title').textContent = source.name;
    const visibility = item.querySelector('[data-action="toggle-vis"]');
    visibility.classList.toggle('off', !source.visible);
    visibility.innerHTML = source.visible ? ICONS.eye : ICONS.eyeOff;
    visibility.setAttribute('aria-pressed', String(source.visible));
    const lock = item.querySelector('[data-action="toggle-lock"]');
    lock.classList.toggle('off', source.locked);
    lock.innerHTML = source.locked ? ICONS.lock : ICONS.unlock;
    lock.setAttribute('aria-pressed', String(source.locked));
  }
  _setupTransitionsDock() {
    this._listen(document.getElementById('transition-type-select'), 'change', event => {
      if (['cut', 'fade', 'slide'].includes(event.target.value)) this.transitions.type = event.target.value;
      const apply = document.getElementById('btn-studio-fade');
      if (apply) apply.textContent = {cut:'Cortar',fade:'Esmaecer',slide:'Deslizar'}[this.transitions.type];
    });
    this._listen(document.getElementById('transition-duration-input'), 'change', event => {
      this.transitions.duration = Math.max(0, Math.min(2000, Number(event.target.value) || 0));
      event.target.value = this.transitions.duration;
    });
  }
  _setupControlsDock() {
    const button = document.getElementById('btn-record');
    this._listen(button, 'click', async () => {
      if (button.disabled) return;
      button.disabled = true;
      try {
        if (this.recordingService.isRecording) await this.recordingService.stopRecording();
        else await this.recordingService.startRecording();
      } catch (error) { alert(error?.message || 'Não foi possível gravar neste navegador.'); }
      finally { button.disabled = false; this.syncRecordingControls(); }
    });
    this._listen(document.getElementById('btn-pause-record'), 'click', () => {
      this.recordingService.pauseRecording?.();
      this.syncRecordingControls();
    });
    this._listen(document.getElementById('btn-snapshot'), 'click', () => {
      if (this.onSnapshot) this.onSnapshot();
      else this.compositor.saveScreenshot?.();
    });
    this._listen(document.getElementById('btn-studio'), 'click', () => { this.onStudioModeToggle?.(); this._changed(); });
    this._listen(document.getElementById('btn-settings'), 'click', () => this.onSettingsClick?.());
    this.syncRecordingControls();
  }
  syncRecordingControls() {
    const recording = this.recordingService.isRecording;
    const paused = this.recordingService.isPaused;
    const record = document.getElementById('btn-record');
    const pause = document.getElementById('btn-pause-record');
    if (record) { record.textContent = recording ? 'Encerrar gravação' : 'Gravar'; record.classList.toggle('recording-active', recording); }
    if (pause) { pause.disabled = !recording; pause.textContent = paused ? 'Retomar' : 'Pausar'; pause.setAttribute('aria-pressed', String(!!paused)); }
  }
  destroy() { this.events.abort(); this.sceneEvents.abort(); this.sourceEvents.abort(); this.renderedSources = []; this.sourceRows = []; }
}
