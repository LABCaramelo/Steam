import { useEffect, useRef, useState } from "react";

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

export function GravadorApp() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isStudioMode, setIsStudioMode] = useState(false);

  useEffect(() => {
    let alive = true;
    let compositorInstance: any = null;

    const initStudio = async () => {
      if (!rootRef.current) return;

      // 1. Initialize Core Engines
      const audioEngine = new AudioEngine();
      const transitions = new TransitionsEngine();
      const compositor = new CanvasCompositor({
        width: 1920,
        height: 1080,
        fps: 60,
        transitions,
        audioEngine,
      });
      compositorInstance = compositor;

      const sourceFactory = new SourceFactory(audioEngine);
      const appState = new AppState(compositor, sourceFactory);

      const recordingService = new RecordingService(compositor, audioEngine);
      const streamingService = new StreamingService(compositor, audioEngine);

      // 2. Setup Default Scene Setup (Main Stream & BRB)
      await appState.initDefaultSetup();
      if (!alive) {
        compositor.destroy?.();
        return;
      }

      // 3. Setup UI Views
      const singleContainer = document.getElementById("single-canvas-area");
      const studioContainer = document.getElementById("studio-mode-area");
      const workspaceEl = document.getElementById("obs-workspace");

      const canvasView = new CanvasView(singleContainer, compositor);
      const studioModeView = new StudioModeView(studioContainer, compositor, transitions);

      const mixerContent = document.getElementById("audio-mixer-content");
      const audioMixerView = new AudioMixerView(mixerContent, audioEngine);

      // 4. Setup Modals
      const addSourceModalEl = document.getElementById("modal-add-source");
      const propsModalEl = document.getElementById("modal-source-properties");
      const audioFiltersModalEl = document.getElementById("modal-audio-filters");
      const settingsModalEl = document.getElementById("modal-settings");

      const audioFiltersDialog = new AudioFiltersDialog(audioFiltersModalEl, audioEngine, () => {});

      let docksView: any = null;

      audioMixerView.onOpenAudioFilters = (source: any) => {
        audioFiltersDialog.open(source);
      };

      const addSourceDialog = new AddSourceDialog(addSourceModalEl, sourceFactory, (newSource: any) => {
        appState.addSource(newSource);
        docksView?.renderSources();
        audioMixerView.setSources(appState.currentScene.sources);
        canvasView.updateGizmo();
      });

      const sourcePropertiesDialog = new SourcePropertiesDialog(
        propsModalEl,
        compositor,
        () => {
          docksView?.renderSources();
          canvasView.updateGizmo();
          audioMixerView.setSources(appState.currentScene.sources);
        },
        (source: any) => {
          audioFiltersDialog.open(source);
        },
      );

      const settingsDialog = new SettingsDialog(settingsModalEl, compositor, appState, (settings: any) => {
        const [w, h] = settings.canvasResolution.split("x").map(Number);
        compositor.setResolution(w, h);
        compositor.setFps(settings.fps);
        recordingService.setConfig({
          format: settings.format,
          bitrateKbps: settings.bitrate,
          fps: settings.fps,
        });
        canvasView._updateViewportScale();
        studioModeView.updateLayout();
      });

      // Apply initial saved settings
      const initSet = settingsDialog.currentSettings;
      const [initW, initH] = initSet.canvasResolution.split("x").map(Number);
      compositor.setResolution(initW, initH);
      compositor.setFps(initSet.fps);
      recordingService.setConfig({
        format: initSet.format,
        bitrateKbps: initSet.bitrate,
        fps: initSet.fps,
      });

      // 5. Setup Docks View
      const toggleStudio = () => {
        const nextStudio = !compositor.isStudioMode;
        compositor.setStudioMode(nextStudio);
        workspaceEl?.classList.toggle("studio-mode-active", nextStudio);
        const studioBtn = document.getElementById("btn-studio");
        studioBtn?.classList.toggle("primary", nextStudio);
        setIsStudioMode(nextStudio);

        if (nextStudio) {
          studioModeView.updateLayout();
        } else {
          canvasView._updateViewportScale();
        }
      };

      docksView = new DocksView({
        appState,
        compositor,
        recordingService,
        streamingService,
        transitions,
        onAddSourceClick: () => addSourceDialog.open(),
        onSourcePropertiesClick: (source: any) => sourcePropertiesDialog.open(source),
        onSettingsClick: () => settingsDialog.open(),
        onSceneChange: (scene: any) => {
          audioMixerView.setSources(scene.sources);
          canvasView.updateGizmo();
        },
        onStudioModeToggle: toggleStudio,
      });

      // Studio Mode Transition trigger
      studioModeView.onTransition = (type: any, duration: any) => {
        (transitions as any).startTransition(
          compositor.activeScene,
          compositor.previewScene,
          type,
          duration,
          () => {
            const temp = compositor.activeScene;
            appState.setCurrentScene(compositor.previewScene);
            appState.setPreviewScene(temp);
            docksView?.renderScenes();
            docksView?.renderSources();
            audioMixerView.setSources(appState.currentScene.sources);
          },
        );
      };

      // Selection Callback
      compositor.onSelectionChange = () => {
        docksView?.renderSources();
        canvasView.updateGizmo();
      };

      // 6. Setup Status Bar
      new StatusBarView(compositor, recordingService, streamingService);

      // Initial mixer sync
      audioMixerView.setSources(appState.currentScene.sources);

      // Resume AudioContext on first user interaction
      const resumeAudio = () => audioEngine.ensureContext();
      window.addEventListener("click", resumeAudio, { once: true });
    };

    void initStudio();

    return () => {
      alive = false;
      if (compositorInstance?.destroy) {
        compositorInstance.destroy();
      }
    };
  }, []);

  return (
    <div className="gravador-shell" ref={rootRef}>
      {/* Main Workspace (Canvas View) */}
      <main className="obs-workspace" id="obs-workspace">
        {/* Single Canvas Area */}
        <div className="obs-canvas-area single-canvas-container" id="single-canvas-area" />

        {/* Studio Mode Dual Split Area */}
        <div className="obs-canvas-area studio-mode-container" id="studio-mode-area" />
      </main>

      {/* Bottom Docks (5 Columns) */}
      <footer className="obs-docks-area">
        {/* 1. Scenes Dock */}
        <div className="obs-dock obs-dock-scenes">
          <div className="obs-dock-header">
            <span>Cenas</span>
          </div>
          <div className="obs-dock-content" id="scenes-list" />
          <div className="obs-dock-toolbar">
            <button className="obs-tool-btn" id="btn-add-scene" title="Adicionar Cena">+</button>
            <button className="obs-tool-btn" id="btn-remove-scene" title="Remover Cena">-</button>
            <button className="obs-tool-btn" id="btn-scene-up" title="Mover para Cima">▲</button>
            <button className="obs-tool-btn" id="btn-scene-down" title="Mover para Baixo">▼</button>
          </div>
        </div>

        {/* 2. Sources Dock */}
        <div className="obs-dock obs-dock-sources">
          <div className="obs-dock-header">
            <span>Fontes</span>
          </div>
          <div className="obs-dock-content" id="sources-list" />
          <div className="obs-dock-toolbar">
            <button className="obs-tool-btn" id="btn-add-source" title="Adicionar Fonte">+</button>
            <button className="obs-tool-btn" id="btn-remove-source" title="Remover Fonte">-</button>
            <button className="obs-tool-btn" id="btn-source-up" title="Mover para Cima">▲</button>
            <button className="obs-tool-btn" id="btn-source-down" title="Mover para Baixo">▼</button>
            <button className="obs-tool-btn" id="btn-source-props" title="Propriedades da Fonte">⚙</button>
          </div>
        </div>

        {/* 3. Audio Mixer Dock */}
        <div className="obs-dock obs-dock-mixer">
          <div className="obs-dock-header">
            <span>Mixer de Áudio</span>
          </div>
          <div className="obs-dock-content" id="audio-mixer-content" />
        </div>

        {/* 4. Scene Transitions Dock */}
        <div className="obs-dock obs-dock-transitions">
          <div className="obs-dock-header">
            <span>Transições</span>
          </div>
          <div className="obs-dock-content transitions-content">
            <div className="form-group">
              <label className="form-label">Tipo de Transição</label>
              <select className="obs-select" id="transition-type-select">
                <option value="fade" selected>Esmaecer (Fade)</option>
                <option value="cut">Corte Seco (Cut)</option>
                <option value="slide">Deslizar (Slide)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Duração</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="number"
                  className="obs-input"
                  id="transition-duration-input"
                  defaultValue="300"
                  min="0"
                  max="2000"
                  step="50"
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 10, color: "var(--obs-text-muted)" }}>ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Controls Dock */}
        <div className="obs-dock obs-dock-controls">
          <div className="obs-dock-header">
            <span>Controles</span>
          </div>
          <div className="obs-dock-content controls-grid">
            <button className="obs-btn primary" id="btn-record" style={{ padding: "10px 14px", fontWeight: 700 }}>
              Iniciar Gravação
            </button>
            <button className={`obs-btn ${isStudioMode ? "primary" : ""}`} id="btn-studio" style={{ padding: "8px 14px" }}>
              Modo Estúdio
            </button>
            <button className="obs-btn" id="btn-settings" style={{ padding: "8px 14px" }}>
              Configurações
            </button>
          </div>
        </div>
      </footer>

      {/* Bottom Status Bar */}
      <div className="obs-status-bar">
        <div className="status-group">
          <div className="status-indicator">
            <div className="status-dot" id="status-rec-dot" />
            <span id="status-rec-text">REC: 00:00:00</span>
          </div>
        </div>

        <div className="status-group">
          <span id="status-cpu-text">CPU: 1.2%</span>
          <span id="status-fps-text">60.00 fps</span>
        </div>
      </div>

      {/* Modals */}
      <div className="obs-modal-overlay" id="modal-add-source" />
      <div className="obs-modal-overlay" id="modal-source-properties" />
      <div className="obs-modal-overlay" id="modal-audio-filters" />
      <div className="obs-modal-overlay" id="modal-settings" />
    </div>
  );
}
