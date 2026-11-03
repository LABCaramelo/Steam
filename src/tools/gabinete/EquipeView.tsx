import React, { useState, useEffect } from "react";
import type { Workspace, WorkspaceMember, Squad } from "./types";
import type { GabineteRepository } from "./repo";
import { RotinaView } from "./RotinaView";
import { IconFolder, IconUser, IconFileText, IconSparkles, IconBriefcase } from "./Icons";

interface Props {
  workspace: Workspace;
  repo: GabineteRepository;
  initialSubTab?: "equipe" | "squads" | "rotina" | "relatorio";
}

export const EquipeView: React.FC<Props> = ({
  workspace,
  repo,
  initialSubTab = "equipe",
}) => {
  const [activeMainTab, setActiveMainTab] = useState("EQUIPE");
  const [activeSubTab, setActiveSubTab] = useState<"equipe" | "squads" | "rotina" | "relatorio">(initialSubTab);

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [_loading, setLoading] = useState(true);

  // Modais
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<WorkspaceMember | null>(null);

  // Form novo membro
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberType, setNewMemberType] = useState<"membro" | "adm_setor" | "adm_master">("membro");
  const [newMemberJobTitle, setNewMemberJobTitle] = useState("");
  const [newMemberSquad, setNewMemberSquad] = useState("");

  // Form novo squad
  const [isAddSquadModalOpen, setIsAddSquadModalOpen] = useState(false);
  const [newSquadName, setNewSquadName] = useState("");
  const [newSquadDesc, setNewSquadDesc] = useState("");

  const mainTabs = [
    "EQUIPE",
    "INTEGRAÇÕES",
    "AUTOMAÇÕES",
    "CLIENTES",
    "MEU PLANO",
    "MISSÕES",
    "ATUALIZAÇÕES",
    "GERAL",
    "BASE DE CONHECIMENTO",
    "DATAS",
  ];

  const loadData = async () => {
    try {
      const [mList, sList] = await Promise.all([
        repo.getMembers(workspace.id),
        repo.getSquads(workspace.id),
      ]);
      setMembers(mList);
      setSquads(sList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspace.id]);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;

    await repo.createMember({
      workspace_id: workspace.id,
      name: newMemberName.trim(),
      email: newMemberEmail.trim(),
      member_type: newMemberType,
      job_title: newMemberJobTitle.trim() || "Sem cargo definido",
      squad_name: newMemberSquad || undefined,
    });

    setIsAddModalOpen(false);
    setNewMemberName("");
    setNewMemberEmail("");
    setNewMemberJobTitle("");
    setNewMemberSquad("");
    loadData();
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    await repo.updateMember(editingMember.id, {
      name: editingMember.name,
      job_title: editingMember.job_title,
      member_type: editingMember.member_type,
      status: editingMember.status,
    });

    setEditingMember(null);
    loadData();
  };

  const handleDeleteMember = async (id: string) => {
    if (confirm("Deseja realmente remover este membro da equipe?")) {
      await repo.deleteMember(id);
      setEditingMember(null);
      loadData();
    }
  };

  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSquadName.trim()) return;

    await repo.createSquad({
      workspace_id: workspace.id,
      name: newSquadName.trim(),
      description: newSquadDesc.trim(),
    });

    setIsAddSquadModalOpen(false);
    setNewSquadName("");
    setNewSquadDesc("");
    loadData();
  };

  // Contagens por tipo de membro
  const countMembro = members.filter((m) => m.member_type === "membro" && m.status !== "inactive").length;
  const countAdmSetor = members.filter((m) => m.member_type === "adm_setor" && m.status !== "inactive").length;
  const countAdmMaster = members.filter((m) => (m.member_type === "adm_master" || m.role === "owner") && m.status !== "inactive").length;

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
      {/* Título de Configurações */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 6px 0", color: "#fff4e8" }}>
          Configurações
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,244,232,0.6)" }}>
          Gerencie acessos, funções, metas, squads, a rotina e o relatório da equipe.
        </p>
      </div>

      {/* Abas Superiores Horizontais */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 8,
          marginBottom: 20,
          borderBottom: "1px solid rgba(255,244,232,0.08)",
        }}
      >
        {mainTabs.map((tab) => {
          const isActive = activeMainTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveMainTab(tab)}
              style={{
                background: isActive ? "#1c202a" : "rgba(255,255,255,0.03)",
                color: isActive ? "#fff4e8" : "rgba(255,244,232,0.55)",
                border: isActive
                  ? "1px solid rgba(255,244,232,0.22)"
                  : "1px solid rgba(255,244,232,0.07)",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.06em",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Conteúdo da Aba EQUIPE */}
      {activeMainTab === "EQUIPE" && (
        <div>
          {/* Barra de Sub-abas + Botão Adicionar Membro */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
            }}
          >
            {/* Sub-abas: EQUIPE, SQUADS, ROTINA, RELATÓRIO */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {[
                { id: "equipe", label: "EQUIPE" },
                { id: "squads", label: "SQUADS" },
                { id: "rotina", label: "ROTINA" },
                { id: "relatorio", label: "RELATÓRIO" },
              ].map((sub) => {
                const isSubActive = activeSubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setActiveSubTab(sub.id as any)}
                    style={{
                      background: isSubActive ? "#181824" : "rgba(255,255,255,0.02)",
                      border: isSubActive
                        ? "1px solid #c8d44e"
                        : "1px solid rgba(255,244,232,0.12)",
                      borderRadius: 6,
                      padding: "7px 16px",
                      fontSize: 11.5,
                      fontWeight: 800,
                      color: isSubActive ? "#c8d44e" : "rgba(255,244,232,0.65)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <IconFolder size={13} />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Botão Adicionar Membro (Amarelo / Verde-limão) */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              style={{
                background: "#c8d44e",
                color: "#101014",
                border: "none",
                borderRadius: 9999,
                padding: "8px 18px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                letterSpacing: "0.02em",
                boxShadow: "0 2px 10px rgba(200, 212, 78, 0.25)",
              }}
            >
              <IconUser size={14} />
              <span>Adicionar membro</span>
            </button>
          </div>

          {/* Subaba: EQUIPE */}
          {activeSubTab === "equipe" && (
            <div>
              {/* Cards de Métricas de Funções */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 16,
                  marginBottom: 28,
                }}
              >
                {/* Membro */}
                <div
                  style={{
                    background: "#14141c",
                    border: "1px solid rgba(255,244,232,0.08)",
                    borderRadius: 8,
                    padding: "16px 20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "rgba(255,244,232,0.4)",
                        display: "inline-block",
                      }}
                    />
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#fff4e8" }}>
                      {countMembro}
                    </span>
                    <span style={{ fontSize: 12, color: "rgba(255,244,232,0.6)" }}>
                      <strong style={{ color: "#fff4e8" }}>Membro</strong> — Só vê o que é dele
                    </span>
                  </div>
                </div>

                {/* Adm Setor */}
                <div
                  style={{
                    background: "#14141c",
                    border: "1px solid rgba(255,244,232,0.08)",
                    borderRadius: 8,
                    padding: "16px 20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#25bfff",
                        display: "inline-block",
                      }}
                    />
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#fff4e8" }}>
                      {countAdmSetor}
                    </span>
                    <span style={{ fontSize: 12, color: "rgba(255,244,232,0.6)" }}>
                      <strong style={{ color: "#fff4e8" }}>Adm Setor</strong> — Visão ampliada por área
                    </span>
                  </div>
                </div>

                {/* Adm Master */}
                <div
                  style={{
                    background: "#14141c",
                    border: "1px solid rgba(255,244,232,0.08)",
                    borderRadius: 8,
                    padding: "16px 20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#c8d44e",
                        display: "inline-block",
                      }}
                    />
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#fff4e8" }}>
                      {countAdmMaster}
                    </span>
                    <span style={{ fontSize: 12, color: "rgba(255,244,232,0.6)" }}>
                      <strong style={{ color: "#fff4e8" }}>Adm Master</strong> — Acesso total, inclusive financeiro
                    </span>
                  </div>
                </div>
              </div>

              {/* Seção EQUIPE ATIVA */}
              <div style={{ marginBottom: 28 }}>
                <h3
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    color: "rgba(255,244,232,0.6)",
                    margin: "0 0 14px 0",
                    textTransform: "uppercase",
                  }}
                >
                  EQUIPE ATIVA ({members.filter((m) => m.status !== "inactive").length})
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  {members.map((member) => {
                    const isOwner = member.role === "owner" || member.member_type === "adm_master";
                    return (
                      <div
                        key={member.id}
                        style={{
                          background: "#14141c",
                          border: "1px solid rgba(255,244,232,0.08)",
                          borderRadius: 8,
                          padding: 16,
                          position: "relative",
                        }}
                      >
                        {/* Avatar e Tag */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            marginBottom: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: "50%",
                              background: "#c8d44e",
                              color: "#101014",
                              fontWeight: 800,
                              fontSize: 18,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </div>

                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: isOwner ? "rgba(200, 212, 78, 0.2)" : "rgba(37, 191, 255, 0.2)",
                              color: isOwner ? "#c8d44e" : "#25bfff",
                              border: isOwner
                                ? "1px solid rgba(200, 212, 78, 0.4)"
                                : "1px solid rgba(37, 191, 255, 0.4)",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {isOwner ? "ADM MASTER" : member.member_type === "adm_setor" ? "ADM SETOR" : "MEMBRO"}
                          </span>
                        </div>

                        {/* Nome e Cargo */}
                        <div style={{ marginBottom: 12 }}>
                          <h4 style={{ margin: "0 0 4px 0", fontSize: 15, fontWeight: 700, color: "#fff4e8" }}>
                            {member.name}
                          </h4>
                          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,244,232,0.5)", display: "flex", alignItems: "center", gap: 6 }}>
                            <IconFileText size={12} />
                            <span>{member.job_title || "Sem cargo definido"}</span>
                          </p>
                        </div>

                        {/* Link de Edição */}
                        <button
                          type="button"
                          onClick={() => setEditingMember(member)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            color: "rgba(255,244,232,0.4)",
                            fontSize: 11.5,
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          Clique pra editar
                        </button>
                      </div>
                    );
                  })}
                </div>

                <p style={{ fontSize: 11.5, color: "rgba(255,244,232,0.45)", margin: "0 0 18px 0" }}>
                  Clique num membro pra ver mais opções: cargos, restringir clientes, resetar senha, ver demandas, ativar/desativar ou remover.
                </p>

                {/* Banner de Mensagem de Aniversário */}
                <div
                  style={{
                    background: "#14141c",
                    border: "1px solid rgba(255,244,232,0.08)",
                    borderRadius: 8,
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                  onClick={() => alert("Configuração de mensagem automática de aniversário de casa configurada!")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <IconSparkles size={16} color="#c8d44e" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff4e8" }}>
                      Mensagem de aniversário de casa
                    </span>
                  </div>
                  <span style={{ color: "rgba(255,244,232,0.4)", fontSize: 14 }}>›</span>
                </div>
              </div>
            </div>
          )}

          {/* Subaba: SQUADS */}
          {activeSubTab === "squads" && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 700, color: "#fff4e8" }}>
                    Squads da Equipe
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(255,244,232,0.5)" }}>
                    Agrupe criadores por área de atuação e clientes atendidos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddSquadModalOpen(true)}
                  style={{
                    background: "rgba(255,244,232,0.1)",
                    color: "#fff4e8",
                    border: "1px solid rgba(255,244,232,0.15)",
                    borderRadius: 6,
                    padding: "7px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  + Novo Squad
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                {squads.map((sq) => (
                  <div
                    key={sq.id}
                    style={{
                      background: "#14141c",
                      border: "1px solid rgba(255,244,232,0.08)",
                      borderRadius: 8,
                      padding: 16,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: sq.color || "#c8d44e",
                        }}
                      />
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff4e8" }}>
                        {sq.name}
                      </h4>
                    </div>
                    {sq.description && (
                      <p style={{ margin: "0 0 12px 0", fontSize: 12, color: "rgba(255,244,232,0.5)" }}>
                        {sq.description}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "rgba(255,244,232,0.6)", alignItems: "center" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><IconUser size={12} /> {sq.members_count} membro(s)</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><IconBriefcase size={12} /> {sq.clients_count} cliente(s)</span>
                      {sq.leader_name && <span>★ Líder: {sq.leader_name}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subaba: ROTINA (Renderiza a tabela semanal de rotina) */}
          {activeSubTab === "rotina" && (
            <RotinaView workspace={workspace} repo={repo} />
          )}

          {/* Subaba: RELATÓRIO */}
          {activeSubTab === "relatorio" && (
            <div
              style={{
                background: "#14141c",
                border: "1px solid rgba(255,244,232,0.08)",
                borderRadius: 8,
                padding: 24,
              }}
            >
              <h3 style={{ margin: "0 0 6px 0", fontSize: 16, fontWeight: 700, color: "#fff4e8" }}>
                Relatório de Produtividade da Equipe
              </h3>
              <p style={{ margin: "0 0 20px 0", fontSize: 12.5, color: "rgba(255,244,232,0.5)" }}>
                Acompanhe entregas por membro, velocidade de execução e taxa de finalização de demandas.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
                <div style={{ background: "#181824", padding: 14, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,244,232,0.5)" }}>DEMANDAS ENTREGUES</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#c8d44e", marginTop: 4 }}>100%</div>
                </div>
                <div style={{ background: "#181824", padding: 14, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,244,232,0.5)" }}>VELOCIDADE MÉDIA</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#25bfff", marginTop: 4 }}>1.2 dias</div>
                </div>
                <div style={{ background: "#181824", padding: 14, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,244,232,0.5)" }}>MEMBROS ATIVOS</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#fff4e8", marginTop: 4 }}>{members.length}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo das Outras Abas de Configurações */}
      {activeMainTab !== "EQUIPE" && (
        <div
          style={{
            background: "#14141c",
            border: "1px solid rgba(255,244,232,0.08)",
            borderRadius: 8,
            padding: 30,
            textAlign: "center",
          }}
        >
          <h3 style={{ margin: "0 0 8px 0", fontSize: 18, color: "#fff4e8" }}>
            Configuração: {activeMainTab}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,244,232,0.5)", maxWidth: 500, marginInline: "auto" }}>
            Módulo conectado ao ecossistema LAB. Todas as integrações com Asaas, WhatsApp, Resend e Google Drive estão prontas para sincronização.
          </p>
        </div>
      )}

      {/* Modal Adicionar Membro */}
      {isAddModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(16, 16, 20, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            style={{
              background: "#181824",
              border: "1px solid rgba(255,244,232,0.12)",
              borderRadius: 8,
              padding: 24,
              width: 440,
              maxWidth: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: 17, color: "#fff4e8" }}>
              Adicionar Novo Membro
            </h3>

            <form onSubmit={handleCreateMember}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255,244,232,0.6)", marginBottom: 4 }}>
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Silva"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#101014",
                    border: "1px solid rgba(255,244,232,0.1)",
                    borderRadius: 6,
                    padding: "8px 10px",
                    color: "#fff4e8",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255,244,232,0.6)", marginBottom: 4 }}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="carlos@agencia.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#101014",
                    border: "1px solid rgba(255,244,232,0.1)",
                    borderRadius: 6,
                    padding: "8px 10px",
                    color: "#fff4e8",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255,244,232,0.6)", marginBottom: 4 }}>
                    Nível de Acesso
                  </label>
                  <select
                    value={newMemberType}
                    onChange={(e) => setNewMemberType(e.target.value as any)}
                    style={{
                      width: "100%",
                      background: "#101014",
                      border: "1px solid rgba(255,244,232,0.1)",
                      borderRadius: 6,
                      padding: "8px 10px",
                      color: "#fff4e8",
                      fontSize: 12,
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="membro">Membro (básico)</option>
                    <option value="adm_setor">Adm Setor</option>
                    <option value="adm_master">Adm Master</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255,244,232,0.6)", marginBottom: 4 }}>
                    Cargo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Copywriter"
                    value={newMemberJobTitle}
                    onChange={(e) => setNewMemberJobTitle(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#101014",
                      border: "1px solid rgba(255,244,232,0.1)",
                      borderRadius: 6,
                      padding: "8px 10px",
                      color: "#fff4e8",
                      fontSize: 12,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,244,232,0.6)",
                    fontSize: 12,
                    cursor: "pointer",
                    padding: "8px 14px",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: "#c8d44e",
                    color: "#101014",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 18px",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Salvar Membro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Membro */}
      {editingMember && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(16, 16, 20, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => setEditingMember(null)}
        >
          <div
            style={{
              background: "#181824",
              border: "1px solid rgba(255,244,232,0.12)",
              borderRadius: 8,
              padding: 24,
              width: 440,
              maxWidth: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: 17, color: "#fff4e8" }}>
              Editar Membro: {editingMember.name}
            </h3>

            <form onSubmit={handleUpdateMember}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255,244,232,0.6)", marginBottom: 4 }}>
                  Nome
                </label>
                <input
                  type="text"
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  style={{
                    width: "100%",
                    background: "#101014",
                    border: "1px solid rgba(255,244,232,0.1)",
                    borderRadius: 6,
                    padding: "8px 10px",
                    color: "#fff4e8",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255,244,232,0.6)", marginBottom: 4 }}>
                  Cargo
                </label>
                <input
                  type="text"
                  value={editingMember.job_title || ""}
                  onChange={(e) => setEditingMember({ ...editingMember, job_title: e.target.value })}
                  style={{
                    width: "100%",
                    background: "#101014",
                    border: "1px solid rgba(255,244,232,0.1)",
                    borderRadius: 6,
                    padding: "8px 10px",
                    color: "#fff4e8",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255,244,232,0.6)", marginBottom: 4 }}>
                  Nível de Acesso
                </label>
                <select
                  value={editingMember.member_type || "membro"}
                  onChange={(e) => setEditingMember({ ...editingMember, member_type: e.target.value as any })}
                  style={{
                    width: "100%",
                    background: "#101014",
                    border: "1px solid rgba(255,244,232,0.1)",
                    borderRadius: 6,
                    padding: "8px 10px",
                    color: "#fff4e8",
                    fontSize: 12,
                    boxSizing: "border-box",
                  }}
                >
                  <option value="membro">Membro (básico)</option>
                  <option value="adm_setor">Adm Setor</option>
                  <option value="adm_master">Adm Master</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
                {editingMember.role !== "owner" ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteMember(editingMember.id)}
                    style={{
                      background: "rgba(255, 61, 141, 0.15)",
                      color: "#ff3d8d",
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 12px",
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Excluir Membro
                  </button>
                ) : <span />}

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "rgba(255,244,232,0.6)",
                      fontSize: 12,
                      cursor: "pointer",
                      padding: "8px 14px",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{
                      background: "#c8d44e",
                      color: "#101014",
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 18px",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Criar Squad */}
      {isAddSquadModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(16, 16, 20, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => setIsAddSquadModalOpen(false)}
        >
          <div
            style={{
              background: "#181824",
              border: "1px solid rgba(255,244,232,0.12)",
              borderRadius: 8,
              padding: 24,
              width: 400,
              maxWidth: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: 17, color: "#fff4e8" }}>
              Novo Squad
            </h3>

            <form onSubmit={handleCreateSquad}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255,244,232,0.6)", marginBottom: 4 }}>
                  Nome do Squad
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Squad Conteúdo & Copy"
                  value={newSquadName}
                  onChange={(e) => setNewSquadName(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#101014",
                    border: "1px solid rgba(255,244,232,0.1)",
                    borderRadius: 6,
                    padding: "8px 10px",
                    color: "#fff4e8",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255,244,232,0.6)", marginBottom: 4 }}>
                  Descrição / Foco
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Responsável pelos roteiros de Reels e carrosséis..."
                  value={newSquadDesc}
                  onChange={(e) => setNewSquadDesc(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#101014",
                    border: "1px solid rgba(255,244,232,0.1)",
                    borderRadius: 6,
                    padding: "8px 10px",
                    color: "#fff4e8",
                    fontSize: 12,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsAddSquadModalOpen(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,244,232,0.6)",
                    fontSize: 12,
                    cursor: "pointer",
                    padding: "8px 14px",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: "#c8d44e",
                    color: "#101014",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 18px",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Criar Squad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
