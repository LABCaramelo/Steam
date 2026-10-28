import { RuntimeError, assertNotAborted } from './errors.js'

/** Code stays in the graph; this shared deployment has no isolated script worker. */
export function runScript(_code, { signal } = {}) {
  assertNotAborted(signal)
  throw new RuntimeError('SCRIPT_UNAVAILABLE', 'A execução de JavaScript requer um worker isolado e ainda não está disponível na Trama. O código permanece salvo no fluxo.')
}
