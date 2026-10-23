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
const PREVIOUS_OWNER = "00000000-0000-4000-8000-00000000000e";
const TOOL_SLUGS = ["prompt-library", "kanban", "prancheta", "automation", "academy", "claquete", "comunidade", "gravador", "montagem"];

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
    const tools = await as(null, (tx) => rows<{ slug: string; available: boolean }>(tx, "select slug, available from public.lab_tools order by appid"));
    assert.deepEqual(tools, TOOL_SLUGS.map((slug) => ({ slug, available: slug === "prompt-library" || slug === "prancheta" || slug === "gravador" || slug === "montagem" })));
    const owned = await as(ALICE, (tx) => rows(tx, "select * from public.user_tools"));
    assert.equal(owned.length, 0);
  });

  test("biblioteca de prompts, prancheta, No Ar e montagem ficam liberadas e as demais ficam em breve", async () => {
    // Simula um banco já configurado: catálogo liberado e uma aquisição anterior à mudança.
    await db.query("insert into auth.users (id) values ($1)", [PREVIOUS_OWNER]);
    await db.query("insert into public.lab_access (user_id, verified_at, member_at) values ($1, now(), now())", [PREVIOUS_OWNER]);
    await db.exec("update public.lab_tools set available = true");
    await db.exec("alter table public.lab_tools alter column available set default true");
    const [previous] = await as(PREVIOUS_OWNER, (tx) => rows(tx, "select * from public.acquire_tool('prompt-library')"));
    await db.exec(sql("lab-tools.sql"));

    const tools = await as(null, (tx) => rows<{ slug: string; available: boolean }>(tx, "select slug, available from public.lab_tools order by appid"));
    assert.deepEqual(tools, TOOL_SLUGS.map((slug) => ({ slug, available: slug === "prompt-library" || slug === "prancheta" || slug === "gravador" || slug === "montagem" })));
    const future = await db.query<{ available: boolean }>("insert into public.lab_tools (slug, appid, name) values ('futura', 99, 'Futura') returning available");
    assert.deepEqual(future.rows, [{ available: false }]);
    await db.exec("delete from public.lab_tools where slug = 'futura'");
    for (const slug of TOOL_SLUGS.filter((s) => s !== "prompt-library" && s !== "prancheta" && s !== "gravador" && s !== "montagem")) {
      assert.match(await rejects(ALICE, "select public.acquire_tool($1)", [slug]), /Em breve/);
    }
    assert.deepEqual(await as(PREVIOUS_OWNER, (tx) => rows(tx, "select * from public.user_tools")), [previous]);
    assert.deepEqual(await as(PREVIOUS_OWNER, (tx) => rows(tx, "select public.has_tool('prompt-library') as owned")), [{ owned: true }]);
    // A biblioteca de prompts pode ser adquirida normalmente
    const [acquired] = await as(ALICE, (tx) => rows<{ tool_slug: string }>(tx, "select * from public.acquire_tool('prompt-library')"));
    assert.equal(acquired.tool_slug, "prompt-library");
    // Limpeza de Alice para não interferir nos testes seguintes
    await db.query("delete from public.user_tools where user_id = $1", [ALICE]);
  });

  test("ninguém grava direto na biblioteca", async () => {
    const message = await rejects(ALICE, "insert into public.user_tools (user_id, tool_slug) values ($1, 'kanban')", [ALICE]);
    assert.match(message, /permission denied/);
  });
  test("instalação da Montagem preserva configurações e permite adquirir e remover só da própria conta",async()=>{
    await db.exec("update public.lab_tools set available=false where slug='montagem'");
    const before=(await db.query("select slug, available from public.lab_tools order by appid")).rows;
    await db.exec(sql('montagem.sql'));
    assert.deepEqual((await db.query("select slug, available from public.lab_tools order by appid")).rows,before);
    await db.exec("update public.lab_tools set available=true where slug='montagem'");
    await as(ALICE,tx=>tx.query("select public.acquire_tool('montagem')"));
    assert.deepEqual(await as(ALICE,tx=>rows(tx,"select public.has_tool('montagem') as owned")),[{owned:true}]);
    assert.deepEqual(await as(BRUNO,tx=>rows(tx,"select public.has_tool('montagem') as owned")),[{owned:false}]);
    await as(ALICE,tx=>tx.query("select public.release_tool('montagem')"));
    assert.deepEqual(await as(ALICE,tx=>rows(tx,"select public.has_tool('montagem') as owned")),[{owned:false}]);
  });

  test("instalação do No Ar preserva o catálogo e permite adquirir e remover só da própria conta", async () => {
    await db.exec("update public.lab_tools set name = 'Gravador', available = false where slug = 'gravador'");
    const before = (await db.query("select slug, available, price_cents from public.lab_tools order by appid")).rows;
    assert.equal(sql("no-ar.sql"), sql("migrations/20261023013201_no_ar.sql"), "Script manual e migração devem ser equivalentes");
    await db.exec(sql("no-ar.sql"));
    await db.exec(sql("no-ar.sql"));
    assert.deepEqual((await db.query("select slug, available, price_cents from public.lab_tools order by appid")).rows, before);
    assert.deepEqual((await db.query("select appid, name from public.lab_tools where slug = 'gravador'")).rows, [{ appid: 9, name: "No Ar" }]);
    await db.exec("update public.lab_tools set available = true where slug = 'gravador'");
    await as(ALICE, (tx) => tx.query("select public.acquire_tool('gravador')"));
    await as(BRUNO, (tx) => tx.query("select public.acquire_tool('gravador')"));
    assert.deepEqual(await as(ALICE, (tx) => rows(tx, "select public.has_tool('gravador') as owned")), [{ owned: true }]);
    assert.deepEqual(await as(ALICE, (tx) => rows(tx, "select public.release_tool('gravador') as result")), [{ result: { slug: "gravador", removed: true } }]);
    assert.deepEqual(await as(ALICE, (tx) => rows(tx, "select public.release_tool('gravador') as result")), [{ result: { slug: "gravador", removed: false } }]);
    assert.deepEqual(await as(BRUNO, (tx) => rows(tx, "select public.has_tool('gravador') as owned")), [{ owned: true }]);
    assert.match(await rejects(null, "select public.release_tool('gravador')"), /permission denied/);
    await as(BRUNO, (tx) => tx.query("select public.release_tool('gravador')"));
  });

  test("acquire_tool adiciona a ferramenta só para quem pediu", async () => {
    // Apenas esta fixture libera as ferramentas, depois de verificar o estado oficial “Em breve”.
    await db.exec("update public.lab_tools set available = true");
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
    await db.exec("insert into public.lab_tools (slug, appid, name, price_cents, available) values ('paga', 99, 'Paga', 990, true)");
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
    assert.match(await rejects(CLARA, "insert into public.kanban_boards (name) values ('x')"), /row-level security|biblioteca/);
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

describe("remoção de ferramentas e dados próprios", () => {
  const OWNER = "00000000-0000-4000-8000-0000000000d1";
  const OTHER = "00000000-0000-4000-8000-0000000000d2";
  const privateTables = {
    kanban: ["kanban_boards", "kanban_labels", "kanban_lists", "kanban_cards", "kanban_comments", "kanban_activity"],
    prancheta: ["prancheta_files"],
    automation: ["automation_fluxes", "automation_flux_versions", "automation_executions", "automation_connections"],
    academy: ["academy_progress", "academy_favorites", "academy_notes", "academy_comments", "academy_comment_likes"],
  };
  let otherReply: string;
  let ownComment: string;
  let contentBefore: Record<string, number>;

  const count = async (table: string, uid: string) =>
    (await db.query<{ n: number }>(`select count(*)::int as n from public.${table} where user_id = $1`, [uid])).rows[0].n;
  const release = async (uid: string, slug: string) =>
    (await as(uid, (tx) => rows<{ result: { slug: string; removed: boolean } }>(tx, "select public.release_tool($1) as result", [slug])))[0].result;
  const seedKanban = async (uid: string) => as(uid, async (tx) => {
    const [board] = await rows<{ id: string }>(tx, "insert into public.kanban_boards (name) values ('Meu quadro') returning id");
    await tx.query("insert into public.kanban_labels (board_id, name, color) values ($1, 'Etiqueta', 'caramel')", [board.id]);
    const [list] = await rows<{ id: string }>(tx, "insert into public.kanban_lists (board_id, name) values ($1, 'Lista') returning id", [board.id]);
    const [card] = await rows<{ id: string }>(tx, "insert into public.kanban_cards (board_id, list_id, name) values ($1, $2, 'Cartão') returning id", [board.id, list.id]);
    await tx.query("insert into public.kanban_comments (card_id, body) values ($1, 'Anotação')", [card.id]);
    await tx.query("insert into public.kanban_activity (board_id, text) values ($1, 'Atividade')", [board.id]);
  });

  before(async () => {
    await db.query("insert into auth.users (id, email) values ($1, 'owner@lab.test'), ($2, 'other@lab.test')", [OWNER, OTHER]);
    await db.query("insert into public.lab_access (user_id, verified_at, member_at) values ($1, now(), now()), ($2, now(), now())", [OWNER, OTHER]);
    for (const uid of [OWNER, OTHER]) {
      // Fixture de direitos já adquiridos; a remoção não depende de a Loja estar aberta.
      await db.query("insert into public.user_tools (user_id, tool_slug) select $1, slug from public.lab_tools", [uid]);
      await seedKanban(uid);
      await as(uid, async (tx) => {
        await tx.query("insert into public.prancheta_files (name, document) values ('Projeto privado', '{}')");
        const [flux] = await rows<{ id: string }>(tx, "insert into public.automation_fluxes (name) values ('Fluxo privado') returning id");
        await tx.query("insert into public.automation_flux_versions (flux_id, name, steps) values ($1, 'Versão', '[]')", [flux.id]);
        await tx.query("insert into public.automation_executions (flux_id, status) values ($1, 'success')", [flux.id]);
        await tx.query("insert into public.automation_connections (name, app) values ('Minha conexão', 'sheets')");
        const [lesson] = await rows<{ id: string }>(tx, "select id from public.academy_lessons limit 1");
        await tx.query("insert into public.academy_progress (lesson_id) values ($1)", [lesson.id]);
        await tx.query("insert into public.academy_favorites (lesson_id) values ($1)", [lesson.id]);
        await tx.query("insert into public.academy_notes (lesson_id, body) values ($1, 'Nota privada')", [lesson.id]);
      });
    }
    const [lesson] = (await db.query<{ id: string }>("select id from public.academy_lessons limit 1")).rows;
    [{ id: ownComment }] = await as(OWNER, (tx) => rows<{ id: string }>(tx, "insert into public.academy_comments (lesson_id, body) values ($1, 'Comentário a remover') returning id", [lesson.id]));
    [{ id: otherReply }] = await as(OTHER, (tx) => rows<{ id: string }>(tx, "insert into public.academy_comments (lesson_id, parent_id, body) values ($1, $2, 'Resposta de outra pessoa') returning id", [lesson.id, ownComment]));
    await as(OWNER, (tx) => tx.query("insert into public.academy_comment_likes (comment_id) values ($1)", [otherReply]));
    await as(OTHER, (tx) => tx.query("insert into public.academy_comment_likes (comment_id) values ($1), ($2)", [ownComment, otherReply]));
    contentBefore = {};
    for (const table of ["academy_courses", "academy_modules", "academy_lessons"]) {
      contentBefore[table] = (await db.query<{ n: number }>(`select count(*)::int as n from public.${table}`)).rows[0].n;
    }
  });

  test("não permite anônimo, slug inválido nem escolher outra pessoa", async () => {
    assert.match(await rejects(null, "select public.release_tool('kanban')"), /permission denied/);
    assert.match(await rejects(OWNER, "select public.release_tool('kanban; delete from auth.users')"), /Ferramenta não encontrada/);
    assert.match(await rejects(OWNER, "select public.release_tool(null)"), /Ferramenta não encontrada/);
    assert.match(await rejects(OWNER, "select public.release_tool('kanban', $1)", [OTHER]), /does not exist/);
    assert.deepEqual(await release(CLARA, "kanban"), { slug: "kanban", removed: false });
    assert.equal(await count("kanban_boards", OWNER), 1);
    assert.equal(await count("kanban_boards", OTHER), 1);
  });

  test("Kanban apaga todas as tabelas próprias mesmo com acesso ao LAB revogado", async () => {
    await db.query("update public.lab_access set member_at = null where user_id = $1", [OWNER]);
    assert.deepEqual(await release(OWNER, "kanban"), { slug: "kanban", removed: true });
    for (const table of privateTables.kanban) {
      assert.equal(await count(table, OWNER), 0, table);
      assert.equal(await count(table, OTHER), 1, `${table} de outra pessoa`);
    }
    assert.equal(await count("prancheta_files", OWNER), 1);
    assert.deepEqual(await release(OWNER, "kanban"), { slug: "kanban", removed: false });
    await db.query("update public.lab_access set member_at = now() where user_id = $1", [OWNER]);
    await as(OWNER, (tx) => tx.query("select public.acquire_tool('kanban')"));
    assert.equal(await count("kanban_boards", OWNER), 0, "adquirir novamente começa vazio");
  });

  test("Prancheta e Automation limpam arquivos, versões, execuções e conexões só do dono", async () => {
    for (const slug of ["prancheta", "automation"] as const) {
      assert.deepEqual(await release(OWNER, slug), { slug, removed: true });
      for (const table of privateTables[slug]) {
        assert.equal(await count(table, OWNER), 0, table);
        assert.equal(await count(table, OTHER), 1, `${table} de outra pessoa`);
      }
      await as(OWNER, (tx) => tx.query("select public.acquire_tool($1)", [slug]));
      for (const table of privateTables[slug]) assert.equal(await count(table, OWNER), 0, `${table} começa vazia`);
    }
  });

  test("Academy preserva aulas e respostas de terceiros ao apagar todos os dados do aluno", async () => {
    assert.deepEqual(await release(OWNER, "academy"), { slug: "academy", removed: true });
    for (const table of privateTables.academy) assert.equal(await count(table, OWNER), 0, table);
    const [reply] = (await db.query<{ parent_id: string | null; body: string; user_id: string }>("select parent_id, body, user_id from public.academy_comments where id = $1", [otherReply])).rows;
    assert.deepEqual(reply, { parent_id: null, body: "Resposta de outra pessoa", user_id: OTHER });
    assert.equal(await count("academy_comment_likes", OTHER), 1, "curtida na resposta preservada; alvo apagado perde curtidas por FK");
    for (const table of ["academy_progress", "academy_favorites", "academy_notes"]) assert.equal(await count(table, OTHER), 1, table);
    for (const [table, n] of Object.entries(contentBefore)) {
      assert.equal((await db.query<{ n: number }>(`select count(*)::int as n from public.${table}`)).rows[0].n, n, table);
    }
    await as(OWNER, (tx) => tx.query("select public.acquire_tool('academy')"));
    for (const table of privateTables.academy) assert.equal(await count(table, OWNER), 0, `${table} começa vazia`);
  });

  test("qualquer falha reverte a limpeza e mantém a ferramenta na biblioteca", async () => {
    await seedKanban(OWNER);
    await db.exec(`create function public.test_fail_tool_removal() returns trigger language plpgsql as $$
      begin raise exception 'falha simulada na remoção'; end $$;
      create trigger test_fail_tool_removal before delete on public.user_tools
      for each row when (old.user_id = '${OWNER}'::uuid and old.tool_slug = 'kanban')
      execute function public.test_fail_tool_removal();`);
    try {
      assert.match(await rejects(OWNER, "select public.release_tool('kanban')"), /falha simulada/);
      for (const table of privateTables.kanban) assert.equal(await count(table, OWNER), 1, `${table} restaurada`);
      assert.deepEqual(await as(OWNER, (tx) => rows(tx, "select public.has_tool('kanban') as owned")), [{ owned: true }]);
    } finally {
      await db.exec("drop trigger test_fail_tool_removal on public.user_tools; drop function public.test_fail_tool_removal()");
    }
  });

  test("tabelas privadas têm proteção de escrita sincronizada com a remoção", async () => {
    const tables = Object.values(privateTables).flat();
    const protectedTables = (await db.query<{ table_name: string }>(`select event_object_table as table_name
      from information_schema.triggers where trigger_schema = 'public' and trigger_name = 'tool_write_lock'
      group by event_object_table order by event_object_table`)).rows.map((r) => r.table_name);
    assert.deepEqual(protectedTables, [...tables].sort());
    await release(OWNER, "prancheta");
    assert.match(await rejects(OWNER, "insert into public.prancheta_files (name, document) values ('Escrita atrasada', '{}')"), /biblioteca|row-level security/);
    assert.equal(await count("prancheta_files", OWNER), 0);
  });

  test("ferramentas com tabelas opcionais ausentes também podem ser removidas", async () => {
    for (const slug of ["prompt-library", "claquete", "comunidade", "gravador", "montagem"]) {
      assert.deepEqual(await release(OWNER, slug), { slug, removed: true });
      assert.deepEqual(await release(OWNER, slug), { slug, removed: false });
    }
    assert.equal((await db.query<{ n: number }>("select count(*)::int as n from public.user_tools where user_id = $1", [OTHER])).rows[0].n, TOOL_SLUGS.length);
  });
});

describe("remoção de dados dos módulos opcionais", () => {
  const OWNER = "00000000-0000-4000-8000-0000000000f1";
  const OTHER = "00000000-0000-4000-8000-0000000000f2";

  const count = async (table: string, column: string, value: string) =>
    (await db.query<{ n: number }>(`select count(*)::int as n from public.${table} where ${column} = $1`, [value])).rows[0].n;

  before(async () => {
    // Somente as colunas/FKs confirmadas no esquema real, sem replicar seus dados.
    await db.exec(`
      create table public.caramelo_personal_prompts (id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references auth.users(id), body text);
      create table public.caramelo_prompt_observations (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, anonymous_identity_id text, body text);
      create table public.flick_projects (id text primary key, user_id uuid references auth.users(id) on delete set null);
      create table public.flick_chat_threads (id text primary key, user_id uuid references auth.users(id) on delete set null, project_id text references public.flick_projects(id) on delete cascade);
      create table public.flick_jobs (id text primary key, project_id text not null references public.flick_projects(id) on delete cascade);
      create table public.flick_media (id text primary key, project_id text references public.flick_projects(id) on delete cascade);
      create table public.flick_settings (id text primary key, value text);
      create table public.user_app_progress (user_id uuid primary key references auth.users(id), brand_form_data jsonb);
    `);
    await db.exec(sql("lab-tools.sql"));
    await db.query("insert into auth.users (id) values ($1), ($2)", [OWNER, OTHER]);
    await db.query("insert into public.lab_access (user_id, verified_at, member_at) values ($1, now(), now()), ($2, now(), now())", [OWNER, OTHER]);
    for (const uid of [OWNER, OTHER]) {
      await db.query("insert into public.user_tools (user_id, tool_slug) select $1, slug from public.lab_tools", [uid]);
      await db.query("insert into public.caramelo_personal_prompts (owner_user_id, body) values ($1, 'Prompt pessoal')", [uid]);
      await db.query("insert into public.caramelo_prompt_observations (user_id, body) values ($1, 'Observação')", [uid]);
      await db.query("insert into public.user_app_progress (user_id, brand_form_data) values ($1, '{}')", [uid]);
    }
    await db.exec("insert into public.caramelo_prompt_observations (anonymous_identity_id, body) values ('anon-preservado', 'Observação anônima')");
    await db.query("insert into public.flick_projects (id, user_id) values ('project-owner', $1), ('project-other', $2)", [OWNER, OTHER]);
    await db.query(`insert into public.flick_chat_threads (id, user_id, project_id) values
      ('thread-owner', $1, 'project-owner'), ('thread-owner-in-other-project', $1, 'project-other'),
      ('thread-other', $2, 'project-other')`, [OWNER, OTHER]);
    await db.exec(`
      insert into public.flick_jobs (id, project_id) values ('job-owner', 'project-owner'), ('job-other', 'project-other');
      insert into public.flick_media (id, project_id) values ('media-owner', 'project-owner'), ('media-other', 'project-other'), ('media-unowned', null);
      insert into public.flick_settings (id, value) values ('shared', 'Preservado');
      grant insert on public.caramelo_personal_prompts, public.flick_projects to authenticated;
    `);
  });

  test("Biblioteca apaga prompts pessoais e observações próprias sem atingir acervo ou anônimos", async () => {
    await as(OWNER, (tx) => tx.query("select public.release_tool('prompt-library')"));
    assert.equal(await count("caramelo_personal_prompts", "owner_user_id", OWNER), 0);
    assert.equal(await count("caramelo_prompt_observations", "user_id", OWNER), 0);
    assert.equal(await count("caramelo_personal_prompts", "owner_user_id", OTHER), 1);
    assert.equal(await count("caramelo_prompt_observations", "user_id", OTHER), 1);
    assert.equal(await count("caramelo_prompt_observations", "anonymous_identity_id", "anon-preservado"), 1);
    assert.equal(await count("user_app_progress", "user_id", OWNER), 1, "produto Formação HEAD permanece intacto");
    assert.equal(await count("flick_projects", "user_id", OWNER), 1, "outra ferramenta permanece intacta");
    assert.match(await rejects(OWNER, "insert into public.caramelo_personal_prompts (owner_user_id) values ($1)", [OWNER]), /biblioteca/);
    await db.exec("update public.lab_tools set available = true where slug = 'prompt-library'");
    await as(OWNER, (tx) => tx.query("select public.acquire_tool('prompt-library')"));
    assert.equal(await count("caramelo_personal_prompts", "owner_user_id", OWNER), 0, "aquisição nova não restaura dados apagados");
  });

  test("Claquete apaga projetos, jobs, mídia e threads próprios; preserva configurações compartilhadas", async () => {
    await as(OWNER, (tx) => tx.query("select public.release_tool('claquete')"));
    assert.equal(await count("flick_projects", "user_id", OWNER), 0);
    assert.equal(await count("flick_chat_threads", "user_id", OWNER), 0);
    assert.equal(await count("flick_jobs", "project_id", "project-owner"), 0);
    assert.equal(await count("flick_media", "project_id", "project-owner"), 0);
    assert.equal(await count("flick_projects", "user_id", OTHER), 1);
    assert.equal(await count("flick_chat_threads", "user_id", OTHER), 1);
    assert.equal(await count("flick_jobs", "project_id", "project-other"), 1);
    assert.equal(await count("flick_media", "project_id", "project-other"), 1);
    assert.equal((await db.query<{ n: number }>("select count(*)::int as n from public.flick_media where project_id is null")).rows[0].n, 1);
    assert.deepEqual((await db.query("select value from public.flick_settings")).rows, [{ value: "Preservado" }]);
    assert.equal(await count("user_app_progress", "user_id", OWNER), 1);
    assert.equal((await db.query<{ n: number }>("select count(*)::int as n from auth.users where id = $1", [OWNER])).rows[0].n, 1);
    assert.match(await rejects(OWNER, "insert into public.flick_projects (id, user_id) values ('late-project', $1)", [OWNER]), /biblioteca/);
    await db.exec("update public.lab_tools set available = true where slug = 'claquete'");
    await as(OWNER, (tx) => tx.query("select public.acquire_tool('claquete')"));
    assert.equal(await count("flick_projects", "user_id", OWNER), 0);
  });

  test("todos os caminhos opcionais de escrita têm a trava de posse", async () => {
    const expected = ["caramelo_personal_prompts", "caramelo_prompt_observations", "flick_projects", "flick_chat_threads", "flick_jobs", "flick_media"].sort();
    const found = (await db.query<{ table_name: string }>(`select event_object_table as table_name
      from information_schema.triggers where trigger_schema = 'public' and trigger_name = 'tool_write_lock'
      and (event_object_table like 'flick_%' or event_object_table like 'caramelo_%')
      group by event_object_table order by event_object_table`)).rows.map((r) => r.table_name);
    assert.deepEqual(found, expected);
  });
});
