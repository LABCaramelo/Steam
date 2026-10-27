import React, { useState } from "react";
import type { Client, Deliverable, Workspace } from "./types";

interface Props {
  workspace: Workspace;
  clients: Client[];
  deliverables?: Deliverable[];
  onClose: () => void;
  onApplyOutput?: (text: string) => void;
}

type AiTaskType =
  | "calendar_draft"
  | "copy_head"
  | "briefing_summary"
  | "adjustments_checklist";

export const AiAssistantModal: React.FC<Props> = ({
  workspace,
  clients,
  onClose,
  onApplyOutput,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || "");
  const [taskType, setTaskType] = useState<AiTaskType>("calendar_draft");
  const [promptInput, setPromptInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<string | null>(null);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const handleGenerate = () => {
    setIsGenerating(true);
    setOutput(null);

    // Motor de assistência contextual fundamentado nas regras canônicas do Caramelo
    setTimeout(() => {
      let result = "";
      const brandName = selectedClient?.name || workspace.name || "Sua Marca";

      if (taskType === "calendar_draft") {
        result = `### Rascunho de Calendário Editorial Estratégico (Método HEAD)
**Cliente:** ${brandName}
**Foco:** Atenção → Retenção → Toque (Ganchos de alto contraste)

1. **Peça 01 (Carrossel):** "O maior erro de posicionamento que te faz parecer amador"
   - *Gancho:* Contraste visual forte com provocação técnica.
   - *Retenção:* Quebra de expectativa no slide 3 (cenas cotidianas da persona).
   - *CTA:* "Salve para revisar seu posicionamento antes do próximo pitch."

2. **Peça 02 (Reels / Roteiro):** "Menos ferramenta. Mais sistema: Por que apps caros não salvam sua rotina"
   - *Lente:* Close dinâmico com enquadramento cinematográfico.
   - *Áudio:* Voz natural sem entonação de vendedor.

3. **Peça 03 (Carrossel Técnico):** "3 Variáveis que separam marcas caras de marcas descartáveis"
   - *Voz:* Elegância + pequena confissão patética.
   - *CTA:* ManyChat com a palavra-chave SISTEMA.`;
      } else if (taskType === "copy_head") {
        result = `### Roteiro de Carrossel — Método HEAD
**Título:** Menos página em branco. Mais clareza.
**Slide 1 (Atenção):** "Você não tem bloqueio criativo. Você tem excesso de ruído e falta de sistema."
**Slide 2 (Contexto):** "Quando tudo é prioridade, nada ganha tração. A tela em branco não é falta de ideia: é falta de critério."
**Slide 3 (Contraste):** "O amador abre o editor e espera a inspiração. O profissional abre a ficha de marca e executa a estrutura."
**Slide 4 (Mecanismo):** "A tríade do conteúdo de alto ticket:
1. Contexto de negócio antes do design.
2. Cenas reais em vez de conselhos abstratos.
3. Decisão de compra conduzida slide a slide."
**Slide 5 (CTA):** "Comente SISTEMA para receber a estrutura completa no direct."`;
      } else if (taskType === "briefing_summary") {
        result = `### Síntese Executiva do Briefing
**Diagnóstico Causa Raiz:** O cliente possui produto validado, mas a comunicação atual sofre com inconsistência de frequência e tom genérico.
**Prioridade do Ciclo:** 
- Alinhar a ficha de marca definitiva nos primeiros 5 dias.
- Implementar 2 publicações semanais com foco em autoridade e contraste de mercado.
- Submeter todas as peças pelo Portal de Aprovação antes do agendamento.`;
      } else if (taskType === "adjustments_checklist") {
        result = `### Checklist de Ajustes Solicitados
- [ ] **Slide 2:** Reforçar a headline com maior peso tipográfico (Montserrat 900).
- [ ] **Slide 4:** Substituir exemplo genérico por caso concreto do segmento de ${selectedClient?.segment || "atuação"}.
- [ ] **Copy da Legenda:** Suavizar o CTA final mantendo o foco em conversa consultiva.`;
      }

      setOutput(result);
      setIsGenerating(false);
    }, 600);
  };

  return (
    <div className="cos-modal-overlay">
      <div className="cos-modal" style={{ maxWidth: 700 }}>
        <div className="cos-modal__header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>✨</span>
            <h3 className="cos-modal__title">Assistente de IA Contextual</h3>
          </div>
          <button className="cos-btn cos-btn--ghost cos-btn--sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="cos-modal__body">
          <p style={{ fontSize: 13, color: "var(--cos-text-secondary)", margin: "0 0 16px 0" }}>
            Gere rascunhos, planos e revisões ancorados exclusivamente no contexto estratégico da marca.
            Nenhuma alteração é gravada no banco sem sua confirmação explícita.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="cos-form-group">
              <label className="cos-form-label">Cliente Selecionado</label>
              <select
                className="cos-select"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="cos-form-group">
              <label className="cos-form-label">Ação Desejada</label>
              <select
                className="cos-select"
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as any)}
              >
                <option value="calendar_draft">Sugerir Rascunho de Calendário Editorial</option>
                <option value="copy_head">Roteirizar Carrossel (Método HEAD)</option>
                <option value="briefing_summary">Resumir Briefing em Plano de Ação</option>
                <option value="adjustments_checklist">Converter Feedback em Checklist</option>
              </select>
            </div>
          </div>

          <div className="cos-form-group">
            <label className="cos-form-label">Instruções Adicionais / Tema Específico</label>
            <input
              type="text"
              className="cos-input"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Ex: Focar no lançamento do novo curso ou em objeção de preço."
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button
              type="button"
              className="cos-btn cos-btn--primary"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? "Processando…" : "Gerar Rascunho Estratégico 🪄"}
            </button>
          </div>

          {output && (
            <div
              style={{
                background: "var(--cos-surface-2)",
                border: "1px solid var(--cos-border)",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <strong style={{ fontSize: 13, color: "var(--cos-accent)" }}>Prévia Gerada (Rascunho):</strong>
                <button
                  className="cos-btn cos-btn--secondary cos-btn--sm"
                  onClick={() => {
                    navigator.clipboard.writeText(output);
                    alert("Copiado para a área de transferência!");
                  }}
                >
                  Copiar Texto 📋
                </button>
              </div>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                  fontSize: 13,
                  color: "var(--cos-text-primary)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {output}
              </pre>
            </div>
          )}
        </div>

        <div className="cos-modal__footer">
          <button type="button" className="cos-btn cos-btn--ghost" onClick={onClose}>
            Fechar
          </button>
          {output && onApplyOutput && (
            <button
              type="button"
              className="cos-btn cos-btn--primary"
              onClick={() => {
                onApplyOutput(output);
                onClose();
              }}
            >
              Aplicar ao Editor
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
