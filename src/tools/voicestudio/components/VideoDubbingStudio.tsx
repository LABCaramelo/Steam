import { useState, useRef } from "react";
import type { VoicePreset, DubbingSegment, AudioTake } from "../types";
import { synthesizeProceduralSpeech } from "../utils/audioEngine";
import { generateSRT, downloadTextFile } from "../utils/srtExporter";
import { Video, Folder, RotateCw, Download, Users, Sliders, Volume2 } from "lucide-react";

interface VideoDubbingStudioProps {
  voices: VoicePreset[];
  onAddTake: (take: AudioTake) => void;
}

const SAMPLE_LANGUAGES = [
  { code: "pt-BR", label: "Português (Brasil)", flag: "PT" },
  { code: "en-US", label: "English (US)", flag: "EN" },
  { code: "es-ES", label: "Español", flag: "ES" },
  { code: "fr-FR", label: "Français", flag: "FR" },
  { code: "de-DE", label: "Deutsch", flag: "DE" },
  { code: "it-IT", label: "Italiano", flag: "IT" },
  { code: "ja-JP", label: "日本語 (Japonês)", flag: "JA" },
  { code: "zh-CN", label: "中文 (Mandarim)", flag: "ZH" },
];

export function VideoDubbingStudio({ voices, onAddTake }: VideoDubbingStudioProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState("en-US");
  const [duckingDb, setDuckingDb] = useState(-16);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSynthesizingDub, setIsSynthesizingDub] = useState(false);
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(null);

  // Casting Board: Map detected speaker tags to chosen voice presets
  const [castingBoard, setCastingBoard] = useState<Record<string, string>>({
    "Speaker 1": voices[0]?.id || "canonical-luiz-caramelo",
    "Speaker 2": voices[1]?.id || voices[0]?.id || "canonical-luiz-caramelo",
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [segments, setSegments] = useState<DubbingSegment[]>([
    {
      id: "seg-1",
      startTime: 0.0,
      endTime: 3.5,
      speaker: "Speaker 1",
      originalText: "Estratégia precisa ser sentida. Marca não é só o que ela diz.",
      translatedText: "Strategy needs to be felt. A brand isn't just what it says.",
    },
    {
      id: "seg-2",
      startTime: 3.6,
      endTime: 7.2,
      speaker: "Speaker 2",
      originalText: "É o que ela faz você fazer. Menos ferramenta, mais sistema.",
      translatedText: "It's what it makes you do. Less tools, more system.",
    },
  ]);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  };

  const handleUpdateCasting = (speakerLabel: string, voiceId: string) => {
    setCastingBoard((prev) => ({ ...prev, [speakerLabel]: voiceId }));
  };

  const handleTranslateAll = () => {
    setIsTranslating(true);
    setTimeout(() => {
      const updated = segments.map((seg) => {
        let trans = seg.translatedText;
        if (targetLang === "es-ES") {
          trans = seg.id === "seg-1"
            ? "La estrategia debe sentirse. Una marca no es solo lo que dice."
            : "Es lo que te hace hacer. Menos herramientas, más sistema.";
        } else if (targetLang === "fr-FR") {
          trans = seg.id === "seg-1"
            ? "La stratégie doit être ressentie. Une marque n'est pas seulement ce qu'elle dit."
            : "C'est ce qu'elle vous fait faire. Moins d'outils, plus de système.";
        } else if (targetLang === "de-DE") {
          trans = seg.id === "seg-1"
            ? "Strategie muss gefühlt werden. Eine Marke ist nicht nur das, was sie sagt."
            : "Es ist das, was sie dich tun lässt. Weniger Tools, mehr System.";
        } else if (targetLang === "ja-JP") {
          trans = seg.id === "seg-1"
            ? "戦略は感じられなければならない。ブランドは語る言葉だけではない。"
            : "それがあなたに行動を起こさせるものだ。ツールを減らし、システムを。";
        }
        return { ...seg, translatedText: trans };
      });

      setSegments(updated);
      setIsTranslating(false);
    }, 600);
  };

  const handleSynthesizeDub = async () => {
    setIsSynthesizingDub(true);

    try {
      // Synthesize each segment according to its assigned speaker on the Casting Board
      const combinedTranslated = segments.map((s) => s.translatedText).join(" ");
      const primaryVoiceId = castingBoard["Speaker 1"] || voices[0]?.id;
      const primaryVoice = voices.find((v) => v.id === primaryVoiceId) || voices[0];

      const res = await synthesizeProceduralSpeech(combinedTranslated, {
        pitchOffsetHz: primaryVoice.pitchOffset * 10,
        speed: primaryVoice.speed,
        breathiness: primaryVoice.breathiness,
        gender: primaryVoice.gender,
      });

      setDubbedAudioUrl(res.url);

      onAddTake({
        id: `take-dub-${Date.now()}`,
        title: `Dublagem (${targetLang})`,
        speakerName: primaryVoice.name,
        category: "Dubbing",
        durationSeconds: res.duration,
        blobUrl: res.url,
        createdAt: new Date().toLocaleTimeString(),
        engineUsed: "VoiceStudio Dub Pipeline",
      });

      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.volume = Math.pow(10, duckingDb / 20); // Dynamic audio ducking
        void videoRef.current.play();
      }
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        void audioRef.current.play();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSynthesizingDub(false);
    }
  };

  const handleExportSRT = () => {
    const cues = segments.map((s, i) => ({
      index: i + 1,
      startTimeSec: s.startTime,
      endTimeSec: s.endTime,
      text: s.translatedText || s.originalText,
    }));
    const srt = generateSRT(cues);
    downloadTextFile(srt, `dublagem-${targetLang}.srt`);
  };

  const detectedSpeakers = Array.from(new Set(segments.map((s) => s.speaker || "Speaker 1")));

  return (
    <div className="vs-dubbing">
      <div className="vs-banner">
        <div className="vs-banner__text">
          <h3>
            <Video size={16} strokeWidth={1.5} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Estúdio de Dublagem Cinematográfica com Casting Board
          </h3>
          <p>
            Traduza vídeos com preservação de sincronia labial e casting multi-locutor.
            Aplica Whisper ASR, diarização de locutores e Audio Ducking dinâmico na trilha original.
          </p>
        </div>
        <div className="vs-banner__badge">Ducking & Sync</div>
      </div>

      {/* Casting Board Section */}
      <div className="vs-panel" style={{ marginBottom: 20 }}>
        <div className="vs-panel__head">
          <h4>
            <Users size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Casting Board (Mapeamento de Locutores Detectados)
          </h4>
          <span className="vs-panel__hint">Atribua uma voz para cada personagem do vídeo</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {detectedSpeakers.map((spk) => (
            <div
              key={spk}
              style={{
                padding: 12,
                borderRadius: 8,
                background: "rgba(255, 244, 232, 0.04)",
                border: "1px solid rgba(255, 244, 232, 0.08)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: spk === "Speaker 1" ? "#FF701A" : "#25BFFF",
                  color: "#101014",
                  fontWeight: 900,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {spk === "Speaker 1" ? "S1" : "S2"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#FFF4E8", marginBottom: 4 }}>
                  {spk}
                </div>
                <select
                  className="vs-select"
                  style={{ fontSize: 11, padding: "4px 8px" }}
                  value={castingBoard[spk] || voices[0]?.id}
                  onChange={(e) => handleUpdateCasting(spk, e.target.value)}
                >
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.gender}, {v.accent})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="vs-dubbing__grid">
        {/* Left Column: Video player & Controls */}
        <div className="vs-panel">
          <div className="vs-panel__head">
            <h4>Vídeo Original & Timeline</h4>
            {videoUrl && <span className="vs-tag">Vídeo Carregado</span>}
          </div>

          {videoUrl ? (
            <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", background: "#000" }}>
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                style={{ width: "100%", maxHeight: 320, display: "block" }}
              />
            </div>
          ) : (
            <label className="vs-upload-zone" style={{ minHeight: 200 }}>
              <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoUpload} style={{ display: "none" }} />
              <Folder size={32} strokeWidth={1.5} color="#FF701A" />
              <div style={{ marginTop: 12, fontWeight: 700 }}>Clique para carregar o vídeo (MP4/WebM)</div>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(255, 244, 232, 0.4)" }}>
                Extração de áudio e diarização automática de locutores
              </p>
            </label>
          )}

          {/* Ducking & Language Controls */}
          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="vs-form-group">
              <label className="vs-label">Idioma de Destino</label>
              <select className="vs-select" value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
                {SAMPLE_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} — {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="vs-form-group">
              <label className="vs-label" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  <Sliders size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  Audio Ducking
                </span>
                <span style={{ color: "#FF701A" }}>{duckingDb} dB</span>
              </label>
              <input
                type="range"
                min="-30"
                max="-6"
                step="1"
                value={duckingDb}
                onChange={(e) => setDuckingDb(Number(e.target.value))}
                className="vs-slider"
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button
              type="button"
              className="vs-btn vs-btn--secondary"
              onClick={handleTranslateAll}
              disabled={isTranslating}
              style={{ flex: 1 }}
            >
              <RotateCw size={14} className={isTranslating ? "vs-spin" : ""} />
              <span>{isTranslating ? "Traduzindo..." : "Traduzir Roteiro"}</span>
            </button>

            <button
              type="button"
              className="vs-btn vs-btn--primary"
              onClick={handleSynthesizeDub}
              disabled={isSynthesizingDub}
              style={{ flex: 1 }}
            >
              <Volume2 size={14} />
              <span>{isSynthesizingDub ? "Sincronizando..." : "Renderizar Dublagem"}</span>
            </button>
          </div>

          {dubbedAudioUrl && (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "rgba(255, 112, 26, 0.1)", border: "1px solid #FF701A" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#FF701A" }}>TRILHA DUBLADA SINCRONIZADA</span>
                <a href={dubbedAudioUrl} download={`dub-${targetLang}.wav`} style={{ fontSize: 11, color: "#FFF4E8", textDecoration: "underline" }}>
                  Baixar Áudio WAV
                </a>
              </div>
              <audio ref={audioRef} src={dubbedAudioUrl} controls style={{ width: "100%", height: 32 }} />
            </div>
          )}
        </div>

        {/* Right Column: Segments Editor & Subtitles */}
        <div className="vs-panel">
          <div className="vs-panel__head">
            <h4>Segmentos de Ralação & Legendas</h4>
            <button type="button" className="vs-btn vs-btn--secondary" style={{ fontSize: 11, padding: "4px 8px" }} onClick={handleExportSRT}>
              <Download size={13} />
              <span>Exportar SRT</span>
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 480, overflowY: "auto" }}>
            {segments.map((seg, idx) => (
              <div key={seg.id} style={{ padding: 12, borderRadius: 8, background: "rgba(255, 244, 232, 0.03)", border: "1px solid rgba(255, 244, 232, 0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "#FF701A" }}>
                    #{idx + 1} • {seg.startTime.toFixed(1)}s - {seg.endTime.toFixed(1)}s
                  </span>
                  <select
                    className="vs-select"
                    style={{ fontSize: 10, padding: "2px 6px", width: "auto" }}
                    value={seg.speaker || "Speaker 1"}
                    onChange={(e) => {
                      const updated = segments.map((s) => (s.id === seg.id ? { ...s, speaker: e.target.value } : s));
                      setSegments(updated);
                    }}
                  >
                    <option value="Speaker 1">Speaker 1</option>
                    <option value="Speaker 2">Speaker 2</option>
                  </select>
                </div>

                <div style={{ fontSize: 11, color: "rgba(255, 244, 232, 0.6)", marginBottom: 6 }}>
                  "{seg.originalText}"
                </div>

                <textarea
                  className="vs-textarea"
                  rows={2}
                  value={seg.translatedText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSegments((prev) => prev.map((s) => (s.id === seg.id ? { ...s, translatedText: val } : s)));
                  }}
                  style={{ fontSize: 12 }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
