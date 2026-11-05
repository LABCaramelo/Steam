import { Check, X, Sparkles, Sliders } from "lucide-react";
import { STORY_FILTERS } from "../utils/filters";
import type { StoryFilterId } from "../types";

interface FiltersDrawerProps {
  activeFilterId: StoryFilterId;
  activeIntensity: number;
  onSelectFilter: (id: StoryFilterId, intensity: number) => void;
  onClose: () => void;
}

export function FiltersDrawer({
  activeFilterId,
  activeIntensity,
  onSelectFilter,
  onClose,
}: FiltersDrawerProps) {
  return (
    <div className="stories-drawer-overlay" onClick={onClose}>
      <div
        className="stories-drawer filters-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <div className="drawer-title-group">
            <Sparkles size={18} color="#FFD52A" />
            <h3 className="drawer-title">Filtros & Efeitos de Story</h3>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Carousel */}
        <div className="filters-carousel-wrapper">
          <div className="filters-carousel">
            {STORY_FILTERS.map((f) => {
              const isSelected = activeFilterId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`filter-bubble-item ${isSelected ? "is-active" : ""}`}
                  onClick={() => onSelectFilter(f.id, activeIntensity)}
                >
                  <div
                    className="filter-bubble-preview"
                    style={{ background: f.previewColor }}
                  >
                    {isSelected && (
                      <div className="filter-bubble-check">
                        <Check size={16} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <span className="filter-bubble-name">{f.name}</span>
                  <span className="filter-bubble-sub">{f.subtitle}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Intensity slider if filter is not "none" */}
        {activeFilterId !== "none" && (
          <div className="filter-intensity-bar">
            <div className="intensity-label-row">
              <span className="intensity-label">
                <Sliders size={14} /> Intensidade do Efeito
              </span>
              <span className="intensity-value">{Math.round(activeIntensity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={activeIntensity}
              onChange={(e) => onSelectFilter(activeFilterId, parseFloat(e.target.value))}
              className="filter-range-slider"
            />
          </div>
        )}

        <div className="drawer-footer-actions">
          <button type="button" className="drawer-confirm-btn" onClick={onClose}>
            <Check size={18} />
            <span>Aplicar ao Story</span>
          </button>
        </div>
      </div>
    </div>
  );
}
