import { useEffect, useRef, useState, type ReactNode } from "react";
import { Isotype, ThemeToggle } from "@caramelo/design-system";
import { toolStorageKey } from "../../toolLifecycle";
import { useToolUser } from "../shared/kit";
import { AudioEngine } from "./engine/audio-engine.js";
import { TransitionsEngine } from "./engine/transitions.js";
import { CanvasCompositor } from "./engine/canvas-compositor.js";
import { RecordingService } from "./engine/recording-service.js";
import { StreamingService } from "./engine/streaming-service.js";
import { SourceFactory } from "./sources/source-factory.js";
import { AppState } from "./app-state.js";
import { CanvasView } from "./ui/canvas-view.js";
import { StudioModeView } from "./ui/studio-mode.js";
import { AudioMixerView } from "./ui/audio-mixer-view.js";
import { DocksView } from "./ui/docks.js";
import { StatusBarView } from "./ui/status-bar.js";
import { AddSourceDialog } from "./ui/dialogs/add-source-dialog.js";
import { SourcePropertiesDialog } from "./ui/dialogs/source-properties-dialog.js";
import { AudioFiltersDialog } from "./ui/dialogs/audio-filters-dialog.js";
import { SettingsDialog } from "./ui/dialogs/settings-dialog.js";
import "./noar.css";

type Glyph = "record" | "screen" | "camera" | "mic" | "settings" | "layers" | "broadcast" | "folder" | "image" | "help" | "arrow" | "close";
function Icon({ name, size = 18 }: { name: Glyph; size?: number }) {
  const paths: Record<Glyph, ReactNode> = {
    record: <circle cx="12" cy="12" r="7" />,
    screen: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>,
    camera: <><rect x="3" y="6" width="12" height="12" rx="2" /><path d="m15 10 6-3v10l-6-3" /></>,
    mic: <><rect x="9" y="2" width="6" height="13" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8" /></>,
    settings: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" /><circle cx="15" cy="17" r="3" /></>,
    layers: <><path d="m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5" /></>,
    broadcast: <><circle cx="12" cy="12" r="2" /><path d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10M4 4a11 11 0 0 0 0 16M20 4a11 11 0 0 1 0 16" /></>,
    folder: <path d="M3 7V5a2 2 0 0 1 2-2h5l3 4h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8" cy="8" r="1" /><path d="m3 17 6-6 4 4 3-3 5 5" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9 9a3 3 0 1 1 5 2c-1 1-2 1-2 3m0 3h.01" /></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function StudioDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); ref.current?.querySelector('input')?.focus(); }, []);
  return <dialog className="noar-dialog" ref={ref} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }} aria-label={title}>
    <div className="noar-dialog-heading"><h2>{title}</h2><button type="button" className="noar-icon-button" aria-label="Fechar" onClick={onClose}><Icon name="close" /></button></div>
    {children}
  </dialog>;
}

export function GravadorApp() {
  const user = useToolUser();
  return <NoArStudio key={user.id} userId={user.id} />;
}

/** The production entry is mounted behind the LAB ToolGate. */
export function NoArStudio({ userId }: { userId: string }) {
  // const theme = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const runtime = useRef<any>(null);
  const [studio, setStudio] = useState(false);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [ready, setReady] = useState(false);
  const [scene, setScene] = useState("Cena 1");
  const [empty, setEmpty] = useState(true);
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<"stream" | "recordings" | "help" | "scene" | null>(null);
  const [sceneName, setSceneName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [token, setToken] = useState("");
  const [exports, setExports] = useState<{ url: string; filename: string; size: number }[]>([]);

  useEffect(() => {
    let alive = true;
    const cleanups: (() => void)[] = [];
    const urls: string[] = [];
    const audioEngine = new AudioEngine();
    const transitions = new TransitionsEngine();
    const compositor = new CanvasCompositor({ width: 1920, height: 1080, fps: 30, transitions, audioEngine });
    const sourceFactory = new SourceFactory(audioEngine);
    const appState = new AppState(compositor, sourceFactory, { storageKey: toolStorageKey(userId, "gravador") });
    const recordingService = new RecordingService(compositor, audioEngine);
    const streamingService = new StreamingService(compositor, audioEngine);
    const error = (e: unknown) => { if (alive) setNotice(e instanceof Error ? e.message : String(e)); };
    sourceFactory.onError = error;
    recordingService.onError = error;
    streamingService.onError = error;

    const init = async () => {
      await appState.initDefaultSetup();
      if (!alive || !rootRef.current) return;
      const el = (id: string) => rootRef.current!.querySelector<HTMLElement>(`#${id}`)!;
      const canvas = new CanvasView(el("single-canvas-area"), compositor);
      const studioView = new StudioModeView(el("studio-mode-area"), compositor, transitions);
      const mixer = new AudioMixerView(el("audio-mixer-content"), audioEngine);
      let docks: any;
      const sync = () => {
        if (!alive) return;
        const editing = appState.editingScene || appState.currentScene;
        setScene(editing?.name || "Cena 1");
        setEmpty(!editing?.sources?.length);
        mixer.setSources(editing?.sources || []);
        canvas.updateGizmo();
        appState.saveCurrentSetup();
      };
      canvas.onTransformEnd = sync;
      studioView.onTransformEnd = sync;
      mixer.onUpdate = () => appState.saveCurrentSetup();
      const audioFilters = new AudioFiltersDialog(el("modal-audio-filters"), audioEngine, sync);
      mixer.onOpenAudioFilters = (source: any) => audioFilters.open(source);
      const addSource = new AddSourceDialog(el("modal-add-source"), sourceFactory, (source: any) => {
        if (!alive || !source) return;
        appState.addSource(source); docks?.renderSources(); sync();
      });
      const properties = new SourcePropertiesDialog(el("modal-source-properties"), compositor, () => { docks?.renderSources(); sync(); }, (source: any) => audioFilters.open(source), (source: any, file: File) => sourceFactory.loadMediaFile(source, file));
      const settings = new SettingsDialog(el("modal-settings"), compositor, appState, (config: any) => {
        const [w, h] = config.canvasResolution.split("x").map(Number);
        compositor.setResolution(w, h); compositor.setFps(config.fps);
        recordingService.setConfig({ format: config.format, bitrateKbps: config.bitrate, fps: config.fps });
        canvas._updateViewportScale(); studioView.updateLayout();
        docks?.renderScenes(); docks?.renderSources(); sync();
      }, { storageKey: toolStorageKey(userId, "gravador", "settings"), isRecording: () => recordingService.isRecording || streamingService.isStreaming || streamingService.isConnecting });
      const config = settings.currentSettings;
      const [w, h] = config.canvasResolution.split("x").map(Number);
      compositor.setResolution(w, h); compositor.setFps(config.fps);
      recordingService.setConfig({ format: config.format, bitrateKbps: config.bitrate, fps: config.fps });
      docks = new DocksView({ appState, compositor, recordingService, streamingService, transitions,
        onAddSceneClick: () => { setSceneName(`Cena ${appState.scenes.length + 1}`); setModal("scene"); },
        onAddSourceClick: () => addSource.open(), onSourcePropertiesClick: (s: any) => properties.open(s),
        onSettingsClick: () => settings.open(), onSceneChange: sync,
        onStudioModeToggle: () => {
          const next = !compositor.isStudioMode;
          appState.setStudioMode(next);
          el("obs-workspace").classList.toggle("studio-mode-active", next);
          setStudio(next); sync();
          requestAnimationFrame(() => { if (alive) { canvas._updateViewportScale(); studioView.updateLayout(); } });
        },
      });
      studioView.onTransition = (type: string, duration: number) => {
        if (transitions.isTransitioning) return;
        const from = compositor.activeScene, to = compositor.previewScene;
        transitions.startTransition(from, to, type, duration, () => {
          if (!alive) return;
          appState.commitTransition(from, to); docks.renderScenes(); docks.renderSources(); sync();
        });
      };
      compositor.onSelectionChange = () => { docks.renderSources(); canvas.updateGizmo(); };
      const status = new StatusBarView(compositor, recordingService, streamingService);
      cleanups.push(() => status.destroy?.());
      const onRecord = recordingService.onStateChange;
      recordingService.onStateChange = (active: boolean, isPaused: boolean) => {
        onRecord?.(active, isPaused);
        docks.syncRecordingControls?.();
        if (alive) { setRecording(active); setPaused(!!isPaused); }
      };
      const onStream = streamingService.onStateChange;
      streamingService.onStateChange = (active: boolean) => {
        onStream?.(active); if (alive) setStreaming(active);
      };
      recordingService.onExport = ({ blob, filename }: { blob: Blob; filename: string }) => {
        if (!alive) return;
        const url = URL.createObjectURL(blob); urls.push(url);
        setExports(previous => [{ url, filename, size: blob.size }, ...previous]);
        setNotice("Gravação finalizada. Seu arquivo está em Gravações.");
      };
      runtime.current = { appState, compositor, recordingService, streamingService, sourceFactory, addSource, settings, docks, sync };
      const observer = new ResizeObserver(() => { canvas._updateViewportScale(); studioView.updateLayout(); });
      observer.observe(el("obs-workspace")); cleanups.push(() => observer.disconnect());
      const save = () => appState.saveCurrentSetup();
      const resume = () => audioEngine.ensureContext();
      const beforeUnload = (event: BeforeUnloadEvent) => { save(); if (recordingService.isRecording || streamingService.isStreaming) { event.preventDefault(); event.returnValue = ""; } };
      window.addEventListener("beforeunload", beforeUnload);
      rootRef.current.addEventListener("pointerdown", resume);
      cleanups.push(() => window.removeEventListener("beforeunload", beforeUnload));
      const root = rootRef.current;
      cleanups.push(() => root.removeEventListener("pointerdown", resume));
      for (const view of [canvas, studioView, mixer, docks, addSource, properties, audioFilters, settings]) cleanups.push(() => view.destroy?.());
      sync(); canvas._updateViewportScale(); setReady(true);
    };
    void init().catch(error);
    return () => {
      alive = false; runtime.current = null;
      cleanups.reverse().forEach(fn => fn());
      recordingService.destroy?.(); void streamingService.destroy?.();
      appState.destroy?.(); sourceFactory.destroy?.(); audioEngine.destroy?.(); compositor.destroy();
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [userId]);

  const quickSource = async (type: string) => {
    const r = runtime.current; if (!r) return;
    try {
      const source = await r.sourceFactory.createSource(type);
      if (source && runtime.current === r) { r.appState.addSource(source); r.docks.renderSources(); r.sync(); }
      else if (source) r.sourceFactory.releaseSource?.(source);
    } catch (e) { setNotice(e instanceof Error ? e.message : "Não foi possível abrir esta fonte."); }
  };
  const opening = async () => {
    const r = runtime.current; if (!r) return;
    const background = await r.sourceFactory.createSource("color", "Fundo Caramelo");
    if (!background || runtime.current !== r) { background?.destroy?.(); return; }
    background.props.color = "#101014"; background.width = r.compositor.width; background.height = r.compositor.height;
    r.appState.addSource(background);
    const title = await r.sourceFactory.createSource("text", "Título de abertura");
    if (!title || runtime.current !== r) { title?.destroy?.(); return; }
    title.props.text = "JÁ VAI\nCOMEÇAR."; title.props.font = 'Montserrat, Inter, sans-serif'; title.props.fontSize = 126; title.props.textColor = "#FFF4E8";
    title.x = 130; title.y = 240; title.width = 1500; title.height = 500;
    r.appState.addSource(title); r.docks.renderSources(); r.sync();
  };
  const startStream = async () => {
    const r = runtime.current; if (!r) return;
    setConnecting(true); setNotice("");
    try {
      const connected = await r.streamingService.startStreaming({ endpoint: endpoint.trim(), token: token.trim() });
      if (runtime.current === r && connected) { setModal(null); setToken(""); }
    } catch (e) { setNotice(e instanceof Error ? e.message : "A conexão não foi concluída."); }
    finally { if (runtime.current === r) setConnecting(false); }
  };
  return <div className="gravador-shell noar-shell" ref={rootRef}>
    <header className="noar-header">
      <div className="noar-brand"><span className="noar-mark"><Icon name="broadcast" size={25} /></span><div><h1>NO AR<span>®</span></h1><p>ESTÚDIO CRIATIVO</p></div><span className="noar-beta">BETA</span></div>
      <nav className="noar-nav" aria-label="Áreas do estúdio"><button type="button" className="active" aria-current="page"><Icon name="layers" />Estúdio</button><button type="button" onClick={() => setModal("recordings")}><Icon name="folder" />Gravações{exports.length > 0 && <span className="noar-count">{exports.length}</span>}</button></nav>
      <div className="noar-header-actions"><span className={`noar-session-state ${streaming || recording ? "active" : ""}`}><i />{streaming ? "AO VIVO" : recording ? paused ? "PAUSADO" : "GRAVANDO" : "FORA DO AR"}</span><button type="button" className="noar-icon-button" onClick={() => setModal("help")} aria-label="Guia do estúdio"><Icon name="help" /></button><ThemeToggle /><span className="noar-by"><Isotype size={22} variant="spectrum" /></span></div>
    </header>

    <div className="noar-toolbar"><div className="noar-scene-heading"><span className="noar-section-index">01 /</span><strong>{scene}</strong><span className="noar-saved">Salvo neste navegador</span></div><div className="noar-toolbar-actions"><button type="button" className="noar-subtle-button" onClick={() => runtime.current?.settings.open()} disabled={!ready || recording || streaming || connecting}><Icon name="settings" size={15} />Saída e preferências</button><button type="button" className="noar-subtle-button" id="btn-studio" aria-pressed={studio}><Icon name="layers" size={15} />{studio ? "Modo estúdio ativo" : "Modo estúdio"}</button></div></div>

    <main className="obs-workspace" id="obs-workspace" aria-label="Área de composição">
      <div className="noar-canvas-label"><span className="noar-output-dot" />{studio ? "PRÉVIA / PROGRAMA" : "PROGRAMA"}<span>SAÍDA DA COMPOSIÇÃO</span></div>
      <div className="obs-canvas-area single-canvas-container" id="single-canvas-area" />
      <div className="obs-canvas-area studio-mode-container" id="studio-mode-area" />
      {empty && !studio && <div className="noar-empty"><span className="noar-empty-cross">＋</span><div className="noar-empty-symbol"><Icon name="broadcast" size={44} /></div><p className="noar-overline">O ESTÚDIO É SEU.</p><h2>Sua ideia.<br />Em primeiro plano.</h2><p>Comece com sua tela, câmera ou uma cena de abertura.</p><div className="noar-empty-actions"><button type="button" className="obs-btn primary" disabled={!ready} onClick={() => void quickSource("monitor")}><Icon name="screen" size={16} />Compartilhar tela</button><button type="button" className="obs-btn" disabled={!ready} onClick={() => void opening()}>Criar abertura<Icon name="arrow" size={16} /></button></div><span className="noar-frame-note">SEU PRÓXIMO FRAME COMEÇA AQUI ↗</span></div>}
      <div className="noar-canvas-bottom"><span>COMPOSIÇÃO EM TEMPO REAL</span><span>Canvas • Web Audio</span></div>
    </main>

    <div className="noar-source-strip"><span>ADICIONAR À CENA</span><button type="button" disabled={!ready} onClick={() => void quickSource("monitor")}><Icon name="screen" size={16} />Tela</button><button type="button" disabled={!ready} onClick={() => void quickSource("camera")}><Icon name="camera" size={16} />Câmera</button><button type="button" disabled={!ready} onClick={() => void quickSource("mic")}><Icon name="mic" size={16} />Microfone</button><button type="button" disabled={!ready} onClick={() => runtime.current?.addSource.open()}><Icon name="image" size={16} />Mídia e texto</button><span className="noar-strip-tip">Uma boa ideia merece uma boa cena.</span></div>

    <footer className="obs-docks-area">
      <section className="obs-dock obs-dock-scenes" aria-label="Cenas"><div className="obs-dock-header"><span><Icon name="layers" size={15} />Cenas</span><span className="noar-dock-index">01</span></div><div className="obs-dock-content" id="scenes-list" /><div className="obs-dock-toolbar"><button type="button" className="obs-tool-btn" id="btn-add-scene" title="Adicionar cena" aria-label="Adicionar cena">+</button><button type="button" className="obs-tool-btn" id="btn-remove-scene" title="Remover cena" aria-label="Remover cena">−</button><span /><button type="button" className="obs-tool-btn" id="btn-scene-up" title="Mover cena para cima" aria-label="Mover cena para cima">↑</button><button type="button" className="obs-tool-btn" id="btn-scene-down" title="Mover cena para baixo" aria-label="Mover cena para baixo">↓</button></div></section>
      <section className="obs-dock obs-dock-sources" aria-label="Fontes"><div className="obs-dock-header"><span><Icon name="screen" size={15} />Fontes</span><span className="noar-dock-index">02</span></div><div className="obs-dock-content" id="sources-list" /><div className="obs-dock-toolbar"><button type="button" className="obs-tool-btn" id="btn-add-source" title="Adicionar fonte" aria-label="Adicionar fonte">+</button><button type="button" className="obs-tool-btn" id="btn-remove-source" title="Remover fonte" aria-label="Remover fonte">−</button><button type="button" className="obs-tool-btn" id="btn-source-props" title="Propriedades da fonte" aria-label="Propriedades da fonte"><Icon name="settings" size={14} /></button><span /><button type="button" className="obs-tool-btn" id="btn-source-up" title="Subir camada" aria-label="Subir camada">↑</button><button type="button" className="obs-tool-btn" id="btn-source-down" title="Descer camada" aria-label="Descer camada">↓</button></div></section>
      <section className="obs-dock obs-dock-mixer" aria-label="Mixer de áudio"><div className="obs-dock-header"><span><Icon name="mic" size={15} />Mixer de áudio</span><span className="noar-dock-index">03</span></div><div className="obs-dock-content" id="audio-mixer-content" /></section>
      <section className="obs-dock obs-dock-transitions" aria-label="Transições"><div className="obs-dock-header"><span>Transições</span><span className="noar-dock-index">04</span></div><div className="obs-dock-content transitions-content"><div className="form-group"><label className="form-label" htmlFor="transition-type-select">Efeito</label><select className="obs-select" id="transition-type-select" defaultValue="fade"><option value="fade">Esmaecer</option><option value="cut">Corte seco</option><option value="slide">Deslizar</option></select></div><div className="form-group"><label className="form-label" htmlFor="transition-duration-input">Duração</label><div className="noar-duration"><input type="number" className="obs-input" id="transition-duration-input" defaultValue="300" min="0" max="2000" step="50" /><span>ms</span></div></div><p className="noar-field-hint">Prepare na prévia.<br />Troque no modo estúdio.</p></div></section>
      <section className="obs-dock obs-dock-controls" aria-label="Controles de saída"><div className="obs-dock-header"><span>Vamos criar?</span><span className="noar-dock-index">05</span></div><div className="obs-dock-content controls-grid"><button type="button" className={`obs-btn primary ${recording ? "recording-active" : ""}`} id="btn-record" disabled={!ready}>{recording ? "Finalizar gravação" : "●  Iniciar gravação"}</button><button type="button" className="obs-btn" id="btn-pause-record" disabled={!recording}>{paused ? "Retomar gravação" : "Pausar gravação"}</button><button type="button" className={`obs-btn noar-stream-button ${streaming ? "active" : ""}`} id="btn-stream" disabled={!ready || connecting} onClick={() => streaming ? void runtime.current?.streamingService.stopStreaming() : setModal("stream")}><Icon name="broadcast" size={16} />{connecting ? "Conectando…" : streaming ? "Encerrar transmissão" : "Transmitir ao vivo"}</button><div className="noar-control-pair"><button type="button" className="obs-btn" id="btn-snapshot" title="Baixar imagem da composição" disabled={!ready}><Icon name="image" size={14} />Captura</button><button type="button" className="obs-btn" id="btn-settings" disabled={!ready || recording || streaming || connecting} title="Configurações" aria-label="Configurações"><Icon name="settings" size={16} /></button></div></div></section>
    </footer>

    <div className="obs-status-bar"><div className="status-group"><span className="noar-local-dot" />LOCAL<span className="noar-status-divider" /><div className="status-indicator"><div className="status-dot" id="status-rec-dot" /><span id="status-rec-text">REC: 00:00:00</span></div><span id="status-live-text">LIVE: 00:00:00</span></div><div className="status-group"><span id="status-cpu-text">Render: — ms</span><span id="status-fps-text">— fps</span><span className="noar-lab-signature">UM CARA CARAMELO / LAB</span></div></div>
    <div className="obs-modal-overlay" id="modal-add-source" /><div className="obs-modal-overlay" id="modal-source-properties" /><div className="obs-modal-overlay" id="modal-audio-filters" /><div className="obs-modal-overlay" id="modal-settings" />
    {notice && <div className="noar-notice" role="status"><span>{notice}</span><button type="button" className="noar-icon-button" aria-label="Dispensar mensagem" onClick={() => setNotice("")}><Icon name="close" size={15} /></button></div>}

    {modal === "scene" && <StudioDialog title="Uma nova cena." onClose={() => setModal(null)}><form onSubmit={event => { event.preventDefault(); const r = runtime.current; if (!r || !sceneName.trim()) return; r.appState.addScene(sceneName.trim()); r.docks.renderScenes(); r.docks.renderSources(); r.sync(); setModal(null); }}><label htmlFor="new-scene-name">Nome da cena</label><input id="new-scene-name" value={sceneName} onChange={event => setSceneName(event.target.value)} required maxLength={150} autoFocus /><button type="submit" className="obs-btn primary">Criar cena<Icon name="arrow" size={16} /></button></form></StudioDialog>}
    {modal === "stream" && <StudioDialog title="Sua ideia, ao vivo." onClose={() => { setModal(null); setToken(""); }}><form onSubmit={e => { e.preventDefault(); void startStream(); }}><p>Conecte o destino de transmissão do seu provedor e envie a composição com áudio.</p><label htmlFor="whip-endpoint">Endpoint WHIP</label><input id="whip-endpoint" type="url" required placeholder="https://seu-provedor.com/whip" value={endpoint} onChange={e => setEndpoint(e.target.value)} autoComplete="off" /><label htmlFor="whip-token">Token de transmissão <span>opcional</span></label><input id="whip-token" type="password" value={token} onChange={e => setToken(e.target.value)} autoComplete="off" placeholder="Token fornecido pelo seu provedor" /><div className="noar-info-box">Use um destino WHIP com HTTPS e CORS habilitado. Para destinos RTMP, conecte uma ponte compatível. O token vale apenas nesta sessão.</div><button type="submit" className="obs-btn primary" disabled={connecting}>{connecting ? "Conectando ao destino…" : "Conectar e transmitir"}<Icon name="arrow" size={16} /></button></form></StudioDialog>}
    {modal === "recordings" && <StudioDialog title="Suas gravações." onClose={() => setModal(null)}><p>Arquivos desta sessão. Baixe antes de fechar o estúdio.</p>{exports.length === 0 ? <div className="noar-recordings-empty"><Icon name="folder" size={36} /><h3>A primeira cena ainda vem.</h3><p>Inicie uma gravação e finalize para baixar seu vídeo.</p></div> : <div className="noar-recordings">{exports.map(item => <a href={item.url} download={item.filename} key={item.url}><Icon name="folder" /><span><strong>{item.filename}</strong><small>{(item.size / 1048576).toFixed(1)} MB · pronto para baixar</small></span><Icon name="arrow" /></a>)}</div>}</StudioDialog>}
    {modal === "help" && <StudioDialog title="Da ideia à gravação." onClose={() => setModal(null)}><ol className="noar-guide"><li><strong>Monte sua cena.</strong><p>Adicione tela, câmera, microfone, imagem, vídeo, texto ou uma cor. O navegador pede acesso aos dispositivos.</p></li><li><strong>Encontre o enquadramento.</strong><p>Selecione uma fonte para mover e redimensionar. Use as setas para ajustar e as propriedades para editar.</p></li><li><strong>Prepare o próximo corte.</strong><p>No modo estúdio, escolha uma cena na prévia e use Corte ou Esmaecer para colocá-la no programa.</p></li><li><strong>Grave. Baixe. Compartilhe.</strong><p>O formato depende dos codecs do navegador. As cenas ficam salvas por conta neste navegador; arquivos e dispositivos precisam ser reconectados.</p></li></ol></StudioDialog>}
  </div>;
}
