# Steam recriada

Recriação de estudo da interface do cliente Steam, em React/TypeScript. Lê a biblioteca da instalação local e usa simulações de instalação e execução durante a sessão do navegador.

```powershell
npm run dev
```

Abra `http://127.0.0.1:5180`. `npm run build` compila a aplicação e `npm test` verifica as transições de download.

A primeira ferramenta do LAB é a **Biblioteca de prompts**, disponível na página inicial, na lista lateral e na Loja. O botão **Abrir** carrega o acervo dentro do LAB em `/library/app/1/open`. A versão independente fica em `/tools/prompt-library/index.html`.

A biblioteca preserva o acervo e as interações de `LP/prompts.html`. A API `/api/prompt-library` atende tanto ao Vite local quanto à função Vercel; os metadados são incluídos no projeto e os textos completos e as prévias usam os serviços públicos originais. Favoritos e preferências da biblioteca ficam no armazenamento do navegador. A pasta LP original não é alterada.

A biblioteca conecta-se diretamente à base do Supabase (`fzhzpzxsttflgtassyex.supabase.co`) através da RPC canônica `get_caramelo_prompt_copy`, garantindo acesso em tempo real e de alta performance a todos os textos completos dos 391 prompts autorais sem depender de servidores intermediários. O deploy em produção é servido em `https://lab-caramelo.vercel.app/`.

Downloads simulados podem ser pausados, retomados e cancelados; conclusão e execução continuam ao navegar entre páginas. Atualizar a página reinicia as simulações. Os registros locais da Steam são somente leitura; envio de comandos `steam://` é uma opção explícita em Configurações > Biblioteca.

O relatório [REA — downloads](docs/rea-downloads.md) registra as fontes, hashes, Evidence IDs, limites da análise estática e validação da área de downloads.
O relatório [REA — media](docs/rea-media.md) registra a análise e recriação do Gerenciador de Gravações e Capturas de Tela (`/media`).
O relatório [REA — storage](docs/rea-storage.md) registra a análise e recriação do Gerenciador de Armazenamento (`/settings/storage`).

Projeto de estudo sem afiliação com a Valve Corporation.
