-- Cap: gravador cinemático de tela, câmera e zooms no estilo Screen Studio & Loom (slug: cap, app 16).
-- Aplicar após lab-access.sql e lab-tools.sql.
-- Gravações, configurações e vídeos ficam no navegador (IndexedDB) de forma isolada e privada por conta.
begin;
insert into public.lab_tools (slug, appid, name, available)
values ('cap', 16, 'Cap', false)
on conflict (slug) do update set appid=excluded.appid, name=excluded.name;

create or replace function public.release_tool(p_slug text) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Entre no LAB para remover ferramentas.' using errcode = '28000';
  end if;
  if p_slug is null or p_slug not in ('prompt-library', 'kanban', 'prancheta', 'automation', 'academy', 'claquete', 'comunidade', 'gravador', 'montagem', 'creative-os', 'gabinete', 'stories', 'logomotion', 'cap') then
    raise exception 'Ferramenta não encontrada.' using errcode = 'P0002';
  end if;
  perform 1 from public.user_tools where user_id = uid and tool_slug = p_slug for update;
  if not found then
    return jsonb_build_object('slug', p_slug, 'removed', false);
  end if;

  case p_slug
    when 'prompt-library' then
      if to_regclass('public.caramelo_personal_prompts') is not null then
        execute 'delete from public.caramelo_personal_prompts where owner_user_id = $1' using uid;
      end if;
      if to_regclass('public.caramelo_prompt_observations') is not null then
        execute 'delete from public.caramelo_prompt_observations where user_id = $1' using uid;
      end if;
    when 'kanban' then
      delete from public.kanban_boards where user_id = uid;
    when 'prancheta' then
      delete from public.prancheta_files where user_id = uid;
    when 'automation' then
      delete from public.automation_fluxes where user_id = uid;
      delete from public.automation_connections where user_id = uid;
    when 'academy' then
      delete from public.academy_progress where user_id = uid;
      delete from public.academy_favorites where user_id = uid;
      delete from public.academy_notes where user_id = uid;
      delete from public.academy_comment_likes where user_id = uid;
      update public.academy_comments reply set parent_id = null
        where reply.user_id <> uid and reply.parent_id in (
          select id from public.academy_comments where user_id = uid
        );
      delete from public.academy_comments where user_id = uid;
    when 'claquete' then
      if to_regclass('public.flick_chat_threads') is not null then
        execute 'delete from public.flick_chat_threads where user_id = $1' using uid;
      end if;
      if to_regclass('public.flick_projects') is not null then
        execute 'delete from public.flick_projects where user_id = $1' using uid;
      end if;
    else
      null; -- Comunidade, Montagem, No Ar, Stories, Logo Motion e Cap têm dados locais por conta.
  end case;

  delete from public.user_tools where user_id = uid and tool_slug = p_slug;
  return jsonb_build_object('slug', p_slug, 'removed', true);
end $$;
revoke all on function public.release_tool(text) from public, anon;
grant execute on function public.release_tool(text) to authenticated;
commit;
