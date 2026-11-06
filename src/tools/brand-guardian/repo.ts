// ==============================================================================
// Brand Guardian — Repositório Híbrido Resiliente (Supabase + Local-First Scoped)
// ==============================================================================

import { supabase } from "../../supabase.ts";
import type {
  Brand,
  BrandAssetItem,
  BrandReleaseRecord,
  CompleteBrandData,
} from "./types.ts";

export interface SaveResult {
  remoteSynced: boolean;
  message: string;
}

export interface WorkspaceOption {
  id: string;
  name: string;
  slug: string;
}

export interface ClientOption {
  id: string;
  workspace_id: string;
  name: string;
  segment: string;
}

async function getActiveUserId(): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || "local_user";
  } catch {
    return "local_user";
  }
}

function getLocal<T>(key: string, userId: string, fallback: T): T {
  try {
    const scopedKey = `brand_guardian_${userId}_${key}`;
    const raw = localStorage.getItem(scopedKey);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, userId: string, val: T): void {
  try {
    const scopedKey = `brand_guardian_${userId}_${key}`;
    localStorage.setItem(scopedKey, JSON.stringify(val));
  } catch (err) {
    console.warn("Brand Guardian: Erro de quota no LocalStorage:", err);
  }
}

// Template inicial canônico Caramelo com as 18 Seções Canônicas
export function createDefaultBrandData(name: string, primaryColor = "#FF701A"): CompleteBrandData {
  return {
    foundations: {
      officialName: name,
      tradeName: name,
      segment: "Design, Conteúdo & Tecnologia",
      website: "https://umcaracaramelo.com.br",
      slogan: "Menos ferramenta. Mais sistema.",
      positioning: "Laboratório de Interação e Estratégia de Alto Impacto para marcas autorais e negócios digitais.",
      valueProposition: "Transformar ideias complexas em experiências visuais memoráveis e sistemas replicáveis.",
      targetAudience: "Fundadores, Heads de Conteúdo, Designers e Criadores que recusam a mediocridade visual.",
      personas: "Head de Operações e Criadores que precisam de consistência estética absoluta em escala.",
      archetypes: ["Criador / Visionário", "Mago / Transformador", "Sábio Prático"],
      values: ["Autonomia e Maestria", "Copy antes do Design", "Elegância com verdade", "Anti-Clichê"],
      personalityTraits: ["Afiado", "Provocador", "Elegante", "Pragmático"],
      toneOfVoice: "Elegância refinada combinada a uma pequena confissão patética e honesta.",
      samplePhrases: [
        "Estratégia precisa ser sentida.",
        "Marca não é só o que ela diz. É o que ela faz você fazer.",
        "Menos ferramenta. Mais sistema.",
      ],
      wordsToAvoid: ["Revolucionário", "Mergulhe conosco", "Em constante evolução", "Disruptivo", "Soluções 360"],
      wordsToUse: ["Sistema", "Presença", "Cadência", "Camadas", "Fonte da verdade"],
      visualPrinciples: [
        "Stillness = Camadas alinhadas / Movement = Camadas se separam.",
        "Grandes massas de cor com legibilidade imediata.",
        "Contraste térmico: luz quente/dourada contra ambiente frio.",
      ],
      desiredFeelings: ["Confiança técnica", "Impacto visual", "Senso de direção e ordem"],
      creativeRestrictions: "Nunca utilizar gradientes roxos genéricos de IA, brilhos difusos sem suporte ou emojis como marcadores de texto.",
    },
    logos: [
      {
        id: "logo-1",
        key: "primary",
        label: "Logotipo Principal (Horizontal)",
        fileUrl: "/favicon.svg",
        safeZoneRatio: 0.35,
        minSizePx: 120,
        isOfficial: true,
        notes: "Versão padrão para cabeçalhos, rodapés e materiais institucionais.",
        doRules: ["Manter a área de respiro livre de elementos textuais", "Usar sobre fundos neutros com contraste"],
        dontRules: ["Nunca distorcer a proporção", "Nunca aplicar sombras projetadas duras"],
      },
      {
        id: "logo-2",
        key: "symbol",
        label: "Isotipo / Símbolo",
        fileUrl: "/favicon.svg",
        safeZoneRatio: 0.5,
        minSizePx: 32,
        isOfficial: true,
        notes: "Símbolo canônico para avatares, favicons e marca d'água.",
        doRules: ["Permitido em tamanhos reduzidos a partir de 24px"],
        dontRules: ["Não rotacionar o símbolo"],
      },
      {
        id: "logo-3",
        key: "monochrome_dark",
        label: "Versão Negativa (Fundo Escuro)",
        fileUrl: "/favicon.svg",
        safeZoneRatio: 0.35,
        minSizePx: 100,
        isOfficial: true,
        notes: "Aplicação sobre superfícies #101014 (Ink Black).",
        doRules: ["Usar em Warm Cream (#FFF4E8)"],
        dontRules: ["Não usar cores secundárias sobre fundos com ruído excessivo"],
      },
      {
        id: "logo-4",
        key: "favicon",
        label: "Favicon & App Icon",
        fileUrl: "/favicon.svg",
        safeZoneRatio: 0.2,
        minSizePx: 16,
        isOfficial: true,
        notes: "Ícone de alta legibilidade em 16x16 e 32x32.",
        doRules: ["Manter geometria vetorial simples"],
        dontRules: ["Não incluir texto minúsculo ilegível"],
      },
    ],
    colors: [
      {
        id: "col-1",
        name: "Ink Black",
        hex: "#101014",
        rgb: { r: 16, g: 16, b: 20 },
        hsl: { h: 240, s: 11, l: 7 },
        oklch: { l: 0.12, c: 0.015, h: 260 },
        cmykApprox: "C:20 M:20 Y:0 K:92 (Aprox)",
        role: "surface",
        usageRules: "Superfície base de alto contraste do ecossistema.",
        dominancePercent: 45,
        status: "approved",
      },
      {
        id: "col-2",
        name: "Warm Cream",
        hex: "#FFF4E8",
        rgb: { r: 255, g: 244, b: 232 },
        hsl: { h: 31, s: 100, l: 95 },
        oklch: { l: 0.97, c: 0.02, h: 65 },
        cmykApprox: "C:0 M:4 Y:9 K:0 (Aprox)",
        role: "text_primary",
        usageRules: "Texto principal e superfícies claras respiráveis.",
        dominancePercent: 30,
        status: "approved",
      },
      {
        id: "col-3",
        name: "Caramel Orange",
        hex: primaryColor,
        rgb: { r: 255, g: 112, b: 26 },
        hsl: { h: 23, s: 100, l: 55 },
        oklch: { l: 0.68, c: 0.22, h: 42 },
        cmykApprox: "C:0 M:68 Y:95 K:0 (Aprox)",
        role: "primary",
        usageRules: "Acento mestre da marca. Botões primários, CTAs e destaque de títulos.",
        dominancePercent: 15,
        status: "approved",
      },
      {
        id: "col-4",
        name: "Electric Sky",
        hex: "#25BFFF",
        rgb: { r: 37, g: 191, b: 255 },
        hsl: { h: 198, s: 100, l: 57 },
        oklch: { l: 0.74, c: 0.17, h: 220 },
        cmykApprox: "C:70 M:10 Y:0 K:0 (Aprox)",
        role: "secondary",
        usageRules: "Contraste vibrante e destaques de produto/tecnologia.",
        dominancePercent: 5,
        status: "approved",
      },
      {
        id: "col-5",
        name: "Hot Pink",
        hex: "#FF3D8D",
        rgb: { r: 255, g: 61, b: 141 },
        hsl: { h: 335, s: 100, l: 62 },
        oklch: { l: 0.65, c: 0.24, h: 350 },
        cmykApprox: "C:0 M:82 Y:20 K:0 (Aprox)",
        role: "accent",
        usageRules: "Destaque emocional e etiquetas especiais.",
        dominancePercent: 3,
        status: "approved",
      },
      {
        id: "col-6",
        name: "Acid Yellow",
        hex: "#FFD52A",
        rgb: { r: 255, g: 213, b: 42 },
        hsl: { h: 48, s: 100, l: 58 },
        oklch: { l: 0.86, c: 0.18, h: 90 },
        cmykApprox: "C:0 M:15 Y:90 K:0 (Aprox)",
        role: "warning",
        usageRules: "Alertas pontuais, badges e realce editorial.",
        dominancePercent: 2,
        status: "approved",
      },
    ],
    typography: {
      families: [
        {
          id: "font-1",
          role: "primary_display",
          label: "Voz Principal (Display / Cartaz)",
          familyName: "Montserrat",
          category: "display",
          weights: [700, 800, 900],
          lineHeight: 0.95,
          letterSpacing: "-0.04em",
          textTransform: "uppercase",
          clampFormula: "clamp(2.5rem, 6vw, 5.5rem)",
          sampleText: "ESTRATÉGIA PRECISA SER SENTIDA.",
          license: "Google Fonts / Open Font License (OFL)",
          fallback: "sans-serif",
        },
        {
          id: "font-2",
          role: "body_ui",
          label: "Voz de Interface & Leitura Contínua",
          familyName: "Inter",
          category: "sans-serif",
          weights: [400, 500, 600, 700],
          lineHeight: 1.5,
          letterSpacing: "-0.01em",
          sampleText: "A plataforma que une clareza estratégica e execução impecável para marcas que querem liderar seu segmento.",
          license: "Google Fonts / OFL",
          fallback: "system-ui, sans-serif",
        },
        {
          id: "font-3",
          role: "monospace",
          label: "Voz Técnica & Código",
          familyName: "JetBrains Mono",
          category: "monospace",
          weights: [400, 600],
          lineHeight: 1.4,
          letterSpacing: "0em",
          sampleText: "color.brand.primary: #FF701A;",
          license: "Apache 2.0",
          fallback: "monospace",
        },
      ],
      scale: [
        { name: "Display XL", sizeRem: 4.5, lineHeight: 0.95, weight: 900, tracking: "-0.04em", usage: "Títulos de impacto editorial e cartazes" },
        { name: "Display LG", sizeRem: 3.5, lineHeight: 1.0, weight: 900, tracking: "-0.03em", usage: "Títulos de capas e landing pages" },
        { name: "H1", sizeRem: 2.5, lineHeight: 1.1, weight: 800, tracking: "-0.02em", usage: "Títulos de seções principais" },
        { name: "H2", sizeRem: 2.0, lineHeight: 1.2, weight: 700, tracking: "-0.02em", usage: "Subtítulos de módulos" },
        { name: "H3", sizeRem: 1.5, lineHeight: 1.3, weight: 600, tracking: "-0.01em", usage: "Cards e cabeçalhos de bloco" },
        { name: "Body Large", sizeRem: 1.125, lineHeight: 1.6, weight: 400, tracking: "0em", usage: "Introduções e parágrafos de destaque" },
        { name: "Body Base", sizeRem: 1.0, lineHeight: 1.5, weight: 400, tracking: "0em", usage: "Texto padrão de interface e leitura" },
        { name: "Caption / Label", sizeRem: 0.8125, lineHeight: 1.4, weight: 600, tracking: "0.06em", usage: "Etiquetas, metadados e tags técnicas" },
      ],
    },
    visualElements: {
      iconStyle: {
        strokeWidth: 2,
        cornerRadius: 4,
        defaultGridPx: 24,
        guidelines: "Ícones lineares precisos, proporção geométrica 1:1, cantos levemente arredondados e traço consistente.",
      },
      geometry: {
        signatureShapes: ["Pílula com cantos ultra-arredondados", "Retângulo com corte angular", "Círculo com respiro"],
        radiusScale: { sm: 4, md: 8, lg: 16, full: 9999 },
        curvesDescription: "Bordas nítidas com suavização gradual (squircle). Sensação de objeto tátil de estúdio.",
      },
      patterns: {
        textures: ["Grid de pontos sutis (14px)", "Ruído de filme fino (print grain)", "Halftone de meio-tom pontual"],
        density: "low",
        usageNotes: "A textura deve apoiar a profundidade da superfície sem poluir a leitura do texto.",
      },
      illustration: {
        style: "Ilustração técnica com cel-shading cinematográfico e sombreamento híbrido de alto contraste.",
        lineTreatment: "Hard edges em contornos mestres com soft edges em iluminação interna.",
        rules: ["Evitar estéticas genéricas 3D pastel", "Preservar sombras nítidas e luz de recorte."],
      },
      composition: {
        gridColumns: 12,
        margins: 24,
        gutters: 16,
        spacingScale: [4, 8, 12, 16, 24, 32, 48, 64, 96, 128],
      },
    },
    references: [
      {
        id: "ref-1",
        title: "Composição Tipográfica de Alto Impacto",
        category: "editorial",
        imageUrl: "/tools/brand-guardian/art/hero.svg",
        tags: ["Editorial", "Display", "Tipografia"],
        isPositive: true,
        notes: "Excelente distribuição de massa de texto com entrelinha compacta.",
        licenseInfo: "Laboratório de Interação (Acervo Interno)",
      },
      {
        id: "ref-2",
        title: "Gradientes de IA Pastéis Genéricos",
        category: "editorial",
        imageUrl: "",
        tags: ["Evitar", "Clichê"],
        isPositive: false,
        notes: "Evitar a estética 'SaaS genérico' com fundo roxo/lilás e glows sem motivação.",
        licenseInfo: "Referência Negativa",
      },
    ],
    motion: {
      principles: [
        "Stillness = Camadas alinhadas / Movement = Camadas se separam.",
        "Respostas com inércia física crível sem atraso perceptível de interação.",
        "Aceleração forte na saída com desaceleração suave na chegada.",
      ],
      durations: {
        fastMs: 150,
        normalMs: 280,
        slowMs: 500,
      },
      easings: {
        standard: "cubic-bezier(0.2, 0.0, 0, 1.0)",
        emphasized: "cubic-bezier(0.05, 0.7, 0.1, 1.0)",
        decelerate: "cubic-bezier(0.0, 0.0, 0.2, 1.0)",
      },
      interactionRules: {
        hoverScale: 1.02,
        activeScale: 0.98,
        tapFeedback: "Micro-vibração magnética e realce de borda cromática.",
      },
      prefersReducedMotionActive: false,
    },
    tokens: [
      {
        id: "tok-1",
        path: "color.primitive.orange.500",
        tier: "primitive",
        type: "color",
        value: primaryColor,
        description: "Laranja base Caramelo",
        status: "approved",
      },
      {
        id: "tok-2",
        path: "color.primitive.ink.900",
        tier: "primitive",
        type: "color",
        value: "#101014",
        description: "Preto tinta profundo",
        status: "approved",
      },
      {
        id: "tok-3",
        path: "color.primitive.cream.100",
        tier: "primitive",
        type: "color",
        value: "#FFF4E8",
        description: "Creme suave quente",
        status: "approved",
      },
      {
        id: "tok-4",
        path: "color.brand.primary",
        tier: "semantic",
        type: "color",
        value: "{color.primitive.orange.500}",
        description: "Cor primária semântica da marca",
        status: "approved",
      },
      {
        id: "tok-5",
        path: "color.surface.canvas",
        tier: "semantic",
        type: "color",
        value: "{color.primitive.ink.900}",
        modeValues: {
          light: "{color.primitive.cream.100}",
          dark: "{color.primitive.ink.900}",
        },
        description: "Fundo principal da aplicação",
        status: "approved",
      },
      {
        id: "tok-6",
        path: "button.primary.bg",
        tier: "component",
        type: "color",
        value: "{color.brand.primary}",
        description: "Cor de fundo do botão primário",
        status: "approved",
      },
      {
        id: "tok-7",
        path: "button.primary.text",
        tier: "component",
        type: "color",
        value: "{color.primitive.ink.900}",
        description: "Cor do texto do botão primário",
        status: "approved",
      },
      {
        id: "tok-8",
        path: "dimension.spacing.sm",
        tier: "primitive",
        type: "dimension",
        value: "8px",
        description: "Espaçamento pequeno padrão",
        status: "approved",
      },
      {
        id: "tok-9",
        path: "dimension.spacing.md",
        tier: "primitive",
        type: "dimension",
        value: "16px",
        description: "Espaçamento médio padrão",
        status: "approved",
      },
      {
        id: "tok-10",
        path: "borderRadius.card",
        tier: "semantic",
        type: "borderRadius",
        value: "12px",
        description: "Raio de curvatura dos cards",
        status: "approved",
      },
    ],
    components: [
      {
        id: "comp-1",
        name: "Primary Button (Magnetic)",
        category: "actions",
        description: "Botão principal de ação com efeito magnético sutil e alto contraste.",
        anatomy: ["Container com padding lateral 24px", "Label em caixa alta com peso 700", "Ícone opcional à esquerda ou direita"],
        variants: ["Primary", "Secondary", "Ghost", "Danger"],
        states: ["Default", "Hover (Glow magnético)", "Active (Scale 0.98)", "Loading (Spinner)", "Disabled"],
        sizes: ["Small (36px)", "Medium (44px)", "Large (52px)"],
        accessibilityRules: "Contraste mínimo 4.5:1, foco visível com anel de 2px e role='button'.",
        codeSnippet: `<MagneticButton variant="primary">Explorar Ferramenta</MagneticButton>`,
        usedTokens: ["button.primary.bg", "button.primary.text", "borderRadius.card"],
      },
      {
        id: "comp-2",
        name: "Interactive Card (TiltSurface)",
        category: "surfaces",
        description: "Superfície tridimensional com inclinação sutil ao passar o cursor.",
        anatomy: ["Fundo com borda de 1px semitransparente", "Spotlight reativo à posição do cursor", "Slot de conteúdo"],
        variants: ["Elevated", "Outlined", "Flat"],
        states: ["Default", "Hover", "Focus"],
        sizes: ["Compact", "Standard", "Hero"],
        accessibilityRules: "Sem dependência exclusiva de cor para indicar estado.",
        codeSnippet: `<TiltSurface max={2.5} className="card-surface">...</TiltSurface>`,
        usedTokens: ["color.surface.canvas", "borderRadius.card"],
      },
    ],
    assets: [
      {
        id: "ast-1",
        name: "Logotipo Principal Vetorial",
        kind: "logo",
        url: "/favicon.svg",
        storageKey: "logos/primary-vector.svg",
        mimeType: "image/svg+xml",
        fileSize: 4200,
        approvalStatus: "approved",
        tags: ["Logo", "SVG", "Oficial"],
        createdAt: new Date().toISOString(),
      },
    ],
    applications: [
      {
        id: "app-1",
        category: "landing_page",
        title: "Hero Section Oficial",
        previewType: "dynamic",
        status: "approved",
        notes: "Aplicação dos tokens de cor e tipografia na página principal de apresentação.",
      },
      {
        id: "app-2",
        category: "social_post",
        title: "Slide Capa de Carrossel Instagram",
        previewType: "dynamic",
        status: "approved",
        notes: "Diagramação padrão em 1080x1350 com voz de cartaz e respiro.",
      },
      {
        id: "app-3",
        category: "business_card",
        title: "Cartão de Estúdio Tátil",
        previewType: "dynamic",
        status: "approved",
        notes: "Papel algodão 450g com hot stamping laranja e gravação em baixo relevo.",
      },
      {
        id: "app-4",
        category: "email_signature",
        title: "Assinatura Executiva de E-mail",
        previewType: "dynamic",
        status: "approved",
        notes: "Assinatura HTML limpa com isotipo e contatos.",
      },
    ],
    brandbookSections: [
      { id: "sec-1", title: "01. Apresentação da Marca", order: 1, visible: true, content: "Visão geral, história e manifesto do laboratório.", linkedModule: "foundations" },
      { id: "sec-2", title: "02. Conceito e Posicionamento", order: 2, visible: true, content: "Pilares estratégicos, proposta de valor e público.", linkedModule: "foundations" },
      { id: "sec-3", title: "03. Personalidade e Tom de Voz", order: 3, visible: true, content: "Arquétipos, atributos, tom de voz e anti-clichê.", linkedModule: "foundations" },
      { id: "sec-4", title: "04. Logotipos e Variantes", order: 4, visible: true, content: "Variantes oficiais, horizontais, verticais e símbolos.", linkedModule: "logos" },
      { id: "sec-5", title: "05. Área de Proteção e Escala", order: 5, visible: true, content: "Margens de respiro proporcionais e limites mínimos.", linkedModule: "logos" },
      { id: "sec-6", title: "06. Uso Correto e Incorreto", order: 6, visible: true, content: "Regras de aplicação sobre fundos e proibições.", linkedModule: "logos" },
      { id: "sec-7", title: "07. Paletas de Cores", order: 7, visible: true, content: "Cores primárias, secundárias, superfícies e papéis semânticos.", linkedModule: "colors" },
      { id: "sec-8", title: "08. Tipografia", order: 8, visible: true, content: "Hierarquia tipográfica, pesos e escalas responsivas.", linkedModule: "typography" },
      { id: "sec-9", title: "09. Elementos Gráficos", order: 9, visible: true, content: "Linguagem visual de suporte e formas recorrentes.", linkedModule: "elements" },
      { id: "sec-10", title: "10. Iconografia", order: 10, visible: true, content: "Biblioteca de ícones, grid de 24px e traço.", linkedModule: "elements" },
      { id: "sec-11", title: "11. Fotografia e Direção de Arte", order: 11, visible: true, content: "Tratamento de imagem, iluminação e atmosfera.", linkedModule: "art" },
      { id: "sec-12", title: "12. Ilustração", order: 12, visible: true, content: "Estilo ilustrativo, cel-shading e regras de consistência.", linkedModule: "elements" },
      { id: "sec-13", title: "13. Motion e Expressão Digital", order: 13, visible: true, content: "Curvas de easing, durações e microinterações.", linkedModule: "motion" },
      { id: "sec-14", title: "14. Composição e Grids", order: 14, visible: true, content: "Grades de 12 colunas, margens e respiros.", linkedModule: "elements" },
      { id: "sec-15", title: "15. Aplicações da Marca", order: 15, visible: true, content: "Demonstrações reais em telas, redes e impressos.", linkedModule: "applications" },
      { id: "sec-16", title: "16. Fundamentos Digitais", order: 16, visible: true, content: "Acessibilidade WCAG 2.2, contraste e semântica.", linkedModule: "colors" },
      { id: "sec-17", title: "17. Design System & Tokens", order: 17, visible: true, content: "Árvore de tokens DTCG 2025.10 e variáveis.", linkedModule: "tokens" },
      { id: "sec-18", title: "18. Downloads e Recursos", order: 18, visible: true, content: "Pacotes de ativos vetoriais, código e exportações.", linkedModule: "assets" },
    ],
  };
}

export const brandGuardianRepo = {
  // Lista Workspaces do usuário (Creative OS)
  async getWorkspaces(): Promise<WorkspaceOption[]> {
    try {
      const { data, error } = await supabase
        .from("creative_os_workspaces")
        .select("id, name, slug")
        .order("created_at", { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data as WorkspaceOption[];
      }
    } catch {
      // fallback
    }

    const userId = await getActiveUserId();
    return getLocal<WorkspaceOption[]>("workspaces", userId, [
      { id: "ws-default-luiz", name: "Luiz — Head de Conteúdo", slug: "luiz-head" },
    ]);
  },

  // Lista Clientes do CRM (Gabinete / Creative OS)
  async getClients(workspaceId?: string): Promise<ClientOption[]> {
    try {
      let query = supabase.from("creative_os_clients").select("id, workspace_id, name, segment");
      if (workspaceId) query = query.eq("workspace_id", workspaceId);
      const { data, error } = await query.order("name", { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data as ClientOption[];
      }
    } catch {
      // fallback
    }

    const userId = await getActiveUserId();
    return getLocal<ClientOption[]>("clients", userId, []);
  },

  // Lista de marcas do usuário (com isolamento por userId)
  async getBrands(): Promise<Brand[]> {
    const userId = await getActiveUserId();

    try {
      const { data, error } = await supabase
        .from("brand_guardian_brands")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        setLocal("brands", userId, data);
        return data as Brand[];
      }
    } catch {
      // fallback
    }

    const local = getLocal<Brand[]>("brands", userId, []);
    if (local.length > 0) return local;

    // Marca inicial padrão do LAB
    const defaultBrand: Brand = {
      id: "brand-caramelo-oficial",
      name: "Um Cara Caramelo",
      slug: "um-cara-caramelo",
      kind: "agency",
      description: "Laboratório de Interação e Inteligência Estratégica.",
      status: "published",
      logo_url: "/favicon.svg",
      primary_color: "#FF701A",
      accent_color: "#25BFFF",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const initialList = [defaultBrand];
    setLocal("brands", userId, initialList);
    setLocal(`brand_data_${defaultBrand.id}`, userId, createDefaultBrandData(defaultBrand.name, defaultBrand.primary_color));
    return initialList;
  },

  // Busca dados completos de uma marca
  async getBrandData(brandId: string): Promise<CompleteBrandData> {
    const userId = await getActiveUserId();

    try {
      const { data, error } = await supabase
        .from("brand_guardian_brands")
        .select("data, name, primary_color")
        .eq("id", brandId)
        .single();

      if (!error && data && data.data && Object.keys(data.data).length > 0) {
        setLocal(`brand_data_${brandId}`, userId, data.data);
        return data.data as CompleteBrandData;
      }
    } catch {
      // fallback
    }

    const localData = getLocal<CompleteBrandData | null>(`brand_data_${brandId}`, userId, null);
    if (localData) return localData;

    const brandList = await this.getBrands();
    const found = brandList.find((b) => b.id === brandId);
    const created = createDefaultBrandData(found?.name || "Minha Marca", found?.primary_color || "#FF701A");
    setLocal(`brand_data_${brandId}`, userId, created);
    return created;
  },

  // Salva dados de uma marca com feedback honesto de sincronização
  async saveBrandData(brandId: string, data: CompleteBrandData): Promise<SaveResult> {
    const userId = await getActiveUserId();
    setLocal(`brand_data_${brandId}`, userId, data);

    try {
      const { error } = await supabase
        .from("brand_guardian_brands")
        .update({
          data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", brandId);

      if (!error) {
        return { remoteSynced: true, message: "Identidade sincronizada no Supabase com sucesso!" };
      }
      return {
        remoteSynced: false,
        message: "Salvo localmente no navegador (sincronização remota pendente de migração).",
      };
    } catch {
      return {
        remoteSynced: false,
        message: "Salvo localmente no navegador (modo offline).",
      };
    }
  },

  // Cria uma nova marca vinculada a Workspace e Cliente opcional
  async createBrand(brandData: Partial<Brand>): Promise<Brand> {
    const userId = await getActiveUserId();

    const slug = (brandData.name || "marca")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const newBrand: Brand = {
      id: "brand-" + Math.random().toString(36).substring(2, 9),
      workspace_id: brandData.workspace_id,
      client_id: brandData.client_id,
      name: brandData.name || "Nova Marca",
      slug: slug || "marca",
      kind: brandData.kind || "client",
      description: brandData.description || "",
      status: "draft",
      logo_url: brandData.logo_url || "/favicon.svg",
      primary_color: brandData.primary_color || "#FF701A",
      accent_color: brandData.accent_color || "#25BFFF",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const initialDetails = createDefaultBrandData(newBrand.name, newBrand.primary_color);
    setLocal(`brand_data_${newBrand.id}`, userId, initialDetails);

    const brands = await this.getBrands();
    brands.unshift(newBrand);
    setLocal("brands", userId, brands);

    try {
      await supabase.from("brand_guardian_brands").insert({
        ...newBrand,
        owner_id: userId !== "local_user" ? userId : null,
        data: initialDetails,
      });
    } catch {
      // offline
    }

    return newBrand;
  },

  // Upload real de arquivos com R2 e fallback
  async uploadAsset(file: File, brandId: string, kind: BrandAssetItem["kind"]): Promise<BrandAssetItem> {
    const assetId = "ast-" + Date.now();

    // Tenta upload no endpoint /api/upload
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "x-folder": "media",
        "x-tool-slug": "brand-guardian",
        "content-type": file.type || "image/png",
      };
      if (session?.access_token) {
        headers["authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        headers,
        body: file,
      });

      if (res.ok) {
        const json = await res.json();
        const url = json.url || json.publicUrl;
        const storageKey = json.key || `media/brand-guardian/${file.name}`;

        const item: BrandAssetItem = {
          id: assetId,
          name: file.name,
          kind,
          url,
          storageKey,
          mimeType: file.type,
          fileSize: file.size,
          approvalStatus: "approved",
          tags: ["Upload", kind],
          createdAt: new Date().toISOString(),
        };

        // Registra na tabela brand_guardian_assets se disponível
        try {
          await supabase.from("brand_guardian_assets").insert({
            id: assetId,
            brand_id: brandId,
            kind,
            name: file.name,
            url,
            storage_key: storageKey,
            mime_type: file.type,
            file_size: file.size,
          });
        } catch {}

        return item;
      }
    } catch {
      // offline / sem R2 configurado
    }

    // Fallback local seguro (Data URL para visualização local imediata)
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const item: BrandAssetItem = {
          id: assetId,
          name: file.name,
          kind,
          url: (reader.result as string) || "/favicon.svg",
          storageKey: `local/${file.name}`,
          mimeType: file.type,
          fileSize: file.size,
          approvalStatus: "approved",
          tags: ["Local", kind],
          createdAt: new Date().toISOString(),
        };
        resolve(item);
      };
      reader.onerror = () => {
        resolve({
          id: assetId,
          name: file.name,
          kind,
          url: "/favicon.svg",
          storageKey: `local/${file.name}`,
          mimeType: file.type,
          fileSize: file.size,
          approvalStatus: "approved",
          tags: ["Local", kind],
          createdAt: new Date().toISOString(),
        });
      };
      reader.readAsDataURL(file);
    });
  },

  // Histórico de publicações e releases imutáveis
  async getReleases(brandId: string): Promise<BrandReleaseRecord[]> {
    const userId = await getActiveUserId();

    try {
      const { data, error } = await supabase
        .from("brand_guardian_releases")
        .select("*")
        .eq("brand_id", brandId)
        .order("published_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data as BrandReleaseRecord[];
      }
    } catch {}

    return getLocal<BrandReleaseRecord[]>(`releases_${brandId}`, userId, [
      {
        id: "rel-v1-initial",
        version: "1.0.0",
        releaseNotes: "Lançamento inicial da identidade visual no Brand Guardian do LAB.",
        publishedAt: new Date().toISOString(),
        publishedBy: "Luiz",
        snapshot: createDefaultBrandData("Um Cara Caramelo"),
      },
    ]);
  },

  async publishRelease(brandId: string, version: string, notes: string, currentData: CompleteBrandData): Promise<BrandReleaseRecord> {
    const userId = await getActiveUserId();

    const newRelease: BrandReleaseRecord = {
      id: "rel-" + Date.now(),
      version,
      releaseNotes: notes,
      publishedAt: new Date().toISOString(),
      publishedBy: "Equipe",
      snapshot: JSON.parse(JSON.stringify(currentData)), // Snapshot profundo imutável
    };

    const list = await this.getReleases(brandId);
    list.unshift(newRelease);
    setLocal(`releases_${brandId}`, userId, list);

    try {
      await supabase.from("brand_guardian_releases").insert({
        brand_id: brandId,
        version,
        release_notes: notes,
        snapshot: currentData,
      });
    } catch {
      // offline
    }

    return newRelease;
  },
};
