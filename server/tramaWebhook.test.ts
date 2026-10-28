import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { before,after,test } from 'node:test';
import { PGlite,type Transaction } from '@electric-sql/pglite';
import { createWebhookHandler } from './trama/webhook.mjs';
import { hashWebhookToken } from './trama/hooks.mjs';
import { MemoryStore } from './trama/memory-store.mjs';
import { initialFlow } from './trama/engine/initial-data.js';

const A='00000000-0000-4000-8000-00000000000a',B='00000000-0000-4000-8000-00000000000b';
const F='10000000-0000-4000-8000-000000000001',FB='10000000-0000-4000-8000-000000000002',O='20000000-0000-4000-8000-000000000001';
const TOKEN='a1'.repeat(32),HASH=hashWebhookToken(TOKEN),KEY='ab'.repeat(32);
function seed(owner=A,id=F,token=TOKEN){
  const store=new MemoryStore();store.put('users',{id:owner,fullname:'QA',email:'qa@trama.test'});
  store.put('organizations',{id:O,name:'QA',members:[{user_id:owner,role:'1',invite_accepted_at:new Date().toISOString()}]});
  const steps=[{id:'IN',app:'webhook',config:{}},{id:'http',app:'requester',config:{url:'https://fixture.test/published',method:'POST',body:'{{$IN.BODY}}'}},{id:'out',app:'return',config:{status:201,body:'{{$http.body}}'}}];
  const edges=[{source:'IN',target:'http'},{source:'http',target:'out'}];
  const flow={...initialFlow(O),id,webhook_token:token,active:true,steps,edges,published_version_id:'version-1',versions:[{id:'version-1',active:true,snapshot:{steps:structuredClone(steps),edges:structuredClone(edges),settings:{},test_input:{}}}]};
  store.put('flows',flow);return store.snapshot();
}
class ResponseStub extends EventEmitter{
  statusCode=200;headers:Record<string,string>={};chunks:Buffer[]=[];writableEnded=false;headersSent=false;
  setHeader(key:string,value:string){this.headers[key.toLowerCase()]=value;}
  hasHeader(key:string){return Object.hasOwn(this.headers,key.toLowerCase());}
  end(value?:string|Buffer){if(value)this.chunks.push(Buffer.from(value));this.writableEnded=true;this.headersSent=true;}
  value(){return JSON.parse(Buffer.concat(this.chunks).toString());}
}
function fixture(){
  let state=seed(),revision=0,locked=false,effects=0,commits=0,failAt=0;
  const checkpoints:ReturnType<typeof seed>[]=[];
  const handler=createWebhookHandler({configured:()=>true,encryptionKey:KEY,persistence:{
    async acquire(id:string,hash:string,capture:boolean){
      if(id!==F||hash!==HASH)throw Object.assign(new Error('Webhook não encontrado.'),{status:404,code:'WEBHOOK_NOT_FOUND'});
      if(locked)throw Object.assign(new Error('Ocupado'),{status:409,code:'WORKSPACE_BUSY'});
      const flow=new MemoryStore(state).get('flows',F);if(!capture&&!flow.active)throw Object.assign(new Error('Desativado'),{status:409,code:'WEBHOOK_INACTIVE'});
      locked=true;return{state:structuredClone(state),revision,leaseToken:'lease',userId:A};
    },
    async commit(_id:string,_hash:string,lease:{revision:number},value:ReturnType<typeof seed>){
      commits++;if(commits===failAt)throw new Error('database unavailable');assert.equal(lease.revision,revision);
      state=structuredClone(value);lease.revision=++revision;checkpoints.push(state);
    },
    async release(){locked=false;},
  },runtime:{fetchImpl:async(url:unknown,options:{body:string})=>{
    effects++;assert.equal(String(url),'https://fixture.test/published');
    const queued=new MemoryStore(state).list('executions').at(-1);assert.equal(queued.status,'queued');
    return new Response(JSON.stringify({received:JSON.parse(options.body),ok:true}),{headers:{'content-type':'application/json'}});
  }}});
  return{handler,get state(){return state;},set state(value){state=value;},get effects(){return effects;},get locked(){return locked;},checkpoints,set failAt(value:number){failAt=value;}};
}
async function call(handler:ReturnType<typeof createWebhookHandler>,options:{mode?:string;token?:string;method?:string;body?:unknown;headers?:Record<string,string>}={}){
  const req=Object.assign(Readable.from([]),{url:`/api/trama-hook?flow=${F}&token=${options.token??TOKEN}&mode=${options.mode??'sync'}&campaign=beta`,method:options.method??'POST',body:options.body??{name:'Luiz'},headers:{'content-type':'application/json',...options.headers}});
  const res=new ResponseStub();await handler(req,res);return res;
}

test('external webhook executes published snapshot, commits before HTTP, returns response and deduplicates caller key',async()=>{
  const f=fixture();const edited=new MemoryStore(f.state);const flow=edited.get('flows',F);flow.steps[1].config.url='https://fixture.test/draft';edited.put('flows',flow);f.state=edited.snapshot();
  const response=await call(f.handler,{headers:{'idempotency-key':'event-123',authorization:'Bearer private-inbound',cookie:'private-cookie'}});
  assert.equal(response.statusCode,201);assert.deepEqual(response.value(),{received:{name:'Luiz'},ok:true});assert.equal(f.effects,1);assert.equal(f.locked,false);
  const stored=new MemoryStore(f.state).list('executions')[0];assert.equal(stored.origin,'Webhook');assert.equal(stored.version_id,'version-1');assert.equal(stored.status,'success');
  assert.ok(!JSON.stringify(stored.input).includes(TOKEN));assert.ok(!JSON.stringify(stored.input).includes('private-inbound'));assert.ok(!JSON.stringify(stored.input).includes('private-cookie'));
  const repeated=await call(f.handler,{body:{name:'Outro'},headers:{'idempotency-key':'event-123'}});
  assert.equal(repeated.statusCode,201);assert.equal(repeated.headers['x-execution-id'],response.headers['x-execution-id']);assert.equal(f.effects,1);
});
test('capture mode receives payload while inactive and never invokes connectors',async()=>{
  const f=fixture(),store=new MemoryStore(f.state),flow=store.get('flows',F);flow.active=false;store.put('flows',flow);f.state=store.snapshot();
  const capture=await call(f.handler,{mode:'test',body:{lead:'Exemplo'}});assert.equal(capture.statusCode,200);assert.equal(capture.value().captured,true);assert.equal(f.effects,0);
  assert.deepEqual(new MemoryStore(f.state).get('flows',F).last_webhook_input,{lead:'Exemplo'});assert.equal(new MemoryStore(f.state).list('executions').length,0);
  assert.equal((await call(f.handler)).statusCode,409);
});
test('invalid tokens, malformed or oversized bodies and unsupported content never execute',async()=>{
  const f=fixture();assert.equal((await call(f.handler,{token:'b2'.repeat(32)})).statusCode,404);
  assert.equal((await call(f.handler,{body:'{invalid'})).statusCode,400);
  assert.equal((await call(f.handler,{body:{value:'x'.repeat(270000)}})).statusCode,413);
  assert.equal((await call(f.handler,{body:'text',headers:{'content-type':'text/html'}})).statusCode,415);
  assert.equal(f.effects,0);assert.equal(f.locked,false);
});

test('form inputs survive both raw streams and Vercel parsed request bodies',async()=>{
  for(const body of ['name=Luiz&source=beta',{name:'Luiz',source:'beta'}]){
    const f=fixture();const res=await call(f.handler,{body,headers:{'content-type':'application/x-www-form-urlencoded'}});
    assert.equal(res.statusCode,201);assert.deepEqual(res.value().received,{name:'Luiz',source:'beta'});
  }
});
test('checkpoint outage before effects aborts; final outage cannot silently repeat a retained event',async()=>{
  const first=fixture();first.failAt=1;const denied=await call(first.handler);assert.equal(denied.statusCode,500);assert.equal(first.effects,0);
  const f=fixture();f.failAt=3;const uncertain=await call(f.handler,{headers:{'idempotency-key':'uncertain'}});assert.equal(uncertain.statusCode,503);assert.equal(uncertain.value().error.code,'EXECUTION_SAVE_FAILED');assert.equal(f.effects,1);
  const repeated=await call(f.handler,{headers:{'idempotency-key':'uncertain'}});assert.equal(repeated.statusCode,422);assert.equal(f.effects,1);
});
test('webhook responses cannot set cookies or render active HTML on the LAB origin',async()=>{
  const f=fixture(),store=new MemoryStore(f.state),flow=store.get('flows',F);
  flow.versions[0].snapshot={steps:[{id:'IN',app:'webhook',config:{}},{id:'out',app:'return',config:{body:'<script>danger()</script>',headers:{'set-cookie':'bad=1','content-type':'text/html'}}}],edges:[{source:'IN',target:'out'}],settings:{}};
  store.put('flows',flow);f.state=store.snapshot();const res=await call(f.handler);
  assert.equal(res.statusCode,200);assert.match(res.headers['content-type'],/^text\/plain/);assert.equal(res.headers['set-cookie'],undefined);assert.match(res.headers['content-security-policy'],/default-src 'none'/);
});

let db:PGlite;
const sql=(name:string)=>fs.readFileSync(path.resolve(import.meta.dirname,'../supabase',name),'utf8');
async function as<T>(role:'authenticated'|'anon'|'service_role',uid:string|null,fn:(tx:Transaction)=>Promise<T>){
  return db.transaction(async tx=>{await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[uid??'',JSON.stringify({role,sub:uid})]);await tx.exec('set local role '+role);return fn(tx);});
}
const service=<T>(fn:(tx:Transaction)=>Promise<T>)=>as('service_role',null,fn);
async function beginHook(hash=HASH,capture=false){return service(async tx=>(await tx.query<{v:{lease_token:string;revision:number;user_id:string;state:unknown}}>('select public.begin_trama_webhook($1,$2,$3) v',[F,hash,capture])).rows[0].v);}
async function releaseHook(lease:string){await service(tx=>tx.query('select public.release_trama_webhook($1,$2)',[F,lease]));}
before(async()=>{
  db=new PGlite();await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
    create schema auth;create table auth.users(id uuid primary key,email text,is_anonymous boolean default false);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    grant usage on schema auth,public to anon,authenticated,service_role;`);
  for(const file of ['lab-access.sql','lab-tools.sql','trama.sql','trama-webhooks.sql'])await db.exec(sql(file));
  await db.query('insert into auth.users(id) values($1),($2)',[A,B]);
  await db.query('insert into public.lab_access(user_id,verified_at,member_at) values($1,now(),now()),($2,now(),now())',[A,B]);
  await db.query("insert into public.user_tools(user_id,tool_slug) values($1,'automation'),($2,'automation')",[A,B]);
  for(const [owner,id]of [[A,F],[B,FB]])await as('authenticated',owner,async tx=>{
    const lease=(await tx.query<{v:{lease_token:string}}>('select public.acquire_trama_workspace() v')).rows[0].v;
    await tx.query('select public.commit_trama_workspace(0,$1,$2)',[lease.lease_token,seed(owner,id)]);
    await tx.query('select public.release_trama_workspace($1)',[lease.lease_token]);
  });
  await as('authenticated',A,tx=>tx.query('select public.sync_trama_webhook($1,$2)',[F,HASH]));
});
after(async()=>{await db.close();});
test('webhook SQL exposes owner registration and service-only execution without leaking auth context',async()=>{
  await assert.rejects(as('anon',null,tx=>tx.query('select public.sync_trama_webhook($1,$2)',[F,HASH])),/permission denied/);
  await assert.rejects(as('authenticated',B,tx=>tx.query('select public.sync_trama_webhook($1,$2)',[F,HASH])),/Fluxo não encontrado/);
  await assert.rejects(as('authenticated',A,tx=>tx.query('select public.begin_trama_webhook($1,$2,false)',[F,HASH])),/permission denied/);
  await assert.rejects(as('authenticated',A,tx=>tx.query('select * from public.automation_webhooks')),/permission denied/);
  const lease=await service(async tx=>{
    const row=(await tx.query<{v:{lease_token:string;user_id:string}}>('select public.begin_trama_webhook($1,$2,false) v',[F,HASH])).rows[0].v;
    assert.equal(row.user_id,A);assert.equal((await tx.query<{uid:string|null}>('select auth.uid() uid')).rows[0].uid,null);return row;
  });await releaseHook(lease.lease_token);
});
test('webhook SQL denies wrong tokens, concurrent use, lost membership and exhausted rate budgets',async()=>{
  await assert.rejects(beginHook('0'.repeat(64)),/Webhook não encontrado/);
  const lease=await beginHook();await assert.rejects(beginHook(),/Outra operação/);await releaseHook(lease.lease_token);
  await db.query('update public.lab_access set member_at=null where user_id=$1',[A]);await assert.rejects(beginHook(),/Webhook não encontrado/);await db.query('update public.lab_access set member_at=now() where user_id=$1',[A]);
  await db.query('update public.automation_webhooks set call_count=60,window_start=now() where flow_id=$1',[F]);await assert.rejects(beginHook(),/Limite de chamadas/);
  await db.query('update public.automation_webhooks set call_count=0 where flow_id=$1',[F]);const fresh=await beginHook();await releaseHook(fresh.lease_token);
});
test('webhook SQL rechecks published trigger when registry synchronization is stale',async()=>{
  const original=(await db.query<{state:ReturnType<typeof seed>}>('select state from public.automation_workspaces where user_id=$1',[A])).rows[0].state;
  const store=new MemoryStore(original),flow=store.get('flows',F);flow.versions[0].snapshot.steps[0].app='scheduler';store.put('flows',flow);
  try{
    await db.query('update public.automation_workspaces set state=$1 where user_id=$2',[store.snapshot(),A]);
    await assert.rejects(beginHook(),/Salve uma versão/);
    const capture=await service(async tx=>(await tx.query<{v:{lease_token:string}}>('select public.begin_trama_webhook($1,$2,true) v',[F,HASH])).rows[0].v);await releaseHook(capture.lease_token);
  }finally{await db.query('update public.automation_workspaces set state=$1 where user_id=$2',[original,A]);}
});

test('webhook SQL rotates tokens, validates checkpoint lease and removes ingress with acquisition',async()=>{
  const newToken='c3'.repeat(32),newHash=hashWebhookToken(newToken);
  await as('authenticated',A,async tx=>{
    const lease=(await tx.query<{v:{lease_token:string;revision:number;state:ReturnType<typeof seed>}}>('select public.acquire_trama_workspace() v')).rows[0].v;
    const store=new MemoryStore(lease.state),flow=store.get('flows',F);flow.webhook_token=newToken;store.put('flows',flow);
    await tx.query('select public.commit_trama_workspace($1,$2,$3)',[lease.revision,lease.lease_token,store.snapshot()]);
    await tx.query('select public.release_trama_workspace($1)',[lease.lease_token]);await tx.query('select public.sync_trama_webhook($1,$2)',[F,newHash]);
  });
  await assert.rejects(beginHook(),/Webhook não encontrado/);const lease=await beginHook(newHash);
  await assert.rejects(service(tx=>tx.query('select public.commit_trama_webhook($1,$2,$3,$4,$5)',[F,newHash,lease.revision,A,lease.state])),/espaço mudou/);
  await service(tx=>tx.query('select public.commit_trama_webhook($1,$2,$3,$4,$5)',[F,newHash,lease.revision,lease.lease_token,lease.state]));await releaseHook(lease.lease_token);
  await as('authenticated',A,tx=>tx.query("select public.release_tool('automation')"));
  assert.equal((await db.query('select * from public.automation_webhooks where flow_id=$1',[F])).rows.length,0);await assert.rejects(beginHook(newHash),/Webhook não encontrado/);
  assert.equal((await db.query('select user_id from public.automation_workspaces where user_id=$1',[B])).rows.length,1);
});
