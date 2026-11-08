import React, { useRef, useState, useEffect } from "react";
import type { AmpliaMode, MediaAsset } from "../types";

interface StageViewProps {
  asset: MediaAsset | null;
  mode: AmpliaMode;
  onSelectFile: (file: File) => void;
  brushSize: number;
  onMaskChange?: (maskDataUrl: string) => void;
  onClearMask?: () => void;
  audioMetrics?: {
    originalLufs?: number;
    masteredLufs?: number;
    originalPeakDb?: number;
    masteredPeakDb?: number;
  };
}

export const StageView: React.FC<StageViewProps> = ({
  asset,
  mode,
  onSelectFile,
  brushSize,
  onMaskChange,
  onClearMask,
  audioMetrics,
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const [viewLayout, setViewLayout] = useState<"split" | "side" | "result">("split");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isAudioMasteredPlaying, setIsAudioMasteredPlaying] = useState<boolean>(false);

  // Mask Canvas for Magic Eraser
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onSelectFile(e.dataTransfer.files[0]);
    }
  };

  // Split Slider drag handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSlider || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      setSliderPos((x / rect.width) * 100);
    };

    const handleMouseUp = () => {
      setIsDraggingSlider(false);
    };

    if (isDraggingSlider) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingSlider]);

  // Magic Eraser Canvas Setup & Drawing
  useEffect(() => {
    if (mode === "magic_eraser" && asset && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      };
      img.src = asset.originalUrl;
    }
  }, [mode, asset]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== "magic_eraser" || !canvasRef.current) return;
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (canvasRef.current && onMaskChange) {
      onMaskChange(canvasRef.current.toDataURL("image/png"));
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.fillStyle = "rgba(255, 61, 141, 0.75)"; // Hot Pink Caramelo for eraser mask
    ctx.beginPath();
    ctx.arc(x, y, brushSize * scaleX, 0, Math.PI * 2);
    ctx.fill();
  };

  const clearCanvasMask = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    if (onClearMask) onClearMask();
  };

  // If no asset is loaded: Empty Drop State
  if (!asset) {
    return (
      <div
        className="amplia-stage-empty"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="amplia-dropzone-content">
          <div className="amplia-drop-icon">
            {mode === "audio_studio" ? "🎙️" : mode === "video_tools" ? "🎬" : "🖼️"}
          </div>
          <h2 className="amplia-drop-title">
            {mode === "audio_studio"
              ? "Arraste sua faixa de áudio ou gravação de voz"
              : mode === "video_tools"
              ? "Arraste o vídeo para upscale 4K, compressão ou GIF"
              : "Arraste uma foto, ilustração ou arte de carrossel"}
          </h2>
          <p className="amplia-drop-desc">
            Processamento local e imediato. Sem compressão destrutiva, sem limites de nuvem.
          </p>

          <label className="amplia-btn-upload">
            <input
              type="file"
              accept={
                mode === "audio_studio"
                  ? "audio/*"
                  : mode === "video_tools"
                  ? "video/*"
                  : "image/*"
              }
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onSelectFile(e.target.files[0]);
                }
              }}
              style={{ display: "none" }}
            />
            <span>Selecionar do Computador</span>
          </label>

          <div className="amplia-formats-hint">
            <span>Formatos aceitos:</span>
            {mode === "audio_studio" ? (
              <code>WAV, MP3, AAC, FLAC, M4A, OGG</code>
            ) : mode === "video_tools" ? (
              <code>MP4, MOV, MKV, WEBM, AVI (até 2GB)</code>
            ) : (
              <code>PNG, JPG, JPEG, WEBP, TIFF, BMP (até 8K)</code>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Audio Stage View
  if (asset.type === "audio") {
    const originalSrc = asset.originalUrl;
    const resultSrc = asset.resultUrl || asset.originalUrl;

    return (
      <div className="amplia-stage-audio">
        <div className="amplia-audio-visualizer-box">
          <div className="amplia-audio-header">
            <span className="amplia-audio-file-name">🎵 {asset.name}</span>
            <span className="amplia-audio-status">
              {asset.status === "processing" ? "Processando DSP..." : asset.resultUrl ? "Masterizado 24-bit" : "Original"}
            </span>
          </div>

          <div className="amplia-audio-waveform-mock">
            {Array.from({ length: 48 }).map((_, i) => {
              const h = Math.sin(i * 0.25) * 40 + Math.cos(i * 0.7) * 25 + 50;
              const isMaster = isAudioMasteredPlaying;
              return (
                <div
                  key={i}
                  className="amplia-wave-bar"
                  style={{
                    height: `${Math.max(12, Math.min(95, isMaster ? h * 1.15 : h))}%`,
                    backgroundColor: isMaster ? "#FF701A" : "#25BFFF",
                  }}
                />
              );
            })}
          </div>

          <div className="amplia-audio-ab-controls">
            <button
              type="button"
              className={`amplia-btn-ab ${!isAudioMasteredPlaying ? "active" : ""}`}
              onClick={() => setIsAudioMasteredPlaying(false)}
            >
              <span>A: Original</span>
            </button>
            <button
              type="button"
              className={`amplia-btn-ab ${isAudioMasteredPlaying ? "active" : ""}`}
              onClick={() => setIsAudioMasteredPlaying(true)}
              disabled={!asset.resultUrl}
            >
              <span>B: Masterizado (LUFS Alvo)</span>
            </button>
          </div>

          <audio
            key={isAudioMasteredPlaying ? resultSrc : originalSrc}
            controls
            src={isAudioMasteredPlaying ? resultSrc : originalSrc}
            className="amplia-audio-player-native"
          />

          {audioMetrics && (
            <div className="amplia-audio-metrics-grid">
              <div className="amplia-metric-card">
                <span className="amplia-metric-label">Loudness Integrado Original</span>
                <span className="amplia-metric-val">
                  {audioMetrics.originalLufs ? `${audioMetrics.originalLufs.toFixed(1)} LUFS` : "--"}
                </span>
              </div>
              <div className="amplia-metric-card highlighted">
                <span className="amplia-metric-label">Loudness Alvo Masterizado</span>
                <span className="amplia-metric-val">
                  {audioMetrics.masteredLufs ? `${audioMetrics.masteredLufs.toFixed(1)} LUFS` : "-14.0 LUFS"}
                </span>
              </div>
              <div className="amplia-metric-card">
                <span className="amplia-metric-label">Pico True Peak (Teto)</span>
                <span className="amplia-metric-val">
                  {audioMetrics.masteredPeakDb ? `${audioMetrics.masteredPeakDb.toFixed(2)} dBFS` : "-0.50 dBFS"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Image Stage View (Interactive Comparison or Magic Eraser)
  const currentResult = asset.resultUrl || asset.originalUrl;

  return (
    <div className="amplia-stage-image" ref={containerRef}>
      {/* Stage Toolbar */}
      <div className="amplia-stage-toolbar">
        <div className="amplia-zoom-controls">
          <button type="button" onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}>-</button>
          <span>{Math.round(zoomLevel * 100)}%</span>
          <button type="button" onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}>+</button>
          <button type="button" onClick={() => setZoomLevel(1)}>Ajustar</button>
        </div>

        {mode === "magic_eraser" ? (
          <div className="amplia-eraser-bar">
            <span>Pincel: {brushSize}px</span>
            <button type="button" className="amplia-btn-clear-mask" onClick={clearCanvasMask}>
              Limpar Seleção
            </button>
          </div>
        ) : (
          <div className="amplia-layout-switch">
            <button
              type="button"
              className={viewLayout === "split" ? "active" : ""}
              onClick={() => setViewLayout("split")}
            >
              Slider Antes/Depois
            </button>
            <button
              type="button"
              className={viewLayout === "side" ? "active" : ""}
              onClick={() => setViewLayout("side")}
            >
              Lado a Lado
            </button>
            <button
              type="button"
              className={viewLayout === "result" ? "active" : ""}
              onClick={() => setViewLayout("result")}
            >
              Resultado
            </button>
          </div>
        )}
      </div>

      {/* Main View Area */}
      <div className="amplia-stage-viewport">
        {mode === "magic_eraser" ? (
          <div
            className="amplia-canvas-container"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <img src={asset.originalUrl} alt="Original" className="amplia-base-img" />
            <canvas
              ref={canvasRef}
              className="amplia-mask-canvas"
              onMouseDown={startDrawing}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onMouseMove={draw}
            />
          </div>
        ) : viewLayout === "split" ? (
          <div
            className="amplia-split-container"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Background / Mastered Image */}
            <div className="amplia-split-after">
              <img src={currentResult} alt="Resultado Processado" />
              <span className="amplia-split-badge badge-after">
                {asset.resultUrl ? "AMPLIA (8K · IA)" : "PRÉVIA"}
              </span>
            </div>

            {/* Foreground / Original Image (Clipped) */}
            <div
              className="amplia-split-before"
              style={{ width: `${sliderPos}%` }}
            >
              <img src={asset.originalUrl} alt="Original" />
              <span className="amplia-split-badge badge-before">ORIGINAL</span>
            </div>

            {/* Draggable Divider Handle */}
            <div
              className="amplia-split-divider"
              style={{ left: `${sliderPos}%` }}
              onMouseDown={() => setIsDraggingSlider(true)}
            >
              <div className="amplia-divider-handle">
                <span>◀ ▶</span>
              </div>
            </div>
          </div>
        ) : viewLayout === "side" ? (
          <div className="amplia-side-container" style={{ transform: `scale(${zoomLevel})` }}>
            <div className="amplia-side-box">
              <span className="amplia-side-label">Original</span>
              <img src={asset.originalUrl} alt="Original" />
            </div>
            <div className="amplia-side-box">
              <span className="amplia-side-label">AMPLIA IA</span>
              <img src={currentResult} alt="Resultado" />
            </div>
          </div>
        ) : (
          <div className="amplia-result-only" style={{ transform: `scale(${zoomLevel})` }}>
            <img src={currentResult} alt="Resultado Final" />
          </div>
        )}
      </div>
    </div>
  );
};
