import { useState, useRef, useEffect } from "react";
import { Play, Pause, ZoomIn } from "lucide-react";
import type { ZoomKeyframe } from "../types";

interface TimelineBarProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  keyframes: ZoomKeyframe[];
  selectedZoomId?: string | null;
  onSelectZoom?: (id: string | null) => void;
  onUpdateZoom?: (id: string, patch: Partial<ZoomKeyframe>) => void;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onAddZoom: () => void;
}

interface DragState {
  type: "move" | "resize-left" | "resize-right";
  keyframeId: string;
  startX: number;
  initialTime: number;
  initialDuration: number;
}

export function TimelineBar({
  isPlaying,
  currentTime,
  duration,
  keyframes,
  selectedZoomId,
  onSelectZoom,
  onUpdateZoom,
  onPlayPause,
  onSeek,
  onAddZoom,
}: TimelineBarProps) {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [activeDrag, setActiveDrag] = useState<{ id: string; type: string } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);

  // Safe formatting that never produces Infinity:NaN
  const formatTime = (sec: number) => {
    if (!Number.isFinite(sec) || isNaN(sec) || sec < 0) return "00:00";
    const s = Math.floor(sec);
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const rem = (s % 60).toString().padStart(2, "0");
    return `${m}:${rem}`;
  };

  // Safe duration guaranteed to be a finite, positive number
  const safeDuration =
    Number.isFinite(duration) && duration > 0 && duration !== Infinity ? duration : 10;
  const safeCurrentTime =
    Number.isFinite(currentTime) && currentTime >= 0 ? Math.min(safeDuration, currentTime) : 0;
  const playheadPercent = Math.max(0, Math.min(100, (safeCurrentTime / safeDuration) * 100));

  // Scrubbing logic
  const seekFromClientX = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(ratio * safeDuration);
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only scrub if not interacting with drag handles or markers
    if (dragStateRef.current) return;
    e.preventDefault();
    setIsScrubbing(true);
    seekFromClientX(e.clientX);
  };

  // Global pointer move & up handler for both scrubbing and keyframe dragging/resizing
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      // 1. Scrubbing track
      if (isScrubbing) {
        seekFromClientX(e.clientX);
        return;
      }

      // 2. Dragging or Resizing Zoom Keyframe
      const ds = dragStateRef.current;
      if (!ds || !trackRef.current) return;

      const trackRect = trackRef.current.getBoundingClientRect();
      if (trackRect.width <= 0) return;

      const deltaX = e.clientX - ds.startX;
      const deltaSec = (deltaX / trackRect.width) * safeDuration;

      if (ds.type === "move") {
        const maxTime = Math.max(0, safeDuration - ds.initialDuration);
        const newTime = Math.max(0, Math.min(maxTime, ds.initialTime + deltaSec));
        onUpdateZoom?.(ds.keyframeId, { time: Number(newTime.toFixed(2)) });
        onSeek(newTime);
      } else if (ds.type === "resize-right") {
        const maxDuration = Math.max(0.4, safeDuration - ds.initialTime);
        const newDuration = Math.max(0.4, Math.min(maxDuration, ds.initialDuration + deltaSec));
        onUpdateZoom?.(ds.keyframeId, { duration: Number(newDuration.toFixed(2)) });
      } else if (ds.type === "resize-left") {
        const endTime = ds.initialTime + ds.initialDuration;
        const newTime = Math.max(0, Math.min(endTime - 0.4, ds.initialTime + deltaSec));
        const newDuration = Math.max(0.4, endTime - newTime);
        onUpdateZoom?.(ds.keyframeId, {
          time: Number(newTime.toFixed(2)),
          duration: Number(newDuration.toFixed(2)),
        });
        onSeek(newTime);
      }
    };

    const handlePointerUp = () => {
      if (isScrubbing) {
        setIsScrubbing(false);
      }
      if (dragStateRef.current) {
        dragStateRef.current = null;
        setActiveDrag(null);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isScrubbing, safeDuration, onUpdateZoom, onSeek]);

  // Marker drag start
  const handleMarkerPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    kf: ZoomKeyframe
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectZoom?.(kf.id);
    onSeek(kf.time + Math.min(0.5, kf.duration / 2));

    dragStateRef.current = {
      type: "move",
      keyframeId: kf.id,
      startX: e.clientX,
      initialTime: kf.time,
      initialDuration: kf.duration,
    };
    setActiveDrag({ id: kf.id, type: "move" });
  };

  // Handle resize start
  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    kf: ZoomKeyframe,
    edge: "left" | "right"
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectZoom?.(kf.id);

    dragStateRef.current = {
      type: edge === "left" ? "resize-left" : "resize-right",
      keyframeId: kf.id,
      startX: e.clientX,
      initialTime: kf.time,
      initialDuration: kf.duration,
    };
    setActiveDrag({ id: kf.id, type: edge });
  };

  return (
    <div className="cap-timeline-bar">
      <div className="cap-timeline-playback">
        <div className="cap-playback-left">
          <button
            className="cap-btn cap-btn-accent"
            style={{ width: 32, height: 32, padding: 0 }}
            onClick={onPlayPause}
            title={isPlaying ? "Pausar (Espaço)" : "Reproduzir (Espaço)"}
          >
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          </button>

          <div className="cap-time-display">
            <span>{formatTime(safeCurrentTime)}</span>
            <span style={{ opacity: 0.4, margin: "0 4px" }}>/</span>
            <span style={{ opacity: 0.6 }}>{formatTime(safeDuration)}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="cap-btn cap-btn-subtle"
            style={{ fontSize: 11, padding: "5px 12px" }}
            onClick={onAddZoom}
            title="Adicionar ponto de zoom cinemático na posição atual"
          >
            <ZoomIn size={14} color="rgb(var(--cm-info))" />
            <span>Adicionar Zoom Aqui</span>
          </button>
        </div>
      </div>

      {/* Interactive Timeline Track with Live Dragging / Scrubbing */}
      <div
        className="cap-timeline-track-wrap"
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
      >
        {/* Progress fill */}
        <div
          className="cap-timeline-progress-fill"
          style={{ width: `${playheadPercent}%` }}
        />

        {/* Zoom Keyframe Markers with Drag & Resize Handles */}
        {keyframes.map((kf) => {
          const leftPercent = Math.max(0, Math.min(100, (kf.time / safeDuration) * 100));
          const widthPercent = Math.max(2, Math.min(100 - leftPercent, (kf.duration / safeDuration) * 100));
          const isSelected = selectedZoomId === kf.id;
          const isDragging = activeDrag?.id === kf.id;

          return (
            <div
              key={kf.id}
              className={`cap-timeline-zoom-marker ${isSelected ? "selected" : ""} ${isDragging ? "dragging" : ""}`}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
              }}
              title={`${kf.label || "Zoom"} (${kf.scale}x) — Arraste para mover, use as pontas para esticar`}
              onPointerDown={(e) => handleMarkerPointerDown(e, kf)}
            >
              {/* Left Resize Handle */}
              <div
                className="cap-zoom-handle cap-zoom-handle-left"
                title="Arrastar para alterar início"
                onPointerDown={(e) => handleResizePointerDown(e, kf, "left")}
              />

              <div className="cap-zoom-marker-content">
                <span className="cap-zoom-marker-scale">{kf.scale}x</span>
                {widthPercent > 6 && (
                  <span className="cap-zoom-marker-label">{kf.label || "Zoom"}</span>
                )}
              </div>

              {/* Right Resize Handle */}
              <div
                className="cap-zoom-handle cap-zoom-handle-right"
                title="Arrastar para alterar duração"
                onPointerDown={(e) => handleResizePointerDown(e, kf, "right")}
              />
            </div>
          );
        })}

        {/* Playhead Marker */}
        <div
          className="cap-timeline-playhead"
          style={{ left: `${playheadPercent}%` }}
        />
      </div>
    </div>
  );
}
