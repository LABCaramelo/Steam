import type { CadernoPage } from "../types";

interface TopBarProps {
  page: CadernoPage;
  pages: CadernoPage[];
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onToggleFavorite: (id: string) => void;
  onTogglePageType: () => void;
  onOpenTemplates: () => void;
  onOpenExport: () => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenSearch: () => void;
}

export function TopBar({
  page,
  pages,
  sidebarOpen,
  onToggleSidebar,
  onToggleFavorite,
  onTogglePageType,
  onOpenTemplates,
  onOpenExport,
  onImportFile,
  onOpenSearch,
}: TopBarProps) {
  // Construção de breadcrumbs com hierarquia de pais
  const breadcrumbs: { id: string; title: string; icon: string }[] = [];
  let current: CadernoPage | undefined = page;
  while (current) {
    breadcrumbs.unshift({ id: current.id, title: current.title, icon: current.icon });
    current = pages.find((p) => p.id === current?.parentId);
  }

  return (
    <header className="caderno-topbar">
      {/* Lado Esquerdo: Toggle da Sidebar e Breadcrumbs */}
      <div className="caderno-topbar-left">
        <button
          type="button"
          className="caderno-btn-icon-subtle"
          title={sidebarOpen ? "Ocultar Barra Lateral" : "Mostrar Barra Lateral"}
          onClick={onToggleSidebar}
        >
          {sidebarOpen ? "◀" : "▶"}
        </button>

        <nav className="caderno-breadcrumbs" aria-label="Navegação estrutural">
          <span className="caderno-breadcrumb-root">Caderno</span>
          {breadcrumbs.map((crumb) => (
            <span key={crumb.id} className="caderno-breadcrumb-segment">
              <span className="caderno-breadcrumb-sep">/</span>
              <span className="caderno-breadcrumb-item">
                <span className="caderno-breadcrumb-icon">{crumb.icon || "📄"}</span>
                <span className="caderno-breadcrumb-title">{crumb.title || "Sem título"}</span>
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Lado Direito: Ações da Página */}
      <div className="caderno-topbar-right">
        {/* Favoritar */}
        <button
          type="button"
          className={`caderno-btn-icon-subtle ${page.isFavorite ? "is-fav" : ""}`}
          title={page.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          onClick={() => onToggleFavorite(page.id)}
        >
          {page.isFavorite ? "★" : "☆"}
        </button>

        {/* Alternar entre Modo Documento e Modo Base de Dados */}
        <button
          type="button"
          className="caderno-btn-pill-subtle"
          title="Alternar entre editor de texto em blocos e base relacional de dados"
          onClick={onTogglePageType}
        >
          {page.isDatabase ? "📊 Base de Dados" : "📝 Documento"}
        </button>

        {/* Buscar */}
        <button
          type="button"
          className="caderno-btn-icon-subtle"
          title="Buscar no Caderno (Ctrl+K)"
          onClick={onOpenSearch}
        >
          🔍
        </button>

        <div className="caderno-topbar-sep" />

        {/* Templates */}
        <button
          type="button"
          className="caderno-btn-subtle"
          onClick={onOpenTemplates}
          title="Inserir modelo pronto da metodologia Caramelo"
        >
          ⚡ Templates
        </button>

        {/* Importar */}
        <label className="caderno-btn-subtle" style={{ cursor: "pointer", margin: 0 }}>
          <span>⬇ Importar</span>
          <input
            type="file"
            accept=".md,.json,.txt"
            style={{ display: "none" }}
            onChange={onImportFile}
          />
        </label>

        {/* Exportar */}
        <button
          type="button"
          className="caderno-btn-subtle"
          onClick={onOpenExport}
          title="Exportar página em Markdown ou JSON"
        >
          ⬆ Exportar
        </button>

        <div className="caderno-topbar-sep" />

        {/* Indicador de Salvamento */}
        <div className="caderno-topbar-save-status">
          <span className="caderno-save-dot" />
          <span>Salvo</span>
        </div>
      </div>
    </header>
  );
}
