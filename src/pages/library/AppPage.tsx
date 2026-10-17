import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAchievements, useLibrary, useRun } from "../../api";
import { AppArt } from "../../components/AppArt";
import { IconCloud, IconDownload, IconGear, IconInfo, IconPlay, IconStar } from "../../components/Icons";
import { formatBytes, formatDate, formatLastPlayed, formatPlaytime } from "../../format";
import { t } from "../../i18n";
import type { LibraryApp } from "../../types";
import { useUi } from "../../ui";
import { usePlayAction } from "./play";

export function AppPage() {
  const { appid } = useParams();
  const { app, snapshot } = useLibrary();
  const a = app(Number(appid));
  if (!snapshot) return <div className="page-loading">Carregando…</div>;
  if (!a) return <div className="page-empty">Este app não está na sua biblioteca.</div>;
  return <AppDetails key={a.appid} app={a} />;
}

function AppDetails({ app }: { app: LibraryApp }) {
  const nav = useNavigate();
  const lib = useLibrary();
  const ui = useUi();
  const play = usePlayAction(app);
  const [run] = useRun(app.appid);
  const ach = useAchievements(app.appid);
  const [scrolled, setScrolled] = useState(false);
  const fav = lib.isFavorite(app.appid);
  const ext = (url: string) => () => window.open(url, "_blank", "noopener");

  useEffect(() => {
    const main = document.querySelector(".library__main");
    const onScroll = () => setScrolled((main?.scrollTop ?? 0) > 240);
    main?.addEventListener("scroll", onScroll);
    main?.scrollTo({ top: 0 });
    return () => main?.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="appdetails">
      <div className="appdetails__hero">
        <AppArt app={app} kind="hero" className="appdetails__hero-img" fallbackLabel={false} />
        <div className="appdetails__hero-fade" />
        {app.art.logo ? <AppArt app={app} kind="logo" className="appdetails__logo" /> : <h1 className="appdetails__title">{app.name}</h1>}
      </div>

      <div className={`playbar ${scrolled ? "is-stuck" : ""}`}>
        <button className={`playbar__btn playbar__btn--${play.variant}`} onClick={play.onClick} title={play.sub}>
          {play.variant === "install" ? <IconDownload size={20} /> : play.variant === "play" ? <IconPlay size={18} /> : null}
          <span>{play.label.toUpperCase()}</span>
        </button>
        {run.kind === "installing" && (
          <div className="playbar__install">
            <div className="playbar__install-bar">
              <span style={{ width: `${run.progress * 100}%` }} />
            </div>
            <span className="playbar__stat-label">{run.paused ? `Em pausa — ${Math.round(run.progress * 100)}% (simulação)` : play.sub}</span>
          </div>
        )}
        <div className="playbar__stats">
          {play.variant === "running" ? (
            <Stat label="Estado" value="Jogando agora (simulação)" accent />
          ) : (
            <>
              <Stat label={t("AppDetails_SectionTitle_LastPlayed")} value={formatLastPlayed(app.lastPlayed)} />
              <Stat label={t("AppDetails_SectionTitle_PlayTime")} value={formatPlaytime(app.playtimeMinutes)} />
              {app.achievements && (
                <div className="playbar__stat">
                  <span className="playbar__stat-label">{t("AppDetails_SectionTitle_Achievements")}</span>
                  <span className="playbar__stat-value">
                    {app.achievements.achieved}/{app.achievements.total}
                    <span className="mini-progress">
                      <span style={{ width: `${(app.achievements.achieved / app.achievements.total) * 100}%` }} />
                    </span>
                  </span>
                </div>
              )}
              {app.installed && <Stat label={t("AppDetails_SectionTitle_CloudStatus")} value="Sincronizado" icon={<IconCloud size={14} />} />}
            </>
          )}
        </div>
        <div className="playbar__icons">
          <button title="Propriedades" onClick={() => nav(`/app/${app.appid}/properties/general`)}>
            <IconGear size={18} />
          </button>
          <button title="Informações" onClick={() => nav(`/app/${app.appid}/properties/localfiles`)}>
            <IconInfo size={18} />
          </button>
          <button title={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"} className={fav ? "is-fav" : ""} onClick={() => lib.toggleFavorite(app.appid)}>
            <IconStar size={18} filled={fav} />
          </button>
        </div>
      </div>

      <nav className="appdetails__links">
        <button onClick={ext(`https://store.steampowered.com/app/${app.appid}/`)}>Página na loja</button>
        <button onClick={ext(`https://steamcommunity.com/app/${app.appid}`)}>Central da comunidade</button>
        <button onClick={ext(`https://steamcommunity.com/app/${app.appid}/discussions/`)}>Discussões</button>
        <button onClick={ext(`https://steamcommunity.com/app/${app.appid}/guides/`)}>Guias</button>
        <button onClick={ext(`https://help.steampowered.com/wizard/HelpWithGame/?appid=${app.appid}`)}>Suporte</button>
      </nav>

      <div className="appdetails__body">
        <div className="appdetails__col appdetails__col--main">
          <section className="panel">
            <h3 className="panel__title">{t("AppDetails_SectionTitle_Activity")}</h3>
            <textarea className="activity-input" placeholder="Diga algo sobre esta ferramenta aos seus amigos…" rows={2} />
            <ul className="activity">
              {app.lastPlayed > 0 && (
                <li>
                  <span className="activity__date">{formatDate(app.lastPlayed)}</span>
                  Você jogou <b>{app.name}</b> pela última vez. Total acumulado: {formatPlaytime(app.playtimeMinutes)}.
                </li>
              )}
              {app.installed && app.lastUpdated && (
                <li>
                  <span className="activity__date">{formatDate(app.lastUpdated)}</span>
                  {app.name} foi atualizado para a build {app.buildid}.
                </li>
              )}
              {ach?.list
                .filter((x) => x.achieved && x.unlocked)
                .sort((x, y) => (y.unlocked ?? 0) - (x.unlocked ?? 0))
                .slice(0, 4)
                .map((x) => (
                  <li key={x.id} className="activity__ach">
                    <span className="activity__date">{formatDate(x.unlocked)}</span>
                    {x.image && <img src={x.image} alt="" loading="lazy" />}
                    <span>
                      Conquista desbloqueada: <b>{x.name}</b> — {x.description}
                    </span>
                  </li>
                ))}
              {!app.lastPlayed && !app.installed && <li className="muted">Nenhuma atividade registrada.</li>}
            </ul>
          </section>

          <section className="panel">
            <h3 className="panel__title">{t("AppDetails_Tab_GameInfo")}</h3>
            <dl className="info-grid">
              <dt>Desenvolvedor</dt>
              <dd>{app.developer ?? "—"}</dd>
              <dt>Distribuidora</dt>
              <dd>{app.publisher ?? app.developer ?? "—"}</dd>
              <dt>Lançamento</dt>
              <dd>{formatDate(app.releaseDate)}</dd>
              <dt>Tipo</dt>
              <dd>{typeLabel(app.type)}</dd>
              {app.metacritic ? (
                <>
                  <dt>Metacritic</dt>
                  <dd>{app.metacritic}</dd>
                </>
              ) : null}
              {app.reviewPercentage ? (
                <>
                  <dt>Análises positivas</dt>
                  <dd>{app.reviewPercentage}%</dd>
                </>
              ) : null}
              <dt>ID do app</dt>
              <dd>{app.appid}</dd>
            </dl>
          </section>
        </div>

        <div className="appdetails__col appdetails__col--side">
          <section className="panel">
            <h3 className="panel__title">{t("AppDetails_SectionTitle_Friends")}</h3>
            <p className="muted">Nenhum amigo seu joga isto — ou a lista de amigos não está disponível offline.</p>
          </section>

          {ach && ach.total > 0 && (
            <section className="panel">
              <h3 className="panel__title">
                <Link to={`/library/app/${app.appid}/achievements`}>{t("AppDetails_SectionTitle_Achievements")}</Link>
              </h3>
              <div className="ach-summary">
                <span>
                  Você desbloqueou <b>{ach.achieved}</b> de <b>{ach.total}</b> ({Math.round((ach.achieved / ach.total) * 100)}%)
                </span>
                <span className="mini-progress mini-progress--wide">
                  <span style={{ width: `${(ach.achieved / ach.total) * 100}%` }} />
                </span>
              </div>
              <div className="ach-icons">
                {ach.list
                  .filter((x) => x.achieved)
                  .slice(0, 12)
                  .map((x) => (
                    <img key={x.id} src={x.image} alt={x.name} title={`${x.name}\n${x.description}`} loading="lazy" />
                  ))}
              </div>
              <Link className="panel__more" to={`/library/app/${app.appid}/achievements`}>
                Ver minhas conquistas
              </Link>
            </section>
          )}

          <Notes appid={app.appid} />

          <section className="panel">
            <h3 className="panel__title">
              <Link to={`/media?app=${app.appid}`}>{t("AppDetails_SectionTitle_Media")}</Link>
            </h3>
            <p className="muted small">Veja ou capture novos momentos e clipes desta ferramenta.</p>
            <div className="btn-row">
              <Link className="btn btn--sm" to={`/media?app=${app.appid}`}>
                {t("AppDetails_GoToMedia")}
              </Link>
            </div>
          </section>

          {app.installed && (
            <section className="panel">
              <h3 className="panel__title">Arquivos locais</h3>
              <dl className="info-grid info-grid--compact">
                <dt>Tamanho</dt>
                <dd>{formatBytes(app.sizeOnDisk)}</dd>
                <dt>Pasta</dt>
                <dd className="mono">{app.installdir}</dd>
              </dl>
              <button className="btn btn--ghost" onClick={() => ui.toast(`${app.libraryPath}\\steamapps\\common\\${app.installdir}`)}>
                Mostrar caminho
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, accent }: { label: string; value: string; icon?: ReactNode; accent?: boolean }) {
  return (
    <div className="playbar__stat">
      <span className="playbar__stat-label">{label}</span>
      <span className={`playbar__stat-value ${accent ? "is-accent" : ""}`}>
        {icon} {value}
      </span>
    </div>
  );
}

function typeLabel(type: string) {
  return ({ game: "Ferramenta", application: "Software", demo: "Demonstração", beta: "Playtest/Beta" } as Record<string, string>)[type] ?? type;
}

/** Game notes are stored per app in localStorage (the real client syncs them to Steam Cloud). */
function Notes({ appid }: { appid: number }) {
  const key = `steam-recriada:notes:${appid}`;
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(key) ?? "";
    } catch {
      return "";
    }
  });
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(key, text);
      } catch {
        // storage unavailable
      }
    }, 300);
    return () => clearTimeout(id);
  }, [key, text]);
  return (
    <section className="panel">
      <h3 className="panel__title">{t("AppDetails_SectionTitle_GameNotes")}</h3>
      <textarea className="notes" placeholder="Escreva suas anotações sobre a ferramenta…" value={text} onChange={(e) => setText(e.target.value)} rows={4} />
    </section>
  );
}
