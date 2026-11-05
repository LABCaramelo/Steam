import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Badge, HandwrittenNote, Isotype } from "@caramelo/design-system";
import type {
  AudioTrackOption,
  BrandColor,
  ExportState,
  FrameItem,
  FrameKind,
  LogoAsset,
  LogoSettings,
  Pulse3DSettings,
  StudioMode,
} from "./types";
import { CanvasStage } from "./components/CanvasStage";
import { LeftRail } from "./components/LeftRail";
import { RightRail } from "./components/RightRail";
import { TimelineBar } from "./components/TimelineBar";
import { processLogoFile } from "./utils/logoProcessor";
import { generateSyntheticTrack } from "./utils/audioBeatDetector";
import { downloadBlob, exportCanvasVideo } from "./utils/videoExporter";
import "./logomotion.css";

const DEFAULT_FRAMES: FrameItem[] = [
  { id: "f1", label: "Cartão Postal", kind: "mockup", imgSrc: "/tools/logomotion/frames/card.png", inverted: false, durationFrames: 4 },
  { id: "f2", label: "Cartão Postal", kind: "mockup", imgSrc: "/tools/logomotion/frames/card.png", inverted: true, durationFrames: 4 },
  { id: "f3", label: "Rocha Natural", kind: "mockup", imgSrc: "/tools/logomotion/frames/rock.jpg", inverted: false, durationFrames: 4 },
  { id: "f4", label: "Rocha Natural", kind: "mockup", imgSrc: "/tools/logomotion/frames/rock.jpg", inverted: true, durationFrames: 4 },
  { id: "f5", label: "Painel de Vidro", kind: "mockup", imgSrc: "/tools/logomotion/frames/glass_panel.jpg", inverted: false, durationFrames: 4 },
  { id: "f6", label: "Painel de Vidro", kind: "mockup", imgSrc: "/tools/logomotion/frames/glass_panel.jpg", inverted: true, durationFrames: 4 },
  { id: "f7", label: "Grid de Construção", kind: "construction", inverted: false, durationFrames: 6 },
  { id: "f8", label: "Grid de Construção", kind: "construction", inverted: true, durationFrames: 4 },
  { id: "f9", label: "Globo 3D", kind: "mockup", imgSrc: "/tools/logomotion/frames/globe.jpg", inverted: false, durationFrames: 4 },
  { id: "f10", label: "Globo 3D", kind: "mockup", imgSrc: "/tools/logomotion/frames/globe.jpg", inverted: true, durationFrames: 4 },
  { id: "f11", label: "Óculos & Retrato", kind: "mockup", imgSrc: "/tools/logomotion/frames/person_glasses.png", inverted: false, durationFrames: 4 },
  { id: "f12", label: "Óculos & Retrato", kind: "mockup", imgSrc: "/tools/logomotion/frames/person_glasses.png", inverted: true, durationFrames: 4 },
  { id: "f13", label: "Eco Tote Bag", kind: "mockup", imgSrc: "/tools/logomotion/frames/tote_bag.png", inverted: false, durationFrames: 4 },
  { id: "f14", label: "Eco Tote Bag", kind: "mockup", imgSrc: "/tools/logomotion/frames/tote_bag.png", inverted: true, durationFrames: 4 },
  { id: "f15", label: "Smartphone", kind: "mockup", imgSrc: "/tools/logomotion/frames/phone.png", inverted: false, durationFrames: 4 },
  { id: "f16", label: "Smartphone", kind: "mockup", imgSrc: "/tools/logomotion/frames/phone.png", inverted: true, durationFrames: 4 },
  { id: "f17", label: "Gradiente de Marca", kind: "gradient", inverted: false, durationFrames: 4 },
  { id: "f18", label: "Gradiente de Marca", kind: "gradient", inverted: true, durationFrames: 4 },
  { id: "f19", label: "Paleta de Cores", kind: "palette", inverted: false, durationFrames: 6 },
  { id: "f20", label: "Paleta de Cores", kind: "palette", inverted: true, durationFrames: 4 },
  { id: "f21", label: "Sólido · Caramel Orange", kind: "solid", bgColor: "#FF701A", inverted: false, durationFrames: 4 },
  { id: "f22", label: "Sólido · Caramel Orange", kind: "solid", bgColor: "#FF701A", inverted: true, durationFrames: 4 },
  { id: "f23", label: "Sólido · Electric Sky", kind: "solid", bgColor: "#25BFFF", inverted: false, durationFrames: 4 },
  { id: "f24", label: "Sólido · Electric Sky", kind: "solid", bgColor: "#25BFFF", inverted: true, durationFrames: 4 },
  { id: "f25", label: "Sólido · Warm Cream", kind: "solid", bgColor: "#FFF4E8", inverted: false, durationFrames: 4 },
  { id: "f26", label: "Sólido · Warm Cream", kind: "solid", bgColor: "#FFF4E8", inverted: true, durationFrames: 4 },
  { id: "f27", label: "Sólido · Ink Black", kind: "solid", bgColor: "#101014", inverted: false, durationFrames: 6 },
  { id: "f28", label: "Sólido · Ink Black", kind: "solid", bgColor: "#101014", inverted: true, durationFrames: 4 },
];

const DEFAULT_BRAND_COLORS: BrandColor[] = [
  { id: "c1", hex: "#101014", label: "Ink Black" },
  { id: "c2", hex: "#FF701A", label: "Caramel Orange" },
  { id: "c3", hex: "#25BFFF", label: "Electric Sky" },
  { id: "c4", hex: "#FFF4E8", label: "Warm Cream" },
  { id: "c5", hex: "#FF3D8D", label: "Hot Pink" },
];

export function LogoMotionApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Core State
  const [studioMode, setStudioMode] = useState<StudioMode>("showcase");
  const [logo, setLogo] = useState<LogoAsset | null>(null);
  const [brandName, setBrandName] = useState("Um Cara Caramelo");
  const [brandColors, setBrandColors] = useState<BrandColor[]>(DEFAULT_BRAND_COLORS);
  const [frames, setFrames] = useState<FrameItem[]>(DEFAULT_FRAMES);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [reducedFlash, setReducedFlash] = useState(false);

  // Logo Settings
  const [logoSettings, setLogoSettings] = useState<LogoSettings>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    blendStrength: 1,
  });

  // Pulse 3D Settings
  const [pulseSettings] = useState<Pulse3DSettings>({
    cameraZoom: 1,
    cameraMovement: true,
    extrusionDepth: 0.5,
    bevelSize: 0.05,
    lightIntensity: 1.2,
    speed: 1,
    particlesEnabled: true,
    gridExplode: false,
    ambientColor: "#101014",
    pulseStrength: 1,
  });

  // Audio State
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [beatIntensity, setBeatIntensity] = useState(0);

  const audioTracks: AudioTrackOption[] = useMemo(
    () => [
      { id: "hyper-pulse", name: "Hyper Pulse", bpm: 128 },
      { id: "cyber-kinetic", name: "Cyber Kinetic", bpm: 140 },
      { id: "deep-caramelo", name: "Deep Caramelo", bpm: 120 },
    ],
    []
  );
  const [selectedAudioId, setSelectedAudioId] = useState("hyper-pulse");

  // Export State
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    progress: 0,
    status: "",
    format: "mp4",
  });

  // Load sample Caramelo logo on initial mount
  useEffect(() => {
    fetch("/tools/logomotion/frames/sample_logo.svg")
      .then((res) => (res.ok ? res.text() : Promise.reject()))
      .then((svgText) => {
        const blob = new Blob([svgText], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        setLogo({
          src: url,
          isSvg: true,
          aspectRatio: 1,
          width: 500,
          height: 500,
          svgText,
          autoInvertedSrc: url,
        });
      })
      .catch(() => {});
  }, []);

  // Calculate total duration based on frame cuts
  // 30 FPS standard: each frame cut is durationFrames / 30 seconds
  const totalDuration = useMemo(() => {
    if (studioMode === "pulse-v2") return 8.0;
    const totalFramesCount = frames.reduce((acc, f) => acc + (f.durationFrames || 4), 0);
    return Math.max(3.0, totalFramesCount / 30);
  }, [frames, studioMode]);

  // Audio Synthesis Setup
  const initAudioBuffer = useCallback(async (trackId: string) => {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtx();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const bpm = trackId === "cyber-kinetic" ? 140 : trackId === "deep-caramelo" ? 120 : 128;
    const style = trackId === "cyber-kinetic" ? "cyber" : trackId === "deep-caramelo" ? "pulse" : "trap";
    const buffer = await generateSyntheticTrack(ctx, bpm, 10, style);
    audioBufferRef.current = buffer;
  }, []);

  useEffect(() => {
    initAudioBuffer(selectedAudioId);
  }, [selectedAudioId, initAudioBuffer]);

  // Playback Loop
  const startTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  const startPlayback = useCallback(async () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) audioContextRef.current = new AudioCtx();
    }
    const ctx = audioContextRef.current;
    if (ctx && ctx.state === "suspended") {
      await ctx.resume();
    }

    // Play Audio Node
    if (ctx && audioBufferRef.current) {
      if (audioSourceNodeRef.current) {
        try {
          audioSourceNodeRef.current.stop();
        } catch {}
      }
      const source = ctx.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.loop = true;
      source.connect(ctx.destination);
      source.start(0, currentTime % audioBufferRef.current.duration);
      audioSourceNodeRef.current = source;
    }

    startTimeRef.current = performance.now() - currentTime * 1000;
    setIsPlaying(true);
  }, [currentTime]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (audioSourceNodeRef.current) {
      try {
        audioSourceNodeRef.current.stop();
      } catch {}
      audioSourceNodeRef.current = null;
    }
    cancelAnimationFrame(animFrameRef.current);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) stopPlayback();
    else void startPlayback();
  }, [isPlaying, startPlayback, stopPlayback]);

  // Animation Frame Loop
  useEffect(() => {
    if (!isPlaying) return;

    const tick = () => {
      const now = performance.now();
      let t = (now - startTimeRef.current) / 1000;
      if (t >= totalDuration) {
        t = 0;
        startTimeRef.current = performance.now();
      }
      setCurrentTime(t);

      // Determine active frame from time
      if (studioMode === "showcase") {
        let accumulatedSec = 0;
        let foundIdx = 0;
        for (let i = 0; i < frames.length; i++) {
          const cutDuration = (frames[i].durationFrames || 4) / 30;
          accumulatedSec += cutDuration;
          if (t <= accumulatedSec) {
            foundIdx = i;
            break;
          }
        }
        setActiveFrameIndex(foundIdx);
      }

      // Dynamic Beat Intensity (e.g. 128 bpm = 2.13 beats/sec)
      const beatFreq = (128 / 60) * 2;
      const beatVal = Math.pow(Math.max(0, Math.sin(t * Math.PI * beatFreq)), 8);
      setBeatIntensity(beatVal);

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, totalDuration, frames, studioMode]);

  // Handle Seek
  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (isPlaying) {
      stopPlayback();
      setTimeout(() => startPlayback(), 50);
    } else {
      let accumulatedSec = 0;
      let foundIdx = 0;
      for (let i = 0; i < frames.length; i++) {
        const cutDuration = (frames[i].durationFrames || 4) / 30;
        accumulatedSec += cutDuration;
        if (time <= accumulatedSec) {
          foundIdx = i;
          break;
        }
      }
      setActiveFrameIndex(foundIdx);
    }
  };

  // Frame sequence operations
  const handleToggleInvert = (idx: number) => {
    setFrames((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, inverted: !f.inverted } : f))
    );
  };

  const handleRemoveFrame = (idx: number) => {
    setFrames((prev) => prev.filter((_, i) => i !== idx));
    if (activeFrameIndex >= frames.length - 1) {
      setActiveFrameIndex(Math.max(0, frames.length - 2));
    }
  };

  const handleMoveFrame = (idx: number, direction: "up" | "down") => {
    setFrames((prev) => {
      const copy = [...prev];
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= copy.length) return prev;
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
    setActiveFrameIndex(direction === "up" ? Math.max(0, idx - 1) : Math.min(frames.length - 1, idx + 1));
  };

  const handleAddFrame = (kind: FrameKind, label: string, imgSrc?: string) => {
    const newFrame: FrameItem = {
      id: `f_${Date.now()}`,
      label,
      kind,
      imgSrc,
      inverted: false,
      durationFrames: 4,
      bgColor: kind === "solid" ? brandColors[1]?.hex || "#FF701A" : undefined,
    };
    setFrames((prev) => [...prev, newFrame]);
  };

  // Logo upload
  const handleLogoUpload = async (file: File) => {
    try {
      const processed = await processLogoFile(file);
      setLogo(processed);
    } catch (e) {
      console.error("Falha ao carregar logo:", e);
    }
  };

  // Custom audio upload
  const handleCustomAudioUpload = async (file: File) => {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioContextRef.current) audioContextRef.current = new AudioCtx();
    const ctx = audioContextRef.current;
    const arrayBuffer = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    audioBufferRef.current = decoded;
    setSelectedAudioId("custom");
  };

  // Video Export Execution
  const handleStartExport = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    stopPlayback();
    setExportState({
      isExporting: true,
      progress: 0,
      status: "Iniciando renderização de vídeo...",
      format: "mp4",
    });

    try {
      // Start playback loop for recording
      await startPlayback();

      const blob = await exportCanvasVideo(
        canvas,
        audioContextRef.current,
        audioSourceNodeRef.current,
        totalDuration,
        (p) => {
          setExportState((prev) => ({
            ...prev,
            progress: p.progress,
            status: p.status,
          }));
        }
      );

      stopPlayback();
      const filename = `${brandName.toLowerCase().replace(/\s+/g, "_")}_logomotion.mp4`;
      downloadBlob(blob, filename);

      setExportState({
        isExporting: false,
        progress: 100,
        status: "Vídeo exportado com sucesso!",
        format: "mp4",
      });

      // Celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#FF701A", "#25BFFF", "#FFF4E8", "#FF3D8D", "#FFD52A"],
      });
    } catch (e) {
      console.error(e);
      stopPlayback();
      setExportState({
        isExporting: false,
        progress: 0,
        status: "Erro na renderização do vídeo.",
        format: "mp4",
      });
    }
  };

  const primaryColor = brandColors[1]?.hex || "#FF701A";
  const accentColor = brandColors[2]?.hex || "#25BFFF";
  const hexColors = useMemo(() => brandColors.map((c) => c.hex), [brandColors]);

  return (
    <div className="dia-page dia-page-create">
      {/* Header with Caramelo Isotype & Badge */}
      <header className="dia-header">
        <div className="dia-header-brand">
          <Isotype size={28} variant="caramel" />
          <span className="dia-header-title">Logo Motion</span>
          <Badge color="caramel" variant="solid">V1 2026</Badge>
          <div className="dia-header-note-wrap">
            <HandwrittenNote color="caramel" rotate="-2">
              Stillness = alinhadas · Movement = se separam
            </HandwrittenNote>
          </div>
        </div>
        <div className="dia-header-status">
          {studioMode === "showcase" ? "Match Cut Studio" : "Pulse 3D Studio"} · 1080x1920 (9:16)
        </div>
      </header>

      {/* 3-Column Workspace */}
      <div className="dia-create-workspace">
        <LeftRail
          studioMode={studioMode}
          onSelectStudio={setStudioMode}
          logo={logo}
          onLogoUpload={handleLogoUpload}
          logoSettings={logoSettings}
          onUpdateLogoSettings={(patch) => setLogoSettings((prev) => ({ ...prev, ...patch }))}
          brandColors={brandColors}
          onAddColor={() =>
            setBrandColors((prev) => [
              ...prev,
              { id: `c_${Date.now()}`, hex: "#FFD52A", label: "Acid Yellow" },
            ])
          }
          onUpdateColor={(id, hex) =>
            setBrandColors((prev) => prev.map((c) => (c.id === id ? { ...c, hex } : c)))
          }
          onRemoveColor={(id) => setBrandColors((prev) => prev.filter((c) => c.id !== id))}
          brandName={brandName}
          onBrandNameChange={setBrandName}
          audioTracks={audioTracks}
          selectedAudioId={selectedAudioId}
          onSelectAudio={setSelectedAudioId}
          onCustomAudioUpload={handleCustomAudioUpload}
          reducedFlash={reducedFlash}
          onToggleReducedFlash={setReducedFlash}
        />

        <main className="dia-create-main" aria-label="Visualização">
          <div className="studio-player studio-player-fill">
            <CanvasStage
              canvasRef={canvasRef}
              studioMode={studioMode}
              logo={logo}
              logoSettings={logoSettings}
              frames={frames}
              activeFrameIndex={activeFrameIndex}
              primaryColor={primaryColor}
              accentColor={accentColor}
              brandColors={hexColors}
              brandName={brandName}
              isPlaying={isPlaying}
              currentTime={currentTime}
              beatIntensity={beatIntensity}
              pulseSettings={pulseSettings}
              reducedFlash={reducedFlash}
            />

            <TimelineBar
              isPlaying={isPlaying}
              onTogglePlay={togglePlay}
              currentTime={currentTime}
              totalDuration={totalDuration}
              onSeek={handleSeek}
              frames={frames}
              activeFrameIndex={activeFrameIndex}
              onSelectFrame={(idx) => {
                setActiveFrameIndex(idx);
                let acc = 0;
                for (let i = 0; i < idx; i++) {
                  acc += (frames[i].durationFrames || 4) / 30;
                }
                setCurrentTime(acc);
              }}
            />
          </div>
        </main>

        <RightRail
          frames={frames}
          activeFrameIndex={activeFrameIndex}
          onSelectFrame={(idx) => {
            setActiveFrameIndex(idx);
            let acc = 0;
            for (let i = 0; i < idx; i++) {
              acc += (frames[i].durationFrames || 4) / 30;
            }
            setCurrentTime(acc);
          }}
          onToggleInvertFrame={handleToggleInvert}
          onRemoveFrame={handleRemoveFrame}
          onMoveFrame={handleMoveFrame}
          onAddFrame={handleAddFrame}
          exportState={exportState}
          onStartExport={handleStartExport}
        />
      </div>
    </div>
  );
}
