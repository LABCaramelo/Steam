// The portfolio has one scroll director. Card visibility, accessible state and
// video eligibility follow the rendered timeline rather than the scroll target.
export function initWork(getLenis = () => null) {
  const { gsap, ScrollTrigger } = window;
  const showcase = document.querySelector('#work .work-showcase');
  const stage = showcase?.querySelector('.work-stage');
  const cards = [...(showcase?.querySelectorAll('.project-card') || [])];
  const disabled = new URLSearchParams(location.search).get('motion') === 'off';
  if (!gsap || !ScrollTrigger || !showcase || !stage || cards.length < 2 || disabled) {
    return { destroy() {} };
  }

  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add({
    always: 'all',
    wide: '(min-width: 900px) and (min-height: 520px)',
    fine: '(hover: hover) and (pointer: fine)',
    reduced: '(prefers-reduced-motion: reduce)'
  }, context => {
    const { wide, fine, reduced } = context.conditions;
    if (!wide || !fine || reduced) return;

    const selection = showcase.querySelector('.work-selection');
    const controls = [...(selection?.querySelectorAll('button[data-work-index]') || [])];
    const counter = showcase.querySelector('.work-counter');
    const fill = showcase.querySelector('.work-timeline-fill');
    const captions = cards.map(card => card.querySelector('.project-caption'));
    const events = new AbortController();
    const restore = [];
    const counterText = counter?.textContent;
    const selectionHidden = selection?.hidden;
    let alive = true;
    let currentIndex = -1;
    let timeline = null;

    function rememberAttribute(element, attribute) {
      if (!element) return;
      const value = element.getAttribute(attribute);
      restore.push(() => {
        if (value === null) element.removeAttribute(attribute);
        else element.setAttribute(attribute, value);
      });
    }

    rememberAttribute(showcase, 'style');
    showcase.style.setProperty('--work-count', String(cards.length));
    [showcase, stage].forEach(element => {
      rememberAttribute(element, 'data-work-mode');
      element.dataset.workMode = 'scrub';
    });
    cards.forEach(card => {
      ['data-work-active', 'aria-hidden', 'inert'].forEach(attribute => rememberAttribute(card, attribute));
    });
    controls.forEach(button => rememberAttribute(button, 'aria-pressed'));
    if (selection) selection.hidden = false;

    const notify = (index, mode) => showcase.dispatchEvent(new CustomEvent('work:change', {
      bubbles: true, detail: { index, mode }
    }));

    function showProject(index) {
      if (!alive || index === currentIndex) return;
      currentIndex = index;
      cards.forEach((card, i) => {
        const active = i === index;
        card.dataset.workActive = String(active);
        card.setAttribute('aria-hidden', String(!active));
        card.inert = !active;
      });
      controls.forEach(button => {
        button.setAttribute('aria-pressed', String(Number(button.dataset.workIndex) === index));
      });
      if (counter) counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
      notify(index, 'scrub');
    }

    const synchronize = () => {
      if (!timeline || !alive) return;
      const index = Math.min(cards.length - 1, Math.floor(timeline.progress() * cards.length));
      showProject(index);
    };
    const headerHeight = () => document.getElementById('site-header')?.getBoundingClientRect().height || 0;

    // CSS creates the native sticky stage; GSAP only changes its contents.
    // Spatial handoffs and deck edges keep full video surfaces at native scale.
    gsap.set(cards, {
      opacity: 0, xPercent: 0, yPercent: 7, rotationZ: 0, scale: 1,
      force3D: true,
      transformOrigin: '50% 48%', zIndex: index => cards.length - index
    });
    gsap.set(cards[0], {
      opacity: 1, yPercent: 0, scale: 1
    });
    gsap.set(captions.filter(Boolean), { opacity: 0 });
    if (captions[0]) gsap.set(captions[0], { opacity: 1 });
    showProject(0);

    timeline = gsap.timeline({
      onUpdate: synchronize,
      scrollTrigger: {
        id: 'work-sequence', trigger: showcase,
        start: () => `top top+=${headerHeight()}`,
        end: 'bottom bottom', scrub: 0.35,
        invalidateOnRefresh: true,
        onRefresh: synchronize
      }
    });
    // Equal reading intervals surround a brief spatial handoff at each boundary.
    // A duration keeper preserves the final project's full reading interval.
    timeline.to({ progress: 0 }, { progress: 1, duration: cards.length, ease: 'none' }, 0);
    if (fill) {
      timeline.fromTo(fill, { scaleX: 0, transformOrigin: '0% 50%' }, {
        scaleX: 1, duration: cards.length, ease: 'none'
      }, 0);
    }
    cards.slice(1).forEach((card, offset) => {
      const index = offset + 1;
      const start = index - 0.15;
      const direction = index % 2 ? -1 : 1;
      // The outgoing card stays above the deck until it clears the next frame.
      timeline.to(cards[index - 1], {
        xPercent: direction * 72, yPercent: -10,
        duration: 0.3, ease: 'power2.inOut'
      }, start).to(cards[index - 1], {
        opacity: 0, duration: 0.12, ease: 'none'
      }, start + 0.18).to(card, {
        opacity: 1, duration: 0.15, ease: 'power1.out'
      }, start).to(card, {
        yPercent: 0, scale: 1,
        duration: 0.3, ease: 'power2.inOut'
      }, start);
      // Titles exchange after the outgoing label has disappeared, never overlap.
      if (captions[index - 1]) timeline.to(captions[index - 1], {
        opacity: 0, duration: 0.08, ease: 'none'
      }, start);
      if (captions[index]) timeline.to(captions[index], {
        opacity: 1, duration: 0.1, ease: 'none'
      }, start + 0.2);
    });

    controls.forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.workIndex);
      const trigger = timeline.scrollTrigger;
      if (!alive || !Number.isInteger(index) || index < 0 || index >= cards.length || !trigger) return;
      const top = trigger.start + (trigger.end - trigger.start) * ((index + 0.5) / cards.length);
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(top, { duration: 0.65 });
      else window.scrollTo({ top, behavior: 'smooth' });
    }, { signal: events.signal }));

    document.fonts?.ready.then(() => { if (alive) ScrollTrigger.refresh(); });
    synchronize();
    return () => {
      alive = false;
      events.abort();
      restore.reverse().forEach(restoreAttribute => restoreAttribute());
      if (counter) counter.textContent = counterText;
      if (selection) selection.hidden = selectionHidden;
      notify(null, 'flow');
    };
  });
  return { destroy() { media.revert(); } };
}
