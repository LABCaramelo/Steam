import { useState, useEffect } from "react";
import type { VoicePreset, AudioTake } from "../types";
import { synthesizeProceduralSpeech } from "../utils/audioEngine";
import { parseVoiceDescription, type ParsedVoiceAttributes } from "../utils/voiceParser";
import { Sliders, Play, Save, Wand2, Sparkles, Volume2 } from "lucide-react";

interface VoiceDesignerProps {
  onAddVoice: (voice: VoicePreset) => void;
  onAddTake: (take: AudioTake) => void;
}

const CARAMELO_PRESET_PROMPTS = [
  {
    label: "Confessional Caramelo",
    prompt: "Voz masculina adulta, aveludada, tom calmo e intimista, ritmo reflexivo, sotaque neutro mineiro.",
  },
  {
    label: "Narrador de Cinema",
    prompt: "Voz masculina idosa, muito grave, ressoante, tom épico e dramático de trailer.",
  },
  {
    label: "Especialista Didático",
    prompt: "Voz feminina adulta, cristalina, tom firme e explicativo, autoridade cirúrgica.",
  },
  {
    label: "Sussurro ASMR",
    prompt: "Voz feminina jovem, muito sussurrada e suave, respiração evidente, tom intimista.",
  },
  {
    label: "Locutor Comercial",
    prompt: "Voz masculina jovem, ágil, brilhante e enérgica, tom vibrante de anúncio.",
  },
];

export function VoiceDesigner({ onAddVoice, onAddTake }: VoiceDesignerProps) {
  const [prompt, setPrompt] = useState(
    "Voz masculina adulta, aveludada e quente, tom reflexivo e intimista, ritmo calmo."
  );
  const [name, setName] = useState("Voz Confessional Caramelo");
  const [gender, setGender] = useState<"masculino" | "feminino" | "neutro">("masculino");
  const [age, setAge] = useState<"jovem" | "adulto" | "senior">("adulto");
  const [timbre, setTimbre] = useState<"aveludado" | "metalico" | "rouco" | "cristalino" | "ressoante">("aveludado");
  const [accent, setAccent] = useState("Mineiro (BH)");
  const [archetype, setArchetype] = useState("confessional");
  const [pitchSemitones, setPitchSemitones] = useState(0);
  const [speed, setSpeed] = useState(0.95);
  const [breathiness, setBreathiness] = useState(40);
  const [parsedMeta, setParsedMeta] = useState<ParsedVoiceAttributes | null>(null);

  const [testPhrase, setTestPhrase] = useState(
    "Estratégia precisa ser sentida. Marca não é só o que ela diz. É o que ela faz você fazer."
  );
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Parse prompt automatically on change
  useEffect(() => {
    if (!prompt.trim()) return;
    const res = parseVoiceDescription(prompt);
    setParsedMeta(res);
  }, [prompt]);

  const handleApplyParsedAttributes = () => {
    if (!parsedMeta) return;
    setGender(parsedMeta.gender);
    setAge(parsedMeta.age);
    setPitchSemitones(parsedMeta.pitchSemitones);
    setTimbre(parsedMeta.timbre);
    setAccent(parsedMeta.accent);
    setArchetype(parsedMeta.archetype);
    setSpeed(parsedMeta.speed);
    setBreathiness(parsedMeta.breathiness);
  };

  const handleSelectPreset = (p: { label: string; prompt: string }) => {
    setPrompt(p.prompt);
    setName(p.label);
    const res = parseVoiceDescription(p.prompt);
    setParsedMeta(res);
    setGender(res.gender);
    setAge(res.age);
    setPitchSemitones(res.pitchSemitones);
    setTimbre(res.timbre);
    setAccent(res.accent);
    setArchetype(res.archetype);
    setSpeed(res.speed);
    setBreathiness(res.breathiness);
  };

  const handleTestVoice = async () => {
    setIsSynthesizing(true);
    try {
      const res = await synthesizeProceduralSpeech(testPhrase, {
        pitchOffsetHz: pitchSemitones * 12,
        speed,
        breathiness,
        gender,
      });

      const audio = new Audio(res.url);
      audio.onended = () => setIsSynthesizing(false);
      audio.onerror = () => setIsSynthesizing(false);
      void audio.play();

      onAddTake({
        id: `take-design-${Date.now()}`,
        title: `Design: ${name}`,
        speakerName: name,
        category: "Voice Design",
        durationSeconds: res.duration,
        blobUrl: res.url,
        createdAt: new Date().toLocaleTimeString(),
        engineUsed: "Synthesizer Paramétrico",
      });
    } catch (e) {
      console.error(e);
      setIsSynthesizing(false);
    }
  };

  const handleSaveToLibrary = () => {
    if (!name.trim()) return;

    const newVoice: VoicePreset = {
      id: `designed-${Date.now()}`,
      name: name.trim(),
      category: "designed",
      gender,
      age,
      accent,
      lang: "pt-BR",
      description: `Voz desenhada: ${gender}, ${age}, timbre ${timbre}, arquétipo ${archetype}. Prompt: "${prompt}"`,
      avatarBg: "linear-gradient(135deg, #7657FF, #FF701A)",
      tags: ["Design Paramétrico", timbre, archetype, accent],
      samplePhrase: testPhrase,
      pitchOffset: pitchSemitones,
      speed,
      similarity: 92,
      stability: 95,
      styleExaggeration: 35,
      breathiness,
    };

    onAddVoice(newVoice);
    alert(`Voz desenhada "${newVoice.name}" foi salva na sua biblioteca!`);
  };

  return (
    <div className="vs-designer">
      <div className="vs-banner">
        <div className="vs-banner__text">
          <h3>
            <Wand2 size={16} strokeWidth={1.5} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Voice Design Inteligente (describe_voice)
          </h3>
          <p>
            Modele vozes a partir de descrições em linguagem natural ou ajuste fino de formantes acústicos.
            Baseado no algoritmo determinístico do VoiceStudio — 100% offline e sem necessidade de gravação prévia.
          </p>
        </div>
        <div className="vs-banner__badge">Léxico Determinístico</div>
      </div>

      {/* NLP Prompt Section */}
      <div className="vs-panel" style={{ marginBottom: 20 }}>
        <div className="vs-panel__head">
          <h4>
            <Sparkles size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Descreva a voz que deseja criar
          </h4>
          <span className="vs-panel__hint">Tradução automática para matriz de formantes</span>
        </div>

        {/* Preset Chips */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {CARAMELO_PRESET_PROMPTS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="vs-chip vs-chip--active"
              style={{ fontSize: 11, padding: "5px 10px" }}
              onClick={() => handleSelectPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ position: "relative" }}>
          <textarea
            className="vs-textarea"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Voz masculina idosa, tom grave e rouco, narrador de documentário calmo e reflexivo..."
          />
        </div>

        {parsedMeta && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: "rgba(255, 244, 232, 0.04)", border: "1px solid rgba(255, 244, 232, 0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#FF701A" }}>
                PARÂMETROS EXTRAÍDOS (describe_voice):
              </span>
              <button
                type="button"
                className="vs-btn vs-btn--secondary"
                style={{ fontSize: 11, padding: "3px 8px" }}
                onClick={handleApplyParsedAttributes}
              >
                Aplicar aos Sliders
              </button>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {parsedMeta.matchedTokens.map((tok) => (
                <span key={tok} style={{ fontSize: 10, padding: "3px 8px", background: "rgba(255, 112, 26, 0.15)", color: "#FF701A", borderRadius: 4, fontWeight: 600 }}>
                  ✓ {tok}
                </span>
              ))}
              {parsedMeta.unmatchedKeywords.map((kw) => (
                <span key={kw} style={{ fontSize: 10, padding: "3px 8px", background: "rgba(37, 191, 255, 0.1)", color: "#25BFFF", borderRadius: 4 }}>
                  Nuance: {kw}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="vs-designer__grid">
        {/* Left column: Manual adjustment parameters */}
        <div className="vs-panel">
          <div className="vs-panel__head">
            <h4>
              <Sliders size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />
              Ajuste Fino de Formantes & Identidade
            </h4>
          </div>

          <div className="vs-form-group">
            <label className="vs-label">Nome da Persona Vocal</label>
            <input
              type="text"
              className="vs-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Narrador Épico Caramelo"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="vs-form-group">
              <label className="vs-label">Gênero Acústico</label>
              <select
                className="vs-select"
                value={gender}
                onChange={(e) => setGender(e.target.value as "masculino" | "feminino" | "neutro")}
              >
                <option value="masculino">Masculino (F0 90-140 Hz)</option>
                <option value="feminino">Feminino (F0 180-260 Hz)</option>
                <option value="neutro">Neutro / Andrógino (150 Hz)</option>
              </select>
            </div>

            <div className="vs-form-group">
              <label className="vs-label">Faixa Etária</label>
              <select
                className="vs-select"
                value={age}
                onChange={(e) => setAge(e.target.value as "jovem" | "adulto" | "senior")}
              >
                <option value="jovem">Jovem (18-28)</option>
                <option value="adulto">Adulto Maduro (30-50)</option>
                <option value="senior">Sênior / Experiente (55+)</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="vs-form-group">
              <label className="vs-label">Textura & Timbre</label>
              <select
                className="vs-select"
                value={timbre}
                onChange={(e) => setTimbre(e.target.value as "aveludado" | "metalico" | "rouco" | "cristalino" | "ressoante")}
              >
                <option value="aveludado">Aveludado & Quente</option>
                <option value="rouco">Rouco & Áspero</option>
                <option value="cristalino">Cristalino & Preciso</option>
                <option value="ressoante">Ressoante de Peito</option>
                <option value="metalico">Metálico / Incisivo</option>
              </select>
            </div>

            <div className="vs-form-group">
              <label className="vs-label">Sotaque / Cadência Regional</label>
              <select
                className="vs-select"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
              >
                <option value="Neutro / Padrão">Neutro / Padrão</option>
                <option value="Mineiro (BH)">Mineiro (Belo Horizonte)</option>
                <option value="Paulista">Paulista</option>
                <option value="Carioca">Carioca</option>
                <option value="Nordestino">Nordestino</option>
                <option value="Americano (EN)">Americano (EN)</option>
                <option value="Britânico (UK)">Britânico (UK)</option>
              </select>
            </div>
          </div>

          {/* Sliders */}
          <div className="vs-slider-group">
            <div className="vs-slider-header">
              <span>Altura Tonal (Pitch Offset)</span>
              <span className="vs-slider-val">{pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones} semitons</span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={pitchSemitones}
              onChange={(e) => setPitchSemitones(Number(e.target.value))}
              className="vs-slider"
            />
          </div>

          <div className="vs-slider-group">
            <div className="vs-slider-header">
              <span>Velocidade de Fala</span>
              <span className="vs-slider-val">{speed.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.6"
              step="0.05"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="vs-slider"
            />
          </div>

          <div className="vs-slider-group">
            <div className="vs-slider-header">
              <span>Presença de Respiração (Breathiness)</span>
              <span className="vs-slider-val">{breathiness}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={breathiness}
              onChange={(e) => setBreathiness(Number(e.target.value))}
              className="vs-slider"
            />
          </div>
        </div>

        {/* Right column: Audition & Testing */}
        <div className="vs-panel">
          <div className="vs-panel__head">
            <h4>
              <Volume2 size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />
              Audição & Teste de Bancada
            </h4>
          </div>

          <div className="vs-form-group">
            <label className="vs-label">Frase de Teste</label>
            <textarea
              className="vs-textarea"
              rows={4}
              value={testPhrase}
              onChange={(e) => setTestPhrase(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
            <button
              type="button"
              className="vs-btn vs-btn--primary"
              style={{ flex: 1 }}
              onClick={handleTestVoice}
              disabled={isSynthesizing}
            >
              <Play size={15} />
              <span>{isSynthesizing ? "Sintetizando..." : "Ouvir Amostra"}</span>
            </button>

            <button
              type="button"
              className="vs-btn vs-btn--secondary"
              onClick={handleSaveToLibrary}
              disabled={!name.trim()}
            >
              <Save size={15} />
              <span>Salvar na Biblioteca</span>
            </button>
          </div>

          {/* Persona Card Preview */}
          <div style={{ marginTop: 24, padding: 16, borderRadius: 10, background: "#101014", border: "1px solid rgba(255, 244, 232, 0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg, #7657FF, #FF701A)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#FFF4E8" }}>
                {name.charAt(0)}
              </div>
              <div>
                <h5 style={{ margin: 0, fontSize: 14, color: "#FFF4E8" }}>{name}</h5>
                <span style={{ fontSize: 11, color: "rgba(255, 244, 232, 0.5)" }}>
                  {gender} • {age} • {accent}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className="vs-tag">Timbre {timbre}</span>
              <span className="vs-tag">Pitch {pitchSemitones} st</span>
              <span className="vs-tag">Velocidade {speed}x</span>
              <span className="vs-tag">Respiração {breathiness}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
