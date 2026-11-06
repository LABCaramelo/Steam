import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Effect } from '../model/types';
import * as I from './icons';
import './GlassPopover.css';

interface GlassPopoverProps {
  anchor?: DOMRect | null;
  effect: Effect;
  onChange: (patch: Partial<Effect>, live?: boolean) => void;
  onClose: () => void;
}

export function GlassPopover({ anchor, effect, onChange, onClose }: GlassPopoverProps) {
  const popRef = useRef<HTMLDivElement>(null);
  const lightBoxRef = useRef<HTMLDivElement>(null);
  const [isDraggingLight, setIsDraggingLight] = useState(false);

  // Valores canônicos com fallbacks de segurança
  const lightAngle = effect.lightAngle ?? -45;
  const lightIntensity = effect.lightIntensity ?? 80;
  const refraction = effect.refraction ?? 80;
  const depth = effect.depth ?? 20;
  const dispersion = effect.dispersion ?? 50;
  const frost = effect.frost ?? (effect.radius || 4);
  const splay = effect.splay ?? 0;

  // Fechar ao clicar fora ou apertar Esc
  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Posicionamento inteligente ao lado do painel
  const style: React.CSSProperties = {};
  if (anchor) {
    const popWidth = 280;
    let left = anchor.left - popWidth - 12;
    if (left < 10) left = anchor.right + 12;
    let top = Math.max(10, Math.min(window.innerHeight - 380, anchor.top - 20));
    style.left = `${left}px`;
    style.top = `${top}px`;
  }

  // Controlador de Luz 2D interativo (ângulo da luz)
  const updateLightFromPointer = (clientX: number, clientY: number, live = false) => {
    const box = lightBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rad = Math.atan2(clientY - cy, clientX - cx);
    const deg = Math.round((rad * 180) / Math.PI);
    onChange({ lightAngle: deg }, live);
  };

  const handleLightPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingLight(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateLightFromPointer(e.clientX, e.clientY, true);
  };

  const handleLightPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingLight) return;
    updateLightFromPointer(e.clientX, e.clientY, true);
  };

  const handleLightPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingLight) return;
    setIsDraggingLight(false);
    updateLightFromPointer(e.clientX, e.clientY, false);
  };

  // Coordenadas visuais da luz
  const rad = (lightAngle * Math.PI) / 180;
  const pinX = 50 + 36 * Math.cos(rad);
  const pinY = 50 + 36 * Math.sin(rad);
  const lightBg = `radial-gradient(circle at ${pinX}% ${pinY}%, rgba(255, 255, 255, ${Math.min(1, (lightIntensity / 100) * 1.1)}) 0%, rgba(255, 255, 255, 0.25) 32%, rgba(20, 20, 25, 0.95) 75%)`;

  return (
    <div ref={popRef} className="glass-popover" style={style}>
      {/* Header */}
      <div className="glass-popover-header">
        <div className="glass-popover-title-row">
          <I.IconGlass size={16} />
          <span>Vidro</span>
        </div>
        <button type="button" className="glass-popover-close" onClick={onClose} title="Fechar">
          <I.IconClose size={12} />
        </button>
      </div>

      {/* Seção Luz */}
      <div className="glass-light-section">
        <span className="glass-light-label">Luz</span>
        <div
          ref={lightBoxRef}
          className="glass-light-box"
          style={{ background: lightBg }}
          onPointerDown={handleLightPointerDown}
          onPointerMove={handleLightPointerMove}
          onPointerUp={handleLightPointerUp}
          title="Arraste para mudar o ângulo da luz"
        >
          <div className="glass-light-pin" style={{ left: `${pinX}%`, top: `${pinY}%` }} />
        </div>

        <div className="glass-light-inputs">
          <div className="glass-mini-input" title="Ângulo da luz">
            <input
              type="number"
              value={lightAngle}
              onChange={(e) => onChange({ lightAngle: Number(e.target.value) || 0 })}
            />
            <span>°</span>
          </div>
          <div className="glass-mini-input" title="Intensidade da luz">
            <input
              type="number"
              min={0}
              max={100}
              value={lightIntensity}
              onChange={(e) => onChange({ lightIntensity: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
            />
            <span>%</span>
          </div>
        </div>
      </div>

      {/* Sliders do Vidro (Figma 1:1) */}
      <div className="glass-sliders">
        {/* Refração */}
        <div className="glass-slider-row">
          <span className="glass-slider-label">Refração</span>
          <input
            type="range"
            min={0}
            max={100}
            value={refraction}
            className="glass-slider-track"
            onChange={(e) => onChange({ refraction: Number(e.target.value) }, true)}
            onMouseUp={() => onChange({ refraction })}
          />
          <input
            type="number"
            min={0}
            max={100}
            value={refraction}
            className="glass-slider-input"
            onChange={(e) => onChange({ refraction: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
          />
        </div>

        {/* Profundidade */}
        <div className="glass-slider-row">
          <span className="glass-slider-label">Profundidade</span>
          <input
            type="range"
            min={0}
            max={100}
            value={depth}
            className="glass-slider-track"
            onChange={(e) => onChange({ depth: Number(e.target.value) }, true)}
            onMouseUp={() => onChange({ depth })}
          />
          <input
            type="number"
            min={0}
            max={100}
            value={depth}
            className="glass-slider-input"
            onChange={(e) => onChange({ depth: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
          />
        </div>

        {/* Dispersão */}
        <div className="glass-slider-row">
          <span className="glass-slider-label">Dispersão</span>
          <input
            type="range"
            min={0}
            max={100}
            value={dispersion}
            className="glass-slider-track"
            onChange={(e) => onChange({ dispersion: Number(e.target.value) }, true)}
            onMouseUp={() => onChange({ dispersion })}
          />
          <input
            type="number"
            min={0}
            max={100}
            value={dispersion}
            className="glass-slider-input"
            onChange={(e) => onChange({ dispersion: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
          />
        </div>

        {/* Gelo */}
        <div className="glass-slider-row">
          <span className="glass-slider-label">Gelo</span>
          <input
            type="range"
            min={0}
            max={100}
            value={frost}
            className="glass-slider-track"
            onChange={(e) => {
              const val = Number(e.target.value);
              onChange({ frost: val, radius: val }, true);
            }}
            onMouseUp={() => onChange({ frost, radius: frost })}
          />
          <input
            type="number"
            min={0}
            max={100}
            value={frost}
            className="glass-slider-input"
            onChange={(e) => {
              const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
              onChange({ frost: val, radius: val });
            }}
          />
        </div>

        {/* Splay */}
        <div className="glass-slider-row">
          <span className="glass-slider-label">Splay</span>
          <input
            type="range"
            min={0}
            max={100}
            value={splay}
            className="glass-slider-track"
            onChange={(e) => onChange({ splay: Number(e.target.value) }, true)}
            onMouseUp={() => onChange({ splay })}
          />
          <input
            type="number"
            min={0}
            max={100}
            value={splay}
            className="glass-slider-input"
            onChange={(e) => onChange({ splay: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
          />
        </div>
      </div>
    </div>
  );
}
