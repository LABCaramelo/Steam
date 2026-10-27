import React, { useState } from "react";
import type { CreativeOsRepository } from "./repo";
import type { Workspace } from "./types";

interface Props {
  repo: CreativeOsRepository;
  onWorkspaceCreated: (workspace: Workspace) => void;
}

export const WorkspaceOnboarding: React.FC<Props> = ({ repo, onWorkspaceCreated }) => {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [serviceType, setServiceType] = useState<string>("head_de_conteudo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Informe o nome do seu estúdio ou marca.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ws = await repo.createWorkspace({
        name: name.trim(),
        slug: slug.trim() || "meu-estudio",
        service_type: serviceType,
      });
      onWorkspaceCreated(ws);
    } catch (err: any) {
      setError(err?.message || "Não foi possível criar o workspace.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cos-modal-overlay" style={{ backdropFilter: "blur(12px)" }}>
      <div className="cos-modal" style={{ maxWidth: 540 }}>
        <div className="cos-modal__header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="cos-brand__logo">C</span>
            <div>
              <h2 className="cos-modal__title">Bem-vindo ao Creative OS</h2>
              <span style={{ fontSize: 11, color: "var(--cos-accent)", fontWeight: 700 }}>
                CONFIGURAÇÃO DO PRIMEIRO WORKSPACE
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="cos-modal__body">
            <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "var(--cos-text-secondary)", lineHeight: 1.5 }}>
              O Creative OS conecta gestão do cliente, contexto estratégico da marca, tarefas, produção de conteúdo e
              aprovações de ponta a ponta. Dê um nome ao seu estúdio para começar:
            </p>

            {error && (
              <div
                style={{
                  background: "rgba(255, 77, 77, 0.15)",
                  border: "1px solid var(--cos-danger)",
                  color: "var(--cos-danger)",
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            <div className="cos-form-group">
              <label className="cos-form-label">Nome do Estúdio / Operação</label>
              <input
                type="text"
                className="cos-input"
                placeholder="Ex: Caramelo Estúdio Criativo"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="cos-form-group">
              <label className="cos-form-label">Identificador (Slug)</label>
              <input
                type="text"
                className="cos-input"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="ex: caramelo-estudio"
                required
              />
            </div>

            <div className="cos-form-group">
              <label className="cos-form-label">Serviço Principal</label>
              <select
                className="cos-select"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
              >
                <option value="head_de_conteudo">Head de Conteúdo Externo</option>
                <option value="estudio_criativo">Estúdio Criativo & Audiovisual</option>
                <option value="estrategista">Estrategista de Posicionamento</option>
                <option value="outro">Consultoria ou Outro</option>
              </select>
            </div>
          </div>

          <div className="cos-modal__footer">
            <button
              type="submit"
              className="cos-btn cos-btn--primary"
              disabled={loading || !name.trim()}
              style={{ width: "100%", padding: "12px" }}
            >
              {loading ? "Criando Workspace…" : "Criar Meu Estúdio e Começar →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
