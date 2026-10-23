import { escapeHTML } from '../model';
import { Project, Clip } from '../types';
import { PlaybackEngine } from '../engine/PlaybackEngine';

export class Inspector {
  private element: HTMLElement;
  private project: Project;
  private playbackEngine: PlaybackEngine;
  private activeTab: 'video' | 'chroma' | 'speed' | 'audio' | 'adjust' | 'text' = 'video';
  private onClipChange: () => void;
  private selectedType: Clip['type'] | null = null;

  constructor(project: Project, playbackEngine: PlaybackEngine, onClipChange: () => void) {
    this.project = project;
    this.playbackEngine = playbackEngine;
    this.onClipChange = onClipChange;
    this.element = document.createElement('aside');
    this.element.className = 'montagem-inspector';

    this.render();
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  private getSelectedClip(): Clip | null {
    if (!this.project.selectedClipId) return null;
    for (const track of this.project.tracks) {
      const c = track.clips.find(clip => clip.id === this.project.selectedClipId);
      if (c) return c;
    }
    return null;
  }

  public update() {
    this.render();
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

  private render() {
    const clip = this.getSelectedClip();

    if (!clip) {
      this.element.innerHTML = `
        <div class="inspector-header">
          <span class="inspector-title">Propriedades</span>
        </div>
        <div class="inspector-content" style="align-items:center; justify-content:center; text-align:center; color:var(--text-muted); padding:40px 20px;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px; opacity:0.5;">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
            <path d="M12 8v8m-4-4h8"/>
          </svg>
          <div style="font-size:13px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">Nenhum clipe selecionado</div>
          <div style="font-size:11px;">Clique em um clipe na timeline para editar transformações, velocidade, filtros e texto.</div>
        </div>
      `;
      return;
    }

    if(this.selectedType!==clip.type){this.activeTab=clip.type==='text'?'text':clip.type==='audio'||clip.type==='sfx'?'audio':'video';this.selectedType=clip.type;}
    // Determine relevant tabs
    const isText = clip.type === 'text';
    const isAudio = clip.type === 'audio' || clip.type === 'sfx';

    let tabsHtml = '';
    if (isText) {
      tabsHtml = `
        <button class="inspector-tab-btn ${this.activeTab === 'text' ? 'active' : ''}" data-tab="text">Texto</button>
        <button class="inspector-tab-btn ${this.activeTab === 'video' ? 'active' : ''}" data-tab="video">Básico</button>
        <button class="inspector-tab-btn ${this.activeTab === 'adjust' ? 'active' : ''}" data-tab="adjust">Ajustes</button>
      `;
      if (this.activeTab !== 'text' && this.activeTab !== 'video' && this.activeTab !== 'adjust') {
        this.activeTab = 'text';
      }
    } else if (isAudio) {
      tabsHtml = `
        <button class="inspector-tab-btn ${this.activeTab === 'audio' ? 'active' : ''}" data-tab="audio">Áudio</button>
        <button class="inspector-tab-btn ${this.activeTab === 'speed' ? 'active' : ''}" data-tab="speed">Velocidade</button>
      `;
      if (this.activeTab !== 'audio' && this.activeTab !== 'speed') {
        this.activeTab = 'audio';
      }
    } else {
      tabsHtml = `
        <button class="inspector-tab-btn ${this.activeTab === 'video' ? 'active' : ''}" data-tab="video">Básico</button>
        <button class="inspector-tab-btn ${this.activeTab === 'chroma' ? 'active' : ''}" data-tab="chroma">Recorte</button>
        <button class="inspector-tab-btn ${this.activeTab === 'speed' ? 'active' : ''}" data-tab="speed">Velocidade</button>
        <button class="inspector-tab-btn ${this.activeTab === 'adjust' ? 'active' : ''}" data-tab="adjust">Ajustes</button>
        <button class="inspector-tab-btn ${this.activeTab === 'audio' ? 'active' : ''}" data-tab="audio">Áudio</button>
      `;
      if (this.activeTab === 'text') this.activeTab = 'video';
    }

    const currentTrack = this.project.tracks.find(t => t.clips.some(c => c.id === clip.id));
    const trackColor = this.getTrackColor(currentTrack?.type || 'video');

    this.element.innerHTML = `
      <div class="inspector-header">
        <span class="inspector-title">${escapeHTML(clip.name)}</span>
        <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">${clip.type}</span>
      </div>

      <div class="inspector-layer-bar">
        <div class="layer-bar-info">
          <span class="layer-dot" style="background:${trackColor};"></span>
          <span class="layer-name">Faixa: <strong>${currentTrack ? currentTrack.name : 'V1'}</strong></span>
        </div>
        <div class="layer-bar-buttons">
          <button class="layer-btn" id="btn-inspector-up" title="Mover para Camada Acima (Shift+↑)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
            Subir
          </button>
          <button class="layer-btn" id="btn-inspector-down" title="Mover para Camada Abaixo (Shift+↓)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            Descer
          </button>
        </div>
      </div>

      <div class="inspector-tabs">${tabsHtml}</div>
      <div class="inspector-content" id="inspector-content-pane">
        <!-- Content injected based on activeTab -->
      </div>
    `;

    // Layer buttons
    this.element.querySelector('#btn-inspector-up')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('montagem:move-clip-layer', { detail: { direction: 'up' } }));
    });
    this.element.querySelector('#btn-inspector-down')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('montagem:move-clip-layer', { detail: { direction: 'down' } }));
    });

    // Tab buttons
    this.element.querySelectorAll('.inspector-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = (btn as HTMLElement).dataset.tab as any;
        this.render();
      });
    });

    const pane = this.element.querySelector('#inspector-content-pane') as HTMLElement;
    if (!pane) return;

    switch (this.activeTab) {
      case 'video':
        this.renderVideoTab(pane, clip);
        break;
      case 'chroma':
        this.renderChromaTab(pane, clip);
        break;
      case 'speed':
        this.renderSpeedTab(pane, clip);
        break;
      case 'audio':
        this.renderAudioTab(pane, clip);
        break;
      case 'adjust':
        this.renderAdjustTab(pane, clip);
        break;
      case 'text':
        this.renderTextTab(pane, clip);
        break;
    }
  }

  private renderVideoTab(pane: HTMLElement, clip: Clip) {
    const hasKeyframe = clip.keyframes && clip.keyframes.length > 0;

    pane.innerHTML = `
      <div class="prop-group">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span class="prop-group-title" style="margin-bottom:0;">Transformar</span>
          <button class="btn-icon" id="btn-toggle-keyframe" title="Adicionar / Remover Quadro-Chave (Keyframe)" style="color:${hasKeyframe ? '#FF701A' : 'var(--text-muted)'}; font-size:14px; font-weight:bold;">
            ◆
          </button>
        </div>

        <div class="prop-row">
          <span class="prop-label">Escala</span>
          <input type="range" class="prop-input-range" id="input-scale" min="0.1" max="3" step="0.05" value="${clip.scale || 1}" />
          <span class="prop-value-badge" id="val-scale">${Math.round((clip.scale || 1) * 100)}%</span>
        </div>

        <div class="prop-row">
          <span class="prop-label">Posição X</span>
          <input type="range" class="prop-input-range" id="input-pos-x" min="-800" max="800" step="10" value="${clip.x || 0}" />
          <span class="prop-value-badge" id="val-pos-x">${clip.x || 0}px</span>
        </div>

        <div class="prop-row">
          <span class="prop-label">Posição Y</span>
          <input type="range" class="prop-input-range" id="input-pos-y" min="-600" max="600" step="10" value="${clip.y || 0}" />
          <span class="prop-value-badge" id="val-pos-y">${clip.y || 0}px</span>
        </div>

        <div class="prop-row">
          <span class="prop-label">Rotação</span>
          <input type="range" class="prop-input-range" id="input-rotation" min="-180" max="180" step="1" value="${clip.rotation || 0}" />
          <span class="prop-value-badge" id="val-rotation">${clip.rotation || 0}°</span>
        </div>
      </div>

      <div class="prop-group">
        <span class="prop-group-title">Mesclagem & Opacidade</span>

        <div class="prop-row">
          <span class="prop-label">Opacidade</span>
          <input type="range" class="prop-input-range" id="input-opacity" min="0" max="1" step="0.01" value="${clip.opacity ?? 1}" />
          <span class="prop-value-badge" id="val-opacity">${Math.round((clip.opacity ?? 1) * 100)}%</span>
        </div>

        <div class="prop-row">
          <span class="prop-label">Modo</span>
          <select class="prop-select" id="select-blend">
            <option value="normal" ${clip.blendMode === 'normal' ? 'selected' : ''}>Normal</option>
            <option value="screen" ${clip.blendMode === 'screen' ? 'selected' : ''}>Screen (Tela)</option>
            <option value="multiply" ${clip.blendMode === 'multiply' ? 'selected' : ''}>Multiply (Multiplicar)</option>
            <option value="overlay" ${clip.blendMode === 'overlay' ? 'selected' : ''}>Overlay (Sobrepor)</option>
            <option value="lighten" ${clip.blendMode === 'lighten' ? 'selected' : ''}>Lighten (Clarear)</option>
            <option value="darken" ${clip.blendMode === 'darken' ? 'selected' : ''}>Darken (Escurecer)</option>
          </select>
        </div>
      </div>
    `;

    // Keyframe Toggle
    pane.querySelector('#btn-toggle-keyframe')?.addEventListener('click', () => {
      clip.keyframes = clip.keyframes || [];
      const relTime = Math.max(0, this.playbackEngine.getCurrentTime() - clip.start);
      const existingIdx = clip.keyframes.findIndex(k => Math.abs(k.time - relTime) < 0.2);
      if (existingIdx !== -1) {
        clip.keyframes.splice(existingIdx, 1);
      } else {
        clip.keyframes.push({
          time: Number(relTime.toFixed(2)),
          scale: clip.scale,
          x: clip.x,
          y: clip.y,
          rotation: clip.rotation,
          opacity: clip.opacity
        });
      }
      this.render();
      this.playbackEngine.render();
    });

    // Sliders
    this.bindRange(pane, '#input-scale', '#val-scale', v => {
      clip.scale = parseFloat(v);
      return `${Math.round(clip.scale * 100)}%`;
    });

    this.bindRange(pane, '#input-pos-x', '#val-pos-x', v => {
      clip.x = parseInt(v);
      return `${clip.x}px`;
    });

    this.bindRange(pane, '#input-pos-y', '#val-pos-y', v => {
      clip.y = parseInt(v);
      return `${clip.y}px`;
    });

    this.bindRange(pane, '#input-rotation', '#val-rotation', v => {
      clip.rotation = parseInt(v);
      return `${clip.rotation}°`;
    });

    this.bindRange(pane, '#input-opacity', '#val-opacity', v => {
      clip.opacity = parseFloat(v);
      return `${Math.round(clip.opacity * 100)}%`;
    });

    const blendSelect = pane.querySelector('#select-blend') as HTMLSelectElement;
    if (blendSelect) {
      blendSelect.addEventListener('change', () => {
        clip.blendMode = blendSelect.value as any;
        this.playbackEngine.render();
      });
    }
  }

  private renderChromaTab(pane: HTMLElement, clip: Clip) {
    pane.innerHTML = `
      <div class="prop-group">
        <span class="prop-group-title">Chroma Key (Fundo Verde)</span>

        <div class="prop-row">
          <span class="prop-label">Ativar Recorte</span>
          <input type="checkbox" id="check-chroma" ${clip.chromaKey?.enabled ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--color-primary);" />
        </div>

        <div class="prop-row">
          <span class="prop-label">Cor-Chave</span>
          <input type="color" class="prop-input-color" id="input-chroma-color" value="${clip.chromaKey?.color || '#00ff00'}" />
          <span class="prop-value-badge" id="val-chroma-color">${clip.chromaKey?.color || '#00ff00'}</span>
        </div>

        <div class="prop-row">
          <span class="prop-label">Similaridade</span>
          <input type="range" class="prop-input-range" id="input-chroma-sim" min="0" max="1" step="0.02" value="${clip.chromaKey?.similarity || 0.4}" />
          <span class="prop-value-badge" id="val-chroma-sim">${Math.round((clip.chromaKey?.similarity || 0.4) * 100)}%</span>
        </div>

        <div class="prop-row">
          <span class="prop-label">Suavidade</span>
          <input type="range" class="prop-input-range" id="input-chroma-smooth" min="0" max="1" step="0.02" value="${clip.chromaKey?.smoothness || 0.1}" />
          <span class="prop-value-badge" id="val-chroma-smooth">${Math.round((clip.chromaKey?.smoothness || 0.1) * 100)}%</span>
        </div>
      </div>
    `;

    const check = pane.querySelector('#check-chroma') as HTMLInputElement;
    if (check) {
      check.addEventListener('change', () => {
        clip.chromaKey = clip.chromaKey || { enabled: false, color: '#00ff00', similarity: 0.4, smoothness: 0.1 };
        clip.chromaKey.enabled = check.checked;
        this.playbackEngine.render();
      });
    }

    const colorInput = pane.querySelector('#input-chroma-color') as HTMLInputElement;
    const colorVal = pane.querySelector('#val-chroma-color') as HTMLElement;
    if (colorInput && colorVal) {
      colorInput.addEventListener('input', () => {
        clip.chromaKey.color = colorInput.value;
        colorVal.innerText = colorInput.value;
        this.playbackEngine.render();
      });
    }

    this.bindRange(pane, '#input-chroma-sim', '#val-chroma-sim', v => {
      clip.chromaKey.similarity = parseFloat(v);
      return `${Math.round(clip.chromaKey.similarity * 100)}%`;
    });

    this.bindRange(pane, '#input-chroma-smooth', '#val-chroma-smooth', v => {
      clip.chromaKey.smoothness = parseFloat(v);
      return `${Math.round(clip.chromaKey.smoothness * 100)}%`;
    });
  }

  private renderSpeedTab(pane:HTMLElement,clip:Clip){
    pane.innerHTML='<div class="prop-group"><span class="prop-group-title">Velocidade constante</span><div class="prop-row"><label for="input-speed">Velocidade</label><input class="prop-input-range" id="input-speed" type="range" min="0.2" max="5" step="0.1" value="'+clip.speed+'"/><output id="speed-output">'+clip.speed.toFixed(1)+'×</output></div></div>';
    pane.querySelector<HTMLInputElement>('#input-speed')!.addEventListener('input',e=>{const speed=Number((e.target as HTMLInputElement).value);const available=clip.duration*clip.speed;clip.speed=speed;clip.duration=available/speed;pane.querySelector('#speed-output')!.textContent=speed.toFixed(1)+'×';this.onClipChange();this.playbackEngine.seek(this.playbackEngine.getCurrentTime());});
  }

  private renderAudioTab(pane: HTMLElement, clip: Clip) {
    pane.innerHTML = `
      <div class="prop-group">
        <span class="prop-group-title">Configurações de Áudio</span>

        <div class="prop-row">
          <span class="prop-label">Volume</span>
          <input type="range" class="prop-input-range" id="input-audio-vol" min="0" max="2" step="0.05" value="${clip.audio?.volume ?? 1}" />
          <span class="prop-value-badge" id="val-audio-vol">${Math.round((clip.audio?.volume ?? 1) * 100)}%</span>
        </div>

        <div class="prop-row">
          <span class="prop-label">Fade In</span>
          <input type="range" class="prop-input-range" id="input-fade-in" min="0" max="3" step="0.1" value="${clip.audio?.fadeIn || 0}" />
          <span class="prop-value-badge" id="val-fade-in">${(clip.audio?.fadeIn || 0).toFixed(1)}s</span>
        </div>

        <div class="prop-row">
          <span class="prop-label">Fade Out</span>
          <input type="range" class="prop-input-range" id="input-fade-out" min="0" max="3" step="0.1" value="${clip.audio?.fadeOut || 0}" />
          <span class="prop-value-badge" id="val-fade-out">${(clip.audio?.fadeOut || 0).toFixed(1)}s</span>
        </div>

        <div class="prop-row">
          <span class="prop-label">Silenciar</span>
          <input type="checkbox" id="check-mute" ${clip.audio?.muted ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--color-primary);" />
        </div>
      </div>
    `;

    this.bindRange(pane, '#input-audio-vol', '#val-audio-vol', v => {
      clip.audio.volume = parseFloat(v);
      return `${Math.round(clip.audio.volume * 100)}%`;
    });

    this.bindRange(pane, '#input-fade-in', '#val-fade-in', v => {
      clip.audio.fadeIn = parseFloat(v);
      return `${clip.audio.fadeIn.toFixed(1)}s`;
    });

    this.bindRange(pane, '#input-fade-out', '#val-fade-out', v => {
      clip.audio.fadeOut = parseFloat(v);
      return `${clip.audio.fadeOut.toFixed(1)}s`;
    });

    const muteCheck = pane.querySelector('#check-mute') as HTMLInputElement;
    if (muteCheck) {
      muteCheck.addEventListener('change', () => {
        clip.audio.muted = muteCheck.checked;
      });
    }
  }

  private renderAdjustTab(pane: HTMLElement, clip: Clip) {
    clip.adjustments = clip.adjustments || {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      temperature: 0,
      vignette: 0,
      blur: 0,
      sharpness: 0
    };

    pane.innerHTML = `
      <div class="prop-group">
        <span class="prop-group-title">Cor & Iluminação</span>

        <div class="prop-row">
          <span class="prop-label">Brilho</span>
          <input type="range" class="prop-input-range" id="input-adj-bright" min="-100" max="100" value="${clip.adjustments.brightness}" />
          <span class="prop-value-badge" id="val-adj-bright">${clip.adjustments.brightness}</span>
        </div>

        <div class="prop-row">
          <span class="prop-label">Contraste</span>
          <input type="range" class="prop-input-range" id="input-adj-contrast" min="-100" max="100" value="${clip.adjustments.contrast}" />
          <span class="prop-value-badge" id="val-adj-contrast">${clip.adjustments.contrast}</span>
        </div>

        <div class="prop-row">
          <span class="prop-label">Saturação</span>
          <input type="range" class="prop-input-range" id="input-adj-sat" min="-100" max="100" value="${clip.adjustments.saturation}" />
          <span class="prop-value-badge" id="val-adj-sat">${clip.adjustments.saturation}</span>
        </div>

        <div class="prop-row">
          <span class="prop-label">Temperatura</span>
          <input type="range" class="prop-input-range" id="input-adj-temp" min="-100" max="100" value="${clip.adjustments.temperature}" />
          <span class="prop-value-badge" id="val-adj-temp">${clip.adjustments.temperature}</span>
        </div>

        <div class="prop-row">
          <span class="prop-label">Desfoque</span>
          <input type="range" class="prop-input-range" id="input-adj-blur" min="0" max="30" value="${clip.adjustments.blur}" />
          <span class="prop-value-badge" id="val-adj-blur">${clip.adjustments.blur}px</span>
        </div>
      </div>
    `;

    this.bindRange(pane, '#input-adj-bright', '#val-adj-bright', v => {
      clip.adjustments.brightness = parseInt(v);
      this.playbackEngine.render();
      return v;
    });

    this.bindRange(pane, '#input-adj-contrast', '#val-adj-contrast', v => {
      clip.adjustments.contrast = parseInt(v);
      this.playbackEngine.render();
      return v;
    });

    this.bindRange(pane, '#input-adj-sat', '#val-adj-sat', v => {
      clip.adjustments.saturation = parseInt(v);
      this.playbackEngine.render();
      return v;
    });

    this.bindRange(pane, '#input-adj-temp', '#val-adj-temp', v => {
      clip.adjustments.temperature = parseInt(v);
      this.playbackEngine.render();
      return v;
    });

    this.bindRange(pane, '#input-adj-blur', '#val-adj-blur', v => {
      clip.adjustments.blur = parseInt(v);
      this.playbackEngine.render();
      return `${v}px`;
    });
  }

  private renderTextTab(pane: HTMLElement, clip: Clip) {
    clip.text = clip.text || {
      content: 'Texto',
      fontSize: 44,
      fontFamily: 'Inter',
      color: '#ffffff',
      bold: true,
      align: 'center',
      shadow: true
    };

    pane.innerHTML = `
      <div class="prop-group">
        <span class="prop-group-title">Conteúdo do Texto</span>
        <textarea class="prop-textarea" id="input-text-content" rows="3">${escapeHTML(clip.text.content)}</textarea>
      </div>

      <div class="prop-group">
        <span class="prop-group-title">Tipografia</span>

        <div class="prop-row">
          <span class="prop-label">Tamanho</span>
          <input type="range" class="prop-input-range" id="input-text-size" min="16" max="140" value="${clip.text.fontSize || 44}" />
          <span class="prop-value-badge" id="val-text-size">${clip.text.fontSize || 44}px</span>
        </div>

        <div class="prop-row">
          <span class="prop-label">Cor da Fonte</span>
          <input type="color" class="prop-input-color" id="input-text-color" value="${clip.text.color || '#ffffff'}" />
          <span class="prop-value-badge" id="val-text-color">${clip.text.color || '#ffffff'}</span>
        </div>

        <div class="prop-row">
          <span class="prop-label">Negrito</span>
          <input type="checkbox" id="check-text-bold" ${clip.text.bold ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--color-primary);" />
        </div>

        <div class="prop-row">
          <span class="prop-label">Sombra</span>
          <input type="checkbox" id="check-text-shadow" ${clip.text.shadow ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--color-primary);" />
        </div>
      </div>
    `;

    const txtInput = pane.querySelector('#input-text-content') as HTMLTextAreaElement;
    if (txtInput) {
      txtInput.addEventListener('input', () => {
        clip.text!.content = txtInput.value;
        clip.name = txtInput.value || 'Texto';
        this.onClipChange();
        this.playbackEngine.render();
      });
    }

    this.bindRange(pane, '#input-text-size', '#val-text-size', v => {
      clip.text!.fontSize = parseInt(v);
      this.playbackEngine.render();
      return `${v}px`;
    });

    const colorInput = pane.querySelector('#input-text-color') as HTMLInputElement;
    const colorVal = pane.querySelector('#val-text-color') as HTMLElement;
    if (colorInput && colorVal) {
      colorInput.addEventListener('input', () => {
        clip.text!.color = colorInput.value;
        colorVal.innerText = colorInput.value;
        this.playbackEngine.render();
      });
    }

    const boldCheck = pane.querySelector('#check-text-bold') as HTMLInputElement;
    if (boldCheck) {
      boldCheck.addEventListener('change', () => {
        clip.text!.bold = boldCheck.checked;
        this.playbackEngine.render();
      });
    }

    const shadowCheck = pane.querySelector('#check-text-shadow') as HTMLInputElement;
    if (shadowCheck) {
      shadowCheck.addEventListener('change', () => {
        clip.text!.shadow = shadowCheck.checked;
        this.playbackEngine.render();
      });
    }
  }

  private bindRange(
    container: HTMLElement,
    inputSelector: string,
    badgeSelector: string,
    onValue: (val: string) => string
  ) {
    const input = container.querySelector(inputSelector) as HTMLInputElement;
    const badge = container.querySelector(badgeSelector) as HTMLElement;
    if (!input || !badge) return;

    input.addEventListener('input', () => {
      badge.innerText = onValue(input.value);
      this.playbackEngine.render();
    });
  }
}

