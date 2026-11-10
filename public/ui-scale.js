/*
 * Par de /ui-scale.css. Com `zoom: 0.8` na raiz, o navegador passa a medir o mouse
 * (clientX, pageX, offsetX…), os retângulos (getBoundingClientRect) e o tamanho da janela
 * (innerWidth/innerHeight) em pixels de tela, enquanto style.left/top, offsetWidth e
 * scrollTop continuam em pixels de layout. Código que mistura os dois (menus, arrastar,
 * editores com canvas) sai do lugar.
 *
 * O zoom real do navegador mede tudo em pixels de layout. Este script faz o mesmo:
 * converte essas leituras para pixels de layout enquanto a escala estiver ativa, e o
 * inverso em elementFromPoint. Carregue-o logo depois de /ui-scale.css, antes dos outros
 * scripts. Com escala 1 (telas pequenas) nada muda.
 */
(() => {
  'use strict';
  if (window.__uiScale) return;
  const root = document.documentElement;
  let z = 1;
  const read = () => {
    const v = parseFloat(getComputedStyle(root).zoom);
    z = v > 0 && v !== 1 ? v : 1;
  };
  read();
  const mq = matchMedia('(min-width: 1024px)');
  mq.addEventListener?.('change', () => requestAnimationFrame(read));
  window.__uiScale = { get zoom() { return z; } };

  const toLayout = r => new DOMRect(r.x / z, r.y / z, r.width / z, r.height / z);

  function wrapRect(proto) {
    const one = proto.getBoundingClientRect;
    const many = proto.getClientRects;
    if (one) proto.getBoundingClientRect = function () {
      const r = one.call(this);
      return z === 1 ? r : toLayout(r);
    };
    if (many) proto.getClientRects = function () {
      const list = many.call(this);
      if (z === 1) return list;
      const out = Array.from(list, toLayout);
      out.item = i => out[i] ?? null;
      return out;
    };
  }
  wrapRect(Element.prototype);
  if (window.Range) wrapRect(Range.prototype);

  function wrapGetters(proto, props) {
    if (!proto) return;
    for (const prop of props) {
      const d = Object.getOwnPropertyDescriptor(proto, prop);
      if (!d || !d.get || !d.configurable) continue;
      Object.defineProperty(proto, prop, {
        ...d,
        get() {
          const v = d.get.call(this);
          return z === 1 || typeof v !== 'number' ? v : v / z;
        }
      });
    }
  }
  wrapGetters(MouseEvent.prototype, ['clientX', 'clientY', 'pageX', 'pageY', 'x', 'y', 'offsetX', 'offsetY', 'layerX', 'layerY']);
  if (window.Touch) wrapGetters(Touch.prototype, ['clientX', 'clientY', 'pageX', 'pageY']);

  for (const prop of ['innerWidth', 'innerHeight']) {
    const d = Object.getOwnPropertyDescriptor(window, prop);
    if (!d || !d.get || !d.configurable) continue;
    Object.defineProperty(window, prop, {
      ...d,
      get() {
        const v = d.get.call(this);
        return z === 1 ? v : v / z;
      }
    });
  }

  function wrapPoint(proto, name) {
    const orig = proto && proto[name];
    if (!orig) return;
    proto[name] = function (x, y, ...rest) {
      return z === 1 ? orig.call(this, x, y, ...rest) : orig.call(this, x * z, y * z, ...rest);
    };
  }
  for (const name of ['elementFromPoint', 'elementsFromPoint', 'caretRangeFromPoint', 'caretPositionFromPoint']) {
    wrapPoint(Document.prototype, name);
    if (window.ShadowRoot) wrapPoint(ShadowRoot.prototype, name);
  }
})();
