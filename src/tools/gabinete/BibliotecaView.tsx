import React, { useState } from "react";
import type { ContentReference, Workspace } from "./types";
import type { GabineteRepository } from "./repo";
import { IconBook, IconGlobe, IconFolder } from "./Icons";

interface Props {
  workspace: Workspace;
  references: ContentReference[];
  repo: GabineteRepository;
  onRefresh: () => void;
}

export const BibliotecaView: React.FC<Props> = ({
  workspace,
  references,
  repo,
  onRefresh,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ContentReference["category"]>("copy");
  const [url, setUrl] = useState("");
  const [targetType, setTargetType] = useState<"geral" | "cliente">("geral");
  const [clientName, setClientName] = useState("");
  const [notes, setNotes] = useState("");

  const filtered = references.filter((r) => {
    if (selectedCategory !== "all" && r.category !== selectedCategory) return false;
    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await repo.createReference({
      workspace_id: workspace.id,
      title,
      category,
      url,
      notes: targetType === "cliente" && clientName ? `[Cliente: ${clientName}] ${notes}` : notes,
      tags: targetType === "cliente" && clientName ? [category, clientName] : [category],
    });

    setModalOpen(false);
    setTitle("");
    setUrl("");
    setClientName("");
    setNotes("");
    onRefresh();
  };

  return (
    <div className="mc-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header com Ícone e Botão + NOVA REFERÊNCIA idêntico ao print */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ display: "inline-flex", color: "#c8d44e" }}>
            <IconBook size={22} />
          </span>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#fff4e8", letterSpacing: "-0.01em" }}>
            Biblioteca de Referências
          </h1>
        </div>

        <button
          data-tour="btn-nova-ref"
          onClick={() => setModalOpen(true)}
          style={{
            background: "#c8d44e",
            color: "#101014",
            border: "none",
            borderRadius: 9999,
            padding: "10px 18px",
            fontSize: 12.5,
            fontWeight: 800,
            letterSpacing: "0.06em",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            transition: "all 0.15s ease",
            boxShadow: "0 2px 8px rgba(200, 212, 78, 0.25)",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#d4e05b")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#c8d44e")}
        >
          <span>+</span> NOVA REFERÊNCIA
        </button>
      </div>

      {/* Banner Oficial: Novidade: extensão do Chrome pra salvar referências */}
      {bannerVisible && (
        <div
          style={{
            background: "rgba(200, 212, 78, 0.04)",
            border: "1px solid rgba(200, 212, 78, 0.22)",
            borderRadius: 14,
            padding: "20px 24px",
            position: "relative",
            display: "flex",
            alignItems: "flex-start",
            gap: 18,
          }}
        >
          {/* Ícone do Chrome com container verde translúcido */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(200, 212, 78, 0.12)",
              border: "1px solid rgba(200, 212, 78, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {/* SVG Ícone do Chrome Canônico */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c8d44e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
              <line x1="21.17" y1="8" x2="12" y2="8" />
              <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
              <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
            </svg>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, paddingRight: 32 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff4e8" }}>
              Novidade: extensão do Chrome pra salvar referências
            </h3>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "rgba(255, 244, 232, 0.72)" }}>
              Viu um vídeo, post ou site que serve de referência? Salve direto de onde você está, sem trocar de aba:
              abra a extensão, título e link já vêm preenchidos, escolha se é geral ou de um cliente específico e pronto
              — aparece na hora aqui na Biblioteca.
            </p>

            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => setExtensionModalOpen(true)}
                style={{
                  background: "#c8d44e",
                  color: "#101014",
                  border: "none",
                  borderRadius: 9999,
                  padding: "8px 18px",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <IconGlobe size={14} /> INSTALAR EXTENSÃO <span>↗</span>
              </button>
            </div>
          </div>

          {/* Botão Fechar X */}
          <button
            onClick={() => setBannerVisible(false)}
            style={{
              position: "absolute",
              top: 16,
              right: 18,
              background: "none",
              border: "none",
              color: "rgba(255, 244, 232, 0.4)",
              cursor: "pointer",
              fontSize: 16,
              padding: 4,
            }}
            title="Fechar aviso"
          >
            ✕
          </button>
        </div>
      )}

      {/* Categorias & Filtros */}
      <div data-tour="biblioteca-categorias" style={{ display: "flex", gap: 8 }}>
        {[
          { id: "all", label: "Todas" },
          { id: "copy", label: "Copywriting & Ganchos" },
          { id: "visual", label: "Direção Visual" },
          { id: "video", label: "Vídeo & Reels" },
          { id: "estrategia", label: "Estratégia" },
        ].map((c) => (
          <button
            key={c.id}
            className={`mc-btn ${selectedCategory === c.id ? "mc-btn--acid" : "mc-btn--secondary"}`}
            style={{ fontSize: 12 }}
            onClick={() => setSelectedCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid de Cards */}
      {filtered.length === 0 ? (
        <div
          style={{
            background: "var(--mc-ink-surface)",
            border: "1px solid var(--mc-ink-border)",
            borderRadius: "var(--mc-radius-lg)",
            padding: "60px 20px",
            textAlign: "center",
            color: "var(--mc-text-muted)",
          }}
        >
          <span style={{ display: "inline-flex", color: "var(--mc-caramel)", opacity: 0.8 }}>
            <IconBook size={36} />
          </span>
          <p style={{ margin: "8px 0 12px 0", fontSize: 14 }}>Nenhuma referência cadastrada nesta categoria.</p>
          <button className="mc-btn mc-btn--primary" onClick={() => setModalOpen(true)}>
            + Cadastrar Referência
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filtered.map((ref) => (
            <div
              key={ref.id}
              style={{
                background: "var(--mc-ink-surface)",
                border: "1px solid var(--mc-ink-border)",
                borderRadius: "var(--mc-radius-md)",
                padding: 18,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "var(--mc-caramel)",
                    letterSpacing: "0.06em",
                  }}
                >
                  {ref.category}
                </span>
                <h4 style={{ margin: "6px 0 8px 0", fontSize: 15, fontWeight: 700 }}>{ref.title}</h4>
                <p style={{ margin: 0, fontSize: 12.5, color: "var(--mc-text-body)", lineHeight: 1.5 }}>{ref.notes}</p>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--mc-ink-border)", paddingTop: 10 }}>
                {ref.url ? (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, color: "var(--mc-sky)", textDecoration: "none", fontWeight: 600 }}
                  >
                    Abrir link externo ↗
                  </a>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--mc-text-muted)" }}>Acervo interno</span>
                )}

                <button
                  style={{ background: "none", border: "none", color: "var(--mc-text-muted)", cursor: "pointer", fontSize: 12 }}
                  onClick={async () => {
                    if (confirm("Excluir esta referência?")) {
                      await repo.deleteReference(ref.id);
                      onRefresh();
                    }
                  }}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova Referência (Com opção Geral ou Cliente específico) */}
      {modalOpen && (
        <div className="mc-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="mc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mc-modal__header">
              <h2>Nova Referência</h2>
              <button
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 18 }}
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="mc-modal__body">
                <div className="mc-field">
                  <label>Título ou Gancho da Referência *</label>
                  <input
                    type="text"
                    className="mc-input"
                    placeholder="Ex: Fórmula de Gancho com Conflito & Mudança"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="mc-field">
                    <label>Destino da Referência</label>
                    <select
                      className="mc-select"
                      value={targetType}
                      onChange={(e) => setTargetType(e.target.value as any)}
                    >
                      <option value="geral">Geral (Acervo da Agência)</option>
                      <option value="cliente">Cliente Específico</option>
                    </select>
                  </div>

                  <div className="mc-field">
                    <label>Categoria</label>
                    <select
                      className="mc-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                    >
                      <option value="copy">Copywriting & Ganchos</option>
                      <option value="visual">Direção Visual & Cores</option>
                      <option value="video">Vídeo & Reels</option>
                      <option value="estrategia">Estratégia & Negócios</option>
                    </select>
                  </div>
                </div>

                {targetType === "cliente" && (
                  <div className="mc-field">
                    <label>Nome do Cliente</label>
                    <input
                      type="text"
                      className="mc-input"
                      placeholder="Ex: Graao, Soci, Carmelita..."
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>
                )}

                <div className="mc-field">
                  <label>Link / URL (Vídeo, Post, Site, Pinterest)</label>
                  <input
                    type="url"
                    className="mc-input"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>

                <div className="mc-field">
                  <label>Anotações & Aprendizados</label>
                  <textarea
                    className="mc-textarea"
                    rows={4}
                    placeholder="O que torna essa peça incrível? Qual ideia podemos adaptar para o conteúdo?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="mc-modal__footer">
                <button type="button" className="mc-btn mc-btn--secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="mc-btn mc-btn--primary">
                  Salvar na Biblioteca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Instalação da Extensão do Chrome */}
      {extensionModalOpen && (
        <div className="mc-modal-backdrop" onClick={() => setExtensionModalOpen(false)}>
          <div className="mc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="mc-modal__header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-flex", color: "var(--mc-caramel)" }}>
                  <IconGlobe size={20} />
                </span>
                <h2 style={{ fontSize: 16 }}>Instalar Extensão do Chrome</h2>
              </div>
              <button
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 18 }}
                onClick={() => setExtensionModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="mc-modal__body" style={{ gap: 14 }}>
              <p style={{ margin: 0, fontSize: 13, color: "var(--mc-text-body)", lineHeight: 1.5 }}>
                A extensão do Chrome do Gabinete permite salvar referências do Instagram, TikTok, YouTube e sites
                com 1 clique enquanto você navega.
              </p>

              <div style={{ background: "var(--mc-ink)", padding: 16, borderRadius: 10, border: "1px solid var(--mc-ink-border)", display: "flex", flexDirection: "column", gap: 10 }}>
                <strong style={{ fontSize: 13, color: "#c8d44e" }}>Como instalar em 3 passos:</strong>
                <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12.5, lineHeight: 1.6, color: "var(--mc-text-body)" }}>
                  <li>Abra o Chrome e acesse <code>chrome://extensions</code> na barra de endereços.</li>
                  <li>Ative a chave <strong>"Modo do desenvolvedor"</strong> no canto superior direito.</li>
                  <li>Clique em <strong>"Carregar sem compactação"</strong> e selecione a pasta <code>public/chrome-extension</code> deste projeto.</li>
                </ol>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="mc-btn mc-btn--acid"
                  style={{ flex: 1, borderRadius: 9999, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  onClick={() => {
                    alert("A pasta da extensão está pronta em: D:\\meus documentos\\Steam\\public\\chrome-extension");
                  }}
                >
                  <IconFolder size={15} /> Ver Pasta da Extensão
                </button>
              </div>
            </div>

            <div className="mc-modal__footer">
              <button type="button" className="mc-btn mc-btn--secondary" onClick={() => setExtensionModalOpen(false)}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
