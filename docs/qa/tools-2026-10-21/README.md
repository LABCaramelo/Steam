# Ferramentas do LAB — verificação de 21/10/2026

Implementações: Kanban, Prancheta, Automation e Academy. Nenhuma migração ou alteração de dados foi executada no Supabase de produção nesta tarefa.

## Verificações automatizadas

- TypeScript sem erros.
- Suite do servidor + Kanban + mídia da Academy: **52 testes passaram**, incluindo os 16 de `server/labTools.test.ts` contra o SQL real em Postgres em memória (PGlite).
- Automation: **6 testes de domínio passaram** (importação, exportação, credenciais, arquivos inválidos, builder e simulação).
- Prancheta: **4 grupos de regressão passaram**: snapshots imutáveis/gravações sobrepostas, falha de rede/retry, conflito de revisão e filtros de proprietário.
- As 16 artes SVG foram analisadas como XML válido.

O runner usa `--test-isolation=none` porque a criação de workers de teste é bloqueada no sandbox Windows. O build usa as quatro entradas HTML reais das ferramentas e os assets do projeto.

## Conferência no navegador

Executada no Vite local. Para interagir com as telas sem criar contas, aquisições ou registros em produção, foram usados repositórios em memória injetados nos mesmos componentes. As páginas temporárias de teste foram retiradas ao final. Portanto, os estados de salvamento vistos nas capturas abaixo comprovam o fluxo dos componentes com o repositório de teste; não comprovam uma sessão autenticada nem a configuração do Supabase hospedado.

| Superfície | Evidência observada |
| --- | --- |
| Academy | Curso publicado na vitrine; apresentação `/aula-head` abre no player; conclusão e favorito; comentário e curtida; anotação salva; administrador cria um curso como rascunho; esse rascunho não aparece na vitrine. |
| Prancheta | Arquivo em branco e exemplo completo; árvore de páginas/camadas; arquivo renomeado e salvo; retorno à lista e reabertura conservam nome e 17 camadas do exemplo. |
| Automation | Template Formulário → Planilha abre 3 módulos no canvas; teste simulado gera registro, métricas e logs; uma versão salva aparece com 3 módulos e opção de restauração. |
| Kanban | Rotina carrega 8 listas e 98 cartões; cartão recebe checklist e comentário; checklist responde; métricas exibem 98 blocos e 93 horários de agenda. |
| Loja | Cinco ferramentas com arte local e botão de adquirir; a vitrine permanece separada da biblioteca de quem adquiriu. Corrigido corte do título da arte no carrossel. |
| Entradas reais | As quatro URLs `/tools/<nome>/index.html`, fora do ambiente de teste, exibem a exigência de login. A posse e o acesso ao LAB são verificados pela RPC `has_tool`; políticas de isolamento também foram verificadas no Postgres de teste. |

## Capturas

- [Loja](loja.png)
- [Kanban](kanban.png)
- [Prancheta](prancheta.png)
- [Automation](automation.png)
- [Academy](academy.png)

## Limites e publicação

Antes de usar as ferramentas no ambiente hospedado, aplicar `supabase/lab-tools.sql` depois de `lab-access.sql` e cadastrar os editores da Academy em `lab_admins`. Não foram testados uma aquisição autenticada em produção, credenciais de terceiros, a reprodução de um vídeo privado no YouTube/Vimeo ou integrações externas (a Automation é uma simulação por definição). O exemplo interativo de `/aula-head` foi conferido no navegador.

A restauração de template do Kanban usa múltiplas requisições e informa falhas parciais; não existe RPC transacional para essa operação no SQL fornecido. A Prancheta detecta gravações concorrentes por revisão `updated_at`. As notas da Academy exigem salvar explicitamente e avisam antes de sair com alterações pendentes.
