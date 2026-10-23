# Montagem: densidade e espaço de trabalho

Atualização de 23/10/2026 para usar o LAB como referência de interface.

- Controles e rótulos: 11–12 px; títulos de painéis: 12 px. Cabeçalho: 56 px (antes 76 px), navegação: 56 px, transporte: 38 px e toolbar: 36 px.
- Divisórias entre biblioteca e prévia, entre prévia e propriedades, e acima da timeline. Arraste com mouse ou ponteiro; setas ajustam, Shift acelera, Enter ou clique duplo restauram. Escape cancela um arraste.
- Preferências locais separadas por conta na chave `lab:tool:montagem:<conta>:layout`, cobertas pela limpeza existente ao remover a ferramenta. Não fazem parte do projeto nem do histórico de edição.
- Limites deixam espaço para a prévia. Preferências de desktop são adaptadas temporariamente em janelas menores; a largura da biblioteca continua ajustável no editor embutido do LAB. No celular os painéis laterais usam sobreposições.
- A prévia acompanha o tamanho disponível com sua proporção preservada, inclusive após trocar a proporção do projeto. O texto criativo do vídeo não foi redimensionado pela mudança de tipografia da interface.

Verificação local: 50 testes aprovados, build isolado aprovado. No navegador: biblioteca 224→291 px, propriedades 252→322 px e timeline 270→360 px por arraste; recarga preservou os valores. Conferidos teclado, clique duplo, outra conta local, largura 390 px sem overflow horizontal e janela de 785×370 px com rodapé dentro da área visível. Console sem erros na prévia.

Arquivos principais: `PanelLayout.ts`, `layout-model.ts`, `layout-model.test.ts`, `CanvasPlayer.ts` e `montagem.css`. A atualização é apenas de cliente; não exige migração de banco.

Publicado e promovido: `dpl_ARY1Mxd2S2jzmchLX1zEMDMnMX3W`, produção READY, Vite, build de 56 segundos. Bundle `tool-montagem-Bz8aCllk.js`, CSS `tool-montagem-B-3G_mo4.css`. Na sessão autenticada do LAB, o arraste ajustou biblioteca 180→200 px e timeline 250→230 px; a recarga preservou ambos. Fontes computadas: controles 12 px e ações da timeline 11 px. Captura em `docs/qa/montagem-2026-10-22/workspace-compact-production.png`.
