import React, { useState } from "react";
import { X, Image, Video, Sliders } from "lucide-react";
import type { StoryBackground, BrandKit } from "../types";

interface BackgroundDrawerProps {
  background: StoryBackground;
  activeBrandKit: BrandKit;
  onChangeBackground: (bg: StoryBackground) => void;
  onClose: () => void;
}

const GRADIENT_PRESETS = [
  { name: "Caramelo Noturno", val: "linear-gradient(180deg, #181514 0%, #0d0c0d 100%)" },
  { name: "Dourado Editorial", val: "linear-gradient(135deg, #1f1812 0%, #2f2216 50%, #12100e 100%)" },
  { name: "Cyberpunk Roxo", val: "linear-gradient(135deg, #0f0c1b 0%, #22143b 50%, #090710 100%)" },
  { name: "Céu Elétrico", val: "linear-gradient(180deg, #071c26 0%, #0f354a 50%, #051017 100%)" },
  { name: "Pôr do Sol BH", val: "linear-gradient(160deg, #FF701A 0%, #FF3D8D 60%, #7657FF 100%)" },
  { name: "Creme Canônico", val: "linear-gradient(180deg, #FFF4E8 0%, #E8DC handleFinish 100%)" },
  { name: "Preto Absoluto", val: "#000000" },
  { name: "Caramelo Escuro", val: "#101014" },
];

export function BackgroundDrawer({
  background,
  activeBrandKit,
  onChangeBackground,
  onClose,
}: BackgroundDrawerProps) {
  const [tab, setTab] = useState<"colors" | "media">("colors");
  const [blur, setBlur] = useState(background.blur || 0);
  const [overlayOpacity, setOverlayOpacity] = useState(background.overlayOpacity ?? 0.2);

  const handleSelectColor = (val: string) => {
    onChangeBackground({
      type: val.includes("gradient") ? "gradient" : "color",
      value: val,
      blur,
      overlayOpacity,
      overlayColor: "#000000",
    });
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      onChangeBackground({
        type: "image",
        value: url,
        blur,
        overlayOpacity,
        overlayColor: "#000000",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleUploadVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onChangeBackground({
      type: "video",
      value: url,
      blur: 0,
      overlayOpacity,
      overlayColor: "#000000",
    });
  };

  const handleUpdateSliders = (newBlur: number, newOverlay: number) => {
    setBlur(newBlur);
    setOverlayOpacity(newOverlay);
    onChangeBackground({
      ...background,
      blur: newBlur,
      overlayOpacity: newOverlay,
    });
  };

  const brandSwatches = [
    activeBrandKit.colors.background,
    activeBrandKit.colors.primary,
    activeBrandKit.colors.secondary,
    activeBrandKit.colors.accent,
    activeBrandKit.colors.textLight,
    ...activeBrandKit.colors.custom,
  ];

  return (
    <div className="stories-drawer-overlay" onClick={onClose}>
      <div className="stories-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="stories-drawer__header">
          <div className="drawer-handle-bar" />
          <div className="drawer-title-row">
            <h2>Fundo do Story</h2>
            <button type="button" className="drawer-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="drawer-tabs-scroll">
            <button
              type="button"
              className={`drawer-tab-btn ${tab === "colors" ? "is-active" : ""}`}
              onClick={() => setTab("colors")}
            >
              Cores & Gradientes
            </button>
            <button
              type="button"
              className={`drawer-tab-btn ${tab === "media" ? "is-active" : ""}`}
              onClick={() => setTab("media")}
            >
              Foto ou Vídeo
            </button>
          </div>
        </div>

        <div className="stories-drawer__content">
          {tab === "colors" && (
            <div className="bg-colors-pane">
              <span className="drawer-section-sub">Paleta da Marca ({activeBrandKit.name})</span>
              <div className="swatches-grid">
                {brandSwatches.map((color, i) => (
                  <button
                    key={i}
                    type="button"
                    className="swatch-card-btn"
                    style={{ background: color }}
                    onClick={() => handleSelectColor(color)}
                    title={color}
                  />
                ))}
              </div>

              <span className="drawer-section-sub" style={{ marginTop: 20 }}>
                Gradientes Prontos
              </span>
              <div className="gradients-grid">
                {GRADIENT_PRESETS.map((g, i) => (
                  <button
                    key={i}
                    type="button"
                    className="gradient-card-btn"
                    style={{ background: g.val }}
                    onClick={() => handleSelectColor(g.val)}
                  >
                    <span>{g.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "media" && (
            <div className="bg-media-pane">
              <div className="upload-buttons-row">
                <label className="media-dropzone-btn media-dropzone-btn--half">
                  <Image size={32} color="#FF701A" />
                  <strong>Carregar Foto</strong>
                  <span>JPG, PNG ou WebP</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadImage}
                    style={{ display: "none" }}
                  />
                </label>

                <label className="media-dropzone-btn media-dropzone-btn--half">
                  <Video size={32} color="#25BFFF" />
                  <strong>Carregar Vídeo</strong>
                  <span>MP4 ou WebM vertical</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleUploadVideo}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              {/* Adjustments (Blur & Dark Overlay) */}
              <div className="adjustments-panel">
                <span className="drawer-section-sub">
                  <Sliders size={16} /> Ajustes de Leitura
                </span>

                <div className="adjustment-slider-item">
                  <div className="adjustment-label-row">
                    <span>Desfoque / Blur</span>
                    <span>{blur}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={25}
                    value={blur}
                    onChange={(e) => handleUpdateSliders(Number(e.target.value), overlayOpacity)}
                    className="text-editor-range"
                  />
                </div>

                <div className="adjustment-slider-item">
                  <div className="adjustment-label-row">
                    <span>Escurecer Fundo (Overlay)</span>
                    <span>{Math.round(overlayOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.9}
                    step={0.05}
                    value={overlayOpacity}
                    onChange={(e) => handleUpdateSliders(blur, Number(e.target.value))}
                    className="text-editor-range"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
