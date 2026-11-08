import React from "react";
import type { AmpliaMode, EngineStatus } from "../types";

interface HeaderProps {
  currentMode: AmpliaMode;
  onSelectMode: (mode: AmpliaMode) => void;
  engineStatus: EngineStatus;
  onOpenEngineModal: () => void;
  onOpenPresetsModal: () => void;
}

export const MODES: { id: AmpliaMode; label: string; icon: string; badge?: string }[] = [
  { id: "upscale", label: "Super-Resolução 8K", icon: "🖼️" },
  { id: "face_restore", label: "Restauração Facial", icon: "👤", badge: "GFPGAN" },
  { id: "bg_remove", label: "Recorte & Fundo", icon: "✂️", badge: "BiRefNet" },
  { id: "magic_eraser", label: "Borracha Mágica", icon: "🪄", badge: "LaMa" },
  { id: "denoise_deblur", label: "Nitidez & Denoise", icon: "🧹" },
  { id: "colorize", label: "Colorização P&B", icon: "🎨" },
  { id: "audio_studio", label: "Estúdio de Áudio", icon: "🎙️", badge: "DSP" },
  { id: "video_tools", label: "Vídeo 4K & GIF", icon: "🎬" },
];

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  engineStatus,
  onOpenEngineModal,
  onOpenPresetsModal,
}) => {
  return (
    <header className="amplia-header">
      <div className="amplia-header-top">
        <div className="amplia-brand">
          <div className="amplia-isotype">A</div>
          <div className="amplia-title-box">
            <div className="amplia-title-row">
              <h1 className="amplia-title">AMPLIA</h1>
              <span className="amplia-tag">LAB / 20</span>
              <span className="amplia-version">v1.3</span>
            </div>
            <p className="amplia-subtitle">
              Estúdio de Super-Resolução 8K, Restauração Facial, Recorte & Masterização Audiovisual
            </p>
          </div>
        </div>

        <div className="amplia-header-actions">
          <button
            type="button"
            className="amplia-btn-preset"
            onClick={onOpenPresetsModal}
            title="Presets otimizados para Carrosséis HEAD, Reels e Model Sheets"
          >
            <span className="amplia-preset-icon">⚡</span>
            <span>Presets Caramelo</span>
          </button>

          <button
            type="button"
            className={`amplia-engine-pill ${engineStatus.connected ? "connected" : "standalone"}`}
            onClick={onOpenEngineModal}
            title={
              engineStatus.connected
                ? "Motor Local Conectado (NextGenUp AI Server na porta 18790)"
                : "Modo Web Nativo (Clique para conectar o motor local de GPU)"
            }
          >
            <span className="amplia-engine-dot" />
            <span className="amplia-engine-label">
              {engineStatus.connected ? "Motor Local 8K / GPU" : "Modo Web Nativo"}
            </span>
            <span className="amplia-engine-gear">⚙️</span>
          </button>
        </div>
      </div>

      <nav className="amplia-tabs-nav">
        {MODES.map((mode) => {
          const active = currentMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              className={`amplia-tab-item ${active ? "active" : ""}`}
              onClick={() => onSelectMode(mode.id)}
            >
              <span className="amplia-tab-icon">{mode.icon}</span>
              <span className="amplia-tab-label">{mode.label}</span>
              {mode.badge && <span className="amplia-tab-badge">{mode.badge}</span>}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
