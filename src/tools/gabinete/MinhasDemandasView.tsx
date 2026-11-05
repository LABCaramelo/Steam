import React, { useState } from "react";
import { MagneticButton } from "@caramelo/design-system";
import { useOptionalToolUser } from "../shared/kit";
import type { Client, Deliverable, Task, Workspace, WorkspaceMember } from "./types";
import { IconUser, IconCheckCircle, IconAlertTriangle } from "./Icons";

interface Props {
  workspace: Workspace;
  tasks: Task[];
  deliverables: Deliverable[];
  clients: Client[];
  members: WorkspaceMember[];
  onNavigate: (tab: string) => void;
  onOpenNewTaskModal: () => void;
  onToggleTaskComplete: (task: Task) => void;
}

export const MinhasDemandasView: React.FC<Props> = ({
  workspace,
  tasks,
  deliverables,
  clients,
  members,
  onNavigate: _onNavigate,
  onOpenNewTaskModal,
  onToggleTaskComplete,
}) => {
  const toolUser = useOptionalToolUser();
  const firstName = (toolUser?.nickname || toolUser?.name || "Luiz").trim().split(" ")[0] || "Luiz";
  const [selectedMember, setSelectedMember] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const todayStr = new Date().toISOString().slice(0, 10);

  // Filtro por responsável
  const isTaskAssignedToMember = (t: Task, memberName: string) => {
    if (memberName === "all") return true;
    if (t.assignee_name === memberName) return true;
    if (
      memberName.toLowerCase().startsWith("luiz") &&
      (!t.assignee_name || t.assignee_name === "Luiz (eu)" || t.assignee_name.toLowerCase().startsWith("luiz"))
    ) {
      return true;
    }
    return false;
  };

  const memberTasks = tasks.filter((t) => isTaskAssignedToMember(t, selectedMember));

  // Contadores
  const overdueTasks = memberTasks.filter((t) => t.status !== "done" && t.due_date && t.due_date < todayStr);
  const todayTasks = memberTasks.filter((t) => t.status !== "done" && t.due_date === todayStr);
  const next7DaysStr = new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10);
  const next7DaysTasks = memberTasks.filter(
    (t) => t.status !== "done" && t.due_date && t.due_date > todayStr && t.due_date <= next7DaysStr
  );
  const allOpenTasks = memberTasks.filter((t) => t.status !== "done" && !t.is_archived);

  const filteredTasks = allOpenTasks.filter((t) => {
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  return (
    <div className="mc-content">
      {/* Header com Saudação */}
      <div className="mc-view-header" style={{ padding: "0 0 16px 0" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--mc-text-muted)" }}>
              MINHAS DEMANDAS · {workspace.name} ({deliverables.length} peças ativas)
            </span>
            <span className="cm-type-hand" style={{ fontSize: 16 }}>
              bastidor em ação
            </span>
          </div>
          <h1 className="mc-view-header__title" style={{ marginTop: 4 }}>
            Olá, {firstName}!
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Seletor "Ver como" */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--mc-text-muted)" }}>
            <span>Ver como:</span>
            <select
              className="mc-select"
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              style={{ padding: "6px 10px", fontSize: 12.5 }}
            >
              <option value="all">Toda a equipe</option>
              {members.map((m) => {
                const isYou =
                  m.role === "owner" ||
                  m.member_type === "adm_master" ||
                  (toolUser?.name && m.name.toLowerCase() === toolUser.name.toLowerCase()) ||
                  m.name.toLowerCase().startsWith("luiz");
                return (
                  <option key={m.id} value={m.name}>
                    {m.name}{isYou ? " (você)" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <MagneticButton
            variant="accent"
            size="sm"
            data-tour="btn-nova-demanda"
            onClick={onOpenNewTaskModal}
          >
            + Nova demanda
          </MagneticButton>
        </div>
      </div>

      {/* Contadores de Tarefas */}
      <div className="mc-counters" data-tour="counters-demandas">
        <div className="mc-counter-card cm-surface--spotlight">
          <span className="mc-counter-card__number mc-counter-card__number--danger">
            {overdueTasks.length}
          </span>
          <span className="mc-counter-card__label">Atrasadas</span>
        </div>

        <div className="mc-counter-card cm-surface--spotlight">
          <span className="mc-counter-card__number mc-counter-card__number--warning">
            {todayTasks.length}
          </span>
          <span className="mc-counter-card__label">Para hoje</span>
        </div>

        <div className="mc-counter-card cm-surface--spotlight">
          <span className="mc-counter-card__number mc-counter-card__number--sky">
            {next7DaysTasks.length}
          </span>
          <span className="mc-counter-card__label">Próximos 7 dias</span>
        </div>

        <div className="mc-counter-card cm-surface--spotlight">
          <span className="mc-counter-card__number mc-counter-card__number--neutral">
            {allOpenTasks.length}
          </span>
          <span className="mc-counter-card__label">Todas abertas</span>
        </div>
      </div>

      {/* Lista de Demandas Operacionais */}
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
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Minhas Demandas em Andamento</h3>
            <p style={{ margin: "4px 0 0 0", fontSize: 12.5, color: "var(--mc-text-muted)" }}>
              Gerencie seus prazos e checklist de execução diária.
            </p>
          </div>

          <div className="cm-showcase-tabs" data-tour="filtro-prioridades">
            {["all", "urgent", "high", "medium"].map((p) => (
              <button
                key={p}
                className={`cm-showcase-tab ${filterPriority === p ? "is-active" : ""}`}
                onClick={() => setFilterPriority(p)}
              >
                {p === "all" ? "Todas" : p === "urgent" ? "Urgentes" : p === "high" ? "Alta" : "Média"}
              </button>
            ))}
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--mc-text-muted)" }}>
            <span style={{ display: "inline-flex", color: "var(--mc-caramel)", opacity: 0.8 }}>
              <IconCheckCircle size={32} />
            </span>
            <p style={{ marginTop: 8, fontSize: 14 }}>Tudo limpo! Nenhuma demanda pendente por aqui.</p>
            <button className="mc-btn mc-btn--primary" style={{ marginTop: 8 }} onClick={onOpenNewTaskModal}>
              + Criar nova demanda
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredTasks.map((t) => {
              const client = clients.find((c) => c.id === t.client_id);
              const isOverdue = t.due_date && t.due_date < todayStr;
              const isToday = t.due_date === todayStr;

              return (
                <div
                  key={t.id}
                  style={{
                    background: "var(--mc-ink)",
                    border: "1px solid var(--mc-ink-border)",
                    borderRadius: "var(--mc-radius-md)",
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={t.status === "done"}
                      onChange={() => onToggleTaskComplete(t)}
                      style={{ marginTop: 4, width: 16, height: 16, cursor: "pointer", accentColor: "var(--mc-caramel)" }}
                    />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: "var(--mc-text-title)" }}>
                          {t.title}
                        </span>
                        {client && (
                          <span
                            style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: client.color ? `${client.color}22` : "rgba(255,112,26,0.15)",
                              color: client.color || "var(--mc-caramel)",
                              fontWeight: 600,
                            }}
                          >
                            {client.name}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background:
                              t.priority === "urgent"
                                ? "rgba(255,77,77,0.2)"
                                : t.priority === "high"
                                ? "rgba(255,112,26,0.2)"
                                : "rgba(255,255,255,0.06)",
                            color:
                              t.priority === "urgent"
                                ? "var(--mc-danger)"
                                : t.priority === "high"
                                ? "var(--mc-caramel)"
                                : "var(--mc-text-muted)",
                            fontWeight: 700,
                          }}
                        >
                          {t.priority.toUpperCase()}
                        </span>
                      </div>

                      {t.description && (
                        <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--mc-text-muted)" }}>
                          {t.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    {t.due_date && (
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: isOverdue ? "var(--mc-danger)" : isToday ? "var(--mc-caramel)" : "var(--mc-text-muted)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {isOverdue && <IconAlertTriangle size={12} />}
                        {isOverdue ? "Atrasada" : isToday ? "Vence hoje" : `Prazo: ${t.due_date}`}
                      </span>
                    )}

                    <span style={{ fontSize: 12, color: "var(--mc-text-muted)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <IconUser size={13} /> {t.assignee_name === "Luiz (eu)" ? "Luiz" : (t.assignee_name || "Luiz")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
