import React, { useEffect, useState } from "react";
import type { Deliverable } from "./types";
import { IconCheckCircle } from "./Icons";
import type { GabineteRepository } from "./repo";

interface Props {
  token: string;
  repo: GabineteRepository;
}

export const ClientPortalView: React.FC<Props> = ({ token, repo }) => {
  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Decisão
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [feedback, setFeedback] = useState("");
  const [clientName, setClientName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await repo.getPortalData(token);
      setPortalData(data);
      if (data.deliverables?.length > 0) {
        setSelectedDeliverable(data.deliverables[0]);
      }
    } catch (err: any) {
      setError(err?.message || "Não foi possível carregar os dados de aprovação.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleDecision = async (status: "approved" | "changes_requested") => {
    if (!selectedDeliverable) return;
    setSubmitting(true);
    try {
      await repo.submitClientDecision(
        token,
        selectedDeliverable.id,
        "v1",
        status,
        feedback,
        clientName || portalData?.client?.name || "Cliente"
      );
      alert(status === "approved" ? "Conteúdo aprovado com sucesso!" : "Ajustes solicitados com sucesso!");
      setFeedback("");
      loadData();
    } catch (err: any) {
      alert("Erro ao enviar decisão: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "calc(100vh / var(--ui-zoom, 1))", display: "flex", alignItems: "center", justifyContent: "center", background: "#101014", color: "#fff4e8" }}>
        <p>Carregando portal de aprovação seguro…</p>
      </div>
    );
  }

  if (error || !portalData) {
    return (
      <div style={{ minHeight: "calc(100vh / var(--ui-zoom, 1))", display: "flex", alignItems: "center", justifyContent: "center", background: "#101014", color: "#fff4e8", flexDirection: "column" }}>
        <h2>Link não encontrado ou expirado</h2>
        <p style={{ opacity: 0.6 }}>{error || "Peça ao seu Head de Conteúdo um novo link de aprovação."}</p>
      </div>
    );
  }

  const { client, workspace, deliverables } = portalData;

  return (
    <div style={{ minHeight: "calc(100vh / var(--ui-zoom, 1))", background: "#101014", color: "#fff4e8", fontFamily: "Inter, sans-serif", padding: "24px 16px" }}>
      <div style={{ maxWidth: 840, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Header do Portal */}
        <header
          style={{
            background: "#15151a",
            border: "1px solid rgba(255,244,232,0.1)",
            borderRadius: 16,
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mc-caramel)", letterSpacing: "0.08em" }}>
              PORTAL DO CLIENTE · APROVAÇÃO SEGURA
            </span>
            <h1 style={{ margin: "4px 0 0 0", fontSize: 22, fontWeight: 800 }}>{client.name}</h1>
            <p style={{ margin: "2px 0 0 0", fontSize: 12, opacity: 0.6 }}>
              Estúdio responsável: <strong>{workspace.name}</strong>
            </p>
          </div>
          <span style={{ fontSize: 12, background: "rgba(42,213,135,0.15)", color: "#2ad587", padding: "4px 10px", borderRadius: 999, fontWeight: 600 }}>
            Link Ativo
          </span>
        </header>

        {/* Conteúdo Principal */}
        {deliverables.length === 0 ? (
          <div style={{ background: "#15151a", padding: 40, borderRadius: 16, textAlign: "center", border: "1px solid rgba(255,244,232,0.1)" }}>
            <span style={{ display: "inline-flex", color: "#c8d44e" }}>
              <IconCheckCircle size={36} />
            </span>
            <h3 style={{ margin: "12px 0 4px 0" }}>Nenhuma entrega pendente de aprovação!</h3>
            <p style={{ opacity: 0.6, fontSize: 13 }}>Todas as peças da sua marca já foram aprovadas ou estão em produção.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
            {/* Lista Lateral de Entregas */}
            <div style={{ background: "#15151a", border: "1px solid rgba(255,244,232,0.1)", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,244,232,0.5)" }}>PEÇAS PARA REVISÃO</span>
              {deliverables.map((del: Deliverable) => (
                <div
                  key={del.id}
                  onClick={() => setSelectedDeliverable(del)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: selectedDeliverable?.id === del.id ? "#1b1b24" : "transparent",
                    border: `1px solid ${selectedDeliverable?.id === del.id ? "var(--mc-caramel)" : "transparent"}`,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <div style={{ fontSize: 11, color: "var(--mc-caramel)", marginBottom: 2 }}>
                    {del.format.toUpperCase()} · {del.channel}
                  </div>
                  <div>{del.title}</div>
                </div>
              ))}
            </div>

            {/* Painel de Visualização & Decisão */}
            {selectedDeliverable && (
              <div style={{ background: "#15151a", border: "1px solid rgba(255,244,232,0.1)", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mc-caramel)" }}>
                    {selectedDeliverable.format.toUpperCase()} · DATA: {selectedDeliverable.scheduled_date || "A definir"}
                  </span>
                  <h2 style={{ margin: "4px 0 8px 0", fontSize: 20 }}>{selectedDeliverable.title}</h2>
                  <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{selectedDeliverable.description}</p>
                </div>

                {/* Prévia da Copy */}
                {selectedDeliverable.versions?.[0]?.copy_text && (
                  <div style={{ background: "#101014", border: "1px solid rgba(255,244,232,0.08)", borderRadius: 8, padding: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#c8d44e" }}>LEGENDA DO POST:</span>
                    <p style={{ margin: "6px 0 0 0", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-line" }}>
                      {selectedDeliverable.versions[0].copy_text}
                    </p>
                  </div>
                )}

                {/* Slides se for carrossel */}
                {selectedDeliverable.versions?.[0]?.slide_content && selectedDeliverable.versions[0].slide_content.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mc-caramel)" }}>SLIDES DO CARROSSEL:</span>
                    {selectedDeliverable.versions[0].slide_content.map((sl: any) => (
                      <div key={sl.slide} style={{ background: "#101014", padding: 10, borderRadius: 6, fontSize: 12 }}>
                        <strong>Lâmina {sl.slide}:</strong> {sl.headline} — <span style={{ opacity: 0.7 }}>{sl.body}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulário de Decisão */}
                <div style={{ borderTop: "1px solid rgba(255,244,232,0.1)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 14 }}>Sua Decisão</h4>

                  <input
                    type="text"
                    placeholder="Seu nome (ex: Maria da Silva)"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    style={{ background: "#101014", border: "1px solid rgba(255,244,232,0.1)", borderRadius: 6, padding: "8px 12px", color: "#fff4e8", fontSize: 13 }}
                  />

                  <textarea
                    rows={3}
                    placeholder="Deixe comentários ou observações se precisar de algum ajuste..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    style={{ background: "#101014", border: "1px solid rgba(255,244,232,0.1)", borderRadius: 6, padding: "8px 12px", color: "#fff4e8", fontSize: 13 }}
                  />

                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      disabled={submitting}
                      onClick={() => handleDecision("changes_requested")}
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        background: "rgba(255,77,77,0.15)",
                        border: "1px solid rgba(255,77,77,0.3)",
                        color: "#ff4d4d",
                        fontWeight: 700,
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      Solicitar Ajustes
                    </button>

                    <button
                      disabled={submitting}
                      onClick={() => handleDecision("approved")}
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        background: "#c8d44e",
                        border: "none",
                        color: "#101014",
                        fontWeight: 800,
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      Aprovar Conteúdo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
