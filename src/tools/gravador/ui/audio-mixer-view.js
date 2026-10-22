// Audio Mixer UI Component
import { ICONS } from '../assets/icons.js';

export class AudioMixerView {
  constructor(container, audioEngine) {
    this.container = container;
    this.audioEngine = audioEngine;
    this.channels = [];
    this.animationId = null;
    this.onOpenAudioFilters = null;

    this._startMeterLoop();
  }

  setSources(sources) {
    // Keep sources that have audio or default desktop/mic
    this.channels = sources.filter(s => s.hasAudio);
    this.render();
  }

  render() {
    this.container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'obs-mixer-container';

    if (this.channels.length === 0) {
      wrapper.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--obs-text-muted); font-size: 11px;">
          No active audio sources.<br>Add a Mic, Video, or Display Capture.
        </div>
      `;
      this.container.appendChild(wrapper);
      return;
    }

    this.channels.forEach(source => {
      const channelEl = document.createElement('div');
      channelEl.className = 'audio-channel';
      channelEl.dataset.sourceId = source.id;

      channelEl.innerHTML = `
        <div class="audio-channel-header">
          <div class="audio-channel-title">
            <span style="display: flex; width: 14px; height: 14px;">${source.type === 'mic' ? ICONS.mic : ICONS.volume}</span>
            <span>${source.name}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div class="audio-channel-db" id="db-val-${source.id}">${source.muted ? 'MUTED' : '-0.0 dB'}</div>
            <button class="obs-item-icon-btn" id="btn-audio-filters-${source.id}" title="Audio Filters (⚙)">
              ${ICONS.gear}
            </button>
          </div>
        </div>
        <div class="audio-meter-track">
          <div class="audio-meter-bar" id="meter-bar-${source.id}"></div>
          <div class="audio-meter-peaks" id="meter-peak-${source.id}"></div>
        </div>
        <div class="audio-channel-controls">
          <input type="range" class="audio-fader" min="0" max="1" step="0.01" value="${source.volume}" id="fader-${source.id}">
          <button class="audio-mute-btn ${source.muted ? 'muted' : ''}" id="mute-${source.id}" title="${source.muted ? 'Unmute' : 'Mute'}">
            ${source.muted ? ICONS.volumeMute : ICONS.volume}
          </button>
        </div>
      `;

      // Fader event
      const fader = channelEl.querySelector(`#fader-${source.id}`);
      fader.addEventListener('input', (e) => {
        const vol = parseFloat(e.target.value);
        source.volume = vol;
        this.audioEngine.setSourceVolume(source.id, vol, source.muted);
        const dbText = vol <= 0.001 ? '-inf dB' : `${(20 * Math.log10(vol)).toFixed(1)} dB`;
        channelEl.querySelector(`#db-val-${source.id}`).textContent = source.muted ? 'MUTED' : dbText;
      });

      // Mute event
      const muteBtn = channelEl.querySelector(`#mute-${source.id}`);
      muteBtn.addEventListener('click', () => {
        source.muted = !source.muted;
        this.audioEngine.setSourceVolume(source.id, source.volume, source.muted);
        muteBtn.classList.toggle('muted', source.muted);
        muteBtn.innerHTML = source.muted ? ICONS.volumeMute : ICONS.volume;
        channelEl.querySelector(`#db-val-${source.id}`).textContent = source.muted ? 'MUTED' : `${(20 * Math.log10(source.volume)).toFixed(1)} dB`;
      });

      // Filters button event
      const filtersBtn = channelEl.querySelector(`#btn-audio-filters-${source.id}`);
      filtersBtn.addEventListener('click', () => {
        if (this.onOpenAudioFilters) {
          this.onOpenAudioFilters(source);
        }
      });

      wrapper.appendChild(channelEl);
    });

    this.container.appendChild(wrapper);
  }

  _startMeterLoop() {
    const updateMeters = () => {
      this.channels.forEach(source => {
        const bar = document.getElementById(`meter-bar-${source.id}`);
        const peak = document.getElementById(`meter-peak-${source.id}`);
        if (bar && peak) {
          const levels = this.audioEngine.getAudioLevels(source.id);
          const percent = levels.linear * 100;
          bar.style.width = `${percent}%`;
          peak.style.left = `${Math.min(99, percent)}%`;
        }
      });
      this.animationId = requestAnimationFrame(updateMeters);
    };
    this.animationId = requestAnimationFrame(updateMeters);
  }
}
