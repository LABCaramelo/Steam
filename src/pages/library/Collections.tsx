import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLibrary } from "../../api";
import { AppArt } from "../../components/AppArt";
import { IconChevronDown, IconPlus } from "../../components/Icons";
import { Menu } from "../../components/Menu";
import { t } from "../../i18n";
import { Capsule } from "./Capsule";
import { SORT_LABEL, sortApps, type SortKey } from "./Home";

/** /library/collections — tiles stacked with up to three capsules, like the client's collection view. */
export function CollectionsPage() {
  const { snapshot, collections, createCollection } = useLibrary();
  const nav = useNavigate();
  const apps = snapshot?.apps ?? [];
  const tiles = [
    { id: "all", name: "Todos os jogos", appids: apps.map((a) => a.appid) },
    ...collections.filter((c) => c.id !== "hidden").map((c) => ({ id: c.id, name: c.id === "favorite" ? t("GameList_Category_Favorites") : c.name, appids: c.appids })),
    { id: "installed", name: t("GameList_Category_ReadyToPlay"), appids: apps.filter((a) => a.installed).map((a) => a.appid) },
    { id: "hidden", name: t("GameList_Category_Hidden"), appids: collections.find((c) => c.id === "hidden")?.appids ?? [] },
  ];

  return (
    <div className="collections">
      <div className="shelf-head">
        <h1 className="page-title">{t("GameList_Category_YourCollections")}</h1>
        <button
          className="btn btn--blue"
          onClick={() => {
            const name = window.prompt("Nome da nova coleção:");
            if (name?.trim()) nav(`/library/collection/${createCollection(name.trim())}`);
          }}
        >
          <IconPlus size={14} /> Criar coleção
        </button>
      </div>
      <div className="collections__grid">
        {tiles.map((c) => {
          const covers = c.appids.map((id) => apps.find((a) => a.appid === id)).filter((a) => !!a).slice(0, 3);
          return (
            <Link key={c.id} to={`/library/collection/${c.id}`} className="collection-tile">
              <div className="collection-tile__stack">
                {covers.length === 0 && <div className="collection-tile__empty" />}
                {covers.map((a, i) => (
                  <div key={a.appid} className="collection-tile__cover" style={{ transform: `translateX(${(i - (covers.length - 1) / 2) * 42}px) rotate(${(i - (covers.length - 1) / 2) * 4}deg)`, zIndex: i === Math.floor(covers.length / 2) ? 3 : 1 }}>
                    <AppArt app={a} kind="capsule" />
                  </div>
                ))}
              </div>
              <div className="collection-tile__name">
                {c.name} <span className="shelf-title__count">({c.appids.filter((id) => apps.some((a) => a.appid === id)).length})</span>
              </div>
            </Link>
          );
        })}
      </div>
      <p className="muted small">Alterações em coleções ficam salvas só neste navegador — nada é enviado à sua conta Steam.</p>
    </div>
  );
}

/** /library/collection/:collectionid */
export function CollectionView() {
  const { collectionid } = useParams();
  const { snapshot, collections } = useLibrary();
  const [sort, setSort] = useState<SortKey>("alpha");
  const apps = snapshot?.apps ?? [];
  let name = "";
  let list = apps;
  if (collectionid === "all") name = "Todos os jogos";
  else if (collectionid === "installed") {
    name = t("GameList_Category_ReadyToPlay");
    list = apps.filter((a) => a.installed);
  } else {
    const c = collections.find((x) => x.id === collectionid);
    if (!c) return <div className="page-empty">{t("CollectionView_MissingCollection")}</div>;
    name = c.id === "favorite" ? t("GameList_Category_Favorites") : c.id === "hidden" ? t("GameList_Category_Hidden") : c.name;
    list = apps.filter((a) => c.appids.includes(a.appid));
  }
  return (
    <div className="collection-view">
      <Link to="/library/collections" className="back-link">
        ‹ {t("GameList_Category_YourCollections")}
      </Link>
      <div className="shelf-head">
        <h1 className="page-title">
          {name} <span className="shelf-title__count">({list.length})</span>
        </h1>
        <Menu
          align="right"
          items={(Object.keys(SORT_LABEL) as SortKey[]).map((k) => ({ label: SORT_LABEL[k], checked: sort === k, onSelect: () => setSort(k) }))}
          trigger={() => (
            <span className="sort-picker">
              {t("Library_SortCollectionBy")}: <b>{SORT_LABEL[sort]}</b> <IconChevronDown size={12} />
            </span>
          )}
        />
      </div>
      {list.length === 0 ? (
        <p className="muted">{t("CollectionView_EmptyCollection")}</p>
      ) : (
        <div className="grid">
          {sortApps(list, sort).map((a) => (
            <Capsule key={a.appid} app={a} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}
