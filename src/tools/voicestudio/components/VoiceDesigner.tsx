import { useState } from "react";
import type { VoicePreset, AudioTake } from "../types";
import { synthesizeProceduralSpeech } from "../utils/audioEngine";

interface VoiceDesignerProps {
  onAddVoice: (voice: VoicePreset) => void;
  onAddTake: (take: AudioTake) => void;
}

export function VoiceDesigner({ onAddVoice, onAddTake }: VoiceDesignerProps) {
  const [name, setName] = useState("Voz Desenhada");
  const [gender, setGender] = useState<"masculino" | "feminino" | "neutro">("masculino");
  const [age, setAge] = useState<"jovem" | "adulto" | "senior">("adulto");
  const [timbre, setTimbre] = useState<"aveludado" | "metalico" | "rouco" | "cristalino" | "ressoante">("aveludado");
  const [archetype, setArchetype] = useState("confessional");
  const [pitchSemitones, setPitchSemitones] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [breathiness, setBreathiness] = useState(25);
  const [testPhrase, setTestPhrase] = useState(
    "Estratégia precisa ser sentida. Menos ferramenta, mais sistema."
  );
  const [isSynthesizing, setIsSynthesizing] = useState(false);

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
      accent: "Modelagem Paramétrica",
      lang: "pt-BR",
      description: `Voz desenhada paramétrica: ${gender}, ${age}, timbre ${timbre}, arquétipo ${archetype}.`,
      avatarBg: "linear-gradient(135deg, #7657FF, #FF701A)",
      tags: ["Design Paramétrico", timbre, archetype],
      samplePhrase: testPhrase,
      pitchOffset: pitchSemitones,
      speed,
      similarity: 90,
      stability: 95,
      styleExaggeration: 35,
      breathiness,
    };

    onAddVoice(newVoice);
    alert(`Voz desenhada "${newVoice.name}" foi salva com sucesso!`);
  };

  return (
    <div className="vs-designer">
      <div className="vs-banner">
        <div className="vs-banner__text">
          <h3>🎛️ Design de Voz Paramétrico (Voice Modeling)</h3>
          <p>
            Modele novas personalidades vocais a partir de variáveis acústicas e psicológicas.
            Sem necessidade de amostras prévias: defina timbre, arquétipo, formantes e cadência.
          </p>
        </div>
        <div className="vs-banner__badge">Síntese Contínua</div>
      </div>

      <div className="vs-designer__grid">
        {/* Left column: Parameters */}
        <div className="vs-panel">
          <h4 className="vs-panel__title">Modelagem de Persona</h4>

          <div className="vs-form-group">
            <label className="vs-form-label">Nome da Voz Criada</label>
            <input
              type="text"
              className="vs-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="vs-form-row">
            <div className="vs-form-group">
              <label className="vs-form-label">Gênero</label>
              <select
                className="vs-select"
                value={gender}
                onChange={(e) => setGender(e.target.value as "masculino" | "feminino" | "neutro")}
              >
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="neutro">Neutro / Andrógino</option>
              </select>
            </div>

            <div className="vs-form-group">
              <label className="vs-form-label">Faixa Etária</label>
              <select
                className="vs-select"
                value={age}
                onChange={(e) => setAge(e.target.value as "jovem" | "adulto" | "senior")}
              >
                <option value="jovem">Jovem (20-30)</option>
                <option value="adulto">Adulto (30-50)</option>
                <option value="senior">Sênior (50+)</option>
              </select>
            </div>
          </div>

          <div className="vs-form-row">
            <div className="vs-form-group">
              <label className="vs-form-label">Timbre & Textura</label>
              <select
                className="vs-select"
                value={timbre}
                onChange={(e) => setTimbre(e.target.value as typeof timbre)}
              >
                <option value="aveludado">Aveludado / Macio</option>
                <option value="metalico">Metálico / Cortante</option>
                <option value="rouco">Rouco / Texturizado</option>
                <option value="cristalino">Cristalino / Nítido</option>
                <option value="ressoante">Ressoante / Encorpado</option>
              </select>
            </div>

            <div className="vs-form-group">
              <label className="vs-form-label">Arquétipo & Emoção</label>
              <select
                className="vs-select"
                value={archetype}
                onChange={(e) => setArchetype(e.target.value)}
              >
                <option value="confessional">Confessional Caramelo</option>
                <option value="epico">Narrador Épico</option>
                <option value="didatico">Didático Tecnológico</option>
                <option value="casual">Conversacional Casual</option>
                <option value="humor">Humor & Ironia</option>
              </select>
            </div>
          </div>

          <div className="vs-sliders-block">
            <div className="vs-slider-item">
              <div className="vs-slider-item__header">
                <span>Deslocamento de Pitch (Semitons)</span>
                <strong>{pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones}</strong>
              </div>
              <input
                type="range"
                min="-8"
                max="8"
                value={pitchSemitones}
                onChange={(e) => setPitchSemitones(parseInt(e.target.value, 10))}
              />
            </div>

            <div className="vs-slider-item">
              <div className="vs-slider-item__header">
                <span>Velocidade de Fala</span>
                <strong>{speed.toFixed(2)}x</strong>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.4"
                step="0.05"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
              />
            </div>

            <div className="vs-slider-item">
              <div className="vs-slider-item__header">
                <span>Respiração & Fricção Vocal</span>
                <strong>{breathiness}%</strong>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                value={breathiness}
                onChange={(e) => setBreathiness(parseInt(e.target.value, 10))}
              />
            </div>
          </div>
        </div>

        {/* Right column: Test & preview */}
        <div className="vs-panel">
          <h4 className="vs-panel__title">Audição & Validação</h4>

          <div className="vs-form-group">
            <label className="vs-form-label">Frase de Teste</label>
            <textarea
              className="vs-textarea"
              rows={4}
              value={testPhrase}
              onChange={(e) => setTestPhrase(e.target.value)}
            />
          </div>

          <div className="vs-preview-box">
            <div className="vs-archetype-card">
              <div className="vs-archetype-icon">
                {gender === "masculino" ? "👨‍🔬" : gender === "feminino" ? "👩‍🔬" : "🧑‍🔬"}
              </div>
              <div className="vs-archetype-meta">
                <h5>{name || "Voz Paramétrica"}</h5>
                <p>
                  {gender} &bull; {age} &bull; Timbre {timbre}
                </p>
                <div className="vs-tag-row">
                  <span className="vs-tag">{archetype}</span>
                  <span className="vs-tag">{speed}x</span>
                  <span className="vs-tag">{pitchSemitones} semitons</span>
                </div>
              </div>
            </div>
          </div>

          <div className="vs-panel-actions">
            <button
              type="button"
              className="vs-btn vs-btn--outline"
              disabled={isSynthesizing}
              onClick={handleTestVoice}
            >
              <span>{isSynthesizing ? "Renderizando..." : "▶ Testar Voz Agora"}</span>
            </button>

            <button
              type="button"
              className="vs-btn vs-btn--primary"
              onClick={handleSaveToLibrary}
            >
              <span>💾 Adicionar à Biblioteca de Vozes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
