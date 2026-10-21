import { MagneticButton, TiltSurface } from "@caramelo/design-system";
import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useLibrary } from "../../api";
import { AppArt } from "../../components/AppArt";
import { IconPlay, IconStar } from "../../components/Icons";
import { PointerTrail } from "../../components/PointerTrail";
import { getRegisteredTool } from "../../toolCatalog";
import type { LibraryApp } from "../../types";
import { usePlayAction } from "./play";

export function ToolDetails({ app }: { app: LibraryApp }) {
  const { isFavorite, toggleFavorite } = useLibrary();
  const play = usePlayAction(app);
  const favorite = isFavorite(app.appid);
  const store = app.tool!.store;

  return (
    <div className="appdetails tool-details">
      <PointerTrail className="appdetails__hero">
        <AppArt app={app} kind="hero" className="appdetails__hero-img" fallbackLabel={false} />
        <div className="appdetails__hero-fade" />
        <h1 className="appdetails__title">{app.name}</h1>
      </PointerTrail>
      <div className="playbar tool-details__actions">
        <MagneticButton className="playbar__btn playbar__btn--play" onClick={play.onClick}>
          <IconPlay size={18} /> ABRIR
        </MagneticButton>
        <div className="playbar__stats">
          <div className="playbar__stat">
            <span className="playbar__stat-label">Disponibilidade</span>
            <span className="playbar__stat-value">Na sua biblioteca</span>
          </div>
          <div className="playbar__stat">
            <span className="playbar__stat-label">Categoria</span>
            <span className="playbar__stat-value">{store.category} · No navegador</span>
          </div>
        </div>
        <button className={`btn btn--ghost tool-details__favorite ${favorite ? "is-fav" : ""}`} aria-pressed={favorite} onClick={() => toggleFavorite(app.appid)}>
          <IconStar size={17} filled={favorite} />
          {favorite ? "Nos favoritos" : "Favoritar"}
        </button>
      </div>
      <div className="appdetails__body">
        <div className="appdetails__col appdetails__col--main">
          <section className="panel tool-details__intro">
            <span className="tool-details__eyebrow">{store.eyebrow}</span>
            <TiltSurface max={2.5}>
              <h2>
                {store.headline.split("\n").map((line, i) => (
                  <span key={i} className="tool-details__line">{line}</span>
                ))}
              </h2>
            </TiltSurface>
            <p>{app.tool!.description}</p>
            <div className="tool-details__features">
              {store.features.map((f) => (
                <div key={f.title} className="cm-surface--spotlight">
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className="appdetails__col appdetails__col--side">
          <section className="panel">
            <h2 className="panel__title">Comece por aqui</h2>
            <ol className="tool-details__steps">
              {store.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
          <section className="panel">
            <h2 className="panel__title">Sobre a ferramenta</h2>
            <dl className="info-grid info-grid--compact">
              <dt>Por</dt>
              <dd>{app.developer}</dd>
              {store.about.map(([label, value]) => (
                <Fact key={label} label={label} value={value} />
              ))}
            </dl>
            <p className="muted small">{store.dataNote}</p>
            <Link className="tool-details__store-link" to={`/store/app/${app.appid}`}>Ver na Loja</Link>
          </section>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

export function ToolPage() {
  const { appid } = useParams();
  const { app, snapshot } = useLibrary();
  const tool = app(Number(appid));

  if (!snapshot) return <div className="page-loading">Carregando ferramenta…</div>;
  // Ferramenta do catálogo que a pessoa ainda não adquiriu: a página dela é a da loja.
  if (!tool && getRegisteredTool(Number(appid))) return <Navigate to={`/store/app/${appid}`} replace />;
  if (!tool?.tool) return <div className="page-empty">Esta ferramenta não está disponível. <Link to="/library/home">Voltar à biblioteca</Link></div>;
  return <ToolWorkspace key={tool.appid} app={tool} />;
}

function ToolWorkspace({ app }: { app: LibraryApp }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `${app.name} — LAB`;
    return () => { document.title = "LAB — Um Cara Caramelo"; };
  }, [app.name]);

  return (
    <section className="tool-workspace" aria-label={app.name}>
      <header className="tool-workspace__toolbar">
        <Link className="btn btn--ghost" to={`/library/app/${app.appid}`}>← Detalhes</Link>
        <h1>{app.name}</h1>
        <a className="btn btn--ghost" href={app.tool!.publicPage} target="_blank" rel="noopener noreferrer">Abrir em nova aba ↗</a>
      </header>
      {loading && <div className="tool-workspace__loading" role="status">Abrindo {app.name}…</div>}
      <iframe
        className="tool-workspace__frame"
        src={`${app.tool!.publicPage}?embed=1`}
        title={app.name}
        allow="clipboard-write; fullscreen; autoplay; picture-in-picture"
        allowFullScreen
        onLoad={() => setLoading(false)}
      />
    </section>
  );
}
