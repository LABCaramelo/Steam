-- =============================================================================================
-- Ferramenta de Administração do LAB (painel, métricas, gestão de ferramentas e usuários)
-- Execute no SQL Editor do Supabase (projeto fzhzpzxsttflgtassyex).
-- =============================================================================================

-- 1. Garantir que is_lab_admin verifique tanto lab_admins quanto profiles.role = 'admin'
create or replace function public.is_lab_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.lab_admins where user_id = auth.uid())
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 2. Registrar a ferramenta admin em lab_tools
insert into public.lab_tools (slug, appid, name, price_cents, available)
values ('admin', 8, 'Administração do LAB', 0, true)
on conflict (slug) do update set
  appid = excluded.appid,
  name = excluded.name,
  available = excluded.available;

-- 3. Métricas gerais do LAB
create or replace function public.admin_get_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_stats jsonb;
begin
  if not public.is_lab_admin() then
    raise exception 'Acesso negado: apenas administradores do LAB.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'active_users', (select count(*) from public.profiles where access_status = 'active'),
    'pending_users', (select count(*) from public.profiles where access_status = 'pending'),
    'blocked_users', (select count(*) from public.profiles where access_status = 'blocked'),
    'admin_users', (select count(*) from public.profiles where role = 'admin' or id in (select user_id from public.lab_admins)),
    'total_tools', (select count(*) from public.lab_tools where slug <> 'admin'),
    'published_tools', (select count(*) from public.lab_tools where available = true and slug <> 'admin'),
    'unreleased_tools', (select count(*) from public.lab_tools where available = false and slug <> 'admin'),
    'total_acquisitions', (select count(*) from public.user_tools where tool_slug <> 'admin'),
    'whatsapp_verified', (select count(*) from public.lab_access where member_at is not null)
  ) into v_stats;

  return v_stats;
end;
$$;

-- 4. Lista de ferramentas com total de posses
create or replace function public.admin_get_tools()
returns table (
  slug text,
  appid integer,
  name text,
  price_cents integer,
  available boolean,
  created_at timestamptz,
  owners_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_lab_admin() then
    raise exception 'Acesso negado: apenas administradores do LAB.' using errcode = '42501';
  end if;

  return query
  select 
    t.slug,
    t.appid,
    t.name,
    t.price_cents,
    t.available,
    t.created_at,
    coalesce(count(u.user_id), 0)::bigint as owners_count
  from public.lab_tools t
  left join public.user_tools u on u.tool_slug = t.slug
  group by t.slug, t.appid, t.name, t.price_cents, t.available, t.created_at
  order by t.appid asc;
end;
$$;

-- 5. Publicar / despublicar ferramenta
create or replace function public.admin_set_tool_availability(p_slug text, p_available boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_lab_admin() then
    raise exception 'Acesso negado: apenas administradores do LAB.' using errcode = '42501';
  end if;

  update public.lab_tools
  set available = p_available
  where slug = p_slug;

  if not found then
    raise exception 'Ferramenta não encontrada: %', p_slug using errcode = 'P0002';
  end if;

  return jsonb_build_object('success', true, 'slug', p_slug, 'available', p_available);
end;
$$;

-- 6. Atualizar dados da ferramenta
create or replace function public.admin_update_tool(
  p_slug text,
  p_name text,
  p_price_cents integer,
  p_available boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_lab_admin() then
    raise exception 'Acesso negado: apenas administradores do LAB.' using errcode = '42501';
  end if;

  update public.lab_tools
  set 
    name = coalesce(nullif(btrim(p_name), ''), name),
    price_cents = greatest(0, coalesce(p_price_cents, price_cents)),
    available = coalesce(p_available, available)
  where slug = p_slug;

  if not found then
    raise exception 'Ferramenta não encontrada: %', p_slug using errcode = 'P0002';
  end if;

  return jsonb_build_object('success', true, 'slug', p_slug);
end;
$$;

-- 7. Listar usuários com dados de perfil, status e ferramentas
create or replace function public.admin_get_users(
  p_search text default null,
  p_role text default null,
  p_status text default null
)
returns table (
  id uuid,
  name text,
  email text,
  nickname text,
  avatar_url text,
  bio text,
  role text,
  access_status text,
  blocked_reason text,
  created_at timestamptz,
  last_active_at timestamptz,
  is_admin boolean,
  tools_count bigint,
  tools_owned text[],
  whatsapp text,
  whatsapp_verified boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_search text := nullif(btrim(p_search), '');
begin
  if not public.is_lab_admin() then
    raise exception 'Acesso negado: apenas administradores do LAB.' using errcode = '42501';
  end if;

  return query
  select 
    p.id,
    p.name,
    p.email,
    p.nickname,
    p.avatar_url,
    p.bio,
    p.role::text,
    p.access_status::text,
    p.blocked_reason,
    p.created_at,
    p.last_active_at,
    (p.role = 'admin' or exists (select 1 from public.lab_admins la where la.user_id = p.id)) as is_admin,
    count(distinct ut.tool_slug)::bigint as tools_count,
    coalesce(array_agg(distinct ut.tool_slug) filter (where ut.tool_slug is not null), '{}') as tools_owned,
    acc.whatsapp,
    (acc.member_at is not null) as whatsapp_verified
  from public.profiles p
  left join public.user_tools ut on ut.user_id = p.id
  left join public.lab_access acc on acc.user_id = p.id
  where (v_search is null or (
    p.name ilike '%' || v_search || '%' or
    p.email ilike '%' || v_search || '%' or
    coalesce(p.nickname, '') ilike '%' || v_search || '%' or
    coalesce(acc.whatsapp, '') ilike '%' || v_search || '%'
  ))
  and (p_role is null or p.role::text = p_role)
  and (p_status is null or p.access_status::text = p_status)
  group by p.id, p.name, p.email, p.nickname, p.avatar_url, p.bio, p.role, p.access_status, p.blocked_reason, p.created_at, p.last_active_at, acc.whatsapp, acc.member_at
  order by p.created_at desc;
end;
$$;

-- 8. Alterar cargo de usuário (admin vs member/student)
create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_lab_admin() then
    raise exception 'Acesso negado: apenas administradores do LAB.' using errcode = '42501';
  end if;

  if p_role not in ('admin', 'member', 'student') then
    raise exception 'Cargo inválido: %', p_role using errcode = '22023';
  end if;

  update public.profiles
  set role = p_role::public.user_role
  where id = p_user_id;

  if not found then
    raise exception 'Usuário não encontrado: %', p_user_id using errcode = 'P0002';
  end if;

  if p_role = 'admin' then
    insert into public.lab_admins (user_id) values (p_user_id) on conflict do nothing;
  else
    delete from public.lab_admins where user_id = p_user_id;
  end if;

  return jsonb_build_object('success', true, 'user_id', p_user_id, 'role', p_role);
end;
$$;

-- 9. Alterar status de acesso de usuário (active, pending, blocked)
create or replace function public.admin_set_user_status(
  p_user_id uuid,
  p_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_lab_admin() then
    raise exception 'Acesso negado: apenas administradores do LAB.' using errcode = '42501';
  end if;

  if p_status not in ('active', 'pending', 'blocked') then
    raise exception 'Status inválido: %', p_status using errcode = '22023';
  end if;

  update public.profiles
  set 
    access_status = p_status::public.access_status,
    blocked_reason = case when p_status = 'blocked' then p_reason else null end
  where id = p_user_id;

  if not found then
    raise exception 'Usuário não encontrado: %', p_user_id using errcode = 'P0002';
  end if;

  return jsonb_build_object('success', true, 'user_id', p_user_id, 'status', p_status);
end;
$$;

-- 10. Atualizar acquire_tool para permitir que admins adquiram e bloquear admin para não-admins
create or replace function public.acquire_tool(p_slug text) returns public.user_tools
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  tool public.lab_tools;
  result public.user_tools;
  is_admin boolean := public.is_lab_admin();
begin
  if uid is null then
    raise exception 'Entre no LAB para adquirir ferramentas.' using errcode = '28000';
  end if;
  select * into tool from public.lab_tools where slug = p_slug;
  if not found then
    raise exception 'Esta ferramenta não está disponível na loja.' using errcode = 'P0002';
  end if;
  if p_slug = 'admin' and not is_admin then
    raise exception 'Esta ferramenta é restrita a administradores do LAB.' using errcode = '42501';
  end if;
  if not tool.available and not (is_admin and p_slug = 'admin') then
    raise exception 'Em breve: esta ferramenta ainda não pode ser adquirida.' using errcode = 'P0002';
  end if;
  if tool.price_cents > 0 then
    raise exception 'Esta ferramenta ainda não pode ser adquirida pela loja.' using errcode = 'P0001';
  end if;
  if not public.lab_member() then
    raise exception 'Confirme seu acesso ao LAB antes de adquirir ferramentas.' using errcode = '42501';
  end if;
  insert into public.user_tools (user_id, tool_slug) values (uid, p_slug) on conflict do nothing;
  select * into result from public.user_tools where user_id = uid and tool_slug = p_slug;
  return result;
end $$;

-- Permissões de execução
revoke all on function public.admin_get_stats() from public, anon;
grant execute on function public.admin_get_stats() to authenticated;

revoke all on function public.admin_get_tools() from public, anon;
grant execute on function public.admin_get_tools() to authenticated;

revoke all on function public.admin_set_tool_availability(text, boolean) from public, anon;
grant execute on function public.admin_set_tool_availability(text, boolean) to authenticated;

revoke all on function public.admin_update_tool(text, text, integer, boolean) from public, anon;
grant execute on function public.admin_update_tool(text, text, integer, boolean) to authenticated;

revoke all on function public.admin_get_users(text, text, text) from public, anon;
grant execute on function public.admin_get_users(text, text, text) to authenticated;

revoke all on function public.admin_set_user_role(uuid, text) from public, anon;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

revoke all on function public.admin_set_user_status(uuid, text, text) from public, anon;
grant execute on function public.admin_set_user_status(uuid, text, text) to authenticated;

revoke all on function public.acquire_tool(text) from public, anon;
grant execute on function public.acquire_tool(text) to authenticated;
