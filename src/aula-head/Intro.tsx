import { lessons } from "./data";
import { useIntroVideo } from "./useIntroVideo";
import "./intro-legacy.css";
import "./intro.css";

const art = ["1-86IA2QJP.png", "2-Bea114wa.png", "3-BJq5GkJP.png", "4-D2CD8jcP.png"];
export function Intro({ onLesson, onPrompts }: { onLesson: (index: number) => void; onPrompts: () => void }) {
  const { sceneRef, videoRef, status } = useIntroVideo();
  return <div ref={sceneRef} className="head-intro hero-scene" data-video-status={status}>
    <div className="hero-media" aria-hidden="true">
      <img className="hero-background" src="/aula-head/hero-directions-poster.jpg" alt="" />
      <video ref={videoRef} src="/aula-head/hero-directions-scrub.mp4" poster="/aula-head/hero-directions-poster.jpg" className="hero-background hero-background-video" muted playsInline preload="auto" />
    </div>
    <div className="hero-atmosphere" aria-hidden="true" />
    <header className="game-navbar"><div className="nav-right-group"><img className="nav-partner-logo" src="/aula-head/head-academy.png" alt="Head Academy Business School" /></div></header>
    <main className="left-copy-column">
      <div className="eyebrow-badge"><span className="eyebrow-dot" aria-hidden="true" /><span className="eyebrow-text">Formação Head de Conteúdo • convida</span></div>
      <h1 className="hero-display-headline"><span className="headline-line">UM CARA</span><span className="headline-accent">CARAMELO</span></h1>
      <div className="course-pill-tag"><span>Treinamento:</span><strong>Landing Pages com IA</strong></div>
    </main>
    <div className="hero-top-bar"><button type="button" onClick={onPrompts} className="prompt-bank-trigger-btn" aria-label="Abrir banco de prompts do treinamento"><span aria-hidden="true">✳</span><span>Banco de Prompts</span></button></div>
    <footer className="hero-bottom-actions" aria-label="Aulas do treinamento">{(["left", "right"] as const).map((side, group) => <div className={`bottom-cards-cluster bottom-cards-${side}`} key={side}>{lessons.slice(group * 2, group * 2 + 2).map((lesson, offset) => {
      const index = group * 2 + offset;
      return <button type="button" className="mini-game-card" key={lesson.name} style={{ "--intro-delay": `${650 + index * 100}ms` } as React.CSSProperties} data-gaze-side={side} aria-label={`Aula ${index + 1}: ${lesson.name}`} onClick={() => onLesson(index * 4)}>
        <div className="mini-card-copy"><span className="mini-card-lesson">Aula {String(index + 1).padStart(2, "0")}</span><h2 className="mini-card-title">{lesson.name}</h2></div><span className="mini-card-go-btn" aria-hidden="true">GO</span><img src={`/aula-head/assets/${art[index]}`} alt="" className="mini-card-bg-crop" aria-hidden="true" />
      </button>;
    })}</div>)}{lessons[4] && <button type="button" className="bonus-lesson-card" aria-label={`Aula bônus: ${lessons[4].name}`} onClick={() => onLesson(16)}>
      <span className="bonus-lesson-copy"><span className="bonus-lesson-label">Aula bônus</span><span className="bonus-lesson-title">{lessons[4].name}</span></span>
      <svg className="bonus-lesson-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9" /><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" /></svg>
    </button>}</footer>
  </div>;
}
