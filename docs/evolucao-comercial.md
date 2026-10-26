# Evolução comercial — Um Cara Caramelo

Implementação local concluída em 26/10/2026. O envio ao Git foi autorizado posteriormente e está preparado na branch `codex/evolucao-comercial-site`, separada da `main`. Sem deploy manual ou publicação em produção nesta entrega.

## Auditoria e decisões

- A vitrine pública usa HTML, CSS e módulos JavaScript em `public/`. O LAB usa React, TypeScript e Vite, com entrada própria em `app.html`.
- A navegação e os efeitos existentes usam GSAP/ScrollTrigger, Lenis e módulos locais de mídia, portfólio e interação. Foram preservados os vídeos, a troca de tema, o menu mobile e os controles da composição autoral.
- As rotas comerciais precisavam de regras próprias antes do fallback do LAB. Foram adicionadas tanto ao servidor de desenvolvimento/preview do Vite quanto à configuração da Vercel.
- Não foi encontrada integração funcional de formulário comercial nem provedor de analytics configurado. O contato usa o WhatsApp comercial já presente no projeto: `5531985869015`, separado do convite da comunidade.
- O workshop tinha preços, lotes e configuração de checkout. Esses elementos foram removidos para atender à regra de contato e proposta personalizada em todas as áreas públicas revisadas. O conteúdo educativo e as interações foram mantidos.
- Não foram adicionadas dependências, serviços de rastreamento ou infraestrutura de backend.

## Melhorias entregues

- Hero com a copy solicitada, assinatura autoral, CTA comercial principal e acesso ao portfólio.
- Home organizada em serviços, projetos, processo, sobre, FAQ e contato; LAB, conteúdo educativo e comunidade continuam acessíveis depois da área comercial.
- Duas ofertas principais, com possibilidades de atuação e escopo definido após diagnóstico, sem preços, pacotes fixos ou promessas de resultado.
- Páginas completas em `/head-de-conteudo` e `/sites-e-experiencias`, com público, necessidades, possibilidades, diferenciais, processo, referências, FAQ e contato contextual.
- Portfólio com contexto, desafio, direção, execução e entrega verificável em detalhes expansíveis. Os projetos próprios estão identificados como autorais. As três apresentações cuja relação comercial não estava documentada permanecem identificadas como prévias do portfólio, sem inventar resultados ou atribuições.
- Biografia baseada no texto fornecido, processo com quatro etapas e FAQ comercial com seis perguntas.
- Formulário acessível, validações, revisão da mensagem e opção de contato direto.
- Metadados de título, descrição, Open Graph, Twitter, canonical e dados estruturados nas páginas comerciais; sitemap e robots criados.
- Estilos responsivos usando a identidade existente, foco visível, campos com labels e suporte ao movimento reduzido. As imagens existentes mantêm dimensões, textos alternativos e carregamento tardio quando adequado.

## Arquivos alterados

| Arquivo | Alteração |
| --- | --- |
| `public/index.html` | Copy, hierarquia comercial, serviços, cases, processo, FAQ, contato e SEO da home. |
| `public/workshop.html` | Retirada de preços/lotes, CTA consultivo e metadados. |
| `public/assets/js/workshop.js` | Fluxo de interesse no workshop sem compra direta. |
| `public/assets/js/workshop-config.js` | Remoção de configuração pública de preços e checkout. |
| `vite.config.ts` | Rotas das duas páginas comerciais no desenvolvimento e preview. |
| `vercel.json` | Rewrites explícitos das duas páginas, com e sem barra final. |

## Arquivos criados

| Arquivo | Finalidade |
| --- | --- |
| `public/head-de-conteudo/index.html` | Página do serviço Head de Conteúdo Externo. |
| `public/sites-e-experiencias/index.html` | Página do serviço Sites & Experiências Digitais. |
| `public/commercial.css` | Estilos compartilhados da experiência comercial. |
| `public/assets/js/commercial.js` | Formulário, contexto dos CTAs, navegação das páginas de serviço e eventos. |
| `public/assets/js/commercial-contact-model.js` | Validação, preparação da mensagem e filtragem dos atributos de mensuração. |
| `public/robots.txt` | Orientação de rastreamento e referência ao sitemap. |
| `public/sitemap.xml` | URLs públicas da vitrine comercial e conteúdos educativos. |
| `server/commercialContact.test.mjs` | 16 testes do contato e da privacidade dos eventos. |
| `docs/evolucao-comercial.md` | Este relatório. |
| `docs/qa/evolucao-comercial-2026-10-26/*.jpg` | Sete capturas locais de verificação visual. |

## Como funciona o contato

1. O visitante chega ao formulário por um CTA. Os links das páginas de serviços já selecionam o interesse correspondente; o workshop também preenche um texto inicial editável.
2. Nome, e-mail, WhatsApp, serviço e descrição são validados. Marca e prazo são opcionais; orçamento não é solicitado.
3. O botão **Vamos conversar sobre meu projeto** prepara uma mensagem e mostra a revisão na própria página. Não envia dados para um backend e não abre o WhatsApp automaticamente.
4. A mensagem fica visível como texto, com o aviso **Mensagem preparada para revisão. Nada foi enviado.** Qualquer edição invalida a mensagem anterior, inclusive a troca de interesse por outro CTA.
5. Só o botão **Abrir WhatsApp com esta mensagem** abre `wa.me` com o texto codificado. O visitante confirma o envio no próprio WhatsApp.

Há também um link direto para o número comercial. Sem JavaScript, essa alternativa continua disponível. A implementação não armazena os campos em servidor ou armazenamento local e não os inclui em eventos de analytics. Ao abrir o WhatsApp, o texto é compartilhado com esse serviço conforme informado na interface. Não há confirmação falsa de envio nem evento de solicitação recebida.

## Mensuração preparada

Não foi instalado um rastreador. O código emite o evento local `caramelo:commercial` e reutiliza `gtag`, `plausible` ou `dataLayer` somente se um deles já estiver configurado pelo responsável.

Eventos disponíveis:

- `commercial_page_viewed`
- `commercial_cta_clicked`
- `service_clicked`
- `project_clicked`
- `case_opened`
- `contact_form_started`
- `contact_form_invalid`
- `contact_message_prepared`
- `whatsapp_clicked`

Os atributos são restritos a categorias de página, origem, serviço e campo. Nome, e-mail, telefone, marca, descrição, prazo e query strings não entram nesse payload. Preparar uma mensagem ou clicar no WhatsApp mede intenção; não comprova envio nem recebimento de um lead.

## Verificações executadas

| Verificação | Resultado |
| --- | --- |
| `npm test` | 130 testes passaram; nenhuma falha. |
| `node --test --test-isolation=none server/commercialContact.test.mjs` | 16 testes passaram; nenhuma falha. O comando separado é necessário porque o script atual de testes inclui apenas arquivos `.test.ts`. |
| `npm run build` | TypeScript e build Vite aprovados; 325 módulos processados. |
| `node --check` nos módulos comerciais e do workshop | Sem erros de sintaxe. |
| `git diff --check` | Sem erros de whitespace; apenas aviso habitual de conversão LF/CRLF do Git. |
| HTTP local | Home, serviços com/sem barra final, workshop, robots, sitemap, CSS e módulos novos retornaram 200. |
| HTML e links | Um H1 por página comercial, IDs únicos, hashes/ARIA/assets locais conferidos e JSON-LD válido. |
| Navegador desktop | Home em 1440×900 e páginas de serviço em 1280×800; sem recorte dos textos/controles revisados e sem erros de console observados. |
| Navegador mobile | Home, serviço de sites, menu e formulário em 390×844, sem overflow horizontal; campos com fonte de 16px. |
| Formulário | Cinco erros obrigatórios e foco no primeiro campo; dados sintéticos válidos produziram revisão e URL correta; mudanças invalidaram a URL anterior. |
| CTAs | Head e Sites selecionam seu serviço; workshop seleciona Outro e preenche a descrição. |
| Teclado | FAQ, detalhes dos cases, controle de disciplinas autorais e slider do workshop funcionaram. |
| Tema e movimento | Formulário conferido nos temas claro/escuro; `prefers-reduced-motion` pausou os vídeos. Emulação e viewport de teste foram restaurados ao final. |

O build mantém um aviso de bundle acima de 500 kB no módulo de comunidade do LAB, anterior e fora do escopo desta alteração. Não foi executada auditoria Lighthouse nem validado envio externo real. Nenhuma mensagem foi enviada pelo WhatsApp durante os testes. O comportamento remoto das regras da Vercel só poderá ser confirmado depois de uma publicação autorizada.

Capturas: `home-desktop.jpg`, `home-mobile.jpg`, `head-desktop.jpg`, `sites-desktop.jpg`, `sites-mobile.jpg`, `contato-desktop.jpg` e `contato-mobile-claro.jpg`, em `docs/qa/evolucao-comercial-2026-10-26/`.

## Informações e ações humanas pendentes

- **Cases:** não foi encontrada fonte verificável de Clique e Poesia; o projeto não foi inventado ou incluído. Confirmar papel, relação comercial e resultados de Treinamento Head com IA, Conselho Head e Beat Borges permitirá aprofundar essas prévias.
- **Workshop:** formato e carga horária continuam como informações a confirmar. Datas existentes foram preservadas; o responsável deve validar os dados do evento antes de divulgá-lo.
- **Analytics:** escolher/configurar um provedor se houver interesse em coletar os eventos preparados. Hoje não há painel de mensuração conectado por esta implementação.
- **Recebimento:** o fluxo atual entrega uma mensagem ao WhatsApp para confirmação pelo visitante. Um formulário com recebimento no servidor, CRM ou e-mail exige integração real posterior e configuração de credenciais do lado do servidor.
- **Segurança legada:** a auditoria encontrou um fallback de credencial privilegiada em `api/seed/v1/presence.ts`, anterior a esta tarefa. O responsável deve revisar a remoção desse fallback e a rotação da credencial no serviço correspondente. Nenhuma credencial foi reproduzida neste relatório, utilizada, modificada ou inserida no frontend desta entrega. O endpoint legado permanece fora desta alteração.
- **Publicação:** envio ao Git autorizado na branch `codex/evolucao-comercial-site`, sem integração à `main` ou deploy manual. Uma eventual prévia automática do provedor depende das configurações do repositório.

## Executar localmente

Na pasta do projeto, com as dependências já instaladas:

```powershell
npm run dev -- --host 127.0.0.1 --port 5181
```

Acessos:

- Home: `http://127.0.0.1:5181/`
- Head de Conteúdo: `http://127.0.0.1:5181/head-de-conteudo`
- Sites & Experiências: `http://127.0.0.1:5181/sites-e-experiencias`

Para conferir a distribuição local:

```powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 5182
```

Esses comandos geram e servem arquivos locais; não publicam o site.
