// Docks UI Component
import { ICONS } from '../assets/icons.js';

export class DocksView {
  constructor(options = {}) {
    this.appState = options.appState;
    this.compositor = options.compositor;
    this.recordingService = options.recordingService;
    this.streamingService = options.streamingService;
    this.transitions = options.transitions;

    this.onAddSourceClick = options.onAddSourceClick;
    this.onSourcePropertiesClick = options.onSourcePropertiesClick;
    this.onSettingsClick = options.onSettingsClick;
    this.onSceneChange = options.onSceneChange;
    this.onStudioModeToggle = options.onStudioModeToggle;

    this._setupScenesDock();
    this._setupSourcesDock();
    this._setupTransitionsDock();
    this._setupControlsDock();
  }

  _setupScenesDock() {
    const listEl = document.getElementById('scenes-list');
    const addBtn = document.getElementById('btn-add-scene');
    const removeBtn = document.getElementById('btn-remove-scene');
    const upBtn = document.getElementById('btn-scene-up');
    const downBtn = document.getElementById('btn-scene-down');

    addBtn.addEventListener('click', () => {
      const name = prompt('Digite o nome da nova cena:', `Cena ${this.appState.scenes.length + 1}`);
      if (name) {
        this.appState.addScene(name);
        this.renderScenes();
      }
    });

    removeBtn.addEventListener('click', () => {
      if (this.appState.scenes.length <= 1) {
        alert('O estúdio precisa manter pelo menos uma cena.');
        return;
      }
      if (confirm(`Remover cena "${this.appState.currentScene.name}"?`)) {
        this.appState.removeCurrentScene();
        this.renderScenes();
        this.renderSources();
      }
    });

    upBtn.addEventListener('click', () => {
      this.appState.moveSceneUp();
      this.renderScenes();
    });

    downBtn.addEventListener('click', () => {
      this.appState.moveSceneDown();
      this.renderScenes();
    });

    this.renderScenes();
  }

  renderScenes() {
    const listEl = document.getElementById('scenes-list');
    listEl.innerHTML = '';

    this.appState.scenes.forEach(scene => {
      const item = document.createElement('div');
      item.className = `obs-list-item ${scene === this.appState.currentScene ? 'active' : ''}`;
      item.innerHTML = `
        <span class="obs-item-title">${scene.name}</span>
      `;
      item.addEventListener('click', () => {
        this.appState.setCurrentScene(scene);
        this.renderScenes();
        this.renderSources();
        if (this.onSceneChange) this.onSceneChange(scene);
      });
      listEl.appendChild(item);
    });
  }

  _setupSourcesDock() {
    const addBtn = document.getElementById('btn-add-source');
    const removeBtn = document.getElementById('btn-remove-source');
    const upBtn = document.getElementById('btn-source-up');
    const downBtn = document.getElementById('btn-source-down');
    const propsBtn = document.getElementById('btn-source-props');

    addBtn.addEventListener('click', () => {
      if (this.onAddSourceClick) this.onAddSourceClick();
    });

    removeBtn.addEventListener('click', () => {
      const s = this.compositor.selectedSource;
      if (!s) return;
      if (confirm(`Remover fonte "${s.name}"?`)) {
        this.appState.removeSource(s);
        this.compositor.selectSource(null);
        this.renderSources();
      }
    });

    upBtn.addEventListener('click', () => {
      const s = this.compositor.selectedSource;
      if (s) {
        this.appState.moveSourceUp(s);
        this.renderSources();
      }
    });

    downBtn.addEventListener('click', () => {
      const s = this.compositor.selectedSource;
      if (s) {
        this.appState.moveSourceDown(s);
        this.renderSources();
      }
    });

    propsBtn.addEventListener('click', () => {
      const s = this.compositor.selectedSource;
      if (s && this.onSourcePropertiesClick) {
        this.onSourcePropertiesClick(s);
      }
    });

    this.renderSources();
  }

  renderSources() {
    const listEl = document.getElementById('sources-list');
    listEl.innerHTML = '';

    const currentScene = this.appState.currentScene;
    if (!currentScene || !currentScene.sources) return;

    // OBS shows sources top layer first
    const reversed = [...currentScene.sources].reverse();

    reversed.forEach(source => {
      const item = document.createElement('div');
      const isSelected = this.compositor.selectedSource === source;
      item.className = `obs-list-item ${isSelected ? 'active' : ''}`;

      const typeIcon = ICONS[source.type] || ICONS.monitor;

      item.innerHTML = `
        <button class="obs-item-icon-btn ${source.visible ? '' : 'off'}" data-action="toggle-vis" title="Visibility">
          ${source.visible ? ICONS.eye : ICONS.eyeOff}
        </button>
        <button class="obs-item-icon-btn ${source.locked ? 'off' : ''}" data-action="toggle-lock" title="Lock">
          ${source.locked ? ICONS.lock : ICONS.unlock}
        </button>
        <span style="display:flex; width:14px; height:14px; color: var(--obs-text-secondary);">${typeIcon}</span>
        <span class="obs-item-title">${source.name}</span>
      `;

      item.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('button[data-action]');
        if (actionBtn) {
          const action = actionBtn.dataset.action;
          if (action === 'toggle-vis') {
            source.visible = !source.visible;
            this.renderSources();
            this.appState.saveCurrentSetup();
          } else if (action === 'toggle-lock') {
            source.locked = !source.locked;
            this.renderSources();
            this.appState.saveCurrentSetup();
          }
          return;
        }

        this.compositor.selectSource(source);
        this.renderSources();
      });

      item.addEventListener('dblclick', () => {
        if (this.onSourcePropertiesClick) {
          this.onSourcePropertiesClick(source);
        }
      });

      listEl.appendChild(item);
    });
  }

  _setupTransitionsDock() {
    const select = document.getElementById('transition-type-select');
    const durationInput = document.getElementById('transition-duration-input');

    select.addEventListener('change', (e) => {
      this.transitions.type = e.target.value;
      this.appState.saveCurrentSetup();
    });

    durationInput.addEventListener('change', (e) => {
      this.transitions.duration = parseInt(e.target.value, 10) || 300;
      this.appState.saveCurrentSetup();
    });
  }

  _setupControlsDock() {
    const btnRecord = document.getElementById('btn-record');
    const btnStudio = document.getElementById('btn-studio');
    const btnSettings = document.getElementById('btn-settings');

    if (btnRecord) {
      btnRecord.addEventListener('click', () => {
        if (this.recordingService.isRecording) {
          this.recordingService.stopRecording();
          btnRecord.textContent = 'Iniciar Gravação';
          btnRecord.classList.remove('recording-active');
        } else {
          this.recordingService.startRecording();
          btnRecord.textContent = 'Parar Gravação';
          btnRecord.classList.add('recording-active');
        }
      });
    }

    if (btnStudio) {
      btnStudio.addEventListener('click', () => {
        if (this.onStudioModeToggle) this.onStudioModeToggle();
      });
    }

    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        if (this.onSettingsClick) this.onSettingsClick();
      });
    }
  }
}
