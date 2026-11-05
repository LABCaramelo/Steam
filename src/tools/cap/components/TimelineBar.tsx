import { useState, useRef, useEffect } from "react";
import { Play, Pause, ZoomIn } from "lucide-react";
import type { ZoomKeyframe } from "../types";

interface TimelineBarProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  keyframes: ZoomKeyframe[];
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onAddZoom: () => void;
}

export function TimelineBar({
  isPlaying,
  currentTime,
  duration,
  keyframes,
  onPlayPause,
  onSeek,
  onAddZoom,
}: TimelineBarProps) {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

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

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsScrubbing(true);
    seekFromClientX(e.clientX);
  };

  useEffect(() => {
    if (!isScrubbing) return;

    const handlePointerMove = (e: PointerEvent) => {
      seekFromClientX(e.clientX);
    };

    const handlePointerUp = () => {
      setIsScrubbing(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isScrubbing, safeDuration]);

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
        onPointerDown={handlePointerDown}
      >
        {/* Progress fill */}
        <div
          className="cap-timeline-progress-fill"
          style={{ width: `${playheadPercent}%` }}
        />

        {/* Zoom Keyframe Markers */}
        {keyframes.map((kf) => {
          const leftPercent = Math.max(0, Math.min(100, (kf.time / safeDuration) * 100));
          const widthPercent = Math.max(2, Math.min(100 - leftPercent, (kf.duration / safeDuration) * 100));

          return (
            <div
              key={kf.id}
              className="cap-timeline-zoom-marker"
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
              }}
              title={`${kf.label || "Zoom"} (${kf.scale}x)`}
              onClick={(e) => {
                e.stopPropagation();
                onSeek(kf.time);
              }}
            >
              <span>{kf.scale}x</span>
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
