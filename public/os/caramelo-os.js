/* CarameloOS 96 — página inicial do Um Cara Caramelo® (Steam/LAB) */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem storage */ } }
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Papel de parede em vídeo: parado em quem pede menos movimento.
  if (reduced) document.querySelector('.wallpaper video')?.pause();
  const isCompact = () => matchMedia('(max-width: 760px)').matches;
  const isCoarse = () => matchMedia('(pointer: coarse)').matches;

  /* ---------------- Programas ---------------- */
  const APPS = {
    leiame:     { title: 'Leia-me.txt — Bloco Caramelo', task: 'Leia-me.txt', icon: 'i-txt', w: 560, h: 540 },
    sobre:      { title: 'Quem Sou.txt — Bloco Caramelo', task: 'Quem Sou.txt', icon: 'i-txt', w: 680, h: 520 },
    computador: { title: 'Meu Computador', icon: 'i-pc', w: 540, h: 440 },
    projetos:   { title: 'Projetos selecionados', task: 'Projetos', icon: 'i-folder', w: 820, h: 620 },
    servicos:   { title: 'Serviços do estúdio', task: 'Serviços', icon: 'i-box', w: 760, h: 640 },
    processo:   { title: 'Como Trabalho — Assistente', task: 'Como Trabalho', icon: 'i-wizard', w: 620, h: 400 },
    ajuda:      { title: 'Dúvidas frequentes', task: 'Dúvidas', icon: 'i-help', w: 720, h: 420 },
    adesivos:   { title: 'Adesivos', icon: 'i-photo', w: 700, h: 470 },
    contato:    { title: 'Mensageiro — Contato', task: 'Contato', icon: 'i-mail', w: 520, h: 520 },
    recursos:   { title: 'Aprender & Recursos', icon: 'i-folder', w: 620, h: 400 },
    lixeira:    { title: 'Lixeira', icon: 'i-trash', w: 620, h: 470 },
    jogo:       { title: 'Pega a Bolinha', icon: 'i-game', w: 420, h: 530 },
    scraps:     { title: 'Carakut — Página de recados', task: 'Carakut', icon: 'i-kut', w: 900, h: 640 }
  };

  const layer = $('#windows');
  const taskList = $('#taskList');
  const appStore = $('#appStore');
  const tpl = $('#tplWindow');
  const openWins = new Map();
  let zTop = 10;
  let cascade = 0;
  let activeId = null;
  const hooks = { open: {}, close: {} };

  // Tamanho da área das janelas em px de layout, os mesmos de style.left/top.
  function areaRect() { return { width: layer.offsetWidth, height: layer.offsetHeight }; }

  function openApp(id, opts = {}) {
    const app = APPS[id];
    if (!app) return;
    closeStart();
    let rec = openWins.get(id);
    if (!rec) {
      const win = tpl.content.firstElementChild.cloneNode(true);
      win.dataset.app = id;
      win.tabIndex = -1;
      const name = $('.win-name', win);
      name.id = `wt-${id}`;
      name.textContent = app.title;
      win.setAttribute('aria-labelledby', name.id);
      $('.win-icon use', win).setAttribute('href', `#${app.icon}`);
      $('.win-body', win).append($(`#app-${id}`));

      const area = areaRect();
      const w = Math.min(app.w, area.width - 16);
      const h = Math.min(app.h, area.height - 16);
      const off = (cascade % 6) * 28 - 56;
      cascade++;
      win.style.width = `${w}px`;
      win.style.height = `${h}px`;
      win.style.left = `${clamp((area.width - w) / 2 + off + 40, 8, area.width - w - 8)}px`;
      win.style.top = `${clamp((area.height - h) / 2 + off, 8, area.height - h - 8)}px`;
      layer.append(win);

      const wrap = document.createElement('div');
      wrap.setAttribute('role', 'listitem');
      wrap.style.display = 'contents';
      const task = document.createElement('button');
      task.type = 'button';
      task.className = 'task';
      task.innerHTML = `<svg aria-hidden="true"><use href="#${app.icon}"/></svg><span></span>`;
      task.lastElementChild.textContent = app.task || app.title;
      task.setAttribute('aria-label', app.task || app.title);
      task.addEventListener('click', () => {
        if (win.hidden) { win.hidden = false; focusWin(id, true); }
        else if (activeId === id) minimize(id);
        else focusWin(id, true);
      });
      wrap.append(task);
      taskList.append(wrap);

      win.addEventListener('pointerdown', () => focusWin(id), true);
      $$('.win-btn', win).forEach(btn => btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        if (act === 'min') minimize(id);
        else if (act === 'max') toggleMax(id);
        else closeApp(id);
      }));
      const title = $('.win-title', win);
      title.addEventListener('dblclick', e => { if (!e.target.closest('.win-btn')) toggleMax(id); });
      makeDraggable(win, title);

      rec = { win, task, wrap };
      openWins.set(id, rec);
    }
    rec.win.hidden = false;
    focusWin(id, true);
    hooks.open[id]?.(opts);
  }

  function focusWin(id, moveFocus = false) {
    const rec = openWins.get(id);
    if (!rec) return;
    if (activeId !== id) rec.win.style.zIndex = ++zTop;
    activeId = id;
    openWins.forEach((r, key) => {
      const on = key === id;
      r.win.classList.toggle('is-active', on);
      r.task.classList.toggle('is-active', on && !r.win.hidden);
      r.task.setAttribute('aria-pressed', String(on && !r.win.hidden));
    });
    if (moveFocus && !rec.win.contains(document.activeElement)) rec.win.focus({ preventScroll: true });
  }

  function topVisible(exclude) {
    let best = null; let bz = -1;
    openWins.forEach((r, key) => {
      if (key === exclude || r.win.hidden) return;
      const zi = +r.win.style.zIndex || 0;
      if (zi > bz) { bz = zi; best = key; }
    });
    return best;
  }

  function minimize(id) {
    const rec = openWins.get(id);
    if (!rec) return;
    rec.win.hidden = true;
    rec.task.classList.remove('is-active');
    rec.task.setAttribute('aria-pressed', 'false');
    hooks.close[id]?.('min');
    const next = topVisible(id);
    activeId = null;
    if (next) focusWin(next, true);
  }

  function toggleMax(id) {
    const rec = openWins.get(id);
    if (!rec || isCompact()) return;
    const on = rec.win.classList.toggle('is-max');
    const btn = $('[data-act="max"]', rec.win);
    btn.setAttribute('aria-label', on ? 'Restaurar' : 'Maximizar');
    btn.firstElementChild.textContent = on ? '❐' : '□';
  }

  function closeApp(id) {
    const rec = openWins.get(id);
    if (!rec) return;
    hooks.close[id]?.('close');
    openWins.delete(id);
    const finish = () => {
      appStore.append($(`#app-${id}`, rec.win));
      rec.win.remove();
    };
    rec.wrap.remove();
    if (reduced) finish();
    else { rec.win.classList.add('is-closing'); setTimeout(finish, 160); }
    if (activeId === id) {
      activeId = null;
      const next = topVisible(id);
      if (next) focusWin(next, true);
      else $(`.icon[data-open="${id}"]`)?.focus({ preventScroll: true });
    }
  }

  function makeDraggable(win, handle) {
    let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
    handle.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('.win-btn') || isCompact() || win.classList.contains('is-max')) return;
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      ox = win.offsetLeft; oy = win.offsetTop;
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', e => {
      if (!dragging) return;
      const area = areaRect();
      const x = clamp(ox + e.clientX - sx, 80 - win.offsetWidth, area.width - 80);
      const y = clamp(oy + e.clientY - sy, 0, area.height - 34);
      win.style.left = `${x}px`;
      win.style.top = `${y}px`;
    });
    const end = () => { dragging = false; };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  addEventListener('resize', () => {
    const area = areaRect();
    openWins.forEach(({ win }) => {
      win.style.left = `${clamp(win.offsetLeft, 80 - win.offsetWidth, area.width - 80)}px`;
      win.style.top = `${clamp(win.offsetTop, 0, Math.max(0, area.height - 34))}px`;
    });
  });

  /* ---------------- Ícones da área de trabalho ---------------- */
  const icons = $$('.icon');
  function selectIcon(icon) { icons.forEach(i => i.classList.toggle('is-selected', i === icon)); }
  icons.forEach((icon, idx) => {
    icon.addEventListener('click', () => {
      selectIcon(icon);
      if (icon.dataset.open && (isCoarse() || isCompact())) openApp(icon.dataset.open);
    });
    icon.addEventListener('dblclick', () => { if (icon.dataset.open) openApp(icon.dataset.open); });
    icon.addEventListener('keydown', e => {
      if (e.key === 'Enter' && icon.dataset.open) { e.preventDefault(); openApp(icon.dataset.open); }
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (step) {
        e.preventDefault();
        const next = icons[(idx + step + icons.length) % icons.length];
        selectIcon(next); next.focus();
      }
    });
  });
  $('#desktop').addEventListener('pointerdown', e => {
    if (!e.target.closest('.icon')) selectIcon(null);
  });

  // Qualquer [data-open] fora dos ícones abre com um clique
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-open]');
    if (el && !el.classList.contains('icon')) {
      openApp(el.dataset.open, { servico: el.dataset.servico });
      return;
    }
    const selfClose = e.target.closest('[data-act="close-self"]');
    if (selfClose) closeApp(selfClose.closest('.win')?.dataset.app);
  });

  /* ---------------- Menu Iniciar ---------------- */
  const startBtn = $('#startBtn');
  const startMenu = $('#startMenu');
  function openStart() {
    startMenu.hidden = false;
    startBtn.setAttribute('aria-expanded', 'true');
    $('button, a', startMenu.querySelector('ul'))?.focus();
  }
  function closeStart(refocus = false) {
    if (startMenu.hidden) return;
    startMenu.hidden = true;
    startBtn.setAttribute('aria-expanded', 'false');
    if (refocus) startBtn.focus();
  }
  startBtn.addEventListener('click', () => (startMenu.hidden ? openStart() : closeStart()));
  document.addEventListener('pointerdown', e => {
    if (!startMenu.hidden && !startMenu.contains(e.target) && !startBtn.contains(e.target)) closeStart();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !startMenu.hidden) closeStart(true);
  });
  startMenu.addEventListener('keydown', e => {
    const items = $$('li > button, li > a', startMenu);
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  });

  /* ---------------- Relógio ---------------- */
  const clock = $('#clock');
  const tick = () => {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    clock.dateTime = now.toISOString();
  };
  tick();
  setInterval(tick, 15000);

  /* ---------------- Caramelo em pixel ---------------- */
  const COATS = [
    { id: 'caramelo', name: 'Caramelo', f: '#E8892F', d: '#A9531A', l: '#F6C68E' },
    { id: 'malhado', name: 'Malhado', f: '#F4EBDD', d: '#3B2A20', l: '#FFFFFF' },
    { id: 'pretinho', name: 'Pretinho', f: '#2E2725', d: '#151110', l: '#7A6A60', e: '#FFF4E8', k: '#000000' },
    { id: 'fumaca', name: 'Fumaça', f: '#9C9AA3', d: '#5E5C66', l: '#D8D6DD' },
    { id: 'ruivo', name: 'Ruivo', f: '#C2481A', d: '#7E2A0B', l: '#F09A64' },
    { id: 'creme', name: 'Creme', f: '#F2D3A0', d: '#C59A5B', l: '#FFF1D8' }
  ];
  const BODY = [
    '............kkkkk...',
    '...........kdffffk..',
    '..k........kdfefffk.',
    '.kfk.......kdfffllln',
    '..kfk......kfffllltk',
    '...kfkkkkkkkfffffk..',
    '....kfffffffffffk...',
    '....kfffffffffffk...',
    '....kllllllllllfk...',
    '....kkkkkkkkkkkkk...'
  ];
  const TAIL_B = {
    2: 'k..........kdfefffk.',
    3: 'kfk........kdfffllln',
    4: '.kfk.......kfffllltk',
    5: '..kfkkkkkkkkfffffk..'
  };
  const LEGS_A = ['....kf.kf...kf.kf...', '....kk.kk...kk.kk...'];
  const LEGS_B = ['.....kf.kf.kf.kf....', '.....kk.kk.kk.kk....'];

  function frameRects(rows, coat) {
    const pal = { k: coat.k || '#1A1210', f: coat.f, d: coat.d, l: coat.l, e: coat.e || '#1A1210', n: coat.k || '#1A1210', t: '#FF6B8A' };
    let out = '';
    rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const c = row[x];
        if (c === '.' || !pal[c]) { x++; continue; }
        let len = 1;
        while (row[x + len] === c) len++;
        out += `<rect x="${x}" y="${y}" width="${len}" height="1" fill="${pal[c]}"/>`;
        x += len;
      }
    });
    return out;
  }
  function dogSVG(svg, coat, animated = false) {
    svg.setAttribute('viewBox', '0 0 20 12');
    svg.setAttribute('shape-rendering', 'crispEdges');
    const a = [...BODY, ...LEGS_A];
    const b = BODY.map((r, i) => TAIL_B[i] || r).concat(LEGS_B);
    svg.innerHTML = `<g data-f="a">${frameRects(a, coat)}</g>` + (animated ? `<g data-f="b" style="display:none">${frameRects(b, coat)}</g>` : '');
  }
  const coatById = id => COATS.find(c => c.id === id) || COATS[0];

  /* ---------------- Nome de quem escreve no Carakut ---------------- */
  // Não há perfil de visitante: o nome vem do campo do Carakut e o caramelo sai do nome.
  const coatForName = name => {
    let h = 0;
    for (const ch of name.toLowerCase()) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return COATS[h % COATS.length];
  };

  /* ---------------- Carakut (scraps) ---------------- */
  // Mural público no Supabase. O navegador só chama as funções de supabase/os-scraps.sql.
  (() => {
    const SB_URL = 'https://fzhzpzxsttflgtassyex.supabase.co';
    const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6aHpwenhzdHRmbGd0YXNzeWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNTU2NTIsImV4cCI6MjEwNDkzMTY1Mn0.rWO90rI-O8XVOWAlvuylkFWMNpjkocC0HRHBNbmrJj4';
    const PAGE = 20;
    const MAX = 500;
    const list = $('#kutList'), empty = $('#kutEmpty'), more = $('#kutMore');
    const form = $('#kutForm'), body = $('#kutBody'), send = $('#kutSend');
    const msg = $('#kutMsg'), left = $('#kutLeft'), status = $('#kutStatus');
    if (!list || !form) return;

    let scraps = [];
    let total = null;
    let loading = false;
    let loadedAt = 0;
    let exhausted = false;

    async function rpc(fn, args = {}) {
      const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const err = new Error(data?.message || `Erro ${res.status}`);
        err.code = data?.code || String(res.status);
        throw err;
      }
      return data;
    }
    const offline = err => ['PGRST202', '42P01', '42883', '404'].includes(err?.code);
    const friendly = err => offline(err) ? 'O mural do carakut ainda não está no ar.'
      : (err?.code === '22023' || err?.code === '54000') ? err.message
      : 'Não deu para falar com o carakut agora. Tente de novo.';

    const fmtDay = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });
    const fmtTime = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
    function when(iso) {
      const d = new Date(iso);
      const mins = Math.round((Date.now() - d) / 60000);
      if (mins < 1) return 'agora mesmo';
      if (mins < 60) return `há ${mins} min`;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (d >= today) return `hoje, ${fmtTime.format(d)}`;
      if (d >= new Date(today - 86400000)) return `ontem, ${fmtTime.format(d)}`;
      return fmtDay.format(d).replace('.', '');
    }

    function scrapItem(s) {
      const li = document.createElement('li');
      li.className = 'kut-scrap';
      li.innerHTML = '<svg class="kut-avatar" aria-hidden="true"></svg><div class="kut-scrap-body"><p class="kut-scrap-head"><b></b><time></time></p><p class="kut-scrap-text"></p></div>';
      dogSVG(li.firstElementChild, coatById(s.coat));
      $('b', li).textContent = s.name;
      const t = $('time', li);
      t.dateTime = s.created_at;
      t.textContent = when(s.created_at);
      $('.kut-scrap-text', li).textContent = s.body;
      return li;
    }

    function renderCount() {
      $('#kutCount').textContent = total == null ? '–' : String(total);
      $('#kutCountSmall').textContent = total == null ? '' : `(${total})`;
    }

    function renderFriends() {
      const seen = new Map();
      scraps.forEach(s => { const k = s.name.toLowerCase(); if (!seen.has(k)) seen.set(k, s); });
      const friends = [...seen.values()].slice(0, 9);
      const ul = $('#kutFriends');
      ul.replaceChildren(...friends.map(s => {
        const li = document.createElement('li');
        li.innerHTML = '<svg aria-hidden="true"></svg><span></span>';
        dogSVG(li.firstElementChild, coatById(s.coat));
        li.lastElementChild.textContent = s.name;
        return li;
      }));
      $('#kutFriendsN').textContent = seen.size ? `(${seen.size})` : '';
      if (!friends.length) {
        const li = document.createElement('li');
        li.className = 'kut-none';
        li.textContent = 'Ninguém passou por aqui ainda.';
        ul.append(li);
      }
    }

    function renderList() {
      list.replaceChildren(...scraps.map(scrapItem));
      empty.hidden = scraps.length > 0;
      if (!scraps.length) empty.textContent = 'Nenhum recado ainda. Seja a primeira visita a deixar um scrap!';
      more.hidden = exhausted;
      renderCount();
      renderFriends();
    }

    async function load(older = false) {
      if (loading) return;
      loading = true;
      more.disabled = true;
      if (!older) status.textContent = 'Carregando recados…';
      try {
        const before = older && scraps.length ? scraps[scraps.length - 1].created_at : null;
        const [rows, count] = await Promise.all([
          rpc('os_scraps_list', { p_limit: PAGE, p_before: before }),
          older ? Promise.resolve(total) : rpc('os_scraps_count')
        ]);
        scraps = older ? scraps.concat(rows) : rows;
        exhausted = rows.length < PAGE;
        total = Number(count) || 0;
        loadedAt = Date.now();
        renderList();
        status.textContent = 'Conectado ao carakut';
      } catch (err) {
        console.warn('carakut:', err);
        status.textContent = friendly(err);
        if (!scraps.length) {
          list.replaceChildren();
          empty.hidden = false;
          empty.textContent = friendly(err);
          renderFriends();
        }
      } finally {
        loading = false;
        more.disabled = false;
      }
    }

    function updateLeft() {
      const n = MAX - body.value.length;
      left.textContent = String(n);
      left.classList.toggle('is-low', n < 40);
    }
    function note(text, isError = false) {
      msg.textContent = text;
      msg.classList.toggle('is-error', isError);
    }
    body.addEventListener('input', () => { updateLeft(); note(''); });
    body.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit(); }
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const text = body.value.trim();
      if (!text) { note('Escreva alguma coisa antes de postar.', true); body.focus(); return; }
      if (/(https?:\/\/|www\.)/i.test(text)) { note('Scraps não aceitam links.', true); return; }
      const name = kutName.value.trim().replace(/\s+/g, ' ').slice(0, 24) || 'Visitante';
      store.set('cos96.kutName', name === 'Visitante' ? '' : name);
      send.disabled = true;
      note('Enviando…');
      try {
        const s = await rpc('os_scrap_post', { p_name: name, p_coat: coatForName(name).id, p_body: text });
        scraps = [s, ...scraps.filter(x => x.id !== s.id)];
        if (total != null) total += 1;
        renderList();
        const fresh = list.firstElementChild;
        fresh?.classList.add('is-new');
        setTimeout(() => fresh?.classList.remove('is-new'), 2500);
        body.value = '';
        updateLeft();
        note(`Scrap enviado! Valeu pela visita${name === 'Visitante' ? '' : `, ${name}`}.`);
      } catch (err) {
        note(friendly(err), true);
      } finally {
        send.disabled = false;
      }
    });

    more.addEventListener('click', () => load(true));

    let photosCounted = false;
    async function countPhotos() {
      if (photosCounted) return;
      photosCounted = true;
      try {
        const data = await (await fetch('/caramelo/stickers/manifest.json')).json();
        $('#kutPhotos').textContent = String((data.stickers || []).length);
      } catch { photosCounted = false; }
    }

    const kutName = $('#kutName');
    const paintAvatar = () => dogSVG($('#kutAvatar'), coatForName(kutName.value.trim() || 'Visitante'));
    kutName.value = store.get('cos96.kutName', '') || '';
    kutName.addEventListener('input', paintAvatar);
    paintAvatar();

    hooks.open.scraps = () => {
      countPhotos();
      if (!loadedAt || Date.now() - loadedAt > 60000) load();
    };
    updateLeft();
  })();

  /* ---------------- Assistente de projeto ---------------- */
  (() => {
    const root = $('#app-processo');
    const pages = $$('.wiz-page', root);
    const steps = $$('.wiz-steps li', root);
    const back = $('[data-wiz="back"]', root);
    const next = $('[data-wiz="next"]', root);
    const bar = $('.wiz-progress span', root);
    let step = 0;
    const last = pages.length - 1;
    function render() {
      pages.forEach((p, i) => { p.hidden = i !== step; });
      steps.forEach((li, i) => {
        li.classList.toggle('is-on', i + 1 === step);
        li.classList.toggle('is-done', i + 1 < step);
      });
      back.disabled = step === 0;
      next.textContent = step === last ? 'Começar meu projeto ↗' : 'Avançar ›';
      bar.style.width = `${(step / last) * 100}%`;
    }
    back.addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
    next.addEventListener('click', () => {
      if (step === last) { openApp('contato'); return; }
      step++; render();
    });
    hooks.open.processo = () => { step = 0; render(); };
    render();
  })();

  /* ---------------- Ajuda (abas) ---------------- */
  (() => {
    const tabs = $$('#app-ajuda [role="tab"]');
    function select(tab) {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
    }
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const n = tabs[(i + step + tabs.length) % tabs.length];
        select(n); n.focus();
      });
    });
  })();

  /* ---------------- Adesivos ---------------- */
  let stickersLoaded = false;
  hooks.open.adesivos = async () => {
    if (stickersLoaded) return;
    stickersLoaded = true;
    const grid = $('#photoGrid');
    const view = $('#photoView');
    try {
      const res = await fetch('/caramelo/stickers/manifest.json');
      const data = await res.json();
      const list = data.stickers || [];
      list.forEach(s => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-pressed', String(s.id === 'caramelo'));
        b.setAttribute('aria-label', s.label);
        const img = new Image();
        img.src = `/caramelo/stickers/${s.file}`;
        img.alt = '';
        img.loading = 'lazy';
        img.width = s.width; img.height = s.height;
        b.append(img);
        b.addEventListener('click', () => {
          $$('button', grid).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
          const big = $('img', view);
          big.src = img.src; big.alt = s.label; big.width = s.width; big.height = s.height;
          $('figcaption', view).textContent = s.label;
        });
        li.append(b);
        grid.append(li);
      });
      $('#photoCount').textContent = `${list.length} adesivos`;
    } catch {
      stickersLoaded = false;
      $('#photoCount').textContent = 'Não foi possível abrir a pasta agora.';
    }
  };

  /* ---------------- Lixeira ---------------- */
  (() => {
    const names = ['template-generico', 'formula-pronta', 'post-sem-direcao', 'copia-da-copia', 'pagina-igual-as-outras', 'ideia-sem-narrativa', 'modelo-final-v2', 'pauta-aleatoria'];
    const list = $('#trashFiles');
    const frag = document.createDocumentFragment();
    const TOTAL = 120;
    for (let i = 1; i <= TOTAL; i++) {
      const li = document.createElement('li');
      li.className = 'file';
      li.innerHTML = '<svg aria-hidden="true"><use href="#i-txt"/></svg><span></span>';
      li.lastElementChild.textContent = `${names[i % names.length]}-${String(i).padStart(3, '0')}.html`;
      frag.append(li);
    }
    list.append(frag);
    $('#trashCount').textContent = `${TOTAL} itens`;
    const btn = $('#btnEmpty');
    btn.addEventListener('click', () => {
      btn.disabled = true;
      const items = $$('.file', list);
      const done = () => {
        list.hidden = true;
        $('#trashMsg').hidden = true;
        $('#trashDone').hidden = false;
        $('#trashCount').textContent = '0 itens';
      };
      if (reduced) return done();
      const visible = items.slice(0, 40);
      visible.forEach((el, i) => setTimeout(() => el.classList.add('is-gone'), i * 22));
      setTimeout(done, visible.length * 22 + 380);
    });
  })();

  /* ---------------- Contato (WhatsApp) ---------------- */

  /* ---------------- Projetos (lista + prévia) ---------------- */
  (() => {
    const tabs = $$('#app-projetos [role="tab"]');
    const panelOf = t => document.getElementById(t.getAttribute('aria-controls'));
    const pauseAll = () => $$('#app-projetos video').forEach(v => v.pause());
    function select(tab, play = true) {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panelOf(t).hidden = !on;
      });
      pauseAll();
      const video = $('video', panelOf(tab));
      if (video && play && !reduced) {
        if (!video.getAttribute('src')) video.src = video.dataset.src;
        video.play().catch(() => {});
      }
      $('#app-projetos .proj-detail').scrollTop = 0;
    }
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const n = tabs[(i + step + tabs.length) % tabs.length];
        select(n); n.focus();
      });
    });
    hooks.close.projetos = pauseAll;
  })();

  /* ---------------- Jogo: Pega a Bolinha ---------------- */
  (() => {
    const canvas = $('#gameCanvas');
    const ctx = canvas.getContext('2d');
    const overlay = $('#gameOverlay');
    const scoreEl = $('#gameScore');
    const bestEl = $('#gameBest');
    const startBtnG = $('#gameStart');
    const N = 16, C = canvas.width / N;
    let snake, dirV, nextDir, ball, score, timer = 0, running = false;
    let best = store.get('cos96.best', 0);
    bestEl.textContent = best;
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

    function placeBall() {
      do { ball = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; }
      while (snake.some(s => s.x === ball.x && s.y === ball.y));
    }
    function reset() {
      snake = [{ x: 7, y: 8 }, { x: 6, y: 8 }, { x: 5, y: 8 }];
      dirV = [1, 0]; nextDir = [1, 0]; score = 0;
      scoreEl.textContent = '0';
      placeBall();
    }
    function draw() {
      ctx.fillStyle = '#1F1A17';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#26201C';
      for (let y = 0; y < N; y++) for (let x = (y % 2); x < N; x += 2) ctx.fillRect(x * C, y * C, C, C);
      // bolinha
      const bx = ball.x * C + C / 2, by = ball.y * C + C / 2;
      ctx.fillStyle = '#FFD52A';
      ctx.beginPath(); ctx.arc(bx, by, C * 0.36, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#101014'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = '#FF3D8D'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bx, by, C * 0.36, -0.6, 0.9); ctx.stroke();
      // caramelo
      snake.forEach((s, i) => {
        const head = i === 0;
        const pad = head ? 1 : i === snake.length - 1 ? 4 : 2;
        ctx.fillStyle = head ? '#FF701A' : i % 2 ? '#E8892F' : '#F09A50';
        ctx.fillRect(s.x * C + pad, s.y * C + pad, C - pad * 2, C - pad * 2);
        ctx.strokeStyle = '#101014'; ctx.lineWidth = 2;
        ctx.strokeRect(s.x * C + pad, s.y * C + pad, C - pad * 2, C - pad * 2);
        if (head) {
          const [dx, dy] = dirV;
          const cx = s.x * C + C / 2, cy = s.y * C + C / 2;
          ctx.fillStyle = '#101014';
          const px1 = -dy * 4 + dx * 3, py1 = dx * 4 + dy * 3;
          const px2 = dy * 4 + dx * 3, py2 = -dx * 4 + dy * 3;
          ctx.fillRect(cx + px1 - 1.5, cy + py1 - 1.5, 3, 3);
          ctx.fillRect(cx + px2 - 1.5, cy + py2 - 1.5, 3, 3);
          ctx.fillRect(cx + dx * 8 - 2, cy + dy * 8 - 2, 4, 4);
          // orelhas
          ctx.fillStyle = '#A9531A';
          ctx.fillRect(cx - dy * 9 - dx * 4 - 2, cy + dx * 9 - dy * 4 - 2, 4, 4);
          ctx.fillRect(cx + dy * 9 - dx * 4 - 2, cy - dx * 9 - dy * 4 - 2, 4, 4);
        }
      });
    }
    function step() {
      dirV = nextDir;
      const head = { x: snake[0].x + dirV[0], y: snake[0].y + dirV[1] };
      if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || snake.some(s => s.x === head.x && s.y === head.y)) {
        return gameOver();
      }
      snake.unshift(head);
      if (head.x === ball.x && head.y === ball.y) {
        score++;
        scoreEl.textContent = score;
        placeBall();
      } else snake.pop();
      draw();
      timer = setTimeout(step, Math.max(70, 140 - score * 3));
    }
    function start() {
      clearTimeout(timer);
      reset(); draw();
      running = true;
      overlay.hidden = true;
      startBtnG.textContent = 'Recomeçar';
      timer = setTimeout(step, 200);
    }
    function stop() { clearTimeout(timer); running = false; }
    function gameOver() {
      stop();
      if (score > best) { best = score; store.set('cos96.best', best); bestEl.textContent = best; }
      overlay.textContent = `Fim de jogo! O caramelo pegou ${score} ${score === 1 ? 'bolinha' : 'bolinhas'}. Clique em Jogar para tentar de novo.`;
      overlay.hidden = false;
      startBtnG.textContent = 'Jogar';
    }
    function turn(name) {
      const d = DIRS[name];
      if (!d || !running) return;
      if (d[0] === -dirV[0] && d[1] === -dirV[1]) return;
      nextDir = d;
    }
    startBtnG.addEventListener('click', start);
    $$('.game-pad button').forEach(b => b.addEventListener('click', () => turn(b.dataset.dir)));
    document.addEventListener('keydown', e => {
      if (activeId !== 'jogo' || e.target.matches('input, textarea, select')) return;
      const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
      const name = map[e.key];
      if (name) { e.preventDefault(); turn(name); }
      if ((e.key === ' ' || e.key === 'Enter') && !running && e.target === canvas.closest('.win')) { e.preventDefault(); start(); }
    });
    let touch = null;
    canvas.addEventListener('pointerdown', e => { touch = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointerup', e => {
      if (!touch) return;
      const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
      touch = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
      turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    });
    canvas.style.touchAction = 'none';
    hooks.open.jogo = () => { if (!snake) { reset(); draw(); } };
    hooks.close.jogo = () => {
      if (running) {
        stop();
        overlay.textContent = 'Jogo pausado. Clique em Jogar para começar de novo.';
        overlay.hidden = false;
        startBtnG.textContent = 'Jogar';
      }
    };
  })();

  /* ---------------- Boot ---------------- */
  const boot = $('#boot');
  const os = $('#os');
  const MSGS = [
    'CARREGANDO CARAMELOOS 96…',
    'ABANANDO O RABO…',
    'ESCONDENDO OS TEMPLATES GENÉRICOS…',
    'DANDO DIREÇÃO ÀS BOAS IDEIAS…',
    'BEM-VINDO AO CARAMELOOS 96'
  ];
  let booting = false;
  let bootHideTimer = 0;

  function powerOn() {
    if (booting) return;
    booting = true;
    const fill = $('#bootFill'), pct = $('#bootPct'), status = $('#bootStatus'), bar = $('#bootBar');
    const total = 2600;
    const t0 = performance.now();
    const safetyTimer = setTimeout(() => {
      if (os && !os.classList.contains('is-on')) desktopOn();
    }, total + 1000);

    const frameFn = now => {
      try {
        const p = clamp((now - t0) / total, 0, 1);
        const v = Math.round((p < 1 ? Math.floor(p * 24) / 24 : 1) * 100);
        if (fill) fill.style.width = `${v}%`;
        if (pct) pct.textContent = `${v}%`;
        if (bar) bar.setAttribute('aria-valuenow', v);
        if (status) status.textContent = MSGS[Math.min(MSGS.length - 1, Math.floor(p * (MSGS.length - 1) + (p === 1 ? 1 : 0)))];
        if (p < 1) {
          requestAnimationFrame(frameFn);
        } else {
          clearTimeout(safetyTimer);
          setTimeout(desktopOn, 450);
        }
      } catch (err) {
        console.error('Boot animation error:', err);
        clearTimeout(safetyTimer);
        desktopOn();
      }
    };
    requestAnimationFrame(frameFn);
  }

  function desktopOn() {
    if (boot) {
      boot.classList.add('is-done');
      boot.setAttribute('aria-hidden', 'true');
      clearTimeout(bootHideTimer);
      bootHideTimer = setTimeout(() => { boot.hidden = true; }, reduced ? 0 : 650);
    }
    if (os) {
      os.inert = false;
      os.classList.add('is-on');
    }
    openInitial();
  }

  function openInitial() {
    const fromHash = hashApp();
    openApp('leiame');
    if (fromHash) openApp(fromHash);
  }

  function hashApp() {
    const h = decodeURIComponent(location.hash.slice(1)).toLowerCase();
    const alias = { faq: 'ajuda', duvidas: 'ajuda', portfolio: 'projetos', 'como-trabalho': 'processo', infoprodutores: 'servicos', 'quem-sou': 'sobre', aprender: 'recursos', carakut: 'scraps', orkut: 'scraps', recados: 'scraps', scrap: 'scraps' };
    const id = alias[h] || h;
    return APPS[id] ? id : null;
  }
  addEventListener('hashchange', () => { const id = hashApp(); if (id && os && os.classList.contains('is-on')) openApp(id); });

  function restart() {
    closeStart();
    [...openWins.keys()].forEach(id => closeApp(id));
    clearTimeout(bootHideTimer);
    if (os) {
      os.inert = true;
      os.classList.remove('is-on');
    }
    if (boot) {
      boot.hidden = false;
      boot.removeAttribute('aria-hidden');
      booting = false;
      void boot.offsetWidth;
      boot.classList.remove('is-done');
    }
    powerOn();
  }
  const btnRestart = $('#btnRestart');
  if (btnRestart) btnRestart.addEventListener('click', restart);

  function init() {
    const params = new URLSearchParams(location.search);
    if (reduced || params.get('boot') === 'off') {
      if (boot) boot.hidden = true;
      booting = true;
      desktopOn();
    } else {
      powerOn();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
