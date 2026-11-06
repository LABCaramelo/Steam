// ==============================================================================
// Brand Guardian — Component Studio Workspace
// Editor de Componentes DaisyUI com Identidade Dinâmica e Exportação Versionada
// ==============================================================================

import { useState, useMemo } from "react";
import {
  Box,
  Monitor,
  Tablet,
  Smartphone,
  Sun,
  Moon,
  Copy,
  Download,
  Code2,
  Package,
  CheckCircle2,
  Info,
  ChevronRight,
  Search,
  Sparkles,
  Check,
  SlidersHorizontal,
  X,
} from "lucide-react";

import type { Brand, CompleteBrandData, DesignToken } from "./types";
import {
  CANONICAL_DAISY_COMPONENTS,
  type ComponentProps,
  type ComponentVariant,
  type ComponentSize,
  type ComponentState,
  exportDaisyUi5ThemeCss,
  exportDaisyUi4TailwindConfig,
  exportComponentPackageJson,
  exportComponentDocsMarkdown,
  generateDaisyUi5Snippet,
  generateReactJsxSnippet,
} from "./componentStudioEngine";
import { evaluateContrast } from "./colorEngine";
import { exportToDtcgJson } from "./tokenEngine";
import { useToast } from "../shared/kit";

interface ComponentStudioProps {
  brand: Brand;
  brandData: CompleteBrandData;
  tokens: DesignToken[];
}

export function ComponentStudio({ brand, brandData, tokens }: ComponentStudioProps) {
  const showToast = useToast();

  const brandPrimary = brand.primary_color || "#FF701A";
  const brandAccent = brand.accent_color || "#25BFFF";
  const brandText = brandData.colors.find((c) => c.role === "text_primary")?.hex || "#FFF4E8";
  const brandSurface = brandData.colors.find((c) => c.role === "surface")?.hex || "#17171D";
  const brandRadius = brandData.visualElements?.geometry?.radiusScale?.md
    ? `${brandData.visualElements.geometry.radiusScale.md}px`
    : "10px";
  const displayFont = brandData.typography.families.find((f) => f.role === "primary_display")?.familyName || "inherit";
  const bodyFont = brandData.typography.families.find((f) => f.role === "body_ui")?.familyName || "inherit";

  // Studio State
  const [selectedCompId, setSelectedCompId] = useState<string>("btn");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [activeCodeFormat, setActiveCodeFormat] = useState<"daisyui5" | "daisyui4" | "react" | "html">("daisyui5");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Props Map per component
  const [propsMap, setPropsMap] = useState<Record<string, ComponentProps>>(() => {
    const init: Record<string, ComponentProps> = {};
    for (const c of CANONICAL_DAISY_COMPONENTS) {
      init[c.id] = { ...c.defaultProps };
    }
    return init;
  });

  const activeComp = useMemo(
    () => CANONICAL_DAISY_COMPONENTS.find((c) => c.id === selectedCompId) || CANONICAL_DAISY_COMPONENTS[0],
    [selectedCompId]
  );

  const activeProps = propsMap[activeComp.id] || activeComp.defaultProps;

  const updateProp = <K extends keyof ComponentProps>(key: K, value: ComponentProps[K]) => {
    setPropsMap((prev) => ({
      ...prev,
      [activeComp.id]: {
        ...(prev[activeComp.id] || activeComp.defaultProps),
        [key]: value,
      },
    }));
  };

  // Filtered components list
  const filteredComponents = useMemo(() => {
    return CANONICAL_DAISY_COMPONENTS.filter((c) => {
      const matchCat = categoryFilter === "all" || c.category === categoryFilter;
      const matchSearch =
        searchQuery === "" ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.daisyTag.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [categoryFilter, searchQuery]);

  // Live Contrast Ratio calculation for active component
  const contrastAssessment = useMemo(() => {
    const bg = themeMode === "dark" ? brandSurface : "#FFFFFF";
    const fg = activeProps.variant === "primary" ? brandPrimary : brandAccent;
    const ratio = evaluateContrast(fg, bg).ratio;
    const isPassingAA = ratio >= 4.5;
    return { ratio, isPassingAA };
  }, [themeMode, activeProps.variant, brandPrimary, brandAccent, brandSurface]);

  // Snippets
  const generatedCode = useMemo(() => {
    if (activeCodeFormat === "daisyui5") {
      return generateDaisyUi5Snippet(activeComp, activeProps, brand);
    }
    if (activeCodeFormat === "react") {
      return generateReactJsxSnippet(activeComp, activeProps, brand);
    }
    if (activeCodeFormat === "daisyui4") {
      return exportDaisyUi4TailwindConfig(brand, brandData);
    }
    // HTML + CSS variables
    return `<!-- Componente ${activeComp.name} com Variáveis de ${brand.name} -->\n<div class="${activeComp.daisyTag} ${activeComp.daisyTag}-${activeProps.variant}" style="--b-primary: ${brandPrimary}; --b-radius: ${brandRadius};">\n  <span>${activeProps.label}</span>\n</div>`;
  }, [activeCodeFormat, activeComp, activeProps, brand, brandData, brandPrimary, brandRadius]);

  const copyToClipboard = (text: string, msg: string) => {
    navigator.clipboard.writeText(text);
    showToast(msg, "success");
  };

  // Render Component Preview on the stage
  const renderStagePreview = () => {
    const v = activeProps.variant;
    const s = activeProps.size;
    const state = activeProps.state;

    switch (activeComp.id) {
      case "btn":
        return (
          <button
            type="button"
            className={`btn btn-${v} btn-${s} ${state === "disabled" ? "btn-disabled" : ""}`}
            style={{
              fontFamily: bodyFont,
              borderRadius: brandRadius,
            }}
          >
            {state === "loading" && <span className="loading" style={{ width: 14, height: 14 }} />}
            {activeProps.hasIcon && <Sparkles size={14} />}
            {activeProps.label}
          </button>
        );

      case "badge":
        return (
          <span className={`badge badge-${v} ${activeProps.outline ? "badge-outline" : ""}`}>
            {activeProps.hasIcon && <Check size={10} />}
            {activeProps.label}
          </span>
        );

      case "modal":
        return (
          <div className="modal-box">
            <h4 style={{ fontSize: 16, fontWeight: 800, color: brandPrimary, margin: 0, fontFamily: displayFont }}>
              {activeProps.label}
            </h4>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "10px 0 16px", lineHeight: 1.5 }}>
              {activeProps.sublabel || "Ações homologadas e integradas ao Design System oficial."}
            </p>
            <div className="modal-action">
              <button type="button" className="btn btn-ghost btn-sm">Cancelar</button>
              <button type="button" className="btn btn-primary btn-sm">Confirmar</button>
            </div>
          </div>
        );

      case "drawer":
        return (
          <div style={{ width: "100%", maxWidth: 360, background: "var(--bg-tertiary)", borderRadius: brandRadius, padding: 16, border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: 10 }}>
              <strong style={{ fontSize: 13, color: brandPrimary }}>{activeProps.label}</strong>
              <span className="badge badge-primary">Drawer Aberto</span>
            </div>
            <ul style={{ listStyle: "none", padding: "10px 0 0", margin: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
              <li style={{ padding: "6px 8px", background: "var(--bg-elevated)", borderRadius: 6, color: brandPrimary, fontWeight: 700 }}>
                • Visão Geral da Identidade
              </li>
              <li style={{ padding: "6px 8px", color: "var(--text-muted)" }}>• Catálogo de Tokens</li>
              <li style={{ padding: "6px 8px", color: "var(--text-muted)" }}>• Brandbook Oficial</li>
            </ul>
          </div>
        );

      case "dropdown":
        return (
          <div style={{ position: "relative", display: "inline-block" }}>
            <button type="button" className="btn btn-outline btn-sm">
              {activeProps.label} ▾
            </button>
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: 6,
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: brandRadius,
                padding: 6,
                minWidth: 160,
                boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                zIndex: 20,
              }}
            >
              <div style={{ padding: "6px 10px", fontSize: 12, borderRadius: 4, cursor: "pointer", color: "var(--text-main)" }}>
                Exportar Tokens
              </div>
              <div style={{ padding: "6px 10px", fontSize: 12, borderRadius: 4, cursor: "pointer", color: "var(--text-main)" }}>
                Ver Diretrizes
              </div>
              <div style={{ padding: "6px 10px", fontSize: 12, borderRadius: 4, cursor: "pointer", color: "#FF3D8D" }}>
                Arquivar Release
              </div>
            </div>
          </div>
        );

      case "tooltip":
        return (
          <div className="tooltip" data-tip={activeProps.label}>
            <button type="button" className="btn btn-outline btn-sm">
              <Info size={14} /> Passe o cursor aqui
            </button>
          </div>
        );

      case "table":
        return (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table className={`table ${activeProps.striped ? "table-zebra" : ""}`}>
              <thead>
                <tr style={{ color: brandPrimary }}>
                  <th>#</th>
                  <th>Token</th>
                  <th>Tier</th>
                  <th>Valor Homologado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td><code>color.brand.primary</code></td>
                  <td><span className="badge badge-accent">semantic</span></td>
                  <td><strong style={{ color: brandPrimary }}>{brandPrimary}</strong></td>
                </tr>
                <tr>
                  <td>2</td>
                  <td><code>color.brand.accent</code></td>
                  <td><span className="badge badge-accent">semantic</span></td>
                  <td><strong style={{ color: brandAccent }}>{brandAccent}</strong></td>
                </tr>
                <tr>
                  <td>3</td>
                  <td><code>borderRadius.card</code></td>
                  <td><span className="badge badge-outline">primitive</span></td>
                  <td>{brandRadius}</td>
                </tr>
              </tbody>
            </table>
          </div>
        );

      case "pagination":
        return (
          <div className="join">
            <button type="button" className="join-item btn btn-sm">«</button>
            <button type="button" className="join-item btn btn-sm btn-primary">1</button>
            <button type="button" className="join-item btn btn-sm">2</button>
            <button type="button" className="join-item btn btn-sm">3</button>
            <button type="button" className="join-item btn btn-sm">»</button>
          </div>
        );

      case "skeleton":
        return (
          <div style={{ width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="skeleton" style={{ height: 110, width: "100%" }} />
            <div className="skeleton" style={{ height: 16, width: "60%" }} />
            <div className="skeleton" style={{ height: 12, width: "90%" }} />
          </div>
        );

      case "toast":
        return (
          <div style={{ background: brandPrimary, color: "#101014", padding: "10px 16px", borderRadius: brandRadius, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
            <CheckCircle2 size={16} />
            <span>{activeProps.label}</span>
          </div>
        );

      case "loading":
        return (
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span className="loading" style={{ width: 28, height: 28 }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{activeProps.label}</span>
          </div>
        );

      case "steps":
        return (
          <ul className="steps" style={{ width: "100%" }}>
            <li className="step step-primary">Identidade</li>
            <li className="step step-primary">Cores & Tokens</li>
            <li className="step">Brandbook</li>
            <li className="step">Releases</li>
          </ul>
        );

      case "input":
        return (
          <div style={{ width: "100%", maxWidth: 340 }}>
            <input
              type="text"
              className="daisy-input"
              value={activeProps.label}
              disabled={state === "disabled"}
              onChange={(e) => updateProp("label", e.target.value)}
              placeholder="Digite..."
              style={{ borderRadius: brandRadius }}
            />
          </div>
        );

      case "toggle":
        return (
          <div
            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
            onClick={() => updateProp("open", !activeProps.open)}
          >
            <div className={`daisy-toggle-switch ${activeProps.open ? "active" : ""}`}>
              <div className="daisy-toggle-handle" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{activeProps.label}</span>
          </div>
        );

      case "alert":
        return (
          <div className="daisy-alert-box" style={{ width: "100%", maxWidth: 440, borderLeftColor: brandPrimary }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Info size={18} color={brandPrimary} />
              <span style={{ fontSize: 12 }}>{activeProps.label}</span>
            </div>
            {activeProps.dismissible && (
              <button type="button" className="btn btn-ghost btn-xs">✕</button>
            )}
          </div>
        );

      case "progress":
        return (
          <div style={{ width: "100%", maxWidth: 360 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11 }}>
              <span>{activeProps.label}</span>
              <strong style={{ color: brandPrimary }}>{activeProps.value || 75}%</strong>
            </div>
            <div className="daisy-progress-track">
              <div className="daisy-progress-fill" style={{ width: `${activeProps.value || 75}%` }} />
            </div>
          </div>
        );

      default:
        return (
          <div className={`daisy-card-box`} style={{ maxWidth: 360, width: "100%" }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: brandPrimary }}>{activeComp.name}</div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "8px 0" }}>{activeComp.description}</p>
            <button type="button" className="btn btn-primary btn-sm">{activeProps.label}</button>
          </div>
        );
    }
  };

  return (
    <div
      className="bg-daisy-stage"
      style={
        {
          "--b-primary": brandPrimary,
          "--b-accent": brandAccent,
          "--b-surface": brandSurface,
          "--b-text": brandText,
          "--b-radius": brandRadius,
          "--b-font-display": displayFont,
          "--b-font-body": bodyFont,
        } as any
      }
    >
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Box size={22} color={brandPrimary} />
            <h2 style={{ fontSize: 20, fontWeight: 900, fontFamily: displayFont, margin: 0 }}>
              Component Studio — {brand.name}
            </h2>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
            Editor de componentes interativos compatíveis com <strong>DaisyUI 5</strong> e <strong>Tailwind CSS</strong>, renderizados exclusivamente com os tokens da marca.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="bg-btn bg-btn--primary"
            style={{ fontSize: 12 }}
            onClick={() => setIsExportModalOpen(true)}
          >
            <Package size={14} /> Exportar Pacote Completo
          </button>
          <button
            type="button"
            className="bg-btn bg-btn--outline"
            style={{ fontSize: 12 }}
            onClick={() => copyToClipboard(exportDaisyUi5ThemeCss(brand, brandData), "Tema DaisyUI 5 copiado!")}
          >
            <Code2 size={13} /> Tema DaisyUI 5
          </button>
        </div>
      </div>

      {/* Main Studio Workspace Layout */}
      <div className="component-studio-workspace">
        {/* Left Column: Component Directory */}
        <div className="component-directory">
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-dim)" }} />
            <input
              type="text"
              placeholder="Filtrar componentes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 10px 7px 28px",
                fontSize: 11,
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 6,
                color: "var(--text-main)",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {["all", "actions", "inputs", "data", "navigation", "feedback"].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`bg-btn ${categoryFilter === cat ? "bg-btn--primary" : "bg-btn--ghost"}`}
                style={{ fontSize: 10, padding: "4px 8px" }}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
            {filteredComponents.map((c) => (
              <div
                key={c.id}
                className={`component-dir-item ${selectedCompId === c.id ? "active" : ""}`}
                onClick={() => setSelectedCompId(c.id)}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "monospace" }}>
                    .{c.daisyTag}
                  </div>
                </div>
                <ChevronRight size={13} color={selectedCompId === c.id ? brandPrimary : "var(--text-dim)"} />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Component Workspace */}
        <div className="component-stage-wrapper">
          {/* Stage Toolbar */}
          <div className="component-stage-toolbar">
            <div>
              <strong style={{ fontSize: 15, color: "var(--text-main)" }}>{activeComp.name}</strong>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                .{activeComp.daisyTag} · {activeComp.description}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {/* Viewport switchers */}
              <div style={{ display: "flex", background: "var(--bg-tertiary)", padding: 2, borderRadius: 6, border: "1px solid var(--border-subtle)" }}>
                <button
                  type="button"
                  className={`bg-btn ${viewport === "desktop" ? "bg-btn--primary" : "bg-btn--ghost"}`}
                  style={{ padding: "4px 8px", fontSize: 11 }}
                  onClick={() => setViewport("desktop")}
                  title="Desktop (100%)"
                >
                  <Monitor size={12} />
                </button>
                <button
                  type="button"
                  className={`bg-btn ${viewport === "tablet" ? "bg-btn--primary" : "bg-btn--ghost"}`}
                  style={{ padding: "4px 8px", fontSize: 11 }}
                  onClick={() => setViewport("tablet")}
                  title="Tablet (768px)"
                >
                  <Tablet size={12} />
                </button>
                <button
                  type="button"
                  className={`bg-btn ${viewport === "mobile" ? "bg-btn--primary" : "bg-btn--ghost"}`}
                  style={{ padding: "4px 8px", fontSize: 11 }}
                  onClick={() => setViewport("mobile")}
                  title="Mobile (375px)"
                >
                  <Smartphone size={12} />
                </button>
              </div>

              {/* Theme mode toggle */}
              <button
                type="button"
                className="bg-btn bg-btn--ghost"
                style={{ padding: "4px 8px", fontSize: 11 }}
                onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
              >
                {themeMode === "dark" ? <Sun size={12} /> : <Moon size={12} />}
                <span style={{ marginLeft: 4 }}>{themeMode === "dark" ? "Light" : "Dark"}</span>
              </button>
            </div>
          </div>

          {/* Viewport Stage Canvas */}
          <div className="viewport-container">
            <div
              className="viewport-canvas"
              data-viewport={viewport}
              data-theme={themeMode}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 160 }}
            >
              {renderStagePreview()}
            </div>
          </div>

          {/* Interactive Props Controls */}
          <div style={{ background: "var(--bg-tertiary)", padding: 16, borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: brandPrimary, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <SlidersHorizontal size={14} /> Controles Interativos de Propriedades
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              {/* Variant Picker */}
              <div className="bg-input-field" style={{ margin: 0 }}>
                <label>Variante Semântica</label>
                <select
                  value={activeProps.variant}
                  onChange={(e) => updateProp("variant", e.target.value as ComponentVariant)}
                >
                  {activeComp.supportedVariants.map((v) => (
                    <option key={v} value={v}>{v.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Size Picker */}
              <div className="bg-input-field" style={{ margin: 0 }}>
                <label>Tamanho</label>
                <select
                  value={activeProps.size}
                  onChange={(e) => updateProp("size", e.target.value as ComponentSize)}
                >
                  {activeComp.supportedSizes.map((s) => (
                    <option key={s} value={s}>{s.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* State Picker */}
              <div className="bg-input-field" style={{ margin: 0 }}>
                <label>Estado</label>
                <select
                  value={activeProps.state}
                  onChange={(e) => updateProp("state", e.target.value as ComponentState)}
                >
                  {activeComp.supportedStates.map((st) => (
                    <option key={st} value={st}>{st.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Text Label */}
              <div className="bg-input-field" style={{ margin: 0 }}>
                <label>Texto / Rótulo</label>
                <input
                  type="text"
                  value={activeProps.label}
                  onChange={(e) => updateProp("label", e.target.value)}
                />
              </div>
            </div>

            {/* Boolean Toggles */}
            <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={Boolean(activeProps.hasIcon)}
                  onChange={(e) => updateProp("hasIcon", e.target.checked)}
                />
                Exibir Ícone
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={Boolean(activeProps.outline)}
                  onChange={(e) => updateProp("outline", e.target.checked)}
                />
                Contorno (Outline)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={Boolean(activeProps.striped)}
                  onChange={(e) => updateProp("striped", e.target.checked)}
                />
                Listrado (Striped)
              </label>
            </div>
          </div>

          {/* Tokens Consumed & WCAG 2.2 Accessibility */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "var(--bg-tertiary)", padding: 14, borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
              <strong style={{ fontSize: 12, color: "var(--text-main)" }}>Design Tokens Consumidos:</strong>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {activeComp.tokensUsed.map((t, idx) => {
                  const tokenDef = tokens.find((tk) => tk.path === t);
                  const isPublished = tokenDef?.status === "approved";
                  return (
                    <span
                      key={idx}
                      style={{
                        fontSize: 10,
                        background: "var(--bg-elevated)",
                        padding: "3px 8px",
                        borderRadius: 4,
                        border: `1px solid ${isPublished ? "rgba(39, 201, 63, 0.4)" : "rgba(255, 112, 26, 0.4)"}`,
                        color: isPublished ? "#27C93F" : "#FF701A",
                        fontFamily: "monospace",
                      }}
                      title={isPublished ? "Token Homologado" : "Token em Rascunho"}
                    >
                      {t} ({isPublished ? "Homologado" : "Rascunho"})
                    </span>
                  );
                })}
              </div>
            </div>

            <div style={{ background: "var(--bg-tertiary)", padding: 14, borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 12, color: "var(--text-main)" }}>Acessibilidade & WCAG 2.2:</strong>
                <span style={{ fontSize: 11, fontWeight: 700, color: contrastAssessment.isPassingAA ? "#27C93F" : "#FF3D8D" }}>
                  Contraste {contrastAssessment.ratio.toFixed(1)}:1 ({contrastAssessment.isPassingAA ? "Pass AA" : "Fail AA"})
                </span>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "6px 0 0", lineHeight: 1.4 }}>
                Teclado: {activeComp.accessibility.keyboard}
              </p>
            </div>
          </div>

          {/* Code Inspector Tabs */}
          <div className="daisy-code-viewer">
            <div className="daisy-code-tabs" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingRight: 8 }}>
              <div style={{ display: "flex" }}>
                <button
                  type="button"
                  className={`daisy-code-tab ${activeCodeFormat === "daisyui5" ? "active" : ""}`}
                  onClick={() => setActiveCodeFormat("daisyui5")}
                >
                  DaisyUI 5 (Tailwind v4)
                </button>
                <button
                  type="button"
                  className={`daisy-code-tab ${activeCodeFormat === "daisyui4" ? "active" : ""}`}
                  onClick={() => setActiveCodeFormat("daisyui4")}
                >
                  DaisyUI 4 Config
                </button>
                <button
                  type="button"
                  className={`daisy-code-tab ${activeCodeFormat === "react" ? "active" : ""}`}
                  onClick={() => setActiveCodeFormat("react")}
                >
                  React JSX
                </button>
                <button
                  type="button"
                  className={`daisy-code-tab ${activeCodeFormat === "html" ? "active" : ""}`}
                  onClick={() => setActiveCodeFormat("html")}
                >
                  HTML + CSS
                </button>
              </div>

              <button
                type="button"
                className="bg-btn bg-btn--ghost"
                style={{ fontSize: 10, padding: "2px 8px", height: 24 }}
                onClick={() => copyToClipboard(generatedCode, "Código do componente copiado!")}
              >
                <Copy size={11} /> Copiar Código
              </button>
            </div>

            <pre className="daisy-code-pre">
              <code>{generatedCode}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Modal de Exportação de Pacote Completo */}
      {isExportModalOpen && (
        <div className="bg-modal-backdrop" onClick={() => setIsExportModalOpen(false)}>
          <div className="bg-modal" style={{ width: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className="bg-modal__header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Package size={18} color={brandPrimary} />
                <strong style={{ fontSize: 15 }}>Pacote de Exportação do Design System</strong>
              </div>
              <button type="button" className="bg-btn bg-btn--ghost" onClick={() => setIsExportModalOpen(false)}>
                <X size={14} />
              </button>
            </div>

            <div className="bg-modal__body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                Baixe ou copie os arquivos essenciais para utilizar este Design System em qualquer projeto limpo com Vite, Next.js ou Tailwind CSS.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-tertiary)", padding: 10, borderRadius: 6 }}>
                  <div>
                    <strong style={{ fontSize: 12 }}>theme.daisyui5.css</strong>
                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Tema oficial @plugin "daisyui/theme" para DaisyUI 5</div>
                  </div>
                  <button
                    type="button"
                    className="bg-btn bg-btn--ghost"
                    style={{ fontSize: 11 }}
                    onClick={() => copyToClipboard(exportDaisyUi5ThemeCss(brand, brandData), "theme.daisyui5.css copiado!")}
                  >
                    <Copy size={11} /> Copiar
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-tertiary)", padding: 10, borderRadius: 6 }}>
                  <div>
                    <strong style={{ fontSize: 12 }}>tailwind.config.js</strong>
                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Configuração DaisyUI 4 / Tailwind v3</div>
                  </div>
                  <button
                    type="button"
                    className="bg-btn bg-btn--ghost"
                    style={{ fontSize: 11 }}
                    onClick={() => copyToClipboard(exportDaisyUi4TailwindConfig(brand, brandData), "tailwind.config.js copiado!")}
                  >
                    <Copy size={11} /> Copiar
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-tertiary)", padding: 10, borderRadius: 6 }}>
                  <div>
                    <strong style={{ fontSize: 12 }}>tokens.dtcg.json</strong>
                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Tokens W3C DTCG 2025.10</div>
                  </div>
                  <button
                    type="button"
                    className="bg-btn bg-btn--ghost"
                    style={{ fontSize: 11 }}
                    onClick={() => copyToClipboard(exportToDtcgJson(tokens), "tokens.dtcg.json copiado!")}
                  >
                    <Copy size={11} /> Copiar
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-tertiary)", padding: 10, borderRadius: 6 }}>
                  <div>
                    <strong style={{ fontSize: 12 }}>package.json</strong>
                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Manifesto limpo de dependências com DaisyUI</div>
                  </div>
                  <button
                    type="button"
                    className="bg-btn bg-btn--ghost"
                    style={{ fontSize: 11 }}
                    onClick={() => copyToClipboard(exportComponentPackageJson(brand), "package.json copiado!")}
                  >
                    <Copy size={11} /> Copiar
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-tertiary)", padding: 10, borderRadius: 6 }}>
                  <div>
                    <strong style={{ fontSize: 12 }}>README.md</strong>
                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Documentação oficial do Design System</div>
                  </div>
                  <button
                    type="button"
                    className="bg-btn bg-btn--ghost"
                    style={{ fontSize: 11 }}
                    onClick={() => copyToClipboard(exportComponentDocsMarkdown(brand, brandData, CANONICAL_DAISY_COMPONENTS), "README.md copiado!")}
                  >
                    <Copy size={11} /> Copiar
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-modal__footer">
              <button
                type="button"
                className="bg-btn bg-btn--ghost"
                onClick={() => setIsExportModalOpen(false)}
              >
                Fechar
              </button>
              <button
                type="button"
                className="bg-btn bg-btn--primary"
                onClick={() => {
                  const bundle = {
                    "theme.daisyui5.css": exportDaisyUi5ThemeCss(brand, brandData),
                    "tailwind.config.js": exportDaisyUi4TailwindConfig(brand, brandData),
                    "tokens.dtcg.json": exportToDtcgJson(tokens),
                    "package.json": exportComponentPackageJson(brand),
                    "README.md": exportComponentDocsMarkdown(brand, brandData, CANONICAL_DAISY_COMPONENTS),
                  };
                  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${brand.slug}-design-system-bundle.json`;
                  a.click();
                  showToast("Pacote de arquivos baixado!", "success");
                }}
              >
                <Download size={13} /> Baixar Pacote (.json)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
