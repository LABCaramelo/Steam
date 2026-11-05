import { useState, useRef, useEffect } from "react";
import type { FXRackConfig } from "../types";
import { getAudioContext, synthesizeProceduralSpeech } from "../utils/audioEngine";

interface StudioFXRackProps {
  fxConfig: FXRackConfig;
  onUpdateFX: (config: FXRackConfig) => void;
}

export function StudioFXRack({ fxConfig, onUpdateFX }: StudioFXRackProps) {
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [isBypass, setIsBypass] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const handleUpdate = (patch: Partial<FXRackConfig>) => {
    onUpdateFX({ ...fxConfig, ...patch });
  };

  const handlePlayTest = async () => {
    if (isPlayingTest) {
      setIsPlayingTest(false);
      return;
    }

    try {
      const ctx = getAudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      // Draw FFT spectrum
      drawSpectrum();

      const testPhrase =
        "Testando os processadores do estúdio: graves com corpo, médios transparentes e agudos com ar.";
      const res = await synthesizeProceduralSpeech(testPhrase, {
        pitchOffsetHz: 0,
        speed: 1.0,
        breathiness: 25,
      });

      const audio = new Audio(res.url);
      const source = ctx.createMediaElementSource(audio);

      if (!isBypass) {
        // Simple live filters on the preview
        const low = ctx.createBiquadFilter();
        low.type = "lowshelf";
        low.frequency.value = 150;
        low.gain.value = fxConfig.eqWarmth;

        const mid = ctx.createBiquadFilter();
        mid.type = "peaking";
        mid.frequency.value = 2500;
        mid.gain.value = fxConfig.eqPresence;

        const high = ctx.createBiquadFilter();
        high.type = "highshelf";
        high.frequency.value = 10000;
        high.gain.value = fxConfig.eqAir;

        source.connect(low);
        low.connect(mid);
        mid.connect(high);
        high.connect(analyser);
      } else {
        source.connect(analyser);
      }

      analyser.connect(ctx.destination);

      audio.onended = () => {
        setIsPlayingTest(false);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };

      setIsPlayingTest(true);
      void audio.play();
    } catch (e) {
      console.error(e);
      setIsPlayingTest(false);
    }
  };

  const drawSpectrum = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = "#101014";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        // Gradient: Orange to Electric Sky
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, "#FF701A");
        gradient.addColorStop(0.6, "#25BFFF");
        gradient.addColorStop(1, "#FFF4E8");

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }
    };

    render();
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="vs-fx">
      <div className="vs-banner">
        <div className="vs-banner__text">
          <h3>🎚️ Rack de Efeitos & Masterização Vocal (Studio Suite)</h3>
          <p>
            Equalizador de 3 bandas acústicas, de-esser para atenuação de sibilância,
            compressor de dinâmica, reverb de ambiente tratado e normalizador de loudness em LUFS.
          </p>
        </div>
        <div className="vs-banner__badge">Web Audio Analyser &bull; LUFS Target</div>
      </div>

      {/* Real-time Spectrum Analyzer */}
      <div className="vs-panel vs-fx-spectrum-panel">
        <div className="vs-spectrum-header">
          <span className="vs-panel__title">Visualizador Espectral FFT em Tempo Real</span>
          <div className="vs-spectrum-actions">
            <button
              type="button"
              className={`vs-chip ${isBypass ? "vs-chip--active" : ""}`}
              onClick={() => setIsBypass(!isBypass)}
            >
              {isBypass ? "Bypass Ativo (Áudio Cru)" : "Processamento Ativo"}
            </button>
            <button
              type="button"
              className="vs-btn vs-btn--sm vs-btn--primary"
              onClick={handlePlayTest}
            >
              <span>{isPlayingTest ? "⏹ Parar Teste" : "▶ Testar Som no Rack"}</span>
            </button>
          </div>
        </div>
        <canvas ref={canvasRef} className="vs-spectrum-canvas" width={800} height={140} />
      </div>

      <div className="vs-fx__grid">
        {/* EQ Section */}
        <div className="vs-panel">
          <h4 className="vs-panel__title">1. Equalizador de 3 Bandas Vocais</h4>

          <div className="vs-knobs-row">
            <div className="vs-knob-item">
              <span className="vs-knob-label">Warmth (150 Hz)</span>
              <span className="vs-knob-val">{fxConfig.eqWarmth > 0 ? `+${fxConfig.eqWarmth}` : fxConfig.eqWarmth} dB</span>
              <input
                type="range"
                min="-8"
                max="8"
                step="0.5"
                value={fxConfig.eqWarmth}
                onChange={(e) => handleUpdate({ eqWarmth: parseFloat(e.target.value) })}
              />
              <span className="vs-knob-hint">Corpo e aveludado</span>
            </div>

            <div className="vs-knob-item">
              <span className="vs-knob-label">Clarity (2.5 kHz)</span>
              <span className="vs-knob-val">{fxConfig.eqPresence > 0 ? `+${fxConfig.eqPresence}` : fxConfig.eqPresence} dB</span>
              <input
                type="range"
                min="-6"
                max="8"
                step="0.5"
                value={fxConfig.eqPresence}
                onChange={(e) => handleUpdate({ eqPresence: parseFloat(e.target.value) })}
              />
              <span className="vs-knob-hint">Inteligibilidade</span>
            </div>

            <div className="vs-knob-item">
              <span className="vs-knob-label">Air Sheen (10 kHz)</span>
              <span className="vs-knob-val">{fxConfig.eqAir > 0 ? `+${fxConfig.eqAir}` : fxConfig.eqAir} dB</span>
              <input
                type="range"
                min="-6"
                max="10"
                step="0.5"
                value={fxConfig.eqAir}
                onChange={(e) => handleUpdate({ eqAir: parseFloat(e.target.value) })}
              />
              <span className="vs-knob-hint">Brilho de estúdio</span>
            </div>
          </div>
        </div>

        {/* Dynamics Section */}
        <div className="vs-panel">
          <h4 className="vs-panel__title">2. Dinâmica & De-Esser</h4>

          <div className="vs-sliders-block">
            <div className="vs-slider-item">
              <div className="vs-slider-item__header">
                <span>De-Esser (Atenuação de "S" em 6.8 kHz)</span>
                <strong>{fxConfig.deEsser}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={fxConfig.deEsser}
                onChange={(e) => handleUpdate({ deEsser: parseInt(e.target.value, 10) })}
              />
            </div>

            <div className="vs-slider-item">
              <div className="vs-slider-item__header">
                <span>Compressor Threshold</span>
                <strong>{fxConfig.compThreshold} dB</strong>
              </div>
              <input
                type="range"
                min="-36"
                max="-6"
                value={fxConfig.compThreshold}
                onChange={(e) => handleUpdate({ compThreshold: parseInt(e.target.value, 10) })}
              />
            </div>

            <div className="vs-slider-item">
              <div className="vs-slider-item__header">
                <span>Compressor Ratio</span>
                <strong>{fxConfig.compRatio.toFixed(1)}:1</strong>
              </div>
              <input
                type="range"
                min="1.5"
                max="6"
                step="0.5"
                value={fxConfig.compRatio}
                onChange={(e) => handleUpdate({ compRatio: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Reverb & Ambience */}
        <div className="vs-panel">
          <h4 className="vs-panel__title">3. Ambiência & Reverb de Estúdio</h4>

          <div className="vs-form-group">
            <label className="vs-form-label">Tipo de Sala</label>
            <select
              className="vs-select"
              value={fxConfig.reverbType}
              onChange={(e) => handleUpdate({ reverbType: e.target.value as FXRackConfig["reverbType"] })}
            >
              <option value="dry">Dry Podcast (Sem reflexão)</option>
              <option value="room">Sala Acusticamente Tratada</option>
              <option value="studio">Estúdio de Rádio Clássico</option>
              <option value="hall">Auditório / Cinema</option>
            </select>
          </div>

          <div className="vs-slider-item" style={{ marginTop: "1rem" }}>
            <div className="vs-slider-item__header">
              <span>Intensidade do Reverb</span>
              <strong>{fxConfig.reverbAmount}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              value={fxConfig.reverbAmount}
              onChange={(e) => handleUpdate({ reverbAmount: parseInt(e.target.value, 10) })}
            />
          </div>
        </div>

        {/* Master Output & LUFS */}
        <div className="vs-panel">
          <h4 className="vs-panel__title">4. Master & Normalização LUFS</h4>

          <div className="vs-form-group">
            <label className="vs-form-label">Alvo de Loudness (LUFS)</label>
            <select
              className="vs-select"
              value={fxConfig.targetLufsPreset}
              onChange={(e) => handleUpdate({ targetLufsPreset: e.target.value as FXRackConfig["targetLufsPreset"] })}
            >
              <option value="reels">Instagram Reels / TikTok / Shorts (-16 LUFS)</option>
              <option value="podcast">Podcast / Spotify / YouTube (-14 LUFS)</option>
              <option value="cinema">Cinema / Streaming Trailer (-24 LUFS)</option>
              <option value="off">Sem Normalização Automática</option>
            </select>
          </div>

          <div className="vs-slider-item" style={{ marginTop: "1rem" }}>
            <div className="vs-slider-item__header">
              <span>Ganho Master</span>
              <strong>{fxConfig.masterGain > 0 ? `+${fxConfig.masterGain}` : fxConfig.masterGain} dB</strong>
            </div>
            <input
              type="range"
              min="-12"
              max="6"
              step="0.5"
              value={fxConfig.masterGain}
              onChange={(e) => handleUpdate({ masterGain: parseFloat(e.target.value) })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
