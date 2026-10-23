# QA local — Montagem — 22/10/2026

Ambiente: Vite local, navegador Chromium integrado ao Codex. A prévia usa identidades de teste `qa-local:<caso>`; não acessa projetos de usuários nem substitui o ToolGate da página de produção.

Verificado no navegador:

- Adição de texto e seleção de clipes; divisão na agulha, inclusive no primeiro frame.
- Importação de `fixture.mp4` (teste gerado com FFmpeg: 320×180, 24 fps, 2 s, seno de 440 Hz).
- Salvamento e restauração da mídia após recarregar a página.
- Importação de `legendas.srt`, criando os dois intervalos e textos editáveis na faixa de legendas.
- Exportação da composição com trilha sintetizada em WebM e da mídia importada em MP4; ambos com áudio não silencioso.
- Layouts 1440×960 e 390×844, navegação por painéis, modais HTML e controles com foco.

`export.webm`: VP9/Opus, 1280×720, 12 s, 359 quadros de vídeo; cabeçalho Duration finalizado pelo helper de produção. Média de áudio −28,2 dB e pico −15,1 dB. Arquivo de QA produzido a partir do primeiro download e do mesmo helper usado na exportação.

`export-import.mp4`: download real do editor após importar/restaurar `fixture.mp4`; H.264/AAC, 1280×720, 1,999767 s, 61 quadros. Média de áudio −21,1 dB e pico −16,8 dB. Verificado por `ffprobe` e `ffmpeg -af volumedetect`.

Os contêineres e o áudio foram conferidos com FFmpeg; a taxa de quadros é uma solicitação ao navegador e pode variar. IA, sincronização na nuvem, produção autenticada e dispositivos/codecs de outros navegadores não foram verificados. Os arquivos desta pasta são exclusivamente de teste.

Testes automatizados: 43 testes aprovados nos módulos de modelo, duração WebM, ciclo de vida e Postgres/RLS em memória. O instalador incremental preserva a disponibilidade administrativa e o isolamento entre contas.
