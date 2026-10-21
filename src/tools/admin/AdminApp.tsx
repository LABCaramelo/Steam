import { useEffect, useState, useCallback } from "react";
import { useToast } from "../shared/kit";
import { adminRepo } from "./repo";
import type {
  AdminAchievementItem,
  AdminStats,
  AdminToolItem,
  AdminUserAchievementItem,
  AdminUserItem,
} from "./types";
import "./admin.css";

export function AdminApp() {
  const toast = useToast();
  const [tab, setTab] = useState<"dashboard" | "tools" | "achievements" | "users">("dashboard");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tools, setTools] = useState<AdminToolItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [achievements, setAchievements] = useState<AdminAchievementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros de usuários
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modais de edição
  const [editingTool, setEditingTool] = useState<AdminToolItem | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Conquistas
  const [userAchModalUser, setUserAchModalUser] = useState<AdminUserItem | null>(null);
  const [userAchievements, setUserAchievements] = useState<AdminUserAchievementItem[]>([]);
  const [loadingUserAch, setLoadingUserAch] = useState(false);

  const [grantTargetAchievement, setGrantTargetAchievement] = useState<AdminAchievementItem | null>(null);
  const [grantSelectedUserId, setGrantSelectedUserId] = useState<string>("");

  const [newAchievementModal, setNewAchievementModal] = useState(false);
  const [newAchData, setNewAchData] = useState({
    id: "",
    name: "",
    description: "",
    icon: "🏆",
    tool_slug: "",
    hidden: false,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, t, u, a] = await Promise.all([
        adminRepo.getStats(),
        adminRepo.getTools(),
        adminRepo.getUsers(search, roleFilter, statusFilter),
        adminRepo.getAllAchievements(),
      ]);
      setStats(s);
      setTools(t);
      setUsers(u);
      setAchievements(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados administrativos.");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Carregar conquistas de um usuário específico
  const openUserAchievements = async (u: AdminUserItem) => {
    setUserAchModalUser(u);
    setLoadingUserAch(true);
    try {
      const userAchs = await adminRepo.getUserAchievements(u.id);
      setUserAchievements(userAchs);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao buscar conquistas do usuário.", "error");
    } finally {
      setLoadingUserAch(false);
    }
  };

  // Conceder conquista
  const handleGrant = async (userId: string, achievementId: string, userName?: string) => {
    try {
      await adminRepo.grantAchievement(userId, achievementId);
      toast(
        `Conquista concedida com sucesso${userName ? ` para ${userName}` : ""}.`,
        "info"
      );
      if (userAchModalUser && userAchModalUser.id === userId) {
        setUserAchievements((prev) =>
          prev.map((a) => (a.id === achievementId ? { ...a, achieved: true, unlocked_at: new Date().toISOString() } : a))
        );
      }
      setGrantTargetAchievement(null);
      // Atualiza lista geral
      const freshAchs = await adminRepo.getAllAchievements();
      setAchievements(freshAchs);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao conceder conquista.", "error");
    }
  };

  // Revogar conquista
  const handleRevoke = async (userId: string, achievementId: string, userName?: string) => {
    try {
      await adminRepo.revokeAchievement(userId, achievementId);
      toast(
        `Conquista revogada${userName ? ` de ${userName}` : ""}.`,
        "info"
      );
      if (userAchModalUser && userAchModalUser.id === userId) {
        setUserAchievements((prev) =>
          prev.map((a) => (a.id === achievementId ? { ...a, achieved: false, unlocked_at: null } : a))
        );
      }
      // Atualiza lista geral
      const freshAchs = await adminRepo.getAllAchievements();
      setAchievements(freshAchs);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao revogar conquista.", "error");
    }
  };

  // Criar nova conquista
  const handleCreateAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminRepo.createAchievement({
        id: newAchData.id.trim(),
        name: newAchData.name.trim(),
        description: newAchData.description.trim(),
        icon: newAchData.icon.trim() || "🏆",
        tool_slug: newAchData.tool_slug || undefined,
        hidden: newAchData.hidden,
      });
      toast("Nova conquista criada com sucesso!", "info");
      setNewAchievementModal(false);
      setNewAchData({ id: "", name: "", description: "", icon: "🏆", tool_slug: "", hidden: false });
      const freshAchs = await adminRepo.getAllAchievements();
      setAchievements(freshAchs);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao criar conquista.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Alternar disponibilidade de ferramenta (Publicar / Despublicar)
  const handleToggleTool = async (tool: AdminToolItem) => {
    const nextState = !tool.available;
    setTools((prev) =>
      prev.map((t) => (t.slug === tool.slug ? { ...t, available: nextState } : t))
    );
    try {
      await adminRepo.setToolAvailability(tool.slug, nextState);
      toast(
        nextState
          ? `"${tool.name}" foi publicada na Loja.`
          : `"${tool.name}" agora está em modo "Em breve".`,
        "info"
      );
      const freshStats = await adminRepo.getStats();
      setStats(freshStats);
    } catch (err) {
      setTools((prev) =>
        prev.map((t) => (t.slug === tool.slug ? { ...t, available: tool.available } : t))
      );
      toast(err instanceof Error ? err.message : "Erro ao atualizar ferramenta.", "error");
    }
  };

  // Salvar alterações na ferramenta
  const handleSaveTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTool) return;
    setSaving(true);
    try {
      await adminRepo.updateTool(editingTool.slug, {
        name: editingTool.name,
        price_cents: editingTool.price_cents,
        available: editingTool.available,
      });
      toast("Ferramenta atualizada com sucesso.", "info");
      setEditingTool(null);
      await loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao salvar alterações.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Salvar cargo ou status de usuário
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      await adminRepo.setUserRole(editingUser.id, editingUser.role);
      await adminRepo.setUserStatus(
        editingUser.id,
        editingUser.access_status,
        editingUser.blocked_reason || undefined
      );
      toast("Membro atualizado com sucesso.", "info");
      setEditingUser(null);
      await loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao atualizar membro.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header__title-group">
          <span className="admin-header__eyebrow">SISTEMA // LAB</span>
          <h1 className="admin-header__title">Administração do LAB</h1>
          <p className="admin-header__desc">
            Painel central de governança, métricas em tempo real, catálogo de ferramentas, conquistas e membros.
          </p>
        </div>
        <div className="admin-header__actions">
          <button className="admin-btn admin-btn--ghost" onClick={() => loadData()} disabled={loading}>
            {loading ? "Carregando…" : "Atualizar dados"}
          </button>
        </div>
      </header>

      {error && <div className="admin-error-box">{error}</div>}

      <nav className="admin-tabs" aria-label="Navegação do painel">
        <button
          className={`admin-tab ${tab === "dashboard" ? "is-active" : ""}`}
          onClick={() => setTab("dashboard")}
        >
          📊 Dashboard
        </button>
        <button
          className={`admin-tab ${tab === "tools" ? "is-active" : ""}`}
          onClick={() => setTab("tools")}
        >
          🛠️ Ferramentas &amp; Loja ({tools.filter((t) => t.slug !== "admin").length})
        </button>
        <button
          className={`admin-tab ${tab === "achievements" ? "is-active" : ""}`}
          onClick={() => setTab("achievements")}
        >
          🏆 Conquistas ({achievements.length})
        </button>
        <button
          className={`admin-tab ${tab === "users" ? "is-active" : ""}`}
          onClick={() => setTab("users")}
        >
          👥 Membros ({stats?.total_users ?? users.length})
        </button>
      </nav>

      {/* =========================================================================
          ABA 1: DASHBOARD
         ========================================================================= */}
      {tab === "dashboard" && stats && (
        <section>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-card__icon">👥</div>
              <div className="admin-stat-card__val">{stats.total_users}</div>
              <div className="admin-stat-card__label">Usuários Cadastrados</div>
              <div className="admin-stat-card__sub">
                {stats.active_users} ativos · {stats.pending_users} pendentes · {stats.blocked_users} bloqueados
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-card__icon">🛡️</div>
              <div className="admin-stat-card__val">{stats.admin_users}</div>
              <div className="admin-stat-card__label">Administradores</div>
              <div className="admin-stat-card__sub">Com permissão total de governança</div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-card__icon">🚀</div>
              <div className="admin-stat-card__val">{stats.published_tools}</div>
              <div className="admin-stat-card__label">Ferramentas Publicadas</div>
              <div className="admin-stat-card__sub">
                {stats.unreleased_tools} em breve · Total de {stats.total_tools} ferramentas
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-card__icon">🏆</div>
              <div className="admin-stat-card__val">{achievements.length}</div>
              <div className="admin-stat-card__label">Conquistas Disponíveis</div>
              <div className="admin-stat-card__sub">
                {achievements.reduce((s, a) => s + a.unlocked_count, 0)} concedidas no total
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-card__icon">📦</div>
              <div className="admin-stat-card__val">{stats.total_acquisitions}</div>
              <div className="admin-stat-card__label">Aquisições na Biblioteca</div>
              <div className="admin-stat-card__sub">Total de instalações por membros</div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-card__icon">💬</div>
              <div className="admin-stat-card__val">{stats.whatsapp_verified}</div>
              <div className="admin-stat-card__label">WhatsApp Confirmados</div>
              <div className="admin-stat-card__sub">Membros verificados na comunidade</div>
            </div>
          </div>

          <div className="admin-section">
            <div className="admin-section__head">
              <div>
                <h2 className="admin-section__title">Status da Vitrine da Loja</h2>
                <p className="admin-section__subtitle">
                  {stats.published_tools === 0
                    ? "A Loja está atualmente em modo de pré-lançamento. Todas as ferramentas aparecem como 'Em breve'."
                    : `${stats.published_tools} ferramenta(s) estão liberadas para aquisição imediata.`}
                </p>
              </div>
              <button className="admin-btn admin-btn--primary" onClick={() => setTab("tools")}>
                Gerenciar Publicações
              </button>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          ABA 2: FERRAMENTAS & LOJA
         ========================================================================= */}
      {tab === "tools" && (
        <section className="admin-section">
          <div className="admin-section__head">
            <div>
              <h2 className="admin-section__title">Ferramentas do LAB</h2>
              <p className="admin-section__subtitle">
                Ative ou desative a publicação de qualquer ferramenta na Loja com um clique.
              </p>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ferramenta</th>
                  <th>AppID / Slug</th>
                  <th>Preço</th>
                  <th>Membros com Acesso</th>
                  <th>Status na Loja</th>
                  <th style={{ textAlign: "center" }}>Publicada</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {tools.map((t) => (
                  <tr key={t.slug}>
                    <td>
                      <strong style={{ color: "rgb(var(--cm-fg))" }}>{t.name}</strong>
                    </td>
                    <td>
                      <code style={{ fontSize: "11px", opacity: 0.8 }}>
                        #{t.appid} · {t.slug}
                      </code>
                    </td>
                    <td>{t.price_cents === 0 ? "Gratuita" : `R$ ${(t.price_cents / 100).toFixed(2)}`}</td>
                    <td>
                      <strong>{t.owners_count}</strong> {t.owners_count === 1 ? "membro" : "membros"}
                    </td>
                    <td>
                      {t.available ? (
                        <span className="admin-badge admin-badge--published">● Publicada</span>
                      ) : (
                        <span className="admin-badge admin-badge--unreleased">○ Em breve</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <label className="admin-switch" title={t.available ? "Despublicar" : "Publicar"}>
                        <input
                          type="checkbox"
                          checked={t.available}
                          onChange={() => handleToggleTool(t)}
                        />
                        <span className="admin-slider"></span>
                      </label>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="admin-btn admin-btn--ghost admin-btn--sm"
                        onClick={() => setEditingTool({ ...t })}
                      >
                        Configurar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =========================================================================
          ABA 3: CONQUISTAS DO LAB
         ========================================================================= */}
      {tab === "achievements" && (
        <section className="admin-section">
          <div className="admin-section__head">
            <div>
              <h2 className="admin-section__title">Conquistas do Ecossistema</h2>
              <p className="admin-section__subtitle">
                Cadastre novas conquistas ou conceda medalhas oficiais para membros do LAB.
              </p>
            </div>
            <button
              className="admin-btn admin-btn--primary"
              onClick={() => setNewAchievementModal(true)}
            >
              + Nova Conquista
            </button>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Conquista</th>
                  <th>Âmbito / Ferramenta</th>
                  <th>Descrição</th>
                  <th>Desbloqueios</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {achievements.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="admin-ach-cell">
                        <span className="admin-ach-icon">{a.icon}</span>
                        <div>
                          <div className="admin-ach-title">{a.name}</div>
                          <code style={{ fontSize: "11px", opacity: 0.7 }}>{a.id}</code>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="admin-chip">{a.tool_name}</span>
                    </td>
                    <td>
                      <span className="admin-ach-desc">{a.description}</span>
                    </td>
                    <td>
                      <strong style={{ color: "rgb(var(--cm-accent, 255 112 26))" }}>
                        {a.unlocked_count}
                      </strong>{" "}
                      {a.unlocked_count === 1 ? "membro" : "membros"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="admin-btn admin-btn--primary admin-btn--sm"
                        onClick={() => {
                          setGrantTargetAchievement(a);
                          setGrantSelectedUserId(users[0]?.id || "");
                        }}
                      >
                        Conceder a Membro
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =========================================================================
          ABA 4: MEMBROS & USUÁRIOS
         ========================================================================= */}
      {tab === "users" && (
        <section className="admin-section">
          <div className="admin-section__head">
            <div>
              <h2 className="admin-section__title">Membros e Contas</h2>
              <p className="admin-section__subtitle">
                Visualize informações detalhadas, gerencie cargos, conceda conquistas e controle acessos.
              </p>
            </div>
          </div>

          <div className="admin-filter-bar">
            <input
              type="search"
              className="admin-search-input"
              placeholder="Buscar por nome, e-mail, apelido ou WhatsApp…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="admin-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">Todos os cargos</option>
              <option value="admin">Administradores</option>
              <option value="member">Membros</option>
              <option value="student">Alunos</option>
            </select>
            <select
              className="admin-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="pending">Pendentes</option>
              <option value="blocked">Bloqueados</option>
            </select>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Membro</th>
                  <th>E-mail</th>
                  <th>WhatsApp</th>
                  <th>Cargo</th>
                  <th>Status</th>
                  <th>Ferramentas</th>
                  <th>Entrada</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="admin-user-cell">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt=""
                            className="admin-user-cell__avatar"
                          />
                        ) : (
                          <div className="admin-user-cell__avatar" style={{ display: "grid", placeItems: "center", fontSize: "14px", fontWeight: "900" }}>
                            {u.name?.slice(0, 1) || "U"}
                          </div>
                        )}
                        <div className="admin-user-cell__info">
                          <span className="admin-user-cell__name">{u.name}</span>
                          {u.nickname && (
                            <span className="admin-user-cell__nick">@{u.nickname}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      {u.whatsapp ? (
                        <span>
                          {u.whatsapp} {u.whatsapp_verified ? "✅" : "⏳"}
                        </span>
                      ) : (
                        <span style={{ opacity: 0.4 }}>—</span>
                      )}
                    </td>
                    <td>
                      {u.is_admin || u.role === "admin" ? (
                        <span className="admin-badge admin-badge--admin">Administrador</span>
                      ) : (
                        <span className="admin-badge admin-badge--member">Membro</span>
                      )}
                    </td>
                    <td>
                      <span className={`admin-badge admin-badge--${u.access_status}`}>
                        {u.access_status === "active"
                          ? "Ativo"
                          : u.access_status === "pending"
                          ? "Pendente"
                          : "Bloqueado"}
                      </span>
                    </td>
                    <td>
                      {u.tools_owned.length > 0 ? (
                        <div className="admin-chip-list">
                          {u.tools_owned.map((slug) => (
                            <span key={slug} className="admin-chip">
                              {slug}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ opacity: 0.4, fontSize: "12px" }}>Nenhuma</span>
                      )}
                    </td>
                    <td style={{ fontSize: "12px", opacity: 0.7 }}>
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          className="admin-btn admin-btn--primary admin-btn--sm"
                          title="Gerenciar Conquistas deste membro"
                          onClick={() => openUserAchievements(u)}
                        >
                          🏆 Conquistas
                        </button>
                        <button
                          className="admin-btn admin-btn--ghost admin-btn--sm"
                          onClick={() => setEditingUser({ ...u })}
                        >
                          Gerenciar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =========================================================================
          MODAL: CONQUISTAS DE UM MEMBRO (CONCEDER / REVOGAR)
         ========================================================================= */}
      {userAchModalUser && (
        <div className="admin-modal-backdrop" onClick={() => setUserAchModalUser(null)}>
          <div className="admin-modal" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="admin-modal__title">Conquistas de {userAchModalUser.name}</h2>
            <p className="admin-modal__desc">
              Conceda ou revogue conquistas oficiais para este membro.
            </p>

            {loadingUserAch ? (
              <p style={{ padding: "20px 0", textAlign: "center", opacity: 0.7 }}>Carregando conquistas…</p>
            ) : (
              <div className="admin-user-ach-list">
                {userAchievements.map((ach) => (
                  <div key={ach.id} className={`admin-user-ach-item ${ach.achieved ? "is-unlocked" : ""}`}>
                    <div className="admin-ach-cell">
                      <span className="admin-ach-icon">{ach.icon}</span>
                      <div>
                        <div className="admin-ach-title">{ach.name}</div>
                        <div className="admin-ach-desc">{ach.description}</div>
                        {ach.achieved && ach.unlocked_at && (
                          <span style={{ fontSize: "11px", color: "#2ecc71" }}>
                            Desbloqueada em {new Date(ach.unlocked_at).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      {ach.achieved ? (
                        <button
                          className="admin-btn admin-btn--danger admin-btn--sm"
                          onClick={() => handleRevoke(userAchModalUser.id, ach.id, userAchModalUser.name)}
                        >
                          Revogar
                        </button>
                      ) : (
                        <button
                          className="admin-btn admin-btn--success admin-btn--sm"
                          onClick={() => handleGrant(userAchModalUser.id, ach.id, userAchModalUser.name)}
                        >
                          Conceder
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="admin-modal__actions">
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => setUserAchModalUser(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONCEDER CONQUISTA A PARTIR DA LISTA
         ========================================================================= */}
      {grantTargetAchievement && (
        <div className="admin-modal-backdrop" onClick={() => setGrantTargetAchievement(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="admin-modal__title">
              Conceder: {grantTargetAchievement.icon} {grantTargetAchievement.name}
            </h2>
            <p className="admin-modal__desc">
              Selecione o membro que receberá esta conquista.
            </p>

            <div className="admin-form-group">
              <label>Membro do LAB</label>
              <select
                value={grantSelectedUserId}
                onChange={(e) => setGrantSelectedUserId(e.target.value)}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-modal__actions">
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => setGrantTargetAchievement(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={!grantSelectedUserId}
                onClick={() => handleGrant(grantSelectedUserId, grantTargetAchievement.id)}
              >
                Conceder Conquista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CRIAR NOVA CONQUISTA
         ========================================================================= */}
      {newAchievementModal && (
        <div className="admin-modal-backdrop" onClick={() => setNewAchievementModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="admin-modal__title">Nova Conquista do LAB</h2>
            <p className="admin-modal__desc">
              Crie uma conquista personalizada para premiar ações e evoluções de membros.
            </p>

            <form onSubmit={handleCreateAchievement}>
              <div className="admin-form-group">
                <label>Identificador (Slug único, sem espaços)</label>
                <input
                  type="text"
                  required
                  placeholder="ex.: mestre-de-roteiro"
                  value={newAchData.id}
                  onChange={(e) =>
                    setNewAchData({
                      ...newAchData,
                      id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                    })
                  }
                />
              </div>

              <div className="admin-form-group">
                <label>Nome da Conquista</label>
                <input
                  type="text"
                  required
                  placeholder="ex.: Mestre de Roteiro"
                  value={newAchData.name}
                  onChange={(e) => setNewAchData({ ...newAchData, name: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label>Ícone / Emoji</label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  placeholder="ex.: 🌟"
                  value={newAchData.icon}
                  onChange={(e) => setNewAchData({ ...newAchData, icon: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label>Ferramenta Vinculada (opcional)</label>
                <select
                  value={newAchData.tool_slug}
                  onChange={(e) => setNewAchData({ ...newAchData, tool_slug: e.target.value })}
                >
                  <option value="">Geral do LAB (Global)</option>
                  {tools.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-form-group">
                <label>Descrição</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explique o motivo ou ação que desbloqueia esta conquista…"
                  value={newAchData.description}
                  onChange={(e) => setNewAchData({ ...newAchData, description: e.target.value })}
                />
              </div>

              <div className="admin-modal__actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => setNewAchievementModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
                  {saving ? "Salvando…" : "Criar Conquista"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONFIGURAR FERRAMENTA
         ========================================================================= */}
      {editingTool && (
        <div className="admin-modal-backdrop" onClick={() => setEditingTool(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="admin-modal__title">Configurar {editingTool.name}</h2>
            <p className="admin-modal__desc">
              Altere o título, preço em centavos e a disponibilidade na Loja.
            </p>

            <form onSubmit={handleSaveTool}>
              <div className="admin-form-group">
                <label>Nome da Ferramenta</label>
                <input
                  type="text"
                  required
                  value={editingTool.name}
                  onChange={(e) => setEditingTool({ ...editingTool, name: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label>Preço em centavos (0 = Gratuita)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={editingTool.price_cents}
                  onChange={(e) =>
                    setEditingTool({
                      ...editingTool,
                      price_cents: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>

              <div className="admin-form-group">
                <label>Status de Publicação</label>
                <select
                  value={editingTool.available ? "true" : "false"}
                  onChange={(e) =>
                    setEditingTool({
                      ...editingTool,
                      available: e.target.value === "true",
                    })
                  }
                >
                  <option value="true">Publicada (disponível para aquisição)</option>
                  <option value="false">Em breve (bloqueada na vitrine)</option>
                </select>
              </div>

              <div className="admin-modal__actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => setEditingTool(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
                  {saving ? "Salvando…" : "Salvar Configurações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: GERENCIAR MEMBRO
         ========================================================================= */}
      {editingUser && (
        <div className="admin-modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="admin-modal__title">Gerenciar Membro</h2>
            <p className="admin-modal__desc">
              {editingUser.name} ({editingUser.email})
            </p>

            <form onSubmit={handleSaveUser}>
              <div className="admin-form-group">
                <label>Cargo do Usuário</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                >
                  <option value="member">Membro (padrão)</option>
                  <option value="admin">Administrador (acesso ao Painel Admin)</option>
                  <option value="student">Aluno</option>
                </select>
              </div>

              <div className="admin-form-group">
                <label>Status de Acesso</label>
                <select
                  value={editingUser.access_status}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, access_status: e.target.value })
                  }
                >
                  <option value="active">Ativo (acesso liberado)</option>
                  <option value="pending">Pendente</option>
                  <option value="blocked">Bloqueado</option>
                </select>
              </div>

              {editingUser.access_status === "blocked" && (
                <div className="admin-form-group">
                  <label>Motivo do Bloqueio</label>
                  <input
                    type="text"
                    placeholder="Descreva o motivo do bloqueio…"
                    value={editingUser.blocked_reason || ""}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, blocked_reason: e.target.value })
                    }
                  />
                </div>
              )}

              <div className="admin-modal__actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => setEditingUser(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
                  {saving ? "Salvando…" : "Atualizar Membro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
