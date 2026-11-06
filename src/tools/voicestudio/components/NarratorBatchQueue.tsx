import { useState } from "react";
import type { BatchItem, VoicePreset, AudioTake } from "../types";
import { synthesizeProceduralSpeech } from "../utils/audioEngine";
import { Trash2 } from "lucide-react";

interface NarratorBatchQueueProps {
  voices: VoicePreset[];
  onAddTake: (take: AudioTake) => void;
}

export function NarratorBatchQueue({ voices, onAddTake }: NarratorBatchQueueProps) {
  const [items, setItems] = useState<BatchItem[]>([
    {
      id: "batch-1",
      title: "Capítulo 01 — A Ilusão das Ferramentas",
      speakerId: voices[0]?.id || "canonical-luiz-caramelo",
      text: "No início, todo criador acredita que a próxima câmera ou o próximo plugin vai resolver o problema da atenção. Mas a atenção não se compra com resolução.",
      status: "idle",
      progress: 0,
    },
    {
      id: "batch-2",
      title: "Capítulo 02 — Stillness & Movement",
      speakerId: voices[1]?.id || "canonical-bianca-narrativa",
      text: "Quando as camadas estão alinhadas, temos repouso. No momento em que as camadas se separam, nasce a tensão dramática e o movimento ganha peso.",
      status: "idle",
      progress: 0,
    },
    {
      id: "batch-3",
      title: "Capítulo 03 — A Decisão do Próximo Passo",
      speakerId: voices[0]?.id || "canonical-luiz-caramelo",
      text: "Marca não é o que ela diz no manifesto. É o que ela faz você fazer no segundo seguinte.",
      status: "idle",
      progress: 0,
    },
  ]);

  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [gapBetweenScenes, setGapBetweenScenes] = useState(0.8);

  const handleAddItem = () => {
    const newItem: BatchItem = {
      id: `batch-${Date.now()}`,
      title: `Cena ${items.length + 1}`,
      speakerId: voices[0]?.id || "canonical-luiz-caramelo",
      text: "",
      status: "idle",
      progress: 0,
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (id: string, patch: Partial<BatchItem>) => {
    setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const handleProcessBatch = async () => {
    setIsProcessingBatch(true);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      handleUpdateItem(item.id, { status: "rendering", progress: 25 });
      const speaker = voices.find((v) => v.id === item.speakerId) || voices[0];

            try {
        const res = await synthesizeProceduralSpeech(item.text, {
          pitchOffsetHz: speaker.pitchOffset * 10,
          speed: speaker.speed,
          breathiness: speaker.breathiness,
          gender: speaker.gender,
        });

        handleUpdateItem(item.id, {
          status: "ready",
          progress: 100,
          audioUrl: res.url,
          duration: res.duration,
        });

        onAddTake({
          id: `take-batch-${Date.now()}-${i}`,
          title: item.title,
          speakerName: speaker.name,
          category: "Lote / Audiobook",
          durationSeconds: res.duration,
          blobUrl: res.url,
          createdAt: new Date().toLocaleTimeString(),
          engineUsed: "Batch Engine",
        });
      } catch (err) {
        handleUpdateItem(item.id, { status: "error", progress: 0 });
      }
    }

    setIsProcessingBatch(false);
  };

  return (
    <div className="vs-batch">
      <div className="vs-banner">
        <div className="vs-banner__text">
          <h3>Fila de Produção em Lote (Long-Form & Audiobooks)</h3>
          <p>
            Decupe capítulos inteiros, audiobooks, carrosséis ou módulos de curso em blocos.
            A fila processa cada cena em sequência e permite unificar a obra completa em um arquivo master.
          </p>
        </div>
        <div className="vs-banner__badge">Fila Concorrente &bull; Master Unificado</div>
      </div>

      <div className="vs-batch__topbar">
        <div className="vs-batch__settings">
          <label>
            Pausa entre cenas: <strong>{gapBetweenScenes.toFixed(1)}s</strong>
          </label>
          <input
            type="range"
            min="0.2"
            max="3.0"
            step="0.2"
            value={gapBetweenScenes}
            onChange={(e) => setGapBetweenScenes(parseFloat(e.target.value))}
          />
        </div>

        <div className="vs-batch__actions">
          <button
            type="button"
            className="vs-btn vs-btn--primary"
            disabled={isProcessingBatch || items.length === 0}
            onClick={handleProcessBatch}
          >
            <span>
              {isProcessingBatch
                ? "Processando Fila em Lote..."
                : `▶ Processar Toda a Fila (${items.length} cenas)`}
            </span>
          </button>
        </div>
      </div>

      <div className="vs-batch-list">
        {items.map((item, idx) => {
          return (
            <div key={item.id} className="vs-batch-card">
              <div className="vs-batch-card__header">
                <div className="vs-batch-card__num">0{idx + 1}</div>
                <input
                  type="text"
                  className="vs-input vs-batch-title-input"
                  value={item.title}
                  onChange={(e) => handleUpdateItem(item.id, { title: e.target.value })}
                />
                <select
                  className="vs-select vs-batch-speaker-select"
                  value={item.speakerId}
                  onChange={(e) => handleUpdateItem(item.id, { speakerId: e.target.value })}
                >
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>

                <div className="vs-batch-card__status">
                  {item.status === "ready" && <span className="vs-badge vs-badge--success">Pronto</span>}
                  {item.status === "rendering" && <span className="vs-badge vs-badge--warn">Renderizando...</span>}
                  {item.status === "error" && <span className="vs-badge vs-badge--danger">Erro</span>}
                  {item.status === "idle" && <span className="vs-badge">Na Fila</span>}
                </div>

                <button
                  type="button"
                  className="vs-icon-btn vs-icon-btn--danger"
                  onClick={() => handleRemoveItem(item.id)}
                >
                  <Trash2 size={13} strokeWidth={1.5} />
                </button>
              </div>

              <textarea
                className="vs-textarea vs-textarea--sm"
                rows={3}
                placeholder="Texto desta cena ou capítulo..."
                value={item.text}
                onChange={(e) => handleUpdateItem(item.id, { text: e.target.value })}
              />

              {item.audioUrl && (
                <div className="vs-batch-audio-row">
                  <audio src={item.audioUrl} controls className="vs-audio-inline" />
                  <a
                    href={item.audioUrl}
                    download={`${item.title}.wav`}
                    className="vs-btn vs-btn--sm vs-btn--outline"
                  >
                    ⬇ Baixar WAV
                  </a>
                </div>
              )}
            </div>
          );
        })}

        <button type="button" className="vs-add-block-btn" onClick={handleAddItem}>
          <span>＋ Adicionar Nova Cena à Fila</span>
        </button>
      </div>
    </div>
  );
}
