import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import test from 'node:test';
import { createTramaHandler } from './trama/gateway.mjs';
import { tramaHandler } from './trama.ts';

const ALICE = '00000000-0000-4000-8000-00000000000a';
const BRUNO = '00000000-0000-4000-8000-00000000000b';
class ResponseStub extends EventEmitter {
  statusCode = 200; headers: Record<string,string> = {}; chunks: Buffer[] = [];
  headersSent = false; writableEnded = false; destroyed = false;
  setHeader(key: string,value: string) { this.headers[key.toLowerCase()] = value; }
  flushHeaders() { this.headersSent = true; }
  write(chunk: string | Buffer) { this.headersSent = true; this.chunks.push(Buffer.from(chunk)); }
  end(chunk?: string | Buffer) { if(chunk)this.write(chunk); this.writableEnded = true; }
  value() { return JSON.parse(Buffer.concat(this.chunks).toString()); }
}
type Handler = ReturnType<typeof createTramaHandler>;
async function call(handler: Handler,path: string,options: {user?:string;method?:string;body?:unknown;stream?:boolean}={}) {
  const req = Object.assign(Readable.from([]),{url:'/api/trama?path='+encodeURIComponent(path),method:options.method??'GET',body:options.body,headers:{authorization:options.user??ALICE,...(options.stream?{accept:'application/x-ndjson'}:{})}});
  const res=new ResponseStub(); await handler(req,res); return res;
}
function fixture(runtime: Record<string,unknown>={}) {
  const rows = new Map<string,{state:unknown;revision:number;leaseToken:string}>();
  const commits: unknown[]=[];
  const registered:{id:string;token:string;active:boolean}[]=[];
  const db={
    async loadWorkspace(access:{user:{id:string}}){return rows.get(access.user.id)??{state:{documents:[],events:{}},revision:0};},
    async acquireWorkspace(access: {user:{id:string}}) {
      const row=rows.get(access.user.id)??{state:{documents:[],events:{}},revision:0,leaseToken:'lease'};
      return structuredClone(row);
    },
    async commitWorkspace(access: {user:{id:string}},data: {state:unknown;revision:number;leaseToken:string}) {
      assert.equal(data.revision,rows.get(access.user.id)?.revision??0);
      const row={...structuredClone(data),revision:data.revision+1};rows.set(access.user.id,row);commits.push(row.state);return row.revision;
    },
    async releaseWorkspace() {},
  };
  const handler=createTramaHandler({persistence:db,syncWebhook:async(_access:unknown,flow:{id:string;webhook_token:string;active:boolean})=>{registered.push({id:flow.id,token:flow.webhook_token,active:flow.active});return flow.active;},authorize:async(req:{headers:{authorization:string}})=>({user:{id:req.headers.authorization,email:'member@lab.test',user_metadata:{name:'Membro'}},token:'verified',supabaseUrl:'https://db.invalid',supabaseKey:'publishable'}),runtime});
  return {handler,rows,commits,registered};
}
function documents(value:unknown) {return (value as {documents:{collection:string;data:Record<string,unknown>}[]}).documents;}

test('Trama requires a session before consulting its database or R2',async()=>{
  const req=Object.assign(Readable.from([]),{url:'/api/trama',method:'GET',headers:{}});
  const res=new ResponseStub(); await tramaHandler(req,res);
  assert.equal(res.statusCode,401);assert.equal(res.headers['cache-control'],'private, no-store');
});

test('each LAB member receives a separate workspace and cannot read another flow',async()=>{
  const {handler}=fixture();
  const alice=(await call(handler,'/state')).value();
  const bruno=(await call(handler,'/state',{user:BRUNO})).value();
  assert.equal(alice.user.id,ALICE);assert.equal(bruno.user.id,BRUNO);
  assert.notEqual(alice.fluxes[0].id,bruno.fluxes[0].id);
  const stolen=await call(handler,'/rpc/getFlux',{user:BRUNO,method:'POST',body:{args:[alice.fluxes[0].id],org_id:bruno.selected_org_id}});
  assert.equal(stolen.statusCode,404);
  assert.equal(alice.capabilities.database,'supabase');assert.equal(alice.capabilities.scheduler,false);
});

test('engine checkpoints queued before HTTP effects, stores final result and replays its immutable graph',async()=>{
  const previous=process.env.TRAMA_ENCRYPTION_KEY;process.env.TRAMA_ENCRYPTION_KEY='42'.repeat(32);
  let effects=0;
  const f=fixture({fetchImpl:async()=>{
    effects++;
    const queued=documents(f.commits.at(-1)).filter(x=>x.collection==='executions').at(-1)?.data;
    assert.equal(queued?.status,'queued','queued execution must be durable before the first HTTP request');
    return new Response(JSON.stringify({ok:true,count:effects}),{headers:{'content-type':'application/json'}});
  }});
  try{
    const state=(await call(f.handler,'/state')).value(), id=state.fluxes[0].id, org=state.selected_org_id;
    const steps=[{id:'IN',app:'webhook',config:{}},{id:'http',app:'requester',config:{method:'POST',url:'https://fixture.example.test',body:'{{$IN.BODY}}'}},{id:'out',app:'return',config:{body:'{{$http.body}}'}}];
    const update=await call(f.handler,'/rpc/updateFlux',{method:'POST',body:{org_id:org,args:[id,{steps,edges:[{source:'IN',target:'http'},{source:'http',target:'out'}]}]}});
    assert.equal(update.statusCode,200);
    const ran=await call(f.handler,`/flows/${id}/run`,{method:'POST',body:{input:{message:'test'}}});
    assert.equal(ran.statusCode,200);assert.equal(ran.value().status,'success');assert.equal(effects,1);
    const snapshot=f.rows.get(ALICE)!.state;
    const stored=documents(snapshot).find(x=>x.collection==='executions')!.data;
    assert.equal(stored.status,'success');assert.ok(stored.encrypted_input);
    assert.ok(!JSON.stringify(ran.value()).includes('encrypted_input'));
    await call(f.handler,'/rpc/updateFlux',{method:'POST',body:{org_id:org,args:[id,{steps:[{id:'IN',app:'webhook',config:{}}],edges:[]}]}});
    const replay=await call(f.handler,'/rpc/replayExecution',{method:'POST',body:{org_id:org,args:[id,ran.value().id]}});
    assert.equal(replay.statusCode,200);assert.equal(replay.value().result.status,'success');assert.equal(effects,2,'replay retains original HTTP step after draft was edited');
    assert.equal(replay.value().result.replay_of,ran.value().id);
    const node=await call(f.handler,`/flows/${id}/nodes/http/test`,{method:'POST',body:{step:steps[1],input:{message:'single-step'}}});
    assert.equal(node.statusCode,200);assert.equal(node.value().origin,'Teste de módulo');
    assert.equal(node.value().status,'success');assert.equal(node.value().output.body.count,3);assert.equal(effects,3,'individual node tests also checkpoint and persist their actual HTTP results');
  }finally{if(previous===undefined)delete process.env.TRAMA_ENCRYPTION_KEY;else process.env.TRAMA_ENCRYPTION_KEY=previous;}
});

test('connections keep credentials encrypted and credentials cannot leak through state',async()=>{
  const previous=process.env.TRAMA_ENCRYPTION_KEY;process.env.TRAMA_ENCRYPTION_KEY='43'.repeat(32);
  try{
    const f=fixture(),state=(await call(f.handler,'/state')).value();
    const result=await call(f.handler,'/rpc/createConnection',{method:'POST',body:{org_id:state.selected_org_id,args:[{name:'Minha API',app:'requester',credentials:{api_key:'private-test-token'}}]}});
    assert.equal(result.statusCode,200);assert.ok(!JSON.stringify(result.value()).includes('private-test-token'));
    assert.ok(!JSON.stringify(f.rows.get(ALICE)!.state).includes('private-test-token'));
    assert.ok(documents(f.rows.get(ALICE)!.state).some(x=>x.collection==='secrets'&&x.data.encrypted));
  }finally{if(previous===undefined)delete process.env.TRAMA_ENCRYPTION_KEY;else process.env.TRAMA_ENCRYPTION_KEY=previous;}
});

test('local accounts and unconfigured webhook activation fail explicitly',async()=>{
  const {handler}=fixture(),state=(await call(handler,'/state')).value();
  for(const name of ['registerAccount','inviteOrgUser','changePassword']){
    const res=await call(handler,'/rpc/'+name,{method:'POST',body:{args:[{}]}});assert.equal(res.statusCode,400);assert.equal(res.value().error.code,'OPERATION_UNAVAILABLE');
  }
  const res=await call(handler,'/rpc/toggleFluxStatus',{method:'POST',body:{args:[state.fluxes[0].id,true]}});
  assert.equal(res.statusCode,503);assert.equal(res.value().error.code,'WEBHOOK_NOT_CONFIGURED');
});

test('configured webhook exposes private URL, requires a published version, activates and rotates token',async()=>{
  const key=process.env.TRAMA_ENCRYPTION_KEY,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.TRAMA_ENCRYPTION_KEY='44'.repeat(32);process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-service-only';
  try{
    const f=fixture(),state=(await call(f.handler,'/state')).value(),id=state.fluxes[0].id,org=state.selected_org_id;
    assert.equal(state.capabilities.external_webhooks,true);
    const link=(await call(f.handler,`/flows/${id}/webhook`)).value();assert.equal(new URL(link.sync_url).origin,'https://www.umcaracaramelo.com.br');assert.match(link.sync_url,/mode=sync/);assert.match(link.test_url,/mode=test/);assert.equal(link.async_url,null);
    const denied=await call(f.handler,'/rpc/toggleFluxStatus',{method:'POST',body:{org_id:org,args:[id,true]}});assert.equal(denied.statusCode,409);assert.equal(denied.value().error.code,'WEBHOOK_VERSION_REQUIRED');
    assert.equal((await call(f.handler,'/rpc/saveFluxVersion',{method:'POST',body:{org_id:org,args:[id]}})).statusCode,200);
    const activated=await call(f.handler,'/rpc/toggleFluxStatus',{method:'POST',body:{org_id:org,args:[id,true]}});assert.equal(activated.statusCode,200);assert.equal(activated.value().result.active,true);assert.equal(f.registered.at(-1)?.active,true);
    assert.equal((await call(f.handler,`/flows/${id}/webhook/rotate`,{method:'POST',body:{}})).statusCode,200);
    const next=(await call(f.handler,`/flows/${id}/webhook`)).value();assert.notEqual(next.sync_url,link.sync_url);
  }finally{if(key===undefined)delete process.env.TRAMA_ENCRYPTION_KEY;else process.env.TRAMA_ENCRYPTION_KEY=key;if(service===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=service;}
});

test('request interrupted after queued checkpoint is shown as interrupted without repeating effects',async()=>{
  const f=fixture();await call(f.handler,'/state');
  const row=f.rows.get(ALICE)!;
  (row.state as {documents:unknown[]}).documents.push({collection:'executions',id:'old',org_id:'unused',data:{id:'old',status:'queued',started_at:'2026-10-28T00:00:00.000Z'}});
  const state=await call(f.handler,'/state');assert.equal(state.statusCode,200);
  const old=documents(f.rows.get(ALICE)!.state).find(x=>x.collection==='executions')!.data;
  assert.equal(old.status,'interrupted');assert.equal((old.error as {code:string}).code,'PROCESS_INTERRUPTED');
});

test('capture polling reads only the owner payload without lease or checkpoint',async()=>{
  const f=fixture(),state=(await call(f.handler,'/state')).value(),id=state.fluxes[0].id;
  const row=f.rows.get(ALICE)!;const flow=documents(row.state).find(d=>d.collection==='flows'&&d.data.id===id)!.data;
  flow.last_webhook_test_input={message:'captured'};flow.last_webhook_test_at='2026-10-28T18:00:00.000Z';
  const commits=f.commits.length;
  const result=await call(f.handler,`/flows/${id}/webhook/capture`);
  assert.equal(result.statusCode,200);assert.deepEqual(result.value(),{last_input:{message:'captured'},last_received_at:'2026-10-28T18:00:00.000Z'});assert.equal(f.commits.length,commits);
  await call(f.handler,'/state',{user:BRUNO});const denied=await call(f.handler,`/flows/${id}/webhook/capture`,{user:BRUNO});assert.equal(denied.statusCode,404);
});
