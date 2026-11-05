import {
  Trash2,
  Copy,
  ArrowUpToLine,
  ArrowDownToLine,
  AlignCenterHorizontal,
  Lock,
  Unlock,
  X,
  Type,
} from "lucide-react";
import type { StoryLayer } from "../types";

interface BottomActionBarProps {
  selectedLayer: StoryLayer | null;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onCenter: (id: string, axis: "x" | "y" | "both") => void;
  onToggleLock: (id: string) => void;
  onEditText: (id: string) => void;
  onDeselect: () => void;
}

export function BottomActionBar({
  selectedLayer,
  onDelete,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  onCenter,
  onToggleLock,
  onEditText,
  onDeselect,
}: BottomActionBarProps) {
  if (!selectedLayer) return null;

  return (
    <div className="stories-bottom-action-bar">
      {/* Layer description */}
      <div className="bottom-bar-layer-badge">
        <span>{selectedLayer.type.toUpperCase()}</span>
      </div>

      <div className="bottom-bar-actions-group">
        {selectedLayer.type === "text" && (
          <button
            type="button"
            className="bottom-bar-action-btn"
            onClick={() => onEditText(selectedLayer.id)}
            title="Editar Texto"
          >
            <Type size={18} />
            <span>Editar</span>
          </button>
        )}

        <button
          type="button"
          className="bottom-bar-action-btn"
          onClick={() => onDuplicate(selectedLayer.id)}
          title="Duplicar Elemento"
        >
          <Copy size={18} />
          <span>Duplicar</span>
        </button>

        <button
          type="button"
          className="bottom-bar-action-btn"
          onClick={() => onCenter(selectedLayer.id, "x")}
          title="Centralizar Horizontalmente"
        >
          <AlignCenterHorizontal size={18} />
          <span>Centro</span>
        </button>

        <button
          type="button"
          className="bottom-bar-action-btn"
          onClick={() => onBringToFront(selectedLayer.id)}
          title="Trazer para Frente"
        >
          <ArrowUpToLine size={18} />
        </button>

        <button
          type="button"
          className="bottom-bar-action-btn"
          onClick={() => onSendToBack(selectedLayer.id)}
          title="Enviar para Trás"
        >
          <ArrowDownToLine size={18} />
        </button>

        <button
          type="button"
          className="bottom-bar-action-btn"
          onClick={() => onToggleLock(selectedLayer.id)}
          title={selectedLayer.locked ? "Destravar" : "Travar Posição"}
        >
          {selectedLayer.locked ? <Lock size={18} color="#FF701A" /> : <Unlock size={18} />}
        </button>

        <button
          type="button"
          className="bottom-bar-action-btn bottom-bar-action-btn--delete"
          onClick={() => onDelete(selectedLayer.id)}
          title="Excluir Elemento"
        >
          <Trash2 size={18} />
        </button>

        <button
          type="button"
          className="bottom-bar-action-btn bottom-bar-action-btn--close"
          onClick={onDeselect}
          title="Fechar seleção"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
