// Status values come directly from the rendering and recording services.
export class StatusBarView {
  constructor(compositor, recordingService, streamingService) {
    Object.assign(this, { compositor, recordingService, streamingService });
    this.bindings = [];
    this._setupListeners();
  }
  _text(id, value) { const element = document.getElementById(id); if (element) element.textContent = value; }
  _dot(id, className, active) { document.getElementById(id)?.classList.toggle(className, !!active); }
  _bind(object, name, fn) {
    if (!object) return;
    const previous = object[name];
    const handler = (...args) => { previous?.apply(object, args); fn(...args); };
    object[name] = handler;
    this.bindings.push({ object, name, previous, handler });
  }
  _setupListeners() {
    this._bind(this.compositor, 'onStatsUpdate', stats => {
      this._text('status-fps-text', `${Number(stats.fps || 0).toFixed(1)} fps`);
      this._text('status-cpu-text', `Render: ${Number(stats.renderTimeMs || 0).toFixed(1)} ms`);
    });
    this._bind(this.recordingService, 'onStateChange', recording => {
      this._dot('status-rec-dot', 'active-red', recording);
      if (!recording) this._text('status-rec-text', 'REC: 00:00:00');
    });
    this._bind(this.recordingService, 'onTimerUpdate', time => this._text('status-rec-text', `${this.recordingService.isPaused ? 'PAUSA' : 'REC'}: ${time}`));
    this._bind(this.streamingService, 'onStateChange', streaming => {
      this._dot('status-live-dot', 'active-green', streaming);
      if (!streaming) { this._text('status-live-text', 'AO VIVO: 00:00:00'); this._text('status-bitrate-text', 'kb/s: —'); this._text('status-dropped-text', 'Quadros perdidos: —'); }
    });
    this._bind(this.streamingService, 'onStatsUpdate', stats => {
      if (stats.time) this._text('status-live-text', `AO VIVO: ${stats.time}`);
      this._text('status-bitrate-text', `kb/s: ${stats.bitrate ?? '—'}`);
      this._text('status-dropped-text', `Quadros perdidos: ${stats.droppedFrames ?? '—'}`);
    });
  }
  destroy() {
    this.bindings.forEach(({ object, name, handler, previous }) => { if (object[name] === handler) object[name] = previous; });
    this.bindings = [];
  }
}
