import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { uploadFile, getFile, deleteFile, listFiles, cleanupDeletedFiles, MAX_FILE_BYTES } from './trama/files.mjs';
import { acquireWorkspace, commitWorkspace, TramaPersistenceError } from './trama/persistence.mjs';

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';
let db: PGlite;
const root = path.resolve(import.meta.dirname, '..');
const sql = (name: string) => fs.readFileSync(path.join(root, 'supabase', name), 'utf8');
const state = { documents: [{ collection: 'flows', id: 'one', data: { name: 'Meu fluxo' }, org_id: A }], events: {} };
async function as<T>(uid: string | null, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async tx => {
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [uid ?? '']);
    await tx.exec(uid ? 'set local role authenticated' : 'set local role anon');
    return fn(tx);
  });
}
async function acquire(uid: string) {
  return as(uid, async tx => (await tx.query<{ v: { lease_token: string; revision: number; state: unknown } }>('select public.acquire_trama_workspace() as v')).rows[0].v);
}
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;
    grant usage on schema auth,public to anon,authenticated,service_role;`);
  await db.exec(sql('lab-access.sql'));
  await db.exec(sql('lab-tools.sql'));
  await db.exec(sql('trama.sql'));
  await db.exec(sql('trama.sql'));
  await db.query('insert into auth.users(id) values($1),($2),($3)', [A,B,C]);
  await db.query('insert into public.lab_access(user_id,verified_at,member_at) values($1,now(),now()),($2,now(),now()),($3,now(),now())', [A,B,C]);
  await db.query("insert into public.user_tools(user_id,tool_slug) values($1,'automation'),($2,'automation')", [A,B]);
});
after(async () => { await db.close(); });

test('Trama preserves catalog availability and protects snapshots with owner RLS and RPC-only writes', async () => {
  const catalog = await db.query<{ name: string; available: boolean }>("select name,available from public.lab_tools where slug='automation'");
  assert.deepEqual(catalog.rows, [{ name: 'Trama', available: false }]);
  const lease = await acquire(A);
  assert.equal(lease.revision, 0);
  await as(A, tx => tx.query('select public.commit_trama_workspace($1,$2,$3)', [0,lease.lease_token,state]));
  assert.equal((await as(A, tx => tx.query('select state from public.automation_workspaces'))).rows.length, 1);
  assert.equal((await as(B, tx => tx.query('select state from public.automation_workspaces'))).rows.length, 0);
  await assert.rejects(as(A, tx => tx.query("update public.automation_workspaces set state='{}'")), /permission denied/);
  await assert.rejects(as(A, tx => tx.query('select lease_token from public.automation_workspaces')), /permission denied/);
  await assert.rejects(as(null, tx => tx.query('select public.acquire_trama_workspace()')), /permission denied/);
  await assert.rejects(acquire(C), /biblioteca/);
  await as(A, tx => tx.query('select public.release_trama_workspace($1)', [lease.lease_token]));
});

test('lease excludes concurrent requests, commit checks revision/token and retains lease until explicit release', async () => {
  const lease = await acquire(A);
  await assert.rejects(acquire(A), /Outra operação/);
  await assert.rejects(as(A, tx => tx.query('select public.commit_trama_workspace($1,$2,$3)', [lease.revision,A,state])), /bloqueio expirou/);
  const result = await as(A, tx => tx.query<{ n: number }>('select public.commit_trama_workspace($1,$2,$3) as n', [lease.revision,lease.lease_token,state]));
  assert.equal(result.rows[0].n, lease.revision + 1);
  await assert.rejects(acquire(A), /Outra operação/);
  await assert.rejects(as(A, tx => tx.query('select public.commit_trama_workspace($1,$2,$3)', [lease.revision,lease.lease_token,state])), /espaço mudou/);
  await as(A, tx => tx.query('select public.release_trama_workspace($1)', [lease.lease_token]));
  const next = await acquire(A);
  assert.notEqual(next.lease_token, lease.lease_token);
  await as(A, tx => tx.query('select public.release_trama_workspace($1)', [next.lease_token]));
});

test('malformed snapshots and foreign file references are rejected; release cascades to workspace/files and queues R2 cleanup', async () => {
  const lease = await acquire(B);
  await assert.rejects(as(B, tx => tx.query('select public.commit_trama_workspace($1,$2,$3)', [0,lease.lease_token,{documents:[]}])) , /Snapshot inválido/);
  const id = '00000000-0000-4000-8000-0000000000f1';
  await as(B, tx => tx.query("insert into public.automation_files(id,user_id,name,mime,size_bytes,r2_key) values($1,$2,'dados.json','application/json',2,$3)", [id,B,`trama/${B}/${id}`]));
  assert.equal((await as(A, tx => tx.query('select * from public.automation_files'))).rows.length,0);
  await assert.rejects(as(B, tx => tx.query("insert into public.automation_files(id,user_id,name,mime,size_bytes,r2_key) values(gen_random_uuid(),$1,'x','text/plain',1,'trama/other')",[B])), /trama_file_key/);
  await as(B, tx => tx.query("select public.release_tool('automation')"));
  assert.equal((await db.query('select * from public.automation_workspaces where user_id=$1',[B])).rows.length,0);
  assert.equal((await db.query('select * from public.automation_files where user_id=$1',[B])).rows.length,0);
  assert.equal((await db.query('select * from trama_private.r2_gc where r2_key=$1',[`trama/${B}/${id}`])).rows.length,1);
  await assert.rejects(as(A, tx => tx.query('select * from public.pending_trama_file_cleanup(100)')), /permission denied/);
  await assert.rejects(as(null, tx => tx.query('select public.confirm_trama_file_cleanup($1)',[[`trama/${B}/${id}`]])), /permission denied/);
  const pending = await db.transaction(async tx => { await tx.exec('set local role service_role'); return tx.query('select * from public.pending_trama_file_cleanup(100)'); });
  assert.equal(pending.rows.length,1);
  await assert.rejects(as(B, tx => tx.query('select public.commit_trama_workspace($1,$2,$3)', [0,lease.lease_token,state])), /biblioteca/);
});

test('service cleanup defaults to preview, restricts keys and confirms only successful private R2 deletes', async () => {
  const previous = { ...process.env }, original = globalThis.fetch;
  process.env.CLOUDFLARE_ACCOUNT_ID='test-account'; process.env.CLOUDFLARE_API_TOKEN='private-token';
  process.env.CLOUDFLARE_R2_PRIVATE_BUCKET='private-test'; process.env.CLOUDFLARE_R2_BUCKET='public-test';
  const id='00000000-0000-4000-8000-0000000000f1', key=`trama/${A}/${id}`, failed=`trama/${B}/${id}`;
  const confirmed: string[]=[]; let deletes=0;
  globalThis.fetch = async (url, options = {}) => {
    const uri=String(url);
    if (uri.includes('pending_trama_file_cleanup')) return Response.json([{r2_key:key},{r2_key:failed},{r2_key:'avatars/other'}]);
    if (uri.includes('confirm_trama_file_cleanup')) { const keys=JSON.parse(String(options.body)).p_keys; confirmed.push(...keys); return Response.json(keys.length); }
    assert.ok(uri.startsWith('https://api.cloudflare.com/client/v4/accounts/test-account/r2/buckets/private-test/objects/trama/'));
    deletes++; return new Response('{}',{status:uri.endsWith(failed)?502:200});
  };
  try {
    const credentials={supabaseUrl:'https://database.test',serviceKey:'server-secret'};
    assert.deepEqual(await cleanupDeletedFiles(credentials),{pending:3,deleted:0,failed:0,rejected:1,dryRun:true});
    assert.equal(deletes,0);
    assert.deepEqual(await cleanupDeletedFiles({...credentials,dryRun:false}),{pending:3,deleted:1,failed:1,rejected:1,dryRun:false});
    assert.equal(deletes,2); assert.deepEqual(confirmed,[key]);
  } finally { globalThis.fetch=original; for (const item of Object.keys(process.env)) if (!(item in previous)) delete process.env[item]; Object.assign(process.env,previous); }
});

test('private R2 helpers keep keys server-side and require matching user metadata for every download/delete', async () => {
  const previous = { ...process.env };
  const originalFetch = globalThis.fetch;
  process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';
  process.env.CLOUDFLARE_API_TOKEN = 'private-token';
  process.env.CLOUDFLARE_R2_PRIVATE_BUCKET = 'private-test';
  process.env.CLOUDFLARE_R2_BUCKET = 'public-test';
  const access = { user: { id: A }, token:'user-jwt', supabaseUrl:'https://database.test', supabaseKey:'publishable' };
  const stored: Record<string, unknown>[] = [];
  const objects = new Map<string,Buffer>();
  globalThis.fetch = async (url, options = {}) => {
    const uri = String(url), method = options.method ?? 'GET';
    const headers = options.headers as Record<string,string>;
    if (uri.startsWith('https://api.cloudflare.com')) {
      assert.ok(uri.includes('/buckets/private-test/objects/trama/'));
      assert.equal(headers.Authorization,'Bearer private-token');
      if (method === 'PUT') { objects.set(uri,Buffer.from(options.body as Buffer)); return new Response('{}'); }
      if (method === 'DELETE') { objects.delete(uri); return new Response('{}'); }
      return new Response(objects.get(uri));
    }
    assert.ok(uri.startsWith('https://database.test/rest/v1/automation_files'));
    assert.equal(headers.Authorization,'Bearer user-jwt');
    if (method === 'POST') { const row = JSON.parse(String(options.body)); stored.push({...row,created_at:'2026-10-28'}); return Response.json(stored); }
    if (method === 'DELETE') { stored.length = 0; return new Response(null,{status:204}); }
    return Response.json(stored);
  };
  try {
    const file = await uploadFile(access,{name:'dados.json',mime:'application/json',data:Buffer.from('{"ok":true}')});
    assert.equal(file.name,'dados.json');
    assert.equal('r2_key' in file,false);
    assert.equal('url' in file,false);
    assert.equal((await listFiles(access)).length,1);
    assert.equal((await getFile(access,file.id)).body.toString(),'{"ok":true}');
    await deleteFile(access,file.id);
    assert.equal(objects.size,0);
    await assert.rejects(getFile(access,file.id),/não encontrado/);
    await assert.rejects(uploadFile(access,{name:'x.html',mime:'text/html',data:Buffer.from('x')}),/Use TXT/);
    await assert.rejects(uploadFile(access,{name:'x.txt',mime:'text/plain',data:Buffer.alloc(MAX_FILE_BYTES+1)}),/2 MB/);
    process.env.CLOUDFLARE_R2_PRIVATE_BUCKET = 'public-test';
    await assert.rejects(uploadFile(access,{name:'x.txt',mime:'text/plain',data:Buffer.from('x')}),/privado/);
  } finally { globalThis.fetch = originalFetch; for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key]; Object.assign(process.env,previous); }
});

test('persistence adapter uses caller JWT, maps busy/conflict and verifies commit acknowledgement', async () => {
  const original = globalThis.fetch;
  const access = { user: { id: A }, token:'user-jwt', supabaseUrl:'https://database.test', supabaseKey:'publishable' };
  let code = '55P03';
  globalThis.fetch = async (_url,options) => {
    assert.equal((options?.headers as Record<string,string>).Authorization,'Bearer user-jwt');
    return Response.json({code},{status:400});
  };
  try {
    await assert.rejects(acquireWorkspace(access), error => error instanceof TramaPersistenceError && error.status === 409 && error.code === 'WORKSPACE_BUSY');
    code='40001';
    await assert.rejects(commitWorkspace(access,{revision:0,leaseToken:A,state}), error => error instanceof TramaPersistenceError && error.code === 'WORKSPACE_CONFLICT');
    globalThis.fetch = async () => Response.json({ok:true});
    await assert.rejects(commitWorkspace(access,{revision:0,leaseToken:A,state}), /não confirmou/);
  } finally { globalThis.fetch=original; }
});
