import { useState } from "react";
import type { CadernoPage, Workspace } from "../types";
import { pageToMarkdown } from "../storage";

interface ExportModalProps {
  page: CadernoPage;
  workspace: Workspace;
  onClose: () => void;
}

export function ExportModal({ page, workspace, onClose }: ExportModalProps) {
  const [copied, setCopied] = useState(false);
  const markdown = pageToMarkdown(page);

  const downloadMarkdown = () => {
    const filename = `${(page.title || "pagina").toLowerCase().replace(/[^a-z0-9_-]/g, "_")}.md`;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadWorkspaceJson = () => {
    const filename = `caderno_backup_${new Date().toISOString().split("T")[0]}.json`;
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyMarkdown = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="caderno-modal-backdrop" onClick={onClose}>
      <div className="caderno-export-modal cm-surface" onClick={(e) => e.stopPropagation()}>
        <div className="caderno-export-header">
          <h3>EXPORTAR DOCUMENTO & DADOS</h3>
          <button type="button" className="caderno-btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="caderno-export-options">
          <div className="caderno-export-option-card">
            <h4>📄 Exportar Página (.md)</h4>
            <p>Baixe este documento formatado em Markdown para usar no Obsidian, GitHub ou publicar.</p>
            <div className="caderno-export-btn-group">
              <button type="button" className="caderno-btn-primary" onClick={downloadMarkdown}>
                Baixar Markdown
              </button>
              <button type="button" className="caderno-btn-subtle" onClick={copyMarkdown}>
                {copied ? "Copiado! ✓" : "Copiar Texto"}
              </button>
            </div>
          </div>

          <div className="caderno-export-option-card">
            <h4>💾 Backup Completo (.json)</h4>
            <p>Exporte todas as suas páginas, bases de dados e anotações deste workspace em arquivo JSON.</p>
            <button type="button" className="caderno-btn-subtle" onClick={downloadWorkspaceJson}>
              Baixar Backup do Workspace
            </button>
          </div>

          <div className="caderno-export-option-card">
            <h4>🖨️ Imprimir / Salvar PDF</h4>
            <p>Formato pronto para impressão ou exportação limpa em PDF sem barras de ferramentas.</p>
            <button type="button" className="caderno-btn-subtle" onClick={() => window.print()}>
              Imprimir Página
            </button>
          </div>
        </div>

        <div className="caderno-export-preview-section">
          <span className="caderno-export-preview-title">PRÉ-VISUALIZAÇÃO DO MARKDOWN:</span>
          <pre className="caderno-export-preview">{markdown}</pre>
        </div>
      </div>
    </div>
  );
}
