import { useState, useRef, useEffect } from "react";
import { MagneticButton } from "@caramelo/design-system";
import {
  Monitor,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Circle,
  Square,
  Play,
  Pause,
  Sparkles,
} from "lucide-react";
import type { WebcamSettings, AudioSettings, TakeRecord } from "../types";
import { DEFAULT_DRESSING } from "../utils/sampleDemo";

interface RecorderViewProps {
  onTakeFinished: (take: TakeRecord) => void;
  onLoadSample: () => void;
  isGeneratingSample: boolean;
}

export function RecorderView({
  onTakeFinished,
  onLoadSample,
  isGeneratingSample,
}: RecorderViewProps) {
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);

  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);

  const [webcamSettings, setWebcamSettings] = useState<WebcamSettings>({
    enabled: true,
    shape: "circle",
    size: "md",
    border: "caramel",
    mirrored: true,
    position: { x: 80, y: 70 },
  });

  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    enabled: true,
    volume: 1,
    systemAudio: true,
  });

  // Dragging state for webcam bubble
  const [isDraggingBubble, setIsDraggingBubble] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const recordedSecondsRef = useRef(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  // VU Meter Audio level (0 to 6)
  const [vuLevel, setVuLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Screen video native aspect ratio
  const [streamAspectRatio, setStreamAspectRatio] = useState<number | null>(null);

  // Sync screen video element whenever screenStream changes
  useEffect(() => {
    const video = screenVideoRef.current;
    if (video && screenStream) {
      video.srcObject = screenStream;
      const updateRatio = () => {
        if (video.videoWidth && video.videoHeight) {
          setStreamAspectRatio(video.videoWidth / video.videoHeight);
        }
      };
      video.onloadedmetadata = () => {
        updateRatio();
        video.play().catch((e) => console.warn("Video play error:", e));
      };
      video.play().catch((e) => console.warn("Video play error:", e));
    } else if (video && !screenStream) {
      video.srcObject = null;
      setStreamAspectRatio(null);
    }
  }, [screenStream]);

  // Sync webcam video element whenever webcamStream changes
  useEffect(() => {
    const video = webcamVideoRef.current;
    if (video && webcamStream && webcamSettings.enabled) {
      video.srcObject = webcamStream;
      video.onloadedmetadata = () => {
        video.play().catch((e) => console.warn("Webcam play error:", e));
      };
      video.play().catch((e) => console.warn("Webcam play error:", e));
    } else if (video && !webcamStream) {
      video.srcObject = null;
    }
  }, [webcamStream, webcamSettings.enabled]);

  // Setup Web Audio Analyser for Mic VU meter
  useEffect(() => {
    let animId: number;
    let micStream: MediaStream | null = null;

    async function initAudio() {
      if (!audioSettings.enabled) {
        setVuLevel(0);
        return;
      }
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioCtx = new AudioContext();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(micStream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVu = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setVuLevel(Math.min(6, Math.floor(avg / 25)));
          animId = requestAnimationFrame(updateVu);
        };
        updateVu();
      } catch {
        // Mic permission denied or unavailable
      }
    }
    initAudio();

    return () => {
      cancelAnimationFrame(animId);
      audioContextRef.current?.close();
      micStream?.getTracks().forEach((t) => t.stop());
    };
  }, [audioSettings.enabled]);

  // Request screen capture
  const handleSelectScreen = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" } as any,
        audio: audioSettings.systemAudio,
      });

      setScreenStream(stream);

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
        screenVideoRef.current.onloadedmetadata = () => {
          screenVideoRef.current?.play().catch(() => {});
        };
        screenVideoRef.current.play().catch(() => {});
      }

      stream.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = null;
        }
      };

      return stream;
    } catch (err) {
      console.warn("User cancelled screen share or error occurred:", err);
      return null;
    }
  };

  // Request webcam
  const handleToggleWebcam = async () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((t) => t.stop());
      setWebcamStream(null);
      setWebcamSettings((s) => ({ ...s, enabled: false }));
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = null;
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });
        setWebcamStream(stream);
        setWebcamSettings((s) => ({ ...s, enabled: true }));
        if (webcamVideoRef.current) {
          webcamVideoRef.current.srcObject = stream;
          webcamVideoRef.current.onloadedmetadata = () => {
            webcamVideoRef.current?.play().catch(() => {});
          };
          webcamVideoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn("Webcam unavailable:", err);
      }
    }
  };

  // Handle Bubble Dragging
  const handleBubblePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingBubble(true);
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingBubble || !stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const x = Math.max(8, Math.min(92, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(8, Math.min(92, ((e.clientY - rect.top) / rect.height) * 100));
      setWebcamSettings((s) => ({ ...s, position: { x, y } }));
    };

    const handlePointerUp = () => setIsDraggingBubble(false);

    if (isDraggingBubble) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDraggingBubble]);

  // Start Countdown then Record
  const startRecordingFlow = async () => {
    let stream = screenStream;
    if (!stream) {
      stream = await handleSelectScreen();
      if (!stream) return;
    }

    setCountdown(3);
    const countInt = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countInt);
          setCountdown(null);
          executeStartRecording(stream!);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const executeStartRecording = async (activeScreenStream: MediaStream) => {
    recordedChunksRef.current = [];
    recordedSecondsRef.current = 0;
    setRecordedSeconds(0);

    // Audio mixing: capture mic if enabled
    let micStream: MediaStream | null = null;
    if (audioSettings.enabled) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        console.warn("Could not capture mic for recording:", e);
      }
    }

    const audioTracks = [
      ...activeScreenStream.getAudioTracks(),
      ...(micStream ? micStream.getAudioTracks() : []),
    ];

    const recordingStream = new MediaStream([
      ...activeScreenStream.getVideoTracks(),
      ...audioTracks,
    ]);

    const mimeType = MediaRecorder.isTypeSupported("video/webm; codecs=vp9")
      ? "video/webm; codecs=vp9"
      : "video/webm";

    const recorder = new MediaRecorder(recordingStream, {
      mimeType,
      videoBitsPerSecond: 6_000_000,
    });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      micStream?.getTracks().forEach((t) => t.stop());

      const finalDuration = Math.max(1, recordedSecondsRef.current);
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const videoUrl = URL.createObjectURL(blob);

      // Make thumbnail from screen stream
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext("2d")!;
      if (screenVideoRef.current && screenVideoRef.current.videoWidth) {
        ctx.drawImage(screenVideoRef.current, 0, 0, 320, 180);
      } else {
        ctx.fillStyle = "#18181D";
        ctx.fillRect(0, 0, 320, 180);
      }
      const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.85);

      const newTake: TakeRecord = {
        id: `take-${Date.now()}`,
        title: `Take ${new Date().toLocaleDateString("pt-BR")} · ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
        createdAt: Date.now(),
        duration: finalDuration,
        blob,
        videoUrl,
        thumbnailUrl,
        dressing: DEFAULT_DRESSING,
        zoomKeyframes: [],
        trimStart: 0,
        trimEnd: finalDuration,
      };

      onTakeFinished(newTake);
    };

    recorder.start(1000);
    setIsRecording(true);
    setIsPaused(false);

    timerIntervalRef.current = setInterval(() => {
      recordedSecondsRef.current += 1;
      setRecordedSeconds(recordedSecondsRef.current);
    }, 1000);
  };

  const handlePauseResume = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerIntervalRef.current = setInterval(() => {
        recordedSecondsRef.current += 1;
        setRecordedSeconds(recordedSecondsRef.current);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerIntervalRef.current);
    }
  };

  const handleStopRecording = () => {
    clearInterval(timerIntervalRef.current);
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const stageRatio = streamAspectRatio || 16 / 9;

  return (
    <div className="cap-recorder">
      {/* 3-2-1 Countdown Overlay */}
      {countdown !== null && (
        <div className="cap-countdown-overlay">
          <div className="cap-countdown-number">{countdown}</div>
          <div style={{ color: "rgba(255, 244, 232, 0.7)", fontWeight: 700, marginTop: 12 }}>
            Prepare sua apresentação...
          </div>
        </div>
      )}

      {/* Main Preview Stage */}
      <div
        className="cap-recorder-stage"
        ref={stageRef}
        style={{
          aspectRatio: `${stageRatio}`,
          maxWidth: `min(calc(100% - 32px), calc((100vh - 190px) * ${stageRatio}), 1600px)`,
          maxHeight: "calc(100vh - 190px)",
          height: `min(calc(100vh - 190px), calc((100vw - 64px) / ${stageRatio}))`,
          width: "100%",
        }}
      >
        {/* Screen video element is ALWAYS mounted to guarantee srcObject binds immediately */}
        <video
          ref={screenVideoRef}
          autoPlay
          playsInline
          muted
          className="cap-screen-video"
              style={{
                display: screenStream ? "block" : "none",
                width: "100%",
                height: "100%",
                objectFit: "contain",
                backgroundColor: "#000",
              }}
              onLoadedMetadata={() => {
                const v = screenVideoRef.current;
                if (v && v.videoWidth && v.videoHeight) {
                  setStreamAspectRatio(v.videoWidth / v.videoHeight);
                }
              }}
            />

        {/* Placeholder shown only when no screen stream has been chosen */}
        {!screenStream && (
          <div className="cap-recorder-placeholder">
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(255, 112, 26, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FF701A",
              }}
            >
              <Monitor size={32} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#FFF4E8" }}>
                Grave sua tela com visual de estúdio
              </div>
              <p>
                Escolha a tela, aba ou janela que deseja gravar. O Cap adiciona molduras elegantes,
                bolha de câmera flutuante e zooms cinemáticos.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="cap-btn cap-btn-accent" onClick={handleSelectScreen}>
                <Monitor size={15} />
                <span>Selecionar Tela</span>
              </button>
              <button
                className="cap-btn cap-btn-subtle"
                onClick={onLoadSample}
                disabled={isGeneratingSample}
              >
                <Sparkles size={15} />
                <span>{isGeneratingSample ? "Gerando demo..." : "Carregar Demo do LAB"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Floating Webcam Bubble */}
        {webcamSettings.enabled && webcamStream && (
          <div
            className={`cap-webcam-bubble shape-${webcamSettings.shape} size-${webcamSettings.size} border-${webcamSettings.border} ${isDraggingBubble ? "dragging" : ""}`}
            style={{
              left: `${webcamSettings.position.x}%`,
              top: `${webcamSettings.position.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            onPointerDown={handleBubblePointerDown}
            title="Arraste para posicionar a câmera"
          >
            <video
              ref={webcamVideoRef}
              autoPlay
              playsInline
              muted
              className={`cap-webcam-video ${webcamSettings.mirrored ? "mirrored" : ""}`}
            />
          </div>
        )}

        {/* Floating Live Recording HUD */}
        {isRecording && (
          <div className="cap-recording-hud">
            <div className="cap-hud-rec-dot" />
            <div className="cap-hud-timer">{formatTimer(recordedSeconds)}</div>
            <button
              className="cap-btn cap-btn-subtle"
              style={{ padding: "6px 10px" }}
              onClick={handlePauseResume}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
            </button>
            <button
              className="cap-btn cap-btn-red"
              style={{ padding: "6px 14px" }}
              onClick={handleStopRecording}
            >
              <Square size={14} fill="#FFF4E8" />
              <span>Concluir</span>
            </button>
          </div>
        )}
      </div>

      {/* Setup Options Bar (only when not recording) */}
      {!isRecording && (
        <div className="cap-recorder-controls">
          <div className="cap-recorder-option">
            <button
              className={`cap-btn ${screenStream ? "cap-btn-subtle" : "cap-btn-accent"}`}
              onClick={handleSelectScreen}
            >
              <Monitor size={15} />
              <span>{screenStream ? "Trocar Tela" : "Selecionar Tela"}</span>
            </button>
          </div>

          <div style={{ width: 1, height: 24, background: "rgb(var(--cm-line))" }} />

          {/* Webcam Toggle */}
          <div className="cap-recorder-option">
            <button
              className="cap-btn cap-btn-subtle"
              onClick={handleToggleWebcam}
            >
              {webcamStream ? <Camera size={15} /> : <CameraOff size={15} />}
              <span>{webcamStream ? "Câmera Ativa" : "Ativar Câmera"}</span>
            </button>

            {webcamStream && (
              <div style={{ display: "flex", gap: 4, marginLeft: 6 }}>
                <button
                  className="cap-btn cap-btn-subtle"
                  style={{ padding: "6px 8px" }}
                  onClick={() =>
                    setWebcamSettings((s) => ({
                      ...s,
                      shape:
                        s.shape === "circle"
                          ? "squircle"
                          : s.shape === "squircle"
                            ? "rounded"
                            : "circle",
                    }))
                  }
                  title="Formato da bolha"
                >
                  <Circle size={14} />
                </button>
                <button
                  className="cap-btn cap-btn-subtle"
                  style={{ padding: "6px 8px" }}
                  onClick={() =>
                    setWebcamSettings((s) => ({
                      ...s,
                      border:
                        s.border === "caramel"
                          ? "cyan"
                          : s.border === "cyan"
                            ? "ink"
                            : "caramel",
                    }))
                  }
                  title="Estilo de borda"
                >
                  <Square size={14} />
                </button>
              </div>
            )}
          </div>

          <div style={{ width: 1, height: 24, background: "rgb(var(--cm-line))" }} />

          {/* Audio & VU Meter */}
          <div className="cap-recorder-option">
            <button
              className="cap-btn cap-btn-subtle"
              onClick={() => setAudioSettings((s) => ({ ...s, enabled: !s.enabled }))}
            >
              {audioSettings.enabled ? <Mic size={15} /> : <MicOff size={15} />}
              <span>{audioSettings.enabled ? "Microfone" : "Mudo"}</span>
            </button>

            {/* Live VU Bars */}
            <div className="cap-vu-meter" title="Nível de Áudio">
              {[0, 1, 2, 3, 4, 5].map((lvl) => (
                <div
                  key={lvl}
                  className={`cap-vu-bar ${lvl <= vuLevel ? "active" : ""} ${lvl >= 4 && lvl <= vuLevel ? "peak" : ""}`}
                />
              ))}
            </div>
          </div>

          <div style={{ width: 1, height: 24, background: "rgb(var(--cm-line))" }} />

          {/* Master Start Button with Magnetic Pull */}
          <MagneticButton
            variant="accent"
            magnetic={0.35}
            size="md"
            onClick={startRecordingFlow}
            icon={<Circle size={14} fill="#FFF4E8" />}
            style={{
              background: "rgb(var(--cm-danger))",
              color: "#FFF4E8",
              fontWeight: 800,
            }}
          >
            Iniciar Gravação
          </MagneticButton>
        </div>
      )}
    </div>
  );
}
