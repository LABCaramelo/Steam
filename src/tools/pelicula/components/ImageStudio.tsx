import React, { useState } from "react";
import { ImageGenParams, ImageModelOption, RenderItem } from "../types";
import { CARAMELO_STYLE_PREFIX, CARAMELO_NEGATIVE_PROMPT } from "../services/storage";
import { Sparkles, Sliders, Wand2, Download, ArrowRight, Check } from "lucide-react";

interface ImageStudioProps {
  onGenerate: (params: ImageGenParams) => Promise<void>;
  isGenerating: boolean;
  progressPercent: number;
  statusMessage: string;
  lastImageRender: RenderItem | null;
  onSendToVideo: (render: RenderItem) => void;
}

const MODELS: ImageModelOption[] = [
  { id: "flux-schnell", name: "Flux Schnell (Ultra Rápido)", type: "hybrid", category: "Geração Rápida", recommendedSteps: 4 },
  { id: "flux-dev", name: "Flux Dev (Fidelidade Canônica)", type: "hybrid", category: "Cinema & Detalhe", recommendedSteps: 28 },
  { id: "sdxl-turbo", name: "SDXL Turbo (Tempo Real)", type: "hybrid", category: "Velocidade", recommendedSteps: 8 },
  { id: "sd-cpp-local", name: "sd.cpp (100% Offline GGUF)", type: "local", category: "Motor Local", recommendedSteps: 20 },
  { id: "midjourney-v6", name: "Midjourney Cinematic", type: "cloud", category: "Estilo & Iluminação", recommendedSteps: 30 },
];

export const ImageStudio: React.FC<ImageStudioProps> = ({
  onGenerate,
  isGenerating,
  progressPercent,
  statusMessage,
  lastImageRender,
  onSendToVideo,
}) => {
  const [prompt, setPrompt] = useState<string>(
    "Luiz caminhando na Serra do Curral em Belo Horizonte, luz de fim de tarde dourada, vento suave nos cabelos, casaco técnico preto e laranja, fundo com silhueta montanhosa"
  );
  const [negativePrompt, setNegativePrompt] = useState<string>(CARAMELO_NEGATIVE_PROMPT);
  const [selectedModel, setSelectedModel] = useState<string>("flux-dev");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "1:1" | "16:9" | "4:5">("9:16");
  const [useStylePrefix, setUseStylePrefix] = useState<boolean>(true);
  const [steps, setSteps] = useState<number>(28);
  const [guidanceScale, setGuidanceScale] = useState<number>(3.5);
  const [seed, setSeed] = useState<number>(-1);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleApplyStyle = () => {
    setUseStylePrefix(!useStylePrefix);
  };

  const handleApplyNegative = () => {
    setNegativePrompt(CARAMELO_NEGATIVE_PROMPT);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    let width = 1024;
    let height = 1024;
    if (aspectRatio === "9:16") {
      width = 720;
      height = 1280;
    } else if (aspectRatio === "16:9") {
      width = 1280;
      height = 720;
    } else if (aspectRatio === "4:5") {
      width = 896;
      height = 1120;
    }

    onGenerate({
      prompt,
      negativePrompt,
      model: selectedModel,
      aspectRatio,
      width,
      height,
      steps,
      guidanceScale,
      seed,
      useStylePrefix,
    });
  };

  const handleCopyPrompt = () => {
    const full = useStylePrefix ? `${prompt}, ${CARAMELO_STYLE_PREFIX}` : prompt;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="studio-layout">
      {/* Coluna Esquerda: Controles de Criação */}
      <div className="studio-sidebar">
        <form onSubmit={handleSubmit} className="studio-form">
          <div className="form-section">
            <div className="section-title-row">
              <label htmlFor="prompt-field" className="section-label">Prompt da Cena</label>
              <button
                type="button"
                className={`btn-pill-toggle ${useStylePrefix ? "active" : ""}`}
                onClick={handleApplyStyle}
                title="Aplica iluminação e textura canônica do Cérebro Caramelo"
              >
                <Sparkles size={12} />
                <span>Style Prefix Canônico</span>
              </button>
            </div>

            <textarea
              id="prompt-field"
              className="prompt-textarea"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva a cena, personagem, ação, luz e atmosfera..."
            />
          </div>

          <div className="form-section">
            <label className="section-label">Modelo de Imagem</label>
            <div className="model-selector-grid">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`model-card ${selectedModel === m.id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedModel(m.id);
                    setSteps(m.recommendedSteps);
                  }}
                >
                  <div className="model-header">
                    <span className="model-name">{m.name}</span>
                    <span className={`model-tag ${m.type}`}>{m.type.toUpperCase()}</span>
                  </div>
                  <span className="model-cat">{m.category}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label className="section-label">Proporção de Tela (Aspect Ratio)</label>
            <div className="ratio-selector">
              {(["9:16", "1:1", "16:9", "4:5"] as const).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  className={`ratio-btn ${aspectRatio === ratio ? "active" : ""}`}
                  onClick={() => setAspectRatio(ratio)}
                >
                  <span className="ratio-icon" data-ratio={ratio} />
                  <span className="ratio-name">{ratio}</span>
                  <span className="ratio-sub">
                    {ratio === "9:16" ? "Reels/TikTok" : ratio === "1:1" ? "Feed" : ratio === "16:9" ? "Cinema" : "Retrato"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Seção Avançada */}
          <div className="form-section">
            <button
              type="button"
              className="btn-toggle-advanced"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Sliders size={13} />
              <span>{showAdvanced ? "Ocultar Parâmetros Técnicos" : "Parâmetros Técnicos (Steps, CFG, Seed)"}</span>
            </button>

            {showAdvanced && (
              <div className="advanced-fields">
                <div className="field-group">
                  <div className="field-label-row">
                    <span>Passos de Inferência (Steps): {steps}</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="50"
                    value={steps}
                    onChange={(e) => setSteps(Number(e.target.value))}
                    className="slider-range"
                  />
                </div>

                <div className="field-group">
                  <div className="field-label-row">
                    <span>Guidance Scale (CFG): {guidanceScale.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="10.0"
                    step="0.5"
                    value={guidanceScale}
                    onChange={(e) => setGuidanceScale(Number(e.target.value))}
                    className="slider-range"
                  />
                </div>

                <div className="field-group">
                  <div className="field-label-row">
                    <span>Seed (-1 para determinismo aleatório):</span>
                  </div>
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value))}
                    className="input-number"
                  />
                </div>

                <div className="field-group">
                  <div className="field-label-row">
                    <span>Prompt Negativo Anti-Mediocridade</span>
                    <button type="button" onClick={handleApplyNegative} className="btn-text-sm">
                      Restaurar Padrão
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    className="prompt-textarea text-xs"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn-generate-main"
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? (
              <>
                <Wand2 size={18} className="animate-spin" />
                <span>Gerando Keyframe... ({progressPercent}%)</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Gerar Keyframe ({aspectRatio})</span>
              </>
            )}
          </button>

          {isGenerating && (
            <div className="progress-container">
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="progress-status-text">{statusMessage}</div>
            </div>
          )}
        </form>
      </div>

      {/* Coluna Direita: Stage e Ações de Esteira */}
      <div className="studio-stage">
        {lastImageRender ? (
          <div className="render-stage-card">
            <div className="stage-media-wrap" data-ratio={lastImageRender.aspectRatio}>
              <img
                src={lastImageRender.url}
                alt={lastImageRender.prompt}
                className="stage-rendered-img"
              />
              <div className="stage-media-badge">
                <span>{lastImageRender.model}</span>
                <span>•</span>
                <span>Seed: {lastImageRender.seed}</span>
              </div>
            </div>

            <div className="stage-info-bar">
              <div className="stage-meta">
                <h3 className="stage-title">{lastImageRender.title}</h3>
                <p className="stage-prompt">{lastImageRender.prompt}</p>
              </div>

              <div className="stage-actions-group">
                <button
                  type="button"
                  className="btn-stage-action primary"
                  onClick={() => onSendToVideo(lastImageRender)}
                  title="Envia este frame como ponto de partida no Estúdio de Vídeo"
                >
                  <span>Animar em Vídeo</span>
                  <ArrowRight size={15} />
                </button>

                <a
                  href={`/tools/amplia`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-stage-action secondary"
                  title="Fazer super-resolução 8K e restauração no AMPLIA"
                >
                  <span>Ampliar no AMPLIA (8K)</span>
                </a>

                <button
                  type="button"
                  className="btn-stage-action ghost"
                  onClick={handleCopyPrompt}
                >
                  {copied ? <Check size={14} /> : <Wand2 size={14} />}
                  <span>{copied ? "Copiado!" : "Copiar Prompt"}</span>
                </button>

                <a
                  href={lastImageRender.url}
                  download={`pelicula-${lastImageRender.id}.png`}
                  className="btn-stage-action ghost"
                  title="Baixar para o computador"
                >
                  <Download size={14} />
                  <span>Salvar</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="stage-empty-state">
            <div className="empty-icon-wrap">
              <Sparkles size={36} className="empty-icon" />
            </div>
            <h3>O Estúdio de Imagem está pronto</h3>
            <p>
              Digite a cena desejada ao lado, escolha o modelo e clique em <strong>Gerar Keyframe</strong>.
              Você poderá animar o resultado direto no Estúdio de Vídeo ou enviar para o AMPLIA.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
