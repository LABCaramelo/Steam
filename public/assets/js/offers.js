// Card positions stay native. Scroll only directs the short arrival geometry.
export function initOffers() {
  const section = document.getElementById('ofertas');
  const grid = section?.querySelector('.offers-grid');
  const cards = [...(grid?.querySelectorAll('.offer-column') || [])];
  if (!section || !grid || cards.length !== 2) return { destroy() {} };

  const originalMode = section.getAttribute('data-offers-mode');
  const originalTargets = cards.map(card => card.getAttribute('data-offer-scroll-top'));
  let alive = true;
  section.dataset.offersMode = 'flow';

  const restoreTargets = () => cards.forEach((card, index) => {
    const value = originalTargets[index];
    if (value === null) card.removeAttribute('data-offer-scroll-top');
    else card.setAttribute('data-offer-scroll-top', value);
  });
  const restoreMode = () => {
    if (originalMode === null) section.removeAttribute('data-offers-mode');
    else section.setAttribute('data-offers-mode', originalMode);
  };
  const destroyStatic = () => {
    alive = false;
    restoreTargets();
    restoreMode();
  };

  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger || new URLSearchParams(location.search).get('motion') === 'off') {
    restoreTargets();
    return { destroy: destroyStatic };
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
    restoreTargets();
    if (!wide || !fine || reduced) return;

    let active = true;
    const events = new AbortController();
    const timelines = [];
    const headerHeight = () => parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue('--header-height')) || 0;
    const topInset = index => headerHeight() + (index ? 42 : 24);
    section.dataset.offersMode = 'stack';

    // UI anchors need the original document position, even when a later card
    // currently covers a sticky one. Read only on setup/refresh, never per frame.
    const measureTargets = () => {
      if (!active) return;
      const styles = cards.map(card => ['position', 'transform'].map(property => ({
        property, value: card.style.getPropertyValue(property),
        priority: card.style.getPropertyPriority(property)
      })));
      try {
        cards.forEach(card => {
          card.style.setProperty('position', 'static', 'important');
          card.style.setProperty('transform', 'none', 'important');
        });
        const positions = cards.map(card => card.getBoundingClientRect().top + window.scrollY);
        cards.forEach((card, index) => {
          card.dataset.offerScrollTop = String(positions[index]);
        });
      } finally {
        cards.forEach((card, index) => styles[index].forEach(({ property, value, priority }) => {
          if (value) card.style.setProperty(property, value, priority);
          else card.style.removeProperty(property);
        }));
      }
    };

    measureTargets();
    ScrollTrigger.addEventListener('refreshInit', measureTargets);
    ScrollTrigger.addEventListener('refresh', measureTargets);
    cards.forEach((card, index) => {
      const timeline = gsap.timeline({ scrollTrigger: {
        id: `offers-card-${index}`,
        trigger: card,
        start: () => Number(card.dataset.offerScrollTop) - window.innerHeight * .88,
        end: () => Number(card.dataset.offerScrollTop) - topInset(index),
        scrub: .32,
        invalidateOnRefresh: true
      }});
      timeline.fromTo(card, {
        scale: .97, rotation: index ? 1 : -.8, y: 22, opacity: .88
      }, {
        scale: 1, rotation: 0, y: 0, opacity: 1, duration: 1, ease: 'none'
      });
      timelines.push(timeline);
    });

    section.addEventListener('focusin', event => {
      const index = cards.findIndex(card => card.contains(event.target));
      if (index >= 0) timelines[index].progress(1);
    }, { signal: events.signal });

    return () => {
      active = false;
      events.abort();
      ScrollTrigger.removeEventListener('refreshInit', measureTargets);
      ScrollTrigger.removeEventListener('refresh', measureTargets);
      section.dataset.offersMode = 'flow';
      restoreTargets();
    };
  });

  document.fonts?.ready.then(() => { if (alive) ScrollTrigger.refresh(); });
  return { destroy() {
    alive = false;
    media.revert();
    restoreTargets();
    restoreMode();
  } };
}
