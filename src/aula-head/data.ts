import originals from "./original-prompts.json";

export interface LivePracticeData {
  tool: string;
  toolUrl?: string;
  promptNumber?: number;
  promptName?: string;
  materials: string[];
  action: string;
  checklist: string[];
}

export interface ReviewQuestion {
  question: string;
  hint: string;
}

export interface SlideData {
  title: string;
  heading: string;
  line: string;
  invite: string;
  prompt: number; // -1 se não tem prompt direto
  lesson: number; // 0, 1, 2, 3
  livePractice: LivePracticeData;
  reviewQuestions: string[];
}

export const lessons = [
  {
    name: "ENTENDER UMA LP",
    shortName: "ENTENDER",
    question: "O que faz uma Landing Page funcionar?",
    goal: "Compreender os blocos fundamentais de uma LP e montar a estrutura inicial do próprio projeto.",
    result: "Briefing e wireframe simplificado.",
    color: "#FF701A",
  },
  {
    name: "ENTENDER CRIAÇÃO COM IA",
    shortName: "CRIAR COM IA",
    question: "Como transformar uma ideia em uma instrução que a IA consiga executar?",
    goal: "Aprender a utilizar prompts, pedir alterações, preservar decisões e produzir os primeiros materiais visuais.",
    result: "Prompts contextualizados, imagem personalizada e vídeo em loop.",
    color: "#25BFFF",
  },
  {
    name: "ENTENDER LP COM IA",
    shortName: "LP COM IA",
    question: "Como transformar nossa estrutura em uma Landing Page visualmente profissional?",
    goal: "Criar a copy, construir a Hero no Google AI Studio e definir a identidade visual utilizando referências.",
    result: "Copy aprovada, Hero funcional e Design System aplicado.",
    color: "#FFD52A",
  },
  {
    name: "CRIANDO LP COM IA",
    shortName: "PUBLICAR LP",
    question: "Como terminar nossa Landing Page e colocá-la na internet?",
    goal: "Construir as seções restantes, revisar a LP, publicar no GitHub/Vercel e conectar um domínio próprio.",
    result: "Landing Page publicada, com domínio próprio conectado quando a configuração estiver concluída.",
    color: "#FF3D8D",
  },
];

export const sections = ["HERO", "PROBLEMA", "SOLUÇÃO", "ENTREGAS", "PROCESSO", "CTA"];
export const sectionQuestions = [
  "O que é isso?",
  "Isso é para mim?",
  "Como resolve?",
  "O que vou receber?",
  "Como funciona?",
  "O que faço agora?",
];
export const sectionTexts = [
  "Organize seu conteúdo com direção.",
  "Muitas ideias. Nenhum caminho claro?",
  "Uma estratégia que vira ação.",
  "Diagnóstico, plano e acompanhamento.",
  "Conversar → planejar → construir.",
  "Vamos começar seu projeto?",
];

const promptOrder = [4, 1, 8, 2, 5];
export const promptNames = [
  "Copy de LP",
  "Reconstrução de Imagem",
  "Model Sheet 4×4",
  "Image to Video",
  "Moodboard → Design System",
];

export interface PromptMetadata {
  id: string;
  title: string;
  name: string;
  number: number;
  filename: string;
  tool: string;
  category: string;
  description: string;
  prompt: string;
  whatItDoes: string;
  whenToUse: string;
  inputs: string;
  outputs: string;
  customizationTip: string;
}

const promptEnrichments = [
  {
    whatItDoes: "Entrevista você sobre seu negócio, posicionamento e produto para estruturar a copy persuasiva completa de todas as 6 seções da Landing Page.",
    whenToUse: "Na Aula 3, logo após ter o briefing do projeto e antes de construir os blocos visuais da página.",
    inputs: "Respostas sobre quem você é, para quem vende, qual dor resolve, sua oferta e o próximo passo.",
    outputs: "Headlines, subheadlines, descrições dos blocos, entregas detalhadas e CTAs formatados para a página.",
    customizationTip: "Substitua exemplos de 'Head de Conteúdo' pela sua profissão, nicho ou serviço real. Mantenha as perguntas e o tom de entrevista.",
  },
  {
    whatItDoes: "Combina duas imagens de referência: uma que define a composição/cenário/iluminação (IMAGE 1) e outra que define a identidade facial (IMAGE 2).",
    whenToUse: "Na Aula 2, para criar o visual principal da sua Hero sem precisar de um ensaio fotográfico presencial.",
    inputs: "Duas imagens: uma referência estética de cena de alta qualidade e uma foto nítida do seu rosto (ou da pessoa autorizada).",
    outputs: "Uma imagem personalizada que preserva o cenário cinematográfico com a sua identidade facial.",
    customizationTip: "Use fotos de rosto bem iluminadas e sem acessórios obstrutivos. Se não for usar sua foto, crie um personagem conceitual para a marca.",
  },
  {
    whatItDoes: "Analisa uma foto de referência e gera um model sheet 4×4 profissional com 16 retratos fotorrealistas em estúdio da mesma pessoa em 16 expressões, rotações de cabeça e ângulos com trava total de identidade.",
    whenToUse: "Na Aula 2, para mapear e travar a identidade facial em múltiplos ângulos e expressões antes de gerar variações para a LP e redes.",
    inputs: "IMAGE 1 (Foto de identidade nítida da pessoa como fonte absoluta de verdade) e opcionalmente IMAGE 2 (Referência de grid/estilo do model sheet).",
    outputs: "Uma prancha de contato quadrada 4×4 com 16 retratos individuais em alta resolução, preservando estrutura óssea, olhar, proporções e traços reais.",
    customizationTip: "Fidelidade de identidade é prioridade máxima sobre beleza artificial. Preserve assimetrias e marcas naturais, sem filtros plásticos ou embelezamento.",
  },
  {
    whatItDoes: "Orienta a IA geradora de vídeo a animar suavemente a imagem estática em um loop contínuo de 8 segundos (respiração, cabelos, tecido, luz).",
    whenToUse: "Na Aula 2, logo após gerar a imagem personalizada da Hero.",
    inputs: "A imagem estática personalizada e instruções de movimento sutil que não descaracterizem o rosto.",
    outputs: "Vídeo MP4 em alta resolução com início e fim suaves para repetição contínua (seamless loop).",
    customizationTip: "Menos é mais: peça movimentos sutis (micro-movimentos ambientais). Se a ferramenta exigir créditos indisponíveis, continue com a imagem estática.",
  },
  {
    whatItDoes: "Analisa referências visuais e moodboard para extrair um Design System consistente: paleta de cores, tipografia em 3 vozes, espaçamento, sombras e raios.",
    whenToUse: "Na Aula 3, para vestir a Landing Page com uma identidade visual coerente antes de expandir as seções.",
    inputs: "Imagens ou descrições de referências visuais que traduzam o clima e personalidade da marca.",
    outputs: "Tokens CSS e regras visuais padronizadas que podem ser aplicadas instantaneamente à Hero e demais blocos.",
    customizationTip: "Garanta contraste adequado entre textos e fundos. O Design System deve servir à clareza da mensagem, não apenas à estética decorativa.",
  },
];

export const prompts: PromptMetadata[] = promptOrder.map((originalIndex, i) => {
  const orig = originals[originalIndex];
  const enrich = promptEnrichments[i];
  return {
    ...orig,
    name: promptNames[i],
    number: i + 1,
    ...enrich,
  };
});

export const toolIO = [
  ["Informações do seu negócio e oferta", "Textos organizados para todas as 6 seções"],
  ["Copy aprovada, logo e referências", "Primeira tela (Hero) funcional e interativa"],
  ["Cena de referência + retrato de identidade", "Imagem principal personalizada com sua identidade"],
  ["Imagem final + direção de movimento sutil", "Vídeo de 8 segundos em loop para a Hero"],
  ["Moodboard e referências visuais", "Tokens de cores, tipografia e regras de componentes"],
  ["Decisões aprovadas e limites de alteração", "Instruções de execução rigorosas para a IA"],
  ["Projeto existente, em modo leitura", "Mapa detalhado da estrutura, rotas e recursos"],
  ["Relatório + intenção narrativa da marca", "Plano de movimento, microinterações e scroll"],
];

export const slides: SlideData[] = [
  // AULA 1 — ENTENDER UMA LP
  {
    title: "Quem sou eu e o que vamos construir",
    heading: "BOAS IDEIAS NÃO NASCERAM PARA PARECER COMUNS.",
    line: "Vamos transformar uma ideia em uma experiência digital utilizando Inteligência Artificial.",
    invite: "Conheça o criador, alinhe as expectativas e registre o projeto da sua LP.",
    prompt: -1,
    lesson: 0,
    livePractice: {
      tool: "Editor Mental & Apresentação",
      materials: ["Sua ideia inicial de produto, serviço ou portfólio"],
      action: "Escrever a ideia do seu projeto no campo interativo e explorar a jornada das 4 aulas.",
      checklist: [
        "Ideia do projeto definida em uma frase",
        "Alinhamento de expectativas compreendido (o que vamos e não vamos fazer)",
        "Jornada das 4 aulas visualizada",
      ],
    },
    reviewQuestions: [
      "Você já tem clareza de qual ideia ou serviço quer colocar no ar?",
      "Entendeu que a IA executa, mas quem dá a direção é você?",
    ],
  },
  {
    title: "Como funciona uma Landing Page?",
    heading: "UMA LANDING PAGE É UMA CONVERSA ORGANIZADA EM BLOCOS.",
    line: "Uma página criada para apresentar uma oferta e conduzir o visitante até uma ação.",
    invite: "Toque em cada bloco para descobrir a pergunta que ele responde e defina sua ação principal.",
    prompt: -1,
    lesson: 0,
    livePractice: {
      tool: "Estruturador de Landing Page",
      materials: ["Os 6 blocos fundamentais: Hero, Problema, Solução, Entregas, Processo, CTA"],
      action: "Explorar a função de cada bloco da LP demonstrativa e definir o objetivo de conversão do seu projeto.",
      checklist: [
        "Compreendeu a função de cada um dos 6 blocos",
        "Definiu o objetivo de conversão principal (contato, agendamento, compra, etc.)",
      ],
    },
    reviewQuestions: [
      "A sua oferta tem uma única ação principal bem definida?",
      "Cada bloco da página responde a uma dúvida real do visitante?",
    ],
  },
  {
    title: "Hierarquia da informação",
    heading: "A ORDEM DAS INFORMAÇÕES IMPORTA.",
    line: "Hierarquia é escolher o que o usuário precisa descobrir primeiro, depois e por último.",
    invite: "Compare o exemplo organizado com o desorganizado e defina a ordem da sua própria página.",
    prompt: -1,
    lesson: 0,
    livePractice: {
      tool: "Organizador de Hierarquia",
      materials: ["Blocos narrativos da oferta"],
      action: "Comparar os dois exemplos de organização e arrastar os blocos para criar a sequência que faz sentido para o seu visitante.",
      checklist: [
        "Analisou a diferença entre informação caótica e progressão com intenção",
        "Montou a sequência narrativa recomendada para a sua oferta",
      ],
    },
    reviewQuestions: [
      "A ordem escolhida conduz o visitante de forma natural até a decisão?",
      "O visitante entende o que é a oferta antes de receber o pedido de ação?",
    ],
  },
  {
    title: "Montando o esqueleto da minha LP",
    heading: "ANTES DE CONSTRUIR, PRECISAMOS ORGANIZAR.",
    line: "Wireframe é o esqueleto da página antes de escolhermos sua aparência.",
    invite: "Preencha os campos para gerar o wireframe interativo e copie seu briefing inicial.",
    prompt: -1,
    lesson: 0,
    livePractice: {
      tool: "Construtor de Wireframe & Briefing",
      materials: ["Definições da sua oferta: o que oferece, para quem, problema, solução, entregas e próximo passo"],
      action: "Preencher os 6 campos do construtor de wireframe, conferir a representação visual e copiar o briefing completo.",
      checklist: [
        "Campos de oferta, público, dor, solução, entregas e CTA preenchidos",
        "Briefing copiado para uso na próxima aula",
        "Estrutura inicial da LP aprovada",
      ],
    },
    reviewQuestions: [
      "O briefing está salvo e pronto para ser enviado para a IA na Aula 2?",
      "Você consegue explicar sua oferta em menos de um minuto usando essa estrutura?",
    ],
  },

  // AULA 2 — ENTENDER CRIAÇÃO COM IA
  {
    title: "Como uma IA entende nossos pedidos?",
    heading: "PROMPT NÃO É MÁGICA. É BRIEFING.",
    line: "Quanto melhor explicamos o que queremos, maiores são nossas chances de receber um resultado útil.",
    invite: "Compare pedidos vagos com contextualizados e monte seu primeiro prompt estruturado.",
    prompt: -1,
    lesson: 1,
    livePractice: {
      tool: "Google AI Studio",
      toolUrl: "https://aistudio.google.com/",
      materials: ["Briefing da Aula 1", "Conta Google"],
      action: "Acessar o Google AI Studio, criar um novo chat/prompt e testar um pedido vago contra um pedido contextualizado com regras claras.",
      checklist: [
        "Google AI Studio acessado",
        "Primeiro prompt de componente executado com dados do projeto",
        "Diferença de precisão entre os dois pedidos verificada",
      ],
    },
    reviewQuestions: [
      "Seu prompt incluiu contexto, objetivo, conteúdo e regras de limite?",
      "A IA gerou uma resposta focada no seu projeto em vez de um template genérico?",
    ],
  },
  {
    title: "Aprendendo a corrigir a IA",
    heading: "A IA NÃO DEVE RECONSTRUIR TUDO A CADA ALTERAÇÃO.",
    line: "Problema + Alteração desejada + O que deve permanecer igual. Decisões aprovadas são LOCKED.",
    invite: "Experimente a alteração controlada versus descontrolada e instale o System Prompt.",
    prompt: -1,
    lesson: 1,
    livePractice: {
      tool: "Google AI Studio (System Instructions)",
      toolUrl: "https://aistudio.google.com/",
      materials: ["Instruções de Preservação", "Componente criado no AI Studio"],
      action: "Configurar as System Instructions no AI Studio e solicitar uma pequena modificação pontual usando a instrução de preservação.",
      checklist: [
        "Instruções coladas nas System Instructions do Google AI Studio",
        "Alteração pontual solicitada com especificação do que deve ficar igual",
        "A IA alterou apenas o elemento pedido sem reconstruir o restante",
      ],
    },
    reviewQuestions: [
      "Você especificou o que NÃO deve ser alterado?",
      "O botão ou elemento mudou sem quebrar o layout existente?",
    ],
  },
  {
    title: "Criando uma imagem a partir de uma referência",
    heading: "UMA IMAGEM DEFINE A CENA. OUTRA DEFINE A IDENTIDADE.",
    line: "IMAGE 1 define composição, iluminação e cenário. IMAGE 2 define quem estará nela.",
    invite: "Mova o slider para comparar antes e depois e descubra o que cada referência controla.",
    prompt: 1, // Prompt 02 (Reconstrução de Imagem) e Prompt 03 (Model Sheet 4×4)
    lesson: 1,
    livePractice: {
      tool: "Midjourney / Gemini Imagen 3 / Flux",
      promptNumber: 2,
      promptName: "Reconstrução de Imagem & Model Sheet 4×4",
      materials: ["1 imagem de referência de estilo/cena", "1 foto nítida de identidade facial autorizada", "Prompt 02 (Reconstrução) e Prompt 03 (Model Sheet)"],
      action: "Subir as referências na ferramenta de imagem e executar o prompt de reconstrução para a Hero ou o model sheet 4×4 para travar 16 ângulos de identidade.",
      checklist: [
        "Referências selecionadas e enviadas para a IA",
        "Prompt de reconstrução de imagem ou model sheet 4×4 executado",
        "Imagem final gerada com estilo profissional e identidade consistente",
      ],
    },
    reviewQuestions: [
      "A imagem gerada tem boa resolução e iluminação coerente com a marca?",
      "O rosto mantém semelhança sem distorções visíveis?",
    ],
  },
  {
    title: "Transformando imagem em vídeo",
    heading: "MOVIMENTO BOM É MOVIMENTO QUE PERTENCE À CENA.",
    line: "Um loop sutil conecta o final ao começo sem que a repetição seja percebida.",
    invite: "Examine o loop na timeline interativa e compare a imagem estática com a animada.",
    prompt: 3, // Prompt 04 (Image to Video)
    lesson: 1,
    livePractice: {
      tool: "Kling AI / Runway Gen-3 / Luma Dream Machine",
      promptNumber: 4,
      promptName: "Image to Video",
      materials: ["Imagem personalizada gerada no slide anterior", "Prompt 04"],
      action: "Carregar a imagem na ferramenta de vídeo e aplicar o prompt de movimento sutil de 8 segundos em loop.",
      checklist: [
        "Vídeo gerado com movimento ambiental suave (cabelo, luz, respiração)",
        "Continuidade do loop testada (transição imperceptível do fim para o início)",
        "Se ferramenta indisponível, imagem estática confirmada como plano principal",
      ],
    },
    reviewQuestions: [
      "O movimento valoriza a cena sem causar distração ou deformação?",
      "Você tem o arquivo de mídia pronto para ser integrado na Hero?",
    ],
  },

  // AULA 3 — ENTENDER LP COM IA
  {
    title: "A IA precisa conhecer nossa oferta",
    heading: "ANTES DE ESCREVER, PRECISAMOS ENTENDER.",
    line: "A IA precisa entrevistar você sobre a oferta antes de gerar qualquer texto persuasivo.",
    invite: "Preencha a simulação da entrevista e veja como suas respostas alimentam as seções da página.",
    prompt: 0, // Prompt 01 (Copy)
    lesson: 2,
    livePractice: {
      tool: "ChatGPT / Claude / Gemini",
      promptNumber: 1,
      promptName: "Copy de LP",
      materials: ["Prompt 01 de Copy", "Briefing da Aula 1"],
      action: "Iniciar uma conversa na IA com o Prompt 01, passar pelas perguntas da entrevista e receber a copy das 6 seções.",
      checklist: [
        "Prompt 01 colado no chat com a IA",
        "Perguntas da entrevista respondidas com os dados reais do seu projeto",
        "Copy completa das seções gerada pela IA",
      ],
    },
    reviewQuestions: [
      "Os textos refletem com precisão o que você realmente entrega?",
      "A copy soa autêntica e afiada, sem clichês vazios?",
    ],
  },
  {
    title: "Organizando a copy na Landing Page",
    heading: "A COPY PRECISA FACILITAR UMA DECISÃO.",
    line: "Clareza, relevância, objetivo, sequência e chamada para ação. Textos longos prejudicam a leitura.",
    invite: "Distribua os textos nos blocos da LP e confira os avisos de legibilidade.",
    prompt: -1,
    lesson: 2,
    livePractice: {
      tool: "Editor de Texto & Estruturador",
      materials: ["Copy gerada na IA"],
      action: "Revisar cada seção da Landing Page, eliminando excessos para garantir legibilidade e impacto.",
      checklist: [
        "Headlines e sublines revisadas e com ritmo",
        "Avisos de legibilidade conferidos (textos curtos e fáceis de escanear)",
        "Textos das 6 seções aprovados para inserção no código",
      ],
    },
    reviewQuestions: [
      "Uma pessoa com pressa consegue entender a oferta em 5 segundos?",
      "Todos os botões de CTA têm um texto com ação clara?",
    ],
  },
  {
    title: "Construindo nossa Hero com IA",
    heading: "A HERO É O PRIMEIRO IMPACTO DA PÁGINA.",
    line: "Headline, subheadline, botão de ação, imagem/vídeo e logo trabalhando juntos.",
    invite: "Clique nos elementos da Hero para entender suas funções e teste variações de texto.",
    prompt: -1,
    lesson: 2,
    livePractice: {
      tool: "Google AI Studio",
      toolUrl: "https://aistudio.google.com/",
      materials: ["Copy da Hero aprovada", "Imagem ou vídeo em loop da Aula 2"],
      action: "Construir a Hero no Google AI Studio substituindo os dados de exemplo pelos do seu projeto real.",
      checklist: [
        "Código da Hero renderizado no AI Studio",
        "Textos, mídia e logo do seu projeto inseridos",
        "Dados fictícios e exemplos genéricos removidos",
      ],
    },
    reviewQuestions: [
      "A Hero abre e funciona perfeitamente na visualização do AI Studio?",
      "O botão principal de ação está visível sem precisar rolar a tela?",
    ],
  },
  {
    title: "Criando uma identidade visual",
    heading: "MOODBOARD É INSPIRAÇÃO. DESIGN SYSTEM É REGRA.",
    line: "Cores, tipografia, espaçamento e componentes aplicados com consistência à mesma estrutura.",
    invite: "Alterne entre os moodboards e veja a Hero assumir diferentes Design Systems sem mudar a copy.",
    prompt: 4, // Prompt 05 (Moodboard → Design System)
    lesson: 2,
    livePractice: {
      tool: "Google AI Studio / Claude",
      toolUrl: "https://aistudio.google.com/",
      promptNumber: 5,
      promptName: "Moodboard → Design System",
      materials: ["Prompt 05 de Design System", "Hero já criada", "Referências visuais e paleta de cores"],
      action: "Pedir à IA para extrair e aplicar os tokens de cores, fontes e botões à sua Hero sem modificar a copy aprovada.",
      checklist: [
        "Design System estruturado com cores, tipografia e raios",
        "Estilo aplicado à Hero sem quebrar a estrutura ou apagar textos",
        "Contraste de leitura aprovado",
      ],
    },
    reviewQuestions: [
      "A tipografia e as cores comunicam a personalidade certa da marca?",
      "O botão de ação tem contraste suficiente contra o fundo?",
    ],
  },

  // AULA 4 — CRIANDO LP COM IA
  {
    title: "Construindo a Landing Page completa",
    heading: "MESMA IDENTIDADE. NOVAS COMPOSIÇÕES.",
    line: "Problema, solução, entregas, processo e CTA conectados à Hero com navegação vertical.",
    invite: "Compare repetição monótona com consistência visual e adicione as seções com scroll vertical.",
    prompt: -1,
    lesson: 3,
    livePractice: {
      tool: "Google AI Studio",
      toolUrl: "https://aistudio.google.com/",
      materials: ["Hero estilizada", "Copy de todas as seções", "Regras de preservação"],
      action: "Solicitar ao Google AI Studio a construção das seções restantes (Problema, Solução, Entregas, Processo e CTA) com rolagem vertical fluida.",
      checklist: [
        "Todas as 6 seções implementadas na página",
        "Navegação vertical liberada (scroll da Hero até o rodapé)",
        "Design System consistente em todas as seções",
      ],
    },
    reviewQuestions: [
      "A página rola naturalmente do início ao fim?",
      "Cada seção tem uma composição própria sem parecer um copia e cola da anterior?",
    ],
  },
  {
    title: "Revisando e refinando o projeto",
    heading: "UMA PÁGINA SÓ ESTÁ PRONTA QUANDO FUNCIONA.",
    line: "A oferta está clara? Funciona no celular? Os botões e formulários respondem?",
    invite: "Alterne entre Desktop, Tablet e Mobile e complete o checklist das 9 verificações essenciais.",
    prompt: -1,
    lesson: 3,
    livePractice: {
      tool: "Google AI Studio & DevTools",
      materials: ["Landing Page completa", "DevTools do navegador"],
      action: "Executar revisão em modo somente leitura para auditar a estrutura do código e testar a visualização em celular.",
      checklist: [
        "Checklist dos 9 pontos essenciais verificado",
        "Visualização em celular testada e responsiva",
        "Links e botões com destino real",
      ],
    },
    reviewQuestions: [
      "A página funciona no celular sem quebrar textos ou vazar a tela?",
      "Todos os links e botões levam a um destino real?",
    ],
  },
  {
    title: "Do Google AI Studio à Vercel",
    heading: "CRIAR NÃO É PUBLICAR.",
    line: "Google AI Studio (construção) → GitHub (histórico) → Vercel (hospedagem e deploy contínuo).",
    invite: "Explore as etapas do pipeline e simule o fluxo de sincronização e atualização de código.",
    prompt: -1,
    lesson: 3,
    livePractice: {
      tool: "GitHub & Vercel",
      toolUrl: "https://vercel.com/",
      materials: ["Projeto no AI Studio", "Conta no GitHub", "Conta na Vercel"],
      action: "Conectar o AI Studio ao GitHub, sincronizar os arquivos no repositório, importar o projeto na Vercel e disparar o deploy.",
      checklist: [
        "Repositório criado e sincronizado no GitHub",
        "Projeto importado na Vercel com build validado",
        "Primeiro deploy concluído com link .vercel.app ativo",
      ],
    },
    reviewQuestions: [
      "Você consegue abrir o link da Vercel no navegador do seu celular?",
      "Entendeu que qualquer alteração salva no GitHub atualiza a página na Vercel automaticamente?",
    ],
  },
  {
    title: "Domínio próprio, publicação e próximos passos",
    heading: "SEU SITE JÁ ESTÁ ONLINE. AGORA VAMOS DAR UM ENDEREÇO A ELE.",
    line: "Da compra no Squarespace (ou Registro.br) à configuração de DNS na Vercel, até a direção Caramelo.",
    invite: "Percorra os 5 estados da publicação: endereço, compra, DNS, checklist e encerramento com Um Cara Caramelo.",
    prompt: -1,
    lesson: 3,
    livePractice: {
      tool: "Vercel Settings & Squarespace / Registro.br",
      toolUrl: "https://domains.squarespace.com/",
      materials: ["Projeto publicado na Vercel", "Acesso ao painel do domínio"],
      action: "Adicionar o domínio personalizado nas configurações da Vercel, configurar os registros A e CNAME e aguardar a validação do certificado HTTPS.",
      checklist: [
        "Domínio adicionado no painel da Vercel",
        "Registros DNS configurados no provedor do domínio",
        "Certificado SSL/HTTPS ativo",
        "Landing Page 100% no ar",
      ],
    },
    reviewQuestions: [
      "O domínio próprio já aponta para a hospedagem da Vercel?",
      "Você guardou os 8 prompts e os aprendizados para construir seus próximos projetos?",
    ],
  },
];

export const finalChecks = [
  "A oferta está clara logo no primeiro contato?",
  "A copy foi preservada sem modificações indesejadas?",
  "O botão principal (CTA) funciona e tem destino real?",
  "A navegação da página está fluida?",
  "A página funciona perfeitamente no celular?",
  "As imagens carregam com nitidez e velocidade?",
  "O vídeo ou mídia em loop carrega sem travar?",
  "Os formulários têm um destino funcional e testado?",
  "Não existem erros visíveis, quebras ou textos falsos?",
];
