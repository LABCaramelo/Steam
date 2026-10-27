# Jornada interativa da landing page

Implementação local de 26/10/2026, sobre a copy já existente no commit `e6e766a`. Nenhum texto comercial foi reescrito nesta etapa. O contato direto pelo WhatsApp e a retirada do card Aula Head, já incorporados ao projeto, foram preservados.

## Revisão com Figma for Motion

Foram exploradas no navegador as referências [versão original](https://figmaformotion.com/) e [v2](https://figmaformotion.com/v2), incluindo rolagem entre estados. A v2 mantém uma composição durante várias telas de rolagem: o deck se reorganiza e dá lugar a uma distribuição de cartões em torno do público em destaque. A versão original combina tipografia dominante, capítulos com espaço de leitura, apresentações de público e prévias interativas.

A diferença em relação à primeira implementação do Caramelo era a quantidade de mudanças de assunto dentro da mesma composição. Revelações, parallax e hovers movimentavam superfícies, enquanto a leitura continuava principalmente numa lista vertical. A revisão passou a controlar também o assunto em destaque:

- **Serviços:** guia lateral em três estados — apresentação, possibilidades e escopo/conversa. O guia acompanha a região em leitura e permite saltar para ela. A copy inteira permanece no documento e legível.
- **Case editorial:** quatro estados de capas reais no mesmo quadro. O scroll traz uma série à frente e o botão de abrir carrosséis acompanha a série ativa. Existem controles diretos para escolher o destaque.
- **Processo:** quatro painéis no mesmo palco, com pausa de leitura antes de cada transição. Os controles funcionam como abas e aceitam setas, Home e End; o scroll avança e regride a seleção.

O processo funciona também em janelas a partir de 700×650 com ponteiro preciso, incluindo a prévia de 724×750. O palco editorial usa a composição larga a partir de 1000×800. Celulares, movimento reduzido e `?motion=off` conservam o fluxo integral. A coreografia usa os ativos reais do Caramelo, sem incorporar mídia, fontes ou copy das referências.

## Leitura dos quatro pacotes

Os 31 prompts de `Prompts_Sites_Cinematograficos_4_Pacotes_PTBR.txt` foram analisados como referências de direção. Os princípios aproveitados foram:

1. Uma transformação com abertura, progressão e chegada, controlada pela leitura.
2. Relação direta entre o progresso visual e o conteúdo apresentado.
3. Camadas com velocidades diferentes para sugerir profundidade, mantendo a tipografia protegida.
4. Pausas para ler, hierarquia de movimentos e uma ação útil em cada capítulo.
5. Reversibilidade, resposta a teclado/toque, carregamento progressivo e uma versão legível com movimento reduzido.

A implementação usa os vídeos, artes, cores, fontes e bibliotecas locais do Caramelo: GSAP, ScrollTrigger, Lenis e CSS. Não adiciona dependências, mídia gerada ou requisições a serviços de produção de imagens/vídeos. A profundidade usa transformações de CSS; não há uma nova cena WebGL.

## Auditoria do comportamento anterior

- A home já tinha entradas de títulos, vídeos, controles de disciplinas, rastro do ponteiro e bibliotecas de scroll.
- O portfólio compacto não usava o antigo deck de scroll, mas a detecção de desktop ainda suprimia as entradas das suas capas. Essa condição foi corrigida.
- A composição expandida de Quem sou conservava a biografia em fluxo, mas também desativava a direção pelo scroll. Ela agora conduz a arte sem fixar ou esconder o texto.
- Processo e contato haviam sido acrescentados após a coreografia original; seus títulos não participavam das revelações.
- O índice de capítulos existia no HTML, mas permanecia oculto. Agora aparece discretamente no desktop, com o estado da seção atual.

## Direção por seção

| Seção | Comportamento |
| --- | --- |
| Hero | Entrada tipográfica e recortes existentes preservados; filmes ganham resposta discreta de perspectiva ao ponteiro. |
| Serviços | Guia lateral de três estados acompanha a leitura e permite navegar entre regiões; todos os parágrafos e CTAs continuam em fluxo. |
| Projetos | Quatro estados das capas reais conduzem o case editorial. O CTA abre a série em destaque; as prévias em vídeo e detalhes expansíveis permanecem disponíveis. |
| Como trabalho | Em janelas compatíveis, uma etapa por vez ocupa o palco. Abas e progresso acompanham o scroll, com navegação por teclado. No mobile, os quatro passos continuam em fluxo. |
| Quem sou | As sete disciplinas acompanham o progresso de scroll no desktop. A seleção manual continua funcionando e leva à posição correspondente. A arte também responde ao ponteiro. |
| FAQ | Título acompanha a leitura no desktop; respostas expandem e recolhem suavemente, mantendo a semântica nativa de details/summary. |
| Contato | Título entra na sequência; cartão do WhatsApp se acomoda e recebe um contorno progressivo. O destino continua sendo `5531985869015`. |
| Aprender | O cartão do workshop mantém a entrada e o spotlight, com borda que acompanha sua chegada. |
| Recursos/comunidade | Selo acompanha o scroll; linhas e respostas de foco conduzem aos dois destinos existentes. |

## Carrosséis reais

Os quatro PNGs originais na raiz do projeto são faixas horizontais de slides em 1080×1440. A comparação de cada recorte com as imagens WebP existentes confirmou os 26 slides, sem lacunas nem inversão de ordem dentro das séries:

| Original | Slides | Série no visualizador |
| --- | --- | --- |
| `carrossel (1).png` | 6 | `series-01` |
| `carrossel (2).png` | 6 | `series-04` |
| `carrossel (3).png` | 7 | `series-02` |
| `carrossel (4).png` | 7 | `series-03` |

Foram preservadas as versões WebP já preparadas e as miniaturas. O visualizador continuou abrindo, avançando slides, alternando para Modo Estratégico e fechando com Escape durante a verificação.

## Arquivos desta alteração

- `public/assets/js/journey.js`: nova direção por capítulos, processo interativo, profundidade e disclosures animados.
- `public/assets/js/reading-scenes.js`: palcos do processo e do case editorial, seleção por scroll e navegação direta.
- `public/journey.css`: estilos progressivos, controles, capítulo, processo e respostas visuais.
- `public/assets/js/offers.js` e `public/offers-reading.css`: guia dos serviços, regiões de leitura e restauração do documento original.
- `public/assets/js/media.js`: `?motion=off` também mantém os vídeos pausados.
- `public/assets/js/app.js`: inicialização da jornada com o Lenis existente.
- `public/assets/js/cinematic.js`: detecção correta do portfólio compacto e entrada dos títulos Processo/Contato.
- `public/assets/js/maker.js`: direção da composição expandida pelo scroll.
- `public/index.html`: somente a inclusão do stylesheet; a copy permanece intacta.
- `docs/qa/jornada-interativa-2026-10-26/`: capturas da verificação visual.

## Verificação e limites

- Build TypeScript/Vite aprovado, sem novas dependências. O aviso anterior de tamanho do bundle do LAB/comunidade permanece fora desta alteração.
- Módulos alterados passaram em `node --check`; CSS passou no parser PostCSS; `git diff --check` sem erros.
- Os 16 testes existentes do modelo comercial passaram. A verificação principal desta alteração foi feita no navegador, pois esses testes não medem animação.
- Desktop 1440×900 e mobile 390×844: etapas, foco, títulos e CTAs sem recortes observados.
- Processo selecionado pelos controles e por teclado; PageUp reduziu o progresso e reativou a etapa anterior. Título permaneceu na posição prevista durante a leitura desktop.
- FAQ e contexto dos cases abriram/fecharam por Enter; alturas temporárias foram liberadas ao concluir a animação.
- Redimensionamento entre desktop/mobile e mudança de preferência removeram/restauraram os controles sem duplicar títulos ou wrappers.
- `prefers-reduced-motion` removeu a nova coreografia e pausou os vídeos. O documento também foi testado com execução de JavaScript desativada: texto, FAQ nativo, cases e WhatsApp permaneceram disponíveis.
- Nenhum novo erro de console observado após a correção e o recarregamento final.
- Revisão dos palcos: seleção de Criação seguida de ArrowLeft ativou Direção; a terceira capa colocou `serie-03` à frente e o CTA abriu essa mesma série no visualizador real. Ao ativar movimento reduzido, abas/painéis/guia foram desmontados e o CTA recuperou sua série original.
- Transições entre 1440×900, 724×750 e 390×844 verificadas sem duplicação de títulos ou controles; em `?motion=off`, todos os vídeos permaneceram pausados.
- Capturas da revisão em `docs/qa/leitura-dirigida-2026-10-26/` mostram os serviços e o palco do processo.
- Um excesso de um pixel no scrollWidth do elemento HTML em 390px também ocorre no documento sem JavaScript; o corpo e o conteúdo mediram 390px, sem texto ou controles cortados. Não foi feito benchmark de FPS ou auditoria Lighthouse.

As emulações de teste foram restauradas. Nenhuma mensagem foi enviada ao WhatsApp. Após a validação local, o usuário autorizou o envio das melhorias ao Git; a entrega segue pela branch `main` e sua integração existente de publicação na Vercel. Prévia local: `http://127.0.0.1:5181/`.
