# Auditoria da plataforma LAB — 21/10/2026

O próximo ciclo deve priorizar proteção dos arquivos, autorização das APIs e coerência entre o que a Loja promete e o que as ferramentas entregam. A plataforma já tem catálogo integrado, aquisição, componentes compartilhados e regras de isolamento no banco. As falhas abaixo atravessam essas proteções ou deixam ações importantes com aparência de sucesso sem concluir o trabalho.

## Escopo e evidências

- Base inicial: `main`, commit `931356e`, sem alterações locais no início da análise. Outros chats começaram a editar a plataforma durante a auditoria; os achados se referem aos arquivos e fluxos descritos, não certificam alterações posteriores.
- Inspeção de LP, shell do LAB, Loja, biblioteca, perfil/configurações, autenticação, aquisição, SQL, APIs e as sete ferramentas: Biblioteca de prompts, Kanban, Prancheta, Automation, Academy, Comunidade e Claquete.
- Conferência no Chrome da LP, biblioteca, Loja, detalhes e entrada independente da Claquete em `https://www.umcaracaramelo.com.br`. A Claquete publicada exibiu “Aguardando inicialização” e um comando para iniciar um projeto local do autor. [Evidência visual](<D:/meus documentos/Steam/docs/qa/auditoria-2026-10-21/claquete-publicada.png>).
- Reprodução isolada de handlers com chaves fictícias e rede simulada; reprodução do SQL em PGlite. Não foram enviados uploads, emitidos tokens reais, alterados registros de produção ou lidas credenciais privadas.
- `npm run build`: passou na segunda execução, com 244 módulos e aviso de tamanho do bundle da Comunidade. A primeira execução pegou uma edição transitória com import de `MemberList` ausente; o import foi restaurado por outra edição e essa falha não entra como achado ativo.
- Suíte ampliada: 58 testes passaram. Verificação da Prancheta: quatro grupos passaram. Os testes existentes não cobrem os principais cenários negativos encontrados aqui.
- Não foi concluído um teste assistivo nem uma matriz completa de dispositivos. Não foram inspecionadas as políticas efetivamente instaladas no Supabase de produção. Uma confirmação no código não implica que o serviço remoto esteja configurado ou que já tenha ocorrido abuso.

P1 = tratar antes de ampliar o uso ou publicar funcionalidades afetadas. P2 = correção funcional ou de confiabilidade na sequência. P3 = melhoria de experiência/manutenção.

## Prioridades altas

### 1. P1 — A Prancheta exclui outro arquivo ao criar o oitavo

**Fonte:** [lab-tools.sql:248](<D:/meus documentos/Steam/supabase/lab-tools.sql:248>), trigger na linha 263; [PranchetaApp.tsx:140](<D:/meus documentos/Steam/src/tools/prancheta/PranchetaApp.tsx:140>).

`prune_user_prancheta_files()` apaga todos os documentos fora dos sete mais recentemente atualizados. São projetos independentes, não revisões de um arquivo. A criação, duplicação ou recuperação de uma cópia após conflito pode eliminar trabalho anterior sem uma decisão informada.

**Confirmado em banco isolado:** oito inserções resultaram em sete documentos; o primeiro deixou de existir. Dois revisores reproduziram o comportamento com o trigger real.

**Melhoria:** retirar a exclusão silenciosa. Se sete projetos for uma regra do produto, bloquear a criação adicional e oferecer exportação ou escolha explícita de exclusão. Criar lixeira/restauração e manter versões numa estrutura separada. Verificar também duplicações e gravações simultâneas na quota.

**Aceite:** criar o oitavo arquivo nunca apaga um dos anteriores sem confirmação específica; uma falha de quota preserva o documento em edição.

### 2. P1 — A API de voz emite tokens sem validar o usuário

**Fonte:** [api/livekit.ts:67](<D:/meus documentos/Steam/api/livekit.ts:67>), assinatura e permissões nas linhas 78–85; listagem de ocupação na linha 48. O servidor local reutiliza esse mesmo handler via `server/livekit.ts`.

O visitante fornece identidade, nome e sala. O handler não verifica sessão, aquisição da Comunidade ou acesso à sala. O token permite publicar, assinar e enviar dados por seis horas. A listagem de participantes também é anônima.

**Confirmado no handler real com ambiente fictício:** uma requisição sem `Authorization` retornou 200 com identidade e sala escolhidas no corpo. Não foi usado um serviço LiveKit real.

**Melhoria:** autenticar no servidor; derivar identidade da sessão; autorizar ferramenta, servidor e sala; limitar duração e volume de emissão. A consulta de ocupação deve respeitar o mesmo escopo de acesso. Manter essa validação no handler compartilhado local/Vercel.

**Aceite:** anônimo recebe 401; usuário sem direito recebe 403; alterar identidade/sala no corpo não concede acesso adicional.

### 3. P1 — Upload aceita gravação no R2 sem autenticação

**Fonte:** [api/upload.ts:17](<D:/meus documentos/Steam/api/upload.ts:17>), origem do nome/tipo/pasta/usuário nas linhas 50–66 e envio privilegiado na linha 69.

O handler confere método, configuração e tamanho, mas não verifica sessão. A pasta, a identificação da pessoa, a extensão e o tipo de conteúdo vêm do cliente. A sanitização do caminho não substitui autorização. Quando configurado, o serviço pode publicar conteúdo e consumir armazenamento em nome da plataforma.

**Confirmado com rede simulada:** requisição anônima resultou em tentativa de PUT para um caminho escolhido pelo cliente, inclusive aceitando SVG. Nenhum objeto remoto foi criado.

**Melhoria:** exigir sessão e autorização, gerar o caminho pelo usuário autenticado, validar assinatura dos bytes e tipos permitidos, limitar tamanho durante a leitura e aplicar quota/rate limit. Evitar conteúdo ativo em uploads de avatar. Se a rota não for necessária, removê-la.

**Aceite:** anônimo não provoca chamada ao R2; o cliente não escolhe a pasta de outra pessoa; um arquivo com extensão/tipo falsificados é recusado.

### 4. P1 — O texto dos prompts não tem a mesma regra de acesso da biblioteca

**Fonte:** [api/prompt-library.ts:26](<D:/meus documentos/Steam/api/prompt-library.ts:26>), RPC anônima nas linhas 68–76, cache público nas linhas 19–20; [prompt-library.js:88](<D:/meus documentos/Steam/public/tools/prompt-library/assets/js/prompt-library.js:88>).

A API recebe método/URL, sem sessão, e busca o texto usando uma chave anônima do servidor. Não consulta `has_tool`. O catálogo público pode continuar aberto, mas essa implementação não aplica a regra “só acessa quem adquiriu” ao conteúdo completo.

**Confirmado localmente:** com upstream simulado permitindo leitura, uma requisição sem sessão recebeu texto e cache público. A exposição efetiva do conteúdo em produção depende das permissões da RPC original, não verificadas nesta auditoria.

**Melhoria:** separar metadados públicos de conteúdo autorizado, validar sessão e posse no servidor e na RPC, utilizar o contexto do usuário e impedir cache compartilhado para respostas privadas. Uma correção apenas no iframe mantém a API desprotegida.

**Aceite:** usuário anônimo ou sem aquisição não recebe texto por nenhum dos caminhos; o cache não entrega resposta autorizada a outro visitante.

### 5. P1 — Comunidade compartilha identidade e histórico entre contas no mesmo navegador

**Fonte:** [store.ts:99](<D:/meus documentos/Steam/src/tools/comunidade/store.ts:99>), leitura nas linhas 158–168 e gravação nas linhas 347–350; [App.tsx:24](<D:/meus documentos/Steam/src/tools/comunidade/App.tsx:24>).

A chave global `discord-clone:v1` persiste perfil e mensagens. Remontar a ferramenta ao trocar a conta não troca essa chave. O nome herdado só é substituído quando está vazio.

**Cenário identificado no código:** A usa a Comunidade, sai, B entra no mesmo navegador e recebe perfil e conversas locais de A. Não foi feita uma troca real de contas em produção.

**Melhoria:** identidade derivada do usuário autenticado e armazenamento separado por `user.id`, incluindo rascunhos, anexos e caches. Migrar o armazenamento legado sem atribuí-lo automaticamente à próxima pessoa que entrar.

**Aceite:** duas contas no mesmo perfil de navegador não compartilham histórico, identidade ou rascunhos; sair remove dados sensíveis da memória ativa.

### 6. P1 — Chat de texto, mensagens diretas e amizade ainda não entregam o que a Loja anuncia

**Fonte:** [Chat.tsx:143](<D:/meus documentos/Steam/src/tools/comunidade/components/Chat.tsx:143>), [store.ts:221](<D:/meus documentos/Steam/src/tools/comunidade/store.ts:221>), [data.ts:5](<D:/meus documentos/Steam/src/tools/comunidade/data.ts:5>), [Friends.tsx:55](<D:/meus documentos/Steam/src/tools/comunidade/components/Friends.tsx:55>), [toolCatalog.ts:168](<D:/meus documentos/Steam/src/toolCatalog.ts:168>).

Nos fluxos de texto/DM, enviar adiciona a mensagem ao estado local; contatos/status vêm de fixtures. O formulário de amizade apenas cancela o submit. Isso não descreve o canal de dados da sala de voz, que tem integração LiveKit própria.

**Impacto:** uma mensagem pode parecer entregue sem chegar a outra pessoa. A pessoa não sabe que precisa usar outro canal para concluir a conversa.

**Melhoria:** conectar texto, DMs e amizade à persistência e entrega reais, com autorização, confirmação e estados de falha. Até concluir, identificar os fluxos locais como demonstração e ajustar a promessa da Loja.

**Aceite:** duas contas em navegadores distintos veem a entrega real, o histórico permanece após recarregar e uma falha não aparece como sucesso.

### 7. P1 — Claquete publicada depende de um servidor na máquina do visitante

**Fonte:** [ClaqueteApp.tsx:5](<D:/meus documentos/Steam/src/tools/claquete/ClaqueteApp.tsx:5>), verificação na linha 23, iframe na linha 88 e comando local na linha 138; [toolCatalog.ts:189](<D:/meus documentos/Steam/src/toolCatalog.ts:189>).

O código só procura `localhost:8787` e `localhost:5173`. A Loja descreve um estúdio completo disponível após aquisição. Na entrada publicada, foi observado o estado “Aguardando inicialização” com um comando que aponta para uma pasta do autor. Os indicadores de Supabase/R2 aparecem como verificados sem uma consulta de saúde correspondente.

**Melhoria:** disponibilizar uma aplicação integrada e um backend autenticado no ambiente de publicação. Se a oferta depender de instalação local, informar isso antes da aquisição e oferecer instalação/documentação apropriadas. Validar a identidade do serviço encontrado, não apenas um HTTP 200 em `/api/health`.

**Aceite:** um membro em um computador sem ferramentas de desenvolvimento consegue usar o fluxo anunciado, ou vê claramente os pré-requisitos antes de adquirir.

**Nota de versão:** outros chats começaram a adicionar uma implementação da Claquete enquanto esta análise acontecia. Este achado vale para a integração inspecionada e publicada; a nova implementação precisa de uma validação própria quando estiver concluída.

## Correções seguintes

| Prioridade | Achado e impacto | Melhoria e evidência |
| --- | --- | --- |
| P2 | A confirmação do WhatsApp não expira no banco. `lab_member()` aceita datas de qualquer idade; se `lab_access` não existe, libera membros autenticados. | Definir a validade temporal no banco e a estratégia de renovação/revogação. Com datas de 365 dias, PGlite retornou `true` e permitiu aquisição. Conferir instalação e expiração em [lab-tools.sql:39](<D:/meus documentos/Steam/supabase/lab-tools.sql:39>). |
| P2 | Variáveis de staging podem usar silenciosamente a URL/chave padrão de produção. Chaves publishable são ignoradas pelo filtro de prefixo. | Respeitar ambiente explícito e falhar com mensagem clara se inválido. Avaliação isolada com `createClient` simulado confirmou o fallback. [supabase.ts:8](<D:/meus documentos/Steam/src/supabase.ts:8>) e linha 11. |
| P2 | Automation sobrescreve o fluxo completo sem conferir revisão. Duas abas podem apagar alterações uma da outra. | Gravação condicionada por revisão, detecção de conflito e recuperação de cópia. A fila local serializa só a própria aba. [repo.ts:40](<D:/meus documentos/Steam/src/tools/automation/repo.ts:40>), [Editor.tsx:47](<D:/meus documentos/Steam/src/tools/automation/Editor.tsx:47>). Confirmado por inspeção. |
| P2 | Falha de exclusão na Automation fecha a confirmação; “Tentar novamente” pode não fazer nada ou repetir uma operação anterior. | Relançar o erro para manter a confirmação ou registrar exatamente a operação que falhou. [AutomationApp.tsx:46](<D:/meus documentos/Steam/src/tools/automation/AutomationApp.tsx:46>), retry nas linhas 22/36. Confirmado pelo fluxo de controle. |
| P2 | Academy busca somente os 500 comentários mais antigos. Um comentário novo aparece localmente e some da tela após recarregar quando ultrapassa esse limite. | Paginar tópicos e respostas, preservar contexto e permitir acessar o restante. [repo.ts:45](<D:/meus documentos/Steam/src/tools/academy/repo.ts:45>), [Discussion.tsx:45](<D:/meus documentos/Steam/src/tools/academy/Discussion.tsx:45>). Não há perda do registro no banco demonstrada. |
| P2 | Modais permitem que Tab alcance controles encobertos. As janelas das ferramentas também repetem o ID do título quando empilhadas. | Unificar diálogo com contenção/restauração de foco, fundo inerte e títulos únicos. [Modal.tsx:18](<D:/meus documentos/Steam/src/components/Modal.tsx:18>), [kit.tsx:273](<D:/meus documentos/Steam/src/tools/shared/kit.tsx:273>), linhas 296/306. Revisão estática; falta teste assistivo. |
| P2 | Convites da Comunidade abrem `/?convite=...`, mas o leitor do convite existe na ferramenta, não na LP. | Gerar a URL da Comunidade e manter o convite durante login/aquisição. [servers.ts:189](<D:/meus documentos/Steam/src/tools/comunidade/servers.ts:189>), [App.tsx:119](<D:/meus documentos/Steam/src/tools/comunidade/App.tsx:119>), [vite.config.ts](<D:/meus documentos/Steam/vite.config.ts>). |
| P2 | Falha de envio no chat da sala de voz é capturada sem rejeitar a operação. O compositor limpa o rascunho e a mensagem continua com aparência de enviada. | Estados pendente/falhou/entregue e reenvio, ou propagar erro e preservar rascunho. [voice.ts:534](<D:/meus documentos/Steam/src/tools/comunidade/voice.ts:534>), [Chat.tsx:768](<D:/meus documentos/Steam/src/tools/comunidade/components/Chat.tsx:768>). Confirmado pelo fluxo de controle. |
| P2 | “Ativar LAB Cloud” só altera uma flag local; desligar não controla a persistência Supabase das ferramentas. | Explicar o salvamento real ou implementar um controle com efeito explícito. [Settings.tsx:233](<D:/meus documentos/Steam/src/pages/Settings.tsx:233>). |
| P3 | As flags das Configurações são inicializadas uma vez; trocar a seção pode reutilizar/gravar o estado anterior na nova chave. | Estado único por seção ou remontagem pela chave da seção. [Settings.tsx:36](<D:/meus documentos/Steam/src/pages/Settings.tsx:36>), linhas 71/81. |

## Melhorias de produto e operação

1. **Consolidar verificações de publicação.** O comando `npm test` cobre apenas `server/*.test.ts`; os testes das ferramentas e o verificador da Prancheta dependem de comandos separados. Criar um comando completo e executá-lo no CI com build/typecheck. Acrescentar casos negativos de API anônima, quota do oitavo arquivo, duas contas no mesmo navegador, concorrência entre abas e entrega entre dois usuários. Não foi encontrada configuração de CI em `.github` no início da análise.
2. **Carregar voz apenas quando necessária.** A Comunidade importa `livekit-client` no início. O build medido gerou um chunk de 697,92 kB (187,51 kB gzip) para a ferramenta, além dos recursos compartilhados; o Vite emitiu aviso. Separar o cliente de voz e telas secundárias por carregamento sob demanda; medir abertura de texto e entrada em voz antes/depois. Isso é uma oportunidade de otimização, não uma medição de Core Web Vitals.
3. **Priorizar retomada na biblioteca.** “Sua primeira ferramenta” usa a primeira entrada do catálogo adquirido, mesmo quando a conta já tem sete ferramentas. Substituir pela última atividade, última aula, último arquivo ou um primeiro passo escolhido pela pessoa. [Home.tsx:120](<D:/meus documentos/Steam/src/pages/library/Home.tsx:120>), linha 164. Começar com um atalho de retomada por ferramenta antes de montar um painel grande.
4. **Identificar estados do produto na Loja.** Informar claramente se a ferramenta está disponível, em demonstração ou exige instalação local, incluindo limites de arquivos e o que sincroniza. Automation já explica a simulação; aplicar essa precisão às outras ofertas. Mostrar falha real, salvamento pendente e conflito no ponto em que afetam o trabalho.
5. **Sincronizar preferências úteis por pessoa.** Favoritos dos prompts hoje usam uma chave global no navegador. A Loja já informa o armazenamento local, portanto é evolução do produto: separar por conta e oferecer sincronização/exportação sem apagar preferências legadas.
6. **Medir a jornada completa.** Acompanhar acesso confirmado, primeira aquisição, primeira abertura e primeira ação concluída por ferramenta, com eventos mínimos e sem registrar conteúdo privado. Medir erros de abertura/salvamento e tempo de carregamento para decidir a ordem das melhorias posteriores.
7. **Otimizar mídia depois de medir a rede.** A LP já usa vídeos sem áudio e `preload="none"`, e o código considera redução de movimento. Há vídeos de portfólio de 10–22 MB em `public/assets/videos`; verificar carregamento por visibilidade e adaptar resolução/bitrate à tela e conexão antes de acrescentar efeitos ou pré-carregamento. Tamanho do arquivo sozinho não demonstra lentidão percebida.
8. **Orientar o primeiro uso por uma entrega.** Oferecer uma escolha curta como organizar uma entrega, desenvolver uma peça ou estudar uma aula, seguida de uma tarefa concreta na ferramenta adequada. A recomendação deriva do Brand Book: direção antes da ferramenta e intenção antes do formato. Preservar o público e o posicionamento atuais da LP.
9. **Manter contexto e saída consistentes.** Uma faixa compacta `LAB › Ferramenta › Trabalho atual`, com caminho de volta e troca entre ferramentas adquiridas, pode orientar tanto o uso incorporado quanto a nova aba. Adaptar o cabeçalho ao contexto para evitar duplicação. [ToolPage.tsx:123](<D:/meus documentos/Steam/src/pages/library/ToolPage.tsx:123>).
10. **Demonstrar uma entrega na Loja.** Acrescentar uma prévia verificável: quadro de exemplo, peça editável, trecho de aula ou fluxo simulado, com resultado e ação curta. Informar junto da ação se os dados ficam na conta, no navegador ou numa simulação. [StoreTool.tsx:43](<D:/meus documentos/Steam/src/pages/StoreTool.tsx:43>).
11. **Deixar o movimento acompanhar a decisão.** O carrossel da Loja avança a cada sete segundos. Pausar em foco/interação, respeitar redução de movimento e manter seleção manual; concentrar respostas mais fortes em adquirir, abrir, salvar e concluir. [Store.tsx:19](<D:/meus documentos/Steam/src/pages/Store.tsx:19>). É uma melhoria proposta, não uma falha de contraste medida.

## Ordem de execução proposta

| Etapa | Entrega concreta | Como verificar |
| --- | --- | --- |
| 1 — Preservar trabalho e acesso | Remover exclusão silenciosa da Prancheta; autenticar/autorizar voz, upload e textos de prompts; isolar identidade da Comunidade. | Reproduções negativas que hoje passam indevidamente tornam-se testes de bloqueio; oito projetos não provocam perda. |
| 2 — Cumprir o fluxo anunciado | Entrega real de texto/DM/amizade; corrigir convites, falhas de envio e disponibilidade da Claquete. Ajustar as descrições enquanto houver limitações. | Duas contas em navegadores distintos concluem a conversa; pessoa sem ambiente local entende e consegue usar o que foi anunciado. |
| 3 — Tornar salvamento e navegação previsíveis | Conflitos da Automation, paginação da Academy, foco de modais, configuração de ambiente e validade de acesso. | Duas abas não apagam mudanças; comentários novos reaparecem; teclado conclui fluxos; staging não consulta produção por fallback. |
| 4 — Melhorar descoberta e desempenho | Retomada por ferramenta, estados de oferta, carregamento de voz sob demanda e medição de jornada. | Comparar tempo até primeira ação concluída, erros e retorno às ferramentas com a linha de base. |

## Comandos usados

```powershell
npm run build
node --test --test-isolation=none --experimental-strip-types server/*.test.ts src/tools/kanban/model.test.ts src/tools/automation/model.test.mjs src/tools/academy/media.test.ts
node src/tools/prancheta/verify-session.mjs
```

As reproduções adicionais usaram PGlite e handlers reais com configuração fictícia e `fetch` simulado. Os resultados são evidência dos caminhos de código; não são prova de estado, invasão ou perda histórica no ambiente remoto.

## Referências de revisão

- Manual de identidade visual Caramelo V1/2026, integral, `SRC-2FAE032D7AD7`: acessibilidade, feedback, foco, clareza e performance fazem parte da experiência.
- Brand Book Caramelo V1/2026, integral, `SRC-FFA42DC70EC3`: direção por intenção/resultado, provas e experiência coerente com a oferta. O complemento de identidade foi revisado por um segundo agente com leitura integral dessas fontes.
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security): combinar privilégios de tabela e políticas por operação; testar permissões permitidas e negadas.
- [Supabase — API keys](https://supabase.com/docs/guides/api/api-keys): diferenciar identificação pública da aplicação e autorização do usuário. Uma chave anônima pública no frontend não é, isoladamente, um vazamento de segredo.

Esta entrega registra análise e propostas. Nenhuma correção de código, migração ou publicação foi executada por esta auditoria. Alterações concorrentes existentes foram preservadas.
