import { notify } from '../notice';
import { parseSRT } from '../subtitles';
import { escapeHTML } from '../model';
import { Project, Clip, SidebarTab } from '../types';
import { SAMPLE_VIDEOS, SAMPLE_AUDIO, TEXT_PRESETS, STICKER_PRESETS } from '../assets/sampleMedia';
import { AudioEngine } from '../engine/AudioEngine';

export class Sidebar {
  private element: HTMLElement;
  private railEl: HTMLElement;
  private drawerEl: HTMLElement;
  private activeTab: SidebarTab = 'media';
  private project: Project;
  private onAddClip: (clip: Partial<Clip>, preferredTrackId?: string) => void;
  private audioEngine: AudioEngine;

  constructor(project: Project, audioEngine: AudioEngine, onAddClip: (clip: Partial<Clip>, preferredTrackId?: string) => void) {
    this.project = project;
    this.audioEngine = audioEngine;
    this.onAddClip = onAddClip;

    this.element = document.createElement('aside');
    this.element.style.display = 'flex';
    this.element.style.height = '100%';

    this.railEl = document.createElement('div');
    this.railEl.className = 'sider-rail';

    this.drawerEl = document.createElement('div');
    this.drawerEl.className = 'sider-drawer';

    this.element.appendChild(this.railEl);
    this.element.appendChild(this.drawerEl);

    this.renderRail();
    this.renderDrawer();
    this.drawerEl.addEventListener("dragover",e=>e.preventDefault());
    this.drawerEl.addEventListener("drop",e=>{e.preventDefault();for(const file of Array.from(e.dataTransfer?.files||[]))this.handleFileUpload(file);});
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public setTab(tab: SidebarTab) {
    this.activeTab = tab;
    this.renderRail();
    this.renderDrawer();
    this.drawerEl.classList.add('mobile-open');
  }

  private renderRail() {
    this.railEl.innerHTML = `
      <button class="sider-tab-btn ${this.activeTab === 'media' ? 'active' : ''}" data-tab="media">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
        </svg>
        Mídia
      </button>

      <button class="sider-tab-btn ${this.activeTab === 'audio' ? 'active' : ''}" data-tab="audio">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
        Áudio
      </button>

      <button class="sider-tab-btn ${this.activeTab === 'text' ? 'active' : ''}" data-tab="text">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="4 7 4 4 20 4 20 7"/>
          <line x1="9" y1="20" x2="15" y2="20"/>
          <line x1="12" y1="4" x2="12" y2="20"/>
        </svg>
        Texto
      </button>

      <button class="sider-tab-btn ${this.activeTab === 'captions' ? 'active' : ''}" data-tab="captions">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="4" width="20" height="16" rx="3"/>
          <path d="M7 15h4M15 15h2M7 11h10"/>
        </svg>
        Legendas
      </button>

      <button class="sider-tab-btn ${this.activeTab === 'stickers' ? 'active' : ''}" data-tab="stickers">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
          <line x1="9" y1="9" x2="9.01" y2="9"/>
          <line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
        Stickers
      </button>

      <button class="sider-tab-btn ${this.activeTab === 'effects' ? 'active' : ''}" data-tab="effects">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        Efeitos
      </button>

      <button class="sider-tab-btn ${this.activeTab === 'transitions' ? 'active' : ''}" data-tab="transitions">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="16 3 21 3 21 8"/>
          <line x1="4" y1="20" x2="21" y2="3"/>
          <polyline points="21 16 21 21 16 21"/>
          <line x1="15" y1="15" x2="21" y2="21"/>
          <line x1="4" y1="4" x2="9" y2="9"/>
        </svg>
        Transições
      </button>

      <button class="sider-tab-btn ${this.activeTab === 'filters' ? 'active' : ''}" data-tab="filters">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor"/>
        </svg>
        Filtros
      </button>
    `;

    this.railEl.querySelectorAll('.sider-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = (btn as HTMLElement).dataset.tab as SidebarTab;
        if (tab) this.setTab(tab);
      });
    });
  }

  private renderDrawer() {
    switch (this.activeTab) {
      case 'media':
        this.renderMediaDrawer();
        break;
      case 'audio':
        this.renderAudioDrawer();
        break;
      case 'text':
        this.renderTextDrawer();
        break;
      case 'captions':
        this.renderCaptionsDrawer();
        break;
      case 'stickers':
        this.renderStickersDrawer();
        break;
      case 'effects':
        this.renderEffectsDrawer();
        break;
      case 'transitions':
        this.renderTransitionsDrawer();
        break;
      case 'filters':
        this.renderFiltersDrawer();
        break;
    }
    const close=document.createElement('button');close.className='btn-icon drawer-mobile-close';close.textContent='×';close.setAttribute('aria-label','Fechar biblioteca');close.addEventListener('click',()=>this.drawerEl.classList.remove('mobile-open'));this.drawerEl.querySelector('.drawer-header')?.appendChild(close);
  }

  private renderMediaDrawer() {
    this.drawerEl.innerHTML = `
      <div class="drawer-header">
        <span class="drawer-title">Biblioteca de Mídia</span>
      </div>
      <div class="drawer-content">
        <label class="upload-dropzone" id="file-upload-dropzone">
          <input type="file" id="media-file-input" accept="video/*,image/*,audio/*" style="display:none;" />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div class="upload-dropzone-title">Importar Arquivo de Mídia</div>
          <div class="upload-dropzone-desc">MP4, WebM, PNG, JPG, MP3, WAV</div>
        </label>

        <div style="display:flex; align-items:center; justify-content:space-between; margin-top:8px; margin-bottom:4px;">
          <span style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted);">
            Fundos animados / Caramelo
          </span>
          <span style="font-size:10px; color:var(--color-primary);">Arraste para qualquer faixa</span>
        </div>

        <div class="asset-grid">
          ${SAMPLE_VIDEOS.map(v => `
            <div class="asset-card" draggable="true" data-video-id="${v.id}" title="Arraste para soltar na timeline ou clique para adicionar">
              <div class="asset-thumb">
                <img src="${v.previewUrl}" alt="${v.name}" />
              </div>
              <div class="asset-info">
                <span class="asset-name">${v.name}</span>
                <span class="asset-duration">${v.duration}s</span>
              </div>
              <div class="asset-hover-actions">
                <button class="asset-action-btn asset-btn-main" data-action="add-main" title="Adicionar na Trilha Principal (V1)">
                  + V1
                </button>
                <button class="asset-action-btn asset-btn-overlay" data-action="add-overlay" title="Adicionar como Sobreposição (Camada de Cima V2)">
                  + V2
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // File input handler
    const fileInput = this.drawerEl.querySelector('#media-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        this.handleFileUpload(file);
      });
    }

    // Sample videos drag & click handlers
    this.drawerEl.querySelectorAll<HTMLElement>('.asset-card').forEach(card => {
      const id = (card as HTMLElement).dataset.videoId;
      const video = SAMPLE_VIDEOS.find(v => v.id === id);
      if (!video) return;

      // Drag to timeline track lane
      card.addEventListener('dragstart', (e: DragEvent) => {
        if (!e.dataTransfer) return;
        e.dataTransfer.setData('application/json', JSON.stringify({
          type: 'video',
          name: video.name,
          src: video.videoUrl || video.id,
          duration: video.duration,
          sourceDuration: video.duration
        }));
        e.dataTransfer.effectAllowed = 'copy';
      });

      // Overlay button: adds explicitly to V2
      card.querySelector('[data-action="add-overlay"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.audioEngine.playSoundEffect('click');
        this.addVideoSample(video, 'track_v2');
      });

      // Main button: adds to V1
      card.querySelector('[data-action="add-main"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.audioEngine.playSoundEffect('click');
        this.addVideoSample(video, 'track_v1');
      });

      // Default card click
      card.addEventListener('click', () => {
        this.audioEngine.playSoundEffect('click');
        this.addVideoSample(video);
      });
    });
  }

  private addVideoSample(video: typeof SAMPLE_VIDEOS[0], targetTrackId?: string) {
    if (video.videoUrl) {
      const vid = document.createElement('video');
      vid.src = video.videoUrl;
      vid.crossOrigin = 'anonymous';
      vid.playsInline = true;
      vid.preload = 'auto';
      vid.onloadedmetadata = () => {
        this.onAddClip({
          type: 'video',
          name: video.name,
          src: video.videoUrl,
          element: vid,
          duration: Math.min(15, vid.duration || video.duration),
          sourceDuration: vid.duration || video.duration,
          offset: 0
        }, targetTrackId);
      };
    } else {
      this.onAddClip({
        type: 'video',
        name: video.name,
        src: video.id,
        duration: video.duration,
        sourceDuration: video.duration,
        offset: 0
      }, targetTrackId);
    }
  }

  private renderCaptionsDrawer() {
    this.drawerEl.innerHTML='<div class="drawer-header"><span class="drawer-title">Legendas</span></div><div class="drawer-content"><div class="montagem-info-card"><span class="montagem-eyebrow">TEXTO NO TEMPO CERTO</span><h3>Faça sua história ser lida.</h3><p>Importe um arquivo SRT para criar legendas editáveis e sincronizadas. Para escrever à mão, use a aba Texto.</p><label class="btn-primary">Importar legendas SRT<input type="file" accept=".srt,text/plain" id="subtitle-file" hidden/></label><p class="small">A transcrição automática precisa de um serviço de reconhecimento de voz.</p></div></div>';
    this.drawerEl.querySelector<HTMLInputElement>('#subtitle-file')!.addEventListener('change',async e=>{
      const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;
      try{const captions=parseSRT(await file.text());for(const caption of captions)this.onAddClip({type:'text',name:caption.text,start:caption.start,duration:caption.duration,sourceDuration:caption.duration,offset:0,y:380,text:{content:caption.text,fontSize:48,fontFamily:'Inter',color:'#FFF4E8',bgColor:'#101014',align:'center'}});}
      catch(error){notify(error instanceof Error?error.message:'Não foi possível importar as legendas.');}
    });
  }

  private handleFileUpload(file: File) {
    const url=URL.createObjectURL(file),type=file.type.startsWith('video')?'video':file.type.startsWith('audio')?'audio':file.type.startsWith('image')?'image':null;
    if(!type){URL.revokeObjectURL(url);notify('Selecione um vídeo, uma imagem ou um áudio.');return;}
    const element=type==='image'?new Image():document.createElement(type==='video'?'video':'audio');
    const fail=()=>{URL.revokeObjectURL(url);notify('Este arquivo não pôde ser aberto. Confira o formato e os codecs.');};
    const loaded=()=>{
      const duration=element instanceof HTMLMediaElement?element.duration:4;
      if(!Number.isFinite(duration)||duration<=0){fail();return;}
      this.onAddClip({type,name:file.name,src:url,file,element,duration,sourceDuration:duration,offset:0});
    };
    element.addEventListener(type==='image'?'load':'loadedmetadata',loaded,{once:true});element.addEventListener('error',fail,{once:true});
    element.addEventListener(type==='image'?'load':'loadeddata',()=>window.dispatchEvent(new Event('montagem:media-ready')),{once:true});
    if(element instanceof HTMLVideoElement){element.playsInline=true;element.muted=true;element.preload='auto';}
    element.src=url;
  }

  private renderAudioDrawer() {
    this.drawerEl.innerHTML = `
      <div class="drawer-header">
        <span class="drawer-title">Músicas & Efeitos Sonoros</span>
      </div>
      <div class="drawer-content">
        <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px;">
          Trilhas sintetizadas no navegador
        </div>
        <div class="audio-list">
          ${SAMPLE_AUDIO.map(a => `
            <div class="audio-card-item" data-audio-id="${a.id}">
              <div class="audio-card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
              <div class="audio-card-meta">
                <span class="audio-card-title">${a.name}</span>
                <span class="audio-card-category">${a.category} • ${a.duration}s</span>
              </div>
              <button class="asset-add-btn" title="Adicionar">+</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.drawerEl.querySelectorAll('.audio-card-item').forEach(card => {
      card.addEventListener('click', () => {
        const id = (card as HTMLElement).dataset.audioId;
        const audio = SAMPLE_AUDIO.find(a => a.id === id);
        if (audio) {
          this.audioEngine.playSoundEffect('click');
          this.onAddClip({
            type: 'audio',
            name: audio.name,
            src: audio.id,
            duration: audio.duration,
            sourceDuration: audio.duration,
            offset: 0
          });
        }
      });
    });
  }

  private renderTextDrawer() {
    this.drawerEl.innerHTML = `
      <div class="drawer-header">
        <span class="drawer-title">Modelos de Texto</span>
      </div>
      <div class="drawer-content">
        <button class="btn-primary" id="btn-add-default-text" style="width:100%; justify-content:center; margin-bottom:14px; padding:8px 12px;">
          + Adicionar Texto Padrão
        </button>
        <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px;">
          Efeitos de Texto Populares
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${TEXT_PRESETS.map(t => `
            <div class="preset-card text-preset-card" data-preset-id="${t.id}" style="padding:14px 12px; background:#181820; border:1px solid #282835; border-radius:8px; cursor:pointer;">
              <div style="font-size:14px; font-weight:700; color:${t.color}; text-align:center;">
                ${escapeHTML(t.content)}
              </div>
              <div style="font-size:10px; color:var(--text-muted); text-align:center; margin-top:6px;">
                ${t.name}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.drawerEl.querySelector('#btn-add-default-text')?.addEventListener('click', () => {
      this.audioEngine.playSoundEffect('click');
      this.onAddClip({
        type: 'text',
        name: 'Texto Simples',
        duration: 3.5,
        sourceDuration: 3.5,
        offset: 0,
        text: {
          content: 'Insira seu texto',
          fontSize: 48,
          fontFamily: 'Inter',
          color: '#ffffff',
          bold: true,
          align: 'center',
          shadow: true
        }
      });
    });

    this.drawerEl.querySelectorAll('.text-preset-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = (card as HTMLElement).dataset.presetId;
        const preset = TEXT_PRESETS.find(p => p.id === id);
        if (preset) {
          this.audioEngine.playSoundEffect('click');
          this.onAddClip({
            type: 'text',
            name: preset.name,
            duration: 4.0,
            sourceDuration: 4.0,
            offset: 0,
            text: { ...preset }
          });
        }
      });
    });
  }

  private renderStickersDrawer() {
    this.drawerEl.innerHTML = `
      <div class="drawer-header">
        <span class="drawer-title">Adesivos & Emojis</span>
      </div>
      <div class="drawer-content">
        <div class="stickers-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          ${STICKER_PRESETS.map(s => `
            <div class="sticker-card" data-sticker-id="${s.id}" style="background:#181820; border:1px solid #282835; border-radius:8px; padding:12px; text-align:center; cursor:pointer;">
              <div style="font-size:36px; margin-bottom:4px;">
                <img src="${s.src}" width="80" height="80" alt=""/>
              </div>
              <span style="font-size:11px; color:var(--text-secondary);">${s.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.drawerEl.querySelectorAll('.sticker-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = (card as HTMLElement).dataset.stickerId;
        const sticker = STICKER_PRESETS.find(s => s.id === id);
        if (sticker) {
          this.audioEngine.playSoundEffect('click');
          this.onAddClip({
            type: 'sticker',
            name: sticker.name,
            src: sticker.src,
            duration: 3.5,
            sourceDuration: 3.5,
            offset: 0,
            scale: 0.8
          });
        }
      });
    });
  }

  private renderEffectsDrawer() {
    const effects = [
      { id: 'vfx_glow', name: 'Brilho Mágico', icon: '✨', desc: 'Realce luminoso' },
      { id: 'vfx_blur', name: 'Desfoque suave', icon: '◌', desc: 'Suaviza a imagem' },
      { id: 'vfx_vignette', name: 'Vinheta', icon: '◉', desc: 'Escurece as bordas' },
      { id: 'vfx_reset', name: 'Remover efeitos', icon: '↶', desc: 'Restaura os ajustes' }
    ];

    this.drawerEl.innerHTML = `
      <div class="drawer-header">
        <span class="drawer-title">Efeitos de Vídeo</span>
      </div>
      <div class="drawer-content">
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${effects.map(ef => `
            <div class="effect-card" data-effect-id="${ef.id}" style="background:#181820; border:1px solid #282835; border-radius:8px; padding:12px; display:flex; align-items:center; gap:12px; cursor:pointer;">
              <div style="font-size:24px;">${ef.icon}</div>
              <div style="flex:1;">
                <div style="font-size:12px; font-weight:600; color:#fff;">${ef.name}</div>
                <div style="font-size:10px; color:var(--text-muted);">${ef.desc}</div>
              </div>
              <button class="asset-add-btn">+</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.drawerEl.querySelectorAll('.effect-card').forEach(card => {
      card.addEventListener('click', () => {
        this.audioEngine.playSoundEffect('click');
        const clip=this.project.tracks.flatMap(t=>t.clips).find(c=>c.id===this.project.selectedClipId);
        if(!clip){notify('Selecione um clipe na timeline para aplicar o efeito.');return;}
        const id=(card as HTMLElement).dataset.effectId;
        if(id==='vfx_glow'){clip.adjustments.brightness=18;clip.adjustments.contrast=-10;}
        if(id==='vfx_blur')clip.adjustments.blur=6;
        if(id==='vfx_vignette')clip.adjustments.vignette=65;
        if(id==='vfx_reset')clip.adjustments={brightness:0,contrast:0,saturation:0,temperature:0,vignette:0,blur:0,sharpness:0};
        window.dispatchEvent(new Event('montagem:project-updated'));
      });
    });
  }

  private renderTransitionsDrawer() {
    const transitions = [
      { id: 'dissolve', name: 'Dissolver (Fade)', icon: '🌫️' },
      { id: 'fadeBlack', name: 'Fade para Preto', icon: '⬛' },
      { id: 'fadeWhite', name: 'Flash Branco', icon: '⬜' },
      { id: 'slideLeft', name: 'Deslizar Esquerda', icon: '⬅️' },
      { id: 'slideRight', name: 'Deslizar Direita', icon: '➡️' },
      { id: 'zoomIn', name: 'Zoom In Transição', icon: '🔍' }
    ];

    this.drawerEl.innerHTML = `
      <div class="drawer-header">
        <span class="drawer-title">Transições de Corte</span>
      </div>
      <div class="drawer-content">
        <div style="font-size:11px; color:var(--text-muted); margin-bottom:10px;">
          Clique para aplicar a transição ao final do clipe selecionado na timeline.
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          ${transitions.map(t => `
            <div class="transition-card" data-trans-id="${t.id}" style="background:#181820; border:1px solid #282835; border-radius:8px; padding:12px 8px; text-align:center; cursor:pointer;">
              <div style="font-size:20px; margin-bottom:4px;">${t.icon}</div>
              <div style="font-size:11px; color:#fff;">${t.name}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.drawerEl.querySelectorAll('.transition-card').forEach(card => {
      card.addEventListener('click', () => {
        const transId = (card as HTMLElement).dataset.transId;
        if (this.project.selectedClipId) {
          for (const track of this.project.tracks) {
            const clip = track.clips.find(c => c.id === this.project.selectedClipId);
            if (clip) {
              clip.transition = { type: transId as any, duration: 0.6 };
              this.audioEngine.playSoundEffect('click');
              window.dispatchEvent(new CustomEvent('montagem:project-updated'));
              break;
            }
          }
        }
      });
    });
  }

  private renderFiltersDrawer() {
    const filters = [
      { id: 'teal_orange', name: 'Teal & Orange', color: 'linear-gradient(45deg, #00b4d8, #f77f00)' },
      { id: 'cyberpunk', name: 'Cyberpunk Neon', color: 'linear-gradient(45deg, #7209b7, #f72585)' },
      { id: 'vintage', name: 'Vintage 90s', color: 'linear-gradient(45deg, #b79ced, #e0a96d)' },
      { id: 'bw', name: 'P&B Dramático', color: 'linear-gradient(45deg, #111, #888)' }
    ];

    this.drawerEl.innerHTML = `
      <div class="drawer-header">
        <span class="drawer-title">Filtros & LUTs</span>
      </div>
      <div class="drawer-content">
        <div style="font-size:11px; color:var(--text-muted); margin-bottom:10px;">
          Selecione um clipe para aplicar a colorização.
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          ${filters.map(f => `
            <div class="filter-card" data-filter-id="${f.id}" style="background:#181820; border:1px solid #282835; border-radius:8px; padding:10px; cursor:pointer;">
              <div style="width:100%; height:44px; border-radius:6px; background:${f.color}; margin-bottom:6px;"></div>
              <div style="font-size:11px; color:#fff; text-align:center;">${f.name}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.drawerEl.querySelectorAll('.filter-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = (card as HTMLElement).dataset.filterId;
        if (this.project.selectedClipId) {
          for (const track of this.project.tracks) {
            const clip = track.clips.find(c => c.id === this.project.selectedClipId);
            if (clip) {
              if (id === 'teal_orange') {
                clip.adjustments = { brightness: 5, contrast: 20, saturation: 35, temperature: -15, vignette: 10, blur: 0, sharpness: 0 };
              } else if (id === 'cyberpunk') {
                clip.adjustments = { brightness: 0, contrast: 25, saturation: 50, temperature: 30, vignette: 15, blur: 0, sharpness: 0 };
              } else if (id === 'vintage') {
                clip.adjustments = { brightness: 10, contrast: -10, saturation: -20, temperature: 20, vignette: 20, blur: 0, sharpness: 0 };
              } else if (id === 'bw') {
                clip.adjustments = { brightness: 0, contrast: 40, saturation: -100, temperature: 0, vignette: 25, blur: 0, sharpness: 0 };
              }
              this.audioEngine.playSoundEffect('click');
              window.dispatchEvent(new CustomEvent('montagem:project-updated'));
              break;
            }
          }
        }
      });
    });
  }
}

