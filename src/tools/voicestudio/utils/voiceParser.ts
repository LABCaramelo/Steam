/**
 * Parser léxico determinístico de descrição vocal em linguagem natural.
 * Baseado na arquitetura canônica de describe_voice.py (debpalash/voicestudio)
 * e adaptado para o ecossistema PT-BR do LAB Caramelo.
 * 
 * Opera 100% offline e sem dependência de rede ou LLM.
 */

export interface ParsedVoiceAttributes {
  gender: "masculino" | "feminino" | "neutro";
  age: "jovem" | "adulto" | "senior";
  pitchSemitones: number;
  pitchLabel: string;
  speed: number;
  breathiness: number;
  timbre: "aveludado" | "metalico" | "rouco" | "cristalino" | "ressoante";
  accent: string;
  archetype: string;
  matchedTokens: string[];
  unmatchedKeywords: string[];
}

interface Rule<T> {
  value: T;
  phrases: string[];
}

const GENDER_RULES: Rule<"masculino" | "feminino" | "neutro">[] = [
  {
    value: "feminino",
    phrases: [
      "mulher", "feminina", "feminino", "garota", "menina", "senhora",
      "mãe", "avó", "female", "woman", "girl", "lady", "actress",
    ],
  },
  {
    value: "masculino",
    phrases: [
      "homem", "masculino", "masculina", "garoto", "menino", "senhor",
      "pai", "avô", "male", "man", "boy", "guy", "dude", "actor",
    ],
  },
];

const AGE_RULES: Rule<"jovem" | "adulto" | "senior">[] = [
  {
    value: "jovem",
    phrases: [
      "criança", "infantil", "adolescente", "jovem", "menina", "menino",
      "garoto", "garota", "teen", "young", "youthful", "twenties",
    ],
  },
  {
    value: "senior",
    phrases: [
      "idoso", "idosa", "velho", "velha", "maduro", "madura", "senhor", "senhora",
      "avô", "avó", "elderly", "old", "senior", "aged", "retired",
    ],
  },
  {
    value: "adulto",
    phrases: [
      "adulto", "adulta", "meia idade", "profissional", "middle-aged",
      "mature", "midlife", "forties",
    ],
  },
];

const PITCH_RULES: Rule<{ semitones: number; label: string }>[] = [
  {
    value: { semitones: -7, label: "Muito Grave" },
    phrases: [
      "muito grave", "super grave", "ultra grave", "cavernosa", "profunda demais",
      "very deep", "very low", "booming", "extremely deep",
    ],
  },
  {
    value: { semitones: -3, label: "Grave" },
    phrases: [
      "grave", "encorpada", "baixo", "pesada", "barítono", "baixo acústico",
      "deep", "low pitch", "low tone", "bass", "baritone",
    ],
  },
  {
    value: { semitones: 6, label: "Muito Agudo" },
    phrases: [
      "muito aguda", "muito agudo", "estridente", "falsete", "fina demais",
      "very high", "squeaky", "shrill", "falsetto",
    ],
  },
  {
    value: { semitones: 3, label: "Agudo" },
    phrases: [
      "agudo", "aguda", "fina", "clara e alta", "soprano", "high pitch", "high tone",
    ],
  },
  {
    value: { semitones: 0, label: "Médio / Equilibrado" },
    phrases: [
      "médio", "média", "equilibrada", "neutra", "moderada", "natural",
      "moderate", "midrange", "medium",
    ],
  },
];

const TIMBRE_RULES: Rule<"aveludado" | "metalico" | "rouco" | "cristalino" | "ressoante">[] = [
  {
    value: "rouco",
    phrases: ["rouco", "rouca", "áspera", "arranhada", "raspy", "husky", "scratchy", "creaky"],
  },
  {
    value: "aveludado",
    phrases: ["aveludado", "aveludada", "suave", "quente", "macia", "cremosa", "warm", "velvety", "smooth"],
  },
  {
    value: "cristalino",
    phrases: ["cristalino", "cristalina", "limpa", "nítida", "brilhante", "clara", "crisp", "clear", "bright"],
  },
  {
    value: "ressoante",
    phrases: ["ressoante", "encorpada", "potente", "de peito", "radiofônica", "booming", "resonant"],
  },
  {
    value: "metalico",
    phrases: ["metálico", "metálica", "robótica", "nasal", "fria", "metallic", "nasal"],
  },
];

const ACCENT_RULES: Rule<string>[] = [
  { value: "Neutro / Padrão", phrases: ["neutro", "neutra", "sem sotaque", "padrão", "brasileiro"] },
  { value: "Mineiro (BH)", phrases: ["mineiro", "mineira", "belo horizonte", "minas", "uai"] },
  { value: "Paulista", phrases: ["paulista", "são paulo", "paulistano"] },
  { value: "Carioca", phrases: ["carioca", "rio de janeiro"] },
  { value: "Nordestino", phrases: ["nordestino", "nordestina", "nordeste"] },
  { value: "Sulista", phrases: ["sulista", "gaúcho", "sul"] },
  { value: "Americano (EN)", phrases: ["americano", "ingles", "american", "usa", "english"] },
  { value: "Britânico (UK)", phrases: ["britanico", "britânica", "british", "uk", "posh"] },
];

const ARCHETYPE_RULES: Rule<{ archetype: string; breathiness: number; speed: number }>[] = [
  {
    value: { archetype: "confessional", breathiness: 45, speed: 0.95 },
    phrases: ["confessional", "intima", "íntima", "reflexiva", "calma", "patética", "autoral", "vulnerável"],
  },
  {
    value: { archetype: "narrador-cinema", breathiness: 20, speed: 0.9 },
    phrases: ["narrador", "cinema", "cinematográfica", "trailer", "documentário", "dramático", "épico"],
  },
  {
    value: { archetype: "especialista", breathiness: 15, speed: 1.05 },
    phrases: ["didático", "especialista", "masterclass", "firme", "professor", "autoridade", "direto"],
  },
  {
    value: { archetype: "sussurrado", breathiness: 70, speed: 0.85 },
    phrases: ["sussurro", "sussurrada", "sussurrado", "whisper", "asmr", "segredo", "hushed"],
  },
  {
    value: { archetype: "comercial", breathiness: 10, speed: 1.1 },
    phrases: ["comercial", "enérgica", "vibrante", "vendas", "anúncio", "rádio fm", "upbeat"],
  },
];

/**
 * Mapeia uma frase de texto livre para atributos acústicos determinísticos.
 */
export function parseVoiceDescription(promptText: string): ParsedVoiceAttributes {
  const normalized = promptText
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove diacríticos para matching tolerante

  const matchedTokens: string[] = [];
  const words = promptText.toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z0-9à-ú]/gi, ""));

  // 1. Gender
  let gender: "masculino" | "feminino" | "neutro" = "masculino";
  for (const rule of GENDER_RULES) {
    const hit = rule.phrases.find((p) => normalized.includes(p));
    if (hit) {
      gender = rule.value;
      matchedTokens.push(`Gênero: ${gender}`);
      break;
    }
  }

  // 2. Age
  let age: "jovem" | "adulto" | "senior" = "adulto";
  for (const rule of AGE_RULES) {
    const hit = rule.phrases.find((p) => normalized.includes(p));
    if (hit) {
      age = rule.value;
      matchedTokens.push(`Faixa: ${age}`);
      break;
    }
  }

  // 3. Pitch
  let pitchSemitones = 0;
  let pitchLabel = "Médio / Equilibrado";
  for (const rule of PITCH_RULES) {
    const hit = rule.phrases.find((p) => normalized.includes(p));
    if (hit) {
      pitchSemitones = rule.value.semitones;
      pitchLabel = rule.value.label;
      matchedTokens.push(`Pitch: ${pitchLabel}`);
      break;
    }
  }

  // 4. Timbre
  let timbre: "aveludado" | "metalico" | "rouco" | "cristalino" | "ressoante" = "aveludado";
  for (const rule of TIMBRE_RULES) {
    const hit = rule.phrases.find((p) => normalized.includes(p));
    if (hit) {
      timbre = rule.value;
      matchedTokens.push(`Timbre: ${timbre}`);
      break;
    }
  }

  // 5. Accent
  let accent = "Neutro / Padrão";
  for (const rule of ACCENT_RULES) {
    const hit = rule.phrases.find((p) => normalized.includes(p));
    if (hit) {
      accent = rule.value;
      matchedTokens.push(`Sotaque: ${accent}`);
      break;
    }
  }

  // 6. Archetype, Breathiness & Speed
  let archetype = "confessional";
  let breathiness = 30;
  let speed = 1.0;
  for (const rule of ARCHETYPE_RULES) {
    const hit = rule.phrases.find((p) => normalized.includes(p));
    if (hit) {
      archetype = rule.value.archetype;
      breathiness = rule.value.breathiness;
      speed = rule.value.speed;
      matchedTokens.push(`Arquétipo: ${archetype}`);
      break;
    }
  }

  // Identify unmatched words as nuance tags
  const stopWords = new Set([
    "de", "do", "da", "em", "um", "uma", "com", "e", "o", "a", "os", "as", "para", "por", "voz", "tom",
    "estilo", "locutor", "locutora", "bem", "mais", "pouco", "muito", "que", "se", "seu", "sua",
  ]);
  const unmatchedKeywords = words
    .filter((w) => w.length > 3 && !stopWords.has(w))
    .filter((w) => !matchedTokens.some((t) => t.toLowerCase().includes(w)))
    .slice(0, 5);

  return {
    gender,
    age,
    pitchSemitones,
    pitchLabel,
    speed,
    breathiness,
    timbre,
    accent,
    archetype,
    matchedTokens,
    unmatchedKeywords,
  };
}
