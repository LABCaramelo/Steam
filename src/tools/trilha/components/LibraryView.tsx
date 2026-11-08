import React, { useState, useMemo } from "react";
import { Track, Playlist } from "../types";
import { AlbumCover } from "./AlbumCover";
import {
  Play,
  Pause,
  Heart,
  Sliders,
  Video,
  Download,
  Trash2,
  Copy,
  Search,
  ListMusic,
  Plus,
} from "lucide-react";

interface LibraryViewProps {
  tracks: Track[];
  playlists: Playlist[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onToggleFavorite: (trackId: string) => void;
  onDeleteTrack: (trackId: string) => void;
  onClonePrompt: (track: Track) => void;
  onOpenStems: (track: Track) => void;
  onOpenVideo: (track: Track) => void;
  onCreatePlaylist: (name: string, description: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  tracks,
  playlists,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onToggleFavorite,
  onDeleteTrack,
  onClonePrompt,
  onOpenStems,
  onOpenVideo,
  onCreatePlaylist,
}) => {
  const [activeTab, setActiveTab] = useState<"tracks" | "playlists">("tracks");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "favorites" | "instrumental" | "vocal">("all");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);

  // Filtered tracks
  const filteredTracks = useMemo(() => {
    return tracks.filter((t) => {
      // Query filter
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.style.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        t.lyrics.toLowerCase().includes(q);

      if (!matchQuery) return false;

      // Category filter
      if (filterType === "favorites") return t.isFavorite;
      if (filterType === "instrumental") return t.instrumental;
      if (filterType === "vocal") return !t.instrumental;
      return true;
    });
  }, [tracks, searchQuery, filterType]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleCreatePlaylistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    onCreatePlaylist(newPlaylistName.trim(), "Playlist criada no LAB");
    setNewPlaylistName("");
    setShowNewPlaylistModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Search & Tabs Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#18181e]/80 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
        {/* Tab switchers */}
        <div className="flex bg-[#101014] p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab("tracks")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "tracks" ? "bg-[#FF701A] text-[#101014]" : "text-white/60 hover:text-white"
            }`}
          >
            Todas as Faixas ({tracks.length})
          </button>
          <button
            onClick={() => setActiveTab("playlists")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "playlists" ? "bg-[#FF701A] text-[#101014]" : "text-white/60 hover:text-white"
            }`}
          >
            <ListMusic size={13} />
            Playlists ({playlists.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="flex-1 max-w-sm relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, estilo, tag ou letra..."
            className="w-full bg-[#101014] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#FFF4E8] placeholder-white/30 focus:border-[#FF701A] focus:outline-none"
          />
        </div>

        {/* Quick Filter Buttons */}
        {activeTab === "tracks" && (
          <div className="flex items-center gap-1 text-xs">
            {(["all", "favorites", "instrumental", "vocal"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterType(mode)}
                className={`px-2.5 py-1 rounded-lg border transition-colors ${
                  filterType === mode
                    ? "bg-white/15 border-[#FF701A] text-[#FF701A] font-bold"
                    : "border-white/5 bg-white/5 text-white/50 hover:text-white"
                }`}
              >
                {mode === "all" && "Todos"}
                {mode === "favorites" && "Favoritos"}
                {mode === "instrumental" && "Instrumental"}
                {mode === "vocal" && "Com Vocal"}
              </button>
            ))}
          </div>
        )}

        {/* Create Playlist Action Button */}
        {activeTab === "playlists" && (
          <button
            onClick={() => setShowNewPlaylistModal(true)}
            className="px-3 py-1.5 rounded-xl bg-[#FF701A] text-[#101014] font-bold text-xs flex items-center gap-1.5 hover:bg-[#ff8533] transition-colors"
          >
            <Plus size={14} />
            Nova Playlist
          </button>
        )}
      </div>

      {/* Tracks Tab */}
      {activeTab === "tracks" && (
        <div className="bg-[#18181e]/80 rounded-2xl border border-white/10 overflow-hidden shadow-2xl backdrop-blur-md">
          {filteredTracks.length === 0 ? (
            <div className="py-16 text-center text-white/40 text-sm">
              Nenhuma faixa encontrada. Crie sua primeira música no Estúdio de Criação!
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredTracks.map((track) => {
                const isSelected = currentTrack?.id === track.id;
                const isThisPlaying = isSelected && isPlaying;

                return (
                  <div
                    key={track.id}
                    className={`flex items-center justify-between p-3.5 hover:bg-white/[0.04] transition-colors group ${
                      isSelected ? "bg-white/[0.06]" : ""
                    }`}
                  >
                    {/* Track info & Cover */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative group cursor-pointer" onClick={() => onPlayTrack(track)}>
                        <AlbumCover seed={track.coverSeed} size="sm" showBadge={false} />
                        <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {isThisPlaying ? (
                            <Pause size={14} className="text-[#FF701A]" fill="currentColor" />
                          ) : (
                            <Play size={14} className="text-white ml-0.5" fill="currentColor" />
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4
                            onClick={() => onPlayTrack(track)}
                            className={`text-sm font-bold truncate cursor-pointer hover:underline ${
                              isSelected ? "text-[#FF701A]" : "text-[#FFF4E8]"
                            }`}
                          >
                            {track.title}
                          </h4>
                          {track.instrumental && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-white/10 text-white/60">
                              INST
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-white/50 truncate font-mono mt-0.5">
                          <span className="text-[#FFF4E8]/80 font-sans">{track.style}</span>
                          <span>•</span>
                          <span>{track.bpm} BPM</span>
                          <span>•</span>
                          <span>{track.keyScale}</span>
                          <span>•</span>
                          <span>{formatDuration(track.duration)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="hidden md:flex items-center gap-1.5 max-w-[200px] overflow-hidden px-4">
                      {track.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[10px] text-white/60 truncate"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onToggleFavorite(track.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          track.isFavorite ? "text-[#FF3D8D]" : "text-white/30 hover:text-white"
                        }`}
                        title="Favoritar"
                      >
                        <Heart size={16} fill={track.isFavorite ? "currentColor" : "none"} />
                      </button>

                      <button
                        onClick={() => onOpenStems(track)}
                        className="p-2 rounded-lg text-white/50 hover:text-[#25BFFF] hover:bg-white/5 transition-colors"
                        title="Separar / Mixar Stems"
                      >
                        <Sliders size={16} />
                      </button>

                      <button
                        onClick={() => onOpenVideo(track)}
                        className="p-2 rounded-lg text-white/50 hover:text-[#FF701A] hover:bg-white/5 transition-colors"
                        title="Gerar Vídeo Motion 9:16"
                      >
                        <Video size={16} />
                      </button>

                      <button
                        onClick={() => onClonePrompt(track)}
                        className="p-2 rounded-lg text-white/50 hover:text-[#FFD52A] hover:bg-white/5 transition-colors"
                        title="Clonar Parâmetros & Prompt"
                      >
                        <Copy size={16} />
                      </button>

                      {track.audioUrl && (
                        <a
                          href={track.audioUrl}
                          download={`${track.title.replace(/\s+/g, "_")}.wav`}
                          className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                          title="Baixar WAV"
                        >
                          <Download size={16} />
                        </a>
                      )}

                      <button
                        onClick={() => onDeleteTrack(track.id)}
                        className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Excluir Faixa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Playlists Tab */}
      {activeTab === "playlists" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((pl) => {
            const count = pl.trackIds.length;
            return (
              <div
                key={pl.id}
                className="bg-[#18181e]/80 rounded-2xl border border-white/10 p-4 hover:border-[#FF701A]/40 transition-all flex items-center gap-4"
              >
                <AlbumCover seed={pl.coverSeed} size="md" showBadge={false} />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-[#FFF4E8] truncate">{pl.name}</h3>
                  <p className="text-xs text-white/50 line-clamp-2 mt-0.5">{pl.description}</p>
                  <p className="text-[11px] font-mono text-[#FF701A] mt-2">{count} faixas incluídas</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nova Playlist */}
      {showNewPlaylistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-[#18181e] border border-white/10 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#FFF4E8]">Criar Nova Playlist</h3>
            <form onSubmit={handleCreatePlaylistSubmit} className="space-y-3">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Nome da playlist (ex: Trilhas para Stories)..."
                className="w-full bg-[#101014] border border-white/10 rounded-xl px-3 py-2 text-sm text-[#FFF4E8] focus:border-[#FF701A] focus:outline-none"
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPlaylistModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 text-xs text-white/70 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#FF701A] text-xs font-bold text-[#101014] hover:bg-[#ff8533]"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
