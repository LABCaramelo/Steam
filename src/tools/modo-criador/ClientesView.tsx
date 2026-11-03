import React, { useState } from "react";
import type { BrandProfile, Client, Workspace } from "./types";
import type { ModoCriadorRepository } from "./repo";

interface Props {
  workspace: Workspace;
  clients: Client[];
  repo: ModoCriadorRepository;
  onRefresh: () => void;
}

export const ClientesView: React.FC<Props> = ({
  workspace,
  clients,
  repo,
  onRefresh,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(clients[0] || null);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Formulário de Novo Cliente
  const [name, setName] = useState("");
  const [segment, setSegment] = useState("");
  const [category, setCategory] = useState<"ativos" | "avulsos" | "ex_clientes">("ativos");
  const [monthlyFee, setMonthlyFee] = useState("3500");
  const [color, setColor] = useState("#FF701A");
  const [notes, setNotes] = useState("");

  const filteredClients = clients.filter((c) => {
    if (selectedCategory === "ativos" && (c.category === "avulsos" || c.status === "archived")) return false;
    if (selectedCategory === "avulsos" && c.category !== "avulsos") return false;
    if (selectedCategory === "ex_clientes" && c.status !== "archived") return false;
    if (search.trim() && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const loadBrandProfile = async (cli: Client) => {
    setSelectedClient(cli);
    const profile = await repo.getBrandProfile(cli.id);
    setBrandProfile(profile);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const feeCents = Math.round(parseFloat(monthlyFee.replace(",", ".")) * 100) || 0;
    const newClient = await repo.createClient({
      workspace_id: workspace.id,
      name,
      segment,
      category,
      monthly_fee_cents: feeCents,
      color,
      notes,
    });

    setModalOpen(false);
    setName("");
    setSegment("");
    setNotes("");
    onRefresh();
    loadBrandProfile(newClient);
  };

  const handleSaveBrandProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    await repo.saveBrandProfile({
      workspace_id: workspace.id,
      client_id: selectedClient.id,
      purpose: brandProfile?.purpose || "",
      offer: brandProfile?.offer || "",
      positioning: brandProfile?.positioning || "",
      tone_of_voice: brandProfile?.tone_of_voice || "",
      restrictions: brandProfile?.restrictions || "",
    });
    alert("Ficha da Marca atualizada com sucesso!");
  };

  return (
    <div className="mc-content">
      {/* Header */}
      <div className="mc-view-header" style={{ padding: 0 }}>
        <div>
          <h2 className="mc-view-header__title">
            <span>👥</span> Gestão de Clientes & Marcas
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--mc-text-muted)" }}>
            Fichas estratégicas, contatos, honorários e contexto canônico de cada marca.
          </p>
        </div>

        <button className="mc-btn mc-btn--primary" onClick={() => setModalOpen(true)}>
          + Novo Cliente
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24 }}>
        {/* Painel Esquerdo: Lista de Clientes */}
        <div
          style={{
            background: "var(--mc-ink-surface)",
            border: "1px solid var(--mc-ink-border)",
            borderRadius: "var(--mc-radius-lg)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            height: "fit-content",
          }}
        >
          {/* Busca & Filtros */}
          <input
            type="text"
            className="mc-input"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div style={{ display: "flex", gap: 6 }}>
            {[
              { id: "all", label: "Todos" },
              { id: "ativos", label: "Ativos" },
              { id: "avulsos", label: "Avulsos" },
              { id: "ex_clientes", label: "Ex-Clientes" },
            ].map((cat) => (
              <button
                key={cat.id}
                className="mc-btn mc-btn--secondary"
                style={{
                  padding: "4px 8px",
                  fontSize: 11,
                  background: selectedCategory === cat.id ? "rgba(255,255,255,0.12)" : undefined,
                }}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Lista */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "65vh", overflowY: "auto" }}>
            {filteredClients.map((c) => {
              const isSelected = selectedClient?.id === c.id;
              const formattedFee = (c.monthly_fee_cents / 100).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              });

              return (
                <div
                  key={c.id}
                  onClick={() => loadBrandProfile(c)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "var(--mc-radius-sm)",
                    background: isSelected ? "var(--mc-sidebar-active)" : "var(--mc-ink)",
                    border: `1px solid ${isSelected ? "var(--mc-caramel)" : "var(--mc-ink-border)"}`,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--mc-text-title)" }}>
                      {c.name}
                    </span>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: c.color || "var(--mc-caramel)",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--mc-text-muted)" }}>
                    <span>{c.segment}</span>
                    <span style={{ fontWeight: 600, color: "var(--mc-acid)" }}>{formattedFee}/mês</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Painel Direito: Ficha Estratégica da Marca Selecionada */}
        {selectedClient ? (
          <div
            style={{
              background: "var(--mc-ink-surface)",
              border: "1px solid var(--mc-ink-border)",
              borderRadius: "var(--mc-radius-lg)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{selectedClient.name}</h3>
                <span style={{ fontSize: 12, color: "var(--mc-text-muted)" }}>
                  Segmento: {selectedClient.segment} · Categoria: {selectedClient.category}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="mc-btn mc-btn--secondary"
                  onClick={async () => {
                    const share = await repo.createClientShare(workspace.id, selectedClient.id);
                    const link = `${window.location.origin}${window.location.pathname}?portal=${share.token}`;
                    navigator.clipboard.writeText(link);
                    alert("Link do Portal do Cliente copiado!");
                  }}
                >
                  🔗 Copiar Link de Aprovação
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveBrandProfile} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="mc-field">
                <label>🎯 Propósito & Transformação Central</label>
                <input
                  type="text"
                  className="mc-input"
                  placeholder="Ex: Transformar o consumo de café comum em uma experiência diária de alta gastronomia."
                  value={brandProfile?.purpose || ""}
                  onChange={(e) => setBrandProfile({ ...brandProfile!, purpose: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="mc-field">
                  <label>📦 Oferta & Produtos Estrela</label>
                  <textarea
                    className="mc-textarea"
                    rows={3}
                    placeholder="Quais produtos ou serviços trazem a maior margem ou fidelizam o público?"
                    value={brandProfile?.offer || ""}
                    onChange={(e) => setBrandProfile({ ...brandProfile!, offer: e.target.value })}
                  />
                </div>

                <div className="mc-field">
                  <label>🗣️ Tom de Voz & Linguagem</label>
                  <textarea
                    className="mc-textarea"
                    rows={3}
                    placeholder="Ex: Amigável, técnico sem pedantismo, sofisticado e acolhedor."
                    value={brandProfile?.tone_of_voice || ""}
                    onChange={(e) => setBrandProfile({ ...brandProfile!, tone_of_voice: e.target.value })}
                  />
                </div>
              </div>

              <div className="mc-field">
                <label>🚫 Restrições Inegociáveis (O que a marca NUNCA faz)</label>
                <input
                  type="text"
                  className="mc-input"
                  placeholder="Ex: Não usar trocadilhos bobos, não postar fotos de banco de imagem genéricas..."
                  value={brandProfile?.restrictions || ""}
                  onChange={(e) => setBrandProfile({ ...brandProfile!, restrictions: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="mc-btn mc-btn--primary">
                  Salvar Ficha Estratégica
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: "var(--mc-text-muted)" }}>
            Selecione um cliente para ver os detalhes.
          </div>
        )}
      </div>

      {/* Modal Novo Cliente */}
      {modalOpen && (
        <div className="mc-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="mc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mc-modal__header">
              <h2>Novo Cliente ou Marca</h2>
              <button
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 18 }}
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClient}>
              <div className="mc-modal__body">
                <div className="mc-field">
                  <label>Nome do Cliente / Agência *</label>
                  <input
                    type="text"
                    className="mc-input"
                    placeholder="Ex: Barbearia Vila Nova"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="mc-field">
                    <label>Segmento</label>
                    <input
                      type="text"
                      className="mc-input"
                      placeholder="Ex: Beleza & Estilo"
                      value={segment}
                      onChange={(e) => setSegment(e.target.value)}
                    />
                  </div>

                  <div className="mc-field">
                    <label>Categoria</label>
                    <select
                      className="mc-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                    >
                      <option value="ativos">Cliente Ativo (Mensal)</option>
                      <option value="avulsos">Cliente Avulso (Demanda Única)</option>
                      <option value="ex_clientes">Ex-Cliente / Pausado</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="mc-field">
                    <label>Honorário Mensal (R$)</label>
                    <input
                      type="text"
                      className="mc-input"
                      value={monthlyFee}
                      onChange={(e) => setMonthlyFee(e.target.value)}
                    />
                  </div>

                  <div className="mc-field">
                    <label>Cor de Identificação</label>
                    <input
                      type="color"
                      className="mc-input"
                      style={{ height: 38, padding: 2, cursor: "pointer" }}
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mc-field">
                  <label>Anotações Iniciais</label>
                  <textarea
                    className="mc-textarea"
                    rows={3}
                    placeholder="Histórico, expectativas do cliente, contatos..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="mc-modal__footer">
                <button type="button" className="mc-btn mc-btn--secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="mc-btn mc-btn--primary">
                  Cadastrar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
