import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { before, describe, test } from "node:test";
import { PGlite, type Transaction } from "@electric-sql/pglite";

const root = path.resolve(import.meta.dirname, "..");
const sql = (file: string) => fs.readFileSync(path.join(root, "supabase", file), "utf8");

const ALICE = "00000000-0000-4000-8000-00000000000a";
const BRUNO = "00000000-0000-4000-8000-00000000000b";
const CARLA = "00000000-0000-4000-8000-00000000000c";

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}');
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  create table public.profiles (id uuid primary key references auth.users (id), name text, nickname text, avatar_url text);
`;

let db: PGlite;

async function as<T>(uid: string | null, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid ?? ""]);
    await tx.exec(uid ? "set local role authenticated" : "set local role anon");
    return fn(tx);
  });
}

const rows = async <T = Record<string, unknown>>(tx: Transaction, query: string, params: unknown[] = []) =>
  (await tx.query<T>(query, params)).rows;

before(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  await db.exec(sql("lab-access.sql"));
  await db.exec(sql("lab-tools.sql"));
  await db.exec(sql("creative-os.sql"));

  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
       ($1, 'alice@lab.test', '{"name": "Alice"}'),
       ($2, 'bruno@lab.test', '{"name": "Bruno"}'),
       ($3, 'carla@lab.test', '{"name": "Carla"}')`,
    [ALICE, BRUNO, CARLA],
  );
  await db.query(
    `insert into public.lab_access (user_id, whatsapp, verified_at, member_at) values
       ($1, '5531900000001', now(), now()),
       ($2, '5531900000002', now(), now()),
       ($3, '5531900000003', now(), now())`,
    [ALICE, BRUNO, CARLA],
  );
});

describe("Creative OS — Catálogo, Aquisição e Workspaces", () => {
  test("Creative OS está registrado na Loja e pode ser adquirido", async () => {
    const tool = await as(null, async (tx) => {
      const res = await rows<{ slug: string; appid: number; available: boolean }>(
        tx,
        "select slug, appid, available from public.lab_tools where slug = 'creative-os'",
      );
      return res[0];
    });
    assert.deepEqual(tool, { slug: "creative-os", appid: 11, available: true });

    // Alice adquire o Creative OS
    await as(ALICE, (tx) => tx.query("select public.acquire_tool('creative-os')"));
    const hasTool = await as(ALICE, async (tx) => {
      const res = await rows<{ has_tool: boolean }>(tx, "select public.has_tool('creative-os') as has_tool");
      return res[0].has_tool;
    });
    assert.equal(hasTool, true);

    // Bruno ainda não adquiriu
    const brunoHasTool = await as(BRUNO, async (tx) => {
      const res = await rows<{ has_tool: boolean }>(tx, "select public.has_tool('creative-os') as has_tool");
      return res[0].has_tool;
    });
    assert.equal(brunoHasTool, false);
  });

  test("Usuário cria workspace e gerencia clientes com RLS isolado", async () => {
    // Alice cria um estúdio/workspace
    const workspaceId = await as(ALICE, async (tx) => {
      const res = await rows<{ id: string }>(
        tx,
        `insert into public.creative_os_workspaces (owner_id, name, slug, service_type)
         values ($1, 'Estúdio Caramelo BH', 'estudio-caramelo', 'head_de_conteudo')
         returning id`,
        [ALICE],
      );
      return res[0].id;
    });
    assert.ok(workspaceId);

    // Bruno tenta listar workspaces e não vê o da Alice
    const brunoWorkspaces = await as(BRUNO, (tx) =>
      rows(tx, "select * from public.creative_os_workspaces"),
    );
    assert.equal(brunoWorkspaces.length, 0);

    // Alice cadastra um cliente e sua ficha de marca
    const clientId = await as(ALICE, async (tx) => {
      const res = await rows<{ id: string }>(
        tx,
        `insert into public.creative_os_clients (workspace_id, name, segment, monthly_fee_cents)
         values ($1, 'Cafeteria Especial BH', 'Gastronomia', 450000)
         returning id`,
        [workspaceId],
      );
      return res[0].id;
    });
    assert.ok(clientId);

    await as(ALICE, (tx) =>
      tx.query(
        `insert into public.creative_os_brand_profiles (workspace_id, client_id, purpose, tone_of_voice, is_validated)
         values ($1, $2, 'Elevar a cultura do café especial', 'Elegante, acolhedor e autoral', true)`,
        [workspaceId, clientId],
      ),
    );

    // Bruno adquire a ferramenta mas não consegue ler o cliente da Alice
    await as(BRUNO, (tx) => tx.query("select public.acquire_tool('creative-os')"));
    const brunoClients = await as(BRUNO, (tx) =>
      rows(tx, "select * from public.creative_os_clients"),
    );
    assert.equal(brunoClients.length, 0);

    // Alice cria projeto, entrega e versão
    const projectId = await as(ALICE, async (tx) => {
      const res = await rows<{ id: string }>(
        tx,
        `insert into public.creative_os_projects (workspace_id, client_id, name, template_type)
         values ($1, $2, 'Gestão Mensal Novembro', 'monthly_management')
         returning id`,
        [workspaceId, clientId],
      );
      return res[0].id;
    });

    const deliverableId = await as(ALICE, async (tx) => {
      const res = await rows<{ id: string }>(
        tx,
        `insert into public.creative_os_deliverables (workspace_id, project_id, client_id, title, format, status)
         values ($1, $2, $3, 'Carrossel: O Guia do Grão Perfeito', 'carrossel', 'client_review')
         returning id`,
        [workspaceId, projectId, clientId],
      );
      return res[0].id;
    });

    const versionId = await as(ALICE, async (tx) => {
      const res = await rows<{ id: string }>(
        tx,
        `insert into public.creative_os_deliverable_versions (deliverable_id, version_number, title, copy_text)
         values ($1, 1, 'V1 - Rascunho Inicial', 'Menos moagem grossa. Mais extração limpa.')
         returning id`,
        [deliverableId],
      );
      return res[0].id;
    });

    // Comentário interno não deve vazar para o cliente
    await as(ALICE, (tx) =>
      tx.query(
        `insert into public.creative_os_comments (deliverable_id, version_id, author_id, author_name, is_internal, comment_text)
         values ($1, $2, $3, 'Alice Designer', true, 'Atenção interna: conferir margens do slide 3.')`,
        [deliverableId, versionId, ALICE],
      ),
    );

    // Alice gera token de compartilhamento para o cliente
    const token = "token-cliente-seguro-12345678";
    await as(ALICE, (tx) =>
      tx.query(
        `insert into public.creative_os_client_shares (workspace_id, client_id, token, expires_at)
         values ($1, $2, $3, now() + interval '7 days')`,
        [workspaceId, clientId, token],
      ),
    );

    // Portal do cliente consulta os dados anonimamente com o token
    const portalData = await as(null, async (tx) => {
      const res = await rows<{ creative_os_get_portal_data: any }>(
        tx,
        "select public.creative_os_get_portal_data($1)",
        [token],
      );
      return res[0].creative_os_get_portal_data;
    });

    assert.equal(portalData.client_name, "Cafeteria Especial BH");
    assert.equal(portalData.brand_tone, "Elegante, acolhedor e autoral");
    assert.equal(portalData.deliverables.length, 1);
    assert.equal(portalData.deliverables[0].versions.length, 1);
    // Comentários internos NÃO estão presentes
    assert.equal(portalData.deliverables[0].comments.length, 0);

    // Cliente aprova via RPC segura com o token
    const decision = await as(null, async (tx) => {
      const res = await rows<{ creative_os_submit_client_decision: any }>(
        tx,
        `select public.creative_os_submit_client_decision(
           $1, $2, $3, 'approved', 'Aprovado com louvor! Pode agendar.', 'Dono da Cafeteria', 'dono@cafeteria.test'
         )`,
        [token, deliverableId, versionId],
      );
      return res[0].creative_os_submit_client_decision;
    });
    assert.equal(decision.success, true);
    assert.equal(decision.new_status, "approved");

    // Verifica status da entrega e registro imutável da aprovação
    const updatedDeliverable = await as(ALICE, async (tx) => {
      const res = await rows<{ status: string }>(
        tx,
        "select status from public.creative_os_deliverables where id = $1",
        [deliverableId],
      );
      return res[0].status;
    });
    assert.equal(updatedDeliverable, "approved");

    const approvals = await as(ALICE, (tx) =>
      rows(tx, "select * from public.creative_os_approvals where version_id = $1", [versionId]),
    );
    assert.equal(approvals.length, 1);
    assert.equal(approvals[0].status, "approved");
    assert.equal(approvals[0].decided_by_name, "Dono da Cafeteria");
  });

  test("Remoção da ferramenta apaga todos os dados próprios do usuário com release_tool", async () => {
    // Alice remove a ferramenta
    const releaseResult = await as(ALICE, async (tx) => {
      const res = await rows<{ release_tool: any }>(
        tx,
        "select public.release_tool('creative-os')",
      );
      return res[0].release_tool;
    });
    assert.deepEqual(releaseResult, { slug: "creative-os", removed: true });

    // Workspaces da Alice foram deletados
    const aliceWorkspaces = await as(ALICE, (tx) =>
      rows(tx, "select * from public.creative_os_workspaces where owner_id = $1", [ALICE]),
    );
    assert.equal(aliceWorkspaces.length, 0);

    // Alice não tem mais a ferramenta na biblioteca
    const hasTool = await as(ALICE, async (tx) => {
      const res = await rows<{ has_tool: boolean }>(tx, "select public.has_tool('creative-os') as has_tool");
      return res[0].has_tool;
    });
    assert.equal(hasTool, false);
  });
});
