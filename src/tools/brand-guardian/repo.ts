// ==============================================================================
// Brand Guardian — Repositório Híbrido (Supabase + LocalStorage Fallback Resiliente)
// ==============================================================================

import { supabase } from "../../supabase";
import type {
  Brand,
  BrandReleaseRecord,
  CompleteBrandData,
} from "./types";

const STORAGE_PREFIX = "brand_guardian_";

function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, val: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
  } catch (err) {
    console.warn("Brand Guardian: Erro de quota no LocalStorage:", err);
  }
}

// Template inicial canônico Caramelo para nova marca
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
        imageUrl: "/public/tools/brand-guardian/art/hero.svg",
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
      { id: "sec-1", title: "01. Apresentação & Manifesto", order: 1, visible: true, content: "Introdução à visão da marca.", linkedModule: "foundations" },
      { id: "sec-2", title: "02. Posicionamento & Valores", order: 2, visible: true, content: "Pilares estratégicos e cultura.", linkedModule: "foundations" },
      { id: "sec-3", title: "03. Logotipo & Assinaturas", order: 3, visible: true, content: "Variantes oficiais e regras de aplicação.", linkedModule: "logos" },
      { id: "sec-4", title: "04. Área de Proteção & Escala", order: 4, visible: true, content: "Dimensões mínimas e margem de respiro.", linkedModule: "logos" },
      { id: "sec-5", title: "05. Paleta de Cores & Contrastes", order: 5, visible: true, content: "Cores primárias, neutras e WCAG 2.2.", linkedModule: "colors" },
      { id: "sec-6", title: "06. Sistema Tipográfico", order: 6, visible: true, content: "Hierarquia, pesos e escalas responsivas.", linkedModule: "typography" },
      { id: "sec-7", title: "07. Iconografia & Geometria", order: 7, visible: true, content: "Linguagem de formas e traços.", linkedModule: "elements" },
      { id: "sec-8", title: "08. Fotografia & Direção de Arte", order: 8, visible: true, content: "Universo visual, enquadramentos e moodboard.", linkedModule: "art" },
      { id: "sec-9", title: "09. Motion & Interação", order: 9, visible: true, content: "Curvas de aceleração e transições.", linkedModule: "motion" },
      { id: "sec-10", title: "10. Design System & Tokens DTCG", order: 10, visible: true, content: "Variáveis interoperáveis e especificações.", linkedModule: "tokens" },
      { id: "sec-11", title: "11. Aplicações Práticas", order: 11, visible: true, content: "Demonstrações em peças reais.", linkedModule: "applications" },
      { id: "sec-12", title: "12. Downloads & Recursos", order: 12, visible: true, content: "Pacotes oficiais de ativos e código.", linkedModule: "assets" },
    ],
  };
}

export const brandGuardianRepo = {
  // Lista de marcas disponíveis para o usuário
  async getBrands(): Promise<Brand[]> {
    try {
      const { data, error } = await supabase
        .from("brand_guardian_brands")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        setLocal("brands", data);
        return data as Brand[];
      }
    } catch {
      // fallback
    }

    const local = getLocal<Brand[]>("brands", []);
    if (local.length > 0) return local;

    // Marca inicial padrão do LAB / Luiz
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
    setLocal("brands", initialList);
    setLocal(`brand_data_${defaultBrand.id}`, createDefaultBrandData(defaultBrand.name, defaultBrand.primary_color));
    return initialList;
  },

  // Busca dados completos de uma marca
  async getBrandData(brandId: string): Promise<CompleteBrandData> {
    try {
      const { data, error } = await supabase
        .from("brand_guardian_brands")
        .select("data, name, primary_color")
        .eq("id", brandId)
        .single();

      if (!error && data && data.data && Object.keys(data.data).length > 0) {
        setLocal(`brand_data_${brandId}`, data.data);
        return data.data as CompleteBrandData;
      }
    } catch {
      // fallback
    }

    const localData = getLocal<CompleteBrandData | null>(`brand_data_${brandId}`, null);
    if (localData) return localData;

    const brandList = getLocal<Brand[]>("brands", []);
    const found = brandList.find((b) => b.id === brandId);
    const created = createDefaultBrandData(found?.name || "Minha Marca", found?.primary_color || "#FF701A");
    setLocal(`brand_data_${brandId}`, created);
    return created;
  },

  // Salva dados de uma marca
  async saveBrandData(brandId: string, data: CompleteBrandData): Promise<void> {
    setLocal(`brand_data_${brandId}`, data);

    try {
      await supabase
        .from("brand_guardian_brands")
        .update({
          data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", brandId);
    } catch (err) {
      console.warn("Brand Guardian: Não foi possível sincronizar no Supabase agora:", err);
    }
  },

  // Cria uma nova marca
  async createBrand(brandData: Partial<Brand>): Promise<Brand> {
    const slug = (brandData.name || "marca")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const newBrand: Brand = {
      id: "brand-" + Math.random().toString(36).substring(2, 9),
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
    setLocal(`brand_data_${newBrand.id}`, initialDetails);

    const brands = getLocal<Brand[]>("brands", []);
    brands.unshift(newBrand);
    setLocal("brands", brands);

    try {
      await supabase.from("brand_guardian_brands").insert({
        ...newBrand,
        data: initialDetails,
      });
    } catch {
      // offline
    }

    return newBrand;
  },

  // Histórico de publicações e releases
  async getReleases(brandId: string): Promise<BrandReleaseRecord[]> {
    return getLocal<BrandReleaseRecord[]>(`releases_${brandId}`, [
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
    const newRelease: BrandReleaseRecord = {
      id: "rel-" + Date.now(),
      version,
      releaseNotes: notes,
      publishedAt: new Date().toISOString(),
      publishedBy: "Equipe",
      snapshot: currentData,
    };

    const list = await this.getReleases(brandId);
    list.unshift(newRelease);
    setLocal(`releases_${brandId}`, list);

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
