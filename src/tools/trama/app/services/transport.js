import { supabase } from '../../../../supabase'

let owner = null
let lifetime = new AbortController()
export function setTransportOwner(userId) { lifetime.abort(); lifetime = new AbortController(); owner = userId }
export function tramaUrl(path) { return '/api/trama?path=' + encodeURIComponent(path) }
export async function tramaFetch(path, options = {}) {
  const expected = owner
  const activeLifetime = lifetime
  const { data, error } = await supabase.auth.getSession()
  if (error || !expected || data.session?.user.id !== expected || owner !== expected) throw Object.assign(new Error('Sua sessão mudou. Abra a Trama novamente pelo LAB.'), { status: 401 })
  const headers = new Headers(options.headers)
  headers.set('Authorization', 'Bearer ' + data.session.access_token)
  const signal = options.signal ? AbortSignal.any([options.signal, activeLifetime.signal]) : activeLifetime.signal
  const response = await fetch(tramaUrl(path), { ...options, headers, signal, credentials: 'same-origin', cache: 'no-store' })
  if (owner !== expected || activeLifetime !== lifetime) throw Object.assign(new Error('Sua sessão mudou. Abra a Trama novamente pelo LAB.'), { status: 401 })
  return response
}
