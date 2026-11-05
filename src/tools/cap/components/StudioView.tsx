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
  const [duration, setDuration] = useState(() => {
    if (take.duration && Number.isFinite(take.duration) && take.duration > 0) {
      return take.duration;
    }
    return 10;
  });

  const dressing = take.dressing;
  const keyframes = take.zoomKeyframes || [];

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
      time: Math.max(0, Math.min(duration - 0.5, currentTime - 0.2)),
      duration: Math.max(0.8, zoomDuration),
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
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
        />

        {/* Right Rail: Studio Styling Controls */}
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
