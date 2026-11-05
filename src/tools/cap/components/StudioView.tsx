import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Layers,
  ZoomIn,
  Trash2,
  Maximize2,
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
  const [duration, setDuration] = useState(take.duration || 10);

  const dressing = take.dressing;
  const keyframes = take.zoomKeyframes || [];

  // Sync duration when metadata loads
  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration) {
      setDuration(videoRef.current.duration);
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
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
  }, [isPlaying]);

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const updateDressing = (patch: Partial<CanvasDressing>) => {
    onUpdateTake({ dressing: { ...dressing, ...patch } });
  };

  const handleAddZoomAtCurrentTime = () => {
    const newKf: ZoomKeyframe = {
      id: `zoom-${Date.now()}`,
      time: Math.max(0, currentTime - 0.2),
      duration: 3.0,
      scale: 1.6,
      focusX: 0.5,
      focusY: 0.5,
      label: `Zoom ${(keyframes.length + 1)}`,
    };
    onUpdateTake({ zoomKeyframes: [...keyframes, newKf] });
  };

  const handleDeleteZoom = (id: string) => {
    onUpdateTake({ zoomKeyframes: keyframes.filter((k) => k.id !== id) });
  };

  const handleUpdateZoom = (id: string, patch: Partial<ZoomKeyframe>) => {
    onUpdateTake({
      zoomKeyframes: keyframes.map((k) => (k.id === id ? { ...k, ...patch } : k)),
    });
  };

  // Click on video canvas to set focus target
  const handleCanvasClick = (focusX: number, focusY: number) => {
    // If we're currently within a zoom keyframe, update its focal point!
    const active = keyframes.find(
      (k) => currentTime >= k.time && currentTime <= k.time + k.duration
    );
    if (active) {
      handleUpdateZoom(active.id, { focusX, focusY });
    }
  };

  return (
    <div className="cap-studio">
      <div className="cap-studio-body">
        {/* Main Center Video Stage */}
        <VideoStage
          videoUrl={take.videoUrl}
          dressing={dressing}
          keyframes={keyframes}
          currentTime={currentTime}
          videoRef={videoRef}
          onTimeUpdate={(t) => setCurrentTime(t)}
          onLoadedMetadata={handleLoadedMetadata}
          onCanvasClick={handleCanvasClick}
        />

        {/* Right Rail: Studio Styling Controls */}
        <aside className="cap-studio-rail">
          {/* Proporção / Aspect Ratio */}
          <div className="cap-rail-section">
            <div className="cap-rail-title">
              <Maximize2 size={13} />
              <span>Proporção de Tela</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {(["16:9", "9:16", "1:1"] as AspectRatio[]).map((ar) => (
                <button
                  key={ar}
                  className={`cap-btn ${dressing.aspectRatio === ar ? "cap-btn-accent" : "cap-btn-subtle"}`}
                  style={{ fontSize: 11, padding: "6px 0" }}
                  onClick={() => updateDressing({ aspectRatio: ar })}
                >
                  {ar === "16:9" ? "16:9 Paisagem" : ar === "9:16" ? "9:16 Vertical" : "1:1 Feed"}
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
                className="cap-btn cap-btn-subtle"
                style={{ fontSize: 11, padding: "3px 8px" }}
                onClick={handleAddZoomAtCurrentTime}
              >
                + Zoom
              </button>
            </div>

            {keyframes.length === 0 ? (
              <div style={{ fontSize: 12, color: "rgb(var(--cm-fg-muted))", lineHeight: 1.5 }}>
                Nenhum zoom configurado. Clique em "+ Zoom" para aproximar em um ponto do seu vídeo.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {keyframes.map((kf) => (
                  <div key={kf.id} className="cap-zoom-item">
                    <div className="cap-zoom-meta">
                      <div className="cap-zoom-name">{kf.label}</div>
                      <div className="cap-zoom-time">
                        {kf.time.toFixed(1)}s · {kf.duration.toFixed(1)}s de duração
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {/* Scale Selector */}
                      <select
                        value={kf.scale}
                        onChange={(e) =>
                          handleUpdateZoom(kf.id, { scale: Number(e.target.value) })
                        }
                        className="cap-input"
                        style={{ padding: "4px 6px", fontSize: 11 }}
                      >
                        <option value={1.3}>1.3x</option>
                        <option value={1.6}>1.6x</option>
                        <option value={2.0}>2.0x</option>
                        <option value={2.4}>2.4x</option>
                      </select>

                      <button
                        className="cap-btn cap-btn-subtle"
                        style={{ padding: "6px 8px", color: "rgb(var(--cm-danger))" }}
                        onClick={() => handleDeleteZoom(kf.id)}
                        title="Remover zoom"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Bottom Timeline */}
      <TimelineBar
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        keyframes={keyframes}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        onAddZoom={handleAddZoomAtCurrentTime}
      />
    </div>
  );
}
