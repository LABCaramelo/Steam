import { useState, useRef, useEffect, type ChangeEvent, type KeyboardEvent } from "react";
import type { Block, BlockType } from "../types";

interface BlockItemProps {
  block: Block;
  index: number;
  totalBlocks: number;
  onUpdate: (updated: Block) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onAddBelow: (id: string, type?: BlockType) => void;
  onOpenSlash: (blockId: string, rect: DOMRect) => void;
  autoFocus?: boolean;
}

const CALLOUT_THEMES: Record<string, { border: string; bg: string; defaultIcon: string; label: string }> = {
  idea: { border: "#FF701A", bg: "rgba(255, 112, 26, 0.08)", defaultIcon: "💡", label: "Ideia" },
  focus: { border: "#25BFFF", bg: "rgba(37, 191, 255, 0.08)", defaultIcon: "🎯", label: "Foco" },
  warning: { border: "#FFD52A", bg: "rgba(255, 213, 42, 0.08)", defaultIcon: "⚠️", label: "Atenção" },
  coffee: { border: "#FF3D8D", bg: "rgba(255, 61, 141, 0.08)", defaultIcon: "☕", label: "Bastidor" },
  note: { border: "#7657FF", bg: "rgba(118, 87, 255, 0.08)", defaultIcon: "📌", label: "Nota" },
  insight: { border: "#2ECC71", bg: "rgba(46, 204, 113, 0.08)", defaultIcon: "⚡", label: "Insight" },
};

const CODE_LANGUAGES = [
  "typescript",
  "javascript",
  "json",
  "python",
  "html",
  "css",
  "sql",
  "bash",
  "markdown",
];

export function BlockItem({
  block,
  index,
  totalBlocks,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBelow,
  onOpenSlash,
  autoFocus,
}: BlockItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea to fit content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(28, textareaRef.current.scrollHeight)}px`;
    }
  }, [block.content]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Fechar menu de opções ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onUpdate({ ...block, content: val });

    // Detecta "/" para abrir o Slash Menu
    if (val.endsWith("/")) {
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        onOpenSlash(block.id, rect);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // Enter cria um bloco abaixo (exceto em blocos de código que aceitam quebra de linha)
      if (block.type !== "code") {
        e.preventDefault();
        onAddBelow(block.id, block.type === "todo" ? "todo" : block.type === "bulleted_list" ? "bulleted_list" : block.type === "numbered_list" ? "numbered_list" : "paragraph");
      }
    } else if (e.key === "Backspace" && block.content === "") {
      // Backspace em bloco vazio converte em parágrafo ou deleta
      if (block.type !== "paragraph") {
        e.preventDefault();
        onUpdate({ ...block, type: "paragraph" });
      } else if (totalBlocks > 1) {
        e.preventDefault();
        onDelete(block.id);
      }
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(block.content);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Funções de manipulação de tabela inline
  const updateTableCell = (rIdx: number, cIdx: number, value: string) => {
    if (!block.tableData) return;
    const nextRows = block.tableData.rows.map((r, ri) =>
      ri === rIdx ? r.map((c, ci) => (ci === cIdx ? value : c)) : r
    );
    onUpdate({ ...block, tableData: { ...block.tableData, rows: nextRows } });
  };

  const updateTableHeader = (cIdx: number, value: string) => {
    if (!block.tableData) return;
    const nextHeaders = block.tableData.headers.map((h, ci) => (ci === cIdx ? value : h));
    onUpdate({ ...block, tableData: { ...block.tableData, headers: nextHeaders } });
  };

  const addTableRow = () => {
    if (!block.tableData) return;
    const emptyRow = block.tableData.headers.map(() => "");
    onUpdate({
      ...block,
      tableData: { ...block.tableData, rows: [...block.tableData.rows, emptyRow] },
    });
  };

  const addTableCol = () => {
    if (!block.tableData) return;
    const nextHeaders = [...block.tableData.headers, `Coluna ${block.tableData.headers.length + 1}`];
    const nextRows = block.tableData.rows.map((r) => [...r, ""]);
    onUpdate({
      ...block,
      tableData: { headers: nextHeaders, rows: nextRows },
    });
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case "heading_1":
        return (
          <div className="caderno-block-h1">
            <textarea
              ref={textareaRef}
              rows={1}
              value={block.content}
              placeholder="TÍTULO 1..."
              onChange={handleChange}
              onKeyDown={handleKeyDown}
            />
          </div>
        );

      case "heading_2":
        return (
          <div className="caderno-block-h2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={block.content}
              placeholder="Título 2..."
              onChange={handleChange}
              onKeyDown={handleKeyDown}
            />
          </div>
        );

      case "heading_3":
        return (
          <div className="caderno-block-h3">
            <textarea
              ref={textareaRef}
              rows={1}
              value={block.content}
              placeholder="Título 3..."
              onChange={handleChange}
              onKeyDown={handleKeyDown}
            />
          </div>
        );

      case "todo":
        return (
          <div className={`caderno-block-todo ${block.checked ? "is-checked" : ""}`}>
            <button
              type="button"
              className="caderno-checkbox-btn"
              onClick={() => onUpdate({ ...block, checked: !block.checked })}
              aria-label={block.checked ? "Desmarcar tarefa" : "Marcar tarefa"}
            >
              <span className={`caderno-checkbox-box ${block.checked ? "is-checked" : ""}`}>
                {block.checked && "✓"}
              </span>
            </button>
            <textarea
              ref={textareaRef}
              rows={1}
              value={block.content}
              placeholder="Para fazer..."
              onChange={handleChange}
              onKeyDown={handleKeyDown}
            />
          </div>
        );

      case "bulleted_list":
        return (
          <div className="caderno-block-bullet">
            <span className="caderno-bullet-bullet">•</span>
            <textarea
              ref={textareaRef}
              rows={1}
              value={block.content}
              placeholder="Item da lista..."
              onChange={handleChange}
              onKeyDown={handleKeyDown}
            />
          </div>
        );

      case "numbered_list":
        return (
          <div className="caderno-block-numbered">
            <span className="caderno-numbered-num">{index + 1}.</span>
            <textarea
              ref={textareaRef}
              rows={1}
              value={block.content}
              placeholder="Passo numerado..."
              onChange={handleChange}
              onKeyDown={handleKeyDown}
            />
          </div>
        );

      case "quote":
        return (
          <div className="caderno-block-quote">
            <div className="caderno-quote-bar" />
            <textarea
              ref={textareaRef}
              rows={1}
              value={block.content}
              placeholder="Citação ou tese central..."
              onChange={handleChange}
              onKeyDown={handleKeyDown}
            />
          </div>
        );

      case "callout": {
        const theme = CALLOUT_THEMES[block.calloutType || "idea"] || CALLOUT_THEMES.idea;
        return (
          <div
            className="caderno-block-callout"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.bg,
            }}
          >
            <div className="caderno-callout-icon-bar">
              <span className="caderno-callout-icon">{block.calloutIcon || theme.defaultIcon}</span>
              <select
                className="caderno-callout-type-select"
                value={block.calloutType || "idea"}
                onChange={(e) => {
                  const newType = e.target.value as any;
                  const newTheme = CALLOUT_THEMES[newType] || CALLOUT_THEMES.idea;
                  onUpdate({ ...block, calloutType: newType, calloutIcon: newTheme.defaultIcon });
                }}
              >
                {Object.entries(CALLOUT_THEMES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.defaultIcon} {v.label}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              ref={textareaRef}
              rows={1}
              value={block.content}
              placeholder="Escreva uma nota de destaque..."
              onChange={handleChange}
              onKeyDown={handleKeyDown}
            />
          </div>
        );
      }

      case "toggle":
        return (
          <div className="caderno-block-toggle">
            <div className="caderno-toggle-header">
              <button
                type="button"
                className={`caderno-toggle-btn ${block.expanded ? "is-expanded" : ""}`}
                onClick={() => onUpdate({ ...block, expanded: !block.expanded })}
              >
                ▶
              </button>
              <textarea
                ref={textareaRef}
                rows={1}
                value={block.content}
                placeholder="Título do bloco retrátil..."
                onChange={handleChange}
                onKeyDown={handleKeyDown}
              />
            </div>
            {block.expanded && (
              <div className="caderno-toggle-content">
                <textarea
                  rows={2}
                  className="caderno-toggle-inner-text"
                  value={block.childrenBlocks?.[0]?.content || ""}
                  placeholder="Conteúdo recolhido ou detalhes ocultos..."
                  onChange={(e) => {
                    const children = [{ id: `c-${block.id}`, type: "paragraph" as const, content: e.target.value }];
                    onUpdate({ ...block, childrenBlocks: children });
                  }}
                />
              </div>
            )}
          </div>
        );

      case "code":
        return (
          <div className="caderno-block-code">
            <div className="caderno-code-header">
              <select
                className="caderno-code-lang"
                value={block.language || "typescript"}
                onChange={(e) => onUpdate({ ...block, language: e.target.value })}
              >
                {CODE_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
              <button type="button" className="caderno-code-copy" onClick={copyCode}>
                {copiedCode ? "Copiado! ✓" : "Copiar"}
              </button>
            </div>
            <textarea
              ref={textareaRef}
              rows={3}
              className="caderno-code-area"
              value={block.content}
              placeholder="// Insira seu código aqui..."
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const target = e.currentTarget;
                  const start = target.selectionStart;
                  const end = target.selectionEnd;
                  const val = target.value;
                  const nextVal = val.substring(0, start) + "  " + val.substring(end);
                  onUpdate({ ...block, content: nextVal });
                }
              }}
            />
          </div>
        );

      case "divider":
        return (
          <div className="caderno-block-divider">
            <hr />
          </div>
        );

      case "table": {
        const table = block.tableData || {
          headers: ["Coluna 1", "Coluna 2", "Coluna 3"],
          rows: [
            ["", "", ""],
            ["", "", ""],
          ],
        };
        return (
          <div className="caderno-block-table-wrapper">
            <table className="caderno-table">
              <thead>
                <tr>
                  {table.headers.map((h, ci) => (
                    <th key={ci}>
                      <input
                        type="text"
                        value={h}
                        onChange={(e) => updateTableHeader(ci, e.target.value)}
                        placeholder={`Cabeçalho ${ci + 1}`}
                      />
                    </th>
                  ))}
                  <th className="caderno-table-action-col">
                    <button type="button" className="caderno-tbl-add-btn" onClick={addTableCol} title="Adicionar Coluna">
                      +
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, ri) => (
                  <tr key={ri}>
                    {r.map((cell, ci) => (
                      <td key={ci}>
                        <input
                          type="text"
                          value={cell}
                          onChange={(e) => updateTableCell(ri, ci, e.target.value)}
                          placeholder="..."
                        />
                      </td>
                    ))}
                    <td className="caderno-table-action-col"></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="caderno-tbl-add-row" onClick={addTableRow}>
              + Nova Linha
            </button>
          </div>
        );
      }

      case "paragraph":
      default:
        return (
          <div className="caderno-block-paragraph">
            <textarea
              ref={textareaRef}
              rows={1}
              value={block.content}
              placeholder="Digite '/' para comandos rápidos..."
              onChange={handleChange}
              onKeyDown={handleKeyDown}
            />
          </div>
        );
    }
  };

  return (
    <div className={`caderno-block-row ${menuOpen ? "is-active" : ""}`}>
      {/* Handle com ações do bloco */}
      <div className="caderno-block-handle-container">
        <button
          type="button"
          className="caderno-block-handle"
          title="Opções do bloco"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ⋮⋮
        </button>

        {menuOpen && (
          <div ref={menuRef} className="caderno-block-menu cm-surface">
            <div className="caderno-block-menu-header">TRANSFORMAR EM</div>
            <button
              type="button"
              onClick={() => {
                onUpdate({ ...block, type: "paragraph" });
                setMenuOpen(false);
              }}
            >
              ¶ Texto
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdate({ ...block, type: "heading_1" });
                setMenuOpen(false);
              }}
            >
              H1 Título Grande
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdate({ ...block, type: "heading_2" });
                setMenuOpen(false);
              }}
            >
              H2 Título Médio
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdate({ ...block, type: "heading_3" });
                setMenuOpen(false);
              }}
            >
              H3 Título Menor
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdate({ ...block, type: "todo", checked: false });
                setMenuOpen(false);
              }}
            >
              ☑ Tarefa (To-do)
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdate({ ...block, type: "bulleted_list" });
                setMenuOpen(false);
              }}
            >
              • Lista com Marcadores
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdate({ ...block, type: "callout", calloutType: "idea", calloutIcon: "💡" });
                setMenuOpen(false);
              }}
            >
              💡 Caixa de Destaque
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdate({ ...block, type: "quote" });
                setMenuOpen(false);
              }}
            >
              “ Citação
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdate({ ...block, type: "code", language: "typescript" });
                setMenuOpen(false);
              }}
            >
              &lt;/&gt; Código
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdate({ ...block, type: "toggle", expanded: true });
                setMenuOpen(false);
              }}
            >
              ▶ Bloco Retrátil
            </button>

            <div className="caderno-block-menu-sep" />
            <button
              type="button"
              onClick={() => {
                onDuplicate(block.id);
                setMenuOpen(false);
              }}
            >
              Duplicar Bloco
            </button>
            {index > 0 && (
              <button
                type="button"
                onClick={() => {
                  onMoveUp(block.id);
                  setMenuOpen(false);
                }}
              >
                Mover para Cima
              </button>
            )}
            {index < totalBlocks - 1 && (
              <button
                type="button"
                onClick={() => {
                  onMoveDown(block.id);
                  setMenuOpen(false);
                }}
              >
                Mover para Baixo
              </button>
            )}
            <button
              type="button"
              className="is-danger"
              onClick={() => {
                onDelete(block.id);
                setMenuOpen(false);
              }}
            >
              Excluir Bloco
            </button>
          </div>
        )}
      </div>

      {/* Conteúdo do Bloco */}
      <div className="caderno-block-body">{renderBlockContent()}</div>
    </div>
  );
}
