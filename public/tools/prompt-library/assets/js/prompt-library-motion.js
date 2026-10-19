(() => {
  'use strict';
  const gsap = window.gsap;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.getElementById('site-header');
  const toggle = document.getElementById('mobile-toggle');
  const drawer = document.getElementById('mobile-drawer');
  const progress = document.querySelector('.scroll-progress-fill');
  const heroVideo = window.PromptHeroVideo.createController({ hero: document.querySelector('.library-hero'), video: document.getElementById('libraryHeroVideo') });
  let heroContext = null;
  let locked = false;
  let savedTop = 0;
  let opener = null;
  let background = [];
  let cards = new Set();
  let lastScrollAt = 0;
  let scrollFrame = 0;
  let scrollExtent = 0;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      entry.target.classList.toggle('in-view', entry.isIntersecting);
      if (!entry.isIntersecting) return;
      if (entry.target.dataset.revealed) return;
      entry.target.dataset.revealed = 'true';
      if (gsap && !reduced.matches && performance.now() - lastScrollAt > 160) gsap.fromTo(entry.target, { y: 16 }, { y: 0, duration: .4, ease: 'power3.out', clearProps: 'transform' });
    });
  }, { threshold: .08 });
  function closeMenu() {
    drawer.classList.remove('active');
    drawer.inert = true;
    drawer.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
  }
  closeMenu();
  toggle.addEventListener('click', () => {
    if (toggle.getAttribute('aria-expanded') === 'true') return closeMenu();
    drawer.classList.add('active');
    drawer.inert = false;
    drawer.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
  });
  matchMedia('(min-width:1000px)').addEventListener('change', closeMenu);
  document.addEventListener('click', event => {
    if (drawer.classList.contains('active') && !drawer.contains(event.target) && !toggle.contains(event.target)) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && drawer.classList.contains('active')) { closeMenu(); toggle.focus(); }
  });
  function updateScroll() {
    header.classList.toggle('scrolled', window.scrollY > 40);
    if (progress) progress.style.transform = `scaleX(${scrollExtent > 0 ? Math.min(1, window.scrollY / scrollExtent) : 0})`;
  }
  function measurePage() { scrollExtent = Math.max(0, document.documentElement.scrollHeight - window.innerHeight); updateScroll(); }
  window.addEventListener('scroll', () => {
    lastScrollAt = performance.now();
    if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; updateScroll(); });
  }, { passive: true });
  window.addEventListener('resize', measurePage, { passive: true });
  new ResizeObserver(measurePage).observe(document.body);
  function configure() {
    heroContext?.revert();
    if (gsap && !reduced.matches) heroContext = gsap.context(() => {
      gsap.from('.title-line>span', { yPercent: 112, rotation: 2, duration: 1.05, stagger: .09, ease: 'power3.out', clearProps: 'transform' });
      gsap.from('.library-hero .section-meta,.library-hero .hero-bottom', { opacity: 0, y: 20, duration: .8, delay: .3, stagger: .1, ease: 'power2.out', clearProps: 'opacity,transform' });
    });
    if (reduced.matches) cards.forEach(card => { gsap?.killTweensOf(card); gsap?.set(card, { clearProps: 'transform,opacity' }); });
  }
  reduced.addEventListener('change', configure);
  window.PromptLibraryMotion = {
    setPreviewsEnabled(value) { heroVideo.setEnabled(value); },
    refreshCards(elements, replace) {
      if (replace) { observer.disconnect(); cards.forEach(card => gsap?.killTweensOf(card)); cards = new Set(); }
      elements.forEach(card => { cards.add(card); observer.observe(card); });
      measurePage();
    },
    lock() {
      if (locked) return;
      savedTop = window.scrollY;
      opener = document.activeElement;
      locked = true;
      heroVideo.setSuspended(true);
      document.documentElement.classList.add('prompt-open');
      background = [...document.body.children].filter(element => !['promptDialog','promptBackdrop'].includes(element.id) && !['SCRIPT','STYLE'].includes(element.tagName)).map(element => [element, element.inert]);
      background.forEach(([element]) => { element.inert = true; });
      closeMenu();
    },
    unlock() {
      if (!locked) return;
      document.documentElement.classList.remove('prompt-open');
      background.forEach(([element, inert]) => { element.inert = inert; });
      background = [];
      window.scrollTo({ top: savedTop, behavior: 'instant' });
      locked = false;
      heroVideo.setSuspended(false);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      opener = null;
    },
    showDialog(dialog) {
      if (gsap && !reduced.matches) gsap.fromTo(dialog, { x: 70, opacity: 0 }, { x: 0, opacity: 1, duration: .4, ease: 'power3.out', clearProps: 'transform,opacity' });
    }
  };
  configure();
  measurePage();
})();
