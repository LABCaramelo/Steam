import { useState, type FormEvent } from "react";
import { Confirm, EmptyState, Modal, useToast } from "../shared/kit";
import { IconPlus, IconPencil, IconTrash } from "../shared/icons";
import { safeMedia, validLessonMedia } from "./media";
import type { AcademyRepo } from "./repo";
import type { AcademyData, CourseInput, LessonInput, ModuleInput, VideoKind } from "./types";

type Edit = { kind: "course"; value: CourseInput } | { kind: "module"; value: ModuleInput } | { kind: "lesson"; value: LessonInput };
const blankCourse = (): CourseInput => ({ title: "", slug: "", subtitle: "", description: "", cover_url: null, hero_url: null, accent: "caramel", position: 0, published: false });
const blankModule = (course_id: string, position: number): ModuleInput => ({ course_id, title: "", description: "", position });
const blankLesson = (course_id: string, module_id: string, position: number): LessonInput => ({ course_id, module_id, title: "", description: "", video_kind: "youtube", video_ref: "", duration_seconds: 0, cover_url: null, materials: [], position, published: false });

export function AcademyAdmin({ repo, data, onChanged }: { repo: AcademyRepo; data: AcademyData; onChanged: () => Promise<void> }) {
  const toast = useToast();
  const [selected, setSelected] = useState<string>(data.courses[0]?.id ?? "");
  const [edit, setEdit] = useState<Edit | null>(null);
  const [materials, setMaterials] = useState("");
  const [remove, setRemove] = useState<{ kind: "course" | "module" | "lesson"; id: string; title: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = data.courses.find((c) => c.id === selected);
  const modules = data.modules.filter((m) => m.course_id === selected);

  const open = (value: Edit) => { setEdit(value); setError(""); setMaterials(value.kind === "lesson" ? value.value.materials.map((m) => `${m.label} | ${m.url}`).join("\n") : ""); };
  const patch = (value: Record<string, unknown>) => setEdit((old) => old ? { ...old, value: { ...old.value, ...value } } as Edit : null);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!edit || busy) return;
    setError("");
    if (!edit.value.title.trim()) { setError("Escreva um título."); return; }
    const mediaFields = edit.kind === "course" ? [edit.value.cover_url, edit.value.hero_url] : edit.kind === "lesson" ? [edit.value.cover_url] : [];
    if (mediaFields.some((v) => v && !safeMedia(v))) { setError("Use um endereço HTTPS ou um caminho deste site para as imagens."); return; }
    setBusy(true);
    try {
      if (edit.kind === "course") {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(edit.value.slug)) throw new Error("O identificador deve usar letras minúsculas, números e hífens.");
        const saved = await repo.saveCourse({ ...edit.value, title: edit.value.title.trim() }); setSelected(saved.id);
      } else if (edit.kind === "module") await repo.saveModule({ ...edit.value, title: edit.value.title.trim() });
      else {
        if (!validLessonMedia(edit.value.video_kind, edit.value.video_ref)) throw new Error("Informe um vídeo válido. Para páginas interativas, use um caminho em /aula-head/.");
        const parsed = materials.split("\n").filter((line) => line.trim()).map((line) => {
          const split = line.indexOf("|");
          const label = split < 0 ? "Material da aula" : line.slice(0, split).trim();
          const url = (split < 0 ? line : line.slice(split + 1)).trim();
          if (!safeMedia(url)) throw new Error("Um material tem endereço inválido. Use Nome | https://endereco.");
          return { label, url };
        });
        await repo.saveLesson({ ...edit.value, title: edit.value.title.trim(), materials: parsed });
      }
      await onChanged(); setEdit(null); toast("Conteúdo salvo na Academy.", "success");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar. Tente novamente."); } finally { setBusy(false); }
  };
  const field = (label: string, key: string, maxLength: number, type = "text") => <label className="tk-field">{label}<input className="tk-input" type={type} maxLength={maxLength} required={key === "title" || key === "slug"} value={String((edit?.value as unknown as Record<string, unknown>)?.[key] ?? "")} onChange={(e) => patch({ [key]: type === "number" ? Number(e.target.value) : e.target.value })} /></label>;

  if (!data.admin) return null;
  return <section className="ac-admin"><div className="ac-row"><div><span className="tk-eyebrow">ÁREA DO LAB</span><h1>Editar Academy</h1><p className="tk-muted">Organize cursos, módulos e aulas. Rascunhos ficam visíveis apenas para administradores.</p></div><button className="cm-btn cm-btn--accent" onClick={() => open({ kind: "course", value: blankCourse() })}><IconPlus size={16} /> Novo curso</button></div>
    <div className="ac-admin__layout"><aside className="ac-panel ac-admin__courses">{data.courses.map((c) => <button className={c.id === selected ? "is-active" : ""} key={c.id} onClick={() => setSelected(c.id)}><strong>{c.title}</strong><span>{c.published ? "Publicado" : "Rascunho"}</span></button>)}</aside>
      <div>{current ? <><div className="ac-panel"><div className="ac-row"><div><h2>{current.title}</h2><span className="tk-chip">{current.published ? "Publicado" : "Rascunho"}</span></div><div className="ac-row"><button className="cm-btn cm-btn--surface cm-btn--sm" onClick={() => open({ kind: "course", value: { ...current } })}><IconPencil size={15} /> Editar curso</button><button className="tk-iconbtn" aria-label="Excluir curso" onClick={() => setRemove({ kind: "course", id: current.id, title: current.title })}><IconTrash /></button></div></div><button className="cm-btn cm-btn--ghost" onClick={() => open({ kind: "module", value: blankModule(current.id, (modules.at(-1)?.position ?? 0) + 1) })}><IconPlus size={16} /> Adicionar módulo</button></div>
        {modules.map((module) => <section className="ac-panel" key={module.id}><div className="ac-row"><h3>{module.title}</h3><div className="ac-row"><button className="tk-iconbtn" aria-label={`Editar módulo ${module.title}`} onClick={() => open({ kind: "module", value: { ...module } })}><IconPencil /></button><button className="tk-iconbtn" aria-label={`Excluir módulo ${module.title}`} onClick={() => setRemove({ kind: "module", id: module.id, title: module.title })}><IconTrash /></button></div></div>
          {data.lessons.filter((l) => l.module_id === module.id).map((lesson) => <div className="ac-admin__lesson" key={lesson.id}><div><strong>{lesson.title}</strong><span>{lesson.published ? "Publicada" : "Rascunho"} · {lesson.video_kind}</span></div><button className="tk-iconbtn" aria-label={`Editar aula ${lesson.title}`} onClick={() => open({ kind: "lesson", value: { ...lesson, materials: lesson.materials ?? [] } })}><IconPencil /></button><button className="tk-iconbtn" aria-label={`Excluir aula ${lesson.title}`} onClick={() => setRemove({ kind: "lesson", id: lesson.id, title: lesson.title })}><IconTrash /></button></div>)}
          <button className="cm-btn cm-btn--surface cm-btn--sm" onClick={() => open({ kind: "lesson", value: blankLesson(current.id, module.id, (data.lessons.filter((l) => l.module_id === module.id).at(-1)?.position ?? 0) + 1) })}><IconPlus size={15} /> Nova aula</button>
        </section>)}
      </> : <EmptyState title="Seu próximo curso começa aqui" text="Crie um curso e adicione os módulos e as aulas." />}</div>
    </div>
    {edit && <Modal title={`${edit.value.id ? "Editar" : "Criar"} ${edit.kind === "course" ? "curso" : edit.kind === "module" ? "módulo" : "aula"}`} width={680} onClose={() => { if (!busy) setEdit(null); }}>
      <form className="ac-editor" onSubmit={(e) => void save(e)}>{field("Título", "title", edit.kind === "lesson" ? 160 : 140)}
        {edit.kind === "course" && <>{field("Identificador (ex.: portfolio-com-ia)", "slug", 120)}{field("Subtítulo", "subtitle", 240)}{field("Imagem de capa (URL)", "cover_url", 500)}{field("Imagem de destaque (URL)", "hero_url", 500)}<label className="tk-field">Cor de destaque<select className="tk-input" value={edit.value.accent} onChange={(e) => patch({ accent: e.target.value })}>{["caramel", "sky", "pink", "violet", "yellow"].map((v) => <option key={v} value={v}>{v}</option>)}</select></label></>}
        <label className="tk-field">Descrição<textarea className="tk-input" rows={5} maxLength={edit.kind === "course" ? 8000 : edit.kind === "lesson" ? 20000 : 4000} value={edit.value.description} onChange={(e) => patch({ description: e.target.value })} /></label>
        {edit.kind === "lesson" && <><label className="tk-field">Módulo<select className="tk-input" value={edit.value.module_id} onChange={(e) => patch({ module_id: e.target.value })}>{data.modules.filter((m) => m.course_id === edit.value.course_id).map((m) => <option value={m.id} key={m.id}>{m.title}</option>)}</select></label><label className="tk-field">Tipo de aula<select className="tk-input" value={edit.value.video_kind} onChange={(e) => patch({ video_kind: e.target.value as VideoKind })}><option value="youtube">YouTube</option><option value="vimeo">Vimeo</option><option value="video">Arquivo de vídeo</option><option value="page">Apresentação interativa</option></select></label>{field("Vídeo (ID ou URL) / página interativa", "video_ref", 500)}{field("Duração em segundos", "duration_seconds", 9, "number")}{field("Imagem da aula (URL)", "cover_url", 500)}<label className="tk-field">Materiais: um por linha, no formato Nome | URL<textarea className="tk-input" rows={4} value={materials} onChange={(e) => setMaterials(e.target.value)} maxLength={12000} /></label></>}
        {field("Ordem de exibição", "position", 9, "number")}
        {edit.kind !== "module" && <label className="tk-check"><input type="checkbox" checked={edit.value.published} onChange={(e) => patch({ published: e.target.checked })} /> Publicar para a turma</label>}
        {error && <p className="ac-error" role="alert">{error}</p>}<div className="ac-row ac-editor__actions"><button className="cm-btn cm-btn--ghost" type="button" disabled={busy} onClick={() => setEdit(null)}>Cancelar</button><button className="cm-btn cm-btn--accent" disabled={busy}>{busy ? "Salvando…" : "Salvar conteúdo"}</button></div>
      </form>
    </Modal>}
    {remove && <Confirm title={`Excluir ${remove.title}?`} text="Todo o conteúdo associado será removido, incluindo progresso, anotações e comentários das aulas excluídas." danger confirmLabel="Excluir conteúdo" onClose={() => setRemove(null)} onConfirm={async () => { try { await repo.remove(remove.kind, remove.id); await onChanged(); toast("Conteúdo removido.", "success"); } catch (e) { toast("Não foi possível excluir o conteúdo.", "error"); throw e; } }} />}
  </section>;
}
