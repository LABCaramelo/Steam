-- Autorização das ferramentas do LAB. Aplicar depois de lab-tools.sql.
-- Preparado a partir do esquema real em 2026-10-24; não altera/apaga conteúdo.
-- Impacto compartilhado: a biblioteca original também usa get_caramelo_prompt_copy.
-- Seu backend precisa encaminhar o JWT do membro que adquiriu a ferramenta.
-- Clientes Claquete que usam anon deixam de acessar projetos; usar JWT do dono,
-- ou service_role somente no servidor. Registros antigos sem dono ficam preservados.
-- Não modifica learning/research/blog, nem o catálogo público sem textos completos.

begin;

create schema if not exists lab_tool_private;
revoke all on schema lab_tool_private from public, anon, authenticated, service_role;

-- Todas as RLS das ferramentas usam este contrato. Um login anônimo do Supabase
-- também recebe o papel authenticated; o claim assinado precisa negá-lo aqui.
create or replace function public.has_tool(p_slug text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select auth.uid() is not null
    and coalesce(auth.jwt()->>'is_anonymous', 'false') <> 'true'
    and exists (select 1 from public.user_tools where user_id = auth.uid() and tool_slug = p_slug)
    and public.lab_member();
$$;
revoke all on function public.has_tool(text) from public, anon;
grant execute on function public.has_tool(text) to authenticated;

create or replace function public.get_caramelo_prompt_copy(p_slug text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_prompt_id text;
  v_payload text;
  v_prompt_title text;
begin
  if auth.uid() is null or (auth.jwt()->>'is_anonymous') = 'true' then
    raise exception 'Entre no LAB para acessar os prompts.' using errcode = '28000';
  end if;
  if public.has_tool('prompt-library') is not true then
    raise exception 'Adquira a Biblioteca de prompts para acessar o conteúdo.' using errcode = '42501';
  end if;
  select p.id, p.title into v_prompt_id, v_prompt_title
    from public.prompts p where p.slug = p_slug and p.active = true;
  if v_prompt_id is null then
    return jsonb_build_object('success', false, 'error', 'prompt_not_found');
  end if;
  select b.prompt_copy_payload into v_payload
    from public.caramelo_prompt_bodies b where b.prompt_id = v_prompt_id;
  if v_payload is null then
    return jsonb_build_object('success', false, 'error', 'payload_not_found');
  end if;
  return jsonb_build_object('success', true, 'slug', p_slug, 'title', v_prompt_title, 'prompt', v_payload);
end $$;
revoke all on function public.get_caramelo_prompt_copy(text) from public, anon;
grant execute on function public.get_caramelo_prompt_copy(text) to authenticated, service_role;

-- Os corpos são sempre privados; a RPC acima é a única via de cópia para membros.
do $$ begin
  if to_regclass('public.caramelo_prompt_bodies') is not null then
    alter table public.caramelo_prompt_bodies enable row level security;
    revoke all on public.caramelo_prompt_bodies from public, anon, authenticated;
  end if;
  if to_regclass('public.caramelo_admin_catalog_v1') is not null then
    revoke all on public.caramelo_admin_catalog_v1 from public, anon, authenticated;
  end if;
end $$;

-- O overload legado de save_caramelo_prompt_admin não verificava administrador.
-- Preserva sua implementação/defaults em schema privado e expõe só o wrapper seguro.
-- is_admin() é o contrato legado: profiles.role=admin E access_status=active.
create or replace function lab_tool_private.assert_prompt_admin() returns void
language plpgsql security definer set search_path = '' as $$
declare allowed boolean := false;
begin
  -- 'role' é definido pelo PostgREST a partir do JWT verificado, não do corpo HTTP.
  if current_setting('role', true) = 'service_role' then return; end if;
  if auth.uid() is null or (auth.jwt()->>'is_anonymous') = 'true' then
    raise exception 'Entre com uma conta administradora.' using errcode = '28000';
  end if;
  if to_regprocedure('public.is_admin()') is not null then
    execute 'select public.is_admin()' into allowed;
  elsif to_regprocedure('public.is_lab_admin()') is not null then
    execute 'select public.is_lab_admin()' into allowed;
  end if;
  if not coalesce(allowed, false) then
    raise exception 'Apenas administradores podem editar o acervo.' using errcode = '42501';
  end if;
end $$;

do $$
declare
  fn record;
  arg_names text;
begin
  for fn in select p.oid, oidvectortypes(p.proargtypes) as types
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'save_caramelo_prompt_admin' and p.prokind = 'f'
  loop
    if to_regprocedure(format('lab_tool_private.save_caramelo_prompt_admin(%s)', fn.types)) is null then
      execute format('alter function public.save_caramelo_prompt_admin(%s) set schema lab_tool_private', fn.types);
    end if;
  end loop;
  for fn in select p.oid, p.proargnames, pg_get_function_arguments(p.oid) as arguments,
      oidvectortypes(p.proargtypes) as types
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'lab_tool_private' and p.proname = 'save_caramelo_prompt_admin' and p.prokind = 'f'
  loop
    select string_agg(format('%I', name), ', ' order by ord) into arg_names
      from unnest(fn.proargnames) with ordinality as args(name, ord);
    if arg_names is null then raise exception 'Argumentos sem nome no editor de prompts.'; end if;
    execute format($wrapper$
      create or replace function public.save_caramelo_prompt_admin(%s) returns jsonb
      language plpgsql security definer set search_path = '' as $body$
      begin
        perform lab_tool_private.assert_prompt_admin();
        return lab_tool_private.save_caramelo_prompt_admin(%s);
      end $body$
    $wrapper$, fn.arguments, arg_names);
    execute format('revoke all on function public.save_caramelo_prompt_admin(%s) from public, anon', fn.types);
    execute format('grant execute on function public.save_caramelo_prompt_admin(%s) to authenticated, service_role', fn.types);
  end loop;
end $$;
revoke all on all functions in schema lab_tool_private from public, anon, authenticated, service_role;

-- As políticas permissivas antigas de Claquete usam USING(true). Uma política
-- RESTRICTIVE aplica o limite mesmo que essas políticas ainda existam.
do $$
declare
  table_name text;
  predicate text;
begin
  foreach table_name in array array['flick_projects', 'flick_chat_threads', 'flick_jobs', 'flick_media'] loop
    if to_regclass('public.' || table_name) is null then continue; end if;
    if table_name in ('flick_chat_threads', 'flick_jobs', 'flick_media') and to_regclass('public.flick_projects') is null then
      raise exception 'flick_projects é necessário para autorizar %.', table_name;
    end if;
    predicate := case when table_name = 'flick_projects' then
      'user_id = (select auth.uid()) and (select public.has_tool(''claquete''))'
    when table_name = 'flick_chat_threads' then
      'user_id = (select auth.uid()) and (select public.has_tool(''claquete'')) and (project_id is null or exists (select 1 from public.flick_projects p where p.id = flick_chat_threads.project_id and p.user_id = (select auth.uid())))'
    else format(
      '(select public.has_tool(''claquete'')) and exists (select 1 from public.flick_projects p where p.id = %I.project_id and p.user_id = (select auth.uid()))', table_name)
    end;
    predicate := '(' || predicate || ') and ((select auth.jwt())->>''is_anonymous'') is distinct from ''true''';
    execute format('alter table public.%I enable row level security', table_name);
    -- TRUNCATE ignora RLS; remova também os privilégios antigos de authenticated.
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('drop policy if exists lab_tool_owner_access on public.%I', table_name);
    execute format('drop policy if exists lab_tool_owner_boundary on public.%I', table_name);
    execute format('create policy lab_tool_owner_access on public.%I for all to authenticated using (%s) with check (%s)', table_name, predicate, predicate);
    execute format('create policy lab_tool_owner_boundary on public.%I as restrictive for all to authenticated using (%s) with check (%s)', table_name, predicate, predicate);
  end loop;
  -- Configurações são globais e podem conter credenciais, sem coluna de dono.
  if to_regclass('public.flick_settings') is not null then
    alter table public.flick_settings enable row level security;
    revoke all on public.flick_settings from public, anon, authenticated;
  end if;
end $$;

notify pgrst, 'reload schema';
commit;
