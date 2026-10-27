import React, { useEffect, useState } from "react";
import type { CreativeOsRepository } from "./repo";
import type { Client, FinancialEntry, FinancialType, Project, Workspace } from "./types";

interface Props {
  workspace: Workspace;
  clients: Client[];
  projects: Project[];
  repo: CreativeOsRepository;
}

export const FinanceView: React.FC<Props> = ({ workspace, clients, projects, repo }) => {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [type, setType] = useState<FinancialType>("revenue_expected");
  const [amount, setAmount] = useState<number>(3500);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("honorario_mensal");
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await repo.getFinancialEntries(workspace.id);
      setEntries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [workspace.id]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0) return;
    try {
      await repo.createFinancialEntry({
        workspace_id: workspace.id,
        type,
        amount_cents: Math.round(amount * 100),
        currency: "BRL",
        description: description.trim(),
        category,
        client_id: clientId || undefined,
        project_id: projectId || undefined,
        date,
      });
      setDescription("");
      setModalOpen(false);
      loadEntries();
    } catch (err: any) {
      alert(err?.message || "Erro ao adicionar lançamento");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este lançamento financeiro?")) return;
    try {
      await repo.deleteFinancialEntry(id);
      loadEntries();
    } catch (err: any) {
      alert(err?.message || "Erro ao remover lançamento");
    }
  };

  // Aggregated metrics
  const totalRevenueExpected = entries
    .filter((e) => e.type === "revenue_expected")
    .reduce((acc, e) => acc + e.amount_cents, 0);

  const totalRevenueReceived = entries
    .filter((e) => e.type === "revenue_received")
    .reduce((acc, e) => acc + e.amount_cents, 0);

  const totalExpenses = entries
    .filter((e) => e.type === "expense")
    .reduce((acc, e) => acc + e.amount_cents, 0);

  const netBalance = totalRevenueReceived - totalExpenses;
  const estimatedMargin =
    totalRevenueReceived > 0
      ? Math.round((netBalance / totalRevenueReceived) * 100)
      : 0;

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div>
      <div className="cos-view-header">
        <div>
          <h1 className="cos-view-header__title">Controle Financeiro Leve</h1>
          <p className="cos-view-header__subtitle">
            Acompanhe receitas previstas, recebimentos realizados, custos e margem do estúdio.
          </p>
        </div>
        <button className="cos-btn cos-btn--primary" onClick={() => setModalOpen(true)}>
          + Novo Lançamento
        </button>
      </div>

      {/* Financial KPI Cards */}
      <div className="cos-kpi-grid">
        <div className="cos-kpi-card" style={{ "--kpi-accent": "var(--cos-sky)" } as any}>
          <div className="cos-kpi-card__label">Receita Prevista</div>
          <div className="cos-kpi-card__value">{formatCurrency(totalRevenueExpected)}</div>
          <div className="cos-kpi-card__meta">A faturar no período</div>
        </div>

        <div className="cos-kpi-card" style={{ "--kpi-accent": "var(--cos-mint)" } as any}>
          <div className="cos-kpi-card__label">Receita Realizada</div>
          <div className="cos-kpi-card__value">{formatCurrency(totalRevenueReceived)}</div>
          <div className="cos-kpi-card__meta">Entradas confirmadas</div>
        </div>

        <div className="cos-kpi-card" style={{ "--kpi-accent": "var(--cos-danger)" } as any}>
          <div className="cos-kpi-card__label">Despesas Operacionais</div>
          <div className="cos-kpi-card__value">{formatCurrency(totalExpenses)}</div>
          <div className="cos-kpi-card__meta">Custos diretos e softwares</div>
        </div>

        <div className="cos-kpi-card" style={{ "--kpi-accent": "var(--cos-accent)" } as any}>
          <div className="cos-kpi-card__label">Saldo Líquido / Margem</div>
          <div className="cos-kpi-card__value">{formatCurrency(netBalance)}</div>
          <div className="cos-kpi-card__meta">Margem estimada: {estimatedMargin}%</div>
        </div>
      </div>

      {/* Entries Table */}
      <div className="cos-card">
        <div className="cos-card__header">
          <h3 className="cos-card__title">Lançamentos Recentes ({entries.length})</h3>
        </div>

        {loading ? (
          <p style={{ color: "var(--cos-text-muted)" }}>Carregando dados financeiros…</p>
        ) : entries.length === 0 ? (
          <div className="cos-empty-state" style={{ padding: "36px 16px" }}>
            <p className="cos-empty-state__title">Nenhum lançamento financeiro</p>
            <p className="cos-empty-state__text">Registre mensalidades ou despesas para visualizar o balanço da operação.</p>
            <button className="cos-btn cos-btn--secondary cos-btn--sm" onClick={() => setModalOpen(true)}>
              Adicionar Lançamento
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {entries.map((entry) => {
              const client = clients.find((c) => c.id === entry.client_id);
              const isExpense = entry.type === "expense";
              const isReceived = entry.type === "revenue_received";
              return (
                <div
                  key={entry.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: "var(--cos-surface-2)",
                    border: "1px solid var(--cos-border)",
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 14 }}>{entry.description}</strong>
                    <div style={{ fontSize: 12, color: "var(--cos-text-secondary)", marginTop: 2 }}>
                      {entry.date} · {entry.category} {client && `· ${client.name}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span
                      style={{
                        fontFamily: "Montserrat, sans-serif",
                        fontWeight: 900,
                        fontSize: 15,
                        color: isExpense
                          ? "var(--cos-danger)"
                          : isReceived
                            ? "var(--cos-mint)"
                            : "var(--cos-sky)",
                      }}
                    >
                      {isExpense ? "-" : "+"} {formatCurrency(entry.amount_cents)}
                    </span>
                    <button
                      className="cos-btn cos-btn--ghost cos-btn--sm"
                      onClick={() => handleDelete(entry.id)}
                      style={{ color: "var(--cos-text-muted)" }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Entry Modal */}
      {modalOpen && (
        <div className="cos-modal-overlay">
          <div className="cos-modal">
            <div className="cos-modal__header">
              <h3 className="cos-modal__title">Novo Lançamento Financeiro</h3>
              <button className="cos-btn cos-btn--ghost cos-btn--sm" onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateEntry}>
              <div className="cos-modal__body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="cos-form-group">
                    <label className="cos-form-label">Tipo de Movimentação</label>
                    <select className="cos-select" value={type} onChange={(e) => setType(e.target.value as any)}>
                      <option value="revenue_expected">Receita Prevista (A faturar)</option>
                      <option value="revenue_received">Receita Realizada (Recebido)</option>
                      <option value="expense">Despesa / Custo Operacional</option>
                    </select>
                  </div>
                  <div className="cos-form-group">
                    <label className="cos-form-label">Valor (R$)</label>
                    <input
                      type="number"
                      className="cos-input"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="cos-form-group">
                  <label className="cos-form-label">Descrição</label>
                  <input
                    type="text"
                    className="cos-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Mensalidade Gestão Novembro ou Assinatura de Software"
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="cos-form-group">
                    <label className="cos-form-label">Categoria</label>
                    <select className="cos-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="honorario_mensal">Honorário Mensal / Retainer</option>
                      <option value="producao_avulsa">Produção Avulsa / Projeto</option>
                      <option value="consultoria">Consultoria Estratégica</option>
                      <option value="ferramentas_software">Ferramentas & Software</option>
                      <option value="equipe_colaboradores">Equipe / Terceirizados</option>
                      <option value="outros">Outros Lançamentos</option>
                    </select>
                  </div>
                  <div className="cos-form-group">
                    <label className="cos-form-label">Projeto (Opcional)</label>
                    <select className="cos-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                      <option value="">Geral / Sem Projeto Específico</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="cos-form-group">
                    <label className="cos-form-label">Cliente (Opcional)</label>
                    <select className="cos-select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                      <option value="">Nenhum / Custo Geral</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="cos-form-group">
                    <label className="cos-form-label">Data</label>
                    <input
                      type="date"
                      className="cos-input"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="cos-modal__footer">
                <button type="button" className="cos-btn cos-btn--ghost" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="cos-btn cos-btn--primary" disabled={!description.trim()}>
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
