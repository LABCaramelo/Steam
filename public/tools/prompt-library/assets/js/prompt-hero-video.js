(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PromptHeroVideo = api;
})(typeof window === 'object' ? window : globalThis, () => {
  'use strict';
  function createController({ hero, video, hint, env = window }) {
    const fine = env.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = env.matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = env.matchMedia('(max-width: 768px)');
    let visible = false;
    let enabled = !reduced.matches;
    let suspended = false;
    let failed = false;
    let frame = 0;
    let target = .5;
    let current = .5;
    let bounds = null;
    let destroyed = false;
    const listeners = [];
    const active = () => !destroyed && enabled && visible && fine.matches && !reduced.matches && !suspended && !env.document.hidden && !failed;
    const ready = () => Number.isFinite(video.duration) && video.duration > 0 && video.readyState >= 1;
    function listen(element, type, callback) {
      element.addEventListener(type, callback, { passive: true });
      listeners.push(() => element.removeEventListener(type, callback));
    }
    function cancelFrame() {
      if (frame) env.cancelAnimationFrame(frame);
      frame = 0;
    }
    function schedule() {
      if (!frame && active() && ready() && !video.seeking) frame = env.requestAnimationFrame(step);
    }
    function step() {
      frame = 0;
      if (!active() || !ready() || video.seeking) return;
      const delta = target - current;
      current = Math.abs(delta) < .0008 ? target : current + delta * .16;
      const time = Math.min(video.duration - .02, Math.max(0, current * video.duration));
      if (Math.abs(video.currentTime - time) > .015) video.currentTime = time;
      if (Math.abs(target - current) >= .0008) schedule();
    }
    function unload() {
      cancelFrame();
      video.pause();
      if (video.getAttribute('src')) { video.removeAttribute('src'); video.load(); }
      hero.classList.remove('is-scrub-ready');
      if (hint) hint.hidden = true;
      target = current = .5;
    }
    function reconcile() {
      if (!active()) { unload(); return; }
      const source = mobile.matches ? video.dataset.mobileSrc : video.dataset.desktopSrc;
      if (video.getAttribute('src') !== source) {
        unload();
        video.src = source;
        video.load();
      } else schedule();
    }
    function initialPose() {
      if (!active() || !ready()) return;
      video.pause();
      current = .5;
      video.currentTime = video.duration * .5;
      schedule();
    }
    function pointer(event) {
      if (!active() || (event.pointerType && event.pointerType !== 'mouse')) return;
      if (!bounds) bounds = hero.getBoundingClientRect();
      target = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
      schedule();
    }
    video.muted = video.defaultMuted = true;
    video.playsInline = true;
    video.preload = 'auto';
    listen(hero, 'pointerenter', () => { bounds = hero.getBoundingClientRect(); });
    listen(hero, 'pointermove', pointer);
    listen(hero, 'pointerleave', () => { target = .5; schedule(); });
    listen(video, 'loadedmetadata', initialPose);
    listen(video, 'seeked', () => {
      if (!active()) return;
      hero.classList.add('is-scrub-ready');
      if (hint) hint.hidden = false;
      if (Math.abs(target - current) >= .0008) schedule();
    });
    listen(video, 'error', () => { failed = true; unload(); });
    listen(env.document, 'visibilitychange', reconcile);
    listen(env, 'resize', () => { bounds = null; });
    listen(env, 'pagehide', unload);
    listen(env, 'pageshow', reconcile);
    [fine, reduced, mobile].forEach(media => listen(media, 'change', reconcile));
    const observer = new env.IntersectionObserver(entries => {
      visible = entries.some(entry => entry.target === hero && entry.isIntersecting);
      reconcile();
    }, { threshold: .05 });
    observer.observe(hero);
    return {
      setEnabled(value) { enabled = Boolean(value); reconcile(); },
      setSuspended(value) { suspended = Boolean(value); reconcile(); },
      destroy() { destroyed = true; observer.disconnect(); listeners.forEach(remove => remove()); unload(); }
    };
  }
  return { createController };
});
