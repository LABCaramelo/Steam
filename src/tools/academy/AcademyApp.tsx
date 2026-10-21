import { Isotype } from "@caramelo/design-system";
import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState, Spinner, useToast } from "../shared/kit";
import { IconArrowLeft, IconBookmark, IconCheckCircle, IconPlay, IconSearch, IconSettings } from "../shared/icons";
import { AcademyAdmin } from "./Admin";
import { Discussion } from "./Discussion";
import { duration, safeMedia } from "./media";
import { Player } from "./Player";
import type { AcademyRepo } from "./repo";
import type { AcademyData, Lesson, Progress } from "./types";

export function AcademyApp({ repo }: { repo: AcademyRepo }) {
  const toast = useToast();
  const [data, setData] = useState<AcademyData | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"courses" | "saved" | "admin">("courses");
  const [lessonId, setLessonId] = useState<string | null>(() => new URLSearchParams(location.search).get("lesson"));
  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const alive = useRef(true);
  const loadVersion = useRef(0);
  const progress = useRef(new Map<string, Progress>());
  const pending = useRef(Promise.resolve());
  const noteDirty = useRef(false);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setFailed(false);
    try {
      const loaded = await repo.load();
      if (alive.current && version === loadVersion.current) { setData(loaded); progress.current = new Map(loaded.progress.map((p) => [p.lesson_id, p])); }
    } catch { if (alive.current && version === loadVersion.current) setFailed(true); }
  }, [repo]);
  useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; }; }, [load]);

  const choose = (id: string | null) => {
    if (noteDirty.current && !window.confirm("Sua anotação ainda não foi salva. Sair desta aula?")) return;
    const url = new URL(location.href);
    if (id) url.searchParams.set("lesson", id); else url.searchParams.delete("lesson");
    history.replaceState(null, "", url);
    noteDirty.current = false; setLessonId(id); setSaveStatus("");
  };
  const saveProgress = useCallback((id: string, seconds: number, completed?: boolean) => {
    const before = progress.current.get(id);
    const row: Progress = { lesson_id: id, position_seconds: Math.max(0, Math.floor(seconds)), completed_at: completed === undefined ? before?.completed_at ?? null : completed ? new Date().toISOString() : null, last_watched_at: new Date().toISOString() };
    progress.current.set(id, row);
    if (alive.current) setSaveStatus("Salvando progresso…");
    const task = pending.current.catch(() => {}).then(async () => {
      await repo.saveProgress(row);
      if (alive.current) { setData((d) => d ? { ...d, progress: [...d.progress.filter((p) => p.lesson_id !== id), row] } : d); setSaveStatus("Progresso salvo"); }
    });
    pending.current = task;
    void task.catch(() => { if (alive.current) { setSaveStatus("Progresso não salvo"); toast("Não foi possível salvar o progresso. Confira sua conexão.", "error"); } });
    return task;
  }, [repo, toast]);

  if (!data) return <main className="ac-shell">{failed ? <EmptyState title="A Academy não carregou" text="Confira sua conexão e tente novamente." action={<button className="cm-btn cm-btn--accent" onClick={() => void load()}>Tentar novamente</button>} /> : <div className="ac-loading"><Spinner label="Carregando Academy" /></div>}</main>;
  const lessons = data.modules.flatMap((module) => data.lessons.filter((lesson) => lesson.module_id === module.id && lesson.course_id === module.course_id))
    .filter((l) => l.published && data.courses.some((c) => c.id === l.course_id && c.published));
  const lesson = lessonId ? lessons.find((l) => l.id === lessonId) : null;
  const course = data.courses.find((c) => c.id === lesson?.course_id);
  const activeProgress = lesson ? data.progress.find((p) => p.lesson_id === lesson.id) : undefined;
  const done = !!activeProgress?.completed_at;
  const ordered = course ? data.modules.filter((m) => m.course_id === course.id).flatMap((m) => lessons.filter((l) => l.module_id === m.id)) : [];
  const next = lesson ? ordered[ordered.findIndex((l) => l.id === lesson.id) + 1] : undefined;
  const filteredCourses = data.courses.filter((c) => c.published && [c.title, c.subtitle, c.description].join(" ").toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  const continueLesson = [...data.progress].sort((a, b) => b.last_watched_at.localeCompare(a.last_watched_at)).map((p) => lessons.find((l) => l.id === p.lesson_id && !p.completed_at)).find(Boolean);
  const favorite = async (target: Lesson) => {
    setBusy(true);
    const value = !data.favorites.includes(target.id);
    try { await repo.favorite(target.id, value); setData((d) => d ? { ...d, favorites: value ? [...d.favorites, target.id] : d.favorites.filter((id) => id !== target.id) } : d); } catch { toast("Não foi possível atualizar os favoritos.", "error"); } finally { setBusy(false); }
  };

  return <main className="ac-shell">
    <header className="ac-header"><button className="ac-brand" onClick={() => choose(null)} aria-label="Academy: vitrine de cursos"><Isotype size={26} decorative /><strong>ACADEMY<span>UM CARA CARAMELO / LAB</span></strong></button>
      <nav className="ac-nav" aria-label="Academy"><button aria-current={view === "courses" && !lesson ? "page" : undefined} onClick={() => { choose(null); setView("courses"); }}>Cursos</button><button aria-current={view === "saved" && !lesson ? "page" : undefined} onClick={() => { choose(null); setView("saved"); }}><IconBookmark size={16} /> Favoritos</button>{data.admin && <button onClick={() => { choose(null); setView("admin"); }}><IconSettings size={16} /> Editar Academy</button>}</nav>
    </header>
    {lessonId && !lesson && <div className="ac-panel"><p>Esta aula não está disponível para assistir.</p><button className="cm-btn cm-btn--surface" onClick={() => choose(null)}>Voltar aos cursos</button></div>}
    {lesson && course ? <div className="ac-watch">
      <section className="ac-watch__main"><button className="cm-btn cm-btn--ghost cm-btn--sm" onClick={() => choose(null)}><IconArrowLeft size={15} /> {course.title}</button>
        <div className={`ac-player ${lesson.video_kind === "page" ? "ac-player--page" : ""}`}><Player key={lesson.id} lesson={lesson} start={progress.current.get(lesson.id)?.position_seconds ?? 0} onProgress={(seconds) => { void saveProgress(lesson.id, seconds); }} onEnded={() => { void saveProgress(lesson.id, progress.current.get(lesson.id)?.position_seconds ?? 0, true); }} /></div>
        <div className="ac-lesson-head"><div><span className="tk-eyebrow">{data.modules.find((m) => m.id === lesson.module_id)?.title}</span><h1>{lesson.title}</h1></div><button className="tk-iconbtn" aria-label={data.favorites.includes(lesson.id) ? "Remover aula dos favoritos" : "Favoritar aula"} aria-pressed={data.favorites.includes(lesson.id)} disabled={busy} onClick={() => void favorite(lesson)}><IconBookmark /></button></div>
        <div className="ac-row ac-completion"><span className="tk-muted" role="status">{saveStatus}</span><button className={`cm-btn ${done ? "cm-btn--surface" : "cm-btn--accent"}`} disabled={busy} aria-pressed={done} onClick={async () => { setBusy(true); try { await saveProgress(lesson.id, progress.current.get(lesson.id)?.position_seconds ?? 0, !done); } catch { /* reported by saveProgress */ } finally { setBusy(false); } }}><IconCheckCircle size={16} /> {done ? "Concluída · Desmarcar" : "Marcar como concluída"}</button>{next && <button className="cm-btn cm-btn--surface" onClick={() => choose(next.id)}>Próxima aula →</button>}</div>
        <section className="ac-panel"><p className="ac-description">{lesson.description}</p>{lesson.materials?.length > 0 && <><h2>Materiais da aula</h2><div className="ac-materials">{lesson.materials.map((m, i) => safeMedia(m.url) && <a className="cm-btn cm-btn--surface" key={i} href={safeMedia(m.url)!} target="_blank" rel="noopener noreferrer">{m.label || "Material"} ↗</a>)}</div></>}</section>
        <Discussion key={lesson.id} lessonId={lesson.id} repo={repo} admin={data.admin} onDirtyChange={(dirty) => { noteDirty.current = dirty; }} />
      </section>
      <aside className="ac-playlist"><span className="tk-eyebrow">SEU CAMINHO</span><h2>{course.title}</h2><progress max={ordered.length || 1} value={ordered.filter((l) => data.progress.some((p) => p.lesson_id === l.id && p.completed_at)).length} aria-label="Progresso no curso" />
        {data.modules.filter((m) => m.course_id === course.id).map((module) => <section key={module.id}><h3>{module.title}</h3>{lessons.filter((l) => l.module_id === module.id).map((l) => <button key={l.id} className={l.id === lesson.id ? "is-active" : ""} aria-current={l.id === lesson.id ? "page" : undefined} onClick={() => choose(l.id)}>{data.progress.some((p) => p.lesson_id === l.id && p.completed_at) ? <IconCheckCircle size={18} /> : <IconPlay size={18} />}<span>{l.title}<small>{duration(l.duration_seconds)}</small></span></button>)}</section>)}
      </aside>
    </div> : view === "admin" && data.admin ? <AcademyAdmin repo={repo} data={data} onChanged={load} /> : <div className="ac-catalog">
      <header className="ac-hero"><span className="tk-eyebrow">FORMAÇÃO / FEITA NO LAB</span><h1>Aprenda no ritmo<br />de quem <em>cria.</em></h1><p>Conteúdo para sair da ideia e colocar o próximo projeto em movimento.</p>{continueLesson && <button className="cm-btn cm-btn--accent" onClick={() => choose(continueLesson.id)}><IconPlay size={17} /> Continuar: {continueLesson.title}</button>}</header>
      <div className="ac-row"><h2>{view === "saved" ? "Suas aulas favoritas" : "Explore os cursos"}</h2>{view === "courses" && <label className="tk-search"><IconSearch size={16} /><input className="tk-input" aria-label="Buscar cursos" placeholder="Buscar cursos" value={query} onChange={(e) => setQuery(e.target.value)} /></label>}</div>
      {view === "saved" ? <div className="ac-saved">{lessons.filter((l) => data.favorites.includes(l.id)).map((l) => <button className="ac-saved__row" key={l.id} onClick={() => choose(l.id)}><IconPlay /><div><strong>{l.title}</strong><span>{data.courses.find((c) => c.id === l.course_id)?.title}</span></div><IconBookmark /></button>)}{!lessons.some((l) => data.favorites.includes(l.id)) && <EmptyState title="Guarde o que faz diferença" text="Favorite uma aula para encontrá-la aqui." />}</div> : <div className="ac-courses">{filteredCourses.map((c) => {
        const units = lessons.filter((l) => l.course_id === c.id);
        const complete = units.filter((l) => data.progress.some((p) => p.lesson_id === l.id && p.completed_at)).length;
        const first = units.find((l) => !data.progress.some((p) => p.lesson_id === l.id && p.completed_at)) ?? units[0];
        return <article className={`ac-course ac-accent--${c.accent} cm-surface cm-surface--spotlight`} key={c.id}><div className="ac-course__cover">{safeMedia(c.cover_url) ? <img src={safeMedia(c.cover_url)!} alt="" loading="lazy" /> : <span aria-hidden="true">{c.title.slice(0, 1)}</span>}<span className="tk-chip">{units.length} {units.length === 1 ? "aula" : "aulas"}</span></div><div className="ac-course__body"><span className="tk-eyebrow">{c.subtitle || "CURSO DO LAB"}</span><h3>{c.title}</h3><p>{c.description}</p><div className="ac-row"><small>{complete} de {units.length} concluídas</small><button className="cm-btn cm-btn--accent cm-btn--sm" disabled={!first} onClick={() => choose(first.id)}>{first ? complete ? "Continuar" : "Começar" : "Em breve"}<IconPlay size={15} /></button></div><progress max={units.length || 1} value={complete} aria-label={`Progresso em ${c.title}`} /></div></article>;
      })}{!filteredCourses.length && <EmptyState title={query ? "Nenhum curso encontrado" : "O próximo curso está a caminho"} text={query ? "Tente outra palavra na busca." : "O LAB está preparando as próximas aulas."} />}</div>}
    </div>}
  </main>;
}
