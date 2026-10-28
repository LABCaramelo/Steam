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

O beta recebe webhooks externos síncronos em `/api/trama-hook`. Publique uma versão com gatilho Webhook e ative o fluxo. A URL de captura recebe dados mesmo com o fluxo desativado e não executa ações. Cada chamada aceita até 256 KB em JSON, formulário ou texto, com limite de 60 chamadas por minuto por fluxo. O token da URL permite acionar o fluxo: mantenha-o privado e use a troca de token para revogar URLs anteriores.

`Idempotency-Key` evita repetir um evento enquanto sua execução permanece no histórico (até 40 execuções por espaço). Após interrupção, confira o histórico e os efeitos externos antes de reenviar. O tempo máximo de execução é 30 segundos; não há processamento assíncrono. Chamadas concorrentes recebem 429 e `Retry-After`. A fila não é distribuída; cancelamento entre instâncias não é garantido. O snapshot admite até 8 MB. Agendamentos contínuos e JavaScript permanecem indisponíveis. Verificações de conexão e RPCs de configuração não são jobs de fluxo com replay.

A migração `20261028175516_trama_beta_webhooks.sql` adiciona o registro de hashes dos tokens e RPCs de execução restritas à service role. A autorização do proprietário é conferida com `has_tool('automation')` a cada chamada. Perda de acesso, exclusão do fluxo ou troca de token revogam a entrada. A captura e os resultados seguem a persistência no Supabase; o armazenamento privado no R2 permanece separado.

## R2

O bucket `umcaracaramelo-private` foi provisionado e conferido sem domínio público nem `r2.dev`. Escrita, leitura e exclusão reais passaram com objeto temporário, removido ao terminar. O bucket público de mídias permanece separado. Downloads passam pelo gateway autenticado. Limites: 2 MB por arquivo, 200 arquivos e 100 MB por conta.

O trigger de exclusão conserva as chaves na fila privada de limpeza. `node scripts/trama-r2-gc.mjs` exibe uma prévia; `--apply` remove objetos e confirma somente exclusões bem-sucedidas. Nenhuma manutenção periódica foi instalada. Detalhes em `server/trama/STORAGE.md`.

## Validação e publicação

TypeScript e build Vite aprovados. A suíte da plataforma passou 158 testes, incluindo o webhook real com transporte de teste e banco PGlite: versão publicada, idempotência, formulários já analisados pela Vercel, captura, troca de token, autorização e concorrência. O runtime da Trama passou mais 15 testes. A conferência anterior no Edge com fixture local passou criação de fluxo, execução pelo motor real, versão, envio/download/exclusão de arquivo, temas e viewport móvel. Auth, persistência e arquivos dessa conferência visual são controlados localmente; não representam uma sessão de membro real no Supabase.

Capturas e resultados estão em `docs/qa/trama-2026-10-28/`. A inspeção visual orientou correções da lista móvel e do contraste no tema claro. A auditoria MCP automática é complementar: não mede todos os contrastes computados de Vue/Vuetify.

O catálogo está disponível em beta. `TRAMA_ENCRYPTION_KEY` e `CLOUDFLARE_R2_PRIVATE_BUCKET` foram configuradas no ambiente de produção da Vercel, usando a mesma chave do ambiente local e o bucket privado provisionado. As credenciais do Supabase e R2 permanecem exclusivas do servidor.

A auditoria de dependências identificou avisos na cadeia preexistente do pacote local `@caramelo/design-system` (Zod), cuja atualização é independente desta integração. As dependências da Trama foram fixadas no lockfile.

## Identidade e comportamento dos modais

A Trama usa o sistema Lumen do MCP Caramelo em toda a interface: área de trabalho, cartões de módulo, portas, conexões, controles, terminal, telas de fluxos/conexões/histórico e modais. Os tokens semânticos e o tema do LAB também alcançam os overlays do Vuetify. A interface respeita teclado, foco e movimento reduzido.

O Webhook apresenta produção e teste simultaneamente. Testar Webhook inicia uma escuta cancelável de até dois minutos. `/flows/:id/webhook/capture` consulta somente o proprietário, sem lease ou gravação, e retorna apenas chamadas ao link de teste. A entrada pode ser fixada, editada ou limpa. Selecionar uma nova ação exige confirmar em Salvar antes de inserir o nó.

O Retorno apresenta Formato/Código de resposta, abas Body/Headers e editor expandido. O servidor respeita JSON, XML, HTML, texto e multipart, com limite de 2 MB. HTML e XML recebem CSP com sandbox; headers de segurança e identificação da execução permanecem controlados pelo servidor. A conferência visual está em `docs/qa/trama-identity-2026-10-28/`.
