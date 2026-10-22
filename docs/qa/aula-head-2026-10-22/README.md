# Landing Pages com IA — validação local

Atualização de `/aula-head`, em 22/10/2026. Quatro aulas de quatro slides principais. Cada slide alterna estados de exploração e prática sem criar novas páginas.

## Implementação

- Entrada Vite: `aula-head/index.html`. Conteúdo e componentes em `src/aula-head/`.
- Desktop: palco 16:9. Telas menores: conteúdo adaptado com leitura vertical.
- Estados internos: comparação, zoom por seção, ordenação, ferramentas, wireframe, Hero editável, comparação de imagens, vídeo, moodboard, sistemas visuais, quiz, expansão, inspeção, motion, interação e revisão.
- Modo Professor: janela separada com os 16 roteiros e instruções; `BroadcastChannel` sincroniza a navegação nas duas direções. A identificação da apresentação permanece durante recargas da janela principal. Compartilhar a tela inteira também mostra as notas; deve-se compartilhar somente a janela da apresentação.
- Caderno do aluno: briefing, 16 registros de entrega e dez verificações finais, salvos no navegador com exportação Markdown e cópia. Não há sincronização de conta ou envio desses registros ao servidor.
- Imagens inseridas na comparação permanecem apenas na sessão. A interface não executa geração de imagem, vídeo ou código por IA.

## Fontes preservadas

O roteiro de fala e as instruções foram extraídos do arquivo `Texto colado.txt` anexado ao pedido. Os oito textos integrais foram recuperados do acervo incorporado à apresentação anterior, em `public/aula-head/assets/index-D2Ot7DKX.js`, usando o parser do TypeScript, sem executar o bundle.

`src/aula-head/original-prompts.json` mantém os textos e nomes dos documentos originais. A ordem de uso é definida em `data.ts`: Copy, Hero, Reconstrução de Imagem, Image to Video, Design System, System Prompt, Project Report, Motion Experience. A comparação dos oito textos com a fonte anterior confirmou igualdade integral.

## Evidências

| Verificação | Resultado observado |
| --- | --- |
| `npm run build` | TypeScript e build Vite concluídos. `/aula-head/index.html` emitido em `dist/`. Aviso de tamanho referente ao bundle já existente da Comunidade. |
| Versão compilada | `vite preview` carregou a apresentação; `/aula-head`, `/aula-head/`, `/aula-head/index.html` e `/aula-head/aula-01` retornaram 200 com a nova entrada. Sem erros de console dessa versão. |
| 16 slides em desktop | Todos carregaram; conteúdo do experimento permaneceu antes do rodapé; palco com proporção 16:9, considerando arredondamento de pixels. |
| 16 slides em celular | Emulação de 390 × 844: zero overflow horizontal em todos os slides. |
| Slide 02 | Hero e Problema selecionáveis, com mudança da seção ampliada e da pergunta; contador permanece 02/16. |
| Cópia dos prompts | Os oito textos completos chegaram à área de transferência; comprimentos conferidos com a fonte. |
| Janela Professor | Navegação 04→05 pelo professor refletiu no aluno; navegação 05→02 pelo aluno refletiu no professor. Nenhum bloco “Como conduzir” no conteúdo projetado. |
| Briefing e progresso | Texto de teste e entrega marcada permaneceram depois de recarregar. Dados de teste removidos pela interface após a conferência. |
| Exportação | Cópia do projeto produziu Markdown com briefing e revisão final. Botão de download gerou `minha-landing-page-head.md`. |
| Hierarquia | Reordenação por botões e feedback de percurso possível funcionaram. |
| Hero | Edição da headline atualizou a prévia imediatamente. Texto de teste restaurado após a conferência. |
| Design System | Mudança para Digital essencial preservou a copy. |
| Quiz | Escolha de alteração localizada revelou o feedback correto. |
| Expansão | Hero + cinco seções disponíveis, com navegação vertical. |
| Inspeção | Seleção de Assets exibiu a camada e o documento demonstrativo. |
| Vídeo | Reprodução com frames carregados, áudio silenciado e pausa disponíveis. |
| Motion | Reprodução e pausa atualizaram o controle de progresso. Movimento reduzido desativou reprodução automática. |
| Checklist | Dez marcações revelaram o fechamento; marcações de teste desfeitas. |

A conferência foi local. A execução dos prompts em ferramentas externas, o projeto real do aluno e a publicação em produção não foram realizados por esta apresentação.

![Slide 02 com a Hero selecionada](anatomia.png)
