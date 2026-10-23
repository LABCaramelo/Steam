import { Project, Clip } from '../types';
import { PlaybackEngine } from '../engine/PlaybackEngine';

export class CanvasPlayer {
  private lifecycle = new AbortController();
  private element: HTMLElement;
  private canvas: HTMLCanvasElement;
  private playbackEngine: PlaybackEngine;
  private project: Project;
  private timecodeEl: HTMLElement | null = null;
  private playPauseBtn: HTMLElement | null = null;
  private viewportObserver: ResizeObserver;
  private canvasObserver: MutationObserver;

  private isDraggingGizmo: boolean = false;
  private dragMode: 'move' | 'scale' | 'rotate' | null = null;
  private startMousePos = { x: 0, y: 0 };
  private initialClipState = { x: 0, y: 0, scale: 1, rotation: 0 };

  constructor(project: Project, playbackEngine: PlaybackEngine, canvas: HTMLCanvasElement) {
    this.project = project;
    this.playbackEngine = playbackEngine;
    this.canvas = canvas;
    this.element = document.createElement('section');
    this.element.className = 'montagem-player-area';

    this.render();
    const stage = this.element.querySelector<HTMLElement>('.player-stage')!;
    const wrapper = this.element.querySelector<HTMLElement>('#canvas-wrapper')!;
    const fit = () => {
      if (document.fullscreenElement === wrapper) {
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        return;
      }
      const css = getComputedStyle(stage);
      const width = Math.max(0, stage.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight));
      const height = Math.max(0, stage.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom));
      const border = getComputedStyle(wrapper);
      const borderX = parseFloat(border.borderLeftWidth) + parseFloat(border.borderRightWidth);
      const borderY = parseFloat(border.borderTopWidth) + parseFloat(border.borderBottomWidth);
      const scale = Math.max(0, Math.min((width - borderX) / this.canvas.width, (height - borderY) / this.canvas.height));
      wrapper.style.width = `${this.canvas.width * scale + borderX}px`;
      wrapper.style.height = `${this.canvas.height * scale + borderY}px`;
    };
    this.viewportObserver = new ResizeObserver(fit);
    this.viewportObserver.observe(stage);
    this.canvasObserver = new MutationObserver(fit);
    this.canvasObserver.observe(this.canvas, { attributes: true, attributeFilter: ['width', 'height'] });
    document.addEventListener('fullscreenchange', fit, { signal: this.lifecycle.signal });
    this.setupGizmoInteractions();
    this.setupPlaybackListeners();
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  private render() {
    this.element.innerHTML = `
      <div class="player-stage" id="player-stage-viewport">
        <div class="canvas-viewport-wrapper" id="canvas-wrapper">
          <!-- Canvas injected here -->
        </div>
      </div>

      <div class="player-transport-bar">
        <div class="transport-left">
          <div class="timecode-display" id="timecode-display">
            00:00:00:00 <span class="timecode-total">/ 00:00:10:00</span>
          </div>
        </div>

        <div class="transport-center">
          <button class="btn-icon" id="btn-step-backward" title="Voltar 1 Frame (Seta Esquerda)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="19 20 9 12 19 4 19 20"/>
              <line x1="5" y1="19" x2="5" y2="5"/>
            </svg>
          </button>

          <button class="btn-play-pause" id="btn-play-pause" title="Reproduzir / Pausar (Espaço)">
            <svg id="icon-play" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <svg id="icon-pause" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:none;">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
          </button>

          <button class="btn-icon" id="btn-step-forward" title="Avançar 1 Frame (Seta Direita)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 4 15 12 5 20 5 4"/>
              <line x1="19" y1="5" x2="19" y2="19"/>
            </svg>
          </button>
        </div>

        <div class="transport-right">
          <button class="btn-icon" id="btn-canvas-fit" title="Ajustar Visualização">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
          <button class="btn-icon" id="btn-fullscreen" title="Tela Cheia">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    const wrapper = this.element.querySelector('#canvas-wrapper');
    if (wrapper) {
      wrapper.appendChild(this.canvas);
    }

    this.timecodeEl = this.element.querySelector('#timecode-display');
    this.playPauseBtn = this.element.querySelector('#btn-play-pause');

    // Controls listeners
    this.playPauseBtn?.addEventListener('click', () => {
      this.playbackEngine.togglePlay();
    });

    this.element.querySelector('#btn-step-backward')?.addEventListener('click', () => {
      this.playbackEngine.stepFrame(-1 / 30);
    });

    this.element.querySelector('#btn-step-forward')?.addEventListener('click', () => {
      this.playbackEngine.stepFrame(1 / 30);
    });

    this.element.querySelector('#btn-canvas-fit')?.addEventListener('click',()=>this.canvas.scrollIntoView({block:'nearest'}));
    this.element.querySelector('#btn-fullscreen')?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        wrapper?.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
  }

  private setupPlaybackListeners() {
    this.playbackEngine.onTimeUpdate((time) => {
      this.updateTimecode(time);
    });

    this.playbackEngine.onPlayState((isPlaying) => {
      const playIcon = this.element.querySelector('#icon-play') as HTMLElement;
      const pauseIcon = this.element.querySelector('#icon-pause') as HTMLElement;
      if (playIcon && pauseIcon) {
        playIcon.style.display = isPlaying ? 'none' : 'block';
        pauseIcon.style.display = isPlaying ? 'block' : 'none';
      }
    });
  }

  public updateTimecode(time: number) {
    if (!this.timecodeEl) return;
    const format = (t: number) => {
      const mins = Math.floor(t / 60).toString().padStart(2, '0');
      const secs = Math.floor(t % 60).toString().padStart(2, '0');
      const frames = Math.floor((t % 1) * 30).toString().padStart(2, '0');
      return `00:${mins}:${secs}:${frames}`;
    };

    const currentFormatted = format(time);
    const totalFormatted = format(this.project.duration);
    this.timecodeEl.innerHTML = `${currentFormatted} <span class="timecode-total">/ ${totalFormatted}</span>`;
  }

  private getSelectedClip(): Clip | null {
    if (!this.project.selectedClipId) return null;
    for (const track of this.project.tracks) {
      const c = track.clips.find(clip => clip.id === this.project.selectedClipId);
      if (c) return c;
    }
    return null;
  }

  private setupGizmoInteractions() {
    this.canvas.addEventListener('pointerdown', (e: MouseEvent) => {
      const clip = this.getSelectedClip();
      if (!clip) return;

      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      const bounds = this.playbackEngine.gizmoBounds;
      if (!bounds) return;

      this.isDraggingGizmo = true;
      this.startMousePos = { x: mouseX, y: mouseY };
      this.initialClipState = {
        x: clip.x || 0,
        y: clip.y || 0,
        scale: clip.scale || 1.0,
        rotation: clip.rotation || 0
      };

      // Check handle distance
      const topHandleY = bounds.y - 24;
      const topHandleX = bounds.x + bounds.width / 2;
      const distToRotate = Math.hypot(mouseX - topHandleX, mouseY - topHandleY);

      if (distToRotate < 20) {
        this.dragMode = 'rotate';
      } else {
        // Corner scale detection
        const corners = [
          { x: bounds.x, y: bounds.y },
          { x: bounds.x + bounds.width, y: bounds.y },
          { x: bounds.x, y: bounds.y + bounds.height },
          { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
        ];

        const isNearCorner = corners.some(c => Math.hypot(mouseX - c.x, mouseY - c.y) < 18);
        if (isNearCorner) {
          this.dragMode = 'scale';
        } else {
          this.dragMode = 'move';
        }
      }

      window.addEventListener('pointermove', this.onGizmoMouseMove, { signal: this.lifecycle.signal });
      window.addEventListener('pointerup', this.onGizmoMouseUp, { signal: this.lifecycle.signal });
    });
  }

  private onGizmoMouseMove = (e: MouseEvent) => {
    if (!this.isDraggingGizmo) return;
    const clip = this.getSelectedClip();
    if (!clip) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const dx = mouseX - this.startMousePos.x;
    const dy = mouseY - this.startMousePos.y;

    if (this.dragMode === 'move') {
      clip.x = Math.round(this.initialClipState.x + dx);
      clip.y = Math.round(this.initialClipState.y + dy);
    } else if (this.dragMode === 'scale') {
      const deltaScale = (dx + dy) / 400;
      clip.scale = Math.max(0.1, Math.min(5.0, Number((this.initialClipState.scale + deltaScale).toFixed(2))));
    } else if (this.dragMode === 'rotate') {
      const centerX = this.canvas.width / 2 + this.initialClipState.x;
      const centerY = this.canvas.height / 2 + this.initialClipState.y;
      const angle = Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI) + 90;
      clip.rotation = Math.round(angle % 360);
    }

    this.playbackEngine.render();
  };

  private onGizmoMouseUp = () => {
    if(this.isDraggingGizmo)window.dispatchEvent(new Event("montagem:project-updated"));
    this.isDraggingGizmo = false;
    this.dragMode = null;
    window.removeEventListener('pointermove', this.onGizmoMouseMove);
    window.removeEventListener('pointerup', this.onGizmoMouseUp);
  };
  public dispose(){this.lifecycle.abort();this.viewportObserver.disconnect();this.canvasObserver.disconnect();}
}

