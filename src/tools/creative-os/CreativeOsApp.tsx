import React, { useEffect, useState } from "react";
import { ThemeToggle } from "@caramelo/design-system";
import { AiAssistantModal } from "./AiAssistantModal";
import { ApprovalsView } from "./ApprovalsView";
import { BrandProfileView } from "./BrandProfileView";
import { BriefingsView } from "./BriefingsView";
import { ClientPortalView } from "./ClientPortalView";
import { ClientsView } from "./ClientsView";
import { DashboardView } from "./DashboardView";
import { EditorialCalendarView } from "./EditorialCalendarView";
import { FinanceView } from "./FinanceView";
import { ProjectsView } from "./ProjectsView";
import type { CreativeOsRepository } from "./repo";
import type { Client, Deliverable, Project, Task, Workspace } from "./types";
import { WorkspaceOnboarding } from "./WorkspaceOnboarding";
import "./creative-os.css";

interface Props {
  repo: CreativeOsRepository;
}

export const CreativeOsApp: React.FC<Props> = ({ repo }) => {
  // Check if we are viewing as a guest client via ?portal=<token>
  const urlParams = new URLSearchParams(window.location.search);
  const portalToken = urlParams.get("portal");

  if (portalToken) {
    return <ClientPortalView token={portalToken} repo={repo} />;
  }

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Core Data
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [clientForStrategy, setClientForStrategy] = useState<Client | null>(null);

  // Modals
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      const wsList = await repo.getWorkspaces();
      setWorkspaces(wsList);
      if (wsList.length > 0 && !activeWorkspace) {
        setActiveWorkspace(wsList[0]);
      }
    } catch (err) {
      console.error("Erro ao carregar workspaces:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaceData = async (wsId: string) => {
    try {
      const [cList, pList, dList] = await Promise.all([
        repo.getClients(wsId),
        repo.getProjects(wsId),
        repo.getDeliverables(wsId),
      ]);
      setClients(cList);
      setProjects(pList);
      setDeliverables(dList);

      // Load tasks across projects
      if (pList.length > 0) {
        const allTasks = await Promise.all(pList.map((p) => repo.getTasks(p.id)));
        setTasks(allTasks.flat());
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do workspace:", err);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (activeWorkspace) {
      loadWorkspaceData(activeWorkspace.id);
    }
  }, [activeWorkspace?.id]);

  if (loading) {
    return (
      <div className="cos-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--cos-text-secondary)" }}>Iniciando Creative OS…</p>
      </div>
    );
  }

  // If user has no workspaces yet, show the onboarding modal
  if (!activeWorkspace || workspaces.length === 0) {
    return (
      <div className="cos-shell">
        <WorkspaceOnboarding
          repo={repo}
          onWorkspaceCreated={(ws) => {
            setWorkspaces([ws]);
            setActiveWorkspace(ws);
          }}
        />
      </div>
    );
  }

  return (
    <div className="cos-shell">
      {/* Header */}
      <header className="cos-header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="cos-brand">
            <span className="cos-brand__logo">C</span>
            <div>
              <h1 className="cos-brand__title">
                Creative OS <span className="cos-brand__tag">Beta</span>
              </h1>
            </div>
          </div>

          {/* Workspace Switcher */}
          <div className="cos-workspace-badge">
            <span className="cos-workspace-badge__dot" />
            <span>{activeWorkspace.name}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="cos-btn cos-btn--secondary cos-btn--sm"
            onClick={() => setAiModalOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span>✨</span> Assistente IA
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Navigation */}
      <nav className="cos-nav" aria-label="Navegação do Creative OS">
        {[
          { id: "dashboard", label: "📊 Visão Geral" },
          { id: "clients", label: `👥 Clientes (${clients.length})` },
          { id: "strategy", label: "🎯 Ficha da Marca" },
          { id: "briefings", label: "📋 Briefings & Propostas" },
          { id: "projects", label: `🗂 Projetos (${projects.length})` },
          { id: "calendar", label: `📅 Grade Editorial (${deliverables.length})` },
          { id: "approvals", label: "✓ Aprovações" },
          { id: "finance", label: "💰 Financeiro" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`cos-nav__item ${activeTab === tab.id ? "is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Main View Area */}
      <main className="cos-main">
        {activeTab === "dashboard" && (
          <DashboardView
            workspace={activeWorkspace}
            clients={clients}
            projects={projects}
            tasks={tasks}
            deliverables={deliverables}
            onNavigate={(t) => setActiveTab(t)}
            onOpenAiAssistant={() => setAiModalOpen(true)}
            onOpenNewClientModal={() => setActiveTab("clients")}
            onOpenNewDeliverableModal={() => setActiveTab("calendar")}
          />
        )}

        {activeTab === "clients" && (
          <ClientsView
            workspace={activeWorkspace}
            clients={clients}
            repo={repo}
            onRefresh={() => loadWorkspaceData(activeWorkspace.id)}
            onSelectClientForStrategy={(cl) => {
              setClientForStrategy(cl);
              setActiveTab("strategy");
            }}
          />
        )}

        {activeTab === "strategy" && (
          <BrandProfileView
            workspace={activeWorkspace}
            clients={clients}
            initialClient={clientForStrategy}
            repo={repo}
          />
        )}

        {activeTab === "briefings" && (
          <BriefingsView
            workspace={activeWorkspace}
            clients={clients}
            initialClient={clientForStrategy}
            repo={repo}
          />
        )}

        {activeTab === "projects" && (
          <ProjectsView
            workspace={activeWorkspace}
            clients={clients}
            repo={repo}
          />
        )}

        {activeTab === "calendar" && (
          <EditorialCalendarView
            workspace={activeWorkspace}
            clients={clients}
            projects={projects}
            deliverables={deliverables}
            repo={repo}
            onRefresh={() => loadWorkspaceData(activeWorkspace.id)}
          />
        )}

        {activeTab === "approvals" && (
          <ApprovalsView
            workspace={activeWorkspace}
            clients={clients}
            deliverables={deliverables}
            repo={repo}
            onRefresh={() => loadWorkspaceData(activeWorkspace.id)}
          />
        )}

        {activeTab === "finance" && (
          <FinanceView
            workspace={activeWorkspace}
            clients={clients}
            projects={projects}
            repo={repo}
          />
        )}
      </main>

      {/* Global AI Assistant Modal */}
      {aiModalOpen && (
        <AiAssistantModal
          workspace={activeWorkspace}
          clients={clients}
          deliverables={deliverables}
          onClose={() => setAiModalOpen(false)}
        />
      )}
    </div>
  );
};
