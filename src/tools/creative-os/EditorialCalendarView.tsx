import React, { useState } from "react";
import type { CreativeOsRepository } from "./repo";
import type {
  Client,
  Deliverable,
  DeliverableFormat,
  DeliverableStatus,
  Project,
  Workspace,
} from "./types";

interface Props {
  workspace: Workspace;
  clients: Client[];
  projects: Project[];
  deliverables: Deliverable[];
  repo: CreativeOsRepository;
  onRefresh: () => void;
}

export const EditorialCalendarView: React.FC<Props> = ({
  workspace,
  clients,
  projects,
  deliverables,
  repo,
  onRefresh,
}) => {
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newVersionModalOpen, setNewVersionModalOpen] = useState(false);

  // New Deliverable Form
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<DeliverableFormat>("carrossel");
  const [channel, setChannel] = useState<Deliverable["channel"]>("instagram");
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");

  // New Version Form
  const [versionTitle, setVersionTitle] = useState("");
  const [copyText, setCopyText] = useState("");
  const [slideBody, setSlideBody] = useState("");

  // Comment Form
  const [commentText, setCommentText] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const handleCreateDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientId || !projectId) return;
    try {
      const created = await repo.createDeliverable({
        workspace_id: workspace.id,
        client_id: clientId,
        project_id: projectId,
        title: title.trim(),
        format,
        channel,
        description: description.trim(),
        scheduled_date: scheduledDate || undefined,
        status: "idea",
      });

      // Cria a Versão 1 inicial com rascunho
      await repo.createDeliverableVersion(created.id, {
        title: "V1 - Rascunho Inicial",
        copy_text: description.trim() || "Rascunho de pauta criado no calendário.",
      });

      setTitle("");
      setDescription("");
      setScheduledDate("");
      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err?.message || "Erro ao criar peça");
    }
  };

  const handleAddVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeliverable || !copyText.trim()) return;
    try {
      await repo.createDeliverableVersion(selectedDeliverable.id, {
        title: versionTitle.trim() || "Nova Versão",
        copy_text: copyText.trim(),
        slide_content: slideBody ? [{ slide: 1, headline: selectedDeliverable.title, body: slideBody }] : [],
      });
      setVersionTitle("");
      setCopyText("");
      setSlideBody("");
      setNewVersionModalOpen(false);
      onRefresh();
      // Atualiza o item aberto
      const updatedList = await repo.getDeliverables(workspace.id);
      const found = updatedList.find((d) => d.id === selectedDeliverable.id);
      if (found) setSelectedDeliverable(found);
    } catch (err: any) {
      alert(err?.message || "Erro ao adicionar versão");
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeliverable || !commentText.trim()) return;
    try {
      await repo.createComment({
        deliverable_id: selectedDeliverable.id,
        author_name: "Operação Caramelo",
        is_internal: isInternal,
        comment_text: commentText.trim(),
      });
      setCommentText("");
      onRefresh();
      const updatedList = await repo.getDeliverables(workspace.id);
      const found = updatedList.find((d) => d.id === selectedDeliverable.id);
      if (found) setSelectedDeliverable(found);
    } catch (err: any) {
      alert(err?.message || "Erro ao adicionar comentário");
    }
  };

  const handleStatusChange = async (newStatus: DeliverableStatus) => {
    if (!selectedDeliverable) return;
    try {
      await repo.updateDeliverableStatus(selectedDeliverable.id, newStatus);
      onRefresh();
      const updated = { ...selectedDeliverable, status: newStatus };
      setSelectedDeliverable(updated);
    } catch (err: any) {
      alert(err?.message || "Erro ao atualizar status");
    }
  };

  return (
    <div>
      <div className="cos-view-header">
        <div>
          <h1 className="cos-view-header__title">Grade Editorial & Entregas</h1>
          <p className="cos-view-header__subtitle">
            Peças de conteúdo como unidades de primeira classe com versionamento imutável e aprovação.
          </p>
        </div>
        <button className="cos-btn cos-btn--primary" onClick={() => setModalOpen(true)}>
          + Nova Peça
        </button>
      </div>

      {deliverables.length === 0 ? (
        <div className="cos-empty-state">
          <p className="cos-empty-state__title">Nenhuma peça no calendário</p>
          <p className="cos-empty-state__text">
            Crie sua primeira entrega editorial (Carrossel, Reels/Roteiro, Post Estático) para iniciar o ciclo de produção.
          </p>
          <button className="cos-btn cos-btn--primary" onClick={() => setModalOpen(true)}>
            + Criar Primeira Entrega
          </button>
        </div>
      ) : (
        <div className="cos-calendar-grid">
          {deliverables.map((deliv) => {
            const client = clients.find((c) => c.id === deliv.client_id);
            const latestVersion = deliv.versions?.[0];
            return (
              <div
                key={deliv.id}
                className="cos-calendar-card cos-card--interactive"
                onClick={() => setSelectedDeliverable(deliv)}
                style={{ cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="cos-calendar-card__date">
                    📅 {deliv.scheduled_date ? new Date(deliv.scheduled_date).toLocaleDateString("pt-BR") : "A definir"}
                  </span>
                  <span className={`cos-badge cos-badge--${deliv.status}`}>
                    {deliv.status.replace("_", " ")}
                  </span>
                </div>

                <h3 className="cos-calendar-card__title">{deliv.title}</h3>

                <div style={{ fontSize: 12, color: "var(--cos-text-secondary)" }}>
                  {client?.name || "Cliente"} · <strong>{deliv.format.toUpperCase()}</strong> · {deliv.channel}
                </div>

                {latestVersion && (
                  <div
                    style={{
                      background: "var(--cos-surface-2)",
                      border: "1px solid var(--cos-border)",
                      borderRadius: 6,
                      padding: 10,
                      fontSize: 12,
                      color: "var(--cos-text-secondary)",
                      maxHeight: 60,
                      overflow: "hidden",
                    }}
                  >
                    <strong style={{ color: "var(--cos-accent)" }}>V{latestVersion.version_number}:</strong>{" "}
                    {latestVersion.copy_text}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--cos-text-muted)", marginTop: "auto" }}>
                  <span>{deliv.versions?.length || 0} versões</span>
                  <span>{deliv.comments?.length || 0} comentários</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deliverable Details & Version Inspector Drawer */}
      {selectedDeliverable && (
        <div className="cos-modal-overlay">
          <div className="cos-modal" style={{ maxWidth: 800 }}>
            <div className="cos-modal__header">
              <div>
                <h3 className="cos-modal__title">{selectedDeliverable.title}</h3>
                <span style={{ fontSize: 12, color: "var(--cos-text-secondary)" }}>
                  {selectedDeliverable.format.toUpperCase()} · {selectedDeliverable.channel}
                </span>
              </div>
              <button className="cos-btn cos-btn--ghost cos-btn--sm" onClick={() => setSelectedDeliverable(null)}>
                ✕
              </button>
            </div>

            <div className="cos-modal__body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              {/* Status Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "var(--cos-surface-2)",
                  borderRadius: 8,
                  marginBottom: 20,
                }}
              >
                <div>
                  <span style={{ fontSize: 12, color: "var(--cos-text-muted)" }}>Status Atual:</span>
                  <div style={{ marginTop: 2 }}>
                    <span className={`cos-badge cos-badge--${selectedDeliverable.status}`}>
                      {selectedDeliverable.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="cos-btn cos-btn--secondary cos-btn--sm"
                    onClick={() => handleStatusChange("production")}
                  >
                    Em Produção
                  </button>
                  <button
                    className="cos-btn cos-btn--secondary cos-btn--sm"
                    onClick={() => handleStatusChange("client_review")}
                  >
                    Enviar ao Cliente ↗
                  </button>
                  <button
                    className="cos-btn cos-btn--primary cos-btn--sm"
                    onClick={() => handleStatusChange("approved")}
                  >
                    Marcar Aprovado ✓
                  </button>
                </div>
              </div>

              {/* Versions List */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                    Versões do Conteúdo ({selectedDeliverable.versions?.length || 0})
                  </h4>
                  <button
                    className="cos-btn cos-btn--secondary cos-btn--sm"
                    onClick={() => setNewVersionModalOpen(true)}
                  >
                    + Nova Versão
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {selectedDeliverable.versions?.map((ver) => (
                    <div
                      key={ver.id}
                      style={{
                        padding: 14,
                        background: "var(--cos-surface-2)",
                        border: "1px solid var(--cos-border)",
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <strong style={{ fontSize: 13, color: "var(--cos-accent)" }}>
                          V{ver.version_number} — {ver.title}
                        </strong>
                        <span style={{ fontSize: 11, color: "var(--cos-text-muted)" }}>
                          {new Date(ver.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          fontSize: 13,
                          color: "var(--cos-text-primary)",
                          lineHeight: 1.5,
                          background: "var(--cos-surface-3)",
                          padding: 12,
                          borderRadius: 6,
                        }}
                      >
                        {ver.copy_text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback & Comments */}
              <div>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 700 }}>Comentários & Histórico de Revisão</h4>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  {selectedDeliverable.comments?.length === 0 ? (
                    <p style={{ fontSize: 12, color: "var(--cos-text-muted)" }}>Nenhum comentário registrado.</p>
                  ) : (
                    selectedDeliverable.comments?.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          padding: 10,
                          background: c.is_internal ? "rgba(255, 112, 26, 0.08)" : "var(--cos-surface-2)",
                          border: `1px solid ${c.is_internal ? "rgba(255, 112, 26, 0.3)" : "var(--cos-border)"}`,
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700 }}>{c.author_name}</span>
                          <span style={{ color: "var(--cos-text-muted)" }}>
                            {c.is_internal ? "🔒 Interno" : "🌐 Cliente"}
                          </span>
                        </div>
                        <div style={{ color: "var(--cos-text-primary)" }}>{c.comment_text}</div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment}>
                  <div className="cos-form-group">
                    <textarea
                      className="cos-textarea"
                      placeholder="Adicione um comentário ou anotação de revisão…"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={2}
                      required
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="checkbox"
                        id="comment-internal"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                      />
                      <label htmlFor="comment-internal" style={{ fontSize: 12, cursor: "pointer" }}>
                        🔒 Comentário Interno (Oculto do Cliente)
                      </label>
                    </div>
                    <button type="submit" className="cos-btn cos-btn--secondary cos-btn--sm" disabled={!commentText.trim()}>
                      Enviar Comentário
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Deliverable Modal */}
      {modalOpen && (
        <div className="cos-modal-overlay">
          <div className="cos-modal">
            <div className="cos-modal__header">
              <h3 className="cos-modal__title">Nova Peça de Conteúdo</h3>
              <button className="cos-btn cos-btn--ghost cos-btn--sm" onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateDeliverable}>
              <div className="cos-modal__body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="cos-form-group">
                    <label className="cos-form-label">Cliente</label>
                    <select className="cos-select" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="cos-form-group">
                    <label className="cos-form-label">Projeto Vinculado</label>
                    <select className="cos-select" value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="cos-form-group">
                  <label className="cos-form-label">Título da Peça / Pauta</label>
                  <input
                    type="text"
                    className="cos-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Carrossel: Como precificar sem medo de perder clientes"
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="cos-form-group">
                    <label className="cos-form-label">Formato</label>
                    <select className="cos-select" value={format} onChange={(e) => setFormat(e.target.value as any)}>
                      <option value="carrossel">Carrossel (Método HEAD)</option>
                      <option value="reels_roteiro">Reels / Roteiro de Vídeo</option>
                      <option value="estatico">Post Estático / Tweet</option>
                      <option value="artigo">Artigo / Newsletter</option>
                      <option value="video_longo">Vídeo Longo / YouTube</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div className="cos-form-group">
                    <label className="cos-form-label">Canal</label>
                    <select className="cos-select" value={channel} onChange={(e) => setChannel(e.target.value as any)}>
                      <option value="instagram">Instagram</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="youtube">YouTube</option>
                      <option value="tiktok">TikTok</option>
                      <option value="site">Blog / Site</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                </div>

                <div className="cos-form-group">
                  <label className="cos-form-label">Data Prevista de Publicação</label>
                  <input
                    type="date"
                    className="cos-input"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>

                <div className="cos-form-group">
                  <label className="cos-form-label">Descrição / Ideia da Pauta</label>
                  <textarea
                    className="cos-textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ângulo de gancho, tema abrangente e especificidade de nicho."
                  />
                </div>
              </div>
              <div className="cos-modal__footer">
                <button type="button" className="cos-btn cos-btn--ghost" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="cos-btn cos-btn--primary" disabled={!title.trim()}>
                  Adicionar ao Calendário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Version Modal */}
      {newVersionModalOpen && selectedDeliverable && (
        <div className="cos-modal-overlay">
          <div className="cos-modal">
            <div className="cos-modal__header">
              <h3 className="cos-modal__title">Nova Versão Imutável</h3>
              <button className="cos-btn cos-btn--ghost cos-btn--sm" onClick={() => setNewVersionModalOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAddVersion}>
              <div className="cos-modal__body">
                <p style={{ fontSize: 13, color: "var(--cos-text-secondary)", margin: "0 0 16px 0" }}>
                  Adicionar uma nova versão preserva o histórico de aprovações anteriores e reseta a peça para revisão interna.
                </p>

                <div className="cos-form-group">
                  <label className="cos-form-label">Rótulo da Versão</label>
                  <input
                    type="text"
                    className="cos-input"
                    value={versionTitle}
                    onChange={(e) => setVersionTitle(e.target.value)}
                    placeholder="Ex: V2 - Ajustes nos slides de retenção"
                  />
                </div>

                <div className="cos-form-group">
                  <label className="cos-form-label">Texto / Roteiro / Copy Completa</label>
                  <textarea
                    className="cos-textarea"
                    value={copyText}
                    onChange={(e) => setCopyText(e.target.value)}
                    placeholder="Insira o texto completo dos slides ou roteiro do vídeo…"
                    rows={8}
                    required
                  />
                </div>
              </div>
              <div className="cos-modal__footer">
                <button type="button" className="cos-btn cos-btn--ghost" onClick={() => setNewVersionModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="cos-btn cos-btn--primary" disabled={!copyText.trim()}>
                  Gravar Versão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
