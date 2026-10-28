export class RuntimeError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'RuntimeError'
    this.code = code
    this.details = details
  }
}

export function abortError() {
  return new RuntimeError('CANCELLED', 'Execução cancelada.')
}

export function assertNotAborted(signal) {
  if (signal?.aborted) throw abortError()
}

export function redact(value, secrets = [], depth = 0) {
  if (depth > 40) return '[profundidade limitada]'
  if (typeof value === 'string') {
    let text = value
    for (const secret of secrets) if (typeof secret === 'string' && secret.length >= 4) text = text.split(secret).join('[REDACTED]')
    return text.length > 1000000 ? text.slice(0, 1000000) + '\n[saída truncada]' : text
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, secrets, depth + 1))
  if (value && typeof value === 'object') {
    const result = {}
    for (const [key, item] of Object.entries(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) continue
      result[key] = /^(authorization|proxy-authorization|cookie|set-cookie|api[-_]?key|access[-_]?token|refresh[-_]?token|password|secret|token)$/i.test(key) ? '[REDACTED]' : redact(item, secrets, depth + 1)
    }
    return result
  }
  return value
}

export function publicError(error, secrets = []) {
  return { code: error.code ?? (error.name === 'AbortError' ? 'CANCELLED' : 'NODE_ERROR'), message: redact(error.message || String(error), secrets), ...(error.details && { details: redact(error.details, secrets) }) }
}
