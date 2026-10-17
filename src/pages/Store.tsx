import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLibrary } from "../api";
import { AppArt } from "../components/AppArt";
import { IconChevronRight, IconSearch } from "../components/Icons";
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
 * The real store is a web page (store.steampowered.com) hosted inside the client. Prices and the
 * catalog come from Valve's servers, so this storefront only features titles already in the local
 * library — each card is marked "Na biblioteca" and no price is invented.
 */
export function StorePage() {
  const { snapshot } = useLibrary();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const apps = snapshot?.apps ?? [];
  const featured = useMemo(() => apps.filter((a) => a.art.hero).sort((a, b) => b.playtimeMinutes - a.playtimeMinutes).slice(0, 6), [apps]);
  const [slide, setSlide] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    if (featured.length < 2) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % featured.length), 6000);
    return () => clearInterval(id);
  }, [featured.length]);

  const view = params.get("view");
  const activeTabId = view ?? "store";
  const results = query.trim() ? apps.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase())) : [];
  const cur = featured[slide];

  useEffect(() => {
    const updateIndicator = () => {
      if (!tabsRef.current) return;
      const activeEl = tabsRef.current.querySelector<HTMLElement>(".store__nav-tab.is-active");
      if (activeEl) {
        const parentRect = tabsRef.current.getBoundingClientRect();
        const rect = activeEl.getBoundingClientRect();
        setIndicator({
          left: rect.left - parentRect.left,
          width: rect.width,
          opacity: 1,
        });
      } else {
        setIndicator((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    updateIndicator();
    const id = setTimeout(updateIndicator, 40);
    window.addEventListener("resize", updateIndicator);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [view]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!tabsRef.current) return;
    const tabs = Array.from(tabsRef.current.querySelectorAll<HTMLButtonElement>(".store__nav-tab"));
    const currentIndex = tabs.findIndex((el) => el.classList.contains("is-active"));
    let nextIndex = currentIndex;

    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    tabs[nextIndex]?.focus();
    const targetTab = STORE_TABS[nextIndex];
    if (targetTab) nav(targetTab.to);
  };

  return (
    <div className="store">
      <div className="store__nav">
        <div
          className="store__nav-links cm-spotlight-tabs"
          ref={tabsRef}
          role="tablist"
          aria-label="Navegação da Loja"
          onKeyDown={handleKeyDown}
        >
          <span
            className="cm-spotlight-tabs__indicator"
            style={{
              transform: `translateX(${indicator.left}px)`,
              width: `${indicator.width}px`,
              opacity: indicator.opacity,
            }}
            aria-hidden="true"
          />
          {STORE_TABS.map((tab) => {
            const isActive = activeTabId === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`store-tab-${tab.id}`}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                className={`store__nav-tab ${isActive ? "is-active" : ""}`}
                onClick={() => nav(tab.to)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <label className="store__search">
          <input placeholder="buscar" value={query} onChange={(e) => setQuery(e.target.value)} />
          <IconSearch size={16} />
        </label>
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
        <button key={a.appid} className="store-row" onClick={() => nav(`/library/app/${a.appid}`)}>
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
function storeViewUrl(v: string) {
  return (
    ({
      wishlist: "https://store.steampowered.com/wishlist/",
      points: "https://store.steampowered.com/points/shop/",
      news: "https://store.steampowered.com/news/",
    } as Record<string, string>)[v] ?? "https://store.steampowered.com/"
  );
}
