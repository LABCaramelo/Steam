import React, { useState } from "react";
import { RenderItem } from "../types";
import { FolderOpen, Film, Image as ImageIcon, Download, Trash2, ArrowRight, Play } from "lucide-react";

interface GalleryDrawerProps {
  renders: RenderItem[];
  onDeleteRender: (id: string) => void;
  onSelectRender: (render: RenderItem) => void;
}

export const GalleryDrawer: React.FC<GalleryDrawerProps> = ({
  renders,
  onDeleteRender,
  onSelectRender,
}) => {
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");

  const filtered = renders.filter((r) => {
    if (filter === "image") return r.type === "image";
    if (filter === "video") return r.type === "video";
    return true;
  });

  return (
    <div className="gallery-layout">
      <div className="gallery-topbar">
        <div className="gallery-title-group">
          <FolderOpen size={18} className="gallery-icon" />
          <h3>Galeria &amp; Renders Locais ({renders.length})</h3>
        </div>

        <div className="gallery-filter-pills">
          <button
            type="button"
            className={`filter-pill ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            Todos ({renders.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${filter === "image" ? "active" : ""}`}
            onClick={() => setFilter("image")}
          >
            <ImageIcon size={13} />
            <span>Imagens ({renders.filter(r => r.type === "image").length})</span>
          </button>
          <button
            type="button"
            className={`filter-pill ${filter === "video" ? "active" : ""}`}
            onClick={() => setFilter("video")}
          >
            <Film size={13} />
            <span>Vídeos ({renders.filter(r => r.type === "video").length})</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="gallery-empty">
          <p>Nenhum render encontrado para este filtro.</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {filtered.map((item) => (
            <div key={item.id} className="gallery-card">
              <div
                className="gallery-thumb-box"
                data-ratio={item.aspectRatio}
                onClick={() => onSelectRender(item)}
              >
                <img src={item.url} alt={item.prompt} className="gallery-thumb-img" />
                {item.type === "video" && (
                  <div className="gallery-play-badge">
                    <Play size={20} fill="#FFF4E8" />
                  </div>
                )}
                <span className="gallery-type-pill">{item.type.toUpperCase()}</span>
              </div>

              <div className="gallery-card-body">
                <h4 className="gallery-item-title">{item.title}</h4>
                <p className="gallery-item-prompt">{item.prompt}</p>
                <div className="gallery-item-meta">
                  <span>{item.model}</span>
                  <span>•</span>
                  <span>{item.createdAt}</span>
                </div>

                <div className="gallery-card-actions">
                  <a
                    href="/tools/montagem"
                    target="_blank"
                    rel="noreferrer"
                    className="btn-card-icon"
                    title="Enviar para linha do tempo da Montagem"
                  >
                    <ArrowRight size={14} />
                    <span>NLE</span>
                  </a>

                  <a
                    href={item.url}
                    download={`${item.id}.${item.type === "video" ? "mp4" : "png"}`}
                    className="btn-card-icon"
                    title="Baixar para o computador"
                  >
                    <Download size={14} />
                  </a>

                  <button
                    type="button"
                    className="btn-card-icon danger"
                    onClick={() => onDeleteRender(item.id)}
                    title="Excluir da galeria local"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
