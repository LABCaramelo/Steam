import { useEffect, useRef, useState, type HTMLAttributes } from "react";

/** As 28 figurinhas canônicas de "rastro mouse.png" (MCP Caramelo · get_brand_asset trail-stickers). */
const TRAIL_STICKERS = [
  "cadeira", "copo", "lata", "spray", "violao", "bola", "chinelo", "onibus", "capacete", "poste",
  "luminaria", "rolo", "caderno", "camera", "bilhete", "caneca", "folha", "planta", "raio", "coracao",
  "olho", "arcos", "caramelo", "palmeira", "estrelas", "coroa", "seta", "conexoes",
];
const ASSET_BASE = "/caramelo/stickers";

/** pointer-trail do motor Caramelo: a cada 64px/85ms, 1100ms por figurinha, pausa de 140ms ao rolar. */
const MIN_DISTANCE = 64;
const MIN_INTERVAL = 85;
const LIFETIME = 1100;
const SCROLL_PAUSE = 140;
const EASING = "cubic-bezier(0.2, 0.65, 0.3, 1)";
/** O rastro nunca cobre controles nem seus alvos. */
const AVOID = 'a,button,input,select,textarea,summary,label,[role="button"],[contenteditable="true"],[tabindex]:not([tabindex="-1"])';

const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** Só existe com mouse/trackpad e movimento completo. */
function useTrailEnabled() {
  const read = () =>
    typeof window !== "undefined" && window.matchMedia(FINE_POINTER).matches && !window.matchMedia(REDUCED_MOTION).matches;
  const [enabled, setEnabled] = useState(read);
  useEffect(() => {
    const queries = [window.matchMedia(FINE_POINTER), window.matchMedia(REDUCED_MOTION)];
    const sync = () => setEnabled(read());
    queries.forEach((q) => q.addEventListener("change", sync));
    return () => queries.forEach((q) => q.removeEventListener("change", sync));
  }, []);
  return enabled;
}

function createPointerTrail(container: HTMLElement, layer: HTMLElement): () => void {
  const slots = Array.from(layer.children as HTMLCollectionOf<HTMLElement>).map((el) => ({ el, animation: null as Animation | null }));
  if (!slots.length || !Element.prototype.animate) return () => {};

  let last: { x: number; y: number; time: number } | null = null;
  let bounds: DOMRect | null = null;
  let controls: DOMRect[] = [];
  let cursor = 0;
  let sequence = 0;
  let suspendedUntil = 0;
  let loaded = false;

  const cancel = (slot: (typeof slots)[number]) => {
    if (slot.animation) {
      slot.animation.onfinish = null;
      slot.animation.cancel();
      slot.animation = null;
    }
    slot.el.dataset.active = "false";
    slot.el.style.opacity = "0";
  };
  const clear = () => {
    slots.forEach(cancel);
    last = null;
    bounds = null;
    controls = [];
  };
  const measure = () => {
    bounds = container.getBoundingClientRect();
    controls = Array.from(container.querySelectorAll<HTMLElement>(AVOID))
      .filter((e) => {
        const s = getComputedStyle(e);
        return s.visibility !== "hidden" && s.display !== "none";
      })
      .map((e) => e.getBoundingClientRect());
  };
  // As figurinhas só são baixadas quando o mouse entra na área.
  const enter = () => {
    if (!loaded) {
      loaded = true;
      layer.querySelectorAll<HTMLImageElement>("img[data-src]").forEach((img) => (img.src = img.dataset.src!));
    }
    measure();
  };

  const move = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || event.buttons || document.hidden) return clear();
    const now = performance.now();
    if (now < suspendedUntil) return;
    if (!bounds) measure();
    if (event.target instanceof Element && event.target.closest(AVOID)) {
      last = null;
      return;
    }
    const point = { x: event.clientX, y: event.clientY, time: now };
    if (!last) {
      last = point;
      return;
    }
    const dx = point.x - last.x;
    const dy = point.y - last.y;
    if (Math.hypot(dx, dy) < MIN_DISTANCE || now - last.time < MIN_INTERVAL) return;

    const b = bounds!;
    const size = Math.min(196, Math.max(130, window.innerWidth * 0.135));
    if (b.height < size + 24 || b.width < size) return;
    const x = Math.max(b.left + size / 2, Math.min(b.right - size / 2, point.x));
    const y = Math.max(b.top + size / 2 + 12, Math.min(b.bottom - size / 2 - 12, point.y));
    const fp = { l: x - size / 2 - 32, r: x + size / 2 + 32, t: y - size / 2 - 24, b: y + size / 2 + 44 };
    if (controls.some((c) => c.width && c.height && fp.l < c.right && fp.r > c.left && fp.t < c.bottom && fp.b > c.top)) {
      last = point;
      return;
    }

    const slot = slots[cursor++ % slots.length];
    cancel(slot);
    const angle = (sequence % 2 ? -1 : 1) * (4 + (sequence % 5));
    const drift = Math.max(-18, Math.min(18, dx * 0.06));
    slot.el.style.width = `${size}px`;
    slot.el.style.height = `${size}px`;
    slot.el.style.left = `${x - b.left - size / 2}px`;
    slot.el.style.top = `${y - b.top - size / 2}px`;
    slot.el.style.zIndex = String(++sequence);
    slot.el.dataset.active = "true";
    const animation = slot.el.animate(
      [
        { opacity: 0, transform: `translate3d(0,14px,0) rotate(${angle - 5}deg) scale(.82)`, offset: 0 },
        { opacity: 1, transform: `translate3d(0,0,0) rotate(${angle}deg) scale(1)`, offset: 0.12 },
        { opacity: 1, transform: `translate3d(${drift * 0.45}px,-4px,0) rotate(${angle}deg) scale(1)`, offset: 0.56 },
        { opacity: 0, transform: `translate3d(${drift}px,22px,0) rotate(${angle + 5}deg) scale(.94)`, offset: 1 },
      ],
      { duration: LIFETIME, easing: EASING, fill: "none" },
    );
    slot.animation = animation;
    animation.onfinish = () => {
      if (slot.animation !== animation) return;
      slot.animation = null;
      slot.el.dataset.active = "false";
    };
    last = point;
  };

  const ac = new AbortController();
  const signal = ac.signal;
  container.addEventListener("pointermove", move, { passive: true, signal });
  container.addEventListener("pointerenter", enter, { passive: true, signal });
  container.addEventListener("pointerleave", clear, { passive: true, signal });
  window.addEventListener(
    "scroll",
    () => {
      suspendedUntil = performance.now() + SCROLL_PAUSE;
      clear();
    },
    { capture: true, passive: true, signal },
  );
  window.addEventListener("resize", clear, { passive: true, signal });
  window.addEventListener("blur", clear, { signal });
  document.addEventListener("visibilitychange", clear, { signal });
  document.addEventListener("pointerdown", clear, { capture: true, passive: true, signal });
  document.addEventListener("focusin", clear, { signal });

  return () => {
    ac.abort();
    clear();
  };
}

/**
 * Rastro de figurinhas Caramelo (pointer-trail) para heróis e rodapés.
 * As figurinhas surgem atrás do cursor dentro desta área, giram alternando o lado e caem.
 * Decorativo: nunca cobre controles, some ao rolar, clicar ou focar, e não existe em touch ou com movimento reduzido.
 */
export function PointerTrail({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const enabled = useTrailEnabled();
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current || !layerRef.current) return;
    return createPointerTrail(containerRef.current, layerRef.current);
  }, [enabled]);

  return (
    <div ref={containerRef} className={`cm-trail cm-trail--stickers ${className ?? ""}`} {...props}>
      {children}
      <div ref={layerRef} className="cm-trail__layer" aria-hidden="true">
        {enabled &&
          TRAIL_STICKERS.map((id) => (
            <div key={id} className="cm-trail__slot" data-active="false">
              <img data-src={`${ASSET_BASE}/${id}.webp`} alt="" draggable={false} decoding="async" />
            </div>
          ))}
      </div>
    </div>
  );
}
