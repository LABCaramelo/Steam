import { useState, useRef, useEffect } from "react";
import { applyCopyFilter, downloadTextFile, generateSRT } from "../utils/srtExporter";
import { Mic, Square, Copy, FileText, Film } from "lucide-react";

interface DictationStudioProps {
  onSendToTTS: (text: string) => void;
}

export function DictationStudio({ onSendToTTS }: DictationStudioProps) {
  const [isListening, setIsListening] = useState(false);
  const [rawText, setRawText] = useState("");
  const [polishedCopy, setPolishedCopy] = useState("");
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "pt-BR";

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        const combined = (finalTranscript + interimTranscript).trim();
        setRawText(combined);
      };

      recognition.onerror = (e: any) => {
        console.warn("Reconhecimento de fala:", e.error);
        if (e.error === "not-allowed") {
          alert("Permissão de microfone negada.");
          handleStop();
        }
      };

      recognition.onend = () => {
        if (isListening) {
          try {
            recognition.start();
          } catch {
            // Already started or busy
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleStart = () => {
    if (!recognitionRef.current) {
      alert("Seu navegador não suporta a Web Speech Recognition API nativa. Você ainda pode digitar seu rascunho abaixo.");
      return;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
      timerRef.current = window.setInterval(() => {
        setSecondsElapsed((p) => p + 1);
      }, 1000);
    } catch {
      // Ignore start errors
    }
  };

  const handleStop = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleApplyCarameloFilter = () => {
    const filtered = applyCopyFilter(rawText);
    setPolishedCopy(filtered);
  };

  const wordsCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;
  const wpm = secondsElapsed > 0 ? Math.round((wordsCount / secondsElapsed) * 60) : 0;

  const handleCopyToClipboard = () => {
    const textToCopy = polishedCopy || rawText;
    navigator.clipboard.writeText(textToCopy);
    alert("Texto copiado para a área de transferência!");
  };

  const handleDownloadTXT = () => {
    const content = polishedCopy || rawText;
    downloadTextFile("ditado-voicestudio.txt", content);
  };

  const handleDownloadSRT = () => {
    const text = polishedCopy || rawText;
    const lines = text.split("\n\n").filter(Boolean);
    const cues = lines.map((line, idx) => ({
      index: idx + 1,
      startTimeSec: idx * 3.5,
      endTimeSec: (idx + 1) * 3.5 - 0.2,
      text: line,
    }));
    downloadTextFile("legendas-ditado.srt", generateSRT(cues));
  };

  return (
    <div className="vs-dictation">
      <div className="vs-banner">
        <div className="vs-banner__text">
          <h3>Ditado Inteligente & Transcrição para Copy</h3>
          <p>
            Fale pensando em voz alta. O microfone capta seu fluxo de pensamento em tempo real,
            e o Filtro Copy Caramelo elimina vícios de linguagem e molda parágrafos com cadência.
          </p>
        </div>
        <div className="vs-banner__badge">Filtro Anti-Clichê &bull; Exportação SRT</div>
      </div>

      <div className="vs-dictation__topbar">
        <div className="vs-dictation__stats">
          <div className="vs-stat-pill">
            <span>Tempo Gravado:</span>
            <strong>{secondsElapsed}s</strong>
          </div>
          <div className="vs-stat-pill">
            <span>Palavras:</span>
            <strong>{wordsCount}</strong>
          </div>
          <div className="vs-stat-pill">
            <span>Cadência:</span>
            <strong>{wpm} WPM</strong>
          </div>
        </div>

        <div className="vs-dictation__actions">
          {isListening ? (
            <button
              type="button"
              className="vs-btn vs-btn--danger vs-btn--pulse"
              onClick={handleStop}
            >
              <span><Square size={13} strokeWidth={1.5} style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }} /> Pausar Ditado</span>
            </button>
          ) : (
            <button
              type="button"
              className="vs-btn vs-btn--primary"
              onClick={handleStart}
            >
              <span><Mic size={14} strokeWidth={1.5} style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }} /> Iniciar Ditado Contínuo</span>
            </button>
          )}

          <button
            type="button"
            className="vs-btn vs-btn--accent"
            onClick={handleApplyCarameloFilter}
            disabled={!rawText.trim()}
          >
            <span>Aplicar Filtro Copy Caramelo</span>
          </button>
        </div>
      </div>

      <div className="vs-dictation__grid">
        {/* Raw speech text */}
        <div className="vs-panel">
          <div className="vs-panel__header-row">
            <h4 className="vs-panel__title">Texto Falado em Tempo Real (Bruto)</h4>
            <button
              type="button"
              className="vs-chip"
              onClick={() => {
                setRawText("");
                setPolishedCopy("");
                setSecondsElapsed(0);
              }}
            >
              Limpar
            </button>
          </div>
          <textarea
            className="vs-textarea"
            rows={10}
            placeholder="Comece a falar no microfone ou digite suas ideias soltas aqui..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
        </div>

        {/* Polished copy */}
        <div className="vs-panel vs-panel--highlight">
          <div className="vs-panel__header-row">
            <h4 className="vs-panel__title">Copy Estruturada (Método Caramelo)</h4>
            <span className="vs-tag">Alta Retenção</span>
          </div>
          <textarea
            className="vs-textarea"
            rows={10}
            placeholder="Clique em 'Aplicar Filtro Copy Caramelo' para eliminar muletas de fala e quebrar o texto em cadências magnéticas..."
            value={polishedCopy}
            onChange={(e) => setPolishedCopy(e.target.value)}
          />

          <div className="vs-panel-actions" style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className="vs-btn vs-btn--outline"
              disabled={!polishedCopy && !rawText}
              onClick={handleCopyToClipboard}
            >
              <span><Copy size={13} strokeWidth={1.5} style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }} /> Copiar Texto</span>
            </button>

            <button
              type="button"
              className="vs-btn vs-btn--outline"
              disabled={!polishedCopy && !rawText}
              onClick={handleDownloadTXT}
            >
              <span><FileText size={13} strokeWidth={1.5} style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }} /> Baixar TXT</span>
            </button>

            <button
              type="button"
              className="vs-btn vs-btn--outline"
              disabled={!polishedCopy && !rawText}
              onClick={handleDownloadSRT}
            >
              <span><Film size={13} strokeWidth={1.5} style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }} /> Baixar Legendas SRT</span>
            </button>

            <button
              type="button"
              className="vs-btn vs-btn--primary"
              disabled={!polishedCopy && !rawText}
              onClick={() => onSendToTTS(polishedCopy || rawText)}
            >
              <span><Mic size={13} strokeWidth={1.5} style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }} /> Enviar para o TTS Studio ➔</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
