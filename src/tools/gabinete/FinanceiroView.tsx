import React, { useState } from "react";
import type { Client, FinancialEntry, Workspace } from "./types";
import type { GabineteRepository } from "./repo";

interface Props {
  workspace: Workspace;
  clients: Client[];
  entries: FinancialEntry[];
  repo: GabineteRepository;
  onRefresh: () => void;
}

export const FinanceiroView: React.FC<Props> = ({
  workspace,
  clients,
  entries,
  repo,
  onRefresh,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("3500");
  const [type, setType] = useState<FinancialEntry["type"]>("revenue_received");
  const [clientName, setClientName] = useState(clients[0]?.name || "");

  const activeClients = clients.filter((c) => c.status === "active");
  const totalMRR = activeClients.reduce((acc, c) => acc + (c.monthly_fee_cents || 0), 0);
  const totalFormatted = (totalMRR / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const valCents = Math.round(parseFloat(amountStr.replace(",", ".")) * 100) || 0;
    await repo.createFinancialEntry({
      workspace_id: workspace.id,
      description,
      amount_cents: valCents,
      type,
      client_name: clientName,
      status: type === "revenue_received" ? "pago" : "pendente",
    });

    setModalOpen(false);
    setDescription("");
    onRefresh();
  };

  return (
    <div className="mc-content">
      <div className="mc-view-header" style={{ padding: 0 }}>
        <div>
          <h2 className="mc-view-header__title">
            <span>💳</span> Controle Financeiro da Agência
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--mc-text-muted)" }}>
            Mensalidades de clientes, previsibilidade de honorários e {entries.length} lançamentos registrados.
          </p>
        </div>

        <button className="mc-btn mc-btn--primary" onClick={() => setModalOpen(true)}>
          + Novo Lançamento
        </button>
      </div>

      <div className="mc-counters">
        <div className="mc-counter-card">
          <span className="mc-counter-card__number mc-counter-card__number--warning">{totalFormatted}</span>
          <span className="mc-counter-card__label">Faturamento Mensal (MRR)</span>
        </div>

        <div className="mc-counter-card">
          <span className="mc-counter-card__number mc-counter-card__number--neutral">{activeClients.length}</span>
          <span className="mc-counter-card__label">Clientes Recorrentes</span>
        </div>

        <div className="mc-counter-card">
          <span className="mc-counter-card__number mc-counter-card__number--sky">
            {(totalMRR / (activeClients.length || 1) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
          <span className="mc-counter-card__label">Ticket Médio por Cliente</span>
        </div>

        <div className="mc-counter-card">
          <span className="mc-counter-card__number mc-counter-card__number--danger">
            {((totalMRR * 12) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
          <span className="mc-counter-card__label">Projeção Anual (ARR)</span>
        </div>
      </div>

      {/* Tabela de Honorários por Cliente */}
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
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Contratos & Mensalidades Ativas</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {activeClients.map((c) => {
            const feeFormatted = (c.monthly_fee_cents / 100).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            });

            return (
              <div
                key={c.id}
                style={{
                  background: "var(--mc-ink)",
                  border: "1px solid var(--mc-ink-border)",
                  borderRadius: "var(--mc-radius-sm)",
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--mc-text-title)" }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--mc-text-muted)", marginTop: 2 }}>
                    Segmento: {c.segment} · Categoria: {c.category}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(42,213,135,0.15)", color: "var(--mc-mint)" }}>
                    ATIVO
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "var(--mc-acid)" }}>
                    {feeFormatted}/mês
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Lançamento */}
      {modalOpen && (
        <div className="mc-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="mc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mc-modal__header">
              <h2>Novo Lançamento Financeiro</h2>
              <button
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 18 }}
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEntry}>
              <div className="mc-modal__body">
                <div className="mc-field">
                  <label>Descrição do Lançamento *</label>
                  <input
                    type="text"
                    className="mc-input"
                    placeholder="Ex: Mensalidade de Gestão de Conteúdo"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="mc-field">
                    <label>Cliente / Pagador</label>
                    <input
                      type="text"
                      className="mc-input"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>

                  <div className="mc-field">
                    <label>Valor (R$)</label>
                    <input
                      type="text"
                      className="mc-input"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mc-field">
                  <label>Tipo de Entrada</label>
                  <select className="mc-select" value={type} onChange={(e) => setType(e.target.value as any)}>
                    <option value="revenue_received">Recebido (Pago)</option>
                    <option value="revenue_expected">A Receber (Previsão)</option>
                    <option value="expense">Despesa Operacional</option>
                  </select>
                </div>
              </div>

              <div className="mc-modal__footer">
                <button type="button" className="mc-btn mc-btn--secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="mc-btn mc-btn--primary">
                  Registrar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
