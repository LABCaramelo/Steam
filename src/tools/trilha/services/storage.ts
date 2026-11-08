import { Track, Playlist, EngineConfig } from "../types";

const DB_NAME = "lab_trilha_v1";
const DB_VERSION = 1;
const TRACKS_STORE = "tracks";
const PLAYLISTS_STORE = "playlists";
const CONFIG_KEY = "lab_trilha_config";

export const DEFAULT_CONFIG: EngineConfig = {
  provider: "webaudio_synth",
  gradioApiUrl: "http://localhost:7860",
  remoteApiKey: "",
  geminiApiKey: "",
  autoEnhance: true,
  autoCover: true,
  outputFormat: "mp3",
};

export const INITIAL_TRACKS: Track[] = [
  {
    id: "trilha-demo-1",
    title: "Amanhecer em Mangabeiras",
    prompt: "Lo-Fi chillhop nostálgico com piano rhodes analógico, sub-grave aveludado, textura de fita cassete e baterias lentas e relaxantes.",
    style: "Lo-Fi Chillhop / Soul Urbano",
    lyrics: "[Intro]\n(Ruído de fita cassete, acordes suaves de Rhodes)\n\n[Verso 1]\nCafé passado no filtro de pano\nO sol batendo na serra devagar\nMais um projeto saindo do plano\nMenos pressa, mais tempo pra criar\n\n[Refrão]\nDeixa a trilha tocar no fone\nO horizonte de Minas na janela\nNada aqui tem pressa ou consome\nA vida é mais que uma tela.",
    duration: 64,
    bpm: 82,
    keyScale: "Eb major",
    timeSignature: "4",
    tags: ["Lo-Fi", "Chillhop", "Rhodes", "Belo Horizonte", "Acolhedor"],
    coverSeed: "mangabeiras-lofi-2026",
    audioUrl: "",
    instrumental: false,
    vocalLanguage: "pt",
    inferenceSteps: 30,
    guidanceScale: 4.5,
    seed: 42091,
    ditModel: "acestep-1.5-base",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    isFavorite: true,
    playlistIds: ["pl-reels"],
    status: "ready",
  },
  {
    id: "trilha-demo-2",
    title: "Cinematic Horizon / Zimmer Drive",
    prompt: "Trilha épica cinematográfica com orquestra de cordas em ostinato contínuo, trompas pesadas e sintetizador Moog pulsante em crescendo.",
    style: "Cinematic Tension / Epic Trailer",
    lyrics: "[Intro - Ambient Sub Bass & Cello Drone]\n[Crescendo - Brass Stabs & Percussive Drive]\n[Climax - Full Orchestral Wall of Sound]\n[Outro - Resonant Synth Tail]",
    duration: 90,
    bpm: 120,
    keyScale: "D minor",
    timeSignature: "4",
    tags: ["Cinematográfico", "Zimmer", "Épico", "Trailer", "Impacto"],
    coverSeed: "zimmer-horizon-99",
    audioUrl: "",
    instrumental: true,
    vocalLanguage: "unknown",
    inferenceSteps: 45,
    guidanceScale: 6.0,
    seed: 88412,
    ditModel: "acestep-1.5-turbo",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    isFavorite: true,
    playlistIds: ["pl-cinema"],
    status: "ready",
  },
  {
    id: "trilha-demo-3",
    title: "Cyberpunk Savassi Neon",
    prompt: "Darksynth cyberpunk de alta velocidade com arpeggiator analógico, bateria punchy, sintetizadores retro 80s e linha de baixo ácida.",
    style: "Cyberpunk / Darksynth 80s",
    lyrics: "[Intro]\n[Beat Drop]\n[Night Drive Bassline]\n[High Speed Solo]",
    duration: 75,
    bpm: 135,
    keyScale: "A minor",
    timeSignature: "4",
    tags: ["Cyberpunk", "Synthwave", "Darksynth", "Neon", "Alta Energia"],
    coverSeed: "savassi-neon-80s",
    audioUrl: "",
    instrumental: true,
    vocalLanguage: "unknown",
    inferenceSteps: 35,
    guidanceScale: 5.0,
    seed: 19283,
    ditModel: "acestep-1.5-base",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    isFavorite: false,
    playlistIds: ["pl-reels"],
    status: "ready",
  },
];

export const INITIAL_PLAYLISTS: Playlist[] = [
  {
    id: "pl-reels",
    name: "Trilhas para Reels & Vídeos Verticais",
    description: "Trilhas com ganchos sonoros fortes e dinâmica perfeita para 9:16.",
    coverSeed: "playlist-reels-916",
    trackIds: ["trilha-demo-1", "trilha-demo-3"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "pl-cinema",
    name: "Cinema, Documentários & Clímax",
    description: "Orquestrações densas, tensão narrativa e arcos dramáticos completos.",
    coverSeed: "playlist-cinema-film",
    trackIds: ["trilha-demo-2"],
    createdAt: new Date().toISOString(),
  },
];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB não disponível no ambiente atual."));
    }

    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(TRACKS_STORE)) {
        db.createObjectStore(TRACKS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(PLAYLISTS_STORE)) {
        db.createObjectStore(PLAYLISTS_STORE, { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getStoredTracks(): Promise<Track[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(TRACKS_STORE, "readonly");
      const store = tx.objectStore(TRACKS_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const result = req.result as Track[];
        if (!result || result.length === 0) {
          // Initialize with seed tracks
          void saveAllTracks(INITIAL_TRACKS);
          resolve(INITIAL_TRACKS);
        } else {
          resolve(result);
        }
      };
      req.onerror = () => resolve(INITIAL_TRACKS);
    });
  } catch {
    const raw = localStorage.getItem("lab_trilha_tracks_fallback");
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return INITIAL_TRACKS;
      }
    }
    return INITIAL_TRACKS;
  }
}

export async function saveTrack(track: Track): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(TRACKS_STORE, "readwrite");
      const store = tx.objectStore(TRACKS_STORE);
      const req = store.put(track);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback in localStorage
    const current = await getStoredTracks();
    const idx = current.findIndex((t) => t.id === track.id);
    if (idx >= 0) current[idx] = track;
    else current.unshift(track);
    localStorage.setItem("lab_trilha_tracks_fallback", JSON.stringify(current));
  }
}

export async function deleteTrack(trackId: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(TRACKS_STORE, "readwrite");
      const store = tx.objectStore(TRACKS_STORE);
      const req = store.delete(trackId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const current = (await getStoredTracks()).filter((t) => t.id !== trackId);
    localStorage.setItem("lab_trilha_tracks_fallback", JSON.stringify(current));
  }
}

export async function saveAllTracks(tracks: Track[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(TRACKS_STORE, "readwrite");
    const store = tx.objectStore(TRACKS_STORE);
    for (const t of tracks) {
      store.put(t);
    }
  } catch {
    localStorage.setItem("lab_trilha_tracks_fallback", JSON.stringify(tracks));
  }
}

export async function getStoredPlaylists(): Promise<Playlist[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(PLAYLISTS_STORE, "readonly");
      const store = tx.objectStore(PLAYLISTS_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const result = req.result as Playlist[];
        if (!result || result.length === 0) {
          void saveAllPlaylists(INITIAL_PLAYLISTS);
          resolve(INITIAL_PLAYLISTS);
        } else {
          resolve(result);
        }
      };
      req.onerror = () => resolve(INITIAL_PLAYLISTS);
    });
  } catch {
    return INITIAL_PLAYLISTS;
  }
}

export async function savePlaylist(playlist: Playlist): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PLAYLISTS_STORE, "readwrite");
      const store = tx.objectStore(PLAYLISTS_STORE);
      const req = store.put(playlist);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
}

export async function saveAllPlaylists(playlists: Playlist[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(PLAYLISTS_STORE, "readwrite");
    const store = tx.objectStore(PLAYLISTS_STORE);
    for (const p of playlists) {
      store.put(p);
    }
  } catch {
    // ignore
  }
}

export function loadEngineConfig(): EngineConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_CONFIG;
}

export function saveEngineConfig(cfg: EngineConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  } catch {}
}
