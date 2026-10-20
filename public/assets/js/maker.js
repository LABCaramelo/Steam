// One director for the Maker scene: scroll owns the outer sheet/words,
// pointer owns its inner surface, and native controls remain outside both.
export function initMaker(getLenis = () => null) {
  const section = document.querySelector('#sobre');
  const credits = section?.querySelector('.maker-credits');
  const wordStage = section?.querySelector('.maker-words');
  if (!section || !credits || !wordStage) return { destroy() {} };

  const { gsap, ScrollTrigger } = window;
  const originalCredits = [...credits.childNodes];
  const originalWords = [...wordStage.childNodes];
  const originalText = credits.textContent;
  const attributes = ['data-maker-mode', 'data-maker-active'].map(name => [name, section.getAttribute(name)]);
  const creditAttributes = ['role', 'aria-label'].map(name => [name, credits.getAttribute(name)]);
  const beams = [...section.querySelectorAll('.maker-beam')];
  const beamAttributes = beams.map(beam => beam.getAttribute('data-beam-active'));
  const events = new AbortController();
  const buttons = [], words = [];
  const wordLines = [];
  let timeline = null, media = null, mode = 'flow', selected = -1, alive = true;

  const controls = document.createDocumentFragment();
  (originalText.match(/[^/]+|\//g) || []).forEach(piece => {
    if (piece === '/') {
      const separator = document.createElement('span');
      separator.className = 'maker-separator';
      separator.setAttribute('aria-hidden', 'true');
      separator.textContent = piece;
      controls.append(separator);
      return;
    }
    const label = piece.trim();
    if (!label) { controls.append(document.createTextNode(piece)); return; }
    controls.append(document.createTextNode(piece.match(/^\s*/)[0]));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'maker-discipline';
    button.dataset.disciplineIndex = String(buttons.length);
    button.setAttribute('aria-pressed', 'false');
    button.textContent = label;
    controls.append(button, document.createTextNode(piece.match(/\s*$/)[0]));
    buttons.push(button);

    const word = document.createElement('span');
    word.className = 'maker-word';
    word.dataset.wordActive = 'false';
    const lines = label === 'HEAD DE INTERAÇÃO' ? ['HEAD DE', 'INTERAÇÃO'] :
      label === 'DIREÇÃO CRIATIVA' ? ['DIREÇÃO', 'CRIATIVA'] : [label];
    wordLines.push(lines);
    lines.forEach((line, index) => {
      if (index) word.append(document.createElement('br'));
      word.append(document.createTextNode(line));
    });
    words.push(word);
  });
  // Unexpected source content is left as a complete static document.
  if (buttons.length !== 7 || controls.textContent !== originalText) return { destroy() {} };
  credits.replaceChildren(controls);
  credits.setAttribute('role', 'group');
  credits.setAttribute('aria-label', 'Do design aos sistemas');
  wordStage.replaceChildren(...words);

  // Measure only on layout/font changes. Each word fills its available stage
  // using the real Montserrat proportions, with room for accents and depth.
  const ink = document.createElement('canvas').getContext('2d');
  function fitWords() {
    if (!alive || !ink || !wordStage.clientWidth || !wordStage.clientHeight) return;
    const style = getComputedStyle(words[0]);
    const spacing = parseFloat(style.letterSpacing) / parseFloat(style.fontSize) || 0;
    ink.font = `${style.fontWeight} 100px ${style.fontFamily}`;
    words.forEach((word, index) => {
      const advance = Math.max(...wordLines[index].map(line =>
        (ink.measureText(line).width + spacing * 100 * (line.length - 1)) / 100));
      const width = wordStage.clientWidth * .96 / advance;
      const height = wordStage.clientHeight * .86 / (wordLines[index].length * 1.08);
      word.style.fontSize = `${Math.min(width, height).toFixed(2)}px`;
    });
  }
  fitWords();
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(fitWords) : null;
  resize?.observe(wordStage);
  if (!resize) window.addEventListener('resize', fitWords, { signal: events.signal });
  document.fonts?.ready.then(() => { if (alive) fitWords(); });

  function selectDiscipline(index) {
    if (!alive || index === selected) return;
    selected = index;
    section.dataset.makerActive = String(index);
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    words.forEach((word, i) => { word.dataset.wordActive = String(i === index); });
    beams.forEach((beam, i) => { beam.dataset.beamActive = String(i === index); });
  }
  selectDiscipline(0);
  section.dataset.makerMode = mode;

  // In flow (touch, small screens) the words take one unattended lap while the
  // art is in view, so the scene moves without scroll scrub. A tap ends it.
  let tour = null, toured = false;
  const stopTour = () => { clearInterval(tour); tour = null; };
  const endTour = () => { toured = true; stopTour(); };
  const tourObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return stopTour();
    if (tour || toured || mode !== 'flow' || document.documentElement.dataset.motion !== 'full') return;
    tour = setInterval(() => {
      if (!alive || mode !== 'flow' || document.documentElement.dataset.motion !== 'full') return stopTour();
      if (document.hidden) return;
      const next = (selected + 1) % buttons.length;
      selectDiscipline(next);
      if (next === 0) endTour();
    }, 1700);
  }, { threshold: .6 }) : null;
  tourObserver?.observe(section.querySelector('.maker-art') || wordStage);

  buttons.forEach((button, index) => button.addEventListener('click', () => {
    endTour();
    const trigger = timeline?.scrollTrigger;
    if (mode === 'scrub' && trigger) {
      const top = trigger.start + (trigger.end - trigger.start) * ((index + .5) / buttons.length);
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(top, { duration: .75 });
      else window.scrollTo({ top, behavior: 'smooth' });
    } else selectDiscipline(index);
  }, { signal: events.signal }));

  const disabled = new URLSearchParams(location.search).get('motion') === 'off';
  if (gsap && ScrollTrigger && !disabled) {
    gsap.registerPlugin(ScrollTrigger);
    media = gsap.matchMedia();
    media.add({
      always: 'all',
      wide: '(min-width: 1000px) and (min-height: 650px)',
      fine: '(hover: hover) and (pointer: fine)',
      reduced: '(prefers-reduced-motion: reduce)'
    }, context => {
      const { wide, fine, reduced } = context.conditions;
      if (!wide || !fine || reduced) return;
      mode = 'scrub';
      section.dataset.makerMode = mode;
      const sheet = section.querySelector('.maker-scroll-shell');
      const tilt = section.querySelector('.maker-pointer-shell');
      const art = section.querySelector('.maker-art');
      const fan = section.querySelector('.maker-direction-fan');
      const localEvents = new AbortController();
      const quickTweens = [];
      let contextAlive = true;
      const headerHeight = () => document.getElementById('site-header')?.getBoundingClientRect().height || 0;
      const synchronize = () => {
        if (contextAlive && timeline) selectDiscipline(Math.min(6, Math.floor(timeline.progress() * 7)));
      };

      gsap.set(words, { opacity: 0, yPercent: 16 });
      gsap.set(words[0], { opacity: 1, yPercent: 0 });
      timeline = gsap.timeline({ onUpdate: synchronize, scrollTrigger: {
        id: 'maker-story', trigger: section,
        start: () => `top top+=${headerHeight()}`, end: 'bottom bottom',
        scrub: .32, invalidateOnRefresh: true, onRefresh: synchronize
      }});
      timeline.to({ progress: 0 }, { progress: 1, duration: 7, ease: 'none' }, 0);
      // Short cuts leave most of every moment still and readable, in either direction.
      for (let i = 1; i < words.length; i++) {
        timeline.to(words[i - 1], { opacity: 0, yPercent: -16, duration: .16, ease: 'power1.in' }, i - .16);
        timeline.to(words[i], { opacity: 1, yPercent: 0, duration: .16, ease: 'power1.out' }, i);
      }
      timeline.fromTo(sheet, { y: 12 }, { y: 0, duration: 1.3, ease: 'power2.out' }, 0);
      timeline.fromTo(fan, { rotationZ: -12, rotationY: -18 }, { rotationZ: 12, rotationY: 18, duration: 7, ease: 'none' }, 0);
      timeline.fromTo(section.querySelector('#maker-title'), { y: 14 }, { y: 0, duration: 1.3, ease: 'power2.out' }, 0);

      if (art && tilt) {
        const moveX = gsap.quickTo(tilt, 'rotationX', { duration: .4, ease: 'power2.out' });
        const moveY = gsap.quickTo(tilt, 'rotationY', { duration: .4, ease: 'power2.out' });
        quickTweens.push(moveX.tween, moveY.tween);
        art.addEventListener('pointermove', event => {
          if (!contextAlive || event.pointerType === 'touch') return;
          const bounds = art.getBoundingClientRect();
          const x = Math.max(-.5, Math.min(.5, (event.clientX - bounds.left) / bounds.width - .5));
          const y = Math.max(-.5, Math.min(.5, (event.clientY - bounds.top) / bounds.height - .5));
          moveX(-y * 7);
          moveY(x * 7);
        }, { signal: localEvents.signal });
        art.addEventListener('pointerleave', () => { moveX(0); moveY(0); }, { signal: localEvents.signal });
      }
      synchronize();
      document.fonts?.ready.then(() => { if (alive && contextAlive) ScrollTrigger.refresh(); });
      return () => {
        contextAlive = false;
        localEvents.abort();
        quickTweens.forEach(tween => tween.kill());
        timeline = null;
        mode = 'flow';
        section.dataset.makerMode = mode;
      };
    });
  }

  function restore(element, name, value) {
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }
  return { destroy() {
    alive = false;
    stopTour();
    tourObserver?.disconnect();
    media?.revert();
    events.abort();
    resize?.disconnect();
    credits.replaceChildren(...originalCredits);
    wordStage.replaceChildren(...originalWords);
    attributes.forEach(([name, value]) => restore(section, name, value));
    creditAttributes.forEach(([name, value]) => restore(credits, name, value));
    beams.forEach((beam, i) => restore(beam, 'data-beam-active', beamAttributes[i]));
  } };
}
