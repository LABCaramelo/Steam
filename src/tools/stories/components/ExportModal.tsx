import { useState } from "react";
import { X, Image, Video, Download, QrCode } from "lucide-react";
import { toPng, toJpeg } from "html-to-image";

interface ExportModalProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onOpenQrCode: () => void;
}

export function ExportModal({ canvasRef, onClose, onOpenQrCode }: ExportModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"png" | "jpg" | "video">("png");
  const [videoDuration, setVideoDuration] = useState<5 | 10 | 15>(5);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");

  // High-Resolution Image Export (1080 x 1920)
  const handleExportImage = async (format: "png" | "jpg") => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    setStatusMsg("Renderizando imagem 1080x1920...");
    setProgress(30);

    try {
      const node = canvasRef.current;
      const filter = (domNode: HTMLElement) => {
        if (domNode.classList && domNode.classList.contains("handle")) return false;
        return true;
      };

      const options = {
        width: 1080,
        height: 1920,
        pixelRatio: 1,
        style: {
          transform: "none",
          margin: "0",
        },
        filter: filter as any,
      };

      setProgress(60);
      const dataUrl = format === "png" ? await toPng(node, options) : await toJpeg(node, { ...options, quality: 0.95 });

      setProgress(95);

      // Download trigger
      const link = document.createElement("a");
      link.download = `story-caramelo-${Date.now()}.${format}`;
      link.href = dataUrl;
      link.click();

      // Mobile Web Share API support
      if (navigator.canShare) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `story.${format}`, { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Instagram Story",
              text: "Story criado no Stories Maker",
            });
          } catch {
            // User cancelled share
          }
        }
      }

      setProgress(100);
      setStatusMsg("Imagem exportada com sucesso!");
    } catch (err) {
      console.error("Erro ao exportar imagem:", err);
      setStatusMsg("Erro ao gerar imagem. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  // Video Export (Canvas frame capture + MediaRecorder)
  const handleExportVideo = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    setStatusMsg(`Gravando vídeo do Story (${videoDuration} segundos)...`);
    setProgress(10);

    try {
      const node = canvasRef.current;
      const offscreenCanvas = document.createElement("canvas");
      offscreenCanvas.width = 1080;
      offscreenCanvas.height = 1920;
      const ctx = offscreenCanvas.getContext("2d");

      if (!ctx) throw new Error("Não foi possível criar contexto 2D");

      const stream = offscreenCanvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported("video/mp4")
        ? "video/mp4"
        : "video/webm;codecs=vp9";

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8_000_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const fps = 20;
      const totalFrames = videoDuration * fps;
      let frameCount = 0;

      recorder.start();

      const recordInterval = setInterval(async () => {
        if (frameCount >= totalFrames) {
          clearInterval(recordInterval);
          recorder.stop();
          return;
        }

        try {
          const dataUrl = await toPng(node, {
            width: 1080,
            height: 1920,
            pixelRatio: 1,
            style: { transform: "none" },
          });

          const img = new window.Image();
          img.onload = () => {
            ctx.clearRect(0, 0, 1080, 1920);
            ctx.drawImage(img, 0, 0, 1080, 1920);
          };
          img.src = dataUrl;
        } catch {
          // skip
        }

        frameCount++;
        setProgress(Math.min(95, Math.round((frameCount / totalFrames) * 90) + 5));
      }, 1000 / fps);

      recorder.onstop = async () => {
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const videoBlob = new Blob(chunks, { type: mimeType });
        const videoUrl = URL.createObjectURL(videoBlob);

        const link = document.createElement("a");
        link.download = `story-video-${Date.now()}.${ext}`;
        link.href = videoUrl;
        link.click();

        if (navigator.canShare) {
          const file = new File([videoBlob], `story.${ext}`, { type: mimeType });
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: "Instagram Story Vídeo",
              });
            } catch {
              // cancelled
            }
          }
        }

        setProgress(100);
        setStatusMsg("Vídeo exportado com sucesso!");
        setIsExporting(false);
      };
    } catch (err) {
      console.error("Erro ao gerar vídeo:", err);
      setStatusMsg("Erro ao processar vídeo no navegador.");
      setIsExporting(false);
    }
  };

  return (
    <div className="stories-drawer-overlay" onClick={onClose}>
      <div className="export-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal__header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Download size={22} color="#FF701A" />
            <h2>Exportar Publicação (9:16)</h2>
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="export-modal__body">
          <span className="drawer-section-sub">Escolha o formato de saída:</span>
          <div className="export-formats-row">
            <button
              type="button"
              className={`export-format-btn ${exportFormat === "png" ? "is-active" : ""}`}
              onClick={() => setExportFormat("png")}
            >
              <Image size={24} />
              <strong>Imagem PNG</strong>
              <span>1080 x 1920 (Máxima Nitidez)</span>
            </button>

            <button
              type="button"
              className={`export-format-btn ${exportFormat === "jpg" ? "is-active" : ""}`}
              onClick={() => setExportFormat("jpg")}
            >
              <Image size={24} />
              <strong>Imagem JPG</strong>
              <span>1080 x 1920 (Arquivo Leve)</span>
            </button>

            <button
              type="button"
              className={`export-format-btn ${exportFormat === "video" ? "is-active" : ""}`}
              onClick={() => setExportFormat("video")}
            >
              <Video size={24} />
              <strong>Vídeo Animado</strong>
              <span>MP4/WebM vertical</span>
            </button>
          </div>

          {exportFormat === "video" && (
            <div className="video-options-pane">
              <span className="drawer-section-sub">Duração do Vídeo:</span>
              <div className="duration-pills-row">
                {[5, 10, 15].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    className={`duration-pill-btn ${videoDuration === sec ? "is-active" : ""}`}
                    onClick={() => setVideoDuration(sec as any)}
                  >
                    {sec} Segundos
                  </button>
                ))}
              </div>
            </div>
          )}

          {isExporting && (
            <div className="export-progress-box">
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="progress-msg">{statusMsg} ({progress}%)</span>
            </div>
          )}

          <button
            type="button"
            className="main-export-submit-btn"
            disabled={isExporting}
            onClick={() => {
              if (exportFormat === "png") handleExportImage("png");
              else if (exportFormat === "jpg") handleExportImage("jpg");
              else handleExportVideo();
            }}
          >
            {isExporting ? (
              <span>Processando...</span>
            ) : (
              <>
                <Download size={20} />
                <span>
                  {exportFormat === "video"
                    ? `Gerar e Baixar Vídeo (${videoDuration}s)`
                    : `Baixar Imagem ${exportFormat.toUpperCase()}`}
                </span>
              </>
            )}
          </button>

          <div className="wifi-shortcut-card">
            <QrCode size={24} color="#25BFFF" />
            <div className="wifi-shortcut-info">
              <strong>Testar no Celular (Mesmo Wi-Fi)</strong>
              <span>Abra direto no navegador do seu smartphone</span>
            </div>
            <button
              type="button"
              className="wifi-open-btn"
              onClick={() => {
                onClose();
                onOpenQrCode();
              }}
            >
              Ver QR Code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
