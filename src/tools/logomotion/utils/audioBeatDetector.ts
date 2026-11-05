/**
 * Web Audio API Beat & Transient Detector
 * Reverse engineered from Logomotion's chunk 81927 + custom synthetic audio generator.
 */

export interface BeatAnalysis {
  beats: number[]; // timestamps in seconds
  bpm: number;
  duration: number;
}

/**
 * Procedurally generates an energetic beat track buffer using Web Audio API
 * so the tool works standalone with 0 external dependencies!
 */
export async function generateSyntheticTrack(
  ctx: AudioContext,
  bpm: number,
  durationSec = 10,
  style: "trap" | "cyber" | "pulse" = "cyber"
): Promise<AudioBuffer> {
  const sampleRate = ctx.sampleRate;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const beatInterval = 60 / bpm;
  const sixteenth = beatInterval / 4;

  for (let t = 0; t < durationSec; t += sixteenth) {
    const sampleIdx = Math.floor(t * sampleRate);
    const stepInBar = Math.floor((t % (beatInterval * 4)) / sixteenth);

    // Kick on beats 0, 4, 8, 12 (four-on-the-floor) or trap pattern
    const isKick = stepInBar === 0 || stepInBar === 8 || (style === "trap" && (stepInBar === 6 || stepInBar === 14));
    if (isKick) {
      const kickLen = Math.floor(0.18 * sampleRate);
      for (let i = 0; i < kickLen && sampleIdx + i < totalSamples; i++) {
        const env = Math.exp(-i / (0.04 * sampleRate));
        const freq = 140 * Math.exp(-i / (0.03 * sampleRate)) + 45;
        const val = Math.sin((2 * Math.PI * freq * i) / sampleRate) * env * 0.85;
        left[sampleIdx + i] += val;
        right[sampleIdx + i] += val;
      }
    }

    // Snare / Clap on beats 4, 12
    const isSnare = stepInBar === 4 || stepInBar === 12;
    if (isSnare) {
      const snareLen = Math.floor(0.14 * sampleRate);
      for (let i = 0; i < snareLen && sampleIdx + i < totalSamples; i++) {
        const env = Math.exp(-i / (0.03 * sampleRate));
        const noise = (Math.random() * 2 - 1) * env * 0.55;
        const tone = Math.sin((2 * Math.PI * 220 * i) / sampleRate) * env * 0.35;
        const val = noise + tone;
        left[sampleIdx + i] += val;
        right[sampleIdx + i] += val;
      }
    }

    // Hi-hat on every off-beat or 16th
    const isHat = stepInBar % 2 === 0;
    if (isHat) {
      const hatLen = Math.floor(0.04 * sampleRate);
      for (let i = 0; i < hatLen && sampleIdx + i < totalSamples; i++) {
        const env = Math.exp(-i / (0.008 * sampleRate));
        const noise = (Math.random() * 2 - 1) * env * 0.22;
        left[sampleIdx + i] += noise;
        right[sampleIdx + i] += noise * 0.9;
      }
    }

    // Sub-bass pulse
    if (stepInBar % 4 === 0) {
      const bassLen = Math.floor(beatInterval * 0.8 * sampleRate);
      const noteFreq = style === "cyber" ? 55 : 43.65; // A1 or F0
      for (let i = 0; i < bassLen && sampleIdx + i < totalSamples; i++) {
        const env = Math.exp(-i / (0.25 * sampleRate));
        const val = Math.sin((2 * Math.PI * noteFreq * i) / sampleRate) * env * 0.45;
        left[sampleIdx + i] += val;
        right[sampleIdx + i] += val;
      }
    }
  }

  // Soft clip limiter
  for (let i = 0; i < totalSamples; i++) {
    left[i] = Math.tanh(left[i]);
    right[i] = Math.tanh(right[i]);
  }

  return buffer;
}

/**
 * Analyzes audio buffer to extract exact beat transient times
 */
export async function analyzeAudioBeats(buffer: AudioBuffer): Promise<BeatAnalysis> {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const windowSec = 0.02;
  const hopSize = Math.floor(windowSec * sampleRate);
  const energies: number[] = [];

  for (let i = 0; i < channelData.length; i += hopSize) {
    let sum = 0;
    const end = Math.min(channelData.length, i + hopSize);
    for (let j = i; j < end; j++) {
      sum += channelData[j] * channelData[j];
    }
    energies.push(Math.sqrt(sum / (end - i)));
  }

  // Find local peaks above dynamic threshold
  const beats: number[] = [];
  const localWin = 15;
  for (let i = localWin; i < energies.length - localWin; i++) {
    let localAvg = 0;
    for (let k = i - localWin; k <= i + localWin; k++) {
      localAvg += energies[k];
    }
    localAvg /= localWin * 2 + 1;

    const current = energies[i];
    if (current > localAvg * 1.45 && current > 0.05) {
      // Is local max
      let isMax = true;
      for (let k = i - 3; k <= i + 3; k++) {
        if (energies[k] > current) {
          isMax = false;
          break;
        }
      }
      if (isMax) {
        const timeSec = (i * hopSize) / sampleRate;
        if (beats.length === 0 || timeSec - beats[beats.length - 1] > 0.16) {
          beats.push(timeSec);
        }
      }
    }
  }

  // Calculate approximate BPM from intervals
  let avgInterval = 0.5;
  if (beats.length > 2) {
    const intervals: number[] = [];
    for (let i = 1; i < beats.length; i++) {
      intervals.push(beats[i] - beats[i - 1]);
    }
    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)];
    if (median > 0.2 && median < 1.0) avgInterval = median;
  }
  const bpm = Math.round(60 / avgInterval);

  return {
    beats,
    bpm: bpm >= 60 && bpm <= 200 ? bpm : 128,
    duration: buffer.duration,
  };
}
