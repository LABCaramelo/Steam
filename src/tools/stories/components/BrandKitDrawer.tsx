import React, { useState } from "react";
import { X, Plus, Upload, Check, Sparkles, Paintbrush } from "lucide-react";
import type { BrandKit, CustomFont, StoryLayer } from "../types";
import { registerCustomFontInDOM } from "../store/brandStore";

interface BrandKitDrawerProps {
  brandKits: BrandKit[];
  activeBrandKit: BrandKit;
  onSelectBrandKit: (id: string) => void;
  onUpdateBrandKit: (kit: BrandKit) => void;
  onCreateBrandKit: (kit: BrandKit) => void;
  onApplyBrandKitToStory: () => void;
  onAddLayer: (layer: StoryLayer) => void;
  onClose: () => void;
}

const GOOGLE_FONTS_CHOICES = [
  "Space Grotesk",
  "Inter",
  "Playfair Display",
  "Bebas Neue",
  "Montserrat",
  "Syne",
  "Dancing Script",
  "Anton",
  "Outfit",
  "DM Serif Display",
];

export function BrandKitDrawer({
  brandKits,
  activeBrandKit,
  onSelectBrandKit,
  onUpdateBrandKit,
  onCreateBrandKit,
  onApplyBrandKitToStory,
  onAddLayer,
  onClose,
}: BrandKitDrawerProps) {
  const [tab, setTab] = useState<"colors" | "fonts" | "logo">("colors");
  const [newColorHex, setNewColorHex] = useState("#FF701A");
  const [isUploadingFont, setIsUploadingFont] = useState(false);
  const [fontUploadError, setFontUploadError] = useState<string | null>(null);

  // Add custom color to current kit
  const handleAddCustomColor = () => {
    if (!newColorHex) return;
    const current = activeBrandKit.colors.custom || [];
    if (!current.includes(newColorHex)) {
      onUpdateBrandKit({
        ...activeBrandKit,
        colors: {
          ...activeBrandKit.colors,
          custom: [...current, newColorHex],
        },
      });
    }
  };

  // Upload custom font file (.ttf, .otf, .woff, .woff2)
  const handleUploadFont = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFont(true);
    setFontUploadError(null);

    try {
      const fontName = file.name.replace(/\.[^/.]+$/, "");
      const reader = new FileReader();

      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        const customFont: CustomFont = {
          name: fontName,
          dataBase64: dataUrl,
          format: file.name.split(".").pop()?.toLowerCase(),
        };

        const ok = await registerCustomFontInDOM(customFont);
        if (ok) {
          const updatedFonts = [
            ...activeBrandKit.fonts.customFonts.filter((f) => f.name !== fontName),
            customFont,
          ];
          onUpdateBrandKit({
            ...activeBrandKit,
            fonts: {
              ...activeBrandKit.fonts,
              headline: fontName,
              customFonts: updatedFonts,
            },
          });
        } else {
          setFontUploadError("Não foi possível processar o arquivo de fonte.");
        }
        setIsUploadingFont(false);
      };

      reader.readAsDataURL(file);
    } catch {
      setFontUploadError("Erro ao ler o arquivo de fonte.");
      setIsUploadingFont(false);
    }
  };

  // Upload brand logo
  const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const logoUrl = event.target?.result as string;
      onUpdateBrandKit({
        ...activeBrandKit,
        logoUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  // Insert logo onto canvas
  const handleInsertLogo = () => {
    if (!activeBrandKit.logoUrl) return;
    onAddLayer({
      id: `logo_${Date.now()}`,
      type: "image",
      url: activeBrandKit.logoUrl,
      width: 220,
      height: 220,
      borderRadius: 16,
      shadow: true,
      border: false,
      borderColor: "#FFF",
      borderWidth: 0,
      x: 930,
      y: 320,
      rotation: 0,
      scale: 1,
      opacity: 1,
    });
    onClose();
  };

  const handleCreateNewKit = () => {
    const newKit: BrandKit = {
      id: `brand_${Date.now()}`,
      name: `Nova Marca ${brandKits.length + 1}`,
      colors: {
        primary: "#FF701A",
        secondary: "#25BFFF",
        accent: "#FFD52A",
        background: "#101014",
        textLight: "#FFF4E8",
        textDark: "#101014",
        custom: [],
      },
      fonts: {
        headline: "Space Grotesk",
        body: "Inter",
        customFonts: [],
      },
    };
    onCreateBrandKit(newKit);
  };

  return (
    <div className="stories-drawer-overlay" onClick={onClose}>
      <div className="stories-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="stories-drawer__header">
          <div className="drawer-handle-bar" />
          <div className="drawer-title-row">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Sparkles size={22} color="#FF701A" />
              <h2>Identidade Visual & Marca</h2>
            </div>
            <button type="button" className="drawer-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Brand Switcher Pill Bar */}
          <div className="brand-switcher-row">
            {brandKits.map((kit) => (
              <button
                key={kit.id}
                type="button"
                className={`brand-chip-btn ${kit.id === activeBrandKit.id ? "is-active" : ""}`}
                onClick={() => onSelectBrandKit(kit.id)}
              >
                <span
                  className="brand-color-dot"
                  style={{ background: kit.colors.primary }}
                />
                <span>{kit.name}</span>
              </button>
            ))}
            <button
              type="button"
              className="brand-chip-btn"
              onClick={handleCreateNewKit}
              title="Adicionar nova marca"
            >
              <Plus size={14} />
              <span>Nova Marca</span>
            </button>
          </div>

          {/* Subtabs */}
          <div className="drawer-tabs-scroll">
            <button
              type="button"
              className={`drawer-tab-btn ${tab === "colors" ? "is-active" : ""}`}
              onClick={() => setTab("colors")}
            >
              Paleta de Cores
            </button>
            <button
              type="button"
              className={`drawer-tab-btn ${tab === "fonts" ? "is-active" : ""}`}
              onClick={() => setTab("fonts")}
            >
              Tipografia & Fontes
            </button>
            <button
              type="button"
              className={`drawer-tab-btn ${tab === "logo" ? "is-active" : ""}`}
              onClick={() => setTab("logo")}
            >
              Logo & Selo
            </button>
          </div>
        </div>

        <div className="stories-drawer__content">
          {/* TAB 1: CORES */}
          {tab === "colors" && (
            <div className="brand-colors-pane">
              <button
                type="button"
                className="apply-brand-btn"
                onClick={onApplyBrandKitToStory}
              >
                <Paintbrush size={18} />
                <span>Aplicar Paleta no Story Atual</span>
              </button>

              <span className="drawer-section-sub">Cores Principais da Marca:</span>
              <div className="brand-palette-grid">
                {[
                  { label: "Primária", key: "primary", val: activeBrandKit.colors.primary },
                  { label: "Secundária", key: "secondary", val: activeBrandKit.colors.secondary },
                  { label: "Destaque", key: "accent", val: activeBrandKit.colors.accent },
                  { label: "Fundo Escuro", key: "background", val: activeBrandKit.colors.background },
                  { label: "Texto Claro", key: "textLight", val: activeBrandKit.colors.textLight },
                  { label: "Texto Escuro", key: "textDark", val: activeBrandKit.colors.textDark },
                ].map((item) => (
                  <div key={item.key} className="palette-color-card">
                    <div
                      className="palette-color-preview"
                      style={{ background: item.val }}
                    >
                      <input
                        type="color"
                        value={item.val.startsWith("#") ? item.val : "#FF701A"}
                        onChange={(e) => {
                          onUpdateBrandKit({
                            ...activeBrandKit,
                            colors: {
                              ...activeBrandKit.colors,
                              [item.key]: e.target.value,
                            },
                          });
                        }}
                      />
                    </div>
                    <div className="palette-color-info">
                      <span className="palette-color-label">{item.label}</span>
                      <span className="palette-color-hex">{item.val}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom colors */}
              <span className="drawer-section-sub" style={{ marginTop: 24 }}>
                Cores Extras Salvas:
              </span>
              <div className="custom-colors-row">
                {activeBrandKit.colors.custom?.map((c, i) => (
                  <div
                    key={i}
                    className="custom-color-badge"
                    style={{ background: c }}
                    title={c}
                  />
                ))}

                <div className="add-color-picker-wrapper">
                  <input
                    type="color"
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    className="native-color-input"
                  />
                  <button
                    type="button"
                    className="add-color-confirm-btn"
                    onClick={handleAddCustomColor}
                  >
                    <Plus size={16} /> Salvar Cor
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIPOGRAFIA */}
          {tab === "fonts" && (
            <div className="brand-fonts-pane">
              {/* Custom font upload area */}
              <div className="font-uploader-card">
                <div className="font-uploader-header">
                  <Upload size={22} color="#FF701A" />
                  <div>
                    <strong>Fazer Upload de Fonte Própria</strong>
                    <p>Suba seus arquivos .TTF, .OTF, .WOFF ou .WOFF2</p>
                  </div>
                </div>

                <label className="font-upload-label">
                  <input
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2"
                    onChange={handleUploadFont}
                    style={{ display: "none" }}
                  />
                  {isUploadingFont ? "Processando fonte..." : "Selecionar Arquivo de Fonte ↗"}
                </label>

                {fontUploadError && <div className="font-error-msg">{fontUploadError}</div>}

                {/* List of custom fonts */}
                {activeBrandKit.fonts.customFonts.length > 0 && (
                  <div className="custom-fonts-list">
                    <span className="drawer-section-sub">Fontes da sua marca carregadas:</span>
                    {activeBrandKit.fonts.customFonts.map((f) => (
                      <div
                        key={f.name}
                        className={`custom-font-item ${
                          activeBrandKit.fonts.headline === f.name ? "is-selected" : ""
                        }`}
                        onClick={() =>
                          onUpdateBrandKit({
                            ...activeBrandKit,
                            fonts: { ...activeBrandKit.fonts, headline: f.name },
                          })
                        }
                      >
                        <span style={{ fontFamily: `'${f.name}', sans-serif`, fontSize: 20 }}>
                          {f.name}
                        </span>
                        {activeBrandKit.fonts.headline === f.name && (
                          <Check size={18} color="#FF701A" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Headline font selector */}
              <span className="drawer-section-sub" style={{ marginTop: 24 }}>
                Fonte de Título (Headline):
              </span>
              <div className="fonts-selection-grid">
                {GOOGLE_FONTS_CHOICES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`font-select-card ${
                      activeBrandKit.fonts.headline === f ? "is-active" : ""
                    }`}
                    onClick={() =>
                      onUpdateBrandKit({
                        ...activeBrandKit,
                        fonts: { ...activeBrandKit.fonts, headline: f },
                      })
                    }
                  >
                    <span style={{ fontFamily: `'${f}', sans-serif`, fontSize: 22 }}>{f}</span>
                    <span className="font-sample">Laboratório de Interação</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: LOGO */}
          {tab === "logo" && (
            <div className="brand-logo-pane">
              {activeBrandKit.logoUrl ? (
                <div className="logo-preview-card">
                  <img src={activeBrandKit.logoUrl} alt="Logo da Marca" className="brand-logo-img" />
                  <div className="logo-actions-row">
                    <button type="button" className="apply-brand-btn" onClick={handleInsertLogo}>
                      + Inserir Logo no Story
                    </button>
                    <label className="reupload-logo-btn">
                      Trocar Logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadLogo}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <label className="media-dropzone-btn">
                  <Upload size={36} color="#FF701A" />
                  <strong>Carregar Logo da Marca</strong>
                  <span>Recomendado arquivo PNG com fundo transparente</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadLogo}
                    style={{ display: "none" }}
                  />
                </label>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
