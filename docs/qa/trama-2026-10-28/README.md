# Conferência da Trama — 28/10/2026

`run.mjs` usa o Edge instalado, frontend Vue e gateway/motor reais. Auth, persistência e arquivos são fixtures locais. Não acessa contas reais nem envia dados a APIs de terceiros. Supabase e R2 foram conferidos separadamente.

Com a plataforma em `127.0.0.1:5180`, Playwright disponível no ambiente de QA e Node 24:

```powershell
node --experimental-strip-types docs/qa/trama-2026-10-28/run.mjs
```

`results.json` registra os percursos; `home-dark.png`, `home-light.png`, `home-mobile.png`, `editor-execution.png` e `files-dark.png` mostram dados fictícios. Esta conferência não comprova uma sessão real de membro nem implantação do frontend em produção.
