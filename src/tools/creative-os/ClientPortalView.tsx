import React, { useEffect, useState } from "react";
import type { CreativeOsRepository } from "./repo";

interface Props {
  token: string;
  repo: CreativeOsRepository;
}

export const ClientPortalView: React.FC<Props> = ({ token, repo }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [feedbackDeliverable, setFeedbackDeliverable] = useState<any | null>(null);
  const [decisionStatus, setDecisionStatus] = useState<"approved" | "changes_requested">("approved");
  const [feedbackText, setFeedbackText] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadPortalData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await repo.getPortalData(token);
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Link de aprovação inválido, revogado ou expirado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, [token]);

  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackDeliverable || !clientName.trim()) return;
    const latestVersion = feedbackDeliverable.versions?.[0];
    if (!latestVersion) return;

    setSubmitting(true);
    try {
      await repo.submitClientDecision(
        token,
        feedbackDeliverable.id,
        latestVersion.id,
        decisionStatus,
        feedbackText.trim(),
        clientName.trim(),
        clientEmail.trim(),
      );
      setActionSuccess(
        decisionStatus === "approved"
          ? "Entrega aprovada com sucesso! A equipe de produção foi notificada."
          : "Solicitação de ajustes enviada com sucesso! A equipe irá revisar a peça.",
      );
      setFeedbackDeliverable(null);
      setFeedbackText("");
      await loadPortalData();
    } catch (err: any) {
      alert(err?.message || "Erro ao registrar decisão");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="cos-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--cos-text-secondary)" }}>Carregando portal de aprovação seguro…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="cos-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="cos-card" style={{ maxWidth: 480, textAlign: "center" }}>
          <span style={{ fontSize: 32, display: "block", marginBottom: 12 }}>🔒</span>
          <h2 style={{ margin: "0 0 8px 0" }}>Acesso Indisponível</h2>
          <p style={{ fontSize: 14, color: "var(--cos-text-secondary)", margin: "0 0 16px 0" }}>
            {error || "O link acessado é inválido ou já expirou. Solicite um novo link ao seu Head de Conteúdo."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="cos-shell">
      {/* Portal Header */}
      <header className="cos-portal-header">
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--cos-accent)",
          }}
        >
          {data.workspace_name} · PORTAL DE REVISÃO DO CLIENTE
        </span>
        <h1
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontSize: 28,
            fontWeight: 900,
            margin: "8px 0 4px 0",
            letterSpacing: "-0.03em",
          }}
        >
          Aprovações de {data.client_name}
        </h1>
        {data.brand_tone && (
          <p style={{ fontSize: 13, color: "var(--cos-text-secondary)", margin: 0 }}>
            Diretriz da Marca: "{data.brand_tone}"
          </p>
        )}
      </header>

      {/* Main Content */}
      <main className="cos-portal-container">
        {actionSuccess && (
          <div
            style={{
              background: "rgba(42, 213, 135, 0.15)",
              border: "1px solid var(--cos-mint)",
              color: "var(--cos-mint)",
              padding: "14px 18px",
              borderRadius: 8,
              fontSize: 14,
              marginBottom: 24,
            }}
          >
            ✓ {actionSuccess}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Entregas para Revisão & Aprovação</h2>
          <span style={{ fontSize: 13, color: "var(--cos-text-muted)" }}>
            {data.deliverables?.length || 0} peças disponíveis
          </span>
        </div>

        {data.deliverables?.length === 0 ? (
          <div className="cos-empty-state">
            <p className="cos-empty-state__title">Nenhuma peça aguardando revisão</p>
            <p className="cos-empty-state__text">
              Todas as peças compartilhadas já foram aprovadas ou estão em fase de produção interna.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {data.deliverables.map((deliv: any) => {
              const latestVersion = deliv.versions?.[0];
              const isApproved = deliv.status === "approved" || deliv.status === "published";
              return (
                <div key={deliv.id} className="cos-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <h3 style={{ margin: "0 0 4px 0", fontSize: 18, fontWeight: 800 }}>{deliv.title}</h3>
                      <div style={{ fontSize: 13, color: "var(--cos-text-secondary)" }}>
                        {deliv.format?.toUpperCase()} · {deliv.channel}
                        {deliv.scheduled_date && (
                          <span> · Previsão: {new Date(deliv.scheduled_date).toLocaleDateString("pt-BR")}</span>
                        )}
                      </div>
                    </div>
                    <span className={`cos-badge cos-badge--${deliv.status}`}>
                      {isApproved ? "Aprovado ✓" : deliv.status === "adjustments" ? "Ajustes Solicitados" : "Em Revisão"}
                    </span>
                  </div>

                  {latestVersion ? (
                    <div
                      style={{
                        background: "var(--cos-surface-2)",
                        border: "1px solid var(--cos-border)",
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 16,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <strong style={{ fontSize: 12, color: "var(--cos-accent)" }}>
                          {latestVersion.title || `Versão ${latestVersion.version_number}`}
                        </strong>
                        <span style={{ fontSize: 11, color: "var(--cos-text-muted)" }}>
                          {new Date(latestVersion.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          fontSize: 14,
                          lineHeight: 1.6,
                          color: "var(--cos-text-primary)",
                        }}
                      >
                        {latestVersion.copy_text}
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--cos-text-muted)" }}>Rascunho de pauta em elaboração.</p>
                  )}

                  {/* Comments from Team & Client */}
                  {deliv.comments && deliv.comments.length > 0 && (
                    <div style={{ marginTop: 12, borderTop: "1px solid var(--cos-border)", paddingTop: 12 }}>
                      <strong style={{ fontSize: 12, color: "var(--cos-text-secondary)" }}>Comentários:</strong>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                        {deliv.comments.map((c: any) => (
                          <div
                            key={c.id}
                            style={{
                              fontSize: 12,
                              background: "var(--cos-surface-2)",
                              padding: "6px 10px",
                              borderRadius: 6,
                            }}
                          >
                            <span style={{ fontWeight: 700 }}>{c.author_name}:</span> {c.comment_text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                    {!isApproved && (
                      <>
                        <button
                          className="cos-btn cos-btn--secondary"
                          onClick={() => {
                            setFeedbackDeliverable(deliv);
                            setDecisionStatus("changes_requested");
                          }}
                        >
                          Pedir Alterações ✍️
                        </button>
                        <button
                          className="cos-btn cos-btn--primary"
                          onClick={() => {
                            setFeedbackDeliverable(deliv);
                            setDecisionStatus("approved");
                          }}
                        >
                          Aprovar Peça ✓
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Decision Modal */}
      {feedbackDeliverable && (
        <div className="cos-modal-overlay">
          <div className="cos-modal" style={{ maxWidth: 540 }}>
            <div className="cos-modal__header">
              <h3 className="cos-modal__title">
                {decisionStatus === "approved" ? "Aprovar Entrega" : "Solicitar Alterações"}
              </h3>
              <button className="cos-btn cos-btn--ghost cos-btn--sm" onClick={() => setFeedbackDeliverable(null)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitDecision}>
              <div className="cos-modal__body">
                <p style={{ fontSize: 13, color: "var(--cos-text-secondary)", margin: "0 0 16px 0" }}>
                  Você está avaliando a entrega: <strong>{feedbackDeliverable.title}</strong>
                </p>

                <div className="cos-form-group">
                  <label className="cos-form-label">Seu Nome Completo</label>
                  <input
                    type="text"
                    className="cos-input"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Carlos Andrade"
                    required
                  />
                </div>

                <div className="cos-form-group">
                  <label className="cos-form-label">Seu E-mail (Opcional)</label>
                  <input
                    type="email"
                    className="cos-input"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="carlos@empresa.com"
                  />
                </div>

                <div className="cos-form-group">
                  <label className="cos-form-label">
                    {decisionStatus === "approved" ? "Comentário de Aprovação (Opcional)" : "O que deve ser ajustado?"}
                  </label>
                  <textarea
                    className="cos-textarea"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={
                      decisionStatus === "approved"
                        ? "Ex: Aprovado, pode seguir para agendamento!"
                        : "Ex: Ajustar o gancho do primeiro slide para enfatizar o público B2B."
                    }
                    rows={4}
                    required={decisionStatus === "changes_requested"}
                  />
                </div>
              </div>
              <div className="cos-modal__footer">
                <button type="button" className="cos-btn cos-btn--ghost" onClick={() => setFeedbackDeliverable(null)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`cos-btn ${decisionStatus === "approved" ? "cos-btn--primary" : "cos-btn--secondary"}`}
                  disabled={submitting || !clientName.trim()}
                >
                  {submitting
                    ? "Registrando…"
                    : decisionStatus === "approved"
                      ? "Confirmar Aprovação ✓"
                      : "Enviar Ajustes ↗"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
