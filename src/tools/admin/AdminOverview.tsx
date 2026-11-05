import type { AdminAchievementItem, AdminStats, AdminToolItem } from "./types";

export type AdminTab = "dashboard" | "tools" | "seeds" | "achievements" | "users";

export function AdminOverview({ stats, tools, achievements, navigate }: {
  stats: AdminStats;
  tools: AdminToolItem[];
  achievements: AdminAchievementItem[];
  navigate: (tab: AdminTab) => void;
}) {
  const catalog = tools.filter((tool) => tool.slug !== "admin");
  const betaTools = catalog.filter((tool) => tool.available && tool.stage === "beta").length;
  const stableTools = catalog.filter((tool) => tool.available && tool.stage !== "beta").length;
  return (
    <section className="admin-overview" aria-label="Visão geral do LAB">
      <div className="admin-section__head">
        <div>
          <span className="admin-kicker">01 / Visão geral</span>
          <h2 className="admin-page-title">O que acontece no LAB.</h2>
          <p className="admin-section__subtitle">Contas, publicações e acessos em um só lugar.</p>
        </div>
      </div>

      <div className="admin-metric-strip">
        <button className="admin-metric" onClick={() => navigate("users")}>
          <span className="admin-metric__label">Membros</span>
          <strong>{stats.total_users}</strong>
          <span>{stats.active_users} ativos · {stats.pending_users} pendentes</span>
        </button>
        <button className="admin-metric" onClick={() => navigate("tools")}>
          <span className="admin-metric__label">Publicadas</span>
          <strong>{stats.published_tools}</strong>
          <span>{stableTools} estáveis · {betaTools} beta</span>
        </button>
        <button className="admin-metric" onClick={() => navigate("users")}>
          <span className="admin-metric__label">Aquisições</span>
          <strong>{stats.total_acquisitions}</strong>
          <span>Ferramentas nas bibliotecas</span>
        </button>
        <button className="admin-metric" onClick={() => navigate("achievements")}>
          <span className="admin-metric__label">Conquistas</span>
          <strong>{achievements.length}</strong>
          <span>{achievements.reduce((sum, item) => sum + item.unlocked_count, 0)} concedidas</span>
        </button>
      </div>

      <div className="admin-overview-grid">
        <section className="admin-section admin-priority">
          <span className="admin-kicker">Próximas decisões</span>
          <h3 className="admin-section__title">Seu ponto de partida</h3>
          <button className="admin-action-row" onClick={() => navigate("users")}>
            <span><strong>Revisar membros e acessos</strong><small>{stats.pending_users} pendentes · {stats.blocked_users} bloqueados</small></span>
            <span aria-hidden="true">↗</span>
          </button>
          <button className="admin-action-row" onClick={() => navigate("tools")}>
            <span><strong>Organizar o catálogo</strong><small>{stats.unreleased_tools} não publicadas · {stats.total_tools} no total</small></span>
            <span aria-hidden="true">↗</span>
          </button>
          <button className="admin-action-row" onClick={() => navigate("users")}>
            <span><strong>Gerenciar aquisições individuais</strong><small>Veja ferramentas adquiridas e remova acessos por membro.</small></span>
            <span aria-hidden="true">↗</span>
          </button>
        </section>

        <section className="admin-section admin-access-map">
          <span className="admin-kicker">Regras de acesso</span>
          <h3 className="admin-section__title">Cada cargo, um alcance.</h3>
          <dl>
            <div><dt>ADMIN <span>{stats.admin_users} contas</span></dt><dd>Todas as ferramentas, inclusive as que ainda não foram publicadas.</dd></div>
            <div><dt>BETA</dt><dd>Ferramentas estáveis e beta publicadas, conforme suas aquisições.</dd></div>
            <div><dt>Membro / Aluno</dt><dd>Ferramentas estáveis publicadas, conforme suas aquisições.</dd></div>
          </dl>
          <p className="admin-help">As permissões de cada cargo valem para contas ativas. {stats.whatsapp_verified} membros têm WhatsApp confirmado.</p>
        </section>
      </div>
    </section>
  );
}
