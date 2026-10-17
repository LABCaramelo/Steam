import { useEffect, useRef, useState } from "react";

const STICKER_IDS = [
  "cadeira",
  "copo",
  "lata",
  "spray",
  "violao",
  "bola",
  "chinelo",
  "onibus",
  "capacete",
  "poste",
  "caneca",
  "caramelo",
  "estrelas",
  "coracao",
  "raio",
  "seta",
  "palmeira",
  "arcos",
  "caderno",
  "bilhete",
];

interface StickerItem {
  id: number;
  sticker: string;
  x: number;
  y: number;
  rotation: number;
  size: number;
}

/**
 * Rastro de Figurinhas Caramelo (pointer-trail)
 * Cria a esteira de figurinhas da cultura urbana e visual oficial Caramelo ao mover o mouse.
 */
export function PointerTrail() {
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const lastPos = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const countRef = useRef(0);

  useEffect(() => {
    // Respeita prefers-reduced-motion e touch
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const onPointerMove = (e: PointerEvent) => {
      // Ignora ponteiro de toque ou caneta
      if (e.pointerType === "touch") return;

      const now = Date.now();
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      const dist = Math.hypot(dx, dy);

      // Dispara a cada 60px percorridos ou 90ms de movimento contínuo
      if (dist < 56 && now - lastPos.current.time < 90) {
        return;
      }

      lastPos.current = { x: e.clientX, y: e.clientY, time: now };

      const sticker = STICKER_IDS[Math.floor(Math.random() * STICKER_IDS.length)];
      const rotation = (Math.random() - 0.5) * 32; // -16deg a +16deg
      const size = Math.floor(36 + Math.random() * 16); // 36px a 52px
      const newItem: StickerItem = {
        id: ++countRef.current,
        sticker,
        x: e.clientX,
        y: e.clientY,
        rotation,
        size,
      };

      setStickers((prev) => {
        const next = [...prev, newItem];
        // Limita o pool a no máximo 14 figurinhas ativas
        return next.length > 14 ? next.slice(next.length - 14) : next;
      });

      // Remove a figurinha após a animação de 1100ms
      setTimeout(() => {
        setStickers((prev) => prev.filter((s) => s.id !== newItem.id));
      }, 1100);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  if (stickers.length === 0) return null;

  return (
    <div className="cm-pointer-trail" aria-hidden="true">
      {stickers.map((s) => (
        <img
          key={s.id}
          src={`/caramelo/stickers/${s.sticker}.webp`}
          alt=""
          className="cm-pointer-trail__item"
          style={{
            left: s.x,
            top: s.y,
            width: s.size,
            height: "auto",
            transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
          }}
          loading="eager"
          decoding="async"
        />
      ))}
    </div>
  );
}
