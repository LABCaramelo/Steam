-- Caderno — AppFlowy Open Workspace no LAB
-- Sincronização e armazenamento de páginas e bases de dados

create table if not exists public.caderno_pages (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_id text,
  title text not null default 'Página Sem Título',
  icon text,
  cover text,
  is_favorite boolean not null default false,
  is_database boolean not null default false,
  database_data jsonb,
  blocks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, user_id)
);

alter table public.caderno_pages enable row level security;

create policy "caderno_pages_user_read"
  on public.caderno_pages for select
  using (auth.uid() = user_id);

create policy "caderno_pages_user_insert"
  on public.caderno_pages for insert
  with check (auth.uid() = user_id);

create policy "caderno_pages_user_update"
  on public.caderno_pages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "caderno_pages_user_delete"
  on public.caderno_pages for delete
  using (auth.uid() = user_id);

create index if not exists idx_caderno_pages_user_parent on public.caderno_pages (user_id, parent_id);
create index if not exists idx_caderno_pages_user_fav on public.caderno_pages (user_id, is_favorite);
