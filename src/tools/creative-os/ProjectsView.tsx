import React, { useEffect, useState } from "react";
import type { CreativeOsRepository } from "./repo";
import type { Client, Project, ProjectTemplateType, Task, Workspace } from "./types";

interface Props {
  workspace: Workspace;
  clients: Client[];
  repo: CreativeOsRepository;
}

export const ProjectsView: React.FC<Props> = ({ workspace, clients, repo }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // New Project Form
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectClientId, setProjectClientId] = useState(clients[0]?.id || "");
  const [templateType, setTemplateType] = useState<ProjectTemplateType>("monthly_management");

  // New Task Form
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState<Task["priority"]>("medium");
  const [taskDueDate, setTaskDueDate] = useState("");

  const loadProjects = async () => {
    setLoading(true);
    try {
      const pList = await repo.getProjects(workspace.id);
      setProjects(pList);
      if (pList.length > 0 && !selectedProject) {
        setSelectedProject(pList[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async (projectId: string) => {
    try {
      const tList = await repo.getTasks(projectId);
      setTasks(tList);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [workspace.id]);

  useEffect(() => {
    if (selectedProject) {
      loadTasks(selectedProject.id);
    }
  }, [selectedProject?.id]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !projectClientId) return;
    try {
      const created = await repo.createProject({
        workspace_id: workspace.id,
        client_id: projectClientId,
        name: projectName.trim(),
        template_type: templateType,
        status: "active",
      });

      // Se for template, cria tarefas iniciais recomendadas
      if (templateType === "monthly_management") {
        await repo.createTask({
          workspace_id: workspace.id,
          project_id: created.id,
          title: "Auditoria de Contexto & Ficha de Marca",
          priority: "high",
          status: "done",
          description: "Mapear dores, tom de voz e anti-promessas da marca.",
        });
        await repo.createTask({
          workspace_id: workspace.id,
          project_id: created.id,
          title: "Planejamento da Grade Editorial (12 Peças)",
          priority: "high",
          status: "in_progress",
          description: "Definir temas abrangentes com especificidade de nicho.",
        });
        await repo.createTask({
          workspace_id: workspace.id,
          project_id: created.id,
          title: "Produção de Carrosséis da 1ª Quinzena",
          priority: "medium",
          status: "todo",
          description: "Copywriting dos slides com método HEAD (Atenção, Retenção, Toque).",
        });
      } else if (templateType === "launch") {
        await repo.createTask({
          workspace_id: workspace.id,
          project_id: created.id,
          title: "Arquitetura da Oferta & Big Idea",
          priority: "urgent",
          status: "in_progress",
        });
        await repo.createTask({
          workspace_id: workspace.id,
          project_id: created.id,
          title: "Roteiros de Aquisição (PPL) e Convite",
          priority: "high",
          status: "todo",
        });
      }

      setProjectName("");
      setProjectModalOpen(false);
      await loadProjects();
      setSelectedProject(created);
    } catch (err: any) {
      alert(err?.message || "Erro ao criar projeto");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !taskTitle.trim()) return;
    try {
      await repo.createTask({
        workspace_id: workspace.id,
        project_id: selectedProject.id,
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        priority: taskPriority,
        due_date: taskDueDate || undefined,
        status: "todo",
      });
      setTaskTitle("");
      setTaskDesc("");
      setTaskDueDate("");
      setTaskModalOpen(false);
      loadTasks(selectedProject.id);
    } catch (err: any) {
      alert(err?.message || "Erro ao criar tarefa");
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: Task["status"]) => {
    try {
      await repo.updateTask(taskId, { status });
      if (selectedProject) loadTasks(selectedProject.id);
    } catch (err: any) {
      alert(err?.message || "Erro ao atualizar status");
    }
  };

  return (
    <div>
      <div className="cos-view-header">
        <div>
          <h1 className="cos-view-header__title">Projetos & Tarefas Operacionais</h1>
          <p className="cos-view-header__subtitle">
            Estruturas por templates, kanban de tarefas e controle de prazos da equipe.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="cos-btn cos-btn--secondary" onClick={() => setViewMode(viewMode === "kanban" ? "list" : "kanban")}>
            {viewMode === "kanban" ? "Visão Lista 📄" : "Visão Kanban 🗂"}
          </button>
          <button className="cos-btn cos-btn--primary" onClick={() => setProjectModalOpen(true)}>
            + Novo Projeto
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
        {/* Left: Project Selector */}
        <div className="cos-card" style={{ height: "fit-content" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 className="cos-card__title">Projetos</h3>
            <span style={{ fontSize: 12, color: "var(--cos-text-muted)" }}>{projects.length}</span>
          </div>

          {loading ? (
            <p style={{ fontSize: 13, color: "var(--cos-text-muted)", padding: "10px 0" }}>
              Carregando projetos…
            </p>
          ) : projects.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--cos-text-muted)", padding: "10px 0" }}>
              Nenhum projeto ativo.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {projects.map((proj) => {
                const client = clients.find((c) => c.id === proj.client_id);
                const isSelected = selectedProject?.id === proj.id;
                return (
                  <div
                    key={proj.id}
                    onClick={() => setSelectedProject(proj)}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: isSelected ? "var(--cos-surface-3)" : "var(--cos-surface-2)",
                      border: `1px solid ${isSelected ? "var(--cos-accent)" : "var(--cos-border)"}`,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{proj.name}</div>
                    <div style={{ fontSize: 12, color: "var(--cos-text-secondary)", marginTop: 2 }}>
                      {client?.name || "Cliente"} · {proj.template_type}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Selected Project Tasks (Kanban / List) */}
        {selectedProject ? (
          <div className="cos-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: "0 0 4px 0", fontSize: 18, fontFamily: "Montserrat, sans-serif" }}>
                  {selectedProject.name}
                </h2>
                <span style={{ fontSize: 13, color: "var(--cos-text-secondary)" }}>
                  Template: <strong>{selectedProject.template_type}</strong> · {tasks.length} tarefas
                </span>
              </div>
              <button className="cos-btn cos-btn--secondary cos-btn--sm" onClick={() => setTaskModalOpen(true)}>
                + Adicionar Tarefa
              </button>
            </div>

            {viewMode === "kanban" ? (
              <div className="cos-kanban">
                {(["todo", "in_progress", "review", "done"] as const).map((colStatus) => {
                  const colTasks = tasks.filter((t) => t.status === colStatus);
                  const labelMap = {
                    todo: "A Fazer",
                    in_progress: "Em Produção",
                    review: "Revisão Interna",
                    done: "Concluído",
                  };
                  return (
                    <div key={colStatus} className="cos-kanban-col">
                      <div className="cos-kanban-col__header">
                        <span>{labelMap[colStatus]}</span>
                        <span style={{ color: "var(--cos-text-muted)" }}>{colTasks.length}</span>
                      </div>
                      {colTasks.map((task) => (
                        <div key={task.id} className="cos-kanban-card">
                          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{task.title}</div>
                          {task.description && (
                            <div style={{ fontSize: 11, color: "var(--cos-text-secondary)", marginBottom: 8 }}>
                              {task.description}
                            </div>
                          )}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                color:
                                  task.priority === "urgent"
                                    ? "var(--cos-danger)"
                                    : task.priority === "high"
                                      ? "var(--cos-accent)"
                                      : "var(--cos-text-muted)",
                              }}
                            >
                              {task.priority}
                            </span>
                            <div style={{ display: "flex", gap: 4 }}>
                              {colStatus !== "todo" && (
                                <button
                                  className="cos-btn cos-btn--ghost cos-btn--sm"
                                  style={{ padding: "2px 6px", fontSize: 10 }}
                                  onClick={() =>
                                    handleUpdateTaskStatus(
                                      task.id,
                                      colStatus === "done"
                                        ? "review"
                                        : colStatus === "review"
                                          ? "in_progress"
                                          : "todo",
                                    )
                                  }
                                >
                                  ←
                                </button>
                              )}
                              {colStatus !== "done" && (
                                <button
                                  className="cos-btn cos-btn--ghost cos-btn--sm"
                                  style={{ padding: "2px 6px", fontSize: 10 }}
                                  onClick={() =>
                                    handleUpdateTaskStatus(
                                      task.id,
                                      colStatus === "todo"
                                        ? "in_progress"
                                        : colStatus === "in_progress"
                                          ? "review"
                                          : "done",
                                    )
                                  }
                                >
                                  →
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: 12,
                      background: "var(--cos-surface-2)",
                      border: "1px solid var(--cos-border)",
                      borderRadius: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{task.title}</div>
                      {task.description && (
                        <div style={{ fontSize: 12, color: "var(--cos-text-secondary)", marginTop: 2 }}>
                          {task.description}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <select
                        className="cos-select"
                        style={{ padding: "4px 8px", fontSize: 12 }}
                        value={task.status}
                        onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as any)}
                      >
                        <option value="todo">A Fazer</option>
                        <option value="in_progress">Em Produção</option>
                        <option value="review">Revisão Interna</option>
                        <option value="done">Concluído</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="cos-empty-state">
            <p className="cos-empty-state__title">Nenhum projeto selecionado</p>
            <p className="cos-empty-state__text">Crie um projeto para organizar tarefas e cronogramas.</p>
          </div>
        )}
      </div>

      {/* Project Modal */}
      {projectModalOpen && (
        <div className="cos-modal-overlay">
          <div className="cos-modal">
            <div className="cos-modal__header">
              <h3 className="cos-modal__title">Novo Projeto</h3>
              <button className="cos-btn cos-btn--ghost cos-btn--sm" onClick={() => setProjectModalOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="cos-modal__body">
                <div className="cos-form-group">
                  <label className="cos-form-label">Cliente</label>
                  <select
                    className="cos-select"
                    value={projectClientId}
                    onChange={(e) => setProjectClientId(e.target.value)}
                    required
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cos-form-group">
                  <label className="cos-form-label">Nome do Projeto</label>
                  <input
                    type="text"
                    className="cos-input"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Ex: Gestão Editorial Mensal — Novembro"
                    required
                  />
                </div>

                <div className="cos-form-group">
                  <label className="cos-form-label">Template Operacional</label>
                  <select
                    className="cos-select"
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value as any)}
                  >
                    <option value="monthly_management">Gestão Mensal de Conteúdo (Recomendado)</option>
                    <option value="launch">Campanha de Lançamento / Infoproduto</option>
                    <option value="landing_page">Landing Page & Posicionamento</option>
                    <option value="custom">Projeto Personalizado em Branco</option>
                  </select>
                </div>
              </div>
              <div className="cos-modal__footer">
                <button type="button" className="cos-btn cos-btn--ghost" onClick={() => setProjectModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="cos-btn cos-btn--primary" disabled={!projectName.trim()}>
                  Criar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {taskModalOpen && (
        <div className="cos-modal-overlay">
          <div className="cos-modal">
            <div className="cos-modal__header">
              <h3 className="cos-modal__title">Nova Tarefa</h3>
              <button className="cos-btn cos-btn--ghost cos-btn--sm" onClick={() => setTaskModalOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="cos-modal__body">
                <div className="cos-form-group">
                  <label className="cos-form-label">Título da Tarefa</label>
                  <input
                    type="text"
                    className="cos-input"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Ex: Roteirizar carrossel de posicionamento"
                    required
                  />
                </div>
                <div className="cos-form-group">
                  <label className="cos-form-label">Descrição / Instruções</label>
                  <textarea
                    className="cos-textarea"
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    placeholder="Orientações específicas para quem for executar."
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="cos-form-group">
                    <label className="cos-form-label">Prioridade</label>
                    <select
                      className="cos-select"
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as any)}
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                  <div className="cos-form-group">
                    <label className="cos-form-label">Data de Entrega</label>
                    <input
                      type="date"
                      className="cos-input"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="cos-modal__footer">
                <button type="button" className="cos-btn cos-btn--ghost" onClick={() => setTaskModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="cos-btn cos-btn--primary" disabled={!taskTitle.trim()}>
                  Adicionar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
