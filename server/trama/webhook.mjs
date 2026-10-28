import { timingSafeEqual } from 'node:crypto'
import { Domain, problem } from './engine/domain.js'
import { Jobs } from './engine/jobs.js'
import { secretBox, redact } from './engine/security.js'
import { MemoryStore } from './memory-store.mjs'
import { json, prune } from './gateway.mjs'
import { webhookReady, hashWebhookToken, hookPersistence, webhookBody, webhookEnvelope } from './hooks.mjs'
import { webhookResponse } from './response.mjs'

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function createWebhookHandler(dependencies={}){
  const db=dependencies.persistence??hookPersistence
  const configured=dependencies.configured??webhookReady
  return async function webhookHandler(req,res){
    res.setHeader('Cache-Control','private, no-store')
    res.setHeader('X-Content-Type-Options','nosniff')
    res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'; base-uri 'none'; sandbox")
    res.setHeader('Referrer-Policy','no-referrer')
    let lease,jobs,flowId
    const unlock=async()=>{if(lease){const current=lease;lease=null;await db.release(flowId,current)}}
    try{
      const url=new URL(req.url??'/','http://trama.invalid')
      flowId=url.searchParams.get('flow');const token=url.searchParams.get('token')??'',mode=url.searchParams.get('mode')??'sync'
      if(!UUID.test(flowId??'')||!/^[a-f0-9]{32,128}$/i.test(token)||!['sync','test'].includes(mode))throw problem('Webhook não encontrado.',404,'WEBHOOK_NOT_FOUND')
      if(!['GET','POST','PUT','PATCH','DELETE'].includes(req.method)){res.setHeader('Allow','GET, POST, PUT, PATCH, DELETE');throw problem('Método não permitido.',405)}
      if(!configured())throw problem('O serviço de webhooks ainda não foi configurado.',503,'WEBHOOK_NOT_CONFIGURED')
      const hash=hashWebhookToken(token)
      lease=await db.acquire(flowId,hash,mode==='test')
      const store=new MemoryStore(lease.state)
      const user=store.get('users',lease.userId)
      if(!user||user.id!==lease.userId)throw problem('Webhook não encontrado.',404,'WEBHOOK_NOT_FOUND')
      const domain=new Domain(store,secretBox(undefined,dependencies.encryptionKey??process.env.TRAMA_ENCRYPTION_KEY))
      const flow=domain.flow(user,flowId)
      if(!flow.webhook_token||!timingSafeEqual(Buffer.from(hash),Buffer.from(hashWebhookToken(flow.webhook_token))))throw problem('Webhook não encontrado.',404,'WEBHOOK_NOT_FOUND')
      if(mode==='sync'&&!flow.active)throw problem('O fluxo está desativado.',409,'WEBHOOK_INACTIVE')
      const body=await webhookBody(req),envelope=webhookEnvelope(req,url,body)
      flow.last_webhook_input=redact(envelope.BODY);flow.last_webhook_at=new Date().toISOString();store.put('flows',flow)
      if(mode==='test'){flow.last_webhook_test_input=flow.last_webhook_input;flow.last_webhook_test_at=flow.last_webhook_at;store.put('flows',flow)}
      const commit=async()=>{prune(store);await db.commit(flowId,hash,lease,store.snapshot())}
      jobs=new Jobs(domain,{autoStart:false,concurrency:1,runtime:{maxExecutionMs:30000,...dependencies.runtime},beforeStart:commit})
      jobs.recover()
      if(mode==='test'){await commit();await unlock();return json(res,{captured:true,received_at:flow.last_webhook_at})}
      const rawId=req.headers['idempotency-key']
      if(rawId!==undefined&&(typeof rawId!=='string'||rawId.length>160))throw problem('Idempotency-Key inválida.',400)
      const job=jobs.submit(flow,envelope,{origin:'Webhook',published:true,...(rawId?{idempotencyKey:hashWebhookToken(rawId)}:{})})
      await commit()
      jobs.drain()
      const execution=await job.promise;await jobs.idle()
      try{await commit()}catch{throw problem('A execução terminou, mas o histórico não foi confirmado. Confira a execução antes de reenviar.',503,'EXECUTION_SAVE_FAILED')}
      const record=store.get('executions',execution.id)
      const response=record?.encrypted_response?domain.box.decrypt(record.encrypted_response):{body:execution.output??{}}
      await unlock()
      res.setHeader('X-Execution-Id',execution.id)
      if(execution.status!=='success')return json(res,{execution_id:execution.id,error:execution.error??{code:'EXECUTION_FAILED',message:'A execução não foi concluída.'}},422)
      const status=Number(response.status??response.code??response.statusCode??200)
      res.statusCode=status>=200&&status<=599?status:200
      for(const [key,value]of Object.entries(response.headers??{})){
        if((/^x-(?!vercel-|forwarded-|execution-id$|content-type-options$)/i.test(key)||key.toLowerCase()==='content-language')&&!/[\r\n]/.test(String(value)))res.setHeader(key,String(value))
      }
      if([204,205,304].includes(res.statusCode))return res.end()
      const encoded=webhookResponse(response)
      res.setHeader('Content-Type',encoded.type)
      return res.end(encoded.body)
    }catch(error){
      let status=Number(error.status)||500
      if(error.code==='WORKSPACE_BUSY'){status=429;res.setHeader('Retry-After','2')}
      if(status===429&&!res.hasHeader?.('Retry-After'))res.setHeader('Retry-After','60')
      const message=status>=500&&!['WEBHOOK_NOT_CONFIGURED','EXECUTION_SAVE_FAILED'].includes(error.code)?'Não foi possível processar este webhook.':error.message
      if(!res.writableEnded)return json(res,{error:{code:error.code??'WEBHOOK_ERROR',message}},status)
    }finally{
      await jobs?.close().catch(()=>{})
      await unlock().catch(()=>{})
    }
  }
}
