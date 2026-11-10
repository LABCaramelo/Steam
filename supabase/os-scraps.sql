-- Carakut (CarameloOS 96): mural de scraps público da página inicial.
-- Rode no SQL Editor do Supabase (projeto fzhzpzxsttflgtassyex). Pode ser rodado de novo.
--
-- Como funciona (public/os/caramelo-os.js, app "scraps"):
--   • Qualquer visitante lê os scraps e deixa um, com o nome e o caramelo do perfil de visitante.
--   • O navegador nunca toca a tabela: só chama os_scraps_list e os_scrap_post (anon).
--   • os_scrap_post valida tamanho, recusa links e limita o envio: 3 scraps a cada 10 minutos
--     por conexão e 30 por minuto no total. O IP não é guardado, só um hash dele.
--   • Para esconder um scrap: no Table Editor, marque hidden = true na linha.

create table if not exists public.os_scraps (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 24),
  coat text not null default 'caramelo' check (coat ~ '^[a-z0-9-]{1,20}$'),
  body text not null check (char_length(body) between 1 and 500),
  ip_hash text,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists os_scraps_created_idx on public.os_scraps (created_at desc) where not hidden;
create index if not exists os_scraps_ip_idx on public.os_scraps (ip_hash, created_at desc);

alter table public.os_scraps enable row level security;
revoke all on table public.os_scraps from anon, authenticated;

-- Últimos scraps visíveis, do mais novo para o mais antigo. p_before pagina.
create or replace function public.os_scraps_list(p_limit int default 30, p_before timestamptz default null)
returns table (id uuid, name text, coat text, body text, created_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select s.id, s.name, s.coat, s.body, s.created_at
  from public.os_scraps s
  where not s.hidden and (p_before is null or s.created_at < p_before)
  order by s.created_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 50);
$$;
revoke all on function public.os_scraps_list(int, timestamptz) from public;
grant execute on function public.os_scraps_list(int, timestamptz) to anon, authenticated;

-- Total de scraps visíveis (o contador do perfil).
create or replace function public.os_scraps_count() returns bigint
language sql stable security definer set search_path = public, pg_temp as $$
  select count(*) from public.os_scraps where not hidden;
$$;
revoke all on function public.os_scraps_count() from public;
grant execute on function public.os_scraps_count() to anon, authenticated;

-- Deixa um scrap. Devolve o scrap criado.
create or replace function public.os_scrap_post(p_name text, p_coat text, p_body text) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  nm text := left(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'), 24);
  ct text := lower(btrim(coalesce(p_coat, '')));
  bd text := regexp_replace(btrim(coalesce(p_body, '')), '\n{3,}', E'\n\n', 'g');
  ip text := btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1));
  h text;
  rec public.os_scraps;
begin
  if nm = '' then nm := 'Visitante'; end if;
  if ct !~ '^[a-z0-9-]{1,20}$' then ct := 'caramelo'; end if;
  if char_length(bd) not between 1 and 500 then
    raise exception 'O scrap precisa ter entre 1 e 500 caracteres.' using errcode = '22023';
  end if;
  if bd ~* '(https?://|www\.|\m[a-z0-9-]+\.(com|net|org|br|io|xyz|ru|info|site|online|shop|link)\M)' then
    raise exception 'Scraps não aceitam links.' using errcode = '22023';
  end if;

  h := md5('carakut:' || coalesce(nullif(ip, ''), 'sem-ip'));
  perform pg_advisory_xact_lock(hashtext('os_scrap_post'));
  if (select count(*) from public.os_scraps where ip_hash = h and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'Calma! Espere uns minutinhos antes de deixar outro scrap.' using errcode = '54000';
  end if;
  if (select count(*) from public.os_scraps where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Muita gente escrevendo agora. Tente de novo em instantes.' using errcode = '54000';
  end if;

  insert into public.os_scraps (name, coat, body, ip_hash)
  values (nm, ct, bd, h)
  returning * into rec;

  return jsonb_build_object('id', rec.id, 'name', rec.name, 'coat', rec.coat, 'body', rec.body, 'created_at', rec.created_at);
end;
$$;
revoke all on function public.os_scrap_post(text, text, text) from public;
grant execute on function public.os_scrap_post(text, text, text) to anon, authenticated;
