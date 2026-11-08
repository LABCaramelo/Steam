import { RenderItem, ShotCard, WorkflowNode, WorkflowEdge, ApiKeysConfig } from "../types";

const STORAGE_KEYS = {
  RENDERS: "caramelo_pelicula_renders_v1",
  SHOT_CARDS: "caramelo_pelicula_shots_v1",
  WORKFLOW_NODES: "caramelo_pelicula_nodes_v1",
  WORKFLOW_EDGES: "caramelo_pelicula_edges_v1",
  API_KEYS: "caramelo_pelicula_apikeys_v1",
  ENGINE_URL: "caramelo_pelicula_engine_url_v1",
};

export const DEFAULT_ENGINE_URL = "http://127.0.0.1:18795";

export const CARAMELO_STYLE_PREFIX = 
  "cinematic stylized illustration, hybrid cel-shaded and rich painterly textures, bold graphic shapes, clean hard edges with selective soft transitions, volumetric lighting with warm golden key light and cold cyan ambient rim light, high contrast, ink-black shadows (#101014), elegant warm cream highlights (#FFF4E8), accent color (#FF701A), 8k masterwork, award-winning art direction";

export const CARAMELO_NEGATIVE_PROMPT = 
  "generic 3d render, plastic skin, uncanny valley, hyperrealistic photography, oversaturated purple glow, neon bloom, messy sketch lines, poorly drawn anatomy, extra limbs, watermark, text blur";

export const INITIAL_SHOT_CARDS: ShotCard[] = [
  {
    id: "shot-01",
    sceneNumber: 1,
    takeNumber: 1,
    title: "Entrada no Laboratório",
    shotType: "Wide Shot",
    lensMm: "24mm f/2.8",
    cameraHeight: "1.40m (na altura do peito)",
    cameraMotion: "Dolly-in suave com avanço frontal",
    energyCurve: "Antecipação",
    promptEn: "Wide angle master shot of Luiz walking inside a dark cyberpunk interaction laboratory in Belo Horizonte, neon signs in the background, warm golden lamp illuminating work desk, anamorphic lens flare",
    audioPt: "Ele abre a porta devagar. O zumbido dos servidores e monitores ecoa no galpão vazio.",
  },
  {
    id: "shot-02",
    sceneNumber: 1,
    takeNumber: 2,
    title: "O Ponto de Virada",
    shotType: "Close-up",
    lensMm: "85mm f/1.4",
    cameraHeight: "1.65m (altura dos olhos)",
    cameraMotion: "Slow Pan da mão para o olhar decidido",
    energyCurve: "Impacto",
    promptEn: "Tight cinematic close-up of Luiz staring intently at a timeline monitor, reflection of glowing orange code in pupils, intense focus, rim light in electric sky blue, shallow depth of field",
    audioPt: "Chega de ferramentas genéricas. Hoje nós assumimos a direção.",
  },
  {
    id: "shot-03",
    sceneNumber: 2,
    takeNumber: 1,
    title: "A Revelação da Máquina",
    shotType: "Dutch Angle",
    lensMm: "35mm Cine Prime",
    cameraHeight: "0.80m (contra-plongée baixo)",
    cameraMotion: "Roll sutil e aproximação rápida",
    energyCurve: "Ação",
    promptEn: "Dynamic low-angle dutch shot of an AI neural processor glowing with amber caramel tubes, cinematic smoke particles rising, epic scale, 24fps motion blur",
    audioPt: "A máquina responde. Cada nó do workflow se ilumina em cascata.",
  }
];

export const INITIAL_WORKFLOW_NODES: WorkflowNode[] = [
  {
    id: "node-1",
    title: "Prompt Mestre",
    type: "prompt",
    x: 60,
    y: 120,
    data: {
      text: "Cena cinematográfica urbana em Belo Horizonte com o Luiz observando o pôr do sol na Serra do Curral",
      prefix: true,
    }
  },
  {
    id: "node-2",
    title: "Keyframe (Flux Dev)",
    type: "image",
    x: 340,
    y: 100,
    data: {
      model: "flux-dev",
      aspectRatio: "9:16",
      steps: 28,
    }
  },
  {
    id: "node-3",
    title: "Movimento de Vídeo (Veo 3)",
    type: "video",
    x: 640,
    y: 100,
    data: {
      motion: "dolly-in",
      duration: 5,
      fps: 24,
    }
  },
  {
    id: "node-4",
    title: "Trilha Sonora (Trilha LAB)",
    type: "audio",
    x: 640,
    y: 280,
    data: {
      bpm: 124,
      style: "Cinematic Synthwave & Ambient Beats",
    }
  },
  {
    id: "node-5",
    title: "Master & Timeline NLE",
    type: "export",
    x: 940,
    y: 180,
    data: {
      dest: "montagem",
      format: "4K 9:16 Reels",
    }
  }
];

export const INITIAL_WORKFLOW_EDGES: WorkflowEdge[] = [
  { id: "e1-2", from: "node-1", to: "node-2" },
  { id: "e2-3", from: "node-2", to: "node-3" },
  { id: "e1-4", from: "node-1", to: "node-4" },
  { id: "e3-5", from: "node-3", to: "node-5" },
  { id: "e4-5", from: "node-4", to: "node-5" },
];

export const INITIAL_RENDERS: RenderItem[] = [
  {
    id: "render-canon-01",
    title: "Keyframe Caramelo — Estúdio",
    type: "image",
    url: "/assets/images/video-posters/work-01.webp",
    prompt: "Luiz no laboratório de interação com paleta canônica",
    model: "Flux Dev",
    aspectRatio: "9:16",
    createdAt: new Date().toLocaleDateString("pt-BR"),
    seed: 42891,
    fileSize: "2.4 MB"
  },
  {
    id: "render-canon-02",
    title: "Take 01 — Serra do Curral 4K",
    type: "video",
    url: "/assets/images/video-posters/work-02.webp",
    prompt: "Pôr do sol cinematográfico sobre a cordilheira de Belo Horizonte com luz dourada",
    model: "Veo 3 Pro",
    aspectRatio: "16:9",
    createdAt: new Date().toLocaleDateString("pt-BR"),
    seed: 98124,
    fileSize: "18.2 MB"
  }
];

export function getStoredRenders(): RenderItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RENDERS);
    return raw ? JSON.parse(raw) : INITIAL_RENDERS;
  } catch {
    return INITIAL_RENDERS;
  }
}

export function saveRender(item: RenderItem) {
  try {
    const list = getStoredRenders();
    const updated = [item, ...list.filter(x => x.id !== item.id)];
    localStorage.setItem(STORAGE_KEYS.RENDERS, JSON.stringify(updated));
  } catch (err) {
    console.error("Erro ao salvar render local:", err);
  }
}

export function getStoredShotCards(): ShotCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHOT_CARDS);
    return raw ? JSON.parse(raw) : INITIAL_SHOT_CARDS;
  } catch {
    return INITIAL_SHOT_CARDS;
  }
}

export function saveShotCards(cards: ShotCard[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.SHOT_CARDS, JSON.stringify(cards));
  } catch (err) {
    console.error("Erro ao salvar shot cards:", err);
  }
}

export function getStoredWorkflow(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  try {
    const rawNodes = localStorage.getItem(STORAGE_KEYS.WORKFLOW_NODES);
    const rawEdges = localStorage.getItem(STORAGE_KEYS.WORKFLOW_EDGES);
    return {
      nodes: rawNodes ? JSON.parse(rawNodes) : INITIAL_WORKFLOW_NODES,
      edges: rawEdges ? JSON.parse(rawEdges) : INITIAL_WORKFLOW_EDGES,
    };
  } catch {
    return {
      nodes: INITIAL_WORKFLOW_NODES,
      edges: INITIAL_WORKFLOW_EDGES,
    };
  }
}

export function saveWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.WORKFLOW_NODES, JSON.stringify(nodes));
    localStorage.setItem(STORAGE_KEYS.WORKFLOW_EDGES, JSON.stringify(edges));
  } catch (err) {
    console.error("Erro ao salvar workflow:", err);
  }
}

export function getStoredApiKeys(): ApiKeysConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.API_KEYS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveApiKeys(keys: ApiKeysConfig) {
  try {
    localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
  } catch (err) {
    console.error("Erro ao salvar API keys:", err);
  }
}

export function getEngineUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.ENGINE_URL) || DEFAULT_ENGINE_URL;
  } catch {
    return DEFAULT_ENGINE_URL;
  }
}

export function saveEngineUrl(url: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.ENGINE_URL, url);
  } catch (err) {
    console.error("Erro ao salvar Engine URL:", err);
  }
}
