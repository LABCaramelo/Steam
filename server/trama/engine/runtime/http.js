import { RuntimeError, assertNotAborted, abortError } from './errors.js'
import { publicFetch } from './network.js'

function dictionary(value, label) {
  if (value == null || value === '') return {}
  if (typeof value === 'string') {
    try { value = JSON.parse(value) } catch { throw new RuntimeError('INVALID_CONFIG', `${label} deve ser um objeto JSON válido.`) }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RuntimeError('INVALID_CONFIG', `${label} deve ser um objeto JSON.`)
  return value
}

export async function httpRequest(config, { signal, maxResponseBytes = 2 * 1024 * 1024, fetchImpl = publicFetch } = {}) {
  assertNotAborted(signal)
  let url
  try { url = new URL(config.url ?? config.URI ?? config.base_url) } catch { throw new RuntimeError('INVALID_URL', 'Informe uma URL HTTP ou HTTPS válida.') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new RuntimeError('INVALID_URL', 'A URL deve usar HTTP/HTTPS e não pode conter credenciais embutidas.')
  const query = dictionary(config.query ?? config.QUERY, 'Query parameters')
  for (const [key, value] of Object.entries(query)) if (value != null) {
    if (Array.isArray(value)) for (const item of value) url.searchParams.append(key, String(item))
    else url.searchParams.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
  }
  const method = String(config.method ?? config.http_method ?? config.METHOD ?? 'GET').toUpperCase()
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(method)) throw new RuntimeError('INVALID_METHOD', `Método HTTP inválido: ${method}`)
  const headers = new Headers()
  for (const [key, value] of Object.entries(dictionary(config.headers ?? config.HEADERS, 'Headers'))) if (value != null) headers.set(key, String(value))
  const cookies = dictionary(config.cookies ?? config.COOKIES, 'Cookies')
  if (Object.keys(cookies).length) headers.set('cookie', Object.entries(cookies).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('; '))
  let body = config.body ?? config.BODY
  if (body !== undefined && body !== null && !['GET', 'HEAD'].includes(method)) {
    if (typeof body === 'object') {
      if (config.content_type === 'application/x-www-form-urlencoded') body = new URLSearchParams(Object.entries(body).map(([key, value]) => [key, String(value)]))
      else { body = JSON.stringify(body); if (!headers.has('content-type')) headers.set('content-type', 'application/json') }
    }
    if (config.content_type && !headers.has('content-type')) headers.set('content-type', config.content_type)
  } else body = undefined
  const timeout = Math.min(30000, Math.max(50, Number(config.timeout ?? config.timeout_ms ?? 30000)))
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(abort, Number.isFinite(timeout) ? timeout : 30000)
  try {
    const response = await fetchImpl(url, { method, headers, body, signal: controller.signal, redirect: config.follow_redirects === false ? 'manual' : 'follow' })
    if (Number(response.headers.get('content-length')) > maxResponseBytes) { await response.body?.cancel(); throw new RuntimeError('RESPONSE_LIMIT', 'Resposta HTTP excede o limite de tamanho.') }
    const reader = response.body?.getReader()
    const chunks = []
    let bytes = 0
    if (reader) {
      try {
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          bytes += value.byteLength
          if (bytes > maxResponseBytes) { await reader.cancel(); throw new RuntimeError('RESPONSE_LIMIT', 'Resposta HTTP excede o limite de tamanho.') }
          chunks.push(value)
        }
      } finally { reader.releaseLock() }
    }
    const buffer = Buffer.concat(chunks)
    const contentType = response.headers.get('content-type') ?? ''
    let responseBody
    if (/json|javascript|^text\/|xml|x-www-form-urlencoded/i.test(contentType) || !contentType) {
      const text = buffer.toString('utf8')
      if (/json/i.test(contentType) && text) { try { responseBody = JSON.parse(text) } catch { responseBody = text } }
      else responseBody = text
    } else responseBody = { encoding: 'base64', content_type: contentType, bytes, data: buffer.toString('base64') }
    const output = { body: responseBody, code: response.status, status_code: response.status, headers: Object.fromEntries(response.headers), ok: response.ok }
    if (!response.ok && config.throw_on_error !== false && config.continue_on_http_error !== true) throw new RuntimeError('HTTP_ERROR', `A requisição retornou HTTP ${response.status}.`, { status: response.status, response: output })
    return output
  } catch (error) {
    if (signal?.aborted) throw abortError()
    if (controller.signal.aborted) throw new RuntimeError('HTTP_TIMEOUT', `A requisição excedeu ${timeout} ms.`)
    if (error instanceof RuntimeError) throw error
    throw new RuntimeError('HTTP_NETWORK_ERROR', `Falha na requisição HTTP: ${error.message}`)
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort) }
}

export { dictionary as parseDictionary }
