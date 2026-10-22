import originals from "./original-prompts.json";
import notes from "./teacher-notes.json";

export const lessons = [
  { name: "ENTENDER", question: "O que estamos construindo?", result: "Briefing inicial da sua Landing Page.", color: "#FF701A" },
  { name: "CRIAR", question: "Da ideia à primeira tela", result: "Copy aprovada, Hero, imagem e vídeo integrados.", color: "#25BFFF" },
  { name: "DAR IDENTIDADE", question: "Uma linguagem visual consistente", result: "Página completa, Design System e regras de execução.", color: "#FFD52A" },
  { name: "DAR VIDA", question: "Da página à experiência", result: "Landing Page revisada e preparada para publicação.", color: "#FF3D8D" },
];
export const sections = ["HERO", "PROBLEMA", "SOLUÇÃO", "ENTREGAS", "PROCESSO", "CTA"];
export const sectionQuestions = ["O que é isso?", "Isso acontece comigo?", "Como isso resolve meu problema?", "O que vou receber?", "Como funciona?", "O que faço agora?"];
export const sectionTexts = ["Organize seu conteúdo com direção.", "Muitas ideias. Nenhum caminho claro?", "Uma estratégia que vira ação.", "Diagnóstico, plano e acompanhamento.", "Conversar → planejar → construir.", "Vamos começar seu projeto?"];
const promptOrder = [4, 0, 1, 2, 5, 3, 6, 7];
export const promptNames = ["Copy", "Hero Animada", "Reconstrução de Imagem", "Image to Video", "Moodboard → Design System", "System Prompt", "Project Report", "Motion Experience"];
export const prompts = promptOrder.map((originalIndex, i) => ({ ...originals[originalIndex], name: promptNames[i], number: i + 1 }));
export const toolIO = [
  ["Informações do seu negócio", "Textos organizados para a página"],
  ["Copy aprovada e referências", "Primeira tela funcional"],
  ["Cena de referência + identidade", "Imagem principal personalizada"],
  ["Imagem final + direção de movimento", "Vídeo curto para a Hero"],
  ["Moodboard e decisões visuais", "Regras de cores, fontes e componentes"],
  ["Decisões aprovadas e limites", "Instruções de execução para a IA"],
  ["Projeto existente, em modo leitura", "Mapa da estrutura e dos recursos"],
  ["Relatório + intenção narrativa", "Plano de movimento e interação"],
];
export const slides = [
  { title: "UMA PÁGINA BONITA CHAMA ATENÇÃO.", line: "Uma página bem construída conduz a uma decisão.", invite: "Qual destas páginas é mais fácil de entender?", task: "Defina a única ação que sua página precisa provocar.", deliverable: "Ação principal definida", prompt: -1 },
  { title: "UMA LANDING PAGE É UMA CONVERSA ORGANIZADA EM BLOCOS.", line: "Cada seção responde a uma pergunta.", invite: "Comece pela página inteira. Toque em um bloco para se aproximar.", task: "Liste os blocos necessários à sua oferta e a pergunta que cada um responde.", deliverable: "Mapa de seções registrado", prompt: -1 },
  { title: "A ORDEM DAS INFORMAÇÕES MUDA A FORMA COMO ENTENDEMOS UMA MENSAGEM.", line: "O caminho deve acompanhar a decisão do visitante.", invite: "Arraste os blocos ou use as setas para construir seu percurso.", task: "Escolha a ordem das seções da sua LP. Justifique o que seu visitante precisa saber primeiro.", deliverable: "Hierarquia da página definida", prompt: -1 },
  { title: "VOCÊ NÃO PRECISA SABER PROGRAMAR.", line: "Precisa aprender a dar direção.", invite: "Explore as oito ferramentas. Depois, prepare seu briefing.", task: "Preencha seu briefing inicial e copie as respostas para usar na próxima aula.", deliverable: "Briefing inicial preparado", prompt: -1 },
  { title: "ANTES DE CONSTRUIR A PÁGINA, PRECISAMOS SABER O QUE ELA VAI DIZER.", line: "A mensagem vem antes da interface.", invite: "Explore as perguntas que alimentam a copy.", task: "Execute o Prompt 01 na sua IA, responda à entrevista e revise a copy. Registre aqui o texto aprovado ou o link do documento.", deliverable: "Copy gerada e revisada", prompt: 0 },
  { title: "A HERO É O PRIMEIRO IMPACTO DA SUA LANDING PAGE.", line: "Texto, imagem e ação trabalhando juntos.", invite: "Toque nos elementos. Edite a copy e observe a mudança.", task: "Execute o Prompt 02. Substitua os textos de exemplo pela sua copy e confira a ação principal. Os números e depoimentos do prompt são exemplos: use apenas dados verificados do seu negócio.", deliverable: "Primeira Hero funcional", prompt: 1 },
  { title: "UMA REFERÊNCIA DEFINE A CENA.", line: "A outra define quem estará nela.", invite: "Compare as camadas e descubra o papel de cada referência.", task: "Execute o Prompt 03 com imagens próprias ou autorizadas. Preserve a cena da IMAGE 1 e use a IMAGE 2 somente para identidade facial. Registre o link do resultado.", deliverable: "Imagem principal personalizada", prompt: 2 },
  { title: "UMA BOA ANIMAÇÃO NÃO PRECISA CHAMAR ATENÇÃO.", line: "Ela precisa parecer natural.", invite: "Compare a imagem com o vídeo e examine o fechamento do loop.", task: "Execute o Prompt 04 para gerar cerca de 8 segundos. Confira início e fim, compressão, legibilidade da copy e imagem alternativa. Integre o vídeo à sua Hero.", deliverable: "Vídeo integrado à Hero", prompt: 3 },
  { title: "ANTES DE ESCOLHER CORES E FONTES, ESCOLHEMOS UMA DIREÇÃO.", line: "Um moodboard precisa comunicar uma intenção.", invite: "Selecione referências e observe o que elas têm em comum.", task: "Reúna referências reais do seu projeto. Registre seus links e as características recorrentes: paleta, contraste, fontes, formas e tratamento de imagem.", deliverable: "Moodboard reunido", prompt: -1 },
  { title: "MOODBOARD É INSPIRAÇÃO.", line: "Design System é regra.", invite: "Troque o sistema. A mensagem e a ordem continuam iguais.", task: "Execute o Prompt 05 usando seu moodboard. Revise as regras e autorize apenas as mudanças visuais desejadas. Documente cores, fontes, espaçamentos e componentes.", deliverable: "Design System definido", prompt: 4 },
  { title: "O QUE ESTÁ APROVADO NÃO DEVE MUDAR SEM PERMISSÃO.", line: "O pedido define o limite da alteração.", invite: "Pedido: “Troque a cor do botão.” Qual execução respeita a direção?", task: "Configure o Prompt 06 no Google AI Studio antes de expandir a página. Registre as decisões aprovadas de copy, Hero, sistema visual e estrutura.", deliverable: "Regras de execução configuradas", prompt: 5 },
  { title: "MESMA IDENTIDADE.", line: "Novas composições.", invite: "Adicione seções e compare repetição com consistência.", task: "Construa as seções restantes com a copy aprovada. Preserve a Hero e o Design System. Adapte a estrutura de viewport única para permitir scroll vertical.", deliverable: "Landing Page completa construída", prompt: -1 },
  { title: "ANTES DE TRANSFORMAR, PRECISAMOS MAPEAR.", line: "Entenda o que existe antes de modificar.", invite: "Inspecione o projeto e explore suas camadas.", task: "Execute o Prompt 07 em modo somente leitura. Confira se o relatório descreve a página real sem modificar arquivos, copy ou layout. Salve o documento.", deliverable: "Project Report conferido", prompt: 6 },
  { title: "ANIMAR NÃO É DECORAR.", line: "É comunicar.", invite: "Escolha uma cena. Controle o movimento e observe a mensagem.", task: "Escolha uma ideia da sua copy. Descreva o movimento que pode ajudar a explicá-la e onde ele acontece.", deliverable: "Intenção de motion definida", prompt: -1 },
  { title: "SCROLL, MOVIMENTO E INTERAÇÃO PODEM GUIAR O USUÁRIO.", line: "Escolha onde o movimento ajuda a entender.", invite: "Experimente entrada, scroll e resposta à interação.", task: "Execute o Prompt 08 usando o Project Report. Revise o plano antes de implementar no AI Studio. Preserve copy, Design System e funcionalidades; inclua uma alternativa com movimento reduzido.", deliverable: "Motion planejado e implementado", prompt: 7 },
  { title: "BONITA É BOM.", line: "Funcionando é essencial.", invite: "Verifique sua página real antes de marcar cada item.", task: "Revise desktop e celular, corrija as pendências e registre os passos para publicar sua LP: hospedagem, domínio, formulário e teste final.", deliverable: "Revisão final e plano de publicação", prompt: -1 },
].map((slide, i) => ({ ...slide, ...notes[i], heading: slide.title, lesson: Math.floor(i / 4) }));
export const finalChecks = ["A oferta está clara?", "Os textos estão corretos?", "O Design System está consistente?", "Os botões funcionam?", "Os formulários funcionam?", "A página funciona no celular?", "O vídeo e as animações carregam corretamente?", "A experiência continua compreensível sem animações?", "Existem erros, elementos quebrados ou informações inventadas?", "A página está preparada para publicação?"];
export const briefLabels = ["O que você oferece?", "Para quem?", "Qual problema resolve?", "Que ação deseja gerar?"];
