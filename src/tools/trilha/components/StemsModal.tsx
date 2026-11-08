import React, { useState, useEffect, useRef } from "react";
import { Track, StemMix } from "../types";
import { X, Play, Pause, Download, Sliders } from "lucide-react";

interface StemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
}

const DEFAULT_MIX: StemMix = {
  vocalsVolume: 85,
  drumsVolume: 90,
  bassVolume: 90,
  otherVolume: 85,
  vocalsMuted: false,
  drumsMuted: false,
  bassMuted: false,
  otherMuted: false,
  vocalsSolo: false,
  drumsSolo: false,
  bassSolo: false,
  otherSolo: false,
};

export const StemsModal: React.FC<StemsModalProps> = ({ isOpen, onClose, track }) => {
  const [mix, setMix] = useState<StemMix>(DEFAULT_MIX);
  const [isPlaying, setIsPlaying] = useState(false);

  // Simulated stem audio elements
  const masterAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      if (masterAudioRef.current) {
        masterAudioRef.current.pause();
      }
    }
  }, [isOpen]);

  if (!isOpen || !track) return null;

  // Toggle Solo / Mute logic
  const toggleMute = (channel: "vocals" | "drums" | "bass" | "other") => {
    setMix((prev) => ({
      ...prev,
      [`${channel}Muted`]: !prev[`${channel}Muted` as keyof StemMix],
    }));
  };

  const toggleSolo = (channel: "vocals" | "drums" | "bass" | "other") => {
    setMix((prev) => ({
      ...prev,
      [`${channel}Solo`]: !prev[`${channel}Solo` as keyof StemMix],
    }));
  };

  const handleVolumeChange = (channel: "vocals" | "drums" | "bass" | "other", val: number) => {
    setMix((prev) => ({
      ...prev,
      [`${channel}Volume`]: val,
    }));
  };

  const handlePlayPause = () => {
    if (!masterAudioRef.current) return;
    if (isPlaying) {
      masterAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      masterAudioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const stemsList = [
    { id: "vocals", label: "Vocais", color: "#FF3D8D", url: track.stems?.vocalsUrl || track.audioUrl },
    { id: "drums", label: "Bateria & Percussão", color: "#FF701A", url: track.stems?.drumsUrl || track.audioUrl },
    { id: "bass", label: "Baixo & Sub-Bass", color: "#25BFFF", url: track.stems?.bassUrl || track.audioUrl },
    { id: "other", label: "Harmonia & Sintetizadores", color: "#FFD52A", url: track.stems?.otherUrl || track.audioUrl },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg animate-in fade-in">
      <div className="bg-[#18181e] border border-white/10 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6">
        {/* Hidden audio for playback sync */}
        <audio
          ref={masterAudioRef}
          src={track.audioUrl}
          onEnded={() => setIsPlaying(false)}
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#25BFFF]/10 text-[#25BFFF] border border-[#25BFFF]/20">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#FFF4E8]">Stems Studio • Separador de Faixas</h2>
              <p className="text-xs text-white/50">{track.title} ({track.bpm} BPM • {track.keyScale})</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        {/* Console Faders */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stemsList.map((stem) => {
            const isMuted = mix[`${stem.id}Muted` as keyof StemMix] as boolean;
            const isSolo = mix[`${stem.id}Solo` as keyof StemMix] as boolean;
            const volume = mix[`${stem.id}Volume` as keyof StemMix] as number;

            return (
              <div
                key={stem.id}
                className="bg-[#101014] rounded-2xl p-4 border border-white/10 flex flex-col items-center justify-between space-y-4"
              >
                <div className="text-center w-full">
                  <div
                    className="w-3 h-3 rounded-full mx-auto mb-1.5"
                    style={{ backgroundColor: stem.color }}
                  />
                  <h4 className="text-xs font-bold text-[#FFF4E8] truncate">{stem.label}</h4>
                  <span className="text-[10px] font-mono text-white/40">{volume}%</span>
                </div>

                {/* Vertical Slider */}
                <div className="h-36 flex items-center justify-center">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={volume}
                    onChange={(e) => handleVolumeChange(stem.id, parseInt(e.target.value))}
                    className="h-32 -rotate-90 appearance-none bg-white/10 rounded-lg cursor-pointer accent-[#FF701A]"
                  />
                </div>

                {/* Mute and Solo Controls */}
                <div className="flex items-center gap-2 w-full justify-center">
                  <button
                    onClick={() => toggleMute(stem.id)}
                    className={`w-8 h-8 rounded-lg font-mono font-bold text-xs flex items-center justify-center transition-colors ${
                      isMuted
                        ? "bg-red-500/20 text-red-400 border border-red-500/40"
                        : "bg-white/5 text-white/60 hover:text-white"
                    }`}
                    title="Mute"
                  >
                    M
                  </button>
                  <button
                    onClick={() => toggleSolo(stem.id)}
                    className={`w-8 h-8 rounded-lg font-mono font-bold text-xs flex items-center justify-center transition-colors ${
                      isSolo
                        ? "bg-[#FFD52A]/20 text-[#FFD52A] border border-[#FFD52A]/40"
                        : "bg-white/5 text-white/60 hover:text-white"
                    }`}
                    title="Solo"
                  >
                    S
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Playback & Export Toolbar */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <button
            onClick={handlePlayPause}
            className="px-4 py-2 rounded-xl bg-[#FF701A] hover:bg-[#ff8533] text-[#101014] font-bold text-xs flex items-center gap-2 shadow-lg transition-transform active:scale-95"
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            {isPlaying ? "Pausar Stems" : "Reproduzir Mix"}
          </button>

          {track.audioUrl && (
            <a
              href={track.audioUrl}
              download={`${track.title}_stems_mix.wav`}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/80 flex items-center gap-1.5 transition-colors"
            >
              <Download size={14} />
              Exportar Mixdown WAV
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
