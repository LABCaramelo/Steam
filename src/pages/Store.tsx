import { FocusField, SpotlightTabs } from "@caramelo/design-system";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLibrary } from "../api";
import { AppArt } from "../components/AppArt";
import { IconChevronRight } from "../components/Icons";
import { formatPlaytime } from "../format";
import { t } from "../i18n";
import type { LibraryApp } from "../types";

const STORE_TABS = [
  { id: "store", label: "Sua loja", to: "/store" },
  { id: "wishlist", label: t("Menu_Wishlist"), to: "/store?view=wishlist" },
  { id: "points", label: t("Menu_PointsShop"), to: "/store?view=points" },
  { id: "news", label: t("Menu_News"), to: "/store?view=news" },
];

/**
 * Catálogo e vitrine de ferramentas do LAB.
 */
export function StorePage() {
  const { snapshot } = useLibrary();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const apps = snapshot?.apps ?? [];
  const featured = useMemo(() => apps.filter((a) => a.art.hero).sort((a, b) => b.playtimeMinutes - a.playtimeMinutes).slice(0, 6), [apps]);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (featured.length < 2) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % featured.length), 6000);
    return () => clearInterval(id);
  }, [featured.length]);

  const rawView = params.get("view");
  const isValidView = rawView === "wishlist" || rawView === "points" || rawView === "news";
  const view = isValidView ? rawView : null;
  const activeTabId = view ?? "store";
  const results = query.trim() ? apps.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase())) : [];
  const cur = featured[slide];

  return (
    <div className="store">
      <div className="store__nav">
        <SpotlightTabs
          ariaLabel="Seções da Loja"
          className="store__nav-links"
          items={STORE_TABS.map(({ id, label }) => ({ id, label }))}
          value={activeTabId}
          onValueChange={(id) => nav(STORE_TABS.find((tab) => tab.id === id)?.to ?? "/store")}
        />
        <FocusField
          containerClassName="store__search"
          label="Buscar na loja"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {results.length > 0 || query ? (
        <section className="store__section">
          <h2 className="store__heading">Resultados para “{query}”</h2>
          {results.length === 0 ? <p className="muted">Nada encontrado na sua biblioteca.</p> : <StoreRows apps={results} />}
        </section>
      ) : view ? (
        <section className="store__section store__placeholder">
          <h2 className="store__heading">{storeViewTitle(view)}</h2>
          <p>
            Esta seção depende do catálogo online do LAB. Abra no site oficial:{" "}
            <a href={storeViewUrl(view)} target="_blank" rel="noopener noreferrer">
              {storeViewUrl(view)}
            </a>
          </p>
        </section>
      ) : (
        <>
          {cur && (
            <section className="store__section">
              <h2 className="store__heading">Destaques e recomendados</h2>
              <div className="store__carousel">
                <button className="store__carousel-main" onClick={() => nav(`/library/app/${cur.appid}`)}>
                  <AppArt app={cur} kind="hero" className="store__carousel-img" />
                  {cur.art.logo && <AppArt app={cur} kind="logo" className="store__carousel-logo" />}
                </button>
                <div className="store__carousel-side">
                  <div className="store__carousel-title">{cur.name}</div>
                  <div className="store__carousel-sub">{cur.developer}</div>
                  <div className="store__thumbs">
                    {featured.slice(0, 4).map((a) => (
                      <AppArt key={a.appid} app={a} kind="header" />
                    ))}
                  </div>
                  <div className="store__tagline">Você tem {formatPlaytime(cur.playtimeMinutes)} registradas.</div>
                  <div className="store__owned">NA BIBLIOTECA</div>
                </div>
              </div>
              <div className="store__dots">
                {featured.map((a, i) => (
                  <button key={a.appid} className={i === slide ? "is-active" : ""} onClick={() => setSlide(i)} aria-label={a.name} />
                ))}
              </div>
            </section>
          )}

          <section className="store__section">
            <h2 className="store__heading">Da sua biblioteca</h2>
            <StoreRows apps={[...apps].sort((a, b) => b.playtimeMinutes - a.playtimeMinutes)} />
          </section>
        </>
      )}
    </div>
  );
}

function StoreRows({ apps, ranked }: { apps: LibraryApp[]; ranked?: boolean }) {
  const nav = useNavigate();
  if (apps.length === 0) {
    return <p className="muted" style={{ padding: "16px 0" }}>Nenhuma ferramenta no catálogo da biblioteca no momento.</p>;
  }
  return (
    <div className="store__rows">
      {apps.map((a, i) => (
        <button key={a.appid} className="store-row cm-surface--spotlight" onClick={() => nav(`/library/app/${a.appid}`)}>
          {ranked && <span className="store-row__rank">{i + 1}</span>}
          <div className="store-row__art">
            <AppArt app={a} kind="header" />
          </div>
          <div className="store-row__info">
            <div className="store-row__name">{a.name}</div>
            <div className="store-row__meta">{[a.developer, a.releaseDate ? new Date(a.releaseDate * 1000).getFullYear() : null].filter(Boolean).join(" • ")}</div>
          </div>
          {a.reviewPercentage ? <span className="store-row__review">{a.reviewPercentage}% positivas</span> : null}
          <span className="store-row__owned">Na biblioteca</span>
          <IconChevronRight size={16} />
        </button>
      ))}
    </div>
  );
}

function storeViewTitle(v: string) {
  return ({ wishlist: t("Menu_Wishlist"), points: t("Menu_PointsShop"), news: t("Menu_News") } as Record<string, string>)[v] ?? "Loja";
}
function storeViewUrl(_v: string) {
  return "https://umcaracaramelo.com.br";
}
