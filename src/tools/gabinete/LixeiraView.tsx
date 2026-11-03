import React from "react";
import type { Client, Deliverable, Task, Workspace } from "./types";
import type { GabineteRepository } from "./repo";

interface Props {
  workspace: Workspace;
  clients: Client[];
  tasks: Task[];
  deliverables: Deliverable[];
  repo: GabineteRepository;
  onRefresh: () => void;
}

export const LixeiraView: React.FC<Props> = ({
  workspace,
  clients,
  tasks,
  deliverables,
  repo,
  onRefresh,
}) => {
  const archivedClients = clients.filter((c) => c.status === "archived");
  const archivedTasks = tasks.filter((t) => t.is_archived);
  const archivedDeliverables = deliverables.filter((d) => d.is_archived);

  const totalArchived = archivedClients.length + archivedTasks.length + archivedDeliverables.length;

  return (
    <div className="mc-content">
      <div className="mc-view-header" style={{ padding: 0 }}>
        <div>
          <h2 className="mc-view-header__title">
            <span>🗑️</span> Lixeira & Central de Restauração
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--mc-text-muted)" }}>
            Itens arquivados no estúdio {workspace.name} podem ser restaurados com segurança.
          </p>
        </div>
      </div>

      {totalArchived === 0 ? (
        <div
          style={{
            background: "var(--mc-ink-surface)",
            border: "1px solid var(--mc-ink-border)",
            borderRadius: "var(--mc-radius-lg)",
            padding: "60px 20px",
            textAlign: "center",
            color: "var(--mc-text-muted)",
          }}
        >
          <span style={{ fontSize: 36 }}>✨</span>
          <p style={{ marginTop: 8, fontSize: 14 }}>A lixeira está completamente limpa!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Tarefas Arquivadas */}
          {archivedTasks.length > 0 && (
            <div style={{ background: "var(--mc-ink-surface)", padding: 20, borderRadius: 12, border: "1px solid var(--mc-ink-border)" }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 700 }}>Demandas Arquivadas ({archivedTasks.length})</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {archivedTasks.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      background: "var(--mc-ink)",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--mc-ink-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{t.title}</span>
                    <button
                      className="mc-btn mc-btn--secondary"
                      style={{ fontSize: 11, padding: "3px 8px" }}
                      onClick={async () => {
                        await repo.restoreTask(t.id);
                        onRefresh();
                      }}
                    >
                      Restaurar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clientes Arquivados */}
          {archivedClients.length > 0 && (
            <div style={{ background: "var(--mc-ink-surface)", padding: 20, borderRadius: 12, border: "1px solid var(--mc-ink-border)" }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 700 }}>Clientes Arquivados ({archivedClients.length})</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {archivedClients.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: "var(--mc-ink)",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--mc-ink-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{c.name} ({c.segment})</span>
                    <button
                      className="mc-btn mc-btn--secondary"
                      style={{ fontSize: 11, padding: "3px 8px" }}
                      onClick={async () => {
                        await repo.restoreClient(c.id);
                        onRefresh();
                      }}
                    >
                      Restaurar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
