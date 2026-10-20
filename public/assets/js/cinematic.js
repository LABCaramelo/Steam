// Scene direction lives above editorial state. Each animated surface has one
// transform owner; matchMedia restores the untouched document on teardown.
export function initCinematic() {
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger || new URLSearchParams(location.search).get('motion') === 'off') {
    return { destroy() {} };
  }

  gsap.registerPlugin(ScrollTrigger);
  const root = document.documentElement;
  const media = gsap.matchMedia();
  media.add({
    always: 'all',
    wide: '(min-width: 1000px) and (min-height: 760px)',
    fine: '(hover: hover) and (pointer: fine)',
    reduced: '(prefers-reduced-motion: reduce)',
    // offers.js and work.js own their cards' transforms in these contexts.
    offersStack: '(min-width: 1000px) and (min-height: 650px) and (hover: hover) and (pointer: fine)',
    workDeck: '(min-width: 900px) and (min-height: 520px) and (hover: hover) and (pointer: fine)'
  }, context => {
    const { wide, fine, reduced, offersStack, workDeck } = context.conditions;
    if (reduced) return;
    const desktop = wide && fine;
    const rise = desktop ? 26 : 18;
    const restoreDOM = [];
    const listeners = [];
    const entrances = [];
    let alive = true;
    root.dataset.motionCinematic = desktop ? 'desktop' : 'light';

    const select = selector => document.querySelector(selector);
    const all = selector => [...document.querySelectorAll(selector)];
    const listen = (element, event, handler) => {
      element.addEventListener(event, handler);
      listeners.push(() => element.removeEventListener(event, handler));
    };
    const rememberEntrance = (timeline, elements) => {
      entrances.push({ timeline, elements: elements.filter(Boolean) });
      return timeline;
    };
    const entrance = (id, element, start = 'top 90%') => {
      if (!element) return null;
      return gsap.timeline({ scrollTrigger: {
        id: `cine-${id}`, trigger: element, start,
        toggleActions: 'play none none none', once: true
      }});
    };

    function wrapContents(element, className) {
      if (!element) return null;
      const nodes = [...element.childNodes];
      const inner = document.createElement('span');
      inner.className = className;
      element.append(inner);
      inner.append(...nodes);
      restoreDOM.push(() => element.replaceChildren(...nodes));
      return inner;
    }

    function headingLines(element) {
      if (!element) return [];
      const hadClass = element.classList.contains('motion-heading');
      element.classList.add('motion-heading');
      const original = [...element.childNodes];
      const groups = [[]];
      // A break hidden at this width (.desktop-break) stays inside its line.
      original.forEach(node => {
        if (node.nodeName === 'BR' && getComputedStyle(node).display !== 'none') groups.push([]);
        else groups.at(-1).push(node);
      });
      element.replaceChildren();
      const lines = groups.map(nodes => {
        const mask = document.createElement('span');
        const inner = document.createElement('span');
        mask.className = 'motion-line';
        inner.className = 'motion-line-inner';
        inner.append(...nodes);
        mask.append(inner);
        element.append(mask);
        return inner;
      });
      restoreDOM.push(() => {
        element.replaceChildren(...original);
        if (!hadClass) element.classList.remove('motion-heading');
      });
      return lines;
    }

    function typeEntrance(id, element, delay = 0) {
      const lines = headingLines(element);
      const timeline = entrance(id, element, 'top 92%');
      if (!timeline) return;
      timeline.fromTo(lines, { yPercent: 105 }, {
        yPercent: 0, duration: 0.9, stagger: 0.09, ease: 'power4.out'
      }, delay);
      rememberEntrance(timeline, [element]);
    }

    function lightEntrance(id, element, distance = 18) {
      const timeline = entrance(id, element, 'top 94%');
      if (!timeline) return;
      // A readable low-motion baseline remains even before the entrance starts.
      timeline.fromTo(element, { y: distance, opacity: 0.65 }, {
        y: 0, opacity: 1, duration: 0.55, ease: 'power2.out'
      });
      rememberEntrance(timeline, [element]);
    }

    const hero = select('#hero-track');
    // The hero enters on every pointer: lines rise from their masks, films are cut in.
    const heroWords = all('.hero-word').map(element => wrapContents(element, 'motion-hero-inner'));
    const heroFilms = all('.hero-film');
    // Touch sets the three films in one row; they open left to right as seen.
    const filmOrder = desktop ? heroFilms : [...heroFilms].sort((a, b) =>
      a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    const introElements = [select('.hero-section .section-meta'), select('.hero-bottom'), select('.hero-footnote')].filter(Boolean);
    const enterAtTop = window.scrollY < 60 && (!location.hash || location.hash === '#hero-track');
    const heroEntry = gsap.timeline();
    if (enterAtTop) {
      heroEntry.fromTo(heroWords, { yPercent: 105 }, {
        yPercent: 0, duration: 1.08, stagger: 0.12, ease: 'power4.out'
      }, 0.08)
        .fromTo(filmOrder, { clipPath: 'inset(100% 0% 0% 0%)' }, {
          clipPath: 'inset(0% 0% 0% 0%)', duration: 0.95,
          stagger: { each: 0.09, from: desktop ? 'end' : 'start' }, ease: 'power3.inOut'
        }, 0.2)
        .fromTo(introElements, { y: 20, opacity: 0.45 }, {
          y: 0, opacity: 1, duration: 0.7, stagger: 0.08, ease: 'power2.out'
        }, 0.52);
    }
    rememberEntrance(heroEntry, [hero]);

    if (desktop && hero) {
      const heroOut = gsap.timeline({ scrollTrigger: {
        id: 'cine-hero-depth', trigger: hero, start: 'top top',
        end: 'bottom top', scrub: 0.5, invalidateOnRefresh: true
      }});
      // Scroll transforms the row; its child owns the independent title entry.
      const topRow = select('.hero-row-top');
      const bottomRow = select('.hero-row-bottom');
      if (topRow) heroOut.to(topRow, { y: -30, x: -12, opacity: 0.72, ease: 'none' }, 0);
      if (bottomRow) heroOut.to(bottomRow, { y: -55, x: 12, opacity: 0.72, ease: 'none' }, 0);
      if (heroFilms.length) heroOut.to(heroFilms, { rotation: index => index === 0 ? 1 : -1, ease: 'none' }, 0);
    }

    // Section titles rise line by line; supporting copy starts legible and only softens in.
    [['offers', '#offers-title'], ['work', '#work-title'], ['archive', '#archive-title'],
      ['contact', '#community-title'], ['maker', '#maker-title'], ['closing', '#closing-title'],
      ['doors', '#doors-title'], ['faq', '#faq-title']]
      .forEach(([id, selector]) => typeEntrance(`${id}-type`, select(selector)));
    [['offers-intro', '.offers-intro'], ['work-copy', '.work-intro-copy'], ['archive-copy', '.archive-copy'],
      ['archive-steps', '.archive-steps'], ['contact-close', '.contact-bottom'], ['maker-hello', '.maker-hello'],
      ['maker-close', '.maker-bottom'], ['closing-paths', '.closing-paths']]
      .forEach(([id, selector]) => lightEntrance(id, select(selector), rise));

    // Outside the sticky stack, the two services arrive tilted and settle (tilt-entrance).
    if (!offersStack) all('.offer-column').forEach((card, index) => {
      const timeline = entrance(`offer-card-${index}`, card, 'top 92%');
      if (!timeline) return;
      timeline.fromTo(card, { y: 45, rotation: index % 2 ? 1.1 : -1.1, opacity: 0.45 }, {
        y: 0, rotation: 0, opacity: 1, duration: 0.85, ease: 'power3.out'
      });
      rememberEntrance(timeline, [card]);
    });

    // Outside the deck, each project cover is cut in from below as it arrives (clip-reveal).
    if (!workDeck) all('.work-section .project-media').forEach((cover, index) => {
      const timeline = entrance(`work-cover-${index}`, cover, 'top 92%');
      if (!timeline) return;
      timeline.fromTo(cover, { clipPath: 'inset(100% 0% 0% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 0.95, ease: 'power3.inOut', clearProps: 'clipPath'
      });
      rememberEntrance(timeline, [cover]);
    });

    // Handwritten asides write themselves left to right, once.
    all('.archive-beat, .work-question, .maker-note').forEach((note, index) => {
      const timeline = entrance(`hand-${index}`, note, 'top 90%');
      if (!timeline) return;
      timeline.fromTo(note, { clipPath: 'inset(-30% 100% -30% -6%)' }, {
        clipPath: 'inset(-30% -6% -30% -6%)', duration: 0.9, ease: 'power2.out', clearProps: 'clipPath'
      });
      rememberEntrance(timeline, [note]);
    });

    // The page's one thesis lights word by word at reading pace (scrub-words).
    const thesis = select('.offers-statement');
    if (thesis) {
      const original = [...thesis.childNodes];
      const text = thesis.textContent.trim();
      const reader = document.createElement('span');
      reader.className = 'cm-sr-only';
      reader.textContent = text;
      const visual = document.createElement('span');
      visual.setAttribute('aria-hidden', 'true');
      const words = text.split(/\s+/).map((word, index, list) => {
        const span = document.createElement('span');
        span.className = 'motion-word';
        span.textContent = word;
        visual.append(span, index < list.length - 1 ? ' ' : '');
        return span;
      });
      thesis.replaceChildren(reader, visual);
      restoreDOM.push(() => thesis.replaceChildren(...original));
      gsap.fromTo(words, { opacity: 0.18, y: 6 }, {
        opacity: 1, y: 0, stagger: 0.07, ease: 'none',
        scrollTrigger: { id: 'cine-thesis', trigger: thesis, start: 'top 88%', end: 'top 55%', scrub: 0.4 }
      });
    }

    // The community seal turns with the scroll on every pointer (scroll-depth).
    const identity = select('.contact-identity');
    if (identity) {
      // A timeline defers its initial refresh until the scene batch is built.
      // An immediate tween refresh can race once-only entrances on rebuild.
      const closing = gsap.timeline({ scrollTrigger: {
        id: 'cine-contact-identity', trigger: select('#comunidade'),
        start: 'top bottom', end: 'bottom bottom', scrub: 0.4
      }});
      closing.fromTo(identity, { rotation: -12, scale: 0.88 }, {
        rotation: 8, scale: 1.04, ease: 'none'
      });
    }

    if (desktop) {
      const doors = all('.door-panel');
      const doorReveal = entrance('doors-choice', select('#doors-split'), 'top 92%');
      if (doorReveal) {
        doorReveal.fromTo(doors, { y: 45, rotation: index => index ? 1.1 : -1.1, opacity: 0.45 }, {
          y: 0, rotation: 0, opacity: 1, duration: 0.85, stagger: 0.13, ease: 'power3.out'
        });
        rememberEntrance(doorReveal, doors);
        context.add('doorHover', (panel, active) => {
          doorReveal.progress(1);
          gsap.to(panel, { y: active ? -7 : 0, rotation: active ? (panel.classList.contains('learn') ? 0.4 : -0.4) : 0,
            duration: 0.42, ease: 'power2.out', overwrite: 'auto' });
          const arrow = panel.querySelector('.door-top>span:last-child');
          if (arrow) gsap.to(arrow, { x: active ? 4 : 0, y: active ? -4 : 0,
            duration: 0.42, ease: 'power2.out', overwrite: 'auto' });
        });
        doors.forEach(panel => {
          listen(panel, 'pointerenter', () => context.doorHover(panel, true));
          listen(panel, 'pointerleave', () => context.doorHover(panel, false));
          listen(panel, 'focusin', () => context.doorHover(panel, true));
          listen(panel, 'focusout', event => {
            if (!panel.contains(event.relatedTarget)) context.doorHover(panel, false);
          });
        });
      }
    } else {
      all('.door-panel').forEach((element, index) => {
        lightEntrance(`flow-card-${index}`, element, 16);
      });
    }

    const questions = all('.faq-list details');
    const faqReveal = entrance('faq-rhythm', select('.faq-list'));
    if (faqReveal) {
      faqReveal.fromTo(questions, { y: 16, opacity: 0.65 }, {
        y: 0, opacity: 1, duration: 0.55, stagger: 0.07, ease: 'power2.out'
      });
      rememberEntrance(faqReveal, questions);
    }

    // Keyboard navigation must never arrive at a masked control or heading.
    const finishForFocus = event => {
      const target = event.target;
      const canContainScene = target !== document.body && target !== root;
      const headerHeight = parseFloat(getComputedStyle(root).getPropertyValue('--header-height')) || 0;
      entrances.forEach(({ timeline, elements }) => {
        const relevant = elements.some(element => {
          if (element.contains(target)) return true;
          if (!canContainScene || !target.contains(element)) return false;
          // An anchor focuses the section. Finish only its visible entrances;
          // media further down retains its reveal when it actually enters.
          const bounds = element.getBoundingClientRect();
          return bounds.bottom > headerHeight && bounds.top < window.innerHeight;
        });
        if (relevant) timeline.progress(1);
      });
    };
    listen(document, 'focusin', finishForFocus);
    const showFocused = () => {
      if (document.activeElement && document.activeElement !== document.body) {
        finishForFocus({ target: document.activeElement });
      }
    };
    showFocused();
    document.fonts?.ready.then(() => { if (alive) ScrollTrigger.refresh(); });

    return () => {
      alive = false;
      listeners.forEach(remove => remove());
      restoreDOM.reverse().forEach(restore => restore());
      delete root.dataset.motionCinematic;
    };
  });
  return { destroy() { media.revert(); } };
}
