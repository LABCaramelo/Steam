import { useCallback, useEffect, useRef, useState } from "react";

import { lessons, prompts, slides } from "./data";
import { emptyLabState, hashSlide, type DemoValue } from "./model";
import { Experiences } from "./slides";
import { Copy, Modal } from "./ui";
import { Intro } from "./Intro";


const params = new URLSearchParams(location.search);
const isTeacher = params.get("professor") === "1";
function presentationSession() {
  const supplied = params.get("session");
  if (supplied) return supplied;
  try {
    const key = "head-presentation-session";
    const id = sessionStorage.getItem(key) || crypto.randomUUID();
    sessionStorage.setItem(key, id);
    return id;
  } catch { return crypto.randomUUID(); }
}
const session = presentationSession();
const channelName = `aula-head-presenter-${session}`;
const isLessonLocation = () => /^#slide-\d+$/.test(location.hash) || location.hash === "#aula-01" || /\/aula-01\/?$/.test(location.pathname);

export default function App() {
  const [showIntro, setShowIntro] = useState(() => !isTeacher && !isLessonLocation());
  const [index, setIndex] = useState(hashSlide);
  const [lab, setLab] = useState(emptyLabState);
  const [modal, setModal] = useState<"prompts" | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [media, setMedia] = useState<Record<string, string>>({});
  const [reduced, setReduced] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [connected, setConnected] = useState(false);
  const channel = useRef<BroadcastChannel | null>(null);
  const teacherWindow = useRef<Window | null>(null);
  const slideRef = useRef(index);
  const introRef = useRef(showIntro);
  const slide = slides[index];
  const lesson = lessons[slide.lesson];
  slideRef.current = index;
  introRef.current = showIntro;
  const lessonStart = slide.lesson * 4;
  const lessonEnd = lessonStart + 3;

  const returnHome = useCallback(() => {
    setShowIntro(true);
    if (isTeacher) channel.current?.postMessage({ type: "home" });
  }, []);

  const go = useCallback((next: number) => {
    const value = Math.min(15, Math.max(0, next));
    setShowIntro(false); setIndex(value);
    if (isTeacher) channel.current?.postMessage({ type: "navigate", index: value });
  }, []);
  useEffect(() => {
    if (showIntro) {
      if (!isTeacher) {
        const path = location.pathname.replace(/\/aula-01\/?$/, "");
        history.replaceState(null, "", `${path}${location.search}#inicio`);
        document.title = "Landing Pages com IA · HEAD × Um Cara Caramelo";
        channel.current?.postMessage({ type: "home" });
      }
      return;
    }
    history.replaceState(null, "", `${location.pathname}${location.search}#slide-${index + 1}`);
    document.title = `${isTeacher ? "Professor · " : ""}${index % 4 + 1}/4 · Aula ${Math.floor(index / 4) + 1} · ${slide.title} · HEAD`;
    if (!isTeacher) channel.current?.postMessage({ type: "slide", index });
  }, [index, slide.title, showIntro]);
  useEffect(() => {
    const syncHash = () => { setShowIntro(!isTeacher && !isLessonLocation()); setIndex(hashSlide()); };
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    const keyboard = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || introRef.current || document.querySelector("dialog[open]") || (e.target instanceof Element && e.target.closest("input,textarea,select,button,[contenteditable]"))) return;
      const start = Math.floor(slideRef.current / 4) * 4;
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); if (slideRef.current === start + 3) returnHome(); else go(slideRef.current + 1); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); if (slideRef.current > start) go(slideRef.current - 1); }
    };
    window.addEventListener("keydown", keyboard);
    return () => { window.removeEventListener("hashchange", syncHash); window.removeEventListener("popstate", syncHash); window.removeEventListener("keydown", keyboard); };
  }, [go, returnHome]);
  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;
    const bc = new BroadcastChannel(channelName); channel.current = bc;
    bc.onmessage = ({ data }) => {
      if (!data || typeof data !== "object") return;
      if (data.type === "hello" && !isTeacher) { bc.postMessage(introRef.current ? { type: "home" } : { type: "slide", index: slideRef.current }); setConnected(true); }
      if (data.type === "home") { setShowIntro(true); setConnected(true); }
      if (data.type === "slide" && isTeacher && Number.isInteger(data.index) && data.index >= 0 && data.index < 16) { setShowIntro(false); setIndex(data.index); setConnected(true); }
      if (data.type === "navigate" && !isTeacher && Number.isInteger(data.index) && data.index >= 0 && data.index < 16) { setShowIntro(false); setIndex(data.index); bc.postMessage({ type: "slide", index: data.index }); }
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

  const demo = useCallback((key: string, value: DemoValue) => { setLab(p => ({ ...p, demo: { ...p.demo, [key]: value } })); }, []);
  function openPrompt(i: number) { setPromptIndex(i); setModal("prompts"); }
  const teacherUrl = new URL(location.href);
  teacherUrl.search = new URLSearchParams({ professor: "1", session }).toString();
  teacherUrl.hash = `slide-${index + 1}`;
  function openTeacher(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (teacherWindow.current && !teacherWindow.current.closed) { teacherWindow.current.focus(); return; }
    const popup = window.open(teacherUrl, `head-professor-${session}`, "popup,width=720,height=860"); teacherWindow.current = popup;
    if (!popup) setMessage("O navegador bloqueou a janela do professor. Permita pop-ups para este site e tente novamente.");
  }
  const navigation = <div className="navigation"><button className="button" aria-label="Slide anterior" disabled={index === lessonStart} onClick={() => go(index - 1)}>← <span>Anterior</span></button><span className="page-number"><b>{String(index - lessonStart + 1).padStart(2, "0")}</b> / 04</span><button className="button primary" aria-label={index === lessonEnd ? "Voltar à página inicial" : "Próximo slide"} onClick={() => index === lessonEnd ? returnHome() : go(index + 1)}><span>{index === lessonEnd ? "Voltar ao início" : "Próximo"}</span> {index === lessonEnd ? "↩" : "→"}</button></div>;

  if (isTeacher && showIntro) return <main className="teacher-shell"><div className="eyebrow">MODO PROFESSOR</div><h1>Abertura do treinamento.</h1><p>Escolha a próxima aula na página inicial da apresentação. Esta janela acompanha a navegação.</p></main>;

  if (isTeacher) return <main className="teacher-shell" style={{ "--accent": lesson.color } as React.CSSProperties}>
    <div className="eyebrow">MODO PROFESSOR · JANELA SEPARADA</div><h1>Seu roteiro.<br /><em>A turma vê a experiência.</em></h1>
    <p className="teacher-status">{connected ? "● Sincronizado com a apresentação" : "Aguardando a janela da apresentação. Mantenha as duas janelas abertas."}</p>
    <p className="teacher-warning">Compartilhe somente a janela da apresentação. Compartilhar a tela inteira também expõe estas notas.</p>
    <div className="teacher-current"><span className="eyebrow">AULA {slide.lesson + 1} · {lesson.name} · SLIDE {index - lessonStart + 1}</span><h2>{slide.title}</h2><blockquote>{slide.speech}</blockquote><h3>Como conduzir</h3><p className="teacher-instructions">{slide.instructions.replace(/\*\*/g, "")}</p></div>
    {navigation}<div className="teacher-next"><span className="eyebrow">A SEGUIR</span><p>{index === lessonEnd ? "Voltar à abertura para escolher a próxima aula." : slides[index + 1].title}</p></div>
    <p className="small">As interações permanecem na janela projetada. Estas setas controlam os quatro slides desta aula.</p>
  </main>;

  return <>
    {showIntro ? <Intro onLesson={go} onPrompts={() => setModal("prompts")} /> : <main className={`presentation ${reduced ? "reduced-motion" : ""}`} style={{ "--accent": lesson.color } as React.CSSProperties}>
    <header className="topbar"><a className="wordmark" href="/">UM CARA<br />CARAMELO<span>®</span></a><div className="course-brand"><strong>LANDING PAGES COM IA</strong><span>HEAD ACADEMY × LABORATÓRIO DE INTERAÇÃO</span></div><div className="top-actions"><button onClick={returnHome}>← Início</button><a href={teacherUrl.href} target="_blank" rel="noopener" onClick={openTeacher}>Professor ↗</a></div></header>
    <section className="stage" aria-label={`Aula ${slide.lesson + 1}, slide ${index - lessonStart + 1}: ${slide.title}`}>
      <div className="slide-content" key={index}>
        <header className="slide-header"><div className="eyebrow"><span className="live-dot" /> AULA 0{slide.lesson + 1} / {lesson.name}<span className="slide-caption">{String(index - lessonStart + 1).padStart(2, "0")} — EXPLORAR</span></div><h1>{slide.heading}</h1><p className="slide-line">{slide.line}</p></header>
        <div className="experiment"><Experiences index={index} lab={lab} setLab={setLab} demo={demo} openPrompt={openPrompt} media={media} setMedia={setMedia} reduced={reduced} /></div>
        <footer className="slide-footer"><p>{slide.invite}</p>{slide.prompt >= 0 && <button className="prompt-link" onClick={() => openPrompt(slide.prompt)}>PROMPT {String(slide.prompt + 1).padStart(2, "0")} ↗</button>}</footer>
      </div>
    </section>
    <progress className="deck-progress" aria-label="Progresso da apresentação" max={4} value={index - lessonStart + 1} />
    <footer className="deck-footer"><div className="slide-dots" aria-label="Slides desta aula">{slides.slice(lessonStart, lessonStart + 4).map((s, offset) => { const i = lessonStart + offset; return <button key={s.title} className={i === index ? "active" : ""} aria-label={`Slide ${offset + 1}: ${s.title}`} aria-current={i === index ? "step" : undefined} onClick={() => go(i)}><span /></button>; })}</div>{navigation}<div className="utilities"><button onClick={() => setModal("prompts")}>8 prompts ↗</button><button aria-pressed={reduced} onClick={() => setReduced(!reduced)}>{reduced ? "Movimento reduzido ✓" : "Reduzir movimento"}</button><button aria-label="Alternar tela cheia" onClick={async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { setMessage("Tela cheia indisponível neste navegador. Use a opção de tela cheia do navegador."); } }}>⛶</button></div></footer>
    </main>}
    {message && <Modal title="Aviso" close={() => setMessage("")}><p style={{ padding: "20px 28px", lineHeight: 1.6 }}>{message}</p></Modal>}
    {modal === "prompts" && <Modal title="Os oito prompts originais" close={() => setModal(null)} wide><div className="prompt-browser"><nav aria-label="Selecionar prompt">{prompts.map((p, i) => <button className={i === promptIndex ? "selected" : ""} aria-pressed={i === promptIndex} key={p.id} onClick={() => setPromptIndex(i)}><span>0{i + 1}</span>{p.name}</button>)}</nav><section><span className="eyebrow">PROMPT 0{promptIndex + 1} · TEXTO INTEGRAL</span><h3>{prompts[promptIndex].name}</h3><p className="small">Original: {prompts[promptIndex].filename}. Execute na ferramenta correspondente. Personalize exemplos, mídias e dados no seu projeto; o texto abaixo está preservado.</p><Copy text={prompts[promptIndex].prompt} label="Copiar prompt completo" /><pre tabIndex={0}>{prompts[promptIndex].prompt}</pre></section></div></Modal>}
  </>;
}
