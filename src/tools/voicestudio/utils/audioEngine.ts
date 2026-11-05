import type { FXRackConfig } from "../types";

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

/** Converts an AudioBuffer into a WAV Blob (16-bit PCM RIFF) */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const numSamples = buffer.length * numChannels;
  const blockAlign = numChannels * (bitDepth / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * (bitDepth / 8);
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF Chunk Descriptor
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");

  // "fmt " sub-chunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // subchunk1size (16 for PCM)
  view.setUint16(20, format, true); // audioFormat
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // "data" sub-chunk
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Interleave and write 16-bit PCM samples
  let offset = 44;
  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channelData[c][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

/** Synthesize a procedural voice phrase with phonetic formants & natural vocal harmonics */
export async function synthesizeProceduralSpeech(
  text: string,
  options: {
    pitchOffsetHz?: number;
    speed?: number;
    breathiness?: number;
    gender?: "masculino" | "feminino" | "neutro";
  } = {}
): Promise<{ blob: Blob; url: string; duration: number }> {
  const basePitch = options.gender === "feminino" ? 210 : options.gender === "neutro" ? 165 : 120;
  const pitch = Math.max(65, Math.min(380, basePitch + (options.pitchOffsetHz || 0)));
  const speed = Math.max(0.6, Math.min(2.0, options.speed || 1.0));
  
  // Calculate duration based on words & syllables
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordsCount = Math.max(1, words.length);
  const estimatedSeconds = Math.max(1.2, (wordsCount / (145 * speed)) * 60);

  const sampleRate = 44100;
  const totalSamples = Math.floor(sampleRate * estimatedSeconds);

  // Offline rendering for zero latency & pure output
  const offlineCtx = new OfflineAudioContext(1, totalSamples, sampleRate);

  // Glottal pulse oscillator (sawtooth with soft saturation for vocal cords)
  const osc = offlineCtx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(pitch, 0);

  // Slight natural pitch modulation / vibrato (vocal micro-drift)
  const lfo = offlineCtx.createOscillator();
  lfo.frequency.setValueAtTime(4.8, 0); // 4.8 Hz human vocal tremor
  const lfoGain = offlineCtx.createGain();
  lfoGain.gain.setValueAtTime(pitch * 0.02, 0);
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  lfo.start(0);

  // Intonation envelope (cadence drops slightly at end of sentences)
  const pitchEnv = osc.frequency;
  pitchEnv.setValueAtTime(pitch * 1.03, 0);
  pitchEnv.exponentialRampToValueAtTime(pitch * 1.08, estimatedSeconds * 0.3);
  pitchEnv.exponentialRampToValueAtTime(pitch * 0.94, estimatedSeconds * 0.95);

  // Formant Filter 1 (Pharyngeal cavity - fullness)
  const f1 = offlineCtx.createBiquadFilter();
  f1.type = "peaking";
  f1.frequency.setValueAtTime(options.gender === "feminino" ? 650 : 500, 0);
  f1.Q.setValueAtTime(4.5, 0);
  f1.gain.setValueAtTime(14, 0);

  // Formant Filter 2 (Oral cavity - vowel definition)
  const f2 = offlineCtx.createBiquadFilter();
  f2.type = "peaking";
  f2.frequency.setValueAtTime(options.gender === "feminino" ? 1950 : 1500, 0);
  f2.Q.setValueAtTime(5.0, 0);
  f2.gain.setValueAtTime(11, 0);

  // Formant Filter 3 (Nasal / head resonance - clarity)
  const f3 = offlineCtx.createBiquadFilter();
  f3.type = "peaking";
  f3.frequency.setValueAtTime(2850, 0);
  f3.Q.setValueAtTime(3.8, 0);
  f3.gain.setValueAtTime(7, 0);

  // Gentle low-pass to cut harsh digital highs
  const lowPass = offlineCtx.createBiquadFilter();
  lowPass.type = "lowpass";
  lowPass.frequency.setValueAtTime(5200, 0);

  // Amplitude Envelope: mimics words and natural pauses
  const amp = offlineCtx.createGain();
  amp.gain.setValueAtTime(0.001, 0);

  // Fade in
  amp.gain.exponentialRampToValueAtTime(0.65, 0.06);

  // Word syllabic rhythm ripples
  const stepTime = estimatedSeconds / (wordsCount * 2.2);
  for (let t = 0.1; t < estimatedSeconds - 0.25; t += stepTime) {
    amp.gain.setValueAtTime(0.65, t);
    amp.gain.exponentialRampToValueAtTime(0.2, t + stepTime * 0.45);
    amp.gain.exponentialRampToValueAtTime(0.6, t + stepTime * 0.9);
  }

  // Fade out smoothly
  amp.gain.setValueAtTime(0.5, estimatedSeconds - 0.15);
  amp.gain.exponentialRampToValueAtTime(0.001, estimatedSeconds);

  // Breathiness / Air noise generator
  const noiseBuffer = offlineCtx.createBuffer(1, totalSamples, sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < totalSamples; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * 0.08;
  }
  const noiseSource = offlineCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  const noiseFilter = offlineCtx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(3200, 0);
  noiseFilter.Q.setValueAtTime(1.5, 0);
  const noiseGain = offlineCtx.createGain();
  noiseGain.gain.setValueAtTime((options.breathiness ?? 25) / 100 * 0.15, 0);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(amp);
  noiseSource.start(0);

  // Routing
  osc.connect(f1);
  f1.connect(f2);
  f2.connect(f3);
  f3.connect(lowPass);
  lowPass.connect(amp);
  amp.connect(offlineCtx.destination);

  osc.start(0);
  osc.stop(estimatedSeconds);

  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWavBlob(renderedBuffer);
  const url = URL.createObjectURL(wavBlob);

  return {
    blob: wavBlob,
    url,
    duration: estimatedSeconds,
  };
}

/** Applies master FX Rack (EQ, Compression, Reverb, LUFS gain) to an AudioBuffer */
export async function applyFXRackToBuffer(
  sourceBuffer: AudioBuffer,
  fx: FXRackConfig
): Promise<AudioBuffer> {
  const offlineCtx = new OfflineAudioContext(
    sourceBuffer.numberOfChannels,
    sourceBuffer.length,
    sourceBuffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = sourceBuffer;

  // EQ 1: Warmth (Low shelf at 150 Hz)
  const eqLow = offlineCtx.createBiquadFilter();
  eqLow.type = "lowshelf";
  eqLow.frequency.setValueAtTime(150, 0);
  eqLow.gain.setValueAtTime(fx.eqWarmth, 0);

  // EQ 2: Presence (Peaking at 2500 Hz)
  const eqMid = offlineCtx.createBiquadFilter();
  eqMid.type = "peaking";
  eqMid.frequency.setValueAtTime(2500, 0);
  eqMid.Q.setValueAtTime(1.2, 0);
  eqMid.gain.setValueAtTime(fx.eqPresence, 0);

  // EQ 3: Air (High shelf at 10000 Hz)
  const eqHigh = offlineCtx.createBiquadFilter();
  eqHigh.type = "highshelf";
  eqHigh.frequency.setValueAtTime(10000, 0);
  eqHigh.gain.setValueAtTime(fx.eqAir, 0);

  // De-Esser: notch filter at 6800 Hz when enabled
  const deEsser = offlineCtx.createBiquadFilter();
  deEsser.type = "peaking";
  deEsser.frequency.setValueAtTime(6800, 0);
  deEsser.Q.setValueAtTime(3.0, 0);
  deEsser.gain.setValueAtTime(-((fx.deEsser / 100) * 12), 0);

  // Dynamics Compressor
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(fx.compThreshold, 0);
  compressor.ratio.setValueAtTime(fx.compRatio, 0);
  compressor.attack.setValueAtTime(0.008, 0);
  compressor.release.setValueAtTime(0.18, 0);

  // Master Gain
  const masterGain = offlineCtx.createGain();
  const linearGain = Math.pow(10, fx.masterGain / 20);
  masterGain.gain.setValueAtTime(linearGain, 0);

  // Connect chain
  source.connect(eqLow);
  eqLow.connect(eqMid);
  eqMid.connect(eqHigh);
  eqHigh.connect(deEsser);
  deEsser.connect(compressor);
  compressor.connect(masterGain);
  masterGain.connect(offlineCtx.destination);

  source.start(0);
  return await offlineCtx.startRendering();
}

/** Merges multiple AudioBuffers into a single continuous AudioBuffer with silence gap */
export function mergeAudioBuffers(
  buffers: AudioBuffer[],
  gapSeconds = 0.4
): AudioBuffer {
  if (buffers.length === 0) {
    const ctx = getAudioContext();
    return ctx.createBuffer(1, 100, 44100);
  }
  if (buffers.length === 1) return buffers[0];

  const sampleRate = buffers[0].sampleRate;
  const gapSamples = Math.floor(sampleRate * gapSeconds);
  const totalLength = buffers.reduce((acc, b) => acc + b.length + gapSamples, 0) - gapSamples;

  const ctx = getAudioContext();
  const merged = ctx.createBuffer(1, Math.max(1, totalLength), sampleRate);
  const outputData = merged.getChannelData(0);

  let currentOffset = 0;
  for (let i = 0; i < buffers.length; i++) {
    const b = buffers[i];
    const channel = b.getChannelData(0);
    outputData.set(channel, currentOffset);
    currentOffset += b.length;
    if (i < buffers.length - 1) {
      currentOffset += gapSamples;
    }
  }

  return merged;
}

/** Decodes audio file or Blob into an AudioBuffer */
export async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  return await ctx.decodeAudioData(arrayBuffer);
}
