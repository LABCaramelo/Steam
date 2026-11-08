import React, { useState, useEffect } from "react";
import {
  PeliculaTab,
  EngineStatus,
  RenderItem,
  ShotCard,
  WorkflowNode,
  WorkflowEdge,
  ApiKeysConfig,
  ImageGenParams,
  VideoGenParams,
} from "./types";
import {
  getStoredRenders,
  saveRender,
  getStoredShotCards,
  saveShotCards,
  getStoredWorkflow,
  saveWorkflow,
  getStoredApiKeys,
  saveApiKeys,
  getEngineUrl,
  saveEngineUrl,
} from "./services/storage";
import {
  checkEngineHealth,
  generateImage,
  generateVideo,
} from "./services/engineClient";
import { Header } from "./components/Header";
import { ImageStudio } from "./components/ImageStudio";
import { VideoStudio } from "./components/VideoStudio";
import { WorkflowCanvas } from "./components/WorkflowCanvas";
import { DirectorAgent } from "./components/DirectorAgent";
import { GalleryDrawer } from "./components/GalleryDrawer";
import { EngineBridgeModal } from "./components/EngineBridgeModal";
import "./pelicula.css";

export const PeliculaApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<PeliculaTab>("image");
  const [renders, setRenders] = useState<RenderItem[]>([]);
  const [shotCards, setShotCards] = useState<ShotCard[]>([]);
  const [workflow, setWorkflow] = useState<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }>({ nodes: [], edges: [] });
  const [apiKeys, setApiKeys] = useState<ApiKeysConfig>({});
  const [engineUrl, setEngineUrlState] = useState<string>(getEngineUrl);

  const [engineStatus, setEngineStatus] = useState<EngineStatus>({
    connected: false,
    url: getEngineUrl(),
    checking: true,
  });

  const [isEngineModalOpen, setIsEngineModalOpen] = useState<boolean>(false);

  // Geração de imagem / vídeo
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const [lastImageRender, setLastImageRender] = useState<RenderItem | null>(null);
  const [lastVideoRender, setLastVideoRender] = useState<RenderItem | null>(null);
  const [initialVideoKeyframe, setInitialVideoKeyframe] = useState<RenderItem | null>(null);

  // Execução de Pipeline de Workflow
  const [isExecutingWorkflow, setIsExecutingWorkflow] = useState<boolean>(false);
  const [executingStep, setExecutingStep] = useState<number>(0);

  // Carregar dados no mount
  useEffect(() => {
    const loadedRenders = getStoredRenders();
    setRenders(loadedRenders);
    if (loadedRenders.length > 0) {
      const img = loadedRenders.find((r) => r.type === "image");
      if (img) setLastImageRender(img);
      const vid = loadedRenders.find((r) => r.type === "video");
      if (vid) setLastVideoRender(vid);
    }

    setShotCards(getStoredShotCards());
    setWorkflow(getStoredWorkflow());
    setApiKeys(getStoredApiKeys());

    // Checar motor local
    void handleCheckEngine();
  }, []);

  const handleCheckEngine = async () => {
    setEngineStatus((prev) => ({ ...prev, checking: true }));
    const result = await checkEngineHealth(engineUrl);
    setEngineStatus(result);
  };

  const handleSaveEngineUrl = (newUrl: string) => {
    setEngineUrlState(newUrl);
    saveEngineUrl(newUrl);
    void checkEngineHealth(newUrl).then(setEngineStatus);
  };

  const handleSaveApiKeys = (keys: ApiKeysConfig) => {
    setApiKeys(keys);
    saveApiKeys(keys);
  };

  // Gerar Imagem
  const handleGenerateImage = async (params: ImageGenParams) => {
    try {
      setIsGenerating(true);
      setProgressPercent(10);
      setStatusMessage("Inicializando parâmetros de imagem...");

      const render = await generateImage(params, engineStatus, apiKeys, (percent, msg) => {
        setProgressPercent(percent);
        setStatusMessage(msg);
      });

      saveRender(render);
      setRenders((prev) => [render, ...prev.filter((r) => r.id !== render.id)]);
      setLastImageRender(render);
    } catch (err) {
      console.error("Erro na geração de imagem:", err);
      setStatusMessage("Erro ao gerar imagem. Verifique a conexão com o motor ou API.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Gerar Vídeo
  const handleGenerateVideo = async (params: VideoGenParams) => {
    try {
      setIsGenerating(true);
      setProgressPercent(10);
      setStatusMessage("Iniciando esteira de vídeo...");

      const render = await generateVideo(params, engineStatus, apiKeys, (percent, msg) => {
        setProgressPercent(percent);
        setStatusMessage(msg);
      });

      saveRender(render);
      setRenders((prev) => [render, ...prev.filter((r) => r.id !== render.id)]);
      setLastVideoRender(render);
    } catch (err) {
      console.error("Erro na geração de vídeo:", err);
      setStatusMessage("Erro ao gerar vídeo.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Passar imagem para animar no vídeo
  const handleSendToVideo = (render: RenderItem) => {
    setInitialVideoKeyframe(render);
    setCurrentTab("video");
  };

  // Enviar Shot Card do Diretor para Render
  const handleSendShotToRender = (card: ShotCard) => {
    setCurrentTab("image");
    setLastImageRender(null);
    void handleGenerateImage({
      prompt: card.promptEn,
      negativePrompt: "ugly, deformed, poor details",
      model: "flux-dev",
      aspectRatio: "9:16",
      width: 720,
      height: 1280,
      steps: 28,
      guidanceScale: 3.5,
      seed: -1,
      useStylePrefix: true,
    });
  };

  // Executar Pipeline do Workflow
  const handleExecutePipeline = async (nodes: WorkflowNode[]) => {
    setIsExecutingWorkflow(true);
    for (let i = 0; i < nodes.length; i++) {
      setExecutingStep(i + 1);
      await new Promise((r) => setTimeout(r, 900));
    }
    setIsExecutingWorkflow(false);
    setExecutingStep(0);
    // Cria um render resultante do pipeline
    const pipelineRender: RenderItem = {
      id: `pipeline-${Date.now()}`,
      title: "Take Final do Pipeline",
      type: "video",
      url: "/assets/images/video-posters/work-01.webp",
      prompt: "Sequência completa executada via Vibe Workflow Canvas",
      model: "Veo 3 + ACE-Step 1.5",
      aspectRatio: "9:16",
      createdAt: new Date().toLocaleTimeString("pt-BR"),
      seed: 88412,
      fileSize: "14.2 MB",
    };
    saveRender(pipelineRender);
    setRenders((prev) => [pipelineRender, ...prev]);
    setLastVideoRender(pipelineRender);
    setCurrentTab("video");
  };

  const handleDeleteRender = (id: string) => {
    const updated = renders.filter((r) => r.id !== id);
    setRenders(updated);
    try {
      localStorage.setItem("caramelo_pelicula_renders_v1", JSON.stringify(updated));
    } catch {}
  };

  const handleUpdateWorkflow = (newNodes: WorkflowNode[], newEdges: WorkflowEdge[]) => {
    setWorkflow({ nodes: newNodes, edges: newEdges });
    saveWorkflow(newNodes, newEdges);
  };

  const handleUpdateShotCards = (cards: ShotCard[]) => {
    setShotCards(cards);
    saveShotCards(cards);
  };

  return (
    <div className="pelicula-app-root">
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        engineStatus={engineStatus}
        onOpenEngineModal={() => setIsEngineModalOpen(true)}
        galleryCount={renders.length}
      />

      <main className="pelicula-main-content">
        {currentTab === "image" && (
          <ImageStudio
            onGenerate={handleGenerateImage}
            isGenerating={isGenerating}
            progressPercent={progressPercent}
            statusMessage={statusMessage}
            lastImageRender={lastImageRender}
            onSendToVideo={handleSendToVideo}
          />
        )}

        {currentTab === "video" && (
          <VideoStudio
            onGenerate={handleGenerateVideo}
            isGenerating={isGenerating}
            progressPercent={progressPercent}
            statusMessage={statusMessage}
            lastVideoRender={lastVideoRender}
            initialKeyframe={initialVideoKeyframe}
            onClearInitialKeyframe={() => setInitialVideoKeyframe(null)}
          />
        )}

        {currentTab === "workflow" && (
          <WorkflowCanvas
            nodes={workflow.nodes}
            edges={workflow.edges}
            onUpdateWorkflow={handleUpdateWorkflow}
            onExecutePipeline={handleExecutePipeline}
            isExecuting={isExecutingWorkflow}
            executingStep={executingStep}
          />
        )}

        {currentTab === "director" && (
          <DirectorAgent
            shotCards={shotCards}
            onUpdateShotCards={handleUpdateShotCards}
            onSendShotToRender={handleSendShotToRender}
          />
        )}

        {currentTab === "gallery" && (
          <GalleryDrawer
            renders={renders}
            onDeleteRender={handleDeleteRender}
            onSelectRender={(item) => {
              if (item.type === "image") {
                setLastImageRender(item);
                setCurrentTab("image");
              } else {
                setLastVideoRender(item);
                setCurrentTab("video");
              }
            }}
          />
        )}
      </main>

      <EngineBridgeModal
        isOpen={isEngineModalOpen}
        onClose={() => setIsEngineModalOpen(false)}
        engineStatus={engineStatus}
        onCheckEngine={handleCheckEngine}
        engineUrl={engineUrl}
        onSaveEngineUrl={handleSaveEngineUrl}
        apiKeys={apiKeys}
        onSaveApiKeys={handleSaveApiKeys}
      />
    </div>
  );
};
