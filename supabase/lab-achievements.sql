-- =============================================================================================
-- Sistema de Conquistas do LAB e Governança Administrativa
-- Execute no SQL Editor do Supabase (projeto fzhzpzxsttflgtassyex).
-- =============================================================================================

create table if not exists public.lab_achievements (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  tool_slug text references public.lab_tools(slug) on delete cascade,
  appid integer references public.lab_tools(appid),
  name text not null,
  description text not null,
  icon text not null default '🏆',
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.lab_achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unlocked boolean not null default true,
  granted_by uuid references auth.users(id) on delete set null,
  primary key (user_id, achievement_id)
);

alter table public.lab_achievements enable row level security;
alter table public.user_achievements enable row level security;

create policy "lab_achievements_select" on public.lab_achievements for select using (true);

create policy "user_achievements_select" on public.user_achievements for select to authenticated
  using (user_id = (select auth.uid()) or public.is_lab_admin());

-- Sementes das conquistas canônicas do ecossistema LAB
insert into public.lab_achievements (id, tool_slug, appid, name, description, icon, hidden) values
  ('pioneiro-lab', null, null, 'Pioneiro do LAB', 'Membro dos primeiros passos do Laboratório de Interação.', '🌟', false),
  ('elegancia-confissao', null, null, 'Elegância & Confissão', 'Configurou sua bio autoral no perfil oficial Caramelo.', '✨', false),
  ('mestre-dos-prompts', 'prompt-library', 1, 'Engenheiro de Prompts', 'Explorou e colocou em ação referências criativas com inteligência artificial.', '💡', false),
  ('semana-superprodutiva', 'kanban', 2, 'Rotina Superprodutiva', 'Uma semana inteira organizada em um só quadro Kanban com agenda e métricas.', '📋', false),
  ('designer-da-cena', 'prancheta', 3, 'Do Rascunho à Tela', 'Criou frames, camadas e layouts autorais no canvas infinito da Prancheta.', '🎨', false),
  ('arquiteto-de-fluxos', 'automation', 4, 'Menos Ferramenta, Mais Sistema', 'Conectou blocos e desenhou integrações de automação sem código.', '⚡', false),
  ('head-de-conteudo', 'academy', 5, 'Head Formado', 'Explorou aulas e materiais da Formação Head de Conteúdo.', '🎓', false),
  ('diretor-de-cena', 'claquete', 6, 'Ação & Impacto', 'Roteirizou planos cinematográficos e ensaiou câmeras na Claquete.', '🎬', false),
  ('voz-da-comunidade', 'comunidade', 7, 'Voz Ativa', 'Conectou-se com outros criadores nos canais oficiais da Comunidade.', '💬', false),
  ('guardiao-do-lab', 'admin', 8, 'Guardião do Sistema', 'Concedida a administradores que zelam pela governança e expansão do LAB.', '🛡️', false)
on conflict (id) do update set
  tool_slug = excluded.tool_slug,
  appid = excluded.appid,
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  hidden = excluded.hidden;

-- RPC para obter conquistas do usuário atual
create or replace function public.get_my_achievements(p_appid integer default null)
returns table (
  id text,
  appid integer,
  tool_slug text,
  name text,
  description text,
  icon text,
  hidden boolean,
  achieved boolean,
  unlocked_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  return query
  select 
    a.id,
    a.appid,
    a.tool_slug,
    a.name,
    a.description,
    a.icon,
    a.hidden,
    (ua.user_id is not null and ua.unlocked = true) as achieved,
    ua.unlocked_at
  from public.lab_achievements a
  left join public.user_achievements ua on ua.achievement_id = a.id and ua.user_id = v_uid and ua.unlocked = true
  where (p_appid is null or a.appid = p_appid)
  order by (ua.user_id is not null and ua.unlocked = true) desc, a.created_at asc;
end;
$$;

-- RPC para obter resumo de conquistas (por ferramenta e total)
create or replace function public.get_my_achievement_summary()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_summary jsonb;
begin
  with per_app as (
    select 
      coalesce(a.appid::text, 'global') as app_key,
      count(a.id) as total,
      count(ua.user_id) filter (where ua.unlocked = true) as achieved
    from public.lab_achievements a
    left join public.user_achievements ua on ua.achievement_id = a.id and ua.user_id = v_uid and ua.unlocked = true
    group by a.appid
  )
  select jsonb_build_object(
    'total_unlocked', (select count(*) from public.user_achievements where user_id = v_uid and unlocked = true),
    'total_available', (select count(*) from public.lab_achievements),
    'by_appid', coalesce((
      select jsonb_object_agg(app_key, jsonb_build_object('total', total, 'achieved', achieved))
      from per_app
    ), '{}'::jsonb)
  ) into v_summary;

  return v_summary;
end;
$$;

-- RPC de Administrador: listar todas as conquistas cadastradas
create or replace function public.admin_get_all_achievements()
returns table (
  id text,
  appid integer,
  tool_slug text,
  tool_name text,
  name text,
  description text,
  icon text,
  hidden boolean,
  unlocked_count bigint,
  created_at timestamptz
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
    a.id,
    a.appid,
    a.tool_slug,
    coalesce(t.name, 'Geral do LAB') as tool_name,
    a.name,
    a.description,
    a.icon,
    a.hidden,
    count(ua.user_id) filter (where ua.unlocked = true)::bigint as unlocked_count,
    a.created_at
  from public.lab_achievements a
  left join public.lab_tools t on t.slug = a.tool_slug
  left join public.user_achievements ua on ua.achievement_id = a.id and ua.unlocked = true
  group by a.id, a.appid, a.tool_slug, t.name, a.name, a.description, a.icon, a.hidden, a.created_at
  order by a.appid nulls first, a.name asc;
end;
$$;

-- RPC de Administrador: listar conquistas de um usuário específico
create or replace function public.admin_get_user_achievements(p_user_id uuid)
returns table (
  id text,
  name text,
  description text,
  icon text,
  tool_slug text,
  appid integer,
  achieved boolean,
  unlocked_at timestamptz,
  granted_by uuid
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
    a.id,
    a.name,
    a.description,
    a.icon,
    a.tool_slug,
    a.appid,
    (ua.user_id is not null and ua.unlocked = true) as achieved,
    ua.unlocked_at,
    ua.granted_by
  from public.lab_achievements a
  left join public.user_achievements ua on ua.achievement_id = a.id and ua.user_id = p_user_id and ua.unlocked = true
  order by (ua.user_id is not null and ua.unlocked = true) desc, a.appid nulls first, a.name asc;
end;
$$;

-- RPC de Administrador: conceder conquista
create or replace function public.admin_grant_achievement(p_user_id uuid, p_achievement_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id uuid := auth.uid();
begin
  if not public.is_lab_admin() then
    raise exception 'Acesso negado: apenas administradores do LAB.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Usuário não encontrado.' using errcode = 'P0002';
  end if;

  if not exists (select 1 from public.lab_achievements where id = p_achievement_id) then
    raise exception 'Conquista não encontrada.' using errcode = 'P0002';
  end if;

  insert into public.user_achievements (user_id, achievement_id, granted_by, unlocked_at, unlocked)
  values (p_user_id, p_achievement_id, v_admin_id, now(), true)
  on conflict (user_id, achievement_id) do update set
    unlocked = true,
    unlocked_at = now(),
    granted_by = excluded.granted_by;

  return jsonb_build_object('success', true, 'user_id', p_user_id, 'achievement_id', p_achievement_id);
end;
$$;

-- RPC de Administrador: revogar conquista
create or replace function public.admin_revoke_achievement(p_user_id uuid, p_achievement_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_lab_admin() then
    raise exception 'Acesso negado: apenas administradores do LAB.' using errcode = '42501';
  end if;

  update public.user_achievements
  set unlocked = false
  where user_id = p_user_id and achievement_id = p_achievement_id;

  return jsonb_build_object('success', true, 'user_id', p_user_id, 'achievement_id', p_achievement_id);
end;
$$;

-- RPC de Administrador: criar ou atualizar conquista
create or replace function public.admin_create_achievement(
  p_id text,
  p_tool_slug text,
  p_name text,
  p_description text,
  p_icon text default '🏆',
  p_hidden boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_appid integer := null;
begin
  if not public.is_lab_admin() then
    raise exception 'Acesso negado: apenas administradores do LAB.' using errcode = '42501';
  end if;

  if p_tool_slug is not null and p_tool_slug <> '' then
    select appid into v_appid from public.lab_tools where slug = p_tool_slug;
    if not found then
      raise exception 'Ferramenta não encontrada: %', p_tool_slug using errcode = 'P0002';
    end if;
  else
    p_tool_slug := null;
  end if;

  insert into public.lab_achievements (id, tool_slug, appid, name, description, icon, hidden)
  values (p_id, p_tool_slug, v_appid, p_name, p_description, coalesce(nullif(p_icon, ''), '🏆'), coalesce(p_hidden, false))
  on conflict (id) do update set
    tool_slug = excluded.tool_slug,
    appid = excluded.appid,
    name = excluded.name,
    description = excluded.description,
    icon = excluded.icon,
    hidden = excluded.hidden;

  return jsonb_build_object('success', true, 'id', p_id);
end;
$$;

grant execute on function public.get_my_achievements(integer) to authenticated;
grant execute on function public.get_my_achievement_summary() to authenticated;
grant execute on function public.admin_get_all_achievements() to authenticated;
grant execute on function public.admin_get_user_achievements(uuid) to authenticated;
grant execute on function public.admin_grant_achievement(uuid, text) to authenticated;
grant execute on function public.admin_revoke_achievement(uuid, text) to authenticated;
grant execute on function public.admin_create_achievement(text, text, text, text, text, boolean) to authenticated;

-- Proteção defensiva: apenas funções administrativas definidoras de segurança podem alterar conquistas
revoke insert, update, delete on table public.lab_achievements from anon, authenticated;
revoke insert, update, delete on table public.user_achievements from anon, authenticated;
