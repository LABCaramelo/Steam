/* Caramelo — ponte vanilla de @caramelo/design-system para as páginas estáticas (LP, workshop, biblioteca).
   Reproduz o comportamento dos componentes React do pacote (MagneticButton, SpotlightTabs, ThemeToggle,
   CopyButton, TiltSurface, Surface spotlight) sobre o markup com as classes de public/caramelo/styles.css.
   Delegado no documento: vale para nós inseridos depois. O LAB usa os componentes React direto do pacote. */
(() => {
  'use strict';
  if (window.CarameloInteractions) return;

  const root = document.documentElement;
  const THEME_KEY = 'caramelo-theme'; // mesma chave do ThemeToggle do pacote
  const THEME_COLOR = { dark: '#101014', light: '#FFF4E8' };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = matchMedia('(pointer: coarse)');
  const pointerMotion = () => !coarsePointer.matches && !reducedMotion.matches;

  /* ---------- theme-reveal (ThemeToggle) ---------- */
  function storedTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      return theme === 'light' || theme === 'dark' ? theme : null;
    } catch { return null; }
  }
  const getTheme = () => (root.getAttribute('data-caramelo-theme') === 'light' ? 'light' : 'dark');
  function syncThemeToggles() {
    const theme = getTheme();
    document.querySelectorAll('[data-cm-theme-toggle]').forEach(toggle => {
      toggle.dataset.mode = theme;
      toggle.setAttribute('aria-label', theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro');
      toggle.title = theme === 'dark' ? 'Tema claro' : 'Tema escuro';
    });
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.setAttribute('content', THEME_COLOR[theme]));
  }
  function applyTheme(theme) {
    root.setAttribute('data-caramelo-theme', theme);
    syncThemeToggles();
    window.dispatchEvent(new CustomEvent('caramelo:themechange', { detail: { theme } }));
  }
  function setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* A troca vale só para esta página. */ }
    if (theme === getTheme()) return;
    if (reducedMotion.matches || typeof document.startViewTransition !== 'function') { applyTheme(theme); return; }
    root.setAttribute('data-cm-theme-transition', '');
    document.startViewTransition(() => applyTheme(theme)).finished.finally(() => root.removeAttribute('data-cm-theme-transition'));
  }
  const toggleTheme = () => setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  // O LAB e a biblioteca embutida nele compartilham a escolha.
  window.addEventListener('storage', event => { if (event.key === THEME_KEY) applyTheme(storedTheme() || 'dark'); });

  /* ---------- copy-swap (CopyButton) ---------- */
  const copyTimers = new WeakMap();
  function markCopied(button, copiedLabel = 'Copiado') {
    if (!button) return;
    const status = button.querySelector('[role="status"]')
      || (button.nextElementSibling?.matches('[role="status"]') ? button.nextElementSibling : null);
    const label = button.querySelector('[data-cm-copy-label]');
    if (label && !label.dataset.idle) label.dataset.idle = label.textContent;
    clearTimeout(copyTimers.get(button));
    button.setAttribute('data-copied', '');
    if (label) label.textContent = copiedLabel;
    if (status) status.textContent = copiedLabel;
    copyTimers.set(button, setTimeout(() => {
      button.removeAttribute('data-copied');
      if (label) label.textContent = label.dataset.idle;
      if (status) status.textContent = '';
    }, 1600));
  }
  async function writeClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
      const previousFocus = document.activeElement;
      (document.querySelector('dialog[open]') || document.body).append(area);
      area.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch { /* Informado pelo retorno. */ }
      area.remove();
      previousFocus?.focus?.({ preventScroll: true });
      return copied;
    }
  }
  async function copy(text, button) {
    const copied = await writeClipboard(String(text));
    if (copied) markCopied(button);
    return copied;
  }

  /* ---------- ponteiro: ímã (--cm-mag-*), tilt (--cm-tilt-*) e holofote (--mx/--my) ---------- */
  let magnet = null;
  let tiltSpace = null;
  let frame = 0;
  let lastEvent = null;
  const tiltTarget = space => space.querySelector('.cm-tilt') || space;
  function setMagnet(element, x, y) {
    element.style.setProperty('--cm-mag-x', `${x.toFixed(2)}px`);
    element.style.setProperty('--cm-mag-y', `${y.toFixed(2)}px`);
  }
  function setTilt(space, x, y) {
    const target = tiltTarget(space);
    target.style.setProperty('--cm-tilt-x', `${x.toFixed(2)}deg`);
    target.style.setProperty('--cm-tilt-y', `${y.toFixed(2)}deg`);
  }
  function releaseMagnet() { if (magnet) setMagnet(magnet, 0, 0); magnet = null; }
  function releaseTilt() { if (tiltSpace) setTilt(tiltSpace, 0, 0); tiltSpace = null; }
  const releasePointer = () => { releaseMagnet(); releaseTilt(); };

  function paintPointer() {
    frame = 0;
    const event = lastEvent;
    const target = event.target;
    const surface = target.closest('.cm-surface--spotlight');
    if (surface) {
      const bounds = surface.getBoundingClientRect();
      surface.style.setProperty('--mx', `${event.clientX - bounds.left}px`);
      surface.style.setProperty('--my', `${event.clientY - bounds.top}px`);
    }
    if (!pointerMotion()) return;

    const nextMagnet = target.closest('.cm-magnetic');
    if (nextMagnet !== magnet) releaseMagnet();
    if (nextMagnet && !nextMagnet.disabled && nextMagnet.getAttribute('aria-disabled') !== 'true') {
      magnet = nextMagnet;
      // O retângulo já inclui o deslocamento atual; o centro de repouso é medido sem ele.
      const bounds = magnet.getBoundingClientRect();
      const style = getComputedStyle(magnet);
      const offsetX = parseFloat(style.getPropertyValue('--cm-mag-x')) || 0;
      const offsetY = parseFloat(style.getPropertyValue('--cm-mag-y')) || 0;
      const clamp = value => Math.max(-8, Math.min(8, value));
      setMagnet(magnet,
        clamp((event.clientX - (bounds.left - offsetX + bounds.width / 2)) * 0.3),
        clamp((event.clientY - (bounds.top - offsetY + bounds.height / 2)) * 0.3));
    }

    const nextTilt = target.closest('[data-cm-tilt]');
    if (nextTilt !== tiltSpace) releaseTilt();
    if (nextTilt) {
      tiltSpace = nextTilt;
      if (target.closest('a, button, input, select, textarea')) return; // controles não disparam o tilt
      const max = Number(nextTilt.dataset.cmTilt) || 3.5;
      const bounds = nextTilt.getBoundingClientRect();
      const px = Math.max(-0.5, Math.min(0.5, (event.clientX - bounds.left) / bounds.width - 0.5));
      const py = Math.max(-0.5, Math.min(0.5, (event.clientY - bounds.top) / bounds.height - 0.5));
      setTilt(nextTilt, -py * 2 * max, px * 2 * max);
    }
  }
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || !(event.target instanceof Element)) return;
    lastEvent = event;
    if (!frame) frame = requestAnimationFrame(paintPointer);
  }, { passive: true });
  document.addEventListener('pointerout', event => { if (!event.relatedTarget) releasePointer(); }, { passive: true });
  window.addEventListener('scroll', releaseTilt, { passive: true, capture: true });
  window.addEventListener('blur', releasePointer);

  /* ---------- chromatic-glitch: no toque, a mesma resposta do hover ---------- */
  document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || !(event.target instanceof Element)) return;
    const trigger = event.target.closest('.cm-glitch, .cm-spectrum-trigger');
    if (!trigger) return;
    trigger.removeAttribute('data-cm-glitch-active');
    void trigger.offsetWidth;
    trigger.setAttribute('data-cm-glitch-active', '');
    setTimeout(() => trigger.removeAttribute('data-cm-glitch-active'), 420);
  }, { passive: true });

  /* ---------- spotlight-tabs (SpotlightTabs) ---------- */
  const ACTIVE_TAB = '[aria-selected="true"], [aria-pressed="true"], [aria-current="page"], [aria-current="true"]';
  const tabLists = new Map();
  function measureTabs(list) {
    const tabs = [...list.querySelectorAll('.cm-tabs__tab')];
    const active = tabs.find(tab => tab.matches(ACTIVE_TAB));
    if (list.getAttribute('role') === 'tablist') tabs.forEach(tab => { tab.tabIndex = tab === (active || tabs[0]) ? 0 : -1; });
    if (!active || !active.offsetWidth) return;
    list.style.setProperty('--cm-ind-x', `${active.offsetLeft}px`);
    list.style.setProperty('--cm-ind-w', `${active.offsetWidth}px`);
    if (!list.hasAttribute('data-ready')) requestAnimationFrame(() => list.setAttribute('data-ready', ''));
  }
  function setupTabs(list) {
    if (tabLists.has(list)) return;
    if (!list.querySelector(':scope > .cm-tabs__indicator')) {
      const indicator = document.createElement('span');
      indicator.className = 'cm-tabs__indicator';
      indicator.setAttribute('aria-hidden', 'true');
      list.prepend(indicator);
    }
    let pending = 0;
    const schedule = () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(() => measureTabs(list)); };
    const mutations = new MutationObserver(schedule);
    mutations.observe(list, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-selected', 'aria-pressed', 'aria-current', 'hidden'] });
    const resize = new ResizeObserver(schedule);
    resize.observe(list);
    tabLists.set(list, () => { mutations.disconnect(); resize.disconnect(); cancelAnimationFrame(pending); });
    measureTabs(list);
  }
  document.addEventListener('keydown', event => {
    if (!(event.target instanceof Element)) return;
    const tab = event.target.closest('.cm-tabs__tab');
    const list = tab?.closest('[data-cm-tabs][role="tablist"]');
    if (!list) return;
    const tabs = [...list.querySelectorAll('.cm-tabs__tab')].filter(item => !item.disabled);
    const index = tabs.indexOf(tab);
    const next = { ArrowRight: tabs[(index + 1) % tabs.length], ArrowLeft: tabs[(index - 1 + tabs.length) % tabs.length], Home: tabs[0], End: tabs.at(-1) }[event.key];
    if (!next) return;
    event.preventDefault();
    next.focus();
    if (list.dataset.cmActivation !== 'manual') next.click();
  });

  /* ---------- descoberta e cliques delegados ---------- */
  function scan() {
    tabLists.forEach((cleanup, list) => { if (!list.isConnected) { cleanup(); tabLists.delete(list); } });
    document.querySelectorAll('[data-cm-tabs]').forEach(setupTabs);
    syncThemeToggles();
  }
  let scanFrame = 0;
  new MutationObserver(records => {
    if (scanFrame || !records.some(record => [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1))) return;
    scanFrame = requestAnimationFrame(() => { scanFrame = 0; scan(); });
  }).observe(root, { childList: true, subtree: true });

  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('[data-cm-theme-toggle]')) { toggleTheme(); return; }
    const button = event.target.closest('.cm-copy[data-value], .cm-copy[data-copy-target]');
    if (!button) return;
    const source = button.dataset.copyTarget ? document.querySelector(button.dataset.copyTarget) : null;
    copy(button.dataset.value ?? source?.textContent.trim() ?? '', button);
  });

  const stored = storedTheme();
  if (stored && stored !== getTheme()) applyTheme(stored);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan, { once: true });
  else scan();
  document.fonts?.ready.then(() => tabLists.forEach((_, list) => measureTabs(list)));

  window.CarameloInteractions = { getTheme, setTheme, toggleTheme, copy, markCopied, refresh: scan };
})();
