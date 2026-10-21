import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { before, describe, test } from "node:test";
import { PGlite, type Transaction } from "@electric-sql/pglite";

/**
 * Runs supabase/lab-access.sql and supabase/lab-tools.sql on an in-memory Postgres with the
 * pieces of Supabase they rely on (auth.users, auth.uid(), the anon/authenticated roles), then
 * checks the store, the per-user tool databases and the Academy rules as real RLS sessions.
 */

const root = path.resolve(import.meta.dirname, "..");
const sql = (file: string) => fs.readFileSync(path.join(root, "supabase", file), "utf8");

const ALICE = "00000000-0000-4000-8000-00000000000a";
const BRUNO = "00000000-0000-4000-8000-00000000000b";
const CLARA = "00000000-0000-4000-8000-00000000000c"; // signed up, never confirmed the WhatsApp group
const ADMIN = "00000000-0000-4000-8000-0000000000ad";

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}');
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  create table public.profiles (id uuid primary key references auth.users (id), name text, nickname text, avatar_url text);
`;

let db: PGlite;

/** Runs fn inside a transaction as the given user (or as anon when uid is null). */
async function as<T>(uid: string | null, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid ?? ""]);
    await tx.exec(uid ? "set local role authenticated" : "set local role anon");
    return fn(tx);
  });
}

const rows = async <T = Record<string, unknown>>(tx: Transaction, query: string, params: unknown[] = []) =>
  (await tx.query<T>(query, params)).rows;

/** Expects the statement to fail; returns the Postgres error message. */
async function rejects(uid: string | null, query: string, params: unknown[] = []): Promise<string> {
  try {
    await as(uid, (tx) => tx.query(query, params));
  } catch (error) {
    return (error as Error).message;
  }
  assert.fail(`Expected to fail: ${query}`);
}

before(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  await db.exec(sql("lab-access.sql"));
  await db.exec(sql("lab-tools.sql"));
  // The script must be safe to run again.
  await db.exec(sql("lab-tools.sql"));

  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
       ($1, 'alice@lab.test', '{"name": "Alice"}'), ($2, 'bruno@lab.test', '{}'),
       ($3, 'clara@lab.test', '{}'), ($4, 'admin@lab.test', '{}')`,
    [ALICE, BRUNO, CLARA, ADMIN],
  );
  await db.query(`insert into public.profiles (id, name, nickname) values ($1, 'Alice Souza', 'alice'), ($2, 'Bruno Lima', null)`, [ALICE, BRUNO]);
  await db.query(
    `insert into public.lab_access (user_id, whatsapp, verified_at, member_at) values
       ($1, '5531900000001', now(), now()), ($2, '5531900000002', now(), now())`,
    [ALICE, BRUNO],
  );
  await db.query(`insert into public.lab_admins (user_id) values ($1)`, [ADMIN]);
});

describe("loja e biblioteca", () => {
  test("o catálogo é público e a biblioteca começa vazia", async () => {
    const tools = await as(null, (tx) => rows<{ slug: string }>(tx, "select slug from public.lab_tools order by appid"));
    assert.deepEqual(tools.map((t) => t.slug), ["prompt-library", "kanban", "prancheta", "automation", "academy", "claquete", "comunidade"]);
    const owned = await as(ALICE, (tx) => rows(tx, "select * from public.user_tools"));
    assert.equal(owned.length, 0);
  });

  test("ninguém grava direto na biblioteca", async () => {
    const message = await rejects(ALICE, "insert into public.user_tools (user_id, tool_slug) values ($1, 'kanban')", [ALICE]);
    assert.match(message, /permission denied/);
  });

  test("acquire_tool adiciona a ferramenta só para quem pediu", async () => {
    const [row] = await as(ALICE, (tx) => rows<{ user_id: string; tool_slug: string }>(tx, "select * from public.acquire_tool('kanban')"));
    assert.equal(row.user_id, ALICE);
    assert.equal(row.tool_slug, "kanban");
    // Adquirir de novo não duplica nem falha.
    await as(ALICE, (tx) => tx.query("select public.acquire_tool('kanban')"));
    const alice = await as(ALICE, (tx) => rows<{ tool_slug: string }>(tx, "select tool_slug from public.user_tools"));
    assert.deepEqual(alice.map((r) => r.tool_slug), ["kanban"]);
    const bruno = await as(BRUNO, (tx) => rows(tx, "select * from public.user_tools"));
    assert.equal(bruno.length, 0);
  });

  test("sem acesso confirmado ao LAB não dá para adquirir", async () => {
    assert.match(await rejects(CLARA, "select public.acquire_tool('kanban')"), /Confirme seu acesso ao LAB/);
    assert.match(await rejects(null, "select public.acquire_tool('kanban')"), /permission denied/);
  });

  test("ferramenta inexistente ou paga não entra pela loja", async () => {
    assert.match(await rejects(ALICE, "select public.acquire_tool('nada')"), /não está disponível/);
    await db.exec("insert into public.lab_tools (slug, appid, name, price_cents) values ('paga', 99, 'Paga', 990)");
    assert.match(await rejects(ALICE, "select public.acquire_tool('paga')"), /ainda não pode ser adquirida/);
    await db.exec("delete from public.lab_tools where slug = 'paga'");
  });
});

describe("Kanban: um banco por usuário", () => {
  let board: string;
  let list: string;

  before(async () => {
    await as(BRUNO, (tx) => tx.query("select public.acquire_tool('kanban')"));
    [board, list] = await as(ALICE, async (tx) => {
      const [b] = await rows<{ id: string }>(tx, "insert into public.kanban_boards (name) values ('Rotina') returning id");
      const [l] = await rows<{ id: string }>(tx, "insert into public.kanban_lists (board_id, name) values ($1, 'Segunda') returning id", [b.id]);
      await tx.query("insert into public.kanban_cards (board_id, list_id, name) values ($1, $2, '06h - Acordar')", [b.id, l.id]);
      return [b.id, l.id];
    });
  });

  test("o dono vê o quadro; outra pessoa com Kanban não vê nada", async () => {
    const mine = await as(ALICE, (tx) => rows(tx, "select name, user_id from public.kanban_cards"));
    assert.deepEqual(mine, [{ name: "06h - Acordar", user_id: ALICE }]);
    const other = await as(BRUNO, async (tx) => [
      ...(await rows(tx, "select id from public.kanban_boards")),
      ...(await rows(tx, "select id from public.kanban_lists")),
      ...(await rows(tx, "select id from public.kanban_cards")),
    ]);
    assert.equal(other.length, 0);
  });

  test("ninguém escreve no quadro de outra pessoa", async () => {
    const updated = await as(BRUNO, (tx) => tx.query("update public.kanban_cards set name = 'invadido'"));
    assert.equal(updated.affectedRows, 0);
    // Cartão próprio apontando para a lista alheia: a lista precisa ser do mesmo dono.
    assert.match(
      await rejects(BRUNO, "insert into public.kanban_cards (board_id, list_id, name) values ($1, $2, 'x')", [board, list]),
      /foreign key|violates/,
    );
    // Gravar em nome de outra pessoa.
    assert.match(
      await rejects(BRUNO, "insert into public.kanban_boards (user_id, name) values ($1, 'falso')", [ALICE]),
      /row-level security/,
    );
  });

  test("sem o Kanban na biblioteca o banco fica fechado", async () => {
    assert.match(await rejects(CLARA, "insert into public.kanban_boards (name) values ('x')"), /row-level security/);
    const seen = await as(ADMIN, (tx) => rows(tx, "select id from public.kanban_boards"));
    assert.equal(seen.length, 0);
  });

  test("perder o acesso ao LAB fecha o banco também", async () => {
    await db.query("update public.lab_access set member_at = null where user_id = $1", [ALICE]);
    const hidden = await as(ALICE, (tx) => rows(tx, "select id from public.kanban_boards"));
    assert.equal(hidden.length, 0);
    await db.query("update public.lab_access set member_at = now() where user_id = $1", [ALICE]);
    const back = await as(ALICE, (tx) => rows(tx, "select id from public.kanban_boards"));
    assert.equal(back.length, 1);
  });
});

describe("Prancheta e Automation", () => {
  test("arquivos da Prancheta são privados", async () => {
    await as(ALICE, async (tx) => {
      await tx.query("select public.acquire_tool('prancheta')");
      await tx.query(`insert into public.prancheta_files (name, document) values ('Capa', '{"version": 1}')`);
    });
    await as(BRUNO, (tx) => tx.query("select public.acquire_tool('prancheta')"));
    assert.equal((await as(BRUNO, (tx) => rows(tx, "select id from public.prancheta_files"))).length, 0);
    assert.equal((await as(ALICE, (tx) => rows(tx, "select id from public.prancheta_files"))).length, 1);
  });

  test("cada integração guarda as 200 execuções mais recentes", async () => {
    const counts = await as(ALICE, async (tx) => {
      await tx.query("select public.acquire_tool('automation')");
      const [flux] = await rows<{ id: string }>(tx, "insert into public.automation_fluxes (name) values ('Leads') returning id");
      await tx.query(
        `insert into public.automation_executions (flux_id, started_at, status)
         select $1, now() - make_interval(secs => g), 'success' from generate_series(1, 205) g`,
        [flux.id],
      );
      return rows<{ n: number; newest: boolean }>(
        tx,
        `select count(*)::int as n, bool_or(started_at > now() - interval '2 seconds') as newest
         from public.automation_executions where flux_id = $1`,
        [flux.id],
      );
    });
    assert.deepEqual(counts, [{ n: 200, newest: true }]);
  });

  test("conexões ficam com o dono", async () => {
    await as(ALICE, (tx) => tx.query("insert into public.automation_connections (name, app, credential_hint) values ('Planilha', 'sheets', '…a1b2')"));
    await as(BRUNO, (tx) => tx.query("select public.acquire_tool('automation')"));
    assert.equal((await as(BRUNO, (tx) => rows(tx, "select id from public.automation_connections"))).length, 0);
  });
});

describe("Academy", () => {
  let lesson: string;

  before(async () => {
    [{ id: lesson }] = await db.query<{ id: string }>("select id from public.academy_lessons").then((r) => r.rows);
  });

  test("a primeira aula vem publicada e só abre para quem tem a Academy", async () => {
    assert.equal((await as(ALICE, (tx) => rows(tx, "select id from public.academy_lessons"))).length, 0);
    await as(ALICE, (tx) => tx.query("select public.acquire_tool('academy')"));
    const visible = await as(ALICE, (tx) => rows<{ title: string; video_ref: string }>(tx, "select title, video_ref from public.academy_lessons"));
    assert.deepEqual(visible, [{ title: "Portfólio Head com IA", video_ref: "/aula-head/index.html" }]);
  });

  test("só o LAB cria e publica aulas", async () => {
    assert.match(await rejects(ALICE, "insert into public.academy_courses (slug, title) values ('x', 'X')"), /row-level security/);
    await as(ADMIN, async (tx) => {
      const [c] = await rows<{ id: string }>(tx, "insert into public.academy_courses (slug, title) values ('rascunho', 'Rascunho') returning id");
      const [m] = await rows<{ id: string }>(tx, "insert into public.academy_modules (course_id, title) values ($1, 'M1') returning id", [c.id]);
      await tx.query("insert into public.academy_lessons (course_id, module_id, title) values ($1, $2, 'Em produção')", [c.id, m.id]);
    });
    // Curso não publicado não aparece para os alunos.
    const titles = await as(ALICE, (tx) => rows<{ title: string }>(tx, "select title from public.academy_courses"));
    assert.deepEqual(titles.map((t) => t.title), ["Portfólio Head com IA"]);
  });

  test("comentários: a turma lê, cada um edita o seu e o LAB modera", async () => {
    await as(BRUNO, (tx) => tx.query("select public.acquire_tool('academy')"));
    const [comment] = await as(ALICE, (tx) =>
      rows<{ id: string; author_name: string }>(
        tx,
        "insert into public.academy_comments (lesson_id, body, author_name) values ($1, 'Que aula!', 'Outra pessoa') returning id, author_name",
        [lesson],
      ),
    );
    assert.equal(comment.author_name, "alice"); // vem do perfil, não do navegador

    const seen = await as(BRUNO, (tx) => rows<{ body: string }>(tx, "select body from public.academy_comments"));
    assert.deepEqual(seen, [{ body: "Que aula!" }]);
    assert.equal((await as(CLARA, (tx) => rows(tx, "select id from public.academy_comments"))).length, 0);

    assert.equal((await as(BRUNO, (tx) => tx.query("update public.academy_comments set body = 'x'"))).affectedRows, 0);
    assert.equal((await as(BRUNO, (tx) => tx.query("delete from public.academy_comments"))).affectedRows, 0);

    const [edited] = await as(ALICE, (tx) =>
      rows<{ body: string; edited: boolean; author_name: string }>(
        tx,
        "update public.academy_comments set body = 'Que aula boa!', author_name = 'Falso' where id = $1 returning body, edited, author_name",
        [comment.id],
      ),
    );
    assert.deepEqual(edited, { body: "Que aula boa!", edited: true, author_name: "alice" });

    const [reply] = await as(BRUNO, (tx) =>
      rows<{ author_name: string }>(
        tx,
        "insert into public.academy_comments (lesson_id, parent_id, body) values ($1, $2, 'Concordo') returning author_name",
        [lesson, comment.id],
      ),
    );
    assert.equal(reply.author_name, "Bruno Lima");

    await as(BRUNO, (tx) => tx.query("insert into public.academy_comment_likes (comment_id) values ($1)", [comment.id]));
    assert.equal((await as(ALICE, (tx) => rows(tx, "select user_id from public.academy_comment_likes"))).length, 1);

    assert.equal((await as(ADMIN, (tx) => tx.query("delete from public.academy_comments where id = $1", [comment.id]))).affectedRows, 1);
    // A resposta sai junto com o comentário.
    assert.equal((await as(BRUNO, (tx) => rows(tx, "select id from public.academy_comments"))).length, 0);
  });

  test("progresso, favoritos e anotações são só do aluno", async () => {
    await as(ALICE, async (tx) => {
      await tx.query("insert into public.academy_progress (lesson_id, completed_at) values ($1, now())", [lesson]);
      await tx.query("insert into public.academy_favorites (lesson_id) values ($1)", [lesson]);
      await tx.query("insert into public.academy_notes (lesson_id, body) values ($1, 'rever o bloco 2')", [lesson]);
    });
    const bruno = await as(BRUNO, async (tx) => [
      ...(await rows(tx, "select * from public.academy_progress")),
      ...(await rows(tx, "select * from public.academy_favorites")),
      ...(await rows(tx, "select * from public.academy_notes")),
    ]);
    assert.equal(bruno.length, 0);
    const [note] = await as(ALICE, (tx) => rows<{ body: string }>(tx, "select body from public.academy_notes"));
    assert.equal(note.body, "rever o bloco 2");
  });
});
