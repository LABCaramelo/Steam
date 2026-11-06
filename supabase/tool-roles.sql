-- Cargos e acesso às ferramentas do LAB.
-- Aplicar por último, após lab-tools.sql, lab-admin.sql e tool-auth.sql.
-- Não publica ferramentas, não muda cargos existentes e não apaga dados dos usuários.

-- O novo valor só é usado por casts em tempo de execução, depois do commit da migração.
alter type public.user_role add value if not exists 'beta';

alter table public.lab_tools add column if not exists stage text;
update public.lab_tools
set stage = case when slug in (
  'prancheta', 'automation', 'comunidade', 'montagem', 'creative-os',
  'gabinete', 'stories', 'logomotion', 'cap', 'voicestudio', 'caderno'
) then 'beta' else 'stable' end
where stage is null;
alter table public.lab_tools alter column stage set default 'stable';
alter table public.lab_tools alter column stage set not null;
alter table public.lab_tools drop constraint if exists lab_tools_stage_check;
alter table public.lab_tools add constraint lab_tools_stage_check check (stage in ('stable', 'beta'));

-- Completa o catálogo para que admins possam abrir inclusive as ferramentas ainda em desenvolvimento.
-- A disponibilidade de qualquer registro existente é preservada.
insert into public.lab_tools (slug, appid, name, available, stage) values
  ('stories', 14, 'Stories Maker', false, 'beta'),
  ('gabinete', 11, 'Gabinete', false, 'beta'),
  ('cap', 16, 'Cap', false, 'beta')
on conflict (slug) do nothing;

create or replace function public.is_lab_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$$
  select auth.uid() is not null
    and coalesce(auth.jwt()->>'is_anonymous', 'false') <> 'true'
    and exists (
      select 1 from public.profiles p where p.id = auth.uid()
        and p.access_status::text = 'active'
        and (p.role::text = 'admin' or exists (
          select 1 from public.lab_admins a where a.user_id = p.id
        ))
    );
$$;

create or replace function public.lab_member() returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  ok boolean;
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous', 'false') = 'true'
    or not exists (select 1 from public.profiles where id = auth.uid() and access_status::text = 'active') then
    return false;
  end if;
  if public.is_lab_admin() then return true; end if;
  if to_regclass('public.lab_access') is null then return true; end if;
  select exists (select 1 from public.lab_access
    where user_id = auth.uid() and verified_at is not null and member_at is not null) into ok;
  return ok;
end $$;

-- A posse antiga não permite contornar uma despublicação ou a retirada do cargo BETA.
create or replace function public.has_tool(p_slug text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select auth.uid() is not null
    and coalesce(auth.jwt()->>'is_anonymous', 'false') <> 'true'
    and (
      public.is_lab_admin()
      or exists (
        select 1 from public.lab_tools t
        where (t.slug = p_slug or (p_slug = 'creative-os' and t.slug = 'gabinete'))
          and t.slug <> 'admin'
          and t.available
          and public.lab_member()
          and (t.stage = 'stable' or exists (
            select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'beta'
          ))
          and (
            exists (select 1 from public.user_tools u where u.user_id = auth.uid() and u.tool_slug = t.slug)
            or (t.slug = 'gabinete' and exists (select 1 from public.user_tools u where u.user_id = auth.uid() and u.tool_slug = 'creative-os'))
          )
      )
    );
$$;

create or replace function public.acquire_tool(p_slug text) returns public.user_tools
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  tool public.lab_tools;
  result public.user_tools;
  admin_access boolean := public.is_lab_admin();
begin
  if uid is null or coalesce(auth.jwt()->>'is_anonymous', 'false') = 'true' then
    raise exception 'Entre no LAB para adquirir ferramentas.' using errcode = '28000';
  end if;
  if not public.lab_member() then
    raise exception 'Confirme seu acesso ao LAB antes de adquirir ferramentas.' using errcode = '42501';
  end if;
  select * into tool from public.lab_tools where slug = p_slug for share;
  if not found then
    raise exception 'Esta ferramenta não está disponível na loja.' using errcode = 'P0002';
  end if;
  if not admin_access then
    if p_slug = 'admin' then
      raise exception 'Esta ferramenta é restrita a administradores do LAB.' using errcode = '42501';
    end if;
    if not tool.available then
      raise exception 'Em breve: esta ferramenta ainda não pode ser adquirida.' using errcode = 'P0002';
    end if;
    if tool.stage = 'beta' and not exists (
      select 1 from public.profiles where id = uid and role::text = 'beta'
    ) then
      raise exception 'Esta ferramenta é exclusiva para usuários BETA.' using errcode = '42501';
    end if;
    if tool.price_cents > 0 then
      raise exception 'Esta ferramenta ainda não pode ser adquirida pela loja.' using errcode = 'P0001';
    end if;
  end if;
  insert into public.user_tools (user_id, tool_slug) values (uid, p_slug) on conflict do nothing;
  select * into result from public.user_tools where user_id = uid and tool_slug = p_slug;
  return result;
end $$;

-- Admins recebem acesso sem aquisição; os locks das gravações precisam reconhecer essa exceção.
create or replace function public.lock_tool_write() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  owner_id uuid := nullif(to_jsonb(new) ->> coalesce(tg_argv[1], 'user_id'), '')::uuid;
begin
  if uid is null or owner_id is distinct from uid or public.is_lab_admin() then return new; end if;
  perform 1 from public.user_tools where user_id = uid and tool_slug = tg_argv[0] for share;
  if not found then
    raise exception 'Esta ferramenta não está mais na sua biblioteca.' using errcode = '42501';
  end if;
  return new;
end $$;

create or replace function public.lock_project_tool_write() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  owner_id uuid;
begin
  if uid is null or new.project_id is null or public.is_lab_admin() then return new; end if;
  execute 'select user_id from public.flick_projects where id = $1' into owner_id using new.project_id;
  if owner_id is distinct from uid then return new; end if;
  perform 1 from public.user_tools where user_id = uid and tool_slug = 'claquete' for share;
  if not found then
    raise exception 'Esta ferramenta não está mais na sua biblioteca.' using errcode = '42501';
  end if;
  return new;
end $$;

create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_lab_admin() then
    raise exception 'Acesso negado: apenas administradores do LAB.' using errcode = '42501';
  end if;
  if p_role is null or p_role not in ('admin', 'member', 'student', 'beta') then
    raise exception 'Cargo inválido: %', p_role using errcode = '22023';
  end if;
  update public.profiles set role = p_role::public.user_role where id = p_user_id;
  if not found then
    raise exception 'Usuário não encontrado: %', p_user_id using errcode = 'P0002';
  end if;
  if p_role = 'admin' then
    insert into public.lab_admins (user_id) values (p_user_id) on conflict do nothing;
  else
    delete from public.lab_admins where user_id = p_user_id;
  end if;
  return jsonb_build_object('success', true, 'user_id', p_user_id, 'role', p_role);
end $$;

-- Nova assinatura mantém os quatro argumentos anteriores e adiciona estágio opcional.
drop function if exists public.admin_update_tool(text, text, integer, boolean);
create or replace function public.admin_update_tool(
  p_slug text, p_name text, p_price_cents integer, p_available boolean, p_stage text default null
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_lab_admin() then
    raise exception 'Acesso negado: apenas administradores do LAB.' using errcode = '42501';
  end if;
  if p_stage is not null and p_stage not in ('stable', 'beta') then
    raise exception 'Estágio inválido: %', p_stage using errcode = '22023';
  end if;
  update public.lab_tools set
    name = coalesce(nullif(btrim(p_name), ''), name),
    price_cents = greatest(0, coalesce(p_price_cents, price_cents)),
    available = coalesce(p_available, available),
    stage = coalesce(p_stage, stage)
  where slug = p_slug;
  if not found then
    raise exception 'Ferramenta não encontrada: %', p_slug using errcode = 'P0002';
  end if;
  return jsonb_build_object('success', true, 'slug', p_slug);
end $$;

drop function if exists public.admin_get_tools_v2();
create function public.admin_get_tools_v2()
returns table (
  slug text, appid integer, name text, price_cents integer, available boolean,
  custom_assets jsonb, created_at timestamptz, owners_count bigint, stage text
) language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_lab_admin() then
    raise exception 'Acesso negado: apenas administradores do LAB.' using errcode = '42501';
  end if;
  return query select t.slug, t.appid, t.name, t.price_cents, t.available,
    coalesce(t.custom_assets, '{}'::jsonb), t.created_at, count(u.user_id)::bigint, t.stage
  from public.lab_tools t left join public.user_tools u on u.tool_slug = t.slug
  group by t.slug, t.appid, t.name, t.price_cents, t.available, t.custom_assets, t.created_at, t.stage
  order by t.appid;
end $$;

-- Revoga só a aquisição. Diferente de release_tool, não faz limpeza dos dados da ferramenta.
create or replace function public.admin_revoke_user_tool(p_user_id uuid, p_tool_slug text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  was_revoked boolean;
begin
  if not public.is_lab_admin() then
    raise exception 'Acesso negado: apenas administradores do LAB.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Usuário não encontrado: %', p_user_id using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.lab_tools where slug = p_tool_slug) then
    raise exception 'Ferramenta não encontrada: %', p_tool_slug using errcode = 'P0002';
  end if;
  delete from public.user_tools where user_id = p_user_id and tool_slug = p_tool_slug;
  was_revoked := found;
  return jsonb_build_object('success', true, 'user_id', p_user_id, 'tool_slug', p_tool_slug, 'revoked', was_revoked);
end $$;

revoke all on function public.is_lab_admin(), public.lab_member(), public.has_tool(text),
  public.acquire_tool(text), public.admin_set_user_role(uuid, text),
  public.admin_update_tool(text, text, integer, boolean, text), public.admin_get_tools_v2(),
  public.admin_revoke_user_tool(uuid, text) from public, anon;
grant execute on function public.is_lab_admin(), public.lab_member(), public.has_tool(text),
  public.acquire_tool(text), public.admin_set_user_role(uuid, text),
  public.admin_update_tool(text, text, integer, boolean, text), public.admin_get_tools_v2(),
  public.admin_revoke_user_tool(uuid, text) to authenticated;
revoke all on function public.lock_tool_write(), public.lock_project_tool_write() from public, anon, authenticated;
