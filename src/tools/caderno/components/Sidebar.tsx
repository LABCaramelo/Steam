import { useState } from "react";
import type { CadernoPage } from "../types";

interface SidebarProps {
  pages: CadernoPage[];
  activePageId: string;
  trash: CadernoPage[];
  isOpen: boolean;
  onSelectPage: (id: string) => void;
  onCreatePage: (isDatabase?: boolean, parentId?: string | null) => void;
  onDuplicatePage: (id: string) => void;
  onDeletePage: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onOpenTemplates: () => void;
  onOpenSearch: () => void;
  onRestoreFromTrash: (id: string) => void;
  onEmptyTrash: () => void;
  userName?: string;
}

export function Sidebar({
  pages,
  activePageId,
  trash,
  isOpen,
  onSelectPage,
  onCreatePage,
  onDuplicatePage,
  onDeletePage,
  onToggleFavorite,
  onOpenTemplates,
  onOpenSearch,
  onRestoreFromTrash,
  onEmptyTrash,
  userName,
}: SidebarProps) {
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({});

  const favorites = pages.filter((p) => p.isFavorite);
  const rootPages = pages.filter((p) => !p.parentId);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPages((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderPageItem = (page: CadernoPage, depth = 0) => {
    const children = pages.filter((p) => p.parentId === page.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedPages[page.id] ?? true;
    const isActive = page.id === activePageId;

    return (
      <div key={page.id} className="caderno-tree-node">
        <div
          className={`caderno-tree-row ${isActive ? "is-active" : ""}`}
          style={{ paddingLeft: `${12 + depth * 14}px` }}
          onClick={() => onSelectPage(page.id)}
        >
          {hasChildren ? (
            <button
              type="button"
              className={`caderno-tree-expand ${isExpanded ? "is-expanded" : ""}`}
              onClick={(e) => toggleExpand(page.id, e)}
            >
              ▶
            </button>
          ) : (
            <span className="caderno-tree-expand-placeholder" />
          )}

          <span className="caderno-tree-icon">{page.icon || (page.isDatabase ? "📊" : "📄")}</span>
          <span className="caderno-tree-title">{page.title || "Sem título"}</span>

          {/* Ações ao passar o mouse */}
          <div className="caderno-tree-actions" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="caderno-btn-icon-ghost"
              title="Criar subpágina"
              onClick={() => onCreatePage(false, page.id)}
            >
              +
            </button>
            <button
              type="button"
              className="caderno-btn-icon-ghost"
              title="Duplicar página"
              onClick={() => onDuplicatePage(page.id)}
            >
              ⧉
            </button>
            <button
              type="button"
              className={`caderno-btn-icon-ghost ${page.isFavorite ? "is-fav" : ""}`}
              title={page.isFavorite ? "Remover dos favoritos" : "Favoritar"}
              onClick={() => onToggleFavorite(page.id)}
            >
              {page.isFavorite ? "★" : "☆"}
            </button>
            <button
              type="button"
              className="caderno-btn-icon-ghost is-danger"
              title="Excluir página"
              onClick={() => onDeletePage(page.id)}
            >
              🗑
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="caderno-tree-children">
            {children.map((child) => renderPageItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={`caderno-sidebar ${isOpen ? "is-open" : "is-closed"}`}>
      {/* Cabeçalho da Sidebar */}
      <div className="caderno-sidebar-header">
        <div className="caderno-sidebar-brand">
          <span className="caderno-brand-badge">LAB</span>
          <div className="caderno-brand-titles">
            <span className="caderno-brand-name">CADERNO</span>
            <span className="caderno-brand-sub">AppFlowy Workspace</span>
          </div>
        </div>
      </div>

      {/* Botões Rápidos */}
      <div className="caderno-sidebar-quick-actions">
        <button
          type="button"
          className="caderno-sidebar-action-btn"
          onClick={onOpenSearch}
        >
          <span>🔍 Buscar no Caderno</span>
          <kbd className="caderno-kbd">Ctrl+K</kbd>
        </button>

        <button
          type="button"
          className="caderno-sidebar-action-btn"
          onClick={onOpenTemplates}
        >
          <span>⚡ Templates do LAB</span>
        </button>

        <div className="caderno-sidebar-create-row">
          <button
            type="button"
            className="caderno-btn-create-page"
            onClick={() => onCreatePage(false)}
          >
            + Nova Página
          </button>
          <button
            type="button"
            className="caderno-btn-create-db"
            onClick={() => onCreatePage(true)}
            title="Criar Base de Dados (Tabela & Kanban)"
          >
            + Nova Base
          </button>
        </div>
      </div>

      {/* Scroll dos Documentos */}
      <div className="caderno-sidebar-tree-scroll">
        {/* Favoritos */}
        {favorites.length > 0 && (
          <div className="caderno-tree-section">
            <div className="caderno-tree-section-header">FAVORITOS</div>
            {favorites.map((fav) => (
              <div
                key={`fav-${fav.id}`}
                className={`caderno-tree-row ${fav.id === activePageId ? "is-active" : ""}`}
                style={{ paddingLeft: 12 }}
                onClick={() => onSelectPage(fav.id)}
              >
                <span className="caderno-tree-icon">{fav.icon || (fav.isDatabase ? "📊" : "📄")}</span>
                <span className="caderno-tree-title">{fav.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Páginas do Workspace */}
        <div className="caderno-tree-section">
          <div className="caderno-tree-section-header">
            <span>MEUS DOCUMENTOS</span>
            <span className="caderno-tree-count">{pages.length}</span>
          </div>
          {rootPages.map((page) => renderPageItem(page, 0))}
        </div>
      </div>

      {/* Rodapé da Sidebar */}
      <div className="caderno-sidebar-footer">
        <button
          type="button"
          className="caderno-sidebar-footer-btn"
          onClick={() => setShowTrashModal(true)}
        >
          <span>🗑 Lixeira</span>
          {trash.length > 0 && <span className="caderno-trash-badge">{trash.length}</span>}
        </button>

        <div className="caderno-sidebar-status">
          <span className="caderno-status-dot is-online" />
          <span className="caderno-status-text">
            {userName ? `Conectado: ${userName}` : "100% Offline · Local-First"}
          </span>
        </div>
      </div>

      {/* Modal da Lixeira */}
      {showTrashModal && (
        <div className="caderno-modal-backdrop" onClick={() => setShowTrashModal(false)}>
          <div className="caderno-trash-modal cm-surface" onClick={(e) => e.stopPropagation()}>
            <div className="caderno-trash-header">
              <h3>LIXEIRA ({trash.length})</h3>
              <button
                type="button"
                className="caderno-btn-ghost"
                onClick={() => setShowTrashModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="caderno-trash-list">
              {trash.length === 0 ? (
                <div className="caderno-trash-empty">A lixeira está vazia.</div>
              ) : (
                trash.map((item) => (
                  <div key={item.id} className="caderno-trash-item">
                    <span className="caderno-trash-icon">{item.icon || "📄"}</span>
                    <span className="caderno-trash-name">{item.title}</span>
                    <button
                      type="button"
                      className="caderno-btn-subtle"
                      onClick={() => onRestoreFromTrash(item.id)}
                    >
                      Restaurar
                    </button>
                  </div>
                ))
              )}
            </div>

            {trash.length > 0 && (
              <div className="caderno-trash-footer">
                <button
                  type="button"
                  className="caderno-btn-danger"
                  onClick={() => {
                    if (confirm("Esvaziar permanentemente todas as páginas da lixeira?")) {
                      onEmptyTrash();
                      setShowTrashModal(false);
                    }
                  }}
                >
                  Esvaziar Lixeira
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
