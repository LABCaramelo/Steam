# AMPLIA — Estúdio de Super-Resolução, Restauração Facial & Pós-Produção IA
**LAB / 20 · Um Cara Caramelo — Laboratório de Interação**

O **AMPLIA** é a estação de trabalho de pós-produção e super-resolução audiovisual integrada ao ecossistema do **LAB**. Baseado na arquitetura e modelos do projeto open-source **NextGenUp**, o AMPLIA foi adaptado para operar em perfeita harmonia com o **Caramelo Design System**, oferecendo processamento híbrido: **Nativo no Navegador** (via Web Audio DSP e Canvas Filters) e **Motor Local com GPU** (100% offline via Real-ESRGAN, GFPGAN, BiRefNet, LaMa e MDX-Net).

---

## 1. Os 8 Módulos do AMPLIA

1. **Super-Resolução 8K (`upscale`)**:
   - Modelos Real-ESRGAN x4plus (fotográfico), Real-ESRGAN Anime (ideal para ilustrações e estilo Caramelo) e Contrast Adaptive Sharpening (CAS).
   - Ampliação em 2x, 4x e 8x com reconstrução de microtexturas sem artefatos plásticos.
2. **Restauração Facial (`face_restore`)**:
   - Detector YuNet + rede gerativa GFPGAN v1.4.
   - Corrige aberrações em íris, dentes, sobrancelhas e poros em fotos e retratos gerados por IA.
3. **Isolamento & Recorte de Fundo (`bg_remove`)**:
   - Algoritmo BiRefNet de matting bilateral de alta resolução.
   - Exportação direta em PNG com canal alfa transparente ou composição com a paleta oficial Caramelo (`#101014 Ink Black`, `#FFF4E8 Warm Cream`, `#FF701A Caramel Orange`, etc.).
4. **Borracha Mágica Generativa (`magic_eraser`)**:
   - Large Mask Inpainting (LaMa).
   - Pincel interativo no canvas para apagar marcas d'água, cabos, pessoas ou textos indesejados.
5. **Limpeza & Nitidez (`denoise_deblur`)**:
   - SCUNet para redução de ruído digital em ISO alto e NAFNet para desfoque de movimento.
6. **Colorização P&B (`colorize`)**:
   - DDColor com atenção cruzada para colorir fotos históricas e de acervo com calor analógico.
7. **Estúdio de Áudio & Masterização (`audio_studio`)**:
   - **Mastering DSP no Navegador**: Medição ITU-R BS.1770-4 em tempo real, equalização de 3 bandas, punch de graves, brilho de agudos e limitador True Peak (-0.5 dBFS).
   - Presets de loudness: Instagram/TikTok/Reels (-14 LUFS), Podcasts (-16 LUFS), Club (-9 LUFS).
   - Comparador A/B instantâneo com loudness matching (elimina viés de volume).
   - Separação de voz e instrumental (MDX-Net) e remoção de ruído vocal (DeepFilterNet3).
8. **Vídeo 4K & Otimizador (`video_tools`)**:
   - Upscale 4K frame-a-frame via FFmpeg, compressão em 2 passos para metas de tamanho (8MB, 25MB, 50MB) e criador de GIFs otimizados.

---

## 2. Presets Oficiais Caramelo

- 🚀 **Capa de Carrossel HEAD**: Upscale 4K com contraste adaptativo para fotos e artes de capas de carrosséis no feed (1080x1350).
- 👤 **Consistência de Model Sheet**: Restauração facial refinada (GFPGAN) para manter os traços canônicos do Luiz / Caramelo em ensaios fotográficos de IA.
- ✂️ **Recorte de Sticker & Camada**: Isolamento de personagens em PNG transparente para sobreposição tipográfica na *Prancheta* e *Stories Maker*.
- 🎙️ **Reels Voiceover Pro (-14 LUFS)**: Denoise de microfone + Masterização no padrão exato do Instagram.
- 🪄 **Limpeza de Arte & Inpaint**: Borracha generativa para remover artefatos flutuantes de Midjourney/FLUX.

---

## 3. Como Rodar o Motor Local (100% Offline com GPU)

O AMPLIA funciona de forma independente no navegador para tarefas de DSP de áudio, sharpening adaptativo e canvas. Para habilitar os modelos pesados de IA (Real-ESRGAN 8K, GFPGAN, BiRefNet, LaMa e MDX-Net), execute o motor local:

### Windows (Com 1 clique)
Dê um duplo clique no arquivo:
```bat
tools\amplia\start_engine.bat
```

### Linha de comando manual
```bash
cd tools/amplia/engine
pip install -r requirements.txt
python app.py
```

O servidor local iniciará em `http://127.0.0.1:18790`. O AMPLIA se conectará automaticamente e exibirá o indicador **Motor Local 8K / GPU** em verde no cabeçalho.
