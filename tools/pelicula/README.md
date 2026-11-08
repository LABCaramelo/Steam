# PELÍCULA — Estúdio de Cinema & Mídia Generativa IA
**LAB / 22 · Um Cara Caramelo — Laboratório de Interação**

O **PELÍCULA** é a estação de trabalho multimodal de criação cinematográfica com inteligência artificial do **LAB**. Inspirado na arquitetura e nos módulos do projeto open-source **Open-Generative-AI** (por Anil Matcha), o PELÍCULA foi totalmente redesenhado para a filosofia do **Cérebro Caramelo**, com foco em direção de arte consistente, gramática cinematográfica, workflows em nós e execução híbrida: **Local no LAB Desktop (GPU Offline com sd.cpp e Wan2GP)** ou **Nuvem BYOK (Bring Your Own Key)**.

---

## 1. Os 5 Módulos Integrados

1. **Estúdio de Imagem Multimodal (`image_studio`)**:
   - Geração Text-to-Image e Image-to-Image.
   - Acesso a modelos como Flux (Schnell e Dev), SDXL Turbo, Midjourney-style e o motor local **sd.cpp** (GGUF offline).
   - Injeção automática em 1 clique do **Style Prefix Canônico Caramelo** (iluminação quente/dourada x ciano, paleta oficial `#101014`, `#FFF4E8`, `#FF701A`, proporções 9:16, 1:1, 16:9).
2. **Estúdio de Vídeo & Cinema (`video_studio`)**:
   - Geração Text-to-Video e Image-to-Video (animando primeiro frame gerado ou enviado).
   - Integração com Veo 3, Wan 2.1 (Nuvem ou Wan2GP local via GPU), Kling 1.5 e Sora.
   - Controle de movimentos de câmera: Dolly-in, Dolly-out, Pan horizontal, Tilt vertical, Roll, Drone FPV e Handheld orgânico.
3. **Vibe Workflow Canvas (`workflow_canvas`)**:
   - Canvas interativo de nós conectáveis para pipelines automatizados.
   - Encadeie: *Prompt Mestre* ➔ *Geração de Keyframe* ➔ *Animação de Câmera* ➔ *Trilha Sonora (Trilha)* ➔ *Upscale 8K (Amplia)* ➔ *Montagem*.
   - Templates canônicos inclusos: "Cena de Ação 9:16", "Carrossel HEAD Consistente" e "Reels Viral com Personagem IA".
4. **Agente Diretor de Cena (`director_agent`)**:
   - Assistente conversacional de direção cinematográfica baseado no método canônico do Caramelo.
   - Decupa roteiros e ideias soltas em **Shot Cards** estruturados (lentes em mm, altura de câmera, curva de energia, antecipação ➔ ação ➔ impacto ➔ reação ➔ recuperação).
   - Envio com 1 clique direto para a esteira de render.
5. **Central de Motores & BYOK (`engine_hub`)**:
   - Gerenciamento de chaves privadas (Muapi, Fal.ai, Replicate, Together AI, OpenAI, ElevenLabs).
   - Detecção em tempo real do motor local na porta `18795`.

---

## 2. Como Rodar o Motor Local (100% Offline com GPU)

O PELÍCULA pode rodar em modo simulação/nuvem no navegador ou com aceleração de hardware local no **LAB Desktop**:

### No Windows (Com 1 clique)
Dê um duplo clique no arquivo:
```bat
tools\pelicula\start_engine.bat
```

### Na linha de comando
```bash
cd tools/pelicula/engine
pip install -r requirements.txt
python app.py
```

O servidor local iniciará em `http://127.0.0.1:18795`. O PELÍCULA detectará a conexão automaticamente e exibirá o badge **Motor Local GPU Ativo** no cabeçalho. Todos os renders são salvos diretamente na pasta local `tools/pelicula/engine/renders/`.
