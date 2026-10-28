import { randomBytes } from 'node:crypto'
import { digest, redact } from './engine/security.js'
import { databaseRequest } from './persistence.mjs'

export const webhookReady = () => /^[a-f0-9]{64}$/i.test(process.env.TRAMA_ENCRYPTION_KEY??'') && !!process.env.SUPABASE_SERVICE_ROLE_KEY
export const newWebhookToken = () => randomBytes(32).toString('hex')
export const hashWebhookToken = value => digest(value)
export function webhookUrls(req,flow) {
  const host=String(req.headers.host??'')
  const local=/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)
  const origin=local?'http://'+host:(process.env.TRAMA_PUBLIC_URL||'https://umcaracaramelo.com.br').replace(/\/$/,'')
  const base=origin+'/api/trama-hook?flow='+encodeURIComponent(flow.id)+'&token='+encodeURIComponent(flow.webhook_token)
  return {sync_url:base+'&mode=sync',test_url:base+'&mode=test',async_url:null,last_input:flow.last_webhook_input,last_received_at:flow.last_webhook_at,active:!!flow.active}
}
export async function syncWebhook(access,flow) {
  return databaseRequest(access,'rpc/sync_trama_webhook',{method:'POST',body:{p_flow_id:flow.id,p_token_hash:hashWebhookToken(flow.webhook_token)}})
}
function serviceAccess() {
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!webhookReady())throw Object.assign(new Error('O serviço de webhooks ainda não foi configurado.'),{status:503,code:'WEBHOOK_NOT_CONFIGURED'})
  return {supabaseUrl:(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'https://fzhzpzxsttflgtassyex.supabase.co').replace(/\/$/,''),supabaseKey:key,token:key}
}
export const hookPersistence={
  async acquire(flowId,tokenHash,test){
    const row=await databaseRequest(serviceAccess(),'rpc/begin_trama_webhook',{method:'POST',body:{p_flow_id:flowId,p_token_hash:tokenHash,p_test:test}})
    if(!row?.state||typeof row.revision!=='number'||typeof row.lease_token!=='string'||typeof row.user_id!=='string')throw new Error('Webhook lease not confirmed')
    return {state:row.state,revision:row.revision,leaseToken:row.lease_token,userId:row.user_id}
  },
  async commit(flowId,tokenHash,lease,state){
    const revision=await databaseRequest(serviceAccess(),'rpc/commit_trama_webhook',{method:'POST',body:{p_flow_id:flowId,p_token_hash:tokenHash,p_revision:lease.revision,p_lease_token:lease.leaseToken,p_state:state}})
    if(typeof revision!=='number')throw new Error('Webhook checkpoint not confirmed')
    lease.revision=revision
  },
  async release(flowId,lease){await databaseRequest(serviceAccess(),'rpc/release_trama_webhook',{method:'POST',body:{p_flow_id:flowId,p_lease_token:lease.leaseToken}})},
}

export async function webhookBody(req) {
  const max=256*1024
  if(req.method==='GET'||req.method==='HEAD')return undefined
  const type=String(req.headers['content-type']??'application/json').split(';')[0].trim().toLowerCase()
  if(!['application/json','application/x-www-form-urlencoded','text/plain'].includes(type)&&!type.endsWith('+json'))throw Object.assign(new Error('Envie JSON, formulário ou texto.'),{status:415,code:'WEBHOOK_MEDIA_TYPE'})
  let data
  if(req.body!==undefined) data=typeof req.body==='string'?Buffer.from(req.body):Buffer.isBuffer(req.body)?req.body:Buffer.from(JSON.stringify(req.body))
  else{
    const chunks=[];let size=0
    for await(const part of req){const chunk=Buffer.from(part);size+=chunk.length;if(size>max)throw Object.assign(new Error('A entrada excede 256 KB.'),{status:413,code:'WEBHOOK_BODY_LIMIT'});chunks.push(chunk)}
    data=Buffer.concat(chunks)
  }
  if(data.length>max)throw Object.assign(new Error('A entrada excede 256 KB.'),{status:413,code:'WEBHOOK_BODY_LIMIT'})
  const text=data.toString('utf8')
  if(type==='application/x-www-form-urlencoded')return req.body&&typeof req.body==='object'&&!Buffer.isBuffer(req.body)?JSON.parse(text):Object.fromEntries(new URLSearchParams(text))
  if(type==='text/plain')return text
  if(!text)return {}
  try{return JSON.parse(text)}catch{throw Object.assign(new Error('JSON inválido.'),{status:400,code:'WEBHOOK_JSON_INVALID'})}
}
export function webhookEnvelope(req,url,body){
  const query=Object.fromEntries([...url.searchParams].filter(([key])=>!['flow','token','mode'].includes(key)))
  const headers={...req.headers};delete headers.authorization;delete headers.cookie;delete headers.host
  return {BODY:body??query,body:body??query,QUERY:query,HEADERS:redact(headers),METHOD:req.method,PATH:'/api/trama-hook'}
}
