import { useEffect } from "react";
import { Trash2 } from "lucide-react";

interface StoriesTrashBinProps {
  isVisible: boolean;
  isOverTrash: boolean;
}

export function StoriesTrashBin({ isVisible, isOverTrash }: StoriesTrashBinProps) {
  // Trigger subtle haptic on mobile when hovering trash
  useEffect(() => {
    if (isOverTrash && typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate?.(40);
      } catch {
        // Ignore if not supported
      }
    }
  }, [isOverTrash]);

  if (!isVisible) return null;

  return (
    <div
      id="story-trash-zone"
      className={`story-trash-bin ${isOverTrash ? "is-hovered" : ""}`}
      aria-label="Área de Exclusão"
    >
      <div className="trash-circle">
        <Trash2
          size={isOverTrash ? 28 : 22}
          strokeWidth={2.4}
          className={isOverTrash ? "trash-icon-shake" : ""}
        />
      </div>
      <span className="trash-label">
        {isOverTrash ? "Solte para apagar" : "Arraste aqui para apagar"}
      </span>
    </div>
  );
}
