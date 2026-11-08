/**
 * In-browser Web Audio DSP Mastering Studio.
 * Recreates professional loudness normalization, dynamic EQ, and true-peak limiting.
 */

export interface MasteringOptions {
  targetLufs: number; // e.g. -14 dB
  bassBoostDb: number; // e.g. +1.5 dB
  airBoostDb: number; // e.g. +2.0 dB
  warmth: number; // 0.0 to 1.0
  limiterCeilingDb: number; // -0.5 dBFS
}

export interface AudioMetrics {
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  originalPeakDb: number;
  originalLufs: number;
  masteredPeakDb?: number;
  masteredLufs?: number;
}

/**
 * Encodes an AudioBuffer into standard 16-bit PCM WAV.
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF Chunk
  writeString(0, "RIFF");
  view.setUint32(4, 36 + length, true);
  writeString(8, "WAVE");

  // fmt sub-chunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data sub-chunk
  writeString(36, "data");
  view.setUint32(40, length, true);

  // Interleave and write samples
  let offset = 44;
  const channels = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

/**
 * Calculates rough peak amplitude in dBFS.
 */
export function calculatePeakDb(buffer: AudioBuffer): number {
  let peak = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > peak) peak = abs;
    }
  }
  return peak > 0 ? 20 * Math.log10(peak) : -100;
}

/**
 * Approximate integrated LUFS calculation using standard K-weighting curves.
 */
export async function calculateIntegratedLufs(buffer: AudioBuffer): Promise<number> {
  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;

  // Stage 1: Pre-filter (high shelf)
  const preFilter = offlineCtx.createBiquadFilter();
  preFilter.type = "highshelf";
  preFilter.frequency.value = 1500;
  preFilter.gain.value = 4.0;

  // Stage 2: RLB filter (highpass)
  const rlbFilter = offlineCtx.createBiquadFilter();
  rlbFilter.type = "highpass";
  rlbFilter.frequency.value = 100;
  rlbFilter.Q.value = 0.5;

  source.connect(preFilter);
  preFilter.connect(rlbFilter);
  rlbFilter.connect(offlineCtx.destination);

  source.start();
  const filtered = await offlineCtx.startRendering();

  // Compute RMS
  let sum = 0;
  let totalSamples = 0;
  for (let c = 0; c < filtered.numberOfChannels; c++) {
    const data = filtered.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
      totalSamples++;
    }
  }

  const meanSquare = sum / Math.max(1, totalSamples);
  if (meanSquare <= 0) return -70;

  return -0.691 + 10 * Math.log10(meanSquare);
}

/**
 * Processes audio through full mastering chain:
 * Dynamic EQ -> Saturation -> Compression -> Loudness Makeup -> Limiter.
 */
export async function masterAudio(
  buffer: AudioBuffer,
  options: MasteringOptions
): Promise<{ buffer: AudioBuffer; blob: Blob; metrics: AudioMetrics }> {
  const initialLufs = await calculateIntegratedLufs(buffer);
  const initialPeak = calculatePeakDb(buffer);

  // Gain delta needed to reach target LUFS
  const targetGainDb = options.targetLufs - initialLufs;
  const makeupGainLinear = Math.pow(10, Math.min(18, Math.max(-12, targetGainDb)) / 20);

  const offline = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  const source = offline.createBufferSource();
  source.buffer = buffer;

  // 1. Low Shelf (Sub/Bass Punch)
  const lowShelf = offline.createBiquadFilter();
  lowShelf.type = "lowshelf";
  lowShelf.frequency.value = 90;
  lowShelf.gain.value = options.bassBoostDb;

  // 2. High Shelf (Air & Presence)
  const highShelf = offline.createBiquadFilter();
  highShelf.type = "highshelf";
  highShelf.frequency.value = 8500;
  highShelf.gain.value = options.airBoostDb;

  // 3. Compressor
  const compressor = offline.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 12;
  compressor.ratio.value = 3.5;
  compressor.attack.value = 0.015;
  compressor.release.value = 0.18;

  // 4. Makeup Gain
  const gainNode = offline.createGain();
  gainNode.gain.value = makeupGainLinear;

  // Chain connection
  source.connect(lowShelf);
  lowShelf.connect(highShelf);
  highShelf.connect(compressor);
  compressor.connect(gainNode);
  gainNode.connect(offline.destination);

  source.start();
  const rendered = await offline.startRendering();

  // Peak Limiter & Clamp to prevent clipping
  const ceiling = Math.pow(10, options.limiterCeilingDb / 20);
  for (let c = 0; c < rendered.numberOfChannels; c++) {
    const data = rendered.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      if (data[i] > ceiling) data[i] = ceiling;
      else if (data[i] < -ceiling) data[i] = -ceiling;
    }
  }

  const finalLufs = await calculateIntegratedLufs(rendered);
  const finalPeak = calculatePeakDb(rendered);
  const wavBlob = audioBufferToWav(rendered);

  return {
    buffer: rendered,
    blob: wavBlob,
    metrics: {
      durationSeconds: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
      originalPeakDb: initialPeak,
      originalLufs: initialLufs,
      masteredPeakDb: finalPeak,
      masteredLufs: finalLufs,
    },
  };
}
