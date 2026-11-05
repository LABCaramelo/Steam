/**
 * Um Cara Caramelo — Notificação de Novas Ferramentas no WhatsApp via UAZAPI
 *
 * Formata e dispara aviso no grupo oficial do LAB Caramelo sempre que
 * uma nova ferramenta for publicada ou adicionada à plataforma.
 * Dá tratamento especial e explícito para ferramentas em modo BETA.
 */

export interface ToolFeatureItem {
  title: string;
  text?: string;
}

export interface ToolNotificationData {
  slug: string;
  name: string;
  category?: string;
  tagline?: string;
  headline?: string;
  description?: string;
  features?: Array<ToolFeatureItem | string>;
  stage?: string; // ex: "beta", "stable", etc.
  publicPage?: string;
  customNote?: string;
}

export interface UazapiNotificationConfig {
  uazapiUrl: string;
  uazapiToken: string;
  groupJid: string;
}

export function getUazapiNotificationConfig(): UazapiNotificationConfig {
  if (typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile();
    } catch {
      // Ignora se arquivo .env não existir no ambiente
    }
  }

  return {
    uazapiUrl: (process.env.UAZAPI_URL || "").replace(/\/+$/, ""),
    uazapiToken: process.env.UAZAPI_TOKEN || "",
    groupJid: (process.env.UAZAPI_GROUP_JID || "").trim(),
  };
}

/**
 * Catálogo canônico de referência das ferramentas do LAB para notificações.
 */
export const KNOWN_LAB_TOOLS: Record<string, Partial<ToolNotificationData>> = {
  automation: {
    slug: "automation",
    name: "Trama",
    category: "Automação",
    stage: "beta",
    tagline: "Fluxos visuais com webhooks reais, histórico e conexões privadas.",
    description: "Conecte dados e aplicativos em fluxos visuais, execute ações e acompanhe cada resultado.",
    features: [
      { title: "Desenhe o caminho", text: "Conecte módulos, crie ramos e configure filtros no canvas visual." },
      { title: "Conexões e APIs", text: "Configure webhooks e APIs HTTP com credenciais protegidas." },
      { title: "Execuções e Replay", text: "Acompanhe saídas de cada etapa, histórico e replay em tempo real." },
    ],
    publicPage: "/tools/automation",
  },
  trama: {
    slug: "automation",
    name: "Trama",
    category: "Automação",
    stage: "beta",
    tagline: "Fluxos visuais com webhooks reais, histórico e conexões privadas.",
    description: "Conecte dados e aplicativos em fluxos visuais, execute ações e acompanhe cada resultado.",
    features: [
      { title: "Desenhe o caminho", text: "Conecte módulos, crie ramos e configure filtros no canvas visual." },
      { title: "Conexões e APIs", text: "Configure webhooks e APIs HTTP com credenciais protegidas." },
      { title: "Execuções e Replay", text: "Acompanhe saídas de cada etapa, histórico e replay em tempo real." },
    ],
    publicPage: "/tools/automation",
  },
  prancheta: {
    slug: "prancheta",
    name: "Prancheta",
    category: "Design",
    stage: "beta",
    tagline: "Editor de design no navegador com canvas, camadas e exportação.",
    description: "Editor de design no navegador: frames, formas, texto, camadas, componentes e exportação.",
    features: [
      { title: "Canvas sem limites", text: "Pan, zoom, guias inteligentes e encaixe de precisão." },
      { title: "Formas e Tipografia", text: "Frames, formas vetoriais, estilos e texto editável." },
      { title: "Exportação em alta", text: "Gere arquivos em PNG, JPG e cópias editáveis." },
    ],
    publicPage: "/tools/prancheta",
  },
  gabinete: {
    slug: "gabinete",
    name: "Gabinete",
    category: "Operações",
    stage: "beta",
    tagline: "Gestão editorial, equipe, aprovações de clientes por link e IA de bastidor.",
    description: "Centralize demandas, calendário editorial, aprovação de cliente por link, estúdio IA Nativo e inteligência de bastidor.",
    features: [
      { title: "Minhas Demandas & Equipe", text: "Visão diária de prazos, checklist de execução e filtros por colaborador." },
      { title: "Calendário Editorial", text: "Grade mensal de publicações, agendamentos e formatos (Reels, Carrossel, Stories)." },
      { title: "Aprovação por Link Seguro", text: "Compartilhamento com clientes via token sem login para aprovação com 1 clique." },
      { title: "Estúdio Nativo IA", text: "Geração de carrosséis com Método HEAD, roteiros em 5 passos e prompts oficiais." },
    ],
    publicPage: "/tools/gabinete",
  },
  "creative-os": {
    slug: "gabinete",
    name: "Gabinete",
    category: "Operações",
    stage: "beta",
    tagline: "Gestão editorial, equipe, aprovações de clientes por link e IA de bastidor.",
    description: "Centralize demandas, calendário editorial, aprovação de cliente por link, estúdio IA Nativo e inteligência de bastidor.",
    features: [
      { title: "Minhas Demandas & Equipe", text: "Visão diária de prazos, checklist de execução e filtros por colaborador." },
      { title: "Calendário Editorial", text: "Grade mensal de publicações, agendamentos e formatos (Reels, Carrossel, Stories)." },
      { title: "Aprovação por Link Seguro", text: "Compartilhamento com clientes via token sem login para aprovação com 1 clique." },
    ],
    publicPage: "/tools/gabinete",
  },
  claquete: {
    slug: "claquete",
    name: "Claquete",
    category: "Cinema & Vídeo IA",
    stage: "beta",
    tagline: "Do roteiro ao corte final num só canvas com IA cinematográfica.",
    description: "Plataforma de cinema e vídeo com IA: canvas infinito, roteiro, set 3D e editor de vídeo multi-trilha.",
    features: [
      { title: "Canvas Infinito de Cinema", text: "Organize planos, cenas, referências e áudios com conexões inteligentes." },
      { title: "Set 3D com Câmera Virtual", text: "Ensaie planos reais com lentes e movimentos de câmera cinematográficos." },
      { title: "Editor de Vídeo Multi-trilha", text: "Cortes, transições, ajuste de velocidade e mixagem de áudio." },
    ],
    publicPage: "/tools/claquete",
  },
  montagem: {
    slug: "montagem",
    name: "Montagem",
    category: "Audiovisual",
    stage: "beta",
    tagline: "Sua história, do primeiro corte ao vídeo final no navegador.",
    description: "Editor de vídeo do LAB: timeline com várias faixas, cortes, textos, legendas SRT e mixagem.",
    features: [
      { title: "Timeline Multi-faixas", text: "Importe mídias, apare clipes, aplique cortes e transições." },
      { title: "Legendas e Áudio", text: "Importe legendas SRT, adicione trilhas e faça ajustes finos de volume." },
      { title: "Exportação Direta", text: "Baixe seu vídeo montado direto no computador." },
    ],
    publicPage: "/tools/montagem",
  },
  gravador: {
    slug: "gravador",
    name: "No Ar",
    category: "Audiovisual",
    stage: "beta",
    tagline: "Estúdio web para compor cenas, capturar tela e câmera e transmitir ao vivo.",
    description: "Estúdio web para compor cenas, capturar tela e câmera, misturar áudio, gravar vídeos e transmitir por WHIP.",
    features: [
      { title: "Cenas no Navegador", text: "Componha tela, webcam, mídias e textos em um estúdio completo." },
      { title: "Preview & Program", text: "Prepare no preview e faça cortes suaves para o programa no ar." },
      { title: "Gravação & Transmissão WHIP", text: "Grave localmente ou transmita para serviços ao vivo compatíveis." },
    ],
    publicPage: "/tools/gravador",
  },
  kanban: {
    slug: "kanban",
    name: "Kanban",
    category: "Organização",
    stage: "beta",
    tagline: "Uma semana inteira em um só quadro com a Rotina Superprodutiva.",
    description: "Quadros, listas e cartões para organizar a rotina, com o template Rotina Superprodutiva pronto para usar.",
    features: [
      { title: "Rotina Superprodutiva", text: "Template estruturado para organizar dias, prioridades e foco." },
      { title: "Agenda Semanal", text: "Grade de horários integrada para visualizar o ritmo da semana." },
      { title: "Métricas de Execução", text: "Acompanhe equilíbrio de tempo e tarefas concluídas." },
    ],
    publicPage: "/tools/kanban",
  },
  academy: {
    slug: "academy",
    name: "Academy",
    category: "Formação",
    stage: "beta",
    tagline: "Aprenda no ritmo de quem cria: aulas práticas do LAB.",
    description: "Aulas criadas pelo LAB: assista, marque o progresso, favorite, anote e converse com a turma.",
    features: [
      { title: "Aulas de Alto Nível", text: "Aulas práticas com bastidores reais de criação e estratégia." },
      { title: "Progresso & Anotações", text: "Marque seu avanço e faça anotações sincronizadas à sua conta." },
    ],
    publicPage: "/tools/academy",
  },
  comunidade: {
    slug: "comunidade",
    name: "Comunidade",
    category: "Comunicação",
    stage: "beta",
    tagline: "Canais de texto e salas de voz em tempo real entre membros do LAB.",
    description: "Canais de texto, voz em tempo real, compartilhamento de tela e conexão direta entre membros do LAB.",
    features: [
      { title: "Salas de Voz em Tempo Real", text: "Converse, troque ideias e compartilhe a tela via WebRTC." },
      { title: "Canais Temáticos", text: "Discussões organizadas por projetos, ferramentas e referências." },
    ],
    publicPage: "/tools/comunidade",
  },
  "prompt-library": {
    slug: "prompt-library",
    name: "Biblioteca de Prompts",
    category: "Referências",
    stage: "stable",
    tagline: "Menos página em branco. Mais ideias em ação.",
    description: "Encontre, organize e copie prompts para criar com inteligência artificial.",
    features: [
      { title: "Acervo Curado", text: "Centenas de referências de arte, UI e direção criativa testadas." },
      { title: "Copie com 1 Clique", text: "Textos estruturados prontos para rodar nas IAs mais avançadas." },
    ],
    publicPage: "/tools/prompt-library",
  },
};

/**
 * Mescla dados da ferramenta com o catálogo conhecido do LAB.
 */
export function buildToolNotificationData(
  input: Partial<ToolNotificationData> & { slug: string; name?: string }
): ToolNotificationData {
  const normSlug = input.slug.toLowerCase().trim();
  const known = KNOWN_LAB_TOOLS[normSlug] || {};

  return {
    slug: input.slug,
    name: input.name || known.name || input.slug,
    category: input.category || known.category || "Criação",
    tagline: input.tagline || known.tagline || known.description || "",
    headline: input.headline || known.headline || "",
    description: input.description || known.description || "",
    features: input.features || known.features || [],
    stage: input.stage || known.stage || "stable",
    publicPage: input.publicPage || known.publicPage || `/tools/${input.slug}`,
    customNote: input.customNote || "",
  };
}

/**
 * Formata a mensagem de anúncio da ferramenta com voz Caramelo para envio no WhatsApp.
 * Se a ferramenta estiver em modo BETA, inclui destaque enfático e aviso
 * obrigatório de que ferramentas em modo beta são exclusivas para usuários beta.
 */
export function formatNewToolMessage(
  tool: ToolNotificationData,
  options: { baseUrl?: string } = {}
): string {
  const baseUrl = options.baseUrl || "https://www.umcaracaramelo.com.br";
  const isBeta = tool.stage?.toLowerCase() === "beta";
  const stageBadge = tool.stage ? ` [${tool.stage.toUpperCase()}]` : "";
  const categoryBadge = tool.category ? ` (${tool.category})` : "";

  let header = "";
  if (isBeta) {
    header = `🐕⚡🧪 *NOVA FERRAMENTA EM MODO BETA LIBERADA NO LAB!* [BETA]\n\n` +
      `Acabamos de publicar uma nova ferramenta na plataforma: *${tool.name}*${categoryBadge}! 🛠️✨\n\n` +
      `⚠️ *ACESSO EXCLUSIVO: FERRAMENTA EM MODO BETA*\n` +
      `Esta ferramenta foi lançada em *modo BETA* (fase experimental). ` +
      `As ferramentas em modo beta são liberadas *apenas para usuários com acesso Beta no LAB*.\n\n` +
      `• *Se você é usuário Beta*: seu acesso já está liberado para testar e validar em primeira mão!\n` +
      `• *Demais membros do LAB:* a ferramenta está em testes e refinamento junto aos usuários beta, e em breve será liberada em versão estável para toda a comunidade.`;
  } else {
    header = `🐕⚡ *NOVA FERRAMENTA LIBERADA NO LAB!*${stageBadge}\n\n` +
      `Acabamos de subir uma nova ferramenta para a plataforma: *${tool.name}*${categoryBadge}! 🛠️✨`;
  }

  let taglineBlock = "";
  if (tool.tagline && tool.tagline.trim()) {
    taglineBlock = `\n\n_${tool.tagline.trim()}_`;
  }

  let noteBlock = "";
  if (tool.customNote && tool.customNote.trim()) {
    noteBlock = `\n\n📌 *Recado do Luiz:*\n${tool.customNote.trim()}`;
  }

  let featuresBlock = "";
  if (Array.isArray(tool.features) && tool.features.length > 0) {
    const titlePrefix = isBeta ? "O que os usuários beta vão encontrar nela" : "O que você pode fazer com ela";
    const lines = tool.features.slice(0, 4).map((f) => {
      if (typeof f === "string") return `• ${f}`;
      const title = f.title ? `*${f.title}:* ` : "";
      return `• ${title}${f.text || ""}`;
    });
    featuresBlock = `\n\n📦 *${titlePrefix}:*\n` + lines.join("\n");
  }

  const pagePath = tool.publicPage || `/tools/${tool.slug}`;
  const directLink = `${baseUrl}${pagePath.startsWith("/") ? "" : "/"}${pagePath}`;
  const storeLink = `${baseUrl}/app.html#/store`;

  let footer = "";
  if (isBeta) {
    footer = `\n\n👉 *Se você tem acesso Beta, acesse agora no LAB para testar:*\n` +
      `🔗 ${directLink}\n` +
      `🏪 Ou confira na Loja do LAB: ${storeLink}\n\n` +
      `💬 *Usuários Beta: testem sem moderação e mandem todas as dúvidas, impressões e bugs aqui no grupo para lapidarmos juntos!* 🚀☕`;
  } else {
    footer = `\n\n👉 *Acesse agora no LAB e coloque a mão na massa:*\n` +
      `🔗 ${directLink}\n` +
      `🏪 Ou confira na Loja do LAB: ${storeLink}\n\n` +
      `💬 *Bora testar! Quem for usando, manda o feedback, dúvidas e o que você criou aqui no grupo!* 🚀☕`;
  }

  return `${header}${taglineBlock}${noteBlock}${featuresBlock}${footer}`;
}

/**
 * Envia o aviso de nova ferramenta para o grupo oficial do LAB via UAZAPI.
 */
export async function sendNewToolNotification(
  config: UazapiNotificationConfig,
  toolInput: Partial<ToolNotificationData> & { slug: string; name?: string },
  options: { baseUrl?: string } = {}
): Promise<{ success: boolean; tool: ToolNotificationData; message: string; response?: unknown }> {
  if (!config.uazapiUrl || !config.uazapiToken || !config.groupJid) {
    throw new Error(
      "Configuração da UAZAPI incompleta (UAZAPI_URL, UAZAPI_TOKEN ou UAZAPI_GROUP_JID ausentes)."
    );
  }

  const tool = buildToolNotificationData(toolInput);
  const messageText = formatNewToolMessage(tool, options);

  const payload = {
    number: config.groupJid,
    text: messageText,
  };

  const response = await fetch(`${config.uazapiUrl}/send/text`, {
    method: "POST",
    headers: {
      token: config.uazapiToken,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`UAZAPI /send/text falhou (${response.status}): ${errText}`);
  }

  const data = await response.json().catch(() => ({}));
  return { success: true, tool, message: messageText, response: data };
}
