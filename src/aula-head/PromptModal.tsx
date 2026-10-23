import { useState } from "react";
import { prompts, type PromptMetadata } from "./data";
import { Copy, Modal } from "./ui";

interface PromptModalProps {
  initialIndex?: number;
  onClose: () => void;
}

export function PromptModal({ initialIndex = 0, onClose }: PromptModalProps) {
  const [selected, setSelected] = useState(
    Math.min(prompts.length - 1, Math.max(0, initialIndex))
  );
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  const prompt: PromptMetadata = prompts[selected];

  return (
    <Modal title="Os oito prompts profissionais" close={onClose} wide>
      <div className="prompt-library-layout">
        <nav className="prompt-sidebar" aria-label="Navegar pelos 8 prompts">
          <div className="prompt-sidebar-header">
            <span>BIBLIOTECA OFICIAL</span>
            <small>8 ferramentas em ordem didática</small>
          </div>
          {prompts.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={`prompt-nav-item ${selected === i ? "selected" : ""}`}
              onClick={() => {
                setSelected(i);
                setShowFullPrompt(false);
              }}
              aria-pressed={selected === i}
            >
              <span className="prompt-nav-num">0{p.number}</span>
              <div className="prompt-nav-info">
                <strong>{p.name}</strong>
                <small>{p.tool.split("/")[0].trim()}</small>
              </div>
            </button>
          ))}
        </nav>

        <section className="prompt-detail-panel" aria-live="polite">
          <header className="prompt-detail-header">
            <div className="prompt-badge-row">
              <span className="prompt-badge">PROMPT 0{prompt.number}</span>
              <span className="prompt-tool-tag">🛠 {prompt.tool}</span>
              <span className="prompt-file-tag">Arquivo: {prompt.filename}</span>
            </div>
            <h2>{prompt.title}</h2>
          </header>

          <div className="prompt-cards-grid">
            <div className="prompt-info-block what-it-does">
              <small>O QUE FAZ</small>
              <p>{prompt.whatItDoes}</p>
            </div>

            <div className="prompt-info-block when-to-use">
              <small>QUANDO USAR</small>
              <p>{prompt.whenToUse}</p>
            </div>

            <div className="prompt-info-block inputs">
              <small>O QUE PRECISO FORNECER</small>
              <p>{prompt.inputs}</p>
            </div>

            <div className="prompt-info-block outputs">
              <small>O QUE VOU RECEBER</small>
              <p>{prompt.outputs}</p>
            </div>
          </div>

          <div className="prompt-customization-callout">
            <small className="tip-badge">COMO PERSONALIZAR PARA SEU NEGÓCIO</small>
            <p>{prompt.customizationTip}</p>
          </div>

          <div className="prompt-actions-bar">
            <button
              type="button"
              className="button"
              onClick={() => setShowFullPrompt((v) => !v)}
            >
              {showFullPrompt ? "Ocultar texto completo" : "Ver prompt completo"} ↗
            </button>
            <Copy text={prompt.prompt} label="Copiar prompt integral" />
            <a
              href="/8-PROMPTS-OFICIAIS-LANDING-PAGES-IA.txt"
              download="8-PROMPTS-OFICIAIS-LANDING-PAGES-IA.txt"
              className="button"
              title="Baixar arquivo TXT com todos os 8 prompts completos"
            >
              Baixar os 8 (.txt) ↓
            </a>
          </div>

          {showFullPrompt && (
            <div className="prompt-code-container">
              <div className="code-header">
                <span>TEXTO INTEGRAL PRESERVADO ({prompt.prompt.length} caracteres)</span>
                <Copy text={prompt.prompt} label="Copiar texto" />
              </div>
              <pre className="prompt-full-code" tabIndex={0}>
                {prompt.prompt}
              </pre>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
