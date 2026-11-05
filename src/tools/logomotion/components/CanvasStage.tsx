import { useEffect } from "react";
import { HalftoneOverlay, TiltSurface } from "@caramelo/design-system";
import type { FrameItem, LogoAsset, LogoSettings, StudioMode, Pulse3DSettings } from "../types";
import { PulseStudio3D } from "./PulseStudio3D";

interface CanvasStageProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  studioMode: StudioMode;
  logo: LogoAsset | null;
  logoSettings: LogoSettings;
  frames: FrameItem[];
  activeFrameIndex: number;
  primaryColor: string;
  accentColor: string;
  brandColors: string[];
  brandName: string;
  isPlaying: boolean;
  currentTime: number;
  beatIntensity: number;
  pulseSettings: Pulse3DSettings;
  reducedFlash: boolean;
}

const loadedImagesCache = new Map<string, HTMLImageElement>();

function getOrLoadImage(src: string): HTMLImageElement | null {
  if (loadedImagesCache.has(src)) {
    const img = loadedImagesCache.get(src)!;
    return img.complete && img.naturalWidth > 0 ? img : null;
  }
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  img.onload = () => {
    loadedImagesCache.set(src, img);
  };
  loadedImagesCache.set(src, img);
  return null;
}

export function CanvasStage({
  canvasRef,
  studioMode,
  logo,
  logoSettings,
  frames,
  activeFrameIndex,
  primaryColor,
  accentColor,
  brandColors,
  brandName,
  isPlaying,
  currentTime,
  beatIntensity,
  pulseSettings,
  reducedFlash,
}: CanvasStageProps) {
  const currentFrame = frames[activeFrameIndex] || frames[0];

  useEffect(() => {
    if (studioMode !== "showcase") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const width = 1080;
    const height = 1920;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Apply reduced flash if requested
    const isInverted = currentFrame?.inverted && !reducedFlash;

    // 1. Draw Frame Background
    if (currentFrame?.kind === "mockup" && currentFrame.imgSrc) {
      const bgImg = getOrLoadImage(currentFrame.imgSrc);
      if (bgImg) {
        // Draw Cover
        const imgAspect = bgImg.naturalWidth / bgImg.naturalHeight;
        const screenAspect = width / height;
        let dw = width, dh = height, dx = 0, dy = 0;
        if (imgAspect > screenAspect) {
          dh = height;
          dw = height * imgAspect;
          dx = (width - dw) / 2;
        } else {
          dw = width;
          dh = width / imgAspect;
          dy = (height - dh) / 2;
        }

        if (isInverted) {
          ctx.filter = "grayscale(1) invert(1) contrast(1.15)";
        }
        ctx.drawImage(bgImg, dx, dy, dw, dh);
        ctx.filter = "none";
      } else {
        // Fallback backdrop while image loads
        ctx.fillStyle = isInverted ? "#FFF4E8" : "#181820";
        ctx.fillRect(0, 0, width, height);
      }
    } else if (currentFrame?.kind === "construction") {
      // Blueprint grid background
      ctx.fillStyle = isInverted ? "#FFF4E8" : "#0D1B2A";
      ctx.fillRect(0, 0, width, height);

      // Draw Blueprint Grid & Measurements
      ctx.strokeStyle = isInverted ? "rgba(16, 27, 60, 0.15)" : "rgba(37, 191, 255, 0.25)";
      ctx.lineWidth = 2;
      const gridSize = 60;
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Construction guide circles & diagonals
      ctx.strokeStyle = isInverted ? "rgba(255, 112, 26, 0.45)" : "rgba(255, 112, 26, 0.65)";
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 380, 0, Math.PI * 2);
      ctx.arc(width / 2, height / 2, 240, 0, Math.PI * 2);
      ctx.arc(width / 2, height / 2, 120, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, height);
      ctx.moveTo(width, 0);
      ctx.lineTo(0, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Technical labels (Caramelo brand metrics)
      ctx.fillStyle = isInverted ? "#101014" : "#25BFFF";
      ctx.font = "600 24px 'Space Grotesk', monospace";
      ctx.fillText(`SYSTEM // GRID: 60px  Ø: 760px`, 60, 120);
      ctx.fillText(`COORD // [${(width / 2).toFixed(0)}, ${(height / 2).toFixed(0)}]  RATIO: 1:1.618`, 60, 160);
      ctx.fillText(`BRAND // ${brandName.toUpperCase() || "CARAMELO"}`, 60, height - 100);
    } else if (currentFrame?.kind === "palette") {
      // Color palette display
      ctx.fillStyle = isInverted ? "#FFF4E8" : "#101014";
      ctx.fillRect(0, 0, width, height);

      const colors = brandColors.length > 0 ? brandColors : ["#101014", "#FF701A", "#25BFFF", "#FFF4E8"];
      const blockHeight = 180;
      const startY = height - (colors.length * blockHeight + 140);

      colors.forEach((col, idx) => {
        const y = startY + idx * blockHeight;
        ctx.fillStyle = col;
        ctx.fillRect(80, y, width - 160, blockHeight - 20);

        // Label
        ctx.fillStyle = isInverted ? "#101014" : "#FFF4E8";
        ctx.font = "700 28px 'Inter', sans-serif";
        ctx.fillText(`SWATCH 0${idx + 1} — ${col.toUpperCase()}`, 100, y - 10);
      });
    } else if (currentFrame?.kind === "gradient") {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, primaryColor);
      grad.addColorStop(0.5, "#181820");
      grad.addColorStop(1, accentColor);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else {
      // Solid color
      const bg = currentFrame?.bgColor || primaryColor || "#101014";
      ctx.fillStyle = isInverted ? "#FFF4E8" : bg;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Draw Logo in Center with Caramelo Motion Law
    // "STILLNESS = CAMADAS ALINHADAS • MOVEMENT = CAMADAS SE SEPARAM"
    if (logo) {
      const logoImg = getOrLoadImage(isInverted && logo.autoInvertedSrc ? logo.autoInvertedSrc : logo.src);
      if (logoImg) {
        const baseWidth = 560 * logoSettings.scale;
        const baseHeight = baseWidth / (logo.aspectRatio || 1);
        const centerX = width / 2 + (logoSettings.offsetX / 100) * width;
        const centerY = height / 2 + (logoSettings.offsetY / 100) * height;

        ctx.save();
        ctx.translate(centerX, centerY);
        if (logoSettings.rotation) {
          ctx.rotate((logoSettings.rotation * Math.PI) / 180);
        }

        // Drop shadow for realism on mockups
        if (currentFrame?.kind === "mockup") {
          ctx.shadowColor = isInverted ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.65)";
          ctx.shadowBlur = 24;
          ctx.shadowOffsetY = 8;
        }

        // If in motion and beat peak: apply micro-misregistration layer separation (CMYK print drift)
        if (isPlaying && beatIntensity > 0.6 && !reducedFlash) {
          // Cyan layer shift
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.drawImage(logoImg, -baseWidth / 2 - 8, -baseHeight / 2, baseWidth, baseHeight);
          ctx.restore();

          // Orange layer shift
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.drawImage(logoImg, -baseWidth / 2 + 8, -baseHeight / 2, baseWidth, baseHeight);
          ctx.restore();
        }

        // Draw primary crisp logo
        ctx.drawImage(logoImg, -baseWidth / 2, -baseHeight / 2, baseWidth, baseHeight);
        ctx.restore();
      }
    }

    // 3. Beat Impact Flash Ring
    if (beatIntensity > 0.4 && isPlaying && !reducedFlash) {
      ctx.strokeStyle = `rgba(255, 112, 26, ${beatIntensity * 0.4})`;
      ctx.lineWidth = 16 * beatIntensity;
      ctx.strokeRect(0, 0, width, height);
    }

    ctx.restore();
  }, [
    studioMode,
    currentFrame,
    logo,
    logoSettings,
    primaryColor,
    accentColor,
    brandColors,
    brandName,
    beatIntensity,
    isPlaying,
    reducedFlash,
  ]);

  return (
    <div className="dia-player-stage">
      <HalftoneOverlay density="subtle" className="dia-stage-halftone-bg" />
      <TiltSurface max={2.5} className="dia-player-tilt-wrap">
        <div className="dia-player-canvas showcase-player-canvas">
          {studioMode === "showcase" ? (
            <canvas ref={canvasRef} className="showcase-player-surface" width="1080" height="1920" />
          ) : (
            <div className="pulse-3d-wrapper">
              <canvas ref={canvasRef} className="showcase-player-surface hidden" width="1080" height="1920" />
              <PulseStudio3D
                logo={logo}
                settings={pulseSettings}
                primaryColor={primaryColor}
                accentColor={accentColor}
                isPlaying={isPlaying}
                currentTime={currentTime}
                beatIntensity={beatIntensity}
              />
            </div>
          )}

          {!logo && (
            <div className="pulse-player-overlay">
              <div className="dia-empty-prompt">
                <span className="dia-empty-icon">↑</span>
                <span className="dia-empty-title">Solte seu logo aqui</span>
                <span className="dia-empty-sub">SVG, PNG, JPG ou WebP para começar</span>
              </div>
            </div>
          )}
        </div>
      </TiltSurface>
    </div>
  );
}
