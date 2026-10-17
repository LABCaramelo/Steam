import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { artUrl, useLibrary } from "../api";
import { AppArt } from "../components/AppArt";
import { Avatar, STATUS_COLOR } from "../components/Avatar";
import { formatDate, formatPlaytime } from "../format";
import { STATUS_LABEL, useUi } from "../ui";

/** Profile built from local facts: persona, playtime totals, favorites and achievement counts. */
export function ProfilePage() {
  const { snapshot, collections } = useLibrary();
  const ui = useUi();
  const nav = useNavigate();
  const apps = snapshot?.apps ?? [];
  const stats = useMemo(() => {
    const totalMin = apps.reduce((s, a) => s + a.playtimeMinutes, 0);
    const ach = apps.reduce((s, a) => s + (a.achievements?.achieved ?? 0), 0);
    const played = apps.filter((a) => a.playtimeMinutes > 0).length;
    return { totalMin, ach, played };
  }, [apps]);
  const recent = [...apps].filter((a) => a.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, 4);
  const fav = collections.find((c) => c.id === "favorite");
  const favApps = apps.filter((a) => fav?.appids.includes(a.appid));
  const top = [...apps].sort((a, b) => b.playtimeMinutes - a.playtimeMinutes)[0];

  return (
    <div className="profile">
      {top?.art.hero && <div className="profile__bg" style={{ backgroundImage: `url(${artUrl(top.appid, top.art.heroBlur ? "heroBlur" : "hero")})` }} />}
      <div className="profile__inner">
        <header className="profile__header">
          <Avatar size={164} />
          <div className="profile__id">
            <h1>{snapshot?.user?.personaName}</h1>
            <div className="profile__status" style={{ color: STATUS_COLOR[ui.status] }}>
              {STATUS_LABEL[ui.status]}
            </div>
            {snapshot?.user?.steamId64 && <div className="muted small mono">LAB ID {snapshot.user.steamId64}</div>}
          </div>
          <div className="profile__counters">
            <div>
              <b>{apps.length}</b>
              <span>Ferramentas</span>
            </div>
            <div>
              <b>{Math.round(stats.totalMin / 60).toLocaleString("pt-BR")}</b>
              <span>Horas</span>
            </div>
            <div>
              <b>{stats.ach}</b>
              <span>Conquistas</span>
            </div>
          </div>
        </header>

        <div className="profile__cols">
          <div>
            {favApps.length > 0 && (
              <section className="profile__box">
                <h2>Ferramentas favoritas</h2>
                <div className="profile__favs">
                  {favApps.map((a) => (
                    <button key={a.appid} onClick={() => nav(`/library/app/${a.appid}`)} title={a.name}>
                      <AppArt app={a} kind="capsule" />
                    </button>
                  ))}
                </div>
              </section>
            )}
            <section className="profile__box">
              <h2>Atividade recente</h2>
              <p className="muted small">{formatPlaytime(stats.totalMin)} registradas em {stats.played} títulos</p>
              {recent.map((a) => (
                <button key={a.appid} className="profile__recent" onClick={() => nav(`/library/app/${a.appid}`)}>
                  <AppArt app={a} kind="header" />
                  <div>
                    <div className="profile__recent-name">{a.name}</div>
                    <div className="muted small">
                      {formatPlaytime(a.playtimeMinutes)} no total • jogado pela última vez em {formatDate(a.lastPlayed)}
                    </div>
                    {a.achievements && (
                      <div className="profile__ach">
                        Conquistas {a.achievements.achieved} de {a.achievements.total}
                        <span className="mini-progress">
                          <span style={{ width: `${(a.achievements.achieved / a.achievements.total) * 100}%` }} />
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </section>
          </div>
          <aside className="profile__side">
            <div className="profile__box">
              <h2>Coleções</h2>
              {collections
                .filter((c) => c.id !== "hidden")
                .map((c) => (
                  <button key={c.id} className="profile__link" onClick={() => nav(`/library/collection/${c.id}`)}>
                    {c.name} <span className="muted">({c.appids.length})</span>
                  </button>
                ))}
            </div>
            <div className="profile__box">
              <h2>Perfil público</h2>
              {snapshot?.user?.steamId64 ? (
                <a href={`https://steamcommunity.com/profiles/${snapshot.user.steamId64}`} target="_blank" rel="noopener noreferrer">
                  Abrir no LAB Community
                </a>
              ) : (
                <span className="muted">Indisponível</span>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
