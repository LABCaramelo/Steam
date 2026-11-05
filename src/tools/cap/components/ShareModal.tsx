import { useState } from "react";
import { Copy, Check, X, Share2, Code } from "lucide-react";
import type { TakeRecord } from "../types";

interface ShareModalProps {
  take: TakeRecord;
  onClose: () => void;
}

export function ShareModal({ take, onClose }: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const shareUrl = `${window.location.origin}/tools/cap?take=${take.id}`;
  const embedCode = `<iframe src="${shareUrl}&embed=1" width="100%" height="480" frameborder="0" allowfullscreen></iframe>`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  return (
    <div className="cap-modal-backdrop" onClick={onClose}>
      <div className="cap-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="cap-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Share2 size={18} color="#FF701A" />
            <div className="cap-modal-title">Compartilhar Take</div>
          </div>
          <button
            className="cap-btn cap-btn-subtle"
            style={{ padding: 6 }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Share Link */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,244,232,0.6)" }}>
            LINK PÚBLICO DO VÍDEO
          </label>
          <div className="cap-copy-input-row">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="cap-input"
            />
            <button className="cap-btn cap-btn-accent" onClick={handleCopyLink}>
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedLink ? "Copiado!" : "Copiar"}</span>
            </button>
          </div>
        </div>

        {/* Embed code */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,244,232,0.6)" }}>
            CÓDIGO DE EMBED (NOTION, BLOG OU LANDING PAGE)
          </label>
          <div className="cap-copy-input-row">
            <input
              type="text"
              readOnly
              value={embedCode}
              className="cap-input"
            />
            <button className="cap-btn cap-btn-subtle" onClick={handleCopyEmbed}>
              {copiedEmbed ? <Check size={14} /> : <Code size={14} />}
              <span>{copiedEmbed ? "Copiado!" : "Copiar Embed"}</span>
            </button>
          </div>
        </div>

        <div style={{ fontSize: 11, color: "rgba(255,244,232,0.45)", lineHeight: 1.5 }}>
          Seu vídeo foi gravado localmente neste navegador com moldura cinemática.
          Qualquer membro ou cliente que abrir o link terá a experiência visual completa com seus zooms configurados.
        </div>
      </div>
    </div>
  );
}
