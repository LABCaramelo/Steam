import { type Pt, applyMat, fmtNum } from './geometry';
import { LABEL_FONT, frameLabels, getSelectionFrame } from './hitTest';
import type { OverlayState } from './controller';
import {
  CAROUSEL_SLIDE_WIDTH,
  getPage,
  getCarouselPages,
  isCarouselNode,
  worldCorners,
  worldMatrix,
} from '../model/document';
import type { EditorState } from '../store/store';

export const BLUE = '#0D99FF';
export const PURPLE = '#9747FF';
const GUIDE = '#F24822';

function polyline(ctx: CanvasRenderingContext2D, pts: Pt[], close = true) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  if (close) ctx.closePath();
}

function handle(ctx: CanvasRenderingContext2D, p: Pt, angle: number, size = 8, stroke = BLUE) {
  ctx.save();
  ctx.translate(Math.round(p.x) + 0.5, Math.round(p.y) + 0.5);
  ctx.rotate(angle);
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.strokeRect(-size / 2, -size / 2, size, size);
  ctx.restore();
}

function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, bg = BLUE) {
  ctx.font = '500 11px Inter, "Segoe UI", sans-serif';
  const w = ctx.measureText(text).width + 8;
  const h = 16;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(Math.round(x - w / 2), Math.round(y), w, h, 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, Math.round(x), Math.round(y) + h / 2 + 0.5);
}

export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  s: EditorState,
  ov: OverlayState,
  dpr: number,
  textColor: string,
) {
  const doc = s.doc;
  const cam = s.camera;
  const toScreen = (p: Pt): Pt => ({ x: p.x * cam.zoom + cam.x, y: p.y * cam.zoom + cam.y });
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // rótulos dos frames de nível superior
  ctx.font = LABEL_FONT;
  for (const l of frameLabels(doc, s.pageId, cam)) {
    const selected = s.selection.includes(l.id);
    ctx.save();
    ctx.translate(l.origin.x, l.origin.y);
    ctx.rotate(l.angle);
    ctx.fillStyle = s.hoverId === l.id ? BLUE : selected ? textColor : 'rgba(128,128,128,1)';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillText(l.text, 0, -6);
    ctx.restore();
  }

  // guias e divisores visíveis do Carrossel Instagram
  const activePage = getPage(doc, s.pageId);
  if (activePage) {
    for (const id of activePage.children) {
      const n = doc.nodes[id];
      if (!n || n.type !== 'FRAME' || !n.visible) continue;
      const m = worldMatrix(doc, id);
      const isSelected = s.selection.includes(n.id);

      // Divisores verticais de páginas do carrossel
      if (isCarouselNode(n)) {
        const pages = getCarouselPages(n);
        if (pages > 1) {
          ctx.save();
          ctx.strokeStyle = isSelected ? 'rgba(37, 191, 255, 0.9)' : 'rgba(37, 191, 255, 0.5)';
          ctx.lineWidth = isSelected ? 1.5 : 1;
          ctx.setLineDash([6, 4]);

          for (let i = 1; i < pages; i++) {
            const top = toScreen(applyMat(m, { x: i * CAROUSEL_SLIDE_WIDTH, y: 0 }));
            const btm = toScreen(applyMat(m, { x: i * CAROUSEL_SLIDE_WIDTH, y: n.height }));
            ctx.beginPath();
            ctx.moveTo(Math.round(top.x) + 0.5, Math.round(top.y));
            ctx.lineTo(Math.round(btm.x) + 0.5, Math.round(btm.y));
            ctx.stroke();
          }
          ctx.restore();

          // Badges das páginas do carrossel
          for (let i = 0; i < pages; i++) {
            const p0 = toScreen(applyMat(m, { x: i * CAROUSEL_SLIDE_WIDTH, y: 0 }));
            const p1 = toScreen(applyMat(m, { x: (i + 1) * CAROUSEL_SLIDE_WIDTH, y: 0 }));
            const cx = (p0.x + p1.x) / 2;
            const cy = Math.min(p0.y, p1.y);
            const label = i === 0 ? '1 • Capa' : i === pages - 1 ? `${i + 1} • CTA Final` : `Slide ${i + 1}`;
            const pillBg = isSelected ? '#25BFFF' : 'rgba(16, 16, 20, 0.85)';
            pill(ctx, label, cx, cy - 20, pillBg);
          }
        }
      }

      // Linhas guias personalizadas do nó
      if (n.guides && n.guides.length > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 112, 26, 0.75)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        for (const g of n.guides) {
          if (g.axis === 'x') {
            const p1 = toScreen(applyMat(m, { x: g.offset, y: 0 }));
            const p2 = toScreen(applyMat(m, { x: g.offset, y: n.height }));
            ctx.beginPath();
            ctx.moveTo(Math.round(p1.x) + 0.5, Math.round(p1.y));
            ctx.lineTo(Math.round(p2.x) + 0.5, Math.round(p2.y));
            ctx.stroke();
          } else {
            const p1 = toScreen(applyMat(m, { x: 0, y: g.offset }));
            const p2 = toScreen(applyMat(m, { x: n.width, y: g.offset }));
            ctx.beginPath();
            ctx.moveTo(Math.round(p1.x), Math.round(p1.y) + 0.5);
            ctx.lineTo(Math.round(p2.x), Math.round(p2.y) + 0.5);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }
  }

  // contorno do nó sob o mouse
  if (s.hoverId && doc.nodes[s.hoverId] && !s.selection.includes(s.hoverId)) {
    const n = doc.nodes[s.hoverId];
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 1.5;
    if (n.type === 'LINE') {
      const c = worldCorners(doc, n.id).map(toScreen);
      polyline(ctx, [c[0], c[1]], false);
    } else polyline(ctx, worldCorners(doc, n.id).map(toScreen));
    ctx.stroke();
  }

  // contornos individuais da seleção
  const selected = s.selection.filter((id) => doc.nodes[id]);
  const isComponentOrInstance = selected.length === 1 && (doc.nodes[selected[0]]?.type === 'COMPONENT' || doc.nodes[selected[0]]?.type === 'INSTANCE');
  const selColor = isComponentOrInstance ? PURPLE : BLUE;

  ctx.strokeStyle = selColor;
  ctx.lineWidth = 1;
  if (selected.length > 1)
    for (const id of selected) {
      polyline(ctx, worldCorners(doc, id).map(toScreen));
      ctx.stroke();
    }

  const sf = getSelectionFrame(doc, selected);
  if (sf?.kind === 'line') {
    const a = toScreen(sf.a);
    const b = toScreen(sf.b);
    polyline(ctx, [a, b], false);
    ctx.stroke();
    if (!s.editingTextId) {
      handle(ctx, a, 0, 8, selColor);
      handle(ctx, b, 0, 8, selColor);
    }
  } else if (sf?.kind === 'box') {
    const cs = sf.corners.map(toScreen);
    ctx.strokeStyle = selColor;
    ctx.lineWidth = 1;
    polyline(ctx, cs);
    ctx.stroke();
    if (!s.editingTextId) {
      const angle = Math.atan2(cs[1].y - cs[0].y, cs[1].x - cs[0].x);
      const tiny = Math.hypot(cs[1].x - cs[0].x, cs[1].y - cs[0].y) < 14 && Math.hypot(cs[3].x - cs[0].x, cs[3].y - cs[0].y) < 14;
      for (const c of tiny ? [cs[2]] : cs) handle(ctx, c, angle, 8, selColor);

      const cx = (cs[0].x + cs[2].x) / 2;
      const minY = Math.min(...cs.map((p) => p.y));

      if (isComponentOrInstance) {
        const node = doc.nodes[selected[0]];
        const badge = node.type === 'COMPONENT' ? `❖ ${node.name}` : `◇ ${node.name}`;
        pill(ctx, badge, cx, minY - 22, PURPLE);
      }

      // rótulo de dimensões abaixo da seleção
      pill(ctx, `${fmtNum(sf.width)} × ${fmtNum(sf.height)}`, cx, Math.max(...cs.map((p) => p.y)) + 8);
    }
  }

  // seleção por área
  if (ov.marquee) {
    const a = toScreen({ x: ov.marquee.x, y: ov.marquee.y });
    const w = ov.marquee.width * cam.zoom;
    const h = ov.marquee.height * cam.zoom;
    ctx.fillStyle = 'rgba(13,153,255,0.08)';
    ctx.fillRect(a.x, a.y, w, h);
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5, Math.round(w), Math.round(h));
  }

  // guias de alinhamento
  if (ov.guides.length) {
    ctx.strokeStyle = GUIDE;
    ctx.lineWidth = 1;
    for (const g of ov.guides) {
      const a = toScreen({ x: g.x1, y: g.y1 });
      const b = toScreen({ x: g.x2, y: g.y2 });
      ctx.beginPath();
      ctx.moveTo(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5);
      ctx.lineTo(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5);
      ctx.stroke();
    }
  }

  // medições de distância com Alt
  if (ov.measurements && ov.measurements.length) {
    ctx.strokeStyle = GUIDE;
    ctx.lineWidth = 1;
    for (const m of ov.measurements) {
      const a = toScreen({ x: m.x1, y: m.y1 });
      const b = toScreen({ x: m.x2, y: m.y2 });
      ctx.beginPath();
      ctx.moveTo(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5);
      ctx.lineTo(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5);
      ctx.stroke();
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      pill(ctx, `${Math.round(m.distance)}`, mid.x, mid.y - 8, GUIDE);
    }
  }

  // prévia do lápis
  if (ov.pencil && ov.pencil.length > 1) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2 * cam.zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    polyline(ctx, ov.pencil.map(toScreen), false);
    ctx.stroke();
  }

  if (ov.label) pill(ctx, ov.label.text, ov.label.x, ov.label.y);
}
