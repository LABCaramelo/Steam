import { useEffect, useMemo, useRef, useState } from 'react';
import { FONTS, ensureFont, fontDef, type FontDef } from '../fonts';
import * as I from './icons';
import './FontPicker.css';

interface FontPickerProps {
  value: string;
  mixed?: boolean;
  onChange: (family: string) => void;
}

type CategoryKey = 'all' | 'popular' | 'display' | 'sans-serif' | 'serif' | 'handwriting' | 'monospace';

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'popular', label: 'Destaques LAB' },
  { key: 'display', label: 'Display' },
  { key: 'sans-serif', label: 'Sem Serifa' },
  { key: 'serif', label: 'Serifa' },
  { key: 'handwriting', label: 'Manuscrita' },
  { key: 'monospace', label: 'Mono' },
];

const INITIAL_RENDER_LIMIT = 50;

export function FontPicker({ value, mixed, onChange }: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryKey>('all');
  const [limit, setLimit] = useState(INITIAL_RENDER_LIMIT);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 280 });

  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Posiciona o popover perfeitamente abaixo do botão do inspetor
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 290;
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - popoverWidth - 10);
    }
    let top = rect.bottom + 4;
    // Se estourar a tela inferior, abre para cima
    if (top + 340 > window.innerHeight && rect.top > 350) {
      top = rect.top - 344;
    }
    setCoords({ top, left, width: popoverWidth });
  };

  const handleToggle = () => {
    if (open) {
      setOpen(false);
    } else {
      updatePosition();
      setOpen(true);
      setSearch('');
      setLimit(INITIAL_RENDER_LIMIT);
    }
  };

  // Fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    // Foca na barra de busca ao abrir
    setTimeout(() => searchInputRef.current?.focus(), 40);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  // Filtra as 1.580+ fontes em alta performance
  const filteredFonts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return FONTS.filter((f) => {
      if (category === 'popular' && !f.popular) return false;
      if (category !== 'all' && category !== 'popular' && f.category !== category) return false;
      if (q && !f.family.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, category]);

  const visibleFonts = useMemo(() => filteredFonts.slice(0, limit), [filteredFonts, limit]);

  // Carrega mais itens dinamicamente ao rolar a lista (virtual scrolling suave)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 60) {
      setLimit((prev) => Math.min(prev + 50, filteredFonts.length));
    }
  };

  const selectFont = (family: string) => {
    void ensureFont(family);
    onChange(family);
    setOpen(false);
  };

  const handleCustomAdd = () => {
    const custom = search.trim();
    if (!custom) return;
    selectFont(custom);
  };

  const hasExactMatch = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q && filteredFonts.some((f) => f.family.toLowerCase() === q);
  }, [search, filteredFonts]);

  const currentDisplay = mixed ? 'Misto' : value || 'Inter';

  return (
    <>
      <div
        ref={triggerRef}
        className={`select grow font-picker-trigger ${open ? 'open' : ''}`}
        onClick={handleToggle}
        title="Escolher tipografia (1.580+ fontes do Google)"
      >
        <span className="font-picker-label" style={{ fontFamily: mixed ? undefined : value }}>
          {currentDisplay}
        </span>
        <span className="font-picker-arrow">
          <I.IconCaretDown size={14} />
        </span>
      </div>

      {open && (
        <div
          ref={popoverRef}
          className="font-picker-popover"
          style={{ top: `${coords.top}px`, left: `${coords.left}px`, width: `${coords.width}px` }}
        >
          {/* Campo de Busca Rápida */}
          <div className="font-picker-search-box">
            <span className="font-picker-search-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              ref={searchInputRef}
              className="font-picker-search-input"
              type="text"
              placeholder="Buscar entre 1.580+ fontes (ex: Bowlby, Montserrat...)"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setLimit(INITIAL_RENDER_LIMIT);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (visibleFonts.length > 0) {
                    selectFont(visibleFonts[0].family);
                  } else if (search.trim()) {
                    handleCustomAdd();
                  }
                }
              }}
            />
            {search && (
              <button className="font-picker-clear-btn" onClick={() => setSearch('')} title="Limpar busca">
                ✕
              </button>
            )}
          </div>

          {/* Categorias / Filtros */}
          <div className="font-picker-categories">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                className={`font-picker-cat-chip ${category === cat.key ? 'active' : ''}`}
                onClick={() => {
                  setCategory(cat.key);
                  setLimit(INITIAL_RENDER_LIMIT);
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Lista de Fontes */}
          <div className="font-picker-list" onScroll={handleScroll}>
            {visibleFonts.length === 0 ? (
              <div className="font-picker-empty">
                Nenhuma fonte encontrada com o termo "{search}".
              </div>
            ) : (
              visibleFonts.map((f: FontDef) => {
                const isSelected = f.family.toLowerCase() === value.toLowerCase();
                return (
                  <div
                    key={f.family}
                    className={`font-picker-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => selectFont(f.family)}
                    onMouseEnter={() => void ensureFont(f.family)}
                  >
                    <div className="font-picker-item-left">
                      <span className="font-picker-item-name">{f.family}</span>
                      {f.caramelo && <span className="font-picker-item-badge caramelo">LAB</span>}
                      {f.category === 'display' && <span className="font-picker-item-badge display">Display</span>}
                      {f.category === 'handwriting' && <span className="font-picker-item-badge">Manuscrita</span>}
                    </div>
                    <span
                      className="font-picker-item-preview"
                      style={{ fontFamily: `"${f.family}", sans-serif` }}
                    >
                      {f.family === 'Covered By Your Grace' ? 'Autoral' : f.family === 'Bowlby One SC' ? 'VIRAL' : 'Caramelo'}
                    </span>
                  </div>
                );
              })
            )}

            {/* Opção para carregar qualquer fonte não listada diretamente do Google Fonts */}
            {search.trim().length > 1 && !hasExactMatch && (
              <div className="font-picker-custom-add" onClick={handleCustomAdd}>
                <I.IconPlus size={14} />
                <span>Carregar "{search.trim()}" do Google Fonts</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
