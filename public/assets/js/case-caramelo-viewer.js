/**
 * CAROUSEL CASE VIEWER
 * Componente interativo de visualização de carrosséis com alternância entre
 * Modo Visual (foco na arte) e Modo Estratégico (análise técnica e narrativa).
 *
 * Suporte completo a:
 * - Navegação por teclado (← / → / Esc)
 * - Gestos touch/swipe no mobile
 * - Trava de scroll no body e restauração de foco acessível
 * - Miniaturas interativas e indicador de progresso
 */

import { CAROUSEL_SERIES } from './case-caramelo-data.js';

class CarouselCaseViewer {
  constructor() {
    this.modal = null;
    this.currentSeries = null;
    this.currentSlideIndex = 0;
    this.currentMode = 'visual'; // 'visual' | 'strategic'
    this.previousActiveElement = null;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.isOpen = false;

    this.init();
  }

  init() {
    this.createDom();
    this.bindGlobalEvents();
  }

  createDom() {
    const existing = document.getElementById('cm-case-viewer-modal');
    if (existing) existing.remove();

    const template = `
      <div id="cm-case-viewer-modal" class="cm-cv-backdrop" role="dialog" aria-modal="true" aria-labelledby="cm-cv-title" hidden>
        <div class="cm-cv-container">
          <!-- Topbar -->
          <header class="cm-cv-topbar">
            <div class="cm-cv-topbar__series-info">
              <span class="cm-cv-badge" id="cm-cv-pillar-badge">Identificação</span>
              <h2 id="cm-cv-title" class="cm-cv-series-title">Série</h2>
            </div>

            <!-- Mode Switcher -->
            <div class="cm-cv-mode-toggle" role="radiogroup" aria-label="Modo de visualização">
              <button type="button" class="cm-cv-mode-btn is-active" data-cv-mode="visual" role="radio" aria-checked="true" id="cm-cv-mode-visual">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span>Modo Visual</span>
              </button>
              <button type="button" class="cm-cv-mode-btn" data-cv-mode="strategic" role="radio" aria-checked="false" id="cm-cv-mode-strategic">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                <span>Modo Estratégico</span>
              </button>
            </div>

            <!-- Close Button -->
            <button type="button" class="cm-cv-close-btn" id="cm-cv-close" aria-label="Fechar visualizador (Esc)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </header>

          <!-- Main Stage -->
          <main class="cm-cv-stage" id="cm-cv-stage">
            <!-- Slide Image Frame -->
            <div class="cm-cv-media-wrapper" id="cm-cv-media-wrapper">
              <div class="cm-cv-media-inner">
                <img id="cm-cv-slide-img" class="cm-cv-slide-image" src="" alt="" loading="eager" decoding="async">
              </div>

              <!-- Navigation Chevrons -->
              <button type="button" class="cm-cv-nav-btn cm-cv-nav-btn--prev" id="cm-cv-prev" aria-label="Slide anterior (Seta esquerda)">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button type="button" class="cm-cv-nav-btn cm-cv-nav-btn--next" id="cm-cv-next" aria-label="Próximo slide (Seta direita)">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            <!-- Strategic Explanation Panel (visible in strategic mode) -->
            <aside class="cm-cv-strategic-panel" id="cm-cv-strategic-panel" aria-label="Explicação estratégica do slide">
              <div class="cm-cv-strategic-content">
                <div class="cm-cv-strategic-header">
                  <span class="cm-cv-strategic-slide-tag" id="cm-cv-slide-tag">Slide 01 de 06</span>
                  <h3 class="cm-cv-strategic-headline" id="cm-cv-slide-headline">Título do Slide</h3>
                  <p class="cm-cv-strategic-lead" id="cm-cv-slide-lead">Subtítulo ou texto complementar</p>
                </div>

                <div class="cm-cv-strategic-cards">
                  <div class="cm-cv-fact-card">
                    <div class="cm-cv-fact-tag">
                      <span class="cm-cv-dot cm-cv-dot--orange"></span>
                      <strong>INTENÇÃO</strong>
                    </div>
                    <p id="cm-cv-strat-intention">-</p>
                  </div>

                  <div class="cm-cv-fact-card">
                    <div class="cm-cv-fact-tag">
                      <span class="cm-cv-dot cm-cv-dot--sky"></span>
                      <strong>DECISÃO NARRATIVA</strong>
                    </div>
                    <p id="cm-cv-strat-narrative">-</p>
                  </div>

                  <div class="cm-cv-fact-card">
                    <div class="cm-cv-fact-tag">
                      <span class="cm-cv-dot cm-cv-dot--violet"></span>
                      <strong>DECISÃO VISUAL</strong>
                    </div>
                    <p id="cm-cv-strat-visual">-</p>
                  </div>

                  <div class="cm-cv-fact-card">
                    <div class="cm-cv-fact-tag">
                      <span class="cm-cv-dot cm-cv-dot--yellow"></span>
                      <strong>CONTRIBUIÇÃO PARA A ESTRATÉGIA</strong>
                    </div>
                    <p id="cm-cv-strat-contribution">-</p>
                  </div>
                </div>
              </div>
            </aside>
          </main>

          <!-- Footer Bar with Counter & Thumbs -->
          <footer class="cm-cv-footer">
            <div class="cm-cv-progress-indicator">
              <span id="cm-cv-counter" class="cm-cv-counter">01 / 06</span>
              <div class="cm-cv-progress-bar">
                <div class="cm-cv-progress-fill" id="cm-cv-progress-fill"></div>
              </div>
            </div>

            <!-- Thumbnails strip -->
            <div class="cm-cv-thumbs-track" id="cm-cv-thumbs-track" role="tablist" aria-label="Miniaturas dos slides"></div>
          </footer>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', template);
    this.modal = document.getElementById('cm-case-viewer-modal');
  }

  bindGlobalEvents() {
    // Esc & Arrow key navigation
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        this.nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        this.prevSlide();
      }
    });

    // Close button & backdrop click
    this.modal?.querySelector('#cm-cv-close')?.addEventListener('click', () => this.close());
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // Prev / Next buttons
    this.modal?.querySelector('#cm-cv-prev')?.addEventListener('click', () => this.prevSlide());
    this.modal?.querySelector('#cm-cv-next')?.addEventListener('click', () => this.nextSlide());

    // Mode buttons
    const modeBtns = this.modal?.querySelectorAll('.cm-cv-mode-btn');
    modeBtns?.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.cvMode;
        if (mode) this.setMode(mode);
      });
    });

    // Touch / Swipe on stage
    const stage = this.modal?.querySelector('#cm-cv-stage');
    stage?.addEventListener('touchstart', (e) => {
      this.touchStartX = e.changedTouches[0].screenX;
      this.touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    stage?.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].screenX;
      const endY = e.changedTouches[0].screenY;
      const diffX = endX - this.touchStartX;
      const diffY = endY - this.touchStartY;

      // Ensure horizontal swipe dominates vertical scroll
      if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX < 0) {
          this.nextSlide();
        } else {
          this.prevSlide();
        }
      }
    }, { passive: true });

    // Delegated click on trigger buttons across page
    document.addEventListener('click', (e) => {
      const trigger = e.target instanceof Element ? e.target.closest('[data-open-carousel-case]') : null;
      if (!trigger) return;

      e.preventDefault();
      const seriesId = trigger.getAttribute('data-open-carousel-case') || 'serie-01';
      const initialSlide = parseInt(trigger.getAttribute('data-initial-slide') || '0', 10);
      const initialMode = trigger.getAttribute('data-initial-mode') || 'visual';

      this.open(seriesId, initialSlide, initialMode, trigger);
    });
  }

  open(seriesId, slideIndex = 0, mode = 'visual', triggerElement = null) {
    const series = CAROUSEL_SERIES.find(s => s.id === seriesId) || CAROUSEL_SERIES[0];
    if (!series) return;

    this.previousActiveElement = triggerElement || document.activeElement;
    this.currentSeries = series;
    this.currentSlideIndex = Math.max(0, Math.min(slideIndex, series.slides.length - 1));
    this.isOpen = true;

    // Lock body scroll
    document.body.classList.add('cm-case-viewer-active');
    document.documentElement.classList.add('cm-case-viewer-active');

    // Show modal
    this.modal.removeAttribute('hidden');
    this.modal.classList.add('is-open');

    // Populate series info
    const titleEl = document.getElementById('cm-cv-title');
    const badgeEl = document.getElementById('cm-cv-pillar-badge');
    if (titleEl) titleEl.textContent = series.title;
    if (badgeEl) {
      badgeEl.textContent = `${series.pillarLabel} · ${series.category}`;
      badgeEl.style.backgroundColor = series.pillarId === 'identificacao' ? 'rgba(255, 112, 26, 0.2)' : 'rgba(37, 191, 255, 0.2)';
      badgeEl.style.color = series.pillarId === 'identificacao' ? '#FF701A' : '#25BFFF';
    }

    // Render thumbs
    this.renderThumbs();

    // Set mode
    this.setMode(mode);

    // Render slide
    this.renderCurrentSlide();

    // Focus close button for accessibility
    setTimeout(() => {
      document.getElementById('cm-cv-close')?.focus();
    }, 50);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;

    this.modal?.classList.remove('is-open');
    this.modal?.setAttribute('hidden', '');

    // Unlock body scroll
    document.body.classList.remove('cm-case-viewer-active');
    document.documentElement.classList.remove('cm-case-viewer-active');

    // Restore focus
    if (this.previousActiveElement instanceof HTMLElement) {
      this.previousActiveElement.focus();
    }
  }

  setMode(mode) {
    this.currentMode = mode;
    const stage = document.getElementById('cm-cv-stage');
    const visualBtn = document.getElementById('cm-cv-mode-visual');
    const strategicBtn = document.getElementById('cm-cv-mode-strategic');

    if (mode === 'strategic') {
      stage?.classList.add('is-strategic');
      visualBtn?.classList.remove('is-active');
      visualBtn?.setAttribute('aria-checked', 'false');
      strategicBtn?.classList.add('is-active');
      strategicBtn?.setAttribute('aria-checked', 'true');
    } else {
      stage?.classList.remove('is-strategic');
      visualBtn?.classList.add('is-active');
      visualBtn?.setAttribute('aria-checked', 'true');
      strategicBtn?.classList.remove('is-active');
      strategicBtn?.setAttribute('aria-checked', 'false');
    }
  }

  renderThumbs() {
    const track = document.getElementById('cm-cv-thumbs-track');
    if (!track || !this.currentSeries) return;

    track.innerHTML = this.currentSeries.slides.map((s, idx) => `
      <button type="button" class="cm-cv-thumb-btn ${idx === this.currentSlideIndex ? 'is-active' : ''}" data-thumb-index="${idx}" role="tab" aria-selected="${idx === this.currentSlideIndex}" aria-label="Ir para slide ${idx + 1}">
        <img src="${s.thumb}" alt="Miniatura ${idx + 1}" loading="lazy">
        <span class="cm-cv-thumb-num">${String(idx + 1).padStart(2, '0')}</span>
      </button>
    `).join('');

    track.querySelectorAll('.cm-cv-thumb-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.thumbIndex || '0', 10);
        this.goToSlide(idx);
      });
    });
  }

  goToSlide(index) {
    if (!this.currentSeries) return;
    this.currentSlideIndex = Math.max(0, Math.min(index, this.currentSeries.slides.length - 1));
    this.renderCurrentSlide();
  }

  nextSlide() {
    if (!this.currentSeries) return;
    if (this.currentSlideIndex < this.currentSeries.slides.length - 1) {
      this.goToSlide(this.currentSlideIndex + 1);
    } else {
      // Loop or bounce
      this.goToSlide(0);
    }
  }

  prevSlide() {
    if (!this.currentSeries) return;
    if (this.currentSlideIndex > 0) {
      this.goToSlide(this.currentSlideIndex - 1);
    } else {
      this.goToSlide(this.currentSeries.slides.length - 1);
    }
  }

  renderCurrentSlide() {
    if (!this.currentSeries) return;
    const slide = this.currentSeries.slides[this.currentSlideIndex];
    if (!slide) return;

    // 1. Update image
    const img = document.getElementById('cm-cv-slide-img');
    if (img) {
      img.src = slide.image;
      img.alt = `${this.currentSeries.title} — Slide ${slide.num}: ${slide.headline}`;
    }

    // 2. Update Counter & Progress Fill
    const total = this.currentSeries.slides.length;
    const currentNum = this.currentSlideIndex + 1;
    const counterEl = document.getElementById('cm-cv-counter');
    const fillEl = document.getElementById('cm-cv-progress-fill');

    if (counterEl) counterEl.textContent = `${String(currentNum).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    if (fillEl) fillEl.style.width = `${(currentNum / total) * 100}%`;

    // 3. Update Strategic Panel
    const tagEl = document.getElementById('cm-cv-slide-tag');
    const headlineEl = document.getElementById('cm-cv-slide-headline');
    const leadEl = document.getElementById('cm-cv-slide-lead');
    const intEl = document.getElementById('cm-cv-strat-intention');
    const narEl = document.getElementById('cm-cv-strat-narrative');
    const visEl = document.getElementById('cm-cv-strat-visual');
    const conEl = document.getElementById('cm-cv-strat-contribution');

    if (tagEl) tagEl.textContent = `Slide ${String(currentNum).padStart(2, '0')} de ${String(total).padStart(2, '0')}`;
    if (headlineEl) headlineEl.textContent = slide.headline;
    if (leadEl) leadEl.textContent = slide.lead || '';
    if (intEl) intEl.textContent = slide.intention || '-';
    if (narEl) narEl.textContent = slide.narrativeDecision || '-';
    if (visEl) visEl.textContent = slide.visualDecision || '-';
    if (conEl) conEl.textContent = slide.strategicContribution || '-';

    // 4. Update Thumb buttons active state
    const track = document.getElementById('cm-cv-thumbs-track');
    track?.querySelectorAll('.cm-cv-thumb-btn').forEach((btn, i) => {
      const active = i === this.currentSlideIndex;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
      if (active) {
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });

    // 5. Update prev/next button states
    const prevBtn = document.getElementById('cm-cv-prev');
    const nextBtn = document.getElementById('cm-cv-next');
    if (prevBtn) prevBtn.setAttribute('title', `Slide anterior: ${this.currentSlideIndex === 0 ? 'ir para o último' : this.currentSlideIndex}`);
    if (nextBtn) nextBtn.setAttribute('title', `Próximo slide: ${this.currentSlideIndex === total - 1 ? 'voltar ao início' : this.currentSlideIndex + 2}`);
  }
}

// Auto-initialize viewer on DOMContentLoaded or immediately
let viewerInstance = null;

export function initCarouselCaseViewer() {
  if (!viewerInstance) {
    viewerInstance = new CarouselCaseViewer();
  }
  return viewerInstance;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initCarouselCaseViewer());
  } else {
    initCarouselCaseViewer();
  }
}
