import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAchievements, useLibrary } from "../../api";
import { IconBack, IconTrophy } from "../../components/Icons";
import { formatDate } from "../../format";

type Filter = "all" | "unlocked" | "locked";

/** /library/app/:appid/achievements — built from userdata/<id>/config/librarycache/<appid>.json. */
export function AchievementsPage() {
  const { appid } = useParams();
  const { app } = useLibrary();
  const a = app(Number(appid));
  const data = useAchievements(Number(appid));
  const [filter, setFilter] = useState<Filter>("all");

  const list = useMemo(() => {
    const l = data?.list ?? [];
    const f = filter === "unlocked" ? l.filter((x) => x.achieved) : filter === "locked" ? l.filter((x) => !x.achieved) : l;
    return [...f].sort((x, y) => Number(y.achieved) - Number(x.achieved) || (y.unlocked ?? 0) - (x.unlocked ?? 0));
  }, [data, filter]);

  if (!a) return <div className="page-empty">App não encontrado.</div>;
  return (
    <div className="achievements">
      <Link to={`/library/app/${a.appid}`} className="back-link">
        <IconBack size={16} /> {a.name}
      </Link>
      <h1 className="page-title">
        <IconTrophy size={22} /> Conquistas
      </h1>
      {!data ? (
        <p className="muted">Carregando…</p>
      ) : data.total === 0 ? (
        <p className="muted">Esta ferramenta não tem conquistas registradas no cache local.</p>
      ) : (
        <>
          <div className="ach-summary ach-summary--big">
            <span>
              <b>{data.achieved}</b> de <b>{data.total}</b> conquistas ({Math.round((data.achieved / data.total) * 100)}%)
            </span>
            <span className="mini-progress mini-progress--wide">
              <span style={{ width: `${(data.achieved / data.total) * 100}%` }} />
            </span>
          </div>
          <div className="tabs">
            {(
              [
                ["all", "Todas"],
                ["unlocked", "Desbloqueadas"],
                ["locked", "Bloqueadas"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} className={`tabs__tab ${filter === k ? "is-active" : ""}`} onClick={() => setFilter(k)}>
                {l}
              </button>
            ))}
          </div>
          {data.list.length < data.total && (
            <p className="muted small">
              O cache local guarda só um resumo ({data.list.length} de {data.total}); a lista completa fica nos servidores do LAB.
            </p>
          )}
          <ul className="ach-list">
            {list.map((x) => (
              <li key={x.id} className={`ach-row ${x.achieved ? "is-unlocked" : ""}`}>
                {x.image ? <img src={x.image} alt="" loading="lazy" /> : <span className="ach-row__ph" />}
                <div className="ach-row__text">
                  <div className="ach-row__name">{x.hidden && !x.achieved ? "Conquista oculta" : x.name}</div>
                  <div className="ach-row__desc">{x.hidden && !x.achieved ? "Continue jogando para descobrir." : x.description}</div>
                  {x.progress && !x.achieved && (
                    <div className="ach-row__progress">
                      <span className="mini-progress">
                        <span style={{ width: `${Math.min(100, (x.progress.current / x.progress.max) * 100)}%` }} />
                      </span>
                      {x.progress.current}/{x.progress.max}
                    </div>
                  )}
                </div>
                <div className="ach-row__meta">
                  {x.achieved && x.unlocked ? <span>Desbloqueada em {formatDate(x.unlocked)}</span> : <span>Bloqueada</span>}
                  {x.globalPercent !== undefined && <span className="muted">{x.globalPercent.toFixed(1)}% dos jogadores</span>}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
