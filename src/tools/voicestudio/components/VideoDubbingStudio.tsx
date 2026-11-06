import { useState, useRef } from "react";
import type { VoicePreset, DubbingSegment, AudioTake } from "../types";
import { synthesizeProceduralSpeech } from "../utils/audioEngine";
import { generateSRT, downloadTextFile } from "../utils/srtExporter";
import { Video, Folder, RotateCw, Film, FileText, Download } from "lucide-react";

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
  const [targetSpeakerId, setTargetSpeakerId] = useState(voices[0]?.id || "canonical-luiz-caramelo");
  const [duckingDb, setDuckingDb] = useState(-16);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSynthesizingDub, setIsSynthesizingDub] = useState(false);
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [segments, setSegments] = useState<DubbingSegment[]>([
    {
      id: "seg-1",
      startTime: 0.0,
      endTime: 3.5,
      originalText: "Estratégia precisa ser sentida. Marca não é só o que ela diz.",
      translatedText: "Strategy needs to be felt. A brand isn't just what it says.",
    },
    {
      id: "seg-2",
      startTime: 3.6,
      endTime: 7.2,
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

  const handleTranslateAll = () => {
    setIsTranslating(true);
    setTimeout(() => {
      // Mock realistic translations for top languages
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
            : "それがあなたに行動を起こさせるものだ。ツールを減らし、システムを。"
        }
        return { ...seg, translatedText: trans };
      });

      setSegments(updated);
      setIsTranslating(false);
    }, 600);
  };

  const handleSynthesizeDub = async () => {
    setIsSynthesizingDub(true);
    const speaker = voices.find((v) => v.id === targetSpeakerId) || voices[0];
    const combinedTranslated = segments.map((s) => s.translatedText).join(" ");

    try {
      const res = await synthesizeProceduralSpeech(combinedTranslated, {
        pitchOffsetHz: speaker.pitchOffset * 10,
        speed: speaker.speed,
        breathiness: speaker.breathiness,
        gender: speaker.gender,
      });

      setDubbedAudioUrl(res.url);

      onAddTake({
        id: `take-dub-${Date.now()}`,
        title: `Dublagem: ${targetLang} (${segments.length} planos)`,
        speakerName: speaker.name,
        category: "Dublagem",
        durationSeconds: res.duration,
        blobUrl: res.url,
        createdAt: new Date().toLocaleTimeString(),
        engineUsed: "Multilingual Dubbing Engine",
      });

      // Play video and audio simultaneously
      if (videoRef.current && audioRef.current) {
        audioRef.current.src = res.url;
        videoRef.current.currentTime = 0;
        audioRef.current.currentTime = 0;
        videoRef.current.volume = Math.pow(10, duckingDb / 20); // Ducking
        void videoRef.current.play();
        void audioRef.current.play();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSynthesizingDub(false);
    }
  };

  const handleExportSRT = () => {
    const cues = segments.map((s, idx) => ({
      index: idx + 1,
      startTimeSec: s.startTime,
      endTimeSec: s.endTime,
      text: s.translatedText,
    }));
    const srt = generateSRT(cues);
    downloadTextFile(`dublagem-${targetLang}.srt`, srt);
  };

  return (
    <div className="vs-dubbing">
      <audio ref={audioRef} style={{ display: "none" }} />

      <div className="vs-banner">
        <div className="vs-banner__text">
          <h3>Dublagem de Vídeo & Sincronia Multilíngue</h3>
          <p>
            Traduza e re-aloque falas em mais de 600 idiomas preservando a identidade,
            com ducking inteligente sobre a trilha original e sincronia de corte.
          </p>
        </div>
        <div className="vs-banner__badge">646 Idiomas &bull; Audio Ducking</div>
      </div>

      <div className="vs-dubbing__grid">
        {/* Left Column: Video Preview and Upload */}
        <div className="vs-panel">
          <h4 className="vs-panel__title">1. Vídeo de Origem</h4>

          {videoUrl ? (
            <div className="vs-video-preview">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="vs-video-player"
              />
            </div>
          ) : (
            <div className="vs-video-placeholder">
              <Video size={36} strokeWidth={1.5} className="vs-placeholder-icon" />
              <p>Envie o vídeo que deseja traduzir ou dublar</p>
              <label className="vs-btn vs-btn--primary">
                <span><Folder size={14} strokeWidth={1.5} style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }} /> Selecionar Arquivo de Vídeo (MP4/WebM)</span>
                <input
                  type="file"
                  accept="video/*"
                  style={{ display: "none" }}
                  onChange={handleVideoUpload}
                />
              </label>
            </div>
          )}

          {/* Ducking and Audio Controls */}
          <div className="vs-sliders-block" style={{ marginTop: "1rem" }}>
            <div className="vs-slider-item">
              <div className="vs-slider-item__header">
                <span>Audio Ducking (Atenuação do Áudio Original)</span>
                <strong>{duckingDb} dB</strong>
              </div>
              <input
                type="range"
                min="-30"
                max="-6"
                step="1"
                value={duckingDb}
                onChange={(e) => setDuckingDb(parseInt(e.target.value, 10))}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Language, Voice & Subtitles */}
        <div className="vs-panel">
          <h4 className="vs-panel__title">2. Configuração de Dublagem</h4>

          <div className="vs-form-row">
            <div className="vs-form-group">
              <label className="vs-form-label">Idioma de Destino</label>
              <select
                className="vs-select"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
              >
                {SAMPLE_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="vs-form-group">
              <label className="vs-form-label">Voz da Dublagem</label>
              <select
                className="vs-select"
                value={targetSpeakerId}
                onChange={(e) => setTargetSpeakerId(e.target.value)}
              >
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="vs-dub-segments">
            <div className="vs-dub-segments__header">
              <span>Segmentos Decupados ({segments.length})</span>
              <button
                type="button"
                className="vs-chip"
                onClick={handleTranslateAll}
                disabled={isTranslating}
              >
                {isTranslating ? (
                  "Traduzindo..."
                ) : (
                  <>
                    <RotateCw size={12} strokeWidth={1.5} style={{ marginRight: 5, verticalAlign: "middle" }} />
                    Traduzir Automaticamente
                  </>
                )}
              </button>
            </div>

            {segments.map((seg, idx) => (
              <div key={seg.id} className="vs-dub-card">
                <div className="vs-dub-card__header">
                  <span className="vs-tag">Plano {idx + 1}</span>
                  <span className="vs-timecode">
                    {seg.startTime.toFixed(1)}s ➔ {seg.endTime.toFixed(1)}s
                  </span>
                </div>
                <div className="vs-dub-original">
                  <span className="vs-dub-sublabel">Original (PT-BR):</span>
                  <p>{seg.originalText}</p>
                </div>
                <div className="vs-dub-translated">
                  <span className="vs-dub-sublabel">Tradução ({targetLang}):</span>
                  <textarea
                    rows={2}
                    className="vs-textarea vs-textarea--sm"
                    value={seg.translatedText}
                    onChange={(e) => {
                      const updated = segments.map((s) =>
                        s.id === seg.id ? { ...s, translatedText: e.target.value } : s
                      );
                      setSegments(updated);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="vs-panel-actions">
            <button
              type="button"
              className="vs-btn vs-btn--primary"
              disabled={isSynthesizingDub}
              onClick={handleSynthesizeDub}
            >
              <span>
                {isSynthesizingDub ? (
                  "Sintetizando Dublagem..."
                ) : (
                  <>
                    <Film size={14} strokeWidth={1.5} style={{ marginRight: 6, verticalAlign: "middle" }} />
                    Renderizar & Sincronizar Dublagem
                  </>
                )}
              </span>
            </button>

            <button
              type="button"
              className="vs-btn vs-btn--outline"
              onClick={handleExportSRT}
            >
              <span>
                <FileText size={14} strokeWidth={1.5} style={{ marginRight: 6, verticalAlign: "middle" }} />
                Baixar Legendas SRT
              </span>
            </button>

            {dubbedAudioUrl && (
              <a
                href={dubbedAudioUrl}
                download={`dublagem-${targetLang}.wav`}
                className="vs-btn vs-btn--accent"
              >
                <span>
                  <Download size={14} strokeWidth={1.5} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  Baixar Áudio Dublado (WAV)
                </span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
