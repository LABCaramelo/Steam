import { useCallback, useEffect, useRef, useState } from "react";
import { lessons, slides } from "./data";
import {
  emptyLabState,
  hashSlide,
  persistLabState,
  type DemoValue,
  type SlideViewMode,
} from "./model";
import { Experiences } from "./slides";
import { Intro } from "./Intro";
import { PromptModal } from "./PromptModal";
import {
  ClassroomReturnPanel,
  LectureModeBar,
  LivePracticePanel,
} from "./LectureModes";
import { Modal } from "./ui";
import "./reestruturacao.css";

const isLessonLocation = () =>
  /^#slide-\d+$/.test(location.hash) ||
  location.hash === "#aula-01" ||
  /\/aula-01\/?$/.test(location.pathname);

export default function SlidePresentation({ onBackToPrompts }: { onBackToPrompts?: () => void }) {
  const [showIntro, setShowIntro] = useState(() => !isLessonLocation());
  const [index, setIndex] = useState(hashSlide);
  const [lab, setLab] = useState(emptyLabState);
  const [modal, setModal] = useState<"prompts" | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [media, setMedia] = useState<Record<string, string>>({});
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const slideRef = useRef(index);
  const introRef = useRef(showIntro);
  const slide = slides[index];
  const lesson = lessons[slide.lesson];
  const lessonLabel = `Aula 0${slide.lesson + 1}`;

  slideRef.current = index;
  introRef.current = showIntro;

  const lessonStart = slide.lesson * 4;

  // Modo de momento de aula para o slide atual (concept | practice | review)
  const currentMode: SlideViewMode = lab.slideModes[index] || "concept";

  const setSlideMode = useCallback(
    (mode: SlideViewMode) => {
      setLab((prev) => {
        const next = {
          ...prev,
          slideModes: {
            ...prev.slideModes,
            [index]: mode,
          },
        };
        persistLabState(next);
        return next;
      });
    },
    [index]
  );

  // Salvar LabState no localStorage sempre que mudar
  useEffect(() => {
    persistLabState(lab);
  }, [lab]);

  const returnHome = useCallback(() => {
    setShowIntro(true);
  }, []);

  const go = useCallback((next: number) => {
    const value = Math.min(slides.length - 1, Math.max(0, next));
    setShowIntro(false);
    setIndex(value);
  }, []);

  useEffect(() => {
    if (showIntro) {
      const path = location.pathname.replace(/\/aula-01\/?$/, "");
      history.replaceState(null, "", `${path}${location.search}#inicio`);
      document.title = "Landing Pages com IA · HEAD × Um Cara Caramelo";
      return;
    }
    history.replaceState(
      null,
      "",
      `${location.pathname}${location.search}#slide-${index + 1}`
    );
    document.title = `${String((index % 4) + 1).padStart(2, "0")}/04 · ${lessonLabel} · ${slide.title} · HEAD`;
  }, [index, lessonLabel, slide.title, showIntro]);

  // Teclado: Navegação completa
  useEffect(() => {
    const syncHash = () => {
      setShowIntro(!isLessonLocation());
      setIndex(hashSlide());
    };
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);

    const keyboard = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        document.querySelector("dialog[open]") ||
        (e.target instanceof Element &&
          e.target.closest("input,textarea,select,button,[contenteditable]"))
      ) {
        return;
      }

      // Teclas 1 a 4: Pula diretamente para as Aulas 1 a 4
      if (["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        const targetLesson = Number(e.key) - 1;
        go(targetLesson * 4);
        return;
      }

      // ESC: volta para a visão geral / tela inicial
      if (e.key === "Escape") {
        e.preventDefault();
        returnHome();
        return;
      }

      // Se estiver na intro, apenas teclas numéricas ou cliques navegam
      if (introRef.current) return;

      const currentIdx = slideRef.current;

      // Setas para navegação entre slides
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        if (currentIdx === slides.length - 1) returnHome();
        else go(currentIdx + 1);
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        if (currentIdx > 0) go(currentIdx - 1);
        return;
      }

      // Espaço: avança no ciclo pedagógico (Conceito -> Prática -> Retorno -> Próximo slide)
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        const activeMode = lab.slideModes[currentIdx] || "concept";
        if (activeMode === "concept") {
          setSlideMode("practice");
        } else if (activeMode === "practice") {
          setSlideMode("review");
        } else {
          // Do retorno, avança para o próximo slide
          setSlideMode("concept");
          if (currentIdx === slides.length - 1) returnHome();
          else go(currentIdx + 1);
        }
      }
    };

    window.addEventListener("keydown", keyboard);
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
      window.removeEventListener("keydown", keyboard);
    };
  }, [go, lab.slideModes, returnHome, setSlideMode]);

  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(preference.matches);
    preference.addEventListener("change", change);
    return () => preference.removeEventListener("change", change);
  }, []);

  const demo = useCallback((key: string, value: DemoValue) => {
    setLab((p) => {
      const next = { ...p, demo: { ...p.demo, [key]: value } };
      persistLabState(next);
      return next;
    });
  }, []);

  const openPrompt = useCallback((i: number) => {
    setPromptIndex(i);
    setModal("prompts");
  }, []);

  // Checklist de validação da etapa no painel de retorno
  const toggleSlideCheck = (checkIndex: number) => {
    const key = `slide_${index}_check_${checkIndex}`;
    const current = Boolean(lab.demo[key]);
    demo(key, !current);
  };

  const currentSlideChecks = slide.livePractice.checklist.map(
    (_, i) => Boolean(lab.demo[`slide_${index}_check_${i}`])
  );

  const navigation = (
    <div className="navigation">
      <button
        className="button"
        aria-label="Slide anterior"
        disabled={index === 0}
        onClick={() => go(index - 1)}
      >
        ← <span>Anterior</span>
      </button>

      <span className="page-number">
        <b>{String(index - lessonStart + 1).padStart(2, "0")}</b> / 04
      </span>

      <button
        className="button primary"
        aria-label={
          index === slides.length - 1
            ? "Concluir apresentação"
            : "Próximo slide"
        }
        onClick={() => (index === slides.length - 1 ? returnHome() : go(index + 1))}
      >
        <span>{index === slides.length - 1 ? "Voltar ao início" : "Próximo"}</span>{" "}
        {index === slides.length - 1 ? "↩" : "→"}
      </button>
    </div>
  );

  return (
    <>
      {showIntro ? (
        <Intro onLesson={go} onPrompts={() => setModal("prompts")} />
      ) : (
        <main
          className={`presentation ${reduced ? "reduced-motion" : ""}`}
          style={{ "--accent": lesson.color } as React.CSSProperties}
        >
          <header className="topbar">
            <a className="wordmark" href="/">
              UM CARA
              <br />
              CARAMELO
              <span>®</span>
            </a>
            <div className="course-brand">
              <strong>LANDING PAGES COM IA</strong>
              <span>HEAD ACADEMY × LABORATÓRIO DE INTERAÇÃO</span>
            </div>

            <div className="topbar-mode-center">
              <LectureModeBar
                currentMode={currentMode}
                onSelectMode={setSlideMode}
                hasPrompt={slide.prompt >= 0}
              />
            </div>

            <div className="top-actions">
              {onBackToPrompts && (
                <button onClick={onBackToPrompts}>📋 8 Prompts</button>
              )}
              <button onClick={() => setModal("prompts")}>Ver Prompts ↗</button>
              <button onClick={returnHome}>← Início</button>
            </div>
          </header>

          <section
            className="stage"
            aria-label={`${lessonLabel}, slide ${index - lessonStart + 1}: ${slide.title}`}
          >
            <div className="slide-content" key={index}>
              <header className="slide-header">
                <h1>{slide.heading}</h1>
                <p className="slide-line">{slide.line}</p>
              </header>

              <div className="experiment">
                {currentMode === "concept" && (
                  <Experiences
                    index={index}
                    lab={lab}
                    setLab={setLab}
                    demo={demo}
                    openPrompt={openPrompt}
                    media={media}
                    setMedia={setMedia}
                    reduced={reduced}
                  />
                )}

                {currentMode === "practice" && (
                  <LivePracticePanel
                    practice={slide.livePractice}
                    onOpenPrompt={openPrompt}
                    onProceedToReview={() => setSlideMode("review")}
                  />
                )}

                {currentMode === "review" && (
                  <ClassroomReturnPanel
                    questions={slide.reviewQuestions}
                    checklist={slide.livePractice.checklist}
                    slideIndex={index}
                    checksState={currentSlideChecks}
                    onToggleCheck={toggleSlideCheck}
                    onNextSlide={() => {
                      setSlideMode("concept");
                      if (index === slides.length - 1) returnHome();
                      else go(index + 1);
                    }}
                    onBackToConcept={() => setSlideMode("concept")}
                    isLastSlide={index === slides.length - 1}
                  />
                )}
              </div>

              {navigation}
            </div>
          </section>
        </main>
      )}

      {modal === "prompts" && (
        <PromptModal
          initialIndex={promptIndex}
          onClose={() => setModal(null)}
        />
      )}

      {message && (
        <Modal title="Informação" close={() => setMessage("")}>
          <div className="modal-content">
            <p>{message}</p>
            <button className="button primary" onClick={() => setMessage("")}>
              Fechar
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
