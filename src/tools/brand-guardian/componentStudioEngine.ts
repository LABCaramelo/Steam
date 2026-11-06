// ==============================================================================
// Brand Guardian — Component Studio Engine (DaisyUI 5 / Tailwind Compatibility)
// Catálogo Canônico, Gerador de Snippets e Exportador de Temas Profissionais
// ==============================================================================

import type { Brand, CompleteBrandData } from "./types.ts";

export type StudioComponentCategory =
  | "actions"
  | "inputs"
  | "data"
  | "navigation"
  | "feedback"
  | "surfaces";

export type ComponentVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "neutral"
  | "ghost"
  | "outline"
  | "soft";

export type ComponentSize = "xs" | "sm" | "md" | "lg";

export type ComponentState = "default" | "hover" | "active" | "focus" | "disabled" | "loading";

export interface ComponentProps {
  variant: ComponentVariant;
  size: ComponentSize;
  state: ComponentState;
  label: string;
  sublabel?: string;
  hasIcon?: boolean;
  outline?: boolean;
  dismissible?: boolean;
  striped?: boolean;
  bordered?: boolean;
  open?: boolean;
  value?: number | string;
  step?: number;
}

export interface StudioComponentSpec {
  id: string;
  name: string;
  daisyTag: string;
  category: StudioComponentCategory;
  description: string;
  tokensUsed: string[];
  supportedVariants: ComponentVariant[];
  supportedSizes: ComponentSize[];
  supportedStates: ComponentState[];
  defaultProps: ComponentProps;
  accessibility: {
    wcagRule: string;
    role: string;
    keyboard: string;
    ariaAttributes: string[];
  };
}

export const CANONICAL_DAISY_COMPONENTS: StudioComponentSpec[] = [
  // --- ACTIONS ---
  {
    id: "btn",
    name: "Botão (Button)",
    daisyTag: "btn",
    category: "actions",
    description: "Elemento de ação principal com suporte a variantes semânticas, tamanhos e microinterações táteis.",
    tokensUsed: ["button.primary.bg", "color.brand.primary", "borderRadius.button"],
    supportedVariants: ["primary", "secondary", "accent", "neutral", "ghost", "outline", "soft"],
    supportedSizes: ["xs", "sm", "md", "lg"],
    supportedStates: ["default", "hover", "active", "disabled", "loading"],
    defaultProps: {
      variant: "primary",
      size: "md",
      state: "default",
      label: "Confirmar Ação",
      hasIcon: true,
      outline: false,
    },
    accessibility: {
      wcagRule: "WCAG 2.2 AA (4.5:1 mínimo de contraste contra o fundo)",
      role: "button",
      keyboard: "Foco via Tab, acionamento via Enter e Space",
      ariaAttributes: ["aria-disabled", "aria-busy", "aria-haspopup"],
    },
  },
  {
    id: "dropdown",
    name: "Menu Suspenso (Dropdown)",
    daisyTag: "dropdown",
    category: "actions",
    description: "Menu suspenso contextual acionado por clique ou foco para opções adicionais de perfil e marca.",
    tokensUsed: ["color.surface.canvas", "color.brand.primary", "borderRadius.card"],
    supportedVariants: ["primary", "secondary", "neutral", "ghost"],
    supportedSizes: ["sm", "md", "lg"],
    supportedStates: ["default", "active"],
    defaultProps: {
      variant: "secondary",
      size: "md",
      state: "default",
      label: "Ações do Perfil",
      open: false,
    },
    accessibility: {
      wcagRule: "WCAG 2.2 2.4.3 Ordem de Foco",
      role: "menu",
      keyboard: "Setas para cima/baixo para navegar, Escape para fechar",
      ariaAttributes: ["aria-expanded", "aria-haspopup='true'", "aria-controls"],
    },
  },
  {
    id: "modal",
    name: "Janela Modal (Modal / Dialog)",
    daisyTag: "modal",
    category: "actions",
    description: "Caixa de diálogo modal sobreposta com backdrop desfocado para confirmações e fluxos críticos.",
    tokensUsed: ["color.surface.elevated", "borderRadius.card", "button.primary.bg"],
    supportedVariants: ["primary", "neutral"],
    supportedSizes: ["sm", "md", "lg"],
    supportedStates: ["default"],
    defaultProps: {
      variant: "primary",
      size: "md",
      state: "default",
      label: "Publicar Release",
      sublabel: "Deseja homologar a versão atual dos tokens e gerar um snapshot imutável?",
      open: true,
    },
    accessibility: {
      wcagRule: "WCAG 2.2 2.1.2 Sem Armadilha de Teclado",
      role: "dialog",
      keyboard: "Escape fecha o modal, Tab aprisionado dentro do diálogo",
      ariaAttributes: ["aria-modal='true'", "aria-labelledby", "aria-describedby"],
    },
  },
  {
    id: "drawer",
    name: "Painel Lateral (Drawer)",
    daisyTag: "drawer",
    category: "actions",
    description: "Gaveta lateral retrátil para navegação móvel e painéis de configuração de identidade.",
    tokensUsed: ["color.surface.canvas", "color.brand.primary"],
    supportedVariants: ["secondary", "neutral"],
    supportedSizes: ["md", "lg"],
    supportedStates: ["default"],
    defaultProps: {
      variant: "secondary",
      size: "md",
      state: "default",
      label: "Configurações de Identidade",
      open: true,
    },
    accessibility: {
      wcagRule: "WCAG 2.2 Foco Dinâmico",
      role: "complementary",
      keyboard: "Escape recolhe a gaveta, foco transferido para o primeiro item",
      ariaAttributes: ["aria-expanded", "aria-hidden"],
    },
  },

  // --- DATA DISPLAY ---
  {
    id: "badge",
    name: "Pílula de Status (Badge)",
    daisyTag: "badge",
    category: "data",
    description: "Emblema compacto para rotulagem, selos de homologação e tags de autoridade do perfil.",
    tokensUsed: ["color.brand.primary", "color.brand.accent", "borderRadius.badge"],
    supportedVariants: ["primary", "secondary", "accent", "neutral", "outline", "soft"],
    supportedSizes: ["xs", "sm", "md", "lg"],
    supportedStates: ["default"],
    defaultProps: {
      variant: "primary",
      size: "md",
      state: "default",
      label: "Verificado Oficial",
      hasIcon: true,
      outline: false,
    },
    accessibility: {
      wcagRule: "WCAG 2.2 1.4.1 Uso de Cores (não depender apenas da cor)",
      role: "status",
      keyboard: "Elemento informativo não focável por padrão",
      ariaAttributes: ["aria-label"],
    },
  },
  {
    id: "card",
    name: "Cartão de Conteúdo (Card)",
    daisyTag: "card",
    category: "data",
    description: "Contêiner estruturado para cards de perfil, bio, produtos ou vitrines com mídia e ações.",
    tokensUsed: ["color.surface.canvas", "borderRadius.card", "shadow.card"],
    supportedVariants: ["secondary", "neutral", "outline"],
    supportedSizes: ["sm", "md", "lg"],
    supportedStates: ["default", "hover"],
    defaultProps: {
      variant: "secondary",
      size: "md",
      state: "default",
      label: "Cartão de Identidade Oficial",
      sublabel: "Posicionamento autoral, voz autêntica e diretrizes da marca em um só lugar.",
      bordered: true,
    },
    accessibility: {
      wcagRule: "WCAG 2.2 1.3.1 Informações e Relações",
      role: "region",
      keyboard: "Elementos interativos internos navegáveis sequencialmente",
      ariaAttributes: ["aria-labelledby"],
    },
  },
  {
    id: "avatar",
    name: "Avatar & Presença (Avatar)",
    daisyTag: "avatar",
    category: "data",
    description: "Foto e símbolo de marca com moldura geométrica, indicador de status online e pilha de equipe.",
    tokensUsed: ["color.brand.primary", "color.brand.accent", "borderRadius.avatar"],
    supportedVariants: ["primary", "accent"],
    supportedSizes: ["xs", "sm", "md", "lg"],
    supportedStates: ["default"],
    defaultProps: {
      variant: "primary",
      size: "md",
      state: "default",
      label: "Luiz Caramelo",
      hasIcon: true,
    },
    accessibility: {
      wcagRule: "WCAG 2.2 1.1.1 Conteúdo Não Textual (alt obrigatório)",
      role: "img",
      keyboard: "Não focável",
      ariaAttributes: ["aria-label", "alt"],
    },
  },
  {
    id: "stats",
    name: "Métricas & KPIs (Stats)",
    daisyTag: "stats",
    category: "data",
    description: "Blocos numéricos para destacar contadores de tokens, conformidade WCAG e alcance do perfil.",
    tokensUsed: ["color.brand.primary", "typography.displayFamily"],
    supportedVariants: ["primary", "secondary", "neutral"],
    supportedSizes: ["sm", "md", "lg"],
    supportedStates: ["default"],
    defaultProps: {
      variant: "secondary",
      size: "md",
      state: "default",
      label: "Tokens Ativos",
      sublabel: "Homologados no W3C DTCG 2025.10",
      value: "18",
    },
    accessibility: {
      wcagRule: "WCAG 2.2 1.3.1 Estrutura Semântica",
      role: "group",
      keyboard: "Leitura sequencial por screen reader",
      ariaAttributes: ["aria-label='Métricas da marca'"],
    },
  },
  {
    id: "table",
    name: "Tabela de Dados (Table)",
    daisyTag: "table",
    category: "data",
    description: "Grade de dados tabulares para listagem de tokens, ativos de marca e histórico de auditorias.",
    tokensUsed: ["color.surface.canvas", "color.brand.primary"],
    supportedVariants: ["secondary", "neutral"],
    supportedSizes: ["sm", "md"],
    supportedStates: ["default"],
    defaultProps: {
      variant: "secondary",
      size: "md",
      state: "default",
      label: "Tabela de Tokens",
      striped: true,
    },
    accessibility: {
      wcagRule: "WCAG 2.2 1.3.1 Cabeçalhos th associados com scope",
      role: "table",
      keyboard: "Navegação por células via screen reader",
      ariaAttributes: ["aria-label"],
    },
  },
  {
    id: "collapse",
    name: "Sanfona Retrátil (Collapse)",
    daisyTag: "collapse",
    category: "data",
    description: "Acordeão expansível com seta animada para seções de FAQ e detalhes das diretrizes de marca.",
    tokensUsed: ["color.surface.canvas", "borderRadius.card"],
    supportedVariants: ["secondary", "neutral"],
    supportedSizes: ["sm", "md"],
    supportedStates: ["default"],
    defaultProps: {
      variant: "secondary",
      size: "md",
      state: "default",
      label: "Como utilizar as cores secundárias?",
      sublabel: "As cores de acento devem ser utilizadas em no máximo 15% da área total da composição visual.",
      open: true,
    },
    accessibility: {
      wcagRule: "WCAG 2.2 4.1.2 Nome, Papel e Valor",
      role: "button",
      keyboard: "Enter/Space expande ou recolhe",
      ariaAttributes: ["aria-expanded", "aria-controls"],
    },
  },

  // --- DATA INPUT ---
  {
    id: "input",
    name: "Campo de Texto (Input)",
    daisyTag: "input",
    category: "inputs",
    description: "Entrada de dados com foco destacado no tom primário e validação de contraste de digitação.",
    tokensUsed: ["color.brand.primary", "color.surface.input", "borderRadius.input"],
    supportedVariants: ["primary", "neutral", "ghost"],
    supportedSizes: ["xs", "sm", "md", "lg"],
    supportedStates: ["default", "focus", "disabled"],
    defaultProps: {
      variant: "primary",
      size: "md",
      state: "default",
      label: "Nome da Marca ou Perfil",
      bordered: true,
    },
    accessibility: {
      wcagRule: "WCAG 2.2 3.3.2 Rótulos e Instruções",
      role: "textbox",
      keyboard: "Tab para focar, digitação direta",
      ariaAttributes: ["aria-required", "aria-invalid", "aria-describedby"],
    },
  },
  {
    id: "toggle",
    name: "Interruptor (Toggle)",
    daisyTag: "toggle",
    category: "inputs",
    description: "Chave binária com transição suave e iluminação na cor primária para preferências do perfil.",
    tokensUsed: ["color.brand.primary", "duration.normal"],
    supportedVariants: ["primary", "accent", "secondary"],
    supportedSizes: ["xs", "sm", "md", "lg"],
    supportedStates: ["default", "disabled"],
    defaultProps: {
      variant: "primary",
      size: "md",
      state: "default",
      label: "Modo de Alto Contraste",
      open: true,
    },
    accessibility: {
      wcagRule: "WCAG 2.2 4.1.2 Estado checked explícito",
      role: "switch",
      keyboard: "Space alterna o estado",
      ariaAttributes: ["aria-checked"],
    },
  },
  {
    id: "checkbox",
    name: "Caixa de Seleção (Checkbox)",
    daisyTag: "checkbox",
    category: "inputs",
    description: "Caixa de marcação estilizada com ícone de confirmação no padrão visual da marca.",
    tokensUsed: ["color.brand.primary"],
    supportedVariants: ["primary", "accent", "secondary"],
    supportedSizes: ["xs", "sm", "md", "lg"],
    supportedStates: ["default", "disabled"],
    defaultProps: {
      variant: "primary",
      size: "md",
      state: "default",
      label: "Homologado para uso em produção",
      open: true,
    },
    accessibility: {
      wcagRule: "WCAG 2.2 4.1.2 Estado checked explícito",
      role: "checkbox",
      keyboard: "Space alterna",
      ariaAttributes: ["aria-checked"],
    },
  },
  {
    id: "radio",
    name: "Opção Radial (Radio)",
    daisyTag: "radio",
    category: "inputs",
    description: "Seletor de opção exclusiva com círculo concêntrico no tom primário da marca.",
    tokensUsed: ["color.brand.primary"],
    supportedVariants: ["primary", "accent", "secondary"],
    supportedSizes: ["xs", "sm", "md", "lg"],
    supportedStates: ["default", "disabled"],
    defaultProps: {
      variant: "primary",
      size: "md",
      state: "default",
      label: "Versão Canônica Publicada",
      open: true,
    },
    accessibility: {
      wcagRule: "WCAG 2.2 1.3.1 Agrupamento de formulário",
      role: "radio",
      keyboard: "Setas alternam entre opções do grupo",
      ariaAttributes: ["aria-checked"],
    },
  },
  {
    id: "range",
    name: "Controle Deslizante (Range)",
    daisyTag: "range",
    category: "inputs",
    description: "Slider contínuo com trilha e ponteiro tingidos no gradiente oficial da marca.",
    tokensUsed: ["color.brand.primary"],
    supportedVariants: ["primary", "accent"],
    supportedSizes: ["xs", "sm", "md", "lg"],
    supportedStates: ["default", "disabled"],
    defaultProps: {
      variant: "primary",
      size: "md",
      state: "default",
      label: "Intensidade Cromática",
      value: 75,
    },
    accessibility: {
      wcagRule: "WCAG 2.2 4.1.2 aria-valuenow atualizado",
      role: "slider",
      keyboard: "Setas esquerda/direita decrementam/incrementam",
      ariaAttributes: ["aria-valuenow", "aria-valuemin", "aria-valuemax"],
    },
  },
  {
    id: "select",
    name: "Menu de Seleção (Select)",
    daisyTag: "select",
    category: "inputs",
    description: "Caixa suspensa com seta estilizada e bordas suaves adaptadas aos tokens de raio.",
    tokensUsed: ["color.brand.primary", "borderRadius.input"],
    supportedVariants: ["primary", "neutral", "ghost"],
    supportedSizes: ["xs", "sm", "md", "lg"],
    supportedStates: ["default", "disabled"],
    defaultProps: {
      variant: "primary",
      size: "md",
      state: "default",
      label: "Ambiente do Design System",
      bordered: true,
    },
    accessibility: {
      wcagRule: "WCAG 2.2 3.2.2 Entrada previsível",
      role: "combobox",
      keyboard: "Alt + Seta Baixo abre, Enter confirma",
      ariaAttributes: ["aria-expanded"],
    },
  },

  // --- NAVIGATION ---
  {
    id: "tabs",
    name: "Navegador de Abas (Tabs)",
    daisyTag: "tabs",
    category: "navigation",
    description: "Conjunto de abas horizontais com indicador ativo deslizante na cor primária.",
    tokensUsed: ["color.brand.primary", "color.text.muted"],
    supportedVariants: ["primary", "secondary"],
    supportedSizes: ["sm", "md", "lg"],
    supportedStates: ["default"],
    defaultProps: {
      variant: "primary",
      size: "md",
      state: "default",
      label: "Visão Geral",
      bordered: true,
    },
    accessibility: {
      wcagRule: "WCAG 2.2 2.4.7 Foco Visível",
      role: "tablist",
      keyboard: "Setas esquerda/direita trocam a aba ativa",
      ariaAttributes: ["aria-selected", "aria-controls"],
    },
  },
  {
    id: "breadcrumbs",
    name: "Trilha Hierárquica (Breadcrumbs)",
    daisyTag: "breadcrumbs",
    category: "navigation",
    description: "Trilha sequencial de navegação estruturada indicando a localização atual no ecossistema.",
    tokensUsed: ["color.brand.primary", "color.text.muted"],
    supportedVariants: ["primary", "neutral"],
    supportedSizes: ["sm", "md"],
    supportedStates: ["default"],
    defaultProps: {
      variant: "primary",
      size: "md",
      state: "default",
      label: "Design System",
    },
    accessibility: {
      wcagRule: "WCAG 2.2 2.4.8 Localização",
      role: "navigation",
      keyboard: "Tab navega pelos links da trilha",
      ariaAttributes: ["aria-label='breadcrumbs'", "aria-current='page'"],
    },
  },
  {
    id: "steps",
    name: "Passo a Passo (Steps)",
    daisyTag: "steps",
    category: "navigation",
    description: "Indicador sequencial de etapas de onboarding, checkout ou publicação de brandbook.",
    tokensUsed: ["color.brand.primary", "color.brand.accent"],
    supportedVariants: ["primary", "accent", "secondary"],
    supportedSizes: ["sm", "md"],
    supportedStates: ["default"],
    defaultProps: {
      variant: "primary",
      size: "md",
      state: "default",
      label: "Cores & Tokens",
      step: 2,
    },
    accessibility: {
      wcagRule: "WCAG 2.2 1.3.1 Informações de Progresso",
      role: "list",
      keyboard: "Leitura sequencial",
      ariaAttributes: ["aria-current='step'"],
    },
  },
  {
    id: "pagination",
    name: "Paginação (Join / Pagination)",
    daisyTag: "join",
    category: "navigation",
    description: "Grupo de botões unificados para navegação entre páginas com destaque da página atual.",
    tokensUsed: ["color.brand.primary", "borderRadius.button"],
    supportedVariants: ["primary", "neutral"],
    supportedSizes: ["xs", "sm", "md", "lg"],
    supportedStates: ["default"],
    defaultProps: {
      variant: "primary",
      size: "md",
      state: "default",
      label: "Página 1",
    },
    accessibility: {
      wcagRule: "WCAG 2.2 2.4.4 Finalidade do Link",
      role: "navigation",
      keyboard: "Tab entre páginas",
      ariaAttributes: ["aria-label='Paginação'", "aria-current='page'"],
    },
  },

  // --- FEEDBACK & LOADERS ---
  {
    id: "alert",
    name: "Banner de Alerta (Alert)",
    daisyTag: "alert",
    category: "feedback",
    description: "Notificação contextual com borda na cor de destaque para avisos de sistema e validação.",
    tokensUsed: ["color.brand.primary", "color.brand.accent", "borderRadius.alert"],
    supportedVariants: ["primary", "secondary", "accent", "neutral"],
    supportedSizes: ["sm", "md"],
    supportedStates: ["default"],
    defaultProps: {
      variant: "primary",
      size: "md",
      state: "default",
      label: "Identidade Visual Sincronizada",
      sublabel: "Todos os tokens DTCG 2025.10 foram auditados e aprovados pelo Brand Guard.",
      hasIcon: true,
      dismissible: true,
    },
    accessibility: {
      wcagRule: "WCAG 2.2 4.1.3 Mensagens de Status",
      role: "alert",
      keyboard: "Foco no botão de dispensar",
      ariaAttributes: ["aria-live='polite'"],
    },
  },
  {
    id: "toast",
    name: "Notificação Flutuante (Toast)",
    daisyTag: "toast",
    category: "feedback",
    description: "Pílula de alerta flutuante no canto da tela informando ações rápidas e feedbacks.",
    tokensUsed: ["color.surface.elevated", "color.brand.primary", "shadow.card"],
    supportedVariants: ["primary", "accent", "neutral"],
    supportedSizes: ["sm", "md"],
    supportedStates: ["default"],
    defaultProps: {
      variant: "primary",
      size: "md",
      state: "default",
      label: "Token copiado para a área de transferência!",
    },
    accessibility: {
      wcagRule: "WCAG 2.2 2.2.1 Tempo Ajustável",
      role: "status",
      keyboard: "Não bloqueia o fluxo de navegação",
      ariaAttributes: ["aria-live='assertive'"],
    },
  },
  {
    id: "progress",
    name: "Barra de Progresso (Progress)",
    daisyTag: "progress",
    category: "feedback",
    description: "Barra indicadora de preenchimento com gradiente nas cores primária e de acento.",
    tokensUsed: ["color.brand.primary", "color.brand.accent"],
    supportedVariants: ["primary", "accent", "secondary"],
    supportedSizes: ["xs", "sm", "md", "lg"],
    supportedStates: ["default"],
    defaultProps: {
      variant: "primary",
      size: "md",
      state: "default",
      label: "Progresso do Brandbook",
      value: 80,
    },
    accessibility: {
      wcagRule: "WCAG 2.2 4.1.2 Valores de Progresso",
      role: "progressbar",
      keyboard: "Não focável",
      ariaAttributes: ["aria-valuenow", "aria-valuemin", "aria-valuemax"],
    },
  },
  {
    id: "loading",
    name: "Indicador de Carregamento (Loading)",
    daisyTag: "loading",
    category: "feedback",
    description: "Animação de spinner, dots ou anel nos tons da marca para indicar estados assíncronos.",
    tokensUsed: ["color.brand.primary"],
    supportedVariants: ["primary", "accent", "neutral"],
    supportedSizes: ["xs", "sm", "md", "lg"],
    supportedStates: ["default"],
    defaultProps: {
      variant: "primary",
      size: "md",
      state: "default",
      label: "Sincronizando...",
    },
    accessibility: {
      wcagRule: "WCAG 2.2 2.2.2 Pausar, Parar, Ocultar",
      role: "status",
      keyboard: "Não focável",
      ariaAttributes: ["aria-busy='true'", "aria-label='Carregando'"],
    },
  },
  {
    id: "skeleton",
    name: "Placeholder de Carga (Skeleton)",
    daisyTag: "skeleton",
    category: "feedback",
    description: "Silhueta com pulsação suave simulando conteúdo enquanto a identidade carrega.",
    tokensUsed: ["color.surface.canvas", "borderRadius.card"],
    supportedVariants: ["neutral"],
    supportedSizes: ["sm", "md", "lg"],
    supportedStates: ["default"],
    defaultProps: {
      variant: "neutral",
      size: "md",
      state: "default",
      label: "Carregando Card...",
    },
    accessibility: {
      wcagRule: "WCAG 2.2 1.3.1 Indicador de Carregamento",
      role: "status",
      keyboard: "Não focável",
      ariaAttributes: ["aria-hidden='true'"],
    },
  },
  {
    id: "tooltip",
    name: "Dica de Contexto (Tooltip)",
    daisyTag: "tooltip",
    category: "feedback",
    description: "Pequeno balão de informação exibido ao passar o cursor ou focar em um botão.",
    tokensUsed: ["color.surface.elevated", "color.brand.primary"],
    supportedVariants: ["primary", "accent", "neutral"],
    supportedSizes: ["sm", "md"],
    supportedStates: ["default"],
    defaultProps: {
      variant: "primary",
      size: "md",
      state: "default",
      label: "Ver diretrizes canônicas",
    },
    accessibility: {
      wcagRule: "WCAG 2.2 1.4.13 Conteúdo ao Passar o Cursor ou Focar",
      role: "tooltip",
      keyboard: "Escape oculta o tooltip",
      ariaAttributes: ["aria-describedby"],
    },
  },
];

// ==============================================================================
// Gerador de Snippets Oficiais DaisyUI & Tailwind
// ==============================================================================

export function generateDaisyUi5Snippet(
  component: StudioComponentSpec,
  props: ComponentProps,
  brand: Brand
): string {
  const sizeClass = props.size === "xs" ? "btn-xs" : props.size === "sm" ? "btn-sm" : props.size === "lg" ? "btn-lg" : "";
  const variantClass = props.variant === "primary" ? "btn-primary" : props.variant === "accent" ? "btn-accent" : props.variant === "secondary" ? "btn-secondary" : props.variant === "outline" ? "btn-outline" : props.variant === "ghost" ? "btn-ghost" : "btn-neutral";

  switch (component.id) {
    case "btn":
      return `<!-- DaisyUI 5 (Tailwind v4) -->\n<button class="btn ${variantClass} ${sizeClass} ${props.state === "loading" ? "btn-disabled" : ""}">\n  ${props.state === "loading" ? '<span class="loading loading-spinner loading-xs"></span> ' : ""}${props.label}\n</button>`;

    case "badge":
      return `<!-- DaisyUI 5 Badge -->\n<span class="badge badge-${props.variant} ${props.size === "sm" ? "badge-sm" : props.size === "lg" ? "badge-lg" : ""} ${props.outline ? "badge-outline" : ""}">\n  ${props.label}\n</span>`;

    case "modal":
      return `<!-- DaisyUI 5 Dialog Modal -->\n<dialog id="modal_${brand.slug}" class="modal ${props.open ? "modal-open" : ""}">\n  <div class="modal-box bg-base-200 border border-base-300">\n    <h3 class="font-bold text-lg text-primary">${props.label}</h3>\n    <p class="py-4 text-sm text-base-content/80">${props.sublabel || ""}</p>\n    <div class="modal-action">\n      <form method="dialog">\n        <button class="btn btn-ghost btn-sm">Cancelar</button>\n        <button class="btn btn-primary btn-sm">Confirmar</button>\n      </form>\n    </div>\n  </div>\n</dialog>`;

    case "drawer":
      return `<!-- DaisyUI 5 Drawer -->\n<div class="drawer lg:drawer-open">\n  <input id="drawer-toggle" type="checkbox" class="drawer-toggle" ${props.open ? "checked" : ""} />\n  <div class="drawer-content flex flex-col items-center justify-center p-4">\n    <label for="drawer-toggle" class="btn btn-primary drawer-button lg:hidden">Abrir Menu</label>\n  </div>\n  <div class="drawer-side">\n    <label for="drawer-toggle" class="drawer-overlay"></label>\n    <ul class="menu p-4 w-80 min-h-full bg-base-200 text-base-content">\n      <li class="menu-title font-bold text-primary">${props.label}</li>\n      <li><a>Visão Geral</a></li>\n      <li><a>Design Tokens</a></li>\n      <li><a>Brandbook</a></li>\n    </ul>\n  </div>\n</div>`;

    case "dropdown":
      return `<!-- DaisyUI 5 Dropdown -->\n<div class="dropdown ${props.open ? "dropdown-open" : ""}">\n  <div tabindex="0" role="button" class="btn btn-sm btn-outline m-1">\n    ${props.label} ▾\n  </div>\n  <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box w-52 border border-base-300">\n    <li><a>Visualizar Marca</a></li>\n    <li><a>Exportar Tokens</a></li>\n    <li><a class="text-error">Arquivar</a></li>\n  </ul>\n</div>`;

    case "tooltip":
      return `<!-- DaisyUI 5 Tooltip -->\n<div class="tooltip tooltip-primary" data-tip="${props.label}">\n  <button class="btn btn-sm btn-ghost">Passar o Mouse</button>\n</div>`;

    case "table":
      return `<!-- DaisyUI 5 Table -->\n<div class="overflow-x-auto">\n  <table class="table ${props.striped ? "table-zebra" : ""} bg-base-200 rounded-box">\n    <thead>\n      <tr class="text-primary font-bold">\n        <th>#</th>\n        <th>Token Path</th>\n        <th>Tipo</th>\n        <th>Valor</th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr>\n        <th>1</th>\n        <td>color.brand.primary</td>\n        <td>color</td>\n        <td><span class="badge badge-primary">#FF701A</span></td>\n      </tr>\n    </tbody>\n  </table>\n</div>`;

    case "pagination":
      return `<!-- DaisyUI 5 Pagination Join -->\n<div class="join">\n  <button class="join-item btn btn-sm">«</button>\n  <button class="join-item btn btn-sm btn-primary">1</button>\n  <button class="join-item btn btn-sm">2</button>\n  <button class="join-item btn btn-sm">3</button>\n  <button class="join-item btn btn-sm">»</button>\n</div>`;

    case "skeleton":
      return `<!-- DaisyUI 5 Skeleton -->\n<div class="flex flex-col gap-4 w-52">\n  <div class="skeleton h-32 w-full"></div>\n  <div class="skeleton h-4 w-28"></div>\n  <div class="skeleton h-4 w-full"></div>\n</div>`;

    case "toast":
      return `<!-- DaisyUI 5 Toast -->\n<div class="toast toast-end toast-bottom">\n  <div class="alert alert-primary text-primary-content shadow-lg">\n    <span>${props.label}</span>\n  </div>\n</div>`;

    case "loading":
      return `<!-- DaisyUI 5 Loading Spinner -->\n<span class="loading loading-spinner text-primary loading-${props.size}"></span>`;

    case "steps":
      return `<!-- DaisyUI 5 Steps -->\n<ul class="steps steps-vertical lg:steps-horizontal">\n  <li class="step step-primary">Identidade</li>\n  <li class="step step-primary">Cores & Tokens</li>\n  <li class="step">Brandbook</li>\n  <li class="step">Publicação</li>\n</ul>`;

    case "input":
      return `<!-- DaisyUI 5 Input -->\n<input\n  type="text"\n  placeholder="${props.label}"\n  class="input input-bordered input-primary w-full max-w-xs"\n  ${props.state === "disabled" ? "disabled" : ""}\n/>`;

    case "toggle":
      return `<!-- DaisyUI 5 Toggle -->\n<input type="checkbox" class="toggle toggle-primary" ${props.open ? "checked" : ""} />`;

    case "alert":
      return `<!-- DaisyUI 5 Alert -->\n<div role="alert" class="alert alert-primary shadow-md">\n  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>\n  <span>${props.label}</span>\n</div>`;

    default:
      return `<!-- DaisyUI 5 ${component.name} -->\n<div class="${component.daisyTag} ${component.daisyTag}-${props.variant}">\n  ${props.label}\n</div>`;
  }
}

export function generateReactJsxSnippet(
  component: StudioComponentSpec,
  props: ComponentProps,
  brand: Brand
): string {
  switch (component.id) {
    case "btn":
      return `import { Button } from "@/components/ui/button";\n\nexport function ActionDemo() {\n  return (\n    <Button\n      variant="${props.variant}"\n      size="${props.size}"\n      disabled={${props.state === "disabled"}}\n    >\n      ${props.label}\n    </Button>\n  );\n}`;

    case "badge":
      return `import { Badge } from "@/components/ui/badge";\n\nexport function StatusBadge() {\n  return (\n    <Badge variant="${props.variant}" outline={${Boolean(props.outline)}}>\n      ${props.label}\n    </Badge>\n  );\n}`;

    case "modal":
      return `import { Modal } from "@/components/ui/modal";\n\nexport function ReleaseModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {\n  return (\n    <Modal isOpen={isOpen} onClose={onClose} title="${props.label}">\n      <p>${props.sublabel || ""}</p>\n    </Modal>\n  );\n}`;

    default:
      return `// React JSX Component for ${component.name} (${brand.name})\nexport function ${component.id.toUpperCase()}Demo() {\n  return (\n    <div className="${component.daisyTag} ${component.daisyTag}-${props.variant}">\n      <span>${props.label}</span>\n    </div>\n  );\n}`;
  }
}

// ==============================================================================
// Exportadores de Configurações DaisyUI (DaisyUI 5 e DaisyUI 4)
// ==============================================================================

export function exportDaisyUi5ThemeCss(brand: Brand, brandData: CompleteBrandData): string {
  const primary = brand.primary_color || "#FF701A";
  const accent = brand.accent_color || "#25BFFF";
  const surface = brandData.colors.find((c) => c.role === "surface")?.hex || "#17171D";
  const text = brandData.colors.find((c) => c.role === "text_primary")?.hex || "#FFF4E8";
  const radius = brandData.visualElements?.geometry?.radiusScale?.md
    ? `${brandData.visualElements.geometry.radiusScale.md}px`
    : "10px";

  return `/* ==============================================================================
   DaisyUI 5 / Tailwind CSS v4 Theme — ${brand.name}
   Gerado pelo Brand Guardian (LAB Caramelo)
   Adicione ao seu arquivo CSS principal (ex: app.css / global.css)
   ============================================================================== */

@import "tailwindcss";
@plugin "daisyui" {
  themes: ${brand.slug} --default, dark, light;
}

@plugin "daisyui/theme" {
  name: "${brand.slug}";
  default: true;
  prefersdark: true;
  color-scheme: "dark";

  --color-primary: ${primary};
  --color-primary-content: #101014;
  --color-secondary: ${surface};
  --color-secondary-content: ${text};
  --color-accent: ${accent};
  --color-accent-content: #101014;
  --color-neutral: #1F1F27;
  --color-neutral-content: ${text};
  --color-base-100: #101014;
  --color-base-200: ${surface};
  --color-base-300: #1F1F27;
  --color-base-content: ${text};
  --color-info: ${accent};
  --color-success: #27C93F;
  --color-warning: #FFD52A;
  --color-error: #FF3D8D;

  --radius-selector: ${radius};
  --radius-field: ${radius};
  --radius-box: 14px;
}`;
}

export function exportDaisyUi4TailwindConfig(brand: Brand, brandData: CompleteBrandData): string {
  const primary = brand.primary_color || "#FF701A";
  const accent = brand.accent_color || "#25BFFF";
  const surface = brandData.colors.find((c) => c.role === "surface")?.hex || "#17171D";
  const text = brandData.colors.find((c) => c.role === "text_primary")?.hex || "#FFF4E8";
  const radius = brandData.visualElements?.geometry?.radiusScale?.md
    ? `${brandData.visualElements.geometry.radiusScale.md}px`
    : "10px";

  const displayFont = brandData.typography.families.find((f) => f.role === "primary_display")?.familyName || "sans-serif";
  const bodyFont = brandData.typography.families.find((f) => f.role === "body_ui")?.familyName || "sans-serif";
  const monoFont = brandData.typography.families.find((f) => f.role === "monospace")?.familyName || "monospace";

  return `// tailwind.config.js — DaisyUI 4 (Tailwind v3) para ${brand.name}
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,html}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["${displayFont}", "sans-serif"],
        body: ["${bodyFont}", "sans-serif"],
        mono: ["${monoFont}", "monospace"],
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        "${brand.slug}": {
          "primary": "${primary}",
          "primary-content": "#101014",
          "secondary": "${surface}",
          "secondary-content": "${text}",
          "accent": "${accent}",
          "accent-content": "#101014",
          "neutral": "#1F1F27",
          "neutral-content": "${text}",
          "base-100": "#101014",
          "base-200": "${surface}",
          "base-300": "#1F1F27",
          "base-content": "${text}",
          "info": "${accent}",
          "success": "#27C93F",
          "warning": "#FFD52A",
          "error": "#FF3D8D",
          "--rounded-box": "14px",
          "--rounded-btn": "${radius}",
          "--rounded-badge": "9999px",
        },
      },
    ],
  },
};`;
}

export function exportComponentPackageJson(brand: Brand, version = "1.0.0"): string {
  return JSON.stringify(
    {
      name: `@${brand.slug}/design-system`,
      version,
      description: `Sistema de Design e Componentes DaisyUI de ${brand.name} gerados pelo Brand Guardian`,
      type: "module",
      main: "index.js",
      scripts: {
        dev: "vite",
        build: "vite build",
      },
      peerDependencies: {
        tailwindcss: "^4.0.0 || ^3.4.0",
        daisyui: "^5.0.0 || ^4.12.0",
        react: "^19.0.0",
        "react-dom": "^19.0.0",
      },
      keywords: ["daisyui", "tailwind", "design-system", "brand-guardian", brand.slug],
      author: brand.name,
      license: "MIT",
    },
    null,
    2
  );
}

export function exportComponentDocsMarkdown(brand: Brand, brandData: CompleteBrandData, components: StudioComponentSpec[]): string {
  return `# ${brand.name} — Design System & Component Studio
**Versão:** 1.0.0 · **Padrão:** DaisyUI 5 / Tailwind CSS · **Auditado pelo Brand Guardian**

## Visão Geral
Este repositório contém a suíte oficial de componentes de UI de **${brand.name}**, mapeada diretamente dos tokens aprovados no Brand Guardian.

### Variáveis Globais de Cores
- **Primária:** \`${brand.primary_color}\`
- **Acento:** \`${brand.accent_color}\`
- **Tipografia Display:** \`${brandData.typography.families.find((f) => f.role === "primary_display")?.familyName || "sans-serif"}\`
- **Tipografia Body:** \`${brandData.typography.families.find((f) => f.role === "body_ui")?.familyName || "sans-serif"}\`

## Componentes Disponíveis (${components.length})
${components.map((c) => `- **${c.name}** (\`${c.daisyTag}\`): ${c.description} *(Tokens: ${c.tokensUsed.join(", ")})*`).join("\n")}

## Instalação Rápida
\`\`\`bash
npm install daisyui tailwindcss
\`\`\`

Adicione o tema de **${brand.name}** ao seu \`app.css\` conforme o arquivo \`theme.daisyui5.css\`.
`;
}
