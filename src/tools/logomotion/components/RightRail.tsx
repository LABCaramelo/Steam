import { useState } from "react";
import { MagneticButton } from "@caramelo/design-system";
import type { ExportState, FrameItem, FrameKind } from "../types";

interface RightRailProps {
  frames: FrameItem[];
  activeFrameIndex: number;
  onSelectFrame: (idx: number) => void;
  onToggleInvertFrame: (idx: number) => void;
  onRemoveFrame: (idx: number) => void;
  onMoveFrame: (idx: number, direction: "up" | "down") => void;
  onAddFrame: (kind: FrameKind, label: string, imgSrc?: string) => void;
  exportState: ExportState;
  onStartExport: () => void;
}

export function RightRail({
  frames,
  activeFrameIndex,
  onSelectFrame,
  onToggleInvertFrame,
  onRemoveFrame,
  onMoveFrame,
  onAddFrame,
  exportState,
  onStartExport,
}: RightRailProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const MOCKUP_OPTIONS = [
    { label: "Cartão Postal", imgSrc: "/tools/logomotion/frames/card.png" },
    { label: "Rocha Natural", imgSrc: "/tools/logomotion/frames/rock.jpg" },
    { label: "Painel de Vidro", imgSrc: "/tools/logomotion/frames/glass_panel.jpg" },
    { label: "Globo 3D", imgSrc: "/tools/logomotion/frames/globe.jpg" },
    { label: "Óculos & Retrato", imgSrc: "/tools/logomotion/frames/person_glasses.png" },
    { label: "Eco Tote Bag", imgSrc: "/tools/logomotion/frames/tote_bag.png" },
    { label: "Smartphone", imgSrc: "/tools/logomotion/frames/phone.png" },
  ];

  return (
    <aside className="dia-create-rail dia-create-rail-right">
      {/* 1. Export Action with Caramelo MagneticButton */}
      <div className="dia-rail-block dia-rail-block-export">
        <div className="dia-export-block">
          <MagneticButton
            variant="accent"
            size="lg"
            block={true}
            disabled={exportState.isExporting}
            onClick={onStartExport}
            className="dia-caramelo-export-btn"
          >
            {exportState.isExporting ? (
              <span className="dia-export-loading-label">
                <span className="dia-spinner" /> {exportState.status}
              </span>
            ) : (
              <span className="dia-export-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" />
                </svg>
                Baixar Vídeo (1080x1920)
              </span>
            )}
          </MagneticButton>
        </div>
      </div>

      {/* 2. Frames Sequence */}
      <div className="dia-rail-block dia-rail-block-frames">
        <div className="dia-frames-header">
          <div className="dia-frames-title-row">
            <h3 className="dia-rail-title">Sequência de Cortes</h3>
            <span className="dia-frames-counter">{frames.length} frames</span>
          </div>

          <div className="dia-add-frame-wrapper">
            <button
              type="button"
              className="dia-frame-order-add"
              onClick={() => setShowAddMenu(!showAddMenu)}
            >
              + Adicionar Frame
            </button>

            {showAddMenu && (
              <div className="dia-add-menu-dropdown">
                <div className="dia-menu-section-label">Mockups Realistas</div>
                {MOCKUP_OPTIONS.map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    className="dia-menu-item"
                    onClick={() => {
                      onAddFrame("mockup", m.label, m.imgSrc);
                      setShowAddMenu(false);
                    }}
                  >
                    {m.label}
                  </button>
                ))}
                <div className="dia-menu-section-label">Especiais</div>
                <button
                  type="button"
                  className="dia-menu-item"
                  onClick={() => {
                    onAddFrame("construction", "Grid de Construção");
                    setShowAddMenu(false);
                  }}
                >
                  Grid Técnico de Construção
                </button>
                <button
                  type="button"
                  className="dia-menu-item"
                  onClick={() => {
                    onAddFrame("palette", "Paleta de Cores");
                    setShowAddMenu(false);
                  }}
                >
                  Paleta de Cores
                </button>
                <button
                  type="button"
                  className="dia-menu-item"
                  onClick={() => {
                    onAddFrame("gradient", "Gradiente de Marca");
                    setShowAddMenu(false);
                  }}
                >
                  Gradiente Cinemático
                </button>
                <button
                  type="button"
                  className="dia-menu-item"
                  onClick={() => {
                    onAddFrame("solid", "Cor Sólida");
                    setShowAddMenu(false);
                  }}
                >
                  Cor Sólida
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Frames List */}
        <ol className="dia-frame-order-list" aria-label="Ordem dos frames">
          {frames.map((frame, idx) => {
            const isActive = idx === activeFrameIndex;
            return (
              <li
                key={frame.id}
                className={`dia-frame-order-item ${isActive ? "is-selected" : ""} ${
                  frame.inverted ? "is-inverted" : ""
                }`}
              >
                <div className="dia-frame-order-item-row">
                  {/* Reorder Buttons */}
                  <div className="dia-order-controls">
                    <button
                      type="button"
                      className="dia-order-btn"
                      disabled={idx === 0}
                      onClick={() => onMoveFrame(idx, "up")}
                      title="Mover para cima"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="dia-order-btn"
                      disabled={idx === frames.length - 1}
                      onClick={() => onMoveFrame(idx, "down")}
                      title="Mover para baixo"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Body click to select */}
                  <button
                    type="button"
                    className="dia-frame-order-body"
                    onClick={() => onSelectFrame(idx)}
                  >
                    <div className="dia-frame-order-thumb">
                      {frame.kind === "mockup" && frame.imgSrc ? (
                        <img
                          src={frame.imgSrc}
                          alt=""
                          className={`dia-frame-thumb-photo ${frame.inverted ? "is-inverted-thumb" : ""}`}
                        />
                      ) : (
                        <div
                          className="dia-frame-thumb-fill"
                          style={{
                            background:
                              frame.kind === "construction"
                                ? "#0D1B2A"
                                : frame.kind === "gradient"
                                ? "linear-gradient(135deg, #FF701A, #25BFFF)"
                                : frame.bgColor || "#FF701A",
                          }}
                        />
                      )}
                    </div>

                    <div className="dia-frame-order-meta">
                      <span className="dia-frame-order-index">{idx + 1}</span>
                      <span className="dia-frame-order-label">
                        {frame.label} {frame.inverted ? "(invertido)" : ""}
                      </span>
                    </div>
                  </button>

                  {/* Invert Toggle */}
                  <button
                    type="button"
                    className={`dia-invert-btn ${frame.inverted ? "is-active" : ""}`}
                    title={frame.inverted ? "Remover inversão" : "Inverter contraste"}
                    onClick={() => onToggleInvertFrame(idx)}
                  >
                    ◑
                  </button>

                  {/* Delete */}
                  {frames.length > 3 && (
                    <button
                      type="button"
                      className="dia-frame-order-remove"
                      title="Remover frame"
                      onClick={() => onRemoveFrame(idx)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
