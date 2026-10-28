-- Trama: aplicar depois de lab-access.sql e lab-tools.sql.
-- Evolui Automation sem mudar appid, slug, preço, disponibilidade ou aquisições.
-- Os planejamentos automation_* anteriores permanecem intactos.

create schema if not exists trama_private;
revoke all on schema trama_private from public, anon;
grant usage on schema trama_private to authenticated;

create table if not exists public.automation_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tool_slug text not null default 'automation' check (tool_slug = 'automation'),
  revision integer not null default 0 check (revision >= 0),
  state jsonb not null default '{"documents":[],"events":{}}',
  lease_token uuid,
  lease_expires_at timestamptz,
  updated_at timestamptz not null default now(),
  foreign key (user_id, tool_slug) references public.user_tools(user_id, tool_slug) on delete cascade,
  constraint trama_state_shape check (jsonb_typeof(state) = 'object' and jsonb_typeof(state->'documents') = 'array' and jsonb_typeof(state->'events') = 'object'),
  constraint trama_state_size check (octet_length(state::text) <= 8388608)
);
alter table public.automation_workspaces enable row level security;
revoke all on public.automation_workspaces from public, anon, authenticated;
grant select(user_id, revision, state, updated_at) on public.automation_workspaces to authenticated;
drop policy if exists trama_workspace_read on public.automation_workspaces;
create policy trama_workspace_read on public.automation_workspaces for select to authenticated
  using (user_id = (select auth.uid()) and (select public.has_tool('automation')));

-- Supabase expõe somente wrappers INVOKER. Funções privilegiadas ficam neste schema dedicado,
-- fora do Data API. Cada caminho valida a conta e a aquisição, inclusive depois de uma remoção.
create or replace function trama_private.lock_owner() returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.has_tool('automation') then
    raise exception 'A Trama não está disponível na sua biblioteca.' using errcode = '42501';
  end if;
  perform 1 from public.user_tools where user_id = v_uid and tool_slug = 'automation' for share;
  if not found then raise exception 'A ferramenta foi removida.' using errcode = '42501'; end if;
  return v_uid;
end $$;
revoke all on function trama_private.lock_owner() from public, anon, authenticated;

create or replace function trama_private.acquire_workspace() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := trama_private.lock_owner(); v_row public.automation_workspaces; v_token uuid := gen_random_uuid();
begin
  insert into public.automation_workspaces(user_id) values (v_uid) on conflict do nothing;
  select * into v_row from public.automation_workspaces where user_id = v_uid for update;
  if v_row.lease_token is not null and v_row.lease_expires_at > clock_timestamp() then
    raise exception 'Outra operação está usando este espaço.' using errcode = '55P03';
  end if;
  update public.automation_workspaces set lease_token = v_token, lease_expires_at = clock_timestamp() + interval '90 seconds' where user_id = v_uid;
  return jsonb_build_object('state', v_row.state, 'revision', v_row.revision, 'lease_token', v_token);
end $$;

create or replace function trama_private.commit_workspace(p_revision integer, p_lease_token uuid, p_state jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := trama_private.lock_owner(); v_revision integer;
begin
  if p_state is null or jsonb_typeof(p_state) <> 'object' or jsonb_typeof(p_state->'documents') is distinct from 'array'
     or jsonb_typeof(p_state->'events') is distinct from 'object' or octet_length(p_state::text) > 8388608 then
    raise exception 'Snapshot inválido ou maior que 8 MB.' using errcode = '22023';
  end if;
  update public.automation_workspaces
    set state = p_state, revision = revision + 1, updated_at = clock_timestamp(), lease_expires_at = clock_timestamp() + interval '90 seconds'
    where user_id = v_uid and revision = p_revision and lease_token = p_lease_token and lease_expires_at > clock_timestamp()
    returning revision into v_revision;
  if not found then raise exception 'O espaço mudou ou o bloqueio expirou.' using errcode = '40001'; end if;
  return v_revision;
end $$;

create or replace function trama_private.release_workspace(p_lease_token uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sessão necessária.' using errcode = '42501'; end if;
  -- Pode liberar um lease após a perda do acesso ao LAB, mas não alterar o conteúdo.
  update public.automation_workspaces set lease_token = null, lease_expires_at = null
    where user_id = v_uid and lease_token = p_lease_token;
  return found;
end $$;

revoke all on function trama_private.acquire_workspace() from public, anon, authenticated;
revoke all on function trama_private.commit_workspace(integer,uuid,jsonb) from public, anon, authenticated;
revoke all on function trama_private.release_workspace(uuid) from public, anon, authenticated;
grant execute on function trama_private.acquire_workspace(), trama_private.commit_workspace(integer,uuid,jsonb), trama_private.release_workspace(uuid) to authenticated;

create or replace function public.acquire_trama_workspace() returns jsonb
language sql volatile security invoker set search_path = '' as $$ select trama_private.acquire_workspace(); $$;
create or replace function public.commit_trama_workspace(p_revision integer, p_lease_token uuid, p_state jsonb) returns integer
language sql volatile security invoker set search_path = '' as $$ select trama_private.commit_workspace(p_revision,p_lease_token,p_state); $$;
create or replace function public.release_trama_workspace(p_lease_token uuid) returns boolean
language sql volatile security invoker set search_path = '' as $$ select trama_private.release_workspace(p_lease_token); $$;
revoke all on function public.acquire_trama_workspace(), public.commit_trama_workspace(integer,uuid,jsonb), public.release_trama_workspace(uuid) from public, anon, authenticated;
grant execute on function public.acquire_trama_workspace(), public.commit_trama_workspace(integer,uuid,jsonb), public.release_trama_workspace(uuid) to authenticated;

create table if not exists public.automation_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.automation_workspaces(user_id) on delete cascade,
  name text not null check (char_length(name) between 1 and 180),
  mime text not null check (mime in ('text/plain','text/csv','application/json','application/pdf','image/png','image/jpeg')),
  size_bytes integer not null check (size_bytes between 1 and 2097152),
  r2_key text not null unique,
  created_at timestamptz not null default now(),
  constraint trama_file_key check (r2_key = 'trama/' || user_id::text || '/' || id::text)
);
create index if not exists automation_files_user_created_idx on public.automation_files(user_id,created_at desc);
alter table public.automation_files enable row level security;
revoke all on public.automation_files from public, anon, authenticated;
grant select, insert, delete on public.automation_files to authenticated;
drop policy if exists trama_files_read on public.automation_files;
create policy trama_files_read on public.automation_files for select to authenticated
  using (user_id = (select auth.uid()) and (select public.has_tool('automation')));
drop policy if exists trama_files_insert on public.automation_files;
create policy trama_files_insert on public.automation_files for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.has_tool('automation')));
drop policy if exists trama_files_delete on public.automation_files;
create policy trama_files_delete on public.automation_files for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.has_tool('automation')));

create or replace function trama_private.file_quota() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := trama_private.lock_owner(); v_count bigint; v_bytes bigint;
begin
  if new.user_id is distinct from v_uid then raise exception 'Arquivo de outra conta.' using errcode = '42501'; end if;
  perform 1 from public.automation_workspaces where user_id = v_uid for update;
  select count(*), coalesce(sum(size_bytes),0) into v_count,v_bytes from public.automation_files where user_id = v_uid;
  if v_count >= 200 or v_bytes + new.size_bytes > 104857600 then raise exception 'Limite de 200 arquivos ou 100 MB atingido.' using errcode = '22023'; end if;
  return new;
end $$;
revoke all on function trama_private.file_quota() from public, anon, authenticated;
drop trigger if exists trama_file_quota on public.automation_files;
create trigger trama_file_quota before insert on public.automation_files for each row execute function trama_private.file_quota();

-- A remoção da aquisição apaga metadados por FK. Esta fila conserva as chaves para limpeza física
-- do R2 pelo servidor; os objetos ficam privados e sem acesso do usuário desde a remoção.
create table if not exists trama_private.r2_gc (
  r2_key text primary key,
  queued_at timestamptz not null default now()
);
alter table trama_private.r2_gc enable row level security;
revoke all on trama_private.r2_gc from public, anon, authenticated;
grant usage on schema trama_private to service_role;
grant select, delete on trama_private.r2_gc to service_role;
create or replace function trama_private.queue_file_delete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into trama_private.r2_gc(r2_key) values (old.r2_key) on conflict do nothing;
  return old;
end $$;
revoke all on function trama_private.queue_file_delete() from public, anon, authenticated;
drop trigger if exists trama_file_cleanup on public.automation_files;
create trigger trama_file_cleanup after delete on public.automation_files for each row execute function trama_private.queue_file_delete();

-- A fila privada continua fora do Data API. Somente manutenção com service_role pode lê-la.
create or replace function public.pending_trama_file_cleanup(p_limit integer default 100)
returns table(r2_key text, queued_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select gc.r2_key,gc.queued_at from trama_private.r2_gc gc
  order by gc.queued_at limit least(100,greatest(1,coalesce(p_limit,100)));
$$;
create or replace function public.confirm_trama_file_cleanup(p_keys text[]) returns integer
language sql volatile security invoker set search_path = '' as $$
  with removed as (
    delete from trama_private.r2_gc where r2_key = any(p_keys[1:100]) returning 1
  ) select count(*)::integer from removed;
$$;
revoke all on function public.pending_trama_file_cleanup(integer), public.confirm_trama_file_cleanup(text[]) from public, anon, authenticated;
grant execute on function public.pending_trama_file_cleanup(integer), public.confirm_trama_file_cleanup(text[]) to service_role;

update public.lab_tools set name = 'Trama' where slug = 'automation';
notify pgrst, 'reload schema';
