import React, { useState, useEffect } from "react";
import { IconCompass, IconCheckCircle } from "./Icons";

export interface TourStep {
  tab: string;
  target?: string;
  title: string;
  text: string;
  tip?: string;
}

export interface TourModule {
  id: string;
  number: string;
  title: string;
  description: string;
  tab: string;
  steps: TourStep[];
}

export const ONBOARDING_MODULES: TourModule[] = [
  {
    id: "m1-demandas",
    number: "01",
    title: "Minhas Demandas & Rotina Diária",
    description: "Como gerenciar prazos, checklists de execução e priorizar o dia.",
    tab: "minhas-tarefas",
    steps: [
      {
        tab: "minhas-tarefas",
        target: "[data-tour='counters-demandas']",
        title: "Visão Geral das Demandas",
        text: "Aqui fica o seu cockpit de execução diária. Você acompanha demandas atrasadas, tarefas para hoje e o que vence nos próximos 7 dias.",
        tip: "Mantenha as demandas sempre atualizadas marcando o checkbox de conclusão à medida que finaliza.",
      },
      {
        tab: "minhas-tarefas",
        target: "[data-tour='btn-nova-demanda']",
        title: "Criando uma Nova Demanda",
        text: "Clique em '+ Nova demanda' para vincular um prazo, checklist e prioridade (Alta, Média ou Baixa) a um cliente específico.",
      },
      {
        tab: "minhas-tarefas",
        target: "[data-tour='filtro-prioridades']",
        title: "Filtros de Foco",
        text: "Use as abas de filtro (Todas, Urgentes, Alta, Média) para separar as tarefas críticas antes de abrir qualquer rede social.",
      },
    ],
  },
  {
    id: "m2-clientes",
    number: "02",
    title: "Cadastro & Gestão de Clientes",
    description: "Organização por Ativos, Avulsos, Ex-Clientes e honorários mensais.",
    tab: "clientes",
    steps: [
      {
        tab: "clientes",
        target: "[data-tour='btn-novo-cliente']",
        title: "Cadastrando uma Marca",
        text: "Clique em '+ Novo Cliente' para inserir o nome, segmento, categoria e honorário mensal. Cada cliente ganha uma cor de identificação no calendário.",
      },
      {
        tab: "clientes",
        target: "[data-tour='clientes-lista']",
        title: "Categorias de Clientes",
        text: "Clientes são divididos entre Ativos (recorrentes), Avulsos (projetos pontuais) e Ex-clientes arquivados. Você pode filtrar a lista a qualquer momento.",
      },
    ],
  },
  {
    id: "m3-ficha-marca",
    number: "03",
    title: "Ficha Estratégica da Marca & Briefing",
    description: "Propósito, produtos estrela, tom de voz e restrições para a IA.",
    tab: "clientes",
    steps: [
      {
        tab: "clientes",
        target: "[data-tour='ficha-estrategica']",
        title: "O Cérebro da Marca",
        text: "Selecione um cliente para abrir a Ficha Estratégica. Preencha o Propósito, a Oferta e os Produtos Estrela. Quanto mais rica a ficha, mais personalizado será o conteúdo gerado pela IA.",
        tip: "Cole aqui transcrições de reuniões de alinhamento com o cliente.",
      },
      {
        tab: "clientes",
        target: "[data-tour='ficha-restricoes']",
        title: "Restrições Inegociáveis & Tom de Voz",
        text: "Defina termos proibidos e postura que a marca NUNCA assume. O motor de IA respeita essas barreiras em todos os roteiros e posts gerados.",
      },
    ],
  },
  {
    id: "m5-calendario",
    number: "04",
    title: "Calendário Editorial & Grade Mensal",
    description: "Planejamento mensal de publicações, agendamentos e status.",
    tab: "calendario",
    steps: [
      {
        tab: "calendario",
        target: "[data-tour='calendario-grid']",
        title: "Visão Mensal em Grade",
        text: "A grade distribui os posts e Reels ao longo do mês. Cada peça mostra formato (CAR, REEL ou POST) e cor correspondente da marca.",
      },
      {
        tab: "calendario",
        target: "[data-tour='calendario-novo']",
        title: "Agendando uma Publicação",
        text: "Clique em qualquer dia do mês ou em '+ Nova Publicação' para definir canal (Instagram, TikTok), data, horário e anexar os slides e legenda.",
      },
    ],
  },
  {
    id: "m6-portal-cliente",
    number: "05",
    title: "Portal de Aprovação por Link Seguro",
    description: "Zero fricção para o cliente: aprovação e ajustes em 1 clique sem senha.",
    tab: "calendario",
    steps: [
      {
        tab: "calendario",
        target: "[data-tour='portal-link-btn']",
        title: "Gerando o Link do Portal",
        text: "Dentro do modal da publicação ou na ficha do cliente, clique em 'Gerar link do portal'. Esse link único e seguro permite que o cliente visualize as peças do mês.",
        tip: "O cliente não precisa criar conta nem lembrar senhas: abre no navegador do celular ou computador.",
      },
      {
        tab: "calendario",
        title: "Aprovação em Tempo Real",
        text: "Quando o cliente clica em 'Aprovar Conteúdo' ou 'Solicitar Ajustes', o status atualiza imediatamente no seu painel operacional.",
      },
    ],
  },
  {
    id: "m7-redes",
    number: "06",
    title: "Redes Sociais & Conexões Automáticas",
    description: "Integração oficial de Instagram, TikTok e backup no Google Drive.",
    tab: "redes-sociais",
    steps: [
      {
        tab: "redes-sociais",
        target: "[data-tour='redes-cards']",
        title: "Canais Conectados",
        text: "Aqui você conecta as contas de Instagram Graph API, TikTok for Business e Meta for Agencies para agendamento e publicação direta.",
      },
      {
        tab: "redes-sociais",
        target: "[data-tour='drive-card']",
        title: "Backup Automático no Google Drive",
        text: "Conecte sua conta do Google Drive para que todas as peças aprovadas e arquivos finais sejam salvos e organizados por pastas de cliente.",
      },
    ],
  },
  {
    id: "m8-vendas",
    number: "07",
    title: "Pipeline Comercial & Vendas",
    description: "Funil de prospecção, qualificação, propostas e novos contratos.",
    tab: "vendas",
    steps: [
      {
        tab: "vendas",
        target: "[data-tour='vendas-kanban']",
        title: "Funil de Oportunidades",
        text: "Arraste os cards entre as etapas: Novo Lead → Qualificado → Reunião → Proposta → Fechado. Acompanhe o valor mensal previsto em cada etapa.",
      },
      {
        tab: "vendas",
        target: "[data-tour='btn-nova-opp']",
        title: "Cadastrando uma Oportunidade",
        text: "Registre o nome do prospect, valor de mensalidade estimado e defina o próximo passo de contato para nunca perder um follow-up.",
      },
    ],
  },
  {
    id: "m10-financeiro",
    number: "08",
    title: "Controle Financeiro da Agência",
    description: "Mensalidades recorrentes (MRR), projeção anual e entradas/saídas.",
    tab: "financeiro",
    steps: [
      {
        tab: "financeiro",
        target: "[data-tour='fin-counters']",
        title: "Métricas de Receita",
        text: "O painel calcula automaticamente sua Receita Recorrente Mensal (MRR), Ticket Médio por cliente ativo e Projeção Anual (ARR).",
      },
      {
        tab: "financeiro",
        target: "[data-tour='btn-novo-lancamento']",
        title: "Lançamentos e Mensalidades",
        text: "Registre cobranças pagas ou pendentes para ter previsão clara de fluxo de caixa e margem de lucro do estúdio.",
      },
    ],
  },
  {
    id: "m11-formularios",
    number: "09",
    title: "Formulários de Onboarding & Briefings",
    description: "Questionários prontos para enviar a novos clientes.",
    tab: "formularios",
    steps: [
      {
        tab: "formularios",
        target: "[data-tour='form-templates']",
        title: "Modelos Canônicos",
        text: "Modelos pré-estruturados de Onboarding do Head de Conteúdo com perguntas de identidade, limites da marca e objetivos estratégicos.",
      },
      {
        tab: "formularios",
        target: "[data-tour='btn-copiar-form']",
        title: "Envio ao Cliente",
        text: "Copie o link direto de envio para compartilhar com seu cliente logo após fechar o contrato.",
      },
    ],
  },
];

interface Props {
  activeTab: string;
  onNavigate: (tab: string) => void;
  onOpenNewClientModal?: () => void;
}

export const OnboardingGuide: React.FC<Props> = ({ onNavigate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<TourModule | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [completedModules, setCompletedModules] = useState<string[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Carrega progresso do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("gabinete_onboarding_progress");
      if (stored) {
        setCompletedModules(JSON.parse(stored));
      }
      const bDismissed = localStorage.getItem("gabinete_onboarding_banner_dismissed");
      if (bDismissed === "true") {
        setBannerDismissed(true);
      }
    } catch {}
  }, []);

  const saveProgress = (newCompleted: string[]) => {
    setCompletedModules(newCompleted);
    try {
      localStorage.setItem("gabinete_onboarding_progress", JSON.stringify(newCompleted));
    } catch {}
  };

  const handleStartModule = (mod: TourModule) => {
    setActiveModule(mod);
    setStepIndex(0);
    setIsModalOpen(false);
    onNavigate(mod.steps[0].tab);
  };

  const handleNextStep = () => {
    if (!activeModule) return;
    if (stepIndex < activeModule.steps.length - 1) {
      const nextIdx = stepIndex + 1;
      setStepIndex(nextIdx);
      onNavigate(activeModule.steps[nextIdx].tab);
    } else {
      // Concluiu o módulo
      if (!completedModules.includes(activeModule.id)) {
        const nextCompleted = [...completedModules, activeModule.id];
        saveProgress(nextCompleted);
      }
      setActiveModule(null);
      setStepIndex(0);
      setIsModalOpen(true);
    }
  };

  const handlePrevStep = () => {
    if (!activeModule) return;
    if (stepIndex > 0) {
      const prevIdx = stepIndex - 1;
      setStepIndex(prevIdx);
      onNavigate(activeModule.steps[prevIdx].tab);
    }
  };

  const handleCloseActiveTour = () => {
    setActiveModule(null);
    setStepIndex(0);
  };

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    try {
      localStorage.setItem("gabinete_onboarding_banner_dismissed", "true");
    } catch {}
  };

  const completedCount = completedModules.length;
  const currentStep = activeModule ? activeModule.steps[stepIndex] : null;

  return (
    <>
      {/* Banner de Boas-Vindas Dismissível no Topo */}
      {!bannerDismissed && (
        <div
          style={{
            background: "linear-gradient(90deg, rgba(255,112,26,0.12) 0%, rgba(37,191,255,0.08) 100%)",
            borderBottom: "1px solid rgba(255,112,26,0.25)",
            padding: "9px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 12.5,
            color: "var(--mc-text-title)",
            position: "sticky",
            top: 0,
            zIndex: 40,
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "var(--mc-caramel)", display: "flex" }}>
              <IconCompass size={16} />
            </span>
            <span>
              <strong>Novo no Gabinete?</strong> Conheça todas as funcionalidades com o nosso guia interativo ou cadastre seus clientes.
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                background: "var(--mc-caramel)",
                color: "#101014",
                border: "none",
                fontWeight: 800,
                fontSize: 11.5,
                padding: "4px 12px",
                borderRadius: 999,
                cursor: "pointer",
              }}
            >
              Abrir Me guie ({completedCount}/9) →
            </button>
            <button
              onClick={handleDismissBanner}
              style={{
                background: "none",
                border: "none",
                color: "var(--mc-text-muted)",
                cursor: "pointer",
                fontSize: 14,
                padding: "2px 4px",
              }}
              title="Dispensar aviso"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Botão Flutuante 'Me guie (9)' */}
      <button
        className="mc-floating-guide"
        onClick={() => setIsModalOpen(true)}
        title="Guia interativo de funcionalidades"
        style={{
          position: "fixed",
          bottom: 24,
          right: 88,
          zIndex: 80,
          background: "var(--mc-caramel)",
          color: "#101014",
          border: "none",
          borderRadius: 999,
          padding: "10px 18px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontWeight: 800,
          fontSize: 13,
          boxShadow: "0 8px 24px rgba(255, 112, 26, 0.35)",
          cursor: "pointer",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        <IconCompass size={17} />
        <span>Me guie ({completedCount}/9)</span>
      </button>

      {/* Card Flutuante de Passo Ativo do Tour */}
      {activeModule && currentStep && (
        <div
          style={{
            position: "fixed",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(560px, calc(100vw - 32px))",
            background: "var(--mc-ink-surface)",
            border: "1px solid var(--mc-caramel)",
            borderRadius: "var(--mc-radius-lg)",
            padding: "20px 24px",
            boxShadow: "0 16px 40px rgba(0,0,0,0.8), 0 0 24px rgba(255,112,26,0.25)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            animation: "fadeInUp 0.2s ease-out",
          }}
        >
          {/* Header do Passo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  background: "rgba(255, 112, 26, 0.2)",
                  color: "var(--mc-caramel)",
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                MÓDULO {activeModule.number} · PASSO {stepIndex + 1} DE {activeModule.steps.length}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mc-text-title)" }}>
                {activeModule.title}
              </span>
            </div>

            <button
              onClick={handleCloseActiveTour}
              style={{
                background: "none",
                border: "none",
                color: "var(--mc-text-muted)",
                cursor: "pointer",
                fontSize: 16,
              }}
              title="Fechar guia"
            >
              ✕
            </button>
          </div>

          {/* Conteúdo do Passo */}
          <div>
            <h4 style={{ margin: "0 0 6px 0", fontSize: 15, fontWeight: 700, color: "var(--mc-text-title)" }}>
              {currentStep.title}
            </h4>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--mc-text-body)" }}>
              {currentStep.text}
            </p>
            {currentStep.tip && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11.5,
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: "rgba(37,191,255,0.08)",
                  border: "1px solid rgba(37,191,255,0.25)",
                  color: "var(--mc-sky)",
                }}
              >
                <strong>Dica:</strong> {currentStep.tip}
              </div>
            )}
          </div>

          {/* Controles de Navegação */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
            <button
              className="mc-btn mc-btn--secondary"
              style={{ fontSize: 12, padding: "6px 14px" }}
              disabled={stepIndex === 0}
              onClick={handlePrevStep}
            >
              ← Anterior
            </button>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="mc-btn mc-btn--secondary"
                style={{ fontSize: 12, padding: "6px 12px" }}
                onClick={handleCloseActiveTour}
              >
                Sair do guia
              </button>
              <button
                className="mc-btn mc-btn--primary"
                style={{ fontSize: 12, padding: "6px 18px", fontWeight: 800 }}
                onClick={handleNextStep}
              >
                {stepIndex < activeModule.steps.length - 1 ? "Próximo Passo →" : "Concluir Guia ✓"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Central Completa Me Guie */}
      {isModalOpen && (
        <div className="mc-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="mc-modal"
            style={{ maxWidth: 720, maxHeight: "88vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mc-modal__header" style={{ paddingBottom: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <IconCompass size={22} color="var(--mc-caramel)" />
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                    Central Me Guie — Onboarding & Funcionalidades
                  </h2>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: 12.5, color: "var(--mc-text-muted)" }}>
                  Aprenda a operar o estúdio do zero ao avançado em 9 módulos práticos e interativos.
                </p>
              </div>

              <button
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 18 }}
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Barra de Progresso Geral */}
            <div style={{ padding: "0 24px 16px 24px", borderBottom: "1px solid var(--mc-ink-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span>Progresso do Onboarding</span>
                <strong style={{ color: "var(--mc-caramel)" }}>
                  {completedCount} de {ONBOARDING_MODULES.length} concluídos ({Math.round((completedCount / ONBOARDING_MODULES.length) * 100)}%)
                </strong>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${(completedCount / ONBOARDING_MODULES.length) * 100}%`,
                    background: "var(--mc-caramel)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            {/* Lista dos 9 Módulos */}
            <div
              className="mc-modal__body"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 20,
                maxHeight: "56vh",
                overflowY: "auto",
              }}
            >
              {ONBOARDING_MODULES.map((mod) => {
                const isCompleted = completedModules.includes(mod.id);

                return (
                  <div
                    key={mod.id}
                    onClick={() => handleStartModule(mod)}
                    style={{
                      background: isCompleted ? "rgba(42, 213, 135, 0.04)" : "var(--mc-ink)",
                      border: `1px solid ${isCompleted ? "rgba(42, 213, 135, 0.25)" : "var(--mc-ink-border)"}`,
                      borderRadius: "var(--mc-radius-md)",
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      cursor: "pointer",
                      transition: "border-color 0.15s ease, background 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--mc-caramel)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isCompleted ? "rgba(42, 213, 135, 0.25)" : "var(--mc-ink-border)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: isCompleted ? "var(--mc-mint)" : "var(--mc-caramel)",
                          width: 24,
                          textAlign: "center",
                        }}
                      >
                        {mod.number}
                      </span>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--mc-text-title)" }}>
                            {mod.title}
                          </h4>
                          {isCompleted && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                                fontSize: 10,
                                fontWeight: 800,
                                color: "var(--mc-mint)",
                              }}
                            >
                              <IconCheckCircle size={12} /> CONCLUÍDO
                            </span>
                          )}
                        </div>
                        <p style={{ margin: "3px 0 0 0", fontSize: 12, color: "var(--mc-text-muted)" }}>
                          {mod.description}
                        </p>
                      </div>
                    </div>

                    <button
                      className={`mc-btn ${isCompleted ? "mc-btn--secondary" : "mc-btn--primary"}`}
                      style={{ fontSize: 11.5, padding: "5px 12px", flexShrink: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartModule(mod);
                      }}
                    >
                      {isCompleted ? "Revisar" : "Iniciar →"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mc-modal__footer" style={{ justifyContent: "space-between" }}>
              <button
                className="mc-btn mc-btn--secondary"
                style={{ fontSize: 12 }}
                onClick={() => {
                  if (confirm("Deseja resetar o progresso do onboarding?")) {
                    saveProgress([]);
                  }
                }}
              >
                Resetar Progresso
              </button>
              <button className="mc-btn mc-btn--primary" style={{ fontSize: 12 }} onClick={() => setIsModalOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
