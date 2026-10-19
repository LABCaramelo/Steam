export function initMotion(experience) {
  const { gsap, ScrollTrigger, Lenis } = window;
  const root = document.documentElement;
  const reducedPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const disabled = new URLSearchParams(location.search).get('motion') === 'off';
  let lenis = null;
  root.dataset.scenes = 'flow';
  root.dataset.motion = disabled || reducedPreference.matches ? 'reduced' : 'full';

  if (disabled) return { get lenis() { return null; }, destroy() {} };

  if (!gsap || !ScrollTrigger) {
    const updatePreference = () => {
      root.dataset.motion = reducedPreference.matches ? 'reduced' : 'full';
    };
    reducedPreference.addEventListener('change', updatePreference);
    return { get lenis() { return null; }, destroy() { reducedPreference.removeEventListener('change', updatePreference); } };
  }

  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add({
    always: 'all',
    wide: '(min-width: 1000px) and (min-height: 760px)',
    fine: '(hover: hover) and (pointer: fine)',
    reduced: '(prefers-reduced-motion: reduce)'
  }, context => {
    const { wide, fine, reduced } = context.conditions;
    const track = document.getElementById('metodo');
    const plate = document.getElementById('iarp-stage-box');
    const scrub = wide && fine && !reduced && Boolean(track && plate);
    root.dataset.motion = reduced ? 'reduced' : 'full';
    root.dataset.scenes = scrub ? 'scrub' : 'flow';
    experience.setPhaseNavigation(null);
    let active = true;
    let ticker = null;
    let manualUntil = 0;
    let navigationVersion = 0;
    let visibilityHandler = null;
    let keyboardHandler = null;
    let localLenis = null;

    // Wheel smoothing is independent of the space required for cinematic stages.
    if (fine && !reduced && Lenis) {
      localLenis = new Lenis({ lerp: 0.075, smoothWheel: true, wheelMultiplier: 1, syncTouch: false, autoResize: true });
      lenis = localLenis;
      localLenis.on('scroll', ScrollTrigger.update);
      ticker = time => { if (!document.hidden) localLenis.raf(time * 1000); };
      gsap.ticker.add(ticker);
      if (document.getElementById('contact-dialog')?.classList.contains('active')) localLenis.stop();
      // Let native scroll keys take over an in-flight wheel/anchor animation.
      keyboardHandler = event => {
        if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || localLenis.isScrolling !== 'smooth') return;
        if (!['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) return;
        const target = event.target;
        if (target instanceof Element && (target.closest('input,textarea,select') || target.isContentEditable)) return;
        if (event.key === ' ' && target instanceof Element && target.closest('button,[role="button"]')) return;
        manualUntil = 0;
        localLenis.reset();
      };
      document.addEventListener('keydown', keyboardHandler);
    }

    if (scrub) {
      let timeline = null;
      const updatePhase = () => {
        if (timeline && performance.now() >= manualUntil) {
          experience.showPhase(Math.min(3, Math.floor(timeline.progress() * 4)));
        }
      };
      timeline = gsap.timeline({ onUpdate: updatePhase, scrollTrigger: {
        id: 'method', trigger: track, start: 'top top', end: 'bottom bottom', scrub: 0.2,
        invalidateOnRefresh: true,
        onRefresh: updatePhase,
        onToggle: self => plate.classList.toggle('motion-active', self.isActive && !document.hidden)
      }});
      // Only this plate owns its transform. The largest tilt is eight degrees.
      timeline.fromTo(plate, { rotationX: 0, rotationY: 0, y: 0, scale: 1 }, {
        rotationX: 0, rotationY: 0, y: 0, scale: 1, duration: 0.25, ease: 'none'
      }, 0)
        .to(plate, { rotationX: 2, rotationY: -4, y: -4, duration: 0.25, ease: 'none' }, 0.25)
        .to(plate, { rotationX: 4, rotationY: -8, y: 0, duration: 0.25, ease: 'none' }, 0.5)
        .to(plate, { rotationX: 0, rotationY: 0, y: 0, duration: 0.25, ease: 'none' }, 0.75);
      const route = plate.querySelector('.method-route-fill');
      if (route) timeline.fromTo(route, { scaleX: 0, transformOrigin: '0% 50%' }, {
        scaleX: 1, duration: 1, ease: 'none'
      }, 0);
      updatePhase();
      const trigger = timeline.scrollTrigger;
      experience.setPhaseNavigation(index => {
        const request = ++navigationVersion;
        manualUntil = performance.now() + 700;
        const top = trigger.start + (trigger.end - trigger.start) * ((index + 0.5) / 4);
        const complete = () => {
          if (!active || request !== navigationVersion) return;
          manualUntil = 0;
          experience.showPhase(index);
        };
        if (localLenis) localLenis.scrollTo(top, { duration: 0.45, onComplete: complete });
        else window.scrollTo({ top, behavior: 'smooth' });
      });
      visibilityHandler = () => {
        plate.classList.toggle('motion-active', trigger.isActive && !document.hidden);
      };
      document.addEventListener('visibilitychange', visibilityHandler);
      visibilityHandler();
    }

    // Journey measures geometry only on refresh. Frames only update transform/state.
    const chapterLinks = [...document.querySelectorAll('[data-scene-target]')]
      .filter(link => document.getElementById(link.dataset.sceneTarget));
    const chapterSections = chapterLinks.map(link => document.getElementById(link.dataset.sceneTarget));
    const progressFill = document.querySelector('.scroll-progress-fill');
    let currentChapter = -1;
    let offsets = [];
    if (!reduced && progressFill) {
      const setProgress = gsap.quickSetter(progressFill, 'scaleX');
      const measureChapters = () => {
        offsets = chapterSections.map(section => section.getBoundingClientRect().top + window.scrollY);
      };
      const updateChapter = self => {
        setProgress(self.progress);
        const position = self.scroll() + innerHeight * 0.4;
        let index = 0;
        offsets.forEach((offset, i) => { if (position >= offset) index = i; });
        if (index === currentChapter) return;
        currentChapter = index;
        root.dataset.activeScene = chapterSections[index].id;
        chapterLinks.forEach((link, i) => {
          if (i === index) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      };
      measureChapters();
      ScrollTrigger.create({ id: 'journey', start: 0, end: 'max',
        onRefreshInit: measureChapters,
        onRefresh: updateChapter,
        onUpdate: updateChapter
      });
    }

    // Refresh after fonts settle so scene geometry matches actual typography.
    document.fonts?.ready.then(() => { if (active) ScrollTrigger.refresh(); });
    return () => {
      active = false;
      ++navigationVersion;
      experience.setPhaseNavigation(null);
      if (ticker) gsap.ticker.remove(ticker);
      localLenis?.destroy();
      if (lenis === localLenis) lenis = null;
      if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
      if (keyboardHandler) document.removeEventListener('keydown', keyboardHandler);
      plate?.classList.remove('motion-active');
      chapterLinks.forEach(link => link.removeAttribute('aria-current'));
      progressFill?.style.removeProperty('transform');
      delete root.dataset.activeScene;
      root.dataset.scenes = 'flow';
    };
  });
  return { get lenis() { return lenis; }, destroy() { media.revert(); } };
}
