-- Ferramentas do LAB: loja, biblioteca de cada usuário e um banco por usuário em cada ferramenta.
-- Rode no SQL Editor do Supabase (projeto fzhzpzxsttflgtassyex) depois de lab-access.sql.
-- O script pode ser rodado de novo: tabelas, políticas e funções são recriadas sem perder dados.
--
-- Regras:
--   • A loja (lab_tools) é pública. A biblioteca (user_tools) só ganha uma linha pela função
--     acquire_tool, que confere o acesso ao LAB; ninguém grava nela direto pelo navegador.
--   • Kanban, Prancheta e Automation guardam tudo com user_id: cada pessoa só lê e grava as
--     próprias linhas, e só enquanto a ferramenta estiver na biblioteca dela (has_tool).
--   • Academy: as aulas são do LAB (só administradores em lab_admins editam). Progresso,
--     favoritos e anotações são de cada pessoa; comentários são vistos por quem tem a Academy.

-- ---------------------------------------------------------------------------------------------
-- 0. Utilidades
-- ---------------------------------------------------------------------------------------------

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Administradores do LAB (cadastro só pelo SQL Editor):
--   insert into public.lab_admins (user_id) select id from auth.users where email = 'voce@exemplo.com';
create table if not exists public.lab_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.lab_admins enable row level security;
revoke all on table public.lab_admins from anon, authenticated;

create or replace function public.is_lab_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.lab_admins where user_id = auth.uid());
$$;

-- Quem passou pela confirmação do grupo do WhatsApp (lab-access.sql). Sem essa tabela, vale para todos.
create or replace function public.lab_member() returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  ok boolean;
begin
  if auth.uid() is null then
    return false;
  end if;
  if to_regclass('public.lab_access') is null then
    return true;
  end if;
  execute 'select exists (select 1 from public.lab_access where user_id = $1 and verified_at is not null and member_at is not null)'
    into ok using auth.uid();
  return ok or public.is_lab_admin();
end $$;

-- ---------------------------------------------------------------------------------------------
-- 1. Loja e biblioteca
-- ---------------------------------------------------------------------------------------------

create table if not exists public.lab_tools (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  appid integer not null unique,
  name text not null,
  price_cents integer not null default 0 check (price_cents >= 0),
  available boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.lab_tools enable row level security;
revoke all on table public.lab_tools from anon, authenticated;
grant select on table public.lab_tools to anon, authenticated;
drop policy if exists "lab_tools_select" on public.lab_tools;
create policy "lab_tools_select" on public.lab_tools for select using (true);

insert into public.lab_tools (slug, appid, name) values
  ('prompt-library', 1, 'Biblioteca de prompts'),
  ('kanban', 2, 'Kanban'),
  ('prancheta', 3, 'Prancheta'),
  ('automation', 4, 'Automation'),
  ('academy', 5, 'Academy')
on conflict (slug) do update set appid = excluded.appid, name = excluded.name;

create table if not exists public.user_tools (
  user_id uuid not null references auth.users (id) on delete cascade,
  tool_slug text not null references public.lab_tools (slug) on delete cascade,
  acquired_at timestamptz not null default now(),
  source text not null default 'store',
  primary key (user_id, tool_slug)
);
alter table public.user_tools enable row level security;
revoke all on table public.user_tools from anon, authenticated;
grant select on table public.user_tools to authenticated;
drop policy if exists "user_tools_select_own" on public.user_tools;
create policy "user_tools_select_own" on public.user_tools for select to authenticated
  using (user_id = (select auth.uid()));

-- A ferramenta está na biblioteca de quem pergunta (e a pessoa continua com acesso ao LAB).
create or replace function public.has_tool(p_slug text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.user_tools where user_id = auth.uid() and tool_slug = p_slug)
    and public.lab_member();
$$;

-- Única porta de entrada da biblioteca. Ferramentas pagas ficam para um fluxo de pagamento
-- no servidor (service_role), que grava em user_tools com source = 'purchase'.
create or replace function public.acquire_tool(p_slug text) returns public.user_tools
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  tool public.lab_tools;
  result public.user_tools;
begin
  if uid is null then
    raise exception 'Entre no LAB para adquirir ferramentas.' using errcode = '28000';
  end if;
  select * into tool from public.lab_tools where slug = p_slug;
  if not found or not tool.available then
    raise exception 'Esta ferramenta não está disponível na loja.' using errcode = 'P0002';
  end if;
  if tool.price_cents > 0 then
    raise exception 'Esta ferramenta ainda não pode ser adquirida pela loja.' using errcode = 'P0001';
  end if;
  if not public.lab_member() then
    raise exception 'Confirme seu acesso ao LAB antes de adquirir ferramentas.' using errcode = '42501';
  end if;
  insert into public.user_tools (user_id, tool_slug) values (uid, p_slug) on conflict do nothing;
  select * into result from public.user_tools where user_id = uid and tool_slug = p_slug;
  return result;
end $$;

revoke all on function public.acquire_tool(text) from public, anon;
grant execute on function public.acquire_tool(text) to authenticated;
revoke all on function public.has_tool(text) from public, anon;
grant execute on function public.has_tool(text) to authenticated;
revoke all on function public.lab_member() from public, anon;
grant execute on function public.lab_member() to authenticated;
revoke all on function public.is_lab_admin() from public, anon;
grant execute on function public.is_lab_admin() to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2. Kanban — quadros, etiquetas, listas, cartões, comentários e atividade de cada pessoa
-- ---------------------------------------------------------------------------------------------

create table if not exists public.kanban_boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 4000),
  background text not null default 'stage' check (background in ('stage', 'galaxy', 'spectrum', 'cream')),
  starred boolean not null default false,
  template text,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.kanban_labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  board_id uuid not null,
  name text not null default '' check (char_length(name) <= 60),
  color text not null check (color in ('caramel', 'sky', 'pink', 'violet', 'yellow', 'mint', 'danger', 'neutral')),
  position double precision not null default 0,
  unique (id, user_id),
  foreign key (board_id, user_id) references public.kanban_boards (id, user_id) on delete cascade
);

create table if not exists public.kanban_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  board_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  -- Cartaz no topo da lista (nome em destaque com o espectro da marca), como nos dias do template.
  banner boolean not null default false,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (board_id, user_id) references public.kanban_boards (id, user_id) on delete cascade
);

create table if not exists public.kanban_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  board_id uuid not null,
  list_id uuid not null,
  name text not null check (char_length(name) between 1 and 500),
  description text not null default '' check (char_length(description) <= 20000),
  position double precision not null default 0,
  label_ids uuid[] not null default '{}',
  done boolean not null default false,
  checklist jsonb not null default '[]' check (jsonb_typeof(checklist) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (board_id, user_id) references public.kanban_boards (id, user_id) on delete cascade,
  foreign key (list_id, user_id) references public.kanban_lists (id, user_id) on delete cascade
);

create table if not exists public.kanban_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  card_id uuid not null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  foreign key (card_id, user_id) references public.kanban_cards (id, user_id) on delete cascade
);

create table if not exists public.kanban_activity (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  board_id uuid not null,
  text text not null check (char_length(text) <= 300),
  created_at timestamptz not null default now(),
  foreign key (board_id, user_id) references public.kanban_boards (id, user_id) on delete cascade
);

create index if not exists kanban_boards_user_idx on public.kanban_boards (user_id, position);
create index if not exists kanban_labels_board_idx on public.kanban_labels (board_id);
create index if not exists kanban_lists_board_idx on public.kanban_lists (board_id, position);
create index if not exists kanban_cards_board_idx on public.kanban_cards (board_id, list_id, position);
create index if not exists kanban_comments_card_idx on public.kanban_comments (card_id, created_at desc);
create index if not exists kanban_activity_board_idx on public.kanban_activity (board_id, created_at desc);

drop trigger if exists kanban_boards_touch on public.kanban_boards;
create trigger kanban_boards_touch before update on public.kanban_boards for each row execute function public.touch_updated_at();
drop trigger if exists kanban_cards_touch on public.kanban_cards;
create trigger kanban_cards_touch before update on public.kanban_cards for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------------------------
-- 3. Prancheta — arquivos de design de cada pessoa
-- ---------------------------------------------------------------------------------------------

create table if not exists public.prancheta_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  size_bytes integer not null default 0 check (size_bytes between 0 and 26214400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists prancheta_files_user_idx on public.prancheta_files (user_id, updated_at desc);
drop trigger if exists prancheta_files_touch on public.prancheta_files;
create trigger prancheta_files_touch before update on public.prancheta_files for each row execute function public.touch_updated_at();

-- Mantém estritamente os 7 arquivos/saves mais recentes por usuário para economizar espaço
create or replace function public.prune_user_prancheta_files() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.prancheta_files
  where user_id = new.user_id
    and id not in (
      select id from public.prancheta_files
      where user_id = new.user_id
      order by updated_at desc
      limit 7
    );
  return new;
end $$;

drop trigger if exists prancheta_files_prune_limit on public.prancheta_files;
create trigger prancheta_files_prune_limit after insert on public.prancheta_files for each row execute function public.prune_user_prancheta_files();

-- ---------------------------------------------------------------------------------------------
-- 4. Automation — integrações, versões, execuções e conexões de cada pessoa
-- ---------------------------------------------------------------------------------------------

create table if not exists public.automation_fluxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  active boolean not null default false,
  steps jsonb not null default '[]' check (jsonb_typeof(steps) = 'array'),
  average_execution integer,
  activations integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.automation_flux_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  flux_id uuid not null,
  name text not null check (char_length(name) between 1 and 60),
  active boolean not null default false,
  steps jsonb not null check (jsonb_typeof(steps) = 'array'),
  created_at timestamptz not null default now(),
  foreign key (flux_id, user_id) references public.automation_fluxes (id, user_id) on delete cascade
);

create table if not exists public.automation_executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  flux_id uuid not null,
  started_at timestamptz not null default now(),
  duration_ms integer not null default 0,
  status text not null check (status in ('success', 'error')),
  origin text not null default 'Terminal de testes',
  operations integer not null default 0,
  steps jsonb not null default '[]' check (jsonb_typeof(steps) = 'array'),
  foreign key (flux_id, user_id) references public.automation_fluxes (id, user_id) on delete cascade
);

-- Credenciais nunca são gravadas: só o tipo de autenticação e um final para identificar a conta.
create table if not exists public.automation_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  app text not null check (app ~ '^[a-z_]+$'),
  connection_config text not null default 'API Key',
  credential_hint text check (credential_hint is null or char_length(credential_hint) <= 40),
  verified boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists automation_fluxes_user_idx on public.automation_fluxes (user_id, updated_at desc);
create index if not exists automation_versions_flux_idx on public.automation_flux_versions (flux_id, created_at desc);
create index if not exists automation_executions_flux_idx on public.automation_executions (flux_id, started_at desc);
create index if not exists automation_connections_user_idx on public.automation_connections (user_id, created_at desc);

drop trigger if exists automation_fluxes_touch on public.automation_fluxes;
create trigger automation_fluxes_touch before update on public.automation_fluxes for each row execute function public.touch_updated_at();

-- Cada integração guarda as 200 execuções mais recentes, como no original.
create or replace function public.automation_prune_executions() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.automation_executions
  where flux_id = new.flux_id
    and id in (
      select id from public.automation_executions
      where flux_id = new.flux_id
      order by started_at desc
      offset 200
    );
  return null;
end $$;
drop trigger if exists automation_executions_prune on public.automation_executions;
create trigger automation_executions_prune after insert on public.automation_executions
  for each row execute function public.automation_prune_executions();

-- ---------------------------------------------------------------------------------------------
-- 5. Academy — conteúdo do LAB e o que cada aluno faz com ele
-- ---------------------------------------------------------------------------------------------

create table if not exists public.academy_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null check (char_length(title) between 1 and 140),
  subtitle text not null default '' check (char_length(subtitle) <= 240),
  description text not null default '' check (char_length(description) <= 8000),
  cover_url text,
  hero_url text,
  accent text not null default 'caramel' check (accent in ('caramel', 'sky', 'pink', 'violet', 'yellow')),
  position double precision not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academy_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.academy_courses (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  description text not null default '' check (char_length(description) <= 4000),
  position double precision not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.academy_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.academy_courses (id) on delete cascade,
  module_id uuid not null references public.academy_modules (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 20000),
  video_kind text not null default 'youtube' check (video_kind in ('youtube', 'vimeo', 'video', 'page')),
  video_ref text not null default '' check (char_length(video_ref) <= 500),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  cover_url text,
  materials jsonb not null default '[]' check (jsonb_typeof(materials) = 'array'),
  position double precision not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academy_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.academy_lessons (id) on delete cascade,
  position_seconds integer not null default 0 check (position_seconds >= 0),
  completed_at timestamptz,
  last_watched_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.academy_favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.academy_lessons (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.academy_notes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.academy_lessons (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 20000),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.academy_comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.academy_lessons (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parent_id uuid references public.academy_comments (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  author_name text not null default '',
  author_avatar text,
  edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academy_comment_likes (
  comment_id uuid not null references public.academy_comments (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists academy_modules_course_idx on public.academy_modules (course_id, position);
create index if not exists academy_lessons_module_idx on public.academy_lessons (module_id, position);
create index if not exists academy_lessons_course_idx on public.academy_lessons (course_id);
create index if not exists academy_progress_recent_idx on public.academy_progress (user_id, last_watched_at desc);
create index if not exists academy_comments_lesson_idx on public.academy_comments (lesson_id, created_at);
create index if not exists academy_likes_user_idx on public.academy_comment_likes (user_id);

drop trigger if exists academy_courses_touch on public.academy_courses;
create trigger academy_courses_touch before update on public.academy_courses for each row execute function public.touch_updated_at();
drop trigger if exists academy_lessons_touch on public.academy_lessons;
create trigger academy_lessons_touch before update on public.academy_lessons for each row execute function public.touch_updated_at();

-- O nome de quem comenta vem do perfil, nunca do navegador; numa edição só o texto muda.
create or replace function public.academy_comment_author() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  display text;
  avatar text;
begin
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.lesson_id := old.lesson_id;
    new.user_id := old.user_id;
    new.parent_id := old.parent_id;
    new.author_name := old.author_name;
    new.author_avatar := old.author_avatar;
    new.created_at := old.created_at;
    new.edited := new.body is distinct from old.body or old.edited;
    new.updated_at := now();
    return new;
  end if;
  new.user_id := auth.uid();
  new.edited := false;
  if to_regclass('public.profiles') is not null then
    execute 'select coalesce(nullif(nickname, ''''), nullif(name, '''')), avatar_url from public.profiles where id = $1'
      into display, avatar using new.user_id;
  end if;
  if display is null then
    select coalesce(nullif(raw_user_meta_data ->> 'nickname', ''), nullif(raw_user_meta_data ->> 'name', ''), split_part(email, '@', 1))
      into display from auth.users where id = new.user_id;
  end if;
  new.author_name := left(coalesce(display, 'Aluno do LAB'), 80);
  new.author_avatar := avatar;
  return new;
end $$;
drop trigger if exists academy_comments_author on public.academy_comments;
create trigger academy_comments_author before insert or update on public.academy_comments
  for each row execute function public.academy_comment_author();

-- Resposta só a um comentário da mesma aula.
create or replace function public.academy_comment_parent() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.parent_id is not null and not exists (
    select 1 from public.academy_comments where id = new.parent_id and lesson_id = new.lesson_id and parent_id is null
  ) then
    raise exception 'Responda a um comentário desta aula.' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists academy_comments_parent on public.academy_comments;
create trigger academy_comments_parent before insert on public.academy_comments
  for each row execute function public.academy_comment_parent();

-- Aula visível para quem tem a Academy: aula e curso publicados.
create or replace function public.academy_lesson_visible(p_lesson uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select public.is_lab_admin() or (
    public.has_tool('academy') and exists (
      select 1 from public.academy_lessons l
      join public.academy_courses c on c.id = l.course_id
      where l.id = p_lesson and l.published and c.published
    )
  );
$$;
revoke all on function public.academy_lesson_visible(uuid) from public, anon;
grant execute on function public.academy_lesson_visible(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 6. Permissões e políticas (RLS)
-- ---------------------------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'kanban_boards', 'kanban_labels', 'kanban_lists', 'kanban_cards', 'kanban_comments', 'kanban_activity',
    'prancheta_files',
    'automation_fluxes', 'automation_flux_versions', 'automation_executions', 'automation_connections',
    'academy_courses', 'academy_modules', 'academy_lessons', 'academy_progress', 'academy_favorites',
    'academy_notes', 'academy_comments', 'academy_comment_likes'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
  end loop;
end $$;

-- Tabelas privadas: dono e ferramenta na biblioteca, em toda leitura e escrita.
do $$
declare
  rec record;
begin
  for rec in
    select * from (values
      ('kanban_boards', 'kanban'), ('kanban_labels', 'kanban'), ('kanban_lists', 'kanban'),
      ('kanban_cards', 'kanban'), ('kanban_comments', 'kanban'), ('kanban_activity', 'kanban'),
      ('prancheta_files', 'prancheta'),
      ('automation_fluxes', 'automation'), ('automation_flux_versions', 'automation'),
      ('automation_executions', 'automation'), ('automation_connections', 'automation')
    ) as v (tbl, slug)
  loop
    execute format('drop policy if exists %I on public.%I', rec.tbl || '_owner', rec.tbl);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (user_id = (select auth.uid()) and (select public.has_tool(%L)))
         with check (user_id = (select auth.uid()) and (select public.has_tool(%L)))',
      rec.tbl || '_owner', rec.tbl, rec.slug, rec.slug
    );
  end loop;
end $$;

-- Conteúdo da Academy: leitura para quem tem a ferramenta, escrita só para o LAB.
drop policy if exists "academy_courses_read" on public.academy_courses;
create policy "academy_courses_read" on public.academy_courses for select to authenticated
  using ((select public.is_lab_admin()) or (published and (select public.has_tool('academy'))));
drop policy if exists "academy_courses_admin" on public.academy_courses;
create policy "academy_courses_admin" on public.academy_courses for all to authenticated
  using ((select public.is_lab_admin())) with check ((select public.is_lab_admin()));

drop policy if exists "academy_modules_read" on public.academy_modules;
create policy "academy_modules_read" on public.academy_modules for select to authenticated
  using ((select public.is_lab_admin()) or ((select public.has_tool('academy')) and exists (
    select 1 from public.academy_courses c where c.id = course_id and c.published)));
drop policy if exists "academy_modules_admin" on public.academy_modules;
create policy "academy_modules_admin" on public.academy_modules for all to authenticated
  using ((select public.is_lab_admin())) with check ((select public.is_lab_admin()));

drop policy if exists "academy_lessons_read" on public.academy_lessons;
create policy "academy_lessons_read" on public.academy_lessons for select to authenticated
  using ((select public.is_lab_admin()) or (published and (select public.has_tool('academy')) and exists (
    select 1 from public.academy_courses c where c.id = course_id and c.published)));
drop policy if exists "academy_lessons_admin" on public.academy_lessons;
create policy "academy_lessons_admin" on public.academy_lessons for all to authenticated
  using ((select public.is_lab_admin())) with check ((select public.is_lab_admin()));

-- Progresso, favoritos e anotações: só do aluno, e só em aulas que ele pode ver.
do $$
declare
  t text;
begin
  foreach t in array array['academy_progress', 'academy_favorites', 'academy_notes'] loop
    execute format('drop policy if exists %I on public.%I', t || '_owner', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (user_id = (select auth.uid()) and (select public.has_tool(''academy'')))
         with check (user_id = (select auth.uid()) and public.academy_lesson_visible(lesson_id))',
      t || '_owner', t
    );
  end loop;
end $$;

-- Comentários: a turma lê; cada um escreve e edita os seus; o LAB modera.
drop policy if exists "academy_comments_read" on public.academy_comments;
create policy "academy_comments_read" on public.academy_comments for select to authenticated
  using (public.academy_lesson_visible(lesson_id));
drop policy if exists "academy_comments_insert" on public.academy_comments;
create policy "academy_comments_insert" on public.academy_comments for insert to authenticated
  with check (user_id = (select auth.uid()) and public.academy_lesson_visible(lesson_id));
drop policy if exists "academy_comments_update" on public.academy_comments;
create policy "academy_comments_update" on public.academy_comments for update to authenticated
  using (user_id = (select auth.uid()) and (select public.has_tool('academy')))
  with check (user_id = (select auth.uid()));
drop policy if exists "academy_comments_delete" on public.academy_comments;
create policy "academy_comments_delete" on public.academy_comments for delete to authenticated
  using ((select public.is_lab_admin()) or (user_id = (select auth.uid()) and (select public.has_tool('academy'))));

drop policy if exists "academy_likes_read" on public.academy_comment_likes;
create policy "academy_likes_read" on public.academy_comment_likes for select to authenticated
  using ((select public.has_tool('academy')) or (select public.is_lab_admin()));
drop policy if exists "academy_likes_write" on public.academy_comment_likes;
create policy "academy_likes_write" on public.academy_comment_likes for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.academy_comments c where c.id = comment_id and public.academy_lesson_visible(c.lesson_id)));
drop policy if exists "academy_likes_delete" on public.academy_comment_likes;
create policy "academy_likes_delete" on public.academy_comment_likes for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- 7. Primeira aula da Academy: o treinamento que já está publicado em /aula-head
-- ---------------------------------------------------------------------------------------------

do $$
declare
  course uuid;
  module uuid;
begin
  insert into public.academy_courses (slug, title, subtitle, description, cover_url, hero_url, accent, position, published)
  values (
    'portfolio-head-com-ia',
    'Portfólio Head com IA',
    'Formação Head de Conteúdo convida Um Cara Caramelo',
    'Treinamento do Um Cara Caramelo para a Head Academy Business School: como construir um portfólio de Head com inteligência artificial.',
    '/aula-head/og-image.jpg',
    '/aula-head/hero-directions-poster.jpg',
    'caramel',
    1,
    true
  )
  on conflict (slug) do nothing
  returning id into course;

  if course is null then
    return;
  end if;

  insert into public.academy_modules (course_id, title, description, position)
  values (course, 'Aula 01', 'A apresentação completa do treinamento.', 1)
  returning id into module;

  insert into public.academy_lessons (course_id, module_id, title, description, video_kind, video_ref, cover_url, position)
  values (
    course,
    module,
    'Portfólio Head com IA',
    'A aula ao vivo, com a apresentação interativa usada no treinamento.',
    'page',
    '/aula-head/index.html',
    '/aula-head/og-image.jpg',
    1
  );
end $$;
