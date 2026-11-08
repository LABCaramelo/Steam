import { useState, useRef, useEffect } from "react";
import type { ScriptBlock, VoicePreset, AudioTake, EngineConfig } from "../types";
import { parseExpressionTags, findBestVoice, speakSegment, stopSpeechSynthesis } from "../utils/speechSynthesis";
import { synthesizeProceduralSpeech } from "../utils/audioEngine";
import { User, Trash2 } from "lucide-react";

interface TTSStudioProps {
  voices: VoicePreset[];
  scripts: ScriptBlock[];
  onUpdateScripts: (scripts: ScriptBlock[]) => void;
  onAddTake: (take: AudioTake) => void;
  engineConfig: EngineConfig;
}

export function TTSStudio({
  voices,
  scripts,
  onUpdateScripts,
  onAddTake,
  engineConfig,
}: TTSStudioProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
  const [currentTakeUrl, setCurrentTakeUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const TAGS = [
    { label: "[pausa: 0.5s]", text: " [pausa: 0.5s] " },
    { label: "[pausa: 1.0s]", text: " [pausa: 1.0s] " },
    { label: "[ênfase]", text: " [ênfase] " },
    { label: "[sussurro]", text: " [sussurro] " },
    { label: "[confissão]", text: " [confissão] " },
    { label: "[tom grave]", text: " [tom grave] " },
    { label: "[sorriso na voz]", text: " [sorriso na voz] " },
  ];

  const handleAddBlock = () => {
    const newBlock: ScriptBlock = {
      id: `script-${Date.now()}`,
      speakerId: voices[0]?.id || "canonical-luiz-caramelo",
      text: "",
      emotion: "neutro",
      pauseAfterSeconds: 0.5,
      speed: 1.0,
      pitchOffset: 0,
    };
    onUpdateScripts([...scripts, newBlock]);
  };

  const handleUpdateBlock = (id: string, patch: Partial<ScriptBlock>) => {
    onUpdateScripts(
      scripts.map((b) => (b.id === id ? { ...b, ...patch } : b))
    );
  };

  const handleRemoveBlock = (id: string) => {
    if (scripts.length <= 1) return;
    onUpdateScripts(scripts.filter((b) => b.id !== id));
  };

  const handleInsertTag = (blockId: string, tag: string) => {
    const block = scripts.find((b) => b.id === blockId);
    if (!block) return;
    handleUpdateBlock(blockId, { text: block.text + tag });
  };

  const handleSynthesizeAll = async () => {
    if (scripts.length === 0) return;
    setIsSynthesizing(true);
    stopSpeechSynthesis();

    try {
      const combinedText = scripts.map((s) => s.text).join(" ");
      const firstVoice = voices.find((v) => v.id === scripts[0].speakerId) || voices[0];

      if (engineConfig.activeEngine === "local_server") {
        try {
          const res = await fetch(`${engineConfig.localServerUrl}/v1/audio/speech`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "omnivoice",
              input: combinedText,
              voice: firstVoice.name,
            }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          setCurrentTakeUrl(blobUrl);
          setIsPlaying(true);
          onAddTake({
            id: `take-local-${Date.now()}`,
            title: `Locução Local (${scripts.length} blocos)`,
            speakerName: firstVoice.name,
            category: "TTS",
            durationSeconds: Math.max(2, Math.round(combinedText.length / 15)),
            blobUrl,
            createdAt: new Date().toLocaleTimeString(),
            engineUsed: "VoiceStudio Local (OmniVoice)",
          });
          if (audioRef.current) {
            audioRef.current.src = blobUrl;
            void audioRef.current.play();
          }
          return;
        } catch (localErr) {
          console.warn("Servidor local VoiceStudio não conectado, usando síntese nativa do LAB:", localErr);
        }
      }

      if (engineConfig.activeEngine === "openai" && engineConfig.openAiApiKey) {
        try {
          const res = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${engineConfig.openAiApiKey}`,
            },
            body: JSON.stringify({
              model: "tts-1-hd",
              input: combinedText,
              voice: "alloy",
            }),
          });
          if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          setCurrentTakeUrl(blobUrl);
          setIsPlaying(true);
          onAddTake({
            id: `take-openai-${Date.now()}`,
            title: `Locução OpenAI (${scripts.length} blocos)`,
            speakerName: firstVoice.name,
            category: "TTS",
            durationSeconds: Math.max(2, Math.round(combinedText.length / 15)),
            blobUrl,
            createdAt: new Date().toLocaleTimeString(),
            engineUsed: "OpenAI TTS-1-HD",
          });
          if (audioRef.current) {
            audioRef.current.src = blobUrl;
            void audioRef.current.play();
          }
          return;
        } catch (apiErr) {
          console.error("Erro OpenAI TTS:", apiErr);
        }
      }

      if (engineConfig.activeEngine === "procedural") {
        const res = await synthesizeProceduralSpeech(combinedText, {
          pitchOffsetHz: firstVoice.pitchOffset * 10,
          speed: firstVoice.speed,
          breathiness: firstVoice.breathiness,
          gender: firstVoice.gender,
        });

        setCurrentTakeUrl(res.url);
        setDuration(res.duration);
        setIsPlaying(true);

        onAddTake({
          id: `take-${Date.now()}`,
          title: `Locução (${scripts.length} blocos)`,
          speakerName: firstVoice.name,
          category: "TTS",
          durationSeconds: res.duration,
          blobUrl: res.url,
          createdAt: new Date().toLocaleTimeString(),
          engineUsed: "Web Audio Procedural",
        });

        if (audioRef.current) {
          audioRef.current.src = res.url;
          void audioRef.current.play();
        }
      } else {
        // Web Speech synthesis sequential player
        const bestVoice = await findBestVoice("pt-BR");
        setIsPlaying(true);

        for (let i = 0; i < scripts.length; i++) {
          setActiveBlockIndex(i);
          const block = scripts[i];
          const speaker = voices.find((v) => v.id === block.speakerId) || voices[0];
          const segments = parseExpressionTags(block.text);

          for (const seg of segments) {
            await speakSegment(
              seg,
              bestVoice,
              block.speed * speaker.speed,
              1.0 + (block.pitchOffset + speaker.pitchOffset) * 0.08
            );
          }
        }

        // Also generate an audio take file so user can download
        const fullText = scripts.map((s) => s.text).join(" ");
        const firstVoice = voices.find((v) => v.id === scripts[0].speakerId) || voices[0];
        const audioRes = await synthesizeProceduralSpeech(fullText, {
          pitchOffsetHz: firstVoice.pitchOffset * 10,
          speed: firstVoice.speed,
          breathiness: firstVoice.breathiness,
          gender: firstVoice.gender,
        });

        setCurrentTakeUrl(audioRes.url);
        setDuration(audioRes.duration);

        onAddTake({
          id: `take-${Date.now()}`,
          title: `Locução Completa (${scripts.length} blocos)`,
          speakerName: firstVoice.name,
          category: "TTS",
          durationSeconds: audioRes.duration,
          blobUrl: audioRes.url,
          createdAt: new Date().toLocaleTimeString(),
          engineUsed: "SpeechSynthesis Natural",
        });
      }
    } catch (err) {
      console.error("Erro na síntese:", err);
    } finally {
      setIsSynthesizing(false);
      setActiveBlockIndex(null);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    stopSpeechSynthesis();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setActiveBlockIndex(null);
  };

  // Quick templates
  const loadTemplate = (type: "reels" | "trailer" | "aula") => {
    if (type === "reels") {
      onUpdateScripts([
        {
          id: "t1",
          speakerId: "canonical-sol-vibrante",
          text: "[energia alta] Olha só isso aqui! Se você ainda gasta horas gravando a mesma fala, presta atenção nesses 3 segundos.",
          emotion: "comercial",
          pauseAfterSeconds: 0.4,
          speed: 1.1,
          pitchOffset: 0.5,
        },
        {
          id: "t2",
          speakerId: "canonical-luiz-caramelo",
          text: "[pausa: 0.5s] A maioria das IAs soa como um robô lendo bula de remédio. [confissão] E ninguém engaja com quem não respira.",
          emotion: "confessional",
          pauseAfterSeconds: 0.6,
          speed: 0.95,
          pitchOffset: -0.5,
        },
        {
          id: "t3",
          speakerId: "canonical-bianca-narrativa",
          text: "[ênfase] O segredo tá no contraste: uma voz com presença, cadência humana e o corte no ponto exato.",
          emotion: "didatico",
          pauseAfterSeconds: 0.5,
          speed: 1.0,
          pitchOffset: 0,
        },
      ]);
    } else if (type === "trailer") {
      onUpdateScripts([
        {
          id: "t1",
          speakerId: "canonical-trailer-profundo",
          text: "[tom grave] Em um mercado saturado de fórmulas repetidas... [pausa: 1.0s] quem domina o ritmo conduz a percepção.",
          emotion: "epico",
          pauseAfterSeconds: 1.0,
          speed: 0.88,
          pitchOffset: -2.0,
        },
        {
          id: "t2",
          speakerId: "canonical-luiz-caramelo",
          text: "[ênfase] Menos ferramenta. Mais sistema. Chegou a hora de dar voz à sua história.",
          emotion: "confessional",
          pauseAfterSeconds: 0.8,
          speed: 0.92,
          pitchOffset: -0.5,
        },
      ]);
    } else {
      onUpdateScripts([
        {
          id: "t1",
          speakerId: "canonical-iris-didatica",
          text: "Bem-vindos a esta aula do LAB. [pausa: 0.5s] Hoje vamos decupar como a sincronia vocal impacta a retenção de vídeo.",
          emotion: "didatico",
          pauseAfterSeconds: 0.6,
          speed: 1.0,
          pitchOffset: 0.2,
        },
        {
          id: "t2",
          speakerId: "canonical-luiz-caramelo",
          text: "Repare como a pausa antes da frase principal força o ouvinte a processar a ideia anterior. É pura psicologia de consumo.",
          emotion: "confessional",
          pauseAfterSeconds: 0.5,
          speed: 0.96,
          pitchOffset: 0,
        },
      ]);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  return (
    <div className="vs-tts">
      <audio ref={audioRef} style={{ display: "none" }} />

      {/* Top action bar */}
      <div className="vs-tts__topbar">
        <div className="vs-tts__templates">
          <span className="vs-label">Roteiros Prontos:</span>
          <button
            type="button"
            className="vs-chip"
            onClick={() => loadTemplate("reels")}
          >
            Reels 3 Ganchos
          </button>
          <button
            type="button"
            className="vs-chip"
            onClick={() => loadTemplate("trailer")}
          >
            Teaser Cinematográfico
          </button>
          <button
            type="button"
            className="vs-chip"
            onClick={() => loadTemplate("aula")}
          >
            Aula LAB & Academy
          </button>
        </div>

        <div className="vs-tts__main-actions">
          {isPlaying || isSynthesizing ? (
            <button
              type="button"
              className="vs-btn vs-btn--danger"
              onClick={handleStop}
            >
              <span>⏹ Interromper</span>
            </button>
          ) : (
            <button
              type="button"
              className="vs-btn vs-btn--primary vs-btn--pulse"
              onClick={handleSynthesizeAll}
              disabled={isSynthesizing}
            >
              <span>{isSynthesizing ? "Sintetizando Voz..." : "▶ Sintetizar & Ouvir Tudo"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Script blocks list */}
      <div className="vs-script-list">
        {scripts.map((block, idx) => {
          const speaker = voices.find((v) => v.id === block.speakerId) || voices[0];
          const isCurrent = activeBlockIndex === idx;

          return (
            <div
              key={block.id}
              className={`vs-script-card ${isCurrent ? "vs-script-card--active" : ""}`}
            >
              <div className="vs-script-card__header">
                <div className="vs-speaker-select-wrapper">
                  <span
                    className="vs-speaker-avatar"
                    style={{ background: speaker?.avatarBg }}
                  >
                    <User size={13} strokeWidth={1.5} />
                  </span>
                  <select
                    className="vs-speaker-select"
                    value={block.speakerId}
                    onChange={(e) => handleUpdateBlock(block.id, { speakerId: e.target.value })}
                  >
                    {voices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.category === "canonical" ? "Canônica" : v.category === "cloned" ? "Clone" : "Design"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="vs-script-card__meta">
                  <span className="vs-script-badge">Bloco {idx + 1}</span>
                  <select
                    className="vs-emotion-select"
                    value={block.emotion}
                    onChange={(e) => handleUpdateBlock(block.id, { emotion: e.target.value as ScriptBlock["emotion"] })}
                  >
                    <option value="neutro">Neutro</option>
                    <option value="confessional">Confessional Caramelo</option>
                    <option value="didatico">Didático</option>
                    <option value="epico">Épico / Cinema</option>
                    <option value="comercial">Comercial / Enérgico</option>
                    <option value="humor">Humor & Ironia</option>
                  </select>
                  <button
                    type="button"
                    className="vs-icon-btn vs-icon-btn--danger"
                    onClick={() => handleRemoveBlock(block.id)}
                    title="Excluir este bloco"
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Tag Quick Inserters */}
              <div className="vs-tag-bar">
                <span className="vs-tag-bar__label">Direção vocal:</span>
                {TAGS.map((tag) => (
                  <button
                    key={tag.label}
                    type="button"
                    className="vs-tag-pill"
                    onClick={() => handleInsertTag(block.id, tag.text)}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                className="vs-script-textarea"
                rows={3}
                placeholder="Escreva a fala deste locutor. Use os marcadores de pausa ou emoção acima para enriquecer a interpretação..."
                value={block.text}
                onChange={(e) => handleUpdateBlock(block.id, { text: e.target.value })}
              />

              {/* Fine tuning controls */}
              <div className="vs-script-card__footer">
                <div className="vs-slider-group">
                  <label>
                    Velocidade: <strong>{block.speed.toFixed(2)}x</strong>
                  </label>
                  <input
                    type="range"
                    min="0.7"
                    max="1.5"
                    step="0.05"
                    value={block.speed}
                    onChange={(e) => handleUpdateBlock(block.id, { speed: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="vs-slider-group">
                  <label>
                    Pitch: <strong>{block.pitchOffset > 0 ? `+${block.pitchOffset}` : block.pitchOffset}</strong>
                  </label>
                  <input
                    type="range"
                    min="-4"
                    max="4"
                    step="0.5"
                    value={block.pitchOffset}
                    onChange={(e) => handleUpdateBlock(block.id, { pitchOffset: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="vs-slider-group">
                  <label>
                    Pausa após: <strong>{block.pauseAfterSeconds.toFixed(1)}s</strong>
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={block.pauseAfterSeconds}
                    onChange={(e) => handleUpdateBlock(block.id, { pauseAfterSeconds: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          className="vs-add-block-btn"
          onClick={handleAddBlock}
        >
          <span>＋ Adicionar Bloco de Fala</span>
        </button>
      </div>

      {/* Floating Audio Player if take is ready */}
      {currentTakeUrl && (
        <div className="vs-player-bar">
          <div className="vs-player-bar__info">
            <span className="vs-player-bar__title">Áudio Sintetizado</span>
            <span className="vs-player-bar__time">
              {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
            </span>
          </div>

          <div className="vs-player-bar__controls">
            <button
              type="button"
              className="vs-btn vs-btn--sm"
              onClick={() => {
                if (!audioRef.current) return;
                if (isPlaying) {
                  audioRef.current.pause();
                  setIsPlaying(false);
                } else {
                  void audioRef.current.play();
                  setIsPlaying(true);
                }
              }}
            >
              {isPlaying ? "⏸ Pausar" : "▶ Reproduzir"}
            </button>

            <a
              href={currentTakeUrl}
              download="locucao-voicestudio.wav"
              className="vs-btn vs-btn--outline vs-btn--sm"
            >
              ⬇ Baixar WAV
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
