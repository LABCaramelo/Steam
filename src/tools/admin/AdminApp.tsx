import { useEffect, useState, useCallback } from "react";
import { useToast } from "../shared/kit";
import { adminRepo } from "./repo";
import type {
  AdminAchievementItem,
  AdminStats,
  AdminToolItem,
  AdminUserAchievementItem,
  AdminUserActivityItem,
  AdminUserItem,
  ToolBannerKind,
  ToolCustomAssets,
} from "./types";
import { updateCustomToolAssets, updateDynamicToolMeta } from "../../toolCatalog";
import "./admin.css";


const BANNER_SPECS: Record<
  ToolBannerKind,
  {
    title: string;
    subtitle: string;
    location: string;
    aspectRatio: string;
    aspectClass: string;
    recommendedSize: string;
    icon: string;
  }
> = {
  hero: {
    title: "Hero Banner",
    subtitle: "Destaque e Capa Principal",
    location: "Carrossel 'Destaques do LAB' na vitrine da Loja e cabeçalho da ferramenta",
    aspectRatio: "16 / 9",
    aspectClass: "admin-banner-preview--hero",
    recommendedSize: "1920×1080 ou 960×310 (16:9 Landscape)",
    icon: "🌟",
  },
  header: {
    title: "Header Capsule",
    subtitle: "Banner horizontal de vitrine",
    location: "Linhas de produtos na Loja e cards de 'Novidades' na Biblioteca",
    aspectRatio: "460 / 215",
    aspectClass: "admin-banner-preview--header",
    recommendedSize: "920×430 ou 460×215 (~2.14:1 Landscape)",
    icon: "🏷️",
  },
  capsule: {
    title: "Cápsula Vertical / Poster",
    subtitle: "Capa vertical em estilo cartaz",
    location: "Grade de 'Ferramentas Recentes' e cards verticais na Biblioteca",
    aspectRatio: "2 / 3",
    aspectClass: "admin-banner-preview--capsule",
    recommendedSize: "600×900 ou 300×450 (2:3 Portrait)",
    icon: "📱",
  },
  icon: {
    title: "Ícone do App",
    subtitle: "Ícone quadrado de navegação",
    location: "Barra lateral esquerda da Biblioteca, atalhos rápidos e listagens compactas",
    aspectRatio: "1 / 1",
    aspectClass: "admin-banner-preview--icon",
    recommendedSize: "256×256 ou 512×512 (1:1 Quadrado)",
    icon: "🎨",
  },
  logo: {
    title: "Logotipo Vetorial / PNG",
    subtitle: "Marca visual da ferramenta",
    location: "Sobreposição com transparência no topo da página de detalhes",
    aspectRatio: "3 / 1",
    aspectClass: "admin-banner-preview--logo",
    recommendedSize: "800×240 (PNG/SVG com transparência)",
    icon: "✨",
  },
};

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

  // Banners & Artes de Ferramentas
  const [bannerModalTool, setBannerModalTool] = useState<AdminToolItem | null>(null);
  const [bannerDraft, setBannerDraft] = useState<ToolCustomAssets>({});
  const [selectedBannerKind, setSelectedBannerKind] = useState<ToolBannerKind>("hero");
  const [uploadingKind, setUploadingKind] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Exclusão de Membro e Cadastro
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Conquistas
  const [userAchModalUser, setUserAchModalUser] = useState<AdminUserItem | null>(null);
  const [userAchievements, setUserAchievements] = useState<AdminUserAchievementItem[]>([]);
  const [loadingUserAch, setLoadingUserAch] = useState(false);

  // Atividades Recentes e Horas
  const [userActivityModalUser, setUserActivityModalUser] = useState<AdminUserItem | null>(null);
  const [userActivities, setUserActivities] = useState<AdminUserActivityItem[]>([]);
  const [loadingUserAct, setLoadingUserAct] = useState(false);
  const [editingActTool, setEditingActTool] = useState<AdminUserActivityItem | null>(null);
  const [editActMinutes, setEditActMinutes] = useState(0);

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

  useEffect(() => {
    adminRepo.getCurrentUserId().then(setCurrentUserId);
  }, []);

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

  // Carregar atividades e histórico de um membro
  const openUserActivities = async (u: AdminUserItem) => {
    setUserActivityModalUser(u);
    setLoadingUserAct(true);
    setEditingActTool(null);
    try {
      const acts = await adminRepo.getUserActivities(u.id);
      setUserActivities(acts);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao buscar atividades do usuário.", "error");
    } finally {
      setLoadingUserAct(false);
    }
  };

  // Atualizar tempo de uso de um membro em uma ferramenta
  const handleUpdateActivity = async (u: AdminUserItem, toolSlug: string, minutes: number) => {
    try {
      await adminRepo.updateUserToolActivity({
        userId: u.id,
        toolSlug,
        playtimeMinutes: Math.max(0, minutes),
      });
      toast(`Tempo de uso atualizado com sucesso (${minutes} min).`, "info");
      const acts = await adminRepo.getUserActivities(u.id);
      setUserActivities(acts);
      setEditingActTool(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao atualizar tempo de uso.", "error");
    }
  };

  // Alternar disponibilidade de ferramenta (Publicar / Despublicar)
  const handleToggleTool = async (tool: AdminToolItem) => {
    const nextState = !tool.available;
    setTools((prev) =>
      prev.map((t) => (t.slug === tool.slug ? { ...t, available: nextState } : t))
    );
    updateDynamicToolMeta(tool.appid, { available: nextState });
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
      updateDynamicToolMeta(editingTool.appid, {
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


  // Gestão de Banners de Ferramentas
  const openBannersModal = (t: AdminToolItem) => {
    setBannerModalTool(t);
    setBannerDraft({ ...(t.custom_assets || {}) });
    setSelectedBannerKind("hero");
  };

  const handleBannerUpload = async (kind: ToolBannerKind, file: File) => {
    if (!bannerModalTool) return;
    setUploadingKind(kind);
    try {
      const publicUrl = await adminRepo.uploadBanner(bannerModalTool.slug, kind, file);
      setBannerDraft((prev) => ({
        ...prev,
        [kind]: publicUrl,
      }));
      toast(`Imagem de ${kind.toUpperCase()} enviada com sucesso!`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao enviar imagem.", "error");
    } finally {
      setUploadingKind(null);
    }
  };

  const handleResetBanner = (kind: ToolBannerKind) => {
    setBannerDraft((prev) => {
      const next = { ...prev };
      delete next[kind];
      return next;
    });
    toast(`Banner ${kind.toUpperCase()} restaurado para a arte padrão.`, "info");
  };

  const handleSaveBanners = async () => {
    if (!bannerModalTool) return;
    setSaving(true);
    try {
      await adminRepo.updateToolAssets(bannerModalTool.slug, bannerDraft);
      setTools((prev) =>
        prev.map((t) => (t.slug === bannerModalTool.slug ? { ...t, custom_assets: { ...bannerDraft } } : t))
      );
      updateCustomToolAssets(bannerModalTool.appid, bannerDraft);
      toast(`Banners de ${bannerModalTool.name} salvos com sucesso!`, "success");
      setBannerModalTool(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao salvar banners.", "error");
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

  // Excluir membro e cadastro definitivo
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);
    try {
      await adminRepo.deleteUser(userToDelete.id);
      toast(`Membro ${userToDelete.name || userToDelete.email} excluído com sucesso.`, "info");
      setUserToDelete(null);
      setDeleteConfirmText("");
      if (editingUser?.id === userToDelete.id) {
        setEditingUser(null);
      }
      await loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao excluir membro.", "error");
    } finally {
      setDeletingUser(false);
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
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                        style={{ marginRight: 6 }}
                        onClick={() => openBannersModal(t)}
                        title="Modificar banners e artes visuais"
                      >
                        🎨 Banners
                      </button>
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
                          className="admin-btn admin-btn--ghost admin-btn--sm"
                          title="Ver histórico de atividades e gerenciar horas deste membro"
                          onClick={() => openUserActivities(u)}
                        >
                          ⏱️ Atividades
                        </button>
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
                        <button
                          className="admin-btn admin-btn--ghost admin-btn--danger admin-btn--sm"
                          title={
                            u.id === currentUserId
                              ? "Você não pode excluir sua própria conta"
                              : u.email === "holaluiz.mail@gmail.com"
                              ? "A conta do proprietário é protegida"
                              : "Excluir usuário e cadastro"
                          }
                          onClick={() => {
                            setUserToDelete(u);
                            setDeleteConfirmText("");
                          }}
                          disabled={u.id === currentUserId || u.email === "holaluiz.mail@gmail.com"}
                        >
                          🗑️
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

              <div style={{ marginTop: 12, marginBottom: 8, padding: 12, background: "rgb(var(--cm-surface-2))", borderRadius: 8, border: "1px solid rgb(var(--cm-line-soft))", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <strong style={{ fontSize: 13, display: "block" }}>🎨 Banners & Artes Visuais</strong>
                  <span style={{ fontSize: 11, color: "rgb(var(--cm-fg-muted))" }}>Personalize Hero, Header, Cápsula e Ícone</span>
                </div>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--sm"
                  onClick={() => {
                    const t = editingTool;
                    setEditingTool(null);
                    openBannersModal(t);
                  }}
                >
                  Modificar Banners
                </button>
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
          MODAL: BANNERS & ARTES DA FERRAMENTA
         ========================================================================= */}
      {bannerModalTool && (
        <div className="admin-modal-backdrop" onClick={() => !saving && setBannerModalTool(null)}>
          <div className="admin-modal admin-modal--wide" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
              <div>
                <span className="admin-header__eyebrow" style={{ fontSize: 10 }}>ARTES & VITRINE DA LOJA</span>
                <h2 className="admin-modal__title" style={{ margin: "4px 0" }}>
                  Banners de {bannerModalTool.name}
                </h2>
                <p className="admin-modal__desc" style={{ margin: 0 }}>
                  Personalize os banners e imagens promocionais desta ferramenta. Faça upload direto ou insira URLs externas.
                </p>
              </div>
              <button
                type="button"
                className="admin-btn admin-btn--ghost admin-btn--sm"
                onClick={() => !saving && setBannerModalTool(null)}
              >
                ✕ Fechar
              </button>
            </div>

            <div className="admin-modal__body-scroll">
              {/* Seletor de Tipo de Banner */}
              <div className="admin-banner-tabs">
                {(["hero", "header", "capsule", "icon", "logo"] as ToolBannerKind[]).map((kind) => {
                  const spec = BANNER_SPECS[kind];
                  const hasCustom = Boolean(bannerDraft[kind]);
                  const isActive = selectedBannerKind === kind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      className={`admin-banner-tab ${isActive ? "is-active" : ""} ${hasCustom ? "has-custom" : ""}`}
                      onClick={() => setSelectedBannerKind(kind)}
                    >
                      <span className="admin-banner-tab__indicator" />
                      <span>{spec.icon} {spec.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Área de Edição e Visualização */}
              {(() => {
                const spec = BANNER_SPECS[selectedBannerKind];
                const customUrl = bannerDraft[selectedBannerKind];
                const effectiveUrl = customUrl || `/tools/${bannerModalTool.slug}/art/${selectedBannerKind}.svg`;
                const isCustom = Boolean(customUrl);

                return (
                  <div className="admin-banner-editor">
                    {/* Coluna 1: Preview ao Vivo */}
                    <div className="admin-banner-preview-card">
                      <div className="admin-banner-preview-header">
                        <div>
                          <strong style={{ fontSize: 13, color: "rgb(var(--cm-fg))" }}>{spec.title}</strong>
                          <div style={{ fontSize: 11, color: "rgb(var(--cm-fg-muted))" }}>{spec.recommendedSize}</div>
                        </div>
                        {isCustom ? (
                          <span className="admin-badge admin-badge--published">● Personalizado</span>
                        ) : (
                          <span className="admin-badge admin-badge--unreleased">○ Padrão SVG</span>
                        )}
                      </div>

                      <div className={`admin-banner-preview-box ${spec.aspectClass}`}>
                        <img
                          key={effectiveUrl}
                          src={effectiveUrl}
                          alt={spec.title}
                          className="admin-banner-preview-img"
                          onError={(e) => {
                            (e.target as HTMLElement).style.opacity = "0.5";
                          }}
                        />
                      </div>

                      <p style={{ fontSize: 11, color: "rgb(var(--cm-fg-muted))", margin: 0, lineHeight: 1.4 }}>
                        📍 <strong>Onde aparece:</strong> {spec.location}
                      </p>
                    </div>

                    {/* Coluna 2: Controles de Upload e URL */}
                    <div className="admin-banner-controls">
                      {/* Upload Direto */}
                      <div className="admin-form-group">
                        <label>1. Enviar nova imagem do computador</label>
                        <label
                          className={`admin-banner-dropzone ${uploadingKind === selectedBannerKind ? "is-dragover" : ""}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleBannerUpload(selectedBannerKind, file);
                          }}
                        >
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp, image/svg+xml"
                            style={{ display: "none" }}
                            disabled={uploadingKind !== null}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleBannerUpload(selectedBannerKind, file);
                            }}
                          />
                          <div className="admin-banner-dropzone__icon">
                            {uploadingKind === selectedBannerKind ? "⏳" : "☁️"}
                          </div>
                          <div className="admin-banner-dropzone__text">
                            {uploadingKind === selectedBannerKind
                              ? "Enviando arquivo para o Supabase..."
                              : "Clique para escolher ou arraste o arquivo aqui"}
                          </div>
                          <div className="admin-banner-dropzone__sub">
                            PNG, JPG, WebP ou SVG (máximo 8 MB)
                          </div>
                        </label>
                      </div>

                      {/* URL Direta */}
                      <div className="admin-form-group">
                        <label>2. Ou insira a URL direta da imagem</label>
                        <input
                          type="url"
                          placeholder="https://exemplo.com/imagem.png"
                          value={customUrl || ""}
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            setBannerDraft((prev) => {
                              const next = { ...prev };
                              if (val) next[selectedBannerKind] = val;
                              else delete next[selectedBannerKind];
                              return next;
                            });
                          }}
                        />
                      </div>

                      {/* Ações Rápidas */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        {isCustom ? (
                          <button
                            type="button"
                            className="admin-btn admin-btn--ghost admin-btn--sm admin-btn--danger"
                            onClick={() => handleResetBanner(selectedBannerKind)}
                          >
                            ↺ Restaurar Arte Padrão
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: "rgb(var(--cm-fg-muted))" }}>
                            Usando arte SVG padrão do sistema
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Strip com Miniaturas de Todos os Formatos */}
              <div className="admin-banner-strip">
                <span className="admin-banner-strip__title">Todas as artes da ferramenta ({bannerModalTool.name})</span>
                <div className="admin-banner-strip__items">
                  {(["hero", "header", "capsule", "icon"] as ToolBannerKind[]).map((kind) => {
                    const spec = BANNER_SPECS[kind];
                    const custom = bannerDraft[kind];
                    const url = custom || `/tools/${bannerModalTool.slug}/art/${kind}.svg`;
                    const isActive = selectedBannerKind === kind;
                    return (
                      <button
                        key={kind}
                        type="button"
                        className={`admin-banner-strip-item ${isActive ? "is-active" : ""}`}
                        onClick={() => setSelectedBannerKind(kind)}
                      >
                        <div className="admin-banner-strip-item__thumb">
                          <img src={url} alt={spec.title} />
                        </div>
                        <span className="admin-banner-strip-item__label">{spec.title}</span>
                        <span className="admin-banner-strip-item__status">
                          {custom ? "● Personalizado" : "○ Padrão"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="admin-modal__actions" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgb(var(--cm-line-soft))" }}>
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                disabled={saving}
                onClick={() => setBannerModalTool(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={saving || uploadingKind !== null}
                onClick={handleSaveBanners}
              >
                {saving ? "Salvando no LAB..." : "💾 Salvar Todos os Banners"}
              </button>
            </div>
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

            <div
              style={{
                marginTop: "24px",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid rgba(231, 76, 60, 0.3)",
                background: "rgba(231, 76, 60, 0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <strong style={{ color: "#ff6b6b", display: "block", fontSize: "13px" }}>
                    Zona de Perigo: Excluir Cadastro
                  </strong>
                  <span style={{ fontSize: "12px", opacity: 0.7 }}>
                    Remove o login, dados de autenticação e histórico deste membro do sistema.
                  </span>
                </div>
                <button
                  type="button"
                  className="admin-btn admin-btn--danger admin-btn--sm"
                  onClick={() => {
                    const target = editingUser;
                    setEditingUser(null);
                    setUserToDelete(target);
                    setDeleteConfirmText("");
                  }}
                  disabled={editingUser.id === currentUserId || editingUser.email === "holaluiz.mail@gmail.com"}
                  title={
                    editingUser.id === currentUserId
                      ? "Você não pode excluir sua própria conta"
                      : editingUser.email === "holaluiz.mail@gmail.com"
                      ? "A conta do proprietário é protegida"
                      : "Excluir usuário e cadastro"
                  }
                >
                  🗑️ Excluir Membro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONFIRMAÇÃO DE EXCLUSÃO DE USUÁRIO
         ========================================================================= */}
      {userToDelete && (
        <div className="admin-modal-backdrop" onClick={() => !deletingUser && setUserToDelete(null)}>
          <div
            className="admin-modal"
            style={{ maxWidth: "520px", border: "1px solid rgba(231, 76, 60, 0.5)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <span style={{ fontSize: "28px" }}>⚠️</span>
              <div>
                <h2 className="admin-modal__title" style={{ color: "#ff6b6b", margin: 0 }}>
                  Excluir Usuário e Cadastro
                </h2>
                <p className="admin-modal__desc" style={{ margin: "4px 0 0" }}>
                  Esta ação é irreversível e removerá permanentemente o acesso.
                </p>
              </div>
            </div>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
                padding: "12px 16px",
                margin: "16px 0",
                fontSize: "13px",
                lineHeight: "1.6",
              }}
            >
              <div><strong>Nome:</strong> {userToDelete.name || "Sem nome"}</div>
              <div><strong>E-mail:</strong> {userToDelete.email}</div>
              <div><strong>Cargo atual:</strong> {userToDelete.role}</div>
            </div>

            <p style={{ fontSize: "13px", color: "rgba(255, 244, 232, 0.8)", lineHeight: "1.5" }}>
              Ao confirmar a exclusão:
            </p>
            <ul style={{ fontSize: "12px", opacity: 0.75, margin: "0 0 16px 20px", lineHeight: "1.6" }}>
              <li>A conta de autenticação será removida (o usuário não conseguirá mais fazer login).</li>
              <li>O perfil, dados de progresso e histórico de atividades serão apagados.</li>
              <li>O e-mail será liberado para um novo cadastro futuro, caso desejado.</li>
            </ul>

            {userToDelete.role === "admin" && (
              <div
                style={{
                  background: "rgba(231, 76, 60, 0.15)",
                  border: "1px solid rgba(231, 76, 60, 0.4)",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  marginBottom: "16px",
                  fontSize: "12px",
                  color: "#ff6b6b",
                }}
              >
                ⚠️ Este usuário é um Administrador. Para excluí-lo por segurança, altere o cargo dele para Membro primeiro.
              </div>
            )}

            <div className="admin-form-group">
              <label style={{ fontSize: "12px" }}>
                Para confirmar, digite <strong>EXCLUIR</strong> abaixo:
              </label>
              <input
                type="text"
                placeholder="Digite EXCLUIR para confirmar"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                disabled={deletingUser}
                autoFocus
              />
            </div>

            <div className="admin-modal__actions">
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => setUserToDelete(null)}
                disabled={deletingUser}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                onClick={handleDeleteUser}
                disabled={
                  deletingUser ||
                  deleteConfirmText.trim().toUpperCase() !== "EXCLUIR" ||
                  userToDelete.role === "admin"
                }
              >
                {deletingUser ? "Excluindo…" : "Sim, Excluir Definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ATIVIDADES E TEMPO DE USO DE UM MEMBRO
         ========================================================================= */}
      {userActivityModalUser && (
        <div className="admin-modal-backdrop" onClick={() => setUserActivityModalUser(null)}>
          <div className="admin-modal" style={{ maxWidth: "760px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h2 className="admin-modal__title">Atividades & Horas de Uso</h2>
                <p className="admin-modal__desc">
                  Histórico e controle de horas para <strong>{userActivityModalUser.name}</strong> ({userActivityModalUser.email})
                </p>
              </div>
              <button
                type="button"
                className="admin-modal__close-btn"
                onClick={() => setUserActivityModalUser(null)}
              >
                ✕
              </button>
            </div>

            {loadingUserAct ? (
              <div style={{ padding: "40px", textAlign: "center", color: "rgb(var(--cm-muted))" }}>
                Carregando registros de atividade…
              </div>
            ) : userActivities.length === 0 ? (
              <p style={{ color: "rgb(var(--cm-muted))", padding: "20px 0" }}>
                Nenhuma ferramenta vinculada a este membro.
              </p>
            ) : (
              <div className="admin-table-wrap" style={{ maxHeight: "400px", overflowY: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Ferramenta</th>
                      <th>Último Acesso</th>
                      <th>Tempo Registrado</th>
                      <th style={{ textAlign: "right" }}>Ajustar Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userActivities.map((act) => {
                      const hours = (act.playtime_minutes / 60).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
                      const isEditingThis = editingActTool?.tool_slug === act.tool_slug;
                      return (
                        <tr key={act.tool_slug}>
                          <td>
                            <strong>{act.tool_name}</strong>
                            <div style={{ fontSize: "11px", opacity: 0.6 }}>{act.tool_slug}</div>
                          </td>
                          <td style={{ fontSize: "12px" }}>
                            {act.last_played_unix > 0 ? (
                              <span>
                                {new Date(act.last_played_unix * 1000).toLocaleString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            ) : (
                              <span style={{ opacity: 0.4 }}>Nunca utilizado</span>
                            )}
                          </td>
                          <td>
                            <strong style={{ color: "rgb(var(--cm-accent, 255 112 26))" }}>
                              {act.playtime_minutes} min
                            </strong>{" "}
                            <span style={{ fontSize: "12px", opacity: 0.7 }}>({hours}h)</span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {isEditingThis ? (
                              <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                                <input
                                  type="number"
                                  min="0"
                                  className="admin-input"
                                  style={{ width: "80px", padding: "4px 8px", fontSize: "12px" }}
                                  value={editActMinutes}
                                  onChange={(e) => setEditActMinutes(parseInt(e.target.value, 10) || 0)}
                                />
                                <button
                                  className="admin-btn admin-btn--primary admin-btn--sm"
                                  onClick={() => handleUpdateActivity(userActivityModalUser, act.tool_slug, editActMinutes)}
                                >
                                  Salvar
                                </button>
                                <button
                                  className="admin-btn admin-btn--ghost admin-btn--sm"
                                  onClick={() => setEditingActTool(null)}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: "inline-flex", gap: "6px", justifyContent: "flex-end" }}>
                                <button
                                  className="admin-btn admin-btn--ghost admin-btn--sm"
                                  title="Adicionar 30 minutos de uso"
                                  onClick={() => handleUpdateActivity(userActivityModalUser, act.tool_slug, act.playtime_minutes + 30)}
                                >
                                  +30m
                                </button>
                                <button
                                  className="admin-btn admin-btn--ghost admin-btn--sm"
                                  title="Adicionar 1 hora de uso"
                                  onClick={() => handleUpdateActivity(userActivityModalUser, act.tool_slug, act.playtime_minutes + 60)}
                                >
                                  +1h
                                </button>
                                <button
                                  className="admin-btn admin-btn--primary admin-btn--sm"
                                  onClick={() => {
                                    setEditingActTool(act);
                                    setEditActMinutes(act.playtime_minutes);
                                  }}
                                >
                                  Editar
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="admin-modal__actions" style={{ marginTop: "20px" }}>
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => setUserActivityModalUser(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
