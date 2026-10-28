import { executeGraph } from './runtime/index.js'
import { uid, now, problem } from './domain.js'
import { redact, digest } from './security.js'

// A queued execution and its immutable graph are committed before work begins.
// Running effects are never repeated automatically after a crash.
export class Jobs {
  constructor(domain, options = {}) {
    this.domain = domain; this.store = domain.store
    this.running = new Map(); this.waiting = []; this.listeners = new Map(); this.memoryLocks = new Map()
    this.concurrency = options.concurrency ?? 4
    this.options = options.runtime ?? {}
    this.autoStart = options.autoStart !== false
    this.beforeStart = options.beforeStart
    this.deadline = Date.now() + Math.min(30000, Math.max(50, Number(this.options.maxExecutionMs ?? 30000)))
  }
  recover() {
    for (const execution of this.store.list('executions')) {
      if (['running', 'queued'].includes(execution.status)) {
        execution.status = 'interrupted'; execution.ended_at = now()
        execution.error = { code: 'PROCESS_INTERRUPTED', message: 'O servidor foi interrompido durante esta execução. Revise os efeitos externos antes de executar novamente.' }
        this.store.put('executions', execution)
        this.store.addEvent(execution.id, { type: 'execution:finish', executionId: execution.id, execution: this.publicExecution(execution) })
      }
    }
    this.drain()
  }
  submit(flow, input, { origin = 'Terminal de testes', published = false, idempotencyKey, replayOf, handlerDepth = 0, snapshot } = {}) {
    if (idempotencyKey) {
      const existing = this.store.list('executions', flow.org_id).find(e => e.flux_id === flow.id && e.idempotency_key === idempotencyKey)
      if (existing) {
        if (this.running.has(existing.id)) return { execution: existing, promise: this.running.get(existing.id).promise, deduplicated: true }
        const queued = this.waiting.find(item => item.execution.id === existing.id)
        if (queued?.promise) return { execution: existing, promise: queued.promise, deduplicated: true }
        return { execution: existing, promise: Promise.resolve(existing), deduplicated: true }
      }
    }
    const version = flow.versions?.find(v => v.id === flow.published_version_id)
    if (published && !version) throw problem('A integração não tem uma versão publicada.', 409, 'NOT_PUBLISHED')
    const graph = structuredClone(snapshot ?? (published ? version.snapshot ?? version : { steps: flow.steps, edges: flow.edges, settings: flow.settings, test_input: flow.test_input }))
    const execution = {
      id: uid(), org_id: flow.org_id, flux_id: flow.id, flux_name: flow.name,
      status: 'queued', origin, input: redact(structuredClone(input ?? graph.test_input ?? {})),
      encrypted_input: this.domain.box.encrypt(input ?? graph.test_input ?? {}),
      snapshot: { id: flow.id, ...graph }, version_id: published ? version.id : null,
      idempotency_key: idempotencyKey ?? null, replay_of: replayOf ?? null, handler_depth: handlerDepth,
      started_at: now(), duration_ms: 0, steps: [], operations: 0, context: {},
    }
    this.store.put('executions', execution)
    let resolve
    const promise = new Promise(r => { resolve = r })
    this.waiting.push({ execution, resolve, promise })
    if (this.autoStart) queueMicrotask(() => this.drain())
    return { execution: this.publicExecution(execution), promise }
  }
  publicExecution(execution) { const { snapshot, idempotency_key, encrypted_input, encrypted_response, ...publicData } = execution; return publicData }
  runtimeOptions(execution) {
    const scope = execution.org_id + ':' + execution.flux_id + ':'
    return {
      ...this.options,
      maxExecutionMs: Math.max(50, Math.min(30000, this.deadline - Date.now())),
      memory: {
        runExclusive: async (sessionId, callback) => {
          const key = scope + String(sessionId)
          const previous = this.memoryLocks.get(key) ?? Promise.resolve()
          let release
          const current = new Promise(resolve => { release = resolve })
          this.memoryLocks.set(key, current)
          await previous
          try { return await callback() } finally { release(); if (this.memoryLocks.get(key) === current) this.memoryLocks.delete(key) }
        },
        load: async sessionId => {
          const record = this.store.get('memory', digest(scope + String(sessionId)))
          return record ? this.domain.box.decrypt(record.encrypted).messages : []
        },
        save: async (sessionId, messages) => {
          if (!Array.isArray(messages)) throw problem('Memória deve conter uma lista de mensagens.')
          const retained = messages.slice(-100)
          if (JSON.stringify(retained).length > 1000000) throw problem('Memória excede 1 MB.')
          this.store.put('memory', { id: digest(scope + String(sessionId)), org_id: execution.org_id, flow_id: execution.flux_id, updated_at: now(), encrypted: this.domain.box.encrypt({ messages: retained }) })
        },
      },
      accumulate: async ({ key, value, windowMs, limit, signal }) => {
        if (signal?.aborted) throw problem('Execução cancelada.', 409)
        return this.store.transaction(() => {
          const id = digest(scope + String(key)), time = Date.now()
          const stored = this.store.get('accumulators', id)
          const previous = stored ? this.domain.box.decrypt(stored.encrypted).items : []
          const items = [...previous.filter(item => item.at >= time - windowMs), { at: time, value }].slice(-Math.max(1, limit))
          this.store.put('accumulators', { id, org_id: execution.org_id, flow_id: execution.flux_id, updated_at: now(), encrypted: this.domain.box.encrypt({ items }) })
          return items.map(item => item.value)
        })
      },
      onResponse: response => { execution.encrypted_response = this.domain.box.encrypt(response) },
    }
  }
  subscribe(id, callback) {
    const listeners = this.listeners.get(id) ?? new Set(); listeners.add(callback); this.listeners.set(id, listeners)
    return () => { listeners.delete(callback); if (!listeners.size) this.listeners.delete(id) }
  }
  event(id, event) {
    const safe = redact({ ...event, executionId: id })
    const sequence = this.store.addEvent(id, safe)
    for (const callback of this.listeners.get(id) ?? []) { try { callback({ ...safe, sequence }) } catch { /* Browser delivery is independent of execution. */ } }
  }
  drain() {
    while (this.running.size < this.concurrency && this.waiting.length) {
      const item = this.waiting.shift()
      if (Date.now() >= this.deadline) {
        item.execution.status = 'interrupted'; item.execution.ended_at = now()
        item.execution.error = { code: 'EXECUTION_TIMEOUT', message: 'O orçamento de execução da Trama terminou antes deste trabalho iniciar.' }
        this.store.put('executions', item.execution)
        const result = this.publicExecution(item.execution)
        this.event(item.execution.id, { type: 'execution:finish', execution: result }); item.resolve(result); continue
      }
      const controller = new AbortController()
      this.running.set(item.execution.id, { controller, promise: item.promise })
      this.start(item.execution, controller.signal).then(item.resolve).finally(() => { this.running.delete(item.execution.id); this.drain() })
    }
  }
  async start(execution, signal) {
    const finish = (code, message, status = 'error') => {
      execution.status = status; execution.ended_at = now(); execution.error = { code, message }
      this.store.put('executions', execution)
      const result = this.publicExecution(execution)
      this.event(execution.id, { type: 'execution:finish', execution: result })
      return result
    }
    try { if (this.beforeStart) await this.beforeStart(this.publicExecution(execution)) }
    catch { return finish('CHECKPOINT_FAILED', 'O histórico não pôde ser preparado antes da execução. Nenhum efeito deste trabalho foi iniciado.') }
    if (signal.aborted) return finish('CANCELLED', 'Execução cancelada antes de iniciar.', 'cancelled')
    if (Date.now() >= this.deadline) return finish('EXECUTION_TIMEOUT', 'O orçamento de execução terminou durante a preparação do histórico.')
    try { return await this.execute(execution, signal) }
    catch { return finish('EXECUTION_INTERNAL_ERROR', 'Não foi possível concluir os registros da execução. Revise os efeitos externos antes de repetir.') }
  }
  async execute(execution, signal) {
    const start = Date.now()
    execution.status = 'running'; this.store.put('executions', execution)
    this.event(execution.id, { type: 'execution:start', execution: this.publicExecution(execution) })
    try {
      const result = await executeGraph({
        flux: execution.snapshot, input: execution.encrypted_input ? this.domain.box.decrypt(execution.encrypted_input) : execution.input, executionId: execution.id,
        getConnection: id => this.domain.secretConnection(id, execution.org_id),
        signal, options: this.runtimeOptions(execution),
        onEvent: async event => {
          if (event.type === 'execution:finish') return
          if (event.type === 'node:finish' && event.step) {
            execution.steps.push(redact(event.step))
            if (event.context) execution.context = redact(event.context)
            this.store.put('executions', execution)
          }
          this.event(execution.id, event)
        },
      })
      Object.assign(execution, redact(result))
    } catch (error) {
      execution.status = signal.aborted ? 'cancelled' : 'error'
      execution.error = { code: error.code ?? 'EXECUTION_ERROR', message: error.message }
    }
    execution.duration_ms = Date.now() - start; execution.ended_at = now()
    this.store.transaction(() => {
      this.store.put('executions', execution)
      const flow = this.store.get('flows', execution.flux_id)
      if (flow) {
        flow.activations = Number(flow.activations ?? 0) + Number(execution.operations ?? 0)
        flow.average_execution = execution.duration_ms
        if (execution.status === 'error' && execution.snapshot.settings?.halt_on_error) flow.active = false
        this.store.put('flows', flow)
      }
      const subscription = this.store.get('subscriptions', execution.org_id)
      if (subscription) { subscription.quantity_used += Number(execution.operations ?? 0); this.store.put('subscriptions', subscription, execution.org_id) }
      this.store.put('usage', { id: execution.id, org_id: execution.org_id, execution_id: execution.id, quantity: Number(execution.operations ?? 0), created_at: now() })
    })
    const publicData = this.publicExecution(execution)
    this.event(execution.id, { type: 'execution:finish', execution: publicData })
    const handlerId = execution.snapshot.settings?.error_handler_flux_id
    if (execution.status === 'error' && handlerId && execution.handler_depth < 3 && handlerId !== execution.flux_id) {
      const handler = this.store.get('flows', handlerId)
      if (handler?.org_id === execution.org_id && handler.published_version_id) this.submit(handler, { input: execution.input, error: execution.error, steps: execution.steps, execution_id: execution.id }, { origin: 'Tratamento de erro', published: true, handlerDepth: execution.handler_depth + 1 })
    }
    return publicData
  }
  cancel(id) {
    const current = this.running.get(id)
    if (current) { current.controller.abort(); return true }
    const index = this.waiting.findIndex(i => i.execution.id === id)
    if (index < 0) return false
    const [item] = this.waiting.splice(index, 1); item.execution.status = 'cancelled'; item.execution.ended_at = now()
    this.store.put('executions', item.execution)
    const publicData = this.publicExecution(item.execution)
    this.event(id, { type: 'execution:finish', execution: publicData }); item.resolve(publicData); return true
  }
  tick(time = Date.now()) {
    for (const flow of this.store.list('flows')) {
      if (!flow.active || !flow.published_version_id) continue
      const version = flow.versions?.find(v => v.id === flow.published_version_id)
      const trigger = (version?.snapshot ?? version)?.steps?.find(s => ['scheduler','schedule'].includes(s.app))
      if (!trigger) continue
      const config = trigger.config ?? {}
      const units = { seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000, segundos: 1000, minutos: 60000, horas: 3600000, dias: 86400000 }
      const interval = Math.max(60000, Number(config.interval_ms) || (config.interval_minutes !== undefined ? Number(config.interval_minutes) * 60000 : Number(config.interval ?? config.amount ?? 10) * (units[config.unit ?? 'minutes'] ?? 60000)))
      if (Number(flow.next_run_at ?? 0) > time) continue
      // Claim this occurrence before scheduling; missed occurrences coalesce.
      flow.next_run_at = time + interval; this.store.put('flows', flow)
      this.submit(flow, { triggered_at: new Date(time).toISOString(), schedule: config }, { origin: 'Agendamento', published: true, idempotencyKey: 'schedule:' + time })
    }
  }
  async close() {
    for (const item of [...this.waiting]) this.cancel(item.execution.id)
    for (const { controller } of this.running.values()) controller.abort()
    await Promise.allSettled([...this.running.values()].map(j => j.promise).filter(Boolean))
  }
  async idle() {
    this.drain()
    while (this.running.size || this.waiting.length) {
      await Promise.allSettled([...this.running.values()].map(job => job.promise))
      await new Promise(resolve => queueMicrotask(resolve))
      this.drain()
    }
  }
}
