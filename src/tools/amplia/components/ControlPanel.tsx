import React from "react";
import type {
  AmpliaMode,
  AudioStudioSettings,
  BgRemoveSettings,
  EngineStatus,
  MediaAsset,
  RestoreSettings,
  UpscaleSettings,
  VideoToolsSettings,
} from "../types";

interface ControlPanelProps {
  mode: AmpliaMode;
  asset: MediaAsset | null;
  engineStatus: EngineStatus;
  upscaleSettings: UpscaleSettings;
  setUpscaleSettings: React.Dispatch<React.SetStateAction<UpscaleSettings>>;
  bgSettings: BgRemoveSettings;
  setBgSettings: React.Dispatch<React.SetStateAction<BgRemoveSettings>>;
  brushSize: number;
  setBrushSize: (size: number) => void;
  restoreSettings: RestoreSettings;
  setRestoreSettings: React.Dispatch<React.SetStateAction<RestoreSettings>>;
  audioSettings: AudioStudioSettings;
  setAudioSettings: React.Dispatch<React.SetStateAction<AudioStudioSettings>>;
  videoSettings: VideoToolsSettings;
  setVideoSettings: React.Dispatch<React.SetStateAction<VideoToolsSettings>>;
  isProcessing: boolean;
  onRunProcess: () => void;
  onDownloadResult: () => void;
}

const CARAMELO_PALETTE = [
  { name: "Transparente", hex: "transparent" },
  { name: "Ink Black", hex: "#101014" },
  { name: "Warm Cream", hex: "#FFF4E8" },
  { name: "Caramel Orange", hex: "#FF701A" },
  { name: "Electric Sky", hex: "#25BFFF" },
  { name: "Hot Pink", hex: "#FF3D8D" },
  { name: "Acid Yellow", hex: "#FFD52A" },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  mode,
  asset,
  engineStatus,
  upscaleSettings,
  setUpscaleSettings,
  bgSettings,
  setBgSettings,
  brushSize,
  setBrushSize,
  restoreSettings,
  setRestoreSettings,
  audioSettings,
  setAudioSettings,
  videoSettings,
  setVideoSettings,
  isProcessing,
  onRunProcess,
  onDownloadResult,
}) => {
  return (
    <aside className="amplia-control-panel">
      <div className="amplia-panel-header">
        <h2 className="amplia-panel-title">
          {mode === "upscale" && "Super-Resolução 8K"}
          {mode === "face_restore" && "Restauração Facial"}
          {mode === "bg_remove" && "Recorte de Fundo & Camadas"}
          {mode === "magic_eraser" && "Borracha Mágica Generativa"}
          {mode === "denoise_deblur" && "Limpeza & Nitidez"}
          {mode === "colorize" && "Colorização de Fotos Antigas"}
          {mode === "audio_studio" && "Estúdio de Masterização & Stems"}
          {mode === "video_tools" && "Vídeo 4K & Otimizador"}
        </h2>
        <span className="amplia-panel-badge">
          {engineStatus.connected ? "Motor Local Ativo" : "Nativo do Navegador"}
        </span>
      </div>

      <div className="amplia-panel-body">
        {/* Upscale Controls */}
        {mode === "upscale" && (
          <div className="amplia-section">
            <label className="amplia-label">Fator de Ampliação</label>
            <div className="amplia-btn-group">
              {[2, 4, 8].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`amplia-group-btn ${upscaleSettings.scale === s ? "active" : ""}`}
                  onClick={() => setUpscaleSettings((prev) => ({ ...prev, scale: s as 2 | 4 | 8 }))}
                >
                  {s}x
                </button>
              ))}
            </div>

            <label className="amplia-label" style={{ marginTop: "16px" }}>Modelo de IA</label>
            <div className="amplia-select-box">
              <select
                value={upscaleSettings.model}
                onChange={(e) =>
                  setUpscaleSettings((prev) => ({
                    ...prev,
                    model: e.target.value as any,
                  }))
                }
              >
                <option value="realesrgan-x4plus">Real-ESRGAN x4plus (Fotográfico & Geral)</option>
                <option value="realesrgan-x4plus-anime">Real-ESRGAN Anime (Ilustração & Caramelo)</option>
                <option value="quick-cas">Rápido CAS (Contraste Adaptativo no Navegador)</option>
                <option value="enhance">Enhance (Preserva Resolução + Limpeza Fina)</option>
              </select>
            </div>

            <div className="amplia-toggle-row" style={{ marginTop: "16px" }}>
              <div>
                <span className="amplia-toggle-title">Restauração Facial (GFPGAN)</span>
                <span className="amplia-toggle-desc">Recupera olhos, boca e microtexturas de pele</span>
              </div>
              <input
                type="checkbox"
                checked={upscaleSettings.faceRestore}
                onChange={(e) =>
                  setUpscaleSettings((prev) => ({
                    ...prev,
                    faceRestore: e.target.checked,
                  }))
                }
              />
            </div>

            {upscaleSettings.faceRestore && (
              <div className="amplia-slider-block">
                <div className="amplia-slider-header">
                  <span>Intensidade Facial</span>
                  <span>{upscaleSettings.faceStrength}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={upscaleSettings.faceStrength}
                  onChange={(e) =>
                    setUpscaleSettings((prev) => ({
                      ...prev,
                      faceStrength: Number(e.target.value),
                    }))
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* Background Removal Controls */}
        {mode === "bg_remove" && (
          <div className="amplia-section">
            <label className="amplia-label">Modo de Saída</label>
            <div className="amplia-btn-group">
              <button
                type="button"
                className={`amplia-group-btn ${bgSettings.mode === "transparent" ? "active" : ""}`}
                onClick={() => setBgSettings((prev) => ({ ...prev, mode: "transparent" }))}
              >
                Transparente (PNG)
              </button>
              <button
                type="button"
                className={`amplia-group-btn ${bgSettings.mode === "solid" ? "active" : ""}`}
                onClick={() => setBgSettings((prev) => ({ ...prev, mode: "solid" }))}
              >
                Cor Sólida
              </button>
            </div>

            {bgSettings.mode === "solid" && (
              <div style={{ marginTop: "16px" }}>
                <label className="amplia-label">Paleta Oficial Caramelo</label>
                <div className="amplia-palette-grid">
                  {CARAMELO_PALETTE.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      className={`amplia-color-circle ${bgSettings.solidColor === c.hex ? "active" : ""}`}
                      style={{
                        backgroundColor: c.hex === "transparent" ? "#333" : c.hex,
                        border: c.hex === "#101014" ? "1px solid #444" : "none",
                      }}
                      title={c.name}
                      onClick={() => setBgSettings((prev) => ({ ...prev, solidColor: c.hex }))}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Magic Eraser Controls */}
        {mode === "magic_eraser" && (
          <div className="amplia-section">
            <label className="amplia-label">Espessura do Pincel de Apagamento</label>
            <div className="amplia-slider-block">
              <div className="amplia-slider-header">
                <span>Raio</span>
                <span>{brushSize}px</span>
              </div>
              <input
                type="range"
                min="5"
                max="80"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
              />
            </div>
            <p className="amplia-panel-tip">
              💡 Pinte com o mouse sobre os objetos, textos ou logos indesejados. O modelo generativo LaMa reconstruirá o fundo perfeitamente.
            </p>
          </div>
        )}

        {/* Denoise & Deblur & Colorize */}
        {(mode === "denoise_deblur" || mode === "colorize") && (
          <div className="amplia-section">
            <label className="amplia-label">Parâmetros de Restauração</label>
            {mode === "denoise_deblur" ? (
              <>
                <div className="amplia-slider-block">
                  <div className="amplia-slider-header">
                    <span>Nível de Denoise (SCUNet)</span>
                    <span>{restoreSettings.denoiseLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={restoreSettings.denoiseLevel}
                    onChange={(e) =>
                      setRestoreSettings((prev) => ({
                        ...prev,
                        denoiseLevel: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="amplia-slider-block">
                  <div className="amplia-slider-header">
                    <span>Correção de Desfoque (NAFNet)</span>
                    <span>{restoreSettings.deblurLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={restoreSettings.deblurLevel}
                    onChange={(e) =>
                      setRestoreSettings((prev) => ({
                        ...prev,
                        deblurLevel: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </>
            ) : (
              <>
                <div className="amplia-slider-block">
                  <div className="amplia-slider-header">
                    <span>Saturação de Cor (DDColor)</span>
                    <span>{Math.round(restoreSettings.colorizeSaturation * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={restoreSettings.colorizeSaturation}
                    onChange={(e) =>
                      setRestoreSettings((prev) => ({
                        ...prev,
                        colorizeSaturation: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="amplia-slider-block">
                  <div className="amplia-slider-header">
                    <span>Calor Analógico (Warmth)</span>
                    <span>{Math.round(restoreSettings.colorizeWarmth * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.05"
                    value={restoreSettings.colorizeWarmth}
                    onChange={(e) =>
                      setRestoreSettings((prev) => ({
                        ...prev,
                        colorizeWarmth: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Audio Studio Controls */}
        {mode === "audio_studio" && (
          <div className="amplia-section">
            <label className="amplia-label">Módulo de Áudio</label>
            <div className="amplia-btn-group">
              <button
                type="button"
                className={`amplia-group-btn ${audioSettings.subMode === "mastering" ? "active" : ""}`}
                onClick={() => setAudioSettings((prev) => ({ ...prev, subMode: "mastering" }))}
              >
                Mastering
              </button>
              <button
                type="button"
                className={`amplia-group-btn ${audioSettings.subMode === "stem_split" ? "active" : ""}`}
                onClick={() => setAudioSettings((prev) => ({ ...prev, subMode: "stem_split" }))}
              >
                Stems (Voz/Trilha)
              </button>
              <button
                type="button"
                className={`amplia-group-btn ${audioSettings.subMode === "voice_denoise" ? "active" : ""}`}
                onClick={() => setAudioSettings((prev) => ({ ...prev, subMode: "voice_denoise" }))}
              >
                Denoise Voz
              </button>
            </div>

            {audioSettings.subMode === "mastering" && (
              <>
                <label className="amplia-label" style={{ marginTop: "16px" }}>Padrão de Loudness Alvo</label>
                <div className="amplia-lufs-targets">
                  {[
                    { label: "Reels / TikTok / YT", val: -14 },
                    { label: "Podcast Fala", val: -16 },
                    { label: "Clube / Punch", val: -9 },
                  ].map((target) => (
                    <button
                      key={target.val}
                      type="button"
                      className={`amplia-lufs-btn ${audioSettings.targetLufs === target.val ? "active" : ""}`}
                      onClick={() => setAudioSettings((prev) => ({ ...prev, targetLufs: target.val }))}
                    >
                      <span className="amplia-target-name">{target.label}</span>
                      <span className="amplia-target-db">{target.val} LUFS</span>
                    </button>
                  ))}
                </div>

                <div className="amplia-slider-block" style={{ marginTop: "16px" }}>
                  <div className="amplia-slider-header">
                    <span>Punch de Graves (Sub Bass)</span>
                    <span>+{audioSettings.bassEnhance.toFixed(1)} dB</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="0.5"
                    value={audioSettings.bassEnhance}
                    onChange={(e) =>
                      setAudioSettings((prev) => ({
                        ...prev,
                        bassEnhance: Number(e.target.value),
                      }))
                    }
                  />
                </div>

                <div className="amplia-slider-block">
                  <div className="amplia-slider-header">
                    <span>Presença & Ar (Air Frequencies)</span>
                    <span>+{audioSettings.airPresence.toFixed(1)} dB</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="0.5"
                    value={audioSettings.airPresence}
                    onChange={(e) =>
                      setAudioSettings((prev) => ({
                        ...prev,
                        airPresence: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Video Tools Controls */}
        {mode === "video_tools" && (
          <div className="amplia-section">
            <label className="amplia-label">Operação de Vídeo</label>
            <div className="amplia-btn-group">
              <button
                type="button"
                className={`amplia-group-btn ${videoSettings.subMode === "compress" ? "active" : ""}`}
                onClick={() => setVideoSettings((prev) => ({ ...prev, subMode: "compress" }))}
              >
                Compressão
              </button>
              <button
                type="button"
                className={`amplia-group-btn ${videoSettings.subMode === "upscale_4k" ? "active" : ""}`}
                onClick={() => setVideoSettings((prev) => ({ ...prev, subMode: "upscale_4k" }))}
              >
                Upscale 4K
              </button>
              <button
                type="button"
                className={`amplia-group-btn ${videoSettings.subMode === "gif" ? "active" : ""}`}
                onClick={() => setVideoSettings((prev) => ({ ...prev, subMode: "gif" }))}
              >
                GIF Maker
              </button>
            </div>

            {videoSettings.subMode === "compress" && (
              <div style={{ marginTop: "16px" }}>
                <label className="amplia-label">Tamanho Máximo Alvo</label>
                <div className="amplia-btn-group">
                  {[8, 25, 50].map((mb) => (
                    <button
                      key={mb}
                      type="button"
                      className={`amplia-group-btn ${videoSettings.targetSizeMb === mb ? "active" : ""}`}
                      onClick={() => setVideoSettings((prev) => ({ ...prev, targetSizeMb: mb }))}
                    >
                      {mb} MB
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="amplia-panel-footer">
        <button
          type="button"
          className="amplia-btn-primary"
          onClick={onRunProcess}
          disabled={!asset || isProcessing}
        >
          {isProcessing ? (
            <>
              <span className="amplia-spinner" />
              <span>Processando com IA...</span>
            </>
          ) : (
            <span>Executar com IA</span>
          )}
        </button>

        {asset?.resultUrl && (
          <button
            type="button"
            className="amplia-btn-download"
            onClick={onDownloadResult}
          >
            <span>Baixar Resultado Final ⬇</span>
          </button>
        )}
      </div>
    </aside>
  );
};
