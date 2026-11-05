import type { CadernoPage, DatabaseData } from "../types";

export const DEFAULT_DATABASE: DatabaseData = {
  id: "db-sprints-head",
  title: "Central de Sprints & Entregas",
  currentView: "board",
  properties: [
    { id: "prop-title", name: "Demanda / Tarefa", type: "title" },
    {
      id: "prop-status",
      name: "Status",
      type: "status",
      options: [
        { id: "opt-backlog", label: "Backlog", color: "#606070" },
        { id: "opt-prog", label: "Em Produção", color: "#FF701A" },
        { id: "opt-rev", label: "Em Revisão", color: "#25BFFF" },
        { id: "opt-done", label: "Concluído", color: "#2ECC71" },
      ],
    },
    {
      id: "prop-priority",
      name: "Prioridade",
      type: "priority",
      options: [
        { id: "prio-low", label: "Baixa", color: "#8E8E93" },
        { id: "prio-med", label: "Média", color: "#FFD52A" },
        { id: "prio-high", label: "Alta", color: "#FF701A" },
        { id: "prio-crit", label: "Crítica", color: "#FF3D8D" },
      ],
    },
    {
      id: "prop-format",
      name: "Formato",
      type: "tags",
      options: [
        { id: "fmt-carrossel", label: "Carrossel HEAD", color: "#FF701A" },
        { id: "fmt-reels", label: "Reels / Vídeo", color: "#25BFFF" },
        { id: "fmt-stories", label: "Sequência Stories", color: "#FF3D8D" },
        { id: "fmt-artigo", label: "Artigo / Dossiê", color: "#7657FF" },
      ],
    },
    { id: "prop-due", name: "Prazo", type: "date" },
    { id: "prop-assignee", name: "Responsável", type: "person" },
    { id: "prop-check", name: "Aprovado", type: "checkbox" },
  ],
  rows: [
    {
      id: "row-1",
      values: {
        "prop-title": "Carrossel: Menos Ferramenta, Mais Sistema",
        "prop-status": "opt-prog",
        "prop-priority": "prio-crit",
        "prop-format": ["fmt-carrossel"],
        "prop-due": "2026-11-10",
        "prop-assignee": "Luiz",
        "prop-check": false,
      },
    },
    {
      id: "row-2",
      values: {
        "prop-title": "Roteiro de Reels: Desconstrução do Formato Palestrinha",
        "prop-status": "opt-rev",
        "prop-priority": "prio-high",
        "prop-format": ["fmt-reels"],
        "prop-due": "2026-11-08",
        "prop-assignee": "Luiz",
        "prop-check": false,
      },
    },
    {
      id: "row-3",
      values: {
        "prop-title": "Sequência de Stories: Confissão Patética sobre Produtividade",
        "prop-status": "opt-done",
        "prop-priority": "prio-med",
        "prop-format": ["fmt-stories"],
        "prop-due": "2026-11-04",
        "prop-assignee": "Luiz",
        "prop-check": true,
      },
    },
    {
      id: "row-4",
      values: {
        "prop-title": "Dossiê: Metodologia de Tráfego e Pontes de Conversão",
        "prop-status": "opt-backlog",
        "prop-priority": "prio-med",
        "prop-format": ["fmt-artigo"],
        "prop-due": "2026-11-18",
        "prop-assignee": "Equipe LAB",
        "prop-check": false,
      },
    },
    {
      id: "row-5",
      values: {
        "prop-title": "Keyframes no Midjourney: Pôr do sol urbano em BH",
        "prop-status": "opt-prog",
        "prop-priority": "prio-high",
        "prop-format": ["fmt-carrossel"],
        "prop-due": "2026-11-12",
        "prop-assignee": "Luiz",
        "prop-check": false,
      },
    },
  ],
};

export function createDefaultPages(): CadernoPage[] {
  const now = new Date().toISOString();

  return [
    {
      id: "page-brain",
      parentId: null,
      title: "Segundo Cérebro: Rotina & Repertório",
      icon: "🧠",
      cover: "linear-gradient(135deg, #181824 0%, #2a1b12 50%, #FF701A22 100%)",
      isFavorite: true,
      isDatabase: false,
      createdAt: now,
      updatedAt: now,
      blocks: [
        {
          id: "b-1",
          type: "heading_1",
          content: "Segundo Cérebro — Laboratório de Interação",
        },
        {
          id: "b-2",
          type: "paragraph",
          content:
            "O Caderno é o seu espaço local-first no LAB para capturar pensamentos, organizar acervos e estruturar sistemas antes que eles virem código, design ou posts.",
        },
        {
          id: "b-callout-1",
          type: "callout",
          calloutType: "idea",
          calloutIcon: "💡",
          content:
            "Regra canônica do Caramelo: 'Menos ferramenta. Mais sistema. Conteúdo não começa no post.' Estratégia precisa ser sentida.",
        },
        {
          id: "b-3",
          type: "heading_2",
          content: "Prioridades da Semana",
        },
        {
          id: "b-todo-1",
          type: "todo",
          checked: true,
          content: "Configurar o workspace com as páginas fundamentais",
        },
        {
          id: "b-todo-2",
          type: "todo",
          checked: true,
          content: "Validar paleta oficial (#101014 Ink Black, #FFF4E8 Warm Cream, #FF701A)",
        },
        {
          id: "b-todo-3",
          type: "todo",
          checked: false,
          content: "Montar a pauta do próximo carrossel no Método HEAD",
        },
        {
          id: "b-todo-4",
          type: "todo",
          checked: false,
          content: "Revisar pipeline de aprovações no Gabinete",
        },
        {
          id: "b-4",
          type: "heading_2",
          content: "Princípios Operacionais",
        },
        {
          id: "b-toggle-1",
          type: "toggle",
          expanded: true,
          content: "Stillness vs Movement (Linguagem Cinematográfica)",
          childrenBlocks: [
            {
              id: "b-tog-c1",
              type: "paragraph",
              content:
                "Stillness = Camadas perfeitamente alinhadas. Movement = Camadas se separam no espaço óptico. O choque de escala guia a atenção do leitor.",
            },
          ],
        },
        {
          id: "b-toggle-2",
          type: "toggle",
          expanded: false,
          content: "Critério da Mediocridade Anti-IA",
          childrenBlocks: [
            {
              id: "b-tog-c2",
              type: "paragraph",
              content:
                "Se qualquer parágrafo puder ter sido gerado por um modelo genérico sem suor, apague. Adicione uma cena real, um detalhe sensorial de Belo Horizonte ou uma confissão patética.",
            },
          ],
        },
        {
          id: "b-quote-1",
          type: "quote",
          content:
            "Boas ideias merecem ganhar uma forma à altura do valor que já carregam.",
        },
        {
          id: "b-code-1",
          type: "code",
          language: "json",
          content: `// Paleta Oficial Caramelo V1 2026
{
  "inkBlack": "#101014",
  "warmCream": "#FFF4E8",
  "caramelOrange": "#FF701A",
  "electricSky": "#25BFFF",
  "hotPink": "#FF3D8D",
  "electricViolet": "#7657FF",
  "acidYellow": "#FFD52A"
}`,
        },
        {
          id: "b-div-1",
          type: "divider",
          content: "",
        },
        {
          id: "b-tip",
          type: "paragraph",
          content:
            "Dica de produtividade: Digite '/' em qualquer linha vazia para invocar o menu de comandos rápidos de blocos.",
        },
      ],
    },
    {
      id: "page-head-method",
      parentId: null,
      title: "Dossiê de Conteúdo: Método HEAD",
      icon: "⚡",
      cover: "linear-gradient(135deg, #101014 0%, #1c1428 50%, #7657FF33 100%)",
      isFavorite: true,
      isDatabase: false,
      createdAt: now,
      updatedAt: now,
      blocks: [
        {
          id: "b-head-1",
          type: "heading_1",
          content: "Método HEAD — Atenção, Retenção & Toque",
        },
        {
          id: "b-head-2",
          type: "paragraph",
          content:
            "O método oficial de direção editorial e carrosséis do Laboratório de Interação. Cada slide existe para provocar uma ação ou sensação intencional.",
        },
        {
          id: "b-callout-head",
          type: "callout",
          calloutType: "focus",
          calloutIcon: "🎯",
          content:
            "Fórmula da Headline: Específica + Curiosa + Urgente. Nunca prometa algo vago.",
        },
        {
          id: "b-head-3",
          type: "heading_2",
          content: "A Tríade de Ganchos (Página 1)",
        },
        {
          id: "b-list-1",
          type: "bulleted_list",
          content:
            "**Gancho Verbal:** A frase ou contraste provocativo que quebra o padrão de scroll no feed.",
        },
        {
          id: "b-list-2",
          type: "bulleted_list",
          content:
            "**Gancho Textual:** O subtexto que ancora a dor e especifica o nicho com termos de bastidor.",
        },
        {
          id: "b-list-3",
          type: "bulleted_list",
          content:
            "**Gancho Visual:** Imagem cinematográfica com contraste de cor (#FF701A x luz fria) ou elemento 3D fora do eixo.",
        },
        {
          id: "b-head-4",
          type: "heading_2",
          content: "Matriz de 3 Universos",
        },
        {
          id: "b-tbl-1",
          type: "table",
          content: "",
          tableData: {
            headers: ["Universo", "O que explorar", "Resultado esperado"],
            rows: [
              [
                "Marca",
                "Bastidores reais, método de trabalho, confissões",
                "Autoridade autêntica e diferenciação",
              ],
              [
                "Público",
                "Frustrações diárias, sintomas de estagnação, metas",
                "Efeito 'Meu Deus, sou eu'",
              ],
              [
                "Mercado",
                "Clichês da indústria, soluções fáceis que falham",
                "Posicionamento crítico e polarização",
              ],
            ],
          },
        },
      ],
    },
    {
      id: "page-brand-wiki",
      parentId: null,
      title: "Wiki de Marca & Manual Verbal",
      icon: "🏛️",
      cover: "linear-gradient(135deg, #101014 0%, #201a14 50%, #FFD52A22 100%)",
      isFavorite: false,
      isDatabase: false,
      createdAt: now,
      updatedAt: now,
      blocks: [
        {
          id: "b-wiki-1",
          type: "heading_1",
          content: "Manual de Identidade Verbal & Tom de Voz",
        },
        {
          id: "b-wiki-2",
          type: "paragraph",
          content:
            "A identidade verbal de Um Cara Caramelo é o equilíbrio entre inteligência cirúrgica e humanidade desarmada.",
        },
        {
          id: "b-call-wiki",
          type: "callout",
          calloutType: "coffee",
          calloutIcon: "☕",
          content:
            "Fórmula de Tom: Elegância + pequena confissão patética. Nunca soe como um guru inatingível.",
        },
        {
          id: "b-wiki-3",
          type: "heading_2",
          content: "As 3 Vozes Tipográficas",
        },
        {
          id: "b-num-1",
          type: "numbered_list",
          content:
            "**Voz Principal (Grotesca Pesada):** Títulos de cartaz, impacto visual, palavras-chave.",
        },
        {
          id: "b-num-2",
          type: "numbered_list",
          content:
            "**Voz Secundária (Sans Funcional):** Corpo de texto, leitura confortável, interfaces.",
        },
        {
          id: "b-num-3",
          type: "numbered_list",
          content:
            "**Voz Manuscrita (Intervenção Humana):** Rabiscos, setas, comentários de bastidor e ironia.",
        },
      ],
    },
    {
      id: "page-sprints-db",
      parentId: null,
      title: "Central de Sprints & Entregas",
      icon: "📊",
      cover: "linear-gradient(135deg, #121620 0%, #152230 50%, #25BFFF33 100%)",
      isFavorite: true,
      isDatabase: true,
      database: DEFAULT_DATABASE,
      createdAt: now,
      updatedAt: now,
      blocks: [],
    },
  ];
}
