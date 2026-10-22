// Menu Bar Controller
export class MenuBarView {
  constructor(options = {}) {
    this.compositor = options.compositor;
    this.appState = options.appState;
    this.recordingService = options.recordingService;
    this.onOpenSettings = options.onOpenSettings;
    this.onToggleStudioMode = options.onToggleStudioMode;

    this._setupMenus();
  }

  _setupMenus() {
    const menuItems = document.querySelectorAll('.obs-menu-item');

    menuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const isOpen = item.classList.contains('active');
        this._closeAllMenus();
        if (!isOpen) {
          item.classList.add('active');
        }
        e.stopPropagation();
      });
    });

    document.addEventListener('click', () => {
      this._closeAllMenus();
    });

    // Action handlers
    document.querySelectorAll('.obs-dropdown-item[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.dataset.action;
        this._handleAction(action);
        this._closeAllMenus();
        e.stopPropagation();
      });
    });
  }

  _closeAllMenus() {
    document.querySelectorAll('.obs-menu-item').forEach(m => m.classList.remove('active'));
  }

  _handleAction(action) {
    switch (action) {
      case 'file-settings':
        if (this.onOpenSettings) this.onOpenSettings();
        break;
      case 'file-screenshot':
        this.compositor.saveScreenshot();
        break;
      case 'file-exit':
        if (confirm('Exit OBS Studio Web?')) window.close();
        break;
      case 'edit-fit':
        this.compositor.fitToScreen(this.compositor.selectedSource);
        break;
      case 'edit-stretch':
        this.compositor.stretchToScreen(this.compositor.selectedSource);
        break;
      case 'edit-center':
        this.compositor.centerToScreen(this.compositor.selectedSource);
        break;
      case 'view-studio':
        if (this.onToggleStudioMode) this.onToggleStudioMode();
        break;
      case 'view-fullscreen':
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
        break;
      case 'help-about':
        alert(
          'OBS Studio Web Edition v1.0.0\n\n' +
          'Reverse engineered and reconstructed using REA (Reverse Engineer Anything).\n' +
          'Targets analyzed: obs64.exe, obs.dll (libobs), Qt6 Yami Theme, WASAPI/Audio Mixer, Transitions & Compositing pipeline.\n\n' +
          'Features: 60 FPS Canvas Compositor, Web Audio API Mixer, MediaRecorder recording, WebRTC/DisplayMedia screen capture, Studio Mode.'
        );
        break;
    }
  }
}
