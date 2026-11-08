import React, { useRef, useEffect, useState, useCallback } from "react";
import { Track } from "../types";
import { AlbumCover } from "./AlbumCover";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Sliders,
  Video,
  Download,
  Heart,
  Gauge,
} from "lucide-react";

interface DockPlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onToggleFavorite?: (trackId: string) => void;
  onOpenStems?: () => void;
  onOpenVideo?: () => void;
}

export const DockPlayer: React.FC<DockPlayerProps> = ({
  currentTrack,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  onToggleFavorite,
  onOpenStems,
  onOpenVideo,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  // Initialize Web Audio API Analyser for real-time waveform visualization
  const setupAudioContext = useCallback(() => {
    if (!audioRef.current || audioCtxRef.current) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtxClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
    } catch {
      // AudioContext already attached or CORS blocked
    }
  }, []);

  // Update audio source when track changes
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    audioRef.current.src = currentTrack.audioUrl;
    audioRef.current.load();
    setCurrentTime(0);
    setDuration(currentTrack.duration || 0);

    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    }
  }, [currentTrack]);

  // Handle Play / Pause sync
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      setupAudioContext();
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, setupAudioContext]);

  // Volume & rate sync
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
    audioRef.current.playbackRate = playbackRate;
    audioRef.current.loop = isLooping;
  }, [volume, isMuted, playbackRate, isLooping]);

  // Waveform render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderWaveform = () => {
      animationFrameRef.current = requestAnimationFrame(renderWaveform);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (!analyserRef.current || !isPlaying) {
        // Subtle ambient line when paused
        ctx.strokeStyle = "rgba(255, 112, 26, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        return;
      }

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      const barWidth = (w / bufferLength) * 2.2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * h * 0.9;

        // Gradient from Caramel Orange to Electric Sky
        const grad = ctx.createLinearGradient(0, h, 0, 0);
        grad.addColorStop(0, "#FF701A");
        grad.addColorStop(0.6, "#25BFFF");
        grad.addColorStop(1, "#FFD52A");

        ctx.fillStyle = grad;
        ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);

        x += barWidth;
        if (x > w) break;
      }
    };

    renderWaveform();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying]);

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const cycleSpeed = () => {
    const speeds = [0.75, 1.0, 1.25, 1.5];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    setPlaybackRate(speeds[nextIdx]);
  };

  if (!currentTrack) return null;

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#141419]/95 backdrop-blur-xl border-t border-white/10 px-4 py-2.5 shadow-2xl">
      <audio
        ref={audioRef}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={() => {
          if (!isLooping && onNext) onNext();
        }}
      />

      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Track Information & Album Cover */}
        <div className="flex items-center gap-3 min-w-[200px] max-w-[280px]">
          <AlbumCover seed={currentTrack.coverSeed} size="sm" showBadge={false} />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-[#FFF4E8] truncate">{currentTrack.title}</span>
              {onToggleFavorite && (
                <button
                  onClick={() => onToggleFavorite(currentTrack.id)}
                  className={`p-1 rounded transition-colors ${
                    currentTrack.isFavorite ? "text-[#FF3D8D]" : "text-white/40 hover:text-white"
                  }`}
                  title="Favoritar"
                >
                  <Heart size={14} fill={currentTrack.isFavorite ? "currentColor" : "none"} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/50 truncate font-mono">
              <span>{currentTrack.bpm} BPM</span>
              <span>•</span>
              <span>{currentTrack.keyScale}</span>
              <span>•</span>
              <span className="text-[#FF701A] font-sans">{currentTrack.style}</span>
            </div>
          </div>
        </div>

        {/* Center: Controls, Scrubber & Waveform */}
        <div className="flex-1 max-w-2xl flex flex-col items-center gap-1">
          {/* Main Playback Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`p-1.5 rounded-lg transition-colors ${
                isLooping ? "text-[#FF701A] bg-[#FF701A]/10" : "text-white/40 hover:text-white"
              }`}
              title="Repetição contínua"
            >
              <Repeat size={16} />
            </button>

            {onPrev && (
              <button onClick={onPrev} className="p-1.5 text-white/70 hover:text-white transition-colors" title="Anterior">
                <SkipBack size={18} />
              </button>
            )}

            <button
              onClick={onPlayPause}
              className="w-10 h-10 rounded-full bg-[#FF701A] hover:bg-[#ff8533] text-[#101014] flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
              title={isPlaying ? "Pausar" : "Tocar"}
            >
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>

            {onNext && (
              <button onClick={onNext} className="p-1.5 text-white/70 hover:text-white transition-colors" title="Próxima">
                <SkipForward size={18} />
              </button>
            )}

            <button
              onClick={cycleSpeed}
              className="px-1.5 py-0.5 rounded text-[11px] font-mono text-white/70 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1"
              title="Velocidade de reprodução"
            >
              <Gauge size={13} />
              <span>{playbackRate}x</span>
            </button>
          </div>

          {/* Time Scrubber & Live Waveform Canvas */}
          <div className="w-full flex items-center gap-3">
            <span className="text-[11px] font-mono text-white/50 w-10 text-right">{formatTime(currentTime)}</span>

            <div className="relative flex-1 flex items-center group">
              <canvas
                ref={canvasRef}
                width={300}
                height={20}
                className="w-full h-5 rounded pointer-events-none opacity-80"
              />
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            <span className="text-[11px] font-mono text-white/50 w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Volume & Studio Tools Modal Triggers */}
        <div className="flex items-center gap-3 min-w-[200px] justify-end">
          {/* Stems Studio Button */}
          {onOpenStems && (
            <button
              onClick={onOpenStems}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors border border-white/10"
              title="Separador de Stems (Vocais, Bateria, Baixo, Outros)"
            >
              <Sliders size={14} className="text-[#25BFFF]" />
              <span className="hidden sm:inline">Stems</span>
            </button>
          )}

          {/* Video Generator Modal Button */}
          {onOpenVideo && (
            <button
              onClick={onOpenVideo}
              className="px-2.5 py-1.5 rounded-lg bg-[#FF701A]/10 hover:bg-[#FF701A]/20 text-[#FF701A] text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#FF701A]/30"
              title="Gerar Vídeo Motion 9:16 para Reels e TikTok"
            >
              <Video size={14} />
              <span className="hidden sm:inline">Vídeo 9:16</span>
            </button>
          )}

          {/* Download Audio */}
          {currentTrack.audioUrl && (
            <a
              href={currentTrack.audioUrl}
              download={`${currentTrack.title.replace(/\s+/g, "_")}.wav`}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Baixar áudio da faixa"
            >
              <Download size={16} />
            </a>
          )}

          {/* Volume Control */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 text-white/60 hover:text-white transition-colors"
              title={isMuted ? "Desmutar" : "Mutar"}
            >
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#FF701A]"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};
