import { useRef, useState, useEffect, useCallback } from "react";
import type {
  StoryLayer,
  StoryBackground,
  TextLayer,
  WidgetLayer,
  StickerLayer,
  ImageLayer,
  VideoLayer,
} from "../types";
import {
  QuestionBoxWidget,
  PollWidget,
  SliderWidget,
  CountdownWidget,
  LinkStickerWidget,
  MusicStickerWidget,
  MentionStickerWidget,
} from "../components/widgets";
import { SafeZonesOverlay } from "../components/SafeZonesOverlay";
import { getFilterConfig } from "../utils/filters";

interface StoriesCanvasProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  background: StoryBackground;
  layers: StoryLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, patch: Partial<StoryLayer>) => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onEditTextLayer: (id: string) => void;
  showSafeZones: boolean;
  isMuted: boolean;
  onDragStateChange?: (isDragging: boolean, isOverTrash: boolean) => void;
  onTapEmpty?: () => void;
}

export function StoriesCanvas({
  canvasRef,
  background,
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onEditTextLayer,
  showSafeZones,
  isMuted,
  onDragStateChange,
  onTapEmpty,
}: StoriesCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  // Snap guides
  const [showSnapX, setShowSnapX] = useState(false);
  const [showSnapY, setShowSnapY] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isOverTrashRef = useRef(false);

  // Dragging state
  const dragRef = useRef<{
    layerId: string;
    startX: number;
    startY: number;
    layerStartX: number;
    layerStartY: number;
  } | null>(null);

  // Rotating & scaling state
  const transformRef = useRef<{
    layerId: string;
    type: "rotate" | "scale";
    centerX: number;
    centerY: number;
    startAngle: number;
    startLayerRotation: number;
    startDist: number;
    startLayerScale: number;
  } | null>(null);

  // Responsive canvas scale calculation
  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const isMobile = clientWidth <= 768;
    const padW = isMobile ? 0 : 32;
    const padH = isMobile ? 0 : 48;
    const maxW = clientWidth - padW;
    const maxH = clientHeight - padH;

    const scaleW = maxW / 1080;
    const scaleH = maxH / 1920;
    const nextScale = isMobile ? Math.min(scaleW, scaleH) : Math.min(scaleW, scaleH, 0.7);
    setScale(Math.max(nextScale, 0.18));
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [updateScale]);

  // Pointer down on a layer to drag
  const handlePointerDownLayer = (e: React.PointerEvent, layer: StoryLayer) => {
    if (layer.locked) return;
    e.stopPropagation();
    onSelectLayer(layer.id);
    setIsDragging(true);

    dragRef.current = {
      layerId: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      layerStartX: layer.x,
      layerStartY: layer.y,
    };

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragRef.current) {
      const { layerId, startX, startY, layerStartX, layerStartY } = dragRef.current;
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;

      let newX = layerStartX + dx;
      let newY = layerStartY + dy;

      // Magnetic snap to center X (540)
      if (Math.abs(newX - 540) < 18) {
        newX = 540;
        setShowSnapX(true);
      } else {
        setShowSnapX(false);
      }

      // Magnetic snap to center Y (960)
      if (Math.abs(newY - 960) < 18) {
        newY = 960;
        setShowSnapY(true);
      } else {
        setShowSnapY(false);
      }

      onUpdateLayer(layerId, { x: Math.round(newX), y: Math.round(newY) });

      // Check if point is over bottom trash zone
      const trashEl = document.getElementById("story-trash-zone");
      let over = false;
      if (trashEl) {
        const rect = trashEl.getBoundingClientRect();
        const dist = Math.hypot(
          e.clientX - (rect.left + rect.width / 2),
          e.clientY - (rect.top + rect.height / 2)
        );
        if (dist < 75) {
          over = true;
        }
      }
      isOverTrashRef.current = over;
      onDragStateChange?.(true, over);
    }

    if (transformRef.current) {
      const { type, layerId, centerX, centerY, startAngle, startLayerRotation, startDist, startLayerScale } =
        transformRef.current;

      const curAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      const curDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);

      if (type === "rotate") {
        let newRot = startLayerRotation + (curAngle - startAngle);
        // Snap to 0, 90, 180, 270 if close
        if (Math.abs(newRot % 90) < 4 || Math.abs((newRot % 90) - 90) < 4) {
          newRot = Math.round(newRot / 90) * 90;
        }
        onUpdateLayer(layerId, { rotation: Math.round(newRot) });
      } else if (type === "scale") {
        const factor = curDist / (startDist || 1);
        const newScale = Math.max(0.3, Math.min(3.5, startLayerScale * factor));
        onUpdateLayer(layerId, { scale: Number(newScale.toFixed(2)) });
      }
    }
  };

  const handlePointerUp = () => {
    if (dragRef.current && isOverTrashRef.current) {
      onDeleteLayer(dragRef.current.layerId);
      onSelectLayer(null);
    }
    dragRef.current = null;
    transformRef.current = null;
    setShowSnapX(false);
    setShowSnapY(false);
    isOverTrashRef.current = false;
    setIsDragging(false);
    onDragStateChange?.(false, false);
  };

  // Start rotation handle
  const handleStartRotate = (e: React.PointerEvent, layer: StoryLayer) => {
    e.stopPropagation();
    const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

    transformRef.current = {
      layerId: layer.id,
      type: "rotate",
      centerX,
      centerY,
      startAngle,
      startLayerRotation: layer.rotation || 0,
      startDist: 0,
      startLayerScale: layer.scale || 1,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Start scale handle
  const handleStartScale = (e: React.PointerEvent, layer: StoryLayer) => {
    e.stopPropagation();
    const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);

    transformRef.current = {
      layerId: layer.id,
      type: "scale",
      centerX,
      centerY,
      startAngle: 0,
      startLayerRotation: 0,
      startDist,
      startLayerScale: layer.scale || 1,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const filterConfig = getFilterConfig(background.filter);
  const filterStyle =
    filterConfig && filterConfig.cssFilter !== "none"
      ? filterConfig.cssFilter
      : undefined;

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onClick={(e) => {
        if (e.target === containerRef.current || (e.target as HTMLElement).id === "story-master-canvas") {
          if (selectedLayerId) {
            onSelectLayer(null);
          } else if (onTapEmpty) {
            onTapEmpty();
          }
        }
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {/* 9:16 Scaled Canvas */}
      <div
        ref={canvasRef as any}
        id="story-master-canvas"
        style={{
          position: "relative",
          width: 1080,
          height: 1920,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          boxShadow: containerRef.current && containerRef.current.clientWidth <= 768 ? "none" : "0 25px 80px rgba(0,0,0,0.6)",
          borderRadius: containerRef.current && containerRef.current.clientWidth <= 768 ? 0 : 28,
          overflow: "hidden",
          background: "#101014",
          filter: filterStyle,
          flexShrink: 0,
        }}
      >
        {/* Background layer */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            filter: background.blur ? `blur(${background.blur}px)` : "none",
            background:
              background.type === "color" || background.type === "gradient"
                ? background.value
                : "#101014",
          }}
        >
          {background.type === "image" && (
            <img
              src={background.value}
              alt="Story Background"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
          {background.type === "video" && (
            <video
              src={background.value}
              autoPlay
              loop
              playsInline
              muted={isMuted}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
          {background.overlayOpacity && background.overlayOpacity > 0 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: background.overlayColor || "#000000",
                opacity: background.overlayOpacity,
              }}
            />
          )}
        </div>

        {/* Magnetic Snap Guidelines */}
        {showSnapX && (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 540,
              width: 2,
              background: "#25BFFF",
              boxShadow: "0 0 10px #25BFFF",
              zIndex: 9998,
              pointerEvents: "none",
            }}
          />
        )}
        {showSnapY && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 960,
              height: 2,
              background: "#25BFFF",
              boxShadow: "0 0 10px #25BFFF",
              zIndex: 9998,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Layers Rendering */}
        {layers.map((layer) => {
          const isSelected = layer.id === selectedLayerId;

          return (
            <div
              key={layer.id}
              onPointerDown={(e) => handlePointerDownLayer(e, layer)}
              onDoubleClick={() => {
                if (layer.type === "text") onEditTextLayer(layer.id);
              }}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                transform: `translate3d(${layer.x}px, ${layer.y}px, 0) translate(-50%, -50%) rotate(${
                  layer.rotation || 0
                }deg) scale(${layer.scale || 1})`,
                transformOrigin: "center center",
                width: layer.type === "text" ? "max-content" : undefined,
                maxWidth:
                  layer.type === "text"
                    ? `${(layer as TextLayer).maxWidth || 860}px`
                    : undefined,
                cursor: layer.locked ? "default" : "move",
                zIndex: isSelected ? 999 : undefined,
                touchAction: "none",
                userSelect: "none",
                WebkitUserSelect: "none",
              }}
            >
              {/* Selected Layer Bounding Box & Handles */}
              {isSelected && !isDragging && (
                <div
                  style={{
                    position: "absolute",
                    inset: -12,
                    border: "2px dashed #FF701A",
                    borderRadius: 12,
                    pointerEvents: "none",
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
                  }}
                >
                  {/* Top Rotate Handle */}
                  <div
                    onPointerDown={(e) => handleStartRotate(e, layer)}
                    title="Girar"
                    style={{
                      position: "absolute",
                      top: -40,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "#FF701A",
                      border: "2px solid #FFF4E8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#101014",
                      fontSize: 16,
                      cursor: "grab",
                      pointerEvents: "auto",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                    }}
                  >
                    ↻
                  </div>

                  {/* Bottom Right Scale Handle */}
                  <div
                    onPointerDown={(e) => handleStartScale(e, layer)}
                    title="Redimensionar"
                    style={{
                      position: "absolute",
                      bottom: -16,
                      right: -16,
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "#25BFFF",
                      border: "2px solid #FFF4E8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#101014",
                      fontSize: 14,
                      cursor: "nwse-resize",
                      pointerEvents: "auto",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                    }}
                  >
                    ⤡
                  </div>

                  {/* Top quick action pills */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: "50%",
                      transform: "translateX(-50%) translateY(-50px)",
                      display: "flex",
                      gap: 8,
                      background: "rgba(16, 16, 20, 0.95)",
                      padding: "6px 12px",
                      borderRadius: 30,
                      boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
                      pointerEvents: "auto",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {layer.type === "text" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTextLayer(layer.id);
                        }}
                        style={{
                          background: "#22222A",
                          color: "#FFF4E8",
                          border: "none",
                          borderRadius: 16,
                          padding: "6px 12px",
                          fontSize: 18,
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        ✏️ Editar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateLayer(layer.id);
                      }}
                      style={{
                        background: "#22222A",
                        color: "#FFF4E8",
                        border: "none",
                        borderRadius: 16,
                        padding: "6px 12px",
                        fontSize: 18,
                        cursor: "pointer",
                      }}
                    >
                      📋 Duplicar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLayer(layer.id);
                      }}
                      style={{
                        background: "#FF3D8D",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: 16,
                        padding: "6px 12px",
                        fontSize: 18,
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )}

              {/* Render by layer type */}
              {renderLayerContent(layer)}
            </div>
          );
        })}

        {/* Instagram Safe Zones Overlay */}
        {showSafeZones && <SafeZonesOverlay />}
      </div>
    </div>
  );
}

function renderLayerContent(layer: StoryLayer) {
  switch (layer.type) {
    case "text":
      return <RenderTextLayer layer={layer as TextLayer} />;
    case "widget":
      return <RenderWidgetLayer layer={layer as WidgetLayer} />;
    case "sticker":
      return <RenderStickerLayer layer={layer as StickerLayer} />;
    case "image":
      return <RenderImageLayer layer={layer as ImageLayer} />;
    case "video":
      return <RenderVideoLayer layer={layer as VideoLayer} />;
    default:
      return null;
  }
}

function RenderTextLayer({ layer }: { layer: TextLayer }) {
  const getBackgroundStyle = (): React.CSSProperties => {
    switch (layer.backgroundMode) {
      case "pill":
        return {
          background: layer.backgroundColor || "#FF701A",
          padding: "12px 28px",
          borderRadius: 24,
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        };
      case "box":
        return {
          background: layer.backgroundColor || "rgba(0,0,0,0.75)",
          padding: "14px 22px",
          borderRadius: 12,
        };
      case "outline":
        return {
          WebkitTextStroke: `2px ${layer.backgroundColor || "#000000"}`,
        };
      case "neon":
        return {
          textShadow: `0 0 10px ${layer.backgroundColor || "#FF701A"}, 0 0 25px ${
            layer.backgroundColor || "#FF701A"
          }`,
        };
      default:
        return {};
    }
  };

  return (
    <div
      style={{
        fontFamily: `'${layer.font}', sans-serif`,
        fontSize: layer.fontSize,
        lineHeight: layer.lineHeight,
        letterSpacing: `${layer.letterSpacing}px`,
        color: layer.color,
        textAlign: layer.align,
        textTransform: layer.isUppercase ? "uppercase" : "none",
        fontWeight: layer.isBold ? 800 : 500,
        fontStyle: layer.isItalic ? "italic" : "normal",
        width: "max-content",
        maxWidth: `${layer.maxWidth || 860}px`,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        userSelect: "none",
        WebkitUserSelect: "none",
        boxSizing: "border-box",
        ...getBackgroundStyle(),
      }}
    >
      {layer.text}
    </div>
  );
}

function RenderWidgetLayer({ layer }: { layer: WidgetLayer }) {
  switch (layer.widgetType) {
    case "question":
      return <QuestionBoxWidget data={layer.data} />;
    case "poll":
      return <PollWidget data={layer.data} />;
    case "slider":
      return <SliderWidget data={layer.data} />;
    case "countdown":
      return <CountdownWidget data={layer.data} />;
    case "link":
      return <LinkStickerWidget data={layer.data} />;
    case "music":
      return <MusicStickerWidget data={layer.data} />;
    case "mention":
      return <MentionStickerWidget data={layer.data} />;
    default:
      return null;
  }
}

function RenderStickerLayer({ layer }: { layer: StickerLayer }) {
  if (layer.stickerType === "badge") {
    return (
      <div
        style={{
          display: "inline-block",
          background: layer.bgColor || "#FF701A",
          color: layer.color || "#FFF4E8",
          padding: "14px 28px",
          borderRadius: 36,
          fontWeight: 800,
          fontSize: 26,
          letterSpacing: 1,
          fontFamily: "'Space Grotesk', sans-serif",
          boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          whiteSpace: "nowrap",
        }}
      >
        {layer.content}
      </div>
    );
  }

  if (layer.stickerType === "emoji") {
    return (
      <div
        style={{
          fontSize: (layer.width || 60) * 1.5,
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        {layer.content}
      </div>
    );
  }

  if (layer.stickerType === "gif") {
    return (
      <img
        src={layer.content}
        alt="GIF Sticker"
        style={{
          width: layer.width || 280,
          height: layer.height || "auto",
          objectFit: "contain",
          filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.35))",
        }}
      />
    );
  }

  return <div>{layer.content}</div>;
}

function RenderImageLayer({ layer }: { layer: ImageLayer }) {
  return (
    <img
      src={layer.url}
      alt="Story Cutout"
      style={{
        width: layer.width || 400,
        height: layer.height || "auto",
        borderRadius: layer.borderRadius || 18,
        border: layer.border ? `${layer.borderWidth || 4}px solid ${layer.borderColor || "#FFF"}` : "none",
        boxShadow: layer.shadow ? "0 18px 45px rgba(0,0,0,0.4)" : "none",
        objectFit: "cover",
      }}
    />
  );
}

function RenderVideoLayer({ layer }: { layer: VideoLayer }) {
  return (
    <video
      src={layer.url}
      autoPlay
      loop={layer.loop}
      muted={layer.muted}
      playsInline
      style={{
        width: layer.width || 480,
        height: layer.height || "auto",
        borderRadius: 20,
        boxShadow: "0 18px 45px rgba(0,0,0,0.45)",
        objectFit: "cover",
      }}
    />
  );
}
