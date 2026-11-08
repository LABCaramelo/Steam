import React from "react";
import type { AmpliaMode } from "../types";

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (presetId: string, mode: AmpliaMode) => void;
}

const PRESETS = [
  {
    id: "carrossel_head",
    title: "Capa de Carrossel HEAD (Atenção & Retenção)",
    badge: "INSTAGRAM 4K",
    mode: "upscale" as AmpliaMode,
    desc: "Upscale 4x com modelo Real-ESRGAN e nitidez adaptativa. Transforma keyframes gerados em IA em capas ultranítidas no feed (1080x1350) sem perder textura.",
  },
  {
    id: "model_sheet_face",
    title: "Consistência de Personagem (Model Sheet)",
    badge: "GFPGAN + UPSCALE",
    mode: "face_restore" as AmpliaMode,
    desc: "Recupera íris, dentes, sobrancelhas e poros em retratos do Luiz ou de personagens do Laboratório de Interação, corrigindo aberrações de geradores de imagem.",
  },
  {
    id: "sticker_layer",
    title: "Isolamento de Personagem (Sticker & Camada)",
    badge: "BIREFNET PNG",
    mode: "bg_remove" as AmpliaMode,
    desc: "Recorte milimétrico com detecção de fios de cabelo e contorno suave. Perfeito para sobrepor sujeitos em frente a tipografias na Prancheta e Stories Maker.",
  },
  {
    id: "reels_voiceover",
    title: "Voiceover de Reels (-14 LUFS & Denoise)",
    badge: "DSP + DEEPFILTER",
    mode: "audio_studio" as AmpliaMode,
    desc: "Limpa ruído de fundo do microfone e normaliza a masterização para o padrão exato de streaming (-14 LUFS True Peak -0.5 dB) com presença e brilho.",
  },
  {
    id: "magic_clean",
    title: "Remoção de Textos & Marcas D'água",
    badge: "LAMA INPAINT",
    mode: "magic_eraser" as AmpliaMode,
    desc: "Apaga logotipos indesejados, cabos, artefatos de IA ou textos flutuantes com reconstrução de textura profunda através de Large Mask Inpainting.",
  },
];

export const PresetsModal: React.FC<PresetsModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="amplia-modal-backdrop" onClick={onClose}>
      <div className="amplia-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="amplia-modal-header">
          <div>
            <h3 className="amplia-modal-title">Presets Oficiais Caramelo</h3>
            <p className="amplia-modal-desc">
              Fluxos pré-calibrados para os formatos centrais do Laboratório de Interação.
            </p>
          </div>
          <button type="button" className="amplia-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="amplia-presets-grid">
          {PRESETS.map((preset) => (
            <div
              key={preset.id}
              className="amplia-preset-card"
              onClick={() => {
                onSelectPreset(preset.id, preset.mode);
                onClose();
              }}
            >
              <div className="amplia-preset-card-top">
                <span className="amplia-preset-badge">{preset.badge}</span>
                <span className="amplia-preset-arrow">➔</span>
              </div>
              <h4 className="amplia-preset-title">{preset.title}</h4>
              <p className="amplia-preset-text">{preset.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
