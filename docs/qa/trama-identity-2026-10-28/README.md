# Trama · identidade Caramelo e modais

Conferência de 28/10/2026 com frontend Vue, gateway e motor reais. Autenticação e persistência são fixtures locais isoladas, sem acessar contas de membros ou provedores externos.

A direção usa o material Lumen, os papéis semânticos dos dois temas, tipografia, foco e interações consultados no MCP Caramelo. Nós, canvas, toolbar, terminal, home, conexões, histórico e modais receberam o mesmo sistema visual. Logos de aplicativos externos foram preservados.

## Percursos

- Criação de fluxo e abertura da área de trabalho.
- Webhook com produção/teste separados, escuta, captura sem execução, fixação, edição, limpeza e troca de token.
- Retorno com formato, código HTTP, Body/Headers, pares editáveis e editor expandido; gravação e execução pelo motor.
- Seleção de ação em duas etapas: selecionar e confirmar em Salvar.
- Temas claro/escuro, tela de 390 × 844 e abertura de nós pelo teclado.

`results.json` registra os percursos. As capturas mostram somente dados fictícios e ocultam os links dos webhooks.

## Reproduzir

Com Playwright disponível no ambiente de QA, Edge instalado e a plataforma em `127.0.0.1:5180`:

```powershell
node docs/qa/trama-identity-2026-10-28/run.mjs
```

Os testes de servidor também cobrem captura restrita ao proprietário, ausência de bloqueio durante a escuta e retornos JSON, XML, HTML com sandbox, texto e multipart, incluindo status e headers. A suíte geral passou 158 testes e o runtime mais 15. TypeScript e build Vite foram aprovados.
