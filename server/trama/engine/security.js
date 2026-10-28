import { randomBytes, scryptSync, timingSafeEqual, createHash, createCipheriv, createDecipheriv, createHmac } from 'node:crypto'

export const token = (bytes = 32) => randomBytes(bytes).toString('hex')
export const digest = (value) => createHash('sha256').update(String(value)).digest('hex')
export function passwordHash(password) {
  if (typeof password !== 'string' || password.length < 10 || password.length > 256) throw Object.assign(new Error('A senha deve ter entre 10 e 256 caracteres.'), { status: 400 })
  const salt = randomBytes(16).toString('hex')
  return salt + ':' + scryptSync(password, salt, 64).toString('hex')
}
export function checkPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(':')
    const actual = scryptSync(String(password), salt, 64)
    const expected = Buffer.from(hash, 'hex')
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch { return false }
}
export function secretBox(_directory, suppliedKey = process.env.TRAMA_ENCRYPTION_KEY) {
  const keyOf = () => {
    if (typeof suppliedKey !== 'string' || !/^[0-9a-f]{64}$/i.test(suppliedKey)) throw Object.assign(new Error('Configure TRAMA_ENCRYPTION_KEY com 64 caracteres hexadecimais no servidor para guardar credenciais e executar fluxos.'), { status: 503, code: 'TRAMA_KEY_REQUIRED' })
    return Buffer.from(suppliedKey, 'hex')
  }
  return {
    encrypt(value) {
      const key = keyOf()
      const iv = randomBytes(12)
      const cipher = createCipheriv('aes-256-gcm', key, iv)
      const content = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
      return [iv, cipher.getAuthTag(), content].map(x => x.toString('base64')).join('.')
    },
    decrypt(value) {
      const key = keyOf()
      const [iv, tag, content] = value.split('.').map(x => Buffer.from(x, 'base64'))
      const decipher = createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(tag)
      return JSON.parse(Buffer.concat([decipher.update(content), decipher.final()]).toString('utf8'))
    },
  }
}
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
export function base32(value) {
  let bits = 0, n = 0, out = ''
  for (const byte of value) { n = (n << 8) | byte; bits += 8; while (bits >= 5) { out += ALPHABET[(n >>> (bits - 5)) & 31]; bits -= 5 } }
  if (bits) out += ALPHABET[(n << (5 - bits)) & 31]
  return out
}
function decode32(value) {
  let bits = 0, n = 0
  const bytes = []
  for (const c of value.toUpperCase().replace(/=+$/, '')) { const i = ALPHABET.indexOf(c); if (i < 0) continue; n = (n << 5) | i; bits += 5; if (bits >= 8) { bytes.push((n >>> (bits - 8)) & 255); bits -= 8 } }
  return Buffer.from(bytes)
}
export function totp(secret, time = Date.now()) {
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(time / 30000)))
  const h = createHmac('sha1', decode32(secret)).update(counter).digest()
  const offset = h[h.length - 1] & 15
  return String((h.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0')
}
export function verifyTotp(secret, code) {
  return /^\d{6}$/.test(String(code)) && [-1, 0, 1].some(offset => totp(secret, Date.now() + offset * 30000) === String(code))
}
export function redact(value) {
  const forbidden = /^(authorization|cookie|set-cookie|api[-_]?key|access[-_]?token|refresh[-_]?token|password|secret|client_secret|token)$/i
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, forbidden.test(key) ? '[oculto]' : redact(entry)]))
  return value
}
