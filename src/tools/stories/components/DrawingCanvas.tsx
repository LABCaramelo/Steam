import React, { useRef, useState, useEffect, useCallback } from "react";
import { Pen, Highlighter, Sparkles, Eraser, RotateCcw, Check, Trash2 } from "lucide-react";

interface DrawingCanvasProps {
  onClose: (drawingDataUrl: string | null) => void;
  initialDataUrl?: string | null;
}

type BrushMode = "pen" | "marker" | "neon" | "eraser";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  mode: BrushMode;
  color: string;
  size: number;
  points: Point[];
}

const PALETTE = [
  "#FFFFFF",
  "#101014",
  "#FF701A",
  "#FF3D8D",
  "#25BFFF",
  "#FFD52A",
  "#7657FF",
  "#00F5D4",
  "#FF0055",
  "#70E000",
];

export function DrawingCanvas({ onClose, initialDataUrl }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<BrushMode>("pen");
  const [color, setColor] = useState<string>("#FF701A");
  const [brushSize, setBrushSize] = useState<number>(14);

  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const [strokeCount, setStrokeCount] = useState<number>(0);

  // Redraw all strokes onto the 1080x1920 canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, 1080, 1920);

    for (const stroke of strokesRef.current) {
      if (stroke.points.length < 2) continue;

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.mode === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = stroke.size * 2;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      } else if (stroke.mode === "marker") {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size * 2.2;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      } else if (stroke.mode === "neon") {
        ctx.globalCompositeOperation = "source-over";
        // Pass 1: Neon outer glow
        ctx.shadowColor = stroke.color;
        ctx.shadowBlur = stroke.size * 1.8;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();

        // Pass 2: White core
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = Math.max(3, stroke.size * 0.45);
        ctx.stroke();
      } else {
        // Standard pen
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }

      ctx.restore();
    }
  }, []);

  // Load initial drawing image if provided
  useEffect(() => {
    if (!initialDataUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 1080, 1920);
    };
    img.src = initialDataUrl;
  }, [initialDataUrl]);

  // Touch and pointer drawing coordinate converter
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1080 / rect.width;
    const scaleY = 1920 / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getCanvasCoords(e);
    const newStroke: Stroke = {
      mode,
      color,
      size: brushSize,
      points: [pt],
    };
    currentStrokeRef.current = newStroke;
    strokesRef.current.push(newStroke);
    setStrokeCount((c) => c + 1);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentStrokeRef.current) return;
    const pt = getCanvasCoords(e);
    currentStrokeRef.current.points.push(pt);
    redrawCanvas();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    currentStrokeRef.current = null;
    redrawCanvas();
  };

  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    setStrokeCount((c) => Math.max(0, c - 1));
    redrawCanvas();
  };

  const handleClear = () => {
    strokesRef.current = [];
    setStrokeCount(0);
    redrawCanvas();
  };

  const handleDone = () => {
    const canvas = canvasRef.current;
    if (!canvas || strokesRef.current.length === 0) {
      onClose(initialDataUrl || null);
      return;
    }
    const dataUrl = canvas.toDataURL("image/png");
    onClose(dataUrl);
  };

  return (
    <div className="drawing-mode-overlay">
      {/* Top action toolbar (Instagram Draw mode) */}
      <div className="drawing-topbar">
        <div className="brush-selector-group">
          {/* Pen */}
          <button
            type="button"
            className={`brush-icon-btn ${mode === "pen" ? "is-active" : ""}`}
            onClick={() => setMode("pen")}
            title="Caneta Padrão"
          >
            <Pen size={20} />
          </button>

          {/* Marker */}
          <button
            type="button"
            className={`brush-icon-btn ${mode === "marker" ? "is-active" : ""}`}
            onClick={() => setMode("marker")}
            title="Marca-texto"
          >
            <Highlighter size={20} />
          </button>

          {/* Neon */}
          <button
            type="button"
            className={`brush-icon-btn ${mode === "neon" ? "is-active" : ""}`}
            onClick={() => setMode("neon")}
            title="Pincel Neon / Glow"
          >
            <Sparkles size={20} />
          </button>

          {/* Eraser */}
          <button
            type="button"
            className={`brush-icon-btn ${mode === "eraser" ? "is-active" : ""}`}
            onClick={() => setMode("eraser")}
            title="Borracha"
          >
            <Eraser size={20} />
          </button>
        </div>

        <div className="drawing-topbar-right">
          <button
            type="button"
            className={`drawing-action-btn ${strokeCount === 0 ? "is-disabled" : ""}`}
            onClick={handleUndo}
            disabled={strokeCount === 0}
            title="Desfazer traço"
          >
            <RotateCcw size={18} />
          </button>

          <button
            type="button"
            className={`drawing-action-btn ${strokeCount === 0 ? "is-disabled" : ""}`}
            onClick={handleClear}
            disabled={strokeCount === 0}
            title="Limpar tudo"
          >
            <Trash2 size={18} />
          </button>

          <button type="button" className="drawing-done-btn" onClick={handleDone}>
            <Check size={18} strokeWidth={3} />
            <span>Concluir</span>
          </button>
        </div>
      </div>

      {/* Center Drawing Canvas */}
      <div className="drawing-canvas-wrapper">
        {/* Vertical Brush Size Slider (Left Side - Native Instagram) */}
        <div className="drawing-vertical-slider">
          <input
            type="range"
            min={4}
            max={50}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="vertical-range-input"
          />
          <div
            className="brush-size-dot-preview"
            style={{
              width: Math.min(28, brushSize),
              height: Math.min(28, brushSize),
              background: mode === "eraser" ? "#FFF" : color,
            }}
          />
        </div>

        {/* 1080x1920 Drawing Canvas */}
        <canvas
          ref={canvasRef}
          width={1080}
          height={1920}
          className="drawing-render-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>

      {/* Bottom Color Palette (Instagram Swatches) */}
      <div className="drawing-bottom-palette">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            className={`drawing-color-circle ${color === c && mode !== "eraser" ? "is-selected" : ""}`}
            style={{ background: c }}
            onClick={() => {
              setColor(c);
              if (mode === "eraser") setMode("pen");
            }}
          />
        ))}
      </div>
    </div>
  );
}
