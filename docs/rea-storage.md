# Reconstrução do Gerenciador de Armazenamento da Steam

## Escopo e fontes

Estudo estático do subsistema de gerenciamento de armazenamento e conteúdo (`ContentManagement` / `/settings/storage`) da interface da Steam presente na instalação local em `D:/Steam/steamui`. Nenhum bundle da Valve foi executado ou incorporado diretamente ao código da aplicação. A interface e a lógica de alocação, movimentação e cálculo de capacidade são implementações próprias em React 19 e TypeScript.

A análise do módulo `ContentManagement` e do diálogo `MoveApps` em `sp.js` utilizou o MCP REA para derivar a árvore sintática, tokens de estilo, estruturas de dados e chaves canônicas de localização.

Para isolar os componentes sem executar o bundle original de 16,3 MB, `scripts/extract-storage-reference.mjs` extraiu as funções correspondentes aos módulos webpack 66572, 21845 e 69242 em `.rea-reference/storage/`, junto com o arquivo de localização canônico `steamui_brazilian-json.js`:

- `sp.js`: SHA-256 `5a28c25041d07e69cf591a414519e0cf970b6884c1a0106659dcd9f1fb9586f9`.
- Módulo 66572 (`storage-manager-module.js`): intervalo `[13920395, 13954778)`, SHA-256 `0cca7d790f584570893b93d8b13d072d7832acd7b5ee61b01d15da1112b27bf8`.
- Módulo 21845 (`move-apps-module.js`): intervalo `[13990223, 13995730)`, SHA-256 `78bc213c824987e3a30c9140fdff318fe9251e38ef722ab5c54f22a8eae93471`.
- Módulo 69242 (`drive-types-module.js`): intervalo `[13984295, 13985312)`, SHA-256 `91e93a2543442f65cc488469868e402428c755f2312a9913939c7838ce5727ef`.
- Localização `steamui_brazilian-json.js`: SHA-256 `ff24218d912cbf4acfcf768eea7579dd68240e030c12e8bea579b6da681b15ea`.

O MCP REA analisou o diretório isolado gerando o registro parent `ev_ae8a432211245c65c9ed54be9ddd2ad4396c41d1fee40166482c3b4f4e13a868`, com visão de resumo `ev_2d920ba71cd9e678c38dc1ed5a6bfe956c0f09856ef7f2e54efc57e05186be66`, visão de módulos `ev_b91eb834f7be5faef9632425a88e557798ea86857f685e8e7a82cd2a11cefe37` e inspeção do módulo principal `ev_bbf0c62d5a035ed7e651f053160d989f20231c3aaff8dfd76598e13c1e1c3cf1`. A análise confirmou a integridade sintática dos módulos e o grafo semântico sem execução dinâmica.

## Observações, decisões e correspondências

| Elemento / Mecanismo | Evidência no bundle Valve | Implementação na recriação |
| --- | --- | --- |
| Abas de Unidades de Armazenamento | Módulo 66572 (`FolderInfo`, `DriveName`, `DriveSize`, `InstallFolder`, `IsSelected`). Cada pasta de biblioteca possui identificador, caminho (`drive_id`/`path`), rótulo, status de unidade padrão (`bIsDefaultFolder`) e tamanhos livres/totais. | Barra superior de cartões de unidades (`C:`, `D:`, etc.) exibindo espaço total, espaço livre e indicador de unidade padrão (estrela). Botão de adicionar biblioteca (`+`). |
| Barra de Uso Multicor | Módulo 66572 (`DriveUsageBar`, `DriveUsageGames`, `DriveUsageDLC`, `DriveUsageWorkshop`, `DriveUsageShader`, `DriveUsageMedia`, `DriveUsageOther`, `DriveUsageFreeSpace`). | Barra segmentada de capacidade com as cores canônicas da Steam: Azul petróleo para Jogos, Lilás para DLC, Turquesa para Oficina, Âmbar para Shaders/Mídia, Cinza escuro para Outros/Sistema e Grafite escuro para Livre. |
| Legenda e Detalhamento | `DriveUsageLabels`: `ContentManagement_UsedByGames`, `ContentManagement_UsedByDLC`, `ContentManagement_UsedByWorkshop`, `ContentManagement_UsedByOther` (com tooltip explicativo: "O conteúdo deste volume que não é gerenciado pelo Steam..."). | Legenda detalhada sob a barra de uso, com valores formatados e tooltip explicativo em "Outro". |
| Tabela de Jogos e Conteúdo | Classes `AppsGrid`, `LibraryInventory`, `AppList`, `AppBody`, `AppName`, `AppSize`, `AppInfoItem`. Cada item inclui caixa de seleção (`AppSelected`), ícone, nome, data da última sessão (`rtLastPlayed`) e tamanho em disco (`sizeOnDisk`). | Lista estruturada de jogos do drive selecionado, com checkboxes individuais e "selecionar tudo", ícone do jogo, tamanho e última jogatina. |
| Ordenação e Filtros | Chaves `Library_SortBySizeOnDisk`, `Library_SortByAlphabetical`, `Library_SortByLastPlayed` e campo de busca. | Dropdown de ordenação (Tamanho, Nome, Última sessão) e filtro de pesquisa instantâneo por nome do jogo. |
| Barra de Ações em Lote | Módulo 66572 (`AppActionBar`, `AppActionSelected`, `ActionButton`, `ContentManagement_SelectedApps`, `ContentManagement_MoveButton`, `ContentManagement_UninstallButton`). | Barra fixa na base exibindo contagem e tamanho total dos itens selecionados, botão "Mover..." e botão "Desinstalar". |
| Diálogo de Mover Conteúdo | Módulo 21845 (`ContentManagement_MoveApps_Title`, `ContentManagement_MoveApps_TextMultiple`, `ContentManagement_MoveApps_Drive`, `ContentManagement_MoveApps_Working`, `ContentManagement_MoveApps_Done`). | Modal interativo de movimentação: seleciona unidade de destino entre as bibliotecas disponíveis com espaço livre suficiente, exibe barra de progresso simulada e atualiza o `libraryPath` dos apps em tempo real. |
| Menu de Configurações da Unidade | Módulo 66572 (`DriveSettingsButton`, `ContentManagement_MakeDefault`, `ContentManagement_BrowseFolder`, `ContentManagement_RepairFolder`, `ContentManagement_RenameDrive`, `ContentManagement_RemoveDrive`). | Menu `...` para cada unidade: "Tornar padrão", "Explorar pasta" (simulado/abertura de pasta), "Reparar biblioteca" (com estado de validação), "Renomear biblioteca" e "Remover biblioteca". |

## Limites da análise estática

A análise com o REA é estática e estritamente passiva:
- Nenhuma chamada à API C++ `ISteamApps` ou `ISteamClient` do binário nativo da Steam foi executada.
- Não são alterados arquivos binários do cliente Steam real ou partições do disco rígido do usuário.
- As movimentações de jogos entre pastas de biblioteca alteram o estado da sessão em memória e persistem no estado da recriação.
