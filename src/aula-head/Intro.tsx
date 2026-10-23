import { lessons } from "./data";
import { useIntroVideo } from "./useIntroVideo";
import "./intro-legacy.css";
import "./intro.css";

const art = ["1-86IA2QJP.png", "2-Bea114wa.png", "3-BJq5GkJP.png", "4-D2CD8jcP.png"];

const lessonTitles = [
  { action: "ENTENDER", target: "UMA LP" },
  { action: "ENTENDER", target: "CRIAÇÃO COM IA" },
  { action: "ENTENDER", target: "LP COM IA" },
  { action: "CRIANDO", target: "LP COM IA" },
];

export function Intro({ onLesson, onPrompts }: { onLesson: (index: number) => void; onPrompts: () => void }) {
  const { sceneRef, videoRef, status } = useIntroVideo();

  return (
    <div ref={sceneRef} className="head-intro hero-scene" data-video-status={status}>
      <div className="hero-media" aria-hidden="true">
        <img className="hero-background" src="/aula-head/hero-directions-poster.jpg" alt="" />
        <video
          ref={videoRef}
          src="/aula-head/hero-directions-scrub.mp4"
          poster="/aula-head/hero-directions-poster.jpg"
          className="hero-background hero-background-video"
          muted
          playsInline
          preload="auto"
        />
      </div>
      <div className="hero-atmosphere" aria-hidden="true" />
      <header className="game-navbar">
        <div className="nav-right-group">
          <img className="nav-partner-logo" src="/aula-head/head-academy.png" alt="Head Academy Business School" />
        </div>
      </header>
      <main className="left-copy-column">
        <div className="eyebrow-badge">
          <span className="eyebrow-dot" aria-hidden="true" />
          <span className="eyebrow-text">Formação Head de Conteúdo • convida</span>
        </div>
        <h1 className="hero-display-headline">
          <span className="headline-line">UM CARA</span>
          <span className="headline-accent">CARAMELO</span>
        </h1>
        <div className="course-pill-tag">
          <span>Treinamento:</span>
          <strong>Landing Pages com IA</strong>
        </div>
      </main>
      <div className="hero-top-bar">
        <button
          type="button"
          onClick={onPrompts}
          className="prompt-bank-trigger-btn"
          aria-label="Abrir banco de prompts do treinamento"
        >
          <span aria-hidden="true">✳</span>
          <span>8 Prompts Oficiais</span>
        </button>
      </div>
      <footer className="hero-bottom-actions" aria-label="Aulas do treinamento">
        {(["left", "right"] as const).map((side, group) => (
          <div className={`bottom-cards-cluster bottom-cards-${side}`} key={side}>
            {lessons.slice(group * 2, group * 2 + 2).map((lesson, offset) => {
              const index = group * 2 + offset;
              const titleData = lessonTitles[index] || { action: "AULA", target: lesson.name };
              return (
                <button
                  type="button"
                  className="mini-game-card"
                  key={lesson.name}
                  style={
                    {
                      "--intro-delay": `${650 + index * 100}ms`,
                      "--lesson-accent": lesson.color,
                    } as React.CSSProperties
                  }
                  data-gaze-side={side}
                  aria-label={`Aula ${index + 1}: ${lesson.name}`}
                  onClick={() => onLesson(index * 4)}
                >
                  <div className="mini-card-copy">
                    <span className="mini-card-lesson">
                      <span className="mini-card-dot" aria-hidden="true" />
                      Aula {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2 className="mini-card-title">
                      <span className="title-action">{titleData.action}</span>
                      <span className="title-target">{titleData.target}</span>
                    </h2>
                  </div>
                  <img
                    src={`/aula-head/assets/${art[index]}`}
                    alt=""
                    className="mini-card-bg-crop"
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        ))}
      </footer>
    </div>
  );
}
