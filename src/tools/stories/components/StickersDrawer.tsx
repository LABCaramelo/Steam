import React, { useState } from "react";
import { X, HelpCircle, BarChart3, Sliders, Timer, Link2, Music, AtSign, Image as ImageIcon } from "lucide-react";
import type { StoryLayer, WidgetType, BrandKit } from "../types";

interface StickersDrawerProps {
  activeBrandKit: BrandKit;
  onAddLayer: (layer: StoryLayer) => void;
  onClose: () => void;
}

type StickerTab = "widgets" | "badges" | "emojis" | "gifs" | "media";

const CURATED_BADGES = [
  { text: "🚨 NOVO POST", bg: "#FF701A", color: "#FFF4E8" },
  { text: "🔗 LINK NA BIO", bg: "#25BFFF", color: "#101014" },
  { text: "🔊 SOM LIGADO", bg: "#101014", color: "#FFF4E8" },
  { text: "⚡ VAGAS ABERTAS", bg: "#FFD52A", color: "#101014" },
  { text: "💡 DICA DE OURO", bg: "#7657FF", color: "#FFF4E8" },
  { text: "👆 ARRASTA PRA CIMA", bg: "#FFF4E8", color: "#101014" },
  { text: "💬 COMENTE 'QUERO'", bg: "#FF3D8D", color: "#FFF4E8" },
  { text: "👀 SPOILER EXCLUSIVO", bg: "#22222A", color: "#25BFFF" },
  { text: "🎯 PASSO A PASSO", bg: "#101014", color: "#FF701A" },
  { text: "🔥 CASO REAL", bg: "#E63946", color: "#FFFFFF" },
];

const EMOJI_GRID = [
  "🔥", "⚡", "🚀", "💡", "🎯", "✨", "👏", "🤯",
  "👀", "💬", "🧡", "👑", "📌", "🔑", "🏆", "👇",
  "👉", "👆", "💯", "📈", "💻", "💎", "⏳", "🎉"
];

const CURATED_GIFS = [
  {
    name: "Fogo Pulsante",
    url: "https://media.giphy.com/media/26tP41H7QgIbBxqgg/giphy.gif",
  },
  {
    name: "Seta Clicável",
    url: "https://media.giphy.com/media/l4KibWpBGWchSqYVO/giphy.gif",
  },
  {
    name: "Novo Post",
    url: "https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif",
  },
  {
    name: "Brilho / Stars",
    url: "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif",
  },
];

export function StickersDrawer({ activeBrandKit, onAddLayer, onClose }: StickersDrawerProps) {
  const [tab, setTab] = useState<StickerTab>("widgets");
  const [customGifUrl, setCustomGifUrl] = useState("");

  // Widget creators
  const handleAddWidget = (type: WidgetType) => {
    const id = `widget_${Date.now()}`;
    const base = {
      id,
      type: "widget" as const,
      widgetType: type,
      x: 540,
      y: 960,
      rotation: 0,
      scale: 1,
      opacity: 1,
    };

    switch (type) {
      case "question":
        onAddLayer({
          ...base,
          data: {
            question: "Faça uma pergunta...",
            primaryColor: activeBrandKit.colors.primary,
            textColor: "#FFF4E8",
          },
        });
        break;
      case "poll":
        onAddLayer({
          ...base,
          data: {
            question: "Qual o seu veredito?",
            optionA: "Opção A 🔥",
            optionB: "Opção B ⚡",
            votesA: 80,
            votesB: 20,
            primaryColor: activeBrandKit.colors.primary,
          },
        });
        break;
      case "slider":
        onAddLayer({
          ...base,
          data: {
            question: "O quanto você curtiu?",
            emoji: "🔥",
            sliderPosition: 75,
          },
        });
        break;
      case "countdown":
        onAddLayer({
          ...base,
          data: {
            countdownTitle: "LANÇAMENTO",
            targetDate: "Hoje às 20h",
            primaryColor: activeBrandKit.colors.primary,
          },
        });
        break;
      case "link":
        onAddLayer({
          ...base,
          data: {
            linkText: "🔗 TOQUE AQUI",
            url: "https://umcaracaramelo.com.br",
            primaryColor: activeBrandKit.colors.primary,
            textColor: "#101014",
          },
        });
        break;
      case "music":
        onAddLayer({
          ...base,
          data: {
            musicTitle: "Trilha Caramelo",
            musicArtist: "Laboratório · 2026",
          },
        });
        break;
      case "mention":
        onAddLayer({
          ...base,
          data: {
            username: "umcaracaramelo",
          },
        });
        break;
    }
    onClose();
  };

  const handleAddBadge = (item: { text: string; bg: string; color: string }) => {
    onAddLayer({
      id: `badge_${Date.now()}`,
      type: "sticker",
      stickerType: "badge",
      content: item.text,
      bgColor: item.bg,
      color: item.color,
      x: 540,
      y: 800,
      rotation: 0,
      scale: 1,
      opacity: 1,
    });
    onClose();
  };

  const handleAddEmoji = (emoji: string) => {
    onAddLayer({
      id: `emoji_${Date.now()}`,
      type: "sticker",
      stickerType: "emoji",
      content: emoji,
      width: 70,
      x: 540,
      y: 960,
      rotation: 0,
      scale: 1.8,
      opacity: 1,
    });
    onClose();
  };

  const handleAddGif = (url: string) => {
    if (!url) return;
    onAddLayer({
      id: `gif_${Date.now()}`,
      type: "sticker",
      stickerType: "gif",
      content: url,
      width: 320,
      x: 540,
      y: 960,
      rotation: 0,
      scale: 1,
      opacity: 1,
    });
    onClose();
  };

  const handleUploadImageSticker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      onAddLayer({
        id: `img_${Date.now()}`,
        type: "image",
        url,
        width: 420,
        height: 420,
        borderRadius: 24,
        shadow: true,
        border: true,
        borderColor: "#FFFFFF",
        borderWidth: 4,
        x: 540,
        y: 960,
        rotation: 0,
        scale: 1,
        opacity: 1,
      });
      onClose();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="stories-drawer-overlay" onClick={onClose}>
      <div className="stories-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="stories-drawer__header">
          <div className="drawer-handle-bar" />
          <div className="drawer-title-row">
            <h2>Figurinhas & Widgets</h2>
            <button type="button" className="drawer-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Subtabs */}
          <div className="drawer-tabs-scroll">
            <button
              type="button"
              className={`drawer-tab-btn ${tab === "widgets" ? "is-active" : ""}`}
              onClick={() => setTab("widgets")}
            >
              Widgets Nativos
            </button>
            <button
              type="button"
              className={`drawer-tab-btn ${tab === "badges" ? "is-active" : ""}`}
              onClick={() => setTab("badges")}
            >
              Badges & CTAs
            </button>
            <button
              type="button"
              className={`drawer-tab-btn ${tab === "emojis" ? "is-active" : ""}`}
              onClick={() => setTab("emojis")}
            >
              Emojis
            </button>
            <button
              type="button"
              className={`drawer-tab-btn ${tab === "gifs" ? "is-active" : ""}`}
              onClick={() => setTab("gifs")}
            >
              GIFs
            </button>
            <button
              type="button"
              className={`drawer-tab-btn ${tab === "media" ? "is-active" : ""}`}
              onClick={() => setTab("media")}
            >
              Foto / Sticker
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="stories-drawer__content">
          {tab === "widgets" && (
            <div className="widgets-grid">
              <button
                type="button"
                className="widget-card-btn"
                onClick={() => handleAddWidget("question")}
              >
                <div className="widget-card-btn__icon" style={{ background: "#FF701A" }}>
                  <HelpCircle size={26} color="#FFF" />
                </div>
                <div className="widget-card-btn__info">
                  <strong>Caixa de Perguntas</strong>
                  <span>Prompt personalizável para respostas</span>
                </div>
              </button>

              <button
                type="button"
                className="widget-card-btn"
                onClick={() => handleAddWidget("poll")}
              >
                <div className="widget-card-btn__icon" style={{ background: "#25BFFF" }}>
                  <BarChart3 size={26} color="#101014" />
                </div>
                <div className="widget-card-btn__info">
                  <strong>Enquete Dual</strong>
                  <span>Opções de voto com porcentagens</span>
                </div>
              </button>

              <button
                type="button"
                className="widget-card-btn"
                onClick={() => handleAddWidget("slider")}
              >
                <div className="widget-card-btn__icon" style={{ background: "#FF3D8D" }}>
                  <Sliders size={26} color="#FFF" />
                </div>
                <div className="widget-card-btn__info">
                  <strong>Slider de Emoji</strong>
                  <span>Barra deslizante de reação 🔥</span>
                </div>
              </button>

              <button
                type="button"
                className="widget-card-btn"
                onClick={() => handleAddWidget("countdown")}
              >
                <div className="widget-card-btn__icon" style={{ background: "#FFD52A" }}>
                  <Timer size={26} color="#101014" />
                </div>
                <div className="widget-card-btn__info">
                  <strong>Contagem Regressiva</strong>
                  <span>Data, horas e lembrete de lançamento</span>
                </div>
              </button>

              <button
                type="button"
                className="widget-card-btn"
                onClick={() => handleAddWidget("link")}
              >
                <div className="widget-card-btn__icon" style={{ background: "#7657FF" }}>
                  <Link2 size={26} color="#FFF" />
                </div>
                <div className="widget-card-btn__info">
                  <strong>Figurinha de Link</strong>
                  <span>Pill estilizada para URLs e cliques</span>
                </div>
              </button>

              <button
                type="button"
                className="widget-card-btn"
                onClick={() => handleAddWidget("music")}
              >
                <div className="widget-card-btn__icon" style={{ background: "#101014", border: "1px solid #333" }}>
                  <Music size={26} color="#FF701A" />
                </div>
                <div className="widget-card-btn__info">
                  <strong>Player de Música</strong>
                  <span>Capa, faixa e ondas animadas</span>
                </div>
              </button>

              <button
                type="button"
                className="widget-card-btn"
                onClick={() => handleAddWidget("mention")}
              >
                <div className="widget-card-btn__icon" style={{ background: "linear-gradient(135deg, #FF701A, #DD2A7B)" }}>
                  <AtSign size={26} color="#FFF" />
                </div>
                <div className="widget-card-btn__info">
                  <strong>Menção (@)</strong>
                  <span>Destaque para perfis de parceiros</span>
                </div>
              </button>
            </div>
          )}

          {tab === "badges" && (
            <div className="badges-list">
              {CURATED_BADGES.map((b, i) => (
                <button
                  key={i}
                  type="button"
                  className="badge-item-btn"
                  style={{ background: b.bg, color: b.color }}
                  onClick={() => handleAddBadge(b)}
                >
                  {b.text}
                </button>
              ))}
            </div>
          )}

          {tab === "emojis" && (
            <div className="emojis-matrix">
              {EMOJI_GRID.map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="emoji-matrix-btn"
                  onClick={() => handleAddEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {tab === "gifs" && (
            <div className="gifs-container">
              <div className="gif-input-row">
                <input
                  type="url"
                  placeholder="Cole o link de um GIF (GIPHY/Tenor)..."
                  value={customGifUrl}
                  onChange={(e) => setCustomGifUrl(e.target.value)}
                  className="gif-url-input"
                />
                <button
                  type="button"
                  className="gif-add-btn"
                  onClick={() => handleAddGif(customGifUrl)}
                >
                  Inserir
                </button>
              </div>

              <span className="drawer-section-sub">GIFs Recomendados:</span>
              <div className="curated-gifs-grid">
                {CURATED_GIFS.map((g, i) => (
                  <button
                    key={i}
                    type="button"
                    className="gif-preview-card"
                    onClick={() => handleAddGif(g.url)}
                  >
                    <img src={g.url} alt={g.name} loading="lazy" />
                    <span>{g.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "media" && (
            <div className="media-upload-pane">
              <label className="media-dropzone-btn">
                <ImageIcon size={36} color="#FF701A" />
                <strong>Carregar Foto como Figurinha</strong>
                <span>Formatos PNG transparente, JPG ou WebP</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadImageSticker}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
