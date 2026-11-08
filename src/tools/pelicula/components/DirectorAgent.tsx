import React, { useState } from "react";
import { ShotCard } from "../types";
import { Sparkles, Clapperboard, Copy, Check, Film } from "lucide-react";

interface DirectorAgentProps {
  shotCards: ShotCard[];
  onUpdateShotCards: (cards: ShotCard[]) => void;
  onSendShotToRender: (card: ShotCard) => void;
}

export const DirectorAgent: React.FC<DirectorAgentProps> = ({
  shotCards,
  onUpdateShotCards,
  onSendShotToRender,
}) => {
  const [ideaInput, setIdeaInput] = useState<string>(
    "Crie uma sequência cinematográfica de 3 takes para o lançamento do LAB Desktop: o criador chega ao estúdio à noite, inicia o software e vê todos os seus projetos renderizando localmente sem internet."
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerateShots = async () => {
    setIsAnalyzing(true);
    await new Promise((r) => setTimeout(r, 1200));

    const generated: ShotCard[] = [
      {
        id: `shot-${Date.now()}-1`,
        sceneNumber: 1,
        takeNumber: 1,
        title: "A Chegada Solitária",
        shotType: "Wide Shot",
        lensMm: "24mm f/2.0 Cine Lens",
        cameraHeight: "1.20m (Cintura)",
        cameraMotion: "Dolly-in suave acompanhando passos",
        energyCurve: "Antecipação",
        promptEn: "Wide angle cinematic establishing shot of a creator entering a moody design lab in Belo Horizonte, heavy rain on window, single amber desk lamp, cyberpunk workstations, volumetric smoke",
        audioPt: "Chuva bate no vidro. Passos ecoam. O criador se senta e liga a bancada.",
      },
      {
        id: `shot-${Date.now()}-2`,
        sceneNumber: 1,
        takeNumber: 2,
        title: "O Clique no Ícone LAB",
        shotType: "Close-up",
        lensMm: "50mm Macro",
        cameraHeight: "1.50m (Visão do Operador)",
        cameraMotion: "Rack focus do teclado para o monitor",
        energyCurve: "Ação",
        promptEn: "Extreme close up of hand clicking glowing steam-like orange launcher icon on 4K monitor, electric reflections on glass, cinematic depth of field, sharp graphic details",
        audioPt: "Um clique no launcher nativo. A biblioteca carrega instantaneamente.",
      },
      {
        id: `shot-${Date.now()}-3`,
        sceneNumber: 1,
        takeNumber: 3,
        title: "A Velocidade do Offline",
        shotType: "Dutch Angle",
        lensMm: "35mm Anamorphic",
        cameraHeight: "0.90m (Contra-plongée dinâmico)",
        cameraMotion: "Aproximação rápida com leve rotação",
        energyCurve: "Impacto",
        promptEn: "Low angle dynamic shot of creator smiling with confidence, multi-panel monitors rendering 4K video timeline in real-time, zero cloud lag, neon caramel and electric sky lighting",
        audioPt: "Zero custos de nuvem. Tudo gravado no SSD local na velocidade máxima da máquina.",
      },
    ];

    onUpdateShotCards(generated);
    setIsAnalyzing(false);
  };

  const handleCopyCard = (card: ShotCard) => {
    const text = `CENA ${card.sceneNumber} · TAKE ${card.takeNumber}: ${card.title}\nPlano: ${card.shotType} (${card.lensMm})\nCâmera: ${card.cameraMotion} | Altura: ${card.cameraHeight}\nCurva de Energia: ${card.energyCurve}\nPrompt IA: ${card.promptEn}\nÁudio / Direção: ${card.audioPt}`;
    navigator.clipboard.writeText(text);
    setCopiedId(card.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="director-layout">
      {/* Painel do Agente */}
      <div className="director-sidebar">
        <div className="director-box">
          <div className="director-header">
            <Clapperboard size={20} className="director-icon" />
            <div>
              <h3>Agente Diretor de Cena</h3>
              <p>Gramática cinematográfica, lentes, curvas de energia e shot lists prontas para render.</p>
            </div>
          </div>

          <div className="director-form">
            <label className="section-label">Descreva o Roteiro, Ideia ou Atmosfera:</label>
            <textarea
              className="prompt-textarea"
              rows={5}
              value={ideaInput}
              onChange={(e) => setIdeaInput(e.target.value)}
              placeholder="Ex: Cena de perseguição à noite, com cortes rápidos e iluminação dramática..."
            />

            <button
              type="button"
              className="btn-director-generate"
              onClick={handleGenerateShots}
              disabled={isAnalyzing || !ideaInput.trim()}
            >
              {isAnalyzing ? (
                <>
                  <Sparkles size={16} className="animate-spin" />
                  <span>Decupando Roteiro &amp; Câmeras...</span>
                </>
              ) : (
                <>
                  <Clapperboard size={16} />
                  <span>Gerar Decupagem &amp; Shot Cards</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Shot Cards */}
      <div className="director-shots-stage">
        <div className="shots-stage-header">
          <h4>Bíblia de Continuidade &amp; Shot Cards ({shotCards.length} Takes)</h4>
          <span className="shots-hint">Cada cartão contém lentes mm, movimento de câmera e prompt de inferência.</span>
        </div>

        <div className="shot-cards-grid">
          {shotCards.map((card) => (
            <div key={card.id} className="shot-card-item">
              <div className="shot-card-top">
                <span className="shot-badge">CENA {card.sceneNumber} · TAKE {card.takeNumber}</span>
                <span className={`energy-badge ${card.energyCurve.toLowerCase()}`}>
                  {card.energyCurve.toUpperCase()}
                </span>
              </div>

              <h4 className="shot-card-title">{card.title}</h4>

              <div className="shot-specs-grid">
                <div className="spec-item">
                  <span className="spec-label">Plano / Escala:</span>
                  <span className="spec-value">{card.shotType}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Lente Óptica:</span>
                  <span className="spec-value">{card.lensMm}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Altura Câmera:</span>
                  <span className="spec-value">{card.cameraHeight}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Movimento:</span>
                  <span className="spec-value">{card.cameraMotion}</span>
                </div>
              </div>

              <div className="shot-prompt-block">
                <span className="block-label">Prompt Visual (EN):</span>
                <p className="block-text">{card.promptEn}</p>
              </div>

              <div className="shot-audio-block">
                <span className="block-label">Áudio / Sonoplastia (PT-BR):</span>
                <p className="block-text audio">{card.audioPt}</p>
              </div>

              <div className="shot-card-footer">
                <button
                  type="button"
                  className="btn-card-action primary"
                  onClick={() => onSendShotToRender(card)}
                >
                  <Film size={13} />
                  <span>Enviar para Render</span>
                </button>

                <button
                  type="button"
                  className="btn-card-action secondary"
                  onClick={() => handleCopyCard(card)}
                >
                  {copiedId === card.id ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedId === card.id ? "Copiado!" : "Copiar"}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
