# REA — Reconstrução da Interface do Editor de Stories do Instagram

**Data:** 05/11/2026  
**Alvo de Engenharia Reversa:** Instagram Stories Creation & Editor Client (v310+ Mobile & Web)  
**Mecanismo de Análise:** Metodologia REA (Reverse Engineering Anything) aplicada à decomposição de superfícies, hierarquia de camadas, motor de renderização, gramática gestual e design tokens.

---

## 1. Decomposição de Camadas (Layer Stacking Architecture)

A análise da arquitetura do Instagram Stories estabelece 5 camadas fundamentais de renderização em coordenadas 1080 × 1920 (aspect ratio 9:16):

```
┌──────────────────────────────────────────────────────────┐
│ Camada 4: UI Chrome & Modais Interativos                 │
│  - Top Bar: Discard (<), Audio, Aa, Stickers, Brush, FX  │
│  - Bottom Bar: Seu story (Avatar), Amigos Próximos, >    │
│  - Drag Drop-Zone: Trash Can circular com hit-testing    │
├──────────────────────────────────────────────────────────┤
│ Camada 3: Safe Zones & Magnetic Snap Guides              │
│  - Snap central (X: 540px, Y: 960px) com linhas azuis    │
│  - Limites seguros: Top (220px) e Bottom (240px)         │
├──────────────────────────────────────────────────────────┤
│ Camada 2: Elementos Vetoriais & Widgets Interativos      │
│  - Caixas de Perguntas, Enquetes, Sliders, Links, Músicas│
│  - Textos tipográficos com modos de highlight dinâmicos  │
├──────────────────────────────────────────────────────────┤
│ Camada 1: Canvas de Desenho Livre (Brush & Neon Engine)  │
│  - Pen sólida, Marca-texto chanfrado, Pincel Neon, Borracha
├──────────────────────────────────────────────────────────┤
│ Camada 0: Superfície de Mídia Base (9:16)                │
│  - Câmera / Foto / Vídeo / Cor Sólida / Gradientes       │
│  - Filtros CSS de pós-processamento (Grain, Golden, B&W) │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Inventário de Superfícies & Ferramentas Nativas

### 2.1 Barra Superior (Top Navigation Bar)
1. **Voltar / Descartar (`<`):** fecha o editor e retorna ao Quadro Geral da semana com confirmação de rascunho.
2. **Áudio (`🔊` / `🔇`):** controle direto de som para vídeos ou elementos musicais.
3. **Texto (`Aa`):** abre o modal de tipografia imersivo com backdrop blur de 40px, slider vertical de tamanho na lateral esquerda e carrossel de fontes na base.
4. **Figurinhas (Sticker Tray):** ícone quadrado com canto inferior dobrado. Abre a gaveta de figurinhas com widgets interativos nativos (`PERGUNTAS`, `ENQUETE`, `SLIDER`, `CONTAGEM`, `LINK`, `MÚSICA`, `HORA`, `@MENÇÃO`, `LOCALIZAÇÃO`).
5. **Desenho / Pincel (`✏️`):** ativa a camada de pintura livre sobre a mídia com 4 ferramentas especializadas:
   - **Caneta Padrão:** traço sólido suave com ponta arredondada.
   - **Marca-Texto:** traço largo semi-transparente (alpha 0.5) com sobreposição multiplicativa.
   - **Pincel Neon:** traço em dois passos (núcleo branco puro + glow externo de 25px com cor selecionada).
   - **Borracha:** composição `destination-out` para apagar traços desenhados.
6. **Efeitos / Filtros (`✨`):** carrossel de atmosfera visual (Normal, Granulado Vintage, Golden Hour, Cyber Neon, Monocromático, Vinheta).
7. **Mais opções (`•••`):** menu suspenso para Salvar/Exportar, Carregar Identidade Visual ou escolher Templates.

### 2.2 Barra Inferior (Footer Navigation Bar)
1. **Pílula "Seu story":** avatar com anel gradiente clássico do Instagram e etiqueta de publicação direta.
2. **Pílula "Amigos Próximos" (🌟):** atalho verde de postagem para lista seletiva.
3. **Botão de Avanço / Compartilhar (`>`):** círculo branco com seta preta disparando a folha de exportação de alta resolução (1080×1920) e compartilhamento nativo via Web Share API.
4. **Lixeira Inteligente (Trash Can):**
   - Ao iniciar o arraste de qualquer texto ou widget, a barra inferior se recolhe e dá lugar a um ícone circular de lixeira no centro inferior.
   - Ao aproximar o elemento da lixeira (distância < 100px), a lixeira aumenta de escala (1.3x), fica vermelha e vibra (haptic feedback).
   - Ao soltar sobre a lixeira, o elemento é removido instantaneamente.

### 2.3 Tipografia Nativa (Estilos de Fonte do Instagram)
- **Moderno:** caixa alta condensada pesada (Bebas Neue / Space Grotesk).
- **Clássico:** sem serifa limpo e legível (Inter / Montserrat).
- **Neon:** tipografia brilhante com iluminação fluorescente.
- **Máquina de Escrever:** monoespaçada com caixa de fundo e cursor sutil.
- **Elegante:** serifada de alto contraste editorial (Playfair Display / DM Serif).
- **Negrito:** peso ultra-bold de impacto (Anton).
- **Cursiva:** manuscrito orgânico expressivo (Dancing Script).
- **Caramelo Brand:** fonte autoral customizada enviada pelo usuário via upload (.woff2/.ttf).

---

## 3. Conexão com a Matriz de Conteúdo Semanal (Quadro Figma)
O editor conecta-se de forma bidirecional com a pré-estrutura dos 36 stories da semana. Ao editar um slot específico (ex: *Segunda-feira 08h — Início de rotina*), o editor exibe uma barra de navegação no topo permitindo passar para o story anterior ou próximo em fluxo de esteira contínua.
