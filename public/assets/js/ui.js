// Method controls remain useful without a motion library.
export function createExperience() {
  const phaseButtons = [...document.querySelectorAll('button[data-phase-index]')];
  const phases = [...document.querySelectorAll('.iarp-phase-display')];
  const plate = document.getElementById('iarp-stage-box');
  const events = new AbortController();
  let activePhase = -1;
  let navigatePhase = null;

  function showPhase(index) {
    const next = Math.max(0, Math.min(phases.length - 1, Math.trunc(Number(index)) || 0));
    if (next === activePhase) return;
    activePhase = next;
    phases.forEach((phase, i) => phase.classList.toggle('active', i === activePhase));
    phaseButtons.forEach(button => {
      const selected = Number(button.dataset.phaseIndex) === activePhase;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
      if (selected) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    if (plate) plate.dataset.phase = String(activePhase);
  }

  phaseButtons.forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.phaseIndex);
    showPhase(index);
    navigatePhase?.(activePhase);
  }, { signal: events.signal }));
  showPhase(0);
  return {
    showPhase,
    get activePhase() { return activePhase; },
    setPhaseNavigation(callback) { navigatePhase = callback; },
    destroy() { events.abort(); navigatePhase = null; }
  };
}

export function initNavigation(getLenis) {
  const toggle = document.getElementById('mobile-toggle');
  const drawer = document.getElementById('mobile-drawer');
  const header = document.getElementById('site-header');
  const desktop = matchMedia('(min-width: 1000px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();

  function closeDrawer() {
    drawer?.classList.remove('active');
    if (drawer) {
      drawer.inert = true;
      drawer.setAttribute('aria-hidden', 'true');
    }
    toggle?.setAttribute('aria-expanded', 'false');
  }
  closeDrawer();
  toggle?.addEventListener('click', () => {
    const opening = toggle.getAttribute('aria-expanded') !== 'true';
    if (!opening) return closeDrawer();
    if (drawer) {
      drawer.classList.add('active');
      drawer.inert = false;
      drawer.setAttribute('aria-hidden', 'false');
    }
    toggle.setAttribute('aria-expanded', 'true');
  }, { signal: events.signal });
  desktop.addEventListener('change', closeDrawer, { signal: events.signal });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && drawer?.classList.contains('active')) {
      closeDrawer();
      toggle?.focus({ preventScroll: true });
    }
  }, { signal: events.signal });
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    if (drawer?.classList.contains('active') && !drawer.contains(event.target) && !toggle?.contains(event.target)) closeDrawer();
    const link = event.target.closest('a[href^="#"]');
    if (!link || link.classList.contains('open-modal') || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    let id;
    try { id = decodeURIComponent(link.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id === 'hero' ? 'hero-track' : id);
    if (!target) return;
    event.preventDefault();
    closeDrawer();
    // Full-viewport scenes already reserve header space inside their overlay.
    const offset = target.hasAttribute('data-scroll-viewport') ? 0 : -(header?.getBoundingClientRect().height || 0) - 16;
    // A stacked offer's current rectangle is sticky; its saved flow position
    // leads anchors back to the correct card even from the end of the page.
    const savedOfferTop = Number(target.dataset.offerScrollTop);
    const scrollTarget = target.hasAttribute('data-offer-scroll-top') && Number.isFinite(savedOfferTop)
      ? savedOfferTop : target;
    const navigationFocus = document.activeElement;
    const finish = () => {
      // A delayed smooth-scroll completion must not steal focus from someone
      // who has already entered a game or another control during navigation.
      const currentFocus = document.activeElement;
      if (currentFocus !== navigationFocus && currentFocus !== document.body && !link.contains(currentFocus)) return;
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    };
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(scrollTarget, { offset, duration: 0.8, onComplete: finish });
    else {
      const position = typeof scrollTarget === 'number' ? scrollTarget : target.getBoundingClientRect().top + window.scrollY;
      const top = Math.max(0, position + offset);
      window.scrollTo({ top, behavior: reduced.matches ? 'instant' : 'smooth' });
      finish();
    }
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
  }, { signal: events.signal });
  const scrolled = () => header?.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', scrolled, { passive: true, signal: events.signal });
  scrolled();

  const doors = document.getElementById('doors-split');
  const work = document.getElementById('door-work');
  const learn = document.getElementById('door-learn');
  const emphasize = panel => {
    doors?.classList.toggle('hover-work', panel === work);
    doors?.classList.toggle('hover-learn', panel === learn);
  };
  [work, learn].filter(Boolean).forEach(panel => {
    panel.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' && desktop.matches) emphasize(panel);
    }, { signal: events.signal });
    panel.addEventListener('focusin', () => emphasize(panel), { signal: events.signal });
    panel.addEventListener('click', event => {
      if (event.target.closest('a, button')) return;
      panel.querySelector('.door-link')?.click();
    }, { signal: events.signal });
  });
  doors?.addEventListener('pointerleave', () => {
    if (!doors.contains(document.activeElement)) emphasize(null);
  }, { signal: events.signal });
  doors?.addEventListener('focusout', event => {
    if (!doors.contains(event.relatedTarget)) emphasize(null);
  }, { signal: events.signal });
  return () => events.abort();
}

export function initDialog(getLenis) {
  const dialog = document.getElementById('contact-dialog');
  const closeButton = document.getElementById('dialog-close');
  if (!dialog || !closeButton) return () => {};
  const title = document.getElementById('dialog-title');
  const desc = document.getElementById('dialog-desc');
  const eyebrow = document.getElementById('dialog-eyebrow');
  const events = new AbortController();
  const map = {
    negocio: ['PARA NEGÓCIOS', 'TRABALHAR COM O CARAMELO', 'Conte o que você quer colocar no mundo. Vamos encontrar o melhor formato para o projeto.'],
    entrega: ['PARA CRIATIVOS', 'APRENDER COM O CARAMELO', 'Converse sobre conteúdos, workshops e possibilidades de aprendizado.'],
    diagnostico: ['DIAGNÓSTICO', 'DIAGNÓSTICO DE INTERAÇÃO', 'Vamos entender onde sua marca pode transformar atenção em percepção de valor.'],
    sprint: ['PROJETO', 'SPRINT DE INTERAÇÃO', 'Uma conversa sobre o problema, a ideia e a experiência que o projeto precisa criar.'],
    head: ['DIREÇÃO CONTÍNUA', 'HEAD DE INTERAÇÃO', 'Vamos conectar conteúdo, web e experiência à direção da sua marca.'],
    workshop: ['WORKSHOP', 'APRENDER FAZENDO', 'Converse sobre uma experiência de aprendizado para você ou sua equipe.'],
    formacao: ['FORMAÇÃO', 'INTERESSE EM FORMAÇÃO', 'Converse sobre seu interesse em formação e possibilidades de aprendizado.']
  };
  let opener = null;
  let savedOverflow = '';
  let background = [];
  dialog.inert = true;
  dialog.setAttribute('aria-hidden', 'true');

  function close() {
    if (!dialog.classList.contains('active')) return;
    dialog.classList.remove('active');
    dialog.setAttribute('aria-hidden', 'true');
    dialog.inert = true;
    background.forEach(([element, inert]) => { element.inert = inert; });
    background = [];
    document.body.style.overflow = savedOverflow;
    getLenis()?.start();
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  }

  document.querySelectorAll('.open-modal').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    if (dialog.classList.contains('active')) return;
    opener = button;
    const copy = map[button.dataset.target] || ['VAMOS CONVERSAR', 'CONECTAR COM O CARAMELO', 'Abra uma conversa sobre a sua ideia, projeto ou aprendizado.'];
    if (eyebrow) eyebrow.textContent = copy[0];
    if (title) title.textContent = copy[1];
    if (desc) desc.textContent = copy[2];
    savedOverflow = document.body.style.overflow;
    // Inert siblings along the ancestor path; the dialog itself stays operable.
    let branch = dialog;
    while (branch && branch !== document.body) {
      [...branch.parentElement.children].filter(element => element !== branch && !['SCRIPT', 'STYLE'].includes(element.tagName)).forEach(element => {
        background.push([element, element.inert]);
        element.inert = true;
      });
      branch = branch.parentElement;
    }
    document.body.style.overflow = 'hidden';
    getLenis()?.stop();
    dialog.inert = false;
    dialog.classList.add('active');
    dialog.setAttribute('aria-hidden', 'false');
    closeButton.focus({ preventScroll: true });
  }, { signal: events.signal }));
  closeButton.addEventListener('click', close, { signal: events.signal });
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); }, { signal: events.signal });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')]
      .filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }, { signal: events.signal });
  return () => { close(); events.abort(); };
}
