-- ==============================================================================
-- LAB Caramelo · Índices do Creative OS
-- Colunas que o app filtra (src/tools/creative-os/repo.ts) e que ainda não tinham índice.
-- Só cria índices: não muda dados nem políticas. Pode ser rodado de novo.
-- ==============================================================================

-- getProjects(workspace_id) ordena por created_at
create index if not exists idx_creative_os_projects_workspace on public.creative_os_projects (workspace_id, created_at desc);

-- getDeliverables(workspace_id) ordena por created_at
create index if not exists idx_creative_os_deliverables_workspace on public.creative_os_deliverables (workspace_id, created_at desc);

-- aprovações embutidas em getDeliverables (approvals:creative_os_approvals), ligadas por deliverable_id
create index if not exists idx_creative_os_approvals_deliverable on public.creative_os_approvals (deliverable_id);

-- getWorkspaceTasks(workspace_id) ordena por position (uma consulta no lugar de uma por projeto)
create index if not exists idx_creative_os_tasks_workspace on public.creative_os_tasks (workspace_id, position);

-- getBriefings(client_id) ordena por created_at
create index if not exists idx_creative_os_briefings_client on public.creative_os_briefings (client_id, created_at desc);

-- getBriefingTemplates(workspace_id)
create index if not exists idx_creative_os_briefing_templates_workspace on public.creative_os_briefing_templates (workspace_id);

-- getClientShares(client_id) com is_active e expires_at
create index if not exists idx_creative_os_shares_client on public.creative_os_client_shares (client_id, created_at desc);
