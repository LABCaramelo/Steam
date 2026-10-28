# Motor de execução da Trama

Adaptado do projeto local `Fiqon/server` em 28/10/2026 para a autenticação, a persistência e o ambiente de execução do LAB. O gateway autentica o JWT do Supabase, confere a aquisição `automation` e fornece um workspace privado por pessoa.

## Contratos

- `MemoryStore(state)` em `../memory-store.mjs` mantém uma cópia por requisição. `snapshot()` devolve `{documents, events}` para persistência transacional no Supabase. Os getters devolvem cópias; `transaction(fn)` exige callback síncrono e restaura documentos e eventos em erro.
- `Domain(store, box)` conserva validação de grafos, fluxos, versões imutáveis, conexões, aplicativos HTTP, memória de agentes e acumuladores.
- `secretBox(undefined, key)` usa AES-256-GCM. A chave vem de `TRAMA_ENCRYPTION_KEY`, com 64 caracteres hexadecimais. Sem chave, leitura de sessão e catálogo funciona; `encrypt` e `decrypt` falham com `TRAMA_KEY_REQUIRED`. Nenhum arquivo de chave é criado.
- `Jobs(domain, {autoStart:false, runtime:{maxExecutionMs:30000}})` prepara jobs sem efeitos externos. O gateway deve persistir o snapshot `queued` antes de `jobs.drain()`, atribuir `jobs.beforeStart` ao checkpoint para cobrir também os tratadores de erro automáticos, aguardar `job.promise` e `jobs.idle()`, e persistir o resultado final. Um checkpoint que falha resolve o job com `CHECKPOINT_FAILED` antes de iniciar seus efeitos.
- `Jobs.recover()` marca jobs `queued` e `running` de uma requisição anterior como `interrupted`. Não repete efeitos externos automaticamente. Replay utiliza o snapshot e a entrada original cifrada.

## Execução e limites

`executeGraph({flux,input,getConnection,onEvent,signal,executionId,options})` retorna `{status,steps,output,response?,duration_ms,operations,context,error?,warnings}`. `executeSingleStep` usa o mesmo motor. Filtros, roteadores, variáveis, loops, agregação, HTTP, conectores configurados, IA e MCP executam ações reais.

O orçamento total de um conjunto de jobs é de 30 segundos. Cada entrada e saída de módulo aceita até 256 KB; o contexto aceita 512 KB e o histórico de logs aceita 1 MB. Há 500 visitas por padrão, com teto de 1000, e 100 iterações por padrão, com teto de 500. Ao exceder um limite, a execução registra um erro explícito.

O histórico de eventos persistidos conserva até 1000 eventos e 1 MB por execução. `events()` inclui `events:truncated` quando uma consulta pede eventos já descartados. Os logs do resultado final permanecem no documento da execução.

O gateway controla a disponibilidade de agendamento, webhooks externos, convites e contas. As capabilities publicadas nesta integração indicam execução manual, Supabase e R2; agendamento, webhook externo, JavaScript e organizações compartilhadas estão indisponíveis. O módulo JavaScript preserva o texto digitado e responde `SCRIPT_UNAVAILABLE`; não utiliza `spawn`, `eval` ou `vm`.

## Saída de rede

HTTP e MCP usam `publicFetch` em `runtime/network.js`. O transporte resolve todos os endereços DNS e exige endereços públicos; a conexão fixa o IP verificado para impedir nova resolução no socket. Cada redirecionamento verifica o destino. Redirecionamentos para outra origem são recusados para preservar os cabeçalhos da conexão. As respostas HTTP têm limite padrão de 2 MB; MCP, de 1 MB.

O transporte de fixture `createNetworkFetch({allowPrivateNetworks:true})` só pode ser injetado em opções internas do servidor para testes. Nenhuma configuração de fluxo habilita redes privadas.

Os valores de todas as credenciais são removidos de erros e resultados públicos, incluindo cabeçalhos de nomes arbitrários e cabeçalhos fornecidos como JSON. As cópias cifradas de entrada, resposta e credenciais não integram os eventos públicos.

## Verificação

```powershell
node --test --test-isolation=none server/trama/runtime.test.mjs
```

Os testes cobrem isolamento das cópias, rollback, eventos, cifra, destinos privados, DNS, redirecionamentos, chamadas HTTP reais em loopback, MCP, verificação de conexão, expressões, código indisponível, início após persistência e recuperação sem repetição automática.
