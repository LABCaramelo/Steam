const TARGETS = '#hero-track, #comunidade, .site-footer';
const CONTROLS = 'a,button,input,select,textarea,summary,[role="button"],[contenteditable="true"],[tabindex]:not([tabindex="-1"])';
/** As 28 figurinhas canônicas de "rastro mouse.png" (MCP Caramelo · get_brand_asset trail-stickers). */
const STICKERS = [
  'cadeira', 'copo', 'lata', 'spray', 'violao', 'bola', 'chinelo', 'onibus', 'capacete', 'poste',
  'luminaria', 'rolo', 'caderno', 'camera', 'bilhete', 'caneca', 'folha', 'planta', 'raio', 'coracao',
  'olho', 'arcos', 'caramelo', 'palmeira', 'estrelas', 'coroa', 'seta', 'conexoes'
].map(id => `/caramelo/stickers/${id}.webp`);
const POOL_SIZE = STICKERS.length;
const MIN_DISTANCE = 64;
const MIN_INTERVAL = 85;
const LIFETIME = 1100;

/** Mouse-driven decoration: no cursor replacement, scroll lock or permanent RAF. */
export function initPointerTrail() {
  const sections = [...document.querySelectorAll(TARGETS)];
  const root = document.documentElement;
  const disabled = new URLSearchParams(location.search).get('motion') === 'off';
  if (disabled || !sections.length || !Element.prototype.animate) return { destroy() {} };

  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  let renderer = null;
  let destroyed = false;

  function createRenderer() {
    const localEvents = new AbortController();
    const layer = document.createElement('div');
    layer.className = 'pointer-trail-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.inert = true;
    const slots = Array.from({ length: POOL_SIZE }, (_, index) => {
      const image = document.createElement('img');
      image.className = 'pointer-trail-image';
      image.alt = '';
      image.draggable = false;
      image.decoding = 'async';
      // Baixadas só quando o mouse entra numa área com rastro.
      image.dataset.src = STICKERS[index % STICKERS.length];
      image.dataset.active = 'false';
      layer.append(image);
      return { image, animation: null };
    });
    document.body.append(layer);

    let section = null;
    let last = null;
    let controlRects = [];
    let bounds = null;
    let cursor = 0;
    let sequence = 0;
    let suspendedUntil = 0;
    let focused = true;
    let loaded = false;

    const blocked = () => document.hidden || !focused || Boolean(
      document.querySelector('#contact-dialog.active, #mobile-drawer.active'));

    function cancelSlot(slot) {
      if (slot.animation) {
        slot.animation.onfinish = null;
        slot.animation.oncancel = null;
        slot.animation.cancel();
        slot.animation = null;
      }
      slot.image.dataset.active = 'false';
      slot.image.style.opacity = '0';
      slot.image.style.transform = '';
    }

    function clear() {
      slots.forEach(cancelSlot);
      section = null;
      last = null;
      bounds = null;
      controlRects = [];
    }

    function enter(next) {
      clear();
      if (!loaded) {
        loaded = true;
        slots.forEach(slot => { slot.image.src = slot.image.dataset.src; });
      }
      section = next;
      const rect = next.getBoundingClientRect();
      const header = document.getElementById('site-header')?.getBoundingClientRect();
      bounds = {
        left: Math.max(12, rect.left), right: Math.min(innerWidth - 12, rect.right),
        top: Math.max(header?.bottom || 0, rect.top), bottom: Math.min(innerHeight, rect.bottom)
      };
      layer.style.clipPath = `inset(${Math.max(0, bounds.top)}px 0 ${Math.max(0, innerHeight - bounds.bottom)}px 0)`;
      controlRects = [...next.querySelectorAll(CONTROLS)].filter(element => {
        const style = getComputedStyle(element);
        return style.visibility !== 'hidden' && style.display !== 'none';
      }).map(element => element.getBoundingClientRect());
    }

    function move(event) {
      if (event.pointerType !== 'mouse' || event.buttons || blocked()) { clear(); return; }
      const now = performance.now();
      if (now < suspendedUntil) return;
      if (section !== event.currentTarget) enter(event.currentTarget);
      if (event.target instanceof Element && event.target.closest(CONTROLS)) { last = null; return; }
      const point = { x: event.clientX, y: event.clientY, time: now };
      if (!last) { last = point; return; }
      const dx = point.x - last.x, dy = point.y - last.y;
      if (Math.hypot(dx, dy) < MIN_DISTANCE || now - last.time < MIN_INTERVAL) return;

      const width = Math.min(196, Math.max(130, innerWidth * .135));
      const height = width;
      if (!bounds || bounds.bottom - bounds.top < height + 24 || bounds.right - bounds.left < width) return;
      const x = Math.max(bounds.left + width / 2, Math.min(bounds.right - width / 2, point.x));
      const y = Math.max(bounds.top + height / 2 + 12, Math.min(bounds.bottom - height / 2 - 12, point.y));
      const footprint = { left: x - width / 2 - 32, right: x + width / 2 + 32, top: y - height / 2 - 24, bottom: y + height / 2 + 44 };
      // Avoid covering CTAs as well as avoiding their actual pointer targets.
      if (controlRects.some(rect => rect.width && rect.height && footprint.left < rect.right && footprint.right > rect.left && footprint.top < rect.bottom && footprint.bottom > rect.top)) {
        last = point;
        return;
      }

      const slot = slots[cursor++ % slots.length];
      cancelSlot(slot);
      const angle = (sequence % 2 ? -1 : 1) * (4 + sequence % 5);
      const drift = Math.max(-18, Math.min(18, dx * .06));
      slot.image.style.left = `${x - width / 2}px`;
      slot.image.style.top = `${y - height / 2}px`;
      slot.image.style.zIndex = String(++sequence);
      slot.image.dataset.active = 'true';
      const animation = slot.image.animate([
        { opacity: 0, transform: `translate3d(0,14px,0) rotate(${angle - 5}deg) scale(.82)`, offset: 0 },
        { opacity: 1, transform: `translate3d(0,0,0) rotate(${angle}deg) scale(1)`, offset: .12 },
        { opacity: 1, transform: `translate3d(${drift * .45}px,-4px,0) rotate(${angle}deg) scale(1)`, offset: .56 },
        { opacity: 0, transform: `translate3d(${drift}px,22px,0) rotate(${angle + 5}deg) scale(.94)`, offset: 1 }
      ], { duration: LIFETIME, easing: 'cubic-bezier(.2,.65,.3,1)', fill: 'none' });
      slot.animation = animation;
      animation.onfinish = () => {
        if (slot.animation !== animation) return;
        slot.animation = null;
        slot.image.dataset.active = 'false';
      };
      last = point;
    }

    sections.forEach(target => {
      target.addEventListener('pointermove', move, { passive: true, signal: localEvents.signal });
      target.addEventListener('pointerleave', clear, { passive: true, signal: localEvents.signal });
    });
    const scroll = () => { suspendedUntil = performance.now() + 140; clear(); };
    window.addEventListener('scroll', scroll, { capture: true, passive: true, signal: localEvents.signal });
    window.addEventListener('resize', clear, { passive: true, signal: localEvents.signal });
    window.addEventListener('blur', () => { focused = false; clear(); }, { signal: localEvents.signal });
    window.addEventListener('focus', () => { focused = true; clear(); }, { signal: localEvents.signal });
    document.addEventListener('visibilitychange', clear, { signal: localEvents.signal });
    document.addEventListener('pointerdown', clear, { capture: true, passive: true, signal: localEvents.signal });
    document.addEventListener('focusin', clear, { signal: localEvents.signal });
    const overlays = new MutationObserver(clear);
    document.querySelectorAll('#contact-dialog, #mobile-drawer').forEach(overlay => overlays.observe(overlay, { attributes: true, attributeFilter: ['class', 'aria-hidden'] }));

    return () => {
      localEvents.abort();
      overlays.disconnect();
      clear();
      layer.remove();
    };
  }

  function reconcile() {
    if (destroyed) return;
    const enabled = fine.matches && !reduced.matches && root.dataset.motion !== 'reduced';
    if (enabled && !renderer) renderer = createRenderer();
    else if (!enabled && renderer) { renderer(); renderer = null; }
  }

  fine.addEventListener('change', reconcile, { signal: events.signal });
  reduced.addEventListener('change', reconcile, { signal: events.signal });
  const preference = new MutationObserver(reconcile);
  preference.observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  reconcile();
  return {
    destroy() {
      destroyed = true;
      events.abort();
      preference.disconnect();
      renderer?.();
      renderer = null;
    }
  };
}
