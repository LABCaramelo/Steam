import { graphEdges } from './graphModel.js'
import { projectForEachGraph, edgeBranch, isAgentSlotEdge } from './loopProjection.js'

export function agentSlot(edge) {
  const handle = edgeBranch(edge).replace(/^bottom-handle-/, '')
  return handle === 'tool' ? 'tools' : ['model', 'memory', 'tools'].includes(handle) ? handle : null
}

export function agentAttachment(stepId, edges = []) {
  const edge = edges.find(item => String(item.target) === String(stepId) && agentSlot(item))
  return edge ? { role: agentSlot(edge), parentId: String(edge.source) } : null
}

/** Resource bindings have their own lanes; only ordinary edges determine execution order. */
export function projectAgentGraph(steps = [], inputEdges, options = {}) {
  const edges = graphEdges(steps, inputEdges), byId = new Map(steps.map(step => [String(step.id), step]))
  const usedIds = new Set([...byId.keys(), ...edges.map(edge => edge.id)])
  const reserveSynthetic = view => {
    const remap = new Map()
    const unique = id => { let nextId = id; while(usedIds.has(nextId)) nextId += '_'; usedIds.add(nextId); return nextId }
    for(const node of [...view.virtualNodes, ...view.placeholders]) { const id = unique(node.id); if(id !== node.id) remap.set(node.id, id); node.id = id }
    for(const loop of view.loops) loop.exitId = remap.get(loop.exitId) ?? loop.exitId
    for(const edge of [...view.visualEdges, ...view.decorative]) { edge.source = remap.get(edge.source) ?? edge.source; edge.target = remap.get(edge.target) ?? edge.target }
    for(const edge of view.decorative) edge.id = unique(edge.id)
    return view
  }
  const slots = edges.filter(edge => byId.get(edge.source)?.app === 'ai_agent' && isAgentSlotEdge(edge))
  const normal = edges.filter(edge => !slots.includes(edge)), next = new Map()
  for (const edge of normal) { const targets = next.get(edge.source) ?? []; targets.push(edge.target); next.set(edge.source, targets) }
  const reach = (starts, stop = new Set()) => {
    const found = new Set(), pending = [...starts]
    while (pending.length) {
      const id = pending.pop()
      if (found.has(id) || stop.has(id) || !byId.has(id)) continue
      found.add(id); pending.push(...(next.get(id) ?? []))
    }
    return found
  }
  const incoming = new Set(edges.map(edge => edge.target))
  const mainIds = reach(steps.filter(step => !incoming.has(String(step.id))).map(step => String(step.id)))
  const claimed = new Set(), groups = [], attachmentById = new Map()
  for (const edge of slots) {
    const ids = reach([edge.target], new Set([...mainIds, ...claimed]))
    for (const id of ids) claimed.add(id)
    attachmentById.set(edge.target, { role: agentSlot(edge), parentId: edge.source })
    if (ids.size) groups.push({ edge, ids })
  }
  const mainSteps = steps.filter(step => !claimed.has(String(step.id)))
  const view = reserveSynthetic(projectForEachGraph(mainSteps, normal.filter(edge => !claimed.has(edge.source) && !claimed.has(edge.target)), options))
  view.attachmentById = attachmentById
  view.resourceIds = claimed
  view.resourceEdges = slots
  view.agentSlots = new Map()
  for (const edge of slots) {
    const bound = view.agentSlots.get(edge.source) ?? { model: [], memory: [], tools: [] }
    bound[agentSlot(edge)].push(edge.target); view.agentSlots.set(edge.source, bound)
  }
  const groupById = new Map(groups.flatMap(group => [...group.ids].map(id => [id, group])))
  const remaining = [...groups], placed = new Set(mainSteps.map(step => String(step.id))), toolLaneBottom = new Map()
  while (remaining.length) {
    let index = remaining.findIndex(group => placed.has(group.edge.source))
    if (index < 0) index = 0 // Invalid cyclic drafts remain editable; runtime validation explains the error.
    const { edge, ids } = remaining.splice(index, 1)[0]
    const groupSteps = steps.filter(step => ids.has(String(step.id)))
    const sub = reserveSynthetic(projectForEachGraph(groupSteps, normal.filter(item => ids.has(item.source) && ids.has(item.target)), options))
    const root = sub.positions[edge.target], parent = view.positions[edge.source] ?? { x: 0, y: 0 }, role = agentSlot(edge)
    const saved = byId.get(edge.target)?.position
    const hasSaved = options.preserve !== false && Number.isFinite(saved?.x) && Number.isFinite(saved?.y) && saved.y >= parent.y + 200
    const anchor = hasSaved ? saved : { x: parent.x + ({ model: -264, memory: 0, tools: 324 }[role]), y: role === 'tools' ? Math.max(parent.y + 300, toolLaneBottom.get(edge.source) ?? 0) : parent.y + 300 }
    const dx = anchor.x - root.x, dy = anchor.y - root.y
    const shifted = point => ({ x: point.x + dx, y: point.y + dy })
    for (const [id, point] of Object.entries(sub.positions)) { view.positions[id] = shifted(point); placed.add(id) }
    const bottom = Math.max(...Object.values(sub.positions).map(point => point.y + dy), ...sub.placeholders.map(node => node.position.y + dy)) + 270
    if (role === 'tools') toolLaneBottom.set(edge.source, bottom)
    const ancestors = new Set()
    for(let parentGroup = groupById.get(edge.source); parentGroup && !ancestors.has(parentGroup); parentGroup = groupById.get(parentGroup.edge.source)) {
      ancestors.add(parentGroup)
      if(agentSlot(parentGroup.edge) === 'tools') toolLaneBottom.set(parentGroup.edge.source, Math.max(toolLaneBottom.get(parentGroup.edge.source) ?? 0, bottom))
    }
    for (const loop of sub.loops) { loop.exit = shifted(loop.exit); view.loops.push(loop); view.loopById.set(loop.id, loop) }
    view.virtualNodes.push(...sub.virtualNodes.map(node => ({ ...node, position: shifted(node.position) })))
    view.placeholders.push(...sub.placeholders.map(node => ({ ...node, position: shifted(node.position), data: { ...node.data, position: shifted(node.data.position) } })))
    view.visualEdges.push(...sub.visualEdges)
    view.decorative.push(...sub.decorative)
    // Finish nested resources before laying out the next tool lane of the parent agent.
    const children = remaining.filter(group => ids.has(group.edge.source))
    for(const child of children) remaining.splice(remaining.indexOf(child), 1)
    remaining.unshift(...children)
  }
  const shown = new Set(view.visualEdges.map(edge => edge.id))
  // Retain cross-lane links in incomplete imported drafts so they can be inspected and removed.
  view.visualEdges.push(...normal.filter(edge => !shown.has(edge.id)).map(edge => ({ ...edge, data: { ...edge.data, canonicalId: edge.id } })))
  view.visualEdges.push(...slots.map(edge => ({ ...edge, sourceHandle: agentSlot(edge), targetHandle: 'agent-resource', data: { ...edge.data, canonicalId: edge.id, agentSlot: agentSlot(edge) } })))
  return view
}
