// QA ao vivo da página inicial CarameloOS (public/index.html) em Edge headless via CDP.
// Uso: npm run dev (porta 5180) e, em outro terminal, node scripts/verify-os-home.mjs (ou HOME_QA_URL=...).
// A landing anterior continua em /estudio (public/estudio.html).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = process.env.HOME_QA_URL || 'http://127.0.0.1:5180/';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9600 + Math.floor(Math.random() * 300);
const output = path.resolve('docs/qa-os');
fs.mkdirSync(output, { recursive: true });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const errors = [];
const networkFailures = [];
const checks = [];
let interceptedLead = null;

const profileDir = path.join(process.env.TEMP || process.env.TMP || '.', `caramelo-os-qa-${Date.now()}`);
const edge = spawn(edgePath, [
  `--remote-debugging-port=${port}`, '--headless=new', '--window-size=1440,900', '--disable-gpu',
  '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profileDir}`, 'about:blank'
], { windowsHide: true, stdio: 'ignore' });
edge.on('error', error => errors.push(`Edge launch: ${error.message}`));

let ws;
try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(500) });
      target = (await response.json()).find(t => t.type === 'page');
    } catch {}
    if (!target) await sleep(200);
  }
  if (!target) throw new Error('Headless Edge did not start');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

  let seq = 0;
  const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
    pending.set(id, { resolve, reject, timeout });
    ws.send(JSON.stringify({ id, method, params }));
  });
  ws.onmessage = async event => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const task = pending.get(msg.id);
      pending.delete(msg.id);
      clearTimeout(task.timeout);
      msg.error ? task.reject(new Error(JSON.stringify(msg.error))) : task.resolve(msg.result);
    }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map(a => a.value || a.description).join(' '));
    if (msg.method === 'Network.responseReceived') {
      const r = msg.params.response;
      if (r.status >= 400 && r.url.startsWith(baseUrl) && !r.url.includes('/api/leads')) networkFailures.push({ url: r.url, status: r.status });
    }
    if (msg.method === 'Fetch.requestPaused') {
      const { requestId, request } = msg.params;
      if (request.url.includes('/api/leads')) {
        interceptedLead = JSON.parse(request.postData || '{}');
        await send('Fetch.fulfillRequest', {
          requestId, responseCode: 201,
          responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
          body: Buffer.from(JSON.stringify({ success: true, message: 'QA interceptado.', lead_id: 'qa-intercepted' })).toString('base64')
        });
      } else await send('Fetch.continueRequest', { requestId });
    }
  };

  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result?.value;
  };
  const check = (name, passed, detail = null) => {
    checks.push({ name, passed: !!passed, detail });
    console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${detail === null ? '' : ': ' + JSON.stringify(detail)}`);
  };
  const waitFor = async (expression, ms = 6000) => {
    const t0 = Date.now();
    // Durante a navegação o elemento pode ainda não existir: erro conta como "ainda não".
    while (Date.now() - t0 < ms) { if (await evaluate(expression).catch(() => false)) return true; await sleep(100); }
    return false;
  };
  const screenshot = async name => {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(output, name), Buffer.from(data, 'base64'));
  };
  const viewport = async (width, height, mobile = false) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    await send('Emulation.setTouchEmulationEnabled', mobile ? { enabled: true, maxTouchPoints: 1 } : { enabled: false });
  };
  // getBoundingClientRect vem em px de layout (public/ui-scale.js); o clique do CDP espera px de tela.
  const center = async selector => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const r = el.getBoundingClientRect(); const z = window.__uiScale ? window.__uiScale.zoom : 1; return { x: (r.x + r.width / 2) * z, y: (r.y + r.height / 2) * z }; })()`);
  const mouse = async (type, x, y, clickCount = 1) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount });
  const click = async (selector, count = 1) => {
    const p = await center(selector);
    if (!p) throw new Error(`Element not found: ${selector}`);
    for (let c = 1; c <= count; c++) { await mouse('mousePressed', p.x, p.y, c); await mouse('mouseReleased', p.x, p.y, c); }
  };
  const key = async (keyName, code = keyName, keyCode = 0) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: keyName, code, windowsVirtualKeyCode: keyCode });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code, windowsVirtualKeyCode: keyCode });
  };
  const openWins = () => evaluate(`[...document.querySelectorAll('.win')].map(w => w.dataset.app)`);

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*api/leads*', requestStage: 'Request' }] });

  /* ---- 1. Boot ---- */
  await viewport(1440, 900);
  await send('Page.navigate', { url: baseUrl });
  await waitFor(`document.readyState === 'complete'`);
  const boot0 = await evaluate(`({ title: document.title, booting: !document.querySelector('#boot').hidden, inert: document.querySelector('#os').inert, h1: document.querySelectorAll('h1').length })`);
  check('boot screen starts automatically with desktop inert', boot0.booting && boot0.inert, boot0);
  check('one semantic H1 and the studio title', boot0.h1 === 1 && /Um Cara Caramelo/.test(boot0.title), boot0);
  await screenshot('os-boot.png');
  check('desktop turns on after the loading bar', await waitFor(`document.querySelector('#os').classList.contains('is-on') && !document.querySelector('#os').inert`, 6000));
  await sleep(900);
  const first = await openWins();
  check('first visit opens only Leia-me (no visitor profile, no walking pet)', first.join() === 'leiame', first);

  /* ---- 2. Fundo em vídeo, post-it e escala ---- */
  const look = await evaluate(`(() => { const v = document.querySelector('.wallpaper video'); return { video: !!v && v.muted && v.loop && !!v.poster, pet: !!document.querySelector('#pet'), profile: !!document.querySelector('#app-perfil'), postit: document.querySelector('.postit p').textContent, zoom: getComputedStyle(document.documentElement).zoom, scale: getComputedStyle(document.documentElement).getPropertyValue('--ui-zoom').trim() }; })()`);
  check('desktop background is the looping hero video and the pet/profile are gone', look.video && !look.pet && !look.profile, look);
  check('post-it asks the audience about their landing page', /landing page/i.test(look.postit), look.postit);
  check('large screens render at 80% scale', look.zoom === '0.8' && look.scale === '0.8', look);
  await screenshot('os-desktop.png');

  /* ---- 3. Cada ícone abre seu programa ---- */
  const iconIds = await evaluate(`[...document.querySelectorAll('.icon[data-open]')].map(i => i.dataset.open)`);
  const failures = [];
  for (const id of iconIds) {
    await evaluate(`document.querySelectorAll('.win [data-act="close"]').forEach(b => b.click())`);
    await sleep(250);
    await click(`.icon[data-open="${id}"]`, 2);
    await sleep(350);
    const st = await evaluate(`(() => { const w = document.querySelector('.win[data-app="${id}"]'); if (!w) return null; const r = w.getBoundingClientRect(); return { active: w.classList.contains('is-active'), text: w.querySelector('.win-body').innerText.trim().length, inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight - 40, task: !!document.querySelector('.task.is-active') }; })()`);
    if (!st || !st.active || st.text < 20 || !st.inView || !st.task) failures.push({ id, st });
  }
  check(`all ${iconIds.length} desktop icons open an active, filled, on-screen window with a taskbar button`, failures.length === 0, failures.length ? failures : iconIds);

  /* ---- 4. Arrastar, minimizar, maximizar ---- */
  await evaluate(`document.querySelectorAll('.win [data-act="close"]').forEach(b => b.click())`);
  await sleep(250);
  await click('.icon[data-open="sobre"]', 2);
  await sleep(300);
  const before = await evaluate(`(() => { const w = document.querySelector('.win[data-app="sobre"]'); return { x: w.offsetLeft, y: w.offsetTop }; })()`);
  const t = await center('.win[data-app="sobre"] .win-name');
  await mouse('mousePressed', t.x, t.y);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: t.x + 60, y: t.y + 30, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: t.x + 120, y: t.y + 70, button: 'left', buttons: 1 });
  await mouse('mouseReleased', t.x + 120, t.y + 70);
  const after = await evaluate(`(() => { const w = document.querySelector('.win[data-app="sobre"]'); return { x: w.offsetLeft, y: w.offsetTop }; })()`);
  // O mouse anda em px de tela; com a escala de 80% a janela anda o equivalente em px de layout.
  const dragZoom = await evaluate(`window.__uiScale ? window.__uiScale.zoom : 1`);
  check('window drags by its title bar, following the mouse at any scale', Math.abs(after.x - before.x - 120 / dragZoom) <= 1 && Math.abs(after.y - before.y - 70 / dragZoom) <= 1, { before, after, dragZoom });
  await click('.win[data-app="sobre"] [data-act="max"]');
  const maxed = await evaluate(`document.querySelector('.win[data-app="sobre"]').getBoundingClientRect().width >= innerWidth - 2`);
  await click('.win[data-app="sobre"] [data-act="max"]');
  await click('.win[data-app="sobre"] [data-act="min"]');
  const minned = await evaluate(`document.querySelector('.win[data-app="sobre"]').hidden`);
  await click('.task');
  const restored = await evaluate(`!document.querySelector('.win[data-app="sobre"]').hidden`);
  check('maximize, minimize and restore from the taskbar', maxed && minned && restored, { maxed, minned, restored });

  /* ---- 5. Menu Iniciar ---- */
  await click('#startBtn');
  const menuOpen = await evaluate(`!document.querySelector('#startMenu').hidden && document.querySelector('#startBtn').getAttribute('aria-expanded') === 'true'`);
  await key('Escape', 'Escape', 27);
  const menuClosed = await evaluate(`document.querySelector('#startMenu').hidden`);
  await click('#startBtn');
  await click('#startMenu [data-open="ajuda"]');
  await sleep(250);
  const helpOpen = await evaluate(`document.querySelector('.win.is-active')?.dataset.app === 'ajuda' && document.querySelector('#startMenu').hidden`);
  check('start menu opens, closes with Escape, and launches programs', menuOpen && menuClosed && helpOpen, { menuOpen, menuClosed, helpOpen });
  await click('#faqt-3');
  check('help topics switch panels', await evaluate(`!document.querySelector('#faq-3').hidden && document.querySelector('#faq-1').hidden`));

  /* ---- 6. Lixeira, assistente e contato ---- */
  await click('.icon[data-open="lixeira"]', 2);
  await sleep(250);
  check('trash starts full of generic templates', await evaluate(`document.querySelectorAll('#trashFiles .file').length === 120 && document.querySelector('#trashCount').textContent === '120 itens'`));
  await click('#btnEmpty');
  check('emptying the trash reveals the message and CTA', await waitFor(`!document.querySelector('#trashDone').hidden && document.querySelector('#trashCount').textContent === '0 itens'`, 4000));

  await click('.icon[data-open="processo"]', 2);
  await sleep(250);
  for (let i = 0; i < 4; i++) { await click('[data-wiz="next"]'); await sleep(60); }
  const finalLabel = await evaluate(`document.querySelector('[data-wiz="next"]').textContent`);
  await click('[data-wiz="next"]');
  await sleep(300);
  check('project wizard walks 4 steps and finishes on Contato', /Começar/.test(finalLabel) && await evaluate(`document.querySelector('.win.is-active')?.dataset.app === 'contato'`), finalLabel);
  const wa = await evaluate(`(() => { const a = document.querySelector('#waContact'); return { href: a.href, target: a.target, rel: a.rel, visible: !!a.offsetParent }; })()`);
  check('contact opens WhatsApp in a new tab', /^https:\/\/wa\.me\/5531985869015\?text=/.test(wa.href) && wa.target === '_blank' && /noopener/.test(wa.rel) && wa.visible, wa);

  /* ---- 6b. Projetos com prévia ---- */
  await click('.icon[data-open="projetos"]', 2);
  await sleep(300);
  await click('#projt-3');
  await sleep(300);
  const proj = await evaluate(`(() => { const p = document.querySelector('#proj-3'); const v = p.querySelector('video'); return { shown: !p.hidden, others: [...document.querySelectorAll('#app-projetos [role="tabpanel"]')].filter(x => !x.hidden).length, src: v.getAttribute('src'), title: p.querySelector('h3').textContent }; })()`);
  check('projects list shows one project with its video preview', proj.shown && proj.others === 1 && /work-03\.mp4$/.test(proj.src || '') && proj.title === 'Conselho Head', proj);
  await click('.win[data-app="projetos"] [data-act="close"]');
  await sleep(250);
  check('closing Projetos pauses the preview video', await evaluate(`[...document.querySelectorAll('#app-projetos video')].every(v => v.paused)`));

  /* ---- 6c. LAB e landing clássica ---- */
  const lab = await evaluate(`({ icon: document.querySelector('.icon[href="/library/home"]')?.textContent.trim(), start: !!document.querySelector('#startMenu a[href="/library/home"]'), classic: !!document.querySelector('#startMenu a[href="/estudio"]') })`);
  check('LAB shortcut on the desktop and in the start menu, plus the classic site link', lab.icon === 'Entrar no LAB' && lab.start && lab.classic, lab);
  const estudio = await evaluate(`fetch('/estudio', { headers: { accept: 'text/html' } }).then(async r => ({ status: r.status, classic: (await r.text()).includes('commercial-home') }))`);
  check('/estudio serves the previous landing page', estudio.status === 200 && estudio.classic, estudio);
  const authRedirect = await evaluate(`fetch('/', { headers: { accept: 'text/html' } }).then(r => r.text()).then(t => t.includes("location.replace('/library/home'"))`);
  check('Supabase auth returns on / are still forwarded to the LAB', authRedirect);

  /* ---- 7. Adesivos e jogo ---- */
  await click('.icon[data-open="adesivos"]', 2);
  check('stickers folder loads every sticker', await waitFor(`document.querySelectorAll('#photoGrid button').length === 28`, 4000));
  await click('#photoGrid li:nth-child(6) button');
  check('clicking a sticker shows it large', await evaluate(`document.querySelector('#photoView figcaption').textContent === document.querySelector('#photoGrid li:nth-child(6) button').getAttribute('aria-label')`));

  await click('.icon[data-open="jogo"]', 2);
  await sleep(250);
  await click('#gameStart');
  await sleep(400);
  const running = await evaluate(`document.querySelector('#gameOverlay').hidden`);
  check('game starts and ends when the dog hits the wall', running && await waitFor(`!document.querySelector('#gameOverlay').hidden && /Fim de jogo/.test(document.querySelector('#gameOverlay').textContent)`, 5000), { running });

  /* ---- 8. Orkut: nome próprio, comunidades e participar ---- */
  await click('.icon[data-open="scraps"]', 2);
  await sleep(300);
  await evaluate(`(() => { const i = document.querySelector('#kutName'); i.value = 'QA'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  check('Orkut asks for a name and paints an avatar from it', await evaluate(`document.querySelectorAll('#kutAvatar rect').length > 20 && !!document.querySelector('#kutName')`));
  const orkut = await evaluate(`({ label: document.querySelector('.icon[data-open="scraps"] span').textContent, logo: !!document.querySelector('.kut-logo')?.complete, comms: [...document.querySelectorAll('#kutComms [data-comm] b')].map(b => b.textContent) })`);
  check('Orkut has its name, logo and the six classic communities', orkut.label === 'Orkut' && orkut.logo && orkut.comms.length === 6 && orkut.comms.includes('Eu Odeio Acordar Cedo'), orkut);
  await evaluate(`document.querySelector('#kutComms [data-comm="acordar-cedo"]').click()`);
  await sleep(200);
  const page = await evaluate(`({ home: document.querySelector('#kutViewHome').hidden, title: document.querySelector('#kutCommTitle').textContent, members: document.querySelector('#kutCommMembers').textContent, notice: document.querySelector('#kutNotice').textContent })`);
  check('a community opens its own page as a private community', page.home && page.title === 'Eu Odeio Acordar Cedo' && /6\.106\.962 membros/.test(page.members) && /Comunidade particular/.test(page.notice), page);
  await evaluate(`document.querySelector('#kutJoin').click()`);
  await sleep(150);
  const joinedState = await evaluate(`({ pressed: document.querySelector('#kutJoin').getAttribute('aria-pressed'), members: document.querySelector('#kutCommMembers').textContent, saved: localStorage.getItem('cos.orkut.comunidades') })`);
  check('joining a community counts the visitor and is remembered', joinedState.pressed === 'true' && /6\.106\.963/.test(joinedState.members) && /acordar-cedo/.test(joinedState.saved), joinedState);
  await click('.kut-nav [data-kut="home"]');
  await sleep(150);
  check('Home goes back to the scrap wall', await evaluate(`!document.querySelector('#kutViewHome').hidden && document.querySelector('#kutViewComm').hidden`));

  /* ---- 9. Link direto, reinício e movimento reduzido ---- */
  await send('Page.navigate', { url: `${baseUrl}?boot=off#como-trabalho` });
  await waitFor(`document.querySelector('#os').classList.contains('is-on')`, 4000);
  await sleep(300);
  check('/#como-trabalho (used by other pages) skips nothing else and opens Como Trabalho', await evaluate(`document.querySelector('#boot').hidden && document.querySelector('.win.is-active')?.dataset.app === 'processo'`));
  await click('#startBtn');
  await waitFor(`!document.querySelector('#startMenu').hidden`, 2000);
  await click('#btnRestart');
  await waitFor(`!document.querySelector('#boot').hidden && document.querySelectorAll('.win').length === 0`, 2000);
  check('restart closes windows and returns to the boot screen', await evaluate(`!document.querySelector('#boot').hidden && !document.querySelector('#boot').classList.contains('is-done') && document.querySelectorAll('.win').length === 0 && document.querySelector('#os').inert`));

  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await send('Page.navigate', { url: baseUrl });
  await waitFor(`document.readyState === 'complete'`);
  await sleep(300);
  check('reduced motion skips the boot animation', await evaluate(`document.querySelector('#boot').hidden && document.querySelector('#os').classList.contains('is-on')`));
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });

  /* ---- 10. Celular ---- */
  await viewport(375, 812, true);
  await send('Page.navigate', { url: `${baseUrl}?boot=off` });
  await waitFor(`document.querySelector('#os').classList.contains('is-on')`, 4000);
  await sleep(500);
  await evaluate(`document.querySelectorAll('.win [data-act="close"]').forEach(b => b.click())`);
  await waitFor(`document.querySelectorAll('.win').length === 0`, 3000);
  await sleep(150);
  await click('.icon[data-open="servicos"]');
  await waitFor(`!!document.querySelector('.win[data-app="servicos"]')`, 2000);
  const mobile = await evaluate(`(() => { const w = document.querySelector('.win[data-app="servicos"]'); const r = w?.getBoundingClientRect(); return { open: !!w, left: r && Math.round(r.left), right: r && Math.round(r.right), scrollWidth: document.documentElement.scrollWidth, innerWidth, coarse: matchMedia('(pointer: coarse)').matches, wins: [...document.querySelectorAll('.win')].map(x => x.dataset.app), selected: document.querySelector('.icon.is-selected')?.dataset.open }; })()`);
  check('mobile: a single tap opens a full-width window without horizontal scroll', mobile.open && mobile.left >= 0 && mobile.right <= mobile.innerWidth && mobile.scrollWidth <= mobile.innerWidth, mobile);
  await screenshot('os-mobile.png');

  check('no console errors or exceptions', errors.length === 0, errors);
  check('no local 4xx/5xx responses', networkFailures.length === 0, networkFailures);
} catch (error) {
  checks.push({ name: 'run completed', passed: false, detail: error.message });
  console.error('FAIL run completed:', error.message);
} finally {
  try { ws?.close(); } catch {}
  edge.kill();
  const failed = checks.filter(c => !c.passed);
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ baseUrl, measuredAt: new Date().toISOString(), checks, errors, networkFailures }, null, 2));
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed. Screenshots and report in docs/qa-os/.`);
  if (failed.length) process.exitCode = 1;
}
