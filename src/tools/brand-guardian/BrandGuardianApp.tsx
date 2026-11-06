// ==============================================================================
// Brand Guardian — Plataforma de Identidade Visual e Design System (LAB Caramelo)
// Aplicação Principal Integrada com 17 Módulos de Identidade e Governança
// ==============================================================================

import { useState, useEffect, useMemo } from "react";
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
    return (
      <div className="bg-card">
        <div className="bg-card__header">
          <div className="bg-card__title">
            <Box size={18} color="#FF701A" />
            Especificação de Componentes
          </div>
        </div>

        <div className="bg-grid-2">
          {brandData!.components.map((comp) => (
            <div key={comp.id} className="bg-card" style={{ background: "var(--bg-tertiary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>{comp.name}</strong>
                <span style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-dim)" }}>{comp.category}</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "8px 0" }}>{comp.description}</p>
              <div style={{ background: "var(--bg-primary)", padding: 10, borderRadius: 6, fontFamily: "monospace", fontSize: 11, color: "#FF701A" }}>
                {comp.codeSnippet}
              </div>
            </div>
          ))}
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
        </div>

        <div className="bg-grid-3">
          {brandData!.assets.map((ast) => (
            <div key={ast.id} className="bg-card" style={{ background: "var(--bg-tertiary)" }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{ast.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", margin: "4px 0" }}>{ast.mimeType} · {(ast.fileSize / 1024).toFixed(1)} KB</div>
              <div style={{ marginTop: 10 }}>
                <span style={{ fontSize: 10, background: "rgba(37, 191, 255, 0.2)", color: "#25BFFF", padding: "2px 6px", borderRadius: 4 }}>
                  {ast.approvalStatus}
                </span>
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
      <div className="bg-card">
        <div className="bg-card__header">
          <div className="bg-card__title">
            <FileText size={18} color="#FF701A" />
            Brandbook Dinâmico Navegável
          </div>
          <button
            className="bg-btn bg-btn--ghost"
            onClick={() => {
              window.print();
            }}
          >
            <Download size={14} /> Imprimir / Exportar PDF
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {brandData!.brandbookSections.map((sec) => (
            <div key={sec.id} style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#FF701A" }}>{sec.title}</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{sec.content}</p>
            </div>
          ))}
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
