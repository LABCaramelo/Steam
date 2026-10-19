import { workshop } from './workshop-config.js';
import { createScrollScenes } from './workshop-motion.js';

const currency = value => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 2
}).format(value);

function configureOffer() {
  const lot = Math.min(workshop.lots.length - 1, Math.max(0, workshop.currentLot));
  document.querySelectorAll('[data-dates]').forEach(node => { node.textContent = workshop.dates; });
  document.querySelectorAll('[data-price]').forEach(node => { node.textContent = currency(workshop.lots[lot]); });
  document.querySelectorAll('[data-lot-label], .hero-lot > span').forEach(node => {
    node.textContent = lot === 0 ? 'PRIMEIRO LOTE' : 'SEGUNDO LOTE';
  });
  document.querySelectorAll('.lot-steps > span').forEach((node, index) => {
    node.textContent = `${index + 1}º lote · ${currency(workshop.lots[index]).replace(',00', '')}`;
  });
  document.querySelector('[data-format]').textContent = workshop.format || 'A confirmar';
  document.querySelector('[data-hours]').textContent = workshop.dailyHours || 'A confirmar';
  const link = document.querySelector('[data-enrollment]');
  // Only a supplied HTTP(S) checkout activates the enrollment flow.
  let checkout = null;
  try {
    const url = workshop.checkoutUrl && new URL(workshop.checkoutUrl);
    if (url && ['https:', 'http:'].includes(url.protocol)) checkout = url.href;
  } catch { /* Keep the honest contact fallback for invalid configuration. */ }
  if (checkout) {
    link.href = checkout;
    link.firstChild.textContent = `Quero participar por ${currency(workshop.lots[lot])}`;
    document.querySelector('[data-enrollment-note]').textContent = 'Confira as condições da turma na página de inscrição.';
  } else {
    const subject = encodeURIComponent('Workshop Sites que se sentem · 13 e 14 de novembro');
    link.href = `mailto:${workshop.contactEmail}?subject=${subject}`;
  }
  document.querySelectorAll('.lot-steps > span').forEach((node, index) => node.classList.toggle('current', index === lot));
}

function initialize() {
  configureOffer();
  const body = document.body;
  const cleanups = [];
  let lenis = null;
  const listen = (node, type, callback, options) => {
    node.addEventListener(type, callback, options);
    cleanups.push(() => node.removeEventListener(type, callback, options));
  };
  const range = document.getElementById('experience-range');
  const comparison = document.querySelector('.comparison');
  let manualComparison = false;
  const compare = () => {
    // 0 is the static page; 100 reveals the immersive experience.
    comparison.style.setProperty('--split', `${100 - Number(range.value)}%`);
    comparison.closest('.comparison-section').style.setProperty('--experience', String(Number(range.value) / 100));
    range.setAttribute('aria-valuetext', `${range.value}% de experiência imersiva`);
  };
  listen(range, 'input', () => { manualComparison = true; compare(); });
  const comparisonControl = {
    auto(value) {
      if (manualComparison || document.activeElement === range) return;
      range.value = String(Math.round(value));
      compare();
    },
    release() { if (document.activeElement !== range) manualComparison = false; }
  };
  compare();
  const playground = document.querySelector('.art-interaction');
  playground.querySelectorAll('button[data-atmosphere]').forEach(button => {
    listen(button, 'click', () => {
      playground.dataset.atmosphere = button.dataset.atmosphere;
      playground.querySelectorAll('button').forEach(node => node.setAttribute('aria-pressed', String(node === button)));
      playground.querySelector('.demo-response').textContent = button.dataset.atmosphere === 'orange'
        ? 'A ideia ganhou direção.' : 'A mesma ideia encontrou outra atmosfera.';
    });
  });
  const lessonLinks = [...document.querySelectorAll('.curriculum-sidebar nav a')];
  const lessons = lessonLinks.map(link => document.querySelector(link.getAttribute('href')));
  const visibleLessons = new Map();
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visibleLessons.set(entry.target, entry.intersectionRatio);
      else visibleLessons.delete(entry.target);
    });
    const active = [...visibleLessons.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!active) return;
    lessonLinks.forEach((link, index) => {
      if (lessons[index] === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-15% 0px -30% 0px', threshold: [0, .25, .5, .75, 1] });
  lessons.forEach(node => observer.observe(node));
  cleanups.push(() => observer.disconnect());

  listen(document, 'click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    event.preventDefault();
    const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header')) + 24;
    const top = target.getBoundingClientRect().top + scrollY - offset;
    // Native keyboard/focus navigation remains usable during smooth scrolling.
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
      const removeTabindex = () => target.removeAttribute('tabindex');
      target.addEventListener('blur', removeTabindex, { once: true });
    }
    target.focus({ preventScroll: true });
    if (lenis) lenis.scrollTo(Math.max(0, top), { duration: .7 });
    else window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
    history.replaceState(null, '', link.hash);
  });

  const { gsap, ScrollTrigger, Lenis } = window;
  let media = null;
  if (gsap && ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    media = gsap.matchMedia();
    media.add({
      reduced: '(prefers-reduced-motion: reduce)',
      fine: '(hover: hover) and (pointer: fine)',
      stage: '(min-width: 1000px) and (min-height: 700px)',
      all: '(min-width: 0px)'
    }, context => {
      const { reduced, fine, stage } = context.conditions;
      const off = new URLSearchParams(location.search).get('motion') === 'off';
      body.dataset.workshopMotion = off ? 'off' : reduced ? 'reduced' : fine && stage ? 'full' : 'flow';
      if (off || reduced) return;
      const localCleanups = [];
      if (fine && Lenis) {
        const localLenis = new Lenis({ lerp: .075, smoothWheel: true, syncTouch: false });
        lenis = localLenis;
        localLenis.on('scroll', ScrollTrigger.update);
        const ticker = time => { if (!document.hidden) localLenis.raf(time * 1000); };
        gsap.ticker.add(ticker);
        const keyboard = event => {
          if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
          if (!['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) return;
          if (event.target.closest('input,textarea,select,button') || event.target.isContentEditable) return;
          if (localLenis.isScrolling === 'smooth') localLenis.reset();
        };
        document.addEventListener('keydown', keyboard);
        localCleanups.push(() => {
          document.removeEventListener('keydown', keyboard);
          gsap.ticker.remove(ticker);
          localLenis.destroy();
          if (lenis === localLenis) lenis = null;
        });
      }
      gsap.from('.hero-content > *', { y: 25, duration: .9, stagger: .08, ease: 'power3.out' });
      gsap.to('.page-progress i', { scaleX: 1, ease: 'none', scrollTrigger: {
        trigger: document.documentElement, start: 'top top', end: 'max', scrub: true
      } });
      document.querySelectorAll('.section-heading h2').forEach(node => {
        gsap.from(node, { y: 28, duration: .8, ease: 'power2.out', scrollTrigger: {
          trigger: node, start: 'top 90%', once: true
        } });
      });
      localCleanups.push(createScrollScenes({ gsap, full: fine && stage, comparison: comparisonControl }));
      if (fine && stage) {
        const hero = document.querySelector('.ws-hero');
        const pointer = document.querySelector('.hero-pointer-layer');
        let bounds = null;
        const tiltX = gsap.quickTo(pointer, 'rotationX', { duration: .6, ease: 'power2.out' });
        const tiltY = gsap.quickTo(pointer, 'rotationY', { duration: .6, ease: 'power2.out' });
        const enter = () => { bounds = hero.getBoundingClientRect(); };
        const move = event => {
          if (!bounds || event.target.closest('a,button,input')) return;
          tiltY(((event.clientX - bounds.left) / bounds.width - .5) * 6);
          tiltX(-((event.clientY - bounds.top) / bounds.height - .5) * 4);
        };
        const reset = () => { bounds = null; tiltX(0); tiltY(0); };
        hero.addEventListener('pointerenter', enter);
        hero.addEventListener('pointermove', move);
        hero.addEventListener('pointerleave', reset);
        window.addEventListener('scroll', reset, { passive: true });
        window.addEventListener('blur', reset);
        localCleanups.push(() => {
          hero.removeEventListener('pointerenter', enter);
          hero.removeEventListener('pointermove', move);
          hero.removeEventListener('pointerleave', reset);
          window.removeEventListener('scroll', reset);
          window.removeEventListener('blur', reset);
          tiltX.tween.kill(); tiltY.tween.kill();
          pointer.style.removeProperty('transform');
        });
      }
      document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
      return () => { localCleanups.reverse().forEach(cleanup => cleanup()); };
    });
  } else body.dataset.workshopMotion = 'off';

  let disposed = false;
  body.dataset.workshopReady = 'true';
  const dispose = event => {
    if (event.persisted || disposed) return;
    disposed = true;
    media?.revert();
    cleanups.reverse().forEach(cleanup => cleanup());
    window.removeEventListener('pagehide', dispose);
  };
  window.addEventListener('pagehide', dispose);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();
