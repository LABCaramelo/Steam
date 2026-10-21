-- Comunidade do LAB: quem está on-line agora e conversas diretas entre membros, sem histórico.
-- Rode no SQL Editor do Supabase (projeto fzhzpzxsttflgtassyex) depois de lab-tools.sql.
-- O script pode ser rodado de novo: funções e políticas são recriadas.
--
-- Como funciona (src/community.tsx):
--   • Presença: canal privado "lab:community" do Realtime. Só quem passou pela confirmação do
--     WhatsApp (lab_member) entra no canal e aparece na lista.
--   • Conversa: cada pessoa só consegue ouvir o próprio canal "lab:inbox:<id>". As mensagens saem
--     pela função community_send, que carimba quem enviou com auth.uid(): o navegador não consegue
--     se passar por outra pessoa nem ouvir a caixa de outra.
--   • Nenhuma tabela guarda as conversas. A mensagem é entregue a quem estiver conectado naquele
--     momento; o Realtime descarta sozinho o que passa por realtime.messages após poucos dias.

do $$
begin
  if to_regprocedure('public.lab_member()') is null then
    raise exception 'Rode supabase/lab-tools.sql antes deste script.';
  end if;
end $$;

-- Nome público de um membro: apelido ou nome do perfil. Nunca o e-mail.
-- O perfil é lido como jsonb para o script funcionar mesmo sem as colunas nickname ou avatar_url.
create or replace function public.community_member_name(p_user uuid) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select left(coalesce(
    nullif(btrim(to_jsonb(p) ->> 'nickname'), ''),
    nullif(btrim(to_jsonb(p) ->> 'name'), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'nickname'), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
    'Membro do LAB'
  ), 80)
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_user;
$$;
revoke all on function public.community_member_name(uuid) from public, anon, authenticated;

-- Nome e foto de quem está on-line (a lista de presença só traz os ids).
create or replace function public.community_profiles(p_ids uuid[])
returns table (id uuid, name text, avatar_url text)
language sql stable security definer set search_path = public, pg_temp as $$
  select u.id, public.community_member_name(u.id), to_jsonb(p) ->> 'avatar_url'
  from auth.users u
  left join public.profiles p on p.id = u.id
  where public.lab_member() and u.id = any (p_ids[1:200]);
$$;
revoke all on function public.community_profiles(uuid[]) from public, anon;
grant execute on function public.community_profiles(uuid[]) to authenticated;

-- Envia uma mensagem para a caixa de quem recebe e para a de quem enviou (as outras abas dela).
create or replace function public.community_send(p_to uuid, p_body text) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  body text := btrim(coalesce(p_body, ''));
  msg jsonb;
begin
  if uid is null or not public.lab_member() then
    raise exception 'Confirme seu acesso ao LAB para conversar.' using errcode = '42501';
  end if;
  if p_to is null or p_to = uid then
    raise exception 'Escolha outra pessoa para conversar.' using errcode = '22023';
  end if;
  if char_length(body) not between 1 and 2000 then
    raise exception 'A mensagem precisa ter entre 1 e 2000 caracteres.' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users where id = p_to) then
    raise exception 'Esta pessoa não faz mais parte do LAB.' using errcode = 'P0002';
  end if;

  msg := jsonb_build_object(
    'id', gen_random_uuid(),
    'from', uid,
    'to', p_to,
    'name', public.community_member_name(uid),
    'body', body,
    'at', now()
  );
  perform realtime.send(msg, 'dm', 'lab:inbox:' || p_to::text, true);
  perform realtime.send(msg, 'dm', 'lab:inbox:' || uid::text, true);
  return msg;
end $$;
revoke all on function public.community_send(uuid, text) from public, anon;
grant execute on function public.community_send(uuid, text) to authenticated;

-- Autorização dos canais privados do Realtime.
drop policy if exists "lab_community_read" on realtime.messages;
create policy "lab_community_read" on realtime.messages for select to authenticated
  using (
    realtime.topic() = 'lab:community'
    and realtime.messages.extension in ('presence', 'broadcast')
    and (select public.lab_member())
  );

drop policy if exists "lab_community_track" on realtime.messages;
create policy "lab_community_track" on realtime.messages for insert to authenticated
  with check (
    realtime.topic() = 'lab:community'
    and realtime.messages.extension = 'presence'
    and (select public.lab_member())
  );

drop policy if exists "lab_community_inbox_read" on realtime.messages;
create policy "lab_community_inbox_read" on realtime.messages for select to authenticated
  using (
    realtime.topic() = 'lab:inbox:' || (select auth.uid())::text
    and realtime.messages.extension = 'broadcast'
  );
