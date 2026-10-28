import { httpRequest, parseDictionary } from '../runtime/http.js'
import { RuntimeError } from '../runtime/errors.js'
import { executeDeclaredRequest } from '../runtime/declarative.js'
import { credentialsOf, tokenOf, genericConfig } from './generic.js'

const first = (...values) => values.find((value) => value !== undefined && value !== null && value !== '')
const truthy = (value) => value === true || ['true', 'sim', 'yes', '1'].includes(String(value).toLowerCase())
const requireValue = (value, label) => { if (value == null || value === '') throw new RuntimeError('MISSING_CONFIG', `${label} não configurado.`); return value }
const parseJSON = (value, label) => typeof value === 'string' ? (() => { try { return JSON.parse(value) } catch { throw new RuntimeError('INVALID_CONFIG', `${label} deve conter JSON válido.`) } })() : value
const base = (value) => String(requireValue(value, 'URL da conexão')).replace(/\/+$/, '')
const urlJoin = (url, path) => `${base(url)}/${String(path).replace(/^\/+/, '')}`

async function supabase(step, config, credentials, options) {
  const table = requireValue(first(config.table, config.TABLE), 'Tabela')
  if (!/^[\p{L}\p{N}_-]+$/u.test(String(table))) throw new RuntimeError('INVALID_CONFIG', 'Nome da tabela inválido.')
  const key = requireValue(tokenOf(credentials), 'Chave da conexão Supabase')
  const root = base(first(credentials.url, credentials.project_url, credentials.base_url, config.base_url))
  const headers = { apikey: key, ...parseDictionary(config.headers, 'Headers') }
  const userToken = first(credentials.access_token, credentials.accessToken)
  // Opaque sb_ API keys belong in apikey. A user JWT is an independent credential.
  if (userToken || String(key).startsWith('eyJ')) headers.Authorization = `Bearer ${userToken || key}`
  const operation = String(first(config.operation, 'upsert')).toLowerCase()
  const methods = { select: 'GET', get: 'GET', insert: 'POST', upsert: 'POST', update: 'PATCH', delete: 'DELETE' }
  if (!methods[operation]) throw new RuntimeError('UNSUPPORTED_OPERATION', `Operação Supabase não implementada: ${operation}`)
  const legacyFilter = typeof config.filter === 'string' ? Object.fromEntries(new URLSearchParams(config.filter)) : config.filter
  const query = { ...parseDictionary(config.query ?? config.filters ?? legacyFilter, 'Filtros') }
  if (['update', 'delete'].includes(operation) && !Object.keys(query).length && config.allow_all_rows !== true) throw new RuntimeError('FILTER_REQUIRED', 'Informe um filtro para atualizar ou excluir registros.')
  if (config.select) query.select = config.select
  if (config.on_conflict) query.on_conflict = config.on_conflict
  if (config.limit != null) query.limit = config.limit
  if (config.schema) headers[['GET', 'HEAD'].includes(methods[operation]) ? 'Accept-Profile' : 'Content-Profile'] = config.schema
  const preference = []
  if (operation === 'upsert') preference.push('resolution=merge-duplicates')
  if (!['GET', 'HEAD'].includes(methods[operation])) preference.push(config.return_minimal ? 'return=minimal' : 'return=representation')
  if (preference.length) headers.Prefer = preference.join(',')
  const body = ['insert', 'upsert', 'update'].includes(operation) ? parseJSON(requireValue(first(config.values, config.body, config.row_values), 'Valores JSON'), 'Valores') : undefined
  return httpRequest({ ...config, url: urlJoin(root, `rest/v1/${encodeURIComponent(table)}`), method: methods[operation], headers, query, body }, options)
}

async function uazapi(step, config, credentials, options) {
  const token = requireValue(tokenOf(credentials), 'Token Uazapi')
  const root = base(first(credentials.url, credentials.base_url, credentials.server_url, config.base_url))
  const body = {
    number: String(requireValue(first(config.phone, config.number, config.NUMBER), 'Número do contato')),
    text: String(requireValue(first(config.text, config.message, config.TEXT), 'Texto')),
    readchat: truthy(first(config.read, config.readchat, true)),
  }
  for (const key of ['delay', 'readmessages', 'replyid', 'mentions', 'forward', 'track_source', 'track_id', 'linkPreview']) if (config[key] != null) body[key] = config[key]
  return httpRequest({ ...config, url: urlJoin(root, 'send/text'), method: 'POST', headers: { token, ...parseDictionary(config.headers, 'Headers') }, body }, options)
}

async function telegram(step, config, credentials, options) {
  const token = requireValue(tokenOf(credentials), 'Token do Telegram')
  const operation = String(first(config.operation, 'sendMessage'))
  if (!['sendMessage', 'getMe', 'getUpdates', 'sendPhoto', 'sendDocument', 'sendAudio', 'sendVoice'].includes(operation)) throw new RuntimeError('UNSUPPORTED_OPERATION', `Método Telegram não configurado: ${operation}`)
  const body = { ...parseDictionary(config.body, 'Corpo') }
  if (operation === 'sendMessage') {
    body.chat_id = requireValue(first(config.chat_id, config.phone, body.chat_id), 'Chat ID')
    body.text = String(requireValue(first(config.text, config.message, body.text), 'Mensagem'))
    if (config.parse_mode) body.parse_mode = config.parse_mode
  }
  const result = await httpRequest({ ...config, url: urlJoin(first(credentials.base_url, 'https://api.telegram.org'), `bot${token}/${operation}`), method: 'POST', body }, options)
  if (result.body?.ok === false) throw new RuntimeError('PROVIDER_ERROR', result.body.description || 'Telegram recusou a operação.', { response: result })
  return result
}

async function languageModel(step, config, credentials, options) {
  const key = requireValue(tokenOf(credentials), 'Chave da conexão de IA')
  const model = requireValue(first(config.model, config.AI_MODEL, credentials.model), 'Modelo de IA')
  const provider = String(first(config.provider, config.AI_PROVIDER, credentials.provider, step.app === 'anthropic' || step.app === 'claude' ? 'anthropic' : 'openai')).toLowerCase()
  const system = first(config.system_prompt, config.SYSTEM_PROMPT, '')
  const prompt = first(config.user_prompt, config.HUMAN_MESSAGE, config.prompt, config.message)
  const messages = config.messages ? parseJSON(config.messages, 'Mensagens') : [{ role: 'user', content: String(requireValue(prompt, 'Mensagem do usuário')) }]
  if (!Array.isArray(messages) || !messages.length) throw new RuntimeError('INVALID_CONFIG', 'Informe uma lista de mensagens válida.')
  if (provider.includes('anthropic') || provider.includes('claude')) {
    const workspace = first(config.workspace_id, credentials.workspace_id)
    const response = await httpRequest({ ...config, url: urlJoin(first(credentials.base_url, credentials.url, 'https://api.anthropic.com'), 'v1/messages'), method: 'POST', headers: { Authorization: `Bearer ${key}`, 'anthropic-version': first(config.api_version, credentials.api_version, '2023-06-01'), ...(workspace && { 'anthropic-workspace-id': workspace }) }, body: { model, max_tokens: Number(config.max_tokens || 1024), ...(system && { system }), messages } }, options)
    const text = response.body?.content?.filter((item) => item.type === 'text').map((item) => item.text).join('\n')
    if (typeof text !== 'string') throw new RuntimeError('PROVIDER_RESPONSE_ERROR', 'O provedor não retornou texto.', { response })
    return { ...response, response: text, result: text, usage: response.body?.usage }
  }
  const history = [...(system ? [{ role: 'system', content: system }] : []), ...messages]
  const response = await httpRequest({ ...config, url: urlJoin(first(credentials.base_url, credentials.url, 'https://api.openai.com/v1'), 'chat/completions'), method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: { model, messages: history, ...(config.temperature != null && { temperature: Number(config.temperature) }), ...(config.max_tokens != null && { max_completion_tokens: Number(config.max_tokens) }), ...(config.response_format && { response_format: parseJSON(config.response_format, 'Formato de resposta') }), ...(options.tools?.length && { tools: options.tools }) } }, options)
  const message = response.body?.choices?.[0]?.message
  if (message?.tool_calls?.length) return { ...response, response: message.content || '', result: message.content || '', tool_calls: message.tool_calls, assistant_message: message, usage: response.body?.usage }
  if (typeof message?.content !== 'string') throw new RuntimeError('PROVIDER_RESPONSE_ERROR', 'O provedor não retornou conteúdo de mensagem.', { response })
  return { ...response, response: message.content, result: message.content, usage: response.body?.usage }
}

async function google(step, config, credentials, options) {
  const token = requireValue(first(credentials.access_token, credentials.token, credentials.api_key), 'Access token Google')
  const headers = { Authorization: `Bearer ${token}`, ...parseDictionary(config.headers, 'Headers') }
  if (config.url) return httpRequest({ ...config, headers }, options)
  if (step.app === 'sheets' || step.app === 'google_sheets') {
    const spreadsheet = requireValue(first(config.spreadsheet_id, config.sheet), 'ID da planilha')
    const range = first(config.range, config.tab, 'Sheet1')
    const operation = String(first(config.operation, 'append')).toLowerCase()
    const root = first(credentials.base_url, 'https://sheets.googleapis.com/v4')
    const path = `spreadsheets/${encodeURIComponent(spreadsheet)}/values/${encodeURIComponent(range)}`
    if (['get', 'list', 'read'].includes(operation)) return httpRequest({ ...config, url: urlJoin(root, path), method: 'GET', headers }, options)
    let values = first(config.values, config.row_values)
    if (typeof values === 'string') { try { values = JSON.parse(values) } catch { values = [values.split(',')] } }
    if (!Array.isArray(values)) throw new RuntimeError('INVALID_CONFIG', 'Valores da planilha devem ser um array de linhas.')
    if (!Array.isArray(values[0])) values = [values]
    if (!['append', 'update'].includes(operation)) throw new RuntimeError('UNSUPPORTED_OPERATION', `Operação de planilha não implementada: ${operation}`)
    return httpRequest({ ...config, url: urlJoin(root, path + (operation === 'append' ? ':append' : '')), method: operation === 'append' ? 'POST' : 'PUT', headers, query: { valueInputOption: config.value_input_option || 'USER_ENTERED' }, body: { values } }, options)
  }
  if (['calendar', 'google_calendar'].includes(step.app)) {
    const calendar = encodeURIComponent(first(config.calendar_id, 'primary'))
    const operation = String(first(config.operation, 'list')).toLowerCase()
    return httpRequest({ ...config, url: urlJoin(first(credentials.base_url, 'https://www.googleapis.com/calendar/v3'), `calendars/${calendar}/events${config.event_id ? '/' + encodeURIComponent(config.event_id) : ''}`), method: ({ list: 'GET', get: 'GET', create: 'POST', update: 'PATCH', delete: 'DELETE' })[operation] || 'GET', headers, body: config.body, query: config.query }, options)
  }
  throw new RuntimeError('MISSING_CONFIG', 'Configure uma URL de operação para este aplicativo Google.')
}

export async function executeConnector(step, config, connection, options = {}) {
  if (step.definition) return executeDeclaredRequest(step.definition, config, connection, options)
  const credentials = credentialsOf(connection)
  const app = String(step.app).toLowerCase()
  if (['supabase', 'database', 'supabase_rest'].includes(app)) return supabase(step, config, credentials, options)
  if (['uazapi', 'whatsapp'].includes(app)) return uazapi(step, config, credentials, options)
  if (['telegram', 'telegram_bot'].includes(app)) return telegram(step, config, credentials, options)
  if (['chatgpt', 'openai', 'ai_agent', 'anthropic', 'claude', 'deepseek'].includes(app)) return languageModel(step, config, credentials, options)
  if (['sheets', 'google_sheets', 'calendar', 'google_calendar', 'gmail', 'google_drive', 'google'].includes(app)) return google(step, config, credentials, options)
  const request = config.request ? parseJSON(config.request, 'Requisição do aplicativo') : config
  if (request.url || request.path && first(credentials.base_url, credentials.url)) return httpRequest(genericConfig(request, credentials), options)
  throw new RuntimeError('CONNECTOR_NOT_CONFIGURED', `O aplicativo ${step.app} precisa de uma definição HTTP ou de um conector configurado. Nenhuma requisição foi enviada.`)
}

export async function verifyConnectorConnection(connection, options = {}) {
  const credentials = credentialsOf(connection)
  const app = String(connection.app || '').toLowerCase()
  if (credentials.verify_url) return httpRequest(genericConfig({ url: credentials.verify_url, method: 'GET' }, credentials), options)
  if (['supabase', 'database', 'supabase_rest'].includes(app)) {
    const key = requireValue(tokenOf(credentials), 'Chave Supabase')
    return httpRequest({ url: urlJoin(first(credentials.url, credentials.project_url, credentials.base_url), 'rest/v1/'), method: 'GET', headers: { apikey: key, ...(String(key).startsWith('eyJ') && { Authorization: `Bearer ${key}` }) } }, options)
  }
  if (['telegram', 'telegram_bot'].includes(app)) return telegram({ app }, { operation: 'getMe' }, credentials, options)
  if (['chatgpt', 'openai'].includes(app)) return httpRequest({ url: urlJoin(first(credentials.base_url, credentials.url, 'https://api.openai.com/v1'), 'models'), headers: { Authorization: `Bearer ${requireValue(tokenOf(credentials), 'Chave de IA')}` } }, options)
  throw new RuntimeError('VERIFICATION_NOT_CONFIGURED', 'Esta conexão precisa de verify_url para uma verificação real. As credenciais foram armazenadas, mas ainda não foram verificadas.')
}

export { credentialsOf, tokenOf }
