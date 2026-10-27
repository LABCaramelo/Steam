import React, { useState } from "react";
import type { CreativeOsRepository } from "./repo";
import type { Client, ClientContact, ClientShare, Workspace } from "./types";

interface Props {
  workspace: Workspace;
  clients: Client[];
  repo: CreativeOsRepository;
  onRefresh: () => void;
  onSelectClientForStrategy: (client: Client) => void;
}

export const ClientsView: React.FC<Props> = ({
  workspace,
  clients,
  repo,
  onRefresh,
  onSelectClientForStrategy,
}) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(clients[0] || null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [shares, setShares] = useState<ClientShare[]>([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // New Client Form State
  const [name, setName] = useState("");
  const [segment, setSegment] = useState("");
  const [status, setStatus] = useState<Client["status"]>("active");
  const [fee, setFee] = useState(3500);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // New Contact Form State
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactPrimary, setContactPrimary] = useState(false);

  // Copy share alert
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadClientDetails = async (client: Client) => {
    setSelectedClient(client);
    try {
      const [cList, sList] = await Promise.all([
        repo.getContacts(client.id),
        repo.getClientShares(client.id),
      ]);
      setContacts(cList);
      setShares(sList);
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    if (selectedClient) {
      loadClientDetails(selectedClient);
    }
  }, [selectedClient?.id]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const created = await repo.createClient({
        workspace_id: workspace.id,
        name: name.trim(),
        segment: segment.trim(),
        status,
        monthly_fee_cents: Math.round(fee * 100),
        notes: notes.trim(),
      });
      setName("");
      setSegment("");
      setNotes("");
      setModalOpen(false);
      onRefresh();
      setSelectedClient(created);
    } catch (err: any) {
      alert(err?.message || "Erro ao criar cliente");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !contactName.trim()) return;
    try {
      await repo.createContact({
        workspace_id: workspace.id,
        client_id: selectedClient.id,
        name: contactName.trim(),
        email: contactEmail.trim(),
        phone: contactPhone.trim(),
        role_title: contactRole.trim(),
        is_primary: contactPrimary,
      });
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setContactRole("");
      setContactModalOpen(false);
      loadClientDetails(selectedClient);
    } catch (err: any) {
      alert(err?.message || "Erro ao adicionar contato");
    }
  };

  const handleGeneratePortalLink = async () => {
    if (!selectedClient) return;
    try {
      const share = await repo.createClientShare(workspace.id, selectedClient.id, 14);
      loadClientDetails(selectedClient);
      const url = `${window.location.origin}/tools/creative-os/index.html?portal=${share.token}`;
      navigator.clipboard.writeText(url);
      setCopiedToken(share.token);
      setTimeout(() => setCopiedToken(null), 3000);
    } catch (err: any) {
      alert(err?.message || "Erro ao gerar link de portal");
    }
  };

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.segment.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="cos-view-header">
        <div>
          <h1 className="cos-view-header__title">CRM & Gestão de Clientes</h1>
          <p className="cos-view-header__subtitle">
            Base de marcas atendidas, contatos-chave e links de aprovação.
          </p>
        </div>
        <button className="cos-btn cos-btn--primary" onClick={() => setModalOpen(true)}>
          + Novo Cliente
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
        {/* Left Column: Client List & Filters */}
        <div className="cos-card" style={{ height: "fit-content" }}>
          <div style={{ marginBottom: 14 }}>
            <input
              type="text"
              className="cos-input"
              placeholder="Buscar cliente ou nicho…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              {["all", "active", "lead", "archived"].map((st) => (
                <button
                  key={st}
                  className={`cos-btn cos-btn--ghost cos-btn--sm ${filterStatus === st ? "is-active" : ""}`}
                  style={{
                    background: filterStatus === st ? "var(--cos-accent)" : "transparent",
                    color: filterStatus === st ? "#101014" : "var(--cos-text-secondary)",
                    fontWeight: 700,
                  }}
                  onClick={() => setFilterStatus(st)}
                >
                  {st === "all" ? "Todos" : st === "active" ? "Ativos" : st === "lead" ? "Leads" : "Arquivados"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "65vh", overflowY: "auto" }}>
            {filteredClients.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--cos-text-muted)", textAlign: "center", padding: 20 }}>
                Nenhum cliente encontrado.
              </p>
            ) : (
              filteredClients.map((client) => {
                const isSelected = selectedClient?.id === client.id;
                return (
                  <div
                    key={client.id}
                    onClick={() => loadClientDetails(client)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "var(--cos-radius-sm)",
                      background: isSelected ? "var(--cos-surface-3)" : "var(--cos-surface-2)",
                      border: `1px solid ${isSelected ? "var(--cos-accent)" : "var(--cos-border)"}`,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{client.name}</span>
                      <span className={`cos-badge cos-badge--${client.status === "active" ? "approved" : "idea"}`}>
                        {client.status}
                      </span>
                    </div>
                    {client.segment && (
                      <div style={{ fontSize: 12, color: "var(--cos-text-secondary)", marginTop: 4 }}>
                        {client.segment}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: "var(--cos-accent)", marginTop: 4, fontWeight: 600 }}>
                      {(client.monthly_fee_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} / mês
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Client Details */}
        {selectedClient ? (
          <div className="cos-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: "0 0 4px 0", fontSize: 20, fontFamily: "Montserrat, sans-serif" }}>
                  {selectedClient.name}
                </h2>
                <div style={{ fontSize: 13, color: "var(--cos-text-secondary)" }}>
                  Segmento: <strong>{selectedClient.segment || "Geral"}</strong> · Honorários:{" "}
                  <strong>
                    {(selectedClient.monthly_fee_cents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </strong>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="cos-btn cos-btn--secondary"
                  onClick={() => onSelectClientForStrategy(selectedClient)}
                >
                  🎯 Abrir Ficha Estratégica
                </button>
                <button className="cos-btn cos-btn--primary" onClick={handleGeneratePortalLink}>
                  🔗 Gerar Link do Portal
                </button>
              </div>
            </div>

            {copiedToken && (
              <div
                style={{
                  background: "rgba(42, 213, 135, 0.15)",
                  border: "1px solid var(--cos-mint)",
                  color: "var(--cos-mint)",
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                ✓ Link do Portal do Cliente gerado e copiado para a área de transferência!
              </div>
            )}

            {/* Notes */}
            {selectedClient.notes && (
              <div
                style={{
                  background: "var(--cos-surface-2)",
                  border: "1px solid var(--cos-border)",
                  borderRadius: 8,
                  padding: 14,
                  fontSize: 13,
                  marginBottom: 20,
                  color: "var(--cos-text-secondary)",
                }}
              >
                <strong style={{ color: "var(--cos-text-primary)" }}>Observações Internas:</strong>{" "}
                {selectedClient.notes}
              </div>
            )}

            {/* Contacts Section */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Contatos do Cliente</h3>
                <button
                  className="cos-btn cos-btn--secondary cos-btn--sm"
                  onClick={() => setContactModalOpen(true)}
                >
                  + Adicionar Contato
                </button>
              </div>

              {contacts.length === 0 ? (
                <div className="cos-empty-state" style={{ padding: "24px 16px" }}>
                  <p className="cos-empty-state__title">Nenhum contato cadastrado</p>
                  <p className="cos-empty-state__text">Cadastre decisores ou pontos focais para as aprovações.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      style={{
                        padding: 14,
                        background: "var(--cos-surface-2)",
                        border: "1px solid var(--cos-border)",
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{contact.name}</span>
                        {contact.is_primary && (
                          <span className="cos-badge cos-badge--production" style={{ fontSize: 9 }}>
                            Principal
                          </span>
                        )}
                      </div>
                      {contact.role_title && (
                        <div style={{ fontSize: 11, color: "var(--cos-text-muted)", marginTop: 2 }}>
                          {contact.role_title}
                        </div>
                      )}
                      {contact.email && (
                        <div style={{ fontSize: 12, color: "var(--cos-text-secondary)", marginTop: 6 }}>
                          ✉ {contact.email}
                        </div>
                      )}
                      {contact.phone && (
                        <div style={{ fontSize: 12, color: "var(--cos-text-secondary)", marginTop: 2 }}>
                          📞 {contact.phone}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Client Portal Shares Section */}
            <div style={{ marginTop: 28 }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 700 }}>Links de Acesso ao Portal</h3>
              {shares.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--cos-text-muted)" }}>
                  Nenhum link ativo gerado. Clique em "Gerar Link do Portal" acima para criar um acesso restrito de aprovação.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {shares.map((share) => {
                    const portalUrl = `${window.location.origin}/tools/creative-os/index.html?portal=${share.token}`;
                    return (
                      <div
                        key={share.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          background: "var(--cos-surface-2)",
                          border: "1px solid var(--cos-border)",
                          borderRadius: 8,
                          gap: 12,
                        }}
                      >
                        <div style={{ fontSize: 12 }}>
                          <strong>{share.name}</strong> · Expira em:{" "}
                          {new Date(share.expires_at).toLocaleDateString("pt-BR")}
                        </div>
                        <button
                          className="cos-btn cos-btn--secondary cos-btn--sm"
                          onClick={() => {
                            navigator.clipboard.writeText(portalUrl);
                            setCopiedToken(share.token);
                            setTimeout(() => setCopiedToken(null), 3000);
                          }}
                        >
                          Copiar Link 📋
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="cos-empty-state">
            <p className="cos-empty-state__title">Selecione ou crie um cliente</p>
            <p className="cos-empty-state__text">
              Cadastre seu primeiro cliente para gerenciar contexto de marca, entregas e aprovações.
            </p>
            <button className="cos-btn cos-btn--primary" onClick={() => setModalOpen(true)}>
              + Cadastrar Cliente
            </button>
          </div>
        )}
      </div>

      {/* New Client Modal */}
      {modalOpen && (
        <div className="cos-modal-overlay">
          <div className="cos-modal">
            <div className="cos-modal__header">
              <h3 className="cos-modal__title">Novo Cliente</h3>
              <button className="cos-btn cos-btn--ghost cos-btn--sm" onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateClient}>
              <div className="cos-modal__body">
                <div className="cos-form-group">
                  <label className="cos-form-label">Nome da Marca / Especialista</label>
                  <input
                    type="text"
                    className="cos-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Grão Fino Cafés"
                    required
                  />
                </div>
                <div className="cos-form-group">
                  <label className="cos-form-label">Segmento / Nicho</label>
                  <input
                    type="text"
                    className="cos-input"
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    placeholder="Ex: Gastronomia / Cafés Especiais"
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="cos-form-group">
                    <label className="cos-form-label">Honorário Mensal (R$)</label>
                    <input
                      type="number"
                      className="cos-input"
                      value={fee}
                      onChange={(e) => setFee(Number(e.target.value))}
                    />
                  </div>
                  <div className="cos-form-group">
                    <label className="cos-form-label">Status</label>
                    <select
                      className="cos-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                    >
                      <option value="active">Ativo</option>
                      <option value="lead">Lead / Em Proposta</option>
                      <option value="archived">Arquivado</option>
                    </select>
                  </div>
                </div>
                <div className="cos-form-group">
                  <label className="cos-form-label">Notas e Contexto Inicial</label>
                  <textarea
                    className="cos-textarea"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anotações comerciais ou acordos preliminares…"
                  />
                </div>
              </div>
              <div className="cos-modal__footer">
                <button type="button" className="cos-btn cos-btn--ghost" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="cos-btn cos-btn--primary" disabled={saving || !name.trim()}>
                  {saving ? "Salvando…" : "Salvar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Contact Modal */}
      {contactModalOpen && (
        <div className="cos-modal-overlay">
          <div className="cos-modal">
            <div className="cos-modal__header">
              <h3 className="cos-modal__title">Novo Contato</h3>
              <button className="cos-btn cos-btn--ghost cos-btn--sm" onClick={() => setContactModalOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateContact}>
              <div className="cos-modal__body">
                <div className="cos-form-group">
                  <label className="cos-form-label">Nome Completo</label>
                  <input
                    type="text"
                    className="cos-input"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                  />
                </div>
                <div className="cos-form-group">
                  <label className="cos-form-label">Cargo / Função</label>
                  <input
                    type="text"
                    className="cos-input"
                    value={contactRole}
                    onChange={(e) => setContactRole(e.target.value)}
                    placeholder="Ex: Diretor de Marketing / Sócio"
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="cos-form-group">
                    <label className="cos-form-label">E-mail</label>
                    <input
                      type="email"
                      className="cos-input"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </div>
                  <div className="cos-form-group">
                    <label className="cos-form-label">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      className="cos-input"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <input
                    type="checkbox"
                    id="contact-primary"
                    checked={contactPrimary}
                    onChange={(e) => setContactPrimary(e.target.checked)}
                  />
                  <label htmlFor="contact-primary" style={{ fontSize: 13, cursor: "pointer" }}>
                    Contato Principal para Aprovações
                  </label>
                </div>
              </div>
              <div className="cos-modal__footer">
                <button
                  type="button"
                  className="cos-btn cos-btn--ghost"
                  onClick={() => setContactModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="cos-btn cos-btn--primary" disabled={!contactName.trim()}>
                  Adicionar Contato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
