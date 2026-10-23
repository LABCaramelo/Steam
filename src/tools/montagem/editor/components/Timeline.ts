import { notify } from '../notice';
import { escapeHTML, cloneClip, splitTiming } from '../model';
import { Project, Clip, Track, TrackType } from '../types';
import { PlaybackEngine } from '../engine/PlaybackEngine';
import { AudioEngine } from '../engine/AudioEngine';

export class Timeline {
  private lifecycle = new AbortController();
  private element: HTMLElement;
  private project: Project;
  private playbackEngine: PlaybackEngine;
  private audioEngine: AudioEngine;
  private onSelectionChange: (clipId: string | null) => void;

  private pixelsPerSecond: number = 60; // Zoom level
  private isSnapping: boolean = true;

  private rulerCanvas: HTMLCanvasElement | null = null;
  private lanesContainer: HTMLElement | null = null;
  private playheadEl: HTMLElement | null = null;

  private isDraggingPlayhead: boolean = false;
  private isDraggingClip: boolean = false;
  private isTrimmingLeft: boolean = false;
  private isTrimmingRight: boolean = false;

  private activeClipId: string | null = null;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private clipInitialStart: number = 0;
  private clipInitialDuration: number = 0;
  private clipInitialOffset: number = 0;
  private targetHoverTrackId: string | null = null;
  private activeDraggedEl: HTMLElement | null = null;

  constructor(
    project: Project,
    playbackEngine: PlaybackEngine,
    audioEngine: AudioEngine,
    onSelectionChange: (clipId: string | null) => void
  ) {
    this.project = project;
    this.playbackEngine = playbackEngine;
    this.audioEngine = audioEngine;
    this.onSelectionChange = onSelectionChange;

    this.element = document.createElement('section');
    this.element.className = 'montagem-timeline-area';

    this.render();
    this.setupListeners();
    this.setupKeyboardShortcuts();
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public update() {
    this.recalculateTotalDuration();
    this.renderTracks();
    this.renderRuler();
    this.updatePlayheadPosition(this.playbackEngine.getCurrentTime());
  }

  private recalculateTotalDuration() {
    let max = 0;
    for (const track of this.project.tracks) {
      for (const clip of track.clips) {
        if (clip.start + clip.duration > max) {
          max = clip.start + clip.duration;
        }
      }
    }
    this.project.duration = max;
  }

  private render() {
    this.element.innerHTML = `
      <div class="timeline-toolbar">
        <div class="timeline-tools-left">
          <button class="tool-btn" id="btn-timeline-split" title="Dividir no Cursor (Ctrl+B)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
              <line x1="20" y1="4" x2="8.12" y2="15.88"/>
              <line x1="14.47" y1="14.48" x2="20" y2="20"/>
              <line x1="8.12" y1="8.12" x2="12" y2="12"/>
            </svg>
            Dividir
          </button>

          <button class="tool-btn danger" id="btn-timeline-delete" title="Excluir Selecionado (Del)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Excluir
          </button>

          <button class="tool-btn" id="btn-timeline-duplicate" title="Duplicar (Ctrl+D)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Duplicar
          </button>

          <div style="width:1px; height:18px; background:var(--border-color); margin:0 4px;"></div>

          <button class="tool-btn" id="btn-layer-up" title="Mover Clipe para Camada Acima (Shift+↑)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="18 15 12 9 6 15"/>
              <line x1="12" y1="9" x2="12" y2="21"/>
              <line x1="4" y1="4" x2="20" y2="4"/>
            </svg>
            Subir Camada
          </button>

          <button class="tool-btn" id="btn-layer-down" title="Mover Clipe para Camada Abaixo (Shift+↓)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
              <line x1="4" y1="20" x2="20" y2="20"/>
            </svg>
            Descer Camada
          </button>

          <div style="width:1px; height:18px; background:var(--border-color); margin:0 4px;"></div>

          <div class="track-add-dropdown-wrapper" style="position:relative;">
            <button class="tool-btn highlight" id="btn-add-track-toggle" title="Adicionar Nova Faixa">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              + Faixa
            </button>
            <div class="track-add-menu" id="track-add-menu" style="display:none;">
              <button class="track-menu-item" data-type="overlay">
                <span class="track-dot" style="background:#8b5cf6;"></span>
                <span>+ Sobreposição (Vídeo)</span>
              </button>
              <button class="track-menu-item" data-type="audio">
                <span class="track-dot" style="background:#f59e0b;"></span>
                <span>+ Faixa de Áudio</span>
              </button>
              <button class="track-menu-item" data-type="text">
                <span class="track-dot" style="background:#10b981;"></span>
                <span>+ Faixa de Texto</span>
              </button>
            </div>
          </div>

          <div style="width:1px; height:18px; background:var(--border-color); margin:0 4px;"></div>

          <button class="tool-btn ${this.isSnapping ? 'active' : ''}" id="btn-timeline-snap" title="Alinhamento Magnético (Ímã)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/>
              <line x1="4" y1="3" x2="8" y2="3"/><line x1="16" y1="3" x2="20" y2="3"/>
            </svg>
            Ímã
          </button>
        </div>

        <div class="timeline-tools-right">
          <span style="font-size:11px; color:var(--text-muted);">Zoom</span>
          <input type="range" class="timeline-zoom-slider" id="timeline-zoom-input" min="20" max="160" step="5" value="${this.pixelsPerSecond}" />
        </div>
      </div>

      <div class="timeline-scroll-container" id="timeline-scroll-container">
        <!-- Ruler -->
        <div class="timeline-ruler-wrapper" id="ruler-wrapper">
          <div class="ruler-header-spacer"></div>
          <canvas class="timeline-ruler-canvas" id="timeline-ruler-canvas"></canvas>
        </div>

        <!-- Tracks -->
        <div class="timeline-tracks-wrapper">
          <div class="track-headers-column" id="track-headers-container">
            <!-- Headers rendered here -->
          </div>
          <div class="track-lanes-column" id="track-lanes-container">
            <!-- Lanes & clips rendered here -->
            <div class="timeline-playhead" id="timeline-playhead">
              <div class="playhead-handle" id="playhead-handle"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.rulerCanvas = this.element.querySelector('#timeline-ruler-canvas');
    this.lanesContainer = this.element.querySelector('#track-lanes-container');
    this.playheadEl = this.element.querySelector('#timeline-playhead');

    this.renderTracks();
    this.renderRuler();
  }

  private setupListeners() {
    // Toolbar buttons
    this.element.querySelector('#btn-timeline-split')?.addEventListener('click', () => this.splitSelectedClip());
    this.element.querySelector('#btn-timeline-delete')?.addEventListener('click', () => this.deleteSelectedClip());
    this.element.querySelector('#btn-timeline-duplicate')?.addEventListener('click', () => this.duplicateSelectedClip());
    this.element.querySelector('#btn-layer-up')?.addEventListener('click', () => this.moveClipToLayer('up'));
    this.element.querySelector('#btn-layer-down')?.addEventListener('click', () => this.moveClipToLayer('down'));

    // Track Add Menu
    const addToggle = this.element.querySelector('#btn-add-track-toggle');
    const addMenu = this.element.querySelector('#track-add-menu') as HTMLElement;
    if (addToggle && addMenu) {
      addToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isShown = addMenu.style.display === 'flex';
        addMenu.style.display = isShown ? 'none' : 'flex';
      });

      addMenu.querySelectorAll('.track-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const type = (item as HTMLElement).dataset.type as TrackType;
          if (type) {
            this.addTrack(type);
          }
          addMenu.style.display = 'none';
        });
      });

      window.addEventListener('click', () => {
        if (addMenu) addMenu.style.display = 'none';
      }, { signal: this.lifecycle.signal });
    }

    const snapBtn = this.element.querySelector('#btn-timeline-snap');
    snapBtn?.addEventListener('click', () => {
      this.isSnapping = !this.isSnapping;
      snapBtn.classList.toggle('active', this.isSnapping);
    });

    const zoomInput = this.element.querySelector('#timeline-zoom-input') as HTMLInputElement;
    if (zoomInput) {
      zoomInput.addEventListener('input', () => {
        this.pixelsPerSecond = parseInt(zoomInput.value);
        this.update();
      });
    }

    // Ruler clicking & scrubbing
    if (this.rulerCanvas) {
      this.rulerCanvas.addEventListener('pointerdown', (e) => {
        this.isDraggingPlayhead = true;
        this.scrubToMouse(e);
        window.addEventListener('pointermove', this.onPlayheadMouseMove, { signal: this.lifecycle.signal });
        window.addEventListener('pointerup', this.onPlayheadMouseUp, { signal: this.lifecycle.signal });
      });
    }

    // Playhead handle drag
    const playheadHandle = this.element.querySelector('#playhead-handle');
    if (playheadHandle) {
      playheadHandle.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.isDraggingPlayhead = true;
        window.addEventListener('pointermove', this.onPlayheadMouseMove, { signal: this.lifecycle.signal });
        window.addEventListener('pointerup', this.onPlayheadMouseUp, { signal: this.lifecycle.signal });
      });
    }

    // PlaybackEngine updates playhead
    this.playbackEngine.onTimeUpdate((time) => {
      this.updatePlayheadPosition(time);
    });

    // Custom events
    window.addEventListener('montagem:move-clip-layer', ((e: CustomEvent) => {
      if (e.detail?.direction) {
        this.moveClipToLayer(e.detail.direction);
      }
    }) as EventListener, { signal: this.lifecycle.signal });
  }

  private setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.playbackEngine.getIsExporting()) return;
      if ((e.target as Element).closest('input,textarea,select,button,[role="button"],[contenteditable="true"]')) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        this.playbackEngine.togglePlay();
      } else if (e.code === 'KeyB' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.splitSelectedClip();
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        this.deleteSelectedClip();
      } else if (e.code === 'KeyD' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.duplicateSelectedClip();
      } else if (e.shiftKey && e.code === 'ArrowUp') {
        e.preventDefault();
        this.moveClipToLayer('up');
      } else if (e.shiftKey && e.code === 'ArrowDown') {
        e.preventDefault();
        this.moveClipToLayer('down');
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.playbackEngine.stepFrame(e.shiftKey ? -1.0 : -1 / 30);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.playbackEngine.stepFrame(e.shiftKey ? 1.0 : 1 / 30);
      }
    }, { signal: this.lifecycle.signal });
  }

  private onPlayheadMouseMove = (e: MouseEvent) => {
    if (!this.isDraggingPlayhead) return;
    this.scrubToMouse(e);
  };

  private onPlayheadMouseUp = () => {
    this.isDraggingPlayhead = false;
    window.removeEventListener('pointermove', this.onPlayheadMouseMove);
    window.removeEventListener('pointerup', this.onPlayheadMouseUp);
  };

  private scrubToMouse(e: MouseEvent) {
    if (!this.lanesContainer) return;
    const rect = this.lanesContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, x / this.pixelsPerSecond);
    this.playbackEngine.seek(time);
  }

  private updatePlayheadPosition(time: number) {
    if (!this.playheadEl) return;
    const x = time * this.pixelsPerSecond;
    this.playheadEl.style.transform = `translateX(${x}px)`;
  }

  public renderRuler() {
    if (!this.rulerCanvas) return;
    const w = Math.max(2000, this.project.duration * this.pixelsPerSecond + 400);
    const h = 28;
    this.rulerCanvas.width = w;
    this.rulerCanvas.height = h;

    const ctx = this.rulerCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#111115';
    ctx.fillRect(0, 0, w, h);

    const stepSeconds = this.pixelsPerSecond > 80 ? 1 : (this.pixelsPerSecond > 40 ? 2 : 5);
    const totalSeconds = Math.ceil(w / this.pixelsPerSecond);

    ctx.strokeStyle = '#2d2d38';
    ctx.fillStyle = '#7a7a8c';
    ctx.font = '10px JetBrains Mono, monospace';

    for (let s = 0; s <= totalSeconds; s++) {
      const x = s * this.pixelsPerSecond;

      if (s % stepSeconds === 0) {
        // Major tick
        ctx.beginPath();
        ctx.moveTo(x, h - 14);
        ctx.lineTo(x, h);
        ctx.stroke();

        const mins = Math.floor(s / 60);
        const secs = s % 60;
        const text = `${mins}:${secs.toString().padStart(2, '0')}s`;
        ctx.fillText(text, x + 4, 14);
      } else {
        // Minor tick
        ctx.beginPath();
        ctx.moveTo(x, h - 6);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }
  }

  public renderTracks() {
    const headersCol = this.element.querySelector('#track-headers-container');
    if (!headersCol || !this.lanesContainer) return;

    headersCol.innerHTML = '';

    // Clear lanes (keeping playhead)
    const existingLanes = this.lanesContainer.querySelectorAll('.track-lane');
    existingLanes.forEach(l => l.remove());

    const totalWidth = Math.max(2000, this.project.duration * this.pixelsPerSecond + 600);
    this.lanesContainer.style.width = `${totalWidth}px`;

    for (const track of this.project.tracks) {
      // Header item
      const headerItem = document.createElement('div');
      headerItem.className = 'track-header-item';
      headerItem.dataset.trackId = track.id;
      headerItem.innerHTML = `
        <div class="track-header-title">
          <span class="track-type-badge" style="background:${this.getTrackColor(track.type)};"></span>
          <span class="track-title-text" title="${escapeHTML(track.name)}">${escapeHTML(track.name)}</span>
        </div>
        <div class="track-header-actions">
          <button class="track-header-btn ${track.muted ? 'active' : ''}" data-action="mute" title="Silenciar / Ocultar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            </svg>
          </button>
          <button class="track-header-btn ${track.locked ? 'active' : ''}" data-action="lock" title="Bloquear Faixa">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </button>
        </div>
      `;

      headerItem.querySelector('[data-action="mute"]')?.addEventListener('click', () => {
        track.muted = !track.muted;
        track.visible = !track.muted;
        this.renderTracks();
        this.playbackEngine.render();
        window.dispatchEvent(new Event('montagem:project-updated'));
      });

      headerItem.querySelector('[data-action="lock"]')?.addEventListener('click', () => {
        track.locked = !track.locked;
        this.renderTracks();
        window.dispatchEvent(new Event('montagem:project-updated'));
      });

      headersCol.appendChild(headerItem);

      // Track Lane
      const lane = document.createElement('div');
      lane.className = 'track-lane';
      lane.dataset.trackId = track.id;
      lane.dataset.trackType = track.type;
      lane.dataset.trackName = track.name;

      // Enable Drag and Drop from Media Sidebar directly onto this lane
      lane.addEventListener('dragover', (e: DragEvent) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'copy';
        lane.classList.add('drop-target-active');
      });

      lane.addEventListener('dragleave', () => {
        lane.classList.remove('drop-target-active');
      });

      lane.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault();
        lane.classList.remove('drop-target-active');
        const raw = e.dataTransfer?.getData('application/json');
        if (!raw) return;
        try {
          const clipData = JSON.parse(raw);
          const rect = lane.getBoundingClientRect();
          const dropX = e.clientX - rect.left;
          const dropTime = Math.max(0, dropX / this.pixelsPerSecond);
          this.addClipDirectlyToTrack(track.id, clipData, dropTime);
        } catch (err) {
          console.error('Failed to parse dropped clip data:', err);
        }
      });

      for (const clip of track.clips) {
        const clipEl = this.createClipElement(clip, track);
        lane.appendChild(clipEl);
      }

      this.lanesContainer.appendChild(lane);
    }
  }

  public isTrackCompatibleWithClip(trackType: string, clipType: string): boolean {
    if (clipType === 'video' || clipType === 'image') {
      return trackType === 'video' || trackType === 'overlay';
    }
    if (clipType === 'audio' || clipType === 'sfx') {
      return trackType === 'audio' || trackType === 'sfx';
    }
    if (clipType === 'text') {
      return trackType === 'text' || trackType === 'overlay';
    }
    if (clipType === 'sticker') {
      return trackType === 'sticker' || trackType === 'overlay';
    }
    return false;
  }

  private getTrackColor(type: string): string {
    switch (type) {
      case 'video': return '#3b82f6';
      case 'overlay': return '#8b5cf6';
      case 'text': return '#10b981';
      case 'sticker': return '#ec4899';
      case 'audio':
      case 'sfx': return '#f59e0b';
      default: return '#6b7280';
    }
  }

  private createClipElement(clip: Clip, track: Track): HTMLElement {
    const el = document.createElement('div');
    const isSelected = this.project.selectedClipId === clip.id;
    el.className = `timeline-clip clip-${clip.type} ${isSelected ? 'selected' : ''}`;
    el.dataset.clipId = clip.id;

    const left = clip.start * this.pixelsPerSecond;
    const width = Math.max(16, clip.duration * this.pixelsPerSecond);

    el.style.left = `${left}px`;
    el.style.width = `${width}px`;

    el.innerHTML = `
      <div class="clip-trim-handle clip-trim-left" title="Ajustar Início (Trim)"></div>
      <div class="clip-content">
        <span class="clip-label">${escapeHTML(clip.name)}</span>
      </div>
      <div class="clip-trim-handle clip-trim-right" title="Ajustar Fim (Trim)"></div>
    `;

    // Render audio waveform if audio clip
    if (clip.type === 'audio') {
      const waveCanvas = document.createElement('canvas');
      waveCanvas.className = 'clip-waveform';
      waveCanvas.width = width;
      waveCanvas.height = 40;
      el.appendChild(waveCanvas);

      this.audioEngine.extractWaveform(clip, Math.floor(width / 3)).then(waveform => {
        const wCtx = waveCanvas.getContext('2d')!;
        wCtx.fillStyle = '#ffffff';
        const step = width / waveform.length;
        for (let i = 0; i < waveform.length; i++) {
          const h = waveform[i] * 32;
          wCtx.fillRect(i * step, (40 - h) / 2, 2, h);
        }
      });
    }

    // Right-click context menu
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.project.selectedClipId = clip.id;
      this.onSelectionChange(clip.id);
      this.renderTracks();
      this.showClipContextMenu(e.clientX, e.clientY);
    });

    // Clip Selection & Dragging
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.button !== 0) return; // Only primary button

      this.project.selectedClipId = clip.id;
      this.onSelectionChange(clip.id);
      this.element.querySelectorAll<HTMLElement>('.timeline-clip').forEach(node=>node.classList.toggle('selected',node===el));
      this.playbackEngine.render();

      if (track.locked) return;

      const target = e.target as HTMLElement;
      if (target.classList.contains('clip-trim-left')) {
        this.isTrimmingLeft = true;
      } else if (target.classList.contains('clip-trim-right')) {
        this.isTrimmingRight = true;
      } else {
        this.isDraggingClip = true;
      }

      this.activeClipId = clip.id;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.clipInitialStart = clip.start;
      this.clipInitialDuration = clip.duration;
      this.clipInitialOffset = clip.offset;
        this.targetHoverTrackId = track.id;
      this.activeDraggedEl = el;

      window.addEventListener('pointermove', this.onClipDragMove, { signal: this.lifecycle.signal });
      window.addEventListener('pointerup', this.onClipDragEnd, { signal: this.lifecycle.signal });
    });

    return el;
  }

  private onClipDragMove = (e: MouseEvent) => {
    if (!this.activeClipId) return;

    let targetClip: Clip | null = null;
    let sourceTrack: Track | null = null;
    for (const track of this.project.tracks) {
      const c = track.clips.find(clip => clip.id === this.activeClipId);
      if (c) {
        targetClip = c;
        sourceTrack = track;
        break;
      }
    }
    if (!targetClip || !sourceTrack) return;

    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;
    const deltaTime = deltaX / this.pixelsPerSecond;

    if (this.isDraggingClip) {
      let newStart = Math.max(0, this.clipInitialStart + deltaTime);

      // Magnet snapping
      if (this.isSnapping) {
        const playheadTime = this.playbackEngine.getCurrentTime();
        if (Math.abs(newStart - playheadTime) < 0.15) {
          newStart = playheadTime;
        } else if (newStart < 0.15) {
          newStart = 0;
        }
      }

      // Vertical lane collision detection
      const allLanes = Array.from(this.element.querySelectorAll<HTMLElement>('.track-lane'));
      let hoveredTrack: Track | null = null;
      let hoveredLane: HTMLElement | null = null;

      for (const lane of allLanes) {
        const rect = lane.getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          const tId = lane.dataset.trackId;
          hoveredTrack = this.project.tracks.find(t => t.id === tId) || null;
          hoveredLane = lane;
          break;
        }
      }

      allLanes.forEach(l => l.classList.remove('drop-target-active', 'drop-target-invalid'));

      if (hoveredTrack && hoveredLane) {
        const isCompatible = this.isTrackCompatibleWithClip(hoveredTrack.type, targetClip.type);
        if (isCompatible) {
          hoveredLane.classList.add('drop-target-active');
          this.targetHoverTrackId = hoveredTrack.id;
        } else {
          hoveredLane.classList.add('drop-target-invalid');
          this.targetHoverTrackId = null;
        }
      } else {
        this.targetHoverTrackId = null;
      }

      // Visual dragging feedback
      if (this.activeDraggedEl) {
        this.activeDraggedEl.classList.add('clip-dragging');
        this.activeDraggedEl.style.transform = `translate3d(0, ${deltaY}px, 0)`;
        this.activeDraggedEl.style.left = `${newStart * this.pixelsPerSecond}px`;
      }

      targetClip.start = Number(newStart.toFixed(2));
    } else if (this.isTrimmingLeft) {
      let newStart = this.clipInitialStart + deltaTime;
      const mediaLimited=['video','audio','sfx'].includes(targetClip.type);
      const earliest=mediaLimited?Math.max(0,this.clipInitialStart-this.clipInitialOffset/targetClip.speed):0;
      newStart = Math.max(earliest, Math.min(newStart, this.clipInitialStart + this.clipInitialDuration - 0.2));
      const durDelta = newStart - this.clipInitialStart;
      targetClip.start = Number(newStart.toFixed(2));
      targetClip.duration = Number((this.clipInitialDuration - durDelta).toFixed(2));
      targetClip.offset = Math.max(0, this.clipInitialOffset + durDelta*targetClip.speed);
      this.recalculateTotalDuration();
      this.renderTracks();
      this.playbackEngine.render();
    } else if (this.isTrimmingRight) {
      let newDur = Math.max(0.2, this.clipInitialDuration + deltaTime);
      if(['video','audio','sfx'].includes(targetClip.type))newDur=Math.min(newDur,Math.max(.01,(targetClip.sourceDuration-targetClip.offset)/targetClip.speed));
      targetClip.duration = Number(newDur.toFixed(2));
      this.recalculateTotalDuration();
      this.renderTracks();
      this.playbackEngine.render();
    }
  };

  private onClipDragEnd = () => {
    if (this.activeDraggedEl) {
      this.activeDraggedEl.classList.remove('clip-dragging');
      this.activeDraggedEl.style.transform = '';
    }

    const allLanes = this.element.querySelectorAll('.track-lane');
    allLanes.forEach(l => l.classList.remove('drop-target-active', 'drop-target-invalid'));

    if (this.isDraggingClip && this.activeClipId) {
      let currentTrack: Track | null = null;
      let targetClip: Clip | null = null;

      for (const track of this.project.tracks) {
        const c = track.clips.find(clip => clip.id === this.activeClipId);
        if (c) {
          targetClip = c;
          currentTrack = track;
          break;
        }
      }

      if (targetClip && currentTrack) {
        if (this.targetHoverTrackId && this.targetHoverTrackId !== currentTrack.id) {
          const newTrack = this.project.tracks.find(t => t.id === this.targetHoverTrackId);
          if (newTrack && this.isTrackCompatibleWithClip(newTrack.type, targetClip.type)) {
            // Remove from old track
            const idx = currentTrack.clips.indexOf(targetClip);
            if (idx !== -1) currentTrack.clips.splice(idx, 1);

            // Reassign to new track
            targetClip.trackId = newTrack.id;
            newTrack.clips.push(targetClip);
            this.audioEngine.playSoundEffect('drop');
          }
        }
      }

      window.dispatchEvent(new CustomEvent('montagem:project-updated'));
    }

    this.isDraggingClip = false;
    this.isTrimmingLeft = false;
    this.isTrimmingRight = false;
    this.activeClipId = null;
    this.activeDraggedEl = null;
    this.targetHoverTrackId = null;

    window.removeEventListener('pointermove', this.onClipDragMove);
    window.removeEventListener('pointerup', this.onClipDragEnd);

    this.recalculateTotalDuration();
    this.renderTracks();
    this.playbackEngine.render();
  };

  public moveClipToLayer(direction: 'up' | 'down') {
    if (!this.project.selectedClipId) return;

    let targetClip: Clip | null = null;
    let currentTrack: Track | null = null;
    let currentTrackIndex = -1;

    for (let i = 0; i < this.project.tracks.length; i++) {
      const t = this.project.tracks[i];
      const c = t.clips.find(clip => clip.id === this.project.selectedClipId);
      if (c) {
        targetClip = c;
        currentTrack = t;
        currentTrackIndex = i;
        break;
      }
    }

    if (!targetClip || !currentTrack) return;

    if (direction === 'up') {
      if (currentTrackIndex > 0) {
        const trackAbove = this.project.tracks[currentTrackIndex - 1];
        if (this.isTrackCompatibleWithClip(trackAbove.type, targetClip.type)) {
          const idx = currentTrack.clips.indexOf(targetClip);
          currentTrack.clips.splice(idx, 1);
          targetClip.trackId = trackAbove.id;
          trackAbove.clips.push(targetClip);
          this.audioEngine.playSoundEffect('drop');
        } else {
          // Create new overlay track directly above
          const newTrack = this.createTrackInstance('overlay');
          this.project.tracks.splice(currentTrackIndex, 0, newTrack);
          const idx = currentTrack.clips.indexOf(targetClip);
          currentTrack.clips.splice(idx, 1);
          targetClip.trackId = newTrack.id;
          newTrack.clips.push(targetClip);
          this.audioEngine.playSoundEffect('drop');
        }
      } else {
        // At the very top (index 0) - create new overlay track
        const newTrack = this.createTrackInstance('overlay');
        this.project.tracks.unshift(newTrack);
        const idx = currentTrack.clips.indexOf(targetClip);
        currentTrack.clips.splice(idx, 1);
        targetClip.trackId = newTrack.id;
        newTrack.clips.push(targetClip);
        this.audioEngine.playSoundEffect('drop');
      }
    } else {
      // direction === 'down'
      if (currentTrackIndex < this.project.tracks.length - 1) {
        const trackBelow = this.project.tracks[currentTrackIndex + 1];
        if (this.isTrackCompatibleWithClip(trackBelow.type, targetClip.type)) {
          const idx = currentTrack.clips.indexOf(targetClip);
          currentTrack.clips.splice(idx, 1);
          targetClip.trackId = trackBelow.id;
          trackBelow.clips.push(targetClip);
          this.audioEngine.playSoundEffect('drop');
        }
      }
    }

    window.dispatchEvent(new CustomEvent('montagem:project-updated'));
    this.update();
    this.playbackEngine.render();
  }

  private getHighestOverlayNumber(): number {
    let max = 1;
    for (const t of this.project.tracks) {
      if (t.type === 'video' || t.type === 'overlay') {
        const match = t.name.match(/V(\d+)/i);
        if (match) {
          const num = parseInt(match[1]);
          if (num > max) max = num;
        }
      }
    }
    return max;
  }

  private createTrackInstance(type: TrackType, customName?: string): Track {
    let name = customName;
    if (!name) {
      if (type === 'overlay') {
        const num = this.getHighestOverlayNumber() + 1;
        name = `V${num} Sobreposição`;
      } else if (type === 'audio') {
        const num = this.project.tracks.filter(t => t.type === 'audio' || t.type === 'sfx').length + 1;
        name = `A${num} Áudio`;
      } else if (type === 'text') {
        const num = this.project.tracks.filter(t => t.type === 'text').length + 1;
        name = `T${num} Texto`;
      } else {
        name = `Nova Faixa`;
      }
    }

    return {
      id: 'track_' + type + '_' + Date.now(),
      name,
      type,
      locked: false,
      muted: false,
      visible: true,
      clips: []
    };
  }

  public addTrack(type: TrackType, customName?: string): Track {
    const newTrack = this.createTrackInstance(type, customName);

    if (type === 'overlay') {
      // Insert at the top of the video tracks
      this.project.tracks.unshift(newTrack);
    } else if (type === 'audio') {
      this.project.tracks.push(newTrack);
    } else {
      const firstAudioIdx = this.project.tracks.findIndex(t => t.type === 'audio' || t.type === 'sfx');
      if (firstAudioIdx !== -1) {
        this.project.tracks.splice(firstAudioIdx, 0, newTrack);
      } else {
        this.project.tracks.push(newTrack);
      }
    }

    this.audioEngine.playSoundEffect('click');
    window.dispatchEvent(new CustomEvent('montagem:project-updated'));
    this.update();
    return newTrack;
  }

  public addClipDirectlyToTrack(trackId: string, clipData: Partial<Clip>, startTime: number) {
    const track = this.project.tracks.find(t => t.id === trackId);
    if (!track) return;

    if (!this.isTrackCompatibleWithClip(track.type, clipData.type || 'video')) {
      notify(`Este clipe (${clipData.type}) não é compatível com esta faixa (${escapeHTML(track.name)}).`);
      return;
    }

    let mediaEl: HTMLVideoElement | HTMLImageElement | HTMLAudioElement | undefined = clipData.element;
    if (!mediaEl && clipData.src) {
      if (clipData.type === 'video') {
        const v = document.createElement('video');
        v.src = clipData.src;
        v.crossOrigin = 'anonymous';
        v.playsInline = true;
        v.preload = 'auto';
        mediaEl = v;
      } else if (clipData.type === 'image') {
        const img = new Image();
        img.src = clipData.src;
        mediaEl = img;
      }
    }

    const newClip: Clip = {
      id: 'clip_' + crypto.randomUUID(),
      trackId: track.id,
      type: clipData.type || 'video',
      name: clipData.name || 'Novo Clipe',
      start: Number(startTime.toFixed(2)),
      duration: clipData.duration || 4.0,
      offset: clipData.offset || 0,
      sourceDuration: clipData.sourceDuration || 4.0,
      src: clipData.src,
      element: mediaEl,
      x: clipData.x || 0,
      y: clipData.y || 0,
      scale: clipData.scale || (track.type === 'overlay' ? 0.75 : 1.0),
      rotation: clipData.rotation || 0,
      opacity: clipData.opacity ?? 1.0,
      blendMode: clipData.blendMode || 'normal',
      chromaKey: clipData.chromaKey || { enabled: false, color: '#00ff00', similarity: 0.4, smoothness: 0.1 },
      adjustments: clipData.adjustments || { brightness: 0, contrast: 0, saturation: 0, temperature: 0, vignette: 0, blur: 0, sharpness: 0 },
      speed: clipData.speed || 1.0,
      audio: clipData.audio || { volume: 1.0, fadeIn: 0, fadeOut: 0, muted: false },
      text: clipData.text,
      transition: clipData.transition
    };

    track.clips.push(newClip);
    this.project.selectedClipId = newClip.id;
    this.audioEngine.playSoundEffect('drop');

    window.dispatchEvent(new CustomEvent('montagem:project-updated'));
    this.update();
    this.onSelectionChange(newClip.id);
    this.playbackEngine.render();
  }

  private showClipContextMenu(x: number, y: number) {
    const existing = document.getElementById('timeline-clip-context-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'timeline-clip-context-menu';
    menu.className = 'montagem-context-menu';
    menu.style.left = `${Math.min(window.innerWidth - 210, x)}px`;
    menu.style.top = `${Math.min(window.innerHeight - 240, y)}px`;

    menu.innerHTML = `
      <div class="menu-item" data-action="layer-up">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="18 15 12 9 6 15"/><line x1="12" y1="9" x2="12" y2="21"/><line x1="4" y1="4" x2="20" y2="4"/>
        </svg>
        <span>Subir Camada</span>
        <span class="menu-shortcut">Shift+↑</span>
      </div>
      <div class="menu-item" data-action="layer-down">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/><line x1="12" y1="15" x2="12" y2="3"/><line x1="4" y1="20" x2="20" y2="20"/>
        </svg>
        <span>Descer Camada</span>
        <span class="menu-shortcut">Shift+↓</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item" data-action="split">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/>
        </svg>
        <span>Dividir no Cursor</span>
        <span class="menu-shortcut">Ctrl+B</span>
      </div>
      <div class="menu-item" data-action="duplicate">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        <span>Duplicar</span>
        <span class="menu-shortcut">Ctrl+D</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item danger" data-action="delete">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        <span>Excluir</span>
        <span class="menu-shortcut">Del</span>
      </div>
    `;

    menu.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = (item as HTMLElement).dataset.action;
        menu.remove();
        if (action === 'layer-up') this.moveClipToLayer('up');
        else if (action === 'layer-down') this.moveClipToLayer('down');
        else if (action === 'split') this.splitSelectedClip();
        else if (action === 'duplicate') this.duplicateSelectedClip();
        else if (action === 'delete') this.deleteSelectedClip();
      });
    });

    const closeHandler = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        window.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => window.addEventListener('click', closeHandler, { signal: this.lifecycle.signal }), 10);
    document.body.appendChild(menu);
  }

  public splitSelectedClip() {
    if (!this.project.selectedClipId) return;
    const curTime = this.playbackEngine.getCurrentTime();

    for (const track of this.project.tracks) {
      if (track.locked) continue;
      const index = track.clips.findIndex(c => c.id === this.project.selectedClipId);
      if (index !== -1) {
        const clip = track.clips[index];
        if (curTime > clip.start && curTime < (clip.start + clip.duration)) {
          const timing=splitTiming(clip,curTime)!;
          const firstPartDuration = timing.first;
          const secondPartDuration = timing.second;

          const secondClip: Clip = {
            ...cloneClip(clip),
            id: 'clip_' + crypto.randomUUID(),
            start: curTime,
            duration: secondPartDuration,
            offset: timing.offset,
            name: `${clip.name} (Parte 2)`
          };

          clip.duration = firstPartDuration;
          track.clips.splice(index + 1, 0, secondClip);

          this.project.selectedClipId = secondClip.id;
          this.audioEngine.playSoundEffect('split');
          this.update();
          this.playbackEngine.render();
          this.onSelectionChange(secondClip.id);
          window.dispatchEvent(new CustomEvent('montagem:project-updated'));
          return;
        }
      }
    }
  }

  public deleteSelectedClip() {
    if (!this.project.selectedClipId) return;

    for (const track of this.project.tracks) {
      if(track.locked)continue;
      const index = track.clips.findIndex(c => c.id === this.project.selectedClipId);
      if (index !== -1) {
        if(track.clips[index].element instanceof HTMLMediaElement)(track.clips[index].element as HTMLMediaElement).pause();
        track.clips.splice(index, 1);
        this.project.selectedClipId = null;
        this.audioEngine.playSoundEffect('delete');
        this.update();
        this.playbackEngine.render();
        this.onSelectionChange(null);
        window.dispatchEvent(new CustomEvent('montagem:project-updated'));
        return;
      }
    }
  }

  public duplicateSelectedClip() {
    if (!this.project.selectedClipId) return;

    for (const track of this.project.tracks) {
      if (track.locked) continue;
      const clip = track.clips.find(c => c.id === this.project.selectedClipId);
      if (clip) {
        const cloned: Clip = {
          ...cloneClip(clip),
          id: 'clip_' + crypto.randomUUID(),
          start: clip.start + clip.duration + 0.1,
          name: `${clip.name} (Cópia)`
        };
        track.clips.push(cloned);
        this.project.selectedClipId = cloned.id;
        this.audioEngine.playSoundEffect('click');
        this.update();
        this.playbackEngine.render();
        this.onSelectionChange(cloned.id);
        window.dispatchEvent(new CustomEvent('montagem:project-updated'));
        return;
      }
    }
  }
  public dispose(){this.lifecycle.abort();document.getElementById("timeline-clip-context-menu")?.remove();}
}


