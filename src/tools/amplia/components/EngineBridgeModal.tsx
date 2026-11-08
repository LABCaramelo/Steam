import React, { useState } from "react";
import type { EngineStatus } from "../types";

interface EngineBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  engineStatus: EngineStatus;
  onRefreshHealth: (url?: string) => void;
}

export const EngineBridgeModal: React.FC<EngineBridgeModalProps> = ({
  isOpen,
  onClose,
  engineStatus,
  onRefreshHealth,
}) => {
  const [customUrl, setCustomUrl] = useState<string>(engineStatus.url);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const caps = engineStatus.capabilities;
  const startCommand = "python app.py";

  const handleCopy = () => {
    navigator.clipboard.writeText(startCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="amplia-modal-backdrop" onClick={onClose}>
      <div className="amplia-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="amplia-modal-header">
          <div>
            <h3 className="amplia-modal-title">Motor Local IA (NextGenUp Bridge)</h3>
            <p className="amplia-modal-desc">
              Processamento 100% offline via GPU / CPU local. Sem taxas de nuvem e com modelos em alta resolução.
            </p>
          </div>
          <button type="button" className="amplia-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="amplia-bridge-status-row">
          <div className="amplia-bridge-status-indicator">
            <span
              className={`amplia-bridge-dot ${
                engineStatus.connected ? "connected" : "disconnected"
              }`}
            />
            <span className="amplia-bridge-status-text">
              {engineStatus.connected
                ? `Motor Ativo na porta ${new URL(engineStatus.url).port || "18790"}`
                : "Motor Local Desconectado (Usando Modo Web Nativo)"}
            </span>
          </div>

          <button
            type="button"
            className="amplia-btn-refresh-bridge"
            onClick={() => onRefreshHealth(customUrl)}
            disabled={engineStatus.checking}
          >
            {engineStatus.checking ? "Testando..." : "Testar Conexão"}
          </button>
        </div>

        <div className="amplia-bridge-field">
          <label className="amplia-label">Endereço da API Local</label>
          <div className="amplia-url-input-group">
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="http://127.0.0.1:18790"
              className="amplia-input"
            />
          </div>
        </div>

        {engineStatus.connected && caps && (
          <div className="amplia-bridge-caps">
            <h4 className="amplia-caps-title">Motores Detectados:</h4>
            <div className="amplia-caps-grid">
              <div className={`amplia-cap-item ${caps.server_ai ? "active" : ""}`}>
                <span className="amplia-cap-icon">🖼️</span>
                <div>
                  <strong>Real-ESRGAN</strong>
                  <span>Super-Resolução 8K</span>
                </div>
              </div>

              <div className={`amplia-cap-item ${caps.face_restore ? "active" : ""}`}>
                <span className="amplia-cap-icon">👤</span>
                <div>
                  <strong>GFPGAN v1.4</strong>
                  <span>Restauração Facial</span>
                </div>
              </div>

              <div className={`amplia-cap-item ${caps.server_ai ? "active" : ""}`}>
                <span className="amplia-cap-icon">✂️</span>
                <div>
                  <strong>BiRefNet &amp; LaMa</strong>
                  <span>Recorte &amp; Inpaint</span>
                </div>
              </div>

              <div className={`amplia-cap-item ${caps.audio ? "active" : ""}`}>
                <span className="amplia-cap-icon">🎙️</span>
                <div>
                  <strong>MDX-Net + DeepFilter</strong>
                  <span>Separação de Faixas</span>
                </div>
              </div>

              <div className={`amplia-cap-item ${caps.ffmpeg ? "active" : ""}`}>
                <span className="amplia-cap-icon">🎬</span>
                <div>
                  <strong>FFmpeg Pro</strong>
                  <span>Vídeo 4K &amp; Compressão</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="amplia-bridge-instructions">
          <h4 className="amplia-instructions-title">Como rodar o motor local no seu computador:</h4>
          <ol className="amplia-instructions-list">
            <li>Abra o terminal na pasta do motor (onde está o repositório ou executável do NextGenUp).</li>
            <li>Execute o servidor local com o comando:</li>
          </ol>

          <div className="amplia-code-box">
            <code>{startCommand}</code>
            <button type="button" className="amplia-btn-copy" onClick={handleCopy}>
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>

          <p className="amplia-bridge-fallback-note">
            💡 Enquanto o motor local estiver offline, o AMPLIA continuará funcionando no seu navegador com o motor DSP de áudio, sharpening adaptativo CAS e ferramentas de canvas.
          </p>
        </div>
      </div>
    </div>
  );
};
