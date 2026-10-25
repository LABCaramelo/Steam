# Acesso às ferramentas — 25/10/2026

O endereço direto da Biblioteca de prompts usava uma página pública sem `ToolGate`. Agora as dez entradas usam o gate comum, que valida o JWT com o Auth, recusa login anônimo e exige aquisição (ou administração na área Admin).

## Verificado

- Chrome sem sessão em `http://127.0.0.1:5184`: Biblioteca de prompts, Kanban, Prancheta, Automation, Academy, Claquete, Comunidade, Admin, No Ar e Montagem exibem a tela de login. Resultado em `direct-entry-checks.json`; captura em `prompt-library-signed-out.png`.
- GET local `/api/prompt-library` sem Authorization retorna 401. O HTML da entrada não contém o acervo antes da autorização.
- Testes comportamentais cobrem sessão local falsa, JWT rejeitado, logout com resposta atrasada, aquisição, privilégio falso em metadados, troca de token e armazenamento bloqueado.
- Testes das APIs cobrem 401/403, falha de verificação, propagação do JWT do dono, identidade de voz e autorização dos uploads.
- Testes PGlite cobrem as permissões reais legadas, chamadas anônimas, edição administrativa, isolamento entre usuários, TRUNCATE e reaplicação do SQL.
- A migração `secure_lab_tool_access` foi aplicada no Supabase `fzhzpzxsttflgtassyex`. Conferência posterior: anon sem EXECUTE em copy/save, sem SELECT em corpos/view administrativa/tabelas flick; authenticated sem TRUNCATE; quatro tabelas flick com política RESTRICTIVE.
- Typecheck e build dos dois projetos passaram. A suíte final passou 120 casos, incluindo a execução da API compilada e o salvamento de novas conversas com RLS.
- Os commits `13746d9` (Steam) e `439f593` (Flick) foram enviados para `main`; o GitHub confirmou sucesso dos dois deploys da Vercel. A entrada externa publicada mostrou login obrigatório em `claquete-phi.vercel.app`.
- A origem publicada `lab-caramelo.vercel.app`, sem sessão, mostrou o bloqueio da Biblioteca de prompts (`prompt-library-production-signed-out.png`).
- A conferência de produção encontrou `ERR_MODULE_NOT_FOUND` na API emitida: o import ainda apontava para `toolAccess.ts`. A opção `rewriteRelativeImportExtensions` corrige o caminho para `.js`; `apiEmit.test.ts` reproduz e verifica o carregamento pelo Node sem um loader TypeScript.

O projeto externo Claquete recebeu os 13 arquivos de `security/claquete/manifest.json` após conferência dos hashes originais. A sessão nessa origem é independente: exige entrar com a mesma conta também no Claquete. Projetos, APIs e novos uploads usam autorização do dono. Mídias antigas que já estavam no CDN público não foram removidas nem tornadas privadas por esta migração.

Os testes positivos de autorização usam SDKs simulados e Postgres em memória; não houve criação de conta, aquisição ou exclusão de dados reais para testar.
