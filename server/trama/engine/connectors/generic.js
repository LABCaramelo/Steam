import { parseDictionary } from '../runtime/http.js'

const first = (...values) => values.find(value => value !== undefined && value !== null && value !== '')
export const credentialsOf = connection => connection?.credentials ?? connection?.secret ?? connection?.config ?? connection ?? {}
export const tokenOf = credentials => first(credentials.api_key, credentials.apiKey, credentials.key, credentials.token, credentials.access_token, credentials.accessToken, credentials.bot_token, credentials.secret_key)

export function mergeHeaders(...sources) {
  const headers = new Map()
  for (const source of sources) for (const [key, value] of Object.entries(source ?? {})) headers.set(key.toLowerCase(), [key, value])
  return Object.fromEntries(headers.values())
}

export function genericConfig(config, credentials) {
  const headers = mergeHeaders(parseDictionary(credentials.headers, 'Headers da conexão'), parseDictionary(config.headers, 'Headers'))
  const token = tokenOf(credentials)
  const type = String(first(credentials.auth_type, credentials.type, 'bearer')).toLowerCase()
  if (token && !Object.keys(headers).some(key => key.toLowerCase() === 'authorization')) {
    if (type === 'api_key') headers[credentials.header_name || 'x-api-key'] = token
    else headers.Authorization = `Bearer ${token}`
  }
  if (type === 'basic') headers.Authorization = `Basic ${Buffer.from(`${credentials.username || ''}:${credentials.password || ''}`).toString('base64')}`
  const root = first(credentials.base_url, credentials.url)
  return { ...config, url: config.url || (config.path && root ? `${String(root).replace(/\/+$/, '')}/${String(config.path).replace(/^\/+/, '')}` : undefined), headers }
}
