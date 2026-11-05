import type { FrameItem } from "../types";

interface TimelineBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  totalDuration: number;
  onSeek: (time: number) => void;
  frames: FrameItem[];
  activeFrameIndex: number;
  onSelectFrame: (index: number) => void;
}

export function TimelineBar({
  isPlaying,
  onTogglePlay,
  currentTime,
  totalDuration,
  onSeek,
  frames,
  activeFrameIndex,
  onSelectFrame,
}: TimelineBarProps) {
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms}`;
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * totalDuration);
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="studio-timeline-bar">
      <div className="studio-timeline">
        <div className="studio-transport">
          <button
            type="button"
            className="studio-play-btn"
            aria-label={isPlaying ? "Pausar" : "Reproduzir"}
            onClick={onTogglePlay}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <rect x="6" y="4" width="4" height="16" rx="1.5" />
                <rect x="14" y="4" width="4" height="16" rx="1.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M7 4.5v15l13-7.5-13-7.5z" />
              </svg>
            )}
          </button>
          <span className="studio-time studio-time-current">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </span>
        </div>

        <div
          className="studio-track"
          role="slider"
          aria-label="Timeline"
          tabIndex={0}
          onClick={handleTrackClick}
        >
          {/* Progress Playhead Line */}
          <div className="studio-track-progress" style={{ width: `${progressPercent}%` }} />
          <div className="studio-playhead-thumb" style={{ left: `${progressPercent}%` }} />

          {/* Cuts representation */}
          <div className="studio-frame-cuts" aria-hidden="true">
            {frames.map((frame, idx) => {
              const isActive = idx === activeFrameIndex;
              return (
                <div
                  key={frame.id}
                  className={`studio-frame-cut ${isActive ? "studio-frame-cut-active" : ""} ${
                    frame.inverted ? "studio-frame-cut-inverted" : ""
                  }`}
                  style={{ flex: `${frame.durationFrames || 4} 1 0%` }}
                  title={`${frame.label} (#${idx + 1})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectFrame(idx);
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
