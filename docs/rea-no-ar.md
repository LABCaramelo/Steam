# No Ar — reconstrução web e integração no LAB

O app 9 mantém o slug `gravador` e usa o nome **No Ar**. A entrada de produção é `/tools/gravador/index.html`, protegida pelo `ToolGate` do LAB; a biblioteca abre `/library/app/9/open`. A prévia em `src/tools/_dev/no-ar-preview.html` existe somente no desenvolvimento e não integra o build de produção.

## Evidência da referência OBS

A instalação selecionada foi `D:\obs-studio`, versão 32.2.2. O MCP REA inspecionou recursos dos dois binários locais sem executar nem modificar o OBS:

| Artefato | SHA-256 | Evidence ID |
| --- | --- | --- |
| `bin/64bit/obs64.exe` · 5.589.776 bytes | `e79066670cd8e8b95662f4cd417c4fa6f5b0c77e856a7b41c7de0e00059ba6f2` | `ev_28f902495f07eb6a57f476dc71ce03fe096c35b9e2c8ce964ea0e6197fe28b23` |
| `bin/64bit/obs.dll` · 1.176.848 bytes | `9b9a76f64a1d27262209f1cfbeaf6d57a175cc4e823c71882bb7d5b5ab99bdcf` | `ev_feab6b44565c17f210b0ad344489cdeb754dbab05a054e8a08c56726c4485b9d` |

Saídas completas: [executável](rea-no-ar-obs64.json) e [libobs](rea-no-ar-libobs.json). A inspeção encontrou 16 recursos em 36 entradas do executável e 2 recursos em 6 entradas da DLL. Isso comprova identidade e inventário PE; **não comprova a implementação de cenas, áudio ou transmissão**. Não houve decompilação: o provedor nativo profundo não estava configurado.

Também foram consultados os recursos distribuídos `data/obs-studio/locale/pt-BR.ini` (SHA-256 `50aa3027e55af519415fe0e23e368c9267a8d96d8f2c838d215e8ad5714ceb46`) e `themes/Yami.obt` (`9cbc3a17695744ac91db53fc8ffe9f024282df5ade05ec8e2122ca05e1bb115c`). O locale estabelece os conceitos de cenas, fontes, mixer, controles, gravação e troca de prévia/programa. A adaptação desses conceitos às APIs web é uma decisão de implementação, não uma tradução do binário.

## Implementação e design

- Cenas e fontes em Canvas 2D, composição por camadas, seleção, posição, dimensões, visibilidade e bloqueio; tela, câmera, microfone, imagens, vídeos locais, texto e cor.
- Prévia e programa independentes, troca após corte/esmaecer/deslizar, com o áudio restrito às fontes do programa.
- Mixer Web Audio com volume, mute, medidores reais e filtros. Monitoramento em alto-falantes desligado por padrão.
- Gravação MediaRecorder com pausa, retomada, download e extensão coerente com o MIME realmente suportado. Nenhum indicador simula CPU ou bitrate.
- Publicação WebRTC/WHIP por endpoint HTTPS, SDP e sessão com término DELETE. Token só em memória. Referência de protocolo: [RFC 9725](https://www.rfc-editor.org/rfc/rfc9725.html).
- Layouts e preferências separados por conta; arquivos, streams, URLs locais e tokens não entram na coleção JSON. A liberação da ferramenta desmonta as fontes e limpa o cache atribuível à conta.

O MCP Caramelo forneceu tokens e auditoria; o app importa `@caramelo/design-system/styles.css`, `Isotype` e `ThemeToggle`, com Montserrat, Inter, Ink/Cream, Caramel e assinatura em cinco cores. Foco visível, rótulos, Escape e preferência por movimento reduzido foram incluídos. A auditoria estática de shell/CSS não encontrou achados; não substitui uma avaliação completa de acessibilidade no navegador. Contrastes medidos pelo MCP: texto secundário `#A3A3B0` sobre `#101014` = 7,61:1; texto Ink sobre Caramel = 6,86:1.

## Validação e limites

Em 23/10/2026, gravação real no navegador foi iniciada, pausada, retomada, finalizada e baixada. `ffprobe` confirmou WebM com vídeo VP9 1920×1080 e faixa Opus. Também foram verificadas duas cenas, edição de texto e troca de prévia/programa, sem erros no console. [Captura do estúdio](qa/no-ar-2026-10-23/desktop-studio.jpg).

Em 26/10/2026, `npm run build` passou e **67 testes** passaram com:

```powershell
node --test --test-isolation=none --experimental-strip-types server/toolRelease.test.ts server/toolLifecycle.test.ts server/labTools.test.ts src/tools/gravador/app-state.test.mjs src/tools/gravador/engine/media-services.test.mjs
```

Incluem isolamento/remoção por conta, importação segura, descarte de mídia, transições, codecs, pausa, áudio e negociação/cancelamento WHIP. WHIP foi testado com peers e servidor simulados; **não foi validado contra um provedor externo**. Câmera e microfone físicos não foram ligados durante a verificação. Captura de sistema, codecs e desempenho dependem do navegador. Não há RTMP nativo, plugins nativos OBS, sincronização de mídia ou paridade integral com o OBS.

## Correção do catálogo e remoção em produção — 26/10/2026

A tela mostrava “Gravador” porque `public.lab_tools` ainda tinha o nome antigo. A função `release_tool(text)` do banco aceitava Montagem, mas excluía `gravador` da lista, emitindo `P0002` / “Ferramenta não encontrada”. Os logs registraram esse erro em 26/10/2026.

A migração `no_ar_catalog_and_release`, baseada no SQL já testado em `supabase/no-ar.sql`, foi aplicada via MCP Supabase no projeto `fzhzpzxsttflgtassyex`. Ela renomeou o app e atualizou a função sem executar qualquer remoção. A leitura posterior confirmou nome No Ar, slug/appid preservados, `gravador` aceito, RLS ativo em `user_tools`, execução anônima bloqueada e autenticada permitida. Contagens de aquisições antes/depois permaneceram iguais. Preço e disponibilidade administrativa foram preservados; a ferramenta continua “Em breve” para novas aquisições até liberação no Admin.

O cliente agora confirma a resposta `{slug, removed:boolean}` antes de invalidar acesso ou limpar dados locais. Mensagens distinguem catálogo desatualizado, sessão, concorrência e resposta incerta, sem revelar detalhes internos do banco. Essa alteração de frontend está no projeto local e requer o deploy normal para aparecer no site; a correção de banco já está ativa.

A revisão automática bloqueou uma chamada de teste à função de exclusão. Ela não foi repetida nem contornada. A validação de remoção efetiva ficou nos testes isolados; os dados reais dos membros foram preservados. O alerta de advisor sobre execução autenticada de `SECURITY DEFINER` é intencional neste RPC: o corpo valida `auth.uid()` e só remove os registros dessa conta, pois clientes não têm DELETE direto. [Referência do advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
