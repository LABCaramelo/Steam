import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

// The external-app patch is reviewable text, not part of Steam's build. Compile
// only its independent access helper; no external app config or secrets load.
const sourcePath = fileURLToPath(new URL('../security/claquete/files/server/access.ts.txt', import.meta.url));
const source = readFileSync(existsSync(sourcePath) ? sourcePath : sourcePath.replace(/\.txt$/, ''), 'utf8');
const require = createRequire(import.meta.url);
const sdk = pathToFileURL(require.resolve('@supabase/supabase-js')).href;
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
  .replace(/from ['"]@supabase\/supabase-js['"]/g, `from ${JSON.stringify(sdk)}`);
const securityUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`;
const security = await import(securityUrl);
const USER = '00000000-0000-4000-8000-000000000001';
const TOKEN = `signed.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`;
type MockResponse = { status?: number; body?: unknown } | Error;

async function mocked<T>(responses: MockResponse[], action: () => Promise<T>) {
  const original = globalThis.fetch;
  const calls: { url: string; options?: RequestInit }[] = [];
  globalThis.fetch = async (input, options) => {
    calls.push({ url: String(input), options });
    const response = responses.shift();
    assert.ok(response, 'Unexpected upstream request');
    if (response instanceof Error) throw response;
    return new Response(JSON.stringify(response.body), { status: response.status ?? 200 });
  };
  try { return { result: await action(), calls }; } finally { globalThis.fetch = original; }
}

test('Claquete denies missing, expired, anonymous and non-owning callers before project access', async () => {
  for (const [responses, token, status] of [
    [[], undefined, 401], [[{ status: 401 }], TOKEN, 401],
    [[{ body: { id: USER, is_anonymous: true } }], TOKEN, 401],
    [[{ body: { id: USER } }, { body: false }], TOKEN, 403],
    [[{ body: { id: USER } }, { body: 'true' }], TOKEN, 503],
    [[new Error('private upstream details')], TOKEN, 503],
  ] as [MockResponse[], string | undefined, number][]) {
    await mocked(responses, async () => {
      await assert.rejects(security.verifyAccess(token ? `Bearer ${token}` : undefined), (error: unknown) => {
        assert.ok(error instanceof security.AccessError);
        assert.equal((error as { status: number }).status, status);
        assert.doesNotMatch((error as Error).message, /private upstream details/);
        return true;
      });
    });
  }
});

test('Claquete preserves the caller JWT and explicit owner scope for project lookup', async () => {
  const verified = await mocked<{ userId: string; projects: Set<string> }>([{ body: { id: USER } }, { body: true }], () => security.verifyAccess(`Bearer ${TOKEN}`));
  assert.equal(verified.result.userId, USER);
  assert.match(verified.calls[0].url, /\/auth\/v1\/user$/);
  assert.deepEqual(JSON.parse(String(verified.calls[1].options?.body)), { p_slug: 'claquete' });
  const project = await mocked([{ body: { id: 'project-owned' } }], async () => {
    await security.accessScope.run(verified.result, () => security.requireProject('project-owned'));
  });
  const url = new URL(project.calls[0].url);
  assert.equal(url.searchParams.get('user_id'), `eq.${USER}`);
  assert.equal(new Headers(project.calls[0].options?.headers).get('Authorization'), `Bearer ${TOKEN}`);
  assert.ok(verified.result.projects.has('project-owned'));
  await mocked([{ body: null }], async () => {
    await assert.rejects(security.accessScope.run(verified.result, () => security.requireProject('victim-project')), (error: unknown) => (error as { status: number }).status === 404);
  });
  assert.ok(!verified.result.projects.has('victim-project'));
});

test('Claquete async jobs keep separate owners and cannot resolve unchecked media projects', async () => {
  const one = { userId: USER, projects: new Set(['project-one']) };
  const two = { userId: 'other-account', projects: new Set(['project-two']) };
  await Promise.all([one, two].map((context) => security.accessScope.run(context, async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(security.currentAccess().userId, context.userId);
    assert.equal(security.mayReadProjectMedia([...context.projects][0]), true);
    assert.equal(security.mayReadProjectMedia('unchecked-victim'), false);
  })));
  assert.throws(() => security.currentAccess(), (error: unknown) => (error as { status: number }).status === 401);
});

test('Claquete media cookies are short lived, HttpOnly and restricted to the media path', () => {
  const cookie = security.mediaCookie({ token: TOKEN, expiresAt: Date.now() + 3600_000 }, true);
  assert.match(cookie, /Path=\/media; HttpOnly; SameSite=Strict; Max-Age=300; Secure$/);
  assert.equal(security.mediaAuthorization(cookie), `Bearer ${TOKEN}`);
  assert.equal(security.mediaAuthorization('claquete_media_session=forged token'), undefined);
});

test('Claquete writeChat stamps the verified owner so new conversations pass owner RLS', async () => {
  const dataModule = (js: string) => `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;
  const configUrl = dataModule("export const PROJECTS_DIR='/unused', DATA_DIR='/unused', MEDIA_DIR='/unused', SUPABASE_SERVICE_ROLE_KEY='', SUPABASE_URL='';");
  const projectUrl = dataModule('export const normalizeProject = p => p; export const createEmptyProject = () => { throw new Error("not used"); };');
  const storageSource = readFileSync(new URL('../security/claquete/files/server/storage.ts.txt', import.meta.url), 'utf8');
  const storageJs = ts.transpileModule(storageSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
    .replace(/from ['"]@supabase\/supabase-js['"]/g, `from ${JSON.stringify(sdk)}`)
    .replace(/from ['"]\.\/config['"]/g, `from ${JSON.stringify(configUrl)}`)
    .replace(/from ['"]\.\.\/shared\/project['"]/g, `from ${JSON.stringify(projectUrl)}`)
    .replace(/from ['"]\.\/access['"]/g, `from ${JSON.stringify(securityUrl)}`);
  const storage = await import(dataModule(storageJs));
  const verified = await mocked<{ db: unknown; userId: string }>([{ body: { id: USER } }, { body: true }], () => security.verifyAccess(`Bearer ${TOKEN}`));
  const db = new PGlite();
  const originalFetch = globalThis.fetch;
  try {
    await db.exec(`
      create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to authenticated;
      create table flick_projects(id text primary key,user_id uuid);
      create table flick_chat_threads(id text primary key,project_id text references flick_projects(id),user_id uuid,title text,messages jsonb,openai_history jsonb,updated_at timestamptz);
      alter table flick_chat_threads enable row level security;
      grant select on flick_projects to authenticated;
      grant select,insert,update on flick_chat_threads to authenticated;
      create policy owned_threads on flick_chat_threads to authenticated
        using(user_id=auth.uid() and exists(select 1 from flick_projects p where p.id=project_id and p.user_id=auth.uid()))
        with check(user_id=auth.uid() and exists(select 1 from flick_projects p where p.id=project_id and p.user_id=auth.uid()));
    `);
    await db.query('insert into flick_projects values($1,$2),($3,$4)', ['project-owned', USER, 'victim-project', '00000000-0000-4000-8000-000000000002']);
    const insert = (row: Record<string, unknown>) => db.transaction(async (tx) => {
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [USER]);
      await tx.exec('set local role authenticated');
      return tx.query('insert into flick_chat_threads(id,project_id,user_id,title,messages,openai_history,updated_at) values($1,$2,$3,$4,$5,$6,$7)',
        [row.id, row.project_id, row.user_id ?? null, row.title, JSON.stringify(row.messages), JSON.stringify(row.openai_history), row.updated_at]);
    });
    let payload: Record<string, unknown> | undefined;
    globalThis.fetch = async (input, options) => {
      assert.match(String(input), /\/rest\/v1\/flick_chat_threads/);
      assert.equal(new Headers(options?.headers).get('Authorization'), `Bearer ${TOKEN}`);
      if (options?.method === 'DELETE') return new Response(null, { status: 204 });
      assert.equal(options?.method, 'POST');
      payload = JSON.parse(String(options.body))[0] as Record<string, unknown>;
      await insert(payload);
      return new Response('[]', { status: 201 });
    };
    const thread = { id: 'thread-owned', title: 'Minha conversa', messages: [], openai: [], updatedAt: new Date().toISOString() };
    await security.accessScope.run(verified.result, () => storage.writeChat('project-owned', { threads: { [thread.id]: thread } }));
    assert.equal(payload?.user_id, USER);
    assert.deepEqual((await db.query('select id,user_id,project_id from flick_chat_threads')).rows, [{ id: 'thread-owned', user_id: USER, project_id: 'project-owned' }]);
    await assert.rejects(insert({ ...payload, id: 'missing-owner', user_id: null }), /row-level security/);
    await assert.rejects(insert({ ...payload, id: 'wrong-project', project_id: 'victim-project' }), /row-level security/);
  } finally { globalThis.fetch = originalFetch; await db.close(); }
});
