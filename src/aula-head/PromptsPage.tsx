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
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ title: string; desc: string } | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Limpeza de timers ao desmontar
  useEffect(() => {
    return () => {
      clearTimeout(toastTimer.current);
      clearTimeout(copyTimer.current);
    };
  }, []);

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
      // Fallback seguro usando elemento textarea temporário
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
      setCopiedId(p.id);
      setToast({
        title: `Prompt 0${p.number} Copiado com Sucesso! ✓`,
        desc: `${p.name} · ${p.prompt.length.toLocaleString("pt-BR")} caracteres prontos para colar no ${p.tool.split("/")[0].trim()}.`,
      });

      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedId(null), 3000);

      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 4000);
    }
  }, []);

  // Alternar visualização do texto integral de um card
  const togglePreview = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Rolar suavemente até o card desejado
  const scrollToPrompt = (num: number) => {
    const el = document.getElementById(`prompt-card-${num}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.transform = "scale(1.01)";
      setTimeout(() => {
        el.style.transform = "";
      }, 300);
    }
  };

  // Atalhos de teclado: pressionar 1 a 8 copia o prompt correspondente
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

      const num = Number(e.key);
      if (num >= 1 && num <= 5) {
        e.preventDefault();
        const target = prompts.find((p) => p.number === num);
        if (target) {
          handleCopy(target);
          scrollToPrompt(num);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCopy]);

  // Filtro de prompts por texto e categoria
  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      const query = search.toLowerCase().trim();
      const matchesSearch =
        !query ||
        p.title.toLowerCase().includes(query) ||
        p.name.toLowerCase().includes(query) ||
        p.tool.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.whatItDoes.toLowerCase().includes(query) ||
        p.filename.toLowerCase().includes(query);

      const matchesCat =
        activeCategory === "all" ||
        (activeCategory === "media" && (p.category.includes("Imagem") || p.category.includes("Vídeo"))) ||
        (activeCategory === "copy" && p.category.includes("Copywriting")) ||
        (activeCategory === "design" && p.category.includes("Design"));

      return matchesSearch && matchesCat;
    });
  }, [search, activeCategory]);

  return (
    <div className="prompts-page-root">
      {/* TOPBAR FIXA */}
      <header className="prompts-topbar">
        <div className="prompts-topbar-inner">
          <div className="prompts-brand-group">
            <a href="/" className="prompts-wordmark">
              UM CARA
              <br />
              CARAMELO<span>®</span>
            </a>
            <div className="prompts-brand-divider" />
            <div className="prompts-badge-title">
              <strong>Banco Oficial de Prompts</strong>
              <span>Head Academy × Laboratório de Interação</span>
            </div>
          </div>

          <div className="prompts-topbar-actions">
            <a
              href="/5-PROMPTS-OFICIAIS-LANDING-PAGES-IA.txt"
              download="5-PROMPTS-OFICIAIS-LANDING-PAGES-IA.txt"
              className="prompts-download-btn"
              title="Baixar arquivo de texto completo com os 5 prompts"
            >
              <span>Baixar Todos (.txt)</span>
              <span aria-hidden="true">↓</span>
            </a>
            <a href="/" className="prompts-home-link">
              ← Início
            </a>
          </div>
        </div>
      </header>

      {/* HERO DA PÁGINA */}
      <section className="prompts-hero">
        <div className="prompts-hero-badge">
          <span className="prompts-hero-dot" />
          <span>5 Prompts Oficiais · Landing Pages com IA</span>
        </div>
        <h1>COPIAR PROMPTS DO TREINAMENTO</h1>
        <p className="prompts-hero-lead">
          Acesse cada um dos 5 prompts essenciais separadamente. Clique no botão de cópia de qualquer prompt
          para enviá-lo instantaneamente à área de transferência, pronto para colar no Claude, ChatGPT,
          Midjourney, Flux ou Kling AI.
        </p>

        {/* BARRA DE CONTROLE: PESQUISA, ATALHOS E FILTROS */}
        <div className="prompts-controls-bar">
          <div className="prompts-search-row">
            <div className="prompts-search-box">
              <span className="prompts-search-icon" aria-hidden="true">
                🔍
              </span>
              <input
                type="text"
                placeholder="Pesquisar por nome, ferramenta, categoria ou palavra-chave..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="prompts-search-input"
                aria-label="Pesquisar prompts"
              />
            </div>

            <div className="prompts-quick-jumps">
              <span className="prompts-quick-jumps-label">Ir direto:</span>
              {prompts.map((p) => {
                const accent = promptAccents[p.number] || "#FF701A";
                return (
                  <button
                    key={p.number}
                    className="prompts-jump-pill"
                    style={{ "--pill-color": accent } as React.CSSProperties}
                    onClick={() => scrollToPrompt(p.number)}
                    title={`Pular para o Prompt 0${p.number}: ${p.name}`}
                  >
                    0{p.number}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="prompts-filter-row">
            {[
              { id: "all", label: "Todos", count: 5 },
              { id: "copy", label: "Copywriting", count: 1 },
              { id: "media", label: "Imagens & Vídeo", count: 3 },
              { id: "design", label: "Design System", count: 1 },
            ].map((cat) => (
              <button
                key={cat.id}
                className={`prompts-category-btn ${activeCategory === cat.id ? "active" : ""}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                <span>{cat.label}</span>
                <span className="prompts-category-count">({cat.count})</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* LISTA DE PROMPTS */}
      <main className="prompts-container">
        {filteredPrompts.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              background: "#161822",
              borderRadius: "14px",
              border: "1px dashed rgba(255,255,255,0.15)",
            }}
          >
            <p style={{ color: "rgba(255,255,255,0.7)", margin: "0 0 12px" }}>
              Nenhum prompt encontrado para o termo pesquisado.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setActiveCategory("all");
              }}
              className="prompts-download-btn"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          filteredPrompts.map((p) => {
            const accent = promptAccents[p.number] || "#FF701A";
            const isCopied = copiedId === p.id;
            const isExpanded = Boolean(expanded[p.id]);
            const wordCount = Math.round(p.prompt.split(/\s+/).length);

            return (
              <article
                key={p.id}
                id={`prompt-card-${p.number}`}
                className="prompt-card"
                style={{ "--prompt-accent": accent } as React.CSSProperties}
              >
                {/* CABEÇALHO DO CARD: IDENTIFICAÇÃO + BOTÃO DE CÓPIA PROTAGONISTA */}
                <div className="prompt-card-header">
                  <div className="prompt-card-title-group">
                    <div className="prompt-card-eyebrow">
                      <span className="prompt-card-num-badge">PROMPT 0{p.number}</span>
                      <span className="prompt-card-tool-tag">🛠 {p.tool}</span>
                      <span className="prompt-card-chars-tag">
                        {p.prompt.length.toLocaleString("pt-BR")} caracteres · ~{wordCount} palavras
                      </span>
                    </div>
                    <h2>{p.title}</h2>
                  </div>

                  <button
                    type="button"
                    className={`prompt-copy-btn-primary ${isCopied ? "copied" : ""}`}
                    onClick={() => handleCopy(p)}
                    aria-label={`Copiar Prompt 0${p.number}: ${p.title}`}
                  >
                    <span aria-hidden="true">{isCopied ? "✓" : "📋"}</span>
                    <span>{isCopied ? "Copiado com Sucesso!" : `Copiar Prompt 0${p.number}`}</span>
                  </button>
                </div>

                {/* METADADOS EDUCATIVOS */}
                <div className="prompt-card-metadata-grid">
                  <div className="prompt-meta-item">
                    <small>O Que Faz</small>
                    <p>{p.whatItDoes}</p>
                  </div>
                  <div className="prompt-meta-item">
                    <small>Quando Usar</small>
                    <p>{p.whenToUse}</p>
                  </div>
                  <div className="prompt-meta-item">
                    <small>O Que Você Precisa Fornecer</small>
                    <p>{p.inputs}</p>
                  </div>
                  <div className="prompt-meta-item">
                    <small>O Que Você Vai Receber</small>
                    <p>{p.outputs}</p>
                  </div>
                </div>

                {/* DICA DE PERSONALIZAÇÃO */}
                <div className="prompt-card-tip">
                  <strong>💡 Dica do Caramelo:</strong>
                  <span>{p.customizationTip}</span>
                </div>

                {/* RODAPÉ DO CARD: ALTERNADOR DE PRÉVIA */}
                <div className="prompt-card-footer">
                  <button
                    type="button"
                    className="prompt-toggle-preview-btn"
                    onClick={() => togglePreview(p.id)}
                  >
                    <span>{isExpanded ? "▴ Ocultar texto integral" : "▾ Ver texto integral do prompt"}</span>
                  </button>

                  <button
                    type="button"
                    className="prompt-quick-copy-text-btn"
                    onClick={() => handleCopy(p)}
                  >
                    {isCopied ? "✓ Copiado!" : "Copiar novamente"}
                  </button>
                </div>

                {/* TEXTO INTEGRAL PRESERVADO (COLAPSÁVEL) */}
                {isExpanded && (
                  <div className="prompt-full-preview-box">
                    <div className="prompt-preview-header">
                      <span>TEXTO INTEGRAL PRESERVADO · {p.filename}</span>
                      <button
                        type="button"
                        className="prompt-quick-copy-text-btn"
                        onClick={() => handleCopy(p)}
                      >
                        {isCopied ? "✓ Copiado!" : "Copiar texto"}
                      </button>
                    </div>
                    <pre className="prompt-preview-text" tabIndex={0}>
                      {p.prompt}
                    </pre>
                  </div>
                )}
              </article>
            );
          })
        )}
      </main>

      {/* TOAST DE FEEDBACK FLUTUANTE */}
      {toast && (
        <div className="prompt-toast" role="status" aria-live="polite">
          <div className="prompt-toast-icon" aria-hidden="true">
            ✓
          </div>
          <div className="prompt-toast-copy">
            <strong>{toast.title}</strong>
            <p>{toast.desc}</p>
          </div>
        </div>
      )}
    </div>
  );
}
