# Trama — integração ao LAB

Trama é a evolução da Automation a partir de `D:\meus documentos\Fiqon`, analisada em 28/10/2026. O nome expressa a ligação entre ideias, dados e ações. Mantém `appid=4`, slug de autorização `automation`, aquisições e planejamentos anteriores. A origem foi somente lida; SQLite, chave e credenciais locais não foram copiados.

## Plataforma analisada

| Ferramenta | Função |
| --- | --- |
| Biblioteca de prompts | Acervo protegido por aquisição |
| Kanban | Quadros e rotina de produção |
| Prancheta | Design vetorial e arquivos privados |
| Trama, antes Automation | Fluxos e integrações |
| Academy | Cursos, aulas e progresso |
| Claquete | Projetos de cinema e vídeo com IA |
| Comunidade | Canais, mensagens e voz |
| No Ar | Composição, gravação e transmissão web |
| Montagem | Edição e exportação de vídeo |
| Creative OS | Clientes, projetos e operação criativa |
| Administração do LAB | Catálogo e gestão |

O padrão comum é uma entrada HTML independente aberta em iframe, `mountTool`/`ToolGate`, sessão Supabase, autorização por `has_tool` e dados próprios de cada conta. A Trama reutiliza esse padrão e o ciclo de remoção da biblioteca.

## Implementação

`/tools/automation/index.html` abre a Trama. `/tools/trama/index.html` é a entrada adicional. O roteamento interno usa hash. Os planejamentos React antigos continuam em `/tools/automation/index.html?legacy=1`; as quatro tabelas `automation_*` antigas permanecem intactas.

A interface Vue foi adaptada ao design system consultado no MCP Caramelo: Ink/Cream, tokens semânticos, Montserrat/Inter, assinatura em cinco cores, foco visível, temas sincronizados e movimento reduzido. Canvas, ramos, módulos, conexões, aplicativos HTTP próprios, templates, versões, terminal, histórico, replay e arquivos estão integrados.

O gateway `/api/trama` verifica Auth e aquisição antes de tocar os dados. Cada chamada usa o JWT do membro, inclusive downloads e streaming. Troca de conta aborta requisições e desmonta a ferramenta.

## Banco e credenciais

`automation_workspaces` conserva um snapshot privado por usuário, com revisão e lease de 90 segundos. As RPCs comparam revisão e token. Não há UPDATE direto para membros; wrappers públicos INVOKER delegam a funções privadas que validam dono e aquisição. O snapshot mantém uma unidade transacional para os contratos síncronos do domínio da origem.

`automation_files` guarda metadados de objetos R2. Ambas as tabelas têm RLS. A FK da aquisição remove workspace e metadados por meio de `release_tool('automation')`, sem substituir a RPC existente.

Credenciais, entradas privadas, memória de IA e respostas privadas selecionadas usam AES-256-GCM com `TRAMA_ENCRYPTION_KEY`, exclusiva do servidor. A chave não é gerada no backend nem enviada ao navegador. `node scripts/setup-trama.mjs --local` prepara uma chave na `.env` ignorada pelo Git. Preserve a mesma chave para recuperar os dados cifrados e configure-a na hospedagem antes de publicar.

A migração `supabase/migrations/20261028120408_trama_workspace_and_private_files.sql`, também disponível como `supabase/trama.sql`, foi instalada no projeto `fzhzpzxsttflgtassyex`. O conector retornou `Invalid or expired requestState` e a CLI retornou 403; a instalação transacional foi concluída por `execute_sql`, com o SQL integral registrado no histórico no mesmo commit. Verificação remota confirmou RLS, privilégios, tabelas e negação sem aquisição. Nenhuma conta ou dado de usuário foi alterado.

## Execução

Execuções manuais acionam HTTP, conectores, IA e MCP configurados pelo membro. Há limite de 30 segundos. O transporte valida destinos, fixa o IP validado e bloqueia redes internas e redirecionamentos entre origens. O runtime não recebe as credenciais globais do LAB.

Um registro `queued` e seu snapshot são persistidos antes dos efeitos de cada job, incluindo testes de nó e tratamentos de erro. O resultado final é confirmado antes de anunciar conclusão ao navegador. Após interrupção, pendências ficam `interrupted`; nenhuma ação é repetida automaticamente. Replay usa o grafo e a entrada da execução original.

Webhooks externos, agendamentos contínuos e JavaScript estão desabilitados nesta integração e identificados na interface. Precisam de infraestrutura de execução própria. A fila não é distribuída; cancelamento entre instâncias não é garantido. O histórico retém até 40 execuções por espaço; o snapshot admite até 8 MB. Verificações de conexão e RPCs de configuração não são jobs de fluxo com replay.

## R2

O bucket `umcaracaramelo-private` foi provisionado e conferido sem domínio público nem `r2.dev`. Escrita, leitura e exclusão reais passaram com objeto temporário, removido ao terminar. O bucket público de mídias permanece separado. Downloads passam pelo gateway autenticado. Limites: 2 MB por arquivo, 200 arquivos e 100 MB por conta.

O trigger de exclusão conserva as chaves na fila privada de limpeza. `node scripts/trama-r2-gc.mjs` exibe uma prévia; `--apply` remove objetos e confirma somente exclusões bem-sucedidas. Nenhuma manutenção periódica foi instalada. Detalhes em `server/trama/STORAGE.md`.

## Validação e publicação

TypeScript e build Vite aprovados. A suíte da plataforma passou 145 testes; o runtime da Trama passou mais 15. A conferência no Edge com fixture local passou criação de fluxo, execução pelo motor real, versão, envio/download/exclusão de arquivo, temas e viewport móvel. Auth, persistência e arquivos da conferência visual são controlados localmente; não representam uma sessão de membro real no Supabase.

Capturas e resultados estão em `docs/qa/trama-2026-10-28/`. A inspeção visual orientou correções da lista móvel e do contraste no tema claro. A auditoria MCP automática é complementar: não mede todos os contrastes computados de Vue/Vuetify.

Schema e bucket estão preparados. O código não foi publicado em produção; a disponibilidade comercial do catálogo foi preservada. Antes de publicar, configure `TRAMA_ENCRYPTION_KEY` e as variáveis R2 no servidor da hospedagem.

A auditoria de dependências identificou avisos na cadeia preexistente do pacote local `@caramelo/design-system` (Zod), cuja atualização é independente desta integração. As dependências da Trama foram fixadas no lockfile.
