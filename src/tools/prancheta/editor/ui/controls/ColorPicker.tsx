import { type PointerEvent as RPointerEvent, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { addImageToDoc, imagePaint, pickFiles } from '../../actions';
import { type HSV, hexToRgb, hsvToRgb, normalizeHex, rgbToHex, rgbToHsv, rgba } from '../../canvas/color';
import { readFileAsDataURL } from '../../canvas/images';
import type { ColorStop, GradientPaint, Paint, ScaleMode, SolidPaint } from '../../model/types';
import { store } from '../../store/store';
import {
  IconCheck,
  IconChevronDown,
  IconClose,
  IconEyeDropper,
  IconImage,
  IconMinus,
  IconSparkles,
} from '../icons';
import { NumberField } from './NumberField';

const WIDTH = 256;

// Paleta oficial Caramelo & Essenciais
const CARAMELO_PRESETS = [
  '#101014', // Ink Black
  '#FFF4E8', // Warm Cream
  '#FF701A', // Caramel Orange
  '#25BFFF', // Electric Sky
  '#FF3D8D', // Hot Pink
  '#7657FF', // Electric Violet
  '#FFD52A', // Acid Yellow
  '#FFFFFF', // Pure White
  '#64748B', // Slate Gray
  '#000000', // Pure Black
];

/**
 * Ativa o conta-gotas de tela nativo (EyeDropper API no Chromium/Chrome/Electron)
 * com fallback para amostragem no canvas da Prancheta.
 */
export async function pickColorWithEyeDropper(): Promise<string | null> {
  if (typeof window !== 'undefined' && 'EyeDropper' in window) {
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const res = await eyeDropper.open();
      if (res?.sRGBHex) {
        return normalizeHex(res.sRGBHex);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return null;
      console.warn('EyeDropper nativo cancelado ou indisponível:', err);
    }
  }

  // Fallback de amostragem direta no canvas da cena
  return new Promise((resolve) => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return resolve(null);

    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = 'crosshair';

    const cleanup = () => {
      document.body.style.cursor = prevCursor;
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    };

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      cleanup();

      const rect = canvas.getBoundingClientRect();
      const x = Math.round((e.clientX - rect.left) * (canvas.width / rect.width));
      const y = Math.round((e.clientY - rect.top) * (canvas.height / rect.height));

      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      try {
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const r = pixel[0].toString(16).padStart(2, '0');
        const g = pixel[1].toString(16).padStart(2, '0');
        const b = pixel[2].toString(16).padStart(2, '0');
        resolve(`#${r}${g}${b}`.toUpperCase());
      } catch (err) {
        console.warn('Canvas sample error:', err);
        resolve(null);
      }
    };

    window.addEventListener('pointerdown', onDown, { capture: true, once: true });
    window.addEventListener('keydown', onKey, { capture: true, once: true });
  });
}

function useDrag(onPoint: (fx: number, fy: number, live: boolean) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const active = useRef(false);
  const at = (e: RPointerEvent, live: boolean) => {
    const r = ref.current!.getBoundingClientRect();
    onPoint(
      Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
      live,
    );
  };
  return {
    ref,
    onPointerDown: (e: RPointerEvent) => {
      if (e.button !== 0) return;
      active.current = true;
      ref.current!.setPointerCapture(e.pointerId);
      at(e, false);
    },
    onPointerMove: (e: RPointerEvent) => active.current && at(e, true),
    onPointerUp: () => (active.current = false),
  };
}

interface SolidEditorProps {
  paint: SolidPaint;
  onChange: (p: SolidPaint, live: boolean) => void;
  docColors: string[];
}

function SolidEditor({ paint, onChange, docColors }: SolidEditorProps) {
  const [hsv, setHsv] = useState<HSV>(() => rgbToHsv(hexToRgb(paint.color)));
  const [hex, setHex] = useState(paint.color.replace(/^#/, ''));
  const current = rgbToHex(hsvToRgb(hsv));

  // Cor alterada por fora (desfazer, outro campo, swatches): sincroniza mantendo o matiz
  useEffect(() => {
    if (normalizeHex(paint.color) !== current) {
      setHsv(rgbToHsv(hexToRgb(paint.color)));
    }
    setHex(paint.color.replace(/^#/, ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paint.color]);

  const emitHsv = (next: HSV, live: boolean) => {
    setHsv(next);
    onChange({ ...paint, color: rgbToHex(hsvToRgb(next)) }, live);
  };

  const sv = useDrag((fx, fy, live) => emitHsv({ h: hsv.h, s: fx, v: 1 - fy }, live));
  const hue = useDrag((fx, _fy, live) => emitHsv({ ...hsv, h: Math.min(359.9, fx * 360) }, live));
  const alpha = useDrag((fx, _fy, live) => onChange({ ...paint, opacity: Math.round(fx * 100) / 100 }, live));
  const hueColor = rgbToHex(hsvToRgb({ h: hsv.h, s: 1, v: 1 }));

  const handlePipette = async () => {
    const hexColor = await pickColorWithEyeDropper();
    if (!hexColor) return;
    const normalized = normalizeHex(hexColor);
    if (normalized) {
      setHsv(rgbToHsv(hexToRgb(normalized)));
      setHex(normalized.replace(/^#/, ''));
      onChange({ ...paint, color: normalized }, false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'i' || e.key === 'I') && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        void handlePipette();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paint, onChange]);

  const currentColorNorm = normalizeHex(paint.color) ?? paint.color;

  return (
    <div className="cp-solid">
      {/* Área de Saturação e Brilho (SV) */}
      <div className="cp-sv" {...sv} style={{ background: hueColor }}>
        <div className="cp-sv-white" />
        <div className="cp-sv-black" />
        <div
          className="cp-sv-knob"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            background: current,
          }}
        />
      </div>

      {/* Sliders de Matiz (Hue) e Opacidade (Alpha) */}
      <div className="cp-sliders">
        <div className="cp-slider cp-hue" {...hue} title="Matiz (Hue)">
          <div
            className="cp-slider-knob"
            style={{ left: `${(hsv.h / 360) * 100}%`, background: hueColor }}
          />
        </div>
        <div className="cp-slider cp-alpha" {...alpha} title="Opacidade">
          <div
            className="cp-alpha-fill"
            style={{
              background: `linear-gradient(to right, ${rgba(current, 0)}, ${current})`,
            }}
          />
          <div
            className="cp-slider-knob"
            style={{
              left: `${paint.opacity * 100}%`,
              background: rgba(current, paint.opacity),
            }}
          />
        </div>
      </div>

      {/* Linha de Controles: Conta-gotas, Chip de cor, Input HEX e Opacidade */}
      <div className="cp-row">
        <button
          type="button"
          className="cp-pipette-btn"
          title="Conta-gotas (pressione 'I')"
          onClick={() => void handlePipette()}
        >
          <IconEyeDropper size={15} />
        </button>

        <div className="cp-preview-chip cp-alpha" title="Cor selecionada">
          <div
            style={{
              background: rgba(current, paint.opacity),
              width: '100%',
              height: '100%',
              borderRadius: 'inherit',
            }}
          />
        </div>

        <div className="cp-hex-box" title="Código HEX">
          <span className="cp-hash">#</span>
          <input
            className="cp-hex-input"
            value={hex}
            spellCheck={false}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
              setHex(cleaned);
            }}
            onFocus={(e) => e.target.select()}
            onBlur={() => {
              const h = normalizeHex(hex);
              if (h && h !== paint.color) {
                onChange({ ...paint, color: h }, false);
              } else {
                setHex(paint.color.replace(/^#/, ''));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') {
                setHex(paint.color.replace(/^#/, ''));
                e.currentTarget.blur();
              }
            }}
          />
        </div>

        <NumberField
          className="cp-opacity"
          value={paint.opacity}
          displayScale={100}
          suffix="%"
          min={0}
          max={1}
          onChange={(v, live) => onChange({ ...paint, opacity: v }, live)}
        />
      </div>

      {/* Paleta Caramelo & Essenciais */}
      <div className="cp-section">
        <div className="cp-section-title">Paleta Caramelo</div>
        <div className="cp-swatches">
          {CARAMELO_PRESETS.map((c) => {
            const isMatch = currentColorNorm === c;
            return (
              <button
                key={c}
                type="button"
                className={'cp-swatch' + (isMatch ? ' active' : '')}
                title={c}
                style={{ background: c }}
                onClick={() => onChange({ ...paint, color: c }, false)}
              />
            );
          })}
        </div>
      </div>

      {/* Cores Usadas no Documento */}
      {docColors.length > 0 && (
        <div className="cp-section">
          <div className="cp-section-title">Neste arquivo</div>
          <div className="cp-swatches">
            {docColors.slice(0, 16).map((c) => {
              const isMatch = currentColorNorm === normalizeHex(c);
              return (
                <button
                  key={c}
                  type="button"
                  className={'cp-swatch' + (isMatch ? ' active' : '')}
                  title={c}
                  style={{ background: c }}
                  onClick={() => onChange({ ...paint, color: c }, false)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const SCALE_LABELS: Record<ScaleMode, string> = {
  FILL: 'Preencher',
  FIT: 'Ajustar',
  STRETCH: 'Esticar',
};

async function chooseImage(): Promise<string | null> {
  const [file] = await pickFiles('image/*', false);
  if (!file) return null;
  const src = await readFileAsDataURL(file);
  return addImageToDoc(store.state.doc, src);
}

interface PaintTypeMeta {
  type: Paint['type'];
  label: string;
  icon: ReactNode;
}

const PAINT_TYPES: PaintTypeMeta[] = [
  {
    type: 'SOLID',
    label: 'Sólido',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <rect x="2" y="2" width="12" height="12" rx="2.5" />
      </svg>
    ),
  },
  {
    type: 'GRADIENT_LINEAR',
    label: 'Gradiente Linear',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16">
        <defs>
          <linearGradient id="pLinearIcon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF4E8" />
            <stop offset="100%" stopColor="#0d99ff" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="12" height="12" rx="2.5" fill="url(#pLinearIcon)" />
      </svg>
    ),
  },
  {
    type: 'GRADIENT_RADIAL',
    label: 'Gradiente Radial',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16">
        <defs>
          <radialGradient id="pRadialIcon" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF4E8" />
            <stop offset="100%" stopColor="#0d99ff" />
          </radialGradient>
        </defs>
        <rect x="2" y="2" width="12" height="12" rx="2.5" fill="url(#pRadialIcon)" />
      </svg>
    ),
  },
  {
    type: 'IMAGE',
    label: 'Imagem',
    icon: <IconImage size={14} />,
  },
];

const PAINT_TYPE_MAP: Record<string, PaintTypeMeta> = Object.fromEntries(
  PAINT_TYPES.map((t) => [t.type, t]),
);

interface PaintPopoverProps {
  anchor: DOMRect;
  paint: Paint;
  onChange: (p: Paint, live: boolean) => void;
  onClose: () => void;
  allowImage?: boolean;
  docColors: string[];
  title?: string;
}

/**
 * Janela de edição de pintura (cor sólida, gradiente ou imagem), aberta ao lado do painel.
 * Totalmente estilizada no padrão UI3 / Caramelo sem menus nativos brancos do navegador.
 */
export function PaintPopover({
  anchor,
  paint,
  onChange,
  onClose,
  allowImage = true,
  docColors,
  title = 'Preenchimento',
}: PaintPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const typeMenuRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(anchor.top - 8);
  const [typeOpen, setTypeOpen] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 0;
    setTop(Math.max(8, Math.min(anchor.top - 8, window.innerHeight - h - 8)));
  }, [anchor.top, paint.type]);

  useEffect(() => {
    const down = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t?.closest('.paint-popover') || t?.closest('[data-menu-anchor]') || t?.closest('.menu')) {
        // Se clicou fora do dropdown de tipos, fecha o dropdown
        if (typeOpen && !t?.closest('.pp-type-selector')) {
          setTypeOpen(false);
        }
        return;
      }
      onClose();
    };

    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (typeOpen) {
          setTypeOpen(false);
          e.stopPropagation();
          return;
        }
        if (!(e.target as HTMLElement)?.closest?.('input')) {
          e.stopPropagation();
          onClose();
        }
      }
    };

    window.addEventListener('pointerdown', down, true);
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('keydown', key, true);
    };
  }, [onClose, typeOpen]);

  const switchType = async (type: Paint['type']) => {
    if (type === paint.type) return;
    if (type === 'SOLID') {
      onChange({ type: 'SOLID', color: '#D9D9D9', opacity: paint.opacity, visible: true }, false);
    } else if (type === 'GRADIENT_LINEAR' || type === 'GRADIENT_RADIAL') {
      onChange(
        {
          type,
          stops: [
            { position: 0, color: '#0D99FF', opacity: 1 },
            { position: 1, color: '#101014', opacity: 1 },
          ],
          angle: 90,
          opacity: paint.opacity,
          visible: true,
        },
        false,
      );
    } else {
      const id = await chooseImage();
      if (id) onChange({ ...imagePaint(id), opacity: paint.opacity }, false);
    }
  };

  const left = Math.max(8, anchor.left - WIDTH - 16);
  const src = paint.type === 'IMAGE' ? store.state.doc.images[paint.imageId] : null;
  const currentMeta = PAINT_TYPE_MAP[paint.type] ?? PAINT_TYPES[0];

  return createPortal(
    <div
      ref={ref}
      className="paint-popover"
      style={{ left, top, width: WIDTH }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="pp-header">
        {allowImage ? (
          <div className="pp-type-selector" ref={typeMenuRef}>
            <button
              type="button"
              className={'pp-type-trigger' + (typeOpen ? ' open' : '')}
              onClick={() => setTypeOpen((v) => !v)}
              title="Alternar modo de preenchimento"
            >
              <span className="pp-type-item-icon">{currentMeta.icon}</span>
              <span>{currentMeta.label}</span>
              <IconChevronDown size={14} className={'chevron' + (typeOpen ? ' open' : '')} />
            </button>

            {typeOpen && (
              <div className="pp-type-dropdown">
                {PAINT_TYPES.map((t) => (
                  <button
                    key={t.type}
                    type="button"
                    className={'pp-type-item' + (paint.type === t.type ? ' active' : '')}
                    onClick={() => {
                      setTypeOpen(false);
                      void switchType(t.type);
                    }}
                  >
                    <span className="pp-type-item-icon">{t.icon}</span>
                    <span className="pp-type-item-label">{t.label}</span>
                    {paint.type === t.type && <IconCheck size={14} className="pp-type-item-check" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span className="pp-title">{title}</span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {paint.type !== 'IMAGE' && (
            <button
              type="button"
              className="icon-btn"
              title="Conta-gotas (pressione 'I')"
              onClick={async () => {
                const hexColor = await pickColorWithEyeDropper();
                if (!hexColor) return;
                const normalized = normalizeHex(hexColor);
                if (!normalized) return;
                if (paint.type === 'SOLID') {
                  onChange({ ...paint, color: normalized }, false);
                } else if (paint.type === 'GRADIENT_LINEAR' || paint.type === 'GRADIENT_RADIAL') {
                  const stops = paint.stops.map((s, i) => (i === 0 ? { ...s, color: normalized } : s));
                  onChange({ ...paint, stops }, false);
                }
              }}
            >
              <IconEyeDropper size={16} />
            </button>
          )}
          <button className="icon-btn" title="Fechar" onClick={onClose}>
            <IconClose size={20} />
          </button>
        </div>
      </div>

      {paint.type === 'SOLID' ? (
        <SolidEditor paint={paint} onChange={onChange} docColors={docColors} />
      ) : paint.type === 'IMAGE' ? (
        <div className="pp-image">
          <div className="pp-preview cp-alpha">
            {src && (
              <img
                src={src}
                alt=""
                style={{
                  objectFit:
                    paint.scaleMode === 'FILL'
                      ? 'cover'
                      : paint.scaleMode === 'FIT'
                        ? 'contain'
                        : 'fill',
                }}
              />
            )}
          </div>

          <div className="cp-row" style={{ marginTop: 10 }}>
            {/* Segmented Control para o modo de escala (evita select nativo branco) */}
            <div className="pp-scale-mode-group">
              {(['FILL', 'FIT', 'STRETCH'] as ScaleMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={'pp-scale-mode-btn' + (paint.scaleMode === m ? ' active' : '')}
                  onClick={() => onChange({ ...paint, scaleMode: m }, false)}
                >
                  {SCALE_LABELS[m]}
                </button>
              ))}
            </div>

            <NumberField
              className="cp-opacity"
              value={paint.opacity}
              displayScale={100}
              suffix="%"
              min={0}
              max={1}
              onChange={(v, live) => onChange({ ...paint, opacity: v }, live)}
            />
          </div>

          {src && (
            <button
              type="button"
              className="cp-ai-btn"
              disabled={isRemovingBg}
              onClick={async () => {
                try {
                  setIsRemovingBg(true);
                  store.toast('Recortando plano de fundo com IA...');
                  const { removeImageBackground } = await import('../../canvas/backgroundRemoval');
                  const cutout = await removeImageBackground(src, (msg: string) => store.toast(msg));
                  const newId = addImageToDoc(store.state.doc, cutout);
                  onChange({ ...paint, imageId: newId }, false);
                  store.toast('Fundo removido com sucesso!');
                } catch (err: any) {
                  store.toast(`Erro: ${err?.message || 'Falha ao remover fundo'}`);
                } finally {
                  setIsRemovingBg(false);
                }
              }}
            >
              <IconSparkles size={14} />
              {isRemovingBg ? 'Processando recorte IA...' : 'Remover plano de fundo (IA)'}
            </button>
          )}

          <button
            type="button"
            className="btn secondary full"
            style={{ marginTop: 6 }}
            onClick={async () => {
              const id = await chooseImage();
              if (id) onChange({ ...paint, imageId: id }, false);
            }}
          >
            Escolher outra imagem…
          </button>
        </div>
      ) : (
        <GradientEditor paint={paint} onChange={onChange} docColors={docColors} />
      )}
    </div>,
    document.body,
  );
}

function interpolateColor(stops: ColorStop[], pos: number): { color: string; opacity: number } {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  if (pos <= sorted[0].position) return { color: sorted[0].color, opacity: sorted[0].opacity };
  if (pos >= sorted[sorted.length - 1].position) {
    const last = sorted[sorted.length - 1];
    return { color: last.color, opacity: last.opacity };
  }
  let prev = sorted[0];
  let next = sorted[1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (pos >= sorted[i].position && pos <= sorted[i + 1].position) {
      prev = sorted[i];
      next = sorted[i + 1];
      break;
    }
  }
  const span = next.position - prev.position;
  const factor = span === 0 ? 0 : (pos - prev.position) / span;
  const c1 = hexToRgb(prev.color);
  const c2 = hexToRgb(next.color);
  const r = Math.round(c1.r + (c2.r - c1.r) * factor);
  const g = Math.round(c1.g + (c2.g - c1.g) * factor);
  const b = Math.round(c1.b + (c2.b - c1.b) * factor);
  const opacity = Math.round((prev.opacity + (next.opacity - prev.opacity) * factor) * 100) / 100;
  return { color: rgbToHex({ r, g, b }), opacity };
}

/**
 * Editor profissional de gradientes (Linear e Radial) com barra interativa de paradas.
 */
function GradientEditor({
  paint,
  onChange,
  docColors,
}: {
  paint: GradientPaint;
  onChange: (p: Paint, live: boolean) => void;
  docColors: string[];
}) {
  const [stopIndex, setStopIndex] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const safeIndex = Math.min(stopIndex, paint.stops.length - 1);
  const stop = paint.stops[safeIndex] ?? paint.stops[0];

  const updateStopColor = (color: string, opacity: number, live: boolean) => {
    const nextStops = paint.stops.map((s, i) => (i === safeIndex ? { ...s, color, opacity } : s));
    onChange({ ...paint, stops: nextStops }, live);
  };

  const updateStopPos = (index: number, position: number, live: boolean) => {
    const nextStops = paint.stops.map((s, i) => (i === index ? { ...s, position } : s));
    onChange({ ...paint, stops: nextStops }, live);
  };

  const addStopAt = (pos: number) => {
    const interpolated = interpolateColor(paint.stops, pos);
    const newStop: ColorStop = { position: pos, ...interpolated };
    const nextStops = [...paint.stops, newStop].sort((a, b) => a.position - b.position);
    const newIndex = nextStops.indexOf(newStop);
    setStopIndex(newIndex);
    onChange({ ...paint, stops: nextStops }, false);
  };

  const removeCurrentStop = () => {
    if (paint.stops.length <= 2) return;
    const nextStops = paint.stops.filter((_, i) => i !== safeIndex);
    setStopIndex(Math.max(0, safeIndex - 1));
    onChange({ ...paint, stops: nextStops }, false);
  };

  const invertStops = () => {
    const reversed = paint.stops
      .map((s) => ({ ...s, position: Math.round((1 - s.position) * 100) / 100 }))
      .sort((a, b) => a.position - b.position);
    onChange({ ...paint, stops: reversed }, false);
  };

  // Preview CSS da barra de gradiente
  const sortedStops = [...paint.stops].sort((a, b) => a.position - b.position);
  const gradCss = `linear-gradient(to right, ${sortedStops
    .map((s) => `${rgba(s.color, s.opacity)} ${Math.round(s.position * 100)}%`)
    .join(', ')})`;

  const angle = paint.angle ?? 90;

  return (
    <div className="cp-gradient">
      {/* Barra interativa de gradiente */}
      <div className="cp-grad-bar-wrapper">
        <div
          ref={barRef}
          className="cp-grad-bar cp-alpha"
          title="Clique na barra para adicionar uma parada de cor"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('.cp-grad-handle')) return;
            const rect = barRef.current?.getBoundingClientRect();
            if (!rect) return;
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            addStopAt(Math.round(pos * 100) / 100);
          }}
        >
          <div className="cp-grad-bar-fill" style={{ background: gradCss }} />
          {paint.stops.map((s, i) => (
            <div
              key={i}
              className={'cp-grad-handle' + (i === safeIndex ? ' active' : '')}
              style={{ left: `${s.position * 100}%` }}
              title={`Parada ${i + 1}: ${Math.round(s.position * 100)}% (${s.color})`}
              onPointerDown={(e) => {
                e.stopPropagation();
                setStopIndex(i);
                const bar = barRef.current;
                if (!bar) return;
                (e.target as HTMLElement).setPointerCapture(e.pointerId);

                const onMove = (me: PointerEvent) => {
                  const r = bar.getBoundingClientRect();
                  const p = Math.max(0, Math.min(1, (me.clientX - r.left) / r.width));
                  updateStopPos(i, Math.round(p * 100) / 100, true);
                };

                const onUp = (ue: PointerEvent) => {
                  window.removeEventListener('pointermove', onMove);
                  window.removeEventListener('pointerup', onUp);
                  const r = bar.getBoundingClientRect();
                  const p = Math.max(0, Math.min(1, (ue.clientX - r.left) / r.width));
                  updateStopPos(i, Math.round(p * 100) / 100, false);
                };

                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
              }}
            >
              <div
                className="cp-grad-handle-inner"
                style={{ background: rgba(s.color, s.opacity) }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Controles de Paradas e Ângulo */}
      <div className="cp-grad-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 550 }}>
            Parada {safeIndex + 1}/{paint.stops.length} ({Math.round(stop.position * 100)}%)
          </span>
          <button
            type="button"
            className="cp-grad-btn"
            title="Inverter ordem das cores"
            onClick={invertStops}
          >
            ⇄ Inverter
          </button>
          {paint.stops.length > 2 && (
            <button
              type="button"
              className="cp-grad-btn"
              title="Excluir esta parada"
              onClick={removeCurrentStop}
              style={{ color: '#ff7070' }}
            >
              <IconMinus size={11} />
            </button>
          )}
        </div>

        {paint.type === 'GRADIENT_LINEAR' && (
          <div className="cp-grad-angles" title="Ângulo do gradiente">
            {[0, 45, 90, 180].map((a) => (
              <button
                key={a}
                type="button"
                className={'cp-grad-btn' + (angle === a ? ' active' : '')}
                onClick={() => onChange({ ...paint, angle: a }, false)}
              >
                {a}°
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Editor da cor da parada selecionada */}
      <SolidEditor
        paint={{ type: 'SOLID', color: stop.color, opacity: stop.opacity, visible: true }}
        docColors={docColors}
        onChange={(solidPaint, live) => {
          if (solidPaint.type === 'SOLID') {
            updateStopColor(solidPaint.color, solidPaint.opacity, live);
          }
        }}
      />
    </div>
  );
}
