import React from "react";
import type { Client, Deliverable, Task, Workspace } from "./types";

interface Props {
  workspace: Workspace;
  clients: Client[];
  tasks: Task[];
  deliverables: Deliverable[];
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<Props> = ({
  workspace,
  clients,
  tasks,
  deliverables,
  onNavigate,
}) => {
  const activeClients = clients.filter((c) => c.status === "active");
  const totalMRR = activeClients.reduce((acc, c) => acc + (c.monthly_fee_cents || 0), 0);
  const formattedMRR = (totalMRR / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const approvedDeliverables = deliverables.filter((d) => d.status === "approved" || d.status === "ready_to_publish" || d.status === "published");
  const pendingApprovalDeliverables = deliverables.filter((d) => d.status === "client_review");
  const inProductionDeliverables = deliverables.filter((d) => d.status === "production" || d.status === "internal_review");

  const approvalRate = deliverables.length > 0 ? Math.round((approvedDeliverables.length / deliverables.length) * 100) : 100;

  return (
    <div className="mc-content">
      {/* Header */}
      <div className="mc-view-header" style={{ padding: 0 }}>
        <div>
          <h2 className="mc-view-header__title">
            Dashboard Operacional — {workspace.name}
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--mc-text-muted)" }}>
            Visão executiva da agência: entregas, {tasks.length} demandas cadastradas, produtividade e faturamento.
          </p>
        </div>

        <button className="mc-btn mc-btn--acid" onClick={() => onNavigate("calendario")}>
          Novo Conteúdo
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="mc-counters">
        <div className="mc-counter-card">
          <span className="mc-counter-card__number mc-counter-card__number--neutral">{activeClients.length}</span>
          <span className="mc-counter-card__label">Clientes Ativos</span>
        </div>

        <div className="mc-counter-card">
          <span className="mc-counter-card__number mc-counter-card__number--warning">{formattedMRR}</span>
          <span className="mc-counter-card__label">Faturamento Mensal (MRR)</span>
        </div>

        <div className="mc-counter-card">
          <span className="mc-counter-card__number mc-counter-card__number--sky">{deliverables.length}</span>
          <span className="mc-counter-card__label">Peças Planejadas</span>
        </div>

        <div className="mc-counter-card">
          <span className="mc-counter-card__number mc-counter-card__number--danger">{approvalRate}%</span>
          <span className="mc-counter-card__label">Taxa de Aprovação</span>
        </div>
      </div>

      {/* Status da Esteira de Produção */}
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
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Esteira de Produção do Mês</h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <div style={{ background: "var(--mc-ink)", padding: 16, borderRadius: 10, border: "1px solid var(--mc-ink-border)" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--mc-caramel)" }}>EM PRODUÇÃO</span>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{inProductionDeliverables.length}</div>
            <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--mc-text-muted)" }}>
              Peças sendo redigidas ou diagramadas
            </p>
          </div>

          <div style={{ background: "var(--mc-ink)", padding: 16, borderRadius: 10, border: "1px solid var(--mc-ink-border)" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--mc-sky)" }}>AGUARDANDO CLIENTE</span>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{pendingApprovalDeliverables.length}</div>
            <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--mc-text-muted)" }}>
              Links enviados para aprovação por link
            </p>
          </div>

          <div style={{ background: "var(--mc-ink)", padding: 16, borderRadius: 10, border: "1px solid var(--mc-ink-border)" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--mc-acid)" }}>APROVADAS / PRONTAS</span>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{approvedDeliverables.length}</div>
            <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--mc-text-muted)" }}>
              Prontas para agendamento automático
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
