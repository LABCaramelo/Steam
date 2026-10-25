import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, test } from "node:test";
import { PGlite, type Transaction } from "@electric-sql/pglite";

const script = fs.readFileSync(path.join(import.meta.dirname, "../supabase/tool-auth.sql"), "utf8");
const ALICE = "00000000-0000-4000-8000-00000000000a";
const BRUNO = "00000000-0000-4000-8000-00000000000b";
const ADMIN = "00000000-0000-4000-8000-0000000000ad";
const BLOCKED = "00000000-0000-4000-8000-0000000000bb";
let db: PGlite;
let legacyLeaks: unknown[];

async function as<T>(role: "anon" | "authenticated" | "service_role", uid: string | null, fn: (tx: Transaction) => Promise<T>) {
  return db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [uid ?? ""]);
    await tx.exec(`set local role ${role}`);
    return fn(tx);
  });
}
const query = <T = Record<string, unknown>>(uid: string | null, sql: string, args: unknown[] = []) =>
  as(uid ? "authenticated" : "anon", uid, (tx) => tx.query<T>(sql, args));
const denied = async (uid: string | null, sql: string, args: unknown[] = []) => {
  await assert.rejects(query(uid, sql, args), /permission denied|Apenas administradores|Adquira a Biblioteca|row-level security|Entre com/);
};

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
    $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
    create table public.profiles (id uuid primary key, role text, access_status text);
    create table public.user_tools (user_id uuid, tool_slug text, member boolean default true);
    create function public.lab_member() returns boolean language sql stable security definer as $$
      select exists(select 1 from public.user_tools where user_id=auth.uid() and member)
    $$;
    create function public.has_tool(p_slug text) returns boolean language sql stable security definer as $$
      select exists(select 1 from public.user_tools where user_id=auth.uid() and tool_slug=p_slug and member)
    $$;
    create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
      select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and access_status='active')
    $$;
    create table public.prompts (id text primary key, slug text, title text, active boolean, author text);
    create table public.caramelo_prompt_bodies (prompt_id text primary key references public.prompts(id), prompt_copy_payload text);
    alter table public.caramelo_prompt_bodies enable row level security;
    create view public.caramelo_public_catalog_v1 as select id,slug,title from public.prompts where active;
    create view public.caramelo_admin_catalog_v1 as select p.id,p.title,b.prompt_copy_payload from public.prompts p left join public.caramelo_prompt_bodies b on b.prompt_id=p.id;
    grant select on public.caramelo_public_catalog_v1, public.caramelo_admin_catalog_v1 to anon, authenticated;
    create function public.get_caramelo_prompt_copy(p_slug text) returns jsonb language sql security definer as $$
      select jsonb_build_object('success',true,'prompt',b.prompt_copy_payload) from public.prompts p join public.caramelo_prompt_bodies b on b.prompt_id=p.id where p.slug=p_slug
    $$;
    -- Os overloads legados propositalmente não checam administrador.
    create function public.save_caramelo_prompt_admin(p_id text, p_enabled boolean) returns jsonb language plpgsql security definer as $$
      begin update public.prompts set active=p_enabled where id=p_id; return jsonb_build_object('success',true); end
    $$;
    create function public.save_caramelo_prompt_admin(p_id text, p_title text, p_author text default null) returns jsonb language plpgsql security definer as $$
      begin update public.prompts set title=p_title,author=p_author where id=p_id; return jsonb_build_object('success',true); end
    $$;
    create table public.flick_projects (id text primary key,user_id uuid,name text);
    create table public.flick_chat_threads (id text primary key,project_id text references public.flick_projects(id),user_id uuid,messages text);
    create table public.flick_jobs (id text primary key,project_id text references public.flick_projects(id),request text);
    create table public.flick_media (id text primary key,project_id text references public.flick_projects(id),url text);
    create table public.flick_settings (key text primary key,value text);
    do $$ declare tbl text; begin
      foreach tbl in array array['flick_projects','flick_chat_threads','flick_jobs','flick_media','flick_settings'] loop
        execute format('alter table public.%I enable row level security',tbl);
        execute format('grant all on public.%I to anon, authenticated, service_role',tbl);
        execute format('create policy legacy_all on public.%I for all to anon, authenticated using(true) with check(true)',tbl);
      end loop;
    end $$;
    grant execute on all functions in schema public to anon,authenticated,service_role;
    insert into public.prompts values ('one','example','Exemplo',true,null),('hidden','hidden','Rascunho',false,null),('empty','empty','Sem corpo',true,null);
    insert into public.caramelo_prompt_bodies values ('one','TEXTO COMPLETO PRIVADO'),('hidden','RASCUNHO PRIVADO');
    insert into public.flick_settings values ('internal','CONFIGURAÇÃO PRIVADA');
  `);
  await db.query("insert into public.profiles values ($1,'admin','active'),($2,'admin','blocked')", [ADMIN, BLOCKED]);
  for (const uid of [ALICE, ADMIN, BLOCKED]) {
    for (const slug of ["prompt-library", "claquete"]) {
      await db.query("insert into public.user_tools values ($1,$2,$3)", [uid, slug, uid !== BLOCKED]);
    }
  }
  for (const [id, uid] of [["alice", ALICE], ["bruno", BRUNO], ["legacy", null]]) {
    await db.query("insert into public.flick_projects values ($1,$2,$1)", [id, uid]);
    await db.query("insert into public.flick_chat_threads values ($1,$1,$2,'CONVERSA PRIVADA')", [id, uid]);
    await db.query("insert into public.flick_jobs values ($1,$1,'REQUISIÇÃO PRIVADA')", [id]);
    await db.query("insert into public.flick_media values ($1,$1,'https://example.test/private')", [id]);
  }
  legacyLeaks = [
    (await query(null, "select public.get_caramelo_prompt_copy('example') as result")).rows,
    (await query(null, "select count(*)::int as n from public.caramelo_admin_catalog_v1")).rows,
    (await query(null, "select count(*)::int as n from public.flick_projects")).rows,
  ];
  await db.exec(script);
  await db.exec(script); // Idempotência inclui preservar implementações privadas dos overloads.
});
after(async () => { await db?.close(); });

test("a fixture reproduz as três vias anônimas observadas no esquema real", () => {
  assert.deepEqual(legacyLeaks, [
    [{ result: { success: true, prompt: "TEXTO COMPLETO PRIVADO" } }], [{ n: 3 }], [{ n: 3 }],
  ]);
});

test("anônimo não chama cópia nem lê corpos ou view administrativa", async () => {
  await denied(null, "select public.get_caramelo_prompt_copy('example')");
  await denied(null, "select * from public.caramelo_prompt_bodies");
  await denied(null, "select * from public.caramelo_admin_catalog_v1");
  await denied(ALICE, "select * from public.caramelo_prompt_bodies");
  await denied(ALICE, "select * from public.caramelo_admin_catalog_v1");
});

test("cópia exige aquisição e acesso ao LAB, sem aceitar só um JWT válido", async () => {
  await denied(BRUNO, "select public.get_caramelo_prompt_copy('example')");
  await denied(BLOCKED, "select public.get_caramelo_prompt_copy('example')");
  const row = (await query(ALICE, "select public.get_caramelo_prompt_copy('example') as result")).rows[0];
  assert.deepEqual(row, { result: { success: true, slug: "example", title: "Exemplo", prompt: "TEXTO COMPLETO PRIVADO" } });
  for (const [slug, error] of [["hidden", "prompt_not_found"], ["missing", "prompt_not_found"], ["empty", "payload_not_found"]]) {
    assert.deepEqual((await query(ALICE, "select public.get_caramelo_prompt_copy($1) as result", [slug])).rows, [{ result: { success: false, error } }]);
  }
});

test("catálogo público da Loja preserva metadados sem liberar conteúdo completo", async () => {
  const rows = (await query(null, "select * from public.caramelo_public_catalog_v1 order by id")).rows;
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => Object.keys(row).sort().join(",") === "id,slug,title"));
});

test("todos os overloads de edição negam anon, membro comum e administrador revogado", async () => {
  for (const uid of [null, ALICE, BLOCKED]) {
    await denied(uid, "select public.save_caramelo_prompt_admin('one',false)");
    await denied(uid, "select public.save_caramelo_prompt_admin('one','ALTERAÇÃO NÃO AUTORIZADA',null)");
  }
  assert.equal((await db.query<{ title: string }>("select title from public.prompts where id='one'")).rows[0].title, "Exemplo");
});

test("admin ativo e service_role no servidor preservam edição e defaults", async () => {
  await query(ADMIN, "select public.save_caramelo_prompt_admin(p_id=>'one',p_title=>'Editado pelo admin')");
  assert.deepEqual((await db.query("select title,author from public.prompts where id='one'")).rows, [{ title: "Editado pelo admin", author: null }]);
  await query(ADMIN, "select public.save_caramelo_prompt_admin('one',true)");
  await as("service_role", null, (tx) => tx.query("select public.save_caramelo_prompt_admin('one','Editado no servidor','Autor')"));
  assert.deepEqual((await db.query("select title,author from public.prompts where id='one'")).rows, [{ title: "Editado no servidor", author: "Autor" }]);
});

test("originais e helper privado não permitem bypass direto nem depois de reaplicar", async () => {
  for (const uid of [null, ALICE, ADMIN]) {
    await denied(uid, "select lab_tool_private.assert_prompt_admin()");
    await denied(uid, "select lab_tool_private.save_caramelo_prompt_admin('one',false)");
  }
  await db.exec(script);
  await denied(ALICE, "select public.save_caramelo_prompt_admin('one',false)");
  await query(ADMIN, "select public.save_caramelo_prompt_admin('one',true)");
});

test("flick não permite leitura/escrita anônima, mesmo com as políticas legadas true", async () => {
  for (const table of ["flick_projects", "flick_chat_threads", "flick_jobs", "flick_media", "flick_settings"]) {
    await denied(null, `select * from public.${table}`);
    await denied(null, `delete from public.${table}`);
  }
});

test("TRUNCATE não contorna RLS com privilégios herdados antes da correção", async () => {
  for (const uid of [null, ALICE, ADMIN]) {
    for (const table of ["flick_projects", "flick_chat_threads", "flick_jobs", "flick_media", "flick_settings"]) {
      await denied(uid, `truncate public.${table} cascade`);
    }
  }
});

test("sessão de login anônimo do Supabase não autoriza conteúdo nem dados da ferramenta", async () => {
  await as("authenticated", ALICE, async (tx) => {
    await tx.exec(`select set_config('request.jwt.claims', '{"is_anonymous":true}', true)`);
    assert.deepEqual((await tx.query("select public.has_tool('claquete') as owned")).rows, [{ owned: false }]);
  });
  await as("authenticated", ALICE, async (tx) => {
    await tx.exec(`select set_config('request.jwt.claims', '{"is_anonymous":true}', true)`);
    await assert.rejects(tx.query("select public.get_caramelo_prompt_copy('example')"), /Entre no LAB/);
  });
  for (const table of ["flick_projects", "flick_chat_threads", "flick_jobs", "flick_media"]) {
    await as("authenticated", ALICE, async (tx) => {
      await tx.exec(`select set_config('request.jwt.claims', '{"is_anonymous":true}', true)`);
      assert.deepEqual((await tx.query(`select id from public.${table}`)).rows, []);
    });
  }
});

test("cada dono só vê seus projetos, threads, jobs e mídia enquanto tem a ferramenta", async () => {
  for (const table of ["flick_projects", "flick_chat_threads", "flick_jobs", "flick_media"]) {
    assert.deepEqual((await query(ALICE, `select id from public.${table}`)).rows, [{ id: "alice" }]);
    assert.equal((await query(BRUNO, `select id from public.${table}`)).rows.length, 0);
    assert.equal((await query(BLOCKED, `select id from public.${table}`)).rows.length, 0);
    assert.equal((await query(ALICE, `delete from public.${table} where id='bruno'`)).affectedRows, 0);
  }
  assert.equal((await db.query<{ n: number }>("select count(*)::int as n from public.flick_projects")).rows[0].n, 3, "inclui dados sem dono preservados");
});

test("RLS bloqueia forjar dono, mover projeto e vincular jobs/mídia a outro usuário", async () => {
  await denied(ALICE, "insert into public.flick_projects values ('forged',$1,'x')", [BRUNO]);
  await denied(ALICE, "update public.flick_projects set user_id=$1 where id='alice'", [BRUNO]);
  await denied(ALICE, "insert into public.flick_jobs values ('forged','bruno','x')");
  await denied(ALICE, "insert into public.flick_media values ('forged','bruno','x')");
  await denied(ALICE, "insert into public.flick_chat_threads values ('forged-thread','bruno',$1,'x')", [ALICE]);
  await denied(ALICE, "update public.flick_chat_threads set project_id='bruno' where id='alice'");
  await denied(BRUNO, "insert into public.flick_projects values ('without-tool',$1,'x')", [BRUNO]);
  await query(ALICE, "insert into public.flick_projects values ('owned-new',$1,'Novo')", [ALICE]);
  await query(ALICE, "insert into public.flick_jobs values ('owned-job','owned-new','permitido')");
  assert.deepEqual((await query(ALICE, "select id from public.flick_jobs order by id")).rows, [{ id: "alice" }, { id: "owned-job" }]);
});

test("configuração global só fica disponível ao servidor, sem apagar conteúdo", async () => {
  await denied(ALICE, "select * from public.flick_settings");
  const rows = await as("service_role", null, (tx) => tx.query("select value from public.flick_settings"));
  assert.deepEqual(rows.rows, [{ value: "CONFIGURAÇÃO PRIVADA" }]);
});

test("No Ar e Montagem não ganham tabelas fictícias e ausência de flick é suportada", async () => {
  const isolated = new PGlite();
  try {
    await isolated.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
      create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
      create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$;
      create table public.user_tools (user_id uuid, tool_slug text);
      create function public.lab_member() returns boolean language sql as $$ select false $$;`);
    await isolated.exec(script);
    await isolated.exec(script);
    assert.deepEqual((await isolated.query("select tablename from pg_tables where schemaname='public'")).rows, [{ tablename: "user_tools" }]);
  } finally { await isolated.close(); }
});
