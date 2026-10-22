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
  { title: "UMA PÁGINA BONITA CHAMA ATENÇÃO.", line: "Uma página bem construída conduz a uma decisão.", invite: "Qual destas páginas é mais fácil de entender?", prompt: -1 },
  { title: "UMA LANDING PAGE É UMA CONVERSA ORGANIZADA EM BLOCOS.", line: "Cada seção responde a uma pergunta.", invite: "Comece pela página inteira. Toque em um bloco para se aproximar.", prompt: -1 },
  { title: "A ORDEM DAS INFORMAÇÕES MUDA A FORMA COMO ENTENDEMOS UMA MENSAGEM.", line: "O caminho deve acompanhar a decisão do visitante.", invite: "Arraste os blocos ou use as setas para construir seu percurso.", prompt: -1 },
  { title: "VOCÊ NÃO PRECISA SABER PROGRAMAR.", line: "Precisa aprender a dar direção.", invite: "Explore as oito ferramentas e descubra o que cada uma recebe e entrega.", prompt: -1 },
  { title: "ANTES DE CONSTRUIR A PÁGINA, PRECISAMOS SABER O QUE ELA VAI DIZER.", line: "A mensagem vem antes da interface.", invite: "Explore as perguntas que alimentam a copy.", prompt: 0 },
  { title: "A HERO É O PRIMEIRO IMPACTO DA SUA LANDING PAGE.", line: "Texto, imagem e ação trabalhando juntos.", invite: "Toque nos elementos. Edite a copy e observe a mudança.", prompt: 1 },
  { title: "UMA REFERÊNCIA DEFINE A CENA.", line: "A outra define quem estará nela.", invite: "Compare as camadas e descubra o papel de cada referência.", prompt: 2 },
  { title: "UMA BOA ANIMAÇÃO NÃO PRECISA CHAMAR ATENÇÃO.", line: "Ela precisa parecer natural.", invite: "Compare a imagem com o vídeo e examine o fechamento do loop.", prompt: 3 },
  { title: "ANTES DE ESCOLHER CORES E FONTES, ESCOLHEMOS UMA DIREÇÃO.", line: "Um moodboard precisa comunicar uma intenção.", invite: "Selecione referências e observe o que elas têm em comum.", prompt: -1 },
  { title: "MOODBOARD É INSPIRAÇÃO.", line: "Design System é regra.", invite: "Troque o sistema. A mensagem e a ordem continuam iguais.", prompt: 4 },
  { title: "O QUE ESTÁ APROVADO NÃO DEVE MUDAR SEM PERMISSÃO.", line: "O pedido define o limite da alteração.", invite: "Pedido: “Troque a cor do botão.” Qual execução respeita a direção?", prompt: 5 },
  { title: "MESMA IDENTIDADE.", line: "Novas composições.", invite: "Adicione seções e compare repetição com consistência.", prompt: -1 },
  { title: "ANTES DE TRANSFORMAR, PRECISAMOS MAPEAR.", line: "Entenda o que existe antes de modificar.", invite: "Inspecione o projeto e explore suas camadas.", prompt: 6 },
  { title: "ANIMAR NÃO É DECORAR.", line: "É comunicar.", invite: "Escolha uma cena. Controle o movimento e observe a mensagem.", prompt: -1 },
  { title: "SCROLL, MOVIMENTO E INTERAÇÃO PODEM GUIAR O USUÁRIO.", line: "Escolha onde o movimento ajuda a entender.", invite: "Experimente entrada, scroll e resposta à interação.", prompt: 7 },
  { title: "BONITA É BOM.", line: "Funcionando é essencial.", invite: "Verifique sua página real antes de marcar cada item.", prompt: -1 },
].map((slide, i) => ({ ...slide, ...notes[i], heading: slide.title, lesson: Math.floor(i / 4) }));
export const finalChecks = ["A oferta está clara?", "Os textos estão corretos?", "O Design System está consistente?", "Os botões funcionam?", "Os formulários funcionam?", "A página funciona no celular?", "O vídeo e as animações carregam corretamente?", "A experiência continua compreensível sem animações?", "Existem erros, elementos quebrados ou informações inventadas?", "A página está preparada para publicação?"];
