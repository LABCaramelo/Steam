import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Layers,
  ZoomIn,
  Trash2,
  Maximize2,
  Eye,
} from "lucide-react";
import type { TakeRecord, CanvasDressing, ZoomKeyframe, BackgroundPreset, AspectRatio } from "../types";
import { VideoStage } from "./VideoStage";
import { TimelineBar } from "./TimelineBar";

interface StudioViewProps {
  take: TakeRecord;
  onUpdateTake: (patch: Partial<TakeRecord>) => void;
}

export function StudioView({ take, onUpdateTake }: StudioViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(() => {
    if (take.duration && Number.isFinite(take.duration) && take.duration > 0) {
      return take.duration;
    }
    return 10;
  });

  const dressing = take.dressing;
  const keyframes = take.zoomKeyframes || [];

  const [selectedZoomId, setSelectedZoomId] = useState<string | null>(() => {
    return keyframes.length > 0 ? keyframes[0].id : null;
  });

  // Selected keyframe object (fallback to first keyframe if id matches none)
  const selectedZoom =
    keyframes.find((k) => k.id === selectedZoomId) ||
    (keyframes.length > 0 ? keyframes[0] : null);

  // Sync duration whenever take changes
  useEffect(() => {
    if (take.duration && Number.isFinite(take.duration) && take.duration > 0) {
      setDuration(take.duration);
    }
  }, [take.id, take.duration]);

  // Sync duration when metadata loads (and fix Chromium WebM Infinity duration)
  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;

    if (Number.isFinite(v.duration) && v.duration > 0 && v.duration !== Infinity) {
      setDuration(v.duration);
      if (!take.duration || Math.abs(take.duration - v.duration) > 0.5) {
        onUpdateTake({ duration: v.duration });
      }
    } else if (v.duration === Infinity) {
      // Fix Chromium WebM Infinity duration bug:
      // Seeking to 1e101 forces Chromium to read the EBML clusters and calculate actual duration
      const initialTime = v.currentTime;
      const onSeeked = () => {
        v.removeEventListener("seeked", onSeeked);
        if (Number.isFinite(v.duration) && v.duration > 0 && v.duration !== Infinity) {
          setDuration(v.duration);
          onUpdateTake({ duration: v.duration });
        } else if (take.duration && Number.isFinite(take.duration) && take.duration > 0) {
          setDuration(take.duration);
        }
        v.currentTime = Math.min(initialTime, (Number.isFinite(v.duration) ? v.duration : initialTime));
      };

      v.addEventListener("seeked", onSeeked);
      v.currentTime = 1e101;
    } else if (take.duration && Number.isFinite(take.duration) && take.duration > 0) {
      setDuration(take.duration);
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleEnded = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      setCurrentTime(duration);
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      // If at or near the end, restart from beginning
      if (currentTime >= duration - 0.1) {
        videoRef.current.currentTime = 0;
        setCurrentTime(0);
      }
      videoRef.current.play().catch((e) => console.warn("Video play error:", e));
      setIsPlaying(true);
    }
  };

  // Keyboard shortcut: Spacebar to play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        handlePlayPause();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, currentTime, duration]);

  const handleSeek = (time: number) => {
    if (!Number.isFinite(time) || isNaN(time)) return;
    const clamped = Math.max(0, Math.min(duration, time));
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
      setCurrentTime(clamped);
    }
  };

  const updateDressing = (patch: Partial<CanvasDressing>) => {
    onUpdateTake({ dressing: { ...dressing, ...patch } });
  };

  const handleAddZoomAtCurrentTime = () => {
    const remainingTime = Math.max(0.5, duration - currentTime);
    const zoomDuration = Math.min(3.0, remainingTime);
    const newKf: ZoomKeyframe = {
      id: `zoom-${Date.now()}`,
      time: Math.max(0, Math.min(duration - 0.5, Number((currentTime).toFixed(1)))),
      duration: Math.max(0.8, Number(zoomDuration.toFixed(1))),
      scale: 1.6,
      focusX: 0.5,
      focusY: 0.5,
      label: `Zoom ${(keyframes.length + 1)}`,
    };
    onUpdateTake({ zoomKeyframes: [...keyframes, newKf] });
    setSelectedZoomId(newKf.id);
  };

  const handleDeleteZoom = (id: string) => {
    const remaining = keyframes.filter((k) => k.id !== id);
    onUpdateTake({ zoomKeyframes: remaining });
    if (selectedZoomId === id) {
      setSelectedZoomId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleUpdateZoom = (id: string, patch: Partial<ZoomKeyframe>) => {
    onUpdateTake({
      zoomKeyframes: keyframes.map((k) => (k.id === id ? { ...k, ...patch } : k)),
    });
  };

  // Click on video canvas to set focus target
  const handleCanvasClick = (focusX: number, focusY: number) => {
    if (selectedZoom) {
      handleUpdateZoom(selectedZoom.id, { focusX, focusY });
    }
  };

  return (
    <div className="cap-studio">
      <div className="cap-studio-body">
        {/* Main Center Video Stage with Interactive Focal Reticle */}
        <VideoStage
          videoUrl={take.videoUrl}
          dressing={dressing}
          keyframes={keyframes}
          selectedZoom={selectedZoom}
          onUpdateZoom={handleUpdateZoom}
          currentTime={currentTime}
          videoRef={videoRef}
          onTimeUpdate={(t) => setCurrentTime(t)}
          onLoadedMetadata={handleLoadedMetadata}
          onCanvasClick={handleCanvasClick}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
        />

        {/* Right Rail: Studio Styling Controls & Comprehensive Zoom Editor */}
        <aside className="cap-studio-rail">
          {/* Proporção / Aspect Ratio */}
          <div className="cap-rail-section">
            <div className="cap-rail-title">
              <Maximize2 size={13} />
              <span>Proporção de Tela</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
              {[
                { id: "16:9", label: "16:9 Paisagem" },
                { id: "fit", label: "Auto (Original)" },
                { id: "9:16", label: "9:16 Vertical" },
                { id: "1:1", label: "1:1 Feed" },
                { id: "4:3", label: "4:3 Clássico" },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  className={`cap-btn ${dressing.aspectRatio === id ? "cap-btn-accent" : "cap-btn-subtle"}`}
                  style={{ fontSize: 11, padding: "7px 6px" }}
                  onClick={() => updateDressing({ aspectRatio: id as AspectRatio })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Plano de Fundo / Backgrounds */}
          <div className="cap-rail-section">
            <div className="cap-rail-title">
              <Sparkles size={13} />
              <span>Plano de Fundo</span>
            </div>
            <div className="cap-grid-presets">
              {(
                [
                  { id: "sunset", label: "Sunset" },
                  { id: "cyber", label: "Cyber" },
                  { id: "mesh", label: "Mesh" },
                  { id: "studio", label: "Studio" },
                  { id: "cream", label: "Cream" },
                  { id: "acid", label: "Acid" },
                ] as { id: BackgroundPreset; label: string }[]
              ).map((bg) => (
                <button
                  key={bg.id}
                  className={`cap-preset-btn bg-${bg.id} ${dressing.background === bg.id ? "active" : ""}`}
                  onClick={() => updateDressing({ background: bg.id })}
                  title={bg.label}
                />
              ))}
            </div>
          </div>

          {/* Moldura & Respiro */}
          <div className="cap-rail-section">
            <div className="cap-rail-title">
              <Layers size={13} />
              <span>Moldura & Respiro</span>
            </div>

            {/* Enquadramento do Vídeo na Janela */}
            <div className="cap-slider-group">
              <div className="cap-slider-meta">
                <span>Enquadramento do Vídeo</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <button
                  className={`cap-btn ${(dressing.videoFit || "cover") === "cover" ? "cap-btn-accent" : "cap-btn-subtle"}`}
                  style={{ fontSize: 11, padding: "6px 8px" }}
                  onClick={() => updateDressing({ videoFit: "cover" })}
                >
                  Preencher Janela
                </button>
                <button
                  className={`cap-btn ${dressing.videoFit === "contain" ? "cap-btn-accent" : "cap-btn-subtle"}`}
                  style={{ fontSize: 11, padding: "6px 8px" }}
                  onClick={() => updateDressing({ videoFit: "contain" })}
                >
                  Ajustar (Conter)
                </button>
              </div>
            </div>

            {/* Padding Slider */}
            <div className="cap-slider-group">
              <div className="cap-slider-meta">
                <span>Respiro (Padding)</span>
                <span>{dressing.padding}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="96"
                value={dressing.padding}
                onChange={(e) => updateDressing({ padding: Number(e.target.value) })}
                className="cap-range-slider"
              />
            </div>

            {/* Border Radius Slider */}
            <div className="cap-slider-group">
              <div className="cap-slider-meta">
                <span>Cantos Arredondados</span>
                <span>{dressing.borderRadius}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="32"
                value={dressing.borderRadius}
                onChange={(e) => updateDressing({ borderRadius: Number(e.target.value) })}
                className="cap-range-slider"
              />
            </div>

            {/* Sombra */}
            <div className="cap-slider-group">
              <div className="cap-slider-meta">
                <span>Sombra & Elevação</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {[
                  { id: "none", label: "Nenhuma" },
                  { id: "subtle", label: "Suave" },
                  { id: "deep", label: "Profunda" },
                  { id: "glowCaramel", label: "Caramelo" },
                  { id: "glowCyan", label: "Ciano" },
                ].map((sh) => (
                  <button
                    key={sh.id}
                    className={`cap-btn ${dressing.shadow === sh.id ? "cap-btn-accent" : "cap-btn-subtle"}`}
                    style={{ fontSize: 10, padding: "5px 4px" }}
                    onClick={() => updateDressing({ shadow: sh.id as any })}
                  >
                    {sh.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Window Chrome Title */}
            <div className="cap-slider-group">
              <div className="cap-slider-meta">
                <span>Barra macOS / URL</span>
              </div>
              <input
                type="text"
                value={dressing.windowTitle}
                onChange={(e) => updateDressing({ windowTitle: e.target.value })}
                className="cap-input"
                placeholder="lab.caramelo/meu-pitch"
              />
            </div>
          </div>

          {/* Smart Zooms Cinemáticos */}
          <div className="cap-rail-section">
            <div className="cap-rail-title" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ZoomIn size={14} color="rgb(var(--cm-info))" />
                <span>Zooms Cinemáticos</span>
              </div>
              <button
                className="cap-btn cap-btn-accent"
                style={{ fontSize: 11, padding: "3px 8px" }}
                onClick={handleAddZoomAtCurrentTime}
                title="Adicionar ponto de zoom na posição atual da agulha"
              >
                + Zoom
              </button>
            </div>

            {keyframes.length === 0 ? (
              <div style={{ fontSize: 12, color: "rgb(var(--cm-fg-muted))", lineHeight: 1.5 }}>
                Nenhum zoom configurado. Clique em "+ Zoom" para aproximar e focar em qualquer ponto do seu vídeo.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Active Selected Zoom Detailed Editor Card */}
                {selectedZoom && (
                  <div className="cap-zoom-editor-card">
                    {/* Header with Title and Delete Button */}
                    <div className="cap-zoom-editor-header">
                      <input
                        type="text"
                        value={selectedZoom.label || ""}
                        onChange={(e) =>
                          handleUpdateZoom(selectedZoom.id, { label: e.target.value })
                        }
                        className="cap-input"
                        style={{ padding: "4px 8px", fontSize: 12, fontWeight: 700, flex: 1 }}
                        placeholder="Nome do Zoom"
                      />

                      <button
                        className="cap-btn cap-btn-subtle"
                        style={{ padding: "5px 8px", color: "rgb(var(--cm-danger))" }}
                        onClick={() => handleDeleteZoom(selectedZoom.id)}
                        title="Remover este zoom"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Quick preview jump */}
                    <button
                      className="cap-btn cap-btn-subtle"
                      style={{ fontSize: 11, padding: "5px 10px", width: "100%", justifyContent: "center" }}
                      onClick={() => handleSeek(selectedZoom.time + Math.min(0.6, selectedZoom.duration / 2))}
                      title="Pular playhead para o centro do zoom para visualizar"
                    >
                      <Eye size={13} color="rgb(var(--cm-accent))" />
                      <span>Visualizar este Zoom ({selectedZoom.time.toFixed(1)}s)</span>
                    </button>

                    {/* Início & Duração Controls */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {/* Início (s) */}
                      <div className="cap-slider-group">
                        <div className="cap-slider-meta">
                          <span>Início</span>
                          <span>{selectedZoom.time.toFixed(1)}s</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button
                            className="cap-btn cap-btn-subtle"
                            style={{ width: 24, height: 26, padding: 0 }}
                            onClick={() => {
                              const newTime = Math.max(0, Number((selectedZoom.time - 0.2).toFixed(1)));
                              handleUpdateZoom(selectedZoom.id, { time: newTime });
                              handleSeek(newTime);
                            }}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max={Math.max(0, duration - selectedZoom.duration)}
                            value={selectedZoom.time}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                const clamped = Math.max(0, Math.min(duration - 0.4, val));
                                handleUpdateZoom(selectedZoom.id, { time: clamped });
                                handleSeek(clamped);
                              }
                            }}
                            className="cap-input"
                            style={{ padding: "4px", fontSize: 11, textAlign: "center", flex: 1 }}
                          />
                          <button
                            className="cap-btn cap-btn-subtle"
                            style={{ width: 24, height: 26, padding: 0 }}
                            onClick={() => {
                              const newTime = Math.min(
                                duration - selectedZoom.duration,
                                Number((selectedZoom.time + 0.2).toFixed(1))
                              );
                              handleUpdateZoom(selectedZoom.id, { time: newTime });
                              handleSeek(newTime);
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Duração (s) */}
                      <div className="cap-slider-group">
                        <div className="cap-slider-meta">
                          <span>Duração</span>
                          <span>{selectedZoom.duration.toFixed(1)}s</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button
                            className="cap-btn cap-btn-subtle"
                            style={{ width: 24, height: 26, padding: 0 }}
                            onClick={() => {
                              const newDur = Math.max(0.5, Number((selectedZoom.duration - 0.2).toFixed(1)));
                              handleUpdateZoom(selectedZoom.id, { duration: newDur });
                            }}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.1"
                            min="0.4"
                            max={Math.max(0.4, duration - selectedZoom.time)}
                            value={selectedZoom.duration}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                const clamped = Math.max(0.4, Math.min(duration - selectedZoom.time, val));
                                handleUpdateZoom(selectedZoom.id, { duration: clamped });
                              }
                            }}
                            className="cap-input"
                            style={{ padding: "4px", fontSize: 11, textAlign: "center", flex: 1 }}
                          />
                          <button
                            className="cap-btn cap-btn-subtle"
                            style={{ width: 24, height: 26, padding: 0 }}
                            onClick={() => {
                              const newDur = Math.min(
                                duration - selectedZoom.time,
                                Number((selectedZoom.duration + 0.2).toFixed(1))
                              );
                              handleUpdateZoom(selectedZoom.id, { duration: newDur });
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Escala / Tamanho do Zoom */}
                    <div className="cap-slider-group">
                      <div className="cap-slider-meta">
                        <span>Nível do Zoom</span>
                        <span style={{ color: "rgb(var(--cm-accent))", fontWeight: 800 }}>
                          {selectedZoom.scale.toFixed(1)}x
                        </span>
                      </div>

                      {/* Quick Pills */}
                      <div className="cap-scale-pills">
                        {[1.3, 1.6, 2.0, 2.4, 3.0].map((s) => (
                          <button
                            key={s}
                            className={`cap-scale-pill ${Math.abs(selectedZoom.scale - s) < 0.05 ? "active" : ""}`}
                            onClick={() => handleUpdateZoom(selectedZoom.id, { scale: s })}
                          >
                            {s.toFixed(1)}x
                          </button>
                        ))}
                      </div>

                      {/* Continuous Scale Slider */}
                      <input
                        type="range"
                        min="1.1"
                        max="3.5"
                        step="0.05"
                        value={selectedZoom.scale}
                        onChange={(e) =>
                          handleUpdateZoom(selectedZoom.id, { scale: Number(e.target.value) })
                        }
                        className="cap-range-slider"
                      />
                    </div>

                    {/* Ponto Focal (Onde será o Zoom) */}
                    <div className="cap-slider-group">
                      <div className="cap-slider-meta">
                        <span>Ponto Focal (Alvo)</span>
                        <span style={{ fontFamily: "var(--caramelo-font-mono)", fontSize: 11 }}>
                          X: {Math.round(selectedZoom.focusX * 100)}% · Y: {Math.round(selectedZoom.focusY * 100)}%
                        </span>
                      </div>

                      <div style={{ fontSize: 11, color: "rgb(var(--cm-fg-muted))", marginBottom: 2 }}>
                        Arraste a mira ou clique na tela, ou use os atalhos:
                      </div>

                      {/* 3x3 Preset Grid */}
                      <div className="cap-focal-grid">
                        {[
                          { label: "↖", x: 0.2, y: 0.2, title: "Topo Esquerda" },
                          { label: "↑", x: 0.5, y: 0.2, title: "Topo Centro" },
                          { label: "↗", x: 0.8, y: 0.2, title: "Topo Direita" },
                          { label: "←", x: 0.2, y: 0.5, title: "Centro Esquerda" },
                          { label: "⊙", x: 0.5, y: 0.5, title: "Centro" },
                          { label: "→", x: 0.8, y: 0.5, title: "Centro Direita" },
                          { label: "↙", x: 0.2, y: 0.8, title: "Base Esquerda" },
                          { label: "↓", x: 0.5, y: 0.8, title: "Base Centro" },
                          { label: "↘", x: 0.8, y: 0.8, title: "Base Direita" },
                        ].map((pos) => {
                          const isCurrent =
                            Math.abs(selectedZoom.focusX - pos.x) < 0.12 &&
                            Math.abs(selectedZoom.focusY - pos.y) < 0.12;
                          return (
                            <button
                              key={pos.title}
                              className={`cap-focal-btn ${isCurrent ? "active" : ""}`}
                              onClick={() =>
                                handleUpdateZoom(selectedZoom.id, { focusX: pos.x, focusY: pos.y })
                              }
                              title={pos.title}
                            >
                              {pos.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Fine sliders for X and Y */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                        <div>
                          <div style={{ fontSize: 10, color: "rgb(var(--cm-fg-muted))", marginBottom: 2 }}>
                            Eixo X: {Math.round(selectedZoom.focusX * 100)}%
                          </div>
                          <input
                            type="range"
                            min="0.05"
                            max="0.95"
                            step="0.01"
                            value={selectedZoom.focusX}
                            onChange={(e) =>
                              handleUpdateZoom(selectedZoom.id, { focusX: Number(e.target.value) })
                            }
                            className="cap-range-slider"
                          />
                        </div>

                        <div>
                          <div style={{ fontSize: 10, color: "rgb(var(--cm-fg-muted))", marginBottom: 2 }}>
                            Eixo Y: {Math.round(selectedZoom.focusY * 100)}%
                          </div>
                          <input
                            type="range"
                            min="0.05"
                            max="0.95"
                            step="0.01"
                            value={selectedZoom.focusY}
                            onChange={(e) =>
                              handleUpdateZoom(selectedZoom.id, { focusY: Number(e.target.value) })
                            }
                            className="cap-range-slider"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Keyframe Zooms List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgb(var(--cm-fg-muted))", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Todos os Zooms ({keyframes.length})
                  </div>
                  {keyframes.map((kf) => {
                    const isSelected = selectedZoomId === kf.id;
                    return (
                      <div
                        key={kf.id}
                        className={`cap-zoom-item ${isSelected ? "selected" : ""}`}
                        onClick={() => {
                          setSelectedZoomId(kf.id);
                          handleSeek(kf.time + Math.min(0.5, kf.duration / 2));
                        }}
                      >
                        <div className="cap-zoom-meta">
                          <div
                            className="cap-zoom-name"
                            style={{ color: isSelected ? "rgb(var(--cm-accent))" : undefined }}
                          >
                            {kf.label || "Zoom"}
                          </div>
                          <div className="cap-zoom-time">
                            {kf.time.toFixed(1)}s · {kf.duration.toFixed(1)}s · {kf.scale}x
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            className="cap-btn cap-btn-subtle"
                            style={{ padding: "4px 6px", color: "rgb(var(--cm-danger))" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteZoom(kf.id);
                            }}
                            title="Remover zoom"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Bottom Timeline with Drag & Resize Handles */}
      <TimelineBar
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        keyframes={keyframes}
        selectedZoomId={selectedZoomId}
        onSelectZoom={(id) => {
          setSelectedZoomId(id);
        }}
        onUpdateZoom={handleUpdateZoom}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        onAddZoom={handleAddZoomAtCurrentTime}
      />
    </div>
  );
}
