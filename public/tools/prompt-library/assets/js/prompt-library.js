(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const PAGE_SIZE = 24;
  const GLOW_GRADIENTS = [
    'linear-gradient(137deg,#FF3D77 0%,#FFB1CE 45%,#FF9D3C 100%)',
    'linear-gradient(137deg,#FFFFFF 0%,#7DD3FC 45%,#06B6D4 100%)',
    'linear-gradient(137deg,#4361EE 0%,#E0AEFF 45%,#F72585 100%)'
  ];
  const state = { items: [], category: '', query: '', savedOnly: false, limit: PAGE_SIZE, sort: 'popular' };
  const cache = new Map();
  const previews = window.PromptVideoPreviews.createManager();
  const motion = window.PromptLibraryMotion;
  const categoryControl = window.PromptLibraryControls.createSelect({ id: 'categorySelect', options: [{ value: '', label: 'Todas as categorias' }], value: '', onChange: value => { state.category = value; resetPage(); } });
  const sortControl = window.PromptLibraryControls.createSelect({ id: 'sortSelect', options: [{ value: 'popular', label: 'Mais populares' }, { value: 'recent', label: 'Mais recentes' }, { value: 'title', label: 'Título A–Z' }], value: 'popular', onChange: value => { state.sort = value; $('popularityNote').hidden = value !== 'popular'; resetPage(); } });
  let selected = null;
  let detailVersion = 0;
  let toastTimer;
  let searchTimer;
  let favorites;
  try {
    const stored = JSON.parse(localStorage.getItem('caramelo-library-saved') || '[]');
    favorites = new Set(Array.isArray(stored) ? stored.filter(id => typeof id === 'string') : []);
  } catch { favorites = new Set(); }
  const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function button(className, text, action) {
    const element = node('button', className, text);
    element.type = 'button';
    element.addEventListener('click', action);
    return element;
  }
  function safeUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : null;
    } catch { return null; }
  }
  function notify(message) {
    clearTimeout(toastTimer);
    const toast = $($('promptDialog').open ? 'dialogToast' : 'toast');
    $('toast').classList.remove('show');
    $('dialogToast').classList.remove('show');
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }
  async function copyText(text, message) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = node('textarea');
      area.value = text;
      area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
      const previousFocus = document.activeElement;
      ($('promptDialog').open ? $('promptDialog') : document.body).append(area);
      area.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch { /* Report failure below. */ }
      area.remove();
      previousFocus?.focus();
      if (!copied) {
        notify('A cópia foi bloqueada. Abra o prompt e selecione o texto para copiar.');
        return false;
      }
    }
    notify(message);
    return true;
  }
  async function getJson(url) {
    const response = await fetch(url, { cache: 'no-cache', signal: AbortSignal.timeout(30000), headers: { Accept: 'application/json' } });
    const data = await response.json();
    if (!response.ok) {
      const error = Error(data.error || 'Não foi possível carregar. Tente novamente.');
      error.code = data.code;
      throw error;
    }
    return data;
  }
  function getPrompt(item) {
    if (!cache.has(item.slug)) {
      if (cache.size >= 40) cache.delete(cache.keys().next().value);
      const pending = getJson(`/api/prompt-library?slug=${encodeURIComponent(item.slug)}`).then(data => {
        if (typeof data.prompt !== 'string' || !data.prompt.trim()) throw Error('Texto indisponível. Tente novamente.');
        return data.prompt;
      }).catch(error => { cache.delete(item.slug); throw error; });
      cache.set(item.slug, pending);
    }
    return cache.get(item.slug);
  }
  function bookmark(item, element) {
    if (favorites.has(item.id)) favorites.delete(item.id); else favorites.add(item.id);
    try { localStorage.setItem('caramelo-library-saved', JSON.stringify([...favorites])); } catch { notify('Salvo nesta sessão. Seu navegador bloqueou o armazenamento.'); }
    updateFavoriteCount();
    element.setAttribute('aria-pressed', String(favorites.has(item.id)));
    element.setAttribute('aria-label', `${favorites.has(item.id) ? 'Remover dos salvos' : 'Salvar'}: ${item.title}`);
    if (state.savedOnly) render();
  }
  function updateFavoriteCount() { $('favoriteCount').textContent = state.items.filter(item => favorites.has(item.id)).length; }
  function filtered() {
    const terms = normalize(state.query.trim()).split(/\s+/).filter(Boolean);
    const items = state.items.filter(item => (!state.category || item.category === state.category)
      && (!state.savedOnly || favorites.has(item.id)) && terms.every(term => item.search.includes(term)));
    items.sort((a, b) => window.PromptLibraryControls.compare(a, b, state.sort));
    return items;
  }
  function card(item) {
    const article = node('article', 'prompt-card');
    article.dataset.promptId = item.id;
    const colorIndex = [...String(item.id)].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % GLOW_GRADIENTS.length;
    article.style.setProperty('--card-gradient', GLOW_GRADIENTS[colorIndex]);
    const shell = node('div', 'card-shell');
    const visual = node('div', 'card-visual');
    const placeholder = node('span', 'placeholder', (item.type || 'UI').toUpperCase().slice(0, 4));
    placeholder.setAttribute('aria-hidden', 'true');
    visual.append(placeholder);
    const imageUrl = safeUrl(item.thumbnail);
    if (imageUrl && !/\.(?:gif|mp4|webm)(?:[?#]|$)/i.test(imageUrl)) {
      const image = node('img', 'card-image');
      image.loading = 'lazy';
      image.decoding = 'async';
      image.alt = '';
      image.width = 640;
      image.height = 360;
      image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => { image.remove(); placeholder.hidden = false; }, { once: true });
      image.src = imageUrl;
      placeholder.hidden = true;
      visual.append(image);
    }
    const videoUrl = window.PromptVideoPreviews.videoUrl(item.animated_preview_url || item.preview_url);
    if (videoUrl) {
      const video = node('video', 'card-video');
      video.setAttribute('aria-hidden', 'true');
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('disablepictureinpicture', '');
      video.tabIndex = -1;
      if (imageUrl && !/\.gif(?:[?#]|$)/i.test(imageUrl)) video.poster = imageUrl;
      video.addEventListener('error', () => {
        previews.remove(video);
        video.remove();
      }, { once: true });
      visual.append(video);
      previews.register(video, videoUrl);
    }
    const save = button('save-prompt', '♡', () => bookmark(item, save));
    save.setAttribute('aria-pressed', String(favorites.has(item.id)));
    save.setAttribute('aria-label', `${favorites.has(item.id) ? 'Remover dos salvos' : 'Salvar'}: ${item.title}`);
    visual.append(save);
    const body = node('div', 'card-body');
    body.append(node('span', 'card-category', item.category), node('h2', '', item.title));
    const tags = node('div', 'tags');
    item.tags.slice(0, 3).forEach(tag => tags.append(node('span', '', tag)));
    body.append(tags);
    const actions = node('div', 'card-actions');
    const open = button('card-open', '', () => openPrompt(item));
    open.setAttribute('aria-label', `Abrir prompt: ${item.title}`);
    const copyLabel = node('span', 'copy-label', 'Copiar prompt');
    const copy = button('button secondary card-copy', '', async () => {
      copy.disabled = true;
      copyLabel.textContent = 'Carregando…';
      try { await copyText(await getPrompt(item), 'Prompt copiado. Agora é fazer do seu jeito.'); }
      catch { notify('Não foi possível copiar. Abra o prompt para tentar novamente.'); }
      finally { copy.disabled = false; copyLabel.textContent = 'Copiar prompt'; }
    });
    const copyIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    copyIcon.setAttribute('viewBox', '0 0 24 24');
    copyIcon.setAttribute('aria-hidden', 'true');
    copyIcon.innerHTML = '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>';
    copy.append(copyIcon, copyLabel);
    copy.setAttribute('aria-label', `Copiar prompt: ${item.title}`);
    actions.append(copy);
    body.append(actions);
    shell.append(visual, body, open);
    article.append(shell);
    return article;
  }
  function render(append = false) {
    const items = filtered();
    if (!append) previews.clear();
    const start = append ? $('grid').children.length : 0;
    const fragment = document.createDocumentFragment();
    const newCards = items.slice(start, state.limit).map(card);
    newCards.forEach(element => fragment.append(element));
    if (append) $('grid').append(fragment); else $('grid').replaceChildren(fragment);
    motion.refreshCards(newCards, !append);
    const shown = Math.min(state.limit, items.length);
    $('resultCount').textContent = `${items.length} ${items.length === 1 ? 'prompt encontrado' : 'prompts encontrados'} / exibindo ${shown}`;
    $('emptyState').hidden = items.length !== 0;
    $('loadMore').hidden = shown >= items.length;
    $('clearFilters').hidden = !state.query && !state.category && !state.savedOnly;
    $('allTab').setAttribute('aria-pressed', String(!state.savedOnly));
    $('favoritesTab').setAttribute('aria-pressed', String(state.savedOnly));
  }
  async function loadDetail() {
    const item = selected;
    const version = ++detailVersion;
    $('dialogPrompt').textContent = '';
    $('copyDialogPrompt').disabled = true;
    $('promptStatus').hidden = false;
    $('promptStatus').textContent = 'Carregando o texto do prompt…';
    $('retryPrompt').hidden = true;
    try {
      const text = await getPrompt(item);
      if (version !== detailVersion || !$('promptDialog').open) return;
      $('dialogPrompt').textContent = text;
      $('promptStatus').hidden = true;
      $('copyDialogPrompt').disabled = false;
    } catch (error) {
      if (version !== detailVersion || !$('promptDialog').open) return;
      $('promptStatus').textContent = error.code === 'TEXT_SERVICE_UNAVAILABLE'
        ? error.message : 'Não foi possível carregar este prompt. Tente novamente.';
      $('retryPrompt').hidden = false;
    }
  }
  function openPrompt(item) {
    selected = item;
    $('dialogCategory').textContent = item.category;
    $('dialogTitle').textContent = item.title;
    $('dialogSource').textContent = item.author ? `Referência: ${item.author}` : 'Acervo Um Cara Caramelo';
    $('dialogTags').replaceChildren(...item.tags.map(tag => node('span', '', tag)));
    const preview = safeUrl(item.animated_preview_url || item.preview_url);
    $('previewLink').hidden = !preview;
    if (preview) $('previewLink').href = preview; else $('previewLink').removeAttribute('href');
    const url = new URL(location.href);
    url.searchParams.set('prompt', item.slug);
    history.replaceState(null, '', url);
    categoryControl.close();
    sortControl.close();
    if (!$('promptDialog').open) {
      motion.lock();
      $('promptBackdrop').hidden = false;
      $('promptDialog').showModal();
      motion.showDialog($('promptDialog'));
      $('closeDialog').focus({ preventScroll: true });
    }
    previews.setSuspended(true);
    $('promptDialog').scrollTop = 0;
    loadDetail();
  }
  async function loadLibrary() {
    $('errorState').hidden = true;
    $('emptyState').hidden = true;
    $('resultCount').textContent = 'Carregando prompts…';
    $('retryLoad').disabled = true;
    try {
      const data = await getJson('/api/prompt-library');
      if (!Array.isArray(data.items)) throw Error('invalid catalog');
      state.items = data.items.filter(item => item.id && item.slug && item.title).map(item => {
        const tags = Array.isArray(item.tags) ? item.tags.filter(tag => typeof tag === 'string') : [];
        const category = item.category || 'Outros';
        return { ...item, category, tags, search: normalize([item.title, category, item.type, item.author, ...tags].join(' ')) };
      });
      const categories = [...new Set(state.items.map(item => item.category))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
      categoryControl.setOptions([{ value: '', label: 'Todas as categorias' }, ...categories.map(category => ({ value: category, label: category }))]);
      updateFavoriteCount();
      render();
      const slug = new URL(location.href).searchParams.get('prompt');
      if (slug) {
        const item = state.items.find(item => item.slug === slug);
        if (item) openPrompt(item); else notify('Esse prompt não está disponível no acervo.');
      }
    } catch {
      $('resultCount').textContent = 'Acervo indisponível';
      $('errorState').hidden = false;
    } finally { $('retryLoad').disabled = false; }
  }
  function resetPage() { state.limit = PAGE_SIZE; render(); }
  $('searchInput').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.query = $('searchInput').value; resetPage(); }, 120);
  });
  $('allTab').addEventListener('click', () => { state.savedOnly = false; resetPage(); });
  $('favoritesTab').addEventListener('click', () => { state.savedOnly = true; resetPage(); });
  $('clearFilters').addEventListener('click', () => {
    clearTimeout(searchTimer);
    state.query = ''; state.category = ''; state.savedOnly = false;
    $('searchInput').value = ''; categoryControl.setValue('');
    resetPage();
  });
  $('loadMore').addEventListener('click', () => { state.limit += PAGE_SIZE; render(true); });
  $('retryLoad').addEventListener('click', loadLibrary);
  $('retryPrompt').addEventListener('click', loadDetail);
  function finishClose() {
    if (!selected) return;
    $('promptBackdrop').hidden = true;
    motion.unlock();
    previews.setSuspended(false);
    detailVersion++;
    selected = null;
    $('dialogPrompt').textContent = '';
    const url = new URL(location.href);
    url.searchParams.delete('prompt');
    history.replaceState(null, '', url);
  }
  function closePrompt() {
    $('promptDialog').close();
    // Also support embedded browsers that only reflect the open attribute.
    $('promptDialog').removeAttribute('open');
    finishClose();
  }
  $('closeDialog').addEventListener('click', closePrompt);
  $('promptBackdrop').addEventListener('click', closePrompt);
  $('promptDialog').addEventListener('click', event => {
    const bounds = $('promptDialog').getBoundingClientRect();
    if (event.target === $('promptDialog') && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) closePrompt();
  });
  $('promptDialog').addEventListener('cancel', event => { event.preventDefault(); closePrompt(); });
  $('promptDialog').addEventListener('close', () => { if (!$('promptDialog').open) finishClose(); });
  $('promptDialog').addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closePrompt(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...$('promptDialog').querySelectorAll('button,a[href],[tabindex]')].filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  $('copyDialogPrompt').addEventListener('click', () => copyText($('dialogPrompt').textContent, 'Prompt copiado. Agora é fazer do seu jeito.'));
  $('sharePrompt').addEventListener('click', () => {
    if (!selected) return;
    const url = new URL(location.pathname, location.origin);
    url.searchParams.set('prompt', selected.slug);
    copyText(url.href, 'Link copiado para compartilhar.');
  });
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !$('promptDialog').open && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      event.preventDefault(); $('searchInput').focus();
    }
  });
  function updateAnimationButton() {
    motion.setPreviewsEnabled(previews.isEnabled());
    $('togglePreviews').textContent = previews.isEnabled() ? 'Pausar animações' : 'Ativar animações';
    $('togglePreviews').setAttribute('aria-pressed', String(previews.isEnabled()));
  }
  $('togglePreviews').addEventListener('click', () => {
    previews.setEnabled(!previews.isEnabled());
    updateAnimationButton();
  });
  window.addEventListener('prompt-preview-preference', updateAnimationButton);
  updateAnimationButton();
  loadLibrary();
})();
