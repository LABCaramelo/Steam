/** A request-local view of an atomically leased Supabase workspace. No global tenant cache. */
export class MemoryStore {
  constructor(state = {}) {
    this.documents = new Map()
    this.eventLog = new Map()
    this.eventBytes = new Map()
    for (const row of state?.documents ?? []) {
      if (row && typeof row.collection === 'string' && row.id !== undefined && row.data && typeof row.data === 'object') this.documents.set(this.key(row.collection, row.id), structuredClone(row))
    }
    for (const [id, events] of Object.entries(state?.events ?? {})) if (Array.isArray(events)) {
      this.eventLog.set(id, structuredClone(events)); this.eventBytes.set(id, events.reduce((sum, event) => sum + Buffer.byteLength(JSON.stringify(event)), 0))
    }
  }
  key(collection, id) { return JSON.stringify([String(collection), String(id)]) }
  get(collection, id) { const row = this.documents.get(this.key(collection, id)); return row ? structuredClone(row.data) : null }
  list(collection, orgId) { return [...this.documents.values()].filter(row => row.collection === collection && (orgId === undefined || row.org_id === orgId)).map(row => structuredClone(row.data)) }
  put(collection, value, orgId = value.org_id ?? null) {
    if (!value || value.id === undefined || value.id === null) throw new Error('O documento precisa de um ID.')
    const data = structuredClone(value)
    this.documents.set(this.key(collection, value.id), { collection, id: String(value.id), org_id: orgId, data })
    return structuredClone(data)
  }
  delete(collection, id) {
    this.documents.delete(this.key(collection, id))
    if (collection === 'executions') { this.eventLog.delete(String(id)); this.eventBytes.delete(String(id)) }
    if (collection === 'organizations') {
      for (const row of [...this.documents.values()]) if (row.org_id === id) this.delete(row.collection, row.id)
    }
  }
  transaction(fn) {
    const documents = structuredClone(this.documents), events = structuredClone(this.eventLog), eventBytes = structuredClone(this.eventBytes)
    try {
      const result = fn()
      if (result && typeof result.then === 'function') throw new Error('MemoryStore.transaction exige um callback síncrono.')
      return result
    } catch (error) { this.documents = documents; this.eventLog = events; this.eventBytes = eventBytes; throw error }
  }
  addEvent(executionId, event) {
    const id = String(executionId), list = this.eventLog.get(id) ?? []
    const sequence = Number(list.at(-1)?.sequence ?? 0) + 1
    let record = structuredClone({ ...event, sequence })
    let size = Buffer.byteLength(JSON.stringify(record))
    if (size > 1024 * 1024) { record = { type: event.type, executionId: id, sequence, truncated: true }; size = Buffer.byteLength(JSON.stringify(record)) }
    list.push(record)
    let bytes = (this.eventBytes.get(id) ?? 0) + size
    while (list.length > 1000 || bytes > 1024 * 1024) bytes -= Buffer.byteLength(JSON.stringify(list.shift()))
    this.eventBytes.set(id, bytes); this.eventLog.set(id, list); return sequence
  }
  events(executionId, after = 0) {
    const list = this.eventLog.get(String(executionId)) ?? []
    const records = list.filter(event => event.sequence > after)
    if (list.length && list[0].sequence > Number(after) + 1) records.unshift({ type: 'events:truncated', sequence: list[0].sequence - 1, retained_from: list[0].sequence, executionId: String(executionId) })
    return structuredClone(records)
  }
  snapshot() { return { documents: structuredClone([...this.documents.values()]), events: Object.fromEntries([...this.eventLog].map(([id, events]) => [id, structuredClone(events)])) } }
  close() { /* Supabase owns persistence. */ }
}
