-- ==============================================================================
-- Creative OS — Sistema Operacional Nativo para Estúdios e Operações Criativas
-- Aplicar no Supabase após lab-access.sql e lab-tools.sql.
-- ==============================================================================

begin;

-- 1. Registro no Catálogo da Loja
insert into public.lab_tools (slug, appid, name, available)
values ('creative-os', 11, 'Creative OS', true)
on conflict (slug) do update set appid = excluded.appid, name = excluded.name, available = excluded.available;

-- 2. Tabela de Workspaces (Estúdios)
create table if not exists public.creative_os_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  service_type text not null default 'head_de_conteudo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create index if not exists idx_creative_os_workspaces_owner on public.creative_os_workspaces(owner_id);

-- 3. Membros do Workspace
create table if not exists public.creative_os_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.creative_os_workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'collaborator')),
  invited_email text not null default '',
  status text not null default 'active' check (status in ('active', 'pending', 'revoked')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists idx_creative_os_members_workspace on public.creative_os_members(workspace_id);
create index if not exists idx_creative_os_members_user on public.creative_os_members(user_id);

-- 4. Função de autorização de workspace
create or replace function public.creative_os_has_access(p_workspace_id uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select public.has_tool('creative-os')
    and exists (
      select 1 from public.creative_os_workspaces w
      where w.id = p_workspace_id and w.owner_id = auth.uid()
      union
      select 1 from public.creative_os_members m
      where m.workspace_id = p_workspace_id and m.user_id = auth.uid() and m.status = 'active'
    );
$$;

revoke all on function public.creative_os_has_access(uuid) from public, anon;
grant execute on function public.creative_os_has_access(uuid) to authenticated;

-- 5. Clientes
create table if not exists public.creative_os_clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.creative_os_workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  segment text not null default '',
  status text not null default 'active' check (status in ('active', 'lead', 'archived')),
  monthly_fee_cents integer not null default 0 check (monthly_fee_cents >= 0),
  currency text not null default 'BRL',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_creative_os_clients_workspace on public.creative_os_clients(workspace_id);

-- 6. Contatos do Cliente
create table if not exists public.creative_os_contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.creative_os_workspaces (id) on delete cascade,
  client_id uuid not null references public.creative_os_clients (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  email text not null default '',
  phone text not null default '',
  role_title text not null default '',
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_creative_os_contacts_client on public.creative_os_contacts(client_id);

-- 7. Pipeline Comercial (Oportunidades)
create table if not exists public.creative_os_opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.creative_os_workspaces (id) on delete cascade,
  client_id uuid references public.creative_os_clients (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  stage text not null default 'novo' check (stage in ('novo', 'qualificado', 'proposta', 'ganho', 'perdido')),
  estimated_value_cents integer not null default 0,
  next_action text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_creative_os_opportunities_workspace on public.creative_os_opportunities(workspace_id);

-- 8. Ficha Estratégica da Marca
create table if not exists public.creative_os_brand_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.creative_os_workspaces (id) on delete cascade,
  client_id uuid not null unique references public.creative_os_clients (id) on delete cascade,
  purpose text not null default '',
  offer text not null default '',
  target_personas text not null default '',
  positioning text not null default '',
  tone_of_voice text not null default '',
  visual_guidelines text not null default '',
  channels text not null default '',
  differentiators text not null default '',
  restrictions text not null default '',
  reference_links text[] not null default '{}',
  is_validated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_creative_os_brand_profiles_client on public.creative_os_brand_profiles(client_id);

-- 9. Modelos e Respostas de Briefing
create table if not exists public.creative_os_briefing_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.creative_os_workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  description text not null default '',
  sections jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.creative_os_briefings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.creative_os_workspaces (id) on delete cascade,
  client_id uuid not null references public.creative_os_clients (id) on delete cascade,
  template_id uuid references public.creative_os_briefing_templates (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  status text not null default 'draft' check (status in ('draft', 'sent_to_client', 'answered', 'reviewed')),
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 10. Propostas Comerciais
create table if not exists public.creative_os_proposals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.creative_os_workspaces (id) on delete cascade,
  client_id uuid not null references public.creative_os_clients (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  scope text not null default '',
  deliverables_summary text not null default '',
  price_cents integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined')),
  contract_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 11. Projetos & Campanhas
create table if not exists public.creative_os_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.creative_os_workspaces (id) on delete cascade,
  client_id uuid not null references public.creative_os_clients (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  template_type text not null default 'custom' check (template_type in ('monthly_management', 'launch', 'landing_page', 'custom')),
  status text not null default 'active' check (status in ('draft', 'active', 'completed', 'archived')),
  start_date date,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_creative_os_projects_client on public.creative_os_projects(client_id);

-- 12. Tarefas Operacionais
create table if not exists public.creative_os_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.creative_os_workspaces (id) on delete cascade,
  project_id uuid not null references public.creative_os_projects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 250),
  description text not null default '',
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'review', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date date,
  assignee_id uuid references auth.users (id) on delete set null,
  checklist jsonb not null default '[]'::jsonb,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_creative_os_tasks_project on public.creative_os_tasks(project_id);

-- 13. Entregas Editoriais (Peças de Conteúdo)
create table if not exists public.creative_os_deliverables (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.creative_os_workspaces (id) on delete cascade,
  project_id uuid not null references public.creative_os_projects (id) on delete cascade,
  client_id uuid not null references public.creative_os_clients (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 250),
  format text not null default 'carrossel' check (format in ('carrossel', 'reels_roteiro', 'estatico', 'artigo', 'video_longo', 'outro')),
  channel text not null default 'instagram' check (channel in ('instagram', 'linkedin', 'youtube', 'tiktok', 'site', 'outro')),
  description text not null default '',
  scheduled_date timestamptz,
  status text not null default 'idea' check (status in ('idea', 'production', 'internal_review', 'client_review', 'adjustments', 'approved', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_creative_os_deliverables_project on public.creative_os_deliverables(project_id);
create index if not exists idx_creative_os_deliverables_client on public.creative_os_deliverables(client_id);

-- 14. Versões de Entregas (Imutáveis)
create table if not exists public.creative_os_deliverable_versions (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references public.creative_os_deliverables (id) on delete cascade,
  version_number integer not null check (version_number >= 1),
  title text not null default '',
  copy_text text not null default '',
  slide_content jsonb not null default '[]'::jsonb,
  media_urls text[] not null default '{}',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (deliverable_id, version_number)
);

create index if not exists idx_creative_os_versions_deliverable on public.creative_os_deliverable_versions(deliverable_id);

-- 15. Decisões de Aprovação
create table if not exists public.creative_os_approvals (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references public.creative_os_deliverables (id) on delete cascade,
  version_id uuid not null references public.creative_os_deliverable_versions (id) on delete cascade,
  decided_by_name text not null,
  decided_by_email text not null default '',
  status text not null check (status in ('approved', 'changes_requested')),
  feedback_text text not null default '',
  decided_at timestamptz not null default now()
);

create index if not exists idx_creative_os_approvals_version on public.creative_os_approvals(version_id);

-- 16. Comentários (Internos vs Visíveis ao Cliente)
create table if not exists public.creative_os_comments (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references public.creative_os_deliverables (id) on delete cascade,
  version_id uuid references public.creative_os_deliverable_versions (id) on delete set null,
  author_id uuid references auth.users (id) on delete set null,
  author_name text not null check (char_length(author_name) between 1 and 120),
  is_internal boolean not null default false,
  comment_text text not null check (char_length(comment_text) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists idx_creative_os_comments_deliverable on public.creative_os_comments(deliverable_id);

-- 17. Compartilhamento do Portal do Cliente (Token Seguro)
create table if not exists public.creative_os_client_shares (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.creative_os_workspaces (id) on delete cascade,
  client_id uuid not null references public.creative_os_clients (id) on delete cascade,
  token text not null unique check (token ~ '^[a-zA-Z0-9_-]{16,64}$'),
  name text not null default 'Portal de Aprovações',
  expires_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_creative_os_shares_token on public.creative_os_client_shares(token);

-- 18. Controle Financeiro Leve
create table if not exists public.creative_os_financial_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.creative_os_workspaces (id) on delete cascade,
  project_id uuid references public.creative_os_projects (id) on delete cascade,
  client_id uuid references public.creative_os_clients (id) on delete cascade,
  type text not null check (type in ('revenue_expected', 'revenue_received', 'expense')),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'BRL',
  date date not null default current_date,
  description text not null check (char_length(description) between 1 and 250),
  category text not null default 'servico',
  created_at timestamptz not null default now()
);

create index if not exists idx_creative_os_finance_workspace on public.creative_os_financial_entries(workspace_id);

-- ==============================================================================
-- Row Level Security (RLS) e Políticas de Acesso
-- ==============================================================================

alter table public.creative_os_workspaces enable row level security;
alter table public.creative_os_members enable row level security;
alter table public.creative_os_clients enable row level security;
alter table public.creative_os_contacts enable row level security;
alter table public.creative_os_opportunities enable row level security;
alter table public.creative_os_brand_profiles enable row level security;
alter table public.creative_os_briefing_templates enable row level security;
alter table public.creative_os_briefings enable row level security;
alter table public.creative_os_proposals enable row level security;
alter table public.creative_os_projects enable row level security;
alter table public.creative_os_tasks enable row level security;
alter table public.creative_os_deliverables enable row level security;
alter table public.creative_os_deliverable_versions enable row level security;
alter table public.creative_os_approvals enable row level security;
alter table public.creative_os_comments enable row level security;
alter table public.creative_os_client_shares enable row level security;
alter table public.creative_os_financial_entries enable row level security;

-- Grants para authenticated
grant select, insert, update, delete on public.creative_os_workspaces to authenticated;
grant select, insert, update, delete on public.creative_os_members to authenticated;
grant select, insert, update, delete on public.creative_os_clients to authenticated;
grant select, insert, update, delete on public.creative_os_contacts to authenticated;
grant select, insert, update, delete on public.creative_os_opportunities to authenticated;
grant select, insert, update, delete on public.creative_os_brand_profiles to authenticated;
grant select, insert, update, delete on public.creative_os_briefing_templates to authenticated;
grant select, insert, update, delete on public.creative_os_briefings to authenticated;
grant select, insert, update, delete on public.creative_os_proposals to authenticated;
grant select, insert, update, delete on public.creative_os_projects to authenticated;
grant select, insert, update, delete on public.creative_os_tasks to authenticated;
grant select, insert, update, delete on public.creative_os_deliverables to authenticated;
grant select, insert, update, delete on public.creative_os_deliverable_versions to authenticated;
grant select, insert, update, delete on public.creative_os_approvals to authenticated;
grant select, insert, update, delete on public.creative_os_comments to authenticated;
grant select, insert, update, delete on public.creative_os_client_shares to authenticated;
grant select, insert, update, delete on public.creative_os_financial_entries to authenticated;

-- Políticas de Workspaces
create policy "creative_os_workspaces_select" on public.creative_os_workspaces
  for select to authenticated
  using (public.has_tool('creative-os') and (owner_id = (select auth.uid()) or exists (select 1 from public.creative_os_members m where m.workspace_id = id and m.user_id = (select auth.uid()) and m.status = 'active')));

create policy "creative_os_workspaces_insert" on public.creative_os_workspaces
  for insert to authenticated
  with check (public.has_tool('creative-os') and owner_id = (select auth.uid()));

create policy "creative_os_workspaces_update" on public.creative_os_workspaces
  for update to authenticated
  using (public.has_tool('creative-os') and owner_id = (select auth.uid()))
  with check (public.has_tool('creative-os') and owner_id = (select auth.uid()));

create policy "creative_os_workspaces_delete" on public.creative_os_workspaces
  for delete to authenticated
  using (public.has_tool('creative-os') and owner_id = (select auth.uid()));

-- Políticas de Membros
create policy "creative_os_members_select" on public.creative_os_members
  for select to authenticated
  using (public.creative_os_has_access(workspace_id));

create policy "creative_os_members_insert" on public.creative_os_members
  for insert to authenticated
  with check (public.creative_os_has_access(workspace_id));

create policy "creative_os_members_update" on public.creative_os_members
  for update to authenticated
  using (public.creative_os_has_access(workspace_id))
  with check (public.creative_os_has_access(workspace_id));

create policy "creative_os_members_delete" on public.creative_os_members
  for delete to authenticated
  using (public.creative_os_has_access(workspace_id));

-- Políticas para Clientes, Contatos e Oportunidades
create policy "creative_os_clients_all" on public.creative_os_clients
  for all to authenticated
  using (public.creative_os_has_access(workspace_id))
  with check (public.creative_os_has_access(workspace_id));

create policy "creative_os_contacts_all" on public.creative_os_contacts
  for all to authenticated
  using (public.creative_os_has_access(workspace_id))
  with check (public.creative_os_has_access(workspace_id));

create policy "creative_os_opportunities_all" on public.creative_os_opportunities
  for all to authenticated
  using (public.creative_os_has_access(workspace_id))
  with check (public.creative_os_has_access(workspace_id));

-- Políticas para Contexto de Marca, Briefings e Propostas
create policy "creative_os_brand_profiles_all" on public.creative_os_brand_profiles
  for all to authenticated
  using (public.creative_os_has_access(workspace_id))
  with check (public.creative_os_has_access(workspace_id));

create policy "creative_os_briefing_templates_all" on public.creative_os_briefing_templates
  for all to authenticated
  using (public.creative_os_has_access(workspace_id))
  with check (public.creative_os_has_access(workspace_id));

create policy "creative_os_briefings_all" on public.creative_os_briefings
  for all to authenticated
  using (public.creative_os_has_access(workspace_id))
  with check (public.creative_os_has_access(workspace_id));

create policy "creative_os_proposals_all" on public.creative_os_proposals
  for all to authenticated
  using (public.creative_os_has_access(workspace_id))
  with check (public.creative_os_has_access(workspace_id));

-- Políticas para Projetos e Tarefas
create policy "creative_os_projects_all" on public.creative_os_projects
  for all to authenticated
  using (public.creative_os_has_access(workspace_id))
  with check (public.creative_os_has_access(workspace_id));

create policy "creative_os_tasks_all" on public.creative_os_tasks
  for all to authenticated
  using (public.creative_os_has_access(workspace_id))
  with check (public.creative_os_has_access(workspace_id));

-- Políticas para Entregas, Versões, Aprovações e Comentários
create policy "creative_os_deliverables_all" on public.creative_os_deliverables
  for all to authenticated
  using (public.creative_os_has_access(workspace_id))
  with check (public.creative_os_has_access(workspace_id));

create policy "creative_os_deliverable_versions_all" on public.creative_os_deliverable_versions
  for all to authenticated
  using (exists (select 1 from public.creative_os_deliverables d where d.id = deliverable_id and public.creative_os_has_access(d.workspace_id)))
  with check (exists (select 1 from public.creative_os_deliverables d where d.id = deliverable_id and public.creative_os_has_access(d.workspace_id)));

create policy "creative_os_approvals_all" on public.creative_os_approvals
  for all to authenticated
  using (exists (select 1 from public.creative_os_deliverables d where d.id = deliverable_id and public.creative_os_has_access(d.workspace_id)))
  with check (exists (select 1 from public.creative_os_deliverables d where d.id = deliverable_id and public.creative_os_has_access(d.workspace_id)));

create policy "creative_os_comments_all" on public.creative_os_comments
  for all to authenticated
  using (exists (select 1 from public.creative_os_deliverables d where d.id = deliverable_id and public.creative_os_has_access(d.workspace_id)))
  with check (exists (select 1 from public.creative_os_deliverables d where d.id = deliverable_id and public.creative_os_has_access(d.workspace_id)));

create policy "creative_os_client_shares_all" on public.creative_os_client_shares
  for all to authenticated
  using (public.creative_os_has_access(workspace_id))
  with check (public.creative_os_has_access(workspace_id));

create policy "creative_os_financial_entries_all" on public.creative_os_financial_entries
  for all to authenticated
  using (public.creative_os_has_access(workspace_id))
  with check (public.creative_os_has_access(workspace_id));

-- ==============================================================================
-- Funções RPC para o Portal Restrito do Cliente (Acesso por Token)
-- ==============================================================================

-- Leitura segura de entregas compartilhadas pelo portal
create or replace function public.creative_os_get_portal_data(p_token text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_share public.creative_os_client_shares%rowtype;
  v_client public.creative_os_clients%rowtype;
  v_workspace public.creative_os_workspaces%rowtype;
  v_brand public.creative_os_brand_profiles%rowtype;
  v_deliverables jsonb;
begin
  select * into v_share from public.creative_os_client_shares
  where token = p_token and is_active = true and expires_at > now();

  if not found then
    raise exception 'Link de aprovação inválido ou expirado.' using errcode = 'P0002';
  end if;

  select * into v_client from public.creative_os_clients where id = v_share.client_id;
  select * into v_workspace from public.creative_os_workspaces where id = v_share.workspace_id;
  select * into v_brand from public.creative_os_brand_profiles where client_id = v_share.client_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', d.id,
      'title', d.title,
      'format', d.format,
      'channel', d.channel,
      'description', d.description,
      'scheduled_date', d.scheduled_date,
      'status', d.status,
      'versions', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'id', v.id,
            'version_number', v.version_number,
            'title', v.title,
            'copy_text', v.copy_text,
            'slide_content', v.slide_content,
            'media_urls', v.media_urls,
            'created_at', v.created_at
          ) order by v.version_number desc
        ), '[]'::jsonb)
        from public.creative_os_deliverable_versions v
        where v.deliverable_id = d.id
      ),
      'approvals', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'version_id', a.version_id,
            'decided_by_name', a.decided_by_name,
            'status', a.status,
            'feedback_text', a.feedback_text,
            'decided_at', a.decided_at
          ) order by a.decided_at desc
        ), '[]'::jsonb)
        from public.creative_os_approvals a
        where a.deliverable_id = d.id
      ),
      'comments', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'version_id', c.version_id,
            'author_name', c.author_name,
            'comment_text', c.comment_text,
            'created_at', c.created_at
          ) order by c.created_at asc
        ), '[]'::jsonb)
        from public.creative_os_comments c
        where c.deliverable_id = d.id and c.is_internal = false
      )
    )
  ), '[]'::jsonb) into v_deliverables
  from public.creative_os_deliverables d
  where d.client_id = v_share.client_id
    and d.status in ('client_review', 'adjustments', 'approved', 'published');

  return jsonb_build_object(
    'workspace_name', v_workspace.name,
    'client_name', v_client.name,
    'brand_tone', coalesce(v_brand.tone_of_voice, ''),
    'deliverables', v_deliverables
  );
end $$;

revoke all on function public.creative_os_get_portal_data(text) from public;
grant execute on function public.creative_os_get_portal_data(text) to anon, authenticated;

-- Decisão de aprovação ou alteração pelo cliente
create or replace function public.creative_os_submit_client_decision(
  p_token text,
  p_deliverable_id uuid,
  p_version_id uuid,
  p_status text,
  p_feedback text,
  p_name text,
  p_email text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_share public.creative_os_client_shares%rowtype;
  v_deliverable public.creative_os_deliverables%rowtype;
  v_approval_id uuid;
begin
  select * into v_share from public.creative_os_client_shares
  where token = p_token and is_active = true and expires_at > now();

  if not found then
    raise exception 'Link de aprovação inválido ou expirado.' using errcode = 'P0002';
  end if;

  select * into v_deliverable from public.creative_os_deliverables
  where id = p_deliverable_id and client_id = v_share.client_id;

  if not found then
    raise exception 'Entrega não encontrada ou não compartilhada com este cliente.' using errcode = 'P0002';
  end if;

  if p_status not in ('approved', 'changes_requested') then
    raise exception 'Decisão inválida: use approved ou changes_requested.' using errcode = '22023';
  end if;

  -- Registra a aprovação vinculada à versão imutável
  insert into public.creative_os_approvals (deliverable_id, version_id, decided_by_name, decided_by_email, status, feedback_text)
  values (p_deliverable_id, p_version_id, p_name, p_email, p_status, p_feedback)
  returning id into v_approval_id;

  -- Atualiza o status da entrega
  update public.creative_os_deliverables
  set status = case when p_status = 'approved' then 'approved' else 'adjustments' end,
      updated_at = now()
  where id = p_deliverable_id;

  -- Adiciona o feedback como comentário público caso informado
  if char_length(trim(p_feedback)) > 0 then
    insert into public.creative_os_comments (deliverable_id, version_id, author_name, is_internal, comment_text)
    values (p_deliverable_id, p_version_id, p_name, false, p_feedback);
  end if;

  return jsonb_build_object('success', true, 'approval_id', v_approval_id, 'new_status', case when p_status = 'approved' then 'approved' else 'adjustments' end);
end $$;

revoke all on function public.creative_os_submit_client_decision(text, uuid, uuid, text, text, text, text) from public;
grant execute on function public.creative_os_submit_client_decision(text, uuid, uuid, text, text, text, text) to anon, authenticated;

-- ==============================================================================
-- Atualização da RPC release_tool para incluir Creative OS
-- ==============================================================================

create or replace function public.release_tool(p_slug text) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Entre no LAB para remover ferramentas.' using errcode = '28000';
  end if;
  if p_slug is null or p_slug not in ('prompt-library', 'kanban', 'prancheta', 'automation', 'academy', 'claquete', 'comunidade', 'gravador', 'montagem', 'creative-os') then
    raise exception 'Ferramenta não encontrada.' using errcode = 'P0002';
  end if;
  perform 1 from public.user_tools where user_id = uid and tool_slug = p_slug for update;
  if not found then
    return jsonb_build_object('slug', p_slug, 'removed', false);
  end if;

  case p_slug
    when 'prompt-library' then
      if to_regclass('public.caramelo_personal_prompts') is not null then
        execute 'delete from public.caramelo_personal_prompts where owner_user_id = $1' using uid;
      end if;
      if to_regclass('public.caramelo_prompt_observations') is not null then
        execute 'delete from public.caramelo_prompt_observations where user_id = $1' using uid;
      end if;
    when 'kanban' then
      delete from public.kanban_boards where user_id = uid;
    when 'prancheta' then
      delete from public.prancheta_files where user_id = uid;
    when 'automation' then
      delete from public.automation_fluxes where user_id = uid;
      delete from public.automation_connections where user_id = uid;
    when 'academy' then
      delete from public.academy_progress where user_id = uid;
      delete from public.academy_favorites where user_id = uid;
      delete from public.academy_notes where user_id = uid;
      delete from public.academy_comment_likes where user_id = uid;
      update public.academy_comments reply set parent_id = null
        where reply.user_id <> uid and reply.parent_id in (
          select id from public.academy_comments where user_id = uid
        );
      delete from public.academy_comments where user_id = uid;
    when 'claquete' then
      if to_regclass('public.flick_chat_threads') is not null then
        execute 'delete from public.flick_chat_threads where user_id = $1' using uid;
      end if;
      if to_regclass('public.flick_projects') is not null then
        execute 'delete from public.flick_projects where user_id = $1' using uid;
      end if;
    when 'creative-os' then
      -- Remove workspaces próprios e participações em outros workspaces
      delete from public.creative_os_workspaces where owner_id = uid;
      delete from public.creative_os_members where user_id = uid;
    else
      null; -- Comunidade, Montagem e No Ar têm dados locais separados por conta.
  end case;

  delete from public.user_tools where user_id = uid and tool_slug = p_slug;
  return jsonb_build_object('slug', p_slug, 'removed', true);
end $$;

revoke all on function public.release_tool(text) from public, anon;
grant execute on function public.release_tool(text) to authenticated;

commit;
