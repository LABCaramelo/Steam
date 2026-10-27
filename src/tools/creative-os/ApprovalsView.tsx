import React, { useState } from "react";
import type { CreativeOsRepository } from "./repo";
import type { Client, Deliverable, Workspace } from "./types";

interface Props {
  workspace: Workspace;
  clients: Client[];
  deliverables: Deliverable[];
  repo: CreativeOsRepository;
  onRefresh: () => void;
}

export const ApprovalsView: React.FC<Props> = ({
  workspace,
  clients,
  deliverables,
  repo,
  onRefresh,
}) => {
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>("all");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const pendingApprovals = deliverables.filter((d) => {
    const isReview = d.status === "client_review" || d.status === "internal_review" || d.status === "adjustments";
    const matchesClient = selectedClientFilter === "all" || d.client_id === selectedClientFilter;
    return isReview && matchesClient;
  });

  const approvedDeliverables = deliverables.filter((d) => {
    const isApproved = d.status === "approved" || d.status === "published";
    const matchesClient = selectedClientFilter === "all" || d.client_id === selectedClientFilter;
    return isApproved && matchesClient;
  });

  const handleGenerateShareForClient = async (clientId: string) => {
    try {
      const share = await repo.createClientShare(workspace.id, clientId, 14);
      const url = `${window.location.origin}/tools/creative-os/index.html?portal=${share.token}`;
      navigator.clipboard.writeText(url);
      setCopiedToken(share.token);
      onRefresh();
      setTimeout(() => setCopiedToken(null), 3000);
    } catch (err: any) {
      alert(err?.message || "Erro ao gerar link");
    }
  };

  return (
    <div>
      <div className="cos-view-header">
        <div>
          <h1 className="cos-view-header__title">Central de Aprovações & Revisões</h1>
          <p className="cos-view-header__subtitle">
            Acompanhe decisões de clientes, solicitações de alteração e links de revisão segura.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label className="cos-form-label" style={{ margin: 0 }}>Filtrar por Cliente:</label>
          <select
            className="cos-select"
            style={{ width: 220 }}
            value={selectedClientFilter}
            onChange={(e) => setSelectedClientFilter(e.target.value)}
          >
            <option value="all">Todos os Clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {copiedToken && (
        <div
          style={{
            background: "rgba(42, 213, 135, 0.15)",
            border: "1px solid var(--cos-mint)",
            color: "var(--cos-mint)",
            padding: "10px 16px",
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          ✓ Link seguro do portal do cliente copiado! O cliente poderá revisar e aprovar sem login na LAB.
        </div>
      )}

      {/* Grid of Sections: Pending Approvals & History */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Pending Approvals */}
        <div className="cos-card">
          <div className="cos-card__header">
            <h3 className="cos-card__title">Aguardando Retorno / Ajustes ({pendingApprovals.length})</h3>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="cos-empty-state" style={{ padding: "36px 16px" }}>
              <p className="cos-empty-state__title">Nenhuma aprovação pendente</p>
              <p className="cos-empty-state__text">Todas as peças foram aprovadas ou ainda estão em ideação inicial.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pendingApprovals.map((deliv) => {
                const client = clients.find((c) => c.id === deliv.client_id);
                const latestVersion = deliv.versions?.[0];
                return (
                  <div
                    key={deliv.id}
                    style={{
                      padding: 16,
                      background: "var(--cos-surface-2)",
                      border: "1px solid var(--cos-border)",
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <strong style={{ fontSize: 14 }}>{deliv.title}</strong>
                        <div style={{ fontSize: 12, color: "var(--cos-text-secondary)", marginTop: 2 }}>
                          {client?.name} · {deliv.format.toUpperCase()} · V{latestVersion?.version_number || 1}
                        </div>
                      </div>
                      <span className={`cos-badge cos-badge--${deliv.status}`}>
                        {deliv.status === "client_review"
                          ? "Com Cliente"
                          : deliv.status === "adjustments"
                            ? "Ajustes Solicitados"
                            : "Revisão Interna"}
                      </span>
                    </div>

                    {deliv.approvals && deliv.approvals.length > 0 && (
                      <div
                        style={{
                          background: "var(--cos-surface-3)",
                          borderLeft: "3px solid var(--cos-danger)",
                          padding: "8px 12px",
                          borderRadius: 4,
                          fontSize: 12,
                          marginTop: 8,
                        }}
                      >
                        <strong>Último Feedback ({deliv.approvals[0].decided_by_name}):</strong>{" "}
                        {deliv.approvals[0].feedback_text || "Solicitou alterações na peça."}
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                      <button
                        className="cos-btn cos-btn--secondary cos-btn--sm"
                        onClick={() => handleGenerateShareForClient(deliv.client_id)}
                      >
                        Copiar Link do Portal 🔗
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Approved History */}
        <div className="cos-card">
          <div className="cos-card__header">
            <h3 className="cos-card__title">Histórico de Aprovados ({approvedDeliverables.length})</h3>
          </div>

          {approvedDeliverables.length === 0 ? (
            <div className="cos-empty-state" style={{ padding: "36px 16px" }}>
              <p className="cos-empty-state__title">Nenhuma entrega aprovada ainda</p>
              <p className="cos-empty-state__text">Quando o cliente aprovar uma versão, ela aparecerá aqui com selo imutável.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {approvedDeliverables.map((deliv) => {
                const client = clients.find((c) => c.id === deliv.client_id);
                const approval = deliv.approvals?.find((a) => a.status === "approved");
                return (
                  <div
                    key={deliv.id}
                    style={{
                      padding: 16,
                      background: "var(--cos-surface-2)",
                      border: "1px solid var(--cos-border)",
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <strong style={{ fontSize: 14 }}>{deliv.title}</strong>
                        <div style={{ fontSize: 12, color: "var(--cos-text-secondary)", marginTop: 2 }}>
                          {client?.name} · {deliv.format.toUpperCase()}
                        </div>
                      </div>
                      <span className="cos-badge cos-badge--approved">Aprovado ✓</span>
                    </div>

                    {approval && (
                      <div style={{ fontSize: 11, color: "var(--cos-text-muted)", marginTop: 10 }}>
                        Aprovado por: <strong>{approval.decided_by_name}</strong> em{" "}
                        {new Date(approval.decided_at).toLocaleString("pt-BR")}
                        {approval.feedback_text && (
                          <div style={{ color: "var(--cos-mint)", marginTop: 4 }}>
                            "{approval.feedback_text}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
