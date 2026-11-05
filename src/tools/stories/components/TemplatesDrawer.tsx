import React, { useState } from "react";
import { X, BookmarkPlus, Trash2, LayoutTemplate } from "lucide-react";
import type { StoryTemplate, StoryBackground, StoryLayer } from "../types";
import {
  BUILT_IN_TEMPLATES,
  loadUserTemplates,
  saveUserTemplates,
} from "../store/templatesStore";

interface TemplatesDrawerProps {
  currentBackground: StoryBackground;
  currentLayers: StoryLayer[];
  onLoadTemplate: (template: StoryTemplate) => void;
  onClose: () => void;
}

export function TemplatesDrawer({
  currentBackground,
  currentLayers,
  onLoadTemplate,
  onClose,
}: TemplatesDrawerProps) {
  const [userTemplates, setUserTemplates] = useState<StoryTemplate[]>(() => loadUserTemplates());
  const [categoryFilter, setCategoryFilter] = useState<string>("todos");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Save current story layout as a user template
  const handleSaveCurrentAsTemplate = () => {
    if (!newTemplateName.trim()) return;

    const newTemplate: StoryTemplate = {
      id: `user_tpl_${Date.now()}`,
      name: newTemplateName.trim(),
      category: "personalizado",
      isUserTemplate: true,
      background: currentBackground,
      layers: currentLayers,
      previewDescription: `Diagramação salva com ${currentLayers.length} elementos.`,
    };

    const next = [newTemplate, ...userTemplates];
    setUserTemplates(next);
    saveUserTemplates(next);
    setNewTemplateName("");
    setIsSaving(false);
  };

  const handleDeleteUserTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = userTemplates.filter((t) => t.id !== id);
    setUserTemplates(next);
    saveUserTemplates(next);
  };

  const allTemplates = [...userTemplates, ...BUILT_IN_TEMPLATES];

  const filteredTemplates = allTemplates.filter((t) => {
    if (categoryFilter === "todos") return true;
    if (categoryFilter === "personalizado") return t.isUserTemplate;
    return t.category === categoryFilter;
  });

  return (
    <div className="stories-drawer-overlay" onClick={onClose}>
      <div className="stories-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="stories-drawer__header">
          <div className="drawer-handle-bar" />
          <div className="drawer-title-row">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <LayoutTemplate size={22} color="#FF701A" />
              <h2>Templates & Diagramações</h2>
            </div>
            <button type="button" className="drawer-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Save current template quick action */}
          {!isSaving ? (
            <button
              type="button"
              className="save-current-tpl-btn"
              onClick={() => setIsSaving(true)}
            >
              <BookmarkPlus size={18} />
              <span>Salvar Story Atual como Novo Template</span>
            </button>
          ) : (
            <div className="save-tpl-form">
              <input
                type="text"
                placeholder="Nome do seu template (ex: Meu Story de Frase)..."
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="save-tpl-input"
                autoFocus
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="save-tpl-confirm-btn"
                  onClick={handleSaveCurrentAsTemplate}
                >
                  Salvar
                </button>
                <button
                  type="button"
                  className="save-tpl-cancel-btn"
                  onClick={() => setIsSaving(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Categories bar */}
          <div className="drawer-tabs-scroll" style={{ marginTop: 14 }}>
            {[
              { id: "todos", label: "Todos" },
              { id: "personalizado", label: "Meus Templates" },
              { id: "urgente", label: "Urgência" },
              { id: "frases", label: "Frases" },
              { id: "perguntas", label: "Perguntas" },
              { id: "lancamento", label: "Lançamento" },
              { id: "dicas", label: "Passo a Passo" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`drawer-tab-btn ${categoryFilter === cat.id ? "is-active" : ""}`}
                onClick={() => setCategoryFilter(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="stories-drawer__content">
          <div className="templates-grid">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="template-card"
                onClick={() => {
                  onLoadTemplate(template);
                  onClose();
                }}
              >
                <div
                  className="template-card__preview"
                  style={{
                    background:
                      template.background.type === "color" || template.background.type === "gradient"
                        ? template.background.value
                        : "#101014",
                  }}
                >
                  {/* Miniature representations of template elements */}
                  <div className="template-card__mini-elements">
                    {template.layers.slice(0, 3).map((l, i) => (
                      <div
                        key={i}
                        className="mini-bar"
                        style={{
                          background:
                            l.type === "text"
                              ? (l as any).color || "#FFF"
                              : l.type === "widget"
                              ? (l as any).data?.primaryColor || "#FF701A"
                              : "#25BFFF",
                          height: l.type === "text" ? 6 : 10,
                          width: `${Math.min(90, Math.max(40, 70 - i * 15))}%`,
                          borderRadius: 3,
                          opacity: 0.8,
                        }}
                      />
                    ))}
                  </div>

                  {template.isUserTemplate && (
                    <span className="user-template-tag">Meu Template</span>
                  )}
                </div>

                <div className="template-card__info">
                  <div className="template-card__title-row">
                    <strong>{template.name}</strong>
                    {template.isUserTemplate && (
                      <button
                        type="button"
                        className="delete-tpl-btn"
                        onClick={(e) => handleDeleteUserTemplate(template.id, e)}
                        title="Excluir meu template"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <p>{template.previewDescription || "Diagramação pronta para uso."}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
