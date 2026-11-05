import type { CadernoPage } from "../types";
import { createDefaultPages } from "../templates/defaultPages";

interface TemplatesModalProps {
  onApplyTemplate: (page: CadernoPage) => void;
  onClose: () => void;
}

export function TemplatesModal({ onApplyTemplate, onClose }: TemplatesModalProps) {
  const canonicalPages = createDefaultPages();

  const handleSelect = (index: number) => {
    const template = canonicalPages[index];
    const newPage: CadernoPage = {
      ...template,
      id: `page-${Date.now()}`,
      parentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onApplyTemplate(newPage);
    onClose();
  };

  const handleBlank = () => {
    const newPage: CadernoPage = {
      id: `page-${Date.now()}`,
      parentId: null,
      title: "Nova Página",
      icon: "📄",
      isFavorite: false,
      isDatabase: false,
      blocks: [{ id: `b-${Date.now()}`, type: "paragraph", content: "" }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onApplyTemplate(newPage);
    onClose();
  };

  return (
    <div className="caderno-modal-backdrop" onClick={onClose}>
      <div className="caderno-templates-modal cm-surface" onClick={(e) => e.stopPropagation()}>
        <div className="caderno-templates-header">
          <div className="caderno-templates-title-group">
            <h3>TEMPLATES DO LABORATÓRIO</h3>
            <p>Modelos estratégicos e bases relacionais prontos com o DNA Caramelo.</p>
          </div>
          <button type="button" className="caderno-btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="caderno-templates-grid">
          {/* Template 1 */}
          <div className="caderno-template-card" onClick={() => handleSelect(0)}>
            <div className="caderno-template-card-icon">🧠</div>
            <div className="caderno-template-card-info">
              <h4>Segundo Cérebro: Rotina & Ideias</h4>
              <p>Estrutura para capturar repertório, notas de bastidor, to-dos e princípios operacionais anti-clichê.</p>
            </div>
            <span className="caderno-template-badge">Documento</span>
          </div>

          {/* Template 2 */}
          <div className="caderno-template-card" onClick={() => handleSelect(1)}>
            <div className="caderno-template-card-icon">⚡</div>
            <div className="caderno-template-card-info">
              <h4>Dossiê de Conteúdo: Método HEAD</h4>
              <p>Atenção (3 ganchos) → Retenção (mecanismos) → Toque (CTAs) e matriz dos 3 universos de marca.</p>
            </div>
            <span className="caderno-template-badge">Estratégia</span>
          </div>

          {/* Template 3 */}
          <div className="caderno-template-card" onClick={() => handleSelect(2)}>
            <div className="caderno-template-card-icon">🏛️</div>
            <div className="caderno-template-card-info">
              <h4>Wiki de Marca & Manual Verbal</h4>
              <p>Guia canônico de tom de voz (elegância + confissão patética) e as 3 vozes tipográficas oficiais.</p>
            </div>
            <span className="caderno-template-badge">Branding</span>
          </div>

          {/* Template 4 */}
          <div className="caderno-template-card" onClick={() => handleSelect(3)}>
            <div className="caderno-template-card-icon">📊</div>
            <div className="caderno-template-card-info">
              <h4>Central de Sprints & Entregas</h4>
              <p>Base relacional completa com visualização em Quadro Kanban, Tabela Grid e Galeria de cards.</p>
            </div>
            <span className="caderno-template-badge">Base de Dados</span>
          </div>

          {/* Página em Branco */}
          <div className="caderno-template-card is-blank" onClick={handleBlank}>
            <div className="caderno-template-card-icon">➕</div>
            <div className="caderno-template-card-info">
              <h4>Página em Branco</h4>
              <p>Comece um documento livre do zero para anotar, rascunhar ou criar novas tabelas com barra (/).</p>
            </div>
            <span className="caderno-template-badge">Básico</span>
          </div>
        </div>
      </div>
    </div>
  );
}
