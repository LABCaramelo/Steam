import { useRef, useEffect } from "react";
import type { CanvasDressing, ZoomKeyframe } from "../types";
import { getInterpolatedZoom } from "../utils/mediaRecorder";

interface VideoStageProps {
  videoUrl: string;
  dressing: CanvasDressing;
  keyframes: ZoomKeyframe[];
  currentTime: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTimeUpdate: (time: number) => void;
  onLoadedMetadata: () => void;
  onCanvasClick?: (xPercent: number, yPercent: number) => void;
}

export function VideoStage({
  videoUrl,
  dressing,
  keyframes,
  currentTime,
  videoRef,
  onTimeUpdate,
  onLoadedMetadata,
  onCanvasClick,
}: VideoStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current && videoUrl) {
      videoRef.current.load();
    }
  }, [videoUrl, videoRef]);

  // Compute live interpolated zoom & pan transform based on currentTime
  const { scale, focusX, focusY } = getInterpolatedZoom(keyframes, currentTime);

  // Translate focus coordinate (0 to 1) into transform origin / translate
  const transX = (0.5 - focusX) * 100 * (scale - 1);
  const transY = (0.5 - focusY) * 100 * (scale - 1);

  // Aspect ratio styling
  const getAspectRatioStyle = () => {
    switch (dressing.aspectRatio) {
      case "9:16":
        return { width: 360, height: 640 };
      case "1:1":
        return { width: 560, height: 560 };
      case "4:3":
        return { width: 680, height: 510 };
      case "16:9":
      default:
        return { width: 840, height: 472 };
    }
  };

  const cardDims = getAspectRatioStyle();

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onCanvasClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onCanvasClick(x, y);
  };

  return (
    <div className="cap-studio-stage-wrap" ref={containerRef}>
      {/* Outer Card with Background Preset & Aspect Ratio */}
      <div
        className={`cap-canvas-card bg-${dressing.background}`}
        style={{
          width: cardDims.width,
          height: cardDims.height,
          padding: dressing.padding,
        }}
      >
        {/* Inner Window with Chrome, Border Radius, and Drop Shadow */}
        <div
          className={`cap-inner-window shadow-${dressing.shadow}`}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: dressing.borderRadius,
          }}
          onClick={handleStageClick}
        >
          {/* macOS Chrome Header */}
          {dressing.windowChrome === "macos" && (
            <div className="cap-window-chrome-macos">
              <div className="cap-traffic-lights">
                <div className="cap-traffic-dot cap-dot-red" />
                <div className="cap-traffic-dot cap-dot-yellow" />
                <div className="cap-traffic-dot cap-dot-green" />
              </div>
              <div className="cap-chrome-pill">
                <span>{dressing.windowTitle || "lab.caramelo/cap"}</span>
              </div>
            </div>
          )}

          {/* Video Viewport applying dynamic zoom transform */}
          <div className="cap-video-viewport">
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              className="cap-stage-video"
              style={{
                transform: `scale(${scale}) translate(${transX}%, ${transY}%)`,
              }}
              onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
              onLoadedMetadata={onLoadedMetadata}
            />

            {/* Smart Zoom indicator badge when zoomed */}
            {scale > 1.05 && (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  padding: "4px 10px",
                  background: "rgba(255, 112, 26, 0.9)",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 900,
                  color: "#101014",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                }}
              >
                ZOOM {scale.toFixed(1)}X
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
