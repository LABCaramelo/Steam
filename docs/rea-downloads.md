# Reconstrução dos downloads da Steam

## Escopo e fontes

Estudo estático dos arquivos da instalação em `D:/Steam/steamui`. Nenhum bundle da Valve foi executado ou incorporado ao código da aplicação. A simulação é uma implementação própria e funciona em memória durante a sessão do navegador.

O MCP REA analisou a árvore original e preservou resultados parciais após o limite de 30 segundos: `ev_734a28b6843a8d8de6c85347b3ef6c9665f4908a760d7fe301881aaa1a54e3ad`. A visão resumida é `ev_28086190be1f03298c236e288baadfcb220d41974b302ebdf43fae9be23cb30e`. A cobertura da aplicação e da semântica é parcial; a análise ampla não alcançou o módulo de downloads em `sp.js`.

Para reduzir o escopo, `scripts/extract-download-reference.mjs` extraiu por AST a função original do módulo webpack 11698, sem executá-la. A extração fica em `.rea-reference/downloads`, fora do bundle da aplicação e ignorada pelo Git. `provenance.json` registra caminhos, hashes e o intervalo original.

- `sp.js`: SHA-256 `5a28c25041d07e69cf591a414519e0cf970b6884c1a0106659dcd9f1fb9586f9`.
- Intervalo da função: `[14026759, 14069535)` em unidades UTF-16.
- Função original extraída: SHA-256 `1898886537dbddd21ba2f488dfd1367adc7bcda21bd278a2e2db0e71bae1f966`.
- Localização brasileira original: SHA-256 `ff24218d912cbf4acfcf768eea7579dd68240e030c12e8bea579b6da681b15ea`.

O REA analisou a extração e o recurso de localização: `ev_a3f1ad9199373694267e5c9bcfea2d89a19e70e5dd68abb88fd99c9e2ddedf03`. A visão resumida `ev_9bb1c0d56650ac4749a9ac294922b5ce0453b8329b6b038b9f0cf4c6b2510c03` informa cobertura completa do inventário desta extração, sem falhas de parse, mas cobertura semântica desconhecida com 3.040 lacunas. Esse resultado não demonstra execução nem equivalência ao cliente Steam.

## Observações, decisões e limites

| Questão | Evidência / resultado | Aplicação na recriação |
| --- | --- | --- |
| Identidade do módulo | REA reconhece o módulo ESM e o export default da função extraída; visões `ev_08369c5bb9e2c00bb65f1004914f54ec96be78919f3d2159478585269b705ebd` e `ev_7327d30e7e6865d1300c67f79dadc165899095452980be733d8955df712a8ef0`. | Fonte registrada e delimitada. |
| Pausa e retomada | Leitura direta e inerte da função autenticada mostra seleção entre `#Downloads_Pause_Tooltip`/ícone Pause e `#Downloads_Resume_Tooltip`/ícone Play conforme `paused`. | Estado pausado conserva progresso; retomar continua dali. |
| Remoção | A mesma função contém `onRemoveFromDownloadList` e rótulos distintos de remover da fila / lista concluída. | Cancelar e pausar usam ações diferentes; limpar histórico conserva a instalação simulada. |
| Tracing de rótulo | `ev_0e28b9c7c0be3b39eb3dc1418c971ba16b67653de3cdbc0122b587787302f291` não encontrou o rótulo literal no grafo. Isso não prova ausência da função; ela foi observada nos bytes extraídos. | Nenhuma alegação de cadeia de chamadas ou comportamento nativo foi feita. |
| Estados reais | Os manifestos locais já expõem downloading, paused, queued e update_required. | Seleção compartilhada separa andamento, fila e concluídos; um app aparece uma vez. |
| Rede | Manifestos estáticos não medem a velocidade da rede. | O gráfico só anima transferências simuladas e identifica sua origem; dados reais não ganham velocidades inventadas. |

O controlador local usa incremento de demonstração e aceita transferências simultâneas. São escolhas próprias, não comportamento comprovado da Steam. Instalações, pausa, execução e histórico simulados não sobrevivem ao recarregamento do navegador. A integração `steam://` existente continua dependente da opção do usuário.

## Verificação

- `npm run build`: TypeScript e bundle de produção passaram.
- `npm test`: cinco testes passaram: pausa/retomada, cancelamento, conclusão e histórico, ações globais e classificação/deduplicação.
- Navegador com biblioteca real via `/api/library`: instalação simulada de Portal: First Slice pausada em 4%; manteve 4% após vários ticks e navegação; retomada avançou a 7%.
- A instalação concluiu; Portal permaneceu no histórico durante o lançamento e chegou ao estado Jogando após navegar para Downloads.
- Controle global Pausar todos testado com Black Desert: transferência preservada em 4%, rede atual em zero e estado refletido no rodapé e na lista lateral. Captura em `downloads-preview.png`.
- `/api/library`: HTTP 200, fonte local, 23 apps e uma biblioteca. Console do navegador sem erros ou avisos no fluxo final.

A análise estática não valida downloads reais, chamadas ao serviço Steam, licenças ou o comportamento do cliente nativo. O objetivo desta etapa é a interface e a simulação local.
