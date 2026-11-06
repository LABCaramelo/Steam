import { useState } from "react";
import { MagneticButton } from "@caramelo/design-system";
import {
  Download,
  X,
  Sparkles,
  Check,
  Film,
  Image as ImageIcon,
  Smartphone,
  Monitor,
  Zap,
  Volume2,
  MessageCircle,
} from "lucide-react";
import type { TakeRecord, ExportPreset } from "../types";
import { renderExportedVideo, type ExportProgress } from "../utils/mediaRecorder";

interface ExportModalProps {
  take: TakeRecord;
  onClose: () => void;
}

export function ExportModal({ take, onClose }: ExportModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [preset, setPreset] = useState<ExportPreset>("whatsapp");
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [exportedFileName, setExportedFileName] = useState<string>("");

  const handleStartExport = async () => {
    setIsExporting(true);
    setProgress({ currentSec: 0, totalSec: take.duration || 10, percent: 0 });

    try {
      const video = document.createElement("video");
      video.src = take.videoUrl;
      // CRITICAL FOR AUDIO: Do not mute the video element so Web Audio captures the audio stream!
      video.muted = false;
      video.volume = 1.0;
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
        preset
      );

      const ext = preset === "webm" ? "webm" : "mp4";
      const cleanTitle = take.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-");
      const filename = `${cleanTitle}${preset === "whatsapp" ? "-whatsapp" : ""}.${ext}`;

      setExportedBlob(blob);
      setExportedFileName(filename);

      // Auto download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
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

  const handleDownloadAgain = () => {
    if (!exportedBlob || !exportedFileName) return;
    const url = URL.createObjectURL(exportedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShareWhatsApp = async () => {
    if (exportedBlob && exportedFileName) {
      const file = new File([exportedBlob], exportedFileName, { type: exportedBlob.type });
      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: take.title,
            text: "Vídeo gravado no Cap · LAB",
          });
          return;
        } catch {
          // User cancelled native dialog, continue to Web fallback
        }
      }
    }
    // Fallback: Open WhatsApp Web in new tab with clear guidance
    window.open("https://web.whatsapp.com", "_blank", "noopener,noreferrer");
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
                Escolha o Formato de Exportação
              </div>

              {/* Preset Cards Selection */}
              <div className="cap-export-presets">
                {/* 1. WhatsApp & Mobile (Recommended) */}
                <div
                  className={`cap-export-preset-card ${preset === "whatsapp" ? "active" : ""}`}
                  onClick={() => setPreset("whatsapp")}
                >
                  <div className="cap-export-preset-icon">
                    <Smartphone size={17} color="#25D366" />
                  </div>
                  <div className="cap-export-preset-body">
                    <div className="cap-export-preset-title-row">
                      <span className="cap-export-preset-title">WhatsApp & Celular</span>
                      <span className="cap-badge-whatsapp">Recomendado</span>
                    </div>
                    <div className="cap-export-preset-desc">
                      MP4 (H.264 + Áudio AAC) em 720p HD. Envia instantaneamente sem travar, toca direto no WhatsApp, iPhone e Android.
                    </div>
                  </div>
                </div>

                {/* 2. Full HD 1080p */}
                <div
                  className={`cap-export-preset-card ${preset === "mp4-hd" ? "active" : ""}`}
                  onClick={() => setPreset("mp4-hd")}
                >
                  <div className="cap-export-preset-icon">
                    <Monitor size={17} color="rgb(var(--cm-info))" />
                  </div>
                  <div className="cap-export-preset-body">
                    <div className="cap-export-preset-title-row">
                      <span className="cap-export-preset-title">MP4 Full HD (1080p)</span>
                    </div>
                    <div className="cap-export-preset-desc">
                      Máxima nitidez para computadores, apresentações, YouTube e arquivos de alta fidelidade.
                    </div>
                  </div>
                </div>

                {/* 3. WebM Performance */}
                <div
                  className={`cap-export-preset-card ${preset === "webm" ? "active" : ""}`}
                  onClick={() => setPreset("webm")}
                >
                  <div className="cap-export-preset-icon">
                    <Zap size={17} color="rgb(var(--cm-accent))" />
                  </div>
                  <div className="cap-export-preset-body">
                    <div className="cap-export-preset-title-row">
                      <span className="cap-export-preset-title">WebM (VP9 / Opus)</span>
                    </div>
                    <div className="cap-export-preset-desc">
                      Codec de alta eficiência nativo do navegador para uso web e desenvolvedores.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Audio Confirmation Pill */}
            <div className="cap-audio-indicator">
              <Volume2 size={16} color="rgb(var(--cm-accent))" />
              <span>
                <strong>Áudio Ativo:</strong> Microfone e som do sistema são mixados e preservados no vídeo final.
              </span>
            </div>

            {/* Composition summary */}
            <div
              style={{
                padding: 10,
                background: "rgb(var(--cm-surface-2))",
                borderRadius: "var(--cm-radius-md)",
                border: "1px solid rgb(var(--cm-line))",
                fontSize: 11,
                lineHeight: 1.6,
                color: "rgb(var(--cm-fg-muted))",
              }}
            >
              ✓ Fundo <strong>{take.dressing.background}</strong> com cantos arredondados de{" "}
              <strong>{take.dressing.borderRadius}px</strong>
              <br />
              ✓ Animação sincronizada de <strong>{take.zoomKeyframes?.length || 0} zooms cinemáticos</strong>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <MagneticButton
                variant="accent"
                magnetic={0.3}
                size="md"
                onClick={handleStartExport}
                icon={<Download size={15} />}
                style={{ flex: 1 }}
              >
                {preset === "whatsapp" ? "Exportar para WhatsApp (MP4)" : "Renderizar & Baixar"}
              </MagneticButton>

              <button
                className="cap-btn cap-btn-subtle"
                onClick={handleExportPosterFrame}
                title="Baixar imagem estática de capa"
              >
                <ImageIcon size={15} />
                <span>Capa</span>
              </button>
            </div>
          </>
        ) : isExporting ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "12px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={16} color="rgb(var(--cm-accent))" />
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  Renderizando vídeo com áudio e zooms...
                </span>
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
              Processando quadros cinemáticos e sincronizando o áudio. Mantenha esta aba aberta.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              padding: "12px 0",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "rgba(37, 211, 102, 0.2)",
                color: "#25D366",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(37, 211, 102, 0.3)",
              }}
            >
              <Check size={28} />
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "rgb(var(--cm-fg))" }}>
                Vídeo Exportado com Sucesso!
              </div>
              <div style={{ fontSize: 12, color: "rgb(var(--cm-fg-muted))", marginTop: 4 }}>
                Arquivo: <strong style={{ color: "rgb(var(--cm-fg))" }}>{exportedFileName}</strong>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                background: "rgb(var(--cm-surface-2))",
                borderRadius: "var(--cm-radius-pill)",
                fontSize: 11,
                color: "rgb(var(--cm-fg-2))",
              }}
            >
              <span>🔊 Com Áudio Preservado</span>
              <span>·</span>
              <span>📱 Formato MP4 Compatível</span>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", marginTop: 6 }}>
              <button
                className="cap-btn cap-whatsapp-btn"
                style={{ width: "100%", justifyContent: "center", padding: "10px 16px", fontSize: 13 }}
                onClick={handleShareWhatsApp}
              >
                <MessageCircle size={17} />
                <span>Enviar no WhatsApp</span>
              </button>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button
                  className="cap-btn cap-btn-subtle"
                  style={{ justifyContent: "center" }}
                  onClick={handleDownloadAgain}
                >
                  <Download size={14} />
                  <span>Baixar Novamente</span>
                </button>
                <button
                  className="cap-btn cap-btn-subtle"
                  style={{ justifyContent: "center" }}
                  onClick={onClose}
                >
                  Fechar
                </button>
              </div>
            </div>

            <div style={{ fontSize: 11, color: "rgb(var(--cm-fg-dim))", textAlign: "center", lineHeight: 1.4 }}>
              Dica: O arquivo MP4 já está salvo no seu computador. No WhatsApp Web ou Desktop, basta arrastar o arquivo diretamente para qualquer conversa!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
