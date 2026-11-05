import { useState, useEffect, useRef } from "react";
import { AlignLeft, AlignCenter, AlignRight, Check, CaseUpper } from "lucide-react";
import type { TextLayer, TextBackgroundMode, TextAlign, BrandKit } from "../types";

interface TextEditorModalProps {
  layer: TextLayer | null;
  activeBrandKit: BrandKit;
  onSave: (patch: Partial<TextLayer>) => void;
  onClose: () => void;
}

const POPULAR_FONTS = [
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

export function TextEditorModal({
  layer,
  activeBrandKit,
  onSave,
  onClose,
}: TextEditorModalProps) {
  const [text, setText] = useState(layer?.text || "Digite seu texto...");
  const [font, setFont] = useState(layer?.font || activeBrandKit.fonts.headline || "Space Grotesk");
  const [fontSize, setFontSize] = useState(layer?.fontSize || 48);
  const [color, setColor] = useState(layer?.color || "#FFF4E8");
  const [backgroundColor, setBackgroundColor] = useState(
    layer?.backgroundColor || activeBrandKit.colors.primary || "#FF701A"
  );
  const [align, setAlign] = useState<TextAlign>(layer?.align || "center");
  const [backgroundMode, setBackgroundMode] = useState<TextBackgroundMode>(
    layer?.backgroundMode || "none"
  );
  const [isUppercase, setIsUppercase] = useState(layer?.isUppercase || false);
  const isBold = layer?.isBold ?? true;
  const isItalic = layer?.isItalic || false;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  // Cycle alignment
  const toggleAlign = () => {
    if (align === "center") setAlign("left");
    else if (align === "left") setAlign("right");
    else setAlign("center");
  };

  // Cycle background mode: none -> pill -> box -> outline -> neon -> none
  const cycleBackgroundMode = () => {
    const modes: TextBackgroundMode[] = ["none", "pill", "box", "outline", "neon"];
    const nextIdx = (modes.indexOf(backgroundMode) + 1) % modes.length;
    setBackgroundMode(modes[nextIdx]);
  };

  const handleFinish = () => {
    onSave({
      text,
      font,
      fontSize,
      color,
      backgroundColor,
      align,
      backgroundMode,
      isUppercase,
      isBold,
      isItalic,
    });
    onClose();
  };

  // Available fonts: user uploaded custom fonts + popular Google fonts
  const allFonts = [
    ...activeBrandKit.fonts.customFonts.map((f) => f.name),
    ...POPULAR_FONTS.filter((f) => !activeBrandKit.fonts.customFonts.some((cf) => cf.name === f)),
  ];

  // Palette swatches: Brand Kit colors + essentials
  const colorSwatches = [
    activeBrandKit.colors.primary,
    activeBrandKit.colors.secondary,
    activeBrandKit.colors.accent,
    activeBrandKit.colors.textLight,
    activeBrandKit.colors.textDark,
    ...activeBrandKit.colors.custom,
    "#FFFFFF",
    "#000000",
    "#FF0055",
    "#00F5D4",
    "#FFD166",
  ].filter((c, i, arr) => arr.indexOf(c) === i);

  // Background style preview for the textarea
  const getPreviewBgStyle = (): React.CSSProperties => {
    switch (backgroundMode) {
      case "pill":
        return {
          background: backgroundColor,
          borderRadius: 24,
          padding: "16px 28px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        };
      case "box":
        return {
          background: backgroundColor,
          borderRadius: 14,
          padding: "16px 24px",
        };
      case "outline":
        return {
          WebkitTextStroke: `2px ${backgroundColor}`,
        };
      case "neon":
        return {
          textShadow: `0 0 10px ${backgroundColor}, 0 0 25px ${backgroundColor}`,
        };
      default:
        return {};
    }
  };

  return (
    <div className="text-editor-overlay">
      {/* Top action bar (Instagram style) */}
      <div className="text-editor-topbar">
        <div className="text-editor-topbar__left">
          {/* Alignment toggle */}
          <button
            type="button"
            className="text-editor-icon-btn"
            onClick={toggleAlign}
            title="Alinhamento do Texto"
            aria-label="Alinhamento"
          >
            {align === "left" && <AlignLeft size={20} />}
            {align === "center" && <AlignCenter size={20} />}
            {align === "right" && <AlignRight size={20} />}
          </button>

          {/* Background mode toggle (Instagram 'A' button) */}
          <button
            type="button"
            className={`text-editor-icon-btn text-editor-mode-btn ${
              backgroundMode !== "none" ? "is-active" : ""
            }`}
            onClick={cycleBackgroundMode}
            title={`Estilo de Fundo: ${backgroundMode}`}
            aria-label="Estilo de Fundo"
          >
            <span className="mode-btn-a">A</span>
            <span className="mode-btn-stars">✨</span>
          </button>

          {/* Uppercase toggle */}
          <button
            type="button"
            className={`text-editor-icon-btn ${isUppercase ? "is-active" : ""}`}
            onClick={() => setIsUppercase(!isUppercase)}
            title="Alternar Caixa Alta"
            aria-label="Caixa Alta"
          >
            <CaseUpper size={20} />
          </button>
        </div>

        {/* Done / Concluir button */}
        <button
          type="button"
          className="text-editor-done-btn"
          onClick={handleFinish}
          aria-label="Concluir Edição"
        >
          <Check size={18} strokeWidth={2.8} />
          <span>Concluir</span>
        </button>
      </div>

      {/* Center typing canvas */}
      <div className="text-editor-body">
        <div
          className="text-editor-input-wrapper"
          style={{ textAlign: align, ...getPreviewBgStyle() }}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite algo..."
            style={{
              fontFamily: `'${font}', sans-serif`,
              fontSize: `${fontSize}px`,
              lineHeight: 1.25,
              color: color,
              textAlign: align,
              textTransform: isUppercase ? "uppercase" : "none",
              fontWeight: isBold ? 800 : 500,
              fontStyle: isItalic ? "italic" : "normal",
            }}
            rows={Math.max(2, text.split("\n").length)}
          />
        </div>
      </div>

      {/* Bottom controls: Font selector & Color swatches */}
      <div className="text-editor-bottom">
        {/* Font size slider */}
        <div className="text-editor-slider-row">
          <span className="slider-label">Tamanho</span>
          <input
            type="range"
            min={24}
            max={96}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="text-editor-range"
          />
          <span className="slider-val">{fontSize}px</span>
        </div>

        {/* Font Selector Carousel */}
        <div className="text-editor-fonts-scroll">
          {allFonts.map((f) => (
            <button
              key={f}
              type="button"
              className={`font-pill-btn ${font === f ? "is-selected" : ""}`}
              onClick={() => setFont(f)}
              style={{ fontFamily: `'${f}', sans-serif` }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Color Palette Swatches */}
        <div className="text-editor-colors-scroll">
          {colorSwatches.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-swatch-circle ${
                backgroundMode !== "none"
                  ? backgroundColor === c
                    ? "is-active"
                    : ""
                  : color === c
                  ? "is-active"
                  : ""
              }`}
              style={{ background: c }}
              onClick={() => {
                if (backgroundMode !== "none") {
                  setBackgroundColor(c);
                } else {
                  setColor(c);
                }
              }}
              title={c}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
