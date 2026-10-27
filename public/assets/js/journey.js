import { createReadingScenes } from './reading-scenes.js';

// Each surface has one transform owner. Text, links and native disclosures remain
// usable before this enhancement loads, with reduced motion, or without GSAP.
export function initJourney(getLenis = () => null) {
  const root = document.documentElement;
  const { gsap, ScrollTrigger } = window;
  if (!document.body.classList.contains('commercial-home') || !gsap || !ScrollTrigger ||
      new URLSearchParams(location.search).get('motion') === 'off') return { destroy() {} };

  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add({ always: 'all', desktop: '(min-width: 1000px) and (min-height: 800px)',
    reading: '(min-width: 700px) and (min-height: 650px)',
    fine: '(hover: hover) and (pointer: fine)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
    const { desktop, reading, fine, reduced } = context.conditions;
    if (reduced) return;
    const events = new AbortController();
    const restore = [];
    const animations = new Map();
    let alive = true;
    let refreshTimer = 0;
    root.dataset.journey = desktop && fine ? 'full' : 'light';
    const all = selector => [...document.querySelectorAll(selector)];
    const listen = (element, type, handler, options = {}) => element?.addEventListener(type, handler,
      { ...options, signal: events.signal });
    const refresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { if (alive) ScrollTrigger.refresh(); }, 100);
    };
    const scrollTo = element => {
      const offset = -(document.querySelector('#site-header')?.offsetHeight || 80) - 36;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(element, { offset, duration: .7 });
      else window.scrollTo({ top: element.getBoundingClientRect().top + scrollY + offset, behavior: 'smooth' });
    };

    // Chapter separators draw with reading progress, in both scroll directions.
    all('main > section').forEach(section => {
      const meta = section.querySelector('.section-meta');
      if (!meta) return;
      const timeline = gsap.timeline({ scrollTrigger: { id: `journey-${section.id}`,
        trigger: section, start: 'top 80%', end: 'bottom 40%', scrub: .3 } });
      timeline.fromTo(meta, { '--chapter-progress': 0 }, { '--chapter-progress': 1, ease: 'none' });
    });

    // Portfolio: the view moves inside its frame, preserving the real interface.
    all('.project-media > video').forEach((video, index) => {
      const timeline = gsap.timeline({ scrollTrigger: { id: `journey-film-${index}`,
        trigger: video.parentElement, start: 'top bottom', end: 'bottom top', scrub: .4 } });
      timeline.fromTo(video, { yPercent: -3, scale: 1.08 }, { yPercent: 3, scale: 1.08, ease: 'none' });
    });
    const deck = document.querySelector('.cm-featured-deck');
    if (deck && !(desktop && fine)) {
      gsap.timeline({ scrollTrigger: { id: 'journey-editorial-deck', trigger: deck,
        start: 'top 95%', end: 'bottom 20%', scrub: .4 } })
        .fromTo(deck, { y: desktop ? 60 : 20, rotation: -2, scale: .95 },
          { y: desktop ? -24 : 0, rotation: 1, scale: 1, ease: 'none' });
    }

    // Process is a path rather than a static list. Every step stays readable.
    const process = document.querySelector('#como-trabalho');
    const heading = process?.querySelector('#process-title');
    const steps = all('#como-trabalho .process-steps > li');
    if (heading && steps.length && !(reading && fine)) {
      const list = steps[0].parentElement;
      const layout = document.createElement('div');
      const intro = document.createElement('div');
      layout.className = 'journey-process-layout';
      intro.className = 'journey-process-intro';
      heading.before(layout);
      intro.append(heading);
      layout.append(intro, list);
      restore.push(() => { layout.before(heading, list); layout.remove(); });
      const activate = index => {
        steps.forEach((step, i) => {
          step.dataset.processActive = String(i === index);
          step.querySelector('button')?.setAttribute('aria-pressed', String(i === index));
        });
      };
      steps.forEach((step, index) => {
        const number = step.querySelector('.process-number');
        if (!number) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'journey-step-button';
        button.setAttribute('aria-label', `Ir para a etapa ${index + 1}: ${step.querySelector('h3').textContent}`);
        number.before(button);
        button.append(number);
        listen(button, 'click', () => { activate(index); scrollTo(step); });
        restore.push(() => { button.before(number); button.remove(); delete step.dataset.processActive; });
        // A timeline defers refresh until all scenes are built. An immediate
        // standalone trigger can race the existing once-only title reveals.
        gsap.timeline({ scrollTrigger: { id: `journey-step-${index}`, trigger: step,
          start: desktop && fine ? 'top 38%' : 'top 22%',
          end: desktop && fine ? 'bottom 38%' : 'bottom 22%', scrub: .2,
          onEnter: () => activate(index), onEnterBack: () => activate(index) } })
          .fromTo(step, { '--step-progress': 0 }, { '--step-progress': 1, ease: 'none' });
      });
      activate(0);
    }

    if (reading && fine) {
      const scenes = createReadingScenes({ gsap, getLenis, listen, editorial: desktop });
      restore.push(() => scenes.destroy());
    }

    // Native <details> semantics remain intact; interrupted toggles resume from
    // their current visual height. The final layout has no fixed-height trap.
    all('.faq-list details, .case-details').filter(() => Boolean(Element.prototype.animate)).forEach(details => {
      const summary = details.querySelector('summary');
      listen(summary, 'click', event => {
        if (event.defaultPrevented || event.target.closest('a')) return;
        event.preventDefault();
        const before = details.getBoundingClientRect().height;
        const opening = details.dataset.journeyOpening !== undefined
          ? details.dataset.journeyOpening !== 'true' : !details.open;
        animations.get(details)?.cancel();
        details.style.height = '';
        details.style.overflow = '';
        details.open = true;
        const after = opening ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height;
        details.dataset.journeyOpening = String(opening);
        details.style.overflow = 'clip';
        const animation = details.animate([{ height: `${before}px` }, { height: `${after}px` }],
          { duration: 330, easing: 'cubic-bezier(.22,.7,.2,1)' });
        animations.set(details, animation);
        animation.onfinish = () => {
          details.open = opening;
          details.style.removeProperty('height');
          details.style.removeProperty('overflow');
          delete details.dataset.journeyOpening;
          animations.delete(details);
          refresh();
        };
      });
    });

    // Reuse existing visual language for fine-pointer depth. Controls stay still
    // and focus receives the same border/spotlight cue via CSS.
    if (fine) all('.hero-film, .maker-art, .contact-layout').forEach(surface => {
      const target = surface.matches('.hero-film') ? surface.querySelector('video') :
        surface.querySelector('.maker-pointer-shell');
      if (!target) return;
      const x = gsap.quickTo(target, 'rotationY', { duration: .45, ease: 'power2.out' });
      const y = gsap.quickTo(target, 'rotationX', { duration: .45, ease: 'power2.out' });
      listen(surface, 'pointermove', event => {
        if (event.pointerType !== 'mouse' || document.hidden) return;
        const rect = surface.getBoundingClientRect();
        x(((event.clientX - rect.left) / rect.width - .5) * 5);
        y(-((event.clientY - rect.top) / rect.height - .5) * 5);
      }, { passive: true });
      const reset = () => { x(0); y(0); };
      listen(surface, 'pointerleave', reset);
      listen(window, 'blur', reset);
      restore.push(() => { x.tween.kill(); y.tween.kill(); });
    });

    // Education and community conclude the journey with distinct, quiet arrivals.
    all('.archive-steps, .community-path, .contact-direct-card').forEach((surface, index) => {
      gsap.timeline({ scrollTrigger: { id: `journey-closing-${index}`, trigger: surface,
        start: 'top 92%', end: 'top 55%', scrub: .3 } })
        .fromTo(surface, { '--surface-arrival': 0 }, { '--surface-arrival': 1, ease: 'none' });
    });
    const contactCard = document.querySelector('.contact-direct-card');
    if (contactCard) gsap.timeline({ scrollTrigger: { id: 'journey-whatsapp',
      trigger: contactCard, start: 'top 95%', end: 'top 60%', scrub: .35 } })
      .fromTo(contactCard, { y: 28 }, { y: 0, ease: 'none' });
    listen(document, 'load', refresh, { capture: true });
    document.fonts?.ready.then(() => { if (alive) refresh(); });

    return () => {
      alive = false;
      clearTimeout(refreshTimer);
      events.abort();
      animations.forEach((animation, details) => {
        const open = details.dataset.journeyOpening === 'true';
        animation.cancel();
        details.open = open;
        details.style.removeProperty('height');
        details.style.removeProperty('overflow');
        delete details.dataset.journeyOpening;
      });
      restore.reverse().forEach(undo => undo());
      delete root.dataset.journey;
    };
  });
  return { destroy() { media.revert(); } };
}
