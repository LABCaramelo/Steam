import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import http from 'node:http'
import https from 'node:https'
import { Readable } from 'node:stream'
import { RuntimeError, assertNotAborted } from './errors.js'

const denied = () => new RuntimeError('NETWORK_TARGET_DENIED', 'Este destino de rede é privado, reservado ou interno e não pode ser acessado pela Trama.')
const ipv4Number = address => address.split('.').reduce((value, byte) => (value * 256) + Number(byte), 0) >>> 0
const inV4 = (address, network, bits) => (address >>> (32 - bits)) === (ipv4Number(network) >>> (32 - bits))
export function isPublicAddress(value) {
  const address = String(value).toLowerCase().replace(/^\[|\]$/g, '')
  if (isIP(address) === 4) {
    const n = ipv4Number(address)
    return ![['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3]].some(([network, bits]) => inV4(n, network, bits))
  }
  if (isIP(address) !== 6 || address.includes('%')) return false
  // Only global unicast IPv6. This excludes loopback, mapped IPv4, ULA and link-local.
  const first = Number.parseInt(address.split(':')[0], 16)
  if (!Number.isFinite(first) || first < 0x2000 || first > 0x3fff) return false
  const second = Number.parseInt(address.split(':')[1] || '0', 16)
  if (first === 0x2001 && (second < 0x0200 || second === 0x0db8)) return false
  if (first === 0x2002 || first === 0x3ffe || first === 0x3fff) return false
  return true
}

/** Resolve once and pin the verified IP on the actual socket; redirects resolve again. */
export function createNetworkFetch({ allowPrivateNetworks = false, lookupImpl = lookup } = {}) {
  return async function networkFetch(input, init = {}) {
    const initial = new URL(input)
    let url = initial, method = String(init.method || 'GET').toUpperCase(), body = init.body
    const headers = new Headers(init.headers)
    for (const header of ['host', 'connection', 'transfer-encoding', 'content-length', 'upgrade', 'proxy-connection', 'expect']) headers.delete(header)
    // Avoid compressed response bombs; response readers independently enforce byte limits.
    headers.set('accept-encoding', 'identity')
    for (let redirects = 0; ; redirects++) {
      assertNotAborted(init.signal)
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw denied()
      const hostname = url.hostname.replace(/^\[|\]$/g, '')
      let addresses
      if (isIP(hostname)) addresses = [{ address: hostname, family: isIP(hostname) }]
      else {
        let timer
        try {
          addresses = await Promise.race([
            lookupImpl(hostname, { all: true, verbatim: true }),
            new Promise((_, reject) => { timer = setTimeout(() => reject(new RuntimeError('DNS_TIMEOUT', 'A resolução do destino demorou demais.')), 5000); timer.unref?.() }),
          ])
        } finally { clearTimeout(timer) }
      }
      assertNotAborted(init.signal)
      if (!addresses.length || !allowPrivateNetworks && addresses.some(result => !isPublicAddress(result.address))) throw denied()
      const selected = addresses[0]
      const response = await new Promise((resolve, reject) => {
        const request = (url.protocol === 'https:' ? https : http).request(url, {
          method, headers: Object.fromEntries(headers), signal: init.signal, agent: false,
          family: selected.family, autoSelectFamily: false,
          lookup: (_hostname, options, callback) => {
            if (options.all) callback(null, [selected])
            else callback(null, selected.address, selected.family)
          },
        }, message => {
          const responseHeaders = new Headers()
          for (let index = 0; index < message.rawHeaders.length; index += 2) responseHeaders.append(message.rawHeaders[index], message.rawHeaders[index + 1])
          const status = message.statusCode ?? 502
          if ([204, 205, 304].includes(status) || method === 'HEAD') { message.resume(); resolve(new Response(null, { status, headers: responseHeaders })); return }
          resolve(new Response(Readable.toWeb(message), { status, headers: responseHeaders }))
        })
        request.on('error', reject)
        if (body !== undefined && body !== null) request.end(body instanceof URLSearchParams ? body.toString() : body)
        else request.end()
      })
      if (![301, 302, 303, 307, 308].includes(response.status) || !response.headers.has('location') || init.redirect === 'manual') return response
      await response.body?.cancel()
      if (init.redirect === 'error') throw new RuntimeError('HTTP_REDIRECT_DENIED', 'O destino retornou um redirecionamento não permitido.')
      if (redirects >= 5) throw new RuntimeError('HTTP_REDIRECT_LIMIT', 'A requisição excedeu cinco redirecionamentos.')
      const next = new URL(response.headers.get('location'), url)
      if (next.origin !== url.origin) {
        throw new RuntimeError('HTTP_REDIRECT_ORIGIN', 'A requisição tentou redirecionar para outra origem. Configure a URL final para proteger os cabeçalhos da conexão.')
      }
      if (response.status === 303 && method !== 'HEAD' || [301, 302].includes(response.status) && method === 'POST') {
        method = 'GET'; body = undefined; headers.delete('content-length'); headers.delete('content-type')
      }
      url = next
    }
  }
}
export const publicFetch = createNetworkFetch()
