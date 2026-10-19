import { IconArrowRight, MagneticButton, TiltSurface } from "@caramelo/design-system";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { artUrl, useLibrary } from "../../api";
import { AppArt } from "../../components/AppArt";
import { CarameloIsotype } from "../../components/CarameloIsotype";
import { IconChevronDown, IconTrophy } from "../../components/Icons";
import { Menu } from "../../components/Menu";
import { PointerTrail } from "../../components/PointerTrail";
import { formatBytes, formatDate, formatPlaytime, recencyBucket } from "../../format";
import { t } from "../../i18n";
import type { Achievement, LibraryApp } from "../../types";
import { Capsule } from "./Capsule";

export type SortKey = "alpha" | "hours" | "lastPlayed" | "release" | "size" | "metacritic" | "achievements";
export const SORT_LABEL: Record<SortKey, string> = {
  alpha: t("Library_SortByAlphabetical"),
  hours: t("Library_SortByHoursPlayed"),
  lastPlayed: t("Library_SortByLastPlayed"),
  release: t("Library_SortByReleaseDate"),
  size: t("Library_SortBySizeOnDisk"),
  metacritic: t("Library_SortByMetacriticScore"),
  achievements: t("Library_SortByPctAchievementsComplete"),
};

export function sortApps(apps: LibraryApp[], key: SortKey): LibraryApp[] {
  const pct = (a: LibraryApp) => (a.achievements ? a.achievements.achieved / Math.max(1, a.achievements.total) : -1);
  const cmp: Record<SortKey, (a: LibraryApp, b: LibraryApp) => number> = {
    alpha: (a, b) => a.name.localeCompare(b.name, "pt-BR"),
    hours: (a, b) => b.playtimeMinutes - a.playtimeMinutes,
    lastPlayed: (a, b) => b.lastPlayed - a.lastPlayed,
    release: (a, b) => (b.releaseDate ?? 0) - (a.releaseDate ?? 0),
    size: (a, b) => b.sizeOnDisk - a.sizeOnDisk,
    metacritic: (a, b) => (b.metacritic ?? 0) - (a.metacritic ?? 0),
    achievements: (a, b) => pct(b) - pct(a),
  };
  return [...apps].sort(cmp[key]);
}

function sortCaption(a: LibraryApp, key: SortKey): string | undefined {
  switch (key) {
    case "hours":
      return formatPlaytime(a.playtimeMinutes);
    case "lastPlayed":
      return a.lastPlayed ? formatDate(a.lastPlayed) : "Nunca";
    case "release":
      return formatDate(a.releaseDate);
    case "size":
      return a.sizeOnDisk ? formatBytes(a.sizeOnDisk) : "Não instalado";
    case "metacritic":
      return a.metacritic ? `Metacritic ${a.metacritic}` : "—";
    case "achievements":
      return a.achievements ? `${Math.round((a.achievements.achieved / a.achievements.total) * 100)}% alcançadas` : "Nenhuma conquista";
    default:
      return undefined;
  }
}

interface FeedItem {
  when: number;
  app: LibraryApp;
  kind: "achievement" | "update" | "session";
  title: string;
  detail: string;
  image?: string;
}

/** "Novidades" built only from facts on disk: achievement unlocks, installed updates and play sessions. */
function useLocalFeed(apps: LibraryApp[]): FeedItem[] {
  const [achievements, setAchievements] = useState<Record<number, Achievement[]>>({});
  const withAch = useMemo(() => apps.filter((a) => a.achievements && a.achievements.achieved > 0).map((a) => a.appid), [apps]);
  useEffect(() => {
    let alive = true;
    Promise.all(withAch.map((id) => fetch(`/api/app/${id}/achievements`).then((r) => r.json()).then((d) => [id, d.list] as const)))
      .then((pairs) => alive && setAchievements(Object.fromEntries(pairs)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [withAch]);

  return useMemo(() => {
    const items: FeedItem[] = [];
    for (const app of apps) {
      if (app.lastUpdated && app.installed) {
        items.push({ when: app.lastUpdated, app, kind: "update", title: "Atualização instalada", detail: `Build ${app.buildid ?? "?"} • ${formatBytes(app.sizeOnDisk)} no disco` });
      }
      if (app.lastPlayed) {
        items.push({ when: app.lastPlayed, app, kind: "session", title: "Última sessão", detail: `${formatPlaytime(app.playtimeMinutes)} no total` });
      }
      for (const a of achievements[app.appid] ?? []) {
        if (a.achieved && a.unlocked) items.push({ when: a.unlocked, app, kind: "achievement", title: a.name, detail: a.description, image: a.image });
      }
    }
    return items.sort((a, b) => b.when - a.when).slice(0, 10);
  }, [apps, achievements]);
}

export function LibraryHome() {
  const { snapshot, collections } = useLibrary();
  const nav = useNavigate();
  const [sort, setSort] = useState<SortKey>("alpha");
  const apps = snapshot?.apps ?? [];
  const feed = useLocalFeed(apps);

  const recent = useMemo(() => apps.filter((a) => a.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, 10), [apps]);
  const recentGroups = useMemo(() => {
    const groups: { label: string; apps: LibraryApp[] }[] = [];
    for (const a of recent) {
      const label = recencyBucket(a.lastPlayed);
      const g = groups.find((x) => x.label === label);
      if (g) g.apps.push(a);
      else groups.push({ label, apps: [a] });
    }
    return groups;
  }, [recent]);
  const favorites = collections.find((c) => c.id === "favorite");
  const favApps = apps.filter((a) => favorites?.appids.includes(a.appid));
  const bg = recent.find((a) => a.art.heroBlur || a.art.hero);
  const firstTool = apps.find((a) => a.tool);

  if (!snapshot) return <div className="page-loading">Carregando…</div>;

  if (apps.length === 0) {
    return (
      <div className="home home--empty-canvas">
        <PointerTrail className="home-hero cm-surface--spotlight">
          {/* pointer-tilt no cartaz; os botões ficam fora do plano que gira. */}
          <TiltSurface className="home-hero__poster">
            <CarameloIsotype className="home-hero__badge" size={56} decorative interactive />
            <span className="home-hero__eyebrow">UM CARA CARAMELO • LABORATÓRIO DE INTERAÇÃO</span>
            <h1 className="home-hero__title font-display">BIBLIOTECA DE FERRAMENTAS</h1>
            <p className="home-hero__lead">
              Todos os jogos foram removidos do projeto. O catálogo está limpo e pronto para receber suas ferramentas, automações e sistemas autorais.
            </p>
          </TiltSurface>
          <div className="home-hero__actions">
            <MagneticButton variant="accent" size="lg" icon={<IconArrowRight />} onClick={() => nav("/store")}>
              EXPLORAR CATÁLOGO
            </MagneticButton>
          </div>
          <span className="cm-handwritten home-hero__quote">
            "menos ferramenta, mais sistema."
          </span>
        </PointerTrail>
      </div>
    );
  }

  return (
    <div className="home">
      <section className="home__recent">
        {bg && <div className="home__recent-bg" style={{ backgroundImage: `url(${artUrl(bg.appid, bg.art.heroBlur ? "heroBlur" : "hero")})` }} />}
        <h2 className="shelf-title">
          {recent.length === 0 && firstTool ? "Comece por aqui" : <>Ferramentas recentes <span className="shelf-title__count">{recent.length}</span></>}
        </h2>
        {recent.length === 0 ? (
          firstTool?.tool ? (
            <div className="home-tool-feature cm-surface--spotlight">
              <Link className="home-tool-feature__art" to={`/library/app/${firstTool.appid}`} aria-label={`Conhecer ${firstTool.name}`}>
                <AppArt app={firstTool} kind="header" />
              </Link>
              <div className="home-tool-feature__body">
                <span className="tool-details__eyebrow">SUA PRIMEIRA FERRAMENTA</span>
                <h2>{firstTool.name}</h2>
                <p>{firstTool.tool.description}</p>
                <MagneticButton
                  variant="accent"
                  href={firstTool.tool.launchPath}
                  icon={<IconArrowRight />}
                  onClick={(e) => {
                    e.preventDefault();
                    nav(firstTool.tool!.launchPath);
                  }}
                >
                  Abrir biblioteca
                </MagneticButton>
              </div>
            </div>
          ) : <p className="muted">Nenhuma atividade registrada ainda.</p>
        ) : (
          <div className="home__recent-row">
            {recentGroups.map((g, gi) => (
              <div key={g.label} className="home__recent-group">
                <div className="home__recent-label">{g.label}</div>
                <div className="home__recent-items">
                  {g.apps.map((a, i) => (
                    <Capsule key={a.appid} app={a} size={gi === 0 && i === 0 ? "lg" : "md"} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {feed.length > 0 && <section className="home__shelf">
        <h2 className="shelf-title">{t("Menu_NewForYou")}</h2>
          <div className="feed">
            {feed.map((f, i) => (
              <button key={i} className={`feed-card feed-card--${f.kind}`} onClick={() => nav(`/library/app/${f.app.appid}`)}>
                <div className="feed-card__art">
                  <AppArt app={f.app} kind="header" fallbackLabel />
                  {f.kind === "achievement" && f.image && <img className="feed-card__ach" src={f.image} alt="" loading="lazy" />}
                </div>
                <div className="feed-card__body">
                  <div className="feed-card__kind">
                    {f.kind === "achievement" ? (
                      <>
                        <IconTrophy size={12} /> Conquista desbloqueada
                      </>
                    ) : f.kind === "update" ? (
                      "Atualização"
                    ) : (
                      "Atividade"
                    )}
                  </div>
                  <div className="feed-card__title">{f.title}</div>
                  <div className="feed-card__detail">{f.detail}</div>
                  <div className="feed-card__meta">
                    {f.app.name} • {formatDate(f.when)}
                  </div>
                </div>
              </button>
            ))}
          </div>
      </section>}

      {favApps.length > 0 && (
        <section className="home__shelf">
          <h2 className="shelf-title">
            {t("GameList_Category_Favorites")}
            <span className="shelf-title__count">{favApps.length}</span>
          </h2>
          <div className="shelf-row">
            {favApps.map((a) => (
              <Capsule key={a.appid} app={a} size="sm" />
            ))}
          </div>
        </section>
      )}

      <section className="home__shelf">
        <div className="shelf-head">
          <h2 className="shelf-title">
            Todas as ferramentas <span className="shelf-title__count">({apps.length})</span>
          </h2>
          <Menu
            align="right"
            items={(Object.keys(SORT_LABEL) as SortKey[]).map((k) => ({ label: SORT_LABEL[k], checked: sort === k, onSelect: () => setSort(k) }))}
            trigger={() => (
              <span className="sort-picker">
                {t("Library_SortCollectionBy")}: <b>{SORT_LABEL[sort]}</b> <IconChevronDown size={12} />
              </span>
            )}
          />
        </div>
        {apps.length === 0 ? (
          <div className="home__empty cm-surface--spotlight" style={{ padding: "48px 24px", textAlign: "center", background: "rgb(var(--cm-surface-2) / 0.4)", borderRadius: "var(--cm-radius-lg)", border: "1px dashed rgb(var(--cm-line))", marginTop: "16px" }}>
            <p className="font-display" style={{ color: "rgb(var(--cm-fg))", fontSize: "18px", fontWeight: 800, marginBottom: "8px", letterSpacing: "-0.03em" }}>NENHUMA FERRAMENTA NO CATÁLOGO</p>
            <p className="muted" style={{ fontSize: "14px", maxWidth: "460px", margin: "0 auto", lineHeight: "1.6" }}>
              Todos os jogos foram removidos do projeto. O catálogo do LAB está limpo e pronto para o cadastro das suas ferramentas.
            </p>
            <span className="cm-handwritten" style={{ marginTop: "14px", fontSize: "18px" }}>
              "espaço pronto para criação e novos sistemas."
            </span>
          </div>
        ) : (
          <div className="grid">
            {sortApps(apps, sort).map((a) => (
              <Capsule key={a.appid} app={a} size="sm" caption={sortCaption(a, sort)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
