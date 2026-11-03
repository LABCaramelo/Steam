import React, { useState } from "react";
import type { ContentReference, Workspace } from "./types";
import type { ModoCriadorRepository } from "./repo";

interface Props {
  workspace: Workspace;
  references: ContentReference[];
  repo: ModoCriadorRepository;
  onRefresh: () => void;
}

export const BibliotecaView: React.FC<Props> = ({
  workspace,
  references,
  repo,
  onRefresh,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ContentReference["category"]>("copy");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");

  const filtered = references.filter((r) => {
    if (selectedCategory !== "all" && r.category !== selectedCategory) return false;
    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await repo.createReference({
      workspace_id: workspace.id,
      title,
      category,
      url,
      notes,
      tags: [category],
    });

    setModalOpen(false);
    setTitle("");
    setUrl("");
    setNotes("");
    onRefresh();
  };

  return (
    <div className="mc-content">
      <div className="mc-view-header" style={{ padding: 0 }}>
        <div>
          <h2 className="mc-view-header__title">
            <span>📚</span> Biblioteca de Referências & Acervo
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--mc-text-muted)" }}>
            Central de repertório: copies comprovadas, ganchos virais, enquadramentos e inspirações de arte.
          </p>
        </div>

        <button className="mc-btn mc-btn--primary" onClick={() => setModalOpen(true)}>
          + Nova Referência
        </button>
      </div>

      {/* Categorias */}
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { id: "all", label: "Todas" },
          { id: "copy", label: "✍️ Copywriting & Ganchos" },
          { id: "visual", label: "🎨 Direção Visual" },
          { id: "video", label: "🎥 Vídeo & Reels" },
          { id: "estrategia", label: "🧭 Estratégia" },
        ].map((c) => (
          <button
            key={c.id}
            className={`mc-btn ${selectedCategory === c.id ? "mc-btn--acid" : "mc-btn--secondary"}`}
            style={{ fontSize: 12 }}
            onClick={() => setSelectedCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid de Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {filtered.map((ref) => (
          <div
            key={ref.id}
            style={{
              background: "var(--mc-ink-surface)",
              border: "1px solid var(--mc-ink-border)",
              borderRadius: "var(--mc-radius-md)",
              padding: 18,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "var(--mc-caramel)",
                  letterSpacing: "0.06em",
                }}
              >
                {ref.category}
              </span>
              <h4 style={{ margin: "6px 0 8px 0", fontSize: 15, fontWeight: 700 }}>{ref.title}</h4>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--mc-text-body)", lineHeight: 1.5 }}>{ref.notes}</p>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--mc-ink-border)", paddingTop: 10 }}>
              {ref.url ? (
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 12, color: "var(--mc-sky)", textDecoration: "none", fontWeight: 600 }}
                >
                  Abrir link externo ↗
                </a>
              ) : (
                <span style={{ fontSize: 11, color: "var(--mc-text-muted)" }}>Acervo interno</span>
              )}

              <button
                style={{ background: "none", border: "none", color: "var(--mc-text-muted)", cursor: "pointer", fontSize: 12 }}
                onClick={async () => {
                  if (confirm("Excluir esta referência?")) {
                    await repo.deleteReference(ref.id);
                    onRefresh();
                  }
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nova Referência */}
      {modalOpen && (
        <div className="mc-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="mc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mc-modal__header">
              <h2>Adicionar Referência ao Acervo</h2>
              <button
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 18 }}
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="mc-modal__body">
                <div className="mc-field">
                  <label>Título ou Ideia Central *</label>
                  <input
                    type="text"
                    className="mc-input"
                    placeholder="Ex: Fórmula de Gancho com Conflito e Mudança"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="mc-field">
                  <label>Categoria</label>
                  <select
                    className="mc-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                  >
                    <option value="copy">Copywriting & Ganchos</option>
                    <option value="visual">Direção Visual & Cores</option>
                    <option value="video">Vídeo & Reels</option>
                    <option value="estrategia">Estratégia & Negócios</option>
                  </select>
                </div>

                <div className="mc-field">
                  <label>URL / Link de Inspiração (opcional)</label>
                  <input
                    type="url"
                    className="mc-input"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>

                <div className="mc-field">
                  <label>Anotações & Aprendizados</label>
                  <textarea
                    className="mc-textarea"
                    rows={4}
                    placeholder="Por que essa peça chamou atenção? Como replicar para nossos clientes?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="mc-modal__footer">
                <button type="button" className="mc-btn mc-btn--secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="mc-btn mc-btn--primary">
                  Salvar Referência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
