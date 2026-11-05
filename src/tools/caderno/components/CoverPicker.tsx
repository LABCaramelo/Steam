interface CoverPickerProps {
  currentCover?: string;
  onSelect: (cover: string | undefined) => void;
  onClose: () => void;
}

const COVER_PRESETS = [
  {
    id: "caramelo-dawn",
    name: "Caramelo Horizon",
    gradient: "linear-gradient(135deg, #181824 0%, #2a1b12 50%, #FF701A33 100%)",
  },
  {
    id: "serra-curral",
    name: "Serra do Curral",
    gradient: "linear-gradient(135deg, #101014 0%, #1a162b 50%, #7657FF33 100%)",
  },
  {
    id: "electric-sky",
    name: "Céu Elétrico",
    gradient: "linear-gradient(135deg, #0e1624 0%, #102638 50%, #25BFFF33 100%)",
  },
  {
    id: "hot-pink",
    name: "Provocação Pink",
    gradient: "linear-gradient(135deg, #1a0f18 0%, #301424 50%, #FF3D8D33 100%)",
  },
  {
    id: "acid-yellow",
    name: "Sol de BH",
    gradient: "linear-gradient(135deg, #18160e 0%, #282414 50%, #FFD52A33 100%)",
  },
  {
    id: "ink-minimal",
    name: "Ink Black Puro",
    gradient: "linear-gradient(135deg, #16161E 0%, #1C1C26 100%)",
  },
  {
    id: "warm-cream",
    name: "Papel Editorial",
    gradient: "linear-gradient(135deg, #24201c 0%, #362e26 100%)",
  },
];

export function CoverPicker({ onSelect, onClose }: CoverPickerProps) {
  return (
    <div className="caderno-modal-backdrop" onClick={onClose}>
      <div className="caderno-cover-picker cm-surface" onClick={(e) => e.stopPropagation()}>
        <div className="caderno-cover-header">
          <h3>ESCOLHA A CAPA DA PÁGINA</h3>
          <button type="button" className="caderno-btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="caderno-cover-grid">
          {COVER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="caderno-cover-card"
              style={{ background: preset.gradient }}
              onClick={() => {
                onSelect(preset.gradient);
                onClose();
              }}
            >
              <span className="caderno-cover-title">{preset.name}</span>
            </button>
          ))}
        </div>

        <div className="caderno-cover-actions">
          <button
            type="button"
            className="caderno-btn-subtle"
            onClick={() => {
              onSelect(undefined);
              onClose();
            }}
          >
            Remover Capa
          </button>
        </div>
      </div>
    </div>
  );
}
