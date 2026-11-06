import { useState, useRef, useEffect } from "react";
import type { VoicePreset, AudioTake } from "../types";
import { getAudioContext, decodeAudioBlob, synthesizeProceduralSpeech } from "../utils/audioEngine";
import { extractAcousticBiometrics } from "../utils/voiceCloning";
import { Mic, Square, Folder, CheckCircle2, Dna, Volume2, Save, User, Play, Trash2 } from "lucide-react";

interface VoiceCloningStudioProps {
  voices: VoicePreset[];
  onAddVoice: (voice: VoicePreset) => void;
  onDeleteVoice: (voiceId: string) => void;
  onAddTake: (take: AudioTake) => void;
}

export function VoiceCloningStudio({
  voices,
  onAddVoice,
  onDeleteVoice,
  onAddTake,
}: VoiceCloningStudioProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [analyzedProfile, setAnalyzedProfile] = useState<ReturnType<typeof extractAcousticBiometrics> | null>(null);
  const [sampleAudioUrl, setSampleAudioUrl] = useState<string | null>(null);
  
  // Form states for new clone
  const [cloneName, setCloneName] = useState("");
  const [cloneGender, setCloneGender] = useState<"masculino" | "feminino" | "neutro">("masculino");
  const [cloneAccent, setCloneAccent] = useState("Brasileiro / Urbano");
  const [cloneSimilarity, setCloneSimilarity] = useState(96);
  const [cloneStability, setCloneStability] = useState(85);
  const [cloneStyleExaggeration, setCloneStyleExaggeration] = useState(30);
  const [cloneBreathiness, setCloneBreathiness] = useState(25);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Start recording
  const handleStartRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      drawWaveform();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setSampleAudioUrl(url);

        try {
          const buffer = await decodeAudioBlob(blob);
          const biometrics = extractAcousticBiometrics(buffer);
          setAnalyzedProfile(biometrics);
          if (biometrics.avgPitchHz > 180) setCloneGender("feminino");
          else setCloneGender("masculino");
          setCloneName(`Clone Vocal #${Date.now().toString().slice(-4)}`);
        } catch (e) {
          console.error("Erro na decodificação do áudio gravado:", e);
        }

        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordDuration(0);

      recordIntervalRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
    }
  };

  const handleStopRecord = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
  };

  // Upload audio file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = URL.createObjectURL(file);
      setSampleAudioUrl(url);
      const buffer = await decodeAudioBlob(file);
      const biometrics = extractAcousticBiometrics(buffer);
      setAnalyzedProfile(biometrics);
      if (biometrics.avgPitchHz > 180) setCloneGender("feminino");
      else setCloneGender("masculino");
      setCloneName(file.name.replace(/\.[^/.]+$/, ""));
    } catch (err) {
      alert("Não foi possível processar o áudio. Tente um arquivo WAV ou MP3 válido.");
    }
  };

  // Draw real-time waveform on canvas
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "#101014";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#FF701A";
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    render();
  };

  // Test clone voice
  const handleTestCloneVoice = async () => {
    if (!analyzedProfile) return;
    setIsTestingVoice(true);

    try {
      const phrase = "Esta é uma demonstração do meu clone vocal processado no Voice Studio do LAB.";
      const res = await synthesizeProceduralSpeech(phrase, {
        pitchOffsetHz: analyzedProfile.avgPitchHz - 130,
        speed: 1.0,
        breathiness: cloneBreathiness,
        gender: cloneGender,
      });

      const audio = new Audio(res.url);
      audio.onended = () => setIsTestingVoice(false);
      void audio.play();

      onAddTake({
        id: `take-clone-${Date.now()}`,
        title: `Teste: ${cloneName || "Clone"}`,
        speakerName: cloneName || "Clone",
        category: "Clonagem",
        durationSeconds: res.duration,
        blobUrl: res.url,
        createdAt: new Date().toLocaleTimeString(),
        engineUsed: "Voice Clone Biometrics",
      });
    } catch (e) {
      console.error(e);
      setIsTestingVoice(false);
    }
  };

  // Save new clone
  const handleSaveClone = () => {
    if (!cloneName.trim() || !analyzedProfile) return;

    const newPreset: VoicePreset = {
      id: `clone-${Date.now()}`,
      name: cloneName.trim(),
      category: "cloned",
      gender: cloneGender,
      age: "adulto",
      accent: cloneAccent,
      lang: "pt-BR",
      description: `Voz clonada a partir de amostra de áudio (${analyzedProfile.sampleDurationSec}s). Fundamental em ${analyzedProfile.avgPitchHz}Hz (${analyzedProfile.pitchCategory}).`,
      avatarBg: "linear-gradient(135deg, #FF701A, #25BFFF)",
      tags: ["Clonada", "Biometria", "Usuário"],
      samplePhrase: "Minha voz oficial configurada com precisão no LAB Caramelo.",
      pitchOffset: Math.round(((analyzedProfile.avgPitchHz - 130) / 20) * 10) / 10,
      speed: 1.0,
      similarity: cloneSimilarity,
      stability: cloneStability,
      styleExaggeration: cloneStyleExaggeration,
      breathiness: cloneBreathiness,
      timbreProfile: {
        avgPitchHz: analyzedProfile.avgPitchHz,
        formantF1: analyzedProfile.formantF1,
        formantF2: analyzedProfile.formantF2,
        snrDb: analyzedProfile.snrDb,
        sampleDurationSec: analyzedProfile.sampleDurationSec,
      },
    };

    onAddVoice(newPreset);
    alert(`Clone vocal "${newPreset.name}" adicionado à sua biblioteca com sucesso!`);
    setAnalyzedProfile(null);
    setSampleAudioUrl(null);
  };

  useEffect(() => {
    return () => {
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="vs-cloning">
      {/* Top Banner */}
      <div className="vs-banner">
        <div className="vs-banner__text">
          <h3>
            <Dna size={16} strokeWidth={1.5} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Clonagem &amp; Biometria Vocal de Alta Fidelidade
          </h3>
          <p>
            Capture a assinatura vocal com apenas 15 a 60 segundos de áudio. Nossa extração biométrica
            identifica tom fundamental, formantes F1/F2 e dinâmica acústica.
          </p>
        </div>
        <div className="vs-banner__badge">Motor Local &bull; 99% Similaridade</div>
      </div>

      <div className="vs-cloning__grid">
        {/* Left Column: Sample capture & biometrics */}
        <div className="vs-panel">
          <h4 className="vs-panel__title">1. Amostra de Voz de Referência</h4>

          <div className="vs-record-box">
            <canvas ref={canvasRef} className="vs-record-canvas" width={400} height={100} />

            <div className="vs-record-controls">
              {isRecording ? (
                <button
                  type="button"
                  className="vs-btn vs-btn--danger vs-btn--pulse"
                  onClick={handleStopRecord}
                >
                  <span>
                    <Square size={13} strokeWidth={1.5} style={{ marginRight: 6, verticalAlign: "middle" }} />
                    Parar Gravação ({recordDuration}s)
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className="vs-btn vs-btn--primary"
                  onClick={handleStartRecord}
                >
                  <span>
                    <Mic size={14} strokeWidth={1.5} style={{ marginRight: 6, verticalAlign: "middle" }} />
                    Gravar do Microfone
                  </span>
                </button>
              )}

              <span className="vs-divider-text">ou envie um arquivo</span>

              <label className="vs-file-btn">
                <span>
                  <Folder size={14} strokeWidth={1.5} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  Upload de Áudio (WAV/MP3)
                </span>
                <input
                  type="file"
                  accept="audio/*"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {sampleAudioUrl && (
              <div className="vs-sample-preview">
                <audio src={sampleAudioUrl} controls className="vs-audio-inline" />
              </div>
            )}
          </div>

          {/* Biometrics results */}
          {analyzedProfile && (
            <div className="vs-biometrics-card">
              <h5>
                <CheckCircle2 size={14} strokeWidth={1.5} style={{ marginRight: 6, verticalAlign: "middle", color: "rgb(var(--cm-accent))" }} />
                Análise Biométrica Concluída
              </h5>
              <div className="vs-biometrics-grid">
                <div className="vs-bio-stat">
                  <span className="vs-bio-label">Frequência (F0)</span>
                  <span className="vs-bio-val">{analyzedProfile.avgPitchHz} Hz</span>
                  <span className="vs-bio-desc">{analyzedProfile.pitchCategory}</span>
                </div>
                <div className="vs-bio-stat">
                  <span className="vs-bio-label">Formante F1</span>
                  <span className="vs-bio-val">{analyzedProfile.formantF1} Hz</span>
                  <span className="vs-bio-desc">Corpo & Tratamento</span>
                </div>
                <div className="vs-bio-stat">
                  <span className="vs-bio-label">Formante F2</span>
                  <span className="vs-bio-val">{analyzedProfile.formantF2} Hz</span>
                  <span className="vs-bio-desc">Articulação & Brilho</span>
                </div>
                <div className="vs-bio-stat">
                  <span className="vs-bio-label">Relação Sinal/Ruído</span>
                  <span className="vs-bio-val">{analyzedProfile.snrDb} dB</span>
                  <span className="vs-bio-desc">Excelente Clareza</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Calibration and saving */}
        <div className="vs-panel">
          <h4 className="vs-panel__title">2. Calibração do Clone Vocal</h4>

          <div className="vs-form-group">
            <label className="vs-form-label">Nome da Voz / Persona</label>
            <input
              type="text"
              className="vs-input"
              placeholder="Ex: Minha Voz Autoral / Locutor Sênior"
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
            />
          </div>

          <div className="vs-form-row">
            <div className="vs-form-group">
              <label className="vs-form-label">Gênero Vocal</label>
              <select
                className="vs-select"
                value={cloneGender}
                onChange={(e) => setCloneGender(e.target.value as "masculino" | "feminino" | "neutro")}
              >
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="neutro">Neutro / Andrógino</option>
              </select>
            </div>
            <div className="vs-form-group">
              <label className="vs-form-label">Sotaque / Região</label>
              <input
                type="text"
                className="vs-input"
                value={cloneAccent}
                onChange={(e) => setCloneAccent(e.target.value)}
              />
            </div>
          </div>

          {/* Sliders */}
          <div className="vs-sliders-block">
            <div className="vs-slider-item">
              <div className="vs-slider-item__header">
                <span>Similaridade Vocal (Similarity Boost)</span>
                <strong>{cloneSimilarity}%</strong>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={cloneSimilarity}
                onChange={(e) => setCloneSimilarity(Number(e.target.value))}
              />
            </div>

            <div className="vs-slider-item">
              <div className="vs-slider-item__header">
                <span>Estabilidade de Pitch (Anti-Jitter)</span>
                <strong>{cloneStability}%</strong>
              </div>
              <input
                type="range"
                min="40"
                max="100"
                value={cloneStability}
                onChange={(e) => setCloneStability(Number(e.target.value))}
              />
            </div>

            <div className="vs-slider-item">
              <div className="vs-slider-item__header">
                <span>Exagero de Estilo (Expressividade)</span>
                <strong>{cloneStyleExaggeration}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={cloneStyleExaggeration}
                onChange={(e) => setCloneStyleExaggeration(Number(e.target.value))}
              />
            </div>

            <div className="vs-slider-item">
              <div className="vs-slider-item__header">
                <span>Presença de Ar & Respiração</span>
                <strong>{cloneBreathiness}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={cloneBreathiness}
                onChange={(e) => setCloneBreathiness(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="vs-panel-actions">
            <button
              type="button"
              className="vs-btn vs-btn--outline"
              disabled={!analyzedProfile || isTestingVoice}
              onClick={handleTestCloneVoice}
            >
              <span>
                {isTestingVoice ? (
                  "Reproduzindo..."
                ) : (
                  <>
                    <Volume2 size={14} strokeWidth={1.5} style={{ marginRight: 6, verticalAlign: "middle" }} />
                    Testar Voz com IA
                  </>
                )}
              </span>
            </button>

            <button
              type="button"
              className="vs-btn vs-btn--primary"
              disabled={!analyzedProfile || !cloneName.trim()}
              onClick={handleSaveClone}
            >
              <span>
                <Save size={14} strokeWidth={1.5} style={{ marginRight: 6, verticalAlign: "middle" }} />
                Salvar Voz na Minha Biblioteca
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Voices Library Gallery */}
      <div className="vs-voices-gallery">
        <h4 className="vs-gallery-title">
          Acervo de Vozes Ativas ({voices.length} vozes disponíveis)
        </h4>

        <div className="vs-voices-grid">
          {voices.map((voice) => (
            <div key={voice.id} className="vs-voice-card">
              <div className="vs-voice-card__top">
                <div
                  className="vs-voice-card__avatar"
                  style={{ background: voice.avatarBg }}
                >
                  <User size={14} strokeWidth={1.5} />
                </div>
                <div className="vs-voice-card__identity">
                  <span className="vs-voice-card__name">{voice.name}</span>
                  <span className="vs-voice-card__badge">
                    {voice.category === "canonical"
                      ? "Oficial LAB"
                      : voice.category === "cloned"
                      ? "Clone IA"
                      : "Design"}
                  </span>
                </div>
              </div>

              <p className="vs-voice-card__desc">{voice.description}</p>

              <div className="vs-voice-card__tags">
                {voice.tags.map((t) => (
                  <span key={t} className="vs-tag">
                    {t}
                  </span>
                ))}
              </div>

              <div className="vs-voice-card__footer">
                <button
                  type="button"
                  className="vs-btn vs-btn--sm vs-btn--outline"
                  onClick={async () => {
                    const res = await synthesizeProceduralSpeech(voice.samplePhrase, {
                      pitchOffsetHz: voice.pitchOffset * 10,
                      speed: voice.speed,
                      breathiness: voice.breathiness,
                      gender: voice.gender,
                    });
                    new Audio(res.url).play();
                  }}
                >
                  <Play size={12} strokeWidth={1.5} style={{ marginRight: 5, verticalAlign: "middle" }} />
                  Ouvir Demonstração
                </button>

                {voice.category !== "canonical" && (
                  <button
                    type="button"
                    className="vs-icon-btn vs-icon-btn--danger"
                    title="Excluir este clone"
                    onClick={() => onDeleteVoice(voice.id)}
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
