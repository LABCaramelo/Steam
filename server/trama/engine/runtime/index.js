import { performance } from 'node:perf_hooks'
import { setTimeout as sleep } from 'node:timers/promises'
import { resolveValue, evaluateExpression, getPath } from '../shared/expressions.js'
import { executeConnector, credentialsOf, tokenOf } from '../connectors/index.js'
import { McpClient, selectMcpTools } from '../connectors/mcp.js'
import { validateToolSchema, validateToolArguments } from './tool-schema.js'
import { httpRequest, parseDictionary } from './http.js'
import { declaredCredentialSecrets } from './declarative.js'
import { runScript } from './scripts.js'
import { RuntimeError, assertNotAborted, publicError, redact, abortError } from './errors.js'

export { RuntimeError, httpRequest, runScript }
const clone = (value) => value === undefined ? undefined : structuredClone(value)
const own = (object, key) => object != null && Object.prototype.hasOwnProperty.call(object, key)
const LOOP_APPS = new Set(['for_each', 'foreach', 'for', 'while'])
const TRIGGERS = new Set(['webhook', 'scheduler', 'manual', 'activator'])
const BODY_HANDLES = new Set(['body', 'loop', 'iterate', 'iteration', 'each'])
const DONE_HANDLES = new Set(['done', 'next', 'exit', 'after', 'completed'])
const AGENT_SLOTS = new Set(['model', 'memory', 'tools', 'tool', 'bottom-handle-model', 'bottom-handle-memory', 'bottom-handle-tools'])
const toolSlot = edge => ['tools', 'tool', 'bottom-handle-tools'].includes(edgeHandle(edge))
const edgeHandle = (edge) => String(edge.sourceHandle ?? edge.branch ?? edge.label ?? '').toLowerCase()
const appName = (step) => String(step.app || step.type || '').toLowerCase()
const isLoop = (step) => LOOP_APPS.has(appName(step))

export function normalizeInput(input = {}, now = new Date().toISOString()) {
  const envelope = input && typeof input === 'object' && !Array.isArray(input) && (own(input, 'BODY') || own(input, 'body') && ['headers', 'query', 'method', 'HEADERS', 'QUERY', 'METHOD'].some((key) => own(input, key)))
  const body = envelope ? own(input, 'BODY') ? input.BODY : input.body : input
  const headers = envelope ? input.HEADERS ?? input.headers ?? {} : {}
  const query = envelope ? input.QUERY ?? input.query ?? {} : {}
  const method = envelope ? input.METHOD ?? input.method ?? 'POST' : 'POST'
  return { ...(body && typeof body === 'object' && !Array.isArray(body) ? clone(body) : {}), BODY: clone(body), body: clone(body), HEADERS: clone(headers), headers: clone(headers), QUERY: clone(query), query: clone(query), METHOD: method, method, PATH: envelope ? input.PATH ?? input.path ?? '' : '', received_at: now }
}

function graphOf(flux) {
  const steps = clone(Array.isArray(flux?.steps) ? flux.steps : [])
  const legacy = !Array.isArray(flux?.edges)
  const edges = clone(legacy ? steps.slice(1).map((step, i) => ({ id: `legacy-${i}`, source: String(steps[i].id), target: String(step.id) })) : flux.edges)
  const appendChildren = (step) => {
    const children = step.children ?? step.body_steps ?? step.config?.body_steps
    if (!Array.isArray(children) || !children.length) return
    if (!isLoop(step)) return
    for (const child of children) { steps.push(clone(child)); appendChildren(steps.at(-1)) }
    edges.push({ id: `body-${step.id}`, source: String(step.id), target: String(children[0].id), sourceHandle: 'body' })
    for (let i = 1; i < children.length; i++) edges.push({ id: `body-${step.id}-${i}`, source: String(children[i - 1].id), target: String(children[i].id) })
  }
  for (const step of [...steps]) appendChildren(step)
  for (const step of steps) { step.id = String(step.id ?? ''); step.app = appName(step) }
  const seenEdges = new Set()
  const deduplicatedEdges = []
  for (const edge of edges) {
    edge.source = String(edge.source ?? '')
    edge.target = String(edge.target ?? '')
    edge.id = String(edge.id ?? `${edge.source}:${edge.target}:${edgeHandle(edge)}`)
    const key = `${edge.source}\u0000${edge.target}\u0000${edgeHandle(edge)}`
    if (!seenEdges.has(key)) { seenEdges.add(key); deduplicatedEdges.push(edge) }
  }
  const trigger = steps.find((step) => TRIGGERS.has(step.app))
  const start = trigger ?? steps.find((step) => !deduplicatedEdges.some((edge) => edge.target === step.id))
  return { steps, edges: deduplicatedEdges, startId: start?.id ?? null, legacy }
}

export function validateGraph(flux) {
  const errors = []
  const warnings = []
  const graph = graphOf(flux)
  const ids = new Set()
  if (!graph.steps.length) errors.push({ code: 'EMPTY_GRAPH', message: 'Adicione um gatilho à integração.' })
  if (graph.steps.length > 1000) errors.push({ code: 'GRAPH_LIMIT', message: 'O fluxo excede o limite de 1000 nós.' })
  for (const step of graph.steps) {
    if (!step.id || ['__proto__', 'prototype', 'constructor', '__now'].includes(step.id) || step.id === 'IN' && !TRIGGERS.has(step.app)) errors.push({ code: 'INVALID_NODE_ID', nodeId: step.id, message: 'ID de nó inválido ou reservado.' })
    if (ids.has(step.id)) errors.push({ code: 'DUPLICATE_NODE_ID', nodeId: step.id, message: `ID de nó repetido: ${step.id}` })
    ids.add(step.id)
    if (!step.app) errors.push({ code: 'MISSING_NODE_TYPE', nodeId: step.id, message: 'Nó sem tipo de componente.' })
  }
  if (graph.steps.filter((step) => TRIGGERS.has(step.app)).length > 1) errors.push({ code: 'MULTIPLE_TRIGGERS', message: 'O fluxo deve ter um único nó de entrada.' })
  if (!graph.steps.some((step) => TRIGGERS.has(step.app))) warnings.push({ code: 'NO_TRIGGER', message: 'Sem gatilho; o teste começa no primeiro nó sem entrada.' })
  const outgoing = new Map(graph.steps.map((step) => [step.id, []]))
  for (const edge of graph.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) { errors.push({ code: 'DANGLING_EDGE', edgeId: edge.id, message: 'Aresta aponta para um nó inexistente.' }); continue }
    if (edge.source === edge.target) errors.push({ code: 'CYCLE', edgeId: edge.id, message: 'Aresta não pode retornar ao próprio nó; use um componente de loop.' })
    outgoing.get(edge.source).push(edge)
  }
  const colors = new Map()
  function visit(id) {
    if (colors.get(id) === 1) { errors.push({ code: 'CYCLE', nodeId: id, message: 'Ciclo detectado. Use For Each, For ou While com corpo separado.' }); return }
    if (colors.get(id) === 2) return
    colors.set(id, 1)
    for (const edge of outgoing.get(id) || []) visit(edge.target)
    colors.set(id, 2)
  }
  for (const step of graph.steps) visit(step.id)
  const reachable = new Set()
  function reach(id) { if (!id || reachable.has(id)) return; reachable.add(id); for (const edge of outgoing.get(id) || []) reach(edge.target) }
  reach(graph.startId)
  graph.floatingIds = graph.steps.filter((step) => !reachable.has(step.id)).map((step) => step.id)
  if (graph.floatingIds.length) warnings.push({ code: 'FLOATING_NODES', nodeIds: graph.floatingIds, message: `${graph.floatingIds.length} nó(s) desconectado(s) não serão executados.` })
  for (const step of graph.steps) {
    const incoming = graph.edges.filter((edge) => edge.target === step.id)
    const loopExit = incoming.some((edge) => isLoop(graph.steps.find((item) => item.id === edge.source) || {}) && DONE_HANDLES.has(edgeHandle(edge)))
    if (incoming.length > 1 && !loopExit) errors.push({ code: 'JOIN_NOT_SUPPORTED', nodeId: step.id, message: 'Convergência entre ramos precisa de uma etapa explícita de agregação; não conecte dois ramos diretamente ao mesmo nó.' })
    if (isLoop(step) && (outgoing.get(step.id) || []).filter((edge) => BODY_HANDLES.has(edgeHandle(edge))).length > 1) errors.push({ code: 'MULTIPLE_LOOP_BODIES', nodeId: step.id, message: 'O loop aceita uma única entrada de corpo.' })
  }
  return { valid: errors.length === 0, errors, warnings, graph }
}

function compare(left, operator, right, coerce = false) {
  const equality = () => coerce ? String(left ?? '') === String(right ?? '') : typeof left === 'object' && typeof right === 'object' ? JSON.stringify(left) === JSON.stringify(right) : left === right
  switch (String(operator || 'eq').toLowerCase()) {
    case '=': case '==': case '===': case 'eq': case 'equal': case 'equals': return equality()
    case '!=': case '!==': case 'neq': case 'different': case 'not_equal': return !equality()
    case '>': case 'gt': return left > right
    case '>=': case 'gte': return left >= right
    case '<': case 'lt': return left < right
    case '<=': case 'lte': return left <= right
    case 'contains': return Array.isArray(left) ? left.includes(right) : String(left ?? '').includes(String(right ?? ''))
    case 'not_contains': case 'not contains': return !compare(left, 'contains', right)
    case 'exists': case 'filled': case 'is_not_null': case 'is not null': return left !== undefined && left !== null && left !== ''
    case 'not_exists': case 'empty': case 'is_null': case 'is null': return left === undefined || left === null || left === ''
    case 'starts_with': return String(left ?? '').startsWith(String(right ?? ''))
    case 'ends_with': return String(left ?? '').endsWith(String(right ?? ''))
    case 'in': return Array.isArray(right) ? right.includes(left) : String(right ?? '').split(',').includes(String(left))
    case 'not_in': return !compare(left, 'in', right)
    case 'true': return left === true
    case 'false': return left === false
    default: throw new RuntimeError('INVALID_OPERATOR', `Operador de filtro desconhecido: ${operator}`)
  }
}

export function evaluateCondition(config, context) {
  if (config.expression !== undefined && config.expression !== '') return !!evaluateExpression(String(config.expression), context)
  const condition = (entry) => {
    const resolved = resolveValue(entry, context)
    let left = resolved.field ?? resolved.left
    if (typeof left === 'string' && !String(entry.field ?? entry.left ?? '').includes('{{')) {
      if (left.startsWith('$')) left = evaluateExpression(left, context)
      else { const found = getPath(context.IN?.body, left); if (found !== undefined) left = found }
    }
    return compare(left, resolved.operator, resolved.value ?? resolved.right, resolved.coerce === true)
  }
  if (Array.isArray(config.conditions)) return String(config.mode || config.match || 'and').toLowerCase() === 'or' ? config.conditions.some(condition) : config.conditions.every(condition)
  return condition(config)
}

function jsonValue(value, label) {
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { throw new RuntimeError('INVALID_CONFIG', `${label} deve ser JSON válido ou uma variável com o tipo apropriado.`) }
}

function normalizeOutput(output) {
  if (output === undefined) return null
  if (output && typeof output === 'object' && !Array.isArray(output)) {
    const result = { ...output }
    if (own(result, 'body') && !own(result, 'BODY')) result.BODY = result.body
    if (own(result, 'result') && !own(result, 'RESULT')) result.RESULT = result.result
    return result
  }
  return output
}

function secretValues(connection) {
  return declaredCredentialSecrets(connection)
}

export async function executeGraph({ flux, input = {}, connections = [], getConnection, onEvent, signal, executionId = null, options = {} } = {}) {
  if (Buffer.byteLength(JSON.stringify(input)) > 256 * 1024) throw new RuntimeError('INPUT_LIMIT', 'A entrada do fluxo excede 256 KB. Use um arquivo para entradas maiores.')
  const validation = validateGraph(flux)
  if (!validation.valid) throw new RuntimeError('INVALID_GRAPH', validation.errors[0].message, { errors: validation.errors })
  const snapshot = validation.graph
  const nodes = new Map(snapshot.steps.map((step) => [step.id, step]))
  const outgoing = new Map(snapshot.steps.map((step) => [step.id, snapshot.edges.filter((edge) => edge.source === step.id)]))
  const controller = new AbortController()
  const externalAbort = () => controller.abort()
  signal?.addEventListener('abort', externalAbort, { once: true })
  if (signal?.aborted) controller.abort()
  const effectiveSignal = controller.signal
  const limitMs = Math.max(50, Math.min(30000, Number(options.maxExecutionMs ?? 30000)))
  let timedOut = false
  const timeout = setTimeout(() => { timedOut = true; controller.abort() }, limitMs)
  const startTime = performance.now()
  const now = new Date().toISOString()
  const context = { ...clone(options.context ?? options.initialContext ?? {}), IN: normalizeInput(input, now), __now: now }
  const logs = []
  const secrets = []
  const connectionCache = new Map()
  const maxVisits = Math.max(1, Math.min(1000, Number(options.maxNodeVisits ?? 500)))
  const maxIterations = Math.max(1, Math.min(500, Number(options.maxIterations ?? 100)))
  let visits = 0
  let operations = 0
  let lastOutput = context.IN
  let response
  let returned = false
  const hiddenLogPaths = new Set()
  const safe = (value) => {
    const copy = redact(value, secrets)
    const hide = (target, parts) => {
      if (!target || typeof target !== 'object' || !parts.length) return
      const [key, ...rest] = parts
      if (['__proto__', 'prototype', 'constructor'].includes(key)) return
      const variants = ['body', 'headers', 'query', 'result', 'response', 'iterable', 'code'].includes(key.toLowerCase()) ? [...new Set([key, key.toLowerCase(), key.toUpperCase()])] : [key]
      for (const variant of variants) if (own(target, variant)) {
        if (rest.length) hide(target[variant], rest)
        else target[variant] = '[REDACTED]'
      }
    }
    const hideInLog = (record, parts) => {
      hide(record, parts)
      hide(record?.output, parts)
      hide(record?.input, parts)
      if (parts[0] === 'IN') { hide(record?.input, parts.slice(1)); hide(record?.output, parts.slice(1)) }
    }
    const hideNested = (target, parts, depth = 0) => {
      if (!target || typeof target !== 'object' || depth > 40) return
      hide(target, parts)
      for (const child of Object.values(target)) if (child && typeof child === 'object') hideNested(child, parts, depth + 1)
    }
    for (const path of hiddenLogPaths) {
      const parts = String(path).replace(/^\$/, '').split('.').filter(Boolean)
      hideNested(copy, parts)
      hideInLog(copy, parts)
      if (Array.isArray(copy)) for (const record of copy) hideInLog(record, parts)
      if (copy?.IN) for (const payload of Object.values(copy)) hide(payload, parts)
    }
    return copy
  }
  const emit = async (event, eventContext = context) => { if (onEvent) await onEvent({ executionId, ...event, context: safe(eventContext) }) }
  const lookupConnection = async (step) => {
    const id = step.connection_id ?? step.config?.connection_id ?? step.config?.CONNECTION
    if (!id) return null
    if (connectionCache.has(id)) return connectionCache.get(id)
    const connection = getConnection ? await getConnection(id) : Array.isArray(connections) ? connections.find((item) => item.id === id) : connections[id]
    if (!connection) throw new RuntimeError('CONNECTION_NOT_FOUND', 'A conexão vinculada não foi encontrada ou não está disponível nesta organização.')
    secrets.push(...secretValues(connection))
    connectionCache.set(id, connection)
    return connection
  }

  async function perform(step, ctx, previous) {
    const raw = step.config ?? step.value ?? {}
    const config = resolveValue(raw, ctx)
    const app = step.app
    if (TRIGGERS.has(app)) return { output: ctx.IN }
    if (app === 'requester' || app === 'http') {
      const connection = await lookupConnection(step)
      const creds = credentialsOf(connection)
      const headers = { ...parseDictionary(creds.headers, 'Headers da conexão'), ...parseDictionary(config.headers ?? config.HEADERS, 'Headers') }
      const credentialToken = tokenOf(creds)
      if (credentialToken && !Object.keys(headers).some(key => key.toLowerCase() === 'authorization')) {
        if (creds.header_name || creds.auth_type === 'api_key') headers[creds.header_name || 'x-api-key'] = credentialToken
        else headers.Authorization = `Bearer ${credentialToken}`
      }
      if (creds.auth_type === 'basic' && !Object.keys(headers).some(key => key.toLowerCase() === 'authorization')) headers.Authorization = 'Basic ' + Buffer.from(String(creds.username || '') + ':' + String(creds.password || '')).toString('base64')
      return { output: await httpRequest({ ...config, headers }, { signal: effectiveSignal, maxResponseBytes: options.maxResponseBytes, fetchImpl: options.fetchImpl }) }
    }
    if (app === 'code' || app === 'javascript') {
      const script = await runScript(String(raw.code ?? raw.code_snippet ?? raw.CODE ?? raw.SCRIPT ?? ''), { input: previous?.body ?? previous, context: ctx, signal: effectiveSignal, timeoutMs: config.timeout ?? options.scriptTimeoutMs ?? 3000, memoryMb: options.scriptMemoryMb })
      return { output: { result: script.result }, console: script.logs }
    }
    if (app === 'filter' || app === 'if') {
      const matched = evaluateCondition(raw, ctx)
      return { output: { matched }, matched }
    }
    if (app === 'delay') {
      const amount = Number(config.amount ?? config.duration ?? 1)
      const unit = String(config.unit ?? 'Segundos').toLowerCase()
      const multiplier = unit.startsWith('mil') || unit === 'ms' ? 1 : unit.startsWith('min') ? 60000 : unit.startsWith('hor') || unit === 'h' ? 3600000 : unit.startsWith('dia') || unit === 'd' ? 86400000 : 1000
      const duration = amount * multiplier
      if (!Number.isFinite(duration) || duration < 0 || duration > Number(options.maxDelayMs ?? 3600000)) throw new RuntimeError('INVALID_DELAY', 'Tempo de espera fora do limite configurado.')
      try { await sleep(duration, undefined, { signal: effectiveSignal }) } catch { throw abortError() }
      return { output: { delayed_ms: duration } }
    }
    if (app === 'return') {
      const status = Number(config.status ?? config.status_code ?? config.code ?? 200)
      if (!Number.isInteger(status) || status < 200 || status > 599) throw new RuntimeError('INVALID_RETURN_STATUS', 'O retorno final deve usar um código HTTP de 200 a 599.')
      response = { status, code: status, headers: parseDictionary(config.headers, 'Headers de retorno'), body: config.body ?? previous?.body ?? previous, content_type: config.content_type ?? config.contentType ?? 'application/json' }
      if(!['application/json','application/xml','multipart/form-data','text/html','text/xml','text/plain'].includes(String(response.content_type).split(';')[0].trim().toLowerCase()))throw new RuntimeError('INVALID_RETURN_FORMAT','Escolha um formato de retorno disponível.')
      if (options.onResponse) await options.onResponse(clone(response))
      returned = true
      return { output: { body: response.body, code: status, headers: response.headers, content_type: response.content_type }, returned: true }
    }
    if (app === 'set_variables' || app === 'variables') {
      const values = jsonValue(config.values ?? config.variables ?? {}, 'Variáveis')
      if (!values || typeof values !== 'object' || Array.isArray(values)) throw new RuntimeError('INVALID_CONFIG', 'Definir variáveis precisa de um objeto JSON.')
      return { output: values }
    }
    if (app === 'remap') {
      const source = config.source ?? previous?.body ?? previous
      const mapping = config.mapping ?? config.values
      if (!mapping || typeof mapping !== 'object') throw new RuntimeError('INVALID_CONFIG', 'Informe o objeto de mapeamento.')
      const output = {}
      for (const [key, path] of Object.entries(mapping)) { if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new RuntimeError('INVALID_CONFIG', 'Chave de mapeamento não permitida.'); output[key] = typeof path === 'string' && getPath(source, path) !== undefined ? getPath(source, path) : path }
      return { output: { result: output } }
    }
    if (app === 'aggregate') {
      let values = config.values ?? config.items ?? config.source ?? config.iterable
      if (values == null) throw new RuntimeError('INVALID_CONFIG', 'Informe os itens para agregação.')
      if (typeof values === 'string') values = values.startsWith('$') ? evaluateExpression(values, ctx) : jsonValue(values, 'Coleção')
      if (!values || typeof values !== 'object') throw new RuntimeError('INVALID_CONFIG', 'Agregador precisa de um array ou objeto.')
      const items = Array.isArray(values) ? values : Object.values(values)
      const mode = config.mode ?? config.operation ?? 'collect'
      if (!['collect', 'sum', 'count', 'join'].includes(mode)) throw new RuntimeError('INVALID_CONFIG', 'Operação de agregação não reconhecida.')
      const projected = config.field ? items.map(value => getPath(value, config.field)) : items
      const result = mode === 'sum' ? projected.reduce((total, value) => total + Number(value), 0) : mode === 'count' ? items.length : mode === 'join' ? projected.join(config.separator ?? ', ') : projected
      if (typeof result === 'number' && !Number.isFinite(result)) throw new RuntimeError('INVALID_CONFIG', 'A soma contém um valor não numérico.')
      return { output: { result } }
    }
    if (app === 'accumulator') {
      if (typeof options.accumulate !== 'function') throw new RuntimeError('STATE_BACKEND_REQUIRED', 'Acumulador requer um armazenamento persistente configurado no servidor.')
      const key = config.key ?? config.CACHE_KEY
      if (key == null || key === '') throw new RuntimeError('MISSING_CONFIG', 'Defina a chave do acumulador.')
      const windowMs = Number(config.window_ms ?? (config.window_seconds == null ? 60000 : Number(config.window_seconds) * 1000))
      if (!Number.isFinite(windowMs) || windowMs < 0 || windowMs > 86400000) throw new RuntimeError('INVALID_CONFIG', 'Janela do acumulador fora do limite de 0 a 86400 segundos.')
      const result = await options.accumulate({ key: String(key), value: config.value ?? config.message ?? previous?.body ?? previous, windowMs, limit: Math.min(1000, Number(config.limit ?? 100)), signal: effectiveSignal })
      return { output: { result, body: result } }
    }
    if (app === 'filter_log') {
      const paths = config.paths ?? config.omit ?? []
      if (!Array.isArray(paths)) throw new RuntimeError('INVALID_CONFIG', 'Filtro de Logs requer um array de caminhos a ocultar.')
      if (paths.length > 100 || paths.some(path => typeof path !== 'string' || path.length > 1000 || path.split('.').length > 40)) throw new RuntimeError('INVALID_CONFIG', 'Filtro de Logs aceita até 100 caminhos de no máximo 40 níveis.')
      for (const path of paths) hiddenLogPaths.add(String(path))
      return { output: { hidden_paths: [...hiddenLogPaths] } }
    }
    if (app === 'file') {
      const operation = config.operation ?? 'encode'
      if (operation === 'download') return { output: await httpRequest({ ...config, method: 'GET' }, { signal: effectiveSignal, maxResponseBytes: options.maxResponseBytes, fetchImpl: options.fetchImpl }) }
      if (!['encode', 'decode'].includes(operation)) throw new RuntimeError('UNSUPPORTED_OPERATION', 'Operação de arquivo disponível: encode, decode ou download.')
      const value = config.data ?? config.text
      if (value == null) throw new RuntimeError('MISSING_CONFIG', 'Informe os dados do arquivo.')
      return { output: { result: Buffer.from(String(value), operation === 'decode' ? 'base64' : 'utf8').toString(operation === 'decode' ? 'utf8' : 'base64'), name: config.name ?? 'arquivo.txt', content_type: config.content_type ?? 'text/plain' } }
    }
    if (app === 'router') return { output: { branches: (outgoing.get(step.id) || []).length } }
    if (isLoop(step)) return { output: null }
    if (app === 'mcp_client') {
      const connection = await lookupConnection(step)
      const client = new McpClient(config, connection, { signal: effectiveSignal, fetchImpl: options.fetchImpl })
      try {
        const tools = selectMcpTools(await client.listTools(), config)
        if ((config.operation ?? 'list') === 'list') return { output: { tools } }
        if (config.operation !== 'call') throw new RuntimeError('MCP_INVALID_OPERATION', 'Operação MCP deve ser list ou call.')
        const tool = tools.find(tool => tool.name === config.tool_name)
        if (!tool) throw new RuntimeError('MCP_TOOL_NOT_FOUND', 'Ferramenta MCP não está no catálogo permitido.')
        const args = typeof config.arguments === 'string' ? jsonValue(config.arguments, 'Argumentos MCP') : config.arguments ?? {}
        validateToolSchema(tool.inputSchema); validateToolArguments(args, tool.inputSchema)
        return { output: { result: await client.callTool(tool.name, args) } }
      } finally { await client.close() }
    }
    if (app === 'ai_agent') return { output: await runAgent(step, raw, ctx) }
    const connection = await lookupConnection(step)
    if (step.definition) secrets.push(...declaredCredentialSecrets(connection))
    return { output: await executeConnector(step, config, connection, { context: ctx, redactResult: false, signal: effectiveSignal, maxResponseBytes: options.maxResponseBytes, fetchImpl: options.fetchImpl }) }
  }

  async function runAgent(step, raw, ctx, memoryLockAcquired = false) {
    const depth = Number(options.agentDepth ?? 0)
    if (depth >= 4) throw new RuntimeError('AGENT_DEPTH_LIMIT', 'O agente excedeu o limite de quatro níveis de ferramentas.')
    const agentEdges = outgoing.get(step.id) ?? []
    const modelEdge = agentEdges.find(edge => ['model', 'bottom-handle-model'].includes(edgeHandle(edge)))
    const modelNode = modelEdge && nodes.get(modelEdge.target)
    const memoryEdge = agentEdges.find(edge => ['memory', 'bottom-handle-memory'].includes(edgeHandle(edge)))
    const memoryNode = memoryEdge && nodes.get(memoryEdge.target)
    const config = resolveValue({ ...(modelNode?.config ?? {}), ...raw }, ctx)
    if (!config.model && modelNode?.config?.model) config.model = resolveValue(modelNode.config.model, ctx)
    const connection = await lookupConnection({ ...step, connection_id: step.connection_id ?? modelNode?.connection_id })
    const providerApp = String(modelNode?.app ?? connection?.app ?? '').toLowerCase()
    const provider = String(config.provider ?? config.AI_PROVIDER ?? credentialsOf(connection).provider ?? (['anthropic', 'claude'].includes(providerApp) ? 'anthropic' : 'openai')).toLowerCase()
    config.provider = provider
    const maximumRounds = Number(config.max_iterations ?? 8)
    if (!Number.isInteger(maximumRounds) || maximumRounds < 1 || maximumRounds > 32) throw new RuntimeError('INVALID_CONFIG', 'O agente aceita de 1 a 32 rodadas de ferramentas.')
    const memoryConfig = config.memory ?? config.AI_MEMORY ?? (memoryNode ? resolveValue(memoryNode.config?.AI_MEMORY ?? memoryNode.config ?? {}, ctx) : undefined)
    const sessionId = config.session_id ?? config.SESSION_ID ?? memoryConfig?.session_id
    if (memoryConfig && !sessionId) throw new RuntimeError('MISSING_CONFIG', 'Configure o ID da sessão para usar memória.')
    if (sessionId && (!options.memory?.load || !options.memory?.save)) throw new RuntimeError('STATE_BACKEND_REQUIRED', 'Memória do agente requer persistência configurada no servidor.')
    if (sessionId && options.agentMemorySessions?.includes(String(sessionId))) throw new RuntimeError('MEMORY_SESSION_REENTRY', 'Um agente aninhado precisa de uma sessão de memória diferente da sessão de seu agente pai.')
    if (sessionId && options.memory.runExclusive && !memoryLockAcquired) return options.memory.runExclusive(String(sessionId), () => runAgent(step, raw, ctx, true))
    let history = []
    if (sessionId) {
      const stored = await options.memory.load(String(sessionId))
      history = clone(Array.isArray(stored) ? stored : stored?.messages ?? [])
      if (!Array.isArray(history) || history.some(message => !message || !['user', 'assistant', 'tool'].includes(message.role))) throw new RuntimeError('MEMORY_INVALID', 'Histórico de memória inválido.')
      history = history.slice(-100)
      // Never leave a leading tool result after trimming an old conversation.
      while (history[0]?.role === 'tool') history.shift()
    }
    const configuredMessages = config.messages == null ? null : jsonValue(config.messages, 'Mensagens')
    if (configuredMessages && !Array.isArray(configuredMessages)) throw new RuntimeError('INVALID_CONFIG', 'Mensagens do agente devem ser um array.')
    const prompt = config.user_prompt ?? config.HUMAN_MESSAGE ?? config.prompt ?? config.message
    if (!configuredMessages && (prompt == null || prompt === '')) throw new RuntimeError('MISSING_CONFIG', 'Configure a mensagem do usuário.')
    history.push(...clone(configuredMessages ?? [{ role: 'user', content: String(prompt) }]))
    const tools = new Map(), mcpClients = [], toolHistory = []
    const register = (candidate, run) => {
      const originalName = String(candidate.name ?? '')
      const name = originalName.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64)
      if (!name || tools.has(name)) throw new RuntimeError('INVALID_TOOL', 'Ferramenta sem nome único ou com nome inválido.')
      const parameters = clone(candidate.parameters ?? candidate.input_schema ?? { type: 'object', properties: {}, additionalProperties: false })
      if ((parameters.type ?? 'object') !== 'object') throw new RuntimeError('TOOL_SCHEMA_UNSUPPORTED', 'Argumentos da ferramenta devem usar um schema de objeto.')
      parameters.type ??= 'object'
      validateToolSchema(parameters)
      tools.set(name, { definition: { type: 'function', function: { name, description: String(candidate.description ?? '').slice(0, 1000), parameters } }, run, parameters })
    }
    const registerMcp = async (toolStep, toolConfig) => {
      const connection = await lookupConnection(toolStep)
      const client = new McpClient(toolConfig, connection, { signal: effectiveSignal, fetchImpl: options.fetchImpl })
      mcpClients.push(client)
      for (const tool of selectMcpTools(await client.listTools(), toolConfig)) register({ name: 'mcp_' + toolStep.id + '_' + tool.name, description: tool.description, parameters: tool.inputSchema }, args => client.callTool(tool.name, args))
    }
    try {
      const configuredTools = raw.tools == null ? [] : typeof raw.tools === 'string' ? jsonValue(raw.tools, 'Ferramentas') : raw.tools
      if (!Array.isArray(configuredTools) || configuredTools.length > 64) throw new RuntimeError('INVALID_CONFIG', 'O agente aceita até 64 definições de ferramentas.')
      for (const tool of configuredTools) {
        if (!tool || typeof tool !== 'object') throw new RuntimeError('INVALID_TOOL', 'Definição de ferramenta inválida.')
        if (tool.type === 'mcp' || tool.app === 'mcp_client') {
          await registerMcp({ ...tool, id: tool.id ?? tool.name, config: tool.config ?? tool }, resolveValue(tool.config ?? tool, ctx))
        } else {
          register(tool.function ?? tool, async args => {
            const request = resolveValue(tool.request ?? tool.config?.request ?? {}, { ...ctx, AI: args })
            if (!request.url && !request.path) throw new RuntimeError('INVALID_TOOL', 'Ferramenta HTTP precisa de URL ou path configurado.')
            const toolConnection = await lookupConnection({ connection_id: tool.connection_id })
            return executeConnector({ app: 'http_tool' }, request, toolConnection, { signal: effectiveSignal, maxResponseBytes: options.maxResponseBytes, fetchImpl: options.fetchImpl })
          })
        }
      }
      for (const edge of agentEdges.filter(toolSlot)) {
        const toolNode = nodes.get(edge.target)
        if (toolNode.app === 'mcp_client') { await registerMcp(toolNode, resolveValue(toolNode.config ?? {}, ctx)); continue }
        const declared = toolNode.parameters ?? toolNode.input_schema ?? toolNode.config?.input_schema
        const variables = toolNode.ai_variables ?? toolNode.config?.AI_VARIABLES ?? []
        const parameters = declared ?? { type: 'object', properties: Object.fromEntries(variables.map(v => [v.name, { type: 'string', description: v.description ?? '' }])), additionalProperties: variables.length > 0 ? false : true }
        register({ name: toolNode.tool_name ?? 'node_' + toolNode.id, description: toolNode.child_description ?? toolNode.description ?? toolNode.action ?? toolNode.app, parameters }, async args => {
          const nextTargets = new Set(agentEdges.filter(edge => !AGENT_SLOTS.has(edgeHandle(edge))).map(edge => edge.target))
          const selected = new Set()
          const select = id => { if (selected.has(id) || nextTargets.has(id)) return; selected.add(id); for (const edge of outgoing.get(id) ?? []) select(edge.target) }
          select(toolNode.id)
          const entryId = 'tool-input-' + step.id + '-' + toolNode.id
          const childResult = await executeGraph({
            flux: { steps: [{ id: entryId, app: 'webhook' }, ...snapshot.steps.filter(node => selected.has(node.id))], edges: [{ source: entryId, target: toolNode.id }, ...snapshot.edges.filter(edge => selected.has(edge.source) && selected.has(edge.target))] },
            input: ctx.IN, getConnection, connections, signal: effectiveSignal, executionId,
            options: { ...options, context: { ...clone(ctx), AI: args }, agentDepth: depth + 1, agentMemorySessions: [...(options.agentMemorySessions ?? []), ...(sessionId ? [String(sessionId)] : [])], onResponse: undefined },
            onEvent: event => event.type.startsWith('node:') ? emit({ ...event, tool_of: step.id }, event.context) : undefined,
          })
          logs.push(...childResult.steps.map(record => ({ ...record, tool_of: step.id })))
          operations += childResult.operations
          if (childResult.status !== 'success') throw new RuntimeError('AGENT_TOOL_ERROR', childResult.error?.message ?? 'Falha no subgrafo da ferramenta.', { error: childResult.error })
          return childResult.response?.body ?? childResult.output
        })
      }
      if (tools.size > 64) throw new RuntimeError('AGENT_TOOL_LIMIT', 'O agente excedeu 64 ferramentas disponíveis.')
      if (tools.size && (provider.includes('anthropic') || provider.includes('claude'))) throw new RuntimeError('AGENT_PROVIDER_UNSUPPORTED', 'Ferramentas de agente são suportadas pelo protocolo OpenAI; use outro provedor sem ferramentas ou um endpoint compatível.')
      let last
      for (let round = 0; round <= maximumRounds; round++) {
        assertNotAborted(effectiveSignal)
        last = await executeConnector({ ...step, app: 'ai_agent' }, { ...config, messages: history }, connection, { signal: effectiveSignal, maxResponseBytes: options.maxResponseBytes, fetchImpl: options.fetchImpl, tools: [...tools.values()].map(tool => tool.definition) })
        if (!last.tool_calls?.length) {
          history.push({ role: 'assistant', content: last.response })
          if (sessionId) await options.memory.save(String(sessionId), history)
          return { ...last, tool_rounds: round, tool_history: toolHistory, ...(sessionId && { session_id: String(sessionId) }) }
        }
        if (round === maximumRounds || toolHistory.length + last.tool_calls.length > 64) throw new RuntimeError('AGENT_TOOL_LIMIT', 'O agente atingiu o limite de interações com ferramentas.')
        history.push(last.assistant_message)
        for (const call of last.tool_calls) {
          if (call.type !== 'function' || typeof call.id !== 'string') throw new RuntimeError('AGENT_PROTOCOL_ERROR', 'Chamada de ferramenta inválida retornada pelo modelo.')
          const tool = tools.get(call.function?.name)
          if (!tool) throw new RuntimeError('AGENT_TOOL_NOT_ALLOWED', 'O modelo solicitou uma ferramenta que não foi disponibilizada.')
          let args
          try { args = JSON.parse(call.function.arguments || '{}') } catch { throw new RuntimeError('TOOL_ARGUMENTS_INVALID', 'Argumentos da ferramenta não contêm JSON válido.') }
          validateToolArguments(args, tool.parameters)
          await emit({ type: 'agent:tool:start', nodeId: step.id, toolName: call.function.name, arguments: safe(args), round }, ctx)
          const value = await tool.run(args)
          const text = JSON.stringify(safe(value) ?? null)
          if (text.length > 262144) throw new RuntimeError('AGENT_TOOL_OUTPUT_LIMIT', 'Saída da ferramenta excedeu 256 KB.')
          const record = { name: call.function.name, arguments: safe(args), output: safe(value), round }
          toolHistory.push(record)
          await emit({ type: 'agent:tool:finish', nodeId: step.id, ...record }, ctx)
          history.push({ role: 'tool', tool_call_id: call.id, content: text })
        }
      }
      throw new RuntimeError('AGENT_TOOL_LIMIT', 'O agente atingiu o limite de interações.')
    } finally { await Promise.allSettled(mcpClients.map(client => client.close())) }
  }

  async function runPath(startId, ctx, { stopAt = new Set(), visited = new Set(), iteration = [], previous = ctx.IN } = {}) {
    let id = startId
    let output = previous
    while (id && !stopAt.has(id) && !returned) {
      assertNotAborted(effectiveSignal)
      if (visited.has(id)) return output
      visited.add(id)
      if (++visits > maxVisits) throw new RuntimeError('EXECUTION_LIMIT', `Execução excedeu ${maxVisits} ocorrências de nós.`)
      const step = nodes.get(id)
      const edges = (outgoing.get(id) || []).filter(edge => step?.app !== 'ai_agent' || !AGENT_SLOTS.has(edgeHandle(edge)))
      if (!step) throw new RuntimeError('NODE_NOT_FOUND', `Nó não encontrado: ${id}`)
      if (step.disabled === true) {
        const skipped = { id, app: step.app, action: step.action ?? step.app, status: 'skipped', input: safe(output), output: null, ms: 0, iteration, occurrence_id: `${id}:${iteration.join('.')}:${visits}` }
        logs.push(skipped)
        await emit({ type: 'node:finish', nodeId: id, status: 'skipped', step: skipped }, ctx)
        id = edges[0]?.target
        continue
      }
      const started = performance.now()
      const log = { id, app: step.app, action: step.action ?? step.app, status: 'running', input: null, output: null, ms: 0, iteration, started_at: new Date().toISOString(), occurrence_id: `${id}:${iteration.join('.')}:${visits}` }
      logs.push(log)
      await emit({ type: 'node:start', nodeId: id, status: 'running', step: safe(log) }, ctx)
      let outcome
      try {
        log.input = safe(TRIGGERS.has(step.app) ? ctx.IN : resolveValue(step.config ?? {}, ctx))
        if (isLoop(step)) {
          const config = resolveValue(step.config ?? {}, ctx)
          const iterationLimit = Math.min(maxIterations, Math.max(1, Number(config.max_iterations ?? maxIterations)))
          if (!Number.isFinite(iterationLimit)) throw new RuntimeError('INVALID_CONFIG', 'Limite de iterações inválido.')
          let entries
          if (step.app === 'for_each' || step.app === 'foreach') {
            let iterable = config.iterable ?? config.ITERABLE
            if (typeof iterable === 'string') iterable = iterable.startsWith('$') ? evaluateExpression(iterable, ctx) : jsonValue(iterable, 'Iterável')
            if (iterable == null || typeof iterable !== 'object') throw new RuntimeError('INVALID_ITERABLE', 'For Each precisa de um array ou objeto.')
            entries = Object.entries(iterable)
          } else if (step.app === 'for') {
            const from = Number(config.from ?? 0), to = Number(config.to ?? 0), increment = Number(config.step ?? 1)
            if (![from, to, increment].every(Number.isFinite) || increment === 0) throw new RuntimeError('INVALID_RANGE', 'Intervalo do For inválido.')
            entries = []
            for (let value = from; increment > 0 ? value <= to : value >= to; value += increment) { if (entries.length >= iterationLimit) throw new RuntimeError('LOOP_LIMIT', 'For excedeu o limite de iterações.'); entries.push([String(entries.length), value]) }
          }
          if (entries?.length > iterationLimit) throw new RuntimeError('LOOP_LIMIT', `Loop excedeu ${iterationLimit} iterações.`)
          const bodyEdge = edges.find((edge) => BODY_HANDLES.has(edgeHandle(edge)))
          const doneEdges = edges.filter((edge) => edge !== bodyEdge)
          const doneTargets = new Set([...stopAt, ...doneEdges.map((edge) => edge.target)])
          const results = []
          let counter = 0
          let item
          while (step.app === 'while' ? evaluateCondition(step.config ?? {}, ctx) : counter < entries.length) {
            assertNotAborted(effectiveSignal)
            if (counter >= iterationLimit) throw new RuntimeError('LOOP_LIMIT', `While excedeu ${iterationLimit} iterações.`)
            const [key, value] = step.app === 'while' ? [String(counter), counter] : entries[counter]
            item = value
            const childContext = clone(ctx)
            childContext[id] = { iterable: value, key, index: counter, result: results }
            const childOutput = bodyEdge ? await runPath(bodyEdge.target, childContext, { stopAt: doneTargets, visited: new Set(), iteration: [...iteration, counter], previous: childContext[id] }) : value
            results.push(clone(childOutput))
            Object.assign(ctx, childContext)
            counter++
            if (returned) break
          }
          outcome = { output: { result: results, iterable: item ?? null, iterations: counter } }
        } else outcome = await perform(step, ctx, output)
        output = normalizeOutput(outcome.output)
        if (Buffer.byteLength(JSON.stringify(output)) > 256 * 1024) throw new RuntimeError('OUTPUT_LIMIT', 'A saída deste módulo excede 256 KB. Reduza os dados retornados pela API.')
        if (Buffer.byteLength(JSON.stringify({ ...ctx, [id]: output })) > 512 * 1024) throw new RuntimeError('CONTEXT_LIMIT', 'O contexto do fluxo excede 512 KB. Reduza os dados guardados pelos módulos.')
        if (Buffer.byteLength(JSON.stringify(logs)) > 1024 * 1024) throw new RuntimeError('LOG_LIMIT', 'O histórico desta execução excede 1 MB. Reduza o número de iterações ou os dados registrados.')
        ctx[id] = clone(output)
        if (TRIGGERS.has(step.app)) ctx.IN = ctx[id]
        log.status = outcome.matched === false && step.app === 'filter' ? 'filtered' : 'success'
        log.output = safe(output)
        if (outcome.console) log.console = safe(outcome.console)
        if (!TRIGGERS.has(step.app)) operations++
        lastOutput = output
      } catch (error) {
        log.status = effectiveSignal.aborted ? 'cancelled' : 'error'
        log.error = publicError(error, secrets)
        if (error.details?.response) log.output = safe(error.details.response)
        ctx[id] = { error: log.error }
        if (step.is_fatal !== false && step.config?.continue_on_error !== true && step.config?.error_interrupts_flow !== false) {
          log.ms = Math.round(performance.now() - started)
          log.finished_at = new Date().toISOString()
          await emit({ type: 'node:finish', nodeId: id, status: log.status, step: safe(log) }, ctx)
          throw error
        }
        outcome = { output: { error: log.error } }
        output = outcome.output
        if (log.output == null) log.output = safe(output)
        lastOutput = output
      }
      log.ms = Math.round(performance.now() - started)
      log.finished_at = new Date().toISOString()
      await emit({ type: 'node:finish', nodeId: id, status: log.status, step: safe(log) }, ctx)
      if (returned) break
      if (isLoop(step)) {
        const next = edges.filter((edge) => !BODY_HANDLES.has(edgeHandle(edge)))
        if (next.length > 1) throw new RuntimeError('MULTIPLE_LOOP_EXITS', 'O loop precisa de uma única saída de continuação.')
        id = next[0]?.target
      } else if (step.app === 'filter' || step.app === 'if') {
        const matched = outcome.matched
        const named = edges.filter((edge) => ['true', 'yes', 'success', 'false', 'no', 'else'].includes(edgeHandle(edge)))
        if (named.length) id = named.find((edge) => matched ? ['true', 'yes', 'success'].includes(edgeHandle(edge)) : ['false', 'no', 'else'].includes(edgeHandle(edge)))?.target
        else id = matched ? edges[0]?.target : null
      } else if (edges.length > 1) {
        // Original docs leave temporal parallelism ambiguous. Ordered isolated
        // branches give deterministic behavior and no sibling data leakage.
        for (const edge of edges) {
          if (returned) break
          await runPath(edge.target, clone(ctx), { stopAt, visited, iteration, previous: output })
        }
        id = null
      } else id = edges[0]?.target
    }
    return output
  }

  let status = 'success'
  let error
  try { await runPath(snapshot.startId, context) }
  catch (failure) {
    status = effectiveSignal.aborted && !timedOut ? 'cancelled' : 'error'
    error = timedOut ? { code: 'EXECUTION_TIMEOUT', message: `Execução excedeu ${limitMs} ms.` } : publicError(failure, secrets)
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', externalAbort) }
  const result = { status, steps: safe(logs), output: safe(lastOutput), ...(response && { response: safe(response) }), duration_ms: Math.round(performance.now() - startTime), operations, context: safe(context), ...(error && { error }), warnings: validation.warnings }
  await emit({ type: 'execution:finish', status, result: safe({ ...result, response: undefined }) })
  return result
}

export async function executeSingleStep({ step, input = {}, context = {}, ...options }) {
  const entryId = step.id === 'runtime-input' ? 'runtime-input-trigger' : 'runtime-input'
  return executeGraph({ ...options, input, flux: { steps: [{ id: entryId, app: 'webhook' }, step], edges: [{ source: entryId, target: String(step.id) }] }, options: { ...options.options, context } })
}
