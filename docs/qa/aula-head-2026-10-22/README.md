# Landing Pages com IA — validação local

Versão de 22/10/2026: abertura interativa e quatro apresentações de quatro slides.

## Comportamento atual

- Abertura original recuperada com vídeo local controlado pelo mouse, logo HEAD e quatro cards de aula.
- Cada card abre a apresentação correspondente. Apenas os quatro slides dessa aula ficam disponíveis; o último botão retorna à abertura para escolher outra aula.
- Cabeçalho, palco e navegação cabem na viewport. A tela principal não depende de rolagem vertical. Prompts integrais mantêm leitura interna quando necessário.
- Sem “Meu projeto”, caderno, briefing pessoal, registros de entrega, exportação ou painéis “No seu projeto”. As demonstrações usam estado transitório, sem leitura ou gravação de projeto em localStorage.
- Modo Professor removido: sem botão, notas, janela separada ou sincronização entre janelas. Links antigos com `?professor=1` abrem a apresentação normal.
- O convite “clique em uma seção ←” usa o MagneticButton canônico do MCP Caramelo (magnetic-fill, accent, fill, swap). O clique abre Hero e transfere o foco para a seção do mapa.

## Fontes

Os oito prompts integrais permanecem idênticos ao acervo anterior, recuperado do bundle original `public/aula-head/assets/index-D2Ot7DKX.js` com o parser do TypeScript. A numeração de uso permanece em `src/aula-head/data.ts`. As notas do professor foram retiradas; os títulos dos slides foram preservados.

O vídeo, poster, logo e artes da abertura continuam em `public/aula-head/`. A cronologia direcional do mouse e o CSS da abertura foram recuperados do bundle e CSS anteriores. O CSS está isolado em `.head-intro`; ajustes de viewport ficam em `intro.css`.

O botão do Slide 02 foi conferido com `get_interaction({id: "magnetic-fill", format: "react"})` do MCP Caramelo e usa o componente de `@caramelo/design-system` 2.0.0, com o CSS canônico já servido em `/caramelo/styles.css`.

## Evidências de validação

| Verificação | Resultado |
| --- | --- |
| Build | TypeScript e Vite concluídos. Aviso de tamanho apenas no bundle existente da Comunidade. |
| Abertura | Vídeo carregado, áudio silenciado; olhar para cards esquerdos em 3,1s e direitos em 1,6s, conforme cronologia original. |
| Navegação | Quatro pontos e contador 01/04 a 04/04 em cada aula. Abas para trocar de aula removidas. Voltar ao início funciona no fim de cada aula. |
| Viewports | 16 slides em 1280×720, 390×844 e 844×390: 48 estados sem overflow vertical externo, com rodapé dentro da janela. |
| Movimento reduzido | Painel de ferramentas conferido sem overflow interno nas três dimensões, desconsiderando o deslocamento transitório da animação de entrada. |
| Professor | Modo e código de sincronização removidos. Link antigo com `?professor=1` abre a apresentação normal. |
| CTA canônico | Classes cm-btn, cm-btn--accent, cm-btn--lg e cm-btn--fill. Clique revelou “O que é isso?” e focou o botão Hero do mapa. |
| Dados pessoais | Ausência dos controles de projeto/caderno e de código de persistência localStorage na apresentação. |
| Prompts | Acervo integral preservado e acesso pelo banco na abertura e nas aulas. |

## Capturas

![Abertura com vídeo e cards das quatro aulas](abertura.png)

![Slide 02 com o botão magnetic-fill](anatomia.png)
