import React from "react";
import type { Deliverable, Task, Workspace } from "./types";

interface Props {
  workspace: Workspace;
  deliverables: Deliverable[];
  tasks: Task[];
}

export const RelatoriosView: React.FC<Props> = ({ workspace, deliverables, tasks }) => {
  const completedTasks = tasks.filter((t) => t.status === "done");
  const approvedDeliverables = deliverables.filter(
    (d) => d.status === "approved" || d.status === "ready_to_publish" || d.status === "published"
  );

  return (
    <div className="mc-content">
      <div className="mc-view-header" style={{ padding: 0 }}>
        <div>
          <h2 className="mc-view-header__title">
            <span>📈</span> Relatórios de Produtividade & Velocidade
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--mc-text-muted)" }}>
            Métricas de entrega, ritmo de finalização da equipe do estúdio {workspace.name} e taxa de aprovação sem refações.
          </p>
        </div>
      </div>

      <div className="mc-counters">
        <div className="mc-counter-card">
          <span className="mc-counter-card__number mc-counter-card__number--sky">{deliverables.length}</span>
          <span className="mc-counter-card__label">Total de Peças Criadas</span>
        </div>

        <div className="mc-counter-card">
          <span className="mc-counter-card__number mc-counter-card__number--neutral">{approvedDeliverables.length}</span>
          <span className="mc-counter-card__label">Peças Aprovadas</span>
        </div>

        <div className="mc-counter-card">
          <span className="mc-counter-card__number mc-counter-card__number--warning">{completedTasks.length}</span>
          <span className="mc-counter-card__label">Demandas Concluídas</span>
        </div>

        <div className="mc-counter-card">
          <span className="mc-counter-card__number mc-counter-card__number--danger">1.2 dias</span>
          <span className="mc-counter-card__label">Tempo Médio de Aprovação</span>
        </div>
      </div>

      {/* Relatório de Velocidade por Membro */}
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
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Produtividade & Entregas da Equipe</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { name: "Luiz (Head de Conteúdo)", role: "Head & Estratégia", completed: 18, speed: "Alta", bar: "92%" },
            { name: "Copywriter Sênior", role: "Roteiros & Carrosséis", completed: 14, speed: "Ótima", bar: "80%" },
            { name: "Designer de Interação", role: "Artes & Diagramação", completed: 12, speed: "Constante", bar: "72%" },
          ].map((m, idx) => (
            <div
              key={idx}
              style={{
                background: "var(--mc-ink)",
                border: "1px solid var(--mc-ink-border)",
                borderRadius: "var(--mc-radius-md)",
                padding: "14px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "var(--mc-text-title)" }}>{m.name}</span>
                  <span style={{ marginLeft: 8, fontSize: 11, color: "var(--mc-text-muted)" }}>({m.role})</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mc-acid)" }}>
                  {m.completed} entregas no mês
                </span>
              </div>

              {/* Barra de Progresso */}
              <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: m.bar, height: "100%", background: "var(--mc-caramel)", borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
