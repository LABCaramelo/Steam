import { FocusField } from "@caramelo/design-system";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AcquireButton, OwnedBadge } from "../components/AcquireButton";
import { AppArt } from "../components/AppArt";
import { IconChevronRight } from "../components/Icons";
import { UNCONFIGURED_MESSAGE, useEntitlements } from "../entitlements";
import { TOOL_CATALOG } from "../toolCatalog";
import type { LibraryApp } from "../types";

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Loja do LAB: todas as ferramentas do catálogo. Só as adquiridas entram na biblioteca.
 */
export function StorePage() {
  const nav = useNavigate();
  const { owns, status } = useEntitlements();
  const [query, setQuery] = useState("");
  const [slide, setSlide] = useState(0);
  const featured = TOOL_CATALOG;

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % featured.length), 7000);
    return () => clearInterval(id);
  }, [featured.length]);

  const term = normalize(query.trim());
  const results = useMemo(
    () =>
      term
        ? TOOL_CATALOG.filter((a) => normalize([a.name, a.tool!.store.tagline, a.tool!.store.category, a.tool!.description].join(" ")).includes(term))
        : [],
    [term],
  );
  const cur = featured[slide];
  const ownedCount = TOOL_CATALOG.filter((a) => owns(a.tool!.slug)).length;

  return (
    <div className="store">
      <div className="store__nav">
        <span className="store__nav-title">Loja do LAB</span>
        <FocusField containerClassName="store__search" label="Buscar na loja" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {status === "unconfigured" && (
        <div className="store__section">
          <p className="store__notice" role="status">{UNCONFIGURED_MESSAGE}</p>
        </div>
      )}

      {query ? (
        <section className="store__section">
          <h2 className="store__heading">Resultados para “{query}”</h2>
          {results.length === 0 ? <p className="muted">Nenhuma ferramenta encontrada.</p> : <StoreRows apps={results} />}
        </section>
      ) : (
        <>
          <section className="store__section">
            <h2 className="store__heading">Destaques do LAB</h2>
            <div className="store__carousel">
              <button className="store__carousel-main" onClick={() => nav(`/store/app/${cur.appid}`)} aria-label={`Conhecer ${cur.name}`}>
                <AppArt app={cur} kind="hero" className="store__carousel-img" />
              </button>
              <div className="store__carousel-side">
                <span className="store__category">{cur.tool!.store.category}</span>
                <div className="store__carousel-title">{cur.name}</div>
                <div className="store__tagline">{cur.tool!.store.tagline}</div>
                <ul className="store__highlights">
                  {cur.tool!.store.features.slice(0, 3).map((f) => (
                    <li key={f.title}>{f.title}</li>
                  ))}
                </ul>
                <div className="store__carousel-buy">
                  <OwnedBadge owned={owns(cur.tool!.slug)} />
                  <AcquireButton app={cur} size="sm" />
                </div>
              </div>
            </div>
            <div className="store__dots">
              {featured.map((a, i) => (
                <button key={a.appid} className={i === slide ? "is-active" : ""} onClick={() => setSlide(i)} aria-label={a.name} aria-current={i === slide} />
              ))}
            </div>
          </section>

          <section className="store__section">
            <div className="store__heading-row">
              <h2 className="store__heading">Todas as ferramentas</h2>
              <span className="store__count">
                {ownedCount} de {TOOL_CATALOG.length} na sua biblioteca
              </span>
            </div>
            <StoreRows apps={[...TOOL_CATALOG]} />
          </section>
        </>
      )}
    </div>
  );
}

function StoreRows({ apps }: { apps: LibraryApp[] }) {
  const nav = useNavigate();
  const { owns } = useEntitlements();
  return (
    <div className="store__rows">
      {apps.map((a) => (
        <button key={a.appid} className="store-row cm-surface--spotlight" onClick={() => nav(`/store/app/${a.appid}`)}>
          <div className="store-row__art">
            <AppArt app={a} kind="header" />
          </div>
          <div className="store-row__info">
            <div className="store-row__name">{a.name}</div>
            <div className="store-row__meta">{a.tool!.store.tagline}</div>
          </div>
          <span className="store-row__category">{a.tool!.store.category}</span>
          <OwnedBadge owned={owns(a.tool!.slug)} />
          <IconChevronRight size={16} />
        </button>
      ))}
    </div>
  );
}
