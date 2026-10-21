import { TiltSurface } from "@caramelo/design-system";
import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { AcquireButton, OwnedBadge } from "../components/AcquireButton";
import { AppArt } from "../components/AppArt";
import { PointerTrail } from "../components/PointerTrail";
import { useEntitlements } from "../entitlements";
import { getRegisteredTool } from "../toolCatalog";

/** Página da ferramenta na loja: o que ela faz, onde ficam os dados e o botão de adquirir. */
export function StoreToolPage() {
  const { appid } = useParams();
  const app = getRegisteredTool(Number(appid));
  const { owns } = useEntitlements();

  useEffect(() => {
    if (!app) return;
    document.title = `${app.name} na Loja — LAB`;
    return () => {
      document.title = "LAB — Um Cara Caramelo";
    };
  }, [app]);

  if (!app?.tool) return <Navigate to="/store" replace />;
  const { store } = app.tool;
  const owned = owns(app.tool.slug);

  return (
    <div className="store store-tool">
      <nav className="store-tool__crumbs" aria-label="Caminho">
        <Link to="/store">Loja</Link>
        <span aria-hidden="true">/</span>
        <span>{store.category}</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{app.name}</span>
      </nav>

      <header className="store-tool__head">
        <h1 className="store-tool__title">{app.name}</h1>
        <p className="store-tool__tagline">{store.tagline}</p>
      </header>

      <div className="store-tool__top">
        <PointerTrail className="store-tool__hero">
          <AppArt app={app} kind="hero" className="store-tool__hero-img" fallbackLabel={false} />
        </PointerTrail>

        <aside className="store-tool__buy cm-surface cm-surface--spotlight">
          <AppArt app={app} kind="header" className="store-tool__buy-art" />
          <p className="store-tool__desc">{app.tool.description}</p>
          <dl className="store-tool__facts">
            {[["Por", app.developer ?? "Um Cara Caramelo"], ["Categoria", store.category], ...store.about].map(([label, value]) => (
              <div key={label} className="store-tool__fact">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="store-tool__price">
            <OwnedBadge owned={owned} />
            <span className="store-tool__price-note">{owned ? "Já está na sua biblioteca." : "Para membros do LAB."}</span>
          </div>
          <AcquireButton app={app} size="lg" block />
          <p className="store-tool__data">{store.dataNote}</p>
        </aside>
      </div>

      <section className="store-tool__body">
        <div className="store-tool__intro">
          <span className="tool-details__eyebrow">{store.eyebrow}</span>
          <TiltSurface max={2.5}>
            <h2 className="store-tool__headline">
              {store.headline.split("\n").map((line, i) => (
                <span key={i}>{line}</span>
              ))}
            </h2>
          </TiltSurface>
          <div className="tool-details__features">
            {store.features.map((f) => (
              <div key={f.title} className="cm-surface--spotlight">
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
        <section className="panel store-tool__steps">
          <h2 className="panel__title">Como funciona</h2>
          <ol className="tool-details__steps">
            {store.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </section>
    </div>
  );
}
