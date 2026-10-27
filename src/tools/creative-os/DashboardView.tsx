import React from "react";
import type { Client, Deliverable, Project, Task, Workspace } from "./types";

interface Props {
  workspace: Workspace;
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  deliverables: Deliverable[];
  onNavigate: (tab: string) => void;
  onOpenAiAssistant: () => void;
  onOpenNewClientModal: () => void;
  onOpenNewDeliverableModal: () => void;
}

export const DashboardView: React.FC<Props> = ({
  workspace,
  clients,
  projects,
  tasks,
  deliverables,
  onNavigate,
  onOpenAiAssistant,
  onOpenNewClientModal,
  onOpenNewDeliverableModal,
}) => {
  const activeProjects = projects.filter((p) => p.status === "active");
  const inReviewDeliverables = deliverables.filter(
    (d) => d.status === "client_review" || d.status === "internal_review",
  );
  const pendingApprovals = deliverables.filter((d) => d.status === "client_review");
  const pendingTasks = tasks.filter((t) => t.status !== "done");

  const totalMonthlyFee = clients
    .filter((c) => c.status === "active")
    .reduce((acc, c) => acc + (c.monthly_fee_cents || 0), 0);

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div>
      {/* Header */}
      <div className="cos-view-header">
        <div>
          <h1 className="cos-view-header__title">Visão Geral da Operação</h1>
          <p className="cos-view-header__subtitle">
            Estúdio: <strong>{workspace.name}</strong> · Operação em tempo real.
          </p>
        </div>
        <div className="cos-actions-bar">
          <button className="cos-btn cos-btn--secondary" onClick={onOpenAiAssistant}>
            ✨ Assistente IA
          </button>
          <button className="cos-btn cos-btn--secondary" onClick={onOpenNewClientModal}>
            + Novo Cliente
          </button>
          <button className="cos-btn cos-btn--primary" onClick={onOpenNewDeliverableModal}>
            + Nova Entrega
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="cos-kpi-grid">
        <div className="cos-kpi-card" style={{ "--kpi-accent": "var(--cos-accent)" } as any}>
          <div className="cos-kpi-card__label">Projetos Ativos</div>
          <div className="cos-kpi-card__value">{activeProjects.length}</div>
          <div className="cos-kpi-card__meta">{projects.length} projetos cadastrados</div>
        </div>

        <div className="cos-kpi-card" style={{ "--kpi-accent": "var(--cos-yellow)" } as any}>
          <div className="cos-kpi-card__label">Aprovações Pendentes</div>
          <div className="cos-kpi-card__value">{pendingApprovals.length}</div>
          <div className="cos-kpi-card__meta">Aguardando retorno do cliente</div>
        </div>

        <div className="cos-kpi-card" style={{ "--kpi-accent": "var(--cos-sky)" } as any}>
          <div className="cos-kpi-card__label">Entregas em Produção / Revisão</div>
          <div className="cos-kpi-card__value">{inReviewDeliverables.length}</div>
          <div className="cos-kpi-card__meta">Grade editorial em andamento</div>
        </div>

        <div className="cos-kpi-card" style={{ "--kpi-accent": "var(--cos-mint)" } as any}>
          <div className="cos-kpi-card__label">Receita Recorrente (MRR)</div>
          <div className="cos-kpi-card__value" style={{ fontSize: 22 }}>
            {formatCurrency(totalMonthlyFee)}
          </div>
          <div className="cos-kpi-card__meta">{clients.filter((c) => c.status === "active").length} clientes ativos</div>
        </div>
      </div>

      {/* Content Columns: Deliverables awaiting approval & Tasks */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 20 }}>
        {/* Left: Pending Approvals & Content in Review */}
        <div className="cos-card">
          <div className="cos-card__header">
            <h3 className="cos-card__title">Aprovações & Conteúdo em Revisão</h3>
            <button className="cos-btn cos-btn--ghost cos-btn--sm" onClick={() => onNavigate("approvals")}>
              Ver todas →
            </button>
          </div>

          {inReviewDeliverables.length === 0 ? (
            <div className="cos-empty-state" style={{ padding: "32px 16px" }}>
              <p className="cos-empty-state__title">Tudo limpo por aqui</p>
              <p className="cos-empty-state__text">Nenhuma entrega aguardando revisão ou aprovação no momento.</p>
              <button className="cos-btn cos-btn--secondary cos-btn--sm" onClick={onOpenNewDeliverableModal}>
                Criar Entrega
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {inReviewDeliverables.slice(0, 5).map((deliv) => {
                const client = clients.find((c) => c.id === deliv.client_id);
                return (
                  <div
                    key={deliv.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      background: "var(--cos-surface-2)",
                      border: "1px solid var(--cos-border)",
                      borderRadius: 8,
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{deliv.title}</div>
                      <div style={{ fontSize: 12, color: "var(--cos-text-secondary)", marginTop: 2 }}>
                        {client?.name || "Cliente"} · {deliv.format.toUpperCase()} · {deliv.channel}
                      </div>
                    </div>
                    <span className={`cos-badge cos-badge--${deliv.status}`}>
                      {deliv.status === "client_review" ? "Revisão Cliente" : "Revisão Interna"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Pending Tasks & Workload */}
        <div className="cos-card">
          <div className="cos-card__header">
            <h3 className="cos-card__title">Tarefas Operacionais</h3>
            <button className="cos-btn cos-btn--ghost cos-btn--sm" onClick={() => onNavigate("projects")}>
              Ver projetos →
            </button>
          </div>

          {pendingTasks.length === 0 ? (
            <div className="cos-empty-state" style={{ padding: "32px 16px" }}>
              <p className="cos-empty-state__title">Nenhuma tarefa pendente</p>
              <p className="cos-empty-state__text">Crie um projeto ou adicione tarefas para organizar a semana.</p>
              <button className="cos-btn cos-btn--secondary cos-btn--sm" onClick={() => onNavigate("projects")}>
                Ir para Projetos
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pendingTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    background: "var(--cos-surface-2)",
                    border: "1px solid var(--cos-border)",
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{task.title}</div>
                    {task.due_date && (
                      <div style={{ fontSize: 11, color: "var(--cos-accent)", marginTop: 2 }}>
                        Prazo: {new Date(task.due_date).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color:
                        task.priority === "urgent"
                          ? "var(--cos-danger)"
                          : task.priority === "high"
                            ? "var(--cos-accent)"
                            : "var(--cos-text-secondary)",
                    }}
                  >
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
