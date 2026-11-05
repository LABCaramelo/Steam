import type { AdminAchievementItem, AdminStats, AdminToolItem } from "./types";

export type AdminTab = "dashboard" | "tools" | "seeds" | "achievements" | "users";

export function AdminOverview({
  stats,
  tools,
  achievements,
  navigate,
  onOpenNotify,
}: {
  stats: AdminStats;
  tools: AdminToolItem[];
  achievements: AdminAchievementItem[];
  navigate: (tab: AdminTab) => void;
  onOpenNotify?: (tool: AdminToolItem) => void;
}) {
  const catalog = tools.filter((tool) => tool.slug !== "admin");
  const betaTools = catalog.filter((tool) => tool.available && tool.stage === "beta").length;
  const stableTools = catalog.filter((tool) => tool.available && tool.stage !== "beta").length;
  const whatsappRate = stats.total_users > 0
    ? Math.round((stats.whatsapp_verified / stats.total_users) * 100)
    : 0;

  const topTools = [...catalog]
    .sort((a, b) => b.owners_count - a.owners_count)
    .slice(0, 4);

  return (
    <section className="admin-overview" aria-label="Visão geral do LAB">
      <div className="admin-section__head" style={{ marginBottom: 24 }}>
        <div>
          <span className="admin-kicker">01 / VISÃO GERAL EXECUTIVA</span>
          <h2 className="admin-page-title">O que acontece no LAB agora.</h2>
          <p className="admin-section__subtitle">
            Contas, publicações, regras de acesso e telemetria da comunidade em tempo real.
          </p>
        </div>
      </div>

      {/* 5 Cartões Executivos de Métricas */}
      <div className="admin-metric-strip">
        <button type="button" className="admin-metric" onClick={() => navigate("users")} title="Clique para gerenciar membros">
          <span className="admin-metric__label">Membros</span>
          <strong>{stats.total_users}</strong>
          <span>{stats.active_users} ativos · {stats.pending_users} pendentes</span>
        </button>

        <button type="button" className="admin-metric" onClick={() => navigate("tools")} title="Clique para ver o catálogo de ferramentas">
          <span className="admin-metric__label">Ferramentas</span>
          <strong>{stats.published_tools}</strong>
          <span>{stableTools} estáveis · {betaTools} beta · {stats.unreleased_tools} em breve</span>
        </button>

        <button type="button" className="admin-metric" onClick={() => navigate("users")} title="Total de instalações individuais">
          <span className="admin-metric__label">Aquisições</span>
          <strong>{stats.total_acquisitions}</strong>
          <span>Instalações nas bibliotecas</span>
        </button>

        <button type="button" className="admin-metric" onClick={() => navigate("users")} title="Membros com WhatsApp confirmado">
          <span className="admin-metric__label">WhatsApp LAB</span>
          <strong>{stats.whatsapp_verified}</strong>
          <span>{whatsappRate}% da comunidade verificada</span>
        </button>

        <button type="button" className="admin-metric" onClick={() => navigate("achievements")} title="Conquistas concedidas">
          <span className="admin-metric__label">Conquistas</span>
          <strong>{achievements.length}</strong>
          <span>{achievements.reduce((sum, item) => sum + item.unlocked_count, 0)} concedidas</span>
        </button>
      </div>

      {/* Duas Colunas Centrais: Decisões + Matriz de Acesso */}
      <div className="admin-overview-grid">
        <section className="admin-section admin-priority" style={{ marginBottom: 0 }}>
          <span className="admin-kicker">PRÓXIMAS DECISÕES</span>
          <h3 className="admin-section__title" style={{ marginBottom: 14 }}>Seu Ponto de Partida</h3>
          
          <button type="button" className="admin-action-row" onClick={() => navigate("users")}>
            <span>
              <strong>Revisar membros e permissões</strong>
              <small>{stats.pending_users} pendentes · {stats.blocked_users} bloqueados · {stats.admin_users} administradores</small>
            </span>
            <span aria-hidden="true" style={{ fontSize: 16, color: "rgb(var(--cm-accent, 255 112 26))" }}>↗</span>
          </button>

          <button type="button" className="admin-action-row" onClick={() => navigate("tools")}>
            <span>
              <strong>Organizar a vitrine da Loja</strong>
              <small>{stats.unreleased_tools} não publicadas · {stats.total_tools} ferramentas no catálogo</small>
            </span>
            <span aria-hidden="true" style={{ fontSize: 16, color: "rgb(var(--cm-accent, 255 112 26))" }}>↗</span>
          </button>

          <button type="button" className="admin-action-row" onClick={() => navigate("users")}>
            <span>
              <strong>Gerenciar ferramentas por membro</strong>
              <small>Conceda novas ferramentas ou revogue acessos individuais a qualquer momento.</small>
            </span>
            <span aria-hidden="true" style={{ fontSize: 16, color: "rgb(var(--cm-accent, 255 112 26))" }}>↗</span>
          </button>

          <button type="button" className="admin-action-row" onClick={() => navigate("achievements")}>
            <span>
              <strong>Conceder conquistas e reconhecer evolução</strong>
              <small>{achievements.length} medalhas cadastradas prontas para entrega.</small>
            </span>
            <span aria-hidden="true" style={{ fontSize: 16, color: "rgb(var(--cm-accent, 255 112 26))" }}>↗</span>
          </button>
        </section>

        <section className="admin-section admin-access-map" style={{ marginBottom: 0 }}>
          <span className="admin-kicker">REGRAS CANÔNICAS DE ACESSO</span>
          <h3 className="admin-section__title" style={{ marginBottom: 14 }}>Cada cargo, um alcance</h3>
          
          <dl>
            <div>
              <dt>
                <span className="admin-badge admin-badge--admin">ADMIN</span>
                <span style={{ fontSize: 11, opacity: 0.6 }}>{stats.admin_users} conta(s)</span>
              </dt>
              <dd>Acesso irrestrito a todas as ferramentas do ecossistema, incluindo as que ainda não foram publicadas.</dd>
            </div>
            <div>
              <dt>
                <span className="admin-badge admin-badge--beta">BETA</span>
                <span style={{ fontSize: 11, opacity: 0.6 }}>Acesso antecipado</span>
              </dt>
              <dd>Únicos autorizados a acessar ferramentas publicadas em estágio BETA, além das ferramentas estáveis adquiridas.</dd>
            </div>
            <div>
              <dt>
                <span className="admin-badge admin-badge--member">MEMBRO / ALUNO</span>
                <span style={{ fontSize: 11, opacity: 0.6 }}>Uso regular</span>
              </dt>
              <dd>Acesso às ferramentas estáveis publicadas que tiver adquirido individualmente na Loja.</dd>
            </div>
          </dl>
          
          <p className="admin-help">
            As regras de acesso são validadas em tempo real pelo banco de dados do LAB e aplicadas a todas as sessões ativas.
          </p>
        </section>
      </div>

      {/* Destaque das Ferramentas Mais Adotadas */}
      <section className="admin-section" style={{ marginTop: 24, marginBottom: 0 }}>
        <div className="admin-section__head" style={{ marginBottom: 16 }}>
          <div>
            <span className="admin-kicker">ADOÇÃO NO LAB</span>
            <h3 className="admin-section__title">Ferramentas com Maior Alcance</h3>
          </div>
          <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => navigate("tools")}>
            Ver Catálogo Completo ({catalog.length}) →
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {topTools.map((t) => (
            <div
              key={t.slug}
              style={{
                background: "rgb(var(--cm-surface-2))",
                border: "1px solid rgb(var(--cm-line-soft))",
                borderRadius: "var(--cm-radius-sm, 8px)",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <strong style={{ fontSize: 13, display: "block", color: "rgb(var(--cm-fg))" }}>
                  {t.name}
                </strong>
                <span style={{ fontSize: 11, color: "rgb(var(--cm-fg-muted))" }}>
                  #{t.appid} · <strong>{t.owners_count}</strong> {t.owners_count === 1 ? "membro" : "membros"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {t.available ? (
                  <span className="admin-badge admin-badge--published" style={{ fontSize: 10, padding: "2px 6px" }}>
                    Publicada
                  </span>
                ) : (
                  <span className="admin-badge admin-badge--unreleased" style={{ fontSize: 10, padding: "2px 6px" }}>
                    Em breve
                  </span>
                )}
                {onOpenNotify && t.available && (
                  <button
                    type="button"
                    className="admin-btn admin-btn--icon"
                    title={`Avisar sobre ${t.name} no WhatsApp`}
                    onClick={() => onOpenNotify(t)}
                  >
                    📢
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
