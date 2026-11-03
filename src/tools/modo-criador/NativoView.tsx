import React, { useState } from "react";
import type { Client, Workspace } from "./types";
import type { ModoCriadorRepository } from "./repo";

interface Props {
  workspace: Workspace;
  clients: Client[];
  repo: ModoCriadorRepository;
  onNavigateToCalendar: () => void;
}

export const NativoView: React.FC<Props> = ({
  workspace,
  clients,
  repo,
  onNavigateToCalendar,
}) => {
  const [selectedClient, setSelectedClient] = useState<string>(clients[0]?.id || "");
  const [activeMode, setActiveMode] = useState<"carrossel" | "reels" | "prompt_arte">("carrossel");
  const [themeTopic, setThemeTopic] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any>(null);

  const client = clients.find((c) => c.id === selectedClient);

  const handleGenerate = () => {
    if (!themeTopic.trim()) return;
    setIsGenerating(true);

    setTimeout(() => {
      if (activeMode === "carrossel") {
        setGeneratedResult({
          type: "carrossel",
          title: `Carrossel: O Segredo de ${themeTopic}`,
          hooks: {
            verbal: `Por que 90% das pessoas erram feio em ${themeTopic}?`,
            textual: `PARE DE FAZER ISSO EM ${themeTopic.toUpperCase()}`,
            visual: `Contraste alto: tela dividida com erro clássico à esquerda e solução canônica à direita.`,
          },
          slides: [
            { slide: 1, type: "Capa", headline: `Você está fazendo ${themeTopic} do jeito errado`, text: "Deslize para ver o método que realmente funciona." },
            { slide: 2, type: "Problema", headline: "O erro comum que ninguém te conta", text: "Focar em ferramentas e esquecer o sistema central." },
            { slide: 3, type: "Contraste", headline: "Como o amador faz vs Como o mestre faz", text: "Amador improvisa; mestre tem processo e consistência." },
            { slide: 4, type: "Solução", headline: "Os 3 passos inegociáveis", text: "1. Diagnóstico de causa raiz\n2. Camadas alinhadas\n3. Execução cirúrgica." },
            { slide: 5, type: "CTA", headline: "Gostou do raciocínio?", text: "Comente 'MÉTODO' que eu te envio a régua completa no direct." },
          ],
        });
      } else if (activeMode === "reels") {
        setGeneratedResult({
          type: "reels",
          title: `Roteiro Reels: ${themeTopic}`,
          steps: [
            { step: "1. Início (0-3s)", instruction: "Gancho com Conflito & Mudança", text: `Se você tentar resolver ${themeTopic} só com ferramentas novas, você vai quebrar a cara.` },
            { step: "2. Sequência (3-15s)", instruction: "Quebra de expectativa", text: "Eu passei meses achando que o problema era falta de tempo, até que percebi isso aqui..." },
            { step: "3. História/Prova (15-35s)", instruction: "Cena real e contraste", text: "Quando aplicamos o método no cliente, a aprovação foi de primeira e o alcance triplicou." },
            { step: "4. Solução (35-50s)", instruction: "Entrega do mecanismo", text: "O segredo foi separar a estratégia antes de abrir qualquer aplicativo de design." },
            { step: "5. Final com CTA (50-60s)", instruction: "Chamada para ação clara", text: "Salva esse vídeo pra consultar antes do seu próximo post." },
          ],
        });
      } else {
        setGeneratedResult({
          type: "prompt_arte",
          title: `Prompt de Arte Oficial Caramelo — ${themeTopic}`,
          prompt: `Cinematic 35mm film photograph, subject engaged in ${themeTopic}, urban Belo Horizonte aesthetic, high contrast lighting with golden warm sunlight and cool cyan ambient fill shadows, 35mm lens, natural textures, analog print grain, shot on Kodak Portra 400 --ar 4:5 --style raw`,
          negative: `oversaturated, plastic skin, CGI, 3d render, anime, generic stock photo, artificial smile, flat lighting`,
        });
      }
      setIsGenerating(false);
    }, 700);
  };

  const handleSendToCalendar = async () => {
    if (!generatedResult || !client) return;

    await repo.createDeliverable({
      workspace_id: workspace.id,
      client_id: client.id,
      client_name: client.name,
      title: generatedResult.title,
      format: activeMode === "carrossel" ? "carrossel" : "reels_roteiro",
      channel: "instagram",
      description: `Gerado com o Nativo IA — ${themeTopic}`,
      scheduled_date: new Date().toISOString().slice(0, 10),
      scheduled_time: "18:00",
      status: "production",
    });

    onNavigateToCalendar();
  };

  return (
    <div className="mc-content">
      {/* Header */}
      <div className="mc-view-header" style={{ padding: 0 }}>
        <div>
          <h2 className="mc-view-header__title">
            <span>⚡</span> Estúdio Nativo IA
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--mc-text-muted)" }}>
            Criação de posts, carrosséis no Método HEAD e roteiros de Reels com o DNA do Cérebro Caramelo.
          </p>
        </div>

        {/* Abas de Formato */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className={`mc-btn ${activeMode === "carrossel" ? "mc-btn--acid" : "mc-btn--secondary"}`}
            onClick={() => setActiveMode("carrossel")}
          >
            📑 Carrossel HEAD
          </button>
          <button
            className={`mc-btn ${activeMode === "reels" ? "mc-btn--acid" : "mc-btn--secondary"}`}
            onClick={() => setActiveMode("reels")}
          >
            🎥 Roteiro Reels
          </button>
          <button
            className={`mc-btn ${activeMode === "prompt_arte" ? "mc-btn--acid" : "mc-btn--secondary"}`}
            onClick={() => setActiveMode("prompt_arte")}
          >
            🎨 Prompt de Imagem
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Painel Esquerdo: Configuração do Prompt */}
        <div
          style={{
            background: "var(--mc-ink-surface)",
            border: "1px solid var(--mc-ink-border)",
            borderRadius: "var(--mc-radius-lg)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>1. Parâmetros de Criação</h3>

          <div className="mc-field">
            <label>Cliente de Destino</label>
            <select
              className="mc-select"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.segment})
                </option>
              ))}
            </select>
          </div>

          <div className="mc-field">
            <label>Tema ou Ideia Central *</label>
            <input
              type="text"
              className="mc-input"
              placeholder="Ex: Como escolher grãos especiais de café ou Como precificar serviços criativos"
              value={themeTopic}
              onChange={(e) => setThemeTopic(e.target.value)}
            />
          </div>

          <div className="mc-field">
            <label>Público Alvo / Persona</label>
            <input
              type="text"
              className="mc-input"
              placeholder="Ex: Pessoas que amam café em casa ou Donos de pequenas agências"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
            />
          </div>

          <button
            className="mc-btn mc-btn--primary"
            style={{ marginTop: 8, padding: "12px 20px", fontSize: 14 }}
            onClick={handleGenerate}
            disabled={isGenerating || !themeTopic.trim()}
          >
            {isGenerating ? "⚡ Gerando com Cérebro Caramelo..." : "✨ Gerar Conteúdo com IA"}
          </button>
        </div>

        {/* Painel Direito: Resultado Gerado */}
        <div
          style={{
            background: "var(--mc-ink-surface)",
            border: "1px solid var(--mc-ink-border)",
            borderRadius: "var(--mc-radius-lg)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>2. Prévia do Conteúdo</h3>
            {generatedResult && (
              <button className="mc-btn mc-btn--acid" onClick={handleSendToCalendar}>
                + Adicionar ao Calendário
              </button>
            )}
          </div>

          {!generatedResult ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--mc-text-muted)" }}>
              <span style={{ fontSize: 36 }}>⚡</span>
              <p style={{ marginTop: 8, fontSize: 13.5 }}>
                Configure o tema à esquerda e clique em Gerar Conteúdo para aplicar a metodologia HEAD.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", maxHeight: "65vh" }}>
              <h4 style={{ margin: 0, color: "var(--mc-caramel)", fontSize: 15 }}>{generatedResult.title}</h4>

              {generatedResult.type === "carrossel" && (
                <>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 8 }}>
                    <strong style={{ fontSize: 12, color: "var(--mc-acid)" }}>3 GANCHOS DE IMPACTO:</strong>
                    <ul style={{ margin: "6px 0 0 0", paddingLeft: 18, fontSize: 12.5, color: "var(--mc-text-body)" }}>
                      <li><strong>Verbal:</strong> {generatedResult.hooks.verbal}</li>
                      <li><strong>Textual:</strong> {generatedResult.hooks.textual}</li>
                      <li><strong>Visual:</strong> {generatedResult.hooks.visual}</li>
                    </ul>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {generatedResult.slides.map((s: any) => (
                      <div
                        key={s.slide}
                        style={{
                          background: "var(--mc-ink)",
                          border: "1px solid var(--mc-ink-border)",
                          padding: 10,
                          borderRadius: 8,
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mc-caramel)" }}>
                          Slide {s.slide} ({s.type})
                        </span>
                        <p style={{ margin: "4px 0 0 0", fontWeight: 600, fontSize: 13 }}>{s.headline}</p>
                        <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "var(--mc-text-muted)", whiteSpace: "pre-line" }}>
                          {s.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {generatedResult.type === "reels" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {generatedResult.steps.map((st: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        background: "var(--mc-ink)",
                        border: "1px solid var(--mc-ink-border)",
                        padding: 12,
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ fontWeight: 700, color: "var(--mc-pink)" }}>{st.step}</span>
                        <span style={{ color: "var(--mc-text-muted)" }}>{st.instruction}</span>
                      </div>
                      <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "var(--mc-text-body)" }}>"{st.text}"</p>
                    </div>
                  ))}
                </div>
              )}

              {generatedResult.type === "prompt_arte" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ background: "var(--mc-ink)", border: "1px solid var(--mc-ink-border)", padding: 12, borderRadius: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mc-sky)" }}>PROMPT MESTRE:</span>
                    <p style={{ margin: "6px 0 0 0", fontSize: 13, fontFamily: "monospace" }}>{generatedResult.prompt}</p>
                  </div>
                  <div style={{ background: "var(--mc-ink)", border: "1px solid var(--mc-ink-border)", padding: 12, borderRadius: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mc-danger)" }}>PROMPT NEGATIVO:</span>
                    <p style={{ margin: "6px 0 0 0", fontSize: 12, fontFamily: "monospace", color: "var(--mc-text-muted)" }}>{generatedResult.negative}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
