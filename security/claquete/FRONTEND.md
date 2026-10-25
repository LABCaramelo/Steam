# Correção da entrada do Claquete

Os arquivos em `files/src/` substituem os caminhos correspondentes no projeto `D:\meus documentos\flick`, removendo o sufixo `.txt`. Esse sufixo mantém o pacote de revisão fora da compilação do Steam. As mudanças de servidor estão em `files/server/`; precisam ser aplicadas e verificadas juntas.

- A tela de projetos só monta depois de `getUser(access_token)` confirmar a identidade e `has_tool('claquete')` retornar `true`.
- A sessão anônima do Supabase, credenciais expiradas, outro usuário, erro na conferência e ausência da ferramenta bloqueiam a interface.
- Logout, troca de sessão e prazo do JWT desmontam o editor. Respostas antigas não reabrem a sessão.
- As inserções e os upserts enviam `user_id` obtido pela identidade verificada. O banco continua sendo responsável por negar linhas de outras pessoas.
- API, upload, agente, autosave e eventos usam `Authorization: Bearer`. Os eventos usam fetch com stream, sem token em query string.

O Claquete está em uma origem diferente do LAB. Por isso, exige entrar com a mesma conta também nessa origem. Não transmite refresh tokens entre janelas. A integração de login entre origens poderá ser projetada separadamente.

Para conferir os arquivos propostos sem modificar o projeto externo:

```powershell
node security/claquete/check-overlay.mjs 'D:/meus documentos/flick'
```

Hashes SHA-256 dos arquivos originais copiados nesta preparação (conferir antes de substituir se houver outra sessão trabalhando):

| Arquivo | SHA-256 |
| --- | --- |
| `src/main.tsx` | `37658EF3203350F88F027A1C250BC28F6C3F0074131736479D9C1C3689BA862E` |
| `src/lib/api.ts` | `17F9ADE58558DA63C332A720D1452623CE6664A6C402A0EDF8A3626478979DA5` |
| `src/pages/ProjectPage.tsx` | `A9E9E0EF6F1B9583E0C572331CAE6544327A16774E8331B935D03B26D6D72007` |
