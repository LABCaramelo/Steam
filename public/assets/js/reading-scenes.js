// Reading scenes keep a single composition in the viewport while scroll changes
// its subject. The source document remains the fallback and the source of copy.
export function createReadingScenes({ gsap, getLenis, listen, editorial = true }) {
  const restore = [];
  const navigate = (timeline, index, count) => {
    const trigger = timeline.scrollTrigger;
    if (!trigger) return;
    const top = trigger.start + (trigger.end - trigger.start) * ((index + .5) / count);
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(top, { duration: .65 });
    else window.scrollTo({ top, behavior: 'smooth' });
  };
  const remember = (element, attributes) => {
    const values = attributes.map(name => [name, element.getAttribute(name)]);
    restore.push(() => values.forEach(([name, value]) => {
      if (value === null) element.removeAttribute(name);
      else element.setAttribute(name, value);
    }));
  };

  // One process step at a time, with a readable hold before each handoff.
  const process = document.querySelector('#como-trabalho');
  const heading = process?.querySelector('#process-title');
  const list = process?.querySelector('.process-steps');
  const steps = [...(list?.children || [])];
  if (heading && steps.length === 4) {
    remember(process, ['data-process-mode']);
    process.dataset.processMode = 'stage';
    const track = document.createElement('div');
    const stage = document.createElement('div');
    const intro = document.createElement('div');
    const controls = document.createElement('div');
    const progress = document.createElement('div');
    const fill = document.createElement('span');
    track.className = 'process-reading-track';
    stage.className = 'process-reading-stage';
    intro.className = 'process-reading-intro';
    controls.className = 'process-reading-controls';
    controls.setAttribute('role', 'tablist');
    controls.setAttribute('aria-label', 'Etapas do processo');
    progress.className = 'process-reading-progress';
    progress.setAttribute('aria-hidden', 'true');
    progress.append(fill);
    heading.before(track);
    intro.append(heading, controls, progress);
    stage.append(intro, list);
    track.append(stage);
    restore.push(() => { track.before(heading, list); track.remove(); });
    let timeline;
    let current = -1;
    const buttons = steps.map((step, index) => {
      const number = step.querySelector('.process-number');
      remember(step, ['id', 'role', 'aria-labelledby', 'aria-hidden', 'inert', 'tabindex', 'data-process-active']);
      step.id ||= `process-panel-${index + 1}`;
      step.setAttribute('role', 'tabpanel');
      step.setAttribute('aria-labelledby', `process-tab-${index + 1}`);
      const button = document.createElement('button');
      button.id = `process-tab-${index + 1}`;
      button.type = 'button';
      button.className = 'journey-step-button';
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-label', `${index + 1}: ${step.querySelector('h3').textContent}`);
      button.setAttribute('aria-controls', step.id);
      if (number) {
        const marker = document.createComment('process-number');
        number.before(marker);
        button.append(number);
        restore.push(() => { marker.replaceWith(number); });
      }
      controls.append(button);
      listen(button, 'click', () => navigate(timeline, index, steps.length));
      listen(button, 'keydown', event => {
        const keys = { ArrowRight: (index + 1) % steps.length, ArrowLeft: (index + steps.length - 1) % steps.length,
          Home: 0, End: steps.length - 1 };
        if (!(event.key in keys)) return;
        event.preventDefault();
        const next = keys[event.key];
        buttons[next].focus({ preventScroll: true });
        navigate(timeline, next, steps.length);
      });
      return button;
    });
    const activate = index => {
      if (index === current) return;
      current = index;
      steps.forEach((step, i) => {
        step.dataset.processActive = String(i === index);
        step.inert = i !== index;
        step.setAttribute('aria-hidden', String(i !== index));
        step.tabIndex = i === index ? 0 : -1;
        buttons[i].setAttribute('aria-selected', String(i === index));
        buttons[i].tabIndex = i === index ? 0 : -1;
      });
    };
    const sync = () => activate(Math.min(3, Math.floor(timeline.progress() * 4)));
    gsap.set(steps, { autoAlpha: 0, y: 36 });
    gsap.set(steps[0], { autoAlpha: 1, y: 0 });
    timeline = gsap.timeline({ onUpdate: sync, scrollTrigger: {
      id: 'process-reading', trigger: track,
      start: () => `top top+=${document.querySelector('#site-header').offsetHeight + 28}`,
      end: 'bottom bottom', scrub: .3, invalidateOnRefresh: true, onRefresh: () => { if (timeline) sync(); }
    } });
    timeline.to({ progress: 0 }, { progress: 1, duration: 4, ease: 'none' }, 0);
    timeline.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: 4, ease: 'none' }, 0);
    steps.slice(1).forEach((step, offset) => {
      const start = offset + 1;
      timeline.to(steps[offset], { autoAlpha: 0, y: -30, duration: .2, ease: 'power1.in' }, start - .2)
        .to(step, { autoAlpha: 1, y: 0, duration: .25, ease: 'power2.out' }, start - .06);
    });
    activate(0);
  }

  // The real carousel covers become a four-state editorial scene. The main
  // viewer button opens whichever series the scroll has brought to the front.
  const feature = document.querySelector('.cm-featured-case');
  const cards = [...(feature?.querySelectorAll('.cm-deck-card') || [])];
  const opener = feature?.querySelector('button[data-open-carousel-case]');
  if (editorial && feature && cards.length === 4 && opener) {
    remember(feature, ['data-editorial-scene']);
    remember(opener, ['data-open-carousel-case']);
    feature.dataset.editorialScene = 'true';
    const controls = document.createElement('div');
    controls.className = 'editorial-reading-controls';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Séries de carrosséis');
    feature.querySelector('.cm-featured-case__actions').after(controls);
    restore.push(() => controls.remove());
    let timeline;
    let current = -1;
    const buttons = cards.map((card, index) => {
      remember(card, ['data-editorial-active']);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'journey-step-button';
      button.textContent = String(index + 1).padStart(2, '0');
      button.setAttribute('aria-label', card.getAttribute('aria-label').replace('Abrir', 'Destacar'));
      controls.append(button);
      listen(button, 'click', () => navigate(timeline, index, cards.length));
      listen(card, 'focusin', () => {
        if (card.matches(':focus-visible') && index !== current) navigate(timeline, index, cards.length);
      });
      return button;
    });
    const pose = (index, active) => {
      const depth = (index - active + cards.length) % cards.length;
      return { xPercent: [0, 22, -22, 4][depth], y: [0, 12, 18, 32][depth],
        rotation: [0, 10, -10, 3][depth], scale: [1, .94, .9, .86][depth],
        opacity: [1, .85, .7, .55][depth], zIndex: 5 - depth };
    };
    const sync = () => {
      const index = Math.min(3, Math.floor(timeline.progress() * 4));
      if (index === current) return;
      current = index;
      opener.dataset.openCarouselCase = cards[index].dataset.openCarouselCase;
      cards.forEach((card, i) => { card.dataset.editorialActive = String(i === index); });
      buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    };
    cards.forEach((card, index) => gsap.set(card, pose(index, 0)));
    timeline = gsap.timeline({ onUpdate: sync, scrollTrigger: {
      id: 'editorial-reading', trigger: feature,
      start: () => `top top+=${document.querySelector('#site-header').offsetHeight + 28}`,
      end: 'bottom bottom', scrub: .4, invalidateOnRefresh: true, onRefresh: () => { if (timeline) sync(); }
    } });
    timeline.to({ progress: 0 }, { progress: 1, duration: 4, ease: 'none' }, 0);
    for (let active = 1; active < cards.length; active++) {
      cards.forEach((card, index) => timeline.to(card, { ...pose(index, active), duration: .32,
        ease: 'power2.inOut' }, active - .16));
    }
    sync();
  }
  return { destroy() { restore.reverse().forEach(undo => undo()); } };
}
