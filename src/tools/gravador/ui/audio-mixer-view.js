import { ICONS } from '../assets/icons.js';

export class AudioMixerView {
  constructor(container, audioEngine) {
    Object.assign(this, { container, audioEngine });
    this.channels = [];
    this.elements = new Map();
    this.animationId = null;
    this.onOpenAudioFilters = null;
    this.onUpdate = null;
    this.events = new AbortController();
    this._startMeterLoop();
  }
  setSources(sources = []) { this.channels = sources.filter(source => source.hasAudio); this.render(); }
  _db(source) { return source.muted ? 'MUDO' : source.volume <= 0.001 ? '−∞ dB' : `${(20 * Math.log10(source.volume)).toFixed(1)} dB`; }
  render() {
    this.events.abort();
    this.events = new AbortController();
    this.elements.clear();
    this.container.replaceChildren();
    const wrapper = document.createElement('div');
    wrapper.className = 'obs-mixer-container';
    if (!this.channels.length) {
      const empty = document.createElement('p');
      empty.className = 'dock-empty-message';
      empty.textContent = 'Adicione um microfone ou uma fonte com áudio.';
      wrapper.appendChild(empty);
    }
    this.channels.forEach(source => {
      const channel = document.createElement('div');
      channel.className = 'audio-channel';
      channel.dataset.sourceId = source.id;
      channel.innerHTML = `
        <div class="audio-channel-header"><div class="audio-channel-title"><span style="display:flex;width:14px;height:14px">${source.type === 'mic' ? ICONS.mic : ICONS.volume}</span><span data-part="name"></span></div>
          <div style="display:flex;align-items:center;gap:6px"><div class="audio-channel-db" data-part="db"></div><button class="obs-item-icon-btn" data-part="filters" title="Filtros de áudio" aria-label="Filtros de áudio">${ICONS.gear}</button></div></div>
        <div class="audio-meter-track"><div class="audio-meter-bar" data-part="bar"></div><div class="audio-meter-peaks" data-part="peak"></div></div>
        <div class="audio-channel-controls"><input type="range" class="audio-fader" data-part="fader" min="0" max="1" step="0.01" aria-label="Volume da fonte"><button class="audio-mute-btn" data-part="mute"></button></div>`;
      const find = part => channel.querySelector(`[data-part="${part}"]`);
      const name = find('name'), db = find('db'), fader = find('fader'), mute = find('mute');
      name.textContent = source.name;
      fader.value = String(source.volume);
      fader.setAttribute('aria-label', `Volume: ${source.name}`);
      const sync = () => { db.textContent = this._db(source); mute.innerHTML = source.muted ? ICONS.volumeMute : ICONS.volume; mute.classList.toggle('muted', source.muted); mute.title = source.muted ? 'Reativar áudio' : 'Silenciar'; mute.setAttribute('aria-label', `${mute.title}: ${source.name}`); mute.setAttribute('aria-pressed', String(source.muted)); };
      sync();
      fader.addEventListener('input', event => { source.volume = Number(event.target.value); this.audioEngine.setSourceVolume(source.id, source.volume, source.muted); sync(); this.onUpdate?.(); }, { signal: this.events.signal });
      mute.addEventListener('click', () => { source.muted = !source.muted; this.audioEngine.setSourceVolume(source.id, source.volume, source.muted); sync(); this.onUpdate?.(); }, { signal: this.events.signal });
      find('filters').addEventListener('click', () => this.onOpenAudioFilters?.(source), { signal: this.events.signal });
      this.elements.set(source.id, { bar: find('bar'), peak: find('peak') });
      wrapper.appendChild(channel);
    });
    this.container.appendChild(wrapper);
  }
  _startMeterLoop() {
    const update = () => {
      this.channels.forEach(source => {
        const elements = this.elements.get(source.id);
        if (!elements) return;
        const levels = this.audioEngine.getAudioLevels(source.id);
        const value = Math.max(0, Math.min(100, Number(levels.linear || 0) * 100));
        elements.bar.style.width = `${value}%`;
        elements.peak.style.left = `${Math.min(99, value)}%`;
      });
      this.animationId = requestAnimationFrame(update);
    };
    this.animationId = requestAnimationFrame(update);
  }
  destroy() { cancelAnimationFrame(this.animationId); this.events.abort(); this.channels = []; this.elements.clear(); }
}
