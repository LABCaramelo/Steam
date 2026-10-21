import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { useEntitlements } from "../entitlements";
import type { LibraryApp } from "../types";
import { useUi } from "../ui";

export function RemoveToolButton({ app }: { app: LibraryApp }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="btn btn--ghost tool-remove-trigger" onClick={() => setOpen(true)}>Remover da biblioteca…</button>
    {open && <RemoveToolDialog app={app} onClose={() => setOpen(false)} />}
  </>;
}

export function RemoveToolDialog({ app, onClose }: { app: LibraryApp; onClose: () => void }) {
  const { release } = useEntitlements();
  const { user } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const currentPath = useRef(location.pathname);
  currentPath.current = location.pathname;
  const owner = useRef(user?.id);
  const ui = useUi();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const running = useRef(false);
  const alive = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = useId();
  const description = useId();

  useEffect(() => {
    if (user?.id !== owner.current) onClose();
  }, [user?.id, onClose]);

  useEffect(() => {
    alive.current = true;
    const previous = document.activeElement as HTMLElement | null;
    const panel = dialog.current!;
    panel.showModal();
    cancel.current?.focus();
    return () => {
      alive.current = false;
      panel.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  const remove = async () => {
    if (running.current || !app.tool) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      await release(app.tool.slug, () => {
        if (!alive.current) return;
        const removedPath = `/library/app/${app.appid}`;
        if (currentPath.current === removedPath || currentPath.current.startsWith(`${removedPath}/`)) {
          nav("/library/home", { replace: true });
        }
        ui.toast(`${app.name} foi removida e seus dados no banco foram apagados.`);
        onClose();
      });
    } catch (cause) {
      if (!alive.current) return;
      setError(cause instanceof Error ? cause.message : "Não foi possível remover a ferramenta. Tente novamente.");
      running.current = false;
      setBusy(false);
    }
  };

  return createPortal(
    <dialog ref={dialog} className="tool-remove-dialog" aria-labelledby={title} aria-describedby={description} aria-busy={busy} onCancel={(event) => {
      event.preventDefault();
      if (!running.current) onClose();
    }}>
      <div className="tool-remove-dialog__body">
        <h2 id={title}>Remover {app.name}?</h2>
        <p id={description}>A ferramenta sairá da sua biblioteca. Todos os seus dados e histórico salvos no banco para esta ferramenta serão apagados permanentemente. Esta ação não pode ser desfeita.</p>
        {!app.tool?.available && <p className="tool-remove-dialog__notice">Esta ferramenta está “Em breve” na Loja. Você só poderá adquiri-la novamente quando ela for liberada.</p>}
        {error && <p className="tool-remove-dialog__error" role="alert">{error}</p>}
        <div className="tool-remove-dialog__actions">
          <button ref={cancel} type="button" className="btn btn--ghost" disabled={busy} onClick={onClose}>Cancelar</button>
          <button type="button" className="btn tool-remove-dialog__confirm" disabled={busy} onClick={remove}>{busy ? "Removendo e apagando…" : "Remover e apagar meus dados"}</button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
