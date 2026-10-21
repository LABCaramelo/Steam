# Steam recriada

Recriação de estudo da interface do cliente Steam, em React/TypeScript. Lê a biblioteca da instalação local e usa simulações de instalação e execução durante a sessão do navegador.

```powershell
npm run dev
```

Abra `http://127.0.0.1:5180`. `npm run build` compila a aplicação e `npm test` verifica as transições de download.

## Página inicial

A raiz `/` é a landing page do Um Cara Caramelo, copiada de `LP/` sem build: `public/index.html`, as folhas `public/*.css`, `public/assets/` (GSAP, Lenis, fontes, vídeos), `public/workshop.html` e a apresentação `public/aula-head/`. Os arquivos mantêm os caminhos da LP. Além do acesso ao LAB (**Entrar no LAB** no cabeçalho, no menu mobile e no rodapé, apontando para `/library/home`), a identidade segue o MCP Caramelo: `caramelo-tokens.css` traz os tokens canônicos (as seções creme e laranja usam `data-caramelo-theme="light"`), `assets/icons/caramelo-mark.svg` é o isotipo canônico e o rastro do mouse (`assets/js/pointer-trail.js`) usa as 28 figurinhas de `public/caramelo/stickers`. Retornos de autenticação do Supabase que caírem em `/` são repassados ao LAB. Alterações feitas em `LP/` não chegam aqui automaticamente.

## Design system Caramelo

O pacote `@caramelo/design-system` (o mesmo repositório do MCP Caramelo) entra como `vendor/caramelo-design-system-2.0.0.tgz`, porque não está no npm público e o `dist/` não vai para o GitHub. Para atualizar, gere um novo pacote no repositório do design system (`npm run build` e `npm pack --pack-destination <este projeto>/vendor`), aponte o `package.json` para o novo arquivo, rode `npm install` e depois `npm run caramelo:sync`, que copia o `styles.css` e as fontes do pacote para `public/caramelo/`.

- **LAB (React):** `main.tsx` importa `@caramelo/design-system/styles.css` e as telas usam os componentes do pacote: `MagneticButton` (CTA de cada cena), `SpotlightTabs` (Loja, login, Comunidade, conquistas), `FocusField` (login, buscas, anotações), `ThemeToggle` (cabeçalho e Configurações > Interface), `CopyButton` (LAB ID, ID do app, caminho), `TiltSurface` (cartazes) e o holofote `.cm-surface--spotlight`. O tema claro repete os tokens do pacote em `src/styles.css` e `src/theme.ts` mantém os toggles em sincronia.
- **Páginas estáticas (LP, workshop, biblioteca de prompts):** carregam `public/caramelo/styles.css` e `public/assets/js/caramelo-interactions.js`, uma ponte que reproduz o comportamento dos componentes sobre o mesmo markup de classes (`.cm-btn--fill`, `[data-cm-tabs]`, `[data-cm-theme-toggle]`, `.cm-copy`, `[data-cm-tilt]`, `.cm-surface--spotlight`, `.cm-glitch`).
- **Tema:** a escolha fica em `localStorage` (`caramelo-theme`), vale para todas as superfícies e é aplicada no `<head>` antes da primeira pintura. As seções creme e laranja da LP continuam claras nos dois temas.

O cliente LAB passa a ser `app.html` e atende `/library`, `/store`, `/profile`, `/settings` e `/app`; os demais caminhos sem arquivo também caem nele e redirecionam para `/library/home`. O plugin `siteRoutes` em `vite.config.ts` aplica essas rotas no `dev`/`preview`, e `vercel.json` repete as mesmas regras na produção, incluindo `/aula-head` e o redirecionamento de `/prompts` para a biblioteca de prompts.

A primeira ferramenta do LAB é a **Biblioteca de prompts**, disponível na página inicial do LAB (`/library/home`), na lista lateral e na Loja. O botão **Abrir** carrega o acervo dentro do LAB em `/library/app/1/open`. A versão independente fica em `/tools/prompt-library/index.html`.

A biblioteca preserva o acervo e as interações de `LP/prompts.html`. A identidade segue o MCP Caramelo: tokens canônicos em `tools/prompt-library/caramelo-tokens.css`, isotipo canônico e a ação principal com as cinco cores. A API `/api/prompt-library` atende tanto ao Vite local quanto à função Vercel; os metadados são incluídos no projeto e os textos completos e as prévias usam os serviços públicos originais. Favoritos e preferências da biblioteca ficam no armazenamento do navegador. A pasta LP original não é alterada.

A biblioteca conecta-se diretamente à base do Supabase (`fzhzpzxsttflgtassyex.supabase.co`) através da RPC canônica `get_caramelo_prompt_copy`, garantindo acesso em tempo real e de alta performance a todos os textos completos dos 414 prompts autorais sem depender de servidores intermediários. O deploy em produção é servido em `https://lab-caramelo.vercel.app/`.

Downloads simulados podem ser pausados, retomados e cancelados; conclusão e execução continuam ao navegar entre páginas. Atualizar a página reinicia as simulações. Os registros locais da Steam são somente leitura; envio de comandos `steam://` é uma opção explícita em Configurações > Biblioteca.

O relatório [REA — downloads](docs/rea-downloads.md) registra as fontes, hashes, Evidence IDs, limites da análise estática e validação da área de downloads.
O relatório [REA — media](docs/rea-media.md) registra a análise e recriação do Gerenciador de Gravações e Capturas de Tela (`/media`).
O relatório [REA — storage](docs/rea-storage.md) registra a análise e recriação do Gerenciador de Armazenamento (`/settings/storage`).

Projeto de estudo sem afiliação com a Valve Corporation.
