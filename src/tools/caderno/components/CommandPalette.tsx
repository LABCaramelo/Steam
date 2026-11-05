import { useState, useEffect, useRef } from "react";
import type { CadernoPage } from "../types";

interface CommandPaletteProps {
  pages: CadernoPage[];
  onSelectPage: (id: string) => void;
  onClose: () => void;
}

export function CommandPalette({ pages, onSelectPage, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = pages.filter((page) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    if (page.title.toLowerCase().includes(q)) return true;
    if (page.blocks?.some((b) => b.content.toLowerCase().includes(q))) return true;
    if (page.database?.rows?.some((r) => Object.values(r.values).some((v) => String(v).toLowerCase().includes(q))))
      return true;
    return false;
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length ? (prev + 1) % results.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length ? (prev - 1 + results.length) % results.length : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[selectedIndex]) {
          onSelectPage(results[selectedIndex].id);
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [results, selectedIndex, onSelectPage, onClose]);

  return (
    <div className="caderno-modal-backdrop" onClick={onClose}>
      <div className="caderno-cmd-palette cm-surface" onClick={(e) => e.stopPropagation()}>
        <div className="caderno-cmd-input-wrap">
          <span className="caderno-cmd-search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="caderno-cmd-input"
            placeholder="Buscar páginas, blocos, notas ou tabelas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="caderno-kbd">ESC</kbd>
        </div>

        <div className="caderno-cmd-list">
          {results.length === 0 ? (
            <div className="caderno-cmd-empty">Nenhum resultado encontrado para "{query}"</div>
          ) : (
            results.map((page, idx) => {
              // Encontra snippet do bloco que deu match
              const matchBlock = query.trim()
                ? page.blocks?.find((b) => b.content.toLowerCase().includes(query.toLowerCase()))
                : null;

              return (
                <button
                  key={page.id}
                  type="button"
                  className={`caderno-cmd-item ${idx === selectedIndex ? "is-selected" : ""}`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    onSelectPage(page.id);
                    onClose();
                  }}
                >
                  <span className="caderno-cmd-item-icon">{page.icon || (page.isDatabase ? "📊" : "📄")}</span>
                  <div className="caderno-cmd-item-info">
                    <span className="caderno-cmd-item-title">{page.title || "Sem título"}</span>
                    {matchBlock && (
                      <span className="caderno-cmd-item-snippet">
                        {matchBlock.content.substring(0, 90)}...
                      </span>
                    )}
                  </div>
                  {page.isDatabase && <span className="caderno-cmd-item-badge">Base de Dados</span>}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
