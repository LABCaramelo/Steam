import { useState, useEffect, useCallback } from "react";
import type { CadernoPage, Workspace } from "./types";
import { loadWorkspace, saveWorkspace, markdownToPage } from "./storage";
import { DEFAULT_DATABASE } from "./templates/defaultPages";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { DocumentEditor } from "./components/DocumentEditor";
import { CommandPalette } from "./components/CommandPalette";
import { TemplatesModal } from "./components/TemplatesModal";
import { ExportModal } from "./components/ExportModal";
import { useOptionalToolUser } from "../shared/kit";
import "./caderno.css";

export function CadernoApp() {
  const user = useOptionalToolUser();
  const [workspace, setWorkspace] = useState<Workspace>(() => loadWorkspace(user?.id));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showExport, setShowExport] = useState(false);

  // Auto-save on workspace change
  useEffect(() => {
    saveWorkspace(workspace, user?.id);
  }, [workspace, user?.id]);

  // Recarregar se o usuário logar/mudar
  useEffect(() => {
    if (user?.id) {
      setWorkspace(loadWorkspace(user.id));
    }
  }, [user?.id]);

  // Página ativa
  const activePage =
    workspace.pages.find((p) => p.id === workspace.activePageId) || workspace.pages[0];

  // Atalhos Globais: Ctrl+K / Cmd+K e Ctrl+\
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearch((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectPage = useCallback((id: string) => {
    setWorkspace((prev) => ({ ...prev, activePageId: id }));
  }, []);

  const handleUpdatePage = useCallback((updated: CadernoPage) => {
    setWorkspace((prev) => ({
      ...prev,
      pages: prev.pages.map((p) =>
        p.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : p
      ),
    }));
  }, []);

  const handleCreatePage = useCallback((isDatabase = false, parentId: string | null = null) => {
    const now = new Date().toISOString();
    const newPage: CadernoPage = {
      id: `page-${Date.now()}`,
      parentId,
      title: isDatabase ? "Nova Base de Dados" : "Página Sem Título",
      icon: isDatabase ? "📊" : "📄",
      isFavorite: false,
      isDatabase,
      database: isDatabase ? { ...DEFAULT_DATABASE, id: `db-${Date.now()}` } : undefined,
      blocks: isDatabase
        ? []
        : [{ id: `b-${Date.now()}`, type: "paragraph", content: "" }],
      createdAt: now,
      updatedAt: now,
    };

    setWorkspace((prev) => ({
      ...prev,
      pages: [newPage, ...prev.pages],
      activePageId: newPage.id,
    }));
  }, []);

  const handleDuplicatePage = useCallback((id: string) => {
    setWorkspace((prev) => {
      const target = prev.pages.find((p) => p.id === id);
      if (!target) return prev;
      const dup: CadernoPage = {
        ...target,
        id: `page-${Date.now()}`,
        title: `${target.title} (Cópia)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return {
        ...prev,
        pages: [dup, ...prev.pages],
        activePageId: dup.id,
      };
    });
  }, []);

  const handleDeletePage = useCallback((id: string) => {
    setWorkspace((prev) => {
      const target = prev.pages.find((p) => p.id === id);
      if (!target) return prev;
      const remaining = prev.pages.filter((p) => p.id !== id);
      const nextActiveId =
        prev.activePageId === id
          ? remaining[0]?.id || ""
          : prev.activePageId;

      return {
        ...prev,
        pages: remaining,
        activePageId: nextActiveId,
        trash: [target, ...prev.trash],
      };
    });
  }, []);

  const handleToggleFavorite = useCallback((id: string) => {
    setWorkspace((prev) => ({
      ...prev,
      pages: prev.pages.map((p) =>
        p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
      ),
    }));
  }, []);

  const handleTogglePageType = useCallback(() => {
    if (!activePage) return;
    const isNowDatabase = !activePage.isDatabase;
    handleUpdatePage({
      ...activePage,
      isDatabase: isNowDatabase,
      database: isNowDatabase ? activePage.database || { ...DEFAULT_DATABASE, id: `db-${Date.now()}` } : activePage.database,
    });
  }, [activePage, handleUpdatePage]);

  const handleApplyTemplate = useCallback((templatePage: CadernoPage) => {
    setWorkspace((prev) => ({
      ...prev,
      pages: [templatePage, ...prev.pages],
      activePageId: templatePage.id,
    }));
  }, []);

  const handleRestoreFromTrash = useCallback((id: string) => {
    setWorkspace((prev) => {
      const target = prev.trash.find((t) => t.id === id);
      if (!target) return prev;
      return {
        ...prev,
        trash: prev.trash.filter((t) => t.id !== id),
        pages: [target, ...prev.pages],
        activePageId: target.id,
      };
    });
  }, []);

  const handleEmptyTrash = useCallback(() => {
    setWorkspace((prev) => ({ ...prev, trash: [] }));
  }, []);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      if (file.name.endsWith(".json")) {
        try {
          const parsed = JSON.parse(text);
          if (parsed && Array.isArray(parsed.pages)) {
            setWorkspace(parsed);
            return;
          }
        } catch {
          // Se falhar o parse de JSON, trata como texto markdown
        }
      }

      const imported = markdownToPage(text, file.name.replace(/\.[^/.]+$/, ""));
      handleApplyTemplate(imported);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="caderno-app-root">
      {/* Barra Lateral */}
      <Sidebar
        pages={workspace.pages}
        activePageId={activePage?.id || ""}
        trash={workspace.trash}
        isOpen={sidebarOpen}
        onSelectPage={handleSelectPage}
        onCreatePage={handleCreatePage}
        onDuplicatePage={handleDuplicatePage}
        onDeletePage={handleDeletePage}
        onToggleFavorite={handleToggleFavorite}
        onOpenTemplates={() => setShowTemplates(true)}
        onOpenSearch={() => setShowSearch(true)}
        onRestoreFromTrash={handleRestoreFromTrash}
        onEmptyTrash={handleEmptyTrash}
        userName={user?.name}
      />

      {/* Área Principal */}
      <main className="caderno-main">
        {activePage ? (
          <>
            <TopBar
              page={activePage}
              pages={workspace.pages}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
              onToggleFavorite={handleToggleFavorite}
              onTogglePageType={handleTogglePageType}
              onOpenTemplates={() => setShowTemplates(true)}
              onOpenExport={() => setShowExport(true)}
              onImportFile={handleImportFile}
              onOpenSearch={() => setShowSearch(true)}
            />
            <DocumentEditor
              key={activePage.id}
              page={activePage}
              onUpdatePage={handleUpdatePage}
            />
          </>
        ) : (
          <div className="caderno-empty-workspace">
            <h2>Nenhuma página selecionada</h2>
            <button
              type="button"
              className="caderno-btn-primary"
              onClick={() => handleCreatePage(false)}
            >
              Criar primeira página
            </button>
          </div>
        )}
      </main>

      {/* Modais Globais */}
      {showSearch && (
        <CommandPalette
          pages={workspace.pages}
          onSelectPage={handleSelectPage}
          onClose={() => setShowSearch(false)}
        />
      )}

      {showTemplates && (
        <TemplatesModal
          onApplyTemplate={handleApplyTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {showExport && activePage && (
        <ExportModal
          page={activePage}
          workspace={workspace}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
