import React, { useState, useRef } from "react";
import { GenerationParams, StylePreset } from "../types";
import {
  Sparkles,
  Wand2,
  Dices,
  Music,
  Upload,
  FileText,
} from "lucide-react";
import { enhancePrompt } from "../services/acestepClient";

interface CreatePanelProps {
  onGenerate: (params: GenerationParams) => Promise<void>;
  isGenerating: boolean;
  progressPercent: number;
  statusMessage: string;
}

const STYLE_PRESETS: StylePreset[] = [
  {
    id: "lofi",
    name: "Lo-Fi Caramelo",
    genre: "Chillhop & Soul",
    bpm: 82,
    keyScale: "Eb major",
    tags: ["Lo-Fi", "Rhodes", "Cassette", "Urbano BH"],
    description: "Batidas suaves, piano elétrico aveludado e textura de fita.",
    prompt: "Lo-Fi chillhop nostálgico com piano rhodes analógico, sub-grave aveludado e textura de fita cassete.",
    color: "#FF701A",
  },
  {
    id: "zimmer",
    name: "Cinema Zimmer",
    genre: "Épico & Tensão",
    bpm: 120,
    keyScale: "D minor",
    tags: ["Trailer", "Cordas", "Zimmer", "Impacto"],
    description: "Cordas contínuas, trompas colossais e crescendo dramático.",
    prompt: "Trilha épica cinematográfica com orquestra de cordas em ostinato contínuo, trompas pesadas e sintetizador Moog em crescendo.",
    color: "#FF3D8D",
  },
  {
    id: "cyber",
    name: "Cyberpunk Savassi",
    genre: "Darksynth 80s",
    bpm: 135,
    keyScale: "A minor",
    tags: ["Cyberpunk", "Synthwave", "Arp", "Alta Energia"],
    description: "Sintetizadores rasgados, baixo analógico e batidas pulsantes.",
    prompt: "Darksynth cyberpunk de alta velocidade com arpeggiator analógico, bateria punchy e sintetizadores retro 80s.",
    color: "#25BFFF",
  },
  {
    id: "bossa",
    name: "Bossa Acústica",
    genre: "Bossa Nova & MPB",
    bpm: 95,
    keyScale: "F major",
    tags: ["Violão", "Bossa Nova", "Suave", "Acolhedor"],
    description: "Violão de nylon sincopado, percussão de vassourinha e brisa leve.",
    prompt: "Bossa nova intimista e aconchegante com violão de nylon brasileiro sincopado e percussão sutil.",
    color: "#FFD52A",
  },
  {
    id: "synthwave",
    name: "Synthwave Neon",
    genre: "Retrowave 80s",
    bpm: 124,
    keyScale: "G minor",
    tags: ["Synthwave", "Drive Noturno", "Reverb", "80s"],
    description: "Clima de perseguição noturna em rodovia retrô com pads largos.",
    prompt: "Outrun synthwave anos 80 nostálgico, bateria com gate reverb, bassline pulsante e sintetizador melódico.",
    color: "#7657FF",
  },
  {
    id: "indie",
    name: "Indie Rock BH",
    genre: "Indie & Garagem",
    bpm: 128,
    keyScale: "E major",
    tags: ["Indie Rock", "Guitarras", "Orgânico", "Jovem"],
    description: "Guitarras jangle com overdrive leve, baixo ágil e bateria viva.",
    prompt: "Indie rock contemporâneo e autêntico com guitarras elétricas jangle, bateria acústica viva e melodia cativante.",
    color: "#FF701A",
  },
  {
    id: "ambient",
    name: "Dark Suspense",
    genre: "Drone & Tensão",
    bpm: 90,
    keyScale: "C minor",
    tags: ["Suspense", "Dark", "Cinema", "Mistério"],
    description: "Drones ressonantes, sub-graves profundos e atmosfera misteriosa.",
    prompt: "Trilha sombria de suspense psicológico com drones ressonantes, sub-graves profundos e texturas sinistras.",
    color: "#FF3D8D",
  },
  {
    id: "afrobeat",
    name: "Afrobeat Groove",
    genre: "Afrobeat & Funk",
    bpm: 115,
    keyScale: "B minor",
    tags: ["Afrobeat", "Groove", "Metais", "Dançante"],
    description: "Riffs rítmicos de guitarra, percussão percussiva e metais brilhantes.",
    prompt: "Afrobeat groove pulsante com linhas rítmicas de guitarra limpa, congas dinâmicas e seção de metais enérgica.",
    color: "#FFD52A",
  },
];

const KEYS = [
  "C major", "C minor", "C# major", "C# minor",
  "D major", "D minor", "Eb major", "Eb minor",
  "E major", "E minor", "F major", "F minor",
  "F# minor", "G major", "G minor", "Ab major",
  "A major", "A minor", "Bb major", "B minor",
];

const LYRIC_TAGS = [
  "[Intro]", "[Verso 1]", "[Pré-Refrão]", "[Refrão]",
  "[Verso 2]", "[Ponte]", "[Drop]", "[Solo]", "[Outro]"
];

export const CreatePanel: React.FC<CreatePanelProps> = ({
  onGenerate,
  isGenerating,
  progressPercent,
  statusMessage,
}) => {
  const [mode, setMode] = useState<"simple" | "custom">("simple");

  // Form states
  const [title, setTitle] = useState("");
  const [songDescription, setSongDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [vocalLanguage, setVocalLanguage] = useState("pt");
  const [bpm, setBpm] = useState(110);
  const [keyScale, setKeyScale] = useState("C major");
  const [timeSignature, setTimeSignature] = useState("4");
  const [duration, setDuration] = useState(60);
  const [inferenceSteps, setInferenceSteps] = useState(30);
  const [guidanceScale, setGuidanceScale] = useState(4.5);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 999999));
  const [randomSeed, setRandomSeed] = useState(true);
  const [ditModel, setDitModel] = useState<"acestep-1.5-base" | "acestep-1.5-turbo" | "acestep-1.5-thinking">("acestep-1.5-base");
  const [inferMethod, setInferMethod] = useState<"ode" | "sde">("ode");
  const [referenceAudioName, setReferenceAudioName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tapTimesRef = useRef<number[]>([]);

  // Tap Tempo Handler
  const handleTapTempo = () => {
    const now = performance.now();
    const times = tapTimesRef.current.filter((t) => now - t < 2500);
    times.push(now);
    tapTimesRef.current = times;

    if (times.length >= 2) {
      const diffs: number[] = [];
      for (let i = 1; i < times.length; i++) {
        diffs.push(times[i] - times[i - 1]);
      }
      const avgMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const calculatedBpm = Math.round(60000 / avgMs);
      if (calculatedBpm >= 40 && calculatedBpm <= 220) {
        setBpm(calculatedBpm);
      }
    }
  };

  // Apply a style preset
  const handleApplyPreset = (preset: StylePreset) => {
    setStyle(preset.genre);
    setPrompt(preset.prompt);
    setBpm(preset.bpm);
    setKeyScale(preset.keyScale);
    if (!title) setTitle(preset.name);
  };

  // AI Prompt Enhancer
  const handleEnhancePrompt = () => {
    const enhanced = enhancePrompt(prompt || songDescription, style, bpm, keyScale);
    setPrompt(enhanced);
  };

  // Insert lyrics tag into editor
  const handleInsertTag = (tag: string) => {
    setLyrics((prev) => (prev ? `${prev}\n\n${tag}\n` : `${tag}\n`));
  };

  // Handle reference audio file upload
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceAudioName(file.name);
    }
  };

  // Trigger generation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) return;

    const currentSeed = randomSeed ? Math.floor(Math.random() * 999999) : seed;
    if (randomSeed) setSeed(currentSeed);

    const generatedTitle =
      title.trim() ||
      (songDescription ? songDescription.slice(0, 32) + "..." : "") ||
      (prompt ? prompt.slice(0, 32) + "..." : "Trilha Nova");

    await onGenerate({
      mode,
      songDescription,
      title: generatedTitle,
      prompt: mode === "simple" ? songDescription : prompt,
      style: style || "Trilha Sonora Original",
      lyrics,
      instrumental,
      vocalLanguage,
      bpm,
      keyScale,
      timeSignature,
      duration,
      inferenceSteps,
      guidanceScale,
      seed: currentSeed,
      randomSeed,
      ditModel,
      inferMethod,
      referenceAudioName: referenceAudioName || undefined,
    });
  };

  return (
    <div className="bg-[#18181e]/90 rounded-2xl border border-white/10 p-5 shadow-2xl backdrop-blur-md">
      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#FF701A]/10 text-[#FF701A] border border-[#FF701A]/20">
            <Music size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#FFF4E8]">Estúdio de Criação</h2>
            <p className="text-xs text-white/50">Geração de músicas e trilhas com ACE-Step 1.5</p>
          </div>
        </div>

        <div className="flex bg-[#101014] p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setMode("simple")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              mode === "simple"
                ? "bg-[#FF701A] text-[#101014] shadow"
                : "text-white/60 hover:text-white"
            }`}
          >
            Modo Rápido
          </button>
          <button
            type="button"
            onClick={() => setMode("custom")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              mode === "custom"
                ? "bg-[#FF701A] text-[#101014] shadow"
                : "text-white/60 hover:text-white"
            }`}
          >
            Estúdio Pro
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Quick Style Presets Carousel */}
        <div>
          <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
            Presets Canônicos Caramelo
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STYLE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="text-left p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:scale-[1.02] active:scale-[0.98] group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#FFF4E8] group-hover:text-[#FF701A] transition-colors truncate">
                    {p.name}
                  </span>
                  <span className="text-[10px] font-mono text-white/50">{p.bpm} BPM</span>
                </div>
                <p className="text-[11px] text-white/60 line-clamp-1">{p.genre}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Simple Mode Inputs */}
        {mode === "simple" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Descrição da Cena ou Briefing
              </label>
              <textarea
                value={songDescription}
                onChange={(e) => setSongDescription(e.target.value)}
                placeholder="Ex: Trilha sonora cinematográfica para abertura de vídeo institucional em Belo Horizonte. Começa intimista no piano e cresce para uma batida moderna e inspiradora..."
                rows={3}
                className="w-full bg-[#101014] border border-white/10 rounded-xl p-3 text-sm text-[#FFF4E8] placeholder-white/30 focus:border-[#FF701A] focus:outline-none focus:ring-1 focus:ring-[#FF701A] transition-colors"
              />
            </div>
          </div>
        ) : (
          /* Custom Pro Mode Inputs */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1">
                  Título da Faixa
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nome da música / trilha sonora..."
                  className="w-full bg-[#101014] border border-white/10 rounded-xl px-3 py-2 text-sm text-[#FFF4E8] focus:border-[#FF701A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1">
                  Estilo / Gênero
                </label>
                <input
                  type="text"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder="Ex: Lo-Fi, Synthwave, MPB..."
                  className="w-full bg-[#101014] border border-white/10 rounded-xl px-3 py-2 text-sm text-[#FFF4E8] focus:border-[#FF701A] focus:outline-none"
                />
              </div>
            </div>

            {/* Prompt with AI Enhance */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-white/70 uppercase tracking-wider">
                  Prompt Acústico Detalhado
                </label>
                <button
                  type="button"
                  onClick={handleEnhancePrompt}
                  className="text-xs text-[#FF701A] hover:underline flex items-center gap-1 font-semibold"
                >
                  <Sparkles size={12} />
                  Aprimorar com IA
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Instrumentação, timbres, reverberação, dynamic range, ambiência..."
                rows={2}
                className="w-full bg-[#101014] border border-white/10 rounded-xl p-3 text-sm text-[#FFF4E8] placeholder-white/30 focus:border-[#FF701A] focus:outline-none"
              />
            </div>

            {/* Lyrics Editor with Section Badges (if not instrumental) */}
            {!instrumental && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={13} className="text-[#25BFFF]" />
                    Editor de Letra & Estrutura
                  </label>
                  <span className="text-[11px] text-white/40">Use tags estruturais para guiar o ACE-Step</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {LYRIC_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertTag(tag)}
                      className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-white/70 hover:text-white transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder="[Intro]&#10;Escreva sua letra com rimas e métrica musical...&#10;&#10;[Refrão]&#10;Ganchos fortes e marcantes..."
                  rows={4}
                  className="w-full bg-[#101014] border border-white/10 rounded-xl p-3 text-sm text-[#FFF4E8] font-mono placeholder-white/30 focus:border-[#FF701A] focus:outline-none"
                />
              </div>
            )}

            {/* Technical Parameters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#101014] p-3 rounded-xl border border-white/10">
              {/* BPM + Tap Tempo */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-white/60">BPM</label>
                  <button
                    type="button"
                    onClick={handleTapTempo}
                    className="text-[10px] font-mono text-[#FF701A] hover:underline"
                    title="Clique no ritmo para calcular o BPM"
                  >
                    Tap Tempo
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={40}
                    max={220}
                    value={bpm}
                    onChange={(e) => setBpm(parseInt(e.target.value) || 110)}
                    className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-center text-[#FFF4E8]"
                  />
                  <input
                    type="range"
                    min={40}
                    max={220}
                    value={bpm}
                    onChange={(e) => setBpm(parseInt(e.target.value))}
                    className="flex-1 accent-[#FF701A]"
                  />
                </div>
              </div>

              {/* Tonalidade & Compasso */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-white/60">Tom & Compasso</label>
                  <select
                    value={timeSignature}
                    onChange={(e) => setTimeSignature(e.target.value)}
                    className="bg-[#101014] text-[10px] font-mono text-[#FF701A] border border-white/10 rounded px-1"
                  >
                    <option value="4">4/4</option>
                    <option value="3">3/4</option>
                    <option value="6">6/8</option>
                    <option value="2">2/4</option>
                  </select>
                </div>
                <select
                  value={keyScale}
                  onChange={(e) => setKeyScale(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-[#FFF4E8]"
                >
                  {KEYS.map((k) => (
                    <option key={k} value={k} className="bg-[#101014] text-[#FFF4E8]">
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duração */}
              <div>
                <label className="block text-[11px] font-bold text-white/60 mb-1">
                  Duração: {duration}s
                </label>
                <input
                  type="range"
                  min={15}
                  max={240}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full accent-[#FF701A]"
                />
              </div>

              {/* DiT Model */}
              <div>
                <label className="block text-[11px] font-bold text-white/60 mb-1">Modelo DiT</label>
                <select
                  value={ditModel}
                  onChange={(e) => setDitModel(e.target.value as any)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-[#FFF4E8]"
                >
                  <option value="acestep-1.5-base" className="bg-[#101014]">ACE-Step 1.5 Base</option>
                  <option value="acestep-1.5-turbo" className="bg-[#101014]">ACE-Step 1.5 Turbo</option>
                  <option value="acestep-1.5-thinking" className="bg-[#101014]">ACE-Step 1.5 Thinking</option>
                </select>
              </div>
            </div>

            {/* Advanced Generation Options Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {/* Seed */}
              <div className="flex items-center justify-between bg-[#101014] px-3 py-2 rounded-xl border border-white/10">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={randomSeed}
                    onChange={(e) => setRandomSeed(e.target.checked)}
                    className="rounded accent-[#FF701A]"
                  />
                  <span className="text-white/60 font-mono">Seed: {seed}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setSeed(Math.floor(Math.random() * 999999))}
                  className="p-1 rounded hover:bg-white/10 text-[#FF701A]"
                  title="Gerar Seed Aleatória"
                >
                  <Dices size={16} />
                </button>
              </div>

              {/* Steps */}
              <div className="bg-[#101014] px-3 py-2 rounded-xl border border-white/10 flex items-center justify-between">
                <span className="text-white/60">Steps: {inferenceSteps}</span>
                <input
                  type="range"
                  min={10}
                  max={60}
                  value={inferenceSteps}
                  onChange={(e) => setInferenceSteps(parseInt(e.target.value))}
                  className="w-16 accent-[#FF701A]"
                />
              </div>

              {/* Guidance */}
              <div className="bg-[#101014] px-3 py-2 rounded-xl border border-white/10 flex items-center justify-between">
                <span className="text-white/60">CFG: {guidanceScale}</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={guidanceScale}
                  onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                  className="w-16 accent-[#FF701A]"
                />
              </div>

              {/* Solver */}
              <div className="bg-[#101014] px-3 py-2 rounded-xl border border-white/10 flex items-center justify-between">
                <span className="text-white/60">Solver</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setInferMethod("ode")}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      inferMethod === "ode" ? "bg-[#FF701A] text-[#101014]" : "text-white/40"
                    }`}
                  >
                    ODE
                  </button>
                  <button
                    type="button"
                    onClick={() => setInferMethod("sde")}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      inferMethod === "sde" ? "bg-[#FF701A] text-[#101014]" : "text-white/40"
                    }`}
                  >
                    SDE
                  </button>
                </div>
              </div>
            </div>

            {/* Reference Audio Upload */}
            <div className="border border-dashed border-white/20 rounded-xl p-3 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2">
                <Upload size={16} className="text-[#25BFFF]" />
                <span className="text-xs text-white/80">
                  {referenceAudioName ? `Referência: ${referenceAudioName}` : "Áudio de Referência (Opcional - MP3/WAV/OGG)"}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-[#FFF4E8] transition-colors"
              >
                {referenceAudioName ? "Trocar" : "Escolher Arquivo"}
              </button>
            </div>
          </div>
        )}

        {/* Global Controls: Instrumental Toggle & Vocal Language */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={instrumental}
              onChange={(e) => setInstrumental(e.target.checked)}
              className="w-4 h-4 rounded bg-[#101014] border-white/20 text-[#FF701A] focus:ring-0 cursor-pointer"
            />
            <span className="text-xs font-bold text-[#FFF4E8]">Apenas Instrumental (Sem Vocal)</span>
          </label>

          {!instrumental && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">Idioma do Vocal:</span>
              <select
                value={vocalLanguage}
                onChange={(e) => setVocalLanguage(e.target.value)}
                className="bg-[#101014] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-[#FFF4E8]"
              >
                <option value="pt">Português (Brasil)</option>
                <option value="en">English (US/UK)</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="ja">日本語 (Japanese)</option>
              </select>
            </div>
          )}
        </div>

        {/* Live Generation Progress Bar */}
        {isGenerating && (
          <div className="bg-[#101014] p-3 rounded-xl border border-[#FF701A]/30 space-y-1.5 animate-pulse">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#FF701A] font-bold flex items-center gap-1.5">
                <Wand2 size={13} className="animate-spin" />
                {statusMessage || "Gerando trilha sonora com ACE-Step..."}
              </span>
              <span className="text-white/80 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#FF701A] via-[#25BFFF] to-[#FFD52A] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isGenerating}
          className="w-full py-3.5 px-4 rounded-xl font-black text-sm tracking-wide bg-gradient-to-r from-[#FF701A] via-[#ff8533] to-[#FF701A] hover:opacity-95 text-[#101014] shadow-xl hover:shadow-[#FF701A]/20 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Sparkles size={18} />
          {isGenerating ? "Processando Arranjo com IA..." : "Gerar Trilha Sonora"}
        </button>
      </form>
    </div>
  );
};
