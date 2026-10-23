// Web Audio API DSP Engine with Complete OBS Audio Filters
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.audioDestination = null;
    this.channels = new Map(); // sourceId -> ChannelDSP
    this.isInitialized = false;
    this.monitoringEnabled = false;
    this.activeSourceIds = null;
    this.gateTimer = null;
  }

  init() {
    if (this.isInitialized) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.audioDestination = this.ctx.createMediaStreamDestination();

    this.masterGain.connect(this.audioDestination);
    this.isInitialized = true;
    // DSP gates keep working even if the mixer is hidden or showing another scene.
    this.gateTimer = setInterval(() => {
      for (const sourceId of this.channels.keys()) this.getAudioLevels(sourceId);
    }, 40);
  }

  ensureContext() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
  }

  // Attach audio stream and build DSP filter chain
  attachSourceAudio(source, mediaStream, mediaElement = null) {
    this.ensureContext();
    if (!this.ctx) return;

    try {
      this.removeSourceAudio(source.id);
      const sourceNode = mediaElement
        ? this.ctx.createMediaElementSource(mediaElement)
        : this.ctx.createMediaStreamSource(mediaStream);

      // 1. Noise Suppression Filter (High-pass Rumble Cut)
      const noiseSuppressionNode = this.ctx.createBiquadFilter();
      noiseSuppressionNode.type = 'highpass';
      noiseSuppressionNode.frequency.value = 80; // 80Hz rumble cut
      noiseSuppressionNode.Q.value = 0.7;

      // 2. 3-Band Equalizer (Low, Mid, High)
      const eqLowNode = this.ctx.createBiquadFilter();
      eqLowNode.type = 'lowshelf';
      eqLowNode.frequency.value = 120;
      eqLowNode.gain.value = 0;

      const eqMidNode = this.ctx.createBiquadFilter();
      eqMidNode.type = 'peaking';
      eqMidNode.frequency.value = 1000;
      eqMidNode.Q.value = 1.0;
      eqMidNode.gain.value = 0;

      const eqHighNode = this.ctx.createBiquadFilter();
      eqHighNode.type = 'highshelf';
      eqHighNode.frequency.value = 7500;
      eqHighNode.gain.value = 0;

      // 3. Gain Filter
      const gainFilterNode = this.ctx.createGain();
      gainFilterNode.gain.value = 1.0;

      // 4. Noise Gate
      const noiseGateNode = this.ctx.createGain();
      noiseGateNode.gain.value = 1.0;

      // 5. Compressor
      const compressorNode = this.ctx.createDynamicsCompressor();
      compressorNode.threshold.value = -18;
      compressorNode.knee.value = 12;
      compressorNode.ratio.value = 4;
      compressorNode.attack.value = 0.006;
      compressorNode.release.value = 0.06;

      const makeupGainNode = this.ctx.createGain();
      makeupGainNode.gain.value = 1.0;

      // 6. Limiter
      const limiterNode = this.ctx.createDynamicsCompressor();
      limiterNode.threshold.value = -6;
      limiterNode.knee.value = 0;
      limiterNode.ratio.value = 20;
      limiterNode.attack.value = 0.001;
      limiterNode.release.value = 0.06;

      // 7. Sync Offset / Delay
      const delayNode = this.ctx.createDelay(2.0); // max 2s delay
      delayNode.delayTime.value = 0.0;

      // 8. Mixer Fader & Mute Gain
      const faderGainNode = this.ctx.createGain();
      const active = !this.activeSourceIds || this.activeSourceIds.has(source.id);
      faderGainNode.gain.value = source.muted || !active ? 0 : (source.volume ?? 1.0);

      // 9. Peak/RMS Analyser
      const analyserNode = this.ctx.createAnalyser();
      analyserNode.fftSize = 512;
      analyserNode.smoothingTimeConstant = 0.6;
      const gateAnalyserNode = this.ctx.createAnalyser();
      gateAnalyserNode.fftSize = 512;

      // Connect Complete DSP Graph in Series
      sourceNode.connect(noiseSuppressionNode);
      noiseSuppressionNode.connect(eqLowNode);
      eqLowNode.connect(eqMidNode);
      eqMidNode.connect(eqHighNode);
      eqHighNode.connect(gainFilterNode);
      gainFilterNode.connect(gateAnalyserNode);
      gateAnalyserNode.connect(noiseGateNode);
      noiseGateNode.connect(compressorNode);
      compressorNode.connect(makeupGainNode);
      makeupGainNode.connect(limiterNode);
      limiterNode.connect(delayNode);
      delayNode.connect(faderGainNode);
      faderGainNode.connect(analyserNode);
      analyserNode.connect(this.masterGain);

      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);

      const channel = {
        source,
        sourceNode,
        noiseSuppressionNode,
        eqLowNode,
        eqMidNode,
        eqHighNode,
        gainFilterNode,
        noiseGateNode,
        compressorNode,
        makeupGainNode,
        limiterNode,
        delayNode,
        faderGainNode,
        analyserNode,
        gateAnalyserNode,
        dataArray,
        gateIsOpen: true
      };

      this.channels.set(source.id, channel);
      source.hasAudio = true;

      // Apply initial filters & volume
      this.applyAudioFilters(source.id, source.audioFilters);
      this.setSourceVolume(source.id, source.volume, source.muted);
      return true;
    } catch (e) {
      this.onError?.(new Error('Não foi possível conectar o áudio da fonte.'));
      return false;
    }
  }

  // Apply or update audio filters dynamically
  applyAudioFilters(sourceId, filters = []) {
    const ch = this.channels.get(sourceId);
    if (!ch || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Removed filters must bypass their DSP node instead of retaining the last value.
    const configured = new Map(filters.map(filter => [filter.type, filter]));
    ['gain', 'noiseSuppression', 'eq', 'compressor', 'limiter', 'delay'].forEach(type => {
      const f = configured.get(type) || { type, enabled: false };
      switch (f.type) {
        case 'gain': {
          // Linear gain = 10^(dB / 20)
          const targetGain = f.enabled ? Math.pow(10, (f.gainDb || 0) / 20) : 1.0;
          ch.gainFilterNode.gain.setTargetAtTime(targetGain, now, 0.01);
          break;
        }

        case 'noiseSuppression': {
          if (f.enabled) {
            ch.noiseSuppressionNode.frequency.setTargetAtTime(100, now, 0.01);
            ch.noiseSuppressionNode.Q.setTargetAtTime(1.0, now, 0.01);
          } else {
            ch.noiseSuppressionNode.frequency.setTargetAtTime(10, now, 0.01); // bypass
          }
          break;
        }

        case 'eq': {
          const lowGain = f.enabled ? (f.low || 0) : 0;
          const midGain = f.enabled ? (f.mid || 0) : 0;
          const highGain = f.enabled ? (f.high || 0) : 0;
          ch.eqLowNode.gain.setTargetAtTime(lowGain, now, 0.01);
          ch.eqMidNode.gain.setTargetAtTime(midGain, now, 0.01);
          ch.eqHighNode.gain.setTargetAtTime(highGain, now, 0.01);
          break;
        }

        case 'compressor': {
          if (f.enabled) {
            ch.compressorNode.threshold.setTargetAtTime(f.threshold ?? -18, now, 0.01);
            ch.compressorNode.ratio.setTargetAtTime(f.ratio ?? 4, now, 0.01);
            ch.compressorNode.attack.setTargetAtTime((f.attack ?? 6) / 1000, now, 0.01);
            ch.compressorNode.release.setTargetAtTime((f.release ?? 60) / 1000, now, 0.01);
            const makeup = Math.pow(10, (f.outputGain || 0) / 20);
            ch.makeupGainNode.gain.setTargetAtTime(makeup, now, 0.01);
          } else {
            ch.compressorNode.threshold.setTargetAtTime(0, now, 0.01);
            ch.compressorNode.ratio.setTargetAtTime(1, now, 0.01);
            ch.makeupGainNode.gain.setTargetAtTime(1.0, now, 0.01);
          }
          break;
        }

        case 'limiter': {
          if (f.enabled) {
            ch.limiterNode.threshold.setTargetAtTime(f.threshold ?? -6, now, 0.01);
            ch.limiterNode.release.setTargetAtTime((f.release ?? 60) / 1000, now, 0.01);
            ch.limiterNode.ratio.setTargetAtTime(20, now, 0.01);
          } else {
            ch.limiterNode.threshold.setTargetAtTime(0, now, 0.01);
            ch.limiterNode.ratio.setTargetAtTime(1, now, 0.01);
          }
          break;
        }

        case 'delay': {
          const delaySec = f.enabled ? Math.max(0, Math.min(2, (f.delayMs || 0) / 1000)) : 0;
          ch.delayNode.delayTime.setTargetAtTime(delaySec, now, 0.02);
          break;
        }
      }
    });
  }

  removeSourceAudio(sourceId) {
    const channel = this.channels.get(sourceId);
    if (channel) {
      try {
        channel.sourceNode.disconnect();
        channel.noiseSuppressionNode.disconnect();
        channel.eqLowNode.disconnect();
        channel.eqMidNode.disconnect();
        channel.eqHighNode.disconnect();
        channel.gainFilterNode.disconnect();
        channel.noiseGateNode.disconnect();
        channel.compressorNode.disconnect();
        channel.makeupGainNode.disconnect();
        channel.limiterNode.disconnect();
        channel.delayNode.disconnect();
        channel.faderGainNode.disconnect();
        channel.analyserNode.disconnect();
        channel.gateAnalyserNode.disconnect();
      } catch (e) {}
      this.channels.delete(sourceId);
      channel.source.hasAudio = false;
    }
  }

  setSourceVolume(sourceId, volume, muted = false) {
    const channel = this.channels.get(sourceId);
    if (channel && channel.faderGainNode && this.ctx) {
      const active = !this.activeSourceIds || this.activeSourceIds.has(sourceId);
      const targetGain = muted || !active ? 0 : Math.max(0, Number(volume) || 0);
      channel.faderGainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.02);
    }
  }

  // Read decibels for LED meter & compute Noise Gate
  getAudioLevels(sourceId) {
    const channel = this.channels.get(sourceId);
    if (!channel) {
      return { rmsDb: -60, peakDb: -60, linear: 0 };
    }

    const { analyserNode, dataArray, source, noiseGateNode } = channel;
    if (source.muted) {
      return { rmsDb: -60, peakDb: -60, linear: 0 };
    }

    analyserNode.getFloatTimeDomainData(dataArray);

    let sum = 0;
    let peak = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const val = Math.abs(dataArray[i]);
      if (val > peak) peak = val;
      sum += val * val;
    }

    const rms = Math.sqrt(sum / dataArray.length);
    const rmsDb = rms > 0.0001 ? Math.max(-60, 20 * Math.log10(rms)) : -60;
    const peakDb = peak > 0.0001 ? Math.max(-60, 20 * Math.log10(peak)) : -60;

    // Real-Time Noise Gate Logic
    const gateFilter = (source.audioFilters || []).find(f => f.type === 'noiseGate');
    if (gateFilter && gateFilter.enabled && this.ctx) {
      const closeThresh = gateFilter.closeThreshold ?? -38;
      const openThresh = gateFilter.openThreshold ?? -32;

      const gateData = new Float32Array(channel.dataArray.length);
      channel.gateAnalyserNode.getFloatTimeDomainData(gateData);
      let inputPeak = 0;
      for (const sample of gateData) inputPeak = Math.max(inputPeak, Math.abs(sample));
      const inputDb = inputPeak > 0.0001 ? 20 * Math.log10(inputPeak) : -60;
      if (channel.gateIsOpen && inputDb < closeThresh) {
        // Close gate smoothly (100ms)
        channel.gateIsOpen = false;
        noiseGateNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      } else if (!channel.gateIsOpen && inputDb > openThresh) {
        // Open gate fast (10ms)
        channel.gateIsOpen = true;
        noiseGateNode.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.01);
      }
    } else if (noiseGateNode && this.ctx && !channel.gateIsOpen) {
      channel.gateIsOpen = true;
      noiseGateNode.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.01);
    }

    // Linear 0..1 representation for progress meter
    const linear = Math.max(0, Math.min(1, (peakDb + 60) / 60));

    return { rmsDb, peakDb, linear, gateOpen: channel.gateIsOpen };
  }

  getMixedAudioStream() {
    this.ensureContext();
    return this.audioDestination ? this.audioDestination.stream : null;
  }

  attachMediaElement(source, element) {
    // createMediaElementSource routes local-file sound into the mixer without speaker feedback.
    element.muted = true;
    const attached = this.attachSourceAudio(source, null, element) === true;
    element.muted = !attached;
    return attached;
  }

  syncActiveSources(sources = []) {
    this.activeSourceIds = new Set(sources.map(source => source.id));
    for (const [id, channel] of this.channels) this.setSourceVolume(id, channel.source.volume, channel.source.muted);
  }

  setMonitoring(enabled = false) {
    this.ensureContext();
    if (!this.ctx || enabled === this.monitoringEnabled) return;
    if (enabled) this.masterGain.connect(this.ctx.destination);
    else { try { this.masterGain.disconnect(this.ctx.destination); } catch {} }
    this.monitoringEnabled = enabled;
  }

  destroy() {
    clearInterval(this.gateTimer);
    for (const id of [...this.channels.keys()]) this.removeSourceAudio(id);
    this.audioDestination?.stream.getTracks().forEach(track => track.stop());
    try { this.masterGain?.disconnect(); } catch {}
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.masterGain = null;
    this.audioDestination = null;
    this.isInitialized = false;
    this.activeSourceIds = null;
    this.monitoringEnabled = false;
  }
}
