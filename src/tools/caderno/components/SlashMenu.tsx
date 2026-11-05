import { useEffect, useRef, useState } from "react";
import type { BlockType, SlashCommandItem } from "../types";

const COMMANDS: SlashCommandItem[] = [
  {
    id: "paragraph",
    title: "Texto",
    description: "Parágrafo padrão para escrita livre e notas.",
    icon: "¶",
    category: "Básico",
  },
  {
    id: "heading_1",
    title: "Título 1",
    description: "Título de seção principal em caixa alta.",
    icon: "H1",
    category: "Básico",
  },
  {
    id: "heading_2",
    title: "Título 2",
    description: "Subtítulo médio para separar ideias.",
    icon: "H2",
    category: "Básico",
  },
  {
    id: "heading_3",
    title: "Título 3",
    description: "Título menor para tópicos e itens.",
    icon: "H3",
    category: "Básico",
  },
  {
    id: "todo",
    title: "Lista de Tarefas",
    description: "Acompanhe entregas com caixas de seleção.",
    icon: "☑",
    category: "Básico",
  },
  {
    id: "bulleted_list",
    title: "Lista com Marcadores",
    description: "Tópicos pontuados simples.",
    icon: "•",
    category: "Básico",
  },
  {
    id: "numbered_list",
    title: "Lista Numerada",
    description: "Passo a passo sequencial ordenado.",
    icon: "1.",
    category: "Básico",
  },
  {
    id: "toggle",
    title: "Bloco Retrátil (Toggle)",
    description: "Acordeão para esconder detalhes ou notas longas.",
    icon: "▶",
    category: "Avançado",
  },
  {
    id: "callout",
    title: "Caixa de Destaque (Callout)",
    description: "Destaque insights, avisos e regras de bastidor.",
    icon: "💡",
    category: "Avançado",
  },
  {
    id: "quote",
    title: "Citação",
    description: "Destaque pensamentos, falas ou teses centrais.",
    icon: "“",
    category: "Básico",
  },
  {
    id: "code",
    title: "Bloco de Código",
    description: "Trecho de código com destaque e cópia rápida.",
    icon: "</>",
    category: "Avançado",
  },
  {
    id: "divider",
    title: "Divisor",
    description: "Linha horizontal para separar blocos visuais.",
    icon: "—",
    category: "Básico",
  },
  {
    id: "table",
    title: "Tabela Simples",
    description: "Grade de linhas e colunas com cabeçalho.",
    icon: "▦",
    category: "Mídia & Dados",
  },
];

interface SlashMenuProps {
  query: string;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}

export function SlashMenu({ query, onSelect, onClose }: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filterText = query.toLowerCase().replace(/^\//, "").trim();
  const filtered = COMMANDS.filter(
    (c) =>
      c.title.toLowerCase().includes(filterText) ||
      c.description.toLowerCase().includes(filterText) ||
      c.id.toLowerCase().includes(filterText)
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex].id as BlockType);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filtered, selectedIndex, onSelect, onClose]);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (filtered.length === 0) {
    return (
      <div ref={menuRef} className="caderno-slash-menu">
        <div className="caderno-slash-empty">Nenhum comando encontrado</div>
      </div>
    );
  }

  return (
    <div ref={menuRef} className="caderno-slash-menu">
      <div className="caderno-slash-header">
        <span>INSERIR BLOCO</span>
        <kbd className="caderno-kbd">ESC para fechar</kbd>
      </div>
      <div className="caderno-slash-list">
        {filtered.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            className={`caderno-slash-item ${idx === selectedIndex ? "is-selected" : ""}`}
            onMouseEnter={() => setSelectedIndex(idx)}
            onClick={() => onSelect(item.id as BlockType)}
          >
            <span className="caderno-slash-icon">{item.icon}</span>
            <div className="caderno-slash-info">
              <span className="caderno-slash-title">{item.title}</span>
              <span className="caderno-slash-desc">{item.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
