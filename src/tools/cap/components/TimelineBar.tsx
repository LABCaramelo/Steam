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
  const formatTime = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const rem = (s % 60).toString().padStart(2, "0");
    return `${m}:${rem}`;
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(percent * duration);
  };

  const safeDuration = duration > 0 ? duration : 1;
  const playheadPercent = (currentTime / safeDuration) * 100;

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
            <span>{formatTime(currentTime)}</span>
            <span style={{ opacity: 0.4, margin: "0 4px" }}>/</span>
            <span style={{ opacity: 0.6 }}>{formatTime(duration)}</span>
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

      {/* Interactive Timeline Track */}
      <div className="cap-timeline-track-wrap" onClick={handleTrackClick}>
        {/* Progress fill */}
        <div
          className="cap-timeline-progress-fill"
          style={{ width: `${playheadPercent}%` }}
        />

        {/* Zoom Keyframe Markers */}
        {keyframes.map((kf) => {
          const leftPercent = (kf.time / safeDuration) * 100;
          const widthPercent = (kf.duration / safeDuration) * 100;

          return (
            <div
              key={kf.id}
              className="cap-timeline-zoom-marker"
              style={{
                left: `${leftPercent}%`,
                width: `${Math.max(2, widthPercent)}%`,
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
