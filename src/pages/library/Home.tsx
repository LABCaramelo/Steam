import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { artUrl, useLibrary } from "../../api";
import { AppArt } from "../../components/AppArt";
import { IconChevronDown, IconTrophy } from "../../components/Icons";
import { Menu } from "../../components/Menu";
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

  if (!snapshot) return <div className="page-loading">Carregando…</div>;

  return (
    <div className="home">
      <section className="home__recent">
        {bg && <div className="home__recent-bg" style={{ backgroundImage: `url(${artUrl(bg.appid, bg.art.heroBlur ? "heroBlur" : "hero")})` }} />}
        <h2 className="shelf-title">
          Jogos recentes <span className="shelf-title__count">{recent.length}</span>
        </h2>
        {recent.length === 0 ? (
          <p className="muted">Nenhuma atividade registrada ainda.</p>
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

      <section className="home__shelf">
        <h2 className="shelf-title">{t("Menu_NewForYou")}</h2>
        {feed.length === 0 ? (
          <p className="muted">Nada novo por aqui.</p>
        ) : (
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
        )}
      </section>

      {favApps.length > 0 && (
        <section className="home__shelf">
          <h2 className="shelf-title">
            <Link to="/library/collection/favorite">{t("GameList_Category_Favorites")}</Link>
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
            Todos os jogos <span className="shelf-title__count">({apps.length})</span>
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
        <div className="grid">
          {sortApps(apps, sort).map((a) => (
            <Capsule key={a.appid} app={a} size="sm" caption={sortCaption(a, sort)} />
          ))}
        </div>
      </section>
    </div>
  );
}
