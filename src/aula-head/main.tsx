import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { briefLabels, finalChecks, lessons, prompts, slides } from "./data";
import { hashSlide, readProject, STORAGE_KEY, type DemoValue, type Project } from "./model";
import { Experiences } from "./slides";
import { Copy, Modal } from "./ui";
import "./style.css";

const params = new URLSearchParams(location.search);
const isTeacher = params.get("professor") === "1";
const session = params.get("session") || crypto.randomUUID();
const channelName = `aula-head-presenter-${session}`;

function App() {
  const [index, setIndex] = useState(hashSlide);
  const [project, setProject] = useState(readProject);
  const [practice, setPractice] = useState(false);
  const [modal, setModal] = useState<"prompts" | "project" | "overview" | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [media, setMedia] = useState<Record<string, string>>({});
  const [reduced, setReduced] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [connected, setConnected] = useState(false);
  const channel = useRef<BroadcastChannel | null>(null);
  const teacherWindow = useRef<Window | null>(null);
  const slideRef = useRef(index);
  const slide = slides[index];
  const lesson = lessons[slide.lesson];
  slideRef.current = index;

  const go = useCallback((next: number) => {
    const value = Math.min(15, Math.max(0, next));
    setIndex(value); setPractice(false);
    if (isTeacher) channel.current?.postMessage({ type: "navigate", index: value });
  }, []);
  useEffect(() => {
    if (isTeacher) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); setSaveError(false); }
    catch { setSaveError(true); }
  }, [project]);
  useEffect(() => {
    history.replaceState(null, "", `${location.pathname}${location.search}#slide-${index + 1}`);
    document.title = `${isTeacher ? "Professor · " : ""}${index + 1}/16 · ${slide.title} · HEAD`;
    if (!isTeacher) channel.current?.postMessage({ type: "slide", index });
  }, [index, slide.title]);
  useEffect(() => {
    const syncHash = () => { setIndex(hashSlide()); setPractice(false); };
    window.addEventListener("hashchange", syncHash);
    const keyboard = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || document.querySelector("dialog[open]") || (e.target instanceof Element && e.target.closest("input,textarea,select,button,[contenteditable]"))) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(slideRef.current + 1); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(slideRef.current - 1); }
    };
    window.addEventListener("keydown", keyboard);
    return () => { window.removeEventListener("hashchange", syncHash); window.removeEventListener("keydown", keyboard); };
  }, [go]);
  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;
    const bc = new BroadcastChannel(channelName); channel.current = bc;
    bc.onmessage = ({ data }) => {
      if (!data || typeof data !== "object") return;
      if (data.type === "hello" && !isTeacher) { bc.postMessage({ type: "slide", index: slideRef.current }); setConnected(true); }
      if (data.type === "slide" && isTeacher && Number.isInteger(data.index) && data.index >= 0 && data.index < 16) { setIndex(data.index); setConnected(true); }
      if (data.type === "navigate" && !isTeacher && Number.isInteger(data.index) && data.index >= 0 && data.index < 16) { setIndex(data.index); setPractice(false); bc.postMessage({ type: "slide", index: data.index }); }
      if (data.type === "bye") setConnected(false);
    };
    if (isTeacher) bc.postMessage({ type: "hello" });
    const bye = () => bc.postMessage({ type: "bye" });
    window.addEventListener("beforeunload", bye);
    return () => { window.removeEventListener("beforeunload", bye); bc.close(); channel.current = null; };
  }, []);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(preference.matches);
    preference.addEventListener("change", change);
    return () => preference.removeEventListener("change", change);
  }, []);

  function demo(key: string, value: DemoValue) { setProject(p => ({ ...p, demo: { ...p.demo, [key]: value } })); }
  function updateList(key: "brief" | "notes", i: number, value: string) { setProject(p => ({ ...p, [key]: p[key].map((old, n) => n === i ? value : old) })); }
  function toggleComplete(i: number) { setProject(p => ({ ...p, completed: p.completed.map((v, n) => n === i ? !v : v) })); }
  function openPrompt(i: number) { setPromptIndex(i); setModal("prompts"); }
  function openTeacher() {
    if (teacherWindow.current && !teacherWindow.current.closed) { teacherWindow.current.focus(); return; }
    const url = new URL(location.href); url.search = new URLSearchParams({ professor: "1", session }).toString();
    const popup = window.open(url, `head-professor-${session}`, "popup,width=720,height=860"); teacherWindow.current = popup;
    setMessage(popup ? "Janela do professor aberta. Projete apenas a janela da apresentação; mantenha as notas na outra tela." : "O navegador bloqueou a janela do professor. Permita pop-ups para este site e tente novamente.");
  }
  const briefText = briefLabels.map((label, i) => `${label}\n${project.brief[i] || "[preencher]"}`).join("\n\n");
  function exportText() {
    return `# Minha Landing Page · HEAD\n\n## Briefing\n\n${briefText}\n\n${slides.map((s, i) => `## ${String(i + 1).padStart(2, "0")} · ${s.title}\n\n[${project.completed[i] ? "x" : " "}] ${s.deliverable}\n\n${project.notes[i] || "Sem registro."}`).join("\n\n")}\n\n## Revisão final\n\n${finalChecks.map((c, i) => `- [${project.checks[i] ? "x" : " "}] ${c}`).join("\n")}`;
  }
  function download() {
    const url = URL.createObjectURL(new Blob([exportText()], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "minha-landing-page-head.md"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const count = project.completed.filter(Boolean).length;
  const navigation = <div className="navigation"><button className="button" aria-label="Slide anterior" disabled={index === 0} onClick={() => go(index - 1)}>← <span>Anterior</span></button><span className="page-number"><b>{String(index + 1).padStart(2, "0")}</b> / 16</span><button className="button primary" aria-label="Próximo slide" disabled={index === 15} onClick={() => go(index + 1)}><span>Próximo</span> →</button></div>;

  if (isTeacher) return <main className="teacher-shell" style={{ "--accent": lesson.color } as React.CSSProperties}>
    <div className="eyebrow">MODO PROFESSOR · JANELA SEPARADA</div><h1>Seu roteiro.<br /><em>A turma vê a experiência.</em></h1>
    <p className="teacher-status">{connected ? "● Sincronizado com a apresentação" : "Aguardando a janela da apresentação. Mantenha as duas janelas abertas."}</p>
    <p className="teacher-warning">Compartilhe somente a janela da apresentação. Compartilhar a tela inteira também expõe estas notas.</p>
    <div className="teacher-current"><span className="eyebrow">AULA {slide.lesson + 1} · {lesson.name} · SLIDE {index + 1}</span><h2>{slide.title}</h2><blockquote>{slide.speech}</blockquote><h3>Como conduzir</h3><p className="teacher-instructions">{slide.instructions.replace(/\*\*/g, "")}</p><h3>Na LP do aluno</h3><p>{slide.task}</p><p className="hint">Entrega: {slide.deliverable}.</p></div>
    {navigation}<div className="teacher-next"><span className="eyebrow">A SEGUIR</span><p>{slides[index + 1]?.title || "Fechamento · A IA executa. Você dirige."}</p></div>
    <p className="small">As interações permanecem na janela projetada. Estas setas controlam os 16 slides principais.</p>
  </main>;

  return <main className={`presentation ${reduced ? "reduced-motion" : ""}`} style={{ "--accent": lesson.color } as React.CSSProperties}>
    <header className="topbar"><a className="wordmark" href="/">UM CARA<br />CARAMELO<span>®</span></a><div className="course-brand"><strong>LANDING PAGES COM IA</strong><span>HEAD ACADEMY × LABORATÓRIO DE INTERAÇÃO</span></div><div className="top-actions"><button onClick={() => setModal("overview")}>Roteiro</button><button onClick={() => setModal("project")}>Meu projeto <span className="count">{count}/16</span></button><button onClick={openTeacher}>Professor ↗</button></div></header>
    <nav className="lesson-nav" aria-label="Quatro aulas">{lessons.map((l, i) => <button key={l.name} className={slide.lesson === i ? "active" : ""} aria-current={slide.lesson === i ? "step" : undefined} onClick={() => go(i * 4)}><span className="lesson-number">0{i + 1}</span><span><b>{l.name}</b><small>Slides {i * 4 + 1}–{i * 4 + 4}</small></span><span className="lesson-check">{project.completed.slice(i * 4, i * 4 + 4).every(Boolean) ? "✓" : "↗"}</span></button>)}</nav>
    <section className="stage" aria-label={`Slide ${index + 1}: ${slide.title}`}>
      <div className="slide-content" key={index}>
        <header className="slide-header"><div className="eyebrow"><span className="live-dot" /> AULA 0{slide.lesson + 1} / {lesson.name}<span className="slide-caption">{String(index + 1).padStart(2, "0")} — {practice ? "PRATICAR" : "EXPLORAR"}</span></div><h1>{slide.heading}</h1><p className="slide-line">{slide.line}</p></header>
        <div className="experiment">{practice ? <div className="practice-panel"><div><span className="eyebrow">AGORA, NA SUA LANDING PAGE</span><h2>{slide.deliverable}.</h2><p>{slide.task}</p>{slide.prompt >= 0 && <button className="button" onClick={() => openPrompt(slide.prompt)}>Ver Prompt {String(slide.prompt + 1).padStart(2, "0")} ↗</button>}<p className="small">A execução real acontece na sua ferramenta de IA. Marque a entrega depois de conferir o resultado.</p></div><div className="practice-fields">{index === 3 ? <><BriefFields project={project} update={updateList} /><Copy text={briefText} label="Copiar briefing" /></> : <label>Seu registro de projeto<textarea value={project.notes[index]} onChange={e => updateList("notes", index, e.target.value)} placeholder="Anote decisões, cole o texto aprovado ou salve o link da sua entrega…" /></label>}<label className="checkbox"><input type="checkbox" checked={project.completed[index]} onChange={() => toggleComplete(index)} />{slide.deliverable}</label></div></div> : <Experiences index={index} project={project} setProject={setProject} demo={demo} openPrompt={openPrompt} media={media} setMedia={setMedia} reduced={reduced} />}</div>
        <footer className="slide-footer"><p>{practice ? "Seu projeto avança a cada decisão." : slide.invite}</p><div>{slide.prompt >= 0 && <button className="prompt-link" onClick={() => openPrompt(slide.prompt)}>PROMPT {String(slide.prompt + 1).padStart(2, "0")} ↗</button>}<button className={`practice-toggle ${practice ? "active" : ""}`} onClick={() => setPractice(!practice)}>{practice ? "← Voltar à experiência" : "No seu projeto →"}</button></div></footer>
      </div>
    </section>
    <footer className="deck-footer"><div className="slide-dots" aria-label="Selecionar slide">{slides.map((s, i) => <button key={s.title} className={`${i === index ? "active" : ""} ${project.completed[i] ? "done" : ""}`} aria-label={`Slide ${i + 1}: ${s.title}`} aria-current={i === index ? "step" : undefined} onClick={() => go(i)}><span /></button>)}</div>{navigation}<div className="utilities"><button onClick={() => setModal("prompts")}>8 prompts ↗</button><button aria-pressed={reduced} onClick={() => setReduced(!reduced)}>{reduced ? "Movimento reduzido ✓" : "Reduzir movimento"}</button><button aria-label="Alternar tela cheia" onClick={async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { setMessage("Tela cheia indisponível neste navegador. Use a opção de tela cheia do navegador."); } }}>⛶</button></div></footer>
    <div className="course-baseline"><span>A IA EXECUTA. <b>VOCÊ DIRIGE.</b></span><span>{saveError ? "Não foi possível salvar. Exporte seu projeto para preservar os registros." : "Registros salvos neste navegador"}</span></div>
    <p className="app-message" role="status">{message}</p>
    {modal === "overview" && <Modal title="Uma ideia. Quatro etapas. Uma LP sua." close={() => setModal(null)} wide><div className="overview">{lessons.map((l, n) => <section key={l.name}><span className="eyebrow">AULA 0{n + 1} · SLIDES {n * 4 + 1}–{n * 4 + 4}</span><h3>{l.name}</h3><p>{l.question}</p><p className="hint">Ao final: {l.result}</p>{slides.slice(n * 4, n * 4 + 4).map((s, j) => <button key={s.title} onClick={() => { go(n * 4 + j); setModal(null); }}>{String(n * 4 + j + 1).padStart(2, "0")} · {s.title} ↗</button>)}</section>)}</div></Modal>}
    {modal === "prompts" && <Modal title="Os oito prompts originais" close={() => setModal(null)} wide><div className="prompt-browser"><nav aria-label="Selecionar prompt">{prompts.map((p, i) => <button className={i === promptIndex ? "selected" : ""} aria-pressed={i === promptIndex} key={p.id} onClick={() => setPromptIndex(i)}><span>0{i + 1}</span>{p.name}</button>)}</nav><section><span className="eyebrow">PROMPT 0{promptIndex + 1} · TEXTO INTEGRAL</span><h3>{prompts[promptIndex].name}</h3><p className="small">Original: {prompts[promptIndex].filename}. Execute na ferramenta correspondente. Personalize exemplos, mídias e dados no seu projeto; o texto abaixo está preservado.</p><Copy text={prompts[promptIndex].prompt} label="Copiar prompt completo" /><pre tabIndex={0}>{prompts[promptIndex].prompt}</pre></section></div></Modal>}
    {modal === "project" && <Modal title="Sua Landing Page, em construção." close={() => setModal(null)} wide><div className="project-panel"><p>Este caderno pertence a este navegador. Exporte para guardar uma cópia ou levar seus registros a outra ferramenta.</p><div className="project-actions"><button className="button primary" onClick={download}>Exportar projeto .md ↓</button><Copy text={exportText()} label="Copiar projeto" /></div><label className="progress-label">Entregas verificadas: {count}/16<progress max={16} value={count} /></label><h3>Briefing</h3><BriefFields project={project} update={updateList} /><Copy text={briefText} label="Copiar briefing" />{lessons.map((l, n) => <section className="project-lesson" key={l.name}><h3>0{n + 1} · {l.name}</h3><p>{l.result}</p>{slides.slice(n * 4, n * 4 + 4).map((s, j) => { const i = n * 4 + j; return <div className="project-deliverable" key={s.title}><label className="checkbox"><input type="checkbox" checked={project.completed[i]} onChange={() => toggleComplete(i)} />{s.deliverable}</label><button onClick={() => { go(i); setPractice(true); setModal(null); }}>Abrir registro ↗</button>{project.notes[i] && <p>{project.notes[i]}</p>}</div>; })}</section>)}<h3>Checklist final</h3>{finalChecks.map((check, i) => <label className="checkbox" key={check}><input type="checkbox" checked={project.checks[i]} onChange={() => setProject(p => ({ ...p, checks: p.checks.map((v, j) => j === i ? !v : v) }))} />{check}</label>)}</div></Modal>}
  </main>;
}
function BriefFields({ project, update }: { project: Project; update: (key: "brief" | "notes", i: number, value: string) => void }) { return <div className="brief-fields">{briefLabels.map((label, i) => <label key={label}>{label}<textarea rows={2} value={project.brief[i]} onChange={e => update("brief", i, e.target.value)} placeholder={i === 0 ? "Ex.: mentoria de conteúdo para profissionais autônomos" : "Escreva com suas palavras…"} /></label>)}</div>; }

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
