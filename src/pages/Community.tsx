import { useSearchParams } from "react-router-dom";
import { useLibrary } from "../api";
import { AppArt } from "../components/AppArt";
import { t } from "../i18n";

const TABS = [
  ["", t("Menu_Home")],
  ["discussions", t("Menu_Discussions")],
  ["workshop", t("Menu_Workshop")],
  ["market", t("Menu_Market")],
  ["broadcasts", t("Menu_Broadcasts")],
] as const;

const TAB_URL: Record<string, string> = {
  "": "https://steamcommunity.com/",
  discussions: "https://steamcommunity.com/discussions/",
  workshop: "https://steamcommunity.com/workshop/",
  market: "https://steamcommunity.com/market/",
  broadcasts: "https://steamcommunity.com/?subsection=broadcasts",
};

/** Community hub. Content is server-side, so each card links to the real hub of a game you own. */
export function CommunityPage() {
  const { snapshot } = useLibrary();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "";
  const apps = [...(snapshot?.apps ?? [])].filter((a) => a.art.hero || a.art.header).sort((a, b) => b.lastPlayed - a.lastPlayed);

  return (
    <div className="community">
      <div className="community__header">
        <h1>Atividade da comunidade</h1>
        <p className="muted">Centrais da comunidade das suas ferramentas. O conteúdo em si (capturas, guias, discussões) é carregado do site oficial.</p>
        <div className="tabs">
          {TABS.map(([k, label]) => (
            <button key={k} className={`tabs__tab ${tab === k ? "is-active" : ""}`} onClick={() => setParams(k ? { tab: k } : {})}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab ? (
        <div className="store__placeholder">
          <p>
            Abra <a href={TAB_URL[tab]} target="_blank" rel="noopener noreferrer">{TAB_URL[tab]}</a> para ver esta seção.
          </p>
        </div>
      ) : apps.length === 0 ? (
        <p className="muted" style={{ padding: "24px 0" }}>Nenhuma ferramenta no catálogo para exibir centrais da comunidade.</p>
      ) : (
        <div className="community__grid">
          {apps.map((a) => (
            <a key={a.appid} className="hub-card" href={`https://steamcommunity.com/app/${a.appid}`} target="_blank" rel="noopener noreferrer">
              <AppArt app={a} kind={a.art.hero ? "hero" : "header"} className="hub-card__img" />
              <div className="hub-card__body">
                <div className="hub-card__name">{a.name}</div>
                <div className="hub-card__links">
                  <span>{t("Menu_Discussions")}</span>
                  <span>Guias</span>
                  {a.appid === 570 || a.appid === 730 || a.appid === 440 ? <span>{t("Menu_Workshop")}</span> : null}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
