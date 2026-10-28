import { randomUUID } from 'node:crypto'
import { databaseRequest, TramaPersistenceError } from './persistence.mjs'

export const MAX_FILE_BYTES = 2 * 1024 * 1024
export const FILE_TYPES = new Set(['text/plain', 'text/csv', 'application/json', 'application/pdf', 'image/png', 'image/jpeg'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const publicMetadata = ({ id, name, mime, size_bytes, created_at }) => ({ id, name, mime, size_bytes, created_at })
const error = (message, status = 400, code = 'FILE_INVALID') => new TramaPersistenceError(message, status, code)

function config() {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID
  const token = process.env.CLOUDFLARE_API_TOKEN
  const bucket = process.env.CLOUDFLARE_R2_PRIVATE_BUCKET || 'umcaracaramelo-private'
  if (!account || !token || bucket === (process.env.CLOUDFLARE_R2_BUCKET || 'umcaracaramelo')) throw error('O armazenamento privado da Trama ainda não foi configurado.', 503, 'R2_NOT_CONFIGURED')
  return { account, token, bucket }
}

async function r2(method, key, data, mime) {
  const { account, token, bucket } = config()
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/r2/buckets/${encodeURIComponent(bucket)}/objects/${key.split('/').map(encodeURIComponent).join('/')}`
  let response
  try {
    response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, ...(mime ? { 'Content-Type': mime } : {}) }, ...(data ? { body: data } : {}), signal: AbortSignal.timeout(20000) })
  } catch { throw error('Não foi possível acessar seus arquivos no R2. Tente novamente.', 502, 'R2_UNAVAILABLE') }
  if (!response.ok && !(method === 'DELETE' && response.status === 404)) throw error('O R2 não confirmou a operação. Tente novamente.', 502, 'R2_UNAVAILABLE')
  return response
}

function ownKey(access, file) {
  const expected = `trama/${access.user.id}/${file.id}`
  if (file.r2_key !== expected || !UUID.test(file.id)) throw error('Arquivo inválido.', 404, 'FILE_NOT_FOUND')
  return expected
}

async function findFile(access, id) {
  if (!UUID.test(String(id))) throw error('Arquivo não encontrado.', 404, 'FILE_NOT_FOUND')
  const rows = await databaseRequest(access, `automation_files?select=*&id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(access.user.id)}`)
  const file = rows?.[0]
  if (!file) throw error('Arquivo não encontrado.', 404, 'FILE_NOT_FOUND')
  ownKey(access, file)
  return file
}

export async function listFiles(access) {
  const rows = await databaseRequest(access, 'automation_files?select=id,name,mime,size_bytes,created_at&user_id=eq.' + encodeURIComponent(access.user.id) + '&order=created_at.desc&limit=200')
  return (rows ?? []).map(publicMetadata)
}

export async function uploadFile(access, { name, mime, data }) {
  config()
  name = String(name ?? '').replace(/[\x00-\x1f\x7f\\/]/g, '_').trim().slice(0, 180)
  mime = String(mime ?? '').split(';')[0].trim().toLowerCase()
  if (!name || !FILE_TYPES.has(mime)) throw error('Use TXT, CSV, JSON, PDF, PNG ou JPEG para este arquivo.')
  if (!Buffer.isBuffer(data) || !data.length || data.length > MAX_FILE_BYTES) throw error('Envie um arquivo de até 2 MB.', 413, 'FILE_TOO_LARGE')
  const id = randomUUID(), key = `trama/${access.user.id}/${id}`
  await r2('PUT', key, data, mime)
  try {
    const rows = await databaseRequest(access, 'automation_files', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { id, user_id: access.user.id, name, mime, size_bytes: data.length, r2_key: key } })
    if (!rows?.[0]) throw error('O banco não confirmou o arquivo. Tente novamente.', 503, 'FILE_NOT_CONFIRMED')
    return publicMetadata(rows[0])
  } catch (cause) {
    // If acquisition was revoked during PUT, leave no unreferenced object when R2 is reachable.
    await r2('DELETE', key).catch(() => {})
    throw cause
  }
}

export async function getFile(access, id) {
  const file = await findFile(access, id)
  const response = await r2('GET', ownKey(access, file))
  const body = Buffer.from(await response.arrayBuffer())
  if (body.length > MAX_FILE_BYTES) throw error('O arquivo excede o limite permitido.', 413, 'FILE_TOO_LARGE')
  return { metadata: publicMetadata(file), body }
}

export async function deleteFile(access, id) {
  const file = await findFile(access, id)
  await r2('DELETE', ownKey(access, file))
  await databaseRequest(access, `automation_files?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(access.user.id)}`, { method: 'DELETE' })
  return { deleted: true, id }
}

/** Service-only maintenance. Dry-run is the default; failed R2 deletes remain queued. */
export async function cleanupDeletedFiles({ supabaseUrl = process.env.SUPABASE_URL, serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY, limit = 100, dryRun = true } = {}) {
  config()
  if (!supabaseUrl || !serviceKey) throw error('Configure as credenciais de manutenção do Supabase no servidor.', 503, 'GC_NOT_CONFIGURED')
  const access = { supabaseUrl: supabaseUrl.replace(/\/+$/, ''), supabaseKey: serviceKey, token: serviceKey }
  const candidates = await databaseRequest(access, 'rpc/pending_trama_file_cleanup', { method: 'POST', body: { p_limit: Math.min(100,Math.max(1,Number(limit)||100)) } })
  if (!Array.isArray(candidates)) throw error('O banco não confirmou a fila de limpeza.', 503, 'GC_NOT_CONFIRMED')
  const safe = candidates.filter(item => /^trama\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(item.r2_key)))
  const result = { pending: candidates.length, deleted: 0, failed: 0, rejected: candidates.length-safe.length, dryRun }
  if (dryRun) return result
  for (const { r2_key: key } of safe) {
    try {
      await r2('DELETE', key)
      const confirmed = await databaseRequest(access, 'rpc/confirm_trama_file_cleanup', { method: 'POST', body: { p_keys: [key] } })
      if (typeof confirmed !== 'number') throw error('Limpeza não confirmada.',503,'GC_NOT_CONFIRMED')
      result.deleted++
    } catch { result.failed++ }
  }
  return result
}
