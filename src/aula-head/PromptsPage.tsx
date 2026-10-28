import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { prompts, type PromptMetadata } from "./data";
import "./prompts-page.css";

const promptAccents: Record<number, string> = {
  1: "#FF701A", // Caramel Orange - Copy de LP
  2: "#25BFFF", // Electric Sky - Reconstrução de Imagem
  3: "#7657FF", // Electric Violet - Model Sheet 4×4 de Identidade Facial
  4: "#FF3D8D", // Hot Pink - Image to Video
  5: "#FFD52A", // Acid Yellow - Moodboard & Design System
};

export default function PromptsPage() {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ title: string; desc: string; accent?: string } | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const codePreRef = useRef<HTMLPreElement | null>(null);

  // Limpeza de timers ao desmontar
  useEffect(() => {
    return () => {
      clearTimeout(toastTimer.current);
      clearTimeout(copyTimer.current);
    };
  }, []);

  // Prompt ativo atual
  const activePrompt: PromptMetadata = useMemo(() => {
    return prompts[selectedIndex] || prompts[0];
  }, [selectedIndex]);

  // Função mestre de cópia com alta confiabilidade e fallback
  const handleCopy = useCallback(async (p: PromptMetadata) => {
    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(p.prompt);
        success = true;
      } else {
        throw new Error("Clipboard API indisponível");
      }
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = p.prompt;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch (err) {
        console.error("Falha ao copiar:", err);
      }
    }

    if (success) {
      const accent = promptAccents[p.number] || "#FF701A";
      setCopiedId(p.id);
      setToast({
        title: `Prompt 0${p.number} Copiado com Sucesso! ✓`,
        desc: `${p.name} pronto para colar na sua ferramenta de IA.`,
        accent,
      });

      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedId(null), 2500);

      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 3500);
    }
  }, []);

  // Atalhos de teclado silenciosos (1-5 para trocar, C para copiar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        (e.target instanceof Element &&
          e.target.closest("input,textarea,select,button,[contenteditable]"))
      ) {
        return;
      }

      // Teclas 1 a 5: selecionar o prompt diretamente
      const num = Number(e.key);
      if (num >= 1 && num <= 5) {
        e.preventDefault();
        setSelectedIndex(num - 1);
        return;
      }

      // Tecla C: copiar o prompt ativo imediatamente
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        if (activePrompt) {
          handleCopy(activePrompt);
        }
        return;
      }

      // Teclas de navegação: Seta Cima/Baixo ou J/K
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % prompts.length);
        return;
      }
      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + prompts.length) % prompts.length);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePrompt, handleCopy]);

  const activeAccent = promptAccents[activePrompt.number] || "#FF701A";
  const isActiveCopied = copiedId === activePrompt.id;
  const lineCount = activePrompt.prompt.split("\n").length;

  return (
    <div className="prompts-studio-root" style={{ "--active-accent": activeAccent } as React.CSSProperties}>
      {/* 1. TOPBAR LIMPA E DIRETA */}
      <header className="prompts-studio-topbar">
        <div className="prompts-studio-topbar-left">
          <a href="/" className="prompts-studio-wordmark" title="Ir para Home">
            UM CARA<span> CARAMELO®</span>
          </a>
        </div>
      </header>

      {/* 2. ÁREA DE TRABALHO STUDIO (100dvh - topbar) */}
      <div className="prompts-studio-workspace">
        {/* COLUNA ESQUERDA: LISTA DOS 5 PROMPTS */}
        <aside className="prompts-studio-sidebar" aria-label="Seleção de Prompts">
          <nav className="prompts-sidebar-list" aria-label="Lista de prompts">
            {prompts.map((p, index) => {
              const isSelected = activePrompt.id === p.id;
              const accent = promptAccents[p.number] || "#FF701A";
              const isItemCopied = copiedId === p.id;

              return (
                <div
                  key={p.id}
                  className={`prompts-sidebar-card ${isSelected ? "selected" : ""}`}
                  style={{ "--card-accent": accent } as React.CSSProperties}
                  onClick={() => setSelectedIndex(index)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedIndex(index);
                    }
                  }}
                >
                  <div className="card-left-accent" />

                  <div className="card-num-badge">
                    <span>0{p.number}</span>
                  </div>

                  <div className="card-main-info">
                    <strong className="card-title">{p.name}</strong>
                    <span className="card-tool-text">{p.tool.split("/")[0].trim()}</span>
                    <span className="card-category-label">{p.category}</span>
                  </div>

                  <button
                    type="button"
                    className={`card-quick-copy-btn ${isItemCopied ? "copied" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(p);
                    }}
                    title={`Copiar Prompt 0${p.number}`}
                    aria-label={`Copiar Prompt 0${p.number}`}
                  >
                    {isItemCopied ? "✓" : "📋"}
                  </button>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* COLUNA DIREITA: CONSOLE DO PROMPT ATIVO */}
        <main className="prompts-studio-stage">
          {/* HEADER DO PROMPT ATIVO: APENAS O TÍTULO E O BOTÃO DE CÓPIA */}
          <header className="prompts-stage-header">
            <div className="stage-header-title-block">
              <h1 className="stage-main-title">{activePrompt.title}</h1>
            </div>

            <div className="stage-header-actions-block">
              <button
                type="button"
                className={`stage-mega-copy-btn ${isActiveCopied ? "copied" : ""}`}
                onClick={() => handleCopy(activePrompt)}
                title={`Copiar Prompt 0${activePrompt.number}`}
              >
                <span className="mega-copy-icon" aria-hidden="true">
                  {isActiveCopied ? "✓" : "📋"}
                </span>
                <strong>{isActiveCopied ? "COPIADO COM SUCESSO!" : `COPIAR PROMPT 0${activePrompt.number}`}</strong>
              </button>
            </div>
          </header>

          {/* CORPO DO CONSOLE: FICHA TÉCNICA + VISUALIZADOR DE CÓDIGO */}
          <div className="prompts-stage-body-layout">
            {/* PAINEL DO GUIA TÉCNICO */}
            <section className="prompts-inspector-pane" aria-label="Ficha Técnica do Prompt">
              <div className="inspector-inner-scroll">
                <div className="inspector-section-title">
                  <span>FICHA TÉCNICA & ORIENTAÇÃO PEDAGÓGICA</span>
                </div>

                <div className="inspector-card what-it-does">
                  <small className="card-label">O QUE ESTE PROMPT FAZ</small>
                  <p>{activePrompt.whatItDoes}</p>
                </div>

                <div className="inspector-card outputs">
                  <small className="card-label">O QUE VOCÊ VAI RECEBER</small>
                  <p>{activePrompt.outputs}</p>
                </div>

                <div className="inspector-tip-callout">
                  <div className="tip-header">
                    <span className="tip-badge">💡 DICA OFICIAL DO CARAMELO</span>
                  </div>
                  <p>{activePrompt.customizationTip}</p>
                </div>
              </div>
            </section>

            {/* PAINEL DO TEXTO INTEGRAL DO PROMPT */}
            <section className="prompts-editor-pane" aria-label="Texto Integral do Prompt">
              {/* TOOLBAR DO EDITOR LIMPA */}
              <div className="editor-top-bar">
                <div className="editor-file-info">
                  <span className="file-icon" aria-hidden="true">
                    📄
                  </span>
                  <strong>{activePrompt.filename}</strong>
                  <span className="line-count-tag">{lineCount.toLocaleString("pt-BR")} linhas</span>
                </div>
              </div>

              {/* ÁREA DE LEITURA MONOSPACE COM SCROLL INTERNO CONTROLADO */}
              <div className="editor-code-container">
                <pre ref={codePreRef} className="editor-code-text" tabIndex={0}>
                  {activePrompt.prompt}
                </pre>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* TOAST FLUTUANTE DE FEEDBACK HÁPTICO */}
      {toast && (
        <aside
          className="studio-toast"
          style={{ "--toast-accent": toast.accent || "#10B981" } as React.CSSProperties}
          role="status"
          aria-live="polite"
        >
          <div className="studio-toast-icon" aria-hidden="true">
            ✓
          </div>
          <div className="studio-toast-body">
            <strong>{toast.title}</strong>
            <p>{toast.desc}</p>
          </div>
        </aside>
      )}
    </div>
  );
}
