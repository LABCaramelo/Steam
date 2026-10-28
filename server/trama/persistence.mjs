const EMPTY = { documents: [], events: {} }

export class TramaPersistenceError extends Error {
  constructor(message, status = 503, code = 'TRAMA_DATABASE_UNAVAILABLE') {
    super(message); this.name = 'TramaPersistenceError'; this.status = status; this.code = code
  }
}

export function databaseHeaders(access) {
  return { apikey: access.supabaseKey, Authorization: `Bearer ${access.token}`, 'Content-Type': 'application/json', Accept: 'application/json' }
}

export async function databaseRequest(access, path, options = {}) {
  let response
  try {
    response = await fetch(`${access.supabaseUrl}/rest/v1/${path}`, {
      ...options, headers: { ...databaseHeaders(access), ...options.headers }, signal: AbortSignal.timeout(15000),
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    })
  } catch { throw new TramaPersistenceError('Não foi possível acessar os dados da Trama. Tente novamente.') }
  const value = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    const code = value?.code
    if (response.status === 401 || code === '28000') throw new TramaPersistenceError('Sua sessão expirou. Entre novamente no LAB.', 401, 'INVALID_SESSION')
    if (code === '55P03') throw new TramaPersistenceError('Outra operação está usando seu espaço. Aguarde a conclusão e tente novamente.', 409, 'WORKSPACE_BUSY')
    if (code === '40001') throw new TramaPersistenceError('Seu espaço mudou durante esta operação. Atualize antes de tentar novamente.', 409, 'WORKSPACE_CONFLICT')
    if (response.status === 403 || code === '42501') throw new TramaPersistenceError('A Trama não está disponível na sua biblioteca.', 403, 'TOOL_REQUIRED')
    if (code === '22023' || code === '23514') throw new TramaPersistenceError('Os dados excedem os limites permitidos da Trama.', 413, 'WORKSPACE_LIMIT')
    if (code === 'PGRST202' || code === 'PGRST205' || code === '42P01') throw new TramaPersistenceError('A integração da Trama com o banco ainda não foi instalada.', 503, 'TRAMA_NOT_CONFIGURED')
    throw new TramaPersistenceError('Não foi possível confirmar a gravação. Atualize para conferir o estado antes de repetir a ação.')
  }
  return value
}

export async function loadWorkspace(access) {
  const rows = await databaseRequest(access, 'automation_workspaces?select=state,revision&user_id=eq.' + encodeURIComponent(access.user.id))
  return rows?.[0] ?? { state: structuredClone(EMPTY), revision: 0 }
}

export async function acquireWorkspace(access) {
  const result = await databaseRequest(access, 'rpc/acquire_trama_workspace', { method: 'POST', body: {} })
  if (!result || typeof result.revision !== 'number' || typeof result.lease_token !== 'string' || !result.state) throw new TramaPersistenceError('O banco não confirmou o bloqueio de edição. Tente novamente.')
  return { state: result.state, revision: result.revision, leaseToken: result.lease_token }
}

export async function commitWorkspace(access, { revision, leaseToken, state }) {
  const result = await databaseRequest(access, 'rpc/commit_trama_workspace', {
    method: 'POST', body: { p_revision: revision, p_lease_token: leaseToken, p_state: state },
  })
  if (typeof result !== 'number') throw new TramaPersistenceError('O banco não confirmou a gravação. Atualize para conferir o estado.')
  return result
}

export async function releaseWorkspace(access, leaseToken) {
  await databaseRequest(access, 'rpc/release_trama_workspace', { method: 'POST', body: { p_lease_token: leaseToken } })
}
