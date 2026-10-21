import type { ArtKind, LibraryApp, LibrarySnapshot, ToolMetadata } from "./types";

/**
 * LAB tools. Every tool is sold in the store; only the ones in public.user_tools for the signed-in
 * person enter their library (registerTools). Slugs and appids match public.lab_tools.
 */

export const PROMPT_LIBRARY_APP_ID = 1;
export const KANBAN_APP_ID = 2;
export const PRANCHETA_APP_ID = 3;
export const AUTOMATION_APP_ID = 4;
export const ACADEMY_APP_ID = 5;
export const CLAQUETE_APP_ID = 6;

const art = (root: string): ToolMetadata["assets"] => ({
  capsule: `${root}/capsule.svg`,
  hero: `${root}/hero.svg`,
  heroBlur: `${root}/hero.svg`,
  header: `${root}/header.svg`,
  icon: `${root}/icon.svg`,
});

function tool(appid: number, name: string, meta: ToolMetadata): LibraryApp {
  return {
    appid,
    name,
    type: "tool",
    installed: true,
    sizeOnDisk: 0,
    lastPlayed: 0,
    playtimeMinutes: 0,
    developer: "Um Cara Caramelo",
    publisher: "Um Cara Caramelo",
    art: { capsule: true, hero: true, heroBlur: true, logo: false, header: true, icon: true },
    tool: meta,
  };
}

export const PROMPT_LIBRARY_APP = tool(PROMPT_LIBRARY_APP_ID, "Biblioteca de prompts", {
  slug: "prompt-library",
  launchPath: `/library/app/${PROMPT_LIBRARY_APP_ID}/open`,
  publicPage: "/tools/prompt-library/index.html",
  description: "Encontre, organize e copie prompts para criar com inteligência artificial.",
  assets: art("/tools/prompt-library/art"),
  store: {
    tagline: "Prompts autorais para interfaces, motion e design.",
    eyebrow: "ACERVO CRIATIVO / ACESSO LIVRE",
    headline: "Menos página em branco.\nMais ideias em ação.",
    features: [
      { title: "Encontre sua referência", text: "Busque por nome, assunto ou tecnologia e filtre o acervo por categoria." },
      { title: "Veja antes de criar", text: "Explore as prévias de interfaces, efeitos e experiências." },
      { title: "Guarde suas ideias", text: "Salve seus prompts favoritos para voltar a eles neste navegador." },
      { title: "Copie e faça do seu jeito", text: "Abra o prompt completo, copie o texto e compartilhe a referência." },
    ],
    steps: ["Abra a biblioteca e explore o acervo.", "Escolha uma referência e veja o prompt.", "Copie o texto e transforme a ideia no seu projeto."],
    about: [["Formato", "Biblioteca interativa"], ["Idioma", "Português"], ["Instalação", "Acesso direto pelo LAB"]],
    dataNote: "Favoritos e preferências ficam no seu navegador. Os textos completos e as prévias precisam de internet.",
    category: "Referências",
  },
});

export const KANBAN_APP = tool(KANBAN_APP_ID, "Kanban", {
  slug: "kanban",
  launchPath: `/library/app/${KANBAN_APP_ID}/open`,
  publicPage: "/tools/kanban/index.html",
  description: "Quadros, listas e cartões para organizar a rotina, com o template Rotina Superprodutiva pronto para usar.",
  assets: art("/tools/kanban/art"),
  store: {
    tagline: "Quadros e rotinas com agenda, tabela e métricas.",
    eyebrow: "ORGANIZAÇÃO / ROTINA SUPERPRODUTIVA",
    headline: "Uma semana inteira\nem um só quadro.",
    features: [
      { title: "Quadro com arrastar e soltar", text: "Mova cartões entre os dias, reordene listas e crie blocos novos sem sair da tela." },
      { title: "Agenda semanal", text: "Os horários dos cartões viram uma grade de segunda a domingo, das 06h às 22h." },
      { title: "Tabela e métricas", text: "Veja todas as tarefas em planilha, exporte em CSV e acompanhe o equilíbrio da rotina." },
      { title: "Cartões completos", text: "Etiquetas, descrição, checklist com progresso, comentários e status de concluído." },
    ],
    steps: ["Adquira o Kanban e abra seu primeiro quadro.", "Comece pelo template Rotina Superprodutiva ou por um quadro em branco.", "Ajuste os blocos da semana e acompanhe pela agenda e pelas métricas."],
    about: [["Formato", "Quadro Kanban"], ["Template", "Rotina Superprodutiva"], ["Exportação", "JSON e CSV"]],
    dataNote: "Seus quadros ficam no seu banco do Kanban no LAB: só você lê e altera.",
    category: "Organização",
  },
});

export const PRANCHETA_APP = tool(PRANCHETA_APP_ID, "Prancheta", {
  slug: "prancheta",
  launchPath: `/library/app/${PRANCHETA_APP_ID}/open`,
  publicPage: "/tools/prancheta/index.html",
  description: "Editor de design no navegador: frames, formas, texto, camadas, componentes e exportação.",
  assets: art("/tools/prancheta/art"),
  store: {
    tagline: "Editor de design com canvas, camadas e exportação.",
    eyebrow: "DESIGN / CANVAS INFINITO",
    headline: "Do rascunho\nà tela final.",
    features: [
      { title: "Canvas sem limites", text: "Pan, zoom, seleção, encaixe, redimensionamento e rotação com guias inteligentes." },
      { title: "Formas, texto e imagens", text: "Frames, retângulos, elipses, polígonos, estrelas, setas, lápis e texto editável." },
      { title: "Camadas e componentes", text: "Páginas, árvore de camadas, grupos, auto layout básico, componentes e instâncias." },
      { title: "Exporte do seu jeito", text: "PNG, JPG e SVG, além de uma cópia do arquivo para guardar no computador." },
    ],
    steps: ["Adquira a Prancheta e abra o arquivo de boas-vindas.", "Desenhe com as ferramentas da barra inferior e organize as camadas.", "Exporte o resultado ou continue depois: tudo é salvo sozinho."],
    about: [["Formato", "Editor vetorial"], ["Atalhos", "Ctrl+K e Ctrl+Shift+?"], ["Exportação", "PNG, JPG, SVG e JSON"]],
    dataNote: "Seus arquivos ficam no seu banco da Prancheta no LAB: só você abre e edita.",
    category: "Design",
  },
});

export const AUTOMATION_APP = tool(AUTOMATION_APP_ID, "Automation", {
  slug: "automation",
  launchPath: `/library/app/${AUTOMATION_APP_ID}/open`,
  publicPage: "/tools/automation/index.html",
  description: "Monte integrações entre apps num canvas visual, teste a execução e acompanhe os resultados.",
  assets: art("/tools/automation/art"),
  store: {
    tagline: "Integrações visuais com execução simulada e dashboard.",
    eyebrow: "AUTOMAÇÃO / FLUXOS VISUAIS",
    headline: "Conecte os apps.\nDeixe o fluxo trabalhar.",
    features: [
      { title: "Editor visual de fluxo", text: "Nós arrastáveis, conexões, gatilhos, filtros, IA, mensagens, planilhas e requisições HTTP." },
      { title: "Construtor com IA", text: "Descreva a automação em português e receba um rascunho de integração pronto para ajustar." },
      { title: "Teste e acompanhe", text: "Rode o fluxo, veja cada módulo executar e consulte logs, gráficos e replays no dashboard." },
      { title: "Versões e templates", text: "Salve versões, restaure quando quiser e comece por templates do LAB." },
    ],
    steps: ["Adquira o Automation e crie sua primeira integração.", "Escolha um template, descreva para a IA ou monte módulo por módulo.", "Rode o teste e acompanhe as execuções no dashboard."],
    about: [["Formato", "Editor de integrações"], ["Execução", "Simulada no LAB"], ["Exportação", "Arquivo .json"]],
    dataNote: "Integrações, versões, execuções e conexões ficam no seu banco do Automation no LAB. Chaves de API nunca são gravadas.",
    category: "Automação",
  },
});

export const ACADEMY_APP = tool(ACADEMY_APP_ID, "Academy", {
  slug: "academy",
  launchPath: `/library/app/${ACADEMY_APP_ID}/open`,
  publicPage: "/tools/academy/index.html",
  description: "Aulas criadas pelo LAB: assista, marque o progresso, favorite, anote e converse com a turma.",
  assets: art("/tools/academy/art"),
  store: {
    tagline: "Cursos e aulas do LAB com progresso e comentários.",
    eyebrow: "FORMAÇÃO / AULAS DO LAB",
    headline: "Aprenda no ritmo\nde quem cria.",
    features: [
      { title: "Vitrine de cursos", text: "Cursos organizados em módulos e aulas, com destaque para o que você está assistindo." },
      { title: "Progresso de verdade", text: "Continue de onde parou e marque cada aula como concluída." },
      { title: "Favoritos e anotações", text: "Guarde as aulas que importam e escreva anotações que só você vê." },
      { title: "Comentários da turma", text: "Pergunte, responda e curta comentários de quem também está na Academy." },
    ],
    steps: ["Adquira a Academy e abra a vitrine.", "Escolha um curso e assista à primeira aula.", "Marque o progresso, anote e comente com a turma."],
    about: [["Formato", "Cursos em vídeo"], ["Conteúdo", "Criado pelo LAB"], ["Comunidade", "Comentários por aula"]],
    dataNote: "As aulas são do LAB. Seu progresso, favoritos e anotações são só seus; comentários são vistos pela turma da Academy.",
    category: "Formação",
  },
});

export const CLAQUETE_APP = tool(CLAQUETE_APP_ID, "Claquete", {
  slug: "claquete",
  launchPath: `/library/app/${CLAQUETE_APP_ID}/open`,
  publicPage: "/tools/claquete/index.html",
  description: "Plataforma de cinema e vídeo com IA: canvas infinito, roteiro, set 3D e editor de vídeo multi-trilha.",
  assets: art("/tools/claquete/art"),
  store: {
    tagline: "Do roteiro ao corte final num só canvas com IA.",
    eyebrow: "CINEMA & VÍDEO COM IA / DIREÇÃO AUDIOVISUAL",
    headline: "Crie filmes com IA\ndo rascunho à montagem.",
    features: [
      { title: "Canvas Infinito de Cinema", text: "Organize planos, cenas, referências, áudios e notas visuais com conexões inteligentes." },
      { title: "20 Ações de Geração e Agente", text: "Gere imagens, planos em vídeo, diálogos e efeitos sonoros com assistência do Agente Diretor." },
      { title: "Set 3D com Câmera Virtual", text: "Transforme fotos em cenários 3D, posicione personagens e ensaie movimentos cinematográficos reais." },
      { title: "Editor de Vídeo Multi-trilha", text: "Corte, transições, ajuste de velocidade, mixagem de áudio e exportação em vídeo de alta fidelidade." },
    ],
    steps: ["Adquira a Claquete e inicie um novo projeto cinematográfico.", "Monte o canvas com cenas, decupagem no roteiro ou bloqueio de câmera no Set 3D.", "Gere os planos com IA, monte na linha do tempo e exporte seu filme."],
    about: [["Formato", "Estúdio de cinema com IA"], ["Geração", "Higgsfield & OpenAI"], ["Exportação", "MP4, Canvas e Roteiro"]],
    dataNote: "Seus projetos, chats e decupagens ficam salvos no Supabase do LAB; mídias e renders são hospedados no Cloudflare R2.",
    category: "Cinema",
  },
});

/** Store order. */
export const TOOL_CATALOG: readonly LibraryApp[] = [
  CLAQUETE_APP,
  ACADEMY_APP,
  KANBAN_APP,
  PRANCHETA_APP,
  AUTOMATION_APP,
  PROMPT_LIBRARY_APP,
];

export function getRegisteredTool(appid: number): LibraryApp | undefined {
  return TOOL_CATALOG.find((app) => app.appid === appid);
}

export function getToolBySlug(slug: string): LibraryApp | undefined {
  return TOOL_CATALOG.find((app) => app.tool?.slug === slug);
}

export function toolArtUrl(appid: number, kind: ArtKind): string | undefined {
  const assets = getRegisteredTool(appid)?.tool?.assets;
  return assets?.[kind] ?? assets?.header;
}

/**
 * Adds the tools this person owns to the current source. Catalog tools they have not acquired
 * are removed, so a Steam snapshot can never bring one in either.
 */
export function registerTools(snapshot: LibrarySnapshot, owned: ReadonlySet<string>): LibrarySnapshot {
  const catalogIds = new Set(TOOL_CATALOG.map((app) => app.appid));
  return {
    ...snapshot,
    apps: [...TOOL_CATALOG.filter((app) => owned.has(app.tool!.slug)), ...snapshot.apps.filter((app) => !catalogIds.has(app.appid))],
  };
}
