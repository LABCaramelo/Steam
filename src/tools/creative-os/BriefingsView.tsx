import React, { useEffect, useState } from "react";
import type { CreativeOsRepository } from "./repo";
import type { Briefing, Client, Proposal, Workspace } from "./types";

interface Props {
  workspace: Workspace;
  clients: Client[];
  initialClient?: Client | null;
  repo: CreativeOsRepository;
}

export const BriefingsView: React.FC<Props> = ({
  workspace,
  clients,
  initialClient,
  repo,
}) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(
    initialClient || clients[0] || null,
  );
  const [tab, setTab] = useState<"briefings" | "proposals">("briefings");
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);

  // New Briefing Form
  const [briefingModalOpen, setBriefingModalOpen] = useState(false);
  const [briefingTitle, setBriefingTitle] = useState("");
  const [briefingAnswers, setBriefingAnswers] = useState<Record<string, string>>({
    dor_principal: "",
    objetivo_estrategico: "",
    referencias: "",
    cronograma: "",
  });

  // New Proposal Form
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalScope, setProposalScope] = useState("");
  const [proposalSummary, setProposalSummary] = useState("");
  const [proposalPrice, setProposalPrice] = useState(4500);
  const [proposalContract, setProposalContract] = useState("");

  const loadData = async (clientId: string) => {
    setLoading(true);
    try {
      const bList = await repo.getBriefings(clientId);
      setBriefings(bList);
    } catch (err) {
      console.error("Erro ao carregar briefings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClient) {
      loadData(selectedClient.id);
    }
  }, [selectedClient?.id]);

  const handleCreateBriefing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !briefingTitle.trim()) return;
    try {
      await repo.saveBriefing({
        workspace_id: workspace.id,
        client_id: selectedClient.id,
        title: briefingTitle.trim(),
        status: "answered",
        answers: briefingAnswers,
      });
      setBriefingTitle("");
      setBriefingModalOpen(false);
      loadData(selectedClient.id);
    } catch (err: any) {
      alert(err?.message || "Erro ao salvar briefing.");
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !proposalTitle.trim()) return;
    const newProposal: Proposal = {
      id: crypto.randomUUID(),
      workspace_id: workspace.id,
      client_id: selectedClient.id,
      title: proposalTitle.trim(),
      scope: proposalScope.trim(),
      deliverables_summary: proposalSummary.trim(),
      price_cents: Math.round(proposalPrice * 100),
      status: "sent",
      contract_url: proposalContract.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProposals([newProposal, ...proposals]);
    setProposalModalOpen(false);
    setProposalTitle("");
    setProposalScope("");
    setProposalSummary("");
  };

  if (clients.length === 0) {
    return (
      <div className="cos-empty-state">
        <p className="cos-empty-state__title">Nenhum cliente cadastrado</p>
        <p className="cos-empty-state__text">Cadastre um cliente antes de criar briefings ou propostas.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="cos-view-header">
        <div>
          <h1 className="cos-view-header__title">Briefings & Propostas Comerciais</h1>
          <p className="cos-view-header__subtitle">
            Alinhamento de escopo, questionários estratégicos e propostas de serviço.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label className="cos-form-label" style={{ margin: 0 }}>Cliente:</label>
          <select
            className="cos-select"
            style={{ width: 220 }}
            value={selectedClient?.id || ""}
            onChange={(e) => {
              const cl = clients.find((c) => c.id === e.target.value);
              if (cl) setSelectedClient(cl);
            }}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          className={`cos-btn ${tab === "briefings" ? "cos-btn--primary" : "cos-btn--secondary"}`}
          onClick={() => setTab("briefings")}
        >
          📋 Briefings Realizados ({briefings.length})
        </button>
        <button
          className={`cos-btn ${tab === "proposals" ? "cos-btn--primary" : "cos-btn--secondary"}`}
          onClick={() => setTab("proposals")}
        >
          💼 Propostas Comerciais ({proposals.length})
        </button>
      </div>

      {tab === "briefings" && (
        <div className="cos-card">
          <div className="cos-card__header">
            <h3 className="cos-card__title">Briefings de {selectedClient?.name}</h3>
            <button className="cos-btn cos-btn--secondary cos-btn--sm" onClick={() => setBriefingModalOpen(true)}>
              + Preencher Novo Briefing
            </button>
          </div>

          {loading ? (
            <p style={{ color: "var(--cos-text-muted)" }}>Carregando briefings…</p>
          ) : briefings.length === 0 ? (
            <div className="cos-empty-state" style={{ padding: "36px 16px" }}>
              <p className="cos-empty-state__title">Nenhum briefing preenchido</p>
              <p className="cos-empty-state__text">
                Colete as necessidades, referências e dores do cliente para alimentar a ficha de marca e o calendário.
              </p>
              <button className="cos-btn cos-btn--secondary cos-btn--sm" onClick={() => setBriefingModalOpen(true)}>
                Preencher Primeiro Briefing
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {briefings.map((b) => (
                <div
                  key={b.id}
                  style={{
                    padding: 18,
                    background: "var(--cos-surface-2)",
                    border: "1px solid var(--cos-border)",
                    borderRadius: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{b.title}</h4>
                    <span className="cos-badge cos-badge--approved">{b.status}</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                    <div>
                      <strong style={{ color: "var(--cos-accent)" }}>Dor Principal:</strong>
                      <p style={{ margin: "4px 0", color: "var(--cos-text-secondary)" }}>
                        {b.answers?.dor_principal || "Não especificado"}
                      </p>
                    </div>
                    <div>
                      <strong style={{ color: "var(--cos-accent)" }}>Objetivo Estratégico:</strong>
                      <p style={{ margin: "4px 0", color: "var(--cos-text-secondary)" }}>
                        {b.answers?.objetivo_estrategico || "Não especificado"}
                      </p>
                    </div>
                    <div>
                      <strong style={{ color: "var(--cos-accent)" }}>Referências Citadas:</strong>
                      <p style={{ margin: "4px 0", color: "var(--cos-text-secondary)" }}>
                        {b.answers?.referencias || "Não especificado"}
                      </p>
                    </div>
                    <div>
                      <strong style={{ color: "var(--cos-accent)" }}>Cronograma / Prazo Esperado:</strong>
                      <p style={{ margin: "4px 0", color: "var(--cos-text-secondary)" }}>
                        {b.answers?.cronograma || "Não especificado"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "proposals" && (
        <div className="cos-card">
          <div className="cos-card__header">
            <h3 className="cos-card__title">Propostas de {selectedClient?.name}</h3>
            <button className="cos-btn cos-btn--secondary cos-btn--sm" onClick={() => setProposalModalOpen(true)}>
              + Nova Proposta
            </button>
          </div>

          {proposals.length === 0 ? (
            <div className="cos-empty-state" style={{ padding: "36px 16px" }}>
              <p className="cos-empty-state__title">Nenhuma proposta registrada</p>
              <p className="cos-empty-state__text">
                Defina o escopo acordado, honorários e entregas previstas para a formalização do projeto.
              </p>
              <button className="cos-btn cos-btn--secondary cos-btn--sm" onClick={() => setProposalModalOpen(true)}>
                Criar Primeira Proposta
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {proposals.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: 18,
                    background: "var(--cos-surface-2)",
                    border: "1px solid var(--cos-border)",
                    borderRadius: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{p.title}</h4>
                    <span className="cos-badge cos-badge--production">
                      {(p.price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>

                  <div style={{ fontSize: 13, color: "var(--cos-text-secondary)", marginBottom: 8 }}>
                    <strong>Escopo de Atuação:</strong> {p.scope}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--cos-text-secondary)", marginBottom: 8 }}>
                    <strong>Resumo de Entregas:</strong> {p.deliverables_summary}
                  </div>
                  {p.contract_url && (
                    <div style={{ fontSize: 12, marginTop: 8 }}>
                      <a href={p.contract_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--cos-sky)" }}>
                        🔗 Acessar Contrato Assinado Externo ↗
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Briefing Modal */}
      {briefingModalOpen && (
        <div className="cos-modal-overlay">
          <div className="cos-modal">
            <div className="cos-modal__header">
              <h3 className="cos-modal__title">Preenchimento de Briefing</h3>
              <button className="cos-btn cos-btn--ghost cos-btn--sm" onClick={() => setBriefingModalOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateBriefing}>
              <div className="cos-modal__body">
                <div className="cos-form-group">
                  <label className="cos-form-label">Título / Contexto da Rodada</label>
                  <input
                    type="text"
                    className="cos-input"
                    value={briefingTitle}
                    onChange={(e) => setBriefingTitle(e.target.value)}
                    placeholder="Ex: Briefing de Onboarding e Alinhamento Inicial"
                    required
                  />
                </div>

                <div className="cos-form-group">
                  <label className="cos-form-label">Qual a principal dor ou gargalo atual?</label>
                  <textarea
                    className="cos-textarea"
                    value={briefingAnswers.dor_principal}
                    onChange={(e) =>
                      setBriefingAnswers({ ...briefingAnswers, dor_principal: e.target.value })
                    }
                    placeholder="Ex: Não conseguem manter constância e os posts não geram reuniões comerciais."
                  />
                </div>

                <div className="cos-form-group">
                  <label className="cos-form-label">Objetivo Estratégico do Próximo Ciclo</label>
                  <textarea
                    className="cos-textarea"
                    value={briefingAnswers.objetivo_estrategico}
                    onChange={(e) =>
                      setBriefingAnswers({ ...briefingAnswers, objetivo_estrategico: e.target.value })
                    }
                    placeholder="Ex: Reposicionar a autoridade como boutique premium e atrair clientes de ticket alto."
                  />
                </div>

                <div className="cos-form-group">
                  <label className="cos-form-label">Referências e Inspirações de Conteúdo</label>
                  <input
                    type="text"
                    className="cos-input"
                    value={briefingAnswers.referencias}
                    onChange={(e) =>
                      setBriefingAnswers({ ...briefingAnswers, referencias: e.target.value })
                    }
                    placeholder="Perfis, marcas, canais ou estilos visuais desejados."
                  />
                </div>

                <div className="cos-form-group">
                  <label className="cos-form-label">Expectativa de Prazo / Datas-Chave</label>
                  <input
                    type="text"
                    className="cos-input"
                    value={briefingAnswers.cronograma}
                    onChange={(e) =>
                      setBriefingAnswers({ ...briefingAnswers, cronograma: e.target.value })
                    }
                    placeholder="Ex: Início imediato, primeiras 8 peças entregues até o dia 15."
                  />
                </div>
              </div>
              <div className="cos-modal__footer">
                <button type="button" className="cos-btn cos-btn--ghost" onClick={() => setBriefingModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="cos-btn cos-btn--primary" disabled={!briefingTitle.trim()}>
                  Salvar Briefing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proposal Modal */}
      {proposalModalOpen && (
        <div className="cos-modal-overlay">
          <div className="cos-modal">
            <div className="cos-modal__header">
              <h3 className="cos-modal__title">Nova Proposta Comercial</h3>
              <button className="cos-btn cos-btn--ghost cos-btn--sm" onClick={() => setProposalModalOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateProposal}>
              <div className="cos-modal__body">
                <div className="cos-form-group">
                  <label className="cos-form-label">Título da Proposta</label>
                  <input
                    type="text"
                    className="cos-input"
                    value={proposalTitle}
                    onChange={(e) => setProposalTitle(e.target.value)}
                    placeholder="Ex: Proposta Head de Conteúdo — Gestão Trimestral"
                    required
                  />
                </div>

                <div className="cos-form-group">
                  <label className="cos-form-label">Escopo de Atuação</label>
                  <textarea
                    className="cos-textarea"
                    value={proposalScope}
                    onChange={(e) => setProposalScope(e.target.value)}
                    placeholder="Ex: Direção editorial, 8 carrosséis estratégicos, 4 roteiros de reels e gestão de aprovações."
                    required
                  />
                </div>

                <div className="cos-form-group">
                  <label className="cos-form-label">Resumo de Entregáveis e Prazos</label>
                  <textarea
                    className="cos-textarea"
                    value={proposalSummary}
                    onChange={(e) => setProposalSummary(e.target.value)}
                    placeholder="Ex: Quinzenas de entrega, rodadas de revisão de 48h, portal de aprovação incluso."
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="cos-form-group">
                    <label className="cos-form-label">Valor Total / Mensal (R$)</label>
                    <input
                      type="number"
                      className="cos-input"
                      value={proposalPrice}
                      onChange={(e) => setProposalPrice(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="cos-form-group">
                    <label className="cos-form-label">Link do Contrato Firmado (DocuSign, etc.)</label>
                    <input
                      type="url"
                      className="cos-input"
                      value={proposalContract}
                      onChange={(e) => setProposalContract(e.target.value)}
                      placeholder="https://app.docusign.com/..."
                    />
                  </div>
                </div>
              </div>
              <div className="cos-modal__footer">
                <button type="button" className="cos-btn cos-btn--ghost" onClick={() => setProposalModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="cos-btn cos-btn--primary" disabled={!proposalTitle.trim()}>
                  Gerar Proposta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
