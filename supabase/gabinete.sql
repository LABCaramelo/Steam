-- ==============================================================================
-- GABINETE — Sistema de Gestão Editorial, Equipe e Bastidor para o LAB Caramelo
-- Integrado com Supabase, RLS e isolamento por conta.
-- ==============================================================================

begin;

-- 1. Registro no Catálogo Oficial de Ferramentas do LAB
insert into public.lab_tools (slug, appid, name, available)
values ('gabinete', 11, 'Gabinete', true)
on conflict (slug) do update set appid = excluded.appid, name = excluded.name, available = excluded.available;

-- 2. Tabela de Workspaces (Estúdios / Gabinetes)
create table if not exists public.gabinete_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  service_type text not null default 'head_de_conteudo',
  agency_level text not null default 'Agência Bronze I',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create index if not exists idx_gabinete_ws_owner on public.gabinete_workspaces(owner_id);

-- 3. Clientes e Marcas
create table if not exists public.gabinete_clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.gabinete_workspaces (id) on delete cascade,
  name text not null,
  category text not null default 'ativos',
  segment text not null default 'Geral',
  status text not null default 'active',
  monthly_fee_cents integer not null default 0,
  currency text not null default 'BRL',
  color text not null default '#FF701A',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Demandas e Tarefas Operacionais
create table if not exists public.gabinete_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.gabinete_workspaces (id) on delete cascade,
  client_id uuid references public.gabinete_clients (id) on delete set null,
  title text not null,
  description text not null default '',
  status text not null default 'todo',
  priority text not null default 'medium',
  due_date date,
  assignee_name text not null default 'Luiz (eu)',
  checklist jsonb not null default '[]'::jsonb,
  is_archived boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Entregas Editoriais & Grade de Conteúdo
create table if not exists public.gabinete_deliverables (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.gabinete_workspaces (id) on delete cascade,
  client_id uuid not null references public.gabinete_clients (id) on delete cascade,
  title text not null,
  format text not null default 'carrossel',
  channel text not null default 'instagram',
  description text not null default '',
  scheduled_date date,
  scheduled_time text not null default '18:00',
  status text not null default 'idea',
  cover_url text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Compartilhamentos de Aprovação por Link Seguro (Portal do Cliente)
create table if not exists public.gabinete_shares (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.gabinete_workspaces (id) on delete cascade,
  client_id uuid not null references public.gabinete_clients (id) on delete cascade,
  token text not null unique,
  name text not null default 'Link Seguro de Aprovação',
  expires_at timestamptz not null default (now() + interval '30 days'),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

commit;
