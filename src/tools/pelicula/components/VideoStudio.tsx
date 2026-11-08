import React, { useState, useEffect } from "react";
import { VideoGenParams, VideoModelOption, RenderItem } from "../types";
import { Film, Play, Wand2, ArrowRight, Download, Music, X } from "lucide-react";

interface VideoStudioProps {
  onGenerate: (params: VideoGenParams) => Promise<void>;
  isGenerating: boolean;
  progressPercent: number;
  statusMessage: string;
  lastVideoRender: RenderItem | null;
  initialKeyframe: RenderItem | null;
  onClearInitialKeyframe: () => void;
}

const VIDEO_MODELS: VideoModelOption[] = [
  { id: "wan-2.1-local", name: "Wan 2.1 (GPU Local / Wan2GP)", type: "local", category: "Motor Local 100% Offline", maxDuration: 10 },
  { id: "veo-3", name: "Google Veo 3 (4K Áudio Sync)", type: "cloud", category: "Qualidade Cinema", maxDuration: 10 },
  { id: "wan-2.1-cloud", name: "Wan 2.1 Cloud (Alta Resolução)", type: "cloud", category: "Fluidez de Movimento", maxDuration: 10 },
  { id: "kling-1.5", name: "Kling 1.5 Pro", type: "cloud", category: "Ação & Física", maxDuration: 10 },
  { id: "luma-dream", name: "Luma Dream Machine", type: "cloud", category: "Transições Rápidas", maxDuration: 5 },
];

export const VideoStudio: React.FC<VideoStudioProps> = ({
  onGenerate,
  isGenerating,
  progressPercent,
  statusMessage,
  lastVideoRender,
  initialKeyframe,
  onClearInitialKeyframe,
}) => {
  const [prompt, setPrompt] = useState<string>(
    "Aproximação lenta de câmera (dolly-in) no Luiz enquanto ele digita no teclado mecânico, luz ambiente fria azulada com contraste dourado, partículas de poeira suspensas no ar, 24fps film grain"
  );
  const [selectedModel, setSelectedModel] = useState<string>("veo-3");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9" | "1:1">("9:16");
  const [cameraMotion, setCameraMotion] = useState<VideoGenParams["cameraMotion"]>("dolly-in");
  const [duration, setDuration] = useState<number>(5);
  const [fps, setFps] = useState<number>(24);
  const [seed] = useState<number>(-1);
  const [motionStrength, setMotionStrength] = useState<number>(65);

  useEffect(() => {
    if (initialKeyframe) {
      setPrompt(`Animação contínua da imagem: ${initialKeyframe.prompt}, mantendo iluminação e vestuário, movimento de câmera motivado`);
      if (initialKeyframe.aspectRatio === "16:9" || initialKeyframe.aspectRatio === "9:16" || initialKeyframe.aspectRatio === "1:1") {
        setAspectRatio(initialKeyframe.aspectRatio);
      }
    }
  }, [initialKeyframe]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    onGenerate({
      prompt,
      imageUrl: initialKeyframe?.url,
      model: selectedModel,
      durationSeconds: duration,
      aspectRatio,
      cameraMotion,
      fps,
      seed,
      motionStrength,
    });
  };

  return (
    <div className="studio-layout">
      {/* Coluna Esquerda: Configuração de Movimento e Câmera */}
      <div className="studio-sidebar">
        <form onSubmit={handleSubmit} className="studio-form">
          {/* Keyframe Inicial (Image-to-Video) */}
          {initialKeyframe && (
            <div className="keyframe-dock-card">
              <div className="keyframe-thumb-wrap">
                <img src={initialKeyframe.url} alt="Keyframe inicial" className="keyframe-thumb" />
                <button
                  type="button"
                  className="btn-remove-thumb"
                  onClick={onClearInitialKeyframe}
                  title="Remover imagem inicial"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="keyframe-details">
                <span className="keyframe-badge">MODO IMAGE-TO-VIDEO</span>
                <p className="keyframe-name">{initialKeyframe.title}</p>
                <span className="keyframe-meta">Animando primeiro frame com continuidade canônica</span>
              </div>
            </div>
          )}

          <div className="form-section">
            <label htmlFor="video-prompt-field" className="section-label">Descrição do Take &amp; Movimento</label>
            <textarea
              id="video-prompt-field"
              className="prompt-textarea"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva a ação dos personagens, velocidade de movimento e atmosfera..."
            />
          </div>

          <div className="form-section">
            <label className="section-label">Modelo Gerador de Vídeo</label>
            <div className="model-selector-grid">
              {VIDEO_MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`model-card ${selectedModel === m.id ? "active" : ""}`}
                  onClick={() => setSelectedModel(m.id)}
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
            <label className="section-label">Linguagem &amp; Movimento de Câmera</label>
            <div className="motion-selector-grid">
              {[
                { id: "dolly-in", name: "Dolly-in (Avanço)", desc: "Aproximação com foco no sujeito" },
                { id: "dolly-out", name: "Dolly-out (Recuo)", desc: "Revela o cenário e contexto" },
                { id: "pan-left", name: "Panorâmica Esquerda", desc: "Varredura horizontal fluida" },
                { id: "pan-right", name: "Panorâmica Direita", desc: "Acompanhamento lateral" },
                { id: "tilt-up", name: "Tilt Up (Ascensão)", desc: "Movimento vertical para cima" },
                { id: "fpv-drone", name: "FPV Drone", desc: "Curva dinâmica de alta energia" },
                { id: "handheld", name: "Câmera na Mão", desc: "Respiração e realismo documental" },
                { id: "static", name: "Estática Fixa", desc: "Câmera no tripé, ação interna" },
              ].map((mot) => (
                <button
                  key={mot.id}
                  type="button"
                  className={`motion-btn ${cameraMotion === mot.id ? "active" : ""}`}
                  onClick={() => setCameraMotion(mot.id as any)}
                >
                  <span className="motion-title">{mot.name}</span>
                  <span className="motion-desc">{mot.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <div className="two-cols-row">
              <div>
                <label className="section-label">Duração</label>
                <div className="toggle-btn-group">
                  {[5, 10].map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`btn-subtoggle ${duration === d ? "active" : ""}`}
                      onClick={() => setDuration(d)}
                    >
                      {d} Segundos
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="section-label">Cadência (FPS)</label>
                <div className="toggle-btn-group">
                  {[24, 30].map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`btn-subtoggle ${fps === f ? "active" : ""}`}
                      onClick={() => setFps(f)}
                    >
                      {f} FPS {f === 24 ? "(Cinema)" : ""}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="field-label-row">
              <span className="section-label">Intensidade de Movimento: {motionStrength}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={motionStrength}
              onChange={(e) => setMotionStrength(Number(e.target.value))}
              className="slider-range"
            />
          </div>

          <button
            type="submit"
            className="btn-generate-main"
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? (
              <>
                <Wand2 size={18} className="animate-spin" />
                <span>Renderizando Vídeo... ({progressPercent}%)</span>
              </>
            ) : (
              <>
                <Film size={18} />
                <span>Gerar Take ({duration}s · {fps}fps · {aspectRatio})</span>
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

      {/* Coluna Direita: Stage do Take */}
      <div className="studio-stage">
        {lastVideoRender ? (
          <div className="render-stage-card">
            <div className="stage-media-wrap" data-ratio={lastVideoRender.aspectRatio}>
              <img
                src={lastVideoRender.url}
                alt={lastVideoRender.prompt}
                className="stage-rendered-img"
              />
              <div className="stage-play-overlay">
                <Play size={44} className="play-icon" />
              </div>
              <div className="stage-media-badge">
                <span>{lastVideoRender.model}</span>
                <span>•</span>
                <span>24 FPS Cinema</span>
              </div>
            </div>

            <div className="stage-info-bar">
              <div className="stage-meta">
                <h3 className="stage-title">{lastVideoRender.title}</h3>
                <p className="stage-prompt">{lastVideoRender.prompt}</p>
              </div>

              <div className="stage-actions-group">
                <a
                  href="/tools/montagem"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-stage-action primary"
                  title="Abrir linha do tempo de cortes na Montagem"
                >
                  <span>Enviar para Montagem (NLE)</span>
                  <ArrowRight size={15} />
                </a>

                <a
                  href="/tools/trilha"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-stage-action secondary"
                  title="Gerar trilha sonora sob medida no Trilha"
                >
                  <Music size={14} />
                  <span>Criar Trilha Sonora</span>
                </a>

                <a
                  href="/tools/amplia"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-stage-action ghost"
                  title="Fazer upscale 4K/8K frame-a-frame no Amplia"
                >
                  <span>Upscale 4K no Amplia</span>
                </a>

                <a
                  href={lastVideoRender.url}
                  download={`take-${lastVideoRender.id}.mp4`}
                  className="btn-stage-action ghost"
                  title="Baixar vídeo localmente"
                >
                  <Download size={14} />
                  <span>Salvar MP4</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="stage-empty-state">
            <div className="empty-icon-wrap">
              <Film size={36} className="empty-icon" />
            </div>
            <h3>Estúdio de Vídeo &amp; Cinema</h3>
            <p>
              Gere tomadas cinematográficas com física coerente e movimento de câmera profissional.
              Você pode começar animando um <strong>Keyframe</strong> criado no Estúdio de Imagem ou digitar a descrição da ação.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
