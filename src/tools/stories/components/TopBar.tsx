import { useState, useRef, useEffect } from "react";
import {
  Type,
  Smile,
  Palette,
  Sparkles,
  LayoutTemplate,
  RotateCcw,
  RotateCw,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  QrCode,
  Trash2,
  PenTool,
  MoreHorizontal,
  FolderHeart,
  X,
} from "lucide-react";
import type { ActiveDrawer } from "../types";

interface TopBarProps {
  activeDrawer: ActiveDrawer;
  onOpenDrawer: (drawer: ActiveDrawer) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  showSafeZones: boolean;
  onToggleSafeZones: () => void;
  isAudioMuted: boolean;
  onToggleAudio: () => void;
  onNewText: () => void;
  onOpenDrawing: () => void;
  onReset: () => void;
}

export function TopBar({
  activeDrawer,
  onOpenDrawer,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showSafeZones,
  onToggleSafeZones,
  isAudioMuted,
  onToggleAudio,
  onNewText,
  onOpenDrawing,
  onReset,
}: TopBarProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close more menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    }
    if (showMoreMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMoreMenu]);

  return (
    <header className="stories-topbar ig-stories-header">
      {/* Left: Discard / Reset & History */}
      <div className="ig-header-left">
        <button
          type="button"
          className="ig-icon-btn ig-icon-btn--close"
          onClick={() => {
            if (window.confirm("Limpar e recomeçar story?")) {
              onReset();
            }
          }}
          title="Limpar / Recomeçar Story"
          aria-label="Limpar Story"
        >
          <X size={20} strokeWidth={2.4} />
        </button>

        {canUndo && (
          <button
            type="button"
            className="ig-icon-btn ig-icon-btn--undo"
            onClick={onUndo}
            title="Desfazer"
            aria-label="Desfazer"
          >
            <RotateCcw size={17} strokeWidth={2.4} />
          </button>
        )}

        {canRedo && (
          <button
            type="button"
            className="ig-icon-btn ig-icon-btn--redo"
            onClick={onRedo}
            title="Refazer"
            aria-label="Refazer"
          >
            <RotateCw size={17} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {/* Right: Instagram Stories Core 5 Creation Tools */}
      <div className="ig-header-right">
        {/* 1. Text tool (Aa) */}
        <button
          type="button"
          className={`ig-icon-btn ig-icon-btn--text ${activeDrawer === "text" ? "is-active" : ""}`}
          onClick={onNewText}
          title="Digitar Texto (Aa)"
          aria-label="Texto"
        >
          <Type size={20} strokeWidth={2.4} />
        </button>

        {/* 2. Stickers & Widgets (Peeling smiley) */}
        <button
          type="button"
          className={`ig-icon-btn ig-icon-btn--sticker ${
            activeDrawer === "stickers" ? "is-active" : ""
          }`}
          onClick={() => onOpenDrawer(activeDrawer === "stickers" ? "none" : "stickers")}
          title="Figurinhas e Widgets Interativos (Enquetes, Caixas de Pergunta, etc.)"
          aria-label="Figurinhas"
        >
          <Smile size={20} strokeWidth={2.2} />
        </button>

        {/* 3. Brush / Drawing tool (pencil) */}
        <button
          type="button"
          className="ig-icon-btn ig-icon-btn--brush"
          onClick={onOpenDrawing}
          title="Desenhar (Caneta, Marcador, Neon, Borracha)"
          aria-label="Desenhar"
        >
          <PenTool size={18} strokeWidth={2.3} />
        </button>

        {/* 4. Filters & Effects (Sparkles ✨) */}
        <button
          type="button"
          className={`ig-icon-btn ig-icon-btn--filters ${
            activeDrawer === "filters" ? "is-active" : ""
          }`}
          onClick={() => onOpenDrawer(activeDrawer === "filters" ? "none" : "filters")}
          title="Filtros & Efeitos de Story"
          aria-label="Filtros"
        >
          <Sparkles size={19} strokeWidth={2.3} />
        </button>

        {/* 5. More options (•••) */}
        <div className="ig-more-menu-wrapper" ref={moreMenuRef}>
          <button
            type="button"
            className={`ig-icon-btn ig-icon-btn--more ${showMoreMenu ? "is-active" : ""}`}
            onClick={() => setShowMoreMenu((v) => !v)}
            title="Mais Opções e Configurações"
            aria-label="Mais opções"
          >
            <MoreHorizontal size={20} strokeWidth={2.5} />
          </button>

          {showMoreMenu && (
            <div className="ig-more-dropdown-menu">
              {/* Templates */}
              <button
                type="button"
                className="ig-dropdown-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  onOpenDrawer("templates");
                }}
              >
                <LayoutTemplate size={18} color="#FF701A" />
                <div className="dropdown-label-group">
                  <span className="dropdown-label-primary">Templates & Diagramações</span>
                  <span className="dropdown-label-sub">Carregar ou salvar layouts</span>
                </div>
              </button>

              {/* Background / Video */}
              <button
                type="button"
                className="ig-dropdown-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  onOpenDrawer("background");
                }}
              >
                <Palette size={18} color="#25BFFF" />
                <div className="dropdown-label-group">
                  <span className="dropdown-label-primary">Fundo & Mídia</span>
                  <span className="dropdown-label-sub">Cores, degradês, fotos e vídeos</span>
                </div>
              </button>

              {/* Brand Kit */}
              <button
                type="button"
                className="ig-dropdown-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  onOpenDrawer("brand");
                }}
              >
                <FolderHeart size={18} color="#FF3D8D" />
                <div className="dropdown-label-group">
                  <span className="dropdown-label-primary">Identidade Visual & Fontes</span>
                  <span className="dropdown-label-sub">Paletas do usuário e tipografias</span>
                </div>
              </button>

              {/* Audio Toggle */}
              <button
                type="button"
                className="ig-dropdown-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  onToggleAudio();
                }}
              >
                {isAudioMuted ? (
                  <VolumeX size={18} color="#E06C75" />
                ) : (
                  <Volume2 size={18} color="#98C379" />
                )}
                <div className="dropdown-label-group">
                  <span className="dropdown-label-primary">
                    {isAudioMuted ? "Ativar Áudio do Story" : "Silenciar Áudio do Story"}
                  </span>
                  <span className="dropdown-label-sub">
                    {isAudioMuted ? "Som desativado" : "Som ativo"}
                  </span>
                </div>
              </button>

              {/* Safe Zones */}
              <button
                type="button"
                className="ig-dropdown-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  onToggleSafeZones();
                }}
              >
                {showSafeZones ? <EyeOff size={18} /> : <Eye size={18} />}
                <div className="dropdown-label-group">
                  <span className="dropdown-label-primary">
                    {showSafeZones ? "Ocultar Linhas Guia" : "Exibir Linhas Guia (Safe Zone)"}
                  </span>
                  <span className="dropdown-label-sub">Limites superior e inferior</span>
                </div>
              </button>

              {/* Wi-Fi Mobile Connect */}
              <button
                type="button"
                className="ig-dropdown-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  onOpenDrawer("qrcode");
                }}
              >
                <QrCode size={18} color="#00F5D4" />
                <div className="dropdown-label-group">
                  <span className="dropdown-label-primary">Celular via Wi-Fi</span>
                  <span className="dropdown-label-sub">Acessar em outros aparelhos</span>
                </div>
              </button>

              <div className="ig-dropdown-divider" />

              {/* Clear Story */}
              <button
                type="button"
                className="ig-dropdown-item ig-dropdown-item--danger"
                onClick={() => {
                  setShowMoreMenu(false);
                  if (window.confirm("Limpar todos os elementos deste story?")) {
                    onReset();
                  }
                }}
              >
                <Trash2 size={18} />
                <div className="dropdown-label-group">
                  <span className="dropdown-label-primary">Limpar Story</span>
                  <span className="dropdown-label-sub">Remover todos os textos e figurinhas</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
