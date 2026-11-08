import React from "react";
import { PeliculaTab, EngineStatus } from "../types";
import { Film, Image as ImageIcon, Video, Cpu, Sparkles, FolderOpen, Sliders } from "lucide-react";

interface HeaderProps {
  currentTab: PeliculaTab;
  onSelectTab: (tab: PeliculaTab) => void;
  engineStatus: EngineStatus;
  onOpenEngineModal: () => void;
  galleryCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  engineStatus,
  onOpenEngineModal,
  galleryCount,
}) => {
  return (
    <header className="pelicula-header">
      <div className="header-left">
        <div className="brand-badge-group">
          <div className="brand-icon-box">
            <Film size={20} className="film-icon" />
          </div>
          <div>
            <div className="brand-title">
              PELÍCULA<span className="accent-dot">.</span>
            </div>
            <div className="brand-tagline">CINEMA STUDIO &amp; VIBE WORKFLOWS</div>
          </div>
        </div>

        <nav className="tab-nav">
          <button
            type="button"
            className={`tab-btn ${currentTab === "image" ? "active" : ""}`}
            onClick={() => onSelectTab("image")}
          >
            <ImageIcon size={15} />
            <span>Imagem</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${currentTab === "video" ? "active" : ""}`}
            onClick={() => onSelectTab("video")}
          >
            <Video size={15} />
            <span>Vídeo &amp; Motion</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${currentTab === "workflow" ? "active" : ""}`}
            onClick={() => onSelectTab("workflow")}
          >
            <Cpu size={15} />
            <span>Vibe Workflow</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${currentTab === "director" ? "active" : ""}`}
            onClick={() => onSelectTab("director")}
          >
            <Sparkles size={15} />
            <span>Diretor IA</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${currentTab === "gallery" ? "active" : ""}`}
            onClick={() => onSelectTab("gallery")}
          >
            <FolderOpen size={15} />
            <span>Galeria ({galleryCount})</span>
          </button>
        </nav>
      </div>

      <div className="header-right">
        <button
          type="button"
          className={`engine-status-pill ${engineStatus.connected ? "connected" : "cloud"}`}
          onClick={onOpenEngineModal}
          title="Clique para gerenciar motores locais e chaves de API"
        >
          <span className="status-dot" />
          {engineStatus.connected ? (
            <span className="status-text">
              <strong>GPU Local Ativa</strong> ({engineStatus.hardware?.vram_total_gb || "8"}GB VRAM)
            </span>
          ) : (
            <span className="status-text">
              <strong>Modo Nuvem / BYOK</strong>
            </span>
          )}
          <Sliders size={13} className="settings-icon" />
        </button>

        <a
          href="/tools/montagem"
          target="_blank"
          rel="noreferrer"
          className="btn-link-nle"
          title="Abrir linha do tempo de cortes na Montagem"
        >
          <span>Ir para Montagem</span>
          <span className="nle-tag">NLE</span>
        </a>
      </div>
    </header>
  );
};
