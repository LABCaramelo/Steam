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
          color: "rgba(255, 244, 232, 0.6)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(255, 112, 26, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FF701A",
          }}
        >
          <Video size={28} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#FFF4E8" }}>
            Nenhum take gravado ainda
          </div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            Grave uma nova apresentação ou explore a demonstração interativa do LAB.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button className="cap-btn cap-btn-accent" onClick={onNewRecording}>
            <Video size={14} />
            <span>Gravar Primeiro Take</span>
          </button>
          <button className="cap-btn cap-btn-subtle" onClick={onLoadDemo}>
            <Sparkles size={14} />
            <span>Carregar Demonstração</span>
          </button>
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
                  background: "#141418",
                }}
              >
                <Video size={32} color="rgba(255,244,232,0.2)" />
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
                <Play size={13} fill="#101014" />
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
                style={{ padding: "6px 10px", color: "#FF3D8D" }}
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
