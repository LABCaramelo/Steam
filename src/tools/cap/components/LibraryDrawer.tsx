import { Isotype, MagneticButton } from "@caramelo/design-system";
import { Play, Download, Share2, Trash2, Video, Sparkles } from "lucide-react";
import type { TakeRecord } from "../types";

interface LibraryDrawerProps {
  takes: TakeRecord[];
  onSelectTake: (take: TakeRecord) => void;
  onDeleteTake: (id: string) => void;
  onShareTake: (take: TakeRecord) => void;
  onNewRecording: () => void;
  onLoadDemo: () => void;
}

export function LibraryDrawer({
  takes,
  onSelectTake,
  onDeleteTake,
  onShareTake,
  onNewRecording,
  onLoadDemo,
}: LibraryDrawerProps) {
  const formatDuration = (sec: number) => {
    const s = Math.round(sec);
    const m = Math.floor(s / 60);
    const rem = (s % 60).toString().padStart(2, "0");
    return `${m}:${rem}`;
  };

  const handleDownloadDirect = (take: TakeRecord) => {
    if (!take.videoUrl) return;
    const a = document.createElement("a");
    a.href = take.videoUrl;
    a.download = `${take.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (takes.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          color: "rgb(var(--cm-fg-muted))",
          padding: 24,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "var(--cm-radius-xl)",
            background: "rgb(var(--cm-surface-2))",
            border: "1px solid rgb(var(--cm-line))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 16px rgb(var(--cm-accent) / 0.15)",
          }}
        >
          <Isotype variant="spectrum" size={36} decorative interactive />
        </div>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "rgb(var(--cm-fg))" }}>
            Nenhum take gravado ainda
          </div>
          <div style={{ fontSize: 13, marginTop: 6, color: "rgb(var(--cm-fg-muted))", lineHeight: 1.5 }}>
            Grave uma nova apresentação com câmera e tela, ou explore a demonstração interativa com moldura cinemática.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
          <MagneticButton
            variant="accent"
            size="md"
            onClick={onNewRecording}
            icon={<Video size={14} />}
          >
            Gravar Primeiro Take
          </MagneticButton>
          <MagneticButton
            variant="surface"
            size="md"
            onClick={onLoadDemo}
            icon={<Sparkles size={14} />}
          >
            Carregar Demonstração
          </MagneticButton>
        </div>
      </div>
    );
  }

  return (
    <div className="cap-library-grid">
      {takes.map((take) => (
        <div key={take.id} className="cap-take-card">
          <div
            className="cap-take-thumb-wrap"
            onClick={() => onSelectTake(take)}
            style={{ cursor: "pointer" }}
          >
            {take.thumbnailUrl ? (
              <img src={take.thumbnailUrl} alt={take.title} className="cap-take-thumb" />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgb(var(--cm-surface-2))",
                }}
              >
                <Video size={32} color="rgb(var(--cm-fg-dim))" />
              </div>
            )}
            <div className="cap-take-duration-badge">
              {formatDuration(take.duration)}
            </div>
          </div>

          <div className="cap-take-info">
            <div className="cap-take-title">{take.title}</div>
            <div className="cap-take-date">
              {new Date(take.createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>

            <div className="cap-take-actions">
              <button
                className="cap-btn cap-btn-accent"
                style={{ flex: 1, padding: "6px 8px" }}
                onClick={() => onSelectTake(take)}
              >
                <Play size={13} fill="currentColor" />
                <span>Abrir</span>
              </button>
              <button
                className="cap-btn cap-btn-subtle"
                style={{ padding: "6px 10px" }}
                onClick={() => onShareTake(take)}
                title="Compartilhar"
              >
                <Share2 size={13} />
              </button>
              <button
                className="cap-btn cap-btn-subtle"
                style={{ padding: "6px 10px" }}
                onClick={() => handleDownloadDirect(take)}
                title="Baixar vídeo"
              >
                <Download size={13} />
              </button>
              <button
                className="cap-btn cap-btn-subtle"
                style={{ padding: "6px 10px", color: "rgb(var(--cm-danger))" }}
                onClick={() => onDeleteTake(take.id)}
                title="Excluir take"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
