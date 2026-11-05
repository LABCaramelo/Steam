import { CopyButton } from "@caramelo/design-system";
import { X, Share2 } from "lucide-react";
import type { TakeRecord } from "../types";

interface ShareModalProps {
  take: TakeRecord;
  onClose: () => void;
}

export function ShareModal({ take, onClose }: ShareModalProps) {
  const shareUrl = `${window.location.origin}/tools/cap?take=${take.id}`;
  const embedCode = `<iframe src="${shareUrl}&embed=1" width="100%" height="480" frameborder="0" allowfullscreen></iframe>`;

  return (
    <div className="cap-modal-backdrop" onClick={onClose}>
      <div className="cap-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="cap-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Share2 size={18} color="rgb(var(--cm-accent))" />
            <div className="cap-modal-title">Compartilhar Take</div>
          </div>
          <button
            className="cap-btn cap-btn-subtle"
            style={{ padding: 6 }}
            onClick={onClose}
            aria-label="Fechar modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Share Link */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "rgb(var(--cm-fg-muted))" }}>
            LINK PÚBLICO DO VÍDEO
          </label>
          <div className="cap-copy-input-row">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="cap-input"
            />
            <CopyButton value={shareUrl} label="Copiar Link" />
          </div>
        </div>

        {/* Embed code */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "rgb(var(--cm-fg-muted))" }}>
            CÓDIGO DE EMBED (NOTION, BLOG OU LANDING PAGE)
          </label>
          <div className="cap-copy-input-row">
            <input
              type="text"
              readOnly
              value={embedCode}
              className="cap-input"
            />
            <CopyButton value={embedCode} label="Copiar Embed" />
          </div>
        </div>

        <div style={{ fontSize: 12, color: "rgb(var(--cm-fg-dim))", lineHeight: 1.5 }}>
          Seu vídeo foi gravado localmente neste navegador com moldura cinemática.
          Qualquer membro ou cliente que abrir o link terá a experiência visual completa com seus zooms configurados.
        </div>
      </div>
    </div>
  );
}
