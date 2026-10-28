# Steam recriada

Recriação de estudo da interface do cliente Steam, em React/TypeScript. Lê a biblioteca da instalação local e usa simulações de instalação e execução durante a sessão do navegador.

```powershell
npm run dev
```

Abra `http://127.0.0.1:5180`. `npm run build` compila a aplicação e `npm test` verifica as transições de download.

## Página inicial

A raiz `/` é a landing page do Um Cara Caramelo, copiada de `LP/` sem build: `public/index.html`, as folhas `public/*.css`, `public/assets/` (GSAP, Lenis, fontes, vídeos), `public/workshop.html` e as mídias da apresentação em `public/aula-head/`. A apresentação `/aula-head` é compilada a partir de `aula-head/index.html` e `src/aula-head/`. Os arquivos mantêm os caminhos da LP. Além do acesso ao LAB (**Entrar no LAB** no cabeçalho, no menu mobile e no rodapé, apontando para `/library/home`), a identidade segue o MCP Caramelo: `caramelo-tokens.css` traz os tokens canônicos (as seções creme e laranja usam `data-caramelo-theme="light"`), `assets/icons/caramelo-mark.svg` é o isotipo canônico e o rastro do mouse (`assets/js/pointer-trail.js`) usa as 28 figurinhas de `public/caramelo/stickers`. Retornos de autenticação do Supabase que caírem em `/` são repassados ao LAB. Alterações feitas em `LP/` não chegam aqui automaticamente.

## Design system Caramelo

O pacote `@caramelo/design-system` (o mesmo repositório do MCP Caramelo) entra como `vendor/caramelo-design-system-2.0.0.tgz`, porque não está no npm público e o `dist/` não vai para o GitHub. Para atualizar, gere um novo pacote no repositório do design system (`npm run build` e `npm pack --pack-destination <este projeto>/vendor`), aponte o `package.json` para o novo arquivo, rode `npm install` e depois `npm run caramelo:sync`, que copia o `styles.css` e as fontes do pacote para `public/caramelo/`.

- **LAB (React):** `main.tsx` importa `@caramelo/design-system/styles.css` e as telas usam os componentes do pacote: `MagneticButton` (CTA de cada cena), `SpotlightTabs` (Loja, login, Comunidade, conquistas), `FocusField` (login, buscas, anotações), `ThemeToggle` (cabeçalho e Configurações > Interface), `CopyButton` (LAB ID, ID do app, caminho), `TiltSurface` (cartazes) e o holofote `.cm-surface--spotlight`. O tema claro repete os tokens do pacote em `src/styles.css` e `src/theme.ts` mantém os toggles em sincronia.
- **Páginas estáticas (LP, workshop, biblioteca de prompts):** carregam `public/caramelo/styles.css` e `public/assets/js/caramelo-interactions.js`, uma ponte que reproduz o comportamento dos componentes sobre o mesmo markup de classes (`.cm-btn--fill`, `[data-cm-tabs]`, `[data-cm-theme-toggle]`, `.cm-copy`, `[data-cm-tilt]`, `.cm-surface--spotlight`, `.cm-glitch`).
- **Tema:** a escolha fica em `localStorage` (`caramelo-theme`), vale para todas as superfícies e é aplicada no `<head>` antes da primeira pintura. As seções creme e laranja da LP continuam claras nos dois temas.

O cliente LAB passa a ser `app.html` e atende `/library`, `/store`, `/profile`, `/settings` e `/app`; os demais caminhos sem arquivo também caem nele e redirecionam para `/library/home`. O plugin `siteRoutes` em `vite.config.ts` aplica essas rotas no `dev`/`preview`, e `vercel.json` repete as mesmas regras na produção, incluindo `/aula-head` e o redirecionamento de `/prompts` para a biblioteca de prompts.

A primeira ferramenta do LAB é a **Biblioteca de prompts**, disponível na página inicial do LAB (`/library/home`), na lista lateral e na Loja. O botão **Abrir** carrega o acervo dentro do LAB em `/library/app/1/open`. A versão independente fica em `/tools/prompt-library/index.html`.

A biblioteca preserva o acervo e as interações de `LP/prompts.html`. A entrada `tools/prompt-library/index.html` usa a proteção comum do LAB e só monta a apresentação depois de validar a sessão no Auth e a aquisição no banco. A API `/api/prompt-library` exige o JWT do usuário e a aquisição tanto para o catálogo quanto para o texto; as respostas usam `private, no-store`. Favoritos ficam separados por conta no navegador. A pasta LP original não é alterada.

A API consulta a RPC canônica `get_caramelo_prompt_copy` no Supabase com o JWT do próprio membro, sem fallback público. O deploy em produção é servido em `https://lab-caramelo.vercel.app/`.

Downloads simulados podem ser pausados, retomados e cancelados; conclusão e execução continuam ao navegar entre páginas. Atualizar a página reinicia as simulações. Os registros locais da Steam são somente leitura; envio de comandos `steam://` é uma opção explícita em Configurações > Biblioteca.

O relatório [REA — downloads](docs/rea-downloads.md) registra as fontes, hashes, Evidence IDs, limites da análise estática e validação da área de downloads.
O relatório [REA — media](docs/rea-media.md) registra a análise e recriação do Gerenciador de Gravações e Capturas de Tela (`/media`).
O relatório [REA — storage](docs/rea-storage.md) registra a análise e recriação do Gerenciador de Armazenamento (`/settings/storage`).

Projeto de estudo sem afiliação com a Valve Corporation.

## Ferramentas e aquisição

A Loja disponibiliza a **Biblioteca de prompts** para membros do LAB. As demais ferramentas aparecem como **Em breve**, com aquisição em preparação. O catálogo do frontend usa `available: true` para a Biblioteca de prompts e `available: false` para as demais; o banco libera a aquisição apenas das ferramentas ativas.

Quem já adquiriu pode escolher **Remover da biblioteca…** nos detalhes ou no menu da ferramenta. A confirmação **Remover e apagar meus dados** chama `release_tool(p_slug)`: aquisição e registros próprios da ferramenta são excluídos na mesma transação, inclusive dados vinculados por cascata. A RPC usa a conta autenticada e permite a exclusão mesmo após perda de acesso ao LAB. Gravações autenticadas concorrentes seguram a posse até terminar, para a limpeza acontecer depois delas. Adquirir novamente, quando liberado, começa sem esses registros.

A limpeza inclui quadros do Kanban, arquivos da Prancheta, fluxos/versões/execuções/conexões da Automation, progresso/notas/favoritos/comentários da Academy, prompts pessoais/observações e projetos/chats da Claquete nas tabelas correspondentes, quando instaladas. Respostas de outros alunos são desvinculadas antes da exclusão do comentário original. Arquivos físicos hospedados no R2/Storage não são excluídos por esta RPC; ela remove os registros no banco. Registros sem vínculo de propriedade comprovado não são apagados.

Abas do LAB recebem a revogação e desmontam a ferramenta. A Comunidade usa cache e anexos separados por conta; os caches globais legados, sem dono identificado, não são importados automaticamente nem apagados indiscriminadamente. A remoção da Biblioteca de prompts também limpa os novos favoritos locais atribuídos à conta.

A Loja apresenta as cinco ferramentas em `/store` e suas páginas em `/store/app/:id`. Só as adquiridas entram na biblioteca. Cada entrada React também confere a sessão e a função `has_tool` no banco, inclusive quando aberta diretamente em outra aba. Uma troca de conta desmonta o conteúdo anterior. As regras de leitura e escrita continuam sendo aplicadas pelo RLS do Supabase.

| Ferramenta | Entrada | Implementação |
| --- | --- | --- |
| Kanban | `/tools/kanban/index.html` | Quadros/listas/cartões, arraste e alternativas de teclado, etiquetas, checklists, comentários, agenda, tabela/CSV e métricas. Template Rotina Superprodutiva com 8 listas e 98 cartões. Importa/exporta JSON do LAB e do Trello. |
| Prancheta | `/tools/prancheta/index.html` | Editor original de `Figma/` com vários arquivos privados em `prancheta_files`. Desenho, páginas, camadas, componentes e exportação PNG/SVG/JSON. Salvamento automático e manual; detecta conflitos entre abas e oferece recuperação/cópia. |
| Trama | `/tools/automation/index.html` | Evolução da Automation com interface e motor de `Fiqon/`: canvas, ramos, HTTP/IA/MCP reais em execução manual, versões, logs e replay. Supabase por conta e arquivos privados no R2. Webhooks externos, agendamentos e JavaScript ainda indisponíveis. |
| Academy | `/tools/academy/index.html` | Vitrine, aulas YouTube/Vimeo/vídeo e a apresentação de `/aula-head`, progresso, conclusão, favoritos, anotações privadas e comentários/respostas/curtidas da turma. Administradores criam, ordenam, editam e publicam cursos, módulos e aulas. |
| Comunidade | `/tools/comunidade/index.html` | Canais de texto, salas de voz em tempo real (WebRTC via LiveKit), compartilhamento de tela, mensagens diretas, status e navegação rápida por Ctrl+K. Identidade visual e tokens canônicos do MCP Caramelo. |

Fontes e entradas ficam em `src/tools/<nome>/` e `tools/<nome>/index.html`. A base comum é `src/tools/shared/`. O Vite compila as quatro páginas separadamente; o LAB as abre no iframe. As 16 artes da Loja estão em `public/tools/<nome>/art/` e podem ser regeneradas com `node scripts/generate-tool-art.mjs`.

### Configuração do banco antes da publicação

A **Trama** mantém o app 4 e o slug `automation`. A entrada adicional é `/tools/trama/index.html`. A migração `supabase/migrations/20261028120408_trama_workspace_and_private_files.sql` já foi instalada no Supabase do LAB; para outra instalação, aplique-a após os scripts-base. O bucket privado separado é `umcaracaramelo-private`. Antes de publicar o código, configure `TRAMA_ENCRYPTION_KEY` e as variáveis do R2 no servidor. Detalhes, limites e validações em [docs/trama-integration.md](docs/trama-integration.md).

No SQL Editor do projeto Supabase, aplique **`supabase/lab-access.sql` antes de `supabase/lab-tools.sql`**. A Loja avisa quando as tabelas/funções ainda não existem. Isso vale também para adquirir a Biblioteca de prompts. Para editar aulas, cadastre explicitamente a conta em `lab_admins` usando o comando comentado no início de `lab-tools.sql`; metadados do perfil não concedem administração. O `community.sql` da outra sessão depende de `lab_member()` deste script.

Depois dos scripts-base, aplique `supabase/tool-auth.sql`. Ele fecha as RPCs e tabelas legadas de prompts e Claquete, exige sessão permanente e aquisição, e reserva a edição de prompts a administradores. Não apaga registros existentes. Clientes externos precisam encaminhar o JWT do membro; a chave pública sozinha não acessa dados das ferramentas. A cópia preparada da correção do projeto externo Claquete e sua conferência por hashes ficam em `security/claquete/`.

As ferramentas não exigem chaves privilegiadas no navegador. O Kanban e a Prancheta preservam dados locais pendentes quando uma gravação falha. Na Prancheta, conflitos de revisão interrompem o autosave para evitar sobrescrever outra aba. As notas da Academy têm salvamento explícito e avisam antes de sair com alterações pendentes. A restauração da rotina do Kanban usa várias requisições, pois o SQL atual não tem uma RPC transacional para isso; uma falha parcial é informada e o quadro é recarregado.

A **Montagem** (app 10, beta) adapta o editor de vídeo local à plataforma, com identidade do MCP Caramelo, timeline com várias faixas, cortes, textos, legendas SRT, áudio e exportação real WebM/MP4 conforme os codecs do navegador. A entrada é `/tools/montagem/index.html`, com o controle de acesso padrão do LAB. Projetos e mídias ficam neste navegador, separados por conta; não há sincronização na nuvem. Em bancos existentes, aplicar `supabase/montagem.sql` depois dos scripts-base. Evidências REA, implementação, verificações e limites em [docs/rea-montagem.md](docs/rea-montagem.md).

### No Ar — estúdio web (beta)

O **No Ar** é o estúdio de gravação e transmissão do LAB. Mantém o app `9`, o slug interno `gravador` e a entrada `/tools/gravador/index.html`, com a verificação de acesso comum das ferramentas. A interface e as artes próprias usam o design system Caramelo: Ink, Cream, Caramel, assinatura em cinco cores, Montserrat e Inter. O produto foi reconstruído para APIs web a partir da análise do OBS; não usa o nome, o logotipo nem o código do aplicativo original.

Componha cenas com tela, webcam, microfone, arquivos, texto e cor; prepare uma cena em **PREVIEW** e envie-a ao **PROGRAM** com corte ou transição. A composição usa Canvas e Web Audio. A gravação usa MediaRecorder, com download local em WebM ou MP4 conforme os codecs do navegador. Resolução, taxa de quadros, captura de áudio da tela e desempenho dependem do dispositivo e das permissões; use HTTPS ou localhost.

A transmissão envia áudio e vídeo de PROGRAM por WebRTC a um **endpoint WHIP HTTPS** de serviço externo compatível. O serviço precisa aceitar a origem do LAB por CORS e expor os cabeçalhos necessários ao WHIP. Endpoint e token são informados pelo usuário; o token fica somente na memória da sessão e não entra nas configurações exportadas. Não há ingestão RTMP nativa nem servidor de transmissão incluído.

Somente a configuração das cenas fica no `localStorage`, separada por conta. Arquivos de mídia e permissões de captura precisam ser adicionados novamente ao reabrir. Downloads ficam no computador; a ferramenta não sincroniza mídia na nuvem. A remoção pela biblioteca limpa a configuração local daquela conta.

Para bancos existentes, aplique `supabase/no-ar.sql` **depois** de `lab-tools.sql` e de `montagem.sql`, quando usado. O mesmo SQL está em `supabase/migrations/20261023013201_no_ar.sql`, gerado com a CLI; escolha um fluxo de instalação. O script renomeia o catálogo e inclui `gravador` na remoção transacional, preservando preço e disponibilidade já configurados. Se a entrada continuar em breve, o administrador deve liberá-la no painel. A correção foi aplicada ao projeto do LAB em 26/10/2026 como `no_ar_catalog_and_release`, sem executar a remoção dos dados de qualquer membro.

### Verificação das ferramentas

```powershell
npm run typecheck
npm run build
node --test --test-isolation=none --experimental-strip-types server/*.test.ts src/tools/kanban/model.test.ts src/tools/automation/model.test.mjs src/tools/academy/media.test.ts
node src/tools/prancheta/verify-session.mjs
```

`labTools.test.ts` aplica o SQL em Postgres em memória (PGlite) e verifica aquisição, acesso por ferramenta, isolamento entre pessoas, comentários e administração. Os testes adicionais cobrem importação/exportação, credenciais, simulação, mídia e falhas/conflitos de gravação. A conferência visual local usa repositórios de teste separados da produção; ela não comprova a instalação do SQL nem uma sessão real do Supabase. Evidências em `docs/qa/tools-2026-10-21/`.
