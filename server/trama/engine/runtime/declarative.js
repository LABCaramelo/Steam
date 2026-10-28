import { evaluateExpression } from '../shared/expressions.js'
import { credentialsOf, genericConfig, mergeHeaders } from '../connectors/generic.js'
import { httpRequest } from './http.js'
import { RuntimeError, redact } from './errors.js'

const blocked = new Set(['__proto__', 'prototype', 'constructor'])
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value))
const object = (value, label) => {
  if (!isObject(value)) throw new RuntimeError('INVALID_DECLARATION', `${label} deve ser um objeto JSON.`)
  return value
}
function validateJSON(value, label, depth = 0, seen = new Set()) {
  if (depth > 40) throw new RuntimeError('INVALID_DECLARATION', `${label} excede o limite de profundidade.`)
  if (value === null || ['string', 'boolean'].includes(typeof value) || typeof value === 'number' && Number.isFinite(value)) return
  if ((!isObject(value) && !Array.isArray(value)) || seen.has(value)) throw new RuntimeError('INVALID_DECLARATION', `${label} deve conter somente dados JSON finitos, sem ciclos.`)
  seen.add(value)
  for (const [key, child] of Object.entries(value)) {
    if (blocked.has(key)) throw new RuntimeError('INVALID_DECLARATION', `${label} contém uma propriedade reservada.`)
    validateJSON(child, label, depth + 1, seen)
  }
  seen.delete(value)
}

export function declaredCredentialSecrets(connection) {
  const secrets = []
  const walk = (value, depth = 0) => {
    if (depth > 40) return
    if (typeof value === 'string' && value) {
      secrets.push(value)
      if (/^[\s]*[\[{]/.test(value)) { try { walk(JSON.parse(value), depth + 1) } catch { /* Non-JSON credentials remain protected as exact strings. */ } }
    }
    else if (value && typeof value === 'object') for (const child of Object.values(value)) walk(child, depth + 1)
  }
  const credentials = credentialsOf(connection)
  walk(credentials)
  if (credentials.username && credentials.password) secrets.push(Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64'))
  return secrets
}

function resolveTemplate(value, context, label) {
  if (Array.isArray(value)) return value.map((item, index) => resolveTemplate(item, context, `${label}[${index}]`))
  if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveTemplate(item, context, `${label}.${key}`)]))
  if (typeof value !== 'string') return value
  const template = /\{\{([\s\S]*?)\}\}/g
  const parts = [...value.matchAll(template)]
  const remainder = value.replace(template, '')
  if (remainder.includes('{{') || remainder.includes('}}')) throw new RuntimeError('INVALID_DECLARATION', `Template incompleto em ${label}.`)
  if (!parts.length) return value
  const evaluate = expression => {
    let result
    try { result = evaluateExpression(expression, context) } catch { throw new RuntimeError('DECLARATIVE_TEMPLATE_ERROR', `Expressão de template inválida em ${label}.`) }
    if (result === undefined) throw new RuntimeError('DECLARATIVE_TEMPLATE_MISSING', `Valor de template não encontrado em ${label}.`)
    return result
  }
  if (parts.length === 1 && value.trim() === parts[0][0]) return evaluate(parts[0][1])
  return value.replace(template, (_match, expression) => {
    const result = evaluate(expression)
    return result === null ? '' : typeof result === 'object' ? JSON.stringify(result) : String(result)
  })
}

export function compileDeclaredRequest(definition, params = {}, connection = null, { context = {} } = {}) {
  object(definition, 'Definição do módulo')
  object(params, 'Parâmetros do módulo')
  object(context, 'Contexto do fluxo')
  const credentials = object(credentialsOf(connection), 'Credenciais da conexão')
  const base = definition.base === undefined ? {} : object(definition.base, 'Base do aplicativo')
  const request = object(definition.request, 'Requisição do módulo')
  validateJSON({ base, request, params }, 'Definição e parâmetros')
  const scope = { ...context, PARAMS: params, params, CONNECTION: credentials, connection: credentials }
  const resolvedBase = resolveTemplate(base, scope, 'base')
  const resolvedRequest = resolveTemplate(request, scope, 'request')
  if (resolvedBase.headers !== undefined) object(resolvedBase.headers, 'Headers da base')
  if (resolvedRequest.headers !== undefined) object(resolvedRequest.headers, 'Headers da requisição')
  if (resolvedRequest.query !== undefined) object(resolvedRequest.query, 'Query da requisição')
  if (resolvedRequest.cookies !== undefined) object(resolvedRequest.cookies, 'Cookies da requisição')
  for (const [key, value] of Object.entries({ base_url: resolvedBase.base_url, url: resolvedRequest.url, path: resolvedRequest.path, method: resolvedRequest.method })) {
    if (value !== undefined && typeof value !== 'string') throw new RuntimeError('INVALID_DECLARATION', `${key} deve ser texto.`)
  }
  let url = resolvedRequest.url
  if (!url) {
    const root = resolvedBase.base_url || credentials.base_url || credentials.url
    if (!root) throw new RuntimeError('MISSING_CONFIG', 'URL base do módulo não configurada.')
    if (typeof root !== 'string') throw new RuntimeError('INVALID_DECLARATION', 'URL base deve ser texto.')
    url = `${root.replace(/\/+$/, '')}/${String(resolvedRequest.path ?? '').replace(/^\/+/, '')}`
  }
  const compiled = genericConfig({ ...resolvedRequest, url, headers: mergeHeaders(resolvedBase.headers, resolvedRequest.headers) }, credentials)
  validateJSON(compiled, 'Requisição resolvida')
  return compiled
}

export async function executeDeclaredRequest(definition, params = {}, connection = null, { context = {}, redactResult = true, ...options } = {}) {
  const secrets = declaredCredentialSecrets(connection)
  try {
    const request = compileDeclaredRequest(definition, params, connection, { context })
    const result = await httpRequest(request, options)
    return redactResult ? redact(result, secrets) : result
  } catch (error) {
    if (!redactResult) throw error
    throw new RuntimeError(error.code ?? 'DECLARATIVE_REQUEST_ERROR', redact(error.message || 'Falha na requisição declarativa.', secrets), redact(error.details ?? {}, secrets))
  }
}
