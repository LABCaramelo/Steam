import { CopyButton } from "@caramelo/design-system";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { artUrl, useLibrary } from "../api";
import { useAuth } from "../auth";
import { AppArt } from "../components/AppArt";
import { Avatar, STATUS_COLOR } from "../components/Avatar";
import { EditProfileModal } from "../components/EditProfileModal";
import { IconCamera, IconEdit } from "../components/Icons";
import { formatDate, formatPlaytime } from "../format";
import { STATUS_LABEL, useUi } from "../ui";

/** Profile built from local facts: persona, playtime totals, favorites and achievement counts. */
export function ProfilePage() {
  const { snapshot, collections, achievementSummary } = useLibrary();
  const { profile } = useAuth();
  const ui = useUi();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isEditing, setIsEditing] = useState(() => searchParams.get("edit") === "1");

  const apps = snapshot?.apps ?? [];
  const stats = useMemo(() => {
    const totalMin = apps.reduce((s, a) => s + a.playtimeMinutes, 0);
    const ach = achievementSummary?.total_unlocked ?? apps.reduce((s, a) => s + (a.achievements?.achieved ?? 0), 0);
    const played = apps.filter((a) => a.playtimeMinutes > 0).length;
    return { totalMin, ach, played };
  }, [apps, achievementSummary]);
  const recent = [...apps].filter((a) => a.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, 4);
  const fav = collections.find((c) => c.id === "favorite");
  const favApps = apps.filter((a) => fav?.appids.includes(a.appid));
  const top = [...apps].sort((a, b) => b.playtimeMinutes - a.playtimeMinutes)[0];

  const handleCloseEdit = () => {
    setIsEditing(false);
    if (searchParams.get("edit")) {
      const next = new URLSearchParams(searchParams);
      next.delete("edit");
      setSearchParams(next, { replace: true });
    }
  };

  const bioText = profile?.bio?.trim() || "elegância + pequena confissão patética";

  return (
    <div className="profile">
      {top?.art.hero && <div className="profile__bg" style={{ backgroundImage: `url(${artUrl(top.appid, top.art.heroBlur ? "heroBlur" : "hero")})` }} />}
      <div className="profile__inner">
        <header className="profile__header">
          <div className="profile__avatar-container">
            <Avatar size={164} />
            <button
              type="button"
              className="profile__avatar-overlay-btn"
              onClick={() => setIsEditing(true)}
              title="Trocar foto de perfil"
              aria-label="Trocar foto de perfil"
            >
              <IconCamera size={20} />
              <span>Trocar foto</span>
            </button>
          </div>

          <div className="profile__id">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h1 className="font-display">{snapshot?.user?.personaName}</h1>
              {profile?.nickname && (
                <span className="cm-brand-badge" style={{ fontSize: "11px", letterSpacing: "0.04em" }}>
                  @{profile.nickname}
                </span>
              )}
            </div>

            <div className="profile__status" style={{ color: STATUS_COLOR[ui.status] }}>
              {STATUS_LABEL[ui.status]}
            </div>

            {snapshot?.user?.steamId64 && (
              <div className="muted small mono copy-row">
                LAB ID {snapshot.user.steamId64}
                <CopyButton value={snapshot.user.steamId64} aria-label="Copiar LAB ID" />
              </div>
            )}

            <div className="cm-handwritten profile__bio">
              "{bioText}"
            </div>

            <div style={{ marginTop: "14px" }}>
              <button
                type="button"
                className="btn btn--blue profile__edit-btn"
                onClick={() => setIsEditing(true)}
              >
                <IconEdit size={14} />
                <span>Editar perfil</span>
              </button>
            </div>
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

        {isEditing && <EditProfileModal onClose={handleCloseEdit} />}

        <div className="profile__cols">
          <div>
            {favApps.length > 0 && (
              <section className="profile__box cm-surface--spotlight">
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
            <section className="profile__box cm-surface--spotlight">
              <h2>Atividade recente</h2>
              <p className="muted small">{formatPlaytime(stats.totalMin)} registradas em {stats.played} títulos</p>
              {recent.length === 0 && <p className="muted small" style={{ marginTop: "12px" }}>Nenhuma atividade registrada.</p>}
              {recent.map((a) => (
                <button key={a.appid} className="profile__recent" onClick={() => nav(`/library/app/${a.appid}`)}>
                  <AppArt app={a} kind="header" />
                  <div>
                    <div className="profile__recent-name">{a.name}</div>
                    <div className="muted small">
                      {formatPlaytime(a.playtimeMinutes)} no total • utilizado pela última vez em {formatDate(a.lastPlayed)}
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
        </div>
      </div>
    </div>
  );
}
