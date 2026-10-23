import type { LivePracticeData } from "./data";
import { Copy } from "./ui";
import { prompts } from "./data";

export interface LectureModeBarProps {
  currentMode: "concept" | "practice" | "review";
  onSelectMode: (mode: "concept" | "practice" | "review") => void;
  hasPrompt?: boolean;
}

export function LectureModeBar({ currentMode, onSelectMode, hasPrompt }: LectureModeBarProps) {
  return (
    <div className="lecture-mode-bar" role="tablist" aria-label="Momento da aula">
      <button
        type="button"
        role="tab"
        aria-selected={currentMode === "concept"}
        className={`mode-btn ${currentMode === "concept" ? "active" : ""}`}
        onClick={() => onSelectMode("concept")}
      >
        <span className="mode-num">01</span>
        <span className="mode-title">Conceito</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={currentMode === "practice"}
        className={`mode-btn ${currentMode === "practice" ? "active" : ""}`}
        onClick={() => onSelectMode("practice")}
      >
        <span className="mode-num">02</span>
        <span className="mode-title">Agora na Prática</span>
        {hasPrompt && <span className="mode-badge">Prompt ↗</span>}
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={currentMode === "review"}
        className={`mode-btn ${currentMode === "review" ? "active" : ""}`}
        onClick={() => onSelectMode("review")}
      >
        <span className="mode-num">03</span>
        <span className="mode-title">Voltamos à Aula</span>
      </button>
    </div>
  );
}

interface PracticePanelProps {
  practice: LivePracticeData;
  onOpenPrompt?: (promptIndex: number) => void;
  onProceedToReview: () => void;
}

export function LivePracticePanel({ practice, onOpenPrompt, onProceedToReview }: PracticePanelProps) {
  const associatedPrompt = practice.promptNumber !== undefined && practice.promptNumber > 0
    ? prompts[practice.promptNumber - 1]
    : null;

  return (
    <div className="live-practice-panel" aria-label="Painel de Demonstração em Tempo Real">
      <div className="practice-header">
        <span className="practice-tag">DEMONSTRAÇÃO AO VIVO · O PROFESSOR COMPARTILHA A TELA</span>
        <h2>Agora na prática</h2>
        <p className="practice-sub">
          Acompanhe o professor abrindo a ferramenta e executando diante da turma.
        </p>
      </div>

      <div className="practice-grid">
        <div className="practice-card tool-card">
          <small className="card-kicker">QUAL FERRAMENTA VAMOS ABRIR?</small>
          <strong>{practice.tool}</strong>
          {practice.toolUrl && (
            <a
              href={practice.toolUrl}
              target="_blank"
              rel="noreferrer"
              className="practice-ext-link"
            >
              Abrir {practice.tool.split("/")[0].trim()} ↗
            </a>
          )}
        </div>

        {associatedPrompt && (
          <div className="practice-card prompt-card">
            <small className="card-kicker">QUAL PROMPT VAMOS UTILIZAR?</small>
            <strong>Prompt 0{associatedPrompt.number}: {associatedPrompt.name}</strong>
            <div className="prompt-inline-actions">
              {onOpenPrompt && (
                <button
                  type="button"
                  className="button small"
                  onClick={() => onOpenPrompt(associatedPrompt.number - 1)}
                >
                  Ver prompt completo ↗
                </button>
              )}
              <Copy text={associatedPrompt.prompt} label="Copiar prompt" />
            </div>
          </div>
        )}

        <div className="practice-card materials-card">
          <small className="card-kicker">QUAIS MATERIAIS PRECISAMOS?</small>
          <ul className="practice-list">
            {practice.materials.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>

        <div className="practice-card action-card">
          <small className="card-kicker">QUAL AÇÃO VAMOS EXECUTAR?</small>
          <p>{practice.action}</p>
        </div>

        <div className="practice-card check-card">
          <small className="card-kicker">O QUE DEVEMOS CONFERIR?</small>
          <ul className="practice-checklist">
            {practice.checklist.map((item) => (
              <li key={item}>
                <span className="check-bullet">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="practice-footer-cta">
        <p className="practice-note">
          Esta tela permanece fixa durante o compartilhamento. Quando terminar a demonstração na ferramenta real, clique abaixo para checar o resultado com a turma.
        </p>
        <button type="button" className="button primary" onClick={onProceedToReview}>
          Terminei a demonstração → Voltar à aula
        </button>
      </div>
    </div>
  );
}

interface ClassroomReturnPanelProps {
  questions: string[];
  checklist: string[];
  slideIndex: number;
  checksState: boolean[];
  onToggleCheck: (checkIndex: number) => void;
  onNextSlide: () => void;
  onBackToConcept: () => void;
  isLastSlide: boolean;
}

export function ClassroomReturnPanel({
  questions,
  checklist,
  checksState,
  onToggleCheck,
  onNextSlide,
  onBackToConcept,
  isLastSlide,
}: ClassroomReturnPanelProps) {
  const allChecked = checklist.length === 0 || checklist.every((_, i) => Boolean(checksState[i]));

  return (
    <div className="classroom-return-panel" aria-label="Retorno à aula e validação do resultado">
      <div className="return-header">
        <span className="return-tag">RETOMADA DA TURMA</span>
        <h2>Conseguiu o resultado?</h2>
        <p className="return-sub">
          Confira se a etapa foi cumprida antes de avançarmos para o próximo bloco.
        </p>
      </div>

      <div className="return-content">
        <div className="return-checks-section">
          <h3>Checklist da entrega desta etapa:</h3>
          <div className="return-checklist">
            {checklist.map((item, i) => {
              const isChecked = Boolean(checksState[i]);
              return (
                <label key={item} className={`return-check-item ${isChecked ? "checked" : ""}`}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleCheck(i)}
                  />
                  <span>{item}</span>
                </label>
              );
            })}
          </div>
        </div>

        {questions.length > 0 && (
          <div className="return-questions-section">
            <h3>Perguntas de validação:</h3>
            <ul className="return-questions-list">
              {questions.map((q) => (
                <li key={q}>
                  <span className="q-mark">?</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="return-actions">
        <button type="button" className="button" onClick={onBackToConcept}>
          ↶ Revisar conceito no slide
        </button>

        <button
          type="button"
          className={`button ${allChecked ? "primary" : ""}`}
          onClick={onNextSlide}
        >
          {isLastSlide ? "Concluir treinamento ↗" : allChecked ? "Etapa cumprida! Próximo slide →" : "Avançar mesmo assim →"}
        </button>
      </div>
    </div>
  );
}
