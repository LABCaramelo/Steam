import React, { useState, useEffect } from "react";
import { Track, Playlist, GenerationParams, EngineConfig } from "./types";
import {
  getStoredTracks,
  saveTrack,
  deleteTrack,
  getStoredPlaylists,
  savePlaylist,
  loadEngineConfig,
  saveEngineConfig,
  INITIAL_TRACKS,
  saveAllTracks,
} from "./services/storage";
import { generateMusic } from "./services/acestepClient";
import { CreatePanel } from "./components/CreatePanel";
import { LibraryView } from "./components/LibraryView";
import { DockPlayer } from "./components/DockPlayer";
import { StemsModal } from "./components/StemsModal";
import { VideoModal } from "./components/VideoModal";
import { SettingsModal } from "./components/SettingsModal";
import { Disc, Settings2, Sparkles, Music } from "lucide-react";
import "./trilha.css";

export const TrilhaApp: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [config, setConfig] = useState<EngineConfig>(loadEngineConfig);

  const [activeTab, setActiveTab] = useState<"create" | "library">("create");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Modals
  const [selectedStemsTrack, setSelectedStemsTrack] = useState<Track | null>(null);
  const [selectedVideoTrack, setSelectedVideoTrack] = useState<Track | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Load data on startup
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const loadedTracks = await getStoredTracks();
      const loadedPlaylists = await getStoredPlaylists();
      if (mounted) {
        setTracks(loadedTracks);
        setPlaylists(loadedPlaylists);
        if (loadedTracks.length > 0) {
          setCurrentTrack(loadedTracks[0]);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Handle music generation
  const handleGenerate = async (params: GenerationParams) => {
    try {
      setIsGenerating(true);
      setProgressPercent(10);
      setStatusMessage("Iniciando inferência musical...");

      const result = await generateMusic(params, config, (percent, msg) => {
        setProgressPercent(percent);
        setStatusMessage(msg);
      });

      const newTrack: Track = {
        id: `trilha-${Date.now()}`,
        title: params.title || "Nova Trilha Sonora",
        prompt: params.prompt || params.songDescription || "",
        style: params.style || "Original",
        lyrics: params.lyrics || "",
        duration: result.duration,
        bpm: params.bpm,
        keyScale: params.keyScale,
        timeSignature: params.timeSignature,
        tags: [params.style, `${params.bpm}BPM`, params.keyScale].filter(Boolean),
        coverSeed: `cover-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        audioUrl: result.fullAudioUrl,
        instrumental: params.instrumental,
        vocalLanguage: params.vocalLanguage,
        inferenceSteps: params.inferenceSteps,
        guidanceScale: params.guidanceScale,
        seed: params.seed,
        ditModel: params.ditModel,
        createdAt: new Date().toISOString(),
        isFavorite: false,
        playlistIds: [],
        status: "ready",
        stems: result.stems,
      };

      await saveTrack(newTrack);
      const updatedTracks = [newTrack, ...tracks];
      setTracks(updatedTracks);
      setCurrentTrack(newTrack);
      setIsPlaying(true);
      setActiveTab("library");
    } catch (err) {
      console.error("Erro na geração:", err);
      alert("Houve um problema durante a geração da trilha. Tente novamente.");
    } finally {
      setIsGenerating(false);
      setProgressPercent(0);
      setStatusMessage("");
    }
  };

  // Play / Pause toggle
  const handlePlayPause = () => {
    if (!currentTrack && tracks.length > 0) {
      setCurrentTrack(tracks[0]);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  // Select track from library
  const handlePlayTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  // Next & Previous
  const handleNextTrack = () => {
    if (!currentTrack || tracks.length <= 1) return;
    const idx = tracks.findIndex((t) => t.id === currentTrack.id);
    const nextIdx = (idx + 1) % tracks.length;
    setCurrentTrack(tracks[nextIdx]);
    setIsPlaying(true);
  };

  const handlePrevTrack = () => {
    if (!currentTrack || tracks.length <= 1) return;
    const idx = tracks.findIndex((t) => t.id === currentTrack.id);
    const prevIdx = (idx - 1 + tracks.length) % tracks.length;
    setCurrentTrack(tracks[prevIdx]);
    setIsPlaying(true);
  };

  // Toggle favorite
  const handleToggleFavorite = async (trackId: string) => {
    const updated = tracks.map((t) => (t.id === trackId ? { ...t, isFavorite: !t.isFavorite } : t));
    setTracks(updated);
    const target = updated.find((t) => t.id === trackId);
    if (target) await saveTrack(target);
    if (currentTrack?.id === trackId && target) setCurrentTrack(target);
  };

  // Delete track
  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm("Deseja realmente excluir esta faixa?")) return;
    await deleteTrack(trackId);
    const updated = tracks.filter((t) => t.id !== trackId);
    setTracks(updated);
    if (currentTrack?.id === trackId) {
      setCurrentTrack(updated[0] || null);
      if (updated.length === 0) setIsPlaying(false);
    }
  };

  // Create playlist
  const handleCreatePlaylist = async (name: string, description: string) => {
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name,
      description,
      coverSeed: `pl-cover-${Date.now()}`,
      trackIds: currentTrack ? [currentTrack.id] : [],
      createdAt: new Date().toISOString(),
    };
    await savePlaylist(newPl);
    setPlaylists([newPl, ...playlists]);
  };

  // Clone prompt: switch to create tab
  const handleClonePrompt = (_track: Track) => {
    setActiveTab("create");
  };

  // Reset demo tracks
  const handleResetDatabase = async () => {
    if (!confirm("Restaurar faixas canônicas de demonstração?")) return;
    await saveAllTracks(INITIAL_TRACKS);
    setTracks(INITIAL_TRACKS);
    setCurrentTrack(INITIAL_TRACKS[0]);
    setIsSettingsOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#101014] text-[#FFF4E8] pb-28">
      {/* Top App Header */}
      <header className="sticky top-0 z-30 bg-[#101014]/90 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Tool Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF701A] text-[#101014] flex items-center justify-center font-black shadow-lg">
              <Disc size={20} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-[#FFF4E8] font-display">
                  TRILHA<span className="text-[#FF701A]">.</span>
                </h1>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#FF701A]/20 text-[#FF701A] border border-[#FF701A]/30">
                  ACE-STEP 1.5
                </span>
                {config.provider === "webaudio_synth" && (
                  <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-mono text-[#25BFFF] bg-[#25BFFF]/10 border border-[#25BFFF]/20">
                    SÍNTESE NATIVA
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/50 hidden sm:block">
                Estúdio Musical e Trilha Sonora com IA · LAB Caramelo
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-[#18181e] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab("create")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === "create"
                  ? "bg-[#FF701A] text-[#101014] shadow"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Sparkles size={14} />
              Criar
            </button>
            <button
              onClick={() => setActiveTab("library")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === "library"
                  ? "bg-[#FF701A] text-[#101014] shadow"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Music size={14} />
              Biblioteca ({tracks.length})
            </button>
          </div>

          {/* Quick Tools & Settings */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
              title="Configurações do Motor ACE-Step"
            >
              <Settings2 size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Stage */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "create" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <CreatePanel
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                progressPercent={progressPercent}
                statusMessage={statusMessage}
              />
            </div>

            {/* Right Quick Showcase / Recent Tracks */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-[#18181e]/80 rounded-2xl border border-white/10 p-4 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                  <h3 className="text-xs font-bold text-white/70 uppercase tracking-wider">
                    Últimas Criações
                  </h3>
                  <button
                    onClick={() => setActiveTab("library")}
                    className="text-xs text-[#FF701A] hover:underline font-semibold"
                  >
                    Ver Todas
                  </button>
                </div>

                <div className="space-y-2">
                  {tracks.slice(0, 4).map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handlePlayTrack(t)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer flex items-center justify-between group transition-colors"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-bold text-[#FFF4E8] group-hover:text-[#FF701A] transition-colors truncate">
                          {t.title}
                        </p>
                        <p className="text-[10px] font-mono text-white/50 truncate">
                          {t.bpm} BPM • {t.keyScale} • {t.style}
                        </p>
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-black/40 flex items-center justify-center text-white/60 group-hover:text-[#FF701A] transition-colors">
                        <Disc size={14} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filosofia Caramelo Card */}
              <div className="bg-gradient-to-br from-[#18181e] to-[#141419] rounded-2xl border border-white/10 p-5 shadow-xl">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF701A]">
                  DIRETRIZ CANÔNICA
                </span>
                <h4 className="text-sm font-bold text-[#FFF4E8] mt-1 mb-2">
                  Música com Intenção & Causa
                </h4>
                <p className="text-xs text-white/60 leading-relaxed">
                  "Menos trilha genérica de banco. Mais atmosfera de cinema. A música é o vetor invisível que ancora a percepção emocional da sua marca."
                </p>
              </div>
            </div>
          </div>
        ) : (
          <LibraryView
            tracks={tracks}
            playlists={playlists}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onPlayTrack={handlePlayTrack}
            onToggleFavorite={handleToggleFavorite}
            onDeleteTrack={handleDeleteTrack}
            onClonePrompt={handleClonePrompt}
            onOpenStems={(t) => setSelectedStemsTrack(t)}
            onOpenVideo={(t) => setSelectedVideoTrack(t)}
            onCreatePlaylist={handleCreatePlaylist}
          />
        )}
      </main>

      {/* Dock Player */}
      <DockPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        onToggleFavorite={handleToggleFavorite}
        onOpenStems={() => currentTrack && setSelectedStemsTrack(currentTrack)}
        onOpenVideo={() => currentTrack && setSelectedVideoTrack(currentTrack)}
      />

      {/* Stems Modal */}
      <StemsModal
        isOpen={!!selectedStemsTrack}
        onClose={() => setSelectedStemsTrack(null)}
        track={selectedStemsTrack}
      />

      {/* Video Modal */}
      <VideoModal
        isOpen={!!selectedVideoTrack}
        onClose={() => setSelectedVideoTrack(null)}
        track={selectedVideoTrack}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={(cfg) => {
          setConfig(cfg);
          saveEngineConfig(cfg);
        }}
        onResetDatabase={handleResetDatabase}
      />
    </div>
  );
};
