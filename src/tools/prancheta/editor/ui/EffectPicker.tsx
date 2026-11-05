import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { EffectType } from '../model/types';
import * as I from './icons';
import './EffectPicker.css';

export interface EffectMeta {
  type: EffectType;
  label: string;
  icon: ReactNode;
  beta?: boolean;
}

export const EFFECT_METAS: EffectMeta[] = [
  { type: 'INNER_SHADOW', label: 'Sombra interna', icon: <I.IconInnerShadow size={16} /> },
  { type: 'DROP_SHADOW', label: 'Sombra projetada', icon: <I.IconDropShadow size={16} /> },
  { type: 'LAYER_BLUR', label: 'Desfocar camada', icon: <I.IconLayerBlur size={16} /> },
  { type: 'BACKGROUND_BLUR', label: 'Desfocar plano de fundo', icon: <I.IconBackgroundBlur size={16} /> },
  { type: 'NOISE', label: 'Ruído', icon: <I.IconNoise size={16} /> },
  { type: 'TEXTURE', label: 'Textura', icon: <I.IconTexture size={16} /> },
  { type: 'GLASS', label: 'Vidro', icon: <I.IconGlass size={16} /> },
  { type: 'SHADER', label: 'Shader', icon: <I.IconShader size={16} />, beta: true },
];

export const EFFECT_META_MAP: Record<EffectType, EffectMeta> = Object.fromEntries(
  EFFECT_METAS.map((m) => [m.type, m]),
) as Record<EffectType, EffectMeta>;

interface EffectPickerProps {
  value: EffectType;
  onChange: (type: EffectType) => void;
}

export function EffectPicker({ value, onChange }: EffectPickerProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentMeta = EFFECT_META_MAP[value] || EFFECT_METAS[1];

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 220;
    let left = rect.left;
    if (left + menuWidth > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - menuWidth - 10);
    }
    let top = rect.bottom + 4;
    if (top + 270 > window.innerHeight && rect.top > 270) {
      top = rect.top - 274;
    }
    setCoords({ top, left });
  };

  const handleToggle = () => {
    if (open) {
      setOpen(false);
    } else {
      updatePosition();
      setOpen(true);
    }
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
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

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  return (
    <>
      <div
        ref={triggerRef}
        className={`effect-type-trigger ${open ? 'open' : ''}`}
        onClick={handleToggle}
        title="Alterar tipo de efeito"
      >
        <div className="effect-type-left">
          <span className="effect-dropdown-item-icon">{currentMeta.icon}</span>
          <span>{currentMeta.label}</span>
          {currentMeta.beta && <span className="effect-dropdown-item-badge">Beta</span>}
        </div>
        <span className="effect-type-chevron">
          <I.IconCaretDown size={12} />
        </span>
      </div>

      {open && (
        <div
          ref={menuRef}
          className="effect-dropdown-menu"
          style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
        >
          {EFFECT_METAS.map((item) => {
            const isSelected = item.type === value;
            return (
              <div
                key={item.type}
                className={`effect-dropdown-item ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  onChange(item.type);
                  setOpen(false);
                }}
              >
                <span className="effect-dropdown-item-icon">{item.icon}</span>
                <span className="effect-dropdown-item-label">{item.label}</span>
                {item.beta && <span className="effect-dropdown-item-badge">Beta</span>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

interface AddEffectMenuProps {
  onSelect: (type: EffectType) => void;
  children: ReactNode;
}

export function AddEffectMenu({ onSelect, children }: AddEffectMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 220;
    let left = rect.right - menuWidth;
    if (left < 10) left = 10;
    let top = rect.bottom + 4;
    if (top + 280 > window.innerHeight && rect.top > 280) {
      top = rect.top - 284;
    }
    setCoords({ top, left });
  };

  const handleToggle = () => {
    if (open) {
      setOpen(false);
    } else {
      updatePosition();
      setOpen(true);
    }
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
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

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  return (
    <>
      <div ref={triggerRef} onClick={handleToggle} style={{ display: 'inline-flex' }}>
        {children}
      </div>

      {open && (
        <div
          ref={menuRef}
          className="effect-dropdown-menu"
          style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
        >
          {EFFECT_METAS.map((item) => (
            <div
              key={item.type}
              className="effect-dropdown-item"
              onClick={() => {
                onSelect(item.type);
                setOpen(false);
              }}
            >
              <span className="effect-dropdown-item-icon">{item.icon}</span>
              <span className="effect-dropdown-item-label">{item.label}</span>
              {item.beta && <span className="effect-dropdown-item-badge">Beta</span>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
