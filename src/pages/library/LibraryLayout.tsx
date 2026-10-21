import { useCallback, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Outlet } from "react-router-dom";
import { useUi } from "../../ui";
import { GameContextMenu, type ContextTarget } from "./GameContextMenu";
import { Sidebar } from "./Sidebar";
import { RemoveToolDialog } from "../../components/RemoveToolDialog";
import type { LibraryApp } from "../../types";

export interface LibraryOutletContext {
  openContext: (t: ContextTarget) => void;
}

/** Library shell: resizable game list on the left, routed content on the right. */
export function LibraryLayout() {
  const { smallMode } = useUi();
  const [ctx, setCtx] = useState<ContextTarget | null>(null);
  const [removing, setRemoving] = useState<LibraryApp | null>(null);
  const [width, setWidth] = useState(272);
  const close = useCallback(() => setCtx(null), []);

  const startResize = (e: ReactPointerEvent) => {
    const startX = e.clientX;
    const startW = width;
    const move = (ev: PointerEvent) => setWidth(Math.max(200, Math.min(520, startW + ev.clientX - startX)));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className={`library ${smallMode ? "library--small" : ""}`}>
      <div className="library__sidebar" style={smallMode ? undefined : { width }}>
        <Sidebar onContext={setCtx} />
      </div>
      {!smallMode && <div className="library__resizer" onPointerDown={startResize} title="Arraste para redimensionar" />}
      {!smallMode && (
        <main className="library__main">
          <Outlet context={{ openContext: setCtx } satisfies LibraryOutletContext} />
        </main>
      )}
      {ctx && <GameContextMenu target={ctx} onClose={close} onRemove={setRemoving} />}
      {removing && <RemoveToolDialog app={removing} onClose={() => setRemoving(null)} />}
    </div>
  );
}
