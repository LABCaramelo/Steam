// Called inside the page's GSAP matchMedia context. Reverting that context
// removes every timeline and restores the natural document flow.
export function createScrollScenes({ gsap, full, comparison }) {
  const header = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header'));
  const scene = (trigger, desktop, mobile) => ({
    trigger, start: desktop && full ? () => `top ${header() + desktop.top}px` : mobile.start,
    end: desktop && full ? desktop.end : mobile.end,
    scrub: .35, invalidateOnRefresh: true
  });

  const comparePoint = { value: 0 };
  comparison.auto(0);
  const compareTimeline = gsap.timeline({ scrollTrigger: {
    ...scene('.comparison-section', { top: 16, end: 'bottom bottom-=16' }, { start: 'top 55%', end: '+=500' }),
    // A short natural passage replaces the stationary scene on touch/mobile.
    end: full ? 'bottom bottom-=16' : () => `+=${Math.min(520, innerHeight * .7)}`,
    onLeave: () => comparison.release(), onLeaveBack: () => comparison.release()
  }, onUpdate: () => comparison.auto(comparePoint.value) });
  compareTimeline.to(comparePoint, { value: 100, duration: .7, ease: 'none' }, .12)
    .to({}, { duration: .18 }, .82);
  compareTimeline.fromTo('.demo-orb', { scale: .8, rotation: -20, y: 25 },
    { scale: 1.08, rotation: 15, y: -20, duration: 1, ease: 'none' }, 0);
  compareTimeline.fromTo('.demo-lines', { rotation: 10 }, { rotation: 80, duration: 1, ease: 'none' }, 0);

  const manifesto = gsap.timeline({ scrollTrigger: scene('.manifesto',
    { top: 0, end: 'bottom bottom' }, { start: 'top 75%', end: 'bottom 80%' }) });
  manifesto.fromTo('.motion-word', { opacity: .42, y: full ? 22 : 8 }, {
    opacity: 1, y: 0, duration: .2, stagger: .07, ease: 'none'
  }, 0);
  manifesto.fromTo('.manifesto-art > span', { xPercent: 8, rotation: -15, scale: .85 },
    { xPercent: -7, rotation: 10, scale: 1.1, duration: 1, ease: 'none' }, 0);
  manifesto.to('.manifesto-art i', { rotation: '+=60', duration: 1, ease: 'none' }, 0);
  if (full) {
    manifesto.fromTo('.token-left', { x: -60, y: 80, rotation: -25, scale: .7 },
      { x: 10, y: -50, rotation: 10, scale: 1.1, duration: 1, ease: 'none' }, 0);
    manifesto.fromTo('.token-right', { x: 80, y: -100, rotation: 30, scale: 1.1 },
      { x: -5, y: 15, rotation: -10, scale: .85, duration: 1, ease: 'none' }, 0);
  }

  const cards = [...document.querySelectorAll('.story-card')];
  const storySection = document.querySelector('.story-section');
  const count = document.querySelector('[data-story-step]');
  if (full) {
    gsap.set(cards, { opacity: 0, yPercent: 0 });
    gsap.set(cards[0], { opacity: 1 });
    let active = -1;
    const story = gsap.timeline({ scrollTrigger: scene(storySection,
      { top: 28, end: 'bottom bottom-=28' }, { start: 'top bottom', end: 'bottom top' }),
    onUpdate() {
      const next = Math.min(2, Math.floor(this.progress() * 3 + .05));
      if (active === next) return;
      active = next;
      count.textContent = String(next + 1).padStart(2, '0');
      storySection.dataset.storyActive = String(next + 1);
    } });
    cards.forEach((card, index) => {
      if (index) {
        story.to(cards[index - 1], { opacity: 0, scale: .96, yPercent: -5, duration: .16, ease: 'none' }, index - .08);
        story.fromTo(card, { opacity: 0, yPercent: 8, scale: 1.03 },
          { opacity: 1, yPercent: 0, scale: 1, duration: .18, ease: 'none', immediateRender: false }, index - .06);
      }
      story.fromTo(card.querySelector('.story-visual'), { scale: .88, y: 25 },
        { scale: 1.02, y: -5, duration: .85, ease: 'none', immediateRender: false }, index);
      story.fromTo(card.querySelector('h3'), { y: 18, opacity: .55 },
        { y: 0, opacity: 1, duration: .24, ease: 'none', immediateRender: false }, index);
    });
    story.to('.story-progress i', { scaleX: 1, duration: 3, ease: 'none' }, 0);
    story.to('.visual-intention > span', { y: -15, stagger: .12, duration: .4, ease: 'none' }, .2);
    story.to('.visual-movement > span:first-child', { y: -20, rotation: -20, duration: .7, ease: 'none' }, 2.1);
    story.to('.visual-movement > span:last-child', { y: 20, rotation: 14, duration: .7, ease: 'none' }, 2.1);
  } else {
    cards.forEach(card => gsap.fromTo(card, { y: 16 }, { y: 0, ease: 'none', scrollTrigger: {
      trigger: card, start: 'top 90%', end: 'top 60%', scrub: true
    } }));
  }

  // The program keeps its semantic articles and sidebar. Only their original
  // decorative compositions are scrubbed; interactive buttons stay stationary.
  const artTimeline = selector => gsap.timeline({ scrollTrigger: {
    trigger: selector, start: 'top 88%', end: 'bottom 45%', scrub: .3, invalidateOnRefresh: true
  } });
  artTimeline('.art-route').fromTo('.route-line i', { scale: .75, y: 22 },
    { scale: 1, y: 0, duration: .4, stagger: .3, ease: 'none' });
  artTimeline('.art-type').fromTo('.type-line', { xPercent: -10, opacity: .5 },
    { xPercent: 0, opacity: 1, duration: .45, stagger: .25, ease: 'none' });
  const frames = [...document.querySelectorAll('.motion-frame')];
  const motion = artTimeline('.art-motion');
  frames.forEach((frame, index) => motion.fromTo(frame, {
    x: 0, y: 0, xPercent: 0, yPercent: 0, rotation: 0, scale: .92
  }, { xPercent: (index - 1) * 20, yPercent: (index - 1) * 18,
    rotation: (index - 1) * 12, scale: 1, duration: 1, ease: 'none'
  }, 0));
  artTimeline('.art-interaction').fromTo('.interactive-object', { rotationY: -25, rotationZ: -15, scale: .8 },
    { rotationY: 30, rotationZ: 15, scale: 1, duration: 1, ease: 'none' });
  const devices = artTimeline('.art-devices');
  devices.fromTo('.device-desktop', { xPercent: 12, rotationY: 12, scale: .9 },
    { xPercent: 0, rotationY: 0, scale: 1, duration: .75, ease: 'none' }, 0);
  devices.fromTo('.device-phone', { xPercent: 40, rotation: 12, yPercent: 15 },
    { xPercent: 0, rotation: 0, yPercent: 0, duration: .7, ease: 'none' }, .3);

  if (full) {
    gsap.to('.hero-scroll-layer', { y: 120, scale: .94, rotationZ: -5, ease: 'none', scrollTrigger: {
      trigger: '.ws-hero', start: 'top top', end: 'bottom top', scrub: .5
    } });
    gsap.to('.hero-content', { y: -45, ease: 'none', scrollTrigger: {
      trigger: '.ws-hero', start: 'top top', end: 'bottom top', scrub: .5
    } });
    gsap.fromTo('.maker-art > b', { rotation: -20, y: 40 }, { rotation: 4, y: -20, ease: 'none', scrollTrigger: {
      trigger: '.maker', start: 'top 85%', end: 'bottom 20%', scrub: .5
    } });
  }
  document.querySelectorAll('.day-grid article, .audience-list article, .offer-card, .maker-art, .faq-items details').forEach(node => {
    gsap.fromTo(node, { y: full ? 45 : 16, scale: full ? .97 : 1 }, {
      y: 0, scale: 1, ease: 'none', scrollTrigger: {
        trigger: node, start: 'top 95%', end: 'top 65%', scrub: .3, invalidateOnRefresh: true
      }
    });
  });
  const final = gsap.timeline({ scrollTrigger: {
    trigger: '.final-section', start: 'top 90%', end: 'bottom bottom', scrub: .4, invalidateOnRefresh: true
  } });
  final.fromTo('.final-art > span', { y: 100, rotation: -10, scale: .85 },
    { y: -60, rotation: 10, scale: 1.05, duration: 1, ease: 'none' }, 0);
  final.to('.final-art i', { rotation: '+=40', duration: 1, ease: 'none' }, 0);
  final.fromTo('.final-section h2', { y: full ? 50 : 12 }, { y: 0, duration: .7, ease: 'none' }, 0);

  return () => {
    delete storySection.dataset.storyActive;
    count.textContent = '01';
    comparison.release();
  };
}
