-- Edição de perfil de usuário do LAB (nome, apelido, avatar e bio)
-- Rode no SQL Editor do Supabase (projeto fzhzpzxsttflgtassyex).
-- Este script é idempotente: pode ser rodado várias vezes com segurança.

-- 1. Coluna de bio no perfil
alter table public.profiles add column if not exists bio text;

-- 2. Bucket de armazenamento público para avatares (até 5MB, imagens)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

-- 3. Políticas de acesso para o bucket avatars
drop policy if exists "avatars_select" on storage.objects;
create policy "avatars_select" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert" on storage.objects;
create policy "avatars_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars_update" on storage.objects;
create policy "avatars_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars_delete" on storage.objects;
create policy "avatars_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 4. Função segura de atualização de perfil para o próprio membro logado
create or replace function public.update_my_profile(
  p_name text,
  p_nickname text,
  p_avatar_url text,
  p_bio text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_clean_name text;
  v_clean_nick text;
  v_norm text;
  v_clean_avatar text;
  v_clean_bio text;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Autenticação necessária.');
  end if;

  v_clean_name := btrim(coalesce(p_name, ''));
  if length(v_clean_name) < 2 then
    return jsonb_build_object('success', false, 'error', 'INVALID_NAME', 'message', 'O nome deve ter pelo menos 2 caracteres.');
  end if;
  if length(v_clean_name) > 80 then
    return jsonb_build_object('success', false, 'error', 'INVALID_NAME', 'message', 'O nome não pode exceder 80 caracteres.');
  end if;

  v_clean_nick := btrim(coalesce(p_nickname, ''));
  if v_clean_nick <> '' then
    if length(v_clean_nick) < 3 or length(v_clean_nick) > 24 then
      return jsonb_build_object('success', false, 'error', 'INVALID_LENGTH', 'message', 'O apelido deve ter entre 3 e 24 caracteres.');
    end if;

    if not (v_clean_nick ~ '^[a-zA-Z0-9][a-zA-Z0-9_\-\.]{1,22}[a-zA-Z0-9]$') then
      return jsonb_build_object('success', false, 'error', 'INVALID_CHARS', 'message', 'O apelido pode conter apenas letras, números, hífens e underscores, sem começar ou terminar com pontuação.');
    end if;

    v_norm := lower(regexp_replace(regexp_replace(v_clean_nick, '[^a-zA-Z0-9_\-]', '', 'g'), '^-+|-+$', ''));

    if v_norm in ('admin', 'administrator', 'caramelo', 'umcaracaramelo', 'um-cara-caramelo', 'suporte', 'support', 'moderador', 'moderator', 'oficial', 'official') then
      if not exists (select 1 from public.profiles where id = v_uid and role = 'admin' and access_status = 'active') then
        return jsonb_build_object('success', false, 'error', 'RESERVED_NICKNAME', 'message', 'Este apelido é reservado pelo sistema.');
      end if;
    end if;

    if exists (select 1 from public.profiles where normalized_nickname = v_norm and id != v_uid) then
      return jsonb_build_object('success', false, 'error', 'NICKNAME_TAKEN', 'message', 'Este apelido já está em uso por outro membro.');
    end if;
  else
    v_clean_nick := null;
    v_norm := null;
  end if;

  v_clean_avatar := nullif(btrim(coalesce(p_avatar_url, '')), '');
  v_clean_bio := nullif(btrim(coalesce(p_bio, '')), '');

  if v_clean_bio is not null and length(v_clean_bio) > 280 then
    return jsonb_build_object('success', false, 'error', 'INVALID_BIO', 'message', 'A bio não pode exceder 280 caracteres.');
  end if;

  update public.profiles
  set
    name = v_clean_name,
    nickname = v_clean_nick,
    normalized_nickname = v_norm,
    avatar_url = v_clean_avatar,
    bio = v_clean_bio,
    updated_at = timezone('utc'::text, now())
  where id = v_uid;

  update auth.users
  set raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
    'name', v_clean_name,
    'full_name', v_clean_name,
    'nickname', coalesce(v_clean_nick, v_clean_name)
  )
  where id = v_uid;

  return jsonb_build_object(
    'success', true,
    'message', 'Perfil atualizado com sucesso.',
    'name', v_clean_name,
    'nickname', v_clean_nick,
    'avatar_url', v_clean_avatar,
    'bio', v_clean_bio
  );
end;
$$;
revoke all on function public.update_my_profile(text, text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text, text) to authenticated;
