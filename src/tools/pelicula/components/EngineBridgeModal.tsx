import React, { useState } from "react";
import { EngineStatus, ApiKeysConfig } from "../types";
import { X, Cpu, Key, Check, RefreshCw, Terminal } from "lucide-react";

interface EngineBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  engineStatus: EngineStatus;
  onCheckEngine: () => Promise<void>;
  engineUrl: string;
  onSaveEngineUrl: (url: string) => void;
  apiKeys: ApiKeysConfig;
  onSaveApiKeys: (keys: ApiKeysConfig) => void;
}

export const EngineBridgeModal: React.FC<EngineBridgeModalProps> = ({
  isOpen,
  onClose,
  engineStatus,
  onCheckEngine,
  engineUrl,
  onSaveEngineUrl,
  apiKeys,
  onSaveApiKeys,
}) => {
  const [activeTab, setActiveTab] = useState<"local" | "byok">("local");
  const [urlInput, setUrlInput] = useState<string>(engineUrl);
  const [keysForm, setKeysForm] = useState<ApiKeysConfig>(apiKeys);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveEngineUrl(urlInput);
    onSaveApiKeys(keysForm);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="engine-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Cpu size={18} className="modal-icon" />
            <h3>Configuração de Motores &amp; Provedores (Pelicula)</h3>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-tabs">
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === "local" ? "active" : ""}`}
            onClick={() => setActiveTab("local")}
          >
            <Terminal size={14} />
            <span>Motor Local GPU (Offline)</span>
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === "byok" ? "active" : ""}`}
            onClick={() => setActiveTab("byok")}
          >
            <Key size={14} />
            <span>Chaves de API Nuvem (BYOK)</span>
          </button>
        </div>

        <div className="modal-body">
          {activeTab === "local" && (
            <div className="engine-tab-content">
              <div className="engine-status-banner">
                <div className="status-indicator-group">
                  <span className={`status-bulb ${engineStatus.connected ? "online" : "offline"}`} />
                  <div>
                    <h4>{engineStatus.connected ? "Motor Local Conectado" : "Motor Local Desconectado"}</h4>
                    <p>
                      {engineStatus.connected
                        ? `Detectado: ${engineStatus.hardware?.device_name || "GPU Local"} · VRAM: ${engineStatus.hardware?.vram_total_gb || "8"} GB`
                        : "O motor local não foi detectado na porta 18795. O Película está operando em Modo Nuvem / Simulação."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-refresh-status"
                  onClick={onCheckEngine}
                  disabled={engineStatus.checking}
                >
                  <RefreshCw size={13} className={engineStatus.checking ? "animate-spin" : ""} />
                  <span>Testar Conexão</span>
                </button>
              </div>

              <div className="field-group">
                <label className="field-label">Endereço do Servidor Local:</label>
                <input
                  type="text"
                  className="input-text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="http://127.0.0.1:18795"
                />
              </div>

              <div className="engine-help-box">
                <h5>Como Rodar o Motor Local no LAB Desktop:</h5>
                <ol>
                  <li>Abra o diretório do projeto no seu computador.</li>
                  <li>Dê um duplo clique no arquivo <code>tools\pelicula\start_engine.bat</code>.</li>
                  <li>O terminal iniciará o servidor local com suporte a <strong>sd.cpp</strong> e <strong>Wan2GP</strong>.</li>
                  <li>Todos os renders serão salvos direto no seu SSD, sem faturas de R2 ou custos de nuvem.</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === "byok" && (
            <div className="engine-tab-content">
              <p className="byok-intro">
                Insira suas chaves próprias (Bring Your Own Key) para acessar mais de 600 modelos em nuvem
                (Flux, Veo 3, Midjourney, Kling, ElevenLabs). Suas chaves ficam guardadas apenas no seu navegador.
              </p>

              <div className="byok-fields-grid">
                <div className="field-group">
                  <label className="field-label">Muapi.ai API Key (Gateway 600+ Modelos):</label>
                  <input
                    type="password"
                    className="input-text"
                    value={keysForm.muapi || ""}
                    onChange={(e) => setKeysForm({ ...keysForm, muapi: e.target.value })}
                    placeholder="muapi_..."
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Fal.ai API Key (Flux Dev &amp; Schnell):</label>
                  <input
                    type="password"
                    className="input-text"
                    value={keysForm.fal || ""}
                    onChange={(e) => setKeysForm({ ...keysForm, fal: e.target.value })}
                    placeholder="fal_key_..."
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Replicate API Token (SDXL / Wan / Kling):</label>
                  <input
                    type="password"
                    className="input-text"
                    value={keysForm.replicate || ""}
                    onChange={(e) => setKeysForm({ ...keysForm, replicate: e.target.value })}
                    placeholder="r8_..."
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">OpenAI / Google Gemini API Key (Veo 3 / Sora):</label>
                  <input
                    type="password"
                    className="input-text"
                    value={keysForm.openai || ""}
                    onChange={(e) => setKeysForm({ ...keysForm, openai: e.target.value })}
                    placeholder="sk-..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-modal-cancel" onClick={onClose}>
            Fechar
          </button>
          <button type="button" className="btn-modal-save" onClick={handleSave}>
            {isSaved ? <Check size={14} /> : null}
            <span>{isSaved ? "Salvo com Sucesso!" : "Salvar Configurações"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
