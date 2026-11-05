import { rgba } from './color';
import { getImage } from './images';
import { applyTextStyle, isOpenPath, layoutText, lineX, shapePath } from './shapes';
import { localMatrix } from '../model/document';
import type { DocumentData, Effect, Paint, SceneNode, SolidPaint } from '../model/types';

export interface DrawContext {
  doc: DocumentData;
  /** Quantos pixels do bitmap equivalem a uma unidade do mundo. */
  pxScale: number;
  skipTextId?: string | null;
  /** Apenas a cadeia atual: instâncias irmãs podem repetir o mesmo componente. */
  activeNodes?: Set<string>;
}

const OFFSCREEN = 50000;

export function drawNodeList(ctx: CanvasRenderingContext2D, dc: DrawContext, ids: string[]) {
  for (const id of ids) {
    const n = dc.doc.nodes[id];
    if (n) drawNode(ctx, dc, n);
  }
}

export function drawNode(ctx: CanvasRenderingContext2D, dc: DrawContext, n: SceneNode) {
  if (!n.visible) return;
  const active = (dc.activeNodes ??= new Set<string>());
  if (active.has(n.id)) return;
  active.add(n.id);
  try {
    drawNodeContents(ctx, dc, n);
  } finally {
    active.delete(n.id);
  }
}

function drawNodeContents(ctx: CanvasRenderingContext2D, dc: DrawContext, n: SceneNode) {
  ctx.save();
  ctx.transform(...localMatrix(n));
  ctx.globalAlpha *= n.opacity;

  if (n.type === 'GROUP') {
    drawNodeList(ctx, dc, n.children ?? []);
    ctx.restore();
    return;
  }

  if (n.type === 'BOOLEAN_OPERATION') {
    drawBooleanOperation(ctx, dc, n);
    ctx.restore();
    return;
  }

  if (n.type === 'INSTANCE') {
    drawInstance(ctx, dc, n);
    ctx.restore();
    return;
  }

  const path = shapePath(n);
  const effects = n.effects.filter((e) => e.visible);
  const blur = effects.find((e) => e.type === 'LAYER_BLUR');
  if (blur && blur.radius > 0) ctx.filter = `blur(${(blur.radius * dc.pxScale) / 2}px)`;

  for (const e of effects) {
    if (e.type === 'DROP_SHADOW') drawDropShadow(ctx, dc, n, path, e);
    else if (e.type === 'GLASS') drawGlassBase(ctx, dc, n, path, e);
    else if (e.type === 'BACKGROUND_BLUR') drawBackgroundBlurBase(ctx, dc, n, path, e);
  }

  // Renderiza o desfoque real do que está atrás do nó (backdrop blur)
  for (const e of effects) {
    if (e.type === 'GLASS') {
      const frost = e.frost ?? (e.radius || 4);
      const refraction = e.refraction ?? 80;
      drawBackdropBlur(ctx, dc, n, path, frost, refraction);
    } else if (e.type === 'BACKGROUND_BLUR') {
      drawBackdropBlur(ctx, dc, n, path, e.radius || 16, 0);
    }
  }

  if (n.type === 'TEXT') {
    if (dc.skipTextId !== n.id) {
      for (const f of n.fills) if (f.visible && f.type === 'SOLID') drawTextGlyphs(ctx, n, rgba(f.color, f.opacity));
    }
  } else if (!isOpenPath(n)) {
    const hasGlass = effects.some((e) => e.type === 'GLASS');
    for (const f of n.fills) {
      if (!f.visible) continue;
      // Se houver efeito Vidro ativo e preenchimento for opaco, modula para 20%
      // para que a refração e desfoque do fundo fiquem visíveis imediatamente!
      if (hasGlass && f.opacity > 0.35) {
        paintFill(ctx, dc, n, path, { ...f, opacity: 0.2 });
      } else {
        paintFill(ctx, dc, n, path, f);
      }
    }
  }

  for (const e of effects) {
    if (e.type === 'INNER_SHADOW' && n.type !== 'TEXT') drawInnerShadow(ctx, dc, path, e);
    else if (e.type === 'GLASS') drawGlassOverlay(ctx, dc, n, path, e);
    else if (e.type === 'NOISE') drawNoiseOverlay(ctx, dc, path, e);
    else if (e.type === 'TEXTURE') drawTextureOverlay(ctx, dc, path, e);
    else if (e.type === 'SHADER') drawShaderOverlay(ctx, dc, n, path, e);
  }

  if (n.type === 'FRAME' || n.type === 'COMPONENT') {
    ctx.save();
    if (n.clipsContent) ctx.clip(path);
    drawNodeList(ctx, dc, n.children ?? []);
    ctx.restore();
  }

  drawStrokes(ctx, n, path);
  ctx.restore();
}

function drawBooleanOperation(ctx: CanvasRenderingContext2D, dc: DrawContext, n: SceneNode) {
  const children = (n.children ?? []).map((id) => dc.doc.nodes[id]).filter(Boolean);
  if (!children.length) return;

  const w = Math.max(1, Math.ceil(n.width));
  const h = Math.max(1, Math.ceil(n.height));

  const offCanvas = document.createElement('canvas');
  offCanvas.width = Math.min(4096, Math.max(1, Math.round(w * dc.pxScale)));
  offCanvas.height = Math.min(4096, Math.max(1, Math.round(h * dc.pxScale)));
  const offCtx = offCanvas.getContext('2d');
  if (!offCtx) {
    drawNodeList(ctx, dc, n.children ?? []);
    return;
  }

  offCtx.scale(dc.pxScale, dc.pxScale);
  const op = n.booleanOperation ?? 'UNION';

  drawNode(offCtx, dc, children[0]);

  for (let i = 1; i < children.length; i++) {
    const child = children[i];
    offCtx.save();
    if (op === 'SUBTRACT') {
      offCtx.globalCompositeOperation = 'destination-out';
    } else if (op === 'INTERSECT') {
      offCtx.globalCompositeOperation = 'source-in';
    } else if (op === 'EXCLUDE') {
      offCtx.globalCompositeOperation = 'xor';
    } else {
      offCtx.globalCompositeOperation = 'source-over';
    }
    drawNode(offCtx, dc, child);
    offCtx.restore();
  }

  if (n.fills.length && n.fills.some((f) => f.visible)) {
    offCtx.save();
    offCtx.globalCompositeOperation = 'source-in';
    for (const f of n.fills) {
      if (!f.visible) continue;
      if (f.type === 'SOLID') {
        offCtx.fillStyle = rgba(f.color, f.opacity);
        offCtx.fillRect(0, 0, w, h);
      } else if (f.type === 'GRADIENT_LINEAR' || f.type === 'GRADIENT_RADIAL') {
        const dummyPath = new Path2D();
        dummyPath.rect(0, 0, w, h);
        paintFill(offCtx, dc, n, dummyPath, f);
      }
    }
    offCtx.restore();
  }

  ctx.drawImage(offCanvas, 0, 0, w, h);

  if (n.strokes.length && n.strokeWeight > 0) {
    const path = shapePath(n);
    drawStrokes(ctx, n, path);
  }
}

function drawInstance(ctx: CanvasRenderingContext2D, dc: DrawContext, n: SceneNode) {
  const master = n.componentId ? dc.doc.nodes[n.componentId] : null;
  const path = shapePath(n);
  const fills = n.fills.length ? n.fills : (master?.fills ?? []);
  for (const f of fills) if (f.visible) paintFill(ctx, dc, n, path, f);

  if (master?.children?.length) {
    ctx.save();
    if (n.clipsContent || master.clipsContent) ctx.clip(path);
    drawNodeList(ctx, dc, master.children);
    ctx.restore();
  } else if (n.children?.length) {
    ctx.save();
    if (n.clipsContent) ctx.clip(path);
    drawNodeList(ctx, dc, n.children);
    ctx.restore();
  }

  drawStrokes(ctx, n, path);
}

function setupShadow(ctx: CanvasRenderingContext2D, dc: DrawContext, e: Effect) {
  ctx.shadowColor = rgba(e.color, e.opacity);
  ctx.shadowBlur = e.radius * dc.pxScale;
  ctx.shadowOffsetX = e.x * dc.pxScale - OFFSCREEN;
  ctx.shadowOffsetY = e.y * dc.pxScale;
}

/** Desenha a forma fora da tela e projeta só a sombra de volta. */
function drawDropShadow(ctx: CanvasRenderingContext2D, dc: DrawContext, n: SceneNode, path: Path2D, e: Effect) {
  const m = ctx.getTransform();
  ctx.save();
  ctx.setTransform(m.a, m.b, m.c, m.d, m.e + OFFSCREEN, m.f);
  setupShadow(ctx, dc, e);
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  if (n.type === 'TEXT') {
    drawTextGlyphs(ctx, n, '#000');
  } else if (isOpenPath(n)) {
    ctx.lineWidth = n.strokeWeight;
    ctx.lineCap = n.type === 'VECTOR' ? (n.vectorStrokeCap ?? 'round') : 'round';
    if (n.type === 'VECTOR') ctx.lineJoin = n.vectorStrokeJoin ?? 'round';
    ctx.stroke(path);
  } else {
    ctx.fill(path);
    if (e.spread > 0) {
      ctx.lineWidth = e.spread * 2;
      ctx.lineJoin = n.type === 'VECTOR' ? (n.vectorStrokeJoin ?? 'round') : 'round';
      ctx.stroke(path);
    }
  }
  ctx.restore();
}


// Cache de padrões procedurais de alta performance
let noisePatternCache: CanvasPattern | null = null;
function getNoisePattern(): CanvasPattern | null {
  if (noisePatternCache) return noisePatternCache;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const imgData = ctx.createImageData(64, 64);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.random() * 255;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 45;
  }
  ctx.putImageData(imgData, 0, 0);
  noisePatternCache = ctx.createPattern(c, 'repeat');
  return noisePatternCache;
}

let texturePatternCache: CanvasPattern | null = null;
function getTexturePattern(): CanvasPattern | null {
  if (texturePatternCache) return texturePatternCache;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 14;
  c.height = 14;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.arc(7, 7, 2, 0, Math.PI * 2);
  ctx.fill();
  texturePatternCache = ctx.createPattern(c, 'repeat');
  return texturePatternCache;
}

let backdropScratchCanvas: HTMLCanvasElement | null = null;
function getBackdropScratchCanvas(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (!backdropScratchCanvas) {
    backdropScratchCanvas = document.createElement('canvas');
  }
  return backdropScratchCanvas;
}

/** Captura e desfoca o plano de fundo exatamente atrás da geometria do nó */
function drawBackdropBlur(
  ctx: CanvasRenderingContext2D,
  dc: DrawContext,
  n: SceneNode,
  path: Path2D,
  blurRadius: number,
  refraction: number = 0,
) {
  const mainCanvas = ctx.canvas;
  if (!mainCanvas || mainCanvas.width <= 0 || mainCanvas.height <= 0) return;

  try {
    const m = ctx.getTransform();
    // 4 cantos do nó projetados em coordenadas do canvas de destino
    const p0 = m.transformPoint(new DOMPoint(0, 0));
    const p1 = m.transformPoint(new DOMPoint(n.width, 0));
    const p2 = m.transformPoint(new DOMPoint(n.width, n.height));
    const p3 = m.transformPoint(new DOMPoint(0, n.height));

    const pad = Math.ceil(Math.max(16, blurRadius * 2.5 * dc.pxScale));
    const minX = Math.max(0, Math.floor(Math.min(p0.x, p1.x, p2.x, p3.x) - pad));
    const minY = Math.max(0, Math.floor(Math.min(p0.y, p1.y, p2.y, p3.y) - pad));
    const maxX = Math.min(mainCanvas.width, Math.ceil(Math.max(p0.x, p1.x, p2.x, p3.x) + pad));
    const maxY = Math.min(mainCanvas.height, Math.ceil(Math.max(p0.y, p1.y, p2.y, p3.y) + pad));
    const cropW = maxX - minX;
    const cropH = maxY - minY;

    if (cropW <= 2 || cropH <= 2) return;

    const bCanvas = getBackdropScratchCanvas();
    if (!bCanvas) return;
    if (bCanvas.width < cropW || bCanvas.height < cropH) {
      bCanvas.width = Math.max(bCanvas.width, cropW);
      bCanvas.height = Math.max(bCanvas.height, cropH);
    }
    const bCtx = bCanvas.getContext('2d');
    if (!bCtx) return;

    bCtx.clearRect(0, 0, cropW, cropH);
    bCtx.drawImage(mainCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

    ctx.save();
    ctx.clip(path);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const bPixels = Math.max(1, blurRadius * dc.pxScale * 0.8);
    ctx.filter = `blur(${bPixels}px)`;

    if (refraction > 0) {
      const scale = 1 + (refraction / 100) * 0.05;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
    }

    ctx.drawImage(bCanvas, 0, 0, cropW, cropH, minX, minY, cropW, cropH);
    ctx.restore();
  } catch {
    // Fallback gracioso caso CORS impeça leitura direta do canvas
    ctx.save();
    ctx.clip(path);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fill(path);
    ctx.restore();
  }
}

function drawBackgroundBlurBase(ctx: CanvasRenderingContext2D, _dc: DrawContext, _n: SceneNode, path: Path2D, e: Effect) {
  ctx.save();
  ctx.fillStyle = rgba(e.color || '#ffffff', Math.min(0.2, e.opacity || 0.1));
  ctx.fill(path);
  ctx.restore();
}

function drawGlassBase(ctx: CanvasRenderingContext2D, dc: DrawContext, _n: SceneNode, path: Path2D, e: Effect) {
  const depth = (e.depth ?? (e.spread ? e.spread * 2 : 20)) / 100;
  const intensity = (e.lightIntensity ?? 80) / 100;
  const angleRad = ((e.lightAngle ?? -45) * Math.PI) / 180;
  const lx = Math.cos(angleRad);
  const ly = Math.sin(angleRad);

  ctx.save();
  // Sombra ambiente de contato projetada no sentido oposto à luz
  ctx.shadowColor = `rgba(0, 0, 0, ${0.28 * Math.max(0.3, intensity)})`;
  ctx.shadowBlur = Math.max(6, (8 + depth * 22) * dc.pxScale);
  ctx.shadowOffsetX = -lx * Math.max(2, 5 * depth * dc.pxScale);
  ctx.shadowOffsetY = -ly * Math.max(2, 5 * depth * dc.pxScale);
  ctx.fillStyle = rgba(e.color || '#ffffff', 0.01);
  ctx.fill(path);
  ctx.restore();
}

function drawGlassOverlay(ctx: CanvasRenderingContext2D, dc: DrawContext, n: SceneNode, path: Path2D, e: Effect) {
  const angle = e.lightAngle ?? -45;
  const intensity = (e.lightIntensity ?? 80) / 100;
  const depth = (e.depth ?? (e.spread ? e.spread * 2 : 20)) / 100;
  const dispersion = (e.dispersion ?? 50) / 100;
  const splay = (e.splay ?? 0) / 100;

  const rad = (angle * Math.PI) / 180;
  const lx = Math.cos(rad);
  const ly = Math.sin(rad);

  const cx = n.width / 2;
  const cy = n.height / 2;
  const dist = Math.max(n.width, n.height) / 2;

  ctx.save();
  ctx.clip(path);

  // 1. Brilho especular de superfície orientado pelo vetor da luz
  const x0 = cx + lx * dist;
  const y0 = cy + ly * dist;
  const x1 = cx - lx * dist;
  const y1 = cy - ly * dist;
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);

  const sheen = intensity * 0.45;
  grad.addColorStop(0, `rgba(255, 255, 255, ${sheen})`);
  grad.addColorStop(0.25 + splay * 0.15, `rgba(255, 255, 255, ${sheen * 0.25})`);
  grad.addColorStop(0.7 - splay * 0.15, 'rgba(255, 255, 255, 0.01)');
  grad.addColorStop(1, `rgba(0, 0, 0, ${sheen * 0.2})`);

  ctx.fillStyle = grad;
  ctx.fill(path);

  // 2. Dispersão cromática (prismática) na borda se dispersion > 0
  if (dispersion > 0) {
    const dispOffset = Math.max(0.75, 1.5 * dc.pxScale * dispersion);
    // Franja Ciano na direção da luz
    ctx.save();
    ctx.translate(lx * dispOffset, ly * dispOffset);
    ctx.strokeStyle = `rgba(37, 191, 255, ${0.35 * dispersion * intensity})`;
    ctx.lineWidth = Math.max(1, 1.2 * dc.pxScale);
    ctx.stroke(path);
    ctx.restore();

    // Franja Magenta no lado oposto
    ctx.save();
    ctx.translate(-lx * dispOffset, -ly * dispOffset);
    ctx.strokeStyle = `rgba(255, 61, 141, ${0.35 * dispersion * intensity})`;
    ctx.lineWidth = Math.max(1, 1.2 * dc.pxScale);
    ctx.stroke(path);
    ctx.restore();
  }

  // 3. Bisel de reflexo especular na borda (facing light)
  const strokeGrad = ctx.createLinearGradient(x0, y0, x1, y1);
  strokeGrad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, intensity * 0.95)})`);
  strokeGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
  strokeGrad.addColorStop(1, `rgba(255, 255, 255, ${Math.min(0.3, intensity * 0.15)})`);

  ctx.strokeStyle = strokeGrad;
  ctx.lineWidth = Math.max(1, (1 + depth * 3) * dc.pxScale);
  ctx.stroke(path);

  ctx.restore();
}

function drawNoiseOverlay(ctx: CanvasRenderingContext2D, _dc: DrawContext, path: Path2D, e: Effect) {
  const pat = getNoisePattern();
  if (!pat) return;
  ctx.save();
  ctx.clip(path);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = Math.min(1, Math.max(0, e.opacity ?? 0.25));
  ctx.fillStyle = pat;
  ctx.fill(path);
  ctx.restore();
}

function drawTextureOverlay(ctx: CanvasRenderingContext2D, _dc: DrawContext, path: Path2D, e: Effect) {
  const pat = getTexturePattern();
  if (!pat) return;
  ctx.save();
  ctx.clip(path);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = Math.min(1, Math.max(0, e.opacity ?? 0.35));
  ctx.fillStyle = pat;
  ctx.fill(path);
  ctx.restore();
}

function drawShaderOverlay(ctx: CanvasRenderingContext2D, dc: DrawContext, n: SceneNode, path: Path2D, e: Effect) {
  ctx.save();
  const offset = Math.max(1.5, (e.radius || 6) * dc.pxScale * 0.4);
  ctx.save();
  ctx.translate(-offset, 0);
  ctx.strokeStyle = 'rgba(37, 191, 255, 0.45)';
  ctx.lineWidth = 2 * dc.pxScale;
  ctx.stroke(path);
  ctx.restore();

  ctx.save();
  ctx.translate(offset, 0);
  ctx.strokeStyle = 'rgba(255, 61, 141, 0.45)';
  ctx.lineWidth = 2 * dc.pxScale;
  ctx.stroke(path);
  ctx.restore();

  ctx.clip(path);
  const grad = ctx.createLinearGradient(0, 0, n.width, n.height);
  grad.addColorStop(0, 'rgba(255, 112, 26, 0.2)');
  grad.addColorStop(0.5, 'rgba(118, 87, 255, 0.2)');
  grad.addColorStop(1, 'rgba(37, 191, 255, 0.2)');
  ctx.fillStyle = grad;
  ctx.fill(path);
  ctx.restore();
}

function drawInnerShadow(ctx: CanvasRenderingContext2D, dc: DrawContext, path: Path2D, e: Effect) {
  ctx.save();
  ctx.clip(path);
  const hole = new Path2D();
  hole.rect(-1e5, -1e5, 2e5, 2e5);
  hole.addPath(path);
  const m = ctx.getTransform();
  ctx.setTransform(m.a, m.b, m.c, m.d, m.e + OFFSCREEN, m.f);
  setupShadow(ctx, dc, e);
  ctx.fillStyle = '#000';
  ctx.fill(hole, 'evenodd');
  ctx.restore();
}

function paintFill(ctx: CanvasRenderingContext2D, dc: DrawContext, n: SceneNode, path: Path2D, f: Paint) {
  if (f.type === 'SOLID') {
    ctx.fillStyle = rgba(f.color, f.opacity);
    ctx.fill(path);
    return;
  }
  if (f.type === 'GRADIENT_LINEAR' || f.type === 'GRADIENT_RADIAL') {
    ctx.save();
    ctx.clip(path);
    ctx.globalAlpha *= f.opacity;
    let grad: CanvasGradient;
    if (f.type === 'GRADIENT_LINEAR') {
      const angleRad = ((f.angle ?? 90) * Math.PI) / 180;
      const cx = n.width / 2;
      const cy = n.height / 2;
      const len = Math.max(n.width, n.height) / 2;
      const dx = Math.sin(angleRad) * len;
      const dy = Math.cos(angleRad) * len;
      grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    } else {
      const cx = n.width / 2;
      const cy = n.height / 2;
      const r = Math.max(n.width, n.height) / 2;
      grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    }
    for (const stop of f.stops) {
      grad.addColorStop(Math.min(1, Math.max(0, stop.position)), rgba(stop.color, stop.opacity));
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, n.width, n.height);
    ctx.restore();
    return;
  }
  if (f.type !== 'IMAGE') return;
  ctx.save();
  ctx.clip(path);
  ctx.globalAlpha *= f.opacity;
  const img = getImage(dc.doc, f.imageId);
  if (!img) {
    ctx.fillStyle = '#E6E6E6';
    ctx.fill(path);
    ctx.restore();
    return;
  }
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  let dw = n.width;
  let dh = n.height;
  let dx = 0;
  let dy = 0;
  if (f.scaleMode !== 'STRETCH') {
    const s = f.scaleMode === 'FILL' ? Math.max(n.width / iw, n.height / ih) : Math.min(n.width / iw, n.height / ih);
    dw = iw * s;
    dh = ih * s;
    dx = (n.width - dw) / 2;
    dy = (n.height - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

export function drawTextGlyphs(ctx: CanvasRenderingContext2D, n: SceneNode, style: string) {
  const layout = layoutText(n);
  applyTextStyle(ctx, n);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = style;
  layout.lines.forEach((line, i) => {
    ctx.fillText(line.text, lineX(n, line.width), i * layout.lineHeight + layout.lineHeight / 2);
  });
}

function drawStrokes(ctx: CanvasRenderingContext2D, n: SceneNode, path: Path2D) {
  if (n.type === 'TEXT' || n.strokeWeight <= 0) return;
  const strokes = n.strokes.filter((s): s is SolidPaint => s.visible && s.type === 'SOLID');
  if (!strokes.length) return;
  const open = isOpenPath(n);
  const align = open ? 'CENTER' : n.strokeAlign;
  ctx.save();
  ctx.lineJoin = n.type === 'VECTOR' ? (n.vectorStrokeJoin ?? 'round') : 'miter';
  ctx.lineCap = n.type === 'VECTOR' ? (n.vectorStrokeCap ?? 'round') : 'butt';
  if (align === 'INSIDE') {
    ctx.clip(path);
    ctx.lineWidth = n.strokeWeight * 2;
  } else if (align === 'OUTSIDE') {
    const outer = new Path2D();
    outer.rect(-1e6, -1e6, 2e6, 2e6);
    outer.addPath(path);
    ctx.clip(outer, 'evenodd');
    ctx.lineWidth = n.strokeWeight * 2;
  } else {
    ctx.lineWidth = n.strokeWeight;
  }
  for (const s of strokes) {
    ctx.strokeStyle = rgba(s.color, s.opacity);
    ctx.stroke(path);
    if (n.type === 'LINE' && n.arrowEnd) {
      const size = Math.max(6, n.strokeWeight * 3);
      const head = new Path2D();
      head.moveTo(n.width - size, -size * 0.6);
      head.lineTo(n.width, 0);
      head.lineTo(n.width - size, size * 0.6);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke(head);
    }
  }
  ctx.restore();
}
