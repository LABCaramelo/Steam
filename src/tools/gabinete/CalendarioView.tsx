import React, { useState } from "react";
import type { Client, Deliverable, DeliverableFormat, Workspace } from "./types";
import type { GabineteRepository } from "./repo";

interface Props {
  workspace: Workspace;
  clients: Client[];
  deliverables: Deliverable[];
  repo: GabineteRepository;
  onRefresh: () => void;
}

export const CalendarioView: React.FC<Props> = ({
  workspace,
  clients,
  deliverables,
  repo,
  onRefresh,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<Deliverable | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [format, setFormat] = useState<DeliverableFormat>("carrossel");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [scheduledTime, setScheduledTime] = useState("18:00");
  const [copyText, setCopyText] = useState("");
  const [generatedShareLink, setGeneratedShareLink] = useState("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const filteredDeliverables = deliverables.filter((d) => {
    if (selectedClient !== "all" && d.client_id !== selectedClient) return false;
    return !d.is_archived;
  });

  const openNewDeliverableModal = (dateStr?: string) => {
    setEditingDeliverable(null);
    setTitle("");
    setClientId(clients[0]?.id || "");
    setFormat("carrossel");
    setScheduledDate(dateStr || new Date().toISOString().slice(0, 10));
    setScheduledTime("18:00");
    setCopyText("");
    setGeneratedShareLink("");
    setModalOpen(true);
  };

  const openEditDeliverableModal = (d: Deliverable) => {
    setEditingDeliverable(d);
    setTitle(d.title);
    setClientId(d.client_id);
    setFormat(d.format);
    setScheduledDate(d.scheduled_date || new Date().toISOString().slice(0, 10));
    setScheduledTime(d.scheduled_time || "18:00");
    setCopyText(d.versions?.[0]?.copy_text || "");
    setGeneratedShareLink("");
    setModalOpen(true);
  };

  const handleSaveDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientId) return;

    const cl = clients.find((c) => c.id === clientId);

    if (editingDeliverable) {
      await repo.updateDeliverable(editingDeliverable.id, {
        title,
        client_id: clientId,
        client_name: cl?.name,
        format,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
      });
    } else {
      await repo.createDeliverable({
        workspace_id: workspace.id,
        client_id: clientId,
        client_name: cl?.name,
        title,
        format,
        channel: "instagram",
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        status: "production",
      });
    }

    setModalOpen(false);
    onRefresh();
  };

  const handleGenerateShareLink = async () => {
    if (!clientId) return;
    const share = await repo.createClientShare(workspace.id, clientId);
    const link = `${window.location.origin}${window.location.pathname}?portal=${share.token}`;
    setGeneratedShareLink(link);
  };

  return (
    <div className="mc-content">
      {/* Header do Calendário */}
      <div className="mc-view-header" style={{ padding: 0 }}>
        <div>
          <h2 className="mc-view-header__title">
            <span>📅</span> Calendário Editorial
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--mc-text-muted)" }}>
            Planejamento mensal de publicações, agendamentos e aprovações com o cliente.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Filtro de Cliente */}
          <select
            className="mc-select"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            style={{ fontSize: 13 }}
          >
            <option value="all">Todos os clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Navegação de Mês */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button className="mc-btn mc-btn--secondary" onClick={prevMonth} style={{ padding: "6px 10px" }}>
              ‹
            </button>
            <span style={{ fontWeight: 700, fontSize: 14, minWidth: 140, textAlign: "center" }}>
              {monthNames[month]} {year}
            </span>
            <button className="mc-btn mc-btn--secondary" onClick={nextMonth} style={{ padding: "6px 10px" }}>
              ›
            </button>
          </div>

          <button className="mc-btn mc-btn--primary" onClick={() => openNewDeliverableModal()}>
            + Agendar publicação
          </button>
        </div>
      </div>

      {/* Dias da Semana */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, textAlign: "center" }}>
        {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map((day) => (
          <div key={day} style={{ fontSize: 11, fontWeight: 700, color: "var(--mc-text-muted)", padding: "4px 0" }}>
            {day}
          </div>
        ))}
      </div>

      {/* Grade de Dias */}
      <div className="mc-calendar-grid">
        {/* Espaços em branco antes do dia 1 */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} style={{ opacity: 0.25 }} className="mc-calendar-day" />
        ))}

        {/* Dias do Mês */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const isToday = dayStr === new Date().toISOString().slice(0, 10);

          const dayDeliverables = filteredDeliverables.filter((d) => d.scheduled_date === dayStr);

          return (
            <div
              key={dayNum}
              className={`mc-calendar-day ${isToday ? "mc-calendar-day--today" : ""}`}
              onClick={() => openNewDeliverableModal(dayStr)}
              style={{ cursor: "pointer" }}
            >
              <div className="mc-calendar-day__header">
                <span>{dayNum}</span>
                {dayDeliverables.length > 0 && (
                  <span style={{ fontSize: 10, color: "var(--mc-caramel)", fontWeight: 800 }}>
                    {dayDeliverables.length}
                  </span>
                )}
              </div>

              {dayDeliverables.map((del) => {
                const pillClass =
                  del.format === "carrossel"
                    ? "mc-calendar-pill--carrossel"
                    : del.format === "reels_roteiro"
                    ? "mc-calendar-pill--reels"
                    : "mc-calendar-pill--estatico";

                return (
                  <div
                    key={del.id}
                    className={`mc-calendar-pill ${pillClass}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDeliverableModal(del);
                    }}
                    title={`${del.title} (${del.status})`}
                  >
                    <span>{del.format === "carrossel" ? "📑" : del.format === "reels_roteiro" ? "🎥" : "🖼️"}</span>{" "}
                    {del.title}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Modal de Nova / Edição de Entrega */}
      {modalOpen && (
        <div className="mc-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="mc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mc-modal__header">
              <h2>{editingDeliverable ? "Editar Publicação" : "Nova Publicação no Calendário"}</h2>
              <button
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 18 }}
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDeliverable}>
              <div className="mc-modal__body">
                <div className="mc-field">
                  <label>Título do Conteúdo *</label>
                  <input
                    type="text"
                    className="mc-input"
                    placeholder="Ex: 5 erros comuns ao preparar café"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="mc-field">
                    <label>Cliente *</label>
                    <select className="mc-select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mc-field">
                    <label>Formato *</label>
                    <select
                      className="mc-select"
                      value={format}
                      onChange={(e) => setFormat(e.target.value as DeliverableFormat)}
                    >
                      <option value="carrossel">Carrossel (Método HEAD)</option>
                      <option value="reels_roteiro">Reels / Roteiro em 5 Passos</option>
                      <option value="estatico">Post Estático / Foto Única</option>
                      <option value="stories">Sequência de Stories</option>
                      <option value="video_longo">Vídeo Longo / YouTube</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="mc-field">
                    <label>Data Agendada</label>
                    <input
                      type="date"
                      className="mc-input"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>

                  <div className="mc-field">
                    <label>Horário Previsto</label>
                    <input
                      type="time"
                      className="mc-input"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mc-field">
                  <label>Copy / Legenda do Post</label>
                  <textarea
                    className="mc-textarea"
                    rows={4}
                    placeholder="Escreva a legenda com o gancho, desenvolvimento e a CTA..."
                    value={copyText}
                    onChange={(e) => setCopyText(e.target.value)}
                  />
                </div>

                {/* Bloco de Aprovação por Link */}
                <div
                  style={{
                    background: "rgba(255,112,26,0.06)",
                    border: "1px dashed rgba(255,112,26,0.3)",
                    borderRadius: "var(--mc-radius-md)",
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mc-caramel)" }}>
                      🔗 Aprovação do Cliente por Link
                    </span>
                    <button
                      type="button"
                      className="mc-btn mc-btn--secondary"
                      style={{ fontSize: 11, padding: "3px 8px" }}
                      onClick={handleGenerateShareLink}
                    >
                      Gerar link do portal
                    </button>
                  </div>
                  {generatedShareLink && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        type="text"
                        readOnly
                        value={generatedShareLink}
                        className="mc-input"
                        style={{ fontSize: 11, padding: "4px 8px" }}
                      />
                      <button
                        type="button"
                        className="mc-btn mc-btn--acid"
                        style={{ fontSize: 11 }}
                        onClick={() => navigator.clipboard.writeText(generatedShareLink)}
                      >
                        Copiar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mc-modal__footer">
                <button type="button" className="mc-btn mc-btn--secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="mc-btn mc-btn--primary">
                  {editingDeliverable ? "Salvar Alterações" : "Salvar no Calendário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
