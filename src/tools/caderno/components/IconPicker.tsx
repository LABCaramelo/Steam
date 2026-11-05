interface IconPickerProps {
  onSelect: (icon: string) => void;
  onClose: () => void;
}

const EMOJI_GROUPS = [
  {
    category: "Geral & Documentos",
    emojis: ["📄", "📝", "📋", "📁", "📂", "📑", "📓", "📕", "📗", "📘", "🧠", "💡", "⚡", "🎯", "📌", "🔍"],
  },
  {
    category: "Projetos & Estratégia",
    emojis: ["📊", "📈", "📉", "🧩", "⚙️", "🛠️", "🚀", "🪐", "🌟", "🔥", "💎", "🏆", "🎬", "🎨", "📐", "☕"],
  },
  {
    category: "Marcadores & Status",
    emojis: ["✅", "⏳", "⚠️", "⛔", "💬", "💭", "📢", "🔔", "⭐", "🏷️", "🔒", "🔑", "🌐", "💻", "📱", "🎧"],
  },
];

export function IconPicker({ onSelect, onClose }: IconPickerProps) {
  return (
    <div className="caderno-modal-backdrop" onClick={onClose}>
      <div className="caderno-icon-picker cm-surface" onClick={(e) => e.stopPropagation()}>
        <div className="caderno-icon-header">
          <h3>ESCOLHA UM ÍCONE</h3>
          <button type="button" className="caderno-btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="caderno-icon-groups">
          {EMOJI_GROUPS.map((group) => (
            <div key={group.category} className="caderno-icon-group">
              <span className="caderno-icon-group-title">{group.category}</span>
              <div className="caderno-icon-grid">
                {group.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="caderno-icon-btn"
                    onClick={() => {
                      onSelect(emoji);
                      onClose();
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
