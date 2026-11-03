import React, { useEffect, useState } from "react";
import { GabineteSidebar } from "./GabineteSidebar";
import { GabineteTopbar } from "./GabineteTopbar";
import { MinhasDemandasView } from "./MinhasDemandasView";
import { DashboardView } from "./DashboardView";
import { ClientesView } from "./ClientesView";
import { CalendarioView } from "./CalendarioView";
import { NativoView } from "./NativoView";
import { BibliotecaView } from "./BibliotecaView";
import { RedesSociaisView } from "./RedesSociaisView";
import { VendasView } from "./VendasView";
import { FormulariosView } from "./FormulariosView";
import { RelatoriosView } from "./RelatoriosView";
import { FinanceiroView } from "./FinanceiroView";
import { LixeiraView } from "./LixeiraView";
import { EquipeView } from "./EquipeView";
import { RotinaView } from "./RotinaView";
import { ClientPortalView } from "./ClientPortalView";
import { OnboardingGuide } from "./OnboardingGuide";
import type { GabineteRepository } from "./repo";
import type {
  Client,
  ContentReference,
  Deliverable,
  FinancialEntry,
  Opportunity,
  Task,
  Workspace,
  WorkspaceMember,
} from "./types";
import "./gabinete.css";

interface Props {
  repo: GabineteRepository;
}

export const GabineteApp: React.FC<Props> = ({ repo }) => {
  // Portal do cliente (se houver ?portal=<token>)
  const urlParams = new URLSearchParams(window.location.search);
  const portalToken = urlParams.get("portal");
  if (portalToken) {
    return <ClientPortalView token={portalToken} repo={repo} />;
  }

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [activeTab, setActiveTab] = useState<string>("minhas-tarefas");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Dados Centrais
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [references, setReferences] = useState<ContentReference[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);

  // Modal Rápido de Nova Demanda
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskClient, setNewTaskClient] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Task["priority"]>("medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    // Gabinete opera como estúdio canônico dark do LAB Caramelo
    document.documentElement.setAttribute("data-caramelo-theme", "dark");
  }, []);

  const loadAll = async () => {
    try {
      const wsList = await repo.getWorkspaces();
      const currentWs = wsList[0];
      setWorkspace(currentWs);

      if (currentWs) {
        const [cList, tList, dList, mList, rList, oList, fList] = await Promise.all([
          repo.getClients(currentWs.id),
          repo.getTasks(currentWs.id),
          repo.getDeliverables(currentWs.id),
          repo.getMembers(currentWs.id),
          repo.getReferences(currentWs.id),
          repo.getOpportunities(currentWs.id),
          repo.getFinancialEntries(currentWs.id),
        ]);

        setClients(cList);
        setTasks(tList);
        setDeliverables(dList);
        setMembers(mList);
        setReferences(rList);
        setOpportunities(oList);
        setFinancialEntries(fList);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do Gabinete:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !workspace) return;

    await repo.createTask({
      workspace_id: workspace.id,
      title: newTaskTitle,
      client_id: newTaskClient || undefined,
      priority: newTaskPriority,
      due_date: newTaskDueDate,
      status: "todo",
    });

    setTaskModalOpen(false);
    setNewTaskTitle("");
    loadAll();
  };

  const handleToggleTask = async (t: Task) => {
    const nextStatus = t.status === "done" ? "todo" : "done";
    await repo.updateTask(t.id, { status: nextStatus });
    loadAll();
  };

  if (loading || !workspace) {
    return (
      <div className="mc-shell" style={{ alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--mc-text-muted)" }}>Iniciando o Gabinete…</p>
      </div>
    );
  }

  const openTasksCount = tasks.filter((t) => t.status !== "done" && !t.is_archived).length;

  return (
    <div className="mc-shell">
      {/* Sidebar Lateral Clássica */}
      {!sidebarCollapsed && (
        <GabineteSidebar
          workspace={workspace}
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          clients={clients}
          onOpenNewClientModal={() => setActiveTab("clientes")}
          taskCount={openTasksCount}
        />
      )}

      {/* Conteúdo Central */}
      <main className="mc-main">
        {/* Topbar Superior Global com Ícones */}
        <GabineteTopbar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenVideoTutorials={() => setActiveTab("biblioteca")}
          onOpenQuickNotes={() => setTaskModalOpen(true)}
          onOpenSettings={() => setActiveTab("equipe")}
        />

        {/* Onboarding & Guia de Funcionalidades */}
        <OnboardingGuide
          activeTab={activeTab}
          onNavigate={(tab) => setActiveTab(tab)}
        />

        {/* Views Baseadas na Aba Ativa */}
        <div style={{ flex: 1, padding: "20px 0" }}>
          {activeTab === "minhas-tarefas" && (
            <MinhasDemandasView
              workspace={workspace}
              tasks={tasks}
              deliverables={deliverables}
              clients={clients}
              members={members}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenNewTaskModal={() => setTaskModalOpen(true)}
              onToggleTaskComplete={handleToggleTask}
            />
          )}

          {activeTab === "dashboard" && (
            <DashboardView
              workspace={workspace}
              clients={clients}
              tasks={tasks}
              deliverables={deliverables}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "clientes" && (
            <ClientesView
              workspace={workspace}
              clients={clients}
              repo={repo}
              onRefresh={loadAll}
            />
          )}

          {activeTab === "calendario" && (
            <CalendarioView
              workspace={workspace}
              clients={clients}
              deliverables={deliverables}
              repo={repo}
              onRefresh={loadAll}
            />
          )}

          {activeTab === "nativo" && (
            <NativoView
              workspace={workspace}
              clients={clients}
              repo={repo}
              onNavigateToCalendar={() => setActiveTab("calendario")}
            />
          )}

          {activeTab === "biblioteca" && (
            <BibliotecaView
              workspace={workspace}
              references={references}
              repo={repo}
              onRefresh={loadAll}
            />
          )}

          {activeTab === "redes-sociais" && (
            <RedesSociaisView workspace={workspace} repo={repo} />
          )}

          {activeTab === "vendas" && (
            <VendasView
              workspace={workspace}
              opportunities={opportunities}
              repo={repo}
              onRefresh={loadAll}
            />
          )}

          {activeTab === "formularios" && (
            <FormulariosView workspace={workspace} clients={clients} repo={repo} />
          )}

          {activeTab === "lixeira" && (
            <LixeiraView
              workspace={workspace}
              clients={clients}
              tasks={tasks}
              deliverables={deliverables}
              repo={repo}
              onRefresh={loadAll}
            />
          )}

          {activeTab === "relatorios" && (
            <RelatoriosView
              workspace={workspace}
              deliverables={deliverables}
              tasks={tasks}
            />
          )}

          {activeTab === "financeiro" && (
            <FinanceiroView
              workspace={workspace}
              clients={clients}
              entries={financialEntries}
              repo={repo}
              onRefresh={loadAll}
            />
          )}

          {activeTab === "rotina" && (
            <RotinaView workspace={workspace} repo={repo} />
          )}

          {(activeTab === "equipe" ||
            activeTab === "configuracoes" ||
            activeTab === "equipe-membros") && (
            <EquipeView
              workspace={workspace}
              repo={repo}
              initialSubTab="equipe"
            />
          )}

          {activeTab === "equipe-squads" && (
            <EquipeView
              workspace={workspace}
              repo={repo}
              initialSubTab="squads"
            />
          )}

          {activeTab === "equipe-rotina" && (
            <EquipeView
              workspace={workspace}
              repo={repo}
              initialSubTab="rotina"
            />
          )}

          {activeTab === "equipe-relatorio" && (
            <EquipeView
              workspace={workspace}
              repo={repo}
              initialSubTab="relatorio"
            />
          )}
        </div>
      </main>

      {/* Modal Nova Demanda */}
      {taskModalOpen && (
        <div className="mc-modal-backdrop" onClick={() => setTaskModalOpen(false)}>
          <div className="mc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mc-modal__header">
              <h2>Nova Demanda de Trabalho</h2>
              <button
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 18 }}
                onClick={() => setTaskModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div className="mc-modal__body">
                <div className="mc-field">
                  <label>Título da Demanda *</label>
                  <input
                    type="text"
                    className="mc-input"
                    placeholder="Ex: Roteirizar 4 carrosséis para Graao"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="mc-field">
                    <label>Cliente (opcional)</label>
                    <select
                      className="mc-select"
                      value={newTaskClient}
                      onChange={(e) => setNewTaskClient(e.target.value)}
                    >
                      <option value="">Sem cliente específico</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mc-field">
                    <label>Prioridade</label>
                    <select
                      className="mc-select"
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    >
                      <option value="urgent">Urgente (Hoje)</option>
                      <option value="high">Alta</option>
                      <option value="medium">Média</option>
                      <option value="low">Baixa</option>
                    </select>
                  </div>
                </div>

                <div className="mc-field">
                  <label>Data de Vencimento</label>
                  <input
                    type="date"
                    className="mc-input"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="mc-modal__footer">
                <button
                  type="button"
                  className="mc-btn mc-btn--secondary"
                  onClick={() => setTaskModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="mc-btn mc-btn--primary">
                  Criar Demanda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
