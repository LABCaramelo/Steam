import { graphEdges, layoutGraph } from './graphModel.js'

const BODY = new Set(['body', 'loop', 'iterate', 'iteration', 'each'])
const AGENT_SLOTS = new Set(['model','memory','tools','tool','bottom-handle-model','bottom-handle-memory','bottom-handle-tools'])
export const isForEach = step => ['for_each', 'foreach'].includes(step?.app)
export const isLoop = step => ['for_each', 'foreach', 'for', 'while'].includes(step?.app)
export const edgeBranch = edge => String(edge.sourceHandle ?? edge.branch ?? edge.label ?? '').toLowerCase()
export const isAgentSlotEdge = edge => AGENT_SLOTS.has(edgeBranch(edge))
export const isLoopBody = edge => BODY.has(edgeBranch(edge))
export const canonicalHandle = (step, edge) => isLoop(step) ? isLoopBody(edge) ? 'body' : 'done' : edge.sourceHandle || edge.branch || 'out'

/** Presentation only: a loop still has exactly one executable step and body/done edges. */
export function projectForEachGraph(steps = [], inputEdges, { preserve = true } = {}) {
  const allEdges = graphEdges(steps, inputEdges)
  const resourceEdges=allEdges.filter(isAgentSlotEdge),resourceIds=new Set(resourceEdges.map(edge=>edge.target))
  const flowSteps=steps.filter(step=>!resourceIds.has(String(step.id)))
  const edges=allEdges.filter(edge=>!isAgentSlotEdge(edge)&&!resourceIds.has(edge.source)&&!resourceIds.has(edge.target))
  const byId = new Map(steps.map(step => [String(step.id), step]))
  const outgoing = new Map(steps.map(step => [String(step.id), []]))
  for (const edge of edges) outgoing.get(edge.source)?.push(edge)
  const positions = layoutGraph(flowSteps, edges, { preserve })
  for(const step of steps)if(resourceIds.has(String(step.id)))positions[step.id]=Number.isFinite(step.position?.x)&&Number.isFinite(step.position?.y)?{...step.position}:{x:0,y:0}
  const usedIds = new Set([...byId.keys(),...allEdges.map(edge=>edge.id)])
  const unique = prefix => { let id = prefix; while (usedIds.has(id)) id += '_'; usedIds.add(id); return id }
  const reach = (starts, stops = new Set()) => {
    const found = new Set(), queue = [...starts]
    while (queue.length) {
      const id = queue.pop()
      if (stops.has(id) || found.has(id) || !byId.has(id)) continue
      found.add(id)
      for (const edge of outgoing.get(id) ?? []) queue.push(edge.target)
    }
    return found
  }
  const loops = flowSteps.filter(isForEach).map(step => {
    const id = String(step.id), links = outgoing.get(id) ?? []
    const bodyEdges = links.filter(isLoopBody), doneEdges = links.filter(edge => !isLoopBody(edge))
    const doneTargets = new Set(doneEdges.map(edge => edge.target))
    const members = reach(bodyEdges.map(edge => edge.target), new Set([id, ...doneTargets]))
    return { id, step, exitId: unique('__trama_loop_exit__' + id), bodyEdges, doneEdges, doneTargets, members, parent: null, exit: null, terminals: [], placeholders: [] }
  })
  const loopById = new Map(loops.map(loop => [loop.id, loop]))
  for (const loop of loops) {
    const containers = loops.filter(other => other !== loop && other.members.has(loop.id)).sort((a, b) => a.members.size - b.members.size)
    loop.parent = containers[0] ?? null
  }
  for(const loop of loops){
    const stops=new Set([loop.id,...loop.doneTargets]),seen=new Set()
    for(let parent=loop.parent;parent&&!seen.has(parent.id);parent=parent.parent){seen.add(parent.id);for(const id of parent.doneTargets)stops.add(id)}
    loop.members=reach(loop.bodyEdges.map(edge=>edge.target),stops)
  }
  const ownerOf = id => loops.filter(loop => loop.members.has(id)).sort((a, b) => a.members.size - b.members.size)[0] ?? null
  const shift = (ids, dx, dy) => { for (const id of ids) if (positions[id]) positions[id] = { x: positions[id].x + dx, y: positions[id].y + dy } }
  const arranged = new Set(), arranging = new Set()
  const ancestorStops = loop => {
    const stops = new Set(), visited = new Set()
    for (let parent = loop.parent; parent && !visited.has(parent.id); parent = parent.parent) { visited.add(parent.id); for (const id of parent.doneTargets) stops.add(id) }
    return stops
  }
  const arrange = loop => {
    if (arranged.has(loop.id) || arranging.has(loop.id)) return
    arranging.add(loop.id)
    const origin = positions[loop.id]
    const members = [...loop.members].filter(id => positions[id])
    if (members.length) {
      shift(members, Math.max(0, origin.x + 324 - Math.min(...members.map(id => positions[id].x))), Math.max(0, origin.y + 230 - Math.min(...members.map(id => positions[id].y))))
    }
    for (const child of loops.filter(item => item.parent === loop)) arrange(child)
    const direct = members.filter(id => ownerOf(id) === loop)
    loop.terminals = direct.filter(id => {
      const nested = loopById.get(id)
      if (nested) return nested.doneEdges.length === 0
      if (byId.get(id)?.app === 'return') return false
      return !(outgoing.get(id) ?? []).some(edge => loop.members.has(edge.target))
    })
    const placeholders = []
    if (!loop.bodyEdges.length) placeholders.push({ sourceId: loop.id, sourceHandle: 'body', x: origin.x + 324, y: origin.y + 230, label: 'Dentro do For Each' })
    for (const id of loop.terminals) {
      const boundary = (outgoing.get(id) ?? []).some(edge => !loop.members.has(edge.target))
      if (boundary) continue
      const nested = loopById.get(id), pos = nested?.exit ?? positions[id]
      placeholders.push({ sourceId: id, sourceHandle: nested ? 'done' : 'out', x: pos.x + 324, y: pos.y, label: 'Dentro do For Each' })
    }
    loop.placeholders = placeholders
    const right = [origin.x + 548, ...members.map(id => positions[id].x + 224), ...loops.filter(item => item.parent === loop).map(item => item.exit.x + 224), ...placeholders.map(item => item.x + 174)]
    loop.exit = { x: Math.max(...right) + 100, y: origin.y }
    const stops = new Set([loop.id, ...loop.members, ...ancestorStops(loop)])
    const doneGroup = reach([...loop.doneTargets], stops)
    if (doneGroup.size) {
      const target = loop.doneEdges.find(edge => doneGroup.has(edge.target))?.target
      if (target) {
        const dx = Math.max(0, loop.exit.x + 324 - positions[target].x)
        shift(doneGroup, dx, dx ? origin.y - positions[target].y : 0)
      }
    }
    arranged.add(loop.id); arranging.delete(loop.id)
    for (const following of loops.filter(item => doneGroup.has(item.id) && item.parent === loop.parent)) arrange(following)
  }
  for (const loop of loops.filter(item => !item.parent).sort((a, b) => positions[a.id].x - positions[b.id].x)) arrange(loop)
  for (const loop of loops) arrange(loop)

  const virtualNodes = loops.map(loop => ({ id: loop.exitId, type: 'loop-exit', position: loop.exit, data: { loopId: loop.id, step: loop.step }, draggable: false, connectable: true, selectable: true }))
  const visualEdges = edges.map(edge => {
    const sourceLoop = loopById.get(edge.source), owner = ownerOf(edge.source)
    const sourceIsExit = sourceLoop && !isLoopBody(edge)
    // A real edge joining the continuation is shown at the loop's exit, where the engine resumes.
    let boundary=false;const seen=new Set()
    for(let parent=owner;parent&&!seen.has(parent.id);parent=parent.parent){seen.add(parent.id);if(parent.doneTargets.has(edge.target)){boundary=true;break}}
    return { ...edge, source: sourceIsExit ? sourceLoop.exitId : edge.source, sourceHandle: sourceIsExit ? 'done' : canonicalHandle(byId.get(edge.source), edge), target: boundary ? owner.exitId : edge.target, targetHandle: boundary ? 'inside' : edge.targetHandle, data: { ...edge.data, canonicalId: edge.id, loopId: sourceLoop?.id ?? owner?.id } }
  })
  const placeholders = []
  const decorative = []
  for (const loop of loops) {
    decorative.push({ id: unique('__trama_loop_scope__' + loop.id), source: loop.id, sourceHandle: 'scope', target: loop.exitId, targetHandle: 'scope', type: 'loop-scope', selectable: false, data: { loopId: loop.id, label: loop.step.title || 'For Each' } })
    for (const item of loop.placeholders) {
      const nested = loopById.get(item.sourceId)
      const id = unique('__add__' + item.sourceId + '__' + item.sourceHandle)
      const visualSource = nested && item.sourceHandle === 'done' ? nested.exitId : item.sourceId
      placeholders.push({ id, type: 'add', position: { x: item.x, y: item.y + 32 }, data: { sourceId: item.sourceId, sourceHandle: item.sourceHandle, position: { x: item.x, y: item.y }, label: item.label, loopId: loop.id }, draggable: false, selectable: false, connectable: false })
      decorative.push({ id: unique('__edge__' + id), source: visualSource, sourceHandle: item.sourceHandle, target: id, selectable: false, data: { loopId: loop.id, decorative: true } })
      decorative.push({ id: unique('__trama_loop_close__' + id), source: id, sourceHandle: 'close', target: loop.exitId, targetHandle: 'inside', selectable: false, data: { loopId: loop.id, decorative: true } })
    }
    // Read-only mode omits the add controls but still explains the loop's automatic closure.
    for (const id of loop.terminals) {
      if (loop.placeholders.some(item => item.sourceId === id)) continue
      if ((outgoing.get(id) ?? []).some(edge => !loop.members.has(edge.target))) continue
      const nested = loopById.get(id)
      decorative.push({ id: unique('__trama_loop_return__' + loop.id + '__' + id), source: nested?.exitId ?? id, sourceHandle: nested ? 'done' : 'out', target: loop.exitId, targetHandle: 'inside', selectable: false, data: { loopId: loop.id, decorative: true } })
    }
  }
  const sourceFor = id => loopById.get(id)?.exitId ?? id
  return { positions, loops, loopById, virtualNodes, visualEdges, placeholders, decorative, ownerOf, sourceFor,resourceEdges,resourceIds }
}

export function canonicalConnection(connection, projection) {
  const source = projection.loops.find(loop => loop.exitId === connection.source)
  if (projection.loops.some(loop => loop.exitId === connection.target)) return null
  return { ...connection, source: source?.id ?? connection.source, sourceHandle: source ? 'done' : connection.sourceHandle }
}
