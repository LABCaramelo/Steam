import { useRef, useEffect, useState } from "react";
import type { CanvasDressing, ZoomKeyframe } from "../types";
import { getInterpolatedZoom } from "../utils/mediaRecorder";

interface VideoStageProps {
  videoUrl: string;
  dressing: CanvasDressing;
  keyframes: ZoomKeyframe[];
  selectedZoom?: ZoomKeyframe | null;
  onUpdateZoom?: (id: string, patch: Partial<ZoomKeyframe>) => void;
  currentTime: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTimeUpdate: (time: number) => void;
  onLoadedMetadata: () => void;
  onCanvasClick?: (xPercent: number, yPercent: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export function VideoStage({
  videoUrl,
  dressing,
  keyframes,
  selectedZoom,
  onUpdateZoom,
  currentTime,
  videoRef,
  onTimeUpdate,
  onLoadedMetadata,
  onCanvasClick,
  onPlay,
  onPause,
  onEnded,
}: VideoStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [videoRatio, setVideoRatio] = useState<number>(16 / 9);
  const [isDraggingReticle, setIsDraggingReticle] = useState(false);
  const reticleDragRef = useRef<{
    startX: number;
    startY: number;
    initialFocusX: number;
    initialFocusY: number;
    vpW: number;
    vpH: number;
  } | null>(null);

  useEffect(() => {
    if (videoRef.current && videoUrl) {
      videoRef.current.load();
    }
  }, [videoUrl, videoRef]);

  // Sync video native ratio if already available
  useEffect(() => {
    const v = videoRef.current;
    if (v && v.videoWidth && v.videoHeight) {
      setVideoRatio(v.videoWidth / v.videoHeight);
    }
  }, [videoUrl, videoRef]);

  // Dynamically observe stage wrapper size to fill available screen
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    measure();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width, height });
        }
      }
    });

    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const handleLoadedMetadataInternal = () => {
    const v = videoRef.current;
    if (v && v.videoWidth && v.videoHeight) {
      setVideoRatio(v.videoWidth / v.videoHeight);
    }
    onLoadedMetadata();
  };

  // Compute live interpolated zoom & pan transform based on currentTime
  const { scale, focusX, focusY } = getInterpolatedZoom(keyframes, currentTime);

  // Translate focus coordinate (0 to 1) into CSS translation matching canvas export exactly
  const transX = (0.5 - focusX) * 100;
  const transY = (0.5 - focusY) * 100;

  // Reticle screen position inside video viewport
  const reticleLeft = selectedZoom
    ? Math.max(5, Math.min(95, 50 + (selectedZoom.focusX - focusX) * 100 * scale))
    : 50;
  const reticleTop = selectedZoom
    ? Math.max(5, Math.min(95, 50 + (selectedZoom.focusY - focusY) * 100 * scale))
    : 50;

  // Global dragging handler for the focal reticle
  useEffect(() => {
    if (!isDraggingReticle) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rd = reticleDragRef.current;
      if (!rd || !selectedZoom || !onUpdateZoom) return;

      const deltaX = e.clientX - rd.startX;
      const deltaY = e.clientY - rd.startY;

      const newFocusX = Math.max(
        0.05,
        Math.min(0.95, rd.initialFocusX + deltaX / (rd.vpW * Math.max(1, scale)))
      );
      const newFocusY = Math.max(
        0.05,
        Math.min(0.95, rd.initialFocusY + deltaY / (rd.vpH * Math.max(1, scale)))
      );

      onUpdateZoom(selectedZoom.id, {
        focusX: Number(newFocusX.toFixed(3)),
        focusY: Number(newFocusY.toFixed(3)),
      });
    };

    const handlePointerUp = () => {
      setIsDraggingReticle(false);
      reticleDragRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDraggingReticle, selectedZoom, onUpdateZoom, scale]);

  const handleReticlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedZoom || !viewportRef.current) return;
    const vpRect = viewportRef.current.getBoundingClientRect();
    reticleDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialFocusX: selectedZoom.focusX,
      initialFocusY: selectedZoom.focusY,
      vpW: vpRect.width,
      vpH: vpRect.height,
    };
    setIsDraggingReticle(true);
  };

  // Canvas target aspect ratio
  const getCanvasRatio = () => {
    switch (dressing.aspectRatio) {
      case "9:16":
        return 9 / 16;
      case "1:1":
        return 1;
      case "4:3":
        return 4 / 3;
      case "fit":
        return videoRatio || 16 / 9;
      case "16:9":
      default:
        return 16 / 9;
    }
  };

  const canvasRatio = getCanvasRatio();

  // Responsive dimensions inside container with comfortable margins
  const availW = Math.max(320, (containerSize.width || 920) - 56);
  const availH = Math.max(220, (containerSize.height || 600) - 56);

  let cardW = availW;
  let cardH = cardW / canvasRatio;
  if (cardH > availH) {
    cardH = availH;
    cardW = cardH * canvasRatio;
  }

  // Window chrome height
  const chromeH =
    dressing.windowChrome === "macos" ? 34 : dressing.windowChrome === "minimal" ? 24 : 0;

  // Scale padding proportionally relative to base 840px canvas
  const scaleFactor = Math.min(1.4, Math.max(0.55, cardW / 840));
  const effectivePadding = Math.round(dressing.padding * scaleFactor);

  const maxWinW = Math.max(80, cardW - effectivePadding * 2);
  const maxWinH = Math.max(80, cardH - effectivePadding * 2);

  // Inner window dimensions preserving the native video aspect ratio
  let winW = maxWinW;
  let winViewportH = winW / videoRatio;
  let winH = winViewportH + chromeH;

  if (winH > maxWinH) {
    winH = maxWinH;
    winViewportH = Math.max(40, winH - chromeH);
    winW = winViewportH * videoRatio;
  }

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingReticle) return;
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const u = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    // When a zoom is selected, clicking anywhere on the screen updates its focal target!
    if (selectedZoom && onUpdateZoom) {
      const targetX = focusX + (u - 0.5) / Math.max(1, scale);
      const targetY = focusY + (v - 0.5) / Math.max(1, scale);
      const clampedX = Math.max(0.05, Math.min(0.95, targetX));
      const clampedY = Math.max(0.05, Math.min(0.95, targetY));
      onUpdateZoom(selectedZoom.id, {
        focusX: Number(clampedX.toFixed(3)),
        focusY: Number(clampedY.toFixed(3)),
      });
    }

    onCanvasClick?.(u, v);
  };

  const videoFitMode = dressing.videoFit || "cover";

  return (
    <div className="cap-studio-stage-wrap" ref={containerRef}>
      {/* Outer Card with Background Preset & Responsive Aspect Ratio */}
      <div
        className={`cap-canvas-card bg-${dressing.background}`}
        style={{
          width: Math.round(cardW),
          height: Math.round(cardH),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: effectivePadding,
          boxSizing: "border-box",
        }}
      >
        {/* Inner Window with Chrome, Border Radius, Drop Shadow, matching video aspect ratio */}
        <div
          className={`cap-inner-window shadow-${dressing.shadow}`}
          style={{
            width: Math.round(winW),
            height: Math.round(winH),
            borderRadius: Math.round(dressing.borderRadius * scaleFactor),
          }}
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
          <div
            ref={viewportRef}
            className="cap-video-viewport"
            onClick={handleStageClick}
            style={{
              flex: 1,
              width: "100%",
              height: `calc(100% - ${chromeH}px)`,
              position: "relative",
              overflow: "hidden",
              cursor: selectedZoom ? "crosshair" : "default",
            }}
          >
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              className="cap-stage-video"
              style={{
                width: "100%",
                height: "100%",
                objectFit: videoFitMode,
                transform: `scale(${scale}) translate(${transX}%, ${transY}%)`,
              }}
              onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
              onLoadedMetadata={handleLoadedMetadataInternal}
              onPlay={onPlay}
              onPause={onPause}
              onEnded={onEnded}
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
                  pointerEvents: "none",
                  zIndex: 25,
                }}
              >
                ZOOM {scale.toFixed(1)}X
              </div>
            )}

            {/* Interactive Focal Reticle Target for the Selected Zoom */}
            {selectedZoom && (
              <div
                className="cap-focal-reticle"
                style={{
                  left: `${reticleLeft}%`,
                  top: `${reticleTop}%`,
                }}
                onPointerDown={handleReticlePointerDown}
                title="Ponto Focal do Zoom — Arraste para reposicionar ou clique em qualquer lugar do vídeo"
              >
                <div className="cap-focal-reticle-ring" />
                <div className="cap-focal-reticle-crosshair-h" />
                <div className="cap-focal-reticle-crosshair-v" />
                <div className="cap-focal-reticle-dot" />

                <div className="cap-focal-reticle-badge">
                  <span>Foco ({Math.round(selectedZoom.focusX * 100)}%, {Math.round(selectedZoom.focusY * 100)}%)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
