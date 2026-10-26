/**
 * MANIFESTO CANÔNICO & DADOS DO CASE ESTRATÉGICO
 * Um Cara Caramelo — Estratégia de Conteúdo, Branding & Comunidade
 *
 * Contém o acervo das 4 séries reais de carrosséis do Instagram @umcaracaramelo,
 * com seus metadados, transcrições fieis, análise estratégica por slide e síntese de pilares.
 */

export const CASE_METADATA = {
  title: "Um Cara Caramelo — Estratégia Editorial",
  brand: "Um Cara Caramelo®",
  tagline: "Uma marca pessoal construída a partir de storytelling, experimentação, direção criativa e um sistema editorial que conecta identificação, autoridade e comunidade.",
  category: "Estratégia de Conteúdo · Branding · Comunidade",
  channel: "@umcaracaramelo (Instagram)",
  channelUrl: "https://www.instagram.com/umcaracaramelo/",
  role: "Head de Conteúdo & Direção Criativa",
  author: "Luiz",
  premise: "Falar como a persona pensa, não como uma marca tentando vender.",
  objective: "Atrair criativos que desejam ampliar sua capacidade de execução, construir identificação com a marca, gerar autoridade e criar uma audiência qualificada para futuras conversões.",
  expectedResult: "Construir uma comunidade que se reconheça na marca, acompanhe seus experimentos e desenvolva confiança em seus serviços e produtos."
};

export const EDITORIAL_PILLARS = [
  {
    id: "identificacao",
    day: "Segunda-feira",
    title: "Identificação",
    badge: "Confessional & Psique",
    color: "#FF701A",
    description: "Carrosséis confessionais sobre inseguranças, descobertas, dilemas de identidade e ambições dos criativos.",
    narrativeFocus: "Vulnerabilidade estratégica. 'Meu Deus, sou eu.' A marca se conecta validando o que o criativo sente e não tem coragem de falar em voz alta.",
    seriesIncluded: ["serie-01", "serie-02"]
  },
  {
    id: "autoridade",
    day: "Quarta-feira",
    title: "Autoridade",
    badge: "Tese & Processos",
    color: "#25BFFF",
    description: "Projetos, processos, experimentos e aprendizados práticos que demonstram capacidade criativa, técnica e liderança conceitual.",
    narrativeFocus: "A tese 'A IA executa. Você dirige.' Elevação do profissional: sair do papel de mero operador de ferramentas para diretor de experiências.",
    seriesIncluded: ["serie-03", "serie-04"]
  },
  {
    id: "descompressao",
    day: "Sexta-feira",
    title: "Descompressão",
    badge: "Humor & Cultura",
    color: "#7657FF",
    description: "Humor ácido, tirinhas e ilustrações autorais sobre os absurdos, prazos e dilemas cotidianos do mercado criativo.",
    narrativeFocus: "Alívio de tensão, humanização e reforço de comunidade com ironia elegante e pequenas confissões patéticas.",
    seriesIncluded: []
  }
];

export const METHOD_HEAD_STAGES = [
  {
    step: "01",
    name: "Atenção (Hook Visual & Verbal)",
    focus: "Capa cinematográfica com alto contraste, lettering expressivo e confissão instigante.",
    effect: "Para o scroll do feed nos primeiros 1.5 segundos."
  },
  {
    step: "02",
    name: "Retenção (Cadência & Tensão)",
    focus: "Progressão tela a tela em ritmo de conversa íntima. Frases curtas, massas legíveis e respiro.",
    effect: "Mantém o leitor deslizando até a virada narrativa central."
  },
  {
    step: "03",
    name: "Toque (Conclusão & Ação Motivada)",
    focus: "Síntese da tese autoral e pergunta reflexiva que convida ao debate real nos comentários.",
    effect: "Gera identificação duradoura e engajamento qualificado."
  }
];

export const STRATEGIC_COMPETENCIES = [
  {
    name: "Posicionamento",
    description: "Transição deliberada de executor técnico multitarefa para Head de Interação e Diretor Criativo.",
    evidence: "Série 01 e 02: redefinição do valor profissional ('não é sobre a ferramenta, é sobre o que você transforma em realidade')."
  },
  {
    name: "Narrativa & Storytelling",
    description: "Construção de arco confessional com ritmo, vulnerabilidade dosada e viradas reflexivas claras.",
    evidence: "Estrutura dos carrosséis: Abertura (dilema) → Tensão (tentativa de escolha) → Virada (Interação/Direção) → Síntese."
  },
  {
    name: "Direção Criativa",
    description: "Linguagem visual autoral unindo ilustração cel-shading, fotografia urbana de Belo Horizonte e colagem gráfica.",
    evidence: "Personagem Caramelo recorrente, paleta quente x fria, intervenções de spray e tipografia manuscrita expressiva."
  },
  {
    name: "Estratégia Editorial",
    description: "Distribuição intencional entre pilares de Identificação, Autoridade e Descompressão.",
    evidence: "Alternância entre posts que acolhem a insegurança criativa e posts que ensinam teses de liderança com IA."
  },
  {
    name: "Identidade Visual Marcante",
    description: "Uso do sistema de cores (#101014 Ink, #FFF4E8 Cream, #FF701A Caramelo, #25BFFF Sky, #7657FF Violet) e texturas táteis.",
    evidence: "Halftones retrô, respingos de aquarela, adesivos 'Não pareça comum' e a marca 'C.' presente como assinatura."
  },
  {
    name: "Experimentação & IA",
    description: "Aplicação da inteligência artificial como alavanca de expansão criativa sem desumanizar o conteúdo.",
    evidence: "Séries 03 e 04: ensaios visuais gerados com IA dirigidos com rigor anatômico, cenográfico e de iluminação."
  },
  {
    name: "Construção de Comunidade",
    description: "Linguagem familiar que gera pertencimento e convite genuíno à conversa nos comentários.",
    evidence: "Fechamento dos carrosséis com perguntas empáticas ('Mais alguém tendo dificuldade de explicar o que faz?')."
  }
];

export const CAROUSEL_SERIES = [
  {
    id: "serie-01",
    index: "01",
    slug: "o-dilema-da-profissao",
    title: "Eu passei anos tentando escolher uma profissão",
    subtitle: "Até perceber que esse era o problema",
    hook: "Eu passei ANOS tentando escolher uma profissão. Até perceber que esse era o problema.",
    category: "Storytelling Confessional",
    pillarId: "identificacao",
    pillarLabel: "Identificação",
    theme: "Crise de identidade profissional e multidisciplinaridade criativa",
    message: "O valor do criativo contemporâneo não está em se limitar a uma ferramenta, mas na capacidade de conectar disciplinas através da Interação.",
    strategicRole: "Conexão profunda de topo de funil com designers e criativos que se sentem perdidos por acumularem múltiplos interesses.",
    coverImage: "/assets/images/case-caramelo/series-01/slide-01.webp",
    coverThumb: "/assets/images/case-caramelo/series-01/slide-01-thumb.webp",
    slidesCount: 6,
    slides: [
      {
        num: 1,
        image: "/assets/images/case-caramelo/series-01/slide-01.webp",
        thumb: "/assets/images/case-caramelo/series-01/slide-01-thumb.webp",
        headline: "Eu passei ANOS tentando escolher uma profissão.",
        lead: "Até perceber que esse era o problema.",
        badges: ["NÃO PAREÇA COMUM.", "VALOR PRECISA APARECER."],
        sprayQuote: "Não é sobre se vender melhor. É sobre ser percebido melhor.",
        intention: "Capturar atenção imediata no feed com um dilema universal de qualquer profissional multidisciplinar.",
        narrativeDecision: "Confissão em primeira pessoa. Uso de 'ANOS' em caixa alta para enfatizar o peso temporal da angústia.",
        visualDecision: "Luiz sentado no telhado comendo pizza ao entardecer; céu quente em degradê rosa/laranja com halftone clássico.",
        strategicContribution: "Estabelece a persona imediatamente: um criativo de verdade, que vive e sente as dores da profissão."
      },
      {
        num: 2,
        image: "/assets/images/case-caramelo/series-01/slide-02.webp",
        thumb: "/assets/images/case-caramelo/series-01/slide-02-thumb.webp",
        headline: "Comecei no design.",
        lead: "Depois vieram conteúdo, marketing, web, estratégia, tecnologia... E uma pergunta ficou cada vez pior: 'Tá. Mas o que você faz?'",
        intention: "Construir a tensão da história detalhando a trajetória e a cobrança externa de especialização estanque.",
        narrativeDecision: "Enumeração progressiva das competências acumuladas, culminando na clássica pergunta incômoda do mercado.",
        visualDecision: "Perfil de Luiz pensativo contra o pôr do sol urbano, luz de recorte dourada e respingos azuis de tinta na base.",
        strategicContribution: "Valida a vivência de profissionais generalistas e multidisciplinares que não cabem em caixas simples."
      },
      {
        num: 3,
        image: "/assets/images/case-caramelo/series-01/slide-03.webp",
        thumb: "/assets/images/case-caramelo/series-01/slide-03-thumb.webp",
        headline: "Eu achava que precisava escolher.",
        lead: "ATÉ PERCEBER: meu problema não era saber coisas demais. Era tentar me definir pela ferramenta.",
        intention: "Iniciar a virada de perspectiva (insight/efeito ahaa) descolando a identidade do software.",
        narrativeDecision: "Contraste entre o erro anterior ('achar que precisava escolher') e a iluminação reflexiva central.",
        visualDecision: "Fundo branco respirável com fita adesiva colando o lembrete e respingo cyan dinâmico; peso tipográfico contrastado.",
        strategicContribution: "Desarma a culpa do criativo generalista e prepara o terreno para a nova definição conceitual."
      },
      {
        num: 4,
        image: "/assets/images/case-caramelo/series-01/slide-04.webp",
        thumb: "/assets/images/case-caramelo/series-01/slide-04-thumb.webp",
        headline: "ENTÃO TROQUEI A PERGUNTA:",
        lead: "'Qual profissão eu sou?' POR: 'O que conecta tudo isso?' MINHA RESPOSTA: INTERAÇÃO.",
        intention: "Apresentar a chave mestra do posicionamento de marca.",
        narrativeDecision: "Substituição cirúrgica de pergunta passiva por pergunta ativa e integradora.",
        visualDecision: "Seta manuscrita laranja ligando as perguntas, estrelas amarelas e a palavra 'INTERAÇÃO' destacada em violeta.",
        strategicContribution: "Define o território proprietário do estúdio: Laboratório de Interação."
      },
      {
        num: 5,
        image: "/assets/images/case-caramelo/series-01/slide-05.webp",
        thumb: "/assets/images/case-caramelo/series-01/slide-05-thumb.webp",
        headline: "Hoje estou CONSTRUINDO esse lugar: HEAD DE INTERAÇÃO.",
        lead: "Eu sou Luiz. E Um Cara Caramelo é o laboratório onde tudo isso ganha forma.",
        intention: "Apresentação oficial da marca pessoal e dos papéis de atuação.",
        narrativeDecision: "Nomeação do criador ('Eu sou Luiz') e do laboratório criativo ('Um Cara Caramelo').",
        visualDecision: "Mãos tatuadas de Luiz wireframando um projeto no caderno ao lado do laptop com interface na tela.",
        strategicContribution: "Gera confiança e autoridade tangível mostrando o artesão em plena criação de interface."
      },
      {
        num: 6,
        image: "/assets/images/case-caramelo/series-01/slide-06.webp",
        thumb: "/assets/images/case-caramelo/series-01/slide-06-thumb.webp",
        headline: "Se você também tem dificuldade de responder: 'O QUE VOCÊ FAZ?!'",
        lead: "me conta sua resposta nos comentários. NÃO PAREÇA COMUM. VALOR PRECISA APARECER.",
        intention: "Gerar conversa real, acolhimento e comentários espontâneos nos canais sociais.",
        narrativeDecision: "Chamada empática final sem venda forçada, reforçando o manifesto de marca.",
        visualDecision: "Luiz segurando uma xícara de café com polegar para cima, adesivo amarelo 'Não Pareça Comum' e o ícone 'C.' em destaque.",
        strategicContribution: "Criação de laço comunitário de longo prazo com criativos altamente qualificados."
      }
    ]
  },
  {
    id: "serie-02",
    index: "02",
    slug: "desaprendendo-a-ser-designer",
    title: "Eu acho que estou desaprendendo a ser designer",
    subtitle: "Da execução de telas para a direção de realidades",
    hook: "Eu acho que estou desaprendendo a ser designer.",
    category: "Provocação & Mentalidade",
    pillarId: "identificacao",
    pillarLabel: "Identificação",
    theme: "A evolução do papel do designer na era da tecnologia e automação",
    message: "Deixar de ser refém da ferramenta não é abandonar o design, mas elevá-lo ao papel de direção criativa e resolução sistêmica.",
    strategicRole: "Confrontar o medo que profissionais de design sentem frente à IA, transformando apreensão em maturidade estratégica.",
    coverImage: "/assets/images/case-caramelo/series-02/slide-01.webp",
    coverThumb: "/assets/images/case-caramelo/series-02/slide-01-thumb.webp",
    slidesCount: 7,
    slides: [
      {
        num: 1,
        image: "/assets/images/case-caramelo/series-02/slide-01.webp",
        thumb: "/assets/images/case-caramelo/series-02/slide-01-thumb.webp",
        headline: "Eu acho que estou desaprendendo a ser designer.",
        lead: "Quando o acúmulo de técnicas desafia a própria identidade.",
        badges: ["NÃO PAREÇA COMUM.", "VALOR PRECISA APARECER."],
        intention: "Criar um choque conceitual com um profissional afirmando estar desaprendendo sua profissão de origem.",
        narrativeDecision: "Título provocativo e reflexivo com 'desaprendendo' em caligrafia expressiva.",
        visualDecision: "Paleta violeta profunda com perspectiva de rua e mão segurando uma flor verde desvanecendo em movimento.",
        strategicContribution: "Quebra o padrão dos posts arrogantes de mercado com humildade e profundidade autoral."
      },
      {
        num: 2,
        image: "/assets/images/case-caramelo/series-02/slide-02.webp",
        thumb: "/assets/images/case-caramelo/series-02/slide-02-thumb.webp",
        headline: "E isso é estranho.",
        lead: "Porque design foi a primeira coisa que eu realmente soube fazer. Comecei a trabalhar com criação ainda adolescente.",
        intention: "Ancorar a trajetória profissional e demonstrar bagagem e maturidade histórica.",
        narrativeDecision: "Afirmação do design como raiz fundamental, afastando qualquer impressão de superficialidade.",
        visualDecision: "Minimalismo em fundo creme/papel com rabisco violeta discreto e tipografia limpa.",
        strategicContribution: "Estabelece credibilidade: não é alguém que rejeita o design por não saber fazer, mas quem o domina há anos."
      },
      {
        num: 3,
        image: "/assets/images/case-caramelo/series-02/slide-03.webp",
        thumb: "/assets/images/case-caramelo/series-02/slide-03-thumb.webp",
        headline: "Depois vieram:",
        lead: "motion, sites, social media, conteúdo, marketing, IA, automação, código. E quanto mais eu aprendia... mais difícil ficava explicar o que eu fazia.",
        intention: "Mapear o leque de capacidades e expor o conflito de comunicação que ele gera.",
        narrativeDecision: "Duas colunas de disciplinas em bullet points seguidas da pílula violeta reflexiva.",
        visualDecision: "Pílula violeta suave destacando a frase e respingo de aquarela roxa na lateral.",
        strategicContribution: "Demonstração indireta do vasto repertório técnico do autor sem parecer exibicionista."
      },
      {
        num: 4,
        image: "/assets/images/case-caramelo/series-02/slide-04.webp",
        thumb: "/assets/images/case-caramelo/series-02/slide-04-thumb.webp",
        headline: "Durante muito tempo achei que isso era falta de foco.",
        lead: "QUE EU PRECISAVA ESCOLHER: 'Qual dessas coisas eu vou ser?'",
        intention: "Tocar na dor da culpa pela dispersão que quase todo criativo avançado sente.",
        narrativeDecision: "Dramatização do dilema interno de escolha forçada.",
        visualDecision: "Silhueta estilizada de Luiz deitada na calçada quadriculada colorida com balões de coração e pose de paz.",
        strategicContribution: "Cria empatia imediata com criativos de alto calibre que sofrem pressão para se especializarem em nichos estreitos."
      },
      {
        num: 5,
        image: "/assets/images/case-caramelo/series-02/slide-05.webp",
        thumb: "/assets/images/case-caramelo/series-02/slide-05-thumb.webp",
        headline: "Hoje começo a pensar diferente.",
        lead: "Talvez eu não esteja abandonando o design. Talvez eu esteja usando o design para dirigir coisas que antes eu nem conseguia executar.",
        intention: "A grande virada: elevar o design de função operacional para habilidade de direção.",
        narrativeDecision: "Reenquadramento positivo: o design passa a ser o leme, a visão e a direção de projetos complexos.",
        visualDecision: "Aquarela sutil de tons pastéis e balão de fala spray, com texto em hierarquia perfeita.",
        strategicContribution: "A essência do papel de Head: a capacidade de dirigir o que a tecnologia agora permite executar."
      },
      {
        num: 6,
        image: "/assets/images/case-caramelo/series-02/slide-06.webp",
        thumb: "/assets/images/case-caramelo/series-02/slide-06-thumb.webp",
        headline: "Quanto mais coisas eu consigo construir...",
        lead: "menos quero me definir pela ferramenta que sei usar. E mais pelo que sou capaz de criar.",
        intention: "Consolidação da tese de liberdade criativa e foco no impacto.",
        narrativeDecision: "Frase de alto impacto conceitual para memorização e compartilhamento.",
        visualDecision: "Luiz olhando para cima em direção ao céu aberto com avião deixando rastro de fumaça; coroa Caramelo no topo.",
        strategicContribution: "Fortalece a marca como líder de pensamento para profissionais em transição de carreira."
      },
      {
        num: 7,
        image: "/assets/images/case-caramelo/series-02/slide-07.webp",
        thumb: "/assets/images/case-caramelo/series-02/slide-07-thumb.webp",
        headline: "Talvez a pergunta não seja mais: 'qual é a minha profissão?'",
        lead: "Mas: 'o que eu consigo transformar em realidade?' Mais alguém está tendo dificuldade de explicar o que faz?",
        intention: "Abrir canal para reflexão comunitária nos comentários.",
        narrativeDecision: "Fechamento provocativo que substitui rótulos por capacidade de realização prática.",
        visualDecision: "Caixa de diálogo em estética pixel art e pinceladas roxas sobre fundo de papel aquarelado.",
        strategicContribution: "Fomenta comentários densos e relatos reais de seguidores, impulsionando a distribuição orgânica."
      }
    ]
  },
  {
    id: "serie-03",
    index: "03",
    slug: "fazendo-o-que-nao-sei-fazer",
    title: "Eu comecei a fazer coisas que eu não sei fazer",
    subtitle: "A IA como expansão de possibilidades criativas",
    hook: "Eu comecei a fazer coisas que eu não sei fazer.",
    category: "Experimentação & IA",
    pillarId: "autoridade",
    pillarLabel: "Autoridade",
    theme: "Como a tecnologia e a IA viabilizam ideias que antes morriam na incapacidade técnica de execução",
    message: "A IA não é apenas para fazer mais rápido o que você já fazia. É para viabilizar projetos que você nem teria coragem de tentar.",
    strategicRole: "Posicionar a IA dentro de uma visão sofisticada de autonomia e direção, longe dos clichês de automação barata.",
    coverImage: "/assets/images/case-caramelo/series-03/slide-01.webp",
    coverThumb: "/assets/images/case-caramelo/series-03/slide-01-thumb.webp",
    slidesCount: 7,
    slides: [
      {
        num: 1,
        image: "/assets/images/case-caramelo/series-03/slide-01.webp",
        thumb: "/assets/images/case-caramelo/series-03/slide-01-thumb.webp",
        headline: "Eu comecei a fazer coisas que eu não sei fazer.",
        lead: "A coragem de usar ferramentas para expandir o próprio alcance.",
        badges: ["EXPANSÃO CRIATIVA"],
        intention: "Despertar curiosidade profunda sobre como alguém produz tanto sem dominar tudo.",
        narrativeDecision: "Título paradoxal e intrigante com 'não sei fazer' sublinhado em amarelo ocre.",
        visualDecision: "Tênis Nike apontando para o céu ao entardecer; traços circulares e estrelas brilhantes ao redor.",
        strategicContribution: "Quebra a ilusão de perfeição técnica inatingível e humaniza o processo de aprendizagem."
      },
      {
        num: 2,
        image: "/assets/images/case-caramelo/series-03/slide-02.webp",
        thumb: "/assets/images/case-caramelo/series-03/slide-02-thumb.webp",
        headline: "E talvez essa seja a parte da IA que mais me interessa.",
        lead: "Não a substituição do humano, mas o desbloqueio do pensamento criativo.",
        intention: "Introduzir a Inteligência Artificial sob um prisma autoral e filosófico.",
        narrativeDecision: "Conexão direta entre a declaração inicial e a tecnologia.",
        visualDecision: "Luiz pensativo com um cachorrinho caramelo deitado sobre seus cabelos cacheados em fundo de pergaminho.",
        strategicContribution: "Diferenciação clara em relação ao discurso genérico de 'ganhe tempo com IA'."
      },
      {
        num: 3,
        image: "/assets/images/case-caramelo/series-03/slide-03.webp",
        thumb: "/assets/images/case-caramelo/series-03/slide-03-thumb.webp",
        headline: "NÃO É:",
        lead: "escrever 30 textos, produzir 50 artes, fazer mais em menos tempo. Isso é útil. Mas não é o que mais me empolga.",
        intention: "Criticar o foco exclusivo em produtividade e volume mecânico.",
        narrativeDecision: "Negação das fórmulas prontas de mercado para valorizar a intenção criativa.",
        visualDecision: "Luiz sentado lendo um livro na penumbra com iluminação dramática quente e estrelas douradas.",
        strategicContribution: "Reforço do posicionamento de alto valor: estúdios e clientes sérios buscam qualidade e direção, não spam."
      },
      {
        num: 4,
        image: "/assets/images/case-caramelo/series-03/slide-04.webp",
        thumb: "/assets/images/case-caramelo/series-03/slide-04-thumb.webp",
        headline: "O que me pega é olhar para uma ideia que antes morreria em:",
        lead: "'eu não sei fazer isso' TROCAR POR: 'TÁ. como a gente faz?'",
        intention: "Apresentar a mudança pragmática de postura diante do desconhecido.",
        narrativeDecision: "Contraste direto entre paralisia técnica e investigação criativa.",
        visualDecision: "Cápsula preta 'eu não sei fazer isso' apontando com seta para a esfera luminosa 'TÁ. como a gente faz?'.",
        strategicContribution: "Inspira o leitor a testar, aprender e expandir suas capacidades sem medo de errar."
      },
      {
        num: 5,
        image: "/assets/images/case-caramelo/series-03/slide-05.webp",
        thumb: "/assets/images/case-caramelo/series-03/slide-05-thumb.webp",
        headline: "Código. Automação. Sites. Experiências digitais. Sistemas.",
        lead: "Coisas que antes eu provavelmente teria terceirizado... ou simplesmente abandonado.",
        intention: "Exemplificar entregáveis concretos que a direção estratégica com IA permite criar.",
        narrativeDecision: "Lista de frentes complexas agora acessíveis ao criador autônomo.",
        visualDecision: "Pílulas arredondadas com borda laranja organizadas em pirâmide e respingo de spray alaranjado.",
        strategicContribution: "Demonstra que o estúdio Um Cara Caramelo desenvolve sistemas, sites e ferramentas reais."
      },
      {
        num: 6,
        image: "/assets/images/case-caramelo/series-03/slide-06.webp",
        thumb: "/assets/images/case-caramelo/series-03/slide-06-thumb.webp",
        headline: "Eu não virei especialista em tudo isso.",
        lead: "Comecei a desenvolver outra habilidade: descobrir o que uma ideia precisa virar e encontrar um caminho até ela existir.",
        intention: "Definir com clareza a competência de Direção e Solução de Problemas.",
        narrativeDecision: "Afirmação precisa da essência de um Head: arquitetar o caminho entre a intenção e a existência.",
        visualDecision: "Luiz subindo uma escadaria de costas rumo a um céu dourado cinematográfico; texto caligrafado nos degraus.",
        strategicContribution: "Apresentação sublime da função de liderança estratégica de conteúdo e produto."
      },
      {
        num: 7,
        image: "/assets/images/case-caramelo/series-03/slide-07.webp",
        thumb: "/assets/images/case-caramelo/series-03/slide-07-thumb.webp",
        headline: "Talvez IA não seja sobre fazer mais do que você já fazia.",
        lead: "Talvez seja sobre finalmente conseguir fazer o que antes você não conseguia. É isso que eu quero explorar por aqui.",
        badges: ["pequenos passos", "GRANDES MUDANÇAS"],
        intention: "Fechamento memorável que se torna o manifesto de exploração do perfil.",
        narrativeDecision: "Conclusão síntese em setas circulares conectando as frases ao logo Caramelo 'C.'.",
        visualDecision: "Textura de papel rústico aquarelado com a marca central 'C.' e o lema 'pequenos passos, grandes mudanças'.",
        strategicContribution: "Convida o seguidor a acompanhar a jornada contínua do laboratório criativo."
      }
    ]
  },
  {
    id: "serie-04",
    index: "04",
    slug: "a-ia-executa-voce-dirige",
    title: "A IA executa. Você dirige.",
    subtitle: "A tese mestre da nova liderança criativa",
    hook: "A IA executa. Você dirige.",
    category: "Tese Central & Autoridade",
    pillarId: "autoridade",
    pillarLabel: "Autoridade",
    theme: "O valor insubstituível do critério, intenção e bom gosto frente à abundância de ferramentas",
    message: "Quando a execução se torna barata e abundante, o que se torna verdadeiramente raro e valioso é a direção, o critério e a intenção.",
    strategicRole: "Fixar a bandeira conceitual máxima de Luiz e do Um Cara Caramelo no mercado brasileiro de conteúdo e IA.",
    coverImage: "/assets/images/case-caramelo/series-04/slide-01.webp",
    coverThumb: "/assets/images/case-caramelo/series-04/slide-01-thumb.webp",
    slidesCount: 6,
    slides: [
      {
        num: 1,
        image: "/assets/images/case-caramelo/series-04/slide-01.webp",
        thumb: "/assets/images/case-caramelo/series-04/slide-01-thumb.webp",
        headline: "A IA executa. Você dirige.",
        lead: "A tese mestra do novo criativo contemporâneo.",
        badges: ["TESE FUNDAMENTAL"],
        intention: "Proclamar uma tese clara, afiada e inesquecível em apenas 5 palavras.",
        narrativeDecision: "Afirmação lapidar em duas linhas com 'Você dirige' em caligrafia expressiva branca.",
        visualDecision: "Luiz sentado à mesa rústica com computador antigo em campo verdejante ao nascer do sol, acompanhado pelo vira-lata caramelo.",
        strategicContribution: "Imagem emblemática que resume toda a filosofia da marca: tecnologia avançada, calor humano e simplicidade poética."
      },
      {
        num: 2,
        image: "/assets/images/case-caramelo/series-04/slide-02.webp",
        thumb: "/assets/images/case-caramelo/series-04/slide-02-thumb.webp",
        headline: "Ela escreve. Programa. Pesquisa. Cria imagem. Organiza. Automatiza.",
        lead: "Legal.",
        intention: "Reconhecer as habilidades das ferramentas para desarmar o fetiche técnico.",
        narrativeDecision: "Enumeração seca dos poderes da IA seguida pela ironia monossilábica 'Legal.'",
        visualDecision: "Texto vertical encadeado com setas curvas sobre aquarela lavanda minimalista e traço bicolor amarelo/azul.",
        strategicContribution: "Demonstra postura madura: a ferramenta é boa, mas não resolve o problema estratégico sozinha."
      },
      {
        num: 3,
        image: "/assets/images/case-caramelo/series-04/slide-03.webp",
        thumb: "/assets/images/case-caramelo/series-04/slide-03-thumb.webp",
        headline: "Mas alguém ainda precisa decidir:",
        lead: "o que fazer. por que fazer. o que está ruim. o que precisa sair. e quando já está bom.",
        intention: "Listar as 5 grandes decisões humanas que a IA não pode tomar pelo cliente.",
        narrativeDecision: "Detalhamento cirúrgico das atribuições de um Diretor Criativo e Head de Conteúdo.",
        visualDecision: "Luiz em primeiro plano digitando no teclado com sorriso confiante; card translúcido contendo a checklist das decisões.",
        strategicContribution: "Justifica o valor do serviço de Head: clientes pagam pela tomada de decisão, não pela digitação de prompts."
      },
      {
        num: 4,
        image: "/assets/images/case-caramelo/series-04/slide-04.webp",
        thumb: "/assets/images/case-caramelo/series-04/slide-04-thumb.webp",
        headline: "Porque execução sem direção é só produção.",
        lead: "pensar também faz parte do trabalho, viu?",
        intention: "Criar o aforismo de contraste definitivo contra a cultura de moedor de carne de agências.",
        narrativeDecision: "Diferenciação clara entre 'produção braçal desgovernada' e 'direção com propósito'.",
        visualDecision: "Fundo branco com smileys ciano grafiteiros escorrendo tinta e sublinhado manuscrito em laranja.",
        strategicContribution: "Frase de alto teor de compartilhamento que educa o mercado sobre o valor da estratégia prévia."
      },
      {
        num: 5,
        image: "/assets/images/case-caramelo/series-04/slide-05.webp",
        thumb: "/assets/images/case-caramelo/series-04/slide-05-thumb.webp",
        headline: "Quanto mais barata a execução fica... mais valiosos ficam:",
        lead: "repertório. critério. intenção. visão. bom gosto.",
        intention: "Explicar a lei econômica do valor na era da inteligência artificial.",
        narrativeDecision: "Apresentação dos 5 pilares insubstituíveis que definem o trabalho autoral de alto escalão.",
        visualDecision: "Luiz sentado confortavelmente numa cadeira vermelha de plástico espreguiçando-se ao sol com doodles de raios e setas.",
        strategicContribution: "Atrai clientes que já entenderam que ferramentas baratas geram poluição visual e precisam de curadoria de elite."
      },
      {
        num: 6,
        image: "/assets/images/case-caramelo/series-04/slide-06.webp",
        thumb: "/assets/images/case-caramelo/series-04/slide-06-thumb.webp",
        headline: "Talvez o profissional mais interessante dos próximos anos",
        lead: "não seja quem sabe fazer tudo. Mas quem sabe dirigir tudo isso na direção certa. A IA executa. Você dirige.",
        badges: ["pequenos passos", "GRANDES MUDANÇAS"],
        intention: "Concluir a tese com otimismo, empoderamento e posicionamento de liderança.",
        narrativeDecision: "A visão de futuro que fecha o ciclo da marca pessoal e convida o cliente à parceria.",
        visualDecision: "Luiz no topo de uma escada vermelha contra o céu crepuscular observando o horizonte com calma e segurança; logo 'C.'.",
        strategicContribution: "Encerramento triunfal que consolida a autoridade comercial de Luiz como Head de Conteúdo."
      }
    ]
  }
];
