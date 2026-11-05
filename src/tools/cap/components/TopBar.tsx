import { Video, Sparkles, FileVideo, Plus, Download, Share2 } from "lucide-react";
import type { CapMode, TakeRecord } from "../types";

interface TopBarProps {
  mode: CapMode;
  setMode: (mode: CapMode) => void;
  activeTake: TakeRecord | null;
  onNewTake: () => void;
  onOpenExport: () => void;
  onOpenShare: () => void;
  takesCount: number;
}

export function TopBar({
  mode,
  setMode,
  activeTake,
  onNewTake,
  onOpenExport,
  onOpenShare,
  takesCount,
}: TopBarProps) {
  return (
    <header className="cap-topbar">
      <div className="cap-brand">
        <div className="cap-logo-badge">C</div>
        <div className="cap-brand-meta">
          <div className="cap-brand-title">Cap · LAB</div>
          <div className="cap-brand-tag">Screen Studio & Loom</div>
        </div>
      </div>

      <nav className="cap-mode-tabs">
        <button
          className={`cap-mode-tab ${mode === "recorder" ? "active" : ""}`}
          onClick={() => setMode("recorder")}
          title="Modo de Gravação de Tela & Câmera"
        >
          <Video size={15} className="tab-icon" />
          <span>Gravar</span>
        </button>

        <button
          className={`cap-mode-tab ${mode === "studio" ? "active" : ""}`}
          onClick={() => setMode("studio")}
          disabled={!activeTake}
          title="Estúdio de Molduras, Zooms e Cores"
        >
          <Sparkles size={15} className="tab-icon" />
          <span>Estúdio</span>
        </button>

        <button
          className={`cap-mode-tab ${mode === "library" ? "active" : ""}`}
          onClick={() => setMode("library")}
          title="Meus Takes Gravados"
        >
          <FileVideo size={15} className="tab-icon" />
          <span>Takes ({takesCount})</span>
        </button>
      </nav>

      <div className="cap-topbar-actions">
        {mode === "studio" && activeTake && (
          <>
            <button className="cap-btn cap-btn-subtle" onClick={onOpenShare}>
              <Share2 size={14} />
              <span>Compartilhar</span>
            </button>
            <button className="cap-btn cap-btn-accent" onClick={onOpenExport}>
              <Download size={14} />
              <span>Exportar</span>
            </button>
          </>
        )}

        {mode !== "recorder" && (
          <button className="cap-btn cap-btn-subtle" onClick={onNewTake}>
            <Plus size={14} />
            <span>Novo Take</span>
          </button>
        )}
      </div>
    </header>
  );
}
