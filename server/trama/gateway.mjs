import { randomUUID } from 'node:crypto'
import { Domain, publicUser, problem } from './engine/domain.js'
import { Jobs } from './engine/jobs.js'
import { secretBox, redact } from './engine/security.js'
import { initialFlow, localSubscription } from './engine/initial-data.js'
import { executeSingleStep, validateGraph } from './engine/runtime/index.js'
import { MemoryStore } from './memory-store.mjs'
import * as persistence from './persistence.mjs'
import * as files from './files.mjs'

const active = new Map()
const RPCS = new Set(['fetchFluxes','getFlux','createFlux','updateFlux','toggleFluxStatus','duplicateFlux','deleteFlux','saveFluxVersion','restoreFluxVersion','renameFluxVersion','deleteFluxVersion','fetchConnections','createConnection','fetchUserApps','verifyConnection','reauthorizeConnection','renameConnection','updateConnection','deleteConnection','fetchOrganizations','createOrganization','updateOrganization','deleteOrganization','countOrgFluxes','listOrgMembers','getSubscription','listTemplates','unlockTemplate','downloadTemplate','updateTemplate','deleteTemplate','listApps','saveApp','deleteApp','runAppRpc','replayExecution','buildFluxFromPrompt'])
const capabilities = () => ({ database: 'supabase', storage: 'r2-private', runtime: 'node', local: false, manual_execution: true, max_execution_ms: 30000, durable_queue: false, scheduler: false, webhooks: false, external_webhooks: false, javascript: false, payments: false, google_oauth: false, credentials_configured: /^[a-f0-9]{64}$/i.test(process.env.TRAMA_ENCRYPTION_KEY ?? '') })

export function json(res, value, status = 200) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(value))
}
export async function readBody(req) {
  const max = 3 * 1024 * 1024
  if (req.body !== undefined && req.body !== null && !Buffer.isBuffer(req.body)) {
    if (typeof req.body === 'object') {
      if (Buffer.byteLength(JSON.stringify(req.body)) > max) throw problem('O envio excede 3 MB.', 413)
      return req.body
    }
    if (typeof req.body === 'string') {
      if (Buffer.byteLength(req.body) > max) throw problem('O envio excede 3 MB.', 413)
      try { return JSON.parse(req.body) } catch { throw problem('JSON inválido.') }
    }
  }
  const chunks = []; let size = 0
  if (Buffer.isBuffer(req.body)) chunks.push(req.body)
  else for await (const part of req) {
    const chunk = Buffer.isBuffer(part) ? part : Buffer.from(part)
    size += chunk.length
    if (size > max) throw problem('O envio excede 3 MB.', 413)
    chunks.push(chunk)
  }
  const data = Buffer.concat(chunks)
  if (data.length > max) throw problem('O envio excede 3 MB.', 413)
  if (!data.length) return {}
  try { return JSON.parse(data.toString('utf8')) } catch { throw problem('JSON inválido.') }
}

function labUser(access) {
  const meta = access.user.user_metadata ?? {}
  return { id: access.user.id, email: access.user.email ?? '', fullname: String(meta.name ?? meta.full_name ?? access.user.email?.split('@')[0] ?? 'Membro do LAB').slice(0, 100), profile_image_url: typeof meta.avatar_url === 'string' && /^https:\/\//.test(meta.avatar_url) ? meta.avatar_url : null, qualified: true }
}
function provision(store, user) {
  store.put('users', user)
  if (!store.list('organizations').length) {
    const id = randomUUID()
    store.put('organizations', { id, name: 'Meu espaço', image: null, members: [{ id: user.id, user_id: user.id, name: user.fullname, email: user.email, role: '1', invite_accepted_at: new Date().toISOString() }] })
    store.put('subscriptions', { id, ...localSubscription() }, id)
    store.put('flows', initialFlow(id))
  }
}
function prune(store) {
  const executions = store.list('executions').sort((a,b) => b.started_at.localeCompare(a.started_at))
  for (const item of executions.slice(40)) { store.delete('executions', item.id); store.delete('usage', item.id) }
}
function view(domain, user, org) {
  const state = domain.state(user, org)
  state.capabilities = capabilities()
  return state
}
const errorCode = error => error.code ?? 'TRAMA_ERROR'

/** Request-scoped engine. Every durable write uses the member JWT and a database lease. */
export function createTramaHandler(dependencies = {}) {
  const authorize = dependencies.authorize ?? (async () => { throw problem('Entre no LAB para continuar.',401,'AUTH_REQUIRED') })
  const db = dependencies.persistence ?? persistence
  const fileRepo = dependencies.files ?? files
  return async function tramaHandler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'same-origin')
    let access, lease, jobs
    const unlock = async () => {
      if (lease && access) {
        const token = lease.leaseToken
        lease = null
        await db.releaseWorkspace(access, token)
      }
    }
    const finish = async (value, status = 200) => { await unlock(); return json(res, value, status) }
    try {
      access = await authorize(req)
      const requestUrl = new URL(req.url ?? '/', 'http://trama.invalid')
      const path = requestUrl.searchParams.get('path') ?? '/state'
      const url = new URL(path, 'http://trama.invalid')
      if (!path.startsWith('/') || path.startsWith('//') || url.origin !== 'http://trama.invalid') throw problem('Rota inválida.')
      const route = url.pathname
      const method = req.method ?? 'GET'
      if (!['GET','POST','DELETE'].includes(method)) { res.setHeader('Allow','GET, POST, DELETE'); throw problem('Método não permitido.',405) }
      if (route === '/session' && method === 'GET') return json(res, { user: publicUser(labUser(access)), setup_required: false, capabilities: capabilities() })
      if (route === '/health' && method === 'GET') return json(res, { ok: true, ...capabilities() })
      const file = route.match(/^\/files\/([a-f0-9-]{36})$/i)
      if (route === '/files' && method === 'GET') return json(res, { files: await fileRepo.listFiles(access) })
      if (file && method === 'GET') {
        const result = await fileRepo.getFile(access, file[1])
        res.setHeader('Content-Type', result.metadata.mime)
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.metadata.name)}`)
        return res.end(result.body)
      }
      if (file && method === 'DELETE') { await fileRepo.deleteFile(access, file[1]); return json(res,{deleted:true}) }
      const cancel = route.match(/^\/executions\/([^/]+)\/cancel$/)
      if (cancel && method === 'POST') {
        const running = active.get(access.user.id + ':' + cancel[1])
        if (!running) throw problem('Esta execução já terminou ou pertence a outra instância. O limite por execução é de 30 segundos.',409,'CANCEL_UNAVAILABLE')
        return json(res,{cancelled:running.cancel(cancel[1])})
      }

      lease = await db.acquireWorkspace(access)
      const store = new MemoryStore(lease.state)
      const user = labUser(access)
      provision(store,user)
      const domain = new Domain(store, secretBox(undefined, process.env.TRAMA_ENCRYPTION_KEY))
      jobs = new Jobs(domain, { autoStart: false, concurrency: 1, runtime: { maxExecutionMs: 30000, ...dependencies.runtime } })
      jobs.recover()
      const commit = async () => {
        prune(store)
        lease.revision = await db.commitWorkspace(access, { revision: lease.revision, leaseToken: lease.leaseToken, state: store.snapshot() })
      }
      jobs.beforeStart = commit
      const payload = method === 'POST' ? await readBody(req) : {}
      if (route === '/files' && method === 'POST') {
        if (typeof payload.data !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(payload.data)) throw problem('Arquivo base64 inválido.')
        await commit()
        const created = await fileRepo.uploadFile(access,{ name: payload.name, mime: payload.mime, data: Buffer.from(payload.data,'base64') })
        return await finish({file:created},201)
      }
      if (route === '/state' && method === 'GET') { await commit(); return await finish(view(domain,user,url.searchParams.get('org_id'))) }
      const rpc = route.match(/^\/rpc\/([A-Za-z][A-Za-z0-9]*)$/)
      const flowRoute = route.match(/^\/flows\/([^/]+)\/(.+)$/)
      const executionRoute = route.match(/^\/executions\/([^/]+)(?:\/(events))?$/)
      let result
      const run = async (flow, input, options = {}) => {
        const job = jobs.submit(flow,input,options)
        await commit() // The immutable graph and QUEUED execution exist before HTTP effects.
        active.set(user.id + ':' + job.execution.id,jobs)
        const streaming = req.headers.accept?.includes('application/x-ndjson')
        if (streaming) { res.statusCode=200; res.setHeader('Content-Type','application/x-ndjson; charset=utf-8'); res.flushHeaders?.() }
        const send = event => { if (streaming && !res.destroyed && !res.writableEnded) res.write(JSON.stringify(event)+'\n') }
        const unsubscribe = jobs.subscribe(job.execution.id,event => { if (event.type !== 'execution:finish') send(event) })
        const abort = () => { if (!res.writableEnded) jobs.cancel(job.execution.id) }
        res.on('close',abort)
        try {
          jobs.drain()
          const execution = await job.promise
          await jobs.idle()
          try { await commit() } catch { throw problem('A execução terminou, mas o histórico não pôde ser salvo. Verifique os efeitos externos antes de repetir.',503,'EXECUTION_SAVE_FAILED') }
          if (streaming) { await unlock(); send({type:'execution:finish',executionId:execution.id,execution}); res.end(); return null }
          return execution
        } finally { unsubscribe(); res.off('close',abort); active.delete(user.id+':'+job.execution.id) }
      }

      if (rpc && method === 'POST') {
        const name = rpc[1], args = Array.isArray(payload.args) ? payload.args : []
        if (!RPCS.has(name)) throw problem('Esta operação é gerenciada pelo LAB ou ainda não está disponível na Trama.',400,'OPERATION_UNAVAILABLE')
        if (name === 'toggleFluxStatus') throw problem('Agendamentos e webhooks contínuos precisam de um worker dedicado. Use Executar para testar o fluxo agora.',409,'WORKER_REQUIRED')
        if (name === 'replayExecution') {
          const flow = domain.flow(user,args[0]), old = store.get('executions',args[1])
          if (!old || old.flux_id !== flow.id || old.org_id !== flow.org_id) throw problem('Execução não encontrada.',404)
          result = await run(flow,old.encrypted_input ? domain.box.decrypt(old.encrypted_input) : old.input,{origin:'Replay',replayOf:old.id,snapshot:old.snapshot})
          if (res.writableEnded) return
        } else if (name === 'buildFluxFromPrompt') {
          domain.organization(user,payload.org_id)
          const connection = store.list('connections',payload.org_id).find(c=>['chatgpt','openai'].includes(c.app))
          if (!connection) throw problem('Crie uma conexão OpenAI para construir fluxos com IA.',422,'AI_CONNECTION_REQUIRED')
          await commit()
          const generated = await executeSingleStep({step:{id:'builder',app:'chatgpt',connection_id:connection.id,config:{model:'gpt-4o-mini',prompt:'Return ONLY a JSON object {name,steps,edges}. Build an automation graph. Each step: {id,app,action,config}. app in webhook,requester,filter,router,for_each,delay,return,set_variables. First step webhook id IN. References {{$IN.BODY.field}}. Do not include secrets. User: '+String(args[0]??'').slice(0,6000)}},input:{},getConnection:id=>domain.secretConnection(id,payload.org_id),options:{maxExecutionMs:30000}})
          if (generated.status !== 'success') throw problem(generated.error?.message??'A IA não devolveu um fluxo.',422)
          const output=generated.steps?.find(s=>s.id==='builder')?.output??generated.output
          const text=output?.response??output?.body?.choices?.[0]?.message?.content??output?.body??output
          try {result=typeof text==='string'?JSON.parse(text.replace(/^\s*```(?:json)?\s*/,'').replace(/\s*```\s*$/,'')):text} catch {throw problem('A IA não devolveu JSON válido.',422)}
          if (!result?.name || !validateGraph(result).valid) throw problem('A IA não devolveu um grafo válido. Ajuste a descrição e tente novamente.',422)
        } else {
          if (name==='runAppRpc' || name==='verifyConnection' || name==='reauthorizeConnection') await commit()
          result=await domain.rpc(name,args,user,payload.org_id,'')
          if (name==='deleteFlux') for (const record of store.list('executions')) if(record.flux_id===args[0]) store.delete('executions',record.id)
        }
        await commit()
        return await finish({result,state:view(domain,user,payload.org_id)})
      }
      if (flowRoute) {
        const flow=domain.flow(user,decodeURIComponent(flowRoute[1])),operation=flowRoute[2]
        if (operation.startsWith('webhook')) throw problem('Webhooks externos precisam de um worker dedicado. Use o terminal de testes para fornecer uma entrada.',409,'WORKER_REQUIRED')
        if (operation==='run' && method==='POST') {result=await run(flow,payload.input??flow.test_input); if(!res.writableEnded)return await finish(result); return}
        const node=operation.match(/^nodes\/([^/]+)\/test$/)
        if(node && method==='POST') {
          const stepId=decodeURIComponent(node[1]),step=domain.bindStep(payload.step??flow.steps.find(s=>String(s.id)===stepId)??{},flow.org_id)
          if(String(step.id)!==stepId)throw problem('Módulo não encontrado.',404)
          const entryId=stepId==='runtime-input'?'runtime-input-trigger':'runtime-input'
          jobs.options.context=payload.context??{}
          result=await run(flow,payload.input??flow.test_input??{}, {
            origin:'Teste de módulo',
            snapshot:{steps:[{id:entryId,app:'webhook'},step],edges:[{source:entryId,target:stepId}],settings:{...flow.settings,error_handler_flux_id:null}},
          })
          if(res.writableEnded)return
          const record=result.steps?.find(s=>String(s.id)===stepId)
          return await finish({...redact(result),output:redact(record?.output??result.output)})
        }
        if(operation==='export' && method==='GET') {
          const version=flow.versions.find(v=>v.id===flow.published_version_id)
          if(!version)throw problem('Salve uma versão antes de exportar.',409)
          return await finish({format:'caramelo-trama',format_version:1,name:flow.name,...(version.snapshot??version)})
        }
      }
      if(executionRoute && method==='GET') {
        const execution=store.get('executions',executionRoute[1])
        if(!execution)throw problem('Execução não encontrada.',404)
        domain.organization(user,execution.org_id)
        return await finish(executionRoute[2]?store.events(execution.id,Number(url.searchParams.get('after'))||0):jobs.publicExecution(execution))
      }
      throw problem('Rota não encontrada.',404)
    } catch(error) {
      const status=Number(error.status)||500
      const message=status>=500 && !['TRAMA_KEY_REQUIRED','EXECUTION_SAVE_FAILED'].includes(errorCode(error))?'A Trama não conseguiu concluir a operação. Tente novamente.':error.message
      if(res.headersSent) {if(!res.writableEnded){res.write(JSON.stringify({type:'error',error:{message,code:errorCode(error)}})+'\n');res.end()}}
      else json(res,{error:{message,code:errorCode(error)}},status)
    } finally {
      await jobs?.close().catch(()=>{})
      if(lease && access)await db.releaseWorkspace(access,lease.leaseToken).catch(()=>{})
    }
  }
}

