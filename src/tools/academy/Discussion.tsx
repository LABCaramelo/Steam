import { useEffect, useRef, useState } from "react";
import { Confirm, EmptyState, Modal, relativeTime, Spinner, useToast, useToolUser } from "../shared/kit";
import { IconHeart, IconNote, IconReply, IconSend } from "../shared/icons";
import type { AcademyRepo } from "./repo";
import type { Comment, Like } from "./types";

export function Discussion({ lessonId, repo, admin, onDirtyChange }: { lessonId: string; repo: AcademyRepo; admin: boolean; onDirtyChange: (value: boolean) => void }) {
  const user = useToolUser();
  const toast = useToast();
  const [tab, setTab] = useState<"comments" | "notes">("comments");
  const [rows, setRows] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState<Comment | null>(null);
  const [editing, setEditing] = useState<Comment | null>(null);
  const [remove, setRemove] = useState<Comment | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const noteDirty = useRef(false);
  noteDirty.current = note !== savedNote;
  useEffect(() => { onDirtyChange(note !== savedNote); return () => onDirtyChange(false); }, [note, savedNote, onDirtyChange]);

  useEffect(() => {
    let alive = true;
    setLoading(true); setFailed(false);
    repo.lessonData(lessonId).then((data) => { if (alive) { setNote(data.note); setSavedNote(data.note); setRows(data.comments); setLikes(data.likes); } }).catch(() => { if (alive) setFailed(true); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [lessonId, repo, attempt]);
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => { if (noteDirty.current) event.preventDefault(); };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, []);

  async function action(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } catch { toast("Não foi possível salvar. Seu texto continua aqui para tentar novamente.", "error"); } finally { setBusy(false); }
  }
  const post = () => action(async () => {
    if (!body.trim()) return;
    const created = await repo.comment(lessonId, body.trim(), reply?.id);
    setRows((list) => [...list, created]); setBody(""); setReply(null);
  });
  const toggleLike = (commentId: string) => action(async () => {
    const liked = likes.some((like) => like.comment_id === commentId && like.user_id === user.id);
    await repo.like(commentId, !liked);
    setLikes((list) => liked ? list.filter((like) => like.comment_id !== commentId || like.user_id !== user.id) : [...list, { comment_id: commentId, user_id: user.id }]);
  });
  const showComment = (comment: Comment, child = false) => <article key={comment.id} className={`ac-comment ${child ? "ac-comment--reply" : ""}`}>
    <div className="ac-comment__avatar" aria-hidden="true">{comment.author_name.slice(0, 1).toUpperCase()}</div>
    <div className="ac-comment__body"><header><strong>{comment.author_name || "Aluno do LAB"}</strong><span>{relativeTime(comment.created_at)}{comment.edited ? " · editado" : ""}</span></header>
      <p>{comment.body}</p><div className="ac-comment__actions">
        <button className="cm-btn cm-btn--ghost cm-btn--sm" aria-label={`Curtir comentário de ${comment.author_name}`} aria-pressed={likes.some((l) => l.comment_id === comment.id && l.user_id === user.id)} disabled={busy} onClick={() => void toggleLike(comment.id)}><IconHeart size={14} /> {likes.filter((l) => l.comment_id === comment.id).length}</button>
        {!child && <button className="cm-btn cm-btn--ghost cm-btn--sm" onClick={() => { setReply(comment); document.getElementById("ac-comment-input")?.focus(); }}><IconReply size={14} /> Responder</button>}
        {comment.user_id === user.id && <button className="cm-btn cm-btn--ghost cm-btn--sm" onClick={() => setEditing({ ...comment })}>Editar</button>}
        {(comment.user_id === user.id || admin) && <button className="cm-btn cm-btn--ghost cm-btn--sm" onClick={() => setRemove(comment)}>Excluir</button>}
      </div>
    </div>
  </article>;

  if (loading) return <div className="ac-panel"><Spinner label="Carregando anotações e comentários" /></div>;
  if (failed) return <div className="ac-panel" role="alert"><p>Não foi possível carregar anotações e comentários.</p><button className="cm-btn cm-btn--surface" onClick={() => setAttempt((n) => n + 1)}>Tentar novamente</button></div>;
  return <section className="ac-panel ac-discussion">
    <nav className="ac-tabs" aria-label="Sobre esta aula"><button className={tab === "comments" ? "is-active" : ""} aria-pressed={tab === "comments"} onClick={() => setTab("comments")}>Comentários da turma ({rows.length})</button><button className={tab === "notes" ? "is-active" : ""} aria-pressed={tab === "notes"} onClick={() => setTab("notes")}><IconNote size={16} /> Minhas anotações</button></nav>
    {tab === "notes" ? <div className="ac-note"><label className="tk-field">Só você pode ler estas anotações<textarea className="tk-input" value={note} maxLength={20000} rows={8} onChange={(e) => setNote(e.target.value)} /></label><div className="ac-row"><span className="tk-muted" role="status">{note === savedNote ? "Anotações salvas" : "Alterações não salvas"}</span><button className="cm-btn cm-btn--accent" disabled={busy || note === savedNote} onClick={() => void action(async () => { await repo.saveNote(lessonId, note); setSavedNote(note); toast("Anotação salva.", "success"); })}>Salvar anotação</button></div></div> : <>
      <form className="ac-comment-form" onSubmit={(e) => { e.preventDefault(); void post(); }}>
        {reply && <div className="ac-row"><span>Respondendo a {reply.author_name}</span><button type="button" disabled={busy} className="cm-btn cm-btn--ghost cm-btn--sm" onClick={() => setReply(null)}>Cancelar resposta</button></div>}
        <label className="tk-sr-only" htmlFor="ac-comment-input">Seu comentário</label><textarea className="tk-input" id="ac-comment-input" disabled={busy} value={body} maxLength={4000} rows={3} placeholder="Sua pergunta pode ajudar quem está criando junto." onChange={(e) => setBody(e.target.value)} />
        <button className="cm-btn cm-btn--accent" disabled={busy || !body.trim()}><IconSend size={16} /> {reply ? "Enviar resposta" : "Comentar"}</button>
      </form>
      {rows.length === 0 && <EmptyState title="A conversa começa aqui" text="Comente uma ideia ou tire sua primeira dúvida." />}
      {rows.filter((c) => !c.parent_id).map((comment) => <div key={comment.id}>{showComment(comment)}{rows.filter((c) => c.parent_id === comment.id).map((c) => showComment(c, true))}</div>)}
      {rows.length === 500 && <p className="tk-muted">Exibindo os primeiros 500 comentários desta aula.</p>}
    </>}
    {editing && <Modal title="Editar comentário" onClose={() => setEditing(null)} footer={<button className="cm-btn cm-btn--accent" disabled={busy || !editing.body.trim()} onClick={() => void action(async () => { await repo.editComment(editing.id, editing.body.trim()); setRows((list) => list.map((c) => c.id === editing.id ? { ...c, body: editing.body.trim(), edited: true } : c)); setEditing(null); })}>Salvar</button>}><textarea className="tk-input" aria-label="Texto do comentário" value={editing.body} maxLength={4000} rows={5} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></Modal>}
    {remove && <Confirm title="Excluir comentário?" text="O comentário e suas respostas serão removidos." confirmLabel="Excluir comentário" danger onClose={() => setRemove(null)} onConfirm={async () => { try { await repo.deleteComment(remove.id); setRows((list) => list.filter((c) => c.id !== remove.id && c.parent_id !== remove.id)); } catch (e) { toast("Não foi possível excluir.", "error"); throw e; } }} />}
  </section>;
}
