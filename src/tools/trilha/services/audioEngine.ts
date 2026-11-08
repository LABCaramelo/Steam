import { GenerationParams } from "../types";

// Scale notes frequency mapping (A4 = 440Hz)
const NOTE_FREQS: Record<string, number> = {
  "C": 261.63, "C#": 277.18, "Db": 277.18, "D": 293.66, "D#": 311.13, "Eb": 311.13,
  "E": 329.63, "F": 349.23, "F#": 369.99, "Gb": 369.99, "G": 392.00, "G#": 415.30,
  "Ab": 415.30, "A": 440.00, "A#": 466.16, "Bb": 466.16, "B": 493.88
};

function getRootFreq(keyScale: string): number {
  const parts = keyScale.trim().split(" ");
  const root = parts[0] || "C";
  return NOTE_FREQS[root] || 261.63;
}

function isMinorScale(keyScale: string): boolean {
  return keyScale.toLowerCase().includes("minor") || keyScale.toLowerCase().includes("menor");
}

/**
 * Encodes Float32 stereo or mono audio channels to a standard 16-bit PCM WAV Blob
 */
export function encodeWAV(buffers: Float32Array[], sampleRate = 44100): Blob {
  const numChannels = buffers.length;
  const numSamples = buffers[0].length;
  const blockAlign = numChannels * 2;
  const byteRate = sampleRate * blockAlign;
  const dataByteCount = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataByteCount);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataByteCount, true);
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataByteCount, true);

  // Write interleaved PCM samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = buffers[channel][i];
      // Clamp between -1.0 and 1.0
      sample = Math.max(-1, Math.min(1, sample));
      // Convert to 16-bit signed int
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export interface SynthesizedTrackData {
  fullAudioBlob: Blob;
  fullAudioUrl: string;
  duration: number;
  stems: {
    drumsUrl: string;
    bassUrl: string;
    otherUrl: string;
    vocalsUrl?: string;
  };
}

/**
 * Procedural offline Web Audio music synthesis engine
 * Generates an arrangement with drums, bass, harmony, and lead tailored to BPM and Key.
 */
export async function synthesizeProceduralTrack(
  params: GenerationParams,
  onProgress?: (percent: number, message: string) => void
): Promise<SynthesizedTrackData> {
  const sampleRate = 44100;
  // Limit synthetic duration between 20s and 60s for immediate generation
  const synthDuration = Math.min(Math.max(params.duration || 30, 15), 60);
  const totalSamples = Math.floor(sampleRate * synthDuration);

  onProgress?.(15, "Calculando harmonia e fórmula rítmica...");

  const baseFreq = getRootFreq(params.keyScale);
  const isMinor = isMinorScale(params.keyScale);
  const bpm = params.bpm || 110;
  const beatSec = 60 / bpm;
  const beatSamples = Math.floor(sampleRate * beatSec);

  // Stems buffers
  const drumsL = new Float32Array(totalSamples);
  const drumsR = new Float32Array(totalSamples);
  const bassL = new Float32Array(totalSamples);
  const bassR = new Float32Array(totalSamples);
  const otherL = new Float32Array(totalSamples);
  const otherR = new Float32Array(totalSamples);
  const vocalL = new Float32Array(totalSamples);
  const vocalR = new Float32Array(totalSamples);

  // Master mix
  const masterL = new Float32Array(totalSamples);
  const masterR = new Float32Array(totalSamples);

  // Chord progression intervals (I - VI - IV - V in semitones)
  const chordRoots = isMinor
    ? [0, -3, -5, -2] // i - VI - iv - v
    : [0, -4, -7, -5]; // I - vi - IV - V

  const numBeats = Math.floor(totalSamples / beatSamples);

  onProgress?.(35, "Sintetizando grooves de bateria e transientes...");

  // 1. DRUMS SYNTHESIS (Kick on 1 & 3, Snare on 2 & 4, Hi-Hats on 8ths)
  for (let b = 0; b < numBeats; b++) {
    const beatStart = b * beatSamples;
    const beatInBar = b % 4;

    // Kick on beat 0 and 2
    if (beatInBar === 0 || beatInBar === 2) {
      const kickLen = Math.min(Math.floor(sampleRate * 0.35), totalSamples - beatStart);
      for (let i = 0; i < kickLen; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 14);
        const freq = 130 * Math.exp(-t * 28) + 45;
        const val = Math.sin(2 * Math.PI * freq * t) * env * 0.8;
        drumsL[beatStart + i] += val;
        drumsR[beatStart + i] += val;
      }
    }

    // Snare on beat 1 and 3
    if (beatInBar === 1 || beatInBar === 3) {
      const snareLen = Math.min(Math.floor(sampleRate * 0.28), totalSamples - beatStart);
      for (let i = 0; i < snareLen; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 18);
        const noise = (Math.random() * 2 - 1) * 0.45;
        const tone = Math.sin(2 * Math.PI * 185 * t) * 0.35;
        const val = (noise + tone) * env;
        drumsL[beatStart + i] += val * 0.7;
        drumsR[beatStart + i] += val * 0.7;
      }
    }

    // Hi-Hats (every 8th note)
    const eighthSamples = Math.floor(beatSamples / 2);
    for (let sub = 0; sub < 2; sub++) {
      const hatStart = beatStart + sub * eighthSamples;
      if (hatStart >= totalSamples) break;
      const hatLen = Math.min(Math.floor(sampleRate * 0.05), totalSamples - hatStart);
      for (let i = 0; i < hatLen; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 50);
        const noise = (Math.random() * 2 - 1) * 0.22;
        drumsL[hatStart + i] += noise * env * 0.5;
        drumsR[hatStart + i] += noise * env * 0.6;
      }
    }
  }

  onProgress?.(60, "Modelando sub-baixo e texturas harmônicas...");

  // 2. BASS & HARMONY SYNTHESIS
  for (let b = 0; b < numBeats; b++) {
    const chordIdx = Math.floor(b / 4) % chordRoots.length;
    const semitone = chordRoots[chordIdx];
    const chordFreq = baseFreq * Math.pow(2, semitone / 12);
    const bassFreq = (chordFreq / 2);

    const beatStart = b * beatSamples;
    const noteLen = Math.min(beatSamples, totalSamples - beatStart);

    // Bass line
    for (let i = 0; i < noteLen; i++) {
      const t = i / sampleRate;
      const env = Math.min(1, (noteLen - i) / (sampleRate * 0.05)) * 0.65;
      const bassVal = (Math.sin(2 * Math.PI * bassFreq * t) + 0.35 * Math.sin(2 * Math.PI * bassFreq * 2 * t)) * env;
      bassL[beatStart + i] += bassVal * 0.75;
      bassR[beatStart + i] += bassVal * 0.75;
    }

    // Harmony chords (Pads / Rhodes simulation)
    const thirdInterval = isMinor ? 3 : 4;
    const fifthInterval = 7;
    const f1 = chordFreq;
    const f2 = chordFreq * Math.pow(2, thirdInterval / 12);
    const f3 = chordFreq * Math.pow(2, fifthInterval / 12);

    for (let i = 0; i < noteLen; i++) {
      const t = (beatStart + i) / sampleRate;
      const lfo = 0.85 + 0.15 * Math.sin(2 * Math.PI * 1.5 * t);
      const pad1 = Math.sin(2 * Math.PI * f1 * t) * 0.25;
      const pad2 = Math.sin(2 * Math.PI * f2 * t) * 0.22;
      const pad3 = Math.sin(2 * Math.PI * f3 * t) * 0.20;
      const val = (pad1 + pad2 + pad3) * lfo * 0.55;

      otherL[beatStart + i] += val * 0.8;
      otherR[beatStart + i] += val * 0.9;
    }
  }

  // 3. VOCAL / LEAD MELODY (if not instrumental)
  if (!params.instrumental) {
    onProgress?.(78, "Sintetizando formantes e fraseado lírico...");
    for (let b = 0; b < numBeats; b += 2) {
      const beatStart = b * beatSamples;
      const phraseLen = Math.min(beatSamples * 2, totalSamples - beatStart);
      const chordIdx = Math.floor(b / 4) % chordRoots.length;
      const leadFreq = baseFreq * Math.pow(2, (chordRoots[chordIdx] + 12) / 12);

      for (let i = 0; i < phraseLen; i++) {
        const t = i / sampleRate;
        const env = Math.sin((i / phraseLen) * Math.PI) * 0.4;
        const vibrato = 1 + 0.015 * Math.sin(2 * Math.PI * 5 * t);
        // Soft vocal formant simulation
        const lead = (Math.sin(2 * Math.PI * leadFreq * vibrato * t) +
          0.4 * Math.sin(2 * Math.PI * leadFreq * 2 * vibrato * t) +
          0.2 * Math.sin(2 * Math.PI * leadFreq * 3 * vibrato * t)) * env;

        vocalL[beatStart + i] += lead * 0.55;
        vocalR[beatStart + i] += lead * 0.55;
      }
    }
  }

  onProgress?.(90, "Masterizando áudio estéreo em 44.1kHz...");

  // Combine into Master Mix with soft limiter
  for (let i = 0; i < totalSamples; i++) {
    const rawL = drumsL[i] + bassL[i] + otherL[i] + vocalL[i];
    const rawR = drumsR[i] + bassR[i] + otherR[i] + vocalR[i];

    // Soft saturation tanh
    masterL[i] = Math.tanh(rawL * 0.85);
    masterR[i] = Math.tanh(rawR * 0.85);
  }

  // Encode WAVs
  const masterBlob = encodeWAV([masterL, masterR], sampleRate);
  const drumsBlob = encodeWAV([drumsL, drumsR], sampleRate);
  const bassBlob = encodeWAV([bassL, bassR], sampleRate);
  const otherBlob = encodeWAV([otherL, otherR], sampleRate);
  const vocalBlob = params.instrumental ? undefined : encodeWAV([vocalL, vocalR], sampleRate);

  onProgress?.(100, "Trilha finalizada com sucesso!");

  return {
    fullAudioBlob: masterBlob,
    fullAudioUrl: URL.createObjectURL(masterBlob),
    duration: synthDuration,
    stems: {
      drumsUrl: URL.createObjectURL(drumsBlob),
      bassUrl: URL.createObjectURL(bassBlob),
      otherUrl: URL.createObjectURL(otherBlob),
      vocalsUrl: vocalBlob ? URL.createObjectURL(vocalBlob) : undefined,
    },
  };
}
