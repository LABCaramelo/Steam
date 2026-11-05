import { useState } from "react";
import { MagneticButton } from "@caramelo/design-system";
import { Download, X, Sparkles, Check, Film, Image as ImageIcon } from "lucide-react";
import type { TakeRecord } from "../types";
import { renderExportedVideo, type ExportProgress } from "../utils/mediaRecorder";

interface ExportModalProps {
  take: TakeRecord;
  onClose: () => void;
}

export function ExportModal({ take, onClose }: ExportModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [format, setFormat] = useState<"webm" | "mp4">("webm");

  const handleStartExport = async () => {
    setIsExporting(true);
    setProgress({ currentSec: 0, totalSec: take.duration || 10, percent: 0 });

    try {
      const video = document.createElement("video");
      video.src = take.videoUrl;
      video.muted = true;
      video.playsInline = true;

      await new Promise<void>((resolve, reject) => {
        if (video.readyState >= 2) {
          resolve();
          return;
        }
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error("Falha ao carregar o vídeo para renderização."));
        setTimeout(() => {
          if (video.readyState >= 1) resolve();
          else reject(new Error("Tempo limite excedido ao carregar mídia."));
        }, 10000);
      });

      const blob = await renderExportedVideo(
        video,
        take.dressing,
        take.zoomKeyframes || [],
        take.trimStart || 0,
        take.trimEnd || take.duration || 10,
        (p) => setProgress(p),
        format
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${take.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setIsFinished(true);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPosterFrame = () => {
    if (!take.thumbnailUrl) return;
    const a = document.createElement("a");
    a.href = take.thumbnailUrl;
    a.download = `${take.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-capa.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="cap-modal-backdrop" onClick={onClose}>
      <div className="cap-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="cap-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Film size={18} color="rgb(var(--cm-accent))" />
            <div className="cap-modal-title">Exportar Take Cinemático</div>
          </div>
          <button
            className="cap-btn cap-btn-subtle"
            style={{ padding: 6 }}
            onClick={onClose}
            disabled={isExporting}
            aria-label="Fechar modal"
          >
            <X size={16} />
          </button>
        </div>

        {!isExporting && !isFinished ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgb(var(--cm-fg))" }}>
                Configuração do Render
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  className={`cap-btn ${format === "webm" ? "cap-btn-accent" : "cap-btn-subtle"}`}
                  onClick={() => setFormat("webm")}
                >
                  <span>WebM (Alta Performance)</span>
                </button>
                <button
                  className={`cap-btn ${format === "mp4" ? "cap-btn-accent" : "cap-btn-subtle"}`}
                  onClick={() => setFormat("mp4")}
                >
                  <span>MP4 (Universal)</span>
                </button>
              </div>
            </div>

            <div
              style={{
                padding: 12,
                background: "rgb(var(--cm-surface-2))",
                borderRadius: "var(--cm-radius-md)",
                border: "1px solid rgb(var(--cm-line))",
                fontSize: 12,
                lineHeight: 1.6,
                color: "rgb(var(--cm-fg-muted))",
              }}
            >
              ✓ Composição de tela com fundo <strong>{take.dressing.background}</strong>
              <br />
              ✓ Moldura com cantos <strong>{take.dressing.borderRadius}px</strong> e sombra{" "}
              <strong>{take.dressing.shadow}</strong>
              <br />
              ✓ Animação de <strong>{take.zoomKeyframes?.length || 0} zooms cinemáticos</strong>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <MagneticButton
                variant="accent"
                magnetic={0.3}
                size="md"
                onClick={handleStartExport}
                icon={<Download size={15} />}
                style={{ flex: 1 }}
              >
                Renderizar & Baixar
              </MagneticButton>

              <button
                className="cap-btn cap-btn-subtle"
                onClick={handleExportPosterFrame}
                title="Baixar imagem estática de capa"
              >
                <ImageIcon size={15} />
                <span>Baixar Capa</span>
              </button>
            </div>
          </>
        ) : isExporting ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "12px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={16} color="rgb(var(--cm-accent))" />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Renderizando vídeo com zooms...</span>
              </div>
              <span style={{ fontFamily: "monospace", fontWeight: 700, color: "rgb(var(--cm-accent-ink))" }}>
                {progress?.percent || 0}%
              </span>
            </div>

            <div className="cap-progress-bar-wrap">
              <div
                className="cap-progress-bar-fill"
                style={{ width: `${progress?.percent || 0}%` }}
              />
            </div>

            <div style={{ fontSize: 12, color: "rgb(var(--cm-fg-dim))", textAlign: "center" }}>
              Gravando frames compostos a 30fps. Por favor, mantenha esta aba aberta.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              padding: "16px 0",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgb(var(--cm-success-soft))",
                color: "rgb(var(--cm-success))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check size={26} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "rgb(var(--cm-fg))" }}>
              Download Concluído!
            </div>
            <div style={{ fontSize: 12, color: "rgb(var(--cm-fg-muted))", textAlign: "center", maxWidth: 360 }}>
              Seu arquivo de vídeo foi processado com sucesso e transferido para o seu computador.
            </div>
            <MagneticButton
              variant="surface"
              size="sm"
              onClick={onClose}
              style={{ marginTop: 8 }}
            >
              Fechar
            </MagneticButton>
          </div>
        )}
      </div>
    </div>
  );
}
