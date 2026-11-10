-- CarameloOS: fila das fotos de caramelo da tela de entrada.
-- Rode no SQL Editor do Supabase (projeto fzhzpzxsttflgtassyex). Pode ser rodado de novo.
--
-- O navegador chama os_avatar_next(30) uma vez por visitante novo (public/os/caramelo-os.js):
-- os 30 primeiros recebem fotos diferentes e depois a fila recomeça. Não guarda nada de quem chama.

create sequence if not exists public.os_avatar_seq;

create or replace function public.os_avatar_next(p_total int default 30) returns int
language sql volatile security definer set search_path = public, pg_temp as $$
  select (((nextval('public.os_avatar_seq') - 1) % greatest(least(coalesce(p_total, 30), 500), 1)) + 1)::int;
$$;

revoke all on sequence public.os_avatar_seq from public, anon, authenticated;
revoke all on function public.os_avatar_next(int) from public;
grant execute on function public.os_avatar_next(int) to anon, authenticated;
