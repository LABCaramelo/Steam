import type { DirectMessage, Message, Server, User } from './types';

export const ME = 'u-me';

export const users: Record<string, User> = {
  'u-me': {
    id: 'u-me',
    name: 'luiz',
    nickname: 'caramelo',
    color: '#7657FF',
    status: 'online',
    activity: 'No LAB Caramelo',
    roleName: 'Head de Criação',
    roleColor: '#FF701A',
    bio: 'elegância + pequena confissão patética',
    tools: ['Administração do LAB', 'Biblioteca de prompts', 'Prancheta', 'Kanban', 'Claquete'],
    achievements: ['Admin Supremo', 'Mestre dos Prompts', 'Primeiro Traço'],
    joinedAt: 'Outubro de 2026',
  },
  'u-ana': {
    id: 'u-ana',
    name: 'Ana',
    nickname: 'anacriativa',
    color: '#FF701A',
    status: 'online',
    activity: 'Criando com IA',
    roleName: 'Head de Criação',
    roleColor: '#FF701A',
    bio: 'Diretora de arte e pesquisadora de prompts generativos para interfaces.',
    tools: ['Biblioteca de prompts', 'Prancheta', 'Academy'],
    achievements: ['Explorador Inicial', 'Colecionador de Prompts'],
    joinedAt: 'Setembro de 2026',
  },
  'u-bruno': {
    id: 'u-bruno',
    name: 'Bruno',
    nickname: 'brunouix',
    color: '#FFD52A',
    status: 'idle',
    activity: 'Ausente por alguns minutos',
    roleName: 'Membro',
    roleColor: '#D9D3CC',
    bio: 'UI/UX Designer apaixonado por design systems, grids e acessibilidade.',
    tools: ['Prancheta', 'Kanban'],
    achievements: ['Explorador Inicial'],
    joinedAt: 'Outubro de 2026',
  },
  'u-carla': {
    id: 'u-carla',
    name: 'Carla',
    nickname: 'carlamotion',
    color: '#25BFFF',
    status: 'dnd',
    activity: 'Animando no Motion',
    roleName: 'LAB Pro',
    roleColor: '#25BFFF',
    bio: 'Motion designer, keyframing, timing de ação e direção de vídeo no LAB.',
    tools: ['Prancheta', 'Claquete', 'Automation'],
    achievements: ['Mestre do Fluxo', 'Criador Contínuo'],
    joinedAt: 'Outubro de 2026',
  },
  'u-diego': {
    id: 'u-diego',
    name: 'Diego',
    nickname: 'diegodev',
    color: '#FF3D8D',
    status: 'online',
    activity: 'Explorando Prompts',
    roleName: 'Membro',
    roleColor: '#D9D3CC',
    bio: 'Desenvolvedor front-end experimentando novos fluxos visuais e IA.',
    tools: ['Kanban', 'Biblioteca de prompts'],
    achievements: ['Primeiro Traço'],
    joinedAt: 'Outubro de 2026',
  },
  'u-eva': {
    id: 'u-eva',
    name: 'Eva',
    nickname: 'evacreative',
    color: '#22C55E',
    status: 'offline',
    roleName: 'Membro',
    roleColor: '#D9D3CC',
    bio: 'Redatora estratégica e estrategista de narrativas de marca.',
    tools: ['Biblioteca de prompts', 'Academy'],
    achievements: ['Primeiro Traço'],
    joinedAt: 'Outubro de 2026',
  },
  'u-felipe': {
    id: 'u-felipe',
    name: 'Felipe',
    nickname: 'felipelab',
    color: '#7657FF',
    status: 'offline',
    roleName: 'Membro',
    roleColor: '#D9D3CC',
    bio: 'Estudante da Formação Head, criando automações para conteúdo.',
    tools: ['Automation', 'Kanban'],
    achievements: ['Primeiro Traço'],
    joinedAt: 'Outubro de 2026',
  },
  'u-bot': {
    id: 'u-bot',
    name: 'CarameloBot',
    nickname: 'caramelobot',
    color: '#FF701A',
    status: 'online',
    bot: true,
    activity: 'Gerenciando comunidade do LAB',
    roleName: 'Bot Oficial',
    roleColor: '#FF701A',
    bio: 'Inteligência operacional e orquestrador do LAB Caramelo.',
    tools: ['Automation', 'Administração do LAB'],
    achievements: ['Zero Erros', 'Sempre Online'],
    joinedAt: 'Agosto de 2026',
  },
};

const t = (minutesAgo: number) => Date.now() - minutesAgo * 60_000;

export const servers: Server[] = [
  {
    id: 's-dev',
    name: 'LAB Caramelo',
    acronym: 'LAB',
    color: '#7657FF',
    roles: [
      { id: 'r-admin', name: 'Head de Criação', color: '#FF701A', members: ['u-me', 'u-ana'] },
      { id: 'r-mod', name: 'LAB Pro', color: '#25BFFF', members: ['u-carla'] },
      { id: 'r-bots', name: 'Bots', color: '#FF701A', members: ['u-bot'] },
      { id: 'r-membro', name: 'Membro', color: '#D9D3CC', members: ['u-bruno', 'u-diego', 'u-eva', 'u-felipe'] },
    ],
    categories: [
      {
        id: 'c-info',
        name: 'Informações',
        channels: [
          { id: 'ch-regras', name: 'regras', kind: 'text', topic: 'Diretrizes da comunidade e boas práticas.' },
          { id: 'ch-anuncios', name: 'anúncios', kind: 'announcement', topic: 'Novidades e atualizações do LAB.' },
        ],
      },
      {
        id: 'c-texto',
        name: 'Canais de texto',
        channels: [
          { id: 'ch-geral', name: 'geral', kind: 'text', topic: 'Papo livre sobre criação, inteligência artificial e design.' },
          { id: 'ch-frontend', name: 'prompts-e-ia', kind: 'text', topic: 'Compartilhe prompts, imagens e ideias geradas.' },
          { id: 'ch-backend', name: 'design-e-motion', kind: 'text', topic: 'Interfaces, tipografia, animação e referências visuais.' },
          { id: 'ch-memes', name: 'feedback', kind: 'text', topic: 'Mostre seu trabalho e receba feedback da comunidade.' },
        ],
      },
      {
        id: 'c-voz',
        name: 'Canais de voz',
        channels: [
          { id: 'ch-lounge', name: 'Lounge Caramelo', kind: 'voice' },
          { id: 'ch-pair', name: 'Coworking Silencioso', kind: 'voice' },
        ],
      },
    ],
  },
  {
    id: 's-games',
    name: 'Formação Head',
    acronym: 'FH',
    color: '#FF701A',
    roles: [
      { id: 'r-dono', name: 'Mentor', color: '#FF701A', members: ['u-ana'] },
      { id: 'r-player', name: 'Alunos', color: '#D9D3CC', members: ['u-me', 'u-diego', 'u-bruno', 'u-felipe'] },
    ],
    categories: [
      {
        id: 'c-g-texto',
        name: 'Aulas & Prática',
        channels: [
          { id: 'ch-g-geral', name: 'discussão', kind: 'text', topic: 'Dúvidas e reflexões dos módulos.' },
          { id: 'ch-g-clips', name: 'estudos-de-caso', kind: 'text', topic: 'Análise de conteúdos e campanhas.' },
        ],
      },
      {
        id: 'c-g-voz',
        name: 'Voz & Mentorias',
        channels: [
          { id: 'ch-g-squad', name: 'Sala de Mentoria', kind: 'voice' },
          { id: 'ch-g-afk', name: 'Pausa para Café', kind: 'voice' },
        ],
      },
    ],
  },
  {
    id: 's-estudos',
    name: 'Laboratório Criativo',
    acronym: 'LC',
    color: '#25BFFF',
    roles: [
      { id: 'r-prof', name: 'Líder de Projeto', color: '#25BFFF', members: ['u-carla'] },
      { id: 'r-aluno', name: 'Criadores', color: '#D9D3CC', members: ['u-me', 'u-eva', 'u-bruno'] },
    ],
    categories: [
      {
        id: 'c-e-texto',
        name: 'Projetos',
        channels: [
          { id: 'ch-e-duvidas', name: 'experimentos', kind: 'text', topic: 'Testes de novas ferramentas e modelos.' },
          { id: 'ch-e-material', name: 'referências', kind: 'text', topic: 'Acervo e links úteis.' },
        ],
      },
      {
        id: 'c-e-voz',
        name: 'Salas',
        channels: [{ id: 'ch-e-sala', name: 'Brainstorm em Voz', kind: 'voice' }],
      },
    ],
  },
];

export const directMessages: DirectMessage[] = [
  { id: 'dm-ana', userId: 'u-ana' },
  { id: 'dm-diego', userId: 'u-diego' },
  { id: 'dm-carla', userId: 'u-carla' },
  { id: 'dm-bruno', userId: 'u-bruno' },
];

export const seedMessages: Record<string, Message[]> = {
  'ch-geral': [
    { id: 'm1', authorId: 'u-ana', content: 'Bom dia, pessoal! ☀️', timestamp: t(180) },
    { id: 'm2', authorId: 'u-ana', content: 'Alguém já testou o React 19?', timestamp: t(179) },
    { id: 'm3', authorId: 'u-diego', content: 'Testei sim, as Actions ficaram bem legais.', timestamp: t(170) },
    { id: 'm4', authorId: 'u-bruno', content: 'Ainda tô no 18 aqui no trampo 😅', timestamp: t(95) },
    { id: 'm5', authorId: 'u-bot', content: 'GG @Bruno, você subiu para o nível 12!', timestamp: t(94) },
    { id: 'm6', authorId: 'u-carla', content: 'Lembrando: sem spam no #geral, usem o #memes.', timestamp: t(30) },
    { id: 'm7', authorId: 'u-me', content: 'A nova Comunidade do LAB integrada ficou sensacional! As salas de voz e os canais de texto estão voando 🚀', timestamp: t(4) },
  ],
  'ch-regras': [
    { id: 'r1', authorId: 'u-ana', content: '1. Respeite todo mundo.\n2. Nada de spam.\n3. Use o canal certo para cada assunto.', timestamp: t(60 * 24 * 30) },
  ],
  'ch-frontend': [
    { id: 'f1', authorId: 'u-diego', content: 'Alguém tem uma dica boa de CSS para layout de 4 colunas?', timestamp: t(300) },
    { id: 'f2', authorId: 'u-me', content: 'Flexbox resolve: colunas fixas e a do meio com flex: 1.', timestamp: t(298) },
  ],
  'ch-g-geral': [
    { id: 'g1', authorId: 'u-ana', content: 'Bora uma ranked hoje às 21h?', timestamp: t(50) },
    { id: 'g2', authorId: 'u-felipe', content: 'Tô dentro!', timestamp: t(48) },
  ],
  'dm-ana': [
    { id: 'd1', authorId: 'u-ana', content: 'Oi! Viu o que eu mandei no servidor?', timestamp: t(20) },
    { id: 'd2', authorId: 'u-me', content: 'Vi sim, já respondo lá.', timestamp: t(18) },
  ],
};
