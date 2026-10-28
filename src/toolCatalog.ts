import type { ArtKind, LibraryApp, LibrarySnapshot, ToolMetadata } from "./types";
import { supabase } from "./supabase";

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
export const COMUNIDADE_APP_ID = 7;

const art = (root: string): ToolMetadata["assets"] => ({
  capsule: `${root}/capsule.svg`,
  hero: `${root}/hero.svg`,
  heroBlur: `${root}/hero.svg`,
  header: `${root}/header.svg`,
  icon: `${root}/icon.svg`,
});

function tool(appid: number, name: string, meta: Omit<ToolMetadata, "available"> & { available?: boolean }): LibraryApp {
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
    tool: { available: false, ...meta },
  };
}

export const PROMPT_LIBRARY_APP = tool(PROMPT_LIBRARY_APP_ID, "Biblioteca de prompts", {
  slug: "prompt-library",
  available: true,
  launchPath: `/library/app/${PROMPT_LIBRARY_APP_ID}/open`,
  publicPage: "/tools/prompt-library/index.html",
  description: "Encontre, organize e copie prompts para criar com inteligência artificial.",
  assets: art("/tools/prompt-library/art"),
  store: {
    tagline: "Prompts para interfaces, motion e design.",
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
  available: true,
  stage: "beta",
  launchPath: `/library/app/${PRANCHETA_APP_ID}/open`,
  publicPage: "/tools/prancheta/index.html",
  description: "Editor de design no navegador: frames, formas, texto, camadas, componentes e exportação.",
  assets: art("/tools/prancheta/art"),
  store: {
    tagline: "Editor de design com canvas, camadas e exportação.",
    eyebrow: "DESIGN / CANVAS INFINITO / VERSÃO BETA",
    headline: "Do rascunho\nà tela final.",
    features: [
      { title: "Canvas sem limites", text: "Pan, zoom, seleção, encaixe, redimensionamento e rotação com guias inteligentes." },
      { title: "Formas, texto e imagens", text: "Frames, retângulos, elipses, polígonos, estrelas, setas, lápis e texto editável." },
      { title: "Camadas e componentes", text: "Páginas, árvore de camadas, grupos, auto layout básico, componentes e instâncias." },
      { title: "Exporte do seu jeito", text: "PNG, JPG e SVG, além de uma cópia do arquivo para guardar no computador." },
    ],
    steps: ["Adquira a Prancheta e abra o arquivo de boas-vindas.", "Desenhe com as ferramentas da barra inferior e organize as camadas.", "Exporte o resultado ou continue depois: tudo é salvo sozinho."],
    about: [["Formato", "Editor vetorial"], ["Versão", "Beta"], ["Atalhos", "Ctrl+K e Ctrl+Shift+?"], ["Exportação", "PNG, JPG e SVG"]],
    dataNote: "Seus arquivos ficam no seu banco da Prancheta no LAB: só você abre e edita.",
    category: "Design",
  },
});

export const AUTOMATION_APP = tool(AUTOMATION_APP_ID, "Trama", {
  slug: "automation",
  available: true,
  stage: "beta",
  launchPath: `/library/app/${AUTOMATION_APP_ID}/open`,
  publicPage: "/tools/automation/index.html",
  description: "Conecte dados e aplicativos em fluxos visuais, execute ações e acompanhe cada resultado.",
  assets: art("/tools/automation/art"),
  store: {
    tagline: "Fluxos visuais com execução manual real, histórico e conexões privadas.",
    eyebrow: "AUTOMAÇÃO / FLUXOS EM AÇÃO / BETA",
    headline: "Uma ideia.\nVários caminhos.",
    features: [
      { title: "Desenhe o caminho", text: "Conecte módulos, crie ramos, configure filtros e organize a lógica no canvas." },
      { title: "Crie com suas conexões", text: "Configure APIs HTTP e provedores de IA com credenciais protegidas no servidor." },
      { title: "Execute e acompanhe", text: "Rode manualmente, veja a saída de cada etapa e consulte histórico e replay." },
      { title: "Continue de onde parou", text: "Salve versões do fluxo e mantenha tudo sincronizado na sua conta." },
    ],
    steps: ["Adquira a Trama e abra seu espaço privado.", "Crie seu fluxo visual e conecte seus módulos e regras.", "Revise a entrada, execute manualmente e acompanhe o resultado."],
    about: [["Formato", "Editor de integrações"], ["Execução", "Manual · até 30 segundos"], ["Exportação", "JSON"], ["Versão", "Beta"]],
    dataNote: "Fluxos, versões e histórico de execuções ficam protegidos no Supabase. Ações reais podem gerar custos nos provedores conectados. Agendamentos, webhooks externos e execução de JavaScript ainda não estão disponíveis.",
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

export const COMUNIDADE_APP = tool(COMUNIDADE_APP_ID, "Comunidade", {
  slug: "comunidade",
  launchPath: `/library/app/${COMUNIDADE_APP_ID}/open`,
  publicPage: "/tools/comunidade/index.html",
  description: "Canais de texto, voz em tempo real, compartilhamento de tela e conexão direta entre membros do LAB.",
  assets: art("/tools/comunidade/art"),
  store: {
    tagline: "Canais de texto e salas de voz em tempo real.",
    eyebrow: "CONEXÃO / COMUNIDADE EM TEMPO REAL",
    headline: "Voz, canais\ne conexões.",
    features: [
      { title: "Salas de voz de verdade", text: "Converse em tempo real via WebRTC, compartilhe a tela e transmita vídeo com quem estiver no LAB." },
      { title: "Canais e categorias", text: "Espaços organizados para discussões, dúvidas, anúncios e troca de referências." },
      { title: "Mensagens diretas e amigos", text: "Converse no privado, adicione amigos e acompanhe o status de quem está on-line." },
      { title: "Navegação rápida", text: "Atalho Ctrl+K para pular direto entre canais, servidores e conversas sem tirar a mão do teclado." },
    ],
    steps: ["Adquira a Comunidade na Loja e abra pelo LAB.", "Explore os canais de texto e conecte-se aos membros.", "Entre num canal de voz para trocar ideias e compartilhar a tela."],
    about: [["Formato", "Canais de texto e voz"], ["Áudio e vídeo", "WebRTC em tempo real"], ["Navegação", "Atalho Ctrl+K"]],
    dataNote: "Canais de voz e vídeo conectam em tempo real. Suas mensagens e preferências locais ficam no seu navegador.",
    category: "Comunicação",
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

export const ADMIN_APP_ID = 8;
export const GRAVADOR_APP_ID = 9;
export const MONTAGEM_APP_ID = 10;
export const CREATIVE_OS_APP_ID = 11;

export const MONTAGEM_APP = tool(MONTAGEM_APP_ID, "Montagem", {
  slug: "montagem", available: true, stage: "beta",
  launchPath: `/library/app/${MONTAGEM_APP_ID}/open`,
  publicPage: "/tools/montagem/index.html",
  description: "Editor de vídeo do LAB: timeline com várias faixas, cortes, textos, legendas SRT, ajustes de imagem e mixagem de áudio.",
  assets: art("/tools/montagem/art"),
  store: {
    tagline: "Sua história, do primeiro corte ao vídeo final.",
    eyebrow: "VÍDEO / EDIÇÃO NO NAVEGADOR / BETA",
    headline: "Crie. Corte.\nConte.",
    features: [
      {title:"Uma timeline para suas ideias",text:"Importe vídeos, imagens e áudios. Apare, divida, duplique e organize clipes em várias faixas."},
      {title:"A imagem do seu jeito",text:"Ajuste proporção, posição, escala, rotação, cores, velocidade e transições."},
      {title:"Dê voz à sua história",text:"Adicione textos, importe legendas SRT e misture trilhas com volume e fades por clipe."},
      {title:"Exporte e publique",text:"Baixe seu vídeo com áudio em WebM ou MP4, conforme os codecs disponíveis no navegador."},
    ],
    steps:["Abra a Montagem e importe suas mídias.","Monte a sequência, corte os clipes e ajuste textos, cor e som.","Exporte o vídeo e baixe o resultado no computador."],
    about:[["Formato","Editor de vídeo web"],["Versão","Beta"],["Legendas","Importação SRT"],["Exportação","WebM / MP4 conforme o navegador"]],
    dataNote:"Projetos e arquivos são salvos neste navegador, separados por conta. A exportação ocorre em tempo real. Não há sincronização na nuvem nem transcrição automática.",
    category:"Audiovisual",
  },
});

export const GRAVADOR_APP = tool(GRAVADOR_APP_ID, "No Ar", {
  slug: "gravador",
  available: true,
  stage: "beta",
  launchPath: `/library/app/${GRAVADOR_APP_ID}/open`,
  publicPage: "/tools/gravador/index.html",
  description: "Estúdio web para compor cenas, capturar tela e câmera, misturar áudio, gravar vídeos e transmitir por WHIP.",
  assets: art("/tools/gravador/art"),
  store: {
    tagline: "Seu próximo programa começa aqui.",
    eyebrow: "AUDIOVISUAL / GRAVAÇÃO E TRANSMISSÃO / BETA",
    headline: "Sua ideia.\nNo Ar.",
    features: [
      { title: "Monte seu estúdio", text: "Organize cenas com tela, webcam, arquivos de mídia, texto e cor. Posicione e ajuste cada fonte no canvas." },
      { title: "Prepare antes de entrar", text: "Use PREVIEW e PROGRAM para ensaiar a próxima cena e fazer cortes ou transições durante o programa." },
      { title: "Cuide do som", text: "Misture microfone e áudio das fontes com volumes independentes, mute e medidores em tempo real." },
      { title: "Grave ou transmita", text: "Baixe a gravação em WebM ou MP4 conforme o navegador. Transmita por um endpoint WHIP HTTPS de serviço externo compatível." },
    ],
    steps: [
      "Adquira o No Ar e abra seu estúdio pelo LAB.",
      "Monte suas cenas e autorize as capturas que quiser usar.",
      "Prepare no PREVIEW, envie ao PROGRAM e grave ou conecte seu serviço WHIP.",
    ],
    about: [
      ["Formato", "Estúdio de gravação e transmissão web"],
      ["Versão", "Beta"],
      ["Exportação", "WebM / MP4 conforme o navegador"],
      ["Transmissão", "WHIP HTTPS com serviço externo"],
    ],
    dataNote: "Configurações ficam neste navegador, separadas por conta; mídias precisam ser adicionadas novamente. Gravações são locais. A transmissão envia áudio e vídeo ao serviço WHIP escolhido; o token fica só na sessão. Captura, codecs e CORS dependem do navegador e do serviço. Sem sincronização de mídia na nuvem ou RTMP nativo.",
    category: "Audiovisual",
  },
});

export const ADMIN_APP = tool(ADMIN_APP_ID, "Administração do LAB", {
  slug: "admin",
  launchPath: `/library/app/${ADMIN_APP_ID}/open`,
  publicPage: "/tools/admin/index.html",
  available: true,
  adminOnly: true,
  description: "Painel de controle e governança do LAB: métricas gerais, gestão do catálogo de ferramentas, publicação e controle de membros.",
  assets: art("/tools/admin/art"),
  store: {
    tagline: "Gestão completa de usuários, ferramentas e métricas do LAB.",
    eyebrow: "SISTEMA / EXCLUSIVO PARA ADMINISTRADORES",
    headline: "Visão geral e controle\ndo ecossistema LAB.",
    features: [
      { title: "Dashboard Geral", text: "Métricas em tempo real de usuários cadastrados, membros ativos e aquisições." },
      { title: "Publicar e Despublicar", text: "Alterne a disponibilidade de cada ferramenta na Loja com um clique." },
      { title: "Gestão de Ferramentas", text: "Configure nomes, preços, categorias e acompanhe o número de usuários em cada ferramenta." },
      { title: "Controle de Usuários", text: "Pesquise membros, visualize perfis, confira ferramentas ativas e defina cargos de administrador." },
    ],
    steps: [
      "Acesse o painel com sua conta de administrador.",
      "Acompanhe métricas ou selecione a aba de ferramentas e membros.",
      "Publique ou configure os recursos do LAB em tempo real.",
    ],
    about: [["Formato", "Painel Administrativo"], ["Acesso", "Exclusivo Administradores"], ["Segurança", "Row Level Security e RPCs"]],
    dataNote: "Operações administrativas são auditadas e protegidas pelo banco do Supabase.",
    category: "Administração",
  },
});

export const CREATIVE_OS_APP = tool(CREATIVE_OS_APP_ID, "Creative OS", {
  slug: "creative-os",
  available: true,
  stage: "beta",
  launchPath: `/library/app/${CREATIVE_OS_APP_ID}/open`,
  publicPage: "/tools/creative-os/index.html",
  description: "Sistema operacional para estúdios e Heads de Conteúdo: clientes, contexto de marca, projetos, tarefas, calendário editorial e aprovações com o cliente.",
  assets: art("/tools/creative-os/art"),
  store: {
    tagline: "Do contexto de marca à entrega aprovada.",
    eyebrow: "OPERAÇÕES / WORKSPACE B2B / VERSÃO BETA",
    headline: "Menos ferramenta.\nMais sistema.",
    features: [
      { title: "CRM & Gestão de Clientes", text: "Clientes, contatos, pipeline de oportunidades e histórico estratégico em um só lugar." },
      { title: "Ficha Estratégica da Marca", text: "Propósito, oferta, posicionamento, tom de voz, personas, diretrizes e restrições canônicas." },
      { title: "Projetos, Tarefas & Calendário", text: "Templates de gestão mensal e campanhas, tarefas em lista/kanban e grade editorial de entregas." },
      { title: "Revisão & Portal do Cliente", text: "Compartilhamento seguro de entregas com histórico de versões, comentários e aprovação imutável." },
    ],
    steps: [
      "Adquira o Creative OS e crie seu primeiro estúdio (workspace).",
      "Cadastre seu primeiro cliente e preencha a ficha estratégica da marca.",
      "Inicie um projeto por template, planeje o calendário e convide o cliente para aprovar.",
    ],
    about: [
      ["Formato", "Creative OS / Workspace B2B"],
      ["Versão", "Beta"],
      ["Aprovações", "Versões imutáveis e portal do cliente"],
      ["Design System", "Caramelo MCP V1"],
    ],
    dataNote: "Workspaces, clientes, contexto de marca, projetos e aprovações ficam salvos no Supabase com isolamento total por conta.",
    category: "Operações",
  },
});

export const TOOL_CATALOG: readonly LibraryApp[] = [
  PROMPT_LIBRARY_APP,
  ADMIN_APP,
  COMUNIDADE_APP,
  CREATIVE_OS_APP,
  CLAQUETE_APP,
  GRAVADOR_APP,
  MONTAGEM_APP,
  ACADEMY_APP,
  KANBAN_APP,
  PRANCHETA_APP,
  AUTOMATION_APP,
];

export interface DynamicToolMeta {
  name?: string;
  available?: boolean;
  price_cents?: number;
  custom_assets?: Record<string, string | undefined>;
}

let dynamicToolMetaByAppId: Record<number, DynamicToolMeta> = {};
const catalogChangeListeners = new Set<() => void>();

export function getDynamicToolMeta(appid: number): DynamicToolMeta | undefined {
  return dynamicToolMetaByAppId[appid];
}

export function setDynamicToolMeta(map: Record<number, DynamicToolMeta>) {
  dynamicToolMetaByAppId = { ...dynamicToolMetaByAppId, ...map };
  catalogChangeListeners.forEach((fn) => fn());
}

export function updateDynamicToolMeta(appid: number, patch: Partial<DynamicToolMeta>) {
  dynamicToolMetaByAppId = {
    ...dynamicToolMetaByAppId,
    [appid]: { ...dynamicToolMetaByAppId[appid], ...patch },
  };
  catalogChangeListeners.forEach((fn) => fn());
}

export function subscribeToolCatalog(listener: () => void): () => void {
  catalogChangeListeners.add(listener);
  return () => {
    catalogChangeListeners.delete(listener);
  };
}

// Backward compatibility alias for banners
export const subscribeCustomToolAssets = subscribeToolCatalog;

export function setCustomToolAssets(assetsMap: Record<number, Record<string, string | undefined>>) {
  const metaMap: Record<number, DynamicToolMeta> = {};
  for (const [appidStr, assets] of Object.entries(assetsMap)) {
    const appid = Number(appidStr);
    metaMap[appid] = {
      ...(dynamicToolMetaByAppId[appid] || {}),
      custom_assets: assets,
    };
  }
  setDynamicToolMeta(metaMap);
}

export function updateCustomToolAssets(appid: number, assets: Record<string, string | undefined>) {
  updateDynamicToolMeta(appid, { custom_assets: assets });
}

export function getCustomToolAssets(appid: number): Record<string, string | undefined> | undefined {
  return dynamicToolMetaByAppId[appid]?.custom_assets;
}

export function applyToolOverrides(app: LibraryApp): LibraryApp {
  const meta = dynamicToolMetaByAppId[app.appid];
  if (!meta) return app;
  return {
    ...app,
    name: meta.name?.trim() ? meta.name : app.name,
    tool: app.tool
      ? {
          ...app.tool,
          available: meta.available !== undefined ? meta.available : app.tool.available,
          price_cents: meta.price_cents !== undefined ? meta.price_cents : app.tool.price_cents,
        }
      : undefined,
  };
}

export function getRegisteredTool(appid: number): LibraryApp | undefined {
  const base = TOOL_CATALOG.find((app) => app.appid === appid);
  return base ? applyToolOverrides(base) : undefined;
}

export function getToolBySlug(slug: string): LibraryApp | undefined {
  const base = TOOL_CATALOG.find((app) => app.tool?.slug === slug);
  return base ? applyToolOverrides(base) : undefined;
}

export function getCatalogApps(isAdmin = false): LibraryApp[] {
  return TOOL_CATALOG
    .filter((app) => !app.tool?.adminOnly || isAdmin)
    .map(applyToolOverrides);
}

export async function syncCustomToolAssets(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("lab_tools")
      .select("appid, slug, name, available, price_cents, custom_assets");
    if (!error && Array.isArray(data)) {
      const metaMap: Record<number, DynamicToolMeta> = {};
      for (const row of data) {
        if (row.appid) {
          metaMap[row.appid] = {
            name: row.name || undefined,
            available: typeof row.available === "boolean" ? row.available : undefined,
            price_cents: typeof row.price_cents === "number" ? row.price_cents : undefined,
            custom_assets: (row.custom_assets && typeof row.custom_assets === "object") ? row.custom_assets : undefined,
          };
        }
      }
      setDynamicToolMeta(metaMap);
    }
  } catch {
    // Modo offline / fallback
  }
}

// Inicia sincronização imediatamente
syncCustomToolAssets();

export function toolArtUrl(appid: number, kind: ArtKind): string | undefined {
  const custom = dynamicToolMetaByAppId[appid]?.custom_assets;
  if (custom) {
    if (kind === "heroBlur") {
      if (custom.heroBlur) return custom.heroBlur;
      if (custom.hero) return custom.hero;
    } else if (custom[kind]) {
      return custom[kind];
    }
  }
  const assets = getRegisteredTool(appid)?.tool?.assets;
  return assets?.[kind] ?? assets?.header;
}

/**
 * Adds the tools this person owns to the current source. Catalog tools they have not acquired
 * are removed, so a Steam snapshot can never bring one in either.
 */
export function registerTools(snapshot: LibrarySnapshot, owned: ReadonlySet<string>, isAdmin = false): LibrarySnapshot {
  const dynamicCatalog = getCatalogApps(isAdmin);
  const catalogIds = new Set(dynamicCatalog.map((app) => app.appid));
  return {
    ...snapshot,
    apps: [
      ...dynamicCatalog.filter((app) => owned.has(app.tool!.slug)),
      ...snapshot.apps.filter((app) => !catalogIds.has(app.appid)),
    ],
  };
}
