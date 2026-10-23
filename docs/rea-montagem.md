# Montagem — reconstrução web para o LAB

Entrega de 22/10/2026. Nome escolhido: **Montagem**, slug `montagem`, app ID `10`. O pedido de OBS foi substituído pelo pedido de CapCut; o Gravador não foi alterado nesta entrega.

## Evidência e âmbito

O MCP REA inspecionou o executável instalado `C:\Users\vulgo\AppData\Local\CapCut\Apps\CapCut.exe` sem executá-lo. Evidence `ev_92910b3007e8e56ffb5a950ae4851a0dfafa83a25308c5b68ad531b7cfe4ec1c`: PE32+, x86-64, SHA-256 `db0a1848273f0137d58717f6b226b570d1867536ac54f88367496a7eab00a70a`, 97 entradas examinadas e 45 recursos. Essa evidência estabelece a identidade e o inventário de recursos; não comprova algoritmos de edição ou execução da interface.

A análise estática dos bundles já presentes em `D:\meus documentos\CAP CUT\analysis\bundle` selecionou `video-basic`, `transition`, `text` e `audio`: 219.176 bytes, 60.485 nós AST, quatro arquivos analisados e quatro fora do escopo. Evidência completa retida: `ev_a6cc38c0c0031341e4eb47dd58e94f77e12c31e70807af6e4f6bc073ca408409`; resumo: `ev_b6ed3739c5b9d0573ffdc9b6629960f98a5205b23713a8e1e12f1180ff1ea7d1`. SHA-256 do inventário: `5ccf55b39617a910ee45f46843026d46ec2889bacead30ca8e8c0e328203f7aa`.

A página `ev_af3e9c4af8ce02da8839e266d759a887f687fbaa6841cce27cb3655c2ee89339` vincula o módulo `video-basic` ao hash `53a9c09176ea54c8c52bdbb05e1d99eaeff961878071fa8b8414a6fe7cd0d77f`. A cobertura dos grafos permanece parcial: relações dinâmicas, quatro arquivos não selecionados e execução do produto original não foram resolvidos. Resumo portátil em [rea-montagem-summary.json](rea-montagem-summary.json).

O código da reconstrução web existente em `D:\meus documentos\CAP CUT\src` foi adaptado dentro de `src/tools/montagem/editor`. Os bundles proprietários analisados, os logos e os vídeos de demonstração do CapCut não integram o build. Decisões de implementação web e identidade visual são da Montagem; não representam equivalência completa com o produto original.

## Implementação

- Timeline com vídeo, sobreposição, texto, figurinhas e áudio; divisão, aparar bordas, duplicar, excluir, encaixe, zoom, faixas e desfazer/refazer. Cortes e aparas respeitam a velocidade e o ponto de entrada da mídia.
- Canvas com reprodução de arquivos locais, composição, posição, escala, rotação, opacidade, mesclagem, interpolação de quadros-chave, ajustes de cor, vinheta, desfoque, chroma key de vídeo e transições de saída.
- Textos editáveis, modelos tipográficos e importação de legendas SRT. Não há transcrição automática simulada.
- Áudio real de vídeos e trilhas com volume, fades e mudo. O áudio nativo dos elementos de vídeo fica mudo para evitar duplicação com o mix Web Audio.
- Exportação em tempo real por MediaRecorder. A seleção de MP4 exige um codec MP4 disponível; o nome do arquivo acompanha o contêiner efetivamente produzido. O WebM ao vivo recebe Duration no cabeçalho Info, conforme a [especificação Matroska](https://www.matroska.org/technical/elements.html).
- Um rascunho por conta neste navegador, com arquivos em IndexedDB. Histórico serializa dados e referências de mídia, sem serializar elementos DOM. A restauração recria elementos independentes para clipes de vídeo. A limpeza ao remover a ferramenta apaga apenas o banco atribuído à conta.
- Identidade consultada no MCP Caramelo: papéis semânticos de superfície/texto, cinco cores, isotipo canônico, Inter, Montserrat, Covered By Your Grace e figurinhas oficiais. Modais nativos HTML, foco, teclado, estados de pressionamento e redução de movimento. A auditoria estática de CSS não substitui uma auditoria completa de acessibilidade no navegador.

## Integração e publicação

Entrada: `/tools/montagem/index.html`; dentro do LAB: `/library/app/10/open`. O catálogo, o build multipágina e o rewrite de produção já incluem a ferramenta. O acesso usa o mesmo `ToolGate` autenticado das demais ferramentas.

Para um banco existente, aplicar **`supabase/montagem.sql` após `lab-access.sql` e `lab-tools.sql`**. O instalador cadastra a ferramenta em beta e atualiza a remoção; uma reinstalação preserva a disponibilidade escolhida pelo administrador. `lab-tools.sql` também contém o cadastro para instalações novas.

Publicação concluída em 23/10/2026: migração `add_montagem_tool` aplicada no projeto Supabase `fzhzpzxsttflgtassyex`. Cadastro `montagem`, ID 10, disponível; remoção autenticada habilitada e execução por `anon` bloqueada. Os privilégios existentes foram preservados.

Deploy Vercel `dpl_DvedHS3AjhMUtQdBH3wXbhiGcy2Z`, produção, READY, Vite, aproximadamente 30 segundos. A versão foi preparada sobre a base `de65e83` mais as alterações locais do Montagem; não há novo commit Git nesta publicação. O pacote foi isolado para excluir alterações simultâneas do Gravador/No Ar. HTML, JS, CSS, catálogo e arte foram validados antes da promoção. O domínio público entrega o mesmo bundle `tool-montagem-UDBe7BON.js` e catálogo `toolCatalog-sJiJtbbS.js`.

Acesso: [Montagem no LAB](https://www.umcaracaramelo.com.br/store/app/10). O navegador exibiu o login esperado. Após o usuário iniciar sua sessão, a aquisição gratuita e a abertura autenticada do editor em `/library/app/10/open` foram confirmadas em produção; captura em `docs/qa/montagem-2026-10-22/production-authenticated.png`. Não foram alterados projetos da conta para testar edição ou exportação em produção. Consulta de erros de execução nos cinco minutos posteriores à publicação: zero registros; nenhum drain configurado. Registro portátil em [montagem-release.json](montagem-release.json).

## Verificação e limites

Atualização de interface publicada em 23/10/2026: tipografia compacta com referência no LAB e divisórias arrastáveis persistidas por conta. Os 50 testes passaram e o arraste/restauração foram conferidos também em produção. Detalhes e deploy atual em [montagem-layout.md](montagem-layout.md) e [montagem-release.json](montagem-release.json).

`npm run build` gera a página da Montagem. Os testes de modelo, WebM, ciclo de vida e banco em memória usam:

```powershell
node --test --test-isolation=none --experimental-strip-types src/tools/montagem/editor/model.test.ts src/tools/montagem/editor/webm.test.ts server/toolLifecycle.test.ts server/labTools.test.ts
```

No navegador local foram conferidos textos, divisão de clipe, mídia MP4 importada, salvamento/restauração após recarregar, SRT com dois intervalos e exportação. Evidências de mídia e capturas estão em `docs/qa/montagem-2026-10-22/`. A prévia de desenvolvimento `src/tools/_dev/montagem-preview.html` usa contas de teste isoladas e não entra no build de produção.

O FFmpeg confirmou WebM VP9/Opus, 1280×720, áudio não silencioso (média −28,2 dB), e MP4 H.264/AAC com mídia local importada, 1280×720, 1,999767 s, áudio não silencioso (média −21,1 dB). A taxa de quadros é solicitada ao navegador, sujeita ao desempenho do dispositivo; não é um renderizador offline determinístico.

Serviços de IA, sincronização na nuvem, colaboração e todos os recursos premium/nativos do CapCut ficam fora desta versão beta. Arquivos longos e exportações de alta resolução dependem da memória e dos codecs do navegador. A verificação de edição e exportação foi local; em produção foram confirmados arquivos, banco, aquisição e abertura autenticada no LAB.
