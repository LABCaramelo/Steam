import { RuntimeError, assertNotAborted, abortError } from '../runtime/errors.js'
import { publicFetch } from '../runtime/network.js'

const MAX_BYTES = 1024 * 1024
const first = (...values) => values.find(value => value !== undefined && value !== null && value !== '')
const credentialsOf = connection => connection?.credentials ?? connection?.secret ?? {}

// Streamable HTTP only. Discovery performs initialize/list and never tools/call.
export class McpClient {
  constructor(config, connection, { signal, fetchImpl = publicFetch } = {}) {
    const credentials = credentialsOf(connection)
    const transport = String(first(config.transport, 'http')).toLowerCase()
    if (!['http', 'streamable-http', 'streamable_http'].includes(transport)) throw new RuntimeError('MCP_TRANSPORT_UNSUPPORTED', 'Este cliente MCP aceita apenas Streamable HTTP.')
    try { this.url = new URL(first(config.server_url, config.MCP_SERVER_URL, config.url, credentials.server_url, credentials.base_url, credentials.url)) }
    catch { throw new RuntimeError('MCP_INVALID_URL', 'Informe a URL HTTP do servidor MCP.') }
    if (!['http:', 'https:'].includes(this.url.protocol) || this.url.username || this.url.password) throw new RuntimeError('MCP_INVALID_URL', 'URL MCP inválida ou com credenciais embutidas.')
    this.headers = new Headers({ accept: 'application/json, text/event-stream', 'content-type': 'application/json' })
    const custom = typeof credentials.headers === 'string' ? (() => { try { return JSON.parse(credentials.headers) } catch { throw new RuntimeError('INVALID_CONFIG', 'Headers MCP devem conter JSON válido.') } })() : credentials.headers ?? {}
    for (const [key, value] of Object.entries(custom)) this.headers.set(key, String(value))
    const token = first(credentials.token, credentials.access_token, credentials.api_key, credentials.apiKey, credentials.key)
    const authType = first(config.auth_type, config.MCP_AUTH_TYPE, credentials.auth_type, 'bearer')
    if (token && !this.headers.has('authorization')) {
      if (authType === 'api_key') this.headers.set(credentials.header_name || 'x-api-key', token)
      else this.headers.set('authorization', 'Bearer ' + token)
    }
    if (authType === 'basic') this.headers.set('authorization', 'Basic ' + Buffer.from(String(credentials.username || '') + ':' + String(credentials.password || '')).toString('base64'))
    this.signal = signal
    this.fetch = fetchImpl
    this.timeoutMs = Math.max(50, Math.min(120000, Number(config.timeout_ms ?? config.timeout ?? 30000)))
    this.requestedVersion = config.protocol_version || '2025-11-25'
    this.sequence = 0
    this.sessionId = null
    this.initialized = false
  }
  async request(method, params = {}, notification = false) {
    assertNotAborted(this.signal)
    const id = notification ? undefined : ++this.sequence
    const controller = new AbortController()
    const abort = () => controller.abort()
    const timer = setTimeout(abort, this.timeoutMs)
    this.signal?.addEventListener('abort', abort, { once: true })
    let response, reader
    try {
      response = await this.fetch(this.url, { method: 'POST', headers: this.headers, body: JSON.stringify({ jsonrpc: '2.0', ...(id !== undefined && { id }), method, params }), signal: controller.signal, redirect: 'error' })
      if (!response.ok) throw new RuntimeError('MCP_HTTP_ERROR', 'Servidor MCP retornou HTTP ' + response.status + '.', { status: response.status })
      const session = response.headers.get('mcp-session-id')
      if (session) { this.sessionId = session; this.headers.set('mcp-session-id', session) }
      if (notification) { await response.body?.cancel(); return null }
      const isSse = (response.headers.get('content-type') || '').includes('text/event-stream')
      if (!isSse && !(response.headers.get('content-type') || '').includes('json')) throw new RuntimeError('MCP_PROTOCOL_ERROR', 'Resposta MCP precisa ser JSON ou event-stream.')
      reader = response.body?.getReader()
      if (!reader) throw new RuntimeError('MCP_PROTOCOL_ERROR', 'Servidor MCP retornou uma resposta vazia.')
      const decoder = new TextDecoder()
      let body = '', bytes = 0
      const decode = message => {
        if (!message || message.jsonrpc !== '2.0' || message.id !== id) return undefined
        if (message.error) throw new RuntimeError('MCP_RPC_ERROR', String(message.error.message || 'Erro JSON-RPC'), { rpc_code: message.error.code })
        if (!Object.hasOwn(message, 'result')) throw new RuntimeError('MCP_PROTOCOL_ERROR', 'Resposta MCP sem result.')
        return { value: message.result }
      }
      for (;;) {
        const { done, value } = await reader.read()
        if (value) {
          bytes += value.byteLength
          if (bytes > MAX_BYTES) throw new RuntimeError('MCP_RESPONSE_LIMIT', 'Resposta MCP excedeu 1 MB.')
          body += decoder.decode(value, { stream: true })
        }
        if (done) body += decoder.decode()
        if (isSse) {
          let separator
          while ((separator = /\r?\n\r?\n/.exec(body))) {
            const event = body.slice(0, separator.index); body = body.slice(separator.index + separator[0].length)
            const data = event.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).replace(/^ /, '')).join('\n')
            if (!data.trim()) continue
            let message
            try { message = JSON.parse(data) } catch { throw new RuntimeError('MCP_PROTOCOL_ERROR', 'Evento MCP não contém JSON válido.') }
            const result = decode(message)
            if (result) { await reader.cancel(); return result.value }
          }
        }
        if (done) break
      }
      if (isSse) throw new RuntimeError('MCP_DISCONNECTED', 'O stream MCP encerrou antes da resposta. A ferramenta não foi repetida automaticamente.')
      let message
      try { message = JSON.parse(body) } catch { throw new RuntimeError('MCP_PROTOCOL_ERROR', 'Servidor MCP não retornou JSON válido.') }
      const result = decode(message)
      if (!result) throw new RuntimeError('MCP_PROTOCOL_ERROR', 'Identificador da resposta MCP não corresponde à requisição.')
      return result.value
    } catch (error) {
      if (this.signal?.aborted) throw abortError()
      if (controller.signal.aborted) throw new RuntimeError('MCP_TIMEOUT', 'Servidor MCP excedeu o timeout configurado.')
      if (error instanceof RuntimeError) throw error
      throw new RuntimeError('MCP_NETWORK_ERROR', 'Falha de comunicação MCP: ' + error.message)
    } finally {
      clearTimeout(timer); this.signal?.removeEventListener('abort', abort)
      try { if (reader) { await reader.cancel(); reader.releaseLock() } } catch {}
      if (!reader) try { await response?.body?.cancel() } catch {}
    }
  }
  async initialize() {
    if (this.initialized) return
    const result = await this.request('initialize', { protocolVersion: this.requestedVersion, capabilities: {}, clientInfo: { name: 'Trama', version: '0.2.0' } })
    if (!result?.protocolVersion || !result.capabilities?.tools) throw new RuntimeError('MCP_CAPABILITY_MISSING', 'Servidor MCP não declarou suporte a ferramentas.')
    this.headers.set('mcp-protocol-version', result.protocolVersion)
    await this.request('notifications/initialized', {}, true)
    this.initialized = true
  }
  async listTools() {
    await this.initialize()
    const tools = [], seen = new Set()
    let cursor
    for (let page = 0; page < 10; page++) {
      const result = await this.request('tools/list', cursor ? { cursor } : {})
      if (!Array.isArray(result?.tools)) throw new RuntimeError('MCP_PROTOCOL_ERROR', 'tools/list não retornou um array de ferramentas.')
      for (const tool of result.tools) {
        if (typeof tool?.name !== 'string' || !tool.inputSchema || typeof tool.inputSchema !== 'object') throw new RuntimeError('MCP_PROTOCOL_ERROR', 'Ferramenta MCP sem nome ou inputSchema.')
        if (seen.has(tool.name)) throw new RuntimeError('MCP_PROTOCOL_ERROR', 'Nome de ferramenta MCP repetido.')
        seen.add(tool.name); tools.push(tool)
        if (tools.length > 200) throw new RuntimeError('MCP_TOOL_LIMIT', 'O catálogo MCP excedeu 200 ferramentas.')
      }
      if (!result.nextCursor) return tools
      if (result.nextCursor === cursor) throw new RuntimeError('MCP_PROTOCOL_ERROR', 'Cursor MCP não avançou.')
      cursor = result.nextCursor
    }
    throw new RuntimeError('MCP_TOOL_LIMIT', 'O catálogo MCP excedeu 10 páginas.')
  }
  async callTool(name, argumentsValue = {}) {
    await this.initialize()
    const result = await this.request('tools/call', { name, arguments: argumentsValue })
    if (result?.isError) throw new RuntimeError('MCP_TOOL_ERROR', 'A ferramenta MCP retornou um erro.', { result })
    return result
  }
  async close() {
    if (!this.sessionId) return
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)
    try { const response = await this.fetch(this.url, { method: 'DELETE', headers: this.headers, signal: controller.signal, redirect: 'error' }); await response.body?.cancel() } catch {}
    finally { clearTimeout(timeout); this.sessionId = null; this.initialized = false }
  }
}

export function selectMcpTools(tools, config = {}) {
  const mode = config.tools_mode ?? config.MCP_TOOLS_MODE ?? 'all'
  if (mode === 'all') return tools
  if (mode !== 'selected') throw new RuntimeError('MCP_INVALID_MODE', 'Modo MCP deve ser all ou selected.')
  let selected = config.selected_tools ?? config.MCP_SELECTED_TOOLS ?? []
  if (typeof selected === 'string') { try { selected = JSON.parse(selected) } catch { selected = selected.split(',').map(value => value.trim()).filter(Boolean) } }
  if (!Array.isArray(selected)) throw new RuntimeError('MCP_INVALID_MODE', 'Ferramentas selecionadas devem ser uma lista.')
  const names = new Set(selected.map(item => typeof item === 'string' ? item : item.name))
  for (const name of names) if (!tools.some(tool => tool.name === name)) throw new RuntimeError('MCP_TOOL_NOT_FOUND', 'Ferramenta MCP selecionada não encontrada: ' + name)
  return tools.filter(tool => names.has(tool.name))
}
