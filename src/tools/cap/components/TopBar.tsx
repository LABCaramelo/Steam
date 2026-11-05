import { Isotype, MagneticButton, SpotlightTabs, type TabItem } from "@caramelo/design-system";
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
  const tabItems: TabItem[] = [
    {
      id: "recorder",
      label: "Gravar",
      icon: <Video size={14} />,
    },
    {
      id: "studio",
      label: "Estúdio",
      icon: <Sparkles size={14} />,
      disabled: !activeTake,
    },
    {
      id: "library",
      label: `Takes (${takesCount})`,
      icon: <FileVideo size={14} />,
    },
  ];

  return (
    <header className="cap-topbar">
      <div className="cap-brand">
        <div className="cap-logo-badge" title="Cap — Screen Studio do LAB">
          <Isotype variant="spectrum" size={22} decorative interactive />
        </div>
        <div className="cap-brand-meta">
          <div className="cap-brand-title">Cap · LAB</div>
          <div className="cap-brand-tag">Screen Studio & Loom</div>
        </div>
      </div>

      <nav aria-label="Navegação do Cap">
        <SpotlightTabs
          ariaLabel="Modo de Trabalho"
          variant="pill"
          value={mode}
          onValueChange={(id) => setMode(id as CapMode)}
          items={tabItems}
        />
      </nav>

      <div className="cap-topbar-actions">
        {mode === "studio" && activeTake && (
          <>
            <MagneticButton
              variant="surface"
              size="sm"
              onClick={onOpenShare}
              icon={<Share2 size={13} />}
            >
              Compartilhar
            </MagneticButton>
            <MagneticButton
              variant="accent"
              size="sm"
              onClick={onOpenExport}
              icon={<Download size={13} />}
            >
              Exportar
            </MagneticButton>
          </>
        )}

        {mode !== "recorder" && (
          <MagneticButton
            variant="surface"
            size="sm"
            onClick={onNewTake}
            icon={<Plus size={13} />}
          >
            Novo Take
          </MagneticButton>
        )}
      </div>
    </header>
  );
}
