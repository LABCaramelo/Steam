// Undefined edges mean a legacy sequence. [] intentionally disconnects nodes.
export function graphEdges(steps = [], edges) {
  const ids = new Set(steps.map((step) => String(step.id)))
  const candidates = edges === undefined
    ? steps.slice(1).map((step, index) => ({ id: `legacy-${steps[index].id}-${step.id}`, source: String(steps[index].id), target: String(step.id) }))
    : edges ?? []
  return candidates.filter((edge) => ids.has(String(edge.source)) && ids.has(String(edge.target)))
    .map((edge, index) => ({ ...edge, id: String(edge.id ?? `edge-${index}`), source: String(edge.source), target: String(edge.target) }))
}

export function wouldCreateCycle(edges, source, target) {
  if (source === target) return true
  const next = new Map()
  for (const edge of edges) { const outgoing = next.get(edge.source) ?? []; outgoing.push(edge.target); next.set(edge.source, outgoing) }
  const visited = new Set(), stack = [target]
  while (stack.length) { const id = stack.pop(); if (id === source) return true; if (visited.has(id)) continue; visited.add(id); stack.push(...(next.get(id) ?? [])) }
  return false
}

export function layoutGraph(steps = [], edges = [], { preserve = true } = {}) {
  const outgoing = new Map(steps.map((step) => [String(step.id), []])), incoming = new Map(steps.map((step) => [String(step.id), 0]))
  for (const edge of edges) { outgoing.get(edge.source)?.push(edge.target); incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1) }
  const roots = steps.filter((step) => !incoming.get(String(step.id)))
  const positions = {}, levels = new Map(), childrenCount = new Map(), visited = new Set()
  const countLeaves = (id) => { if (visited.has(id)) return 1; visited.add(id); const children = outgoing.get(id) ?? []; const count = children.length ? children.reduce((sum, child) => sum + countLeaves(child), 0) : 1; childrenCount.set(id, count); return count }
  roots.forEach((step) => countLeaves(String(step.id)))
  let cursor = 0
  const place = (id, depth, row) => {
    if (levels.has(id)) return
    levels.set(id, depth); positions[id] = { x: depth * 290, y: row * 230 }
    const children = outgoing.get(id) ?? [], total = children.reduce((sum, child) => sum + (childrenCount.get(child) ?? 1), 0)
    let childCursor = row - (total - 1) / 2
    for (const child of children) { const span = childrenCount.get(child) ?? 1; place(child, depth + 1, childCursor + (span - 1) / 2); childCursor += span }
  }
  for (const root of roots) { const span = childrenCount.get(String(root.id)) ?? 1; place(String(root.id), 0, cursor + (span - 1) / 2); cursor += span + 1 }
  for (const step of steps) { const id = String(step.id); if (!positions[id]) positions[id] = { x: 0, y: cursor++ * 230 }; if (preserve && Number.isFinite(step.position?.x) && Number.isFinite(step.position?.y)) positions[id] = { ...step.position } }
  return positions
}

export function displayNodeId(step, index = 0) {
  if (['webhook', 'scheduler', 'activator'].includes(step.app)) return 'IN'
  return String(step.identifier ?? step.id).replace(/^s[-_]?/, '') || String(index + 1)
}
