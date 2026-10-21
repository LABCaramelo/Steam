import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Isotype } from "@caramelo/design-system";
import { Modal, Spinner, useTheme, useToast, useToolUser } from "../shared/kit";
import { App as Editor } from "./editor/App";
import { bindPersistence, compactDocument, normalizeDocument, saveLocalCopy } from "./editor/io/persist";
import { createEmptyDocument } from "./editor/model/defaults";
import { createSampleDocument } from "./editor/model/sample";
import type { DocumentData } from "./editor/model/types";
import { store } from "./editor/store/store";
import { createSupabasePranchetaRepo, type PranchetaFile, type PranchetaFileInfo, type PranchetaRepo } from "./repo";
import { PranchetaSession } from "./session";
import "./editor/styles/tokens.css";
import "./editor/styles/app.css";
import "./prancheta.css";

const messageOf = (error: unknown) => error instanceof Error ? error.message : "Não foi possível concluir. Tente novamente.";
const updated = (date: string) => new Date(date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const bytes = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

function fileUrl(id: string | null) {
  const url = new URL(location.href);
  if (id) url.searchParams.set("file", id); else url.searchParams.delete("file");
  history.replaceState(null, "", url);
}

/** Same complete Prancheta editor, with a private multi-file library backed by the LAB database. */
export function PranchetaApp({ repo }: { repo?: PranchetaRepo }) {
  const user = useToolUser();
  const ownRepo = useMemo(() => createSupabasePranchetaRepo(user.id), [user.id]);
  return <Workspace key={user.id} repo={repo ?? ownRepo} />;
}

function Workspace({ repo }: { repo: PranchetaRepo }) {
  const user = useToolUser();
  const theme = useTheme();
  const toast = useToast();
  const [files, setFiles] = useState<PranchetaFileInfo[]>([]);
  const [session, setSession] = useState<PranchetaSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<PranchetaFileInfo | null>(null);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<PranchetaFileInfo | null>(null);
  const current = useRef<PranchetaSession | null>(null);
  const releaseBinding = useRef<(() => void) | null>(null);
  const mounted = useRef(false);
  const operation = useRef(false);
  const epoch = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const actions = useRef<{ create: () => void; import: (document: DocumentData) => Promise<void> }>({ create() {}, async import() {} });

  useEffect(() => { store.setTheme(theme); }, [theme]);

  const install = useCallback((file: PranchetaFile) => {
    const document = compactDocument(normalizeDocument(file.document));
    current.current?.dispose();
    releaseBinding.current?.();
    store.load(document);
    const next = new PranchetaSession(repo, { ...file, document });
    current.current = next;
    releaseBinding.current = bindPersistence({
      save: () => next.save(),
      create: () => actions.current.create(),
      import: (document) => actions.current.import(document),
    });
    next.start();
    fileUrl(file.id);
    setSession(next);
  }, [repo]);

  const refresh = useCallback(async () => {
    const generation = epoch.current;
    try {
      const result = await repo.listFiles();
      if (mounted.current && epoch.current === generation) {
        setFiles(result);
        setError("");
      }
    } catch (reason) {
      if (mounted.current && epoch.current === generation) setError(messageOf(reason));
    }
  }, [repo]);

  useEffect(() => {
    mounted.current = true;
    const generation = ++epoch.current;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const result = await repo.listFiles();
        if (!alive || epoch.current !== generation) return;
        setFiles(result);
        const id = new URLSearchParams(location.search).get("file");
        if (id) {
          const file = await repo.getFile(id);
          if (alive && epoch.current === generation) install(file);
        }
      } catch (reason) {
        if (alive && epoch.current === generation) setError(messageOf(reason));
      } finally {
        if (alive && epoch.current === generation) setLoading(false);
      }
    })();
    return () => {
      alive = false;
      mounted.current = false;
      epoch.current++;
      current.current?.dispose();
      current.current = null;
      releaseBinding.current?.();
      releaseBinding.current = null;
      store.load(createEmptyDocument());
    };
  }, [repo, install]);

  const run = async (action: () => Promise<void>, flush = true) => {
    if (operation.current || loading) return;
    operation.current = true;
    setBusy(true);
    const generation = epoch.current;
    try {
      store.finishTextEditing();
      if (flush && current.current && !await current.current.save()) return;
      if (!mounted.current || generation !== epoch.current) return;
      await action();
    } catch (reason) {
      if (mounted.current && generation === epoch.current) {
        setError(messageOf(reason));
        toast(messageOf(reason), "error");
      }
    } finally {
      if (mounted.current && generation === epoch.current) {
        operation.current = false;
        setBusy(false);
      }
    }
  };

  const create = (document = createEmptyDocument()) => run(async () => {
    const generation = epoch.current;
    const file = await repo.createFile(compactDocument(document));
    if (!mounted.current || generation !== epoch.current) return;
    setFiles((list) => [file, ...list]);
    setError("");
    install(file);
  });
  actions.current = {
    create: () => { void create(); },
    import: async (document) => { await create(document); },
  };

  const open = (file: PranchetaFileInfo) => run(async () => {
    const generation = epoch.current;
    const loaded = await repo.getFile(file.id);
    if (mounted.current && generation === epoch.current) { setError(""); install(loaded); }
  });
  const close = () => run(async () => {
    current.current?.dispose();
    current.current = null;
    releaseBinding.current?.();
    releaseBinding.current = null;
    setSession(null);
    fileUrl(null);
    store.load(createEmptyDocument());
    await refresh();
  });
  const duplicate = (file: PranchetaFileInfo) => run(async () => {
    const loaded = await repo.getFile(file.id);
    const copy = await repo.createFile({ ...loaded.document, name: `${loaded.name.slice(0, 190)} — cópia` });
    if (mounted.current) { setFiles((list) => [copy, ...list]); toast("Cópia criada no LAB.", "success"); }
  });
  const preserveCopy = () => run(async () => {
    const document = structuredClone(compactDocument(store.state.doc));
    document.name = `${document.name.slice(0, 190)} — cópia`;
    const file = await repo.createFile(document);
    if (!mounted.current) return;
    install(file);
    toast("Seu trabalho foi preservado em um novo arquivo.", "success");
  }, false);
  const reload = () => {
    if (!session || !window.confirm("Reabrir a versão salva? As alterações que ainda não chegaram ao LAB serão descartadas.")) return;
    void run(async () => {
      const file = await repo.getFile(session.id);
      if (mounted.current) install(file);
    }, false);
  };

  const importFile = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) { toast("O arquivo deve ter até 25 MB.", "error"); return; }
    try {
      const document = normalizeDocument(JSON.parse(await file.text()));
      await create(document);
    } catch { toast("Arquivo inválido. Escolha um JSON exportado pela Prancheta.", "error"); }
  };

  const filtered = files.filter((file) => file.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  return (
    <div className={`prancheta-root ${session ? "prancheta-root--editing" : ""}`}>
      {session ? <>
        <div className="prancheta-cloudbar">
          <button className="pr-btn" onClick={() => void close()} disabled={busy}>← Meus arquivos</button>
          <SaveIndicator session={session} />
          <button className="pr-btn" onClick={() => void session.save()} disabled={busy}>Salvar agora</button>
          <button className="pr-btn" onClick={() => void preserveCopy()} disabled={busy}>Salvar uma cópia no LAB</button>
          {busy && <Spinner size={15} />}
        </div>
        <SaveProblem session={session} onCopy={() => void preserveCopy()} onReload={reload} busy={busy} />
        {error && <div className="pr-error" role="alert">{error}<button className="pr-btn" onClick={() => setError("")}>Fechar aviso</button></div>}
        <div className="prancheta-editor" inert={busy || undefined}><Editor key={session.instanceId} /></div>
      </> : <main className="pr-library">
        <header className="pr-library__header">
          <div className="pr-brand"><Isotype size={32} decorative /><span>PRANCHETA <small>UM CARA CARAMELO · LAB</small></span></div>
          <span className="pr-owner">Arquivos de {user.name}</span>
        </header>
        <section className="pr-intro"><span className="tk-eyebrow">SEU ESPAÇO DE DESIGN</span><h1>Uma ideia merece<br />espaço para crescer.</h1><p>Desenhe, organize camadas e crie componentes. Cada arquivo fica salvo na sua conta.</p></section>
        <div className="pr-library__toolbar">
          <h2>Meus arquivos <span>{files.length}</span></h2>
          <label className="pr-search"><span className="pr-sr">Buscar arquivos</span><input placeholder="Buscar arquivo…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <button className="pr-btn" disabled={busy || loading} onClick={() => input.current?.click()}>Importar JSON</button>
          <button className="pr-btn" disabled={busy || loading} onClick={() => void create(createSampleDocument())}>Usar exemplo</button>
          <button className="pr-btn pr-btn--accent" disabled={busy || loading} onClick={() => void create()}>+ Novo arquivo</button>
          <input ref={input} className="pr-sr" type="file" accept=".json,application/json" tabIndex={-1} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void importFile(file); }} />
        </div>
        {loading ? <div className="pr-loading"><Spinner label="Carregando arquivos" />Carregando seus arquivos…</div> : error ? <div className="pr-error" role="alert"><p>{error}</p><button className="pr-btn" onClick={() => void refresh()}>Tentar novamente</button></div> : filtered.length ? <div className="pr-files">
          {filtered.map((file) => <article key={file.id} className="pr-file cm-surface cm-surface--spotlight">
            <button className="pr-file__open" onClick={() => void open(file)} disabled={busy} aria-label={`Abrir ${file.name}`}><span className="pr-file__visual"><svg viewBox="0 0 160 110" width="160" aria-hidden="true"><rect x="18" y="12" width="124" height="86" rx="4" fill="none" stroke="currentColor" opacity=".25" /><rect x="32" y="29" width="52" height="32" rx="4" fill="currentColor" opacity=".2" /><circle cx="116" cy="43" r="14" fill="none" stroke="currentColor" /><path d="M32 73h72m-72 8h45" stroke="currentColor" opacity=".6" /></svg></span><h3>{file.name}</h3><span className="pr-file__meta">{updated(file.updated_at)} · {bytes(file.size_bytes)}</span></button>
            <div className="pr-file__actions"><button className="pr-btn" disabled={busy} onClick={() => { setRenaming(file); setName(file.name); }}>Renomear</button><button className="pr-btn" disabled={busy} onClick={() => void duplicate(file)}>Duplicar</button><button className="pr-btn" disabled={busy} onClick={() => setDeleting(file)}>Excluir</button></div>
          </article>)}
        </div> : <div className="pr-empty"><h3>{query ? "Nenhum arquivo com esse nome." : "Seu próximo projeto começa aqui."}</h3><p>{query ? "Experimente outra busca." : "Crie um arquivo em branco ou explore o exemplo completo do editor."}</p></div>}
        <p className="pr-library__note">Seus arquivos são privados. Você também pode exportar uma cópia em JSON, SVG ou PNG pelo editor.</p>
      </main>}
      {renaming && <Modal title="Renomear arquivo" onClose={() => !busy && setRenaming(null)} footer={<><button className="pr-btn" disabled={busy} onClick={() => setRenaming(null)}>Cancelar</button><button className="pr-btn pr-btn--accent" disabled={busy || !name.trim()} onClick={() => void run(async () => { const file = await repo.getFile(renaming.id); await repo.saveFile(file.id, { ...file.document, name: name.trim() }, file.updated_at); if (mounted.current) { setRenaming(null); await refresh(); } })}>Salvar nome</button></>}><label className="pr-name-label">Nome<input autoFocus maxLength={200} value={name} onChange={(event) => setName(event.target.value)} /></label></Modal>}
      {deleting && <Modal title="Excluir arquivo?" onClose={() => !busy && setDeleting(null)} footer={<><button className="pr-btn" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button><button className="pr-btn pr-btn--danger" disabled={busy} onClick={() => void run(async () => { await repo.deleteFile(deleting.id, deleting.updated_at); if (mounted.current) { setFiles((list) => list.filter((file) => file.id !== deleting.id)); setDeleting(null); } })}>Excluir arquivo</button></>}><p>“{deleting.name}” será removido da sua conta. Esta ação não pode ser desfeita.</p></Modal>}
    </div>
  );
}

function SaveIndicator({ session }: { session: PranchetaSession }) {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  return <span className={`pr-save pr-save--${state.kind}`} role="status">{state.kind === "saving" && <Spinner size={12} />}{state.kind === "saved" ? "✓ Salvo no LAB" : state.kind === "saving" ? "Salvando…" : state.kind === "dirty" ? "Alterações por salvar" : "Arquivo ainda não salvo"}</span>;
}

function SaveProblem({ session, onCopy, onReload, busy }: { session: PranchetaSession; onCopy: () => void; onReload: () => void; busy: boolean }) {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  if (state.kind !== "error" && state.kind !== "conflict") return null;
  return <div className="pr-error" role="alert"><p>{state.message} Seu trabalho continua aberto.</p>{state.kind !== "conflict" && <button className="pr-btn" disabled={busy} onClick={() => void session.save()}>Tentar salvar</button>}<button className="pr-btn" disabled={busy} onClick={onCopy}>Salvar uma cópia no LAB</button><button className="pr-btn" onClick={saveLocalCopy}>Baixar JSON</button>{state.kind === "conflict" && <button className="pr-btn" disabled={busy} onClick={onReload}>Reabrir versão salva</button>}</div>;
}
