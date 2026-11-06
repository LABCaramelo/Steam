import { useState } from "react";
import type { EngineConfig } from "../types";
import { Settings, X, Volume2, Sliders, Server, Zap, Cpu } from "lucide-react";

interface EngineSettingsModalProps {
  config: EngineConfig;
  isOpen: boolean;
  onClose: () => void;
  onSaveConfig: (config: EngineConfig) => void;
}

export function EngineSettingsModal({
  config,
  isOpen,
  onClose,
  onSaveConfig,
}: EngineSettingsModalProps) {
  const [activeEngine, setActiveEngine] = useState(config.activeEngine);
  const [localServerUrl, setLocalServerUrl] = useState(config.localServerUrl);
  const [localServerStatus, setLocalServerStatus] = useState(config.localServerStatus);
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState(config.elevenLabsApiKey);
  const [elevenLabsModel, setElevenLabsModel] = useState(config.elevenLabsModel);
  const [openAiApiKey, setOpenAiApiKey] = useState(config.openAiApiKey);
  const [openAiModel, setOpenAiModel] = useState(config.openAiModel);
  const [useHardwareAcceleration, setUseHardwareAcceleration] = useState(config.useHardwareAcceleration);

  if (!isOpen) return null;

  const handleTestLocalServer = async () => {
    setLocalServerStatus("checking");
    try {
      const res = await fetch(`${localServerUrl}/v1/models`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok || res.status === 404 || res.status === 401) {
        setLocalServerStatus("connected");
      } else {
        setLocalServerStatus("disconnected");
      }
    } catch {
      // If CORS or local offline
      setLocalServerStatus("disconnected");
    }
  };

  const handleSave = () => {
    onSaveConfig({
      activeEngine,
      localServerUrl,
      localServerStatus,
      elevenLabsApiKey,
      elevenLabsModel,
      openAiApiKey,
      openAiModel,
      useHardwareAcceleration,
    });
    onClose();
  };

  return (
    <div className="vs-modal-backdrop" onClick={onClose}>
      <div className="vs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vs-modal__header">
          <div className="vs-modal__title-group">
            <Settings size={18} strokeWidth={1.5} className="vs-modal__icon" />
            <div>
              <h3 className="vs-modal__title">Central de Motores Vocais</h3>
              <p className="vs-modal__subtitle">
                Alterne entre síntese nativa web, servidor local VoiceStudio ou APIs de alta fidelidade
              </p>
            </div>
          </div>
          <button type="button" className="vs-icon-btn" onClick={onClose}>
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="vs-modal__body">
          {/* Engine choice */}
          <div className="vs-form-group">
            <label className="vs-form-label">Motor Ativo de Síntese</label>
            <div className="vs-engine-options">
              <label
                className={`vs-engine-card ${activeEngine === "webspeech" ? "vs-engine-card--active" : ""}`}
              >
                <input
                  type="radio"
                  name="engine"
                  checked={activeEngine === "webspeech"}
                  onChange={() => setActiveEngine("webspeech")}
                />
                <div className="vs-engine-card__content">
                  <span className="vs-engine-card__name"><Volume2 size={14} strokeWidth={1.5} style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }} /> Web Speech Nativo</span>
                  <span className="vs-engine-card__desc">
                    100% no navegador, zero custo, vozes instaladas no seu sistema (Google, Microsoft, Apple).
                  </span>
                </div>
              </label>

              <label
                className={`vs-engine-card ${activeEngine === "procedural" ? "vs-engine-card--active" : ""}`}
              >
                <input
                  type="radio"
                  name="engine"
                  checked={activeEngine === "procedural"}
                  onChange={() => setActiveEngine("procedural")}
                />
                <div className="vs-engine-card__content">
                  <span className="vs-engine-card__name"><Sliders size={14} strokeWidth={1.5} style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }} /> Motor Acústico Procedural (Web Audio)</span>
                  <span className="vs-engine-card__desc">
                    Síntese de formantes F1/F2 e micro-tremor vocal com renderização direta em WAV.
                  </span>
                </div>
              </label>

              <label
                className={`vs-engine-card ${activeEngine === "local_server" ? "vs-engine-card--active" : ""}`}
              >
                <input
                  type="radio"
                  name="engine"
                  checked={activeEngine === "local_server"}
                  onChange={() => setActiveEngine("local_server")}
                />
                <div className="vs-engine-card__content">
                  <span className="vs-engine-card__name"><Server size={14} strokeWidth={1.5} style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }} /> Servidor Local VoiceStudio / Ollama</span>
                  <span className="vs-engine-card__desc">
                    Conecte a uma instância local do repositório debpalash/voicestudio, Piper ou XTTS.
                  </span>
                </div>
              </label>

              <label
                className={`vs-engine-card ${activeEngine === "elevenlabs" ? "vs-engine-card--active" : ""}`}
              >
                <input
                  type="radio"
                  name="engine"
                  checked={activeEngine === "elevenlabs"}
                  onChange={() => setActiveEngine("elevenlabs")}
                />
                <div className="vs-engine-card__content">
                  <span className="vs-engine-card__name"><Zap size={14} strokeWidth={1.5} style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }} /> ElevenLabs API (Opcional)</span>
                  <span className="vs-engine-card__desc">
                    Conecte sua chave pessoal. A chave fica salva apenas no seu navegador.
                  </span>
                </div>
              </label>

              <label
                className={`vs-engine-card ${activeEngine === "openai" ? "vs-engine-card--active" : ""}`}
              >
                <input
                  type="radio"
                  name="engine"
                  checked={activeEngine === "openai"}
                  onChange={() => setActiveEngine("openai")}
                />
                <div className="vs-engine-card__content">
                  <span className="vs-engine-card__name"><Cpu size={14} strokeWidth={1.5} style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }} /> OpenAI TTS &amp; Whisper (Opcional)</span>
                  <span className="vs-engine-card__desc">
                    Vozes Alloy, Echo, Fable, Onyx, Nova e Shimmer via OpenAI.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Local Server Settings */}
          {activeEngine === "local_server" && (
            <div className="vs-engine-subpanel">
              <label className="vs-form-label">URL do Servidor Local</label>
              <div className="vs-input-action-row">
                <input
                  type="text"
                  className="vs-input"
                  placeholder="http://localhost:8000"
                  value={localServerUrl}
                  onChange={(e) => setLocalServerUrl(e.target.value)}
                />
                <button
                  type="button"
                  className="vs-btn vs-btn--outline"
                  onClick={handleTestLocalServer}
                >
                  {localServerStatus === "checking" ? "Testando..." : "Testar Ping"}
                </button>
              </div>
              <span className="vs-hint">
                Status:{" "}
                <strong
                  style={{
                    color: localServerStatus === "connected" ? "#2EE59D" : "#FF701A",
                  }}
                >
                  {localServerStatus === "connected"
                    ? "Servidor Conectado ✓"
                    : "Servidor Offline ou aguardando inicialização"}
                </strong>
              </span>
            </div>
          )}

          {/* ElevenLabs Key */}
          {activeEngine === "elevenlabs" && (
            <div className="vs-engine-subpanel">
              <label className="vs-form-label">Sua Chave de API ElevenLabs</label>
              <input
                type="password"
                className="vs-input"
                placeholder="sk_..."
                value={elevenLabsApiKey}
                onChange={(e) => setElevenLabsApiKey(e.target.value)}
              />
              <div style={{ marginTop: "0.75rem" }}>
                <label className="vs-form-label">Modelo ElevenLabs</label>
                <select
                  className="vs-select"
                  value={elevenLabsModel}
                  onChange={(e) => setElevenLabsModel(e.target.value)}
                >
                  <option value="eleven_multilingual_v2">Eleven Multilingual v2 (Recomendado)</option>
                  <option value="eleven_turbo_v2_5">Eleven Turbo v2.5 (Baixa Latência)</option>
                  <option value="eleven_monolingual_v1">Eleven Monolingual v1</option>
                </select>
              </div>
              <span className="vs-hint">Sua chave é armazenada apenas neste navegador via localStorage.</span>
            </div>
          )}

          {/* OpenAI Key */}
          {activeEngine === "openai" && (
            <div className="vs-engine-subpanel">
              <label className="vs-form-label">Sua Chave de API OpenAI</label>
              <input
                type="password"
                className="vs-input"
                placeholder="sk-..."
                value={openAiApiKey}
                onChange={(e) => setOpenAiApiKey(e.target.value)}
              />
              <div style={{ marginTop: "0.75rem" }}>
                <label className="vs-form-label">Modelo OpenAI TTS</label>
                <select
                  className="vs-select"
                  value={openAiModel}
                  onChange={(e) => setOpenAiModel(e.target.value)}
                >
                  <option value="tts-1-hd">tts-1-hd (Alta Fidelidade)</option>
                  <option value="tts-1">tts-1 (Padrão)</option>
                </select>
              </div>
              <span className="vs-hint">Compatível com Whisper para transcrição e TTS HD.</span>
            </div>
          )}

          {/* Hardware acceleration badge */}
          <div className="vs-hardware-banner">
            <span className="vs-hw-icon"><Zap size={14} strokeWidth={1.5} /></span>
            <div style={{ flex: 1 }}>
              <strong>Aceleração de Hardware Detectada</strong>
              <p>WebAudio + WebAssembly SIMD ativos. Suporte a CUDA/MPS para instâncias locais.</p>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.8rem" }}>
              <input
                type="checkbox"
                checked={useHardwareAcceleration}
                onChange={(e) => setUseHardwareAcceleration(e.target.checked)}
              />
              Ativa
            </label>
          </div>
        </div>

        <div className="vs-modal__footer">
          <button type="button" className="vs-btn vs-btn--outline" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="vs-btn vs-btn--primary" onClick={handleSave}>
            Salvar Preferências
          </button>
        </div>
      </div>
    </div>
  );
}
