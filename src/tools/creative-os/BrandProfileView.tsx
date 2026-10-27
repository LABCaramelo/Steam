import React, { useEffect, useState } from "react";
import type { CreativeOsRepository } from "./repo";
import type { Client, Workspace } from "./types";

interface Props {
  workspace: Workspace;
  clients: Client[];
  initialClient?: Client | null;
  repo: CreativeOsRepository;
}

export const BrandProfileView: React.FC<Props> = ({
  workspace,
  clients,
  initialClient,
  repo,
}) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(
    initialClient || clients[0] || null,
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form fields
  const [purpose, setPurpose] = useState("");
  const [offer, setOffer] = useState("");
  const [targetPersonas, setTargetPersonas] = useState("");
  const [positioning, setPositioning] = useState("");
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [visualGuidelines, setVisualGuidelines] = useState("");
  const [channels, setChannels] = useState("");
  const [differentiators, setDifferentiators] = useState("");
  const [restrictions, setRestrictions] = useState("");
  const [refLinkInput, setRefLinkInput] = useState("");
  const [referenceLinks, setReferenceLinks] = useState<string[]>([]);
  const [isValidated, setIsValidated] = useState(false);

  const loadProfile = async (clientId: string) => {
    setLoading(true);
    setSavedSuccess(false);
    try {
      const data = await repo.getBrandProfile(clientId);
      if (data) {
        setPurpose(data.purpose || "");
        setOffer(data.offer || "");
        setTargetPersonas(data.target_personas || "");
        setPositioning(data.positioning || "");
        setToneOfVoice(data.tone_of_voice || "");
        setVisualGuidelines(data.visual_guidelines || "");
        setChannels(data.channels || "");
        setDifferentiators(data.differentiators || "");
        setRestrictions(data.restrictions || "");
        setReferenceLinks(data.reference_links || []);
        setIsValidated(data.is_validated);
      } else {
        setPurpose("");
        setOffer("");
        setTargetPersonas("");
        setPositioning("");
        setToneOfVoice("");
        setVisualGuidelines("");
        setChannels("");
        setDifferentiators("");
        setRestrictions("");
        setReferenceLinks([]);
        setIsValidated(false);
      }
    } catch (err) {
      console.error("Erro ao carregar ficha estratégica:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClient) {
      loadProfile(selectedClient.id);
    }
  }, [selectedClient?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    setSaving(true);
    try {
      await repo.saveBrandProfile({
        workspace_id: workspace.id,
        client_id: selectedClient.id,
        purpose,
        offer,
        target_personas: targetPersonas,
        positioning,
        tone_of_voice: toneOfVoice,
        visual_guidelines: visualGuidelines,
        channels,
        differentiators,
        restrictions,
        reference_links: referenceLinks,
        is_validated: isValidated,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err?.message || "Erro ao salvar ficha estratégica.");
    } finally {
      setSaving(false);
    }
  };

  const addReferenceLink = () => {
    if (!refLinkInput.trim()) return;
    setReferenceLinks([...referenceLinks, refLinkInput.trim()]);
    setRefLinkInput("");
  };

  const removeReferenceLink = (index: number) => {
    setReferenceLinks(referenceLinks.filter((_, i) => i !== index));
  };

  if (clients.length === 0) {
    return (
      <div className="cos-empty-state">
        <p className="cos-empty-state__title">Nenhum cliente cadastrado</p>
        <p className="cos-empty-state__text">Cadastre um cliente antes de construir a ficha estratégica de marca.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="cos-view-header">
        <div>
          <h1 className="cos-view-header__title">Ficha Estratégica da Marca</h1>
          <p className="cos-view-header__subtitle">
            Base canônica da marca: posicionamento, tom de voz, personas e restrições. Fonte autorizada para cópia e IA.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label className="cos-form-label" style={{ margin: 0 }}>Cliente:</label>
          <select
            className="cos-select"
            style={{ width: 220 }}
            value={selectedClient?.id || ""}
            onChange={(e) => {
              const cl = clients.find((c) => c.id === e.target.value);
              if (cl) setSelectedClient(cl);
            }}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {savedSuccess && (
        <div
          style={{
            background: "rgba(42, 213, 135, 0.15)",
            border: "1px solid var(--cos-mint)",
            color: "var(--cos-mint)",
            padding: "10px 16px",
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          ✓ Ficha estratégica atualizada com sucesso no banco de dados!
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--cos-text-muted)" }}>
          Carregando contexto estratégico…
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Left Column: Identidade, Oferta & Posicionamento */}
            <div className="cos-card">
              <h3 className="cos-card__title" style={{ marginBottom: 16 }}>
                1. Posicionamento & Narrativa
              </h3>

              <div className="cos-form-group">
                <label className="cos-form-label">Propósito / Tese da Marca</label>
                <textarea
                  className="cos-textarea"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Por que a marca existe e qual mudança cultural ou técnica ela lidera?"
                />
              </div>

              <div className="cos-form-group">
                <label className="cos-form-label">Oferta Central & Mecanismo</label>
                <textarea
                  className="cos-textarea"
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                  placeholder="O que é vendido, qual a transformação real e qual o método proprietário?"
                />
              </div>

              <div className="cos-form-group">
                <label className="cos-form-label">Público & Personas ("Meu Deus, Sou Eu")</label>
                <textarea
                  className="cos-textarea"
                  value={targetPersonas}
                  onChange={(e) => setTargetPersonas(e.target.value)}
                  placeholder="Dores viscerais, cenas reais do dia a dia, objeções e momento de vida."
                  rows={4}
                />
              </div>

              <div className="cos-form-group">
                <label className="cos-form-label">Posicionamento de Mercado & Diferenciais</label>
                <textarea
                  className="cos-textarea"
                  value={positioning}
                  onChange={(e) => setPositioning(e.target.value)}
                  placeholder="Contra o que a marca se posiciona? O que ela faz que ninguém mais faz?"
                />
              </div>
            </div>

            {/* Right Column: Tom de Voz, Visual & Restrições */}
            <div className="cos-card">
              <h3 className="cos-card__title" style={{ marginBottom: 16 }}>
                2. Expressão, Diretrizes & Filtros
              </h3>

              <div className="cos-form-group">
                <label className="cos-form-label">Tom de Voz & Dicionário Verbal</label>
                <textarea
                  className="cos-textarea"
                  value={toneOfVoice}
                  onChange={(e) => setToneOfVoice(e.target.value)}
                  placeholder="Ex: Elegância + pequena confissão patética. Expressões canônicas, palavras proibidas…"
                />
              </div>

              <div className="cos-form-group">
                <label className="cos-form-label">Diretrizes Visuais & Estilo de Arte</label>
                <textarea
                  className="cos-textarea"
                  value={visualGuidelines}
                  onChange={(e) => setVisualGuidelines(e.target.value)}
                  placeholder="Paleta de cores, tipografia em 3 vozes, texturas, iluminação e enquadramentos."
                />
              </div>

              <div className="cos-form-group">
                <label className="cos-form-label">Restrições & Anti-promessas (Critério da Mediocridade)</label>
                <textarea
                  className="cos-textarea"
                  value={restrictions}
                  onChange={(e) => setRestrictions(e.target.value)}
                  placeholder="O que NUNCA fazer, dizer ou prometer. Clichês terminantemente banidos."
                />
              </div>

              <div className="cos-form-group">
                <label className="cos-form-label">Canais Prioritários</label>
                <input
                  type="text"
                  className="cos-input"
                  value={channels}
                  onChange={(e) => setChannels(e.target.value)}
                  placeholder="Ex: Instagram (Carrosséis e Reels), YouTube, Newsletter"
                />
              </div>

              {/* Reference Links */}
              <div className="cos-form-group">
                <label className="cos-form-label">Links de Referência & Benchmark</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="url"
                    className="cos-input"
                    value={refLinkInput}
                    onChange={(e) => setRefLinkInput(e.target.value)}
                    placeholder="https://exemplo.com/referencia"
                  />
                  <button type="button" className="cos-btn cos-btn--secondary" onClick={addReferenceLink}>
                    + Adicionar
                  </button>
                </div>
                {referenceLinks.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {referenceLinks.map((link, idx) => (
                      <span
                        key={idx}
                        className="cos-badge"
                        style={{ background: "var(--cos-surface-3)", textTransform: "none" }}
                      >
                        {link}
                        <button
                          type="button"
                          onClick={() => removeReferenceLink(idx)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--cos-danger)",
                            cursor: "pointer",
                            marginLeft: 4,
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
                <input
                  type="checkbox"
                  id="brand-validated"
                  checked={isValidated}
                  onChange={(e) => setIsValidated(e.target.checked)}
                />
                <label htmlFor="brand-validated" style={{ fontSize: 13, cursor: "pointer", fontWeight: 700 }}>
                  Ficha validada e alinhada com o cliente
                </label>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button type="submit" className="cos-btn cos-btn--primary" disabled={saving}>
              {saving ? "Gravando no Banco…" : "Salvar Ficha Estratégica ✓"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
