// ==============================================================================
// Brand Guardian — Plataforma de Identidade Visual e Design System (LAB Caramelo)
// Aplicação Principal Integrada com 17 Módulos de Identidade e Governança
// ==============================================================================

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Shield,
  Palette,
  Type,
  Layers,
  Sparkles,
  Compass,
  Sliders,
  Box,
  Image as ImageIcon,
  FolderKanban,
  FileText,
  Activity,
  Download,
  History,
  Settings,
  Plus,
  CheckCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Sun,
  Moon,
  BookOpen,
  Upload,
  Check,
  Search,
  Share2,
  Star,
  Info,
  Code2,
  UserCheck,
  ChevronRight,
} from "lucide-react";

import { useToast } from "../shared/kit";
import { brandGuardianRepo } from "./repo";
import {
  evaluateContrast,
  generateHarmonies,
  generateTonalScale,
  hexToRgb,
  rgbToHsl,
  rgbToOklch,
  rgbToCmykApprox,
  extractPaletteFromImage,
} from "./colorEngine";
import {
  resolveAllTokens,
  exportToDtcgJson,
  exportToCssCustomProperties,
  exportToTailwindConfig,
  exportToMarkdown,
} from "./tokenEngine";
import { auditBrandConsistency } from "./validatorEngine";
import type {
  Brand,
  CompleteBrandData,
  ColorHarmonyType,
  BrandGuardFinding,
  BrandAssetItem,
} from "./types";
import "./brand-guardian.css";

type NavSection =
  | "overview"
  | "foundations"
  | "logos"
  | "colors"
  | "typography"
  | "elements"
  | "art_direction"
  | "motion"
  | "design_tokens"
  | "components"
  | "assets"
  | "applications"
  | "brandbook"
  | "validator"
  | "integrations"
  | "governance"
  | "settings";

export function BrandGuardianApp() {
  const showToast = useToast();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [activeSection, setActiveSection] = useState<NavSection>("overview");
  const [brandData, setBrandData] = useState<CompleteBrandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("dark");

  // Onboarding / Modal de Nova Marca
  const [isNewBrandModalOpen, setIsNewBrandModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandKind, setNewBrandKind] = useState<Brand["kind"]>("client");
  const [newBrandColor, setNewBrandColor] = useState("#FF701A");

  // Color Lab State
  const [colorLabBaseHex, setColorLabBaseHex] = useState("#FF701A");
  const [selectedHarmony, setSelectedHarmony] = useState<ColorHarmonyType>("triadic");
  const [customFgHex, setCustomFgHex] = useState("#FFF4E8");
  const [customBgHex, setCustomBgHex] = useState("#101014");

  // Motion Playground State
  const [motionPlaying, setMotionPlaying] = useState(false);

  // Asset Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [selectedAssetKind, setSelectedAssetKind] = useState<BrandAssetItem["kind"]>("logo");

  const handleAssetFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBrand) return;
    setIsUploadingAsset(true);
    try {
      const newAsset = await brandGuardianRepo.uploadAsset(file, activeBrand.id, selectedAssetKind);
      const updated = [...(brandData?.assets || []), newAsset];
      setBrandData({
        ...brandData!,
        assets: updated,
      });
      showToast(`Ativo "${file.name}" carregado com sucesso!`, "success");
    } catch (err: any) {
      showToast(`Falha no upload do ativo: ${err?.message || "Erro desconhecido"}`, "error");
    } finally {
      setIsUploadingAsset(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // DaisyUI Component System State
  const [componentCategory, setComponentCategory] = useState<string>("all");
  const [componentSearch, setComponentSearch] = useState<string>("");
  const [activeCodeTab, setActiveCodeTab] = useState<Record<string, "tailwind" | "html" | "react">>({});

  // Interactive Component Demo State
  const [demoToggle, setDemoToggle] = useState(true);
  const [demoCheckbox, setDemoCheckbox] = useState(true);
  const [demoRadio, setDemoRadio] = useState("opt1");
  const [demoInput, setDemoInput] = useState("Perfil Oficial");
  const [demoRange, setDemoRange] = useState(72);
  const [demoTab, setDemoTab] = useState("visao-geral");
  const [demoCollapseOpen, setDemoCollapseOpen] = useState(true);

  // Carrega Marcas Inicialmente
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const list = await brandGuardianRepo.getBrands();
        setBrands(list);
        if (list.length > 0) {
          const firstId = list[0].id;
          setSelectedBrandId(firstId);
          const data = await brandGuardianRepo.getBrandData(firstId);
          setBrandData(data);
          if (data.colors[2]?.hex) setColorLabBaseHex(data.colors[2].hex);
        }
      } catch (err) {
        showToast("Erro ao carregar marcas.", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

  // Troca de Marca
  const handleSelectBrand = async (brandId: string) => {
    setSelectedBrandId(brandId);
    setLoading(true);
    try {
      const data = await brandGuardianRepo.getBrandData(brandId);
      setBrandData(data);
      if (data.colors[2]?.hex) setColorLabBaseHex(data.colors[2].hex);
    } catch {
      showToast("Não foi possível carregar os dados desta marca.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Salvar Alterações
  const handleSaveChanges = async () => {
    if (!brandData || !selectedBrandId) return;
    setSaving(true);
    try {
      await brandGuardianRepo.saveBrandData(selectedBrandId, brandData);
      showToast("Identidade visual salva e sincronizada com sucesso!", "success");
    } catch {
      showToast("Erro ao salvar alterações.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Criação de Nova Marca
  const handleCreateBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;

    try {
      const created = await brandGuardianRepo.createBrand({
        name: newBrandName.trim(),
        kind: newBrandKind,
        primary_color: newBrandColor,
      });

      const updatedList = await brandGuardianRepo.getBrands();
      setBrands(updatedList);
      setSelectedBrandId(created.id);
      const data = await brandGuardianRepo.getBrandData(created.id);
      setBrandData(data);
      setIsNewBrandModalOpen(false);
      setNewBrandName("");
      showToast(`Marca "${created.name}" criada com sucesso!`, "success");
    } catch {
      showToast("Erro ao criar marca.", "error");
    }
  };

  // Cálculos Derivados do Color Lab
  const currentHarmonies = useMemo(() => {
    return generateHarmonies(colorLabBaseHex, selectedHarmony);
  }, [colorLabBaseHex, selectedHarmony]);

  const currentTonalScale = useMemo(() => {
    return generateTonalScale(colorLabBaseHex);
  }, [colorLabBaseHex]);

  const liveContrast = useMemo(() => {
    return evaluateContrast(customFgHex, customBgHex);
  }, [customFgHex, customBgHex]);

  // Auditoria do Brand Guard
  const findings: BrandGuardFinding[] = useMemo(() => {
    if (!brandData) return [];
    return auditBrandConsistency(brandData);
  }, [brandData]);

  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;

  // Cálculo de Saúde da Marca (Brand Health Score 0..100)
  const healthScore = useMemo(() => {
    if (!brandData) return 0;
    let score = 100;
    score -= errorCount * 15;
    score -= warningCount * 5;
    return Math.max(10, Math.min(100, score));
  }, [brandData, errorCount, warningCount]);

  const activeBrand = brands.find((b) => b.id === selectedBrandId) || brands[0];

  if (loading || !brandData) {
    return (
      <div className="brand-guardian-app" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <Shield size={36} color="#FF701A" style={{ animation: "spin 2s linear infinite" }} />
          <p style={{ marginTop: 12, fontWeight: 600 }}>Carregando Brand Guardian…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="brand-guardian-app">
      {/* Sidebar de Navegação */}
      <aside className="bg-sidebar">
        <div className="bg-sidebar__header" style={{ flexDirection: "column", gap: 8, alignItems: "stretch" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={selectedBrandId}
              onChange={(e) => handleSelectBrand(e.target.value)}
              style={{
                flex: 1,
                background: "var(--bg-tertiary)",
                color: "var(--text-main)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 10px",
                fontSize: 13,
                fontWeight: 700,
                outline: "none",
                cursor: "pointer",
              }}
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.kind === "agency" ? "Agência" : "Cliente"})
                </option>
              ))}
            </select>
            <button
              className="bg-btn bg-btn--ghost"
              style={{ padding: "8px", minWidth: 36 }}
              title="Cadastrar Nova Marca"
              onClick={() => setIsNewBrandModalOpen(true)}
            >
              <Plus size={16} color="var(--accent-caramel)" />
            </button>
          </div>
        </div>

        <nav className="bg-sidebar__nav">
          {/* Grupo 1: Estratégia & Fundamentos */}
          <div className="bg-nav-group">
            <div className="bg-nav-group__title">Estratégia & Identidade</div>
            <div className={`bg-nav-item ${activeSection === "overview" ? "is-active" : ""}`} onClick={() => setActiveSection("overview")}>
              <Activity size={16} /> Visão Geral
              <span className="bg-nav-item__badge">{healthScore}%</span>
            </div>
            <div className={`bg-nav-item ${activeSection === "foundations" ? "is-active" : ""}`} onClick={() => setActiveSection("foundations")}>
              <Compass size={16} /> Fundamentos da Marca
            </div>
            <div className={`bg-nav-item ${activeSection === "logos" ? "is-active" : ""}`} onClick={() => setActiveSection("logos")}>
              <Shield size={16} /> Logotipos & Safe Zone
              <span className="bg-nav-item__badge">{brandData.logos.length}</span>
            </div>
          </div>

          {/* Grupo 2: Sistema Visual & Design System */}
          <div className="bg-nav-group">
            <div className="bg-nav-group__title">Sistema Visual & Tokens</div>
            <div className={`bg-nav-item ${activeSection === "colors" ? "is-active" : ""}`} onClick={() => setActiveSection("colors")}>
              <Palette size={16} /> Color Lab & Paletas
              <span className="bg-nav-item__badge">{brandData.colors.length}</span>
            </div>
            <div className={`bg-nav-item ${activeSection === "typography" ? "is-active" : ""}`} onClick={() => setActiveSection("typography")}>
              <Type size={16} /> Tipografia
            </div>
            <div className={`bg-nav-item ${activeSection === "elements" ? "is-active" : ""}`} onClick={() => setActiveSection("elements")}>
              <Layers size={16} /> Elementos Visuais
            </div>
            <div className={`bg-nav-item ${activeSection === "art_direction" ? "is-active" : ""}`} onClick={() => setActiveSection("art_direction")}>
              <ImageIcon size={16} /> Direção de Arte & Imagens
            </div>
            <div className={`bg-nav-item ${activeSection === "motion" ? "is-active" : ""}`} onClick={() => setActiveSection("motion")}>
              <Sparkles size={16} /> Motion & Expressão
            </div>
            <div className={`bg-nav-item ${activeSection === "design_tokens" ? "is-active" : ""}`} onClick={() => setActiveSection("design_tokens")}>
              <Sliders size={16} /> Design Tokens (DTCG)
              <span className="bg-nav-item__badge">{brandData.tokens.length}</span>
            </div>
            <div className={`bg-nav-item ${activeSection === "components" ? "is-active" : ""}`} onClick={() => setActiveSection("components")}>
              <Box size={16} /> Componentes
              <span className="bg-nav-item__badge">{brandData.components.length}</span>
            </div>
          </div>

          {/* Grupo 3: Ativos & Aplicações */}
          <div className="bg-nav-group">
            <div className="bg-nav-group__title">Ativos & Aplicações</div>
            <div className={`bg-nav-item ${activeSection === "assets" ? "is-active" : ""}`} onClick={() => setActiveSection("assets")}>
              <FolderKanban size={16} /> Biblioteca de Ativos
              <span className="bg-nav-item__badge">{brandData.assets.length}</span>
            </div>
            <div className={`bg-nav-item ${activeSection === "applications" ? "is-active" : ""}`} onClick={() => setActiveSection("applications")}>
              <BookOpen size={16} /> Aplicações da Marca
            </div>
          </div>

          {/* Grupo 4: Documentação & Governança */}
          <div className="bg-nav-group">
            <div className="bg-nav-group__title">Documentação & Governança</div>
            <div className={`bg-nav-item ${activeSection === "brandbook" ? "is-active" : ""}`} onClick={() => setActiveSection("brandbook")}>
              <FileText size={16} /> Brandbook Dinâmico
            </div>
            <div className={`bg-nav-item ${activeSection === "validator" ? "is-active" : ""}`} onClick={() => setActiveSection("validator")}>
              <CheckCircle size={16} /> Brand Guard (Validador)
              {errorCount > 0 && <span className="bg-nav-item__badge" style={{ background: "#FF3D8D", color: "#FFF" }}>{errorCount}</span>}
            </div>
            <div className={`bg-nav-item ${activeSection === "integrations" ? "is-active" : ""}`} onClick={() => setActiveSection("integrations")}>
              <ExternalLink size={16} /> Integrações LAB
            </div>
            <div className={`bg-nav-item ${activeSection === "governance" ? "is-active" : ""}`} onClick={() => setActiveSection("governance")}>
              <History size={16} /> Histórico & Releases
            </div>
            <div className={`bg-nav-item ${activeSection === "settings" ? "is-active" : ""}`} onClick={() => setActiveSection("settings")}>
              <Settings size={16} /> Configurações
            </div>
          </div>
        </nav>

        <div className="bg-sidebar__footer">
          <span>Brand Guardian V1.0</span>
          <span>DTCG 2025.10</span>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="bg-main">
        {/* Topbar */}
        <header className="bg-topbar">
          <div className="bg-topbar__titles">
            <h2>{renderSectionTitle(activeSection)}</h2>
            <p>{renderSectionSubtitle(activeSection, activeBrand?.name)}</p>
          </div>
          <div className="bg-topbar__actions">
            <button
              className="bg-btn bg-btn--ghost"
              onClick={() => setPreviewMode(previewMode === "dark" ? "light" : "dark")}
              title="Alternar Modo de Pré-visualização"
            >
              {previewMode === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              {previewMode === "dark" ? "Modo Claro" : "Modo Escuro"}
            </button>
            <button
              className="bg-btn bg-btn--primary"
              onClick={handleSaveChanges}
              disabled={saving}
            >
              {saving ? <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle size={15} />}
              {saving ? "Salvando…" : "Salvar Alterações"}
            </button>
          </div>
        </header>

        {/* Conteúdo Dinâmico Conforme Seção */}
        <div className="bg-content-area">
          {activeSection === "overview" && renderOverviewSection()}
          {activeSection === "foundations" && renderFoundationsSection()}
          {activeSection === "logos" && renderLogosSection()}
          {activeSection === "colors" && renderColorLabSection()}
          {activeSection === "typography" && renderTypographySection()}
          {activeSection === "elements" && renderElementsSection()}
          {activeSection === "art_direction" && renderArtDirectionSection()}
          {activeSection === "motion" && renderMotionSection()}
          {activeSection === "design_tokens" && renderTokensSection()}
          {activeSection === "components" && renderComponentsSection()}
          {activeSection === "assets" && renderAssetsSection()}
          {activeSection === "applications" && renderApplicationsSection()}
          {activeSection === "brandbook" && renderBrandbookSection()}
          {activeSection === "validator" && renderValidatorSection()}
          {activeSection === "integrations" && renderIntegrationsSection()}
          {activeSection === "governance" && renderGovernanceSection()}
          {activeSection === "settings" && renderSettingsSection()}
        </div>
      </main>

      {/* Modal de Criação de Marca */}
      {isNewBrandModalOpen && renderNewBrandModal()}
    </div>
  );

  // ============================================================================
  // RENDERIZADORES DE MÓDULOS ESPECÍFICOS
  // ============================================================================

  function renderOverviewSection() {
    return (
      <div>
        <div className="bg-grid-4" style={{ marginBottom: 24 }}>
          <div className="bg-card">
            <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Brand Health Score</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: healthScore > 80 ? "#FF701A" : "#FF3D8D", margin: "8px 0" }}>
              {healthScore}%
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {errorCount === 0 ? "Identidade consistente e validada" : `${errorCount} violações detectadas no Brand Guard`}
            </div>
          </div>

          <div className="bg-card">
            <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Cores & Harmonias</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "var(--text-main)", margin: "8px 0" }}>
              {brandData!.colors.length}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Paletas semânticas aprovadas</div>
          </div>

          <div className="bg-card">
            <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Design Tokens DTCG</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "var(--text-main)", margin: "8px 0" }}>
              {brandData!.tokens.length}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Primitivos, semânticos e componentes</div>
          </div>

          <div className="bg-card">
            <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Variantes de Logotipo</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "var(--text-main)", margin: "8px 0" }}>
              {brandData!.logos.length}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Com área de proteção delimitada</div>
          </div>
        </div>

        {/* Resumo Rápido da Identidade */}
        <div className="bg-card">
          <div className="bg-card__header">
            <div className="bg-card__title">
              <Compass size={18} color="#FF701A" />
              Manifesto & Posicionamento Oficial
            </div>
            <button className="bg-btn bg-btn--ghost" onClick={() => setActiveSection("foundations")}>
              Editar Fundamentos →
            </button>
          </div>
          <p style={{ fontSize: 18, fontStyle: "italic", lineHeight: 1.6, color: "var(--text-main)", margin: "10px 0" }}>
            "{brandData!.foundations.positioning}"
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {brandData!.foundations.values.map((val, idx) => (
              <span key={idx} style={{ background: "var(--bg-tertiary)", padding: "4px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                {val}
              </span>
            ))}
          </div>
        </div>

        {/* Amostras Rápidas da Paleta */}
        <div className="bg-card">
          <div className="bg-card__header">
            <div className="bg-card__title">
              <Palette size={18} color="#FF701A" />
              Paleta Oficial de Trabalho
            </div>
            <button className="bg-btn bg-btn--ghost" onClick={() => setActiveSection("colors")}>
              Abrir Color Lab →
            </button>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {brandData!.colors.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg-tertiary)", padding: "8px 12px", borderRadius: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 4, background: c.hex, border: "1px solid rgba(255,255,255,0.2)" }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-dim)" }}>{c.hex}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderFoundationsSection() {
    return (
      <div className="bg-card">
        <div className="bg-card__header">
          <div className="bg-card__title">
            <Compass size={18} color="#FF701A" />
            Dados Institucionais & Posicionamento
          </div>
        </div>

        <div className="bg-grid-2">
          <div className="bg-input-field">
            <label>Nome Comercial</label>
            <input
              type="text"
              value={brandData!.foundations.tradeName}
              onChange={(e) =>
                setBrandData({
                  ...brandData!,
                  foundations: { ...brandData!.foundations, tradeName: e.target.value },
                })
              }
            />
          </div>

          <div className="bg-input-field">
            <label>Slogan / Assinatura</label>
            <input
              type="text"
              value={brandData!.foundations.slogan}
              onChange={(e) =>
                setBrandData({
                  ...brandData!,
                  foundations: { ...brandData!.foundations, slogan: e.target.value },
                })
              }
            />
          </div>
        </div>

        <div className="bg-input-field">
          <label>Posicionamento Estratégico</label>
          <textarea
            rows={3}
            value={brandData!.foundations.positioning}
            onChange={(e) =>
              setBrandData({
                ...brandData!,
                foundations: { ...brandData!.foundations, positioning: e.target.value },
              })
            }
          />
        </div>

        <div className="bg-grid-2">
          <div className="bg-input-field">
            <label>Público-Alvo & Personas</label>
            <textarea
              rows={3}
              value={brandData!.foundations.personas}
              onChange={(e) =>
                setBrandData({
                  ...brandData!,
                  foundations: { ...brandData!.foundations, personas: e.target.value },
                })
              }
            />
          </div>

          <div className="bg-input-field">
            <label>Tom de Voz</label>
            <textarea
              rows={3}
              value={brandData!.foundations.toneOfVoice}
              onChange={(e) =>
                setBrandData({
                  ...brandData!,
                  foundations: { ...brandData!.foundations, toneOfVoice: e.target.value },
                })
              }
            />
          </div>
        </div>

        <div className="bg-grid-2">
          <div className="bg-input-field">
            <label>Palavras e Expressões a Usar</label>
            <input
              type="text"
              value={brandData!.foundations.wordsToUse.join(", ")}
              onChange={(e) =>
                setBrandData({
                  ...brandData!,
                  foundations: {
                    ...brandData!.foundations,
                    wordsToUse: e.target.value.split(",").map((s) => s.trim()),
                  },
                })
              }
            />
          </div>

          <div className="bg-input-field">
            <label>Palavras e Estilos a Evitar (Anti-Clichê)</label>
            <input
              type="text"
              value={brandData!.foundations.wordsToAvoid.join(", ")}
              onChange={(e) =>
                setBrandData({
                  ...brandData!,
                  foundations: {
                    ...brandData!.foundations,
                    wordsToAvoid: e.target.value.split(",").map((s) => s.trim()),
                  },
                })
              }
            />
          </div>
        </div>
      </div>
    );
  }

  function renderLogosSection() {
    return (
      <div>
        <div className="bg-card">
          <div className="bg-card__header">
            <div className="bg-card__title">
              <Shield size={18} color="#FF701A" />
              Variantes Oficiais de Logotipo & Área de Proteção
            </div>
          </div>

          <div className="bg-grid-2">
            {brandData!.logos.map((logo) => (
              <div key={logo.id} className="bg-card" style={{ background: "var(--bg-tertiary)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{logo.label}</div>
                  <span style={{ fontSize: 11, background: "var(--bg-elevated)", padding: "2px 8px", borderRadius: 4 }}>
                    Min: {logo.minSizePx}px
                  </span>
                </div>

                {/* Área de Proteção Visual Interativa */}
                <div
                  className="bg-safezone-canvas"
                  style={{
                    width: "100%",
                    height: 160,
                    padding: `${Math.round(logo.safeZoneRatio * 100)}px`,
                  }}
                >
                  <div className="bg-safezone-overlay" />
                  <img
                    src={logo.fileUrl || "/favicon.svg"}
                    alt={logo.label}
                    style={{ maxHeight: 60, maxWidth: "80%", objectFit: "contain" }}
                  />
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{logo.notes}</div>
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-dim)" }}>
                    Margem de proteção: {Math.round(logo.safeZoneRatio * 100)}% da dimensão base
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderColorLabSection() {
    const rgb = hexToRgb(colorLabBaseHex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const oklch = rgbToOklch(rgb.r, rgb.g, rgb.b);
    const cmyk = rgbToCmykApprox(rgb.r, rgb.g, rgb.b);

    return (
      <div>
        {/* 8.1. Color Lab Interativo */}
        <div className="bg-card">
          <div className="bg-card__header">
            <div className="bg-card__title">
              <Palette size={18} color="#FF701A" />
              Color Lab — Roda Cromática & Harmonias
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["complementary", "analogous", "triadic", "tetradic", "monochromatic", "split_complementary"] as ColorHarmonyType[]).map(
                (h) => (
                  <button
                    key={h}
                    className={`bg-btn ${selectedHarmony === h ? "bg-btn--primary" : "bg-btn--ghost"}`}
                    style={{ fontSize: 11, padding: "4px 8px" }}
                    onClick={() => setSelectedHarmony(h)}
                  >
                    {h.replace("_", " ")}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="bg-grid-2">
            <div>
              <div className="bg-input-field">
                <label>Cor Base de Trabalho (HEX)</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    type="color"
                    value={colorLabBaseHex}
                    onChange={(e) => setColorLabBaseHex(e.target.value.toUpperCase())}
                    style={{ width: 44, height: 40, padding: 0, cursor: "pointer", border: "none" }}
                  />
                  <input
                    type="text"
                    value={colorLabBaseHex}
                    onChange={(e) => setColorLabBaseHex(e.target.value.toUpperCase())}
                    style={{ flex: 1, fontFamily: "monospace", fontSize: 14 }}
                  />
                </div>
              </div>

              {/* Valores Técnicos Canônicos */}
              <div style={{ background: "var(--bg-tertiary)", padding: 14, borderRadius: 8, fontSize: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><strong>RGB:</strong> {rgb.r}, {rgb.g}, {rgb.b}</div>
                <div><strong>HSL:</strong> {hsl.h}°, {hsl.s}%, {hsl.l}%</div>
                <div><strong>OKLCH:</strong> L:{oklch.l} C:{oklch.c} H:{oklch.h}°</div>
                <div><strong>CMYK:</strong> {cmyk}</div>
              </div>

              {/* Extração via Imagem */}
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Extrair Paleta de uma Imagem</label>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "block", marginTop: 6, fontSize: 12 }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const extracted = await extractPaletteFromImage(file);
                      if (extracted[0]) setColorLabBaseHex(extracted[0]);
                      showToast(`Paleta extraída com sucesso (${extracted.length} tons encontrados).`, "info");
                    }
                  }}
                />
              </div>
            </div>

            {/* Harmonias Geradas */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>
                Harmonia {selectedHarmony.toUpperCase()}
              </div>
              <div style={{ display: "flex", gap: 8, height: 100 }}>
                {currentHarmonies.map((hex, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      background: hex,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "flex-end",
                      padding: 8,
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      navigator.clipboard.writeText(hex);
                      showToast(`Copiado: ${hex}`, "info");
                    }}
                    title="Clique para copiar"
                  >
                    <span style={{ fontSize: 10, background: "rgba(0,0,0,0.6)", color: "#FFF", padding: "2px 4px", borderRadius: 3, fontFamily: "monospace" }}>
                      {hex}
                    </span>
                  </div>
                ))}
              </div>

              {/* Escala Tonal 50-900 */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Escala Tonal (50 a 900)</div>
                <div className="bg-tonal-bar">
                  {Object.entries(currentTonalScale).map(([stop, hex]) => (
                    <div
                      key={stop}
                      className="bg-tonal-step"
                      style={{ background: hex, color: parseInt(stop) > 400 ? "#FFF" : "#000" }}
                      onClick={() => {
                        navigator.clipboard.writeText(hex);
                        showToast(`Tom ${stop} (${hex}) copiado!`, "info");
                      }}
                      title={`${stop}: ${hex}`}
                    >
                      {stop}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 8.5. Testador de Contraste WCAG 2.2 */}
        <div className="bg-card">
          <div className="bg-card__header">
            <div className="bg-card__title">
              <CheckCircle size={18} color="#25BFFF" />
              Testador de Contraste WCAG 2.2
            </div>
          </div>

          <div className="bg-grid-2">
            <div>
              <div style={{ display: "flex", gap: 12 }}>
                <div className="bg-input-field" style={{ flex: 1 }}>
                  <label>Texto (Foreground)</label>
                  <input type="text" value={customFgHex} onChange={(e) => setCustomFgHex(e.target.value)} />
                </div>
                <div className="bg-input-field" style={{ flex: 1 }}>
                  <label>Fundo (Background)</label>
                  <input type="text" value={customBgHex} onChange={(e) => setCustomBgHex(e.target.value)} />
                </div>
              </div>

              {/* Amostra Visual com Contraste */}
              <div
                style={{
                  background: customBgHex,
                  color: customFgHex,
                  padding: 20,
                  borderRadius: 8,
                  border: "1px solid var(--border-subtle)",
                  marginTop: 10,
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800 }}>Texto Grande e Títulos</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  Parágrafo regular com a combinação de cores selecionada para teste de leitura contínua.
                </div>
              </div>
            </div>

            {/* Badges de Avaliação WCAG */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
              <div style={{ fontSize: 24, fontWeight: 900 }}>
                Razão: <span style={{ color: liveContrast.ratio >= 4.5 ? "#25BFFF" : "#FF3D8D" }}>{liveContrast.ratio}:1</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className={`bg-btn ${liveContrast.normalTextAA ? "bg-btn--primary" : "bg-btn--ghost"}`} style={{ fontSize: 11 }}>
                  Texto Normal AA (4.5:1): {liveContrast.normalTextAA ? "Aprovado" : "Falhou"}
                </span>
                <span className={`bg-btn ${liveContrast.normalTextAAA ? "bg-btn--primary" : "bg-btn--ghost"}`} style={{ fontSize: 11 }}>
                  Texto Normal AAA (7.0:1): {liveContrast.normalTextAAA ? "Aprovado" : "Falhou"}
                </span>
                <span className={`bg-btn ${liveContrast.uiComponentsAA ? "bg-btn--primary" : "bg-btn--ghost"}`} style={{ fontSize: 11 }}>
                  Componentes UI (3.0:1): {liveContrast.uiComponentsAA ? "Aprovado" : "Falhou"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderTypographySection() {
    return (
      <div className="bg-card">
        <div className="bg-card__header">
          <div className="bg-card__title">
            <Type size={18} color="#FF701A" />
            Sistema Tipográfico & Typography Playground
          </div>
        </div>

        <div className="bg-grid-2">
          {brandData!.typography.families.map((f) => (
            <div key={f.id} className="bg-card" style={{ background: "var(--bg-tertiary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <strong>{f.label}</strong>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{f.category}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: f.weights[f.weights.length - 1], fontFamily: f.familyName, margin: "10px 0" }}>
                {f.sampleText}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Família: {f.familyName} · Pesos: {f.weights.join(", ")} · Licença: {f.license}
              </div>
            </div>
          ))}
        </div>

        {/* Escala Harmônica */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Escala Tipográfica Responsiva</div>
          <table className="bg-table">
            <thead>
              <tr>
                <th>Estilo</th>
                <th>Tamanho (rem)</th>
                <th>Entrelinha</th>
                <th>Peso</th>
                <th>Tracking</th>
                <th>Finalidade</th>
              </tr>
            </thead>
            <tbody>
              {brandData!.typography.scale.map((step) => (
                <tr key={step.name}>
                  <td><strong>{step.name}</strong></td>
                  <td>{step.sizeRem}rem</td>
                  <td>{step.lineHeight}</td>
                  <td>{step.weight}</td>
                  <td>{step.tracking}</td>
                  <td>{step.usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderElementsSection() {
    const el = brandData!.visualElements;
    return (
      <div className="bg-card">
        <div className="bg-card__header">
          <div className="bg-card__title">
            <Layers size={18} color="#FF701A" />
            Elementos Visuais & Gramática da Marca
          </div>
        </div>

        <div className="bg-grid-2">
          <div className="bg-card" style={{ background: "var(--bg-tertiary)" }}>
            <strong>Iconografia</strong>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>{el.iconStyle.guidelines}</p>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 10 }}>
              Grid Base: {el.iconStyle.defaultGridPx}px · Traço: {el.iconStyle.strokeWidth}px
            </div>
          </div>

          <div className="bg-card" style={{ background: "var(--bg-tertiary)" }}>
            <strong>Geometria & Raios</strong>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>{el.geometry.curvesDescription}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {Object.entries(el.geometry.radiusScale).map(([name, val]) => (
                <span key={name} style={{ background: "var(--bg-elevated)", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>
                  {name}: {val}px
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderArtDirectionSection() {
    return (
      <div className="bg-card">
        <div className="bg-card__header">
          <div className="bg-card__title">
            <ImageIcon size={18} color="#FF701A" />
            Direção de Arte & Moodboard
          </div>
        </div>

        <div className="bg-grid-2">
          {brandData!.references.map((ref) => (
            <div key={ref.id} className="bg-card" style={{ background: "var(--bg-tertiary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>{ref.title}</strong>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: ref.isPositive ? "rgba(37, 191, 255, 0.2)" : "rgba(255, 61, 141, 0.2)",
                    color: ref.isPositive ? "#25BFFF" : "#FF3D8D",
                  }}
                >
                  {ref.isPositive ? "Aprovado" : "Evitar"}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>{ref.notes}</p>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                {ref.tags.map((t) => (
                  <span key={t} style={{ fontSize: 10, background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 4 }}>
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderMotionSection() {
    const m = brandData!.motion;
    return (
      <div className="bg-card">
        <div className="bg-card__header">
          <div className="bg-card__title">
            <Sparkles size={18} color="#FF701A" />
            Motion & Expressão Digital
          </div>
          <button className="bg-btn bg-btn--primary" onClick={() => setMotionPlaying(!motionPlaying)}>
            {motionPlaying ? "Pausar Playground" : "Testar Animação"}
          </button>
        </div>

        <div className="bg-grid-2">
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Princípios de Animação</div>
            <ul style={{ fontSize: 12, color: "var(--text-muted)", paddingLeft: 18 }}>
              {m.principles.map((p, i) => (
                <li key={i} style={{ marginBottom: 6 }}>{p}</li>
              ))}
            </ul>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Durações Recomendadas</div>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <span className="bg-btn bg-btn--ghost" style={{ fontSize: 11 }}>Fast: {m.durations.fastMs}ms</span>
                <span className="bg-btn bg-btn--ghost" style={{ fontSize: 11 }}>Normal: {m.durations.normalMs}ms</span>
                <span className="bg-btn bg-btn--ghost" style={{ fontSize: 11 }}>Slow: {m.durations.slowMs}ms</span>
              </div>
            </div>
          </div>

          {/* Playground de Motion */}
          <div
            style={{
              background: "var(--bg-tertiary)",
              height: 200,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: 12,
                background: "linear-gradient(135deg, #FF701A, #FF3D8D)",
                transform: motionPlaying ? "scale(1.2) rotate(45deg)" : "scale(1) rotate(0deg)",
                transition: `all ${m.durations.normalMs}ms ${m.easings.emphasized}`,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  function renderTokensSection() {
    const resolvedTokens = resolveAllTokens(brandData!.tokens, previewMode);

    return (
      <div className="bg-card">
        <div className="bg-card__header">
          <div className="bg-card__title">
            <Sliders size={18} color="#FF701A" />
            DTCG 2025.10 Design Tokens
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="bg-btn bg-btn--ghost"
              onClick={() => {
                const json = exportToDtcgJson(brandData!.tokens);
                navigator.clipboard.writeText(json);
                showToast("JSON DTCG copiado para a área de transferência!", "success");
              }}
            >
              <Copy size={13} /> Copiar JSON
            </button>
            <button
              className="bg-btn bg-btn--ghost"
              onClick={() => {
                const css = exportToCssCustomProperties(brandData!.tokens);
                navigator.clipboard.writeText(css);
                showToast("CSS Custom Properties copiado!", "success");
              }}
            >
              <Copy size={13} /> Copiar CSS
            </button>
            <button
              className="bg-btn bg-btn--ghost"
              onClick={() => {
                const tw = exportToTailwindConfig(brandData!.tokens);
                navigator.clipboard.writeText(tw);
                showToast("Config do Tailwind copiada!", "success");
              }}
            >
              <Copy size={13} /> Tailwind
            </button>
            <button
              className="bg-btn bg-btn--ghost"
              onClick={() => {
                const md = exportToMarkdown(brandData!.tokens);
                navigator.clipboard.writeText(md);
                showToast("Documentação Markdown copiada!", "success");
              }}
            >
              <Copy size={13} /> Markdown
            </button>
          </div>
        </div>

        <table className="bg-table">
          <thead>
            <tr>
              <th>Caminho (Token Path)</th>
              <th>Tier</th>
              <th>Tipo</th>
              <th>Valor Original</th>
              <th>Valor Resolvido ({previewMode})</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {resolvedTokens.map((r) => (
              <tr key={r.token.id}>
                <td><code style={{ color: "#25BFFF" }}>{r.token.path}</code></td>
                <td><span style={{ fontSize: 10, background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 4 }}>{r.token.tier}</span></td>
                <td>{r.token.type}</td>
                <td><code>{r.token.value}</code></td>
                <td>
                  <strong style={{ color: r.hasCycle ? "#FF3D8D" : "var(--text-main)" }}>
                    {r.hasCycle ? "Ciclo Detectado!" : r.resolvedValue}
                  </strong>
                </td>
                <td>
                  <span style={{ fontSize: 11, color: "#25BFFF" }}>{r.token.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderComponentsSection() {
    const brandPrimary = activeBrand?.primary_color || "#FF701A";
    const brandAccent = activeBrand?.accent_color || "#25BFFF";
    const brandText = brandData?.colors.find((c) => c.role === "text_primary")?.hex || "#FFF4E8";
    const brandSurface = brandData?.colors.find((c) => c.role === "surface")?.hex || "#1F1F27";
    const brandRadius = brandData?.visualElements?.geometry?.radiusScale?.md
      ? `${brandData.visualElements.geometry.radiusScale.md}px`
      : "10px";
    const displayFont = brandData?.typography.families.find((f) => f.role === "primary_display")?.familyName || "inherit";
    const bodyFont = brandData?.typography.families.find((f) => f.role === "body_ui")?.familyName || "inherit";

    const copySnippet = (code: string, label: string) => {
      navigator.clipboard.writeText(code);
      showToast(`Código do ${label} copiado!`, "success");
    };

    const copyDaisyUiThemeConfig = () => {
      const config = `// tailwind.config.js - Tema DaisyUI gerado para ${activeBrand?.name || "Marca"}
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        "${activeBrand?.slug || "brand"}": {
          "primary": "${brandPrimary}",
          "primary-content": "#101014",
          "secondary": "${brandSurface}",
          "secondary-content": "#FFF4E8",
          "accent": "${brandAccent}",
          "accent-content": "#101014",
          "neutral": "#1F1F27",
          "neutral-content": "#FFF4E8",
          "base-100": "#101014",
          "base-200": "#17171D",
          "base-300": "#1F1F27",
          "base-content": "${brandText}",
          "info": "${brandAccent}",
          "success": "#27C93F",
          "warning": "#FFD52A",
          "error": "#FF3D8D",
          "--rounded-box": "${brandRadius}",
          "--rounded-btn": "${brandRadius}",
          "--rounded-badge": "9999px",
        },
      },
    ],
  },
};`;
      navigator.clipboard.writeText(config);
      showToast("Configuração Tailwind + DaisyUI copiada!", "success");
    };

    const copyCssVariablesKit = () => {
      const cssVars = `/* Brand Guardian — Variáveis CSS para Componentes DaisyUI */
:root {
  --brand-primary: ${brandPrimary};
  --brand-accent: ${brandAccent};
  --brand-surface: ${brandSurface};
  --brand-text: ${brandText};
  --brand-radius: ${brandRadius};
  --brand-font-display: "${displayFont}", sans-serif;
  --brand-font-body: "${bodyFont}", sans-serif;
}`;
      navigator.clipboard.writeText(cssVars);
      showToast("Variáveis CSS dos componentes copiadas!", "success");
    };

    // Lista de componentes DaisyUI enriquecidos com a identidade
    const daisyComponents = [
      {
        id: "daisy-btn",
        name: "Botão (Button · btn)",
        category: "actions",
        description: "Botões de ação primária, acento, contorno e fantasma com microinterações e contraste WCAG.",
        tokens: ["button.primary.bg", "color.brand.primary", "borderRadius.button"],
        renderPreview: () => (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" className="daisy-btn daisy-btn-primary daisy-btn-md">
              <Sparkles size={14} /> Botão Primário
            </button>
            <button type="button" className="daisy-btn daisy-btn-accent daisy-btn-md">
              Acento
            </button>
            <button type="button" className="daisy-btn daisy-btn-outline daisy-btn-md">
              Outline
            </button>
            <button type="button" className="daisy-btn daisy-btn-soft daisy-btn-md">
              Soft Tint
            </button>
            <button type="button" className="daisy-btn daisy-btn-ghost daisy-btn-md">
              <Share2 size={14} /> Ghost
            </button>
            <button type="button" className="daisy-btn daisy-btn-primary daisy-btn-sm">
              Pequeno (sm)
            </button>
          </div>
        ),
        tailwindSnippet: `<button class="btn bg-[var(--brand-primary)] text-black hover:opacity-90 font-bold px-6 py-2 rounded-[var(--brand-radius)] shadow-lg transition">
  Botão Primário
</button>
<button class="btn btn-outline border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-black rounded-[var(--brand-radius)]">
  Outline
</button>`,
        htmlSnippet: `<button class="daisy-btn daisy-btn-primary">Botão Primário</button>
<button class="daisy-btn daisy-btn-accent">Acento</button>
<button class="daisy-btn daisy-btn-outline">Outline</button>`,
        reactSnippet: `<button className="daisy-btn daisy-btn-primary">
  <Sparkles size={14} /> Botão Primário
</button>`,
      },
      {
        id: "daisy-badge",
        name: "Pílula & Tag (Badge · badge)",
        category: "data",
        description: "Emblemas e pílulas para rotular categorias, tags de autoridade e contadores do perfil.",
        tokens: ["color.brand.primary", "color.brand.accent", "borderRadius.badge"],
        renderPreview: () => (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className="daisy-badge daisy-badge-primary">
              <Star size={10} /> Oficial
            </span>
            <span className="daisy-badge daisy-badge-accent">
              <Check size={10} /> Verificado
            </span>
            <span className="daisy-badge daisy-badge-outline">Design System</span>
            <span className="daisy-badge daisy-badge-soft">v1.0.0</span>
            <span className="daisy-badge daisy-badge-ghost">Ativo</span>
            <span className="daisy-badge daisy-badge-primary" style={{ padding: "2px 6px", fontSize: 10 }}>
              +14
            </span>
          </div>
        ),
        tailwindSnippet: `<span class="badge bg-[var(--brand-primary)] text-black font-bold px-3 py-1 rounded-full">
  Oficial
</span>
<span class="badge badge-outline border-[var(--brand-accent)] text-[var(--brand-accent)]">
  Verificado
</span>`,
        htmlSnippet: `<span class="daisy-badge daisy-badge-primary">Oficial</span>
<span class="daisy-badge daisy-badge-accent">Verificado</span>
<span class="daisy-badge daisy-badge-outline">Design System</span>`,
        reactSnippet: `<Badge variant="primary">Oficial</Badge>
<Badge variant="accent" outline>Verificado</Badge>`,
      },
      {
        id: "daisy-card",
        name: "Cartão de Conteúdo (Card · card)",
        category: "data",
        description: "Contêiner estruturado para perfis, produtos ou postagens com cabeçalho, corpo e ações.",
        tokens: ["color.surface.canvas", "borderRadius.card", "shadow.card"],
        renderPreview: () => (
          <div className="daisy-card-box" style={{ maxWidth: 360, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, background: brandPrimary, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#101014" }}>
                  {activeBrand?.name.charAt(0) || "C"}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{activeBrand?.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>@{activeBrand?.slug}</div>
                </div>
              </div>
              <span className="daisy-badge daisy-badge-accent">
                <Check size={9} /> Verificado
              </span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, margin: "10px 0" }}>
              {brandData?.foundations.slogan || "Identidade visual unificada e guardiã do ecossistema de design."}
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button type="button" className="daisy-btn daisy-btn-primary daisy-btn-sm" style={{ flex: 1 }}>
                Acessar Marca
              </button>
              <button type="button" className="daisy-btn daisy-btn-ghost daisy-btn-sm">
                <Share2 size={13} />
              </button>
            </div>
          </div>
        ),
        tailwindSnippet: `<div class="card bg-[#17171D] border border-white/10 rounded-[var(--brand-radius)] p-5 shadow-xl max-w-sm">
  <div class="flex items-center gap-3">
    <div class="w-10 h-10 rounded-lg bg-[var(--brand-primary)] text-black font-black flex items-center justify-center">L</div>
    <div>
      <h4 class="font-bold text-white text-sm">${activeBrand?.name}</h4>
      <p class="text-xs text-white/50">@${activeBrand?.slug}</p>
    </div>
  </div>
  <p class="text-xs text-white/70 mt-3">${brandData?.foundations.slogan}</p>
  <div class="card-actions mt-4">
    <button class="btn btn-sm bg-[var(--brand-primary)] text-black w-full">Acessar Marca</button>
  </div>
</div>`,
        htmlSnippet: `<div class="daisy-card-box">
  <h4>${activeBrand?.name}</h4>
  <p>${brandData?.foundations.slogan}</p>
  <button class="daisy-btn daisy-btn-primary daisy-btn-sm">Acessar</button>
</div>`,
        reactSnippet: `<Card className="daisy-card-box">
  <CardHeader title="${activeBrand?.name}" />
  <CardBody>{slogan}</CardBody>
  <CardFooter><Button variant="primary">Acessar</Button></CardFooter>
</Card>`,
      },
      {
        id: "daisy-input",
        name: "Campo de Entrada (Input · input)",
        category: "inputs",
        description: "Caixa de texto, pesquisa e formulário com foco responsivo na cor primária da marca.",
        tokens: ["color.brand.primary", "color.surface.input", "borderRadius.input"],
        renderPreview: () => (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 360 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", marginBottom: 4, display: "block" }}>
                Nome do Perfil
              </label>
              <input
                type="text"
                className="daisy-input"
                value={demoInput}
                onChange={(e) => setDemoInput(e.target.value)}
                placeholder="Digite algo..."
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", marginBottom: 4, display: "block" }}>
                Categoria Selecionada
              </label>
              <select className="daisy-select">
                <option>Identidade de Agência</option>
                <option>Cliente do CRM</option>
                <option>Projeto Autoral</option>
              </select>
            </div>
          </div>
        ),
        tailwindSnippet: `<input
  type="text"
  placeholder="Nome do perfil..."
  class="input input-bordered w-full rounded-[var(--brand-radius)] bg-[#17171D] border-white/10 text-white focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/30"
/>`,
        htmlSnippet: `<input type="text" class="daisy-input" placeholder="Nome do perfil..." />
<select class="daisy-select"><option>Opção 1</option></select>`,
        reactSnippet: `<Input
  label="Nome do Perfil"
  placeholder="Digite..."
  className="daisy-input"
/>`,
      },
      {
        id: "daisy-toggle",
        name: "Interruptor (Toggle & Checkbox)",
        category: "inputs",
        description: "Controles booleanos interativos para alternar preferências e filtros no perfil.",
        tokens: ["color.brand.primary", "duration.normal"],
        renderPreview: () => (
          <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
              onClick={() => setDemoToggle(!demoToggle)}
            >
              <div className={`daisy-toggle-switch ${demoToggle ? "active" : ""}`}>
                <div className="daisy-toggle-handle" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Toggle: {demoToggle ? "Ativo" : "Inativo"}</span>
            </div>

            <div
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
              onClick={() => setDemoCheckbox(!demoCheckbox)}
            >
              <div className={`daisy-checkbox-custom ${demoCheckbox ? "checked" : ""}`}>
                {demoCheckbox && <Check size={12} strokeWidth={3} />}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Checkbox Homologado</span>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                onClick={() => setDemoRadio("opt1")}
              >
                <div className={`daisy-radio-custom ${demoRadio === "opt1" ? "checked" : ""}`}>
                  {demoRadio === "opt1" && <div className="daisy-radio-dot" />}
                </div>
                <span style={{ fontSize: 12 }}>Opção A</span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                onClick={() => setDemoRadio("opt2")}
              >
                <div className={`daisy-radio-custom ${demoRadio === "opt2" ? "checked" : ""}`}>
                  {demoRadio === "opt2" && <div className="daisy-radio-dot" />}
                </div>
                <span style={{ fontSize: 12 }}>Opção B</span>
              </div>
            </div>
          </div>
        ),
        tailwindSnippet: `<!-- Toggle -->
<input type="checkbox" class="toggle checked:bg-[var(--brand-primary)] checked:border-[var(--brand-primary)]" checked />

<!-- Checkbox -->
<input type="checkbox" class="checkbox checked:bg-[var(--brand-primary)] checked:border-[var(--brand-primary)]" checked />

<!-- Radio -->
<input type="radio" name="radio-brand" class="radio checked:bg-[var(--brand-primary)] checked:border-[var(--brand-primary)]" checked />`,
        htmlSnippet: `<div class="daisy-toggle-switch active"><div class="daisy-toggle-handle"></div></div>
<div class="daisy-checkbox-custom checked">✓</div>`,
        reactSnippet: `<Toggle checked={demoToggle} onChange={setDemoToggle} />
<Checkbox checked={demoCheckbox} label="Homologado" />`,
      },
      {
        id: "daisy-range",
        name: "Controle Deslizante (Range · range)",
        category: "inputs",
        description: "Controle deslizante contínuo com trilha e acento visual no tom primário da marca.",
        tokens: ["color.brand.primary"],
        renderPreview: () => (
          <div style={{ width: "100%", maxWidth: 360 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Nível de Saturação da Marca</span>
              <strong style={{ fontSize: 12, color: brandPrimary }}>{demoRange}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={demoRange}
              onChange={(e) => setDemoRange(Number(e.target.value))}
              style={{ width: "100%", accentColor: brandPrimary, cursor: "pointer" }}
            />
          </div>
        ),
        tailwindSnippet: `<input type="range" min="0" max="100" value="70" class="range range-primary accent-[var(--brand-primary)] w-full" />`,
        htmlSnippet: `<input type="range" min="0" max="100" value="70" style="accent-color: var(--b-primary);" />`,
        reactSnippet: `<Range min={0} max={100} value={range} onChange={setRange} />`,
      },
      {
        id: "daisy-avatar",
        name: "Avatar & Presença (Avatar · avatar)",
        category: "data",
        description: "Foto e símbolo de perfil com moldura arredondada, indicador de status online e agrupamento.",
        tokens: ["color.brand.primary", "color.brand.accent", "borderRadius.avatar"],
        renderPreview: () => (
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <div className="daisy-avatar-frame" style={{ width: 54, height: 54 }}>
              <div style={{ width: "100%", height: "100%", background: brandPrimary, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#101014", fontSize: 20 }}>
                {activeBrand?.name.charAt(0) || "C"}
              </div>
              <div className="daisy-avatar-status-dot" />
            </div>

            <div className="daisy-avatar-frame" style={{ width: 44, height: 44, borderRadius: "50%", borderColor: brandAccent }}>
              <div style={{ width: "100%", height: "100%", background: brandAccent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#101014", fontSize: 16 }}>
                LAB
              </div>
            </div>

            {/* Avatar Group Stack */}
            <div style={{ display: "flex", marginLeft: 8 }}>
              {["#FF701A", "#25BFFF", "#FF3D8D"].map((bg, idx) => (
                <div
                  key={idx}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: bg,
                    border: "2px solid var(--bg-tertiary)",
                    marginLeft: idx > 0 ? -10 : 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#101014",
                  }}
                >
                  {idx + 1}
                </div>
              ))}
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "var(--bg-elevated)",
                  border: "2px solid var(--bg-tertiary)",
                  marginLeft: -10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 800,
                  color: "var(--text-dim)",
                }}
              >
                +12
              </div>
            </div>
          </div>
        ),
        tailwindSnippet: `<!-- DaisyUI Avatar com Indicador Online -->
<div class="avatar online">
  <div class="w-14 rounded-[var(--brand-radius)] ring ring-[var(--brand-primary)] ring-offset-base-100 ring-offset-2">
    <img src="/avatar.png" alt="Avatar" />
  </div>
</div>

<!-- Avatar Group Stack -->
<div class="avatar-group -space-x-3">
  <div class="avatar"><div class="w-8"><img src="/user1.png" /></div></div>
  <div class="avatar"><div class="w-8"><img src="/user2.png" /></div></div>
  <div class="avatar placeholder"><div class="w-8 bg-neutral text-neutral-content"><span>+12</span></div></div>
</div>`,
        htmlSnippet: `<div class="daisy-avatar-frame">
  <img src="/avatar.png" />
  <div class="daisy-avatar-status-dot"></div>
</div>`,
        reactSnippet: `<Avatar src="/logo.svg" online size="md" />
<AvatarGroup max={3} />`,
      },
      {
        id: "daisy-stat",
        name: "Bloco de Métricas (Stat · stats)",
        category: "data",
        description: "Cards de números-chave e métricas com títulos, destaques e descrições na tipografia oficial.",
        tokens: ["color.brand.primary", "typography.displayFamily"],
        renderPreview: () => (
          <div className="daisy-stats-grid" style={{ width: "100%" }}>
            <div className="daisy-stat-item">
              <span className="daisy-stat-title">Design Tokens</span>
              <span className="daisy-stat-value">{brandData?.tokens.length || 14}</span>
              <span className="daisy-stat-desc">DTCG 2025.10 Ativos</span>
            </div>
            <div className="daisy-stat-item">
              <span className="daisy-stat-title">Contraste WCAG</span>
              <span className="daisy-stat-value" style={{ color: brandAccent }}>
                21.0:1
              </span>
              <span className="daisy-stat-desc">Nota Máxima AAA</span>
            </div>
            <div className="daisy-stat-item">
              <span className="daisy-stat-title">Status da Marca</span>
              <span className="daisy-stat-value" style={{ color: "#27C93F", fontSize: 18, textTransform: "capitalize" }}>
                {activeBrand?.status || "Aprovado"}
              </span>
              <span className="daisy-stat-desc">Releases Imutáveis</span>
            </div>
          </div>
        ),
        tailwindSnippet: `<div class="stats bg-[#17171D] border border-white/10 rounded-[var(--brand-radius)] shadow">
  <div class="stat">
    <div class="stat-title text-xs text-white/50">Tokens</div>
    <div class="stat-value text-[var(--brand-primary)] text-2xl font-black">${brandData?.tokens.length || 14}</div>
    <div class="stat-desc text-xs text-white/40">DTCG 2025.10</div>
  </div>
</div>`,
        htmlSnippet: `<div class="daisy-stat-item">
  <div class="daisy-stat-title">Tokens</div>
  <div class="daisy-stat-value">14</div>
</div>`,
        reactSnippet: `<Stat title="Tokens" value={14} desc="DTCG Ativos" />`,
      },
      {
        id: "daisy-tabs",
        name: "Navegador em Abas (Tabs · tabs)",
        category: "navigation",
        description: "Abas estruturadas com indicador ativo deslizante na cor primária da marca.",
        tokens: ["color.brand.primary", "color.text.muted"],
        renderPreview: () => (
          <div style={{ width: "100%" }}>
            <div className="daisy-tabs-container">
              {[
                { id: "visao-geral", label: "Visão Geral" },
                { id: "especificacoes", label: "Especificações" },
                { id: "tokens", label: "Tokens Studio" },
                { id: "diretrizes", label: "Diretrizes" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`daisy-tab-btn ${demoTab === tab.id ? "active" : ""}`}
                  onClick={() => setDemoTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div style={{ padding: "14px 4px", fontSize: 12, color: "var(--text-muted)" }}>
              Exibindo conteúdo de <strong>{demoTab.replace("-", " ").toUpperCase()}</strong> renderizado com a tipografia de {activeBrand?.name}.
            </div>
          </div>
        ),
        tailwindSnippet: `<div class="tabs tabs-bordered">
  <a class="tab tab-active border-b-2 border-[var(--brand-primary)] text-[var(--brand-primary)] font-bold">Visão Geral</a>
  <a class="tab text-white/60">Especificações</a>
  <a class="tab text-white/60">Tokens</a>
</div>`,
        htmlSnippet: `<div class="daisy-tabs-container">
  <button class="daisy-tab-btn active">Visão Geral</button>
  <button class="daisy-tab-btn">Tokens</button>
</div>`,
        reactSnippet: `<Tabs value={activeTab} onChange={setActiveTab}>
  <Tab value="visao-geral">Visão Geral</Tab>
  <Tab value="tokens">Tokens</Tab>
</Tabs>`,
      },
      {
        id: "daisy-collapse",
        name: "Sanfona / Accordion (Collapse · collapse)",
        category: "surfaces",
        description: "Caixa expansível com animação de altura para perguntas frequentes e detalhes de marca.",
        tokens: ["color.surface.canvas", "borderRadius.card"],
        renderPreview: () => (
          <div style={{ width: "100%", maxWidth: 440 }}>
            <div
              className="daisy-card-box"
              style={{ cursor: "pointer", padding: "14px 18px" }}
              onClick={() => setDemoCollapseOpen(!demoCollapseOpen)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 13, color: "var(--text-main)" }}>
                  Como aplicar os tokens do perfil em landing pages?
                </strong>
                <ChevronRight
                  size={16}
                  style={{
                    transform: demoCollapseOpen ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                    color: brandPrimary,
                  }}
                />
              </div>
              {demoCollapseOpen && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10, lineHeight: 1.5, borderTop: "1px solid var(--border-subtle)", paddingTop: 10 }}>
                  Exporte o arquivo <code>tailwind.config.js</code> ou <code>tokens.css</code> gerados pelo Brand Guardian e importe diretamente no seu projeto Vite, Next.js ou HTML padrão.
                </p>
              )}
            </div>
          </div>
        ),
        tailwindSnippet: `<div class="collapse collapse-arrow bg-[#17171D] border border-white/10 rounded-[var(--brand-radius)]">
  <input type="checkbox" />
  <div class="collapse-title text-sm font-bold text-white">Como aplicar os tokens?</div>
  <div class="collapse-content text-xs text-white/70">
    <p>Exporte o arquivo tokens.css gerado pelo Brand Guardian.</p>
  </div>
</div>`,
        htmlSnippet: `<div class="collapse">
  <div class="collapse-title">Título da Pergunta</div>
  <div class="collapse-content">Resposta detalhada...</div>
</div>`,
        reactSnippet: `<Collapse title="Como aplicar os tokens?">
  <p>Exporte o arquivo tokens.css...</p>
</Collapse>`,
      },
      {
        id: "daisy-alert",
        name: "Banner de Alerta (Alert · alert)",
        category: "feedback",
        description: "Notificações de destaque com borda colorida e ícone para feedbacks de sucesso e aviso.",
        tokens: ["color.brand.primary", "color.brand.accent", "borderRadius.alert"],
        renderPreview: () => (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 480 }}>
            <div className="daisy-alert-box">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle size={18} color={brandPrimary} />
                <span>Identidade visual de <strong>{activeBrand?.name}</strong> sincronizada e validada!</span>
              </div>
              <button type="button" className="daisy-btn daisy-btn-primary daisy-btn-xs">
                Ver
              </button>
            </div>
            <div className="daisy-alert-box" style={{ borderLeftColor: brandAccent }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Info size={18} color={brandAccent} />
                <span>Novas variantes de logotipo disponíveis para exportação.</span>
              </div>
              <button type="button" className="daisy-btn daisy-btn-ghost daisy-btn-xs">
                Fechar
              </button>
            </div>
          </div>
        ),
        tailwindSnippet: `<div class="alert bg-[#17171D] border-l-4 border-[var(--brand-primary)] rounded-[var(--brand-radius)] p-4 flex items-center justify-between shadow-lg">
  <div class="flex items-center gap-2">
    <span class="text-sm text-white">Identidade sincronizada com o LAB!</span>
  </div>
  <button class="btn btn-xs bg-[var(--brand-primary)] text-black">Ver</button>
</div>`,
        htmlSnippet: `<div class="daisy-alert-box">
  <span>Identidade sincronizada!</span>
  <button class="daisy-btn daisy-btn-primary daisy-btn-xs">Ver</button>
</div>`,
        reactSnippet: `<Alert variant="primary" icon={<CheckCircle />}>
  Identidade sincronizada!
</Alert>`,
      },
      {
        id: "daisy-progress",
        name: "Barra de Progresso (Progress · progress)",
        category: "feedback",
        description: "Indicadores de progresso lineares com preenchimento em gradiente das cores da marca.",
        tokens: ["color.brand.primary", "color.brand.accent"],
        renderPreview: () => (
          <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Conclusão do Brandbook</span>
                <strong style={{ fontSize: 11, color: brandPrimary }}>85%</strong>
              </div>
              <div className="daisy-progress-track">
                <div className="daisy-progress-fill" style={{ width: "85%" }} />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Homologação de Tokens</span>
                <strong style={{ fontSize: 11, color: brandAccent }}>100%</strong>
              </div>
              <div className="daisy-progress-track">
                <div className="daisy-progress-fill" style={{ width: "100%", background: brandAccent }} />
              </div>
            </div>
          </div>
        ),
        tailwindSnippet: `<progress class="progress progress-primary w-full h-2 bg-white/10 [&::-webkit-progress-value]:bg-[var(--brand-primary)]" value="85" max="100"></progress>`,
        htmlSnippet: `<div class="daisy-progress-track">
  <div class="daisy-progress-fill" style="width: 85%;"></div>
</div>`,
        reactSnippet: `<ProgressBar value={85} max={100} color="primary" />`,
      },
    ];

    // Filtro por categoria e busca
    const filteredComponents = daisyComponents.filter((comp) => {
      const matchCategory = componentCategory === "all" || comp.category === componentCategory;
      const matchSearch =
        componentSearch === "" ||
        comp.name.toLowerCase().includes(componentSearch.toLowerCase()) ||
        comp.description.toLowerCase().includes(componentSearch.toLowerCase());
      return matchCategory && matchSearch;
    });

    return (
      <div className="bg-daisy-stage" style={{ "--preview-font": bodyFont } as any}>
        {/* Cabeçalho do Módulo de Componentes */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Box size={22} color={brandPrimary} />
              <h2 style={{ fontSize: 20, fontWeight: 900, fontFamily: displayFont, margin: 0 }}>
                Biblioteca de Componentes DaisyUI
              </h2>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
              Componentes interativos canônicos (estilo <strong>DaisyUI</strong>) adaptados em tempo real com as cores, tipografia, bordas e identidade de <strong>{activeBrand?.name}</strong>.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="bg-btn bg-btn--outline"
              style={{ fontSize: 12 }}
              onClick={copyDaisyUiThemeConfig}
            >
              <Code2 size={13} /> Exportar Tema DaisyUI
            </button>
            <button
              type="button"
              className="bg-btn bg-btn--ghost"
              style={{ fontSize: 12 }}
              onClick={copyCssVariablesKit}
            >
              <Copy size={13} /> CSS Variables
            </button>
          </div>
        </div>

        {/* HERO: Identidade do Perfil em Ação (DaisyUI Profile Showcase) */}
        <div className="profile-hero-card">
          <div className="profile-hero-banner">
            <span className="daisy-badge daisy-badge-primary" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
              Identidade Ativa
            </span>
          </div>

          <div className="profile-hero-content">
            <div className="profile-hero-top">
              <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
                <div className="profile-avatar-wrapper">
                  {activeBrand?.logo_url ? (
                    <img src={activeBrand.logo_url} alt={activeBrand.name} className="profile-avatar-img" />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: brandPrimary, color: "#101014", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 900 }}>
                      {activeBrand?.name.charAt(0) || "C"}
                    </div>
                  )}
                  <div className="profile-status-indicator" />
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 900, fontFamily: displayFont, margin: 0, color: "var(--text-main)" }}>
                      {activeBrand?.name}
                    </h3>
                    <span className="daisy-badge daisy-badge-accent">
                      <Check size={10} /> Oficial
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
                    @{activeBrand?.slug} · {brandData?.foundations.tradeName}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button type="button" className="daisy-btn daisy-btn-primary daisy-btn-sm">
                  <UserCheck size={14} /> Seguir Identidade
                </button>
                <button
                  type="button"
                  className="daisy-btn daisy-btn-outline daisy-btn-sm"
                  onClick={() => {
                    setActiveSection("brandbook");
                  }}
                >
                  <BookOpen size={14} /> Ver Brandbook
                </button>
                <button
                  type="button"
                  className="daisy-btn daisy-btn-ghost daisy-btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    showToast("Link do perfil copiado!", "success");
                  }}
                >
                  <Share2 size={14} />
                </button>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.6, maxWidth: 680 }}>
              {brandData?.foundations.positioning || "Posicionamento autoral e sistema de design unificado do LAB Caramelo."}
            </p>

            {/* Quick Metrics Bar in DaisyUI Style */}
            <div className="daisy-stats-grid" style={{ marginTop: 4 }}>
              <div className="daisy-stat-item">
                <span className="daisy-stat-title">Design Tokens</span>
                <span className="daisy-stat-value">{brandData?.tokens.length || 14}</span>
                <span className="daisy-stat-desc">W3C DTCG 2025.10</span>
              </div>
              <div className="daisy-stat-item">
                <span className="daisy-stat-title">Paleta de Cores</span>
                <span className="daisy-stat-value" style={{ color: brandAccent }}>
                  {brandData?.colors.length || 7} Cores
                </span>
                <span className="daisy-stat-desc">Escalas 50-900</span>
              </div>
              <div className="daisy-stat-item">
                <span className="daisy-stat-title">Tipografia Mestre</span>
                <span className="daisy-stat-value" style={{ fontSize: 16, color: "var(--text-main)" }}>
                  {displayFont}
                </span>
                <span className="daisy-stat-desc">Voz de Cartaz</span>
              </div>
              <div className="daisy-stat-item">
                <span className="daisy-stat-title">Acessibilidade</span>
                <span className="daisy-stat-value" style={{ color: "#27C93F", fontSize: 18 }}>
                  WCAG AAA
                </span>
                <span className="daisy-stat-desc">Contraste Aprovado</span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Pesquisa */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { id: "all", label: "Todos os Componentes" },
              { id: "actions", label: "Ações (Botões)" },
              { id: "inputs", label: "Entradas & Toggles" },
              { id: "data", label: "Exibição & Dados" },
              { id: "navigation", label: "Navegação" },
              { id: "feedback", label: "Feedback & Alertas" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`bg-btn ${componentCategory === cat.id ? "bg-btn--primary" : "bg-btn--ghost"}`}
                style={{ fontSize: 12, padding: "6px 12px" }}
                onClick={() => setComponentCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div style={{ position: "relative", minWidth: 220 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--text-dim)" }} />
            <input
              type="text"
              placeholder="Buscar componente..."
              value={componentSearch}
              onChange={(e) => setComponentSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 30px",
                fontSize: 12,
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 6,
                color: "var(--text-main)",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Catálogo de Componentes DaisyUI */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {filteredComponents.map((comp) => {
            const currentTab = activeCodeTab[comp.id] || "tailwind";
            const currentCode =
              currentTab === "tailwind"
                ? comp.tailwindSnippet
                : currentTab === "html"
                ? comp.htmlSnippet
                : comp.reactSnippet;

            return (
              <div key={comp.id} className="daisy-component-card">
                <div className="daisy-component-header">
                  <div>
                    <strong style={{ fontSize: 14, color: "var(--text-main)" }}>{comp.name}</strong>
                    <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                      <span style={{ fontSize: 10, textTransform: "uppercase", background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 4, color: "var(--text-dim)" }}>
                        {comp.category}
                      </span>
                      {comp.tokens.map((t, idx) => (
                        <span key={idx} style={{ fontSize: 10, color: brandPrimary, fontFamily: "monospace" }}>
                          • {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <span style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 300, textAlign: "right", display: "none" }}>
                    {comp.description}
                  </span>
                </div>

                <div className="daisy-component-body">
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{comp.description}</p>

                  {/* Live Interactive Preview Stage */}
                  <div className="daisy-component-preview">
                    {comp.renderPreview()}
                  </div>

                  {/* Code Viewer & Tabs */}
                  <div className="daisy-code-viewer">
                    <div className="daisy-code-tabs" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingRight: 8 }}>
                      <div style={{ display: "flex" }}>
                        <button
                          type="button"
                          className={`daisy-code-tab ${currentTab === "tailwind" ? "active" : ""}`}
                          onClick={() => setActiveCodeTab({ ...activeCodeTab, [comp.id]: "tailwind" })}
                        >
                          Tailwind / DaisyUI
                        </button>
                        <button
                          type="button"
                          className={`daisy-code-tab ${currentTab === "html" ? "active" : ""}`}
                          onClick={() => setActiveCodeTab({ ...activeCodeTab, [comp.id]: "html" })}
                        >
                          HTML + CSS
                        </button>
                        <button
                          type="button"
                          className={`daisy-code-tab ${currentTab === "react" ? "active" : ""}`}
                          onClick={() => setActiveCodeTab({ ...activeCodeTab, [comp.id]: "react" })}
                        >
                          React JSX
                        </button>
                      </div>

                      <button
                        type="button"
                        className="bg-btn bg-btn--ghost"
                        style={{ fontSize: 10, padding: "2px 8px", height: 24 }}
                        onClick={() => copySnippet(currentCode, comp.name)}
                      >
                        <Copy size={11} /> Copiar
                      </button>
                    </div>

                    <pre className="daisy-code-pre">
                      <code>{currentCode}</code>
                    </pre>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderAssetsSection() {
    return (
      <div className="bg-card">
        <div className="bg-card__header">
          <div className="bg-card__title">
            <FolderKanban size={18} color="#FF701A" />
            Biblioteca de Ativos da Marca (Brand Assets)
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select
              value={selectedAssetKind}
              onChange={(e) => setSelectedAssetKind(e.target.value as any)}
              style={{ padding: "6px 10px", fontSize: 12, background: "var(--bg-tertiary)", color: "var(--text-main)", border: "1px solid var(--border-subtle)", borderRadius: 6 }}
            >
              <option value="logo">Logotipo</option>
              <option value="image">Imagem</option>
              <option value="vector">Vetor / Ilustração</option>
              <option value="font">Fonte</option>
              <option value="pdf">Documento PDF</option>
              <option value="icon">Ícone</option>
            </select>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAssetFileUpload}
              style={{ display: "none" }}
            />
            <button
              className="bg-btn bg-btn--primary"
              disabled={isUploadingAsset}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} /> {isUploadingAsset ? "Enviando..." : "Enviar Ativo"}
            </button>
          </div>
        </div>

        <div className="bg-grid-3">
          {brandData!.assets.map((ast) => (
            <div key={ast.id} className="bg-card" style={{ background: "var(--bg-tertiary)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                {ast.url && (ast.kind === "logo" || ast.kind === "image" || ast.kind === "vector") && (
                  <div style={{ height: 100, background: "var(--bg-secondary)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, overflow: "hidden" }}>
                    <img src={ast.url} alt={ast.name} style={{ maxHeight: "80%", maxWidth: "80%", objectFit: "contain" }} onError={(e) => (e.currentTarget.style.display = "none")} />
                  </div>
                )}
                <div style={{ fontWeight: 700, fontSize: 13, wordBreak: "break-all" }}>{ast.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", margin: "4px 0" }}>{ast.mimeType || ast.kind} · {(ast.fileSize / 1024).toFixed(1)} KB</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  <span style={{ fontSize: 10, background: "rgba(37, 191, 255, 0.2)", color: "#25BFFF", padding: "2px 6px", borderRadius: 4 }}>
                    {ast.approvalStatus}
                  </span>
                  <span style={{ fontSize: 10, background: "var(--bg-secondary)", color: "var(--text-dim)", padding: "2px 6px", borderRadius: 4 }}>
                    {ast.kind}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button
                  className="bg-btn bg-btn--ghost"
                  style={{ fontSize: 11, padding: "4px 8px", flex: 1 }}
                  onClick={() => {
                    navigator.clipboard.writeText(ast.url);
                    showToast("URL copiada!", "success");
                  }}
                >
                  <Copy size={12} /> Copiar URL
                </button>
                {ast.url && (
                  <a
                    href={ast.url}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-btn bg-btn--ghost"
                    style={{ fontSize: 11, padding: "4px 8px" }}
                  >
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderApplicationsSection() {
    return (
      <div className="bg-card">
        <div className="bg-card__header">
          <div className="bg-card__title">
            <BookOpen size={18} color="#FF701A" />
            Aplicações em Contextos Reais
          </div>
        </div>

        <div className="bg-grid-2">
          {brandData!.applications.map((app) => (
            <div key={app.id} className="bg-card" style={{ background: "var(--bg-tertiary)" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{app.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase" }}>{app.category}</div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>{app.notes}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderBrandbookSection() {
    return (
      <div className="bg-card" style={{ background: "var(--bg-secondary)" }}>
        <div className="bg-card__header" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: 16 }}>
          <div>
            <div className="bg-card__title" style={{ fontSize: 18 }}>
              <FileText size={20} color="#FF701A" />
              Brandbook Oficial — 18 Seções Canônicas
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              Manual Vivo de Identidade e Design System de {activeBrand?.name}
            </div>
          </div>
          <button
            className="bg-btn bg-btn--primary"
            onClick={() => {
              window.print();
            }}
          >
            <Download size={14} /> Imprimir / Exportar Brandbook PDF
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 32, marginTop: 24 }}>
          {/* Seção 01: Apresentação da Marca */}
          <div className="bg-card" style={{ background: "var(--bg-tertiary)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#FF701A" }}>01. Apresentação da Marca & Propósito</h3>
            <p style={{ fontSize: 13, color: "var(--text-main)", marginTop: 8 }}>
              {brandData!.foundations.tradeName} — {brandData!.foundations.slogan}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.6 }}>
              {brandData!.foundations.valueProposition || brandData!.foundations.positioning}
            </p>
          </div>

          {/* Seção 02: Conceito e Posicionamento */}
          <div className="bg-card" style={{ background: "var(--bg-tertiary)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#FF701A" }}>02. Conceito e Posicionamento Estratégico</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.6 }}>
              {brandData!.foundations.positioning}
            </p>
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-dim)" }}>
              <strong>Personas & Público:</strong> {brandData!.foundations.personas}
            </div>
          </div>

          {/* Seção 03: Personalidade e Tom de Voz */}
          <div className="bg-card" style={{ background: "var(--bg-tertiary)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#FF701A" }}>03. Personalidade e Tom de Voz</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.6 }}>
              {brandData!.foundations.toneOfVoice}
            </p>
            {brandData!.foundations.wordsToAvoid && brandData!.foundations.wordsToAvoid.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <span style={{ fontSize: 11, color: "#FF3D8D", fontWeight: 700 }}>Termos a Evitar (Anti-Clichê): </span>
                {brandData!.foundations.wordsToAvoid.map((w, idx) => (
                  <span key={idx} style={{ fontSize: 11, background: "rgba(255, 61, 141, 0.15)", color: "#FF3D8D", padding: "2px 6px", borderRadius: 4, marginRight: 6 }}>
                    {w}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Seção 04: Logotipos e Variantes */}
          <div className="bg-card" style={{ background: "var(--bg-tertiary)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#FF701A" }}>04. Logotipos e Variantes Oficiais</h3>
            <div className="bg-grid-2" style={{ marginTop: 12 }}>
              {brandData!.logos.map((logo) => (
                <div key={logo.id} style={{ background: "var(--bg-secondary)", padding: 12, borderRadius: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{logo.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", margin: "4px 0" }}>Tamanho mín: {logo.minSizePx}px · Zona de proteção: {Math.round(logo.safeZoneRatio * 100)}%</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{logo.notes}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Seção 05 & 06: Área de Proteção e Regras de Uso */}
          <div className="bg-card" style={{ background: "var(--bg-tertiary)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#FF701A" }}>05 & 06. Área de Proteção, Escala e Regras de Uso</h3>
            <div className="bg-grid-2" style={{ marginTop: 12 }}>
              <div>
                <strong style={{ fontSize: 12, color: "#25BFFF" }}>✓ Diretrizes Recomendadas (DO):</strong>
                <ul style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, paddingLeft: 18 }}>
                  {brandData!.logos[0]?.doRules?.map((r, i) => <li key={i}>{r}</li>) || <li>Manter contraste com o fundo</li>}
                </ul>
              </div>
              <div>
                <strong style={{ fontSize: 12, color: "#FF3D8D" }}>✕ Proibições Estritas (DON'T):</strong>
                <ul style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, paddingLeft: 18 }}>
                  {brandData!.logos[0]?.dontRules?.map((r, i) => <li key={i}>{r}</li>) || <li>Não distorcer proporções</li>}
                </ul>
              </div>
            </div>
          </div>

          {/* Seção 07: Paleta de Cores */}
          <div className="bg-card" style={{ background: "var(--bg-tertiary)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#FF701A" }}>07. Paleta Cromática Oficial</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginTop: 12 }}>
              {brandData!.colors.map((c) => (
                <div key={c.id} style={{ background: "var(--bg-secondary)", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ height: 60, background: c.hex }} />
                  <div style={{ padding: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{c.name}</div>
                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "#FF701A" }}>{c.hex}</div>
                    <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 4 }}>Papel: {c.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seção 08: Tipografia */}
          <div className="bg-card" style={{ background: "var(--bg-tertiary)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#FF701A" }}>08. Sistema Tipográfico Oficial</h3>
            <div className="bg-grid-2" style={{ marginTop: 12 }}>
              <div style={{ background: "var(--bg-secondary)", padding: 12, borderRadius: 6 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-dim)" }}>Display / Títulos</div>
                <div style={{ fontSize: 18, fontWeight: 900, fontFamily: brandData!.typography.families.find(f => f.category === "display")?.familyName || "Syne", marginTop: 6 }}>
                  {brandData!.typography.families.find(f => f.category === "display")?.familyName || "Syne"}
                </div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Voz de cartaz, impacto e autoridade.</p>
              </div>
              <div style={{ background: "var(--bg-secondary)", padding: 12, borderRadius: 6 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-dim)" }}>Corpo de Texto (Sans)</div>
                <div style={{ fontSize: 15, fontFamily: brandData!.typography.families.find(f => f.category === "sans-serif")?.familyName || "Plus Jakarta Sans", marginTop: 6 }}>
                  {brandData!.typography.families.find(f => f.category === "sans-serif")?.familyName || "Plus Jakarta Sans"}
                </div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Leitura fluida, ergonomia e interface.</p>
              </div>
            </div>
          </div>

          {/* Seção 09 a 14: Elementos, Fotografia, Ilustração & Motion */}
          <div className="bg-card" style={{ background: "var(--bg-tertiary)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#FF701A" }}>09 a 14. Elementos Visuais, Direção de Arte e Motion</h3>
            <div className="bg-grid-2" style={{ marginTop: 12 }}>
              <div>
                <strong style={{ fontSize: 12 }}>Direção Fotográfica & Iluminação:</strong>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
                  {brandData!.references?.find(r => r.category === "photography")?.notes || "Luz de recorte quente dourada combinada a ambiente frio/cianeto."}
                </p>
              </div>
              <div>
                <strong style={{ fontSize: 12 }}>Linguagem de Movimento (Motion):</strong>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
                  Stillness = Camadas alinhadas. Movement = Camadas se separam. Duração canônica de 240ms a 380ms.
                </p>
              </div>
            </div>
          </div>

          {/* Seção 15: Aplicações */}
          <div className="bg-card" style={{ background: "var(--bg-tertiary)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#FF701A" }}>15. Aplicações Homologadas</h3>
            <div className="bg-grid-2" style={{ marginTop: 12 }}>
              {brandData!.applications.map((app) => (
                <div key={app.id} style={{ background: "var(--bg-secondary)", padding: 10, borderRadius: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{app.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{app.notes}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Seção 16 & 17: Acessibilidade WCAG & Design Tokens */}
          <div className="bg-card" style={{ background: "var(--bg-tertiary)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#FF701A" }}>16 & 17. Acessibilidade WCAG 2.2 e Design Tokens DTCG</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
              Total de {brandData!.tokens.length} tokens registrados sob o padrão W3C Design Tokens Community Group (DTCG 2025.10).
              Todas as decisões de texto primário atendem ao critério de contraste mínimo WCAG 2.2 AA (4.5:1).
            </p>
          </div>

          {/* Seção 18: Downloads e Recursos */}
          <div className="bg-card" style={{ background: "var(--bg-tertiary)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#FF701A" }}>18. Downloads & Pacotes de Exportação</h3>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <button
                className="bg-btn bg-btn--outline"
                onClick={() => {
                  const blob = new Blob([exportToDtcgJson(brandData!.tokens)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${activeBrand?.slug || "brand"}-tokens.json`;
                  a.click();
                  showToast("DTCG Tokens baixados!", "success");
                }}
              >
                <Download size={12} /> DTCG Tokens JSON
              </button>
              <button
                className="bg-btn bg-btn--outline"
                onClick={() => {
                  const blob = new Blob([exportToCssCustomProperties(brandData!.tokens)], { type: "text/css" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${activeBrand?.slug || "brand"}-tokens.css`;
                  a.click();
                  showToast("CSS Custom Properties baixadas!", "success");
                }}
              >
                <Download size={12} /> Variáveis CSS
              </button>
              <button
                className="bg-btn bg-btn--outline"
                onClick={() => {
                  const blob = new Blob([exportToTailwindConfig(brandData!.tokens)], { type: "text/javascript" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `tailwind.${activeBrand?.slug || "brand"}.js`;
                  a.click();
                  showToast("Tailwind Config baixado!", "success");
                }}
              >
                <Download size={12} /> Tailwind Config
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderValidatorSection() {
    return (
      <div className="bg-card">
        <div className="bg-card__header">
          <div className="bg-card__title">
            <CheckCircle size={18} color="#FF701A" />
            Brand Guard — Validador de Consistência
          </div>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: errorCount === 0 ? "#25BFFF" : "#FF3D8D" }}>
              {findings.length} apontamentos ({errorCount} erros, {warningCount} avisos)
            </span>
          </div>
        </div>

        {findings.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#25BFFF" }}>
            <CheckCircle size={40} style={{ margin: "0 auto 12px" }} />
            <div style={{ fontWeight: 800, fontSize: 16 }}>Nenhuma Inconsistência Detectada!</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              Todas as cores, contrastes WCAG 2.2, tokens e variantes atendem às diretrizes da marca.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {findings.map((f) => (
              <div
                key={f.id}
                style={{
                  background: "var(--bg-tertiary)",
                  borderLeft: `4px solid ${f.severity === "error" ? "#FF3D8D" : f.severity === "warning" ? "#FFD52A" : "#25BFFF"}`,
                  padding: 14,
                  borderRadius: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: 13 }}>{f.ruleTitle}</strong>
                  <span style={{ fontSize: 10, textTransform: "uppercase", background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 4 }}>
                    {f.module}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "6px 0" }}>{f.description}</p>
                <div style={{ fontSize: 11, color: "#25BFFF" }}>💡 Sugestão: {f.suggestedFix}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderIntegrationsSection() {
    return (
      <div className="bg-card">
        <div className="bg-card__header">
          <div className="bg-card__title">
            <ExternalLink size={18} color="#FF701A" />
            Brand Context Engine — Integração com o LAB
          </div>
        </div>

        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
          O Brand Guardian expõe contratos canônicos para que a <strong>Prancheta</strong>, a <strong>Biblioteca de Prompts</strong>,
          o <strong>Gabinete (CRM)</strong> e as ferramentas de automação consumam as decisões desta marca sem duplicação de dados.
        </p>

        <div style={{ background: "var(--bg-tertiary)", padding: 16, borderRadius: 8, marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Exemplo de Consumo pelo Banco de Prompts / IA:</div>
          <pre style={{ fontSize: 11, fontFamily: "monospace", color: "#FFF4E8", overflowX: "auto" }}>
{`// Contexto Injetado no Prompt Creator
{
  "brand": "${activeBrand?.name}",
  "slogan": "${brandData!.foundations.slogan}",
  "colors": {
    "primary": "${activeBrand?.primary_color}",
    "accent": "${activeBrand?.accent_color}"
  },
  "tone": "${brandData!.foundations.toneOfVoice}",
  "wordsToAvoid": ${JSON.stringify(brandData!.foundations.wordsToAvoid)}
}`}
          </pre>
        </div>
      </div>
    );
  }

  function renderGovernanceSection() {
    return (
      <div className="bg-card">
        <div className="bg-card__header">
          <div className="bg-card__title">
            <History size={18} color="#FF701A" />
            Histórico & Snapshots de Versão
          </div>
          <button
            className="bg-btn bg-btn--primary"
            onClick={async () => {
              const version = prompt("Informe o número da versão (ex: 1.1.0):", "1.1.0");
              if (version) {
                const notes = prompt("Notas da versão:", "Atualização de tokens e paletas.");
                await brandGuardianRepo.publishRelease(selectedBrandId, version, notes || "", brandData!);
                showToast(`Versão ${version} publicada com sucesso!`, "success");
              }
            }}
          >
            Publicar Nova Versão
          </button>
        </div>

        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Cada publicação gera um snapshot imutável para que projetos em produção mantenham estabilidade visual.
        </p>
      </div>
    );
  }

  function renderSettingsSection() {
    return (
      <div className="bg-card">
        <div className="bg-card__header">
          <div className="bg-card__title">
            <Settings size={18} color="#FF701A" />
            Configurações da Marca
          </div>
        </div>

        <div className="bg-grid-2">
          <div className="bg-input-field">
            <label>Identificador (Slug)</label>
            <input type="text" value={activeBrand?.slug || ""} disabled />
          </div>

          <div className="bg-input-field">
            <label>Tipo de Marca</label>
            <select
              value={activeBrand?.kind || "client"}
              onChange={(e) => {
                const updated = brands.map((b) => (b.id === selectedBrandId ? { ...b, kind: e.target.value as any } : b));
                setBrands(updated);
              }}
            >
              <option value="agency">Agência / Estúdio Próprio</option>
              <option value="client">Marca de Cliente (CRM)</option>
              <option value="personal">Projeto Pessoal / Autoral</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  function renderNewBrandModal() {
    return (
      <div className="bg-modal-backdrop" onClick={() => setIsNewBrandModalOpen(false)}>
        <div className="bg-modal" onClick={(e) => e.stopPropagation()}>
          <div className="bg-modal__header">
            <strong style={{ fontSize: 16 }}>Criar Nova Marca no LAB</strong>
            <button className="bg-btn bg-btn--ghost" onClick={() => setIsNewBrandModalOpen(false)}>✕</button>
          </div>
          <form onSubmit={handleCreateBrandSubmit}>
            <div className="bg-modal__body">
              <div className="bg-input-field">
                <label>Nome da Marca</label>
                <input
                  type="text"
                  placeholder="Ex: Studio Alvorada ou Marca Cliente"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="bg-input-field">
                <label>Categoria</label>
                <select value={newBrandKind} onChange={(e) => setNewBrandKind(e.target.value as any)}>
                  <option value="client">Marca de Cliente (CRM)</option>
                  <option value="agency">Agência / Estúdio</option>
                  <option value="personal">Projeto Autoral</option>
                </select>
              </div>

              <div className="bg-input-field">
                <label>Cor Principal Inicial</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    type="color"
                    value={newBrandColor}
                    onChange={(e) => setNewBrandColor(e.target.value)}
                    style={{ width: 44, height: 40, border: "none", cursor: "pointer" }}
                  />
                  <input
                    type="text"
                    value={newBrandColor}
                    onChange={(e) => setNewBrandColor(e.target.value)}
                    style={{ flex: 1, fontFamily: "monospace" }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-modal__footer">
              <button type="button" className="bg-btn bg-btn--ghost" onClick={() => setIsNewBrandModalOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="bg-btn bg-btn--primary">
                Criar Marca
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderSectionTitle(section: NavSection) {
    switch (section) {
      case "overview": return "Visão Geral da Identidade";
      case "foundations": return "Fundamentos da Marca";
      case "logos": return "Logotipos & Área de Proteção";
      case "colors": return "Color Lab & Harmonias";
      case "typography": return "Sistema Tipográfico";
      case "elements": return "Elementos Visuais & Geometria";
      case "art_direction": return "Direção de Arte & Imagens";
      case "motion": return "Motion & Expressão Digital";
      case "design_tokens": return "Design Tokens (DTCG 2025.10)";
      case "components": return "Biblioteca de Componentes";
      case "assets": return "Biblioteca de Ativos";
      case "applications": return "Aplicações da Marca";
      case "brandbook": return "Brandbook Dinâmico";
      case "validator": return "Brand Guard (Validador)";
      case "integrations": return "Brand Context Engine (LAB)";
      case "governance": return "Governança & Versões";
      case "settings": return "Configurações da Marca";
    }
  }

  function renderSectionSubtitle(_section: NavSection, brandName?: string) {
    return `${brandName || "Marca"} · Gestão Oficial de Identidade Visual`;
  }
}
