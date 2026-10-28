import { useEffect, useRef, useState, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import { MagneticButton } from "@caramelo/design-system";
import { finalChecks, lessons, sectionQuestions, sections, sectionTexts } from "./data";
import type { DemoValue, LabState, StudentBriefing } from "./model";
import { Choices, Copy, Hint, Range } from "./ui";
import "./anatomy-button.css";

export type SlideComponentProps = {
  index: number;
  lab: LabState;
  setLab: Dispatch<SetStateAction<LabState>>;
  demo: (key: string, value: DemoValue) => void;
  openPrompt: (n: number) => void;
  media: Record<string, string>;
  setMedia: Dispatch<SetStateAction<Record<string, string>>>;
  reduced: boolean;
};

function number(p: SlideComponentProps, key: string, fallback = 0, max = 100) {
  const v = p.lab.demo[key];
  return typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(-1, v)) : fallback;
}
function text(p: SlideComponentProps, key: string, fallback: string) {
  const v = p.lab.demo[key];
  return typeof v === "string" ? v : fallback;
}
function flag(p: SlideComponentProps, key: string) {
  return p.lab.demo[key] === true;
}

export function Experiences(p: SlideComponentProps) {
  switch (p.index) {
    // AULA 1 — ENTENDER UMA LP
    case 0:
      return <Slide01QuemSouEu {...p} />;
    case 1:
      return <Slide02ComoFuncionaLP {...p} />;
    case 2:
      return <Slide03Hierarquia {...p} />;
    case 3:
      return <Slide04EsqueletoWireframe {...p} />;

    // AULA 2 — ENTENDER CRIAÇÃO COM IA
    case 4:
      return <Slide05ComoIAEntende {...p} />;
    case 5:
      return <Slide06CorrigirIA {...p} />;
    case 6:
      return <Slide07ImagemReferencia {...p} />;
    case 7:
      return <Slide08ImagemParaVideo {...p} />;

    // AULA 3 — ENTENDER LP COM IA
    case 8:
      return <Slide09ConhecerOferta {...p} />;
    case 9:
      return <Slide10OrganizarCopy {...p} />;
    case 10:
      return <Slide11ConstruirHero {...p} />;
    case 11:
      return <Slide12IdentidadeVisual {...p} />;

    // AULA 4 — CRIANDO LP COM IA
    case 12:
      return <Slide13LPCompleta {...p} />;
    case 13:
      return <Slide14RevisarLP {...p} />;
    case 14:
      return <Slide15StudioParaVercel {...p} />;
    case 15:
      return <Slide16DominioEPublicacao {...p} />;

    default:
      return <div className="slide-fallback">Slide em preparação</div>;
  }
}

function BrowserTop({ label = "seu-projeto.com.br" }: { label?: string }) {
  return (
    <div className="browser-top">
      <span>● ● ●</span>
      <small>{label}</small>
      <span>↗</span>
    </div>
  );
}

function MiniLanding({
  messy = false,
  changed = false,
  variant = 0,
  count = 6,
  repeated = false,
}: {
  messy?: boolean;
  changed?: boolean;
  variant?: number;
  count?: number;
  repeated?: boolean;
}) {
  return (
    <div className={`mini-landing theme-${variant} ${messy ? "messy" : ""} ${changed ? "changed" : ""}`}>
      <BrowserTop />
      <div className="mini-hero">
        <small>ESTÚDIO DIREÇÃO</small>
        <strong>
          {messy
            ? "CRIAR. INOVAR. TRANSFORMAR. IMPACTAR."
            : changed
              ? "Ideias que revolucionam o mercado."
              : "Seu conteúdo precisa de direção."}
        </strong>
        <p>
          {messy
            ? "Sobre nós · Novidades · Produtos · Parceiros · Todos os serviços"
            : "Um plano de conteúdo que faz sentido para o seu negócio."}
        </p>
        <span className="fake-cta">{changed ? "Saiba mais" : "Quero meu plano"} ↗</span>
        <span className="mini-orbit">↗</span>
        {messy && (
          <>
            <span className="messy-tag">NOVIDADES!</span>
            <span className="messy-circle">OLÁ!</span>
            <span className="messy-bottom">Veja também ↗ &nbsp; Conheça ↗ &nbsp; Entre ↗</span>
          </>
        )}
      </div>
      {count > 1 && (
        <div className={`mini-sections ${repeated ? "repeat" : ""}`}>
          {sections.slice(1, count).map((s, i) => (
            <div className={`mini-section section-${i}`} key={s}>
              <small>{s}</small>
              <b>{sectionTexts[i + 1]}</b>
              <span className="wire-line" />
              <span className="wire-line short" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   SLIDE 01 — QUEM SOU EU E O QUE VAMOS CONSTRUIR
   ========================================================================== */
function Slide01QuemSouEu(p: SlideComponentProps) {
  const [showPathModal, setShowPathModal] = useState(false);
  const projectInput = p.lab.projectIdea || "";

  const handleProjectChange = (val: string) => {
    p.setLab((prev) => ({ ...prev, projectIdea: val }));
  };

  return (
    <div className="slide01-container">
      <div className="slide01-grid">
        {/* Coluna 1: Apresentação Pessoal & Propósito */}
        <div className="slide01-col bio-col">
          <div className="bio-author-header">
            <div className="bio-avatar-frame">
              <img
                src="/aula-head/eu.jpg"
                alt="Luiz · Um Cara Caramelo"
                className="bio-avatar-img"
              />
              <span className="bio-avatar-badge">Luiz</span>
            </div>

            <div className="bio-author-meta">
              <div className="card-kicker-badge">DIREÇÃO & CRIAÇÃO</div>
              <h2 className="bio-name">Luiz · Um Cara Caramelo</h2>
              <span className="bio-role">Criador do Laboratório de Interação</span>
            </div>
          </div>
          
          <p className="bio-quote">
            "Sou o criador do <strong>Um Cara Caramelo</strong>. Trabalho com criatividade, inteligência artificial, design, experiências digitais e estratégia de conteúdo."
          </p>
          
          <p className="bio-sub">
            "Tenho uma mania de tentar coisas que ainda não sei fazer. Aprendo experimentando, construindo e mostrando como."
          </p>

          <div className="bio-mission">
            <small>POR QUE ESTOU AQUI?</small>
            <p>
              Para ensinar você a assumir a <strong>direção</strong>: a IA executa, mas o olhar estratégico e a decisão são sempre seus.
            </p>
          </div>

          <div className="bio-roadmap-action">
            <button
              type="button"
              className="button primary small"
              onClick={() => setShowPathModal(true)}
            >
              VER O CAMINHO (4 AULAS) ↗
            </button>
            <small>Descubra a entrega de cada etapa</small>
          </div>
        </div>

        {/* Coluna 2: Alinhamento de Expectativas & Primeira Prática */}
        <div className="slide01-col expect-col">
          <div className="expect-box">
            <div className="card-kicker-badge">ALINHAMENTO</div>
            <h3>O que você vai — e não vai — aprender aqui</h3>

            <div className="expect-columns">
              <div className="expect-list will">
                <span className="list-title">✓ VAMOS:</span>
                <ul>
                  <li>Entender a mecânica de uma LP que converte</li>
                  <li>Aprender a usar IA para criar interfaces</li>
                  <li>Utilizar prompts profissionais testados</li>
                  <li>Construir uma LP própria do zero</li>
                  <li>Publicar o projeto na Vercel com domínio</li>
                </ul>
              </div>

              <div className="expect-list wont">
                <span className="list-title">✕ NÃO VAMOS:</span>
                <ul>
                  <li>Fazer um curso cansativo de programação</li>
                  <li>Dominar todas as ferramentas de IA</li>
                  <li>Aprender desenvolvimento web avançado</li>
                  <li>Construir sistemas complexos de dados</li>
                  <li>Garantir vendas apenas pela publicação</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Primeira Prática Integrada */}
          <div className="starter-box">
            <div className="starter-header">
              <span className="card-kicker-badge">PRIMEIRA PRÁTICA</span>
              <label htmlFor="student-project-input">
                Qual projeto você gostaria de transformar em uma Landing Page?
              </label>
            </div>

            <div className="starter-input-row">
              <input
                id="student-project-input"
                type="text"
                placeholder="Ex: Minha mentoria de estratégia de conteúdo para criadores autônomos"
                value={projectInput}
                onChange={(e) => handleProjectChange(e.target.value)}
              />
              {projectInput && (
                <Copy text={projectInput} label="Copiar" />
              )}
            </div>
            <small className="starter-tip">
              Sua resposta fica salva no navegador e abastecerá os próximos exercícios.
            </small>
          </div>
        </div>
      </div>

      {/* Modal do Caminho das 4 Aulas */}
      {showPathModal && (
        <div className="roadmap-overlay" onClick={() => setShowPathModal(false)}>
          <div className="roadmap-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="roadmap-modal-header">
              <div>
                <span className="card-kicker-badge">JORNADA COMPLETA</span>
                <h2>As quatro aulas conectadas</h2>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowPathModal(false)}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="roadmap-grid-modal">
              {lessons.map((lesson, idx) => (
                <div
                  className="roadmap-card-item"
                  key={lesson.name}
                  style={{ "--step-accent": lesson.color } as CSSProperties}
                >
                  <div className="card-step-badge">AULA 0{idx + 1}</div>
                  <strong>{lesson.name}</strong>
                  <p className="card-step-q">{lesson.question}</p>
                  <div className="card-step-deliver">
                    <small>ENTREGA REAL:</small>
                    <span>{lesson.result}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="button primary"
              style={{ marginTop: "16px", alignSelf: "flex-end" }}
              onClick={() => setShowPathModal(false)}
            >
              Entendido! Fechar percurso →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   SLIDE 02 — COMO FUNCIONA UMA LANDING PAGE?
   ========================================================================== */
function Slide02ComoFuncionaLP(p: SlideComponentProps) {
  const selected = number(p, "anatomy", -1, 5);
  const heroButton = useRef<HTMLButtonElement>(null);
  const goal = p.lab.conversionGoal || "contato";

  const handleGoal = (g: string) => {
    p.setLab((prev) => ({ ...prev, conversionGoal: g }));
    p.demo("conversionGoal", g);
  };

  return (
    <div className={`anatomy ${selected >= 0 ? "zoomed" : ""}`}>
      <div className="page-map">
        <div className="map-browser">
          <BrowserTop />
          {sections.map((name, i) => (
            <button
              className={`map-section map-${i} ${selected === i ? "current" : ""}`}
              key={name}
              ref={i === 0 ? heroButton : undefined}
              aria-pressed={selected === i}
              onClick={() => p.demo("anatomy", i)}
            >
              <span>0{i + 1}</span>
              <strong>{name}</strong>
              <small>{sectionQuestions[i]}</small>
            </button>
          ))}
        </div>
        <button className="text-button" onClick={() => p.demo("anatomy", -1)}>
          ↶ Ver LP inteira
        </button>
      </div>

      <div className="decision-track">
        <span style={{ height: `${selected < 0 ? 0 : ((selected + 1) / 6) * 100}%` }} />
      </div>

      <div className="section-focus" key={selected}>
        {selected < 0 ? (
          <>
            <span className="eyebrow">VISÃO GERAL DA ANATOMIA</span>
            <h2>
              Uma conversa.<br />
              <em>Seis perguntas essenciais.</em>
            </h2>
            <p>
              O visitante chega sem conhecer sua oferta. Cada bloco responde a uma dúvida psicológica que ele tem antes de tomar uma decisão.
            </p>
            <MagneticButton
              className="anatomy-explore"
              variant="accent"
              size="lg"
              fill
              swap={!p.reduced}
              magnetic={!p.reduced}
              aria-label="Clique em uma seção: explorar Hero"
              onClick={() => {
                p.demo("anatomy", 0);
                heroButton.current?.focus();
              }}
            >
              clique em uma seção ←
            </MagneticButton>

            <div className="goal-picker-box">
              <span className="eyebrow">PRÁTICA DA SUA LP</span>
              <small>Qual será a ação principal da sua página?</small>
              <div className="goal-options">
                {[
                  { id: "contato", label: "Contato no WhatsApp" },
                  { id: "agendamento", label: "Agendamento de Sessão" },
                  { id: "inscricao", label: "Inscrição em Lista/Evento" },
                  { id: "compra", label: "Compra Direta" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`goal-btn ${goal === item.id ? "active" : ""}`}
                    onClick={() => handleGoal(item.id)}
                  >
                    {goal === item.id ? "✓ " : ""}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <span className="eyebrow">
              0{selected + 1} / {sections[selected]}
            </span>
            <h2>{sectionQuestions[selected]}</h2>
            <div className={`section-detail detail-${selected}`}>
              <small>{sections[selected]}</small>
              <strong>{sectionTexts[selected]}</strong>
              {selected === 3 ? (
                <div className="delivery-chips">
                  <span>Diagnóstico</span>
                  <span>Plano</span>
                  <span>Acompanhamento</span>
                </div>
              ) : selected === 4 ? (
                <div className="process-line">
                  <span>01 Conversar</span>
                  <i>→</i>
                  <span>02 Planejar</span>
                  <i>→</i>
                  <span>03 Construir</span>
                </div>
              ) : (
                <p>
                  {[
                    "Diga com clareza o que oferece, para quem e qual é o próximo passo.",
                    "Nomeie uma dificuldade real que a pessoa reconhece de imediato.",
                    "Apresente seu mecanismo exclusivo que soluciona o problema.",
                    "",
                    "",
                    "Convide para a ação principal definida para o seu projeto.",
                  ][selected]}
                </p>
              )}
            </div>
            <button
              className="button"
              onClick={() => p.demo("anatomy", selected === 5 ? -1 : selected + 1)}
            >
              {selected === 5 ? "Voltar à visão geral" : `Explorar ${sections[selected + 1]} →`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   SLIDE 03 — HIERARQUIA DA INFORMAÇÃO
   ========================================================================== */
const hierarchyCards = [
  "Quem somos",
  "Qual problema resolvemos",
  "O que oferecemos",
  "Como funciona",
  "Por que confiar",
  "Como começar",
];

function Slide03Hierarquia(p: SlideComponentProps) {
  const saved = p.lab.demo.order;
  const order =
    Array.isArray(saved) &&
    saved.length === 6 &&
    new Set(saved).size === 6 &&
    saved.every((n) => Number.isInteger(n) && n >= 0 && n < 6)
      ? saved
      : [0, 4, 3, 5, 1, 2];

  function move(from: number, to: number) {
    if (to < 0 || to > 5 || from < 0 || from > 5) return;
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    p.demo("order", next);
    p.demo("order-feedback", false);
  }

  const showCompare = flag(p, "hierarchy-compare");

  return (
    <div className="hierarchy">
      <div className="hierarchy-comparison-toggle">
        <button
          type="button"
          className={`button ${showCompare ? "primary" : ""}`}
          onClick={() => p.demo("hierarchy-compare", !showCompare)}
        >
          {showCompare ? "Ocultar comparação Exemplo A vs B" : "Comparar Exemplo A (Caos) vs Exemplo B (Ordem)"} ↗
        </button>
      </div>

      {showCompare && (
        <div className="compare-pages" style={{ marginBottom: "20px" }}>
          <div className="page-choice">
            <span className="eyebrow">EXEMPLO A · DESORGANIZADO</span>
            <MiniLanding messy count={4} />
            <small>Informações soltas sem condução de pensamento.</small>
          </div>
          <div className="page-choice chosen">
            <span className="eyebrow">EXEMPLO B · PROGRESSÃO COM INTENÇÃO</span>
            <MiniLanding count={4} />
            <small>Oferta clara → Problema reconhecido → Solução → Ação.</small>
          </div>
        </div>
      )}

      <div className="order-grid">
        {order.map((card, position) => (
          <div
            className="order-card"
            key={card}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", String(position))}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const value = e.dataTransfer.getData("text/plain");
              if (/^[0-5]$/.test(value)) move(Number(value), position);
            }}
          >
            <span className="eyebrow">
              0{position + 1} <span>⠿</span>
            </span>
            <strong>{hierarchyCards[card]}</strong>
            <div>
              <button
                aria-label={`Mover ${hierarchyCards[card]} para antes`}
                disabled={position === 0}
                onClick={() => move(position, position - 1)}
              >
                ←
              </button>
              <button
                aria-label={`Mover ${hierarchyCards[card]} para depois`}
                disabled={position === 5}
                onClick={() => move(position, position + 1)}
              >
                →
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="order-feedback">
        <button
          className="button primary"
          onClick={() => p.demo("order-feedback", !flag(p, "order-feedback"))}
        >
          {flag(p, "order-feedback") ? "Ocultar recomendação" : "Comparar com a sequência recomendada"} ↗
        </button>
        {flag(p, "order-feedback") ? (
          <Hint>
            Uma ordem consagrada: Oferta (Hero) → Problema → Solução → Entregas → Processo → CTA.
            Não existe ordem mágica universal: a melhor hierarquia depende da familiaridade do seu público com a solução.
          </Hint>
        ) : (
          <p className="small">
            Arraste os cards para definir a ordem narrativa da sua própria Landing Page.
          </p>
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   SLIDE 04 — MONTANDO O ESQUELETO DA MINHA LP
   ========================================================================== */
function Slide04EsqueletoWireframe(p: SlideComponentProps) {
  const briefing: StudentBriefing = p.lab.briefing;

  const updateField = (field: keyof StudentBriefing, value: string) => {
    p.setLab((prev) => ({
      ...prev,
      briefing: { ...prev.briefing, [field]: value },
    }));
  };

  const formattedBriefing = `BRIEFING INICIAL DA LANDING PAGE
Projeto / Ideia: ${p.lab.projectIdea || briefing.offer}

1. O QUE OFEREÇO:
${briefing.offer}

2. PARA QUEM:
${briefing.audience}

3. PROBLEMA QUE RESOLVE:
${briefing.problem}

4. SOLUÇÃO / MECANISMO:
${briefing.solution}

5. ENTREGAS CONCRETAS:
${briefing.deliverables}

6. PRÓXIMO PASSO (AÇÃO PRINCIPAL):
${briefing.nextStep}
`;

  return (
    <div className="wireframe-builder-layout">
      {/* Coluna Esquerda: Formulário de Wireframe */}
      <div className="wireframe-form">
        <div className="form-header">
          <span className="eyebrow">ESTRUTURAÇÃO DO BRIEFING</span>
          <h3>Preencha o esqueleto da sua oferta</h3>
        </div>

        <div className="fields-grid">
          <label>
            <span>01 · O QUE OFEREÇO</span>
            <input
              type="text"
              value={briefing.offer}
              onChange={(e) => updateField("offer", e.target.value)}
              placeholder="Ex: Consultoria e Direção de Conteúdo"
            />
          </label>

          <label>
            <span>02 · PARA QUEM</span>
            <input
              type="text"
              value={briefing.audience}
              onChange={(e) => updateField("audience", e.target.value)}
              placeholder="Ex: Profissionais autônomos e fundadores"
            />
          </label>

          <label>
            <span>03 · PROBLEMA</span>
            <input
              type="text"
              value={briefing.problem}
              onChange={(e) => updateField("problem", e.target.value)}
              placeholder="Ex: Muitas ideias dispersas e nenhuma presença marcante"
            />
          </label>

          <label>
            <span>04 · SOLUÇÃO</span>
            <input
              type="text"
              value={briefing.solution}
              onChange={(e) => updateField("solution", e.target.value)}
              placeholder="Ex: Uma Landing Page imersiva com copy afiada"
            />
          </label>

          <label>
            <span>05 · ENTREGAS</span>
            <input
              type="text"
              value={briefing.deliverables}
              onChange={(e) => updateField("deliverables", e.target.value)}
              placeholder="Ex: Diagnóstico, copy, Hero animada e deploy"
            />
          </label>

          <label>
            <span>06 · PRÓXIMO PASSO (CTA)</span>
            <input
              type="text"
              value={briefing.nextStep}
              onChange={(e) => updateField("nextStep", e.target.value)}
              placeholder="Ex: Agendar conversa no WhatsApp"
            />
          </label>
        </div>

        <div className="wireframe-actions">
          <Copy text={formattedBriefing} label="COPIAR MEU BRIEFING" />
          <span className="small">
            Copie e guarde este texto: ele será o ponto de partida para a IA na Aula 2!
          </span>
        </div>
      </div>

      {/* Coluna Direita: Representação Visual do Wireframe */}
      <div className="wireframe-visual-preview">
        <BrowserTop label="preview-wireframe.local" />
        <div className="wireframe-scrollable-blocks">
          <div className="wf-block wf-hero">
            <span className="wf-tag">HERO</span>
            <strong>{briefing.offer || "Sua Oferta Principal"}</strong>
            <p>{briefing.audience || "Público-alvo definido"}</p>
            <span className="wf-cta-button">{briefing.nextStep || "Ação Principal"} ↗</span>
          </div>

          <div className="wf-block wf-problem">
            <span className="wf-tag">PROBLEMA</span>
            <p>{briefing.problem || "O problema que tira o sono do seu cliente."}</p>
          </div>

          <div className="wf-block wf-solution">
            <span className="wf-tag">SOLUÇÃO</span>
            <p>{briefing.solution || "O método ou mecanismo que resolve esse problema."}</p>
          </div>

          <div className="wf-block wf-deliverables">
            <span className="wf-tag">ENTREGAS</span>
            <p>{briefing.deliverables || "O que a pessoa recebe na prática."}</p>
          </div>

          <div className="wf-block wf-cta">
            <span className="wf-tag">CTA FINAL</span>
            <strong>{briefing.nextStep || "Próximo Passo"} ↗</strong>
          </div>
        </div>

        <div className="lesson1-conclusion-card">
          <small>ENTREGA DA AULA 1 CONCLUÍDA</small>
          <p>
            "Agora sabemos exatamente o que estamos construindo. Na próxima aula, vamos aprender a explicar isso para uma IA."
          </p>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   SLIDE 05 — COMO UMA IA ENTENDE NOSSOS PEDIDOS?
   ========================================================================== */
function Slide05ComoIAEntende(p: SlideComponentProps) {
  const [context, setContext] = useState(() =>
    p.lab.projectIdea
      ? `Sou o criador do projeto: ${p.lab.projectIdea}`
      : "Sou estrategista e criador."
  );
  const [goal, setGoal] = useState(() =>
    p.lab.briefing.offer
      ? `Criar a seção Hero para ${p.lab.briefing.offer}`
      : "Criar a seção Hero da minha nova Landing Page."
  );
  const [content, setContent] = useState(() =>
    p.lab.briefing.problem
      ? `Headline de alto impacto focada em: ${p.lab.briefing.problem}`
      : "Headline de alto impacto e botão de agendamento."
  );
  const [refs, setRefs] = useState("Estilo editorial, fundo escuro e tipografia pesada.");
  const [rules, setRules] = useState("Código sem dependências pesadas, HTML/React limpo.");

  const assembledPrompt = `Atue como um Desenvolvedor Frontend Sênior e Diretor de Arte.

CONTEXTO:
${context}

OBJETIVO:
${goal}

CONTEÚDO:
${content}

REFERÊNCIAS VISUAIS:
${refs}

REGRAS E LIMITES:
${rules}

Por favor, gere apenas o componente solicitado, preservando a semântica e a responsividade.`;

  return (
    <div className="prompt-builder-slide">
      <div className="prompt-comparison-top">
        <div className="prompt-case vague">
          <span className="case-badge">✕ PEDIDO VAGO</span>
          <code>"Faça um site bonito para meu serviço."</code>
          <p>Resultado genérico, clichê, código inchado e sem alinhamento com sua marca.</p>
        </div>

        <div className="prompt-case structured">
          <span className="case-badge">✓ PEDIDO CONTEXTUALIZADO (BRIEFING)</span>
          <code>"Atue como Dev Sênior. Crie a Hero para [meu serviço], com foco em [público], seguindo [regras]..."</code>
          <p>Resultado preciso, código limpo, identidade respeitada e fácil de ajustar.</p>
        </div>
      </div>

      <div className="prompt-interactive-builder">
        <div className="builder-inputs">
          <span className="eyebrow">CONSTRUTOR DE BRIEFING PARA IA</span>
          <label>
            <small>01 · CONTEXTO</small>
            <input value={context} onChange={(e) => setContext(e.target.value)} />
          </label>
          <label>
            <small>02 · OBJETIVO</small>
            <input value={goal} onChange={(e) => setGoal(e.target.value)} />
          </label>
          <label>
            <small>03 · CONTEÚDO</small>
            <input value={content} onChange={(e) => setContent(e.target.value)} />
          </label>
          <label>
            <small>04 · REFERÊNCIAS</small>
            <input value={refs} onChange={(e) => setRefs(e.target.value)} />
          </label>
          <label>
            <small>05 · REGRAS</small>
            <input value={rules} onChange={(e) => setRules(e.target.value)} />
          </label>
        </div>

        <div className="builder-preview">
          <div className="builder-preview-header">
            <span>PROMPT ESTRUTURADO GERADO</span>
            <Copy text={assembledPrompt} label="Copiar prompt" />
          </div>
          <pre className="assembled-code">{assembledPrompt}</pre>
          <p className="small">
            Copie este modelo e teste no Google AI Studio durante a demonstração!
          </p>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   SLIDE 06 — APRENDENDO A CORRIGIR A IA
   ========================================================================== */
function Slide06CorrigirIA(p: SlideComponentProps) {
  const selected = number(p, "lock-choice", -1, 1);

  return (
    <div className="locks-demo">
      <div className="lock-row">
        {["COPY APROVADA", "ESTRUTURA DE SEÇÕES", "DESIGN SYSTEM", "HERO PRONTA"].map((s) => (
          <span key={s}>
            ▣ {s} <b>LOCKED</b>
          </span>
        ))}
      </div>

      <div className="lock-context-box">
        <span className="eyebrow">SOLICITAÇÃO DE TESTE</span>
        <strong>"Quero alterar somente a cor do botão principal de ação para laranja."</strong>
      </div>

      <div className="lock-comparison">
        {[0, 1].map((i) => (
          <button
            key={i}
            className={`lock-option ${selected === i ? "selected" : ""}`}
            aria-pressed={selected === i}
            onClick={() => p.demo("lock-choice", i)}
          >
            <span className="eyebrow">{i === 0 ? "ALTERAÇÃO DESCONTROLADA" : "ALTERAÇÃO CONTROLADA"}</span>
            <div style={{ "--system-accent": "#FF701A" } as CSSProperties}>
              <MiniLanding changed={i === 0} count={1} />
            </div>
            <span className="small">
              {i === 0
                ? "A IA mudou a headline, apagou o subtítulo e desconfigurou o layout."
                : "A IA preservou tudo o que estava aprovado e mudou exatamente o botão."}
            </span>
            <strong>{selected === i ? "✓ Sua escolha" : "Escolher esta execução ↗"}</strong>
          </button>
        ))}
      </div>

      <div className="system-prompt-callout">
        <div className="sp-text">
          <span className="eyebrow">DIRETRIZ DE PRESERVAÇÃO</span>
          <h4>Regras de Preservação no AI Studio</h4>
          <p>
            Oriente a IA a operar respeitando o que já foi aprovado e alterando apenas o elemento solicitado sem reconstruir a tela.
          </p>
        </div>
      </div>

      <Hint>
        {selected < 0
          ? "Um pedido cirúrgico exige uma alteração proporcional. Clique nas opções acima para avaliar."
          : selected === 1
            ? "Exato. A instrução de LOCK protege o que está aprovado contra recriações acidentais da IA."
            : "Esta execução destruiu decisões anteriores. Use regras de preservação para evitar retrabalho."}
      </Hint>
    </div>
  );
}

/* ==========================================================================
   SLIDE 07 — CRIANDO UMA IMAGEM A PARTIR DE UMA REFERÊNCIA
   ========================================================================== */
function Portrait({ identity = false, isolated = false }: { identity?: boolean; isolated?: boolean }) {
  return (
    <svg
      viewBox="0 0 600 360"
      className="portrait"
      role="img"
      aria-label={isolated ? "Esquema de retrato de identidade" : `Esquema com ${identity ? "a segunda" : "a primeira"} identidade`}
    >
      <rect width="600" height="360" fill={isolated ? "#2a2a32" : "#1e1e24"} />
      {!isolated && (
        <>
          <path d="M0 80L260 0H600V170L0 280Z" fill="#2d3748" />
          <path d="M0 270L380 160L600 220V360H0Z" fill="#171923" />
          <circle cx="100" cy="85" r="43" fill="#ff701a" opacity="0.8" />
        </>
      )}
      <path d="M200 360Q210 230 310 230Q415 235 440 360" fill={isolated ? "#4a5568" : "#d69e2e"} />
      <path d="M279 213V257Q309 287 341 252V207" fill={identity ? "#c05621" : "#dd6b20"} />
      <ellipse cx="310" cy="160" rx={identity ? 65 : 57} ry="79" fill={identity ? "#c05621" : "#dd6b20"} />
      <circle cx="285" cy="161" r="5" fill="#1a202c" />
      <circle cx="334" cy="161" r="5" fill="#1a202c" />
      <path d="M302 170L297 192L312 194" fill="none" stroke="#7b341e" strokeWidth="4" />
      <path d="M288 214Q310 226 332 211" fill="none" stroke="#7b341e" strokeWidth="4" />
    </svg>
  );
}

function Slide07ImagemReferencia(p: SlideComponentProps) {
  const selected = number(p, "identity-control", 0, 1);
  const reveal = number(p, "identity-reveal", 50);
  const [error, setError] = useState("");

  function upload(file: File | undefined, key: string) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setError("Use uma imagem JPG, PNG ou WebP de até 8 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        p.setMedia((m) => ({ ...m, [key]: reader.result as string }));
        setError("");
      }
    };
    reader.onerror = () => setError("Não foi possível ler esta imagem.");
    reader.readAsDataURL(file);
  }

  const image = (key: string, identity = false, isolated = false) =>
    p.media[key] ? (
      <img
        src={p.media[key]}
        alt={key === "reference" ? "Sua referência visual" : key === "identity" ? "Seu retrato" : "Resultado"}
      />
    ) : (
      <Portrait identity={identity} isolated={isolated} />
    );

  return (
    <div className="identity-demo">
      <div className="identity-panes">
        <div>
          <span className="eyebrow">IMAGE 1 · CENA & ESTILO</span>
          <div className="identity-frame">{image("reference")}</div>
          <div className="pane-traits">
            <small>CONTROLA:</small>
            <span>Cenário · Composição · Luz · Enquadramento</span>
          </div>
          <label className="upload-label">
            Carregar referência de estilo
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => upload(e.target.files?.[0], "reference")} />
          </label>
        </div>

        <div>
          <span className="eyebrow">IMAGE 2 · IDENTIDADE FACIAL</span>
          <div className="identity-frame">{image("identity", true, true)}</div>
          <div className="pane-traits">
            <small>CONTROLA:</small>
            <span>Rosto · Expressão · Identidade pessoal</span>
          </div>
          <label className="upload-label">
            Carregar foto de identidade
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => upload(e.target.files?.[0], "identity")} />
          </label>
        </div>

        <div>
          <span className="eyebrow">RESULTADO COMBINADO</span>
          <div className="identity-frame result">
            <div className="before-layer">{image("reference")}</div>
            <div className="after-layer" style={{ clipPath: `inset(0 ${100 - reveal}% 0 0)` }}>
              {image("result", true)}
            </div>
            <i style={{ left: `${reveal}%` }} />
          </div>
          <Range label="Deslize para comparar antes e depois" value={reveal} change={(n) => p.demo("identity-reveal", n)} />
          <button
            type="button"
            className="button small"
            style={{ marginTop: "10px" }}
            onClick={() => p.openPrompt(1)}
          >
            Ver Prompt 02: Reconstrução de Imagem ↗
          </button>
        </div>
      </div>

      <div className="identity-bottom">
        <Choices
          labels={["O que a IMAGE 1 controla", "O que a IMAGE 2 controla"]}
          selected={selected}
          onChange={(n) => p.demo("identity-control", n)}
        />
        <Hint>
          {selected === 0
            ? "IMAGE 1: Composição, pose, roupa, expressão, iluminação, paleta de cores e ângulo da câmera."
            : "IMAGE 2: Somente os traços faciais da pessoa. A cena cinematográfica vem 100% da IMAGE 1."}
        </Hint>
      </div>

      <p className="small" role="status">
        {error || "Importante: use suas próprias fotos ou retratos de pessoas com uso formalmente autorizado."}
      </p>
    </div>
  );
}

/* ==========================================================================
   SLIDE 08 — TRANSFORMANDO IMAGEM EM VÍDEO
   ========================================================================== */
function Slide08ImagemParaVideo(p: SlideComponentProps) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [error, setError] = useState("");
  const movement = number(p, "video-movement", 0, 2);

  useEffect(() => {
    if (p.reduced) {
      video.current?.pause();
      setPlaying(false);
    }
  }, [p.reduced]);

  const source = ["hero-directions-scrub.mp4", "hero-blue-scrub.mp4", "hero-star-scrub.mp4"][movement];

  async function play() {
    const v = video.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      try {
        await v.play();
        setPlaying(true);
        setError("");
      } catch {
        setError("Vídeo indisponível. Recarregue ou use a imagem estática.");
      }
    }
  }

  return (
    <div className="video-demo">
      <div className="video-comparison">
        <figure>
          <img
            src="/aula-head/hero-directions-poster.jpg"
            alt="Quadro de um cão caramelo em um cenário azul, referência estática da demonstração"
          />
          <figcaption>IMAGEM ESTÁTICA ORIGINAL</figcaption>
        </figure>

        <figure>
          <video
            key={source}
            ref={video}
            src={`/aula-head/${source}`}
            poster="/aula-head/hero-directions-poster.jpg"
            muted
            playsInline
            loop
            preload="none"
            onTimeUpdate={() => {
              const v = video.current;
              if (v && Number.isFinite(v.duration)) setTime((v.currentTime / v.duration) * 8);
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => setError("Não foi possível carregar o vídeo demonstrativo. A imagem continua disponível.")}
          />
          <figcaption>VÍDEO EM LOOP SUTIL (8s)</figcaption>
          <button className="video-play" onClick={play}>
            {playing ? "Ⅱ Pausar" : "▶ Reproduzir loop"}
          </button>
        </figure>
      </div>

      <div className="video-controls">
        <Choices
          labels={["Direção", "Variação azul", "Variação estrela"]}
          selected={movement}
          onChange={(n) => {
            video.current?.pause();
            setPlaying(false);
            setTime(0);
            p.demo("video-movement", n);
          }}
        />

        <Range
          label={`Examinar o loop na timeline · ${time.toFixed(1)}s / 8.0s`}
          max={800}
          value={time * 100}
          change={(n) => {
            const v = video.current;
            if (v && Number.isFinite(v.duration)) {
              v.pause();
              setPlaying(false);
              v.currentTime = (n / 800) * v.duration;
              setTime(n / 100);
            }
          }}
        />

        <div className="loop-ticks">
          {[0, 2, 4, 6, 8].map((n) => (
            <span key={n}>{n}s{n === 8 ? " ↶ 0s" : ""}</span>
          ))}
        </div>

        <div className="video-action-row">
          <button
            type="button"
            className="button small"
            onClick={() => p.openPrompt(2)}
          >
            Ver Prompt 03: Image to Video ↗
          </button>
          <span className="small">
            Se a ferramenta de vídeo não estiver disponível ou exigir créditos extras, prossiga com a imagem estática: sua Landing Page continuará excelente!
          </span>
        </div>

        <Hint>
          {error || "Observe o ponto 8s ↶ 0s: um loop profissional conecta o final ao início sem corte perceptível."}
        </Hint>
      </div>
    </div>
  );
}

/* ==========================================================================
   SLIDE 09 — A IA PRECISA CONHECER NOSSA OFERTA
   ========================================================================== */
function Slide09ConhecerOferta(p: SlideComponentProps) {
  const selected = number(p, "copy-question", 0, 5);
  const briefing = p.lab.briefing;

  const questions = [
    { label: "01 · O que oferece?", val: briefing.offer, key: "offer" },
    { label: "02 · Para quem?", val: briefing.audience, key: "audience" },
    { label: "03 · Qual problema?", val: briefing.problem, key: "problem" },
    { label: "04 · Qual solução?", val: briefing.solution, key: "solution" },
    { label: "05 · O que entrega?", val: briefing.deliverables, key: "deliverables" },
    { label: "06 · Qual ação?", val: briefing.nextStep, key: "nextStep" },
  ];

  return (
    <div className="copy-flow">
      <Choices
        labels={["Oferta", "Público", "Problema", "Solução", "Entrega", "Ação"]}
        selected={selected}
        onChange={(n) => p.demo("copy-question", n)}
      />

      <div className="copy-process">
        <div className="copy-answer">
          <span className="eyebrow">RESPOSTA DO SEU BRIEFING</span>
          <h2>{questions[selected].label}</h2>
          <p className="briefing-reply">{questions[selected].val}</p>
          <small>
            A IA utiliza essa resposta exata para redigir a seção de{" "}
            <strong>{sections[selected]}</strong> da sua página.
          </small>
        </div>

        <div className="copy-engine">
          <span>ENTREVISTA</span>
          <b>→</b>
          <strong>IA (PROMPT 01)</strong>
          <b>→</b>
          <span>COPY FINAL</span>
        </div>

        <div className="copy-wire">
          <div className="wire-section-highlight">
            <span className="wf-badge">ALIMENTA O BLOCO:</span>
            <strong>{sections[selected]}</strong>
            <p className="sample-headline">
              {[
                "Headline de impacto imediato na Hero.",
                "Identificação da dor que o público enfrenta.",
                "Apresentação da solução e autoridade do método.",
                "Detalhamento dos pacotes ou entregáveis.",
                "Os passos simples do processo de trabalho.",
                "Chamada para ação direta no botão principal.",
              ][selected]}
            </p>
          </div>
        </div>
      </div>

      <div className="inline-actions">
        <button
          type="button"
          className="button primary"
          onClick={() => p.openPrompt(0)}
        >
          Ver Prompt 01 de Copy (Adaptável) ↗
        </button>
        <small>
          O prompt oficial funciona como um entrevistador metodológico. Responda pergunta por pergunta.
        </small>
      </div>
    </div>
  );
}

/* ==========================================================================
   SLIDE 10 — ORGANIZANDO A COPY NA LANDING PAGE
   ========================================================================== */
function Slide10OrganizarCopy(p: SlideComponentProps) {
  const [activeSec, setActiveSec] = useState(0);
  const bf = p.lab.briefing;

  const defaultCopies = [
    {
      title: bf.offer ? `${bf.offer} com direção e método.` : "Ideias pedem direção. A IA executa, você dirige.",
      body: bf.audience ? `Construa uma presença digital marcante para ${bf.audience}.` : "Construa uma presença digital marcante que transforma curiosos em clientes reais.",
      cta: bf.nextStep ? `${bf.nextStep} ↗` : "Quero meu projeto ↗",
    },
    {
      title: bf.problem ? `O gargalo: ${bf.problem}.` : "Muito conteúdo disperso. Nenhum resultado consistente.",
      body: "Você passa horas tentando programar e desenhar sem chegar a uma entrega profissional.",
      cta: "Entender o caminho",
    },
    {
      title: bf.solution ? `Nossa solução: ${bf.solution}.` : "Um método visual em 4 passos com inteligência artificial.",
      body: "Do briefing ao domínio próprio, colocamos sua Landing Page no ar sem precisar de programador.",
      cta: "Ver o processo",
    },
    {
      title: bf.deliverables ? `Entregas: ${bf.deliverables}.` : "Diagnóstico, copy persuasiva e código publicado.",
      body: "Você recebe o briefing validado, a Hero animada, Design System e a página completa na Vercel.",
      cta: "Garantir vaga",
    },
    {
      title: "01 Briefing → 02 IA → 03 Identidade → 04 Publicação.",
      body: "Um percurso simples e direto que respeita o seu tempo e eleva o nível da sua entrega.",
      cta: "Começar agora",
    },
    {
      title: "Pronto para colocar seu projeto na internet?",
      body: "Dê o primeiro passo hoje e veja sua ideia se transformar em uma experiência digital única.",
      cta: bf.nextStep ? `${bf.nextStep} ↗` : "Falar comigo ↗",
    },
  ];

  const current = defaultCopies[activeSec];
  const isTooLong = current.body.length > 140;

  return (
    <div className="copy-organizer-slide">
      <div className="organizer-sidebar">
        <span className="eyebrow">SEÇÕES DA LANDING PAGE</span>
        <div className="organizer-nav">
          {sections.map((s, i) => (
            <button
              key={s}
              type="button"
              className={`org-sec-btn ${activeSec === i ? "active" : ""}`}
              onClick={() => setActiveSec(i)}
            >
              <span>0{i + 1}</span>
              <strong>{s}</strong>
            </button>
          ))}
        </div>

        <div className="eval-criteria-card">
          <small>CRITÉRIOS DE AVALIAÇÃO DA COPY</small>
          <ul>
            <li><strong>Clareza:</strong> A oferta é óbvia em 3 segundos?</li>
            <li><strong>Relevância:</strong> Fala com o problema real do cliente?</li>
            <li><strong>Sequência:</strong> A ordem constrói confiança?</li>
            <li><strong>CTA:</strong> O botão tem um convite específico?</li>
          </ul>
        </div>
      </div>

      <div className="organizer-editor-preview">
        <div className="preview-top-row">
          <span className="eyebrow">BLOCOS DE COPY · SEÇÃO 0{activeSec + 1}: {sections[activeSec]}</span>
          {isTooLong && (
            <span className="warning-badge" role="alert">
              ⚠️ Alerta de Legibilidade: Texto longo. Em Landing Pages, respiro e síntese aumentam a conversão.
            </span>
          )}
        </div>

        <div className="copy-block-display">
          <div className="copy-field">
            <small>TÍTULO / HEADLINE</small>
            <h3>{current.title}</h3>
          </div>

          <div className="copy-field">
            <small>TEXTO DE APOIO / SUBHEADLINE</small>
            <p>{current.body}</p>
          </div>

          <div className="copy-field">
            <small>CHAMADA PARA AÇÃO (CTA)</small>
            <span className="copy-cta-badge">{current.cta}</span>
          </div>
        </div>

        <div className="organizer-footer-tip">
          <Hint>
            Nunca sacrifique a clareza pelo floreio. O leitor digital escaneia a página antes de ler.
          </Hint>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   SLIDE 11 — CONSTRUINDO NOSSA HERO COM IA
   ========================================================================== */
const heroElements = ["HEADLINE", "SUBHEADLINE", "CTA", "IMAGEM OU VÍDEO", "LOGO", "ELEMENTOS DE APOIO"];

function Slide11ConstruirHero(p: SlideComponentProps) {
  const selected = number(p, "hero-element", 0, 5);
  const clicked = flag(p, "hero-clicked");

  return (
    <div className="hero-demo">
      <div className="hero-live">
        <BrowserTop />
        <div className={`hero-preview highlight-${selected} ${selected === 3 && !p.reduced ? "animate-hero" : ""}`}>
          <button className="hero-logo" onClick={() => p.demo("hero-element", 4)}>
            SEU ESTÚDIO®
          </button>
          <span className="hero-bg" onClick={() => p.demo("hero-element", 3)} aria-hidden="true">
            ↗
          </span>
          <div className="hero-copy">
            <button className="hero-headline" onClick={() => p.demo("hero-element", 0)}>
              {text(p, "hero-headline", "Seu conteúdo precisa de direção.")}
            </button>
            <button className="hero-subline" onClick={() => p.demo("hero-element", 1)}>
              {text(p, "hero-subline", "Um plano claro para transformar suas ideias em conteúdo.")}
            </button>
            <button
              className="hero-cta"
              onClick={() => {
                p.demo("hero-element", 2);
                p.demo("hero-clicked", !clicked);
              }}
            >
              {text(p, "hero-cta", "Quero meu plano")} ↗
            </button>
          </div>
          {clicked && (
            <div className="cta-feedback" role="status">
              ✓ Este clique demonstra a ação principal. Na sua LP real, conecte o botão ao link do seu WhatsApp ou Checkout.
            </div>
          )}
        </div>
        <small className="demo-caption">HERO DEMONSTRATIVA · EDIÇÃO LOCAL</small>
      </div>

      <div className="hero-editor">
        <Choices labels={heroElements} selected={selected} onChange={(n) => p.demo("hero-element", n)} />
        <p className="element-purpose" key={selected}>
          {[
            "A promessa principal. Ajuda a pessoa a reconhecer a oferta em menos de 3 segundos.",
            "O contexto que torna a promessa concreta, crível e compreensível.",
            "O próximo passo imediato. O botão precisa de verbo e destino evidente.",
            "O elemento visual de maior magnetismo. Sustenta o clima sem competir com a leitura.",
            "Identifica quem está falando e estabelece reconhecimento de marca.",
            "Selos, tags ou apoios sutis que reforçam credibilidade sem sobrecarregar.",
          ][selected]}
        </p>

        {["headline", "subline", "cta"].map((key, i) => (
          <label key={key}>
            {["Headline", "Subheadline", "Texto do botão"][i]}
            <input
              value={text(p, `hero-${key}`, ["Seu conteúdo precisa de direção.", "Um plano claro para transformar suas ideias em conteúdo.", "Quero meu plano"][i])}
              onChange={(e) => p.demo(`hero-${key}`, e.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

/* ==========================================================================
   SLIDE 12 — CRIANDO UMA IDENTIDADE VISUAL
   ========================================================================== */
const systems = [
  {
    name: "Editorial Caramelo",
    color: "#FF701A",
    font: "Bowlby One SC, Anton, sans-serif",
    surface: "#101014",
    radius: "2px",
    space: "16px",
    description: "Contraste cinematográfico · tipografia de peso · botões retos · calor e atitude",
  },
  {
    name: "Digital Essencial",
    color: "#25BFFF",
    font: "Inter, sans-serif",
    surface: "#0e1726",
    radius: "16px",
    space: "24px",
    description: "Acento elétrico · legibilidade funcional · superfícies limpas · respiro amplo",
  },
  {
    name: "Impressione Ouro",
    color: "#FFD52A",
    font: "Georgia, serif",
    surface: "#16161a",
    radius: "0px",
    space: "20px",
    description: "Títulos serifados · acento ácido/dourado · estética editorial clássica",
  },
];

function Slide12IdentidadeVisual(p: SlideComponentProps) {
  const selected = number(p, "system", 0, 2);
  const system = systems[selected];

  return (
    <div className="system-demo">
      <div className="system-rules">
        <Choices labels={systems.map((s) => s.name)} selected={selected} onChange={(n) => p.demo("system", n)} />

        <div className="system-flow">
          <span>MOODBOARD</span>
          <i>↓ EXTRAÇÃO</i>
          <strong>DESIGN SYSTEM</strong>
          <i>↓ APLICAÇÃO</i>
          <span>LANDING PAGE</span>
        </div>

        <div className="token-list">
          <p>
            <small>COR DE DESTAQUE</small>
            <b style={{ color: system.color }}>{system.color}</b>
          </p>
          <p>
            <small>TIPOGRAFIA</small>
            <b>{system.font.split(",")[0]}</b>
          </p>
          <p>
            <small>ESPAÇAMENTO</small>
            <b>{system.space}</b>
          </p>
          <p>
            <small>RAIO DO BOTÃO</small>
            <b>{system.radius}</b>
          </p>
        </div>

        <p className="small">{system.description}</p>

        <button
          type="button"
          className="button"
          style={{ marginTop: "12px" }}
          onClick={() => p.openPrompt(3)}
        >
          Ver Prompt 04: Moodboard → Design System ↗
        </button>
      </div>

      <div
        className="system-preview"
        style={
          {
            "--system-accent": system.color,
            "--system-font": system.font,
            "--system-surface": system.surface,
            "--system-radius": system.radius,
            "--system-space": system.space,
          } as CSSProperties
        }
      >
        <MiniLanding count={4} variant={selected} />
      </div>

      <Hint>
        A mesma copy e a mesma estrutura. O Design System define como ela é percebida visualmente sem mudar uma única palavra da mensagem.
      </Hint>
    </div>
  );
}

/* ==========================================================================
   SLIDE 13 — CONSTRUINDO A LANDING PAGE COMPLETA
   ========================================================================== */
function Slide13LPCompleta(p: SlideComponentProps) {
  const count = number(p, "expansion", 6, 6);
  const repeated = number(p, "composition", 1, 1) === 0;
  const [scroll, setScroll] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);

  return (
    <div className="expansion">
      <div className="expand-controls">
        <Choices
          labels={["Repetição (Monótono)", "Consistência (Rítmico)"]}
          selected={repeated ? 0 : 1}
          onChange={(n) => p.demo("composition", n)}
        />

        <div className="expansion-steps">
          {sections.map((s, i) => (
            <button
              key={s}
              className={i < count ? "selected" : ""}
              onClick={() => {
                p.demo("expansion", i + 1);
                setScroll(0);
                if (viewport.current) viewport.current.scrollTop = 0;
              }}
            >
              {i < count ? "✓" : "+"} {s}
            </button>
          ))}
        </div>

        <div className="expansion-guidance">
          <h4>Regra de Ouro do Scroll Vertical:</h4>
          <p>
            "A Hero de tela única foi o início. Agora, liberamos a rolagem vertical completa para conduzir o visitante por toda a jornada até a compra."
          </p>
        </div>

        <Hint>
          {repeated
            ? "Cuidado: repetir exatamente o mesmo bloco torna a leitura cansativa."
            : "Consistência: cores e fontes são as mesmas, mas cada seção tem um layout sob medida para sua função."}
        </Hint>
      </div>

      <div className="expand-page">
        <div className="page-scroll" ref={viewport}>
          <MiniLanding count={count} repeated={repeated} />
        </div>
        <Range
          label="Percorrer a Landing Page completa"
          value={scroll}
          change={(n) => {
            setScroll(n);
            const el = viewport.current;
            if (el) el.scrollTop = ((el.scrollHeight - el.clientHeight) * n) / 100;
          }}
        />
        <small>
          TODAS AS 6 SEÇÕES CONECTADAS · SCROLL VERTICAL ATIVO
        </small>
      </div>
    </div>
  );
}

/* ==========================================================================
   SLIDE 14 — REVISANDO E REFINANDO O PROJETO
   ========================================================================== */
function Slide14RevisarLP(p: SlideComponentProps) {
  const count = p.lab.checks.filter(Boolean).length;
  const mobile = number(p, "review-device", 0, 1) === 1;
  const complete = count >= finalChecks.length;

  return (
    <div className="review">
      <div className="device-review">
        <Choices labels={["Desktop", "Celular"]} selected={mobile ? 1 : 0} onChange={(n) => p.demo("review-device", n)} />
        <div className={`device-frame ${complete ? "complete" : mobile ? "mobile" : "desktop"}`}>
          {complete ? (
            <div className="final-signature" role="status">
              <span>ENTENDER ✓ · CRIAR COM IA ✓</span>
              <span>LP COM IA ✓ · PUBLICAR ✓</span>
              <strong>
                A IA EXECUTA.<br />
                <em>VOCÊ DIRIGE.</em>
              </strong>
              <small>Clareza, identidade e funcionamento aprovados.</small>
            </div>
          ) : (
            <MiniLanding count={4} />
          )}
        </div>
        <small>Visualização responsiva. Teste sua página real em ambos os formatos.</small>
      </div>

      <div className="final-checklist">
        <label className="progress-label">
          CHECKLIST DAS 9 VERIFICAÇÕES ESSENCIAIS · {count}/9
          <progress max={9} value={count} />
        </label>

        {finalChecks.map((label, i) => (
          <label className="checkbox" key={label}>
            <input
              type="checkbox"
              checked={Boolean(p.lab.checks[i])}
              onChange={() =>
                p.setLab((current) => ({
                  ...current,
                  checks: current.checks.map((v, j) => (j === i ? !v : v)),
                }))
              }
            />
            <span>{label}</span>
          </label>
        ))}

        <Hint>
          {count < 9
            ? "Marque somente após testar na sua página real. Se algo estiver desalinhado, corrija antes de publicar."
            : "Todos os 9 critérios verificados! Sua Landing Page está pronta para o deploy."}
        </Hint>
      </div>
    </div>
  );
}

/* ==========================================================================
   SLIDE 15 — DO GOOGLE AI STUDIO À VERCEL
   ========================================================================== */
function Slide15StudioParaVercel(_p: SlideComponentProps) {
  const [activePlatform, setActivePlatform] = useState(0);
  const [updateStep, setUpdateStep] = useState(0);

  const platformInfo = [
    {
      name: "Google AI Studio",
      role: "A OFICINA DE CÓDIGO",
      desc: "É onde você conversa com a IA, constrói os blocos, testa modificações e gera os arquivos da aplicação.",
      stepText: "Conecte sua conta do GitHub diretamente no AI Studio e vincule o repositório.",
      link: "https://aistudio.google.com/",
    },
    {
      name: "GitHub",
      role: "O HISTÓRICO & COFRE",
      desc: "Guarda todo o código-fonte e o registro de versões. Cada modificação salva gera um commit rastreável.",
      stepText: "Verifique se os arquivos sincronizados chegaram à branch principal (main).",
      link: "https://github.com/",
    },
    {
      name: "Vercel",
      role: "A HOSPEDAGEM GLOBAL",
      desc: "Conecta-se ao repositório do GitHub, compila os arquivos e distribui sua Landing Page mundialmente via CDN.",
      stepText: "Importe o repositório, confira o comando de build e clique em Deploy.",
      link: "https://vercel.com/",
    },
  ];

  return (
    <div className="deploy-pipeline-slide">
      {/* Grande Pipeline Animado */}
      <div className="big-pipeline-banner">
        {["GOOGLE AI STUDIO", "GITHUB", "VERCEL", "SITE ONLINE"].map((title, i) => (
          <div key={title} className={`pipeline-step ${activePlatform === i ? "active" : ""}`}>
            <span className="p-num">0{i + 1}</span>
            <strong>{title}</strong>
            {i < 3 && <i className="p-arrow">→</i>}
          </div>
        ))}
      </div>

      <div className="pipeline-content-split">
        {/* Painel da Plataforma Selecionada */}
        <div className="platform-cards-cluster">
          <Choices
            labels={["01 · Google AI Studio", "02 · GitHub", "03 · Vercel"]}
            selected={activePlatform}
            onChange={(n) => setActivePlatform(n)}
          />

          <div className="platform-detail-box">
            <span className="eyebrow">{platformInfo[activePlatform].role}</span>
            <h2>{platformInfo[activePlatform].name}</h2>
            <p className="platform-desc">{platformInfo[activePlatform].desc}</p>
            <div className="platform-task">
              <small>COMO EXECUTAR:</small>
              <p>{platformInfo[activePlatform].stepText}</p>
            </div>
            <a
              href={platformInfo[activePlatform].link}
              target="_blank"
              rel="noreferrer"
              className="button primary"
            >
              Abrir {platformInfo[activePlatform].name} ↗
            </a>
          </div>
        </div>

        {/* Simulador de Atualizações */}
        <div className="update-simulator-box">
          <div className="sim-header">
            <span className="eyebrow">COMO FUNCIONA DEPOIS DE PUBLICAR?</span>
            <h3>Simulador do Ciclo de Atualização</h3>
          </div>

          <ol className="sim-steps-list">
            {[
              "01. Você altera um texto ou cor no AI Studio",
              "02. Sincroniza com o GitHub com um clique",
              "03. A Vercel detecta a mudança e dispara novo deploy",
              "04. Em segundos, seu site no ar é atualizado!",
            ].map((step, idx) => (
              <li
                key={step}
                className={`sim-step-item ${updateStep >= idx ? "reached" : ""}`}
                onClick={() => setUpdateStep(idx)}
              >
                <span>{step}</span>
                {updateStep === idx && <b className="sim-indicator">ATIVO</b>}
              </li>
            ))}
          </ol>

          <div className="sim-controls">
            <button
              type="button"
              className="button"
              onClick={() => setUpdateStep((s) => (s < 3 ? s + 1 : 0))}
            >
              {updateStep < 3 ? "Avançar ciclo →" : "Reiniciar ciclo ↶"}
            </button>
            <small>
              Isso garante que você nunca mais dependa de programador para mudar um preço ou uma copy.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   SLIDE 16 — DOMÍNIO PRÓPRIO, PUBLICAÇÃO E PRÓXIMOS PASSOS
   (5 Estados Internos com transição fluida)
   ========================================================================== */
function Slide16DominioEPublicacao(p: SlideComponentProps) {
  const [subState, setSubState] = useState(0); // 0: Endereço, 1: Compra, 2: DNS, 3: Checklist, 4: Caramelo
  const [checkedDomain, setCheckedDomain] = useState([false, false, false, false, false]);

  const toggleCheck = (idx: number) => {
    setCheckedDomain((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  const domainSteps = [
    "01 · O Endereço",
    "02 · Comprando o Domínio",
    "03 · Conectando DNS",
    "04 · Checklist Final",
    "05 · Encerramento",
  ];

  return (
    <div className="slide16-multi-state-container">
      {/* Navegação interna entre os 5 estados */}
      <nav className="state-nav-bar" aria-label="Etapas da publicação final">
        {domainSteps.map((label, idx) => (
          <button
            key={label}
            type="button"
            className={`state-tab-btn ${subState === idx ? "active" : ""}`}
            onClick={() => setSubState(idx)}
            aria-selected={subState === idx}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="state-display-viewport">
        {/* ESTADO 1: O Endereço da minha LP */}
        {subState === 0 && (
          <div className="state-panel address-state">
            <span className="eyebrow">ESTADO 01 · IDENTIDADE DIGITAL</span>
            <h2>Seu site já está online. Agora vamos dar um endereço a ele.</h2>
            <p className="state-desc">
              O link padrão da Vercel é excelente para testes, mas um domínio próprio transmite autoridade imediata.
            </p>

            <div className="address-morph-card">
              <div className="addr-before">
                <small>ENDEREÇO TEMPORÁRIO (VERCEL)</small>
                <code>https://landing-page-aluno.vercel.app</code>
              </div>
              <div className="addr-arrow">↓ TRANSFORMAÇÃO ↓</div>
              <div className="addr-after">
                <small>SEU DOMÍNIO PRÓPRIO OFICIAL</small>
                <strong>
                  https://www.
                  {p.lab.projectIdea
                    ? p.lab.projectIdea
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^a-z0-9]/g, "-")
                        .replace(/-+/g, "-")
                        .slice(0, 24)
                    : "meuprojeto"}
                  .com.br
                </strong>
              </div>
            </div>

            <div className="state-actions">
              <button type="button" className="button primary" onClick={() => setSubState(1)}>
                Como comprar um domínio →
              </button>
            </div>
          </div>
        )}

        {/* ESTADO 2: Comprando um domínio */}
        {subState === 1 && (
          <div className="state-panel purchase-state">
            <span className="eyebrow">ESTADO 02 · ESCOLHENDO O DOMÍNIO</span>
            <h2>Onde e como registrar seu endereço</h2>
            <p className="state-desc">
              "O domínio é o endereço do seu site. A hospedagem é o serviço na nuvem (Vercel) que mantém as portas abertas."
            </p>

            <div className="registrars-comparison">
              <div className="reg-card">
                <span className="reg-tag">INTERNACIONAL (.COM / .CO / .IO)</span>
                <h3>Squarespace Domains</h3>
                <p>Busca rápida, renovação automática transparente e integração DNS simples.</p>
                <a
                  href="https://domains.squarespace.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="button small"
                >
                  Abrir Squarespace Domains ↗
                </a>
              </div>

              <div className="reg-card highlighted">
                <span className="reg-tag">BRASIL (.COM.BR / .NET.BR)</span>
                <h3>Registro.br</h3>
                <p>
                  <strong>Atenção para o Brasil:</strong> domínios .com.br não são vendidos no Squarespace. Registre diretamente no Registro.br (órgão oficial brasileiro).
                </p>
                <a
                  href="https://registro.br/"
                  target="_blank"
                  rel="noreferrer"
                  className="button primary small"
                >
                  Abrir Registro.br ↗
                </a>
              </div>
            </div>

            <div className="state-actions">
              <button type="button" className="button" onClick={() => setSubState(0)}>
                ← Voltar
              </button>
              <button type="button" className="button primary" onClick={() => setSubState(2)}>
                Próximo: Conectar DNS →
              </button>
            </div>
          </div>
        )}

        {/* ESTADO 3: Conectando domínio e hospedagem */}
        {subState === 2 && (
          <div className="state-panel dns-state">
            <span className="eyebrow">ESTADO 03 · CONFIGURAÇÃO DE DNS</span>
            <h2>Conectando seu domínio à Vercel</h2>

            <div className="dns-pipeline-flow">
              <span>REGISTRAR DOMÍNIO</span>
              <i>→</i>
              <strong>CONFIGURAR DNS</strong>
              <i>→</i>
              <span>VERCEL HOSPEDAGEM</span>
              <i>→</i>
              <strong>LANDING PAGE NO AR</strong>
            </div>

            <div className="dns-records-table">
              <div className="dns-row header">
                <span>Tipo de Registro</span>
                <span>Nome / Host</span>
                <span>Valor / Destino (Fornecido pela Vercel)</span>
              </div>
              <div className="dns-row">
                <b>A</b>
                <code>@ (raiz)</code>
                <code>76.76.21.21</code>
              </div>
              <div className="dns-row">
                <b>CNAME</b>
                <code>www</code>
                <code>cname.vercel-dns.com</code>
              </div>
            </div>

            <div className="dns-propagation-note">
              <small>TEMPO DE PROPAGAÇÃO:</small>
              <p>
                A propagação DNS pode levar de alguns minutos até algumas horas. A Vercel gerará o certificado de segurança HTTPS (cadeado verde) automaticamente assim que o DNS for reconhecido.
              </p>
            </div>

            <div className="state-actions">
              <button type="button" className="button" onClick={() => setSubState(1)}>
                ← Voltar
              </button>
              <button type="button" className="button primary" onClick={() => setSubState(3)}>
                Próximo: Checklist Final →
              </button>
            </div>
          </div>
        )}

        {/* ESTADO 4: Checklist final */}
        {subState === 3 && (
          <div className="state-panel checklist-state">
            <span className="eyebrow">ESTADO 04 · VALIDAÇÃO DA ENTREGA</span>
            <h2>Checklist final da publicação</h2>
            <p className="state-desc">
              Confirme cada um dos marcos reais conquistados na sua jornada:
            </p>

            <div className="milestones-checklist">
              {[
                "LANDING PAGE CONSTRUÍDA COM COPY E DESIGN",
                "CÓDIGO VERSIONADO NO GITHUB",
                "HOSPEDAGEM CONFIGURADA NA VERCEL",
                "DOMÍNIO PRÓPRIO CONECTADO",
                "CERTIFICADO HTTPS ATIVO E TESTADO NO CELULAR",
              ].map((label, idx) => (
                <label key={label} className={`milestone-item ${checkedDomain[idx] ? "checked" : ""}`}>
                  <input
                    type="checkbox"
                    checked={checkedDomain[idx]}
                    onChange={() => toggleCheck(idx)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="state-actions">
              <button type="button" className="button" onClick={() => setSubState(2)}>
                ← Voltar
              </button>
              <button type="button" className="button primary" onClick={() => setSubState(4)}>
                Concluir treinamento →
              </button>
            </div>
          </div>
        )}

        {/* ESTADO 5: Encerramento e Um Cara Caramelo */}
        {subState === 4 && (
          <div className="state-panel caramelo-closing-state">
            <div className="caramelo-brand-mark">
              <span className="brand-dot" />
              <strong>UM CARA CARAMELO</strong>
              <small>LABORATÓRIO DE INTERAÇÃO</small>
            </div>

            <h1 className="closing-headline">
              VOCÊ NÃO PRECISA SABER FAZER TUDO.<br />
              <em>PRECISA APRENDER A CONSTRUIR.</em>
            </h1>

            <p className="closing-sub">
              "Se em quatro aulas você conseguiu tirar uma ideia do papel e colocar uma Landing Page viva no ar, imagine o que mais podemos criar juntos."
            </p>

            <div className="closing-paths-grid">
              <div className="path-card learn">
                <span className="eyebrow">CAMINHO 01</span>
                <h3>Quero aprender mais</h3>
                <p>
                  Acesse nossos conteúdos, novos experimentos, workshops e a comunidade gratuita para mentes criativas.
                </p>
                <a
                  href="https://www.umcaracaramelo.com.br/"
                  target="_blank"
                  rel="noreferrer"
                  className="button"
                >
                  Conhecer o ecossistema ↗
                </a>
              </div>

              <div className="path-card hire">
                <span className="eyebrow">CAMINHO 02</span>
                <h3>Quero trabalhar com você</h3>
                <p>
                  Contrate o Laboratório de Interação para desenhar e construir seu site imersivo, produtos digitais e direção de conteúdo.
                </p>
                <a
                  href="https://www.umcaracaramelo.com.br/"
                  target="_blank"
                  rel="noreferrer"
                  className="button primary"
                >
                  Iniciar um projeto ↗
                </a>
              </div>
            </div>

            <div className="closing-quote-banner">
              <strong>A IA EXECUTA. VOCÊ DIRIGE.</strong>
              <span>HEAD ACADEMY × UM CARA CARAMELO · 2026</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
