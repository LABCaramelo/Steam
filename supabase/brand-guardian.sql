-- ==============================================================================
-- Brand Guardian — Plataforma de Identidade Visual e Design System (LAB Caramelo)
-- Aplicar no Supabase após lab-access.sql e creative-os.sql.
-- ==============================================================================

begin;

-- 1. Registro no Catálogo Oficial de Ferramentas do LAB (AppID 19)
insert into public.lab_tools (slug, appid, name, available, stage)
values ('brand-guardian', 19, 'Brand Guardian', true, 'beta')
on conflict (slug) do update set
  appid = excluded.appid,
  name = excluded.name,
  available = excluded.available,
  stage = excluded.stage;

-- 2. Tabela Mestre de Marcas (Brand Guardian Brands)
create table if not exists public.brand_guardian_brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.creative_os_workspaces (id) on delete set null,
  client_id uuid references public.creative_os_clients (id) on delete set null,
  owner_id uuid references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  kind text not null default 'client' check (kind in ('agency', 'client', 'personal', 'project')),
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'published', 'archived')),
  logo_url text not null default '',
  primary_color text not null default '#FF701A',
  accent_color text not null default '#25BFFF',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists idx_brand_guardian_brands_owner on public.brand_guardian_brands(owner_id);
create index if not exists idx_brand_guardian_brands_workspace on public.brand_guardian_brands(workspace_id);
create index if not exists idx_brand_guardian_brands_client on public.brand_guardian_brands(client_id);
create index if not exists idx_brand_guardian_brands_slug on public.brand_guardian_brands(slug);

-- 3. Ativos da Marca (Brand Assets)
create table if not exists public.brand_guardian_assets (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brand_guardian_brands (id) on delete cascade,
  workspace_id uuid references public.creative_os_workspaces (id) on delete set null,
  owner_id uuid references auth.users (id) on delete cascade,
  kind text not null default 'image' check (kind in ('logo', 'image', 'vector', 'font', 'pdf', 'video', 'icon', 'document', 'other')),
  name text not null check (char_length(name) between 1 and 255),
  storage_key text not null default '',
  url text not null,
  mime_type text not null default 'application/octet-stream',
  file_size bigint not null default 0,
  approval_status text not null default 'approved' check (approval_status in ('draft', 'review', 'approved', 'deprecated')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_brand_guardian_assets_brand on public.brand_guardian_assets(brand_id);
create index if not exists idx_brand_guardian_assets_owner on public.brand_guardian_assets(owner_id);

-- 4. Releases e Snapshots Versionados (Governança e Imutabilidade)
create table if not exists public.brand_guardian_releases (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brand_guardian_brands (id) on delete cascade,
  version text not null check (char_length(version) between 1 and 30),
  release_notes text not null default '',
  snapshot jsonb not null,
  published_by uuid references auth.users (id) on delete set null,
  published_at timestamptz not null default now()
);

create index if not exists idx_brand_guardian_releases_brand on public.brand_guardian_releases(brand_id);

-- 5. Row Level Security (RLS)
alter table public.brand_guardian_brands enable row level security;
alter table public.brand_guardian_assets enable row level security;
alter table public.brand_guardian_releases enable row level security;

drop policy if exists "brand_guardian_brands_owner_all" on public.brand_guardian_brands;
create policy "brand_guardian_brands_owner_all" on public.brand_guardian_brands
  for all to authenticated
  using (
    owner_id = auth.uid() or
    (workspace_id is not null and exists (
      select 1 from public.creative_os_workspaces w where w.id = workspace_id and w.owner_id = auth.uid()
    ))
  )
  with check (
    owner_id = auth.uid() or
    (workspace_id is not null and exists (
      select 1 from public.creative_os_workspaces w where w.id = workspace_id and w.owner_id = auth.uid()
    ))
  );

drop policy if exists "brand_guardian_assets_owner_all" on public.brand_guardian_assets;
create policy "brand_guardian_assets_owner_all" on public.brand_guardian_assets
  for all to authenticated
  using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.brand_guardian_brands b where b.id = brand_id and b.owner_id = auth.uid()
    )
  )
  with check (
    owner_id = auth.uid() or
    exists (
      select 1 from public.brand_guardian_brands b where b.id = brand_id and b.owner_id = auth.uid()
    )
  );

drop policy if exists "brand_guardian_releases_owner_all" on public.brand_guardian_releases;
create policy "brand_guardian_releases_owner_all" on public.brand_guardian_releases
  for all to authenticated
  using (
    exists (
      select 1 from public.brand_guardian_brands b where b.id = brand_id and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.brand_guardian_brands b where b.id = brand_id and b.owner_id = auth.uid()
    )
  );

commit;
