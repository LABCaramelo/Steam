export function initVideos() {
  const videos = [...document.querySelectorAll('video')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motionOff = new URLSearchParams(location.search).get('motion') === 'off';
  const work = document.querySelector('.work-section .work-stage');
  const workToggle = document.getElementById('work-play-toggle');
  let workPaused = reduced.matches || motionOff;
  const events = new AbortController();
  const visible = new Map();
  const requested = new Map();
  let enabled = true;
  let sequence = 0;
  let observer = null;

  function pause(video) {
    requested.delete(video);
    video.pause();
  }

  function update() {
    const candidates = !enabled || document.hidden || motionOff ? [] : videos.filter(video => {
      const card = video.closest('.work-section .project-card');
      if (card) {
        if (workPaused || (work?.dataset.workMode === 'scrub' && card.dataset.workActive !== 'true')) return false;
      } else if (reduced.matches) return false;
      const phase = video.closest('.iarp-phase-display');
      const phaseVisible = !phase || document.documentElement.dataset.motion === 'reduced' || phase.classList.contains('active');
      return visible.has(video) && phaseVisible;
    }).sort((a, b) => visible.get(b) - visible.get(a));
    // A dense portfolio still keeps decoder and GPU work bounded; the hero shows three films at once.
    const selected = new Set(candidates.slice(0, 3));
    videos.forEach(video => {
      if (!selected.has(video)) return pause(video);
      if (requested.has(video)) return;
      const request = ++sequence;
      requested.set(video, request);
      const playback = video.play();
      if (!playback?.then) return;
      playback.then(() => {
        // A stale request may settle after IO, page visibility or user preferences changed.
        if (requested.get(video) !== request && !requested.has(video)) video.pause();
      }).catch(() => {
        if (requested.get(video) === request) requested.delete(video);
      });
    });
  }

  function updateWorkToggle() {
    if (!workToggle) return;
    workToggle.textContent = workPaused ? 'Reproduzir prévias' : 'Pausar prévias';
    workToggle.setAttribute('aria-label', workPaused ? 'Reproduzir prévias dos projetos' : 'Pausar prévias dos projetos');
  }
  if (workToggle) {
    workToggle.hidden = motionOff;
    updateWorkToggle();
    workToggle.addEventListener('click', () => {
      workPaused = !workPaused;
      updateWorkToggle();
      update();
    }, { signal: events.signal });
  }
  videos.forEach(video => {
    // Project previews are silent loops without a player; the selector and the toggle drive playback.
    if (video.closest('.work-section')) video.controls = false;
    video.autoplay = false;
    video.muted = true;
    video.playsInline = true;
    video.pause();
  });
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0) visible.set(entry.target, entry.intersectionRatio);
        else visible.delete(entry.target);
      });
      update();
    }, { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
    videos.forEach(video => observer.observe(video));
  } else {
    const measure = () => {
      videos.forEach(video => {
        const rect = video.getBoundingClientRect();
        const pixels = Math.min(innerHeight, rect.bottom) - Math.max(0, rect.top);
        if (rect.width && rect.height && pixels > 0 && rect.right > 0 && rect.left < innerWidth) visible.set(video, pixels / rect.height);
        else visible.delete(video);
      });
      update();
    };
    window.addEventListener('scroll', measure, { passive: true, signal: events.signal });
    window.addEventListener('resize', measure, { signal: events.signal });
    measure();
  }
  document.addEventListener('visibilitychange', update, { signal: events.signal });
  reduced.addEventListener('change', () => {
    workPaused = reduced.matches;
    updateWorkToggle();
    update();
  }, { signal: events.signal });
  work?.parentElement.addEventListener('work:change', update, { signal: events.signal });
  window.addEventListener('pagehide', () => { enabled = false; update(); }, { signal: events.signal });
  window.addEventListener('pageshow', () => { enabled = true; update(); }, { signal: events.signal });
  const changes = new MutationObserver(update);
  const method = document.getElementById('iarp-stage-box');
  if (method) changes.observe(method, { subtree: true, attributes: true, attributeFilter: ['class', 'data-phase'] });
  if (work) changes.observe(work, { subtree: true, attributes: true, attributeFilter: ['data-work-mode', 'data-work-active'] });
  changes.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  return () => {
    enabled = false;
    update();
    observer?.disconnect();
    changes.disconnect();
    events.abort();
    if (workToggle) workToggle.hidden = true;
  };
}
