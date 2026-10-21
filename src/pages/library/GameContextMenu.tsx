import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLibrary } from "../../api";
import type { LibraryApp } from "../../types";
import { useUi } from "../../ui";
import { usePlayAction } from "./play";

export interface ContextTarget {
  app: LibraryApp;
  x: number;
  y: number;
}

/** Right-click menu for a game (sidebar entries and capsules). */
export function GameContextMenu({ target, onClose, onRemove }: { target: ContextTarget; onClose: () => void; onRemove: (app: LibraryApp) => void }) {
  const { app } = target;
  const nav = useNavigate();
  const lib = useLibrary();
  const ui = useUi();
  const play = usePlayAction(app);
  const ref = useRef<HTMLDivElement>(null);
  const [sub, setSub] = useState(false);

  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const left = Math.min(target.x, window.innerWidth - 240);
  const top = Math.min(target.y, window.innerHeight - 260);
  const userCollections = lib.collections.filter((c) => c.id !== "favorite" && c.id !== "hidden" && !c.dynamic);
  const act = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <div className="ctxmenu" ref={ref} style={{ left, top }} role="menu">
      <button className="ctxmenu__item ctxmenu__item--strong" onClick={act(play.onClick)}>
        {play.label}
      </button>
      <div className="menu__sep" />
      <button className="ctxmenu__item" onClick={act(() => lib.toggleFavorite(app.appid))}>
        {lib.isFavorite(app.appid) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      </button>
      <div className="ctxmenu__item ctxmenu__item--sub" onMouseEnter={() => setSub(true)} onMouseLeave={() => setSub(false)}>
        Adicionar a…
        {sub && (
          <div className="ctxmenu ctxmenu--nested">
            {userCollections.map((c) => (
              <button key={c.id} className="ctxmenu__item" onClick={act(() => lib.addToCollection(c.id, app.appid))}>
                {c.name}
              </button>
            ))}
            <button
              className="ctxmenu__item"
              onClick={act(() => {
                const name = window.prompt("Nome da nova coleção:");
                if (name?.trim()) lib.addToCollection(lib.createCollection(name.trim()), app.appid);
              })}
            >
              Nova coleção…
            </button>
          </div>
        )}
      </div>
      <div className="menu__sep" />
      <button className="ctxmenu__item" onClick={act(() => nav(`/library/app/${app.appid}`))}>
        Detalhes da ferramenta
      </button>
      <button className="ctxmenu__item" onClick={act(() => window.open(app.tool?.publicPage ?? "https://umcaracaramelo.com.br", "_blank", "noopener"))}>
        Página no LAB
      </button>
      <button className="ctxmenu__item" onClick={act(() => nav(`/app/${app.appid}/properties/general`))}>
        Propriedades…
      </button>
      {app.installed && !app.tool && (
        <button className="ctxmenu__item" onClick={act(() => ui.toast(`Pasta: ${app.libraryPath}\\steamapps\\common\\${app.installdir}`))}>
          Procurar arquivos locais
        </button>
      )}
      {app.tool && <>
        <div className="menu__sep" />
        <button className="ctxmenu__item tool-remove-trigger" onClick={act(() => onRemove(app))}>Remover da biblioteca…</button>
      </>}
    </div>
  );
}
