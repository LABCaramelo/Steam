import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLibrary } from "../../api";
import { AppArt } from "../../components/AppArt";
import { IconPlay, IconStar } from "../../components/Icons";
import type { LibraryApp } from "../../types";
import { usePlayAction } from "./play";

export function ToolDetails({ app }: { app: LibraryApp }) {
  const { isFavorite, toggleFavorite } = useLibrary();
  const play = usePlayAction(app);
  const favorite = isFavorite(app.appid);

  return (
    <div className="appdetails tool-details">
      <div className="appdetails__hero">
        <AppArt app={app} kind="hero" className="appdetails__hero-img" fallbackLabel={false} />
        <div className="appdetails__hero-fade" />
        <h1 className="appdetails__title">{app.name}</h1>
      </div>
      <div className="playbar tool-details__actions">
        <button className="playbar__btn playbar__btn--play" onClick={play.onClick}>
          <IconPlay size={18} /> ABRIR
        </button>
        <div className="playbar__stats">
          <div className="playbar__stat">
            <span className="playbar__stat-label">Disponibilidade</span>
            <span className="playbar__stat-value">Pronta para usar</span>
          </div>
          <div className="playbar__stat">
            <span className="playbar__stat-label">Acesso</span>
            <span className="playbar__stat-value">Livre · No navegador</span>
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
            <span className="tool-details__eyebrow">ACERVO CRIATIVO / ACESSO LIVRE</span>
            <h2>Menos página em branco.<br />Mais ideias em ação.</h2>
            <p>{app.tool?.description}</p>
            <div className="tool-details__features">
              <div><h3>Encontre sua referência</h3><p>Busque por nome, assunto ou tecnologia e filtre o acervo por categoria.</p></div>
              <div><h3>Veja antes de criar</h3><p>Explore as prévias de interfaces, efeitos e experiências.</p></div>
              <div><h3>Guarde suas ideias</h3><p>Salve seus prompts favoritos para voltar a eles neste navegador.</p></div>
              <div><h3>Copie e faça do seu jeito</h3><p>Abra o prompt completo, copie o texto e compartilhe a referência.</p></div>
            </div>
          </section>
        </div>
        <div className="appdetails__col appdetails__col--side">
          <section className="panel">
            <h2 className="panel__title">Comece por aqui</h2>
            <ol className="tool-details__steps">
              <li>Abra a biblioteca e explore o acervo.</li>
              <li>Escolha uma referência e veja o prompt.</li>
              <li>Copie o texto e transforme a ideia no seu projeto.</li>
            </ol>
          </section>
          <section className="panel">
            <h2 className="panel__title">Sobre a ferramenta</h2>
            <dl className="info-grid info-grid--compact">
              <dt>Por</dt><dd>{app.developer}</dd>
              <dt>Formato</dt><dd>Biblioteca interativa</dd>
              <dt>Idioma</dt><dd>Português</dd>
              <dt>Instalação</dt><dd>Acesso direto pelo LAB</dd>
            </dl>
            <p className="muted small">Os textos completos e as prévias precisam de conexão com a internet.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

export function ToolPage() {
  const { appid } = useParams();
  const { app, snapshot } = useLibrary();
  const tool = app(Number(appid));

  if (!snapshot) return <div className="page-loading">Carregando ferramenta…</div>;
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
      {loading && <div className="tool-workspace__loading" role="status">Abrindo biblioteca de prompts…</div>}
      <iframe className="tool-workspace__frame" src={`${app.tool!.publicPage}?embed=1`} title={app.name} allow="clipboard-write" onLoad={() => setLoading(false)} />
    </section>
  );
}
