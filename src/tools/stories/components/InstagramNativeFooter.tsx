import { Download, Film, Share2 } from "lucide-react";

interface InstagramNativeFooterProps {
  onQuickExport: () => void;
  onShareCloseFriends: () => void;
  onOpenFullExport: () => void;
  isDragging: boolean;
  isLayerSelected?: boolean;
}

export function InstagramNativeFooter({
  onQuickExport,
  onShareCloseFriends,
  onOpenFullExport,
  isDragging,
  isLayerSelected,
}: InstagramNativeFooterProps) {
  return (
    <footer
      className={`ig-native-footer ${isDragging || isLayerSelected ? "is-hidden" : ""}`}
      aria-label="Ações de Exportação e Compartilhamento"
    >
      <div className="ig-footer-content">
        {/* Pill 1: Salvar Imagem (PNG) */}
        <button
          type="button"
          className="ig-footer-pill ig-footer-pill--download"
          onClick={onQuickExport}
          title="Baixar imagem em alta resolução (1080×1920)"
        >
          <Download size={18} strokeWidth={2.4} />
          <span className="ig-pill-text">Salvar Imagem</span>
        </button>

        {/* Pill 2: Gravar Vídeo (MP4) */}
        <button
          type="button"
          className="ig-footer-pill ig-footer-pill--video"
          onClick={onOpenFullExport}
          title="Gravar e exportar story em vídeo MP4"
        >
          <Film size={18} strokeWidth={2.2} />
          <span className="ig-pill-text">Vídeo MP4</span>
        </button>

        {/* Circular Button: Compartilhar */}
        <button
          type="button"
          className="ig-footer-circle-btn ig-footer-circle-btn--share"
          onClick={onShareCloseFriends}
          title="Compartilhar direto (Instagram, WhatsApp, AirDrop)"
          aria-label="Compartilhar Story"
        >
          <Share2 size={18} strokeWidth={2.2} />
        </button>
      </div>
    </footer>
  );
}
