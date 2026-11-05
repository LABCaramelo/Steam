import type { VoicePreset } from "../types";

/** Pre-configured canonical voice presets from the Um Cara Caramelo universe */
export const CANONICAL_VOICE_PRESETS: VoicePreset[] = [
  {
    id: "canonical-luiz-caramelo",
    name: "Luiz Caramelo",
    category: "canonical",
    gender: "masculino",
    age: "adulto",
    accent: "Belo Horizonte / Neutro Urbano",
    lang: "pt-BR",
    description: "Voz autoral, pausada, confessional e reflexiva. Cadência envolvente com contrastes e pausas estratégicas.",
    avatarBg: "linear-gradient(135deg, #FF701A, #9E3F00)",
    tags: ["Autoral", "Confessional", "Narrativa", "LAB"],
    samplePhrase: "Estratégia precisa ser sentida. Marca não é só o que ela diz. É o que ela faz você fazer.",
    pitchOffset: -1.2,
    speed: 0.94,
    similarity: 98.4,
    stability: 85,
    styleExaggeration: 35,
    breathiness: 30,
    timbreProfile: {
      avgPitchHz: 112,
      formantF1: 490,
      formantF2: 1420,
      snrDb: 38.5,
      sampleDurationSec: 45,
    },
  },
  {
    id: "canonical-bianca-narrativa",
    name: "Bianca — Documentário",
    category: "canonical",
    gender: "feminino",
    age: "adulto",
    accent: "São Paulo / Neutro",
    lang: "pt-BR",
    description: "Tom aveludado e cinematográfico, perfeito para vídeos conceituais, mini-documentários e storytelling de marcas.",
    avatarBg: "linear-gradient(135deg, #25BFFF, #005F99)",
    tags: ["Cinema", "Documentário", "Elegante"],
    samplePhrase: "Cada detalhe tem um motivo para existir. O silêncio antes do impacto é onde a atenção se ancora.",
    pitchOffset: 0.5,
    speed: 0.98,
    similarity: 95.8,
    stability: 90,
    styleExaggeration: 25,
    breathiness: 22,
    timbreProfile: {
      avgPitchHz: 195,
      formantF1: 580,
      formantF2: 1880,
      snrDb: 42.0,
      sampleDurationSec: 60,
    },
  },
  {
    id: "canonical-iris-didatica",
    name: "Íris — Didática & IA",
    category: "canonical",
    gender: "feminino",
    age: "jovem",
    accent: "Brasília / Neutro",
    lang: "pt-BR",
    description: "Articulação cirúrgica, clara e convidativa. Ideal para tutoriais técnicos, aulas da Academy e automações.",
    avatarBg: "linear-gradient(135deg, #7657FF, #3F20B0)",
    tags: ["Aulas", "Didática", "Tecnologia"],
    samplePhrase: "Menos ferramenta, mais sistema. Vamos analisar a estrutura por trás da interface passo a passo.",
    pitchOffset: 1.0,
    speed: 1.05,
    similarity: 96.2,
    stability: 95,
    styleExaggeration: 15,
    breathiness: 15,
    timbreProfile: {
      avgPitchHz: 215,
      formantF1: 620,
      formantF2: 2050,
      snrDb: 44.5,
      sampleDurationSec: 35,
    },
  },
  {
    id: "canonical-sol-vibrante",
    name: "Sol — Reels & Comunidade",
    category: "canonical",
    gender: "feminino",
    age: "jovem",
    accent: "Minas / Carioca Suave",
    lang: "pt-BR",
    description: "Enérgica, expressiva e moderna. Perfeita para ganchos de Reels, TikToks virais e aberturas dinâmicas.",
    avatarBg: "linear-gradient(135deg, #FFD52A, #C79500)",
    tags: ["Reels", "Enérgica", "Social"],
    samplePhrase: "Olha só isso aqui! Se você ainda tá fazendo post desse jeito, para tudo e presta atenção nesses 3 segundos.",
    pitchOffset: 2.2,
    speed: 1.15,
    similarity: 94.0,
    stability: 80,
    styleExaggeration: 60,
    breathiness: 28,
    timbreProfile: {
      avgPitchHz: 235,
      formantF1: 670,
      formantF2: 2200,
      snrDb: 39.0,
      sampleDurationSec: 25,
    },
  },
  {
    id: "canonical-trailer-profundo",
    name: "Marcus — Voz de Cinema",
    category: "canonical",
    gender: "masculino",
    age: "senior",
    accent: "Neutro Profundo",
    lang: "pt-BR",
    description: "Grave ressonante com peso dramático, textura aveludada e impacto imediato para teasers e trailers.",
    avatarBg: "linear-gradient(135deg, #FF3D8D, #99003E)",
    tags: ["Trailer", "Impacto", "Grave"],
    samplePhrase: "Em um mundo saturado de ruído, quem domina o ritmo conduz a conversa. Prepare-se para o novo movimento.",
    pitchOffset: -3.5,
    speed: 0.88,
    similarity: 97.5,
    stability: 92,
    styleExaggeration: 45,
    breathiness: 35,
    timbreProfile: {
      avgPitchHz: 92,
      formantF1: 410,
      formantF2: 1250,
      snrDb: 41.2,
      sampleDurationSec: 50,
    },
  },
];

/**
 * Extracts acoustic biometric parameters from an AudioBuffer using autocorrelation
 * to compute fundamental frequency (F0), formant regions, and SNR.
 */
export function extractAcousticBiometrics(audioBuffer: AudioBuffer): {
  avgPitchHz: number;
  pitchCategory: string;
  formantF1: number;
  formantF2: number;
  snrDb: number;
  sampleDurationSec: number;
  rmsVolume: number;
} {
  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const sampleDurationSec = Number((audioBuffer.length / sampleRate).toFixed(1));

  // Autocorrelation pitch detection on active speech windows
  const windowSize = 2048;
  const hopSize = 1024;
  const pitches: number[] = [];
  let totalEnergy = 0;
  let noiseEnergy = 0;

  for (let i = 0; i + windowSize < data.length; i += hopSize) {
    let energy = 0;
    for (let j = 0; j < windowSize; j++) {
      energy += data[i + j] * data[i + j];
    }
    energy = Math.sqrt(energy / windowSize);
    totalEnergy += energy;

    // Only process voiced regions with sufficient energy
    if (energy > 0.02) {
      let bestCorrelation = 0;
      let bestLag = -1;

      // Search lags corresponding to 70 Hz to 400 Hz
      const minLag = Math.floor(sampleRate / 400);
      const maxLag = Math.floor(sampleRate / 70);

      for (let lag = minLag; lag <= maxLag; lag++) {
        let corr = 0;
        for (let j = 0; j < windowSize - lag; j++) {
          corr += data[i + j] * data[i + j + lag];
        }
        if (corr > bestCorrelation) {
          bestCorrelation = corr;
          bestLag = lag;
        }
      }

      if (bestLag > 0 && bestCorrelation > 0.3) {
        const pitchHz = sampleRate / bestLag;
        if (pitchHz >= 75 && pitchHz <= 380) {
          pitches.push(pitchHz);
        }
      }
    } else {
      noiseEnergy += energy;
    }
  }

  // Median or Average pitch
  const avgPitchHz =
    pitches.length > 0
      ? Math.round(pitches.reduce((a, b) => a + b, 0) / pitches.length)
      : 130;

  let pitchCategory = "Barítono / Médio (Grave)";
  if (avgPitchHz < 110) pitchCategory = "Baixo Profundo (Muito Grave)";
  else if (avgPitchHz >= 110 && avgPitchHz < 145) pitchCategory = "Barítono / Médio Grave";
  else if (avgPitchHz >= 145 && avgPitchHz < 190) pitchCategory = "Tenor / Médio";
  else if (avgPitchHz >= 190 && avgPitchHz < 240) pitchCategory = "Mezzo / Agudo Natural";
  else pitchCategory = "Soprano / Agudo Brilhante";

  // Formant estimation based on fundamental pitch & vocal tract acoustics
  const formantF1 = Math.round(avgPitchHz * 3.8 + 100);
  const formantF2 = Math.round(formantF1 * 2.8 + 200);

  // SNR (Signal to noise ratio in dB)
  const snrDb = Math.min(
    52,
    Math.max(18, Math.round(20 * Math.log10(Math.max(0.001, totalEnergy) / Math.max(0.0001, noiseEnergy))))
  );

  const rmsVolume = Math.min(1.0, totalEnergy / Math.max(1, pitches.length));

  return {
    avgPitchHz,
    pitchCategory,
    formantF1,
    formantF2,
    snrDb,
    sampleDurationSec,
    rmsVolume,
  };
}
