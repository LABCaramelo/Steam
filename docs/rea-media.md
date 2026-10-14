# Reconstrução da Central de Mídias e Gravações de Jogos da Steam

## Escopo e fontes

Estudo estático dos módulos de gerenciamento de mídias, gravações de jogos e capturas de tela presentes na instalação em `D:/Steam/steamui`. Nenhum bundle da Valve foi executado ou incorporado diretamente ao código da aplicação. A simulação e os controles de interface são implementações próprias em React e TypeScript.

A análise do módulo `MediaManager` e das rotas `/media` (`/media/grid`, `/media/list`) em `sp.js` e `gamerecording.js` utilizou o MCP REA para derivar a árvore sintática, tipos e referências canônicas.

Para reduzir o escopo e isolar o componente sem executar o bundle original, `scripts/extract-media-reference.mjs` extraiu a função correspondente ao módulo webpack 50165 em `.rea-reference/media/media-module.js`, com os arquivos de localização de apoio (`steamui_brazilian-json.js` e `shared_brazilian-json.js`).

- `sp.js`: SHA-256 `5a28c25041d07e69cf591a414519e0cf970b6884c1a0106659dcd9f1fb9586f9`.
- Intervalo do módulo 50165: `[13084707, 13117220)` em unidades UTF-16.
- Módulo extraído (`media-module.js`): SHA-256 `a9861819db082be15307ba203a15214678998c1c314cd5f70e58883c1159940a`.
- Localização `steamui_brazilian-json.js`: SHA-256 `ff24218d912cbf4acfcf768eea7579dd68240e030c12e8bea579b6da681b15ea`.
- Localização `shared_brazilian-json.js`: SHA-256 `0d25b9505cefc7c7ec9cf5b4c5914285e5a080cb58ed905856c6eb0048543d48`.

O MCP REA analisou o diretório isolado gerando o registro parent `ev_42218777213cbb84b843e6e8d9ecd606f68f90d5c083cad70e53c919bf8b90bb`, com visão resumida `ev_c577b492cfdad1d55a0db700c17804f0a3154fe48febe3124bfd2983f1c10e04`, visão paginada de módulos `ev_8e549cd4ae33fc8f57874c832028de5d4fd7764fcb24ae658c63ad20082219a7` e inspeção do módulo fonte `ev_acff2756077b8353e123ba0449d4d873ad05bdfc8bba9131f7b0d776056301ac`. A análise confirmou integridade do módulo ESM export default, 0 falhas de parse e inventário canônico de 60 funções e identificadores.

## Observações, decisões e limites

| Questão | Evidência / resultado | Aplicação na recriação |
| --- | --- | --- |
| Estrutura de rotas | Módulo 80344 define `Media: { Root: () => "/media", Grid: () => "/media/grid", List: () => "/media/list", Item: (type, id) => "/media/item/" + type + "/" + id }`. | Rotas `/media`, `/media/grid` e `/media/list` registradas no React Router, com alternância no topo. |
| Tipos de mídia | Módulo 50165 (`function it`) seleciona `all` (`#MediaManager_MediaType_All`), `clip` (`#MediaManager_MediaType_Clip`), `screenshot` (`#MediaManager_MediaType_Screenshot`) e `recording` (`#MediaManager_MediaType_Recording`). | Filtro de tipo com as 4 opções oficiais em pt-BR via `shared_brazilian-json.js`. |
| Filtro de aplicativos | Módulo 50165 (`function ht` e `Ze`) agrupa por `recents` (`#MediaManager_AllApps_Dropdown`) ou `{ type: "app", gameid }`. | Menu seletor permitindo filtrar por "Todos os jogos (mais recentes)" ou jogo individual da biblioteca. |
| Modos de visualização | Botões de grade (`ce` com ícone "grid", `#MediaManager_GridView_Tooltip`) e sessões (`ce` com ícone "list", `#MediaManager_ListView_Tooltip`). | Toggle de visualização Grade / Lista de sessões com layout CSS correspondente. |
| Modo de seleção múltipla | `#ScreenshotUploader_SelectAll`, `#ScreenshotUploader_DeselectAll`, `#MediaManager_EnterSelectMode`, exportar (`#MediaManager_MultiSelect_Save`), copiar para área de transferência (`#MediaManager_MultiSelect_CopyToClipboard`) e compartilhar. | Barra de seleção com contagem de itens, cópia, exclusão e exportação simulada. |
| Integração na biblioteca | Em `sp.js`, `AppDetails_SectionTitle_Media` e `AppDetails_GoToMedia` levam para `Media.Grid` filtrado pelo jogo. No menu Exibir da TitleBar, `Menu_Screenshots_New` ("Gravações e capturas de tela") abre `/media`. | Adicionado item no menu Exibir da barra de título e painel de Gravações e capturas na página do jogo. |
| Configurações de gravação | Rota `/settings/gamerecording` com opções de gravação em segundo plano, duração máxima, atalhos e diretório de mídia. | Página dedicada em Configurações > Gravação de jogos (`/settings/gamerecording`). |

## Limites da análise estática

A análise do REA é estática e inerte. Ela não executa o codificador de vídeo da Steam, não intercepta chamadas nativas de overlay (DirectX/Vulkan) nem estabelece conexão com a Steam Cloud. As gravações e capturas na recriação usam fontes locais reais quando disponíveis (arquivos em `userdata/.../screenshots`) e simulações com metadados para jogos instalados.
