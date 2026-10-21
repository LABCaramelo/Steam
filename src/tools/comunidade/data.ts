import type { DirectMessage, Message, Server, User } from './types';

export const ME = 'u-me';

export const users: Record<string, User> = {
  'u-me': { id: 'u-me', name: 'luiz', color: '#7657FF', status: 'online', activity: 'No LAB Caramelo' },
  'u-ana': { id: 'u-ana', name: 'Ana', color: '#FF701A', status: 'online', activity: 'Criando com IA' },
  'u-bruno': { id: 'u-bruno', name: 'Bruno', color: '#FFD52A', status: 'idle' },
  'u-carla': { id: 'u-carla', name: 'Carla', color: '#25BFFF', status: 'dnd', activity: 'Animando no Motion' },
  'u-diego': { id: 'u-diego', name: 'Diego', color: '#FF3D8D', status: 'online', activity: 'Explorando Prompts' },
  'u-eva': { id: 'u-eva', name: 'Eva', color: '#22C55E', status: 'offline' },
  'u-felipe': { id: 'u-felipe', name: 'Felipe', color: '#7657FF', status: 'offline' },
  'u-bot': { id: 'u-bot', name: 'CarameloBot', color: '#FF701A', status: 'online', bot: true },
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
