-- Migration: Permite a administradores conceder acesso a ferramentas diretamente a membros
create or replace function public.admin_grant_user_tool(
  p_user_id uuid,
  p_tool_slug text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  select (role = 'admin' or is_admin = true) into v_is_admin
  from public.users where id = auth.uid();

  if not coalesce(v_is_admin, false) then
    raise exception 'Apenas administradores podem conceder acessos de ferramentas.';
  end if;

  insert into public.user_tools (user_id, tool_slug)
  values (p_user_id, p_tool_slug)
  on conflict do nothing;
end;
$$;
