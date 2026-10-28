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

type ViewMode = "split" | "code" | "guide";

export default function PromptsPage() {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
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

  // Filtragem dos prompts na lista lateral
  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.tool.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.whatItDoes.toLowerCase().includes(q) ||
        p.filename.toLowerCase().includes(q);

      const matchesCat =
        activeCategory === "all" ||
        (activeCategory === "media" && (p.category.includes("Imagem") || p.category.includes("Vídeo"))) ||
        (activeCategory === "copy" && p.category.includes("Copywriting")) ||
        (activeCategory === "design" && p.category.includes("Design"));

      return matchesSearch && matchesCat;
    });
  }, [search, activeCategory]);

  // Prompt ativo atual
  const activePrompt: PromptMetadata = useMemo(() => {
    if (filteredPrompts.length > 0) {
      const found = filteredPrompts[selectedIndex] || filteredPrompts[0];
      return found;
    }
    return prompts[0];
  }, [filteredPrompts, selectedIndex]);

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
        desc: `${p.name} · ${p.prompt.length.toLocaleString("pt-BR")} caracteres prontos para colar no ${p.tool.split("/")[0].trim()}.`,
        accent,
      });

      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedId(null), 2500);

      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 3500);
    }
  }, []);

  // Selecionar todo o texto do prompt
  const handleSelectAll = () => {
    if (codePreRef.current) {
      const range = document.createRange();
      range.selectNodeContents(codePreRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  };

  // Atalhos de teclado no ecossistema sem rolagem
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se o usuário estiver digitando em campo de texto
      if (
        e.defaultPrevented ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        (e.target instanceof Element &&
          e.target.closest("input,textarea,select,button,[contenteditable]"))
      ) {
        if (e.key === "Escape") {
          setSearch("");
          (e.target as HTMLElement)?.blur();
        }
        return;
      }

      // Teclas 1 a 5: selecionar o prompt diretamente
      const num = Number(e.key);
      if (num >= 1 && num <= 5) {
        e.preventDefault();
        const targetIndex = filteredPrompts.findIndex((p) => p.number === num);
        if (targetIndex >= 0) {
          setSelectedIndex(targetIndex);
        } else {
          // Se estiver filtrado, localiza no catálogo global
          const globalIdx = prompts.findIndex((p) => p.number === num);
          if (globalIdx >= 0) {
            setActiveCategory("all");
            setSearch("");
            setSelectedIndex(globalIdx);
          }
        }
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
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredPrompts.length));
        return;
      }
      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredPrompts.length) % Math.max(1, filteredPrompts.length));
        return;
      }

      // Tecla V: alternar modos de visualização (split -> code -> guide)
      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        setViewMode((m) => (m === "split" ? "code" : m === "code" ? "guide" : "split"));
        return;
      }

      // Tecla D: baixar o arquivo .txt completo
      if (e.key === "d" || e.key === "D") {
        const link = document.createElement("a");
        link.href = "/5-PROMPTS-OFICIAIS-LANDING-PAGES-IA.txt";
        link.download = "5-PROMPTS-OFICIAIS-LANDING-PAGES-IA.txt";
        link.click();
        return;
      }

      // Tecla A: modo aula (slides)
      if (e.key === "a" || e.key === "A") {
        location.hash = "#apresentacao";
        return;
      }

      // Tecla / : focar na busca
      if (e.key === "/") {
        e.preventDefault();
        const searchInput = document.getElementById("prompts-search-sidebar-input");
        searchInput?.focus();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePrompt, filteredPrompts, handleCopy]);

  const activeAccent = promptAccents[activePrompt.number] || "#FF701A";
  const isActiveCopied = copiedId === activePrompt.id;
  const wordCount = Math.round(activePrompt.prompt.split(/\s+/).length);
  const lineCount = activePrompt.prompt.split("\n").length;

  return (
    <div className="prompts-studio-root" style={{ "--active-accent": activeAccent } as React.CSSProperties}>
      {/* 1. TOPBAR COMPACTA FIXA (52px) */}
      <header className="prompts-studio-topbar">
        <div className="prompts-studio-topbar-left">
          <a href="/" className="prompts-studio-wordmark" title="Ir para Home">
            UM CARA<span> CARAMELO®</span>
          </a>
          <span className="prompts-studio-divider" />
          <div className="prompts-studio-badge">
            <span className="prompts-studio-dot" />
            <strong>BANCO OFICIAL DE PROMPTS</strong>
            <span className="prompts-studio-tag">5 Ferramentas Mestre</span>
          </div>
        </div>

        <div className="prompts-studio-topbar-center">
          <div className="prompts-viewport-indicator">
            <span>MODO STUDIO INTEGRADO · 0 ROLAGEM DE PÁGINA</span>
          </div>
        </div>

        <div className="prompts-studio-topbar-right">
          <a
            href="/5-PROMPTS-OFICIAIS-LANDING-PAGES-IA.txt"
            download="5-PROMPTS-OFICIAIS-LANDING-PAGES-IA.txt"
            className="prompts-studio-btn secondary"
            title="Baixar arquivo TXT com os 5 prompts completos (Atalho: D)"
          >
            <span>Baixar .txt</span>
            <kbd>D</kbd>
          </a>

          <a
            href="#apresentacao"
            className="prompts-studio-btn slides"
            title="Abrir Modo Apresentação de Slides (Atalho: A)"
          >
            <span>Modo Aula (Slides)</span>
            <kbd>A</kbd>
          </a>

          <a href="/" className="prompts-studio-btn icon-only" title="Voltar ao início">
            ✕
          </a>
        </div>
      </header>

      {/* 2. ÁREA DE TRABALHO STUDIO (100dvh - topbar - dock) */}
      <div className="prompts-studio-workspace">
        {/* COLUNA ESQUERDA: NAVEGADOR & LISTA DOS 5 PROMPTS (340px) */}
        <aside className="prompts-studio-sidebar" aria-label="Seleção de Prompts">
          {/* BARRA DE FILTRO E BUSCA */}
          <div className="prompts-sidebar-search-box">
            <div className="prompts-sidebar-search-input-wrap">
              <span className="search-icon" aria-hidden="true">
                🔍
              </span>
              <input
                id="prompts-search-sidebar-input"
                type="text"
                placeholder="Filtrar prompts... (/ para focar)"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                className="prompts-sidebar-search-input"
              />
              {search && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearch("")}
                  title="Limpar busca (Esc)"
                >
                  ✕
                </button>
              )}
            </div>

            {/* ABAS RÁPIDAS DE CATEGORIA */}
            <div className="prompts-sidebar-categories">
              {[
                { id: "all", label: "Todos", count: 5 },
                { id: "copy", label: "Copy", count: 1 },
                { id: "media", label: "Mídia", count: 3 },
                { id: "design", label: "Design", count: 1 },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`category-pill ${activeCategory === cat.id ? "active" : ""}`}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSelectedIndex(0);
                  }}
                >
                  <span>{cat.label}</span>
                  <small>{cat.count}</small>
                </button>
              ))}
            </div>
          </div>

          {/* LISTA COMPACTA DOS PROMPTS */}
          <nav className="prompts-sidebar-list" aria-label="Lista de prompts">
            {filteredPrompts.length === 0 ? (
              <div className="prompts-sidebar-empty">
                <p>Nenhum prompt encontrado.</p>
                <button
                  type="button"
                  className="reset-filters-btn"
                  onClick={() => {
                    setSearch("");
                    setActiveCategory("all");
                  }}
                >
                  Limpar busca
                </button>
              </div>
            ) : (
              filteredPrompts.map((p, index) => {
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
                      <div className="card-header-line">
                        <strong className="card-title">{p.name}</strong>
                      </div>
                      <span className="card-tool-text">{p.tool.split("/")[0].trim()}</span>
                      <span className="card-category-label">{p.category}</span>
                    </div>

                    <div className="card-actions">
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
                  </div>
                );
              })
            )}
          </nav>

          <div className="prompts-sidebar-footer">
            <span className="prompts-shortcut-hint">
              Navegar: <kbd>↑</kbd> <kbd>↓</kbd> · Pular: <kbd>1-5</kbd>
            </span>
          </div>
        </aside>

        {/* COLUNA DIREITA: CONSOLE DO PROMPT ATIVO (FILL RESTANTE) */}
        <main className="prompts-studio-stage">
          {/* HEADER DO PROMPT ATIVO: METADADOS + AÇÃO PROTAGONISTA */}
          <header className="prompts-stage-header">
            <div className="stage-header-title-block">
              <div className="stage-badges-row">
                <span className="stage-num-pill" style={{ background: activeAccent }}>
                  PROMPT 0{activePrompt.number}
                </span>
                <span className="stage-tool-pill">🛠 {activePrompt.tool}</span>
                <span className="stage-cat-pill">{activePrompt.category}</span>
                <span className="stage-stats-pill">
                  {activePrompt.prompt.length.toLocaleString("pt-BR")} caracteres · {wordCount.toLocaleString("pt-BR")} palavras
                </span>
              </div>
              <h1 className="stage-main-title">{activePrompt.title}</h1>
            </div>

            <div className="stage-header-actions-block">
              {/* SELETOR DE MODO DE VISUALIZAÇÃO */}
              <div className="stage-view-switcher" role="group" aria-label="Modo de visualização">
                <button
                  type="button"
                  className={`view-btn ${viewMode === "split" ? "active" : ""}`}
                  onClick={() => setViewMode("split")}
                  title="Modo Dividido: Guia + Texto"
                >
                  ⚡ Dividido
                </button>
                <button
                  type="button"
                  className={`view-btn ${viewMode === "code" ? "active" : ""}`}
                  onClick={() => setViewMode("code")}
                  title="Modo Foco no Texto Integral"
                >
                  📄 Texto
                </button>
                <button
                  type="button"
                  className={`view-btn ${viewMode === "guide" ? "active" : ""}`}
                  onClick={() => setViewMode("guide")}
                  title="Modo Ficha Técnica e Diretrizes"
                >
                  💡 Guia
                </button>
              </div>

              {/* MEGA BOTÃO DE CÓPIA PROTAGONISTA */}
              <button
                type="button"
                className={`stage-mega-copy-btn ${isActiveCopied ? "copied" : ""}`}
                onClick={() => handleCopy(activePrompt)}
                title="Copiar prompt integral para a área de transferência (Atalho: C)"
              >
                <span className="mega-copy-icon" aria-hidden="true">
                  {isActiveCopied ? "✓" : "📋"}
                </span>
                <div className="mega-copy-text">
                  <strong>{isActiveCopied ? "COPIADO COM SUCESSO!" : `COPIAR PROMPT 0${activePrompt.number}`}</strong>
                  <small>{isActiveCopied ? "Pronto para colar na IA" : "Atalho rápido: pressione [C]"}</small>
                </div>
              </button>
            </div>
          </header>

          {/* CORPO DO CONSOLE: FICHA TÉCNICA + VISUALIZADOR DE CÓDIGO */}
          <div className={`prompts-stage-body-layout mode-${viewMode}`}>
            {/* PAINEL DO GUIA TÉCNICO (VISÍVEL EM 'SPLIT' E 'GUIDE') */}
            {(viewMode === "split" || viewMode === "guide") && (
              <section className="prompts-inspector-pane" aria-label="Ficha Técnica do Prompt">
                <div className="inspector-inner-scroll">
                  <div className="inspector-section-title">
                    <span>FICHA TÉCNICA & ORIENTAÇÃO PEDAGÓGICA</span>
                  </div>

                  <div className="inspector-card what-it-does">
                    <small className="card-label">O QUE ESTE PROMPT FAZ</small>
                    <p>{activePrompt.whatItDoes}</p>
                  </div>

                  <div className="inspector-card when-to-use">
                    <small className="card-label">QUANDO USAR NO PROJETO</small>
                    <p>{activePrompt.whenToUse}</p>
                  </div>

                  <div className="inspector-card inputs">
                    <small className="card-label">O QUE VOCÊ PRECISA FORNECER</small>
                    <p>{activePrompt.inputs}</p>
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
            )}

            {/* PAINEL DO TEXTO INTEGRAL DO PROMPT (VISÍVEL EM 'SPLIT' E 'CODE') */}
            {(viewMode === "split" || viewMode === "code") && (
              <section className="prompts-editor-pane" aria-label="Texto Integral do Prompt">
                {/* TOOLBAR DO EDITOR */}
                <div className="editor-top-bar">
                  <div className="editor-file-info">
                    <span className="file-icon" aria-hidden="true">
                      📄
                    </span>
                    <strong>{activePrompt.filename}</strong>
                    <span className="line-count-tag">{lineCount.toLocaleString("pt-BR")} linhas</span>
                  </div>

                  <div className="editor-quick-tools">
                    <button
                      type="button"
                      className="editor-tool-btn"
                      onClick={handleSelectAll}
                      title="Selecionar todo o texto para copiar trecho específico"
                    >
                      Selecionar Tudo
                    </button>

                    <button
                      type="button"
                      className={`editor-tool-btn copy-btn ${isActiveCopied ? "copied" : ""}`}
                      onClick={() => handleCopy(activePrompt)}
                    >
                      {isActiveCopied ? "✓ Copiado" : "Copiar Texto"}
                    </button>
                  </div>
                </div>

                {/* ÁREA DE LEITURA MONOSPACE COM SCROLL INTERNO RESTRITO */}
                <div className="editor-code-container">
                  <pre ref={codePreRef} className="editor-code-text" tabIndex={0}>
                    {activePrompt.prompt}
                  </pre>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      {/* 3. DOCK DE STATUS & ATALHOS INFERIOR (32px) */}
      <footer className="prompts-studio-dock">
        <div className="dock-left">
          <span className="dock-lead">ATALHOS DO STUDIO:</span>
          <span className="dock-pill">
            <kbd>1-5</kbd> Alternar Prompt
          </span>
          <span className="dock-pill">
            <kbd>C</kbd> Copiar Ativo
          </span>
          <span className="dock-pill">
            <kbd>↑</kbd> <kbd>↓</kbd> Navegar
          </span>
          <span className="dock-pill">
            <kbd>V</kbd> Alternar Visão
          </span>
          <span className="dock-pill">
            <kbd>D</kbd> Baixar .txt
          </span>
          <span className="dock-pill">
            <kbd>A</kbd> Modo Aula
          </span>
        </div>

        <div className="dock-right">
          <span className="dock-active-status">
            Ativo: <strong>Prompt 0{activePrompt.number} ({activePrompt.name})</strong> · 100% pronto para uso
          </span>
        </div>
      </footer>

      {/* 4. TOAST FLUTUANTE DE FEEDBACK HÁPTICO */}
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
