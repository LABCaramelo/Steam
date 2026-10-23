import './styles/main.css';
import { RATIOS, projectDuration } from './model';
import { installEditorAccessibility } from './accessibility';
import { DraftStore, serializeProject } from './storage';
import { Project, Clip, Track, AspectRatio, SidebarTab } from './types';
import { AudioEngine } from './engine/AudioEngine';
import { PlaybackEngine } from './engine/PlaybackEngine';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CanvasPlayer } from './components/CanvasPlayer';
import { Inspector } from './components/Inspector';
import { Timeline } from './components/Timeline';
import { ExportModal } from './components/ExportModal';
import { PanelLayout } from './PanelLayout';

export class MontagemApp {
  private lifecycle = new AbortController();
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private store: DraftStore;
  private root: HTMLElement;
  private destroyed = false;
  private ready = false;
  private saveGeneration = 0;
  private removeAccessibility:()=>void;
  private project: Project;
  private audioEngine: AudioEngine;
  private playbackEngine: PlaybackEngine;

  private header: Header;
  private sidebar: Sidebar;
  private canvasPlayer: CanvasPlayer;
  private inspector: Inspector;
  private timeline: Timeline;
  private exportModal: ExportModal | null = null;
  private panelLayout: PanelLayout;

  // History Stack for Undo/Redo
  private history: string[] = [];
  private historyIndex: number = -1;

  constructor(root: HTMLElement, userId: string) {
    this.root = root;
    root.inert = true;
    this.store = new DraftStore(userId);
    // Parse URL parameters (e.g. from Montagem Web URLs: scale=16:9, scenario=youtube_ads, start_tab=video)
    const urlParams = new URLSearchParams(window.location.search);
    const requestedRatio = urlParams.get('scale') as AspectRatio;
    const initialRatio = RATIOS.includes(requestedRatio) ? requestedRatio : '16:9';
    const initialScenario = urlParams.get('scenario') || 'youtube_ads';
    const rawTab = urlParams.get('start_tab');
    const initialTab: SidebarTab = ['media','audio','text','captions','stickers','effects','transitions','filters'].includes(rawTab || '') ? rawTab as SidebarTab : 'media';

    this.project = this.createInitialProject(initialRatio, initialScenario);
    this.audioEngine = new AudioEngine();

    const canvas = document.createElement('canvas');
    canvas.id = 'main-player-canvas';

    this.playbackEngine = new PlaybackEngine(canvas, this.project, this.audioEngine);

    // Create Components
    this.header = new Header(
      this.project,
      this.playbackEngine,
      (ratio: AspectRatio) => this.handleRatioChange(ratio),
      () => this.openExportModal()
    );

    this.sidebar = new Sidebar(
      this.project,
      this.audioEngine,
      (clipData: Partial<Clip>) => this.handleAddClip(clipData)
    );

    this.canvasPlayer = new CanvasPlayer(
      this.project,
      this.playbackEngine,
      canvas
    );

    this.inspector = new Inspector(
      this.project,
      this.playbackEngine,
      () => {
        this.saveState();
        this.timeline.update();
        this.playbackEngine.render();
      }
    );

    this.timeline = new Timeline(
      this.project,
      this.playbackEngine,
      this.audioEngine,
      (clipId: string | null) => {
        this.project.selectedClipId = clipId;
        this.inspector.update();
      }
    );

    this.mount();
    this.panelLayout = new PanelLayout(this.root, userId);
    this.removeAccessibility=installEditorAccessibility(this.root);

    if (initialTab && initialTab !== 'media') {
      this.sidebar.setTab(initialTab);
    }

    this.saveState();
    this.setupHistoryListeners();
    void this.restoreDraft();
  }

  private saveState() {
    this.project.duration = projectDuration(this.project);
    this.store.hydrate(this.project);
    try {
      const snapshot = serializeProject(this.project);
      if (this.history[this.historyIndex] === snapshot) return;
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.history.push(snapshot);
      if (this.history.length > 50) this.history.shift();
      this.historyIndex = this.history.length - 1;
      this.queueSave();
    } catch (e) {}
  }

  private restoreSnapshot(snapshotStr: string) {
    try {
      this.playbackEngine.pause();
      const tracks = JSON.parse(snapshotStr);
      Object.assign(this.project, tracks);
      this.store.hydrate(this.project);
      this.playbackEngine.updateCanvasResolution();
      this.header.update();
      this.timeline.update();
      this.inspector.update();
      this.playbackEngine.render();
      this.queueSave();
    } catch (e) {}
  }

  private undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.restoreSnapshot(this.history[this.historyIndex]);
    }
  }

  private redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.restoreSnapshot(this.history[this.historyIndex]);
    }
  }

  private setupHistoryListeners() {
    window.addEventListener('montagem:undo', () => this.undo(), {signal:this.lifecycle.signal});
    window.addEventListener('montagem:redo', () => this.redo(), {signal:this.lifecycle.signal});
    window.addEventListener('montagem:project-updated', () => {
      this.saveState();
      this.timeline.update();
      this.inspector.update();
      this.playbackEngine.render();
    }, {signal:this.lifecycle.signal});

    window.addEventListener('montagem:add-clip', ((e: CustomEvent) => {
      this.handleAddClip(e.detail?.clip, e.detail?.trackId);
    }) as EventListener, {signal:this.lifecycle.signal});

    window.addEventListener('montagem:add-track', ((e: CustomEvent) => {
      this.timeline.addTrack(e.detail?.type, e.detail?.name);
    }) as EventListener, {signal:this.lifecycle.signal});

    window.addEventListener('montagem:save', () => { void this.saveNow(); }, {signal:this.lifecycle.signal});
    window.addEventListener('montagem:new', () => this.confirmNewProject(), {signal:this.lifecycle.signal});
    window.addEventListener('montagem:help', () => this.showHelp(), {signal:this.lifecycle.signal});
    window.addEventListener('montagem:inspector',()=>{const open=this.root.classList.toggle('is-inspector-open');this.root.querySelector('#btn-inspector-toggle')?.setAttribute('aria-pressed',String(open));},{signal:this.lifecycle.signal});
    this.root.addEventListener('click',e=>{if((e.target as Element).closest('[data-close-inspector]'))this.root.classList.remove('is-inspector-open');},{signal:this.lifecycle.signal});
    window.addEventListener('montagem:media-ready', () => this.playbackEngine.render(), {signal:this.lifecycle.signal});
    window.addEventListener('beforeunload', (e) => { if (this.saveTimer || this.playbackEngine.getIsExporting()) {e.preventDefault();e.returnValue='';} }, {signal:this.lifecycle.signal});
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.playbackEngine.getIsExporting()) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.redo();
        } else {
          this.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.redo();
      }
    }, {signal:this.lifecycle.signal});
  }

  private createInitialProject(ratio: AspectRatio = '16:9', scenario = 'editor'): Project {
    const make=(id:string,name:string,type:Track['type']):Track=>({id,name,type,locked:false,muted:false,visible:true,clips:[]});
    const tracks=[make('track_v2','V2 Sobreposição','overlay'),make('track_v1','V1 Vídeo principal','video'),make('track_t1','T1 Textos e legendas','text'),make('track_s1','S1 Figurinhas','sticker'),make('track_a1','A1 Trilha sonora','audio')];
    const common={offset:0,sourceDuration:6,x:0,y:0,scale:1,rotation:0,opacity:1,blendMode:'normal' as const,chromaKey:{enabled:false,color:'#00ff00',similarity:.4,smoothness:.1},adjustments:{brightness:0,contrast:0,saturation:0,temperature:0,vignette:0,blur:0,sharpness:0},speed:1,audio:{volume:.7,fadeIn:0,fadeOut:0,muted:false}};
    tracks[1].clips.push({...structuredClone(common),id:crypto.randomUUID(),trackId:'track_v1',name:'Estúdio Caramelo',type:'video',start:0,duration:6,src:'cyberpunk_neon'}, {...structuredClone(common),id:crypto.randomUUID(),trackId:'track_v1',name:'Movimento azul',type:'video',start:6,duration:5,sourceDuration:5,src:'abstract_waves'});
    tracks[2].clips.push({...structuredClone(common),id:crypto.randomUUID(),trackId:'track_t1',name:'Crie. Corte. Conte.',type:'text',start:0,duration:5.5,text:{content:'Crie. Corte.\nConte.',fontSize:142,fontFamily:'Montserrat',color:'#FFF4E8',bold:true,align:'left'},x:-760,y:0});
    return {id:crypto.randomUUID(),title:'Minha próxima história',aspectRatio:ratio,scenario,width:1920,height:1080,fps:30,duration:11,tracks,selectedClipId:null};
  }

  private handleRatioChange(ratio: AspectRatio) {
    const width=this.project.width,height=this.project.height;
    this.playbackEngine.setAspectRatio(ratio);
    const sx=this.project.width/width,sy=this.project.height/height;
    for(const track of this.project.tracks)for(const clip of track.clips){clip.x*=sx;clip.y*=sy;if(clip.text)clip.text.fontSize=Math.round(clip.text.fontSize*Math.min(sx,sy));}
    this.saveState();
    this.timeline.update();
    this.inspector.update();
    this.playbackEngine.render();
  }

  private handleAddClip(clipData: Partial<Clip>, preferredTrackId?: string) {
    const playheadTime = Number(this.playbackEngine.getCurrentTime().toFixed(2));
    const clipType = clipData.type || 'video';

    let targetTrack: Track | undefined;

    // 1. Explicit preferred track ID
    if (preferredTrackId) {
      targetTrack = this.project.tracks.find(t => t.id === preferredTrackId);
    }

    // 2. If user currently has a clip selected, check if its track is compatible
    if (!targetTrack && this.project.selectedClipId) {
      for (const t of this.project.tracks) {
        if (t.clips.some(c => c.id === this.project.selectedClipId)) {
          if (this.timeline.isTrackCompatibleWithClip(t.type, clipType)) {
            targetTrack = t;
          }
          break;
        }
      }
    }

    // 3. For video clips, if V1 already has an active clip at playheadTime, route to overlay V2
    if (!targetTrack && (clipType === 'video' || clipType === 'image')) {
      const v1 = this.project.tracks.find(t => t.type === 'video');
      const v1HasCollision = v1?.clips.some(c => playheadTime >= c.start && playheadTime < (c.start + c.duration));
      if (v1HasCollision) {
        targetTrack = this.project.tracks.find(t => t.type === 'overlay');
      }
    }

    // 4. Default to matching track type
    if (!targetTrack) {
      const targetTrackType = (clipType === 'audio' || clipType === 'sfx') 
        ? 'audio' 
        : (clipType === 'text' ? 'text' : (clipType === 'sticker' ? 'sticker' : 'video'));

      targetTrack = this.project.tracks.find(t => t.type === targetTrackType);
    }

    if (!targetTrack) {
      targetTrack = this.project.tracks[0];
    }

    const isOverlay = targetTrack.type === 'overlay';
    const newClip: Clip = {
      id: 'clip_' + crypto.randomUUID(),
      trackId: targetTrack.id,
      type: clipType,
      name: clipData.name || 'Novo Clipe',
      start: clipData.start ?? playheadTime,
      duration: clipData.duration || 4.0,
      offset: clipData.offset || 0,
      sourceDuration: clipData.sourceDuration || 4.0,
      src: clipData.src,
      assetId: clipData.assetId,
      element: clipData.element,
      x: clipData.x || 0,
      y: clipData.y || 0,
      scale: clipData.scale || (isOverlay ? 0.75 : 1.0),
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

    if (clipData.file) newClip.assetId = this.store.register(clipData.file, newClip.src!);
    targetTrack.clips.push(newClip);
    this.project.selectedClipId = newClip.id;

    this.saveState();
    this.timeline.update();
    this.inspector.update();
    this.playbackEngine.render();
  }

  private openExportModal() {
    if (this.exportModal) return;
    this.exportModal = new ExportModal(
      this.project,
      this.playbackEngine,
      this.audioEngine,
      () => {
        this.exportModal?.getElement().remove();
        this.exportModal = null;
      }
    );
    document.body.appendChild(this.exportModal.getElement());
  }

  private mount() {
    const appEl = this.root;
    appEl.innerHTML = '';

    // Header
    appEl.appendChild(this.header.getElement());

    // Middle Workspace
    const workspaceEl = document.createElement('div');
    workspaceEl.className = 'montagem-workspace';

    workspaceEl.appendChild(this.sidebar.getElement());
    workspaceEl.appendChild(this.canvasPlayer.getElement());
    workspaceEl.appendChild(this.inspector.getElement());

    appEl.appendChild(workspaceEl);

    // Bottom Timeline
    appEl.appendChild(this.timeline.getElement());

    const status = document.createElement("div");
    status.className="montagem-statusbar";
    status.innerHTML="<span>● PROCESSAMENTO LOCAL</span><span>Espaço · reproduzir &nbsp; / &nbsp; Ctrl+B · dividir &nbsp; / &nbsp; Ctrl+Z · desfazer</span><span>MONTAGEM / BETA</span>";
    appEl.appendChild(status);

    // Initial render
    this.timeline.update();
    this.inspector.update();
    this.playbackEngine.seek(0);
  }

  private status(text:string) { const el=this.header.getElement().querySelector('#draft-status'); if(el)el.textContent=text; }
  private queueSave() {
    if(!this.ready || this.destroyed)return;
    clearTimeout(this.saveTimer);this.status('Alterações pendentes');
    this.saveTimer=setTimeout(()=>{this.saveTimer=undefined;void this.saveNow();},350);
  }
  private async saveNow() {
    if(!this.ready||this.destroyed)return;
    clearTimeout(this.saveTimer);this.saveTimer=undefined;
    const generation=++this.saveGeneration;this.status('Salvando neste navegador…');
    try {await this.store.save(this.project);if(!this.destroyed&&generation===this.saveGeneration)this.status('Salvo neste navegador');}
    catch {if(!this.destroyed)this.status('Não salvo · verifique o espaço do navegador');}
  }
  private async restoreDraft() {
    try {
      const draft=await this.store.load();if(this.destroyed)return;
      if(draft){Object.assign(this.project,draft);this.header.update();this.playbackEngine.updateCanvasResolution();this.timeline.update();this.inspector.update();this.playbackEngine.seek(0);}
      this.history=[];this.historyIndex=-1;this.ready=true;this.saveState();
    } catch {if(!this.destroyed){this.ready=true;this.status('Armazenamento indisponível · exporte antes de sair');}}
    finally {if(!this.destroyed)this.root.inert=false;}
  }
  private showHelp() {
    const dialog=document.createElement('dialog');dialog.className='montagem-help';
    dialog.innerHTML='<span class="montagem-eyebrow">MONTAGEM / GUIA RÁPIDO</span><h2>Sua história, no seu ritmo.</h2><p>Importe vídeos, imagens e áudios na aba Mídia. Arraste as bordas dos clipes para aparar e use Ctrl+B para dividir na agulha. Ajuste cor, velocidade, som e texto no painel à direita.</p><p>Arraste as divisórias entre biblioteca, prévia e propriedades, ou acima da timeline, para organizar seu espaço. Clique duas vezes na divisória para restaurar. Pelo teclado: Tab até a divisória e use as setas; Enter restaura.</p><p>Legendas: importe um arquivo SRT. Os fundos e trilhas de exemplo são gerados localmente. Figurinhas: acervo oficial Caramelo.</p><p><strong>Seus arquivos ficam neste navegador, separados por conta.</strong> A exportação acontece em tempo real: mantenha a aba aberta. MP4 depende dos codecs do navegador; WebM é a alternativa. Recursos de IA e sincronização na nuvem precisam de serviços adicionais.</p><p>Espaço: reproduzir/pausar · Ctrl+B: dividir · Delete: excluir · Ctrl+D: duplicar · Ctrl+Z: desfazer · Ctrl+Shift+Z: refazer.</p><button class="btn-export">Começar a montar</button>';
    document.body.appendChild(dialog);dialog.querySelector('button')!.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
  }
  private confirmNewProject(){
    const dialog=document.createElement('dialog');dialog.className='montagem-help';
    dialog.innerHTML='<span class="montagem-eyebrow">NOVO PROJETO</span><h2>Uma nova história.</h2><p>O projeto vazio substitui o rascunho salvo neste navegador. Exporte o vídeo antes de continuar. Você poderá desfazer esta ação enquanto esta aba estiver aberta.</p><div class="modal-footer"><button class="btn-secondary" data-cancel>Continuar editando</button><button class="btn-export" data-create>Criar projeto vazio</button></div>';
    dialog.querySelector('[data-cancel]')!.addEventListener('click',()=>dialog.close());
    dialog.querySelector('[data-create]')!.addEventListener('click',()=>{this.playbackEngine.pause();for(const track of this.project.tracks)for(const clip of track.clips)this.store.releaseClip(clip);this.project.tracks.forEach(t=>t.clips=[]);this.project.selectedClipId=null;this.project.duration=0;this.saveState();this.timeline.update();this.inspector.update();this.playbackEngine.seek(0);dialog.close();});
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.appendChild(dialog);dialog.showModal();
  }
  public destroy() {
    this.destroyed=true;clearTimeout(this.saveTimer);this.panelLayout.dispose();this.lifecycle.abort();this.removeAccessibility();this.exportModal?.dispose();this.timeline.dispose();this.canvasPlayer.dispose();this.playbackEngine.dispose();this.audioEngine.dispose();
    for(const track of this.project.tracks)for(const clip of track.clips)this.store.releaseClip(clip);
    this.store.close();document.querySelectorAll('.montagem-help,#timeline-clip-context-menu').forEach(el=>el.remove());this.root.replaceChildren();
  }
}

