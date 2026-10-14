# Steam recriada

Recriação de estudo da interface do cliente Steam, em React/TypeScript. Lê a biblioteca da instalação local e usa simulações de instalação e execução durante a sessão do navegador.

```powershell
npm run dev
```

Abra `http://127.0.0.1:5180`. `npm run build` compila a aplicação e `npm test` verifica as transições de download.

Downloads simulados podem ser pausados, retomados e cancelados; conclusão e execução continuam ao navegar entre páginas. Atualizar a página reinicia as simulações. Os registros locais da Steam são somente leitura; envio de comandos `steam://` é uma opção explícita em Configurações > Biblioteca.

O relatório [REA — downloads](docs/rea-downloads.md) registra as fontes, hashes, Evidence IDs, limites da análise estática e validação da área de downloads.
O relatório [REA — media](docs/rea-media.md) registra a análise e recriação do Gerenciador de Gravações e Capturas de Tela (`/media`).
O relatório [REA — storage](docs/rea-storage.md) registra a análise e recriação do Gerenciador de Armazenamento (`/settings/storage`).

Projeto de estudo sem afiliação com a Valve Corporation.
