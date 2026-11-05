# REA — Voice Studio (App 17 / `voicestudio`)

Recriação do [VoiceStudio (debpalash/voicestudio)](https://github.com/debpalash/voicestudio) como ferramenta oficial do **LAB · Um Cara Caramelo** — Laboratório de Interação.

---

## 1. Visão Geral e Filosofia

O **VoiceStudio** original é uma alternativa open-source e local a plataformas como ElevenLabs, oferecendo clonagem vocal, design de voz, dublagem em 646 idiomas, transcrição e narração em lote.

No ecossistema do **LAB**, a ferramenta foi renomeada e reconstruída sob os preceitos canônicos:
> *"Menos ferramenta. Mais sistema."*  
> *"Estratégia precisa ser sentida. Marca não é só o que ela diz. É o que ela faz você fazer."*  
> *"Sem voz de robô engessada do TikTok. Mais presença, intenção e cadência humana."*

### Identidade na Plataforma
- **App ID:** `17`
- **Slug:** `voicestudio`
- **Nome no Catálogo:** `Voice Studio`
- **Entrada Direta:** [`/tools/voicestudio/index.html`](/tools/voicestudio/index.html)
- **Rota LAB:** `/library/app/17/open`
- **Tagline:** *"Clonagem de voz, locução cinematográfica e dublagem com IA no LAB."*
- **Eyebrow:** `ÁUDIO & VOZ COM IA / SÍNTESE VOCAL / LAB CARAMELO`
- **Headline:** *"Do texto à voz autoral.\nSem sotaque de robô."*
- **Paleta Canônica:** Ink Black (`#101014`), Surface Dark (`#18181D`), Warm Cream (`#FFF4E8`), Caramel Orange (`#FF701A`), Electric Sky (`#25BFFF`), Hot Pink (`#FF3D8D`), Mint (`#2EE59D`).

---

## 2. Módulos Implementados

### 1. 🎙️ Locução & TTS (Text-to-Speech)
- Editor de roteiro multi-locutor (atribuição de voz por parágrafo/bloco).
- Inserção de marcadores expressivos em 1 clique:
  - `[pausa: 0.5s]`, `[pausa: 1.0s]`, `[ênfase]`, `[sussurro]`, `[confissão]`, `[tom grave]`, `[sorriso na voz]`.
- Templates de roteiro embutidos: *Reels 3 Ganchos (Método HEAD)*, *Teaser Cinematográfico*, *Aula LAB & Academy*.
- Controles de velocidade (0.7x a 1.5x) e pitch (-4 a +4 semitons) por bloco.
- Player integrado com visualização de forma de onda e exportação WAV/MP3.

### 2. 🧬 Clonagem & Biometria Vocal (Voice Cloning)
- Amostrador vocal via gravação direta de microfone (com visualizador de espectro em tempo real) ou upload de arquivos WAV/MP3/M4A.
- **Extração Biométrica Acústica:**
  - Frequência fundamental (F0 Pitch) em Hz via autocorrelação e categorização vocal (Baixo, Barítono, Tenor, Mezzo, Soprano).
  - Formantes F1 (ressonância faríngea / corpo) e F2 (ressonância oral / clareza).
  - Relação Sinal-Ruído (SNR em dB) e dinâmica RMS.
- Calibração de Similaridade (Similarity Boost 50-100%), Estabilidade (Anti-jitter 40-100%), Exagero de Estilo e Presença de Ar/Respiração.
- Banco de vozes oficial com 5 personas canônicas Caramelo:
  1. **Luiz Caramelo** (Autoral, confessional, reflexivo, 112 Hz)
  2. **Bianca** (Documentário, cinema, aveludada, 195 Hz)
  3. **Íris** (Didática, articulada, tecnológica, 215 Hz)
  4. **Sol** (Enérgica, Reels, comunidade, 235 Hz)
  5. **Marcus** (Voz de trailer épico, ressonante, 92 Hz)

### 3. 🎛️ Design de Voz Paramétrico (Voice Modeling)
- Modelagem sintética de vozes do zero:
  - Gênero (Masculino, Feminino, Neutro / Andrógino).
  - Idade (Jovem 20-30, Adulto 30-50, Sênior 50+).
  - Timbre e Textura (Aveludado, Metálico, Rouco, Cristalino, Ressoante).
  - Arquétipo e Emoção Dominante (Confessional Caramelo, Épico, Didático, Casual, Humor).
  - Deslocamento de semitons (-8 a +8) e teste em tempo real com frase de validação.

### 4. 🎬 Dublagem de Vídeo & Sincronia Multilíngue
- Player de vídeo integrado (MP4/WebM) sincronizado com trilha vocal.
- Decupagem em planos com timecodes precisos.
- Tradução para mais de 600 idiomas (com atalhos rápidos para PT-BR, EN-US, ES, FR, DE, IT, JA, ZH).
- **Audio Ducking**: atenuação configurável da trilha original (-6dB a -30dB) enquanto a voz dublada fala.
- Exportação de trilha WAV dublada e legendas SRT sincronizadas.

### 5. ⚡ Ditado & Transcrição (Speech-to-Text)
- Reconhecimento contínuo de fala via Web Speech API em tempo real.
- **Filtro Copy Caramelo**:
  - Elimina vícios de linguagem ("tipo assim", "né", "éee", "então tá").
  - Quebra em parágrafos de alta cadência e ritmo narrativo.
- Métricas em tempo real: tempo gravado, contagem de palavras e velocidade (WPM).
- Exportação para TXT, SRT e botão direto para transferir ao **TTS Studio**.

### 6. 📚 Narrador em Lote (Long-Form & Audiobooks)
- Fila de produção de cenas e capítulos com controle de status (Na fila, Renderizando, Pronto).
- Ajuste de pausas entre cenas (0.2s a 3.0s).
- Concatenação e exportação de master contínuo.

### 7. 🎚️ Rack de Efeitos & Masterização (Studio Suite)
- Analisador de espectro FFT em tempo real (ondas e barras de frequência com gradiente Caramelo).
- **Equalizador Paramétrico de 3 Bandas:**
  - Warmth (150 Hz - corpo e aveludado)
  - Clarity (2.5 kHz - inteligibilidade e presença)
  - Air Sheen (10 kHz - brilho de microfone condensador de estúdio)
- De-Esser para atenuação de sibilantes a 6.8 kHz.
- Compressor dinâmico (Threshold -36dB a -6dB, Ratio 1.5:1 a 6:1).
- Reverb de ambiência (Dry, Sala tratada, Estúdio de rádio, Auditório).
- Normalizador de Loudness LUFS: presets para *Reels/TikTok (-16 LUFS)*, *Podcast (-14 LUFS)* e *Cinema (-24 LUFS)*.
- Botão Bypass para teste comparativo A/B.

### 8. 🔌 Central de Motores & Integração com o Repositório Original
- **Web Speech Nativo:** 100% no navegador, zero custo, vozes locais.
- **Web Audio Procedural:** síntese acústica com formantes e micro-tremor glótico.
- **Servidor Local VoiceStudio:** conecta diretamente ao backend Python do repositório `debpalash/voicestudio` em `http://localhost:8000` (ou Ollama/Piper/XTTS/Kokoro).
- **Conectores Opcionais:** ElevenLabs API e OpenAI TTS / Whisper (chaves gravadas somente no navegador do usuário).

---

## 3. Arquivos e Estrutura Criada

```
Steam/
├── public/tools/voicestudio/art/
│   ├── capsule.svg
│   ├── header.svg
│   ├── hero.svg
│   └── icon.svg
├── scripts/generate-tool-art.mjs (artes SVG atualizadas)
├── src/toolCatalog.ts (App ID 17, metadados de loja e catalogo)
├── src/tools/voicestudio/
│   ├── components/
│   │   ├── DictationStudio.tsx
│   │   ├── EngineSettingsModal.tsx
│   │   ├── Header.tsx
│   │   ├── NarratorBatchQueue.tsx
│   │   ├── StudioFXRack.tsx
│   │   ├── TakesDrawer.tsx
│   │   ├── TTSStudio.tsx
│   │   ├── VideoDubbingStudio.tsx
│   │   ├── VoiceCloningStudio.tsx
│   │   └── VoiceDesigner.tsx
│   ├── utils/
│   │   ├── audioEngine.ts
│   │   ├── speechSynthesis.ts
│   │   ├── voiceCloning.ts
│   │   ├── srtExporter.ts
│   │   └── storage.ts
│   ├── main.tsx
│   ├── types.ts
│   ├── voicestudio.css
│   └── VoiceStudioApp.tsx
├── supabase/
│   ├── lab-tools.sql (registro padrão da ferramenta)
│   ├── voicestudio.sql (script standalone)
│   └── migrations/20261105150000_voicestudio.sql (migração versionada)
├── tools/voicestudio/index.html (página montada no iframe do LAB)
├── vercel.json (redirecionamentos e rewrites de produção)
└── vite.config.ts (registro no build MPA Rollup e rotas locais)
```

---

## 4. Validação e Compilação

1. `npm run typecheck` (`tsc --noEmit`): **Sucesso total, zero erros de tipagem**.
2. `npx vite build`: **Sucesso total, bundle gerado em `dist/tools/voicestudio/index.html` (2.12 kB) e `dist/assets/tool-voicestudio-*.js` (77.45 kB)**.
3. Artes SVG de vitrine e biblioteca geradas e conferidas em `public/tools/voicestudio/art/`.
