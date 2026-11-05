import { useRef } from "react";
import { HandwrittenNote, SpotlightTabs } from "@caramelo/design-system";
import type { AudioTrackOption, LogoAsset, LogoSettings, StudioMode, BrandColor } from "../types";

interface LeftRailProps {
  studioMode: StudioMode;
  onSelectStudio: (mode: StudioMode) => void;
  logo: LogoAsset | null;
  onLogoUpload: (file: File) => void;
  logoSettings: LogoSettings;
  onUpdateLogoSettings: (patch: Partial<LogoSettings>) => void;
  brandColors: BrandColor[];
  onAddColor: () => void;
  onUpdateColor: (id: string, hex: string) => void;
  onRemoveColor: (id: string) => void;
  brandName: string;
  onBrandNameChange: (name: string) => void;
  audioTracks: AudioTrackOption[];
  selectedAudioId: string;
  onSelectAudio: (id: string) => void;
  onCustomAudioUpload: (file: File) => void;
  reducedFlash: boolean;
  onToggleReducedFlash: (v: boolean) => void;
}

export function LeftRail({
  studioMode,
  onSelectStudio,
  logo,
  onLogoUpload,
  logoSettings,
  onUpdateLogoSettings,
  brandColors,
  onAddColor,
  onUpdateColor,
  onRemoveColor,
  brandName,
  onBrandNameChange,
  audioTracks,
  selectedAudioId,
  onSelectAudio,
  onCustomAudioUpload,
  reducedFlash,
  onToggleReducedFlash,
}: LeftRailProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      onLogoUpload(e.dataTransfer.files[0]);
    }
  };

  const studioTabItems = [
    {
      id: "showcase",
      label: "Match Cut (28 Cortes)",
    },
    {
      id: "pulse-v2",
      label: "Pulse 3D (No Beat)",
    },
  ];

  return (
    <aside className="dia-create-rail dia-create-rail-left">
      {/* 1. Logo Dropzone with Caramelo Human Touch */}
      <input
        ref={fileInputRef}
        id="logo-upload"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.[0]) onLogoUpload(e.target.files[0]);
        }}
      />
      <div className="dia-dropzone-wrapper">
        <label
          htmlFor="logo-upload"
          className="dia-dropzone dia-dropzone-rail cm-surface--spotlight"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <span className="dia-dropzone-icon" aria-hidden="true">
            {logo ? "✓" : "↑"}
          </span>
          <span className="dia-dropzone-label">
            {logo ? "Substituir Logo" : "Solte o vetor ou logo aqui"}
          </span>
          <span className="dia-dropzone-hint">
            {logo ? "SVG / PNG ativo no estúdio" : "ou clique para navegar · SVG, PNG, JPG, WebP"}
          </span>
        </label>
        {!logo && (
          <div className="dia-dropzone-note">
            <HandwrittenNote color="sky" rotate="-3">
              preferência por vetor SVG transparente
            </HandwrittenNote>
          </div>
        )}
      </div>

      {/* 2. Studio Switcher with SpotlightTabs */}
      <div className="dia-rail-section">
        <div className="dia-section-header">
          <h3 className="dia-rail-title">Estúdio</h3>
          <span className="dia-rail-tag">LAB Motion</span>
        </div>
        <SpotlightTabs
          items={studioTabItems}
          value={studioMode}
          onValueChange={(val) => onSelectStudio(val as StudioMode)}
          ariaLabel="Selecionar modo de estúdio"
          className="dia-studio-spotlight-tabs"
        />
      </div>

      {/* 3. Logo Controls */}
      <div className="dia-rail-section">
        <div className="dia-section-header">
          <h3 className="dia-rail-title">Geometria &amp; Escala</h3>
          <button
            type="button"
            className="dia-link-btn"
            onClick={() => onUpdateLogoSettings({ scale: 1, offsetX: 0, offsetY: 0, rotation: 0 })}
          >
            Redefinir
          </button>
        </div>

        <div className="dia-field-group">
          <div className="dia-slider-row">
            <label className="dia-slider-label">Escala do Vetor</label>
            <span className="dia-slider-val">{logoSettings.scale.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            className="dia-range"
            min="0.3"
            max="2.0"
            step="0.05"
            value={logoSettings.scale}
            onChange={(e) => onUpdateLogoSettings({ scale: parseFloat(e.target.value) })}
          />
        </div>

        <div className="dia-field-group">
          <div className="dia-slider-row">
            <label className="dia-slider-label">Deslocamento X</label>
            <span className="dia-slider-val">{logoSettings.offsetX}%</span>
          </div>
          <input
            type="range"
            className="dia-range"
            min="-40"
            max="40"
            step="1"
            value={logoSettings.offsetX}
            onChange={(e) => onUpdateLogoSettings({ offsetX: parseInt(e.target.value) })}
          />
        </div>

        <div className="dia-field-group">
          <div className="dia-slider-row">
            <label className="dia-slider-label">Deslocamento Y</label>
            <span className="dia-slider-val">{logoSettings.offsetY}%</span>
          </div>
          <input
            type="range"
            className="dia-range"
            min="-40"
            max="40"
            step="1"
            value={logoSettings.offsetY}
            onChange={(e) => onUpdateLogoSettings({ offsetY: parseInt(e.target.value) })}
          />
        </div>
      </div>

      {/* 4. Brand Colors & Name */}
      <div className="dia-rail-section">
        <div className="dia-section-header">
          <h3 className="dia-rail-title">Identidade Visual</h3>
          <button type="button" className="dia-link-btn" onClick={onAddColor}>
            + Adicionar Cor
          </button>
        </div>

        <div className="dia-field-group">
          <label className="dia-slider-label">Nome da Marca</label>
          <input
            type="text"
            className="dia-text-input"
            value={brandName}
            placeholder="Ex: Um Cara Caramelo"
            onChange={(e) => onBrandNameChange(e.target.value)}
          />
        </div>

        <div className="dia-colors-list">
          {brandColors.map((col) => (
            <div key={col.id} className="dia-color-row">
              <input
                type="color"
                className="dia-color-chip"
                value={col.hex}
                onChange={(e) => onUpdateColor(col.id, e.target.value)}
              />
              <input
                type="text"
                className="dia-hex-input"
                value={col.hex.toUpperCase()}
                onChange={(e) => onUpdateColor(col.id, e.target.value)}
              />
              <span className="dia-color-label">{col.label}</span>
              {brandColors.length > 2 && (
                <button
                  type="button"
                  className="dia-color-del-btn"
                  title="Remover cor"
                  onClick={() => onRemoveColor(col.id)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 5. Audio Tracks */}
      <div className="dia-rail-section">
        <div className="dia-section-header">
          <h3 className="dia-rail-title">Sincronização de Beat</h3>
          <button
            type="button"
            className="dia-link-btn"
            onClick={() => audioInputRef.current?.click()}
          >
            + Upload de Áudio
          </button>
        </div>
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/mp3,audio/wav,audio/ogg,.mp3,.wav,.ogg"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.[0]) onCustomAudioUpload(e.target.files[0]);
          }}
        />

        <div className="dia-audio-tracks-list">
          {audioTracks.map((track) => (
            <button
              key={track.id}
              type="button"
              className={`dia-audio-track-item ${selectedAudioId === track.id ? "is-selected" : ""}`}
              onClick={() => onSelectAudio(track.id)}
            >
              <div className="dia-track-info">
                <span className="dia-track-name">{track.name}</span>
                <span className="dia-track-bpm">{track.bpm} BPM · Web Audio</span>
              </div>
              {selectedAudioId === track.id && <span className="dia-track-badge">Ativo</span>}
            </button>
          ))}
        </div>
      </div>

      {/* 6. Accessibility Toggle */}
      <div className="dia-rail-section">
        <label className="dia-toggle-row">
          <input
            type="checkbox"
            className="dia-checkbox"
            checked={reducedFlash}
            onChange={(e) => onToggleReducedFlash(e.target.checked)}
          />
          <div className="dia-toggle-copy">
            <span className="dia-toggle-name">Reduzir Flashes</span>
            <span className="dia-toggle-sub">Suaviza contrastes rápidos para fotossensibilidade (WCAG)</span>
          </div>
        </label>
      </div>
    </aside>
  );
}
