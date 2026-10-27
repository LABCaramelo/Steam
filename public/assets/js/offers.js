// Scroll directs a reading state, while every paragraph and commercial link stays in flow.
export function initOffers(getLenis = () => null) {
  const section = document.getElementById('infoprodutores') || document.querySelector('.offers-section');
  const grid = section?.querySelector('.offers-grid');
  const cards = [...(grid?.querySelectorAll('.offer-column') || [])];
  if (!section || !grid || !cards.length) return { destroy() {} };

  const originalMode = section.getAttribute('data-offers-mode');
  const { gsap, ScrollTrigger } = window;
  let alive = true;
  section.dataset.offersMode = 'flow';
  const restoreMode = () => {
    if (originalMode === null) section.removeAttribute('data-offers-mode');
    else section.setAttribute('data-offers-mode', originalMode);
  };
  if (!gsap || !ScrollTrigger || new URLSearchParams(location.search).get('motion') === 'off') {
    return { destroy() { alive = false; restoreMode(); } };
  }

  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add({
    always: 'all',
    wide: '(min-width: 1000px) and (min-height: 650px)',
    fine: '(hover: hover) and (pointer: fine)',
    reduced: '(prefers-reduced-motion: reduce)'
  }, context => {
    const { wide, fine, reduced } = context.conditions;
    section.dataset.offersMode = 'flow';
    if (!wide || !fine || reduced) return;

    const phases = [
      { key: 'intro', label: 'Apresentação' },
      { key: 'capabilities', label: 'Possibilidades' },
      { key: 'scope', label: 'Escopo e conversa' }
    ];
    // An unfamiliar card is left untouched rather than guessing its reading order.
    const sources = cards.map(card => {
      const heading = card.querySelector(':scope > .offer-heading');
      const copy = card.querySelector(':scope > .offer-copy');
      const action = card.querySelector(':scope > .offer-action');
      const nodes = [...(copy?.children || [])];
      const capabilities = nodes.findIndex(node => node.matches('.offer-list'));
      const scope = nodes.findIndex((node, index) => index > capabilities && node.matches('.offer-closing'));
      return { card, heading, copy, action, nodes, capabilities, scope };
    });
    if (sources.some(source => !source.heading || !source.copy || !source.action ||
        source.capabilities < 1 || source.scope <= source.capabilities)) return;

    let active = true;
    let refreshFrame = 0;
    let readingLine = 0;
    const events = new AbortController();
    const triggers = [];
    const models = [];
    const listen = (element, type, handler, options = {}) => element.addEventListener(type, handler,
      { ...options, signal: events.signal });
    const clamp = value => Math.max(0, Math.min(1, value));
    const headerHeight = () => document.getElementById('site-header')?.offsetHeight ||
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 80;
    const restoreAttribute = (element, name, value) => {
      if (value === null) element.removeAttribute(name);
      else element.setAttribute(name, value);
    };
    section.dataset.offersMode = 'reading';

    sources.forEach((source, index) => {
      const { card, heading, copy, action, nodes, capabilities, scope } = source;
      const cardNodes = [...card.childNodes];
      const copyNodes = [...copy.childNodes];
      const attributes = ['data-offer-reading', 'data-offer-sticky', 'data-offer-scroll-top']
        .map(name => [name, card.getAttribute(name)]);
      const progressStyle = [card.style.getPropertyValue('--offer-reading-progress'),
        card.style.getPropertyPriority('--offer-reading-progress')];
      const guide = document.createElement('div');
      guide.className = 'offer-reading-guide';
      guide.append(heading);
      const progress = document.createElement('div');
      progress.className = 'offer-reading-progress';
      progress.setAttribute('aria-hidden', 'true');
      progress.append(document.createElement('i'));
      const nav = document.createElement('nav');
      nav.className = 'offer-reading-nav';
      nav.setAttribute('aria-label', `Percurso: ${heading.querySelector('h3')?.textContent.trim() || 'serviço'}`);
      guide.append(progress, nav);
      const groups = [nodes.slice(0, capabilities), nodes.slice(capabilities, scope), nodes.slice(scope)];
      const buttons = [];
      const regions = phases.map((phase, phaseIndex) => {
        const region = document.createElement('div');
        region.className = 'offer-reading-region';
        region.dataset.offerRegion = phase.key;
        region.id = `offer-reading-${index + 1}-${phase.key}`;
        region.tabIndex = -1;
        region.setAttribute('role', 'group');
        region.setAttribute('aria-label', phase.label);
        region.append(...groups[phaseIndex]);
        if (phaseIndex === 2) region.append(action);
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.offerStep = phase.key;
        button.setAttribute('aria-controls', region.id);
        const number = document.createElement('span');
        number.className = 'offer-reading-step-number';
        number.setAttribute('aria-hidden', 'true');
        number.textContent = `0${phaseIndex + 1}`;
        const label = document.createElement('span');
        label.textContent = phase.label;
        button.append(number, label);
        nav.append(button);
        buttons.push(button);
        return region;
      });
      copy.replaceChildren(...regions);
      card.prepend(guide);
      models.push({ card, copy, guide, regions, buttons, cardNodes, copyNodes, attributes,
        progressStyle, bounds: [], start: 0, end: 1, current: -1, focused: null, progress: -1 });
    });

    const paint = (model, scroll = window.scrollY) => {
      if (!active || !model.bounds.length) return;
      const line = scroll + readingLine;
      let index = 0;
      model.bounds.forEach((bound, i) => { if (line >= bound.top) index = i; });
      if (model.focused !== null && model.card.contains(document.activeElement)) index = model.focused;
      const progress = clamp((line - model.start) / Math.max(1, model.end - model.start));
      const rounded = Math.round(progress * 1000) / 1000;
      if (rounded !== model.progress) {
        model.card.style.setProperty('--offer-reading-progress', String(rounded));
        model.progress = rounded;
      }
      if (index === model.current) return;
      model.current = index;
      model.card.dataset.offerReading = phases[index].key;
      model.regions.forEach((region, i) => { region.dataset.offerActive = String(i === index); });
      model.buttons.forEach((button, i) => {
        if (i === index) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
    };
    const measure = () => {
      if (!active) return;
      const header = headerHeight();
      const scroll = window.scrollY;
      readingLine = header + (window.innerHeight - header) * .44;
      models.forEach(model => {
        model.bounds = model.regions.map(region => {
          const rect = region.getBoundingClientRect();
          return { top: rect.top + scroll, bottom: rect.bottom + scroll };
        });
        model.start = model.bounds[0].top;
        model.end = model.bounds.at(-1).bottom;
        model.card.dataset.offerSticky = String(model.guide.offsetHeight <= window.innerHeight - header - 48);
        model.card.dataset.offerScrollTop = String(model.card.getBoundingClientRect().top + scroll);
        paint(model, scroll);
      });
    };
    const refresh = () => {
      if (!active || refreshFrame) return;
      refreshFrame = requestAnimationFrame(() => {
        refreshFrame = 0;
        if (active) ScrollTrigger.refresh();
      });
    };
    const navigate = (model, index) => {
      if (!active) return;
      const region = model.regions[index];
      model.focused = index;
      region.focus({ preventScroll: true });
      paint(model);
      const offset = -readingLine + 20;
      const lenis = typeof getLenis === 'function' ? getLenis() : null;
      if (lenis) lenis.scrollTo(region, { offset, duration: .65 });
      else window.scrollTo({ top: Math.max(0, model.bounds[index].top + offset), behavior: 'smooth' });
    };

    measure();
    ScrollTrigger.addEventListener('refreshInit', measure);
    ScrollTrigger.addEventListener('refresh', measure);
    models.forEach((model, index) => {
      // A duration keeper defers the initial refresh until the other scene
      // directors have finished building their once-only title entrances.
      const timeline = gsap.timeline({ scrollTrigger: {
        id: `offers-reading-${index}`, trigger: model.card,
        start: 'top bottom', end: 'bottom top', scrub: .2,
        onUpdate: self => paint(model, self.scroll()), onRefresh: measure
      } });
      timeline.to({ progress: 0 }, { progress: 1, duration: 1, ease: 'none' });
      triggers.push(timeline);
      model.buttons.forEach((button, phaseIndex) => listen(button, 'click', () => navigate(model, phaseIndex)));
      listen(model.card, 'focusin', event => {
        const index = model.regions.findIndex(region => region.contains(event.target));
        model.focused = index >= 0 ? index : null;
        paint(model);
      });
      listen(model.card, 'focusout', event => {
        if (!model.card.contains(event.relatedTarget)) { model.focused = null; paint(model); }
      });
    });
    // A deliberate scroll takes control back after choosing a step with the keyboard.
    listen(window, 'wheel', () => { models.forEach(model => { model.focused = null; }); }, { passive: true });
    listen(document, 'keydown', event => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) {
        models.forEach(model => { model.focused = null; });
      }
    });
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(refresh) : null;
    models.forEach(model => { resize?.observe(model.copy); resize?.observe(model.guide); });
    document.fonts?.ready.then(() => { if (active && alive) refresh(); });
    refresh();

    return () => {
      const focused = document.activeElement;
      const focusedModel = models.find(model => model.card.contains(focused));
      const generatedFocus = focusedModel && (focusedModel.buttons.includes(focused) ||
        focusedModel.regions.includes(focused));
      active = false;
      events.abort();
      resize?.disconnect();
      if (refreshFrame) cancelAnimationFrame(refreshFrame);
      ScrollTrigger.removeEventListener('refreshInit', measure);
      ScrollTrigger.removeEventListener('refresh', measure);
      triggers.forEach(timeline => { timeline.scrollTrigger?.kill(); timeline.kill(); });
      models.forEach(model => {
        model.copy.replaceChildren(...model.copyNodes);
        model.card.replaceChildren(...model.cardNodes);
        model.attributes.forEach(([name, value]) => restoreAttribute(model.card, name, value));
        if (model.progressStyle[0]) model.card.style.setProperty('--offer-reading-progress', ...model.progressStyle);
        else model.card.style.removeProperty('--offer-reading-progress');
      });
      section.dataset.offersMode = 'flow';
      // Moving source nodes out of the temporary regions can otherwise drop
      // keyboard focus during a breakpoint or preference change.
      if (focusedModel) {
        if (!generatedFocus && focused?.isConnected) focused.focus({ preventScroll: true });
        else {
          const target = focusedModel.card.querySelector('.offer-heading h3');
          if (target) {
            const tabindex = target.getAttribute('tabindex');
            target.tabIndex = -1;
            target.focus({ preventScroll: true });
            target.addEventListener('blur', () => restoreAttribute(target, 'tabindex', tabindex), { once: true });
          }
        }
      }
    };
  });
  return { destroy() { alive = false; media.revert(); restoreMode(); } };
}
