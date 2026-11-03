import React, { useState } from "react";
import type { Opportunity, OpportunityStage, Workspace } from "./types";
import type { GabineteRepository } from "./repo";

interface Props {
  workspace: Workspace;
  opportunities: Opportunity[];
  repo: GabineteRepository;
  onRefresh: () => void;
}

export const VendasView: React.FC<Props> = ({
  workspace,
  opportunities,
  repo,
  onRefresh,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [valueStr, setValueStr] = useState("3500");
  const [stage, setStage] = useState<OpportunityStage>("novo");
  const [nextAction, setNextAction] = useState("");

  const stages: Array<{ id: OpportunityStage; label: string; color: string }> = [
    { id: "novo", label: "Novo Contato", color: "var(--mc-text-muted)" },
    { id: "qualificado", label: "Qualificado", color: "var(--mc-sky)" },
    { id: "proposta", label: "Proposta Enviada", color: "var(--mc-warning)" },
    { id: "negociacao", label: "Em Negociação", color: "var(--mc-caramel)" },
    { id: "ganho", label: "Fechado / Ganho", color: "var(--mc-mint)" },
  ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const valCents = Math.round(parseFloat(valueStr.replace(",", ".")) * 100) || 0;
    await repo.createOpportunity({
      workspace_id: workspace.id,
      title,
      client_name: clientName,
      stage,
      estimated_value_cents: valCents,
      monthly_value_cents: valCents,
      next_action: nextAction,
    });

    setModalOpen(false);
    setTitle("");
    setClientName("");
    setNextAction("");
    onRefresh();
  };

  const handleMoveStage = async (id: string, next: OpportunityStage) => {
    await repo.updateOpportunityStage(id, next);
    onRefresh();
  };

  return (
    <div className="mc-content">
      <div className="mc-view-header" style={{ padding: 0 }}>
        <div>
          <h2 className="mc-view-header__title">
            Pipeline de Vendas & Oportunidades
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--mc-text-muted)" }}>
            Funil comercial para prospecção ativa, qualificação e fechamento de novos clientes para o estúdio.
          </p>
        </div>

        <button className="mc-btn mc-btn--primary" onClick={() => setModalOpen(true)}>
          + Nova Oportunidade
        </button>
      </div>

      {/* Colunas do Pipeline */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, alignItems: "start" }}>
        {stages.map((st) => {
          const colOpps = opportunities.filter((o) => o.stage === st.id);
          const colTotalCents = colOpps.reduce((acc, o) => acc + (o.estimated_value_cents || 0), 0);
          const colFormatted = (colTotalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

          return (
            <div
              key={st.id}
              style={{
                background: "var(--mc-ink-surface)",
                border: "1px solid var(--mc-ink-border)",
                borderRadius: "var(--mc-radius-md)",
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                minHeight: 450,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--mc-ink-border)", paddingBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: st.color }}>{st.label}</span>
                  <div style={{ fontSize: 10, color: "var(--mc-text-muted)", marginTop: 2 }}>{colFormatted}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4 }}>
                  {colOpps.length}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {colOpps.map((opp) => {
                  const oppFormatted = (opp.estimated_value_cents / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  });

                  return (
                    <div
                      key={opp.id}
                      style={{
                        background: "var(--mc-ink)",
                        border: "1px solid var(--mc-ink-border)",
                        borderRadius: "var(--mc-radius-sm)",
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mc-caramel)" }}>
                        {opp.client_name}
                      </span>
                      <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{opp.title}</h4>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--mc-text-muted)" }}>
                        <span>Valor:</span>
                        <strong style={{ color: "var(--mc-acid)" }}>{oppFormatted}/mês</strong>
                      </div>

                      {opp.next_action && (
                        <div style={{ fontSize: 11, color: "var(--mc-sky)", background: "rgba(37,191,255,0.08)", padding: "4px 6px", borderRadius: 4 }}>
                          Próximo passo: {opp.next_action}
                        </div>
                      )}

                      {/* Botões de Mover Etapa */}
                      <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                        {st.id !== "ganho" && (
                          <button
                            style={{
                              flex: 1,
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid var(--mc-ink-border)",
                              borderRadius: 4,
                              fontSize: 10,
                              color: "var(--mc-text-body)",
                              padding: "4px 0",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              const nextMap: Record<string, OpportunityStage> = {
                                novo: "qualificado",
                                qualificado: "proposta",
                                proposta: "negociacao",
                                negociacao: "ganho",
                              };
                              handleMoveStage(opp.id, nextMap[st.id]);
                            }}
                          >
                            Avançar →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Nova Oportunidade */}
      {modalOpen && (
        <div className="mc-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="mc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mc-modal__header">
              <h2>Nova Oportunidade de Negócio</h2>
              <button
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 18 }}
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="mc-modal__body">
                <div className="mc-field">
                  <label>Título da Oportunidade *</label>
                  <input
                    type="text"
                    className="mc-input"
                    placeholder="Ex: Gestão Mensal de Social Media + Tráfego"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="mc-field">
                    <label>Nome do Prospect / Empresa</label>
                    <input
                      type="text"
                      className="mc-input"
                      placeholder="Ex: Clínica Alpha"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>

                  <div className="mc-field">
                    <label>Valor Mensal Estimado (R$)</label>
                    <input
                      type="text"
                      className="mc-input"
                      value={valueStr}
                      onChange={(e) => setValueStr(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mc-field">
                  <label>Etapa Inicial</label>
                  <select className="mc-select" value={stage} onChange={(e) => setStage(e.target.value as any)}>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mc-field">
                  <label>Próxima Ação de Contato</label>
                  <input
                    type="text"
                    className="mc-input"
                    placeholder="Ex: Enviar proposta comercial até sexta-feira"
                    value={nextAction}
                    onChange={(e) => setNextAction(e.target.value)}
                  />
                </div>
              </div>

              <div className="mc-modal__footer">
                <button type="button" className="mc-btn mc-btn--secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="mc-btn mc-btn--primary">
                  Adicionar ao Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
