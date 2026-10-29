# Agente IA da Fiqon — evidência para a Trama

Análise de 28/10/2026. Alvo: cliente de produção da Fiqon preservado em 27/10/2026, em `D:/meus documentos/Fiqon/research/fiqon/public-assets`. A análise usa o MCP REA sobre os bundles distribuídos e leitura localizada do código minificado. Não representa inspeção do servidor privado nem execução de agentes reais.

## Evidência e limites

Não foi encontrado navegador Chrome/Edge com `--remote-debugging-port`, nem `DevToolsActivePort` nas localizações padrão. Portanto não houve anexação REA à aba autenticada nesta análise. O dossiê histórico confirma que a sessão autenticada era acessada pela extensão, sem endpoint CDP loopback exposto; sua captura REA pública chegou ao login. Não foram lidos cookies, tokens ou valores de storage, nem executados fluxos da Fiqon.

Foi executado `analyze_javascript_application` com os dois arquivos selecionados abaixo, `detail: summary`. O REA parseou os dois sem falhas. O grafo global permanece parcial por seleção: 76 arquivos fora do escopo, 3.814 questões semânticas registradas e limite de retenção semântica atingido. Não se deve converter ausência de fatos no grafo em ausência de comportamento.

- Evidência pai: `ev_004867dc04c6aaf381ec09630e552ac95fead520d1dc4e3cc7515b31d53bf1ea`.
- Resumo: `ev_a3fed76e6aa6aa1fad40fa98756318b2138aa20d60b401043198e0d7be951364`.
- Identidade do canvas: `ev_6c07f0a94be2f41673bf39eedf10b609f379771fbefab30c9760056a7c011d93`.
- Item do canvas: `ev_40d5cdcbb65be8cf1b0c64d4d409701732429f32b817a5355d8b6a03bb8ffcad`.
- Identidade do chat: `ev_b972054576d1d25782ccf10b3d4633473c473fd5f698706d507e6aa3a337f4c0`.

| Artefato | Bytes | SHA-256 |
|---|---:|---|
| `FluxCanvas.vue_vue_type_style_index_0_lang-wfyUNmT6.js` | 595913 | `84f417908b10bc223b507dee64aa6bbdfc8f24a56b0495720c4f0f53d27eda23` |
| `FluxChatBotComponent-BlvhwRb1.js` | 9375 | `d3b92675567cb29345559f3e23fafcefbf8f10bb3d5539859ad343cda9e15462` |
| `index-CDNU3TK2.js` (leitura localizada de apoio) | 948249 | `556e5fc0275b0825d34c3e3466aa8c8a55aaa333cec1709d8ca5fd32547f8943` |

As âncoras `C@`, `B@` e `A@` a seguir são deslocamentos de caracteres base zero no UTF-8 decodificado desses arquivos, respectivamente canvas, chat e index. Não são linhas do código-fonte original.

## Contrato observado no cliente

| Parte | Forma | Comportamento observado no bundle |
|---|---|---|
| Agente | `type: ai_agent`, `value.HUMAN_MESSAGE`, `value.SYSTEM_PROMPT` | Mensagem do usuário e prompt do agente são campos obrigatórios. `A@464500` |
| Modelo | `ai_middleware_model[0]` | O primeiro modelo conectado fornece `CONNECTION`, `AI_MODEL` e `AI_PROVIDER`; o cliente copia esses valores ao agente. A remoção apaga esses campos. `C@148000` |
| Catálogo de modelos | `rpc://listModels`, `type: model-list` | Seleção depende da conexão escolhida. O cliente apresenta “Selecionar modelo” após existir conexão. `C@98500` |
| Memória | `ai_middleware_memory[0]` | O slot explícito prevalece sobre `AI_MEMORY` herdada do modelo. Remover a memória apaga `AI_MEMORY` no agente. `C@148000–150400` |
| Configuração da memória | `api_json.AI_MEMORY` | Exige `type`; acrescenta `connection_id` se houver. Copia somente chaves presentes no schema e ignora vazio/null/undefined e placeholders `{{params.…}}`. `A@496700` |
| Ferramentas | `ai_middlewares[]` | Subgrafo próprio do agente, separado do caminho principal. `C@10584` |
| Descrição de ferramenta | `value.child_description` | Campo próprio para explicar o módulo à IA; a UI informa limite de 300 caracteres e usa validação de tamanho 20–300. `C@98500–102700` |
| Argumentos da IA | `AI_VARIABLES[]` | Pares `name`/`description` produzem variáveis de autoria sob `AI`, disponibilizadas aos filhos. Isso não comprova o JSON Schema interno completo do servidor. `C@99126`, `A@506851` |

O canvas usa três handles inferiores distintos: `bottom-handle-model`, `bottom-handle-memory` e `bottom-handle-tools` (`C@10584–11500`). Os modelos e memórias são nós visuais associados ao pai; ferramentas possuem um subgrafo executável. A organização automática posiciona os filhos sob o agente, com modelo/memória/ferramentas em trilhas próprias (`C@11500+`).

O seletor consulta tags de catálogo: `IA` para modelos e `Ai Memory` para memória. Os módulos de cada aplicativo e `parameters_json` vêm de dados carregados, portanto não existe lista fixa completa de provedores, modelos ou campos de memória comprovada por essa cópia (`C@127414+`).

## Chat de teste

O widget mantém mensagens e um ID de sessão. A cada envio:

1. Clona o fluxo e injeta a mensagem em `HUMAN_MESSAGE` e o ID em `SESSION_ID` nos agentes; faz `AI_MEMORY.session_id` acompanhar a sessão.
2. Também disponibiliza `IN.HUMAN_MESSAGE` e `IN.SESSION_ID`.
3. Compila uma versão de teste e executa o fluxo, correlacionando o resultado com `unique_id`.
4. Procura a resposta em `log.data.response` do agente, com alternativas e mensagem de ausência de resposta.

Reiniciar o chat limpa as mensagens locais e gera outro ID. Isso não comprova exclusão da memória no servidor. Essas observações estão em `B@3000–6400`.

Esse chat é separado do Builder e do Copilot. Não é necessário reintroduzir a construção de fluxos por prompt para reproduzir o teste conversacional do Agente IA.

## Diferenças identificadas antes da implementação na Trama

O motor da Trama já reconhece arestas `model`/`memory`/`tools` e aliases `bottom-handle-*`, mas o editor atual apresenta o agente como ação comum com configuração plana. São necessárias portas inferiores e seletores específicos, mantendo a configuração plana como fallback de fluxos existentes.

Há uma diferença concreta de precedência no `runAgent`: atualmente o agente plano pode vencer o modelo conectado em `model`, `provider` e `connection_id`, e a memória plana pode vencer o slot de memória. Para corresponder ao cliente observado da Fiqon, o modelo explícito deve governar seus campos e a memória explícita deve prevalecer. Copiar toda a configuração do nó de modelo sobre o agente seria incorreto, pois pode sobrescrever mensagem e instruções; o vínculo deve selecionar apenas os campos do respectivo slot.

Para ferramentas, o motor já registra os filhos conectados por `tools`, aplica `child_description`, recebe `AI_VARIABLES`/schema de argumentos e executa o subgrafo quando o modelo chama a ferramenta. A interface precisa expor esses dados e impedir tratar modelo/memória como ações comuns da sequência.

O equivalente pode persistir a memória por proprietário/fluxo/sessão no Supabase existente. Essa é uma decisão da Trama, não uma descoberta sobre a tecnologia de armazenamento da Fiqon.

## Implementação na Trama (29/10/2026)

O editor agora oferece os três vínculos inferiores, configuração dos recursos e teste conversacional com sessões próprias. O motor aplica a precedência do modelo e da memória conectados, registra ferramentas filhas e mantém os respectivos subgrafos separados da continuação principal. Os testes de contrato usam transportes de IA locais: eles verificam a implementação da Trama, sem comprovar o comportamento do backend da Fiqon.

## Não estabelecido

- Modelos/provedores efetivamente habilitados, preços e todos os parâmetros de cada módulo.
- TTL, janela de mensagens, resumo, retrieval, vetores, cache, concorrência ou isolamento internos da memória original.
- Streaming de tokens e limites de rodadas/tokens do servidor original.
- Transporte MCP realmente aceito pelo servidor: a interface promete SSE/Streamable HTTP, mas isso não é prova de implementação.
- Execução e disponibilidade do agente da Fiqon na conta mostrada. Nenhuma chamada de IA ou ferramenta foi disparada.

O relatório histórico de apoio permanece em `D:/meus documentos/Fiqon/research/fiqon/IA-COPILOT-MCP.md`, com fronteiras e âncoras adicionais. O contrato acima distingue leitura do cliente distribuído, inferências e escolhas da nova implementação.
