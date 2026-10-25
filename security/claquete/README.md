# Proteção do Claquete externo

Este pacote registra a correção complementar da ferramenta servida por `D:\meus documentos\flick`, incorporada pelo LAB em uma origem distinta. Cada arquivo `.txt` em `files/` corresponde ao caminho sem esse sufixo no projeto externo. Nenhuma credencial privada integra o pacote.

`manifest.json` registra SHA-256 do original e da versão corrigida. `apply.ps1` valida todos os caminhos e hashes antes de escrever; recusa arquivos alterados por outra sessão e aceita reaplicação da mesma versão. Ele foi executado em 25/10/2026 para os 13 arquivos após autorização do sandbox. Os dados foram preservados.

```powershell
node security/claquete/check-overlay.mjs 'D:/meus documentos/flick'
```

A entrada valida `getUser` e `has_tool('claquete')`. As APIs verificam o JWT e o projeto, e o armazenamento de projetos usa o JWT do dono mesmo em tarefas assíncronas. Operações HTTP nunca recorrem ao armazenamento global com service role. Configurações globais dos provedores exigem administração. Eventos usam Bearer via fetch, e mídia local usa cookie HttpOnly de curta duração com nova conferência de acesso. Novas mídias autenticadas não são publicadas no CDN aberto.

A migração correspondente é `supabase/tool-auth.sql` neste repositório e deve ser aplicada depois dos scripts-base do LAB. A origem externa exige login próprio com a conta do LAB. Mídias antigas já públicas no CDN precisam de uma migração de armazenamento separada; este pacote não as apaga. O comando de manutenção antigo `db:import` precisa de um fluxo autenticado explícito para trabalhar com projetos.
