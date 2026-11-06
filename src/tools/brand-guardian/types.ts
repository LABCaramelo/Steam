// ==============================================================================
// Brand Guardian — Definições de Tipos e Contratos de Domínio Canônico
// ==============================================================================

export type BrandKind = "agency" | "client" | "personal" | "project";
export type BrandStatus = "draft" | "in_review" | "approved" | "published" | "archived";
export type ApprovalStatus = "draft" | "review" | "approved" | "deprecated";

export interface Brand {
  id: string;
  workspace_id?: string;
  client_id?: string;
  owner_id?: string;
  name: string;
  slug: string;
  kind: BrandKind;
  description: string;
  status: BrandStatus;
  logo_url: string;
  primary_color: string;
  accent_color: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
}

// 02. Fundamentos da Marca
export interface BrandFoundations {
  officialName: string;
  tradeName: string;
  segment: string;
  website: string;
  slogan: string;
  positioning: string;
  valueProposition: string;
  targetAudience: string;
  personas: string;
  archetypes: string[];
  values: string[];
  personalityTraits: string[];
  toneOfVoice: string;
  samplePhrases: string[];
  wordsToAvoid: string[];
  wordsToUse: string[];
  visualPrinciples: string[];
  desiredFeelings: string[];
  creativeRestrictions: string;
}

// 03. Logotipos
export type LogoVariantKey =
  | "primary"
  | "secondary"
  | "horizontal"
  | "vertical"
  | "symbol"
  | "wordmark"
  | "monogram"
  | "monochrome_dark"
  | "monochrome_light"
  | "favicon"
  | "avatar";

export interface BrandLogoVariant {
  id: string;
  key: LogoVariantKey;
  label: string;
  fileUrl: string;
  svgContent?: string;
  safeZoneRatio: number; // ex: 0.25 (25% do tamanho do símbolo)
  minSizePx: number;
  isOfficial: boolean;
  notes: string;
  doRules: string[];
  dontRules: string[];
}

// 04. Cores & Harmonias
export type ColorRole =
  | "primary"
  | "secondary"
  | "accent"
  | "neutral_dark"
  | "neutral_light"
  | "surface"
  | "text_primary"
  | "text_secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface ColorDefinition {
  id: string;
  name: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  oklch: { l: number; c: number; h: number };
  cmykApprox: string;
  role: ColorRole;
  usageRules: string;
  dominancePercent: number;
  status: ApprovalStatus;
  tonalScale?: Record<string, string>; // "50", "100", ..., "900"
}

export type ColorHarmonyType =
  | "complementary"
  | "analogous"
  | "triadic"
  | "tetradic"
  | "monochromatic"
  | "split_complementary"
  | "custom";

export interface ContrastResult {
  fgHex: string;
  bgHex: string;
  ratio: number;
  normalTextAA: boolean;
  normalTextAAA: boolean;
  largeTextAA: boolean;
  largeTextAAA: boolean;
  uiComponentsAA: boolean;
}

// 05. Tipografia
export type TypographyRole =
  | "primary_display"
  | "body_ui"
  | "secondary_accent"
  | "monospace"
  | "handwritten_notes";

export interface TypographyFamily {
  id: string;
  role: TypographyRole;
  label: string;
  familyName: string;
  category: "sans-serif" | "serif" | "display" | "monospace" | "handwriting";
  weights: number[];
  lineHeight: number;
  letterSpacing: string;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  clampFormula?: string;
  sampleText: string;
  license: string;
  fallback: string;
}

export interface TypeScaleStep {
  name: string;
  sizeRem: number;
  lineHeight: number;
  weight: number;
  tracking: string;
  usage: string;
}

// 06. Elementos Visuais
export interface BrandVisualElements {
  iconStyle: {
    strokeWidth: number;
    cornerRadius: number;
    defaultGridPx: number;
    guidelines: string;
  };
  geometry: {
    signatureShapes: string[];
    radiusScale: { sm: number; md: number; lg: number; full: number };
    curvesDescription: string;
  };
  patterns: {
    textures: string[];
    density: "low" | "medium" | "high";
    usageNotes: string;
  };
  illustration: {
    style: string;
    lineTreatment: string;
    rules: string[];
  };
  composition: {
    gridColumns: number;
    margins: number;
    gutters: number;
    spacingScale: number[];
  };
}

// 07. Imagens & Direção de Arte
export interface ArtReference {
  id: string;
  title: string;
  category: "photography" | "illustration" | "3d_render" | "editorial" | "character" | "moodboard";
  imageUrl: string;
  tags: string[];
  isPositive: boolean; // true = "Exemplo Aprovado", false = "Exemplo a Evitar"
  notes: string;
  licenseInfo: string;
  promptsText?: string;
}

// 08. Motion & Expressão
export interface MotionSpec {
  principles: string[];
  durations: {
    fastMs: number;
    normalMs: number;
    slowMs: number;
  };
  easings: {
    standard: string;
    emphasized: string;
    decelerate: string;
  };
  interactionRules: {
    hoverScale: number;
    activeScale: number;
    tapFeedback: string;
  };
  prefersReducedMotionActive: boolean;
}

// 09. Design Tokens (DTCG 2025.10)
export type TokenTier = "primitive" | "semantic" | "component";
export type TokenType = "color" | "dimension" | "fontFamily" | "fontWeight" | "duration" | "cubicBezier" | "shadow" | "borderRadius";

export interface DesignToken {
  id: string;
  path: string; // ex: "color.brand.primary" ou "button.primary.bg"
  tier: TokenTier;
  type: TokenType;
  value: string; // valor primitivo ou alias ex: "{color.brand.primary}"
  description: string;
  aliasTarget?: string;
  status: ApprovalStatus;
  modeValues?: {
    light?: string;
    dark?: string;
  };
}

// 10. Componentes
export interface ComponentSpec {
  id: string;
  name: string;
  category: "actions" | "inputs" | "feedback" | "surfaces" | "navigation" | "data";
  description: string;
  anatomy: string[];
  variants: string[];
  states: string[];
  sizes: string[];
  accessibilityRules: string;
  codeSnippet: string;
  usedTokens: string[];
}

// 11. Ativos (Asset Manager)
export interface BrandAssetItem {
  id: string;
  name: string;
  kind: "logo" | "image" | "vector" | "font" | "pdf" | "video" | "icon" | "document";
  url: string;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  approvalStatus: ApprovalStatus;
  tags: string[];
  createdAt: string;
}

// 12. Aplicações da Marca
export type ApplicationCategory =
  | "website"
  | "landing_page"
  | "app_ui"
  | "social_post"
  | "presentation"
  | "business_card"
  | "email_signature"
  | "stationery";

export interface BrandApplicationItem {
  id: string;
  category: ApplicationCategory;
  title: string;
  previewType: "dynamic" | "static";
  imageUrl?: string;
  status: "approved" | "review" | "draft";
  notes: string;
  customData?: Record<string, unknown>;
}

// 13. Brandbook
export interface BrandbookSection {
  id: string;
  title: string;
  order: number;
  visible: boolean;
  content: string;
  linkedModule: string;
}

// 14. Brand Guard (Validador)
export type FindingSeverity = "error" | "warning" | "recommendation" | "info";

export interface BrandGuardFinding {
  id: string;
  severity: FindingSeverity;
  module: string;
  ruleTitle: string;
  description: string;
  targetElement: string;
  suggestedFix: string;
}

// 16. Histórico & Governança (Releases)
export interface BrandReleaseRecord {
  id: string;
  version: string;
  releaseNotes: string;
  publishedAt: string;
  publishedBy: string;
  snapshot: CompleteBrandData;
}

// Envelope Completo da Identidade
export interface CompleteBrandData {
  foundations: BrandFoundations;
  logos: BrandLogoVariant[];
  colors: ColorDefinition[];
  typography: {
    families: TypographyFamily[];
    scale: TypeScaleStep[];
  };
  visualElements: BrandVisualElements;
  references: ArtReference[];
  motion: MotionSpec;
  tokens: DesignToken[];
  components: ComponentSpec[];
  assets: BrandAssetItem[];
  applications: BrandApplicationItem[];
  brandbookSections: BrandbookSection[];
}
