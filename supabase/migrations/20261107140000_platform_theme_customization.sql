-- ==============================================================================
-- LAB Caramelo — Customização Dinâmica de Cores da Plataforma via Brand Guardian
-- Migration para persistência de preferências de tema por usuário no Supabase
-- ==============================================================================

begin;

-- 1. Coluna de tema customizado da plataforma no perfil do usuário
alter table public.profiles add column if not exists platform_theme jsonb default null;

-- 2. Função segura para o próprio usuário atualizar seu tema da plataforma
create or replace function public.update_my_platform_theme(p_theme jsonb)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Autenticação necessária.');
  end if;

  update public.profiles
  set
    platform_theme = p_theme,
    updated_at = timezone('utc'::text, now())
  where id = v_uid;

  return jsonb_build_object(
    'success', true,
    'message', 'Tema da plataforma atualizado com sucesso.',
    'platform_theme', p_theme
  );
end;
$$;

revoke all on function public.update_my_platform_theme(jsonb) from public, anon;
grant execute on function public.update_my_platform_theme(jsonb) to authenticated;

commit;
