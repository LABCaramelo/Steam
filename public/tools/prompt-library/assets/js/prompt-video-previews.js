(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PromptVideoPreviews = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  function videoUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && /\.(mp4|webm)$/i.test(url.pathname) ? url.href : null;
    } catch { return null; }
  }

  function createManager({ document: doc = document, window: win = window, enabled } = {}) {
    const records = new Map();
    const visible = new Map();
    const active = new Set();
    const attempts = new WeakMap();
    const mobile = win.matchMedia('(max-width: 600px)');
    const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
    let playingEnabled = enabled === undefined ? !reduced.matches : enabled;
    let suspended = false;
    let disposed = false;
    let explicitPreference = enabled !== undefined;
    let scrolling = false;
    let scrollTimer = 0;

    function stop(video, unload = false) {
      attempts.set(video, (attempts.get(video) || 0) + 1);
      active.delete(video);
      video.pause();
      video.dataset.previewPlaying = 'false';
      if (unload && video.hasAttribute('src')) {
        video.removeAttribute('src');
        video.load();
      }
    }
    function start(video) {
      if (active.has(video)) return;
      const url = records.get(video);
      if (!url) return;
      video.muted = true;
      if (!video.hasAttribute('src')) video.src = url;
      active.add(video);
      const attempt = (attempts.get(video) || 0) + 1;
      attempts.set(video, attempt);
      video.dataset.previewPlaying = 'true';
      // A pending play may resolve after a scroll, filter or dialog transition.
      Promise.resolve(video.play()).then(() => {
        if (!active.has(video) || disposed || doc.hidden || suspended || !playingEnabled) video.pause();
      }).catch(() => {
        if (attempts.get(video) !== attempt) return;
        active.delete(video);
        video.dataset.previewPlaying = 'false';
      });
    }
    function sync() {
      if (disposed || scrolling) return;
      const candidates = !doc.hidden && playingEnabled && !suspended
        ? [...visible].filter(([video]) => video.isConnected && records.has(video)).sort((a, b) => b[1] - a[1])
        : [];
      const wanted = new Set(candidates.slice(0, mobile.matches ? 2 : 4).map(([video]) => video));
      for (const video of records.keys()) {
        if (!wanted.has(video)) {
          if (active.has(video) || video.hasAttribute('src')) stop(video, !visible.has(video));
        }
      }
      for (const video of wanted) start(video);
    }
    const observer = new win.IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!records.has(entry.target)) continue;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.12) visible.set(entry.target, entry.intersectionRatio);
        else visible.delete(entry.target);
      }
      sync();
    }, { threshold: [0, 0.12, 0.5, 0.9, 1] });

    function clear() {
      observer.disconnect();
      for (const video of records.keys()) stop(video, true);
      records.clear();
      visible.clear();
      active.clear();
    }
    function onMotionChange() {
      if (!explicitPreference) playingEnabled = !reduced.matches;
      sync();
      win.dispatchEvent(new win.Event('prompt-preview-preference'));
    }
    function onScroll() {
      if (!scrolling) {
        scrolling = true;
        for (const video of [...active]) stop(video);
      }
      win.clearTimeout(scrollTimer);
      scrollTimer = win.setTimeout(() => { scrollTimer = 0; scrolling = false; sync(); }, 160);
    }
    function onPageHide() {
      win.clearTimeout(scrollTimer);
      scrolling = false;
      for (const video of records.keys()) stop(video, true);
    }
    mobile.addEventListener('change', sync);
    reduced.addEventListener('change', onMotionChange);
    doc.addEventListener('visibilitychange', sync);
    win.addEventListener('pagehide', onPageHide);
    win.addEventListener('pageshow', sync);
    win.addEventListener('scroll', onScroll, { passive: true });

    return {
      register(video, url) {
        const valid = videoUrl(url);
        if (!valid || disposed) return;
        records.set(video, valid);
        video.preload = 'none';
        video.muted = video.defaultMuted = true;
        video.loop = video.playsInline = true;
        observer.observe(video);
      },
      remove(video) {
        observer.unobserve(video);
        stop(video, true);
        records.delete(video);
        visible.delete(video);
        sync();
      },
      clear,
      setEnabled(value) { explicitPreference = true; playingEnabled = !!value; sync(); },
      isEnabled() { return playingEnabled; },
      setSuspended(value) { suspended = !!value; sync(); },
      dispose() {
        win.clearTimeout(scrollTimer);
        clear();
        disposed = true;
        mobile.removeEventListener('change', sync);
        reduced.removeEventListener('change', onMotionChange);
        doc.removeEventListener('visibilitychange', sync);
        win.removeEventListener('pagehide', onPageHide);
        win.removeEventListener('pageshow', sync);
        win.removeEventListener('scroll', onScroll);
      }
    };
  }
  return { createManager, videoUrl };
});
