import React, { useState, useRef, useEffect, useCallback } from "react";
import { Track, VisualizerConfig, VisualizerPreset } from "../types";
import {
  X,
  Play,
  Pause,
  Download,
  Video,
  Loader2,
} from "lucide-react";

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
}

const DEFAULT_CONFIG: VisualizerConfig = {
  aspect: "9:16",
  preset: "circle",
  primaryColor: "#FF701A",
  secondaryColor: "#25BFFF",
  showLyrics: true,
  showTitle: true,
  glitchEffect: false,
  scanlines: true,
  particles: true,
  vignette: true,
};

export const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, track }) => {
  const [config, setConfig] = useState<VisualizerConfig>(DEFAULT_CONFIG);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Setup audio context and analyser
  const setupAudio = useCallback(() => {
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
    } catch {}
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setIsRecording(false);
      if (audioRef.current) audioRef.current.pause();
    }
  }, [isOpen]);

  // Main visualizer animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particleArray: { x: number; y: number; size: number; speed: number; opacity: number }[] = [];
    if (config.particles) {
      for (let i = 0; i < 40; i++) {
        particleArray.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 3 + 1,
          speed: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.5 + 0.2,
        });
      }
    }

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      const w = canvas.width;
      const h = canvas.height;

      // Dark background
      ctx.fillStyle = "#101014";
      ctx.fillRect(0, 0, w, h);

      // Get audio frequency data
      let dataArray = new Uint8Array(128);
      let avgEnergy = 0;
      if (analyserRef.current && isPlaying) {
        analyserRef.current.getByteFrequencyData(dataArray);
        avgEnergy = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      } else {
        // Idle animation
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = Math.floor(Math.sin((i / 10) + Date.now() / 300) * 20 + 35);
        }
      }

      // 1. Draw floating particles
      if (config.particles) {
        ctx.fillStyle = config.primaryColor;
        particleArray.forEach((p) => {
          ctx.globalAlpha = p.opacity;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          p.y -= p.speed;
          if (p.y < 0) p.y = h;
        });
        ctx.globalAlpha = 1.0;
      }

      // 2. Visualizer Presets
      const cx = w / 2;
      const cy = h / 2 - (config.aspect === "9:16" ? 60 : 0);

      if (config.preset === "circle") {
        const radius = Math.min(w, h) * 0.18 + (avgEnergy * 0.2);
        const count = 64;

        ctx.strokeStyle = config.primaryColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          const val = dataArray[i % dataArray.length];
          const angle = (i / count) * Math.PI * 2;
          const barLen = (val / 255) * (radius * 0.8);
          const x1 = cx + Math.cos(angle) * radius;
          const y1 = cy + Math.sin(angle) * radius;
          const x2 = cx + Math.cos(angle) * (radius + barLen);
          const y2 = cy + Math.sin(angle) * (radius + barLen);

          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        ctx.stroke();

        // Inner glowing core
        ctx.fillStyle = config.secondaryColor;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else if (config.preset === "bars") {
        const numBars = 48;
        const barW = (w * 0.8) / numBars;
        const startX = w * 0.1;
        const baseY = cy + 120;

        for (let i = 0; i < numBars; i++) {
          const val = dataArray[i];
          const barH = (val / 255) * (h * 0.35);

          const grad = ctx.createLinearGradient(0, baseY, 0, baseY - barH);
          grad.addColorStop(0, config.primaryColor);
          grad.addColorStop(1, config.secondaryColor);

          ctx.fillStyle = grad;
          ctx.fillRect(startX + i * barW, baseY - barH, barW - 2, barH);
        }
      } else if (config.preset === "oscilloscope" || config.preset === "neon_wave") {
        ctx.strokeStyle = config.primaryColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        const sliceWidth = w / dataArray.length;
        let x = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * h) / 4 + cy - 50;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          x += sliceWidth;
        }
        ctx.stroke();
      }

      // 3. Typography & Titles
      if (config.showTitle && track) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#FFF4E8";
        ctx.font = "bold 24px 'Space Grotesk', sans-serif";
        ctx.fillText(track.title, cx, cy + 160);

        ctx.fillStyle = config.primaryColor;
        ctx.font = "bold 13px 'Inter', sans-serif";
        ctx.fillText(`${track.bpm} BPM • ${track.keyScale} • ${track.style}`, cx, cy + 190);
      }

      if (config.showLyrics && track?.lyrics) {
        ctx.fillStyle = "rgba(255, 244, 232, 0.75)";
        ctx.font = "italic 14px 'Inter', sans-serif";
        const firstLine = track.lyrics.split("\n").find((l) => l.trim() && !l.startsWith("[")) || "";
        if (firstLine) {
          ctx.fillText(`"${firstLine}"`, cx, cy + 240);
        }
      }

      // 4. CRT Scanlines effect
      if (config.scanlines) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        for (let y = 0; y < h; y += 4) {
          ctx.fillRect(0, y, w, 1);
        }
      }

      // 5. Vignette shadow
      if (config.vignette) {
        const radGrad = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.3, cx, cy, Math.max(w, h) * 0.7);
        radGrad.addColorStop(0, "rgba(0,0,0,0)");
        radGrad.addColorStop(1, "rgba(0,0,0,0.85)");
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, w, h);
      }
    };

    render();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isOpen, isPlaying, config, track]);

  if (!isOpen || !track) return null;

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setupAudio();
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume();
      }
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Start recording video from canvas
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !audioRef.current) return;

    try {
      setIsRecording(true);
      setRecordProgress(0);

      // Play audio from start
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      setIsPlaying(true);

      const stream = canvas.captureStream(30);

      // Try capturing audio track from AudioContext destination
      let combinedStream = stream;
      if (audioCtxRef.current) {
        const dest = audioCtxRef.current.createMediaStreamDestination();
        analyserRef.current?.connect(dest);
        const audioTracks = dest.stream.getAudioTracks();
        if (audioTracks.length > 0) {
          combinedStream = new MediaStream([...stream.getVideoTracks(), audioTracks[0]]);
        }
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
      });

      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${track.title.replace(/\s+/g, "_")}_motion_916.webm`;
        a.click();
        setIsRecording(false);
        setIsPlaying(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();

      // Record for 15 seconds snippet or track duration
      const recordDuration = Math.min(track.duration || 15, 15);
      const interval = setInterval(() => {
        setRecordProgress((p) => {
          if (p >= 100) {
            clearInterval(interval);
            recorder.stop();
            return 100;
          }
          return p + Math.round(100 / recordDuration);
        });
      }, 1000);
    } catch (err) {
      console.error("Erro ao gravar vídeo:", err);
      setIsRecording(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in">
      <div className="bg-[#18181e] border border-white/10 rounded-3xl max-w-4xl w-full p-6 shadow-2xl flex flex-col md:flex-row gap-6">
        <audio ref={audioRef} src={track.audioUrl} onEnded={() => setIsPlaying(false)} />

        {/* Video Canvas Preview */}
        <div className="flex-1 flex flex-col items-center justify-center bg-[#101014] rounded-2xl p-4 border border-white/10 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            width={config.aspect === "9:16" ? 360 : 640}
            height={config.aspect === "9:16" ? 640 : 360}
            className="rounded-xl shadow-2xl max-h-[480px] w-auto border border-white/10 object-contain"
          />

          {/* Quick Play/Pause overlay */}
          <button
            onClick={handleTogglePlay}
            className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-[#FF701A] text-[#101014] flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
          </button>
        </div>

        {/* Controls & Configuration Sidebar */}
        <div className="w-full md:w-80 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Video size={18} className="text-[#FF701A]" />
                <h3 className="text-base font-bold text-[#FFF4E8]">Motion Visualizer</h3>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Proporção Aspect Ratio */}
            <div>
              <label className="block text-xs font-bold text-white/60 uppercase mb-1.5">Proporção</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConfig({ ...config, aspect: "9:16" })}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                    config.aspect === "9:16"
                      ? "bg-[#FF701A]/20 border-[#FF701A] text-[#FF701A]"
                      : "bg-white/5 border-white/10 text-white/60"
                  }`}
                >
                  9:16 Vertical (Reels/TikTok)
                </button>
                <button
                  onClick={() => setConfig({ ...config, aspect: "16:9" })}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                    config.aspect === "16:9"
                      ? "bg-[#FF701A]/20 border-[#FF701A] text-[#FF701A]"
                      : "bg-white/5 border-white/10 text-white/60"
                  }`}
                >
                  16:9 Horizontal (YouTube)
                </button>
              </div>
            </div>

            {/* Presets de Visualizador */}
            <div>
              <label className="block text-xs font-bold text-white/60 uppercase mb-1.5">Estilo Visual</label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(["circle", "bars", "neon_wave"] as VisualizerPreset[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setConfig({ ...config, preset: p })}
                    className={`py-1.5 px-2 rounded-lg border text-center font-semibold capitalize ${
                      config.preset === p
                        ? "bg-white/15 border-[#FF701A] text-[#FF701A]"
                        : "bg-white/5 border-white/5 text-white/60"
                    }`}
                  >
                    {p === "circle" ? "Círculo" : p === "bars" ? "Barras" : "Neon"}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showTitle}
                  onChange={(e) => setConfig({ ...config, showTitle: e.target.checked })}
                  className="rounded accent-[#FF701A]"
                />
                <span className="text-white/80">Exibir Título & Metadados</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showLyrics}
                  onChange={(e) => setConfig({ ...config, showLyrics: e.target.checked })}
                  className="rounded accent-[#FF701A]"
                />
                <span className="text-white/80">Exibir Letra da Faixa</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.scanlines}
                  onChange={(e) => setConfig({ ...config, scanlines: e.target.checked })}
                  className="rounded accent-[#FF701A]"
                />
                <span className="text-white/80">Filtro de Scanlines CRT</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.particles}
                  onChange={(e) => setConfig({ ...config, particles: e.target.checked })}
                  className="rounded accent-[#FF701A]"
                />
                <span className="text-white/80">Partículas em Suspensão</span>
              </label>
            </div>
          </div>

          {/* Export Action */}
          <div className="pt-4 border-t border-white/10 space-y-2">
            {isRecording && (
              <div className="text-xs text-center text-[#FF701A] font-mono animate-pulse">
                Renderizando e Gravando Vídeo... {recordProgress}%
              </div>
            )}
            <button
              onClick={handleExportVideo}
              disabled={isRecording}
              className="w-full py-3 rounded-xl bg-[#FF701A] hover:bg-[#ff8533] text-[#101014] font-black text-xs flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
            >
              {isRecording ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {isRecording ? "Gravando Clipe..." : "Exportar Vídeo com Áudio"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
