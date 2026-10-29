import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { MemoryStore } from './memory-store.mjs'
import { secretBox } from './engine/security.js'
import { Domain } from './engine/domain.js'
import { Jobs } from './engine/jobs.js'
import { initialFlow } from './engine/initial-data.js'
import { executeGraph, validateGraph, httpRequest, runScript } from './engine/runtime/index.js'
import { createNetworkFetch, isPublicAddress } from './engine/runtime/network.js'
import { verifyConnectorConnection } from './engine/connectors/index.js'
import { McpClient } from './engine/connectors/mcp.js'

let fixture, origin
const requests = []
const localFetch = createNetworkFetch({ allowPrivateNetworks: true })
before(async () => {
  fixture = createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk)
    const text = Buffer.concat(chunks).toString('utf8')
    const data = text ? JSON.parse(text) : null
    requests.push({ url: req.url, method: req.method, data })
    res.setHeader('Content-Type', 'application/json')
    if (req.url === '/redirect') { res.writeHead(302, { location: origin + '/echo' }); return res.end() }
    if (req.url === '/cross-origin') { res.writeHead(302, { location: 'http://localhost:' + fixture.address().port + '/echo' }); return res.end() }
    if (req.url === '/chat/completions') return res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'Fixture real' } }] }))
    if (req.url === '/agent/chat/completions') {
      const last = data.messages.at(-1)
      const callsTool = ['slot-tool-fixture', 'slot-nested-parent'].includes(data.model) && last.role !== 'tool'
      const message = callsTool
        ? { role: 'assistant', content: null, tool_calls: [{ id: 'fixture-call-' + requests.length, type: 'function', function: { name: data.tools[0].function.name, arguments: JSON.stringify({ city: 'Belo Horizonte' }) } }] }
        : { role: 'assistant', content: (data.model === 'slot-nested-child' ? 'Child: ' : 'Fixture: ') + last.content }
      return res.end(JSON.stringify({ choices: [{ message }] }))
    }
    if (req.url === '/mcp') {
      if (req.method === 'DELETE') { res.statusCode = 204; return res.end() }
      if (data.method === 'notifications/initialized') { res.statusCode = 202; return res.end() }
      const result = data.method === 'initialize' ? { protocolVersion: '2025-11-25', capabilities: { tools: {} }, serverInfo: { name: 'fixture', version: '1' } } : { tools: [] }
      return res.end(JSON.stringify({ jsonrpc: '2.0', id: data.id, result }))
    }
    res.end(JSON.stringify({ method: req.method, input: data, query: req.url, ok: true, echoed_value: req.headers['x-custom-fixture'] }))
  })
  fixture.listen(0, '127.0.0.1'); await once(fixture, 'listening')
  origin = 'http://127.0.0.1:' + fixture.address().port
})
after(async () => { fixture.closeAllConnections(); await new Promise(resolve => fixture.close(resolve)) })

test('MemoryStore isolates clone values and restores documents and events on rollback', () => {
  const store = new MemoryStore()
  store.put('flows', { id: '1', org_id: 'a', name: 'one' })
  store.get('flows', '1').name = 'mutated'
  assert.equal(store.get('flows', '1').name, 'one')
  assert.throws(() => store.transaction(() => { store.put('flows', { id: '2' }); store.addEvent('x', { type: 'test' }); throw new Error('rollback') }))
  assert.equal(store.get('flows', '2'), null); assert.deepEqual(store.events('x'), [])
  store.addEvent('x', { type: 'start' }); store.addEvent('x', { type: 'end' })
  const copy = new MemoryStore(store.snapshot())
  assert.equal(copy.list('flows', 'a').length, 1)
  assert.equal(copy.events('x', 1)[0].type, 'end')
})

test('bounded event history signals truncation without resetting sequence', () => {
  const store = new MemoryStore()
  for (let i = 0; i < 1002; i++) store.addEvent('x', { type: 'node:finish', count: i })
  const events = store.events('x')
  assert.equal(events[0].type, 'events:truncated'); assert.equal(events.at(-1).sequence, 1002)
  assert.equal(store.addEvent('x', { type: 'end' }), 1003)
})

test('removing executions and organizations removes their retained event data', () => {
  const store = new MemoryStore()
  store.put('organizations', { id: 'org' }); store.put('executions', { id: 'execution', org_id: 'org' }); store.addEvent('execution', { type: 'test' })
  store.delete('organizations', 'org')
  assert.equal(store.get('executions', 'execution'), null); assert.deepEqual(store.events('execution'), [])
  assert.deepEqual(store.snapshot().events, {})
})

test('secretBox fails lazily without a configured server key and detects ciphertext tampering', () => {
  const unconfigured = secretBox(undefined, '')
  assert.throws(() => unconfigured.encrypt({ token: 'value' }), { code: 'TRAMA_KEY_REQUIRED' })
  const box = secretBox(undefined, '11'.repeat(32)), secret = { token: 'fixture-private' }
  const encrypted = box.encrypt(secret)
  assert.ok(!encrypted.includes(secret.token)); assert.deepEqual(box.decrypt(encrypted), secret)
  const parts = encrypted.split('.'); parts[2] = Buffer.from('tampered').toString('base64')
  assert.throws(() => box.decrypt(parts.join('.')))
})

test('network guard rejects literal, DNS and IPv6 private/reserved addresses', async () => {
  for (const address of ['127.0.0.1', '10.2.3.4', '169.254.169.254', '100.64.1.2', '192.168.1.2', '198.18.1.1', '::1', '::ffff:127.0.0.1', 'fd00::1', 'fe80::1', '2001:db8::1', '2002:7f00:1::1']) assert.equal(isPublicAddress(address), false, address)
  for (const address of ['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111']) assert.equal(isPublicAddress(address), true, address)
  await assert.rejects(httpRequest({ url: origin + '/echo' }), { code: 'NETWORK_TARGET_DENIED' })
  const fakeDns = createNetworkFetch({ lookupImpl: async () => [{ address: '127.0.0.1', family: 4 }] })
  await assert.rejects(fakeDns('https://public-looking.example/'), { code: 'NETWORK_TARGET_DENIED' })
})

test('real HTTP and same-origin redirects execute only through trusted fixture transport', async () => {
  const response = await httpRequest({ url: origin + '/echo', method: 'POST', body: { amount: 7 } }, { fetchImpl: localFetch })
  assert.equal(response.body.input.amount, 7); assert.equal(response.code, 200)
  assert.equal((await httpRequest({ url: origin + '/redirect' }, { fetchImpl: localFetch })).code, 200)
  await assert.rejects(httpRequest({ url: origin + '/cross-origin' }, { fetchImpl: localFetch }), { code: 'HTTP_REDIRECT_ORIGIN' })
  let resolutions = 0
  const pinnedFixture = createNetworkFetch({ allowPrivateNetworks: true, lookupImpl: async () => { resolutions++; return [{ address: '127.0.0.1', family: 4 }] } })
  assert.equal((await pinnedFixture('http://fixture.invalid:' + fixture.address().port + '/echo')).status, 200)
  assert.equal(resolutions, 1)
})

test('connector verification and MCP discovery share private-network protection', async () => {
  await assert.rejects(verifyConnectorConnection({ app: 'custom', credentials: { verify_url: origin + '/echo' } }), { code: 'NETWORK_TARGET_DENIED' })
  const deniedMcp = new McpClient({ server_url: origin + '/mcp' }, null)
  await assert.rejects(deniedMcp.initialize(), { code: 'NETWORK_TARGET_DENIED' })
  const allowedMcp = new McpClient({ server_url: origin + '/mcp' }, null, { fetchImpl: localFetch })
  await allowedMcp.initialize(); assert.deepEqual(await allowedMcp.listTools(), []); await allowedMcp.close()
})

test('connection verification redacts credential values included in validation errors', async () => {
  const store = new MemoryStore(), domain = new Domain(store, secretBox(undefined, '44'.repeat(32)))
  const user = { id: 'member' }
  store.put('organizations', { id: 'org', members: [{ user_id: user.id, invite_accepted_at: 'accepted', role: '1' }] })
  const connection = await domain.rpc('createConnection', [{ app: 'supabase', name: 'fixture', credentials: { url: 'https://example.com', api_key: 'fixture-private-key\ninvalid' } }], user, 'org')
  await assert.rejects(domain.rpc('verifyConnection', [connection.id], user, 'org'), error => {
    assert.ok(!error.message.includes('fixture-private-key')); assert.ok(error.message.includes('[REDACTED]')); return true
  })
})

test('manual graph executes actual HTTP and resolves expressions into final return', async () => {
  const flux = { steps: [{ id: 'IN', app: 'webhook' }, { id: '1', app: 'requester', config: { url: origin + '/echo', method: 'POST', body: { value: '{{$IN.BODY.amount}}' } } }, { id: '2', app: 'return', config: { body: '{{$1.body.input}}' } }] }
  const result = await executeGraph({ flux, input: { amount: 13 }, options: { fetchImpl: localFetch } })
  assert.equal(result.status, 'success'); assert.deepEqual(result.response.body, { value: 13 })
  assert.equal(requests.at(-1).data.value, 13)
})

test('connection values under arbitrary header names are removed from public logs', async () => {
  const flux = { steps: [{ id: 'IN', app: 'webhook' }, { id: '1', app: 'requester', connection_id: 'private', config: { url: origin + '/echo' } }] }
  const result = await executeGraph({ flux, getConnection: () => ({ credentials: { headers: JSON.stringify({ 'x-custom-fixture': 'opaque-credential-fixture' }) } }), options: { fetchImpl: localFetch } })
  assert.equal(result.status, 'success'); assert.equal(result.output.body.echoed_value, '[REDACTED]')
  assert.ok(!JSON.stringify(result).includes('opaque-credential-fixture'))
})

test('JavaScript remains explicit unavailable and oversized input is rejected', async () => {
  assert.throws(() => runScript('return process.env'), { code: 'SCRIPT_UNAVAILABLE' })
  const result = await executeGraph({ flux: { steps: [{ id: 'IN', app: 'webhook' }, { id: '1', app: 'code', config: { code: 'return 1' } }] } })
  assert.equal(result.status, 'error'); assert.equal(result.error.code, 'SCRIPT_UNAVAILABLE')
  await assert.rejects(executeGraph({ flux: initialFlow('org'), input: { text: 'x'.repeat(256 * 1024) } }), { code: 'INPUT_LIMIT' })
})

test('multiple loop continuations are rejected before any HTTP effect', async () => {
  const flux = {
    steps: [
      { id: 'IN', app: 'webhook' },
      { id: 'before', app: 'requester', config: { url: origin + '/echo', method: 'POST', body: { stage: 'before-loop' } } },
      { id: 'loop', app: 'for_each', config: { iterable: [1, 2] } },
      { id: 'body', app: 'requester', config: { url: origin + '/echo', method: 'POST', body: { item: '{{$loop.iterable}}' } } },
      { id: 'done', app: 'set_variables', config: { values: { done: true } } },
      { id: 'other', app: 'set_variables', config: { values: { done: true } } },
    ],
    edges: [{ source: 'IN', target: 'before' }, { source: 'before', target: 'loop' }, { source: 'loop', target: 'body', sourceHandle: 'body' }, { source: 'loop', target: 'done', sourceHandle: 'done' }, { source: 'loop', target: 'other', sourceHandle: 'next' }],
  }
  const validation = validateGraph(flux), before = requests.length
  assert.equal(validation.valid, false)
  assert.ok(validation.errors.some(error => error.code === 'MULTIPLE_LOOP_EXITS' && error.nodeId === 'loop'))
  await assert.rejects(executeGraph({ flux, options: { fetchImpl: localFetch } }), { code: 'INVALID_GRAPH' })
  assert.equal(requests.length, before)
})

test('For Each body and continuation aliases keep per-item execution and a single continuation', async () => {
  for (const [bodyHandle, doneHandle] of [['body', 'done'], ['loop', 'next'], ['iterate', 'exit'], ['iteration', 'after'], ['each', 'completed']]) {
    const result = await executeGraph({
      flux: {
        steps: [{ id: 'IN', app: 'webhook' }, { id: 'loop', app: 'for_each', config: { iterable: [2, 3] } }, { id: 'body', app: 'set_variables', config: { values: { doubled: '{{ $loop.iterable * 2 }}' } } }, { id: 'done', app: 'set_variables', config: { values: { rows: '{{$loop.result}}' } } }],
        edges: [{ source: 'IN', target: 'loop' }, { source: 'loop', target: 'body', sourceHandle: bodyHandle }, { source: 'loop', target: 'done', sourceHandle: doneHandle }],
      },
    })
    assert.equal(result.status, 'success', bodyHandle)
    assert.deepEqual(result.steps.filter(step => step.id === 'body').map(step => step.output.doubled), [4, 6])
    assert.equal(result.steps.filter(step => step.id === 'done').length, 1)
    assert.deepEqual(result.context.done.rows, [{ doubled: 4 }, { doubled: 6 }])
  }
})

test('empty loop bodies and legacy unlabeled continuation do not turn continuation into per-item work', async () => {
  for (const items of [[], [1, 2]]) for (const legacy of [false, true]) {
    const flux = { steps: [{ id: 'IN', app: 'webhook' }, { id: 'loop', app: 'for_each', config: { iterable: items } }, { id: 'done', app: 'set_variables', config: { values: { iterations: '{{$loop.iterations}}', rows: '{{$loop.result}}' } } }] }
    if (!legacy) flux.edges = [{ source: 'IN', target: 'loop' }, { source: 'loop', target: 'done' }]
    const result = await executeGraph({ flux })
    assert.equal(result.status, 'success')
    assert.deepEqual(result.context.done, { iterations: items.length, rows: items })
    assert.equal(result.steps.filter(step => step.id === 'done').length, 1)
  }
})

test('nested For Each loops retain each iteration path and run the outer continuation once', async () => {
  const result = await executeGraph({ flux: {
    steps: [{ id: 'IN', app: 'webhook' }, { id: 'outer', app: 'for_each', config: { iterable: [[1, 2], [3]] } }, { id: 'inner', app: 'for_each', config: { iterable: '{{$outer.iterable}}' } }, { id: 'body', app: 'set_variables', config: { values: { value: '{{$inner.iterable}}' } } }, { id: 'done', app: 'set_variables', config: { values: { iterations: '{{$outer.iterations}}' } } }],
    edges: [{ source: 'IN', target: 'outer' }, { source: 'outer', target: 'inner', sourceHandle: 'body' }, { source: 'inner', target: 'body', sourceHandle: 'body' }, { source: 'outer', target: 'done', sourceHandle: 'done' }],
  } })
  assert.equal(result.status, 'success')
  assert.deepEqual(result.steps.filter(step => step.id === 'body').map(step => step.iteration), [[0, 0], [0, 1], [1, 0]])
  assert.deepEqual(result.steps.filter(step => step.id === 'body').map(step => step.output.value), [1, 2, 3])
  assert.equal(result.steps.filter(step => step.id === 'done').length, 1)
  assert.equal(result.context.done.iterations, 2)
})

function agentRuntime(scope = 'agent-flow', store = new MemoryStore()) {
  const box = secretBox(undefined, '77'.repeat(32)), domain = new Domain(store, box), jobs = new Jobs(domain, { autoStart: false })
  const options = { ...jobs.runtimeOptions({ org_id: 'fixture-org', flux_id: scope }), fetchImpl: localFetch }
  return { box, store, domain, jobs, options, memory: options.memory }
}
const fixtureAgentConnection = async id => ({ id, app: 'chatgpt', credentials: { api_key: 'fixture-agent-key-not-real', base_url: origin + '/agent' } })

test('AI agent slots override legacy bindings, call a declared tool and persist encrypted conversation without executing slot nodes', async () => {
  const runtime = agentRuntime(), requestedConnections = [], before = requests.length
  const flux = {
    steps: [
      { id: 'IN', app: 'webhook' },
      { id: 'agent', app: 'ai_agent', connection_id: 'legacy-connection', config: { model: 'legacy-model', provider: 'anthropic', user_prompt: '', HUMAN_MESSAGE: '{{$IN.BODY.question}}', SYSTEM_MESSAGE: 'Agent-owned instruction', max_iterations: 1, SESSION_ID: 'legacy-agent-session', AI_MEMORY: { type: 'in_memory', session_id: 'legacy-agent-session' } } },
      { id: 'model', app: 'chatgpt', config: {}, value: { CONNECTION: 'model-slot', AI_MODEL: 'slot-tool-fixture', AI_PROVIDER: 'openai', AI_MEMORY: { session_id: 'legacy-model-session' }, user_prompt: 'Model must not own the user prompt', system_prompt: 'Model must not own instructions', max_iterations: 0 } },
      { id: 'memory', app: 'memory', config: { AI_MEMORY: { type: 'in_memory', session_id: 'slot-session' } } },
      { id: 'tool', app: 'requester', child_description: 'Consulta uma cidade de exemplo.', config: { url: origin + '/tool-echo', method: 'POST', body: { city: '{{$AI.city}}' }, AI_VARIABLES: [{ name: 'city', description: 'Nome da cidade.' }] } },
      { id: 'done', app: 'return', config: { body: { answer: '{{$agent.response}}' } } },
    ],
    edges: [{ source: 'IN', target: 'agent' }, { source: 'agent', target: 'model', sourceHandle: 'bottom-handle-model' }, { source: 'agent', target: 'memory', sourceHandle: 'bottom-handle-memory' }, { source: 'agent', target: 'tool', sourceHandle: 'bottom-handle-tools' }, { source: 'agent', target: 'done' }],
  }
  const getConnection = async id => { requestedConnections.push(id); assert.equal(id, 'model-slot'); return fixtureAgentConnection(id) }
  const result = await executeGraph({ flux, input: { question: 'Private first question' }, getConnection, options: runtime.options })
  assert.equal(result.status, 'success')
  assert.match(result.response.body.answer, /Belo Horizonte/)
  assert.deepEqual(requestedConnections, ['model-slot'])
  const ownRequests = requests.slice(before), modelRequests = ownRequests.filter(request => request.url === '/agent/chat/completions')
  assert.equal(modelRequests.length, 2)
  assert.equal(modelRequests[0].data.model, 'slot-tool-fixture')
  assert.deepEqual(modelRequests[0].data.messages.slice(0, 2), [{ role: 'system', content: 'Agent-owned instruction' }, { role: 'user', content: 'Private first question' }])
  assert.equal(modelRequests[0].data.tools[0].function.description, 'Consulta uma cidade de exemplo.')
  assert.deepEqual(modelRequests[0].data.tools[0].function.parameters.properties.city, { type: 'string', description: 'Nome da cidade.' })
  assert.deepEqual(ownRequests.find(request => request.url === '/tool-echo').data, { city: 'Belo Horizonte' })
  assert.equal(result.steps.some(step => step.id === 'model' || step.id === 'memory'), false)
  assert.equal(result.steps.filter(step => step.id === 'tool').length, 1)
  assert.equal(result.steps.find(step => step.id === 'tool').tool_of, 'agent')
  assert.deepEqual((await runtime.memory.load('slot-session')).map(message => message.role), ['user', 'assistant', 'tool', 'assistant'])
  assert.deepEqual(await runtime.memory.load('legacy-agent-session'), [])
  assert.deepEqual(await runtime.memory.load('legacy-model-session'), [])
  const memoryRecords = runtime.store.list('memory')
  assert.equal(memoryRecords.length, 1); assert.equal(typeof memoryRecords[0].encrypted, 'string')
  assert.equal(runtime.box.decrypt(memoryRecords[0].encrypted).messages[0].content, 'Private first question')
  assert.ok(!JSON.stringify(runtime.store.snapshot()).includes('Private first question'))
  const second = await executeGraph({ flux, input: { question: 'Private second question' }, getConnection, options: runtime.options })
  assert.equal(second.status, 'success')
  assert.equal(requests.slice(before).filter(request => request.url === '/agent/chat/completions')[2].data.messages.length, 6)
  assert.equal((await runtime.memory.load('slot-session')).length, 8)
  const anotherScope = agentRuntime('other-flow', runtime.store)
  assert.deepEqual(await anotherScope.memory.load('slot-session'), [])
  await runtime.jobs.close(); await anotherScope.jobs.close()
})

test('AI agent rejects duplicate configuration slots and more than 64 tool definitions before any HTTP effect', async () => {
  const baseSteps = [{ id: 'IN', app: 'webhook' }, { id: 'before', app: 'requester', config: { url: origin + '/echo' } }, { id: 'agent', app: 'ai_agent', config: { model: 'slot-memory-fixture', user_prompt: 'Fixture' } }]
  const baseEdges = [{ source: 'IN', target: 'before' }, { source: 'before', target: 'agent' }]
  const variants = [
    { code: 'MULTIPLE_AGENT_MODELS', steps: [{ id: 'one', app: 'chatgpt' }, { id: 'two', app: 'chatgpt' }], edges: [{ source: 'agent', target: 'one', sourceHandle: 'model' }, { source: 'agent', target: 'two', sourceHandle: 'bottom-handle-model' }] },
    { code: 'MULTIPLE_AGENT_MEMORIES', steps: [{ id: 'one', app: 'memory' }, { id: 'two', app: 'memory' }], edges: [{ source: 'agent', target: 'one', sourceHandle: 'memory' }, { source: 'agent', target: 'two', sourceHandle: 'bottom-handle-memory' }] },
    { code: 'AGENT_TOOL_LIMIT', steps: Array.from({ length: 65 }, (_, index) => ({ id: 'tool-' + index, app: 'set_variables', config: { values: {} } })), edges: Array.from({ length: 65 }, (_, index) => ({ source: 'agent', target: 'tool-' + index, sourceHandle: 'tools' })) },
    { code: 'AGENT_TOOL_LIMIT', inline: JSON.stringify(Array.from({ length: 64 }, (_, index) => ({ name: 'inline-' + index }))), steps: [{ id: 'one', app: 'set_variables', config: { values: {} } }], edges: [{ source: 'agent', target: 'one', sourceHandle: 'tool' }] },
  ]
  for (const variant of variants) {
    const steps = structuredClone([...baseSteps, ...variant.steps]);if (variant.inline) steps.find(step => step.id === 'agent').config.tools = variant.inline
    const flux = { steps, edges: [...baseEdges, ...variant.edges] }, before = requests.length
    assert.ok(validateGraph(flux).errors.some(error => error.code === variant.code))
    await assert.rejects(executeGraph({ flux, options: { fetchImpl: localFetch } }), { code: 'INVALID_GRAPH' })
    assert.equal(requests.length, before)
  }
})

test('legacy inline AI agents remain valid at the 64-tool boundary without executing unused tool slots', async () => {
  const flux = {
    steps: [{ id: 'IN', app: 'webhook' }, { id: 'agent', app: 'ai_agent', connection_id: 'inline-model', config: { model: 'slot-memory-fixture', SYSTEM_PROMPT: 'Legacy instruction', HUMAN_MESSAGE: 'Legacy prompt' } }, ...Array.from({ length: 64 }, (_, index) => ({ id: 'tool-' + index, app: 'set_variables', config: { values: {} } }))],
    edges: [{ source: 'IN', target: 'agent' }, ...Array.from({ length: 64 }, (_, index) => ({ source: 'agent', target: 'tool-' + index, sourceHandle: 'tools' }))],
  }, before = requests.length
  const result = await executeGraph({ flux, getConnection: fixtureAgentConnection, options: { fetchImpl: localFetch } })
  assert.equal(result.status, 'success'); assert.deepEqual(result.steps.map(step => step.id), ['IN', 'agent'])
  const provider = requests.slice(before).find(request => request.url === '/agent/chat/completions').data
  assert.equal(provider.tools.length, 64);assert.equal(provider.messages[0].content, 'Legacy instruction')
})

function nestedAgentFlow(parentSession, childSession) {
  return {
    steps: [
      { id: 'IN', app: 'webhook' },
      { id: 'parent', app: 'ai_agent', config: { SYSTEM_MESSAGE: 'Parent rules', HUMAN_MESSAGE: 'Private parent prompt' } },
      { id: 'parent-model', app: 'chatgpt', config: { CONNECTION: 'parent-model', AI_MODEL: 'slot-nested-parent', AI_PROVIDER: 'openai' } },
      { id: 'parent-memory', app: 'memory', config: { AI_MEMORY: { type: 'in_memory', session_id: parentSession } } },
      { id: 'child', app: 'ai_agent', child_description: 'Consulta como ferramenta isolada.', config: { SYSTEM_MESSAGE: 'Child rules', HUMAN_MESSAGE: 'Child city: {{$AI.city}}', AI_VARIABLES: [{ name: 'city', description: 'Nome da cidade.' }] } },
      { id: 'child-model', app: 'chatgpt', config: { CONNECTION: 'child-model', AI_MODEL: 'slot-nested-child', AI_PROVIDER: 'openai' } },
      { id: 'child-memory', app: 'memory', config: { AI_MEMORY: { type: 'in_memory', session_id: childSession } } },
      { id: 'child-private', app: 'set_variables', config: { values: { private: 'child-only' } } },
      { id: 'child-return', app: 'return', config: { body: { answer: '{{$child.response}}' } } },
      { id: 'outer-return', app: 'return', config: { body: { scope: 'outer', answer: '{{$parent.response}}', leaked: '{{$child-private.private}}' } } },
    ],
    edges: [{ source: 'IN', target: 'parent' }, { source: 'parent', target: 'parent-model', sourceHandle: 'model' }, { source: 'parent', target: 'parent-memory', sourceHandle: 'memory' }, { source: 'parent', target: 'child', sourceHandle: 'tools' }, { source: 'parent', target: 'outer-return' }, { source: 'child', target: 'child-model', sourceHandle: 'bottom-handle-model' }, { source: 'child', target: 'child-memory', sourceHandle: 'bottom-handle-memory' }, { source: 'child', target: 'child-private' }, { source: 'child-private', target: 'child-return' }],
  }
}

test('nested AI tools keep child context, response and memory sessions separate from the parent chain', async () => {
  const runtime = agentRuntime('nested-agent-flow'), responses = [], before = requests.length
  const result = await executeGraph({ flux: nestedAgentFlow('parent-session', 'child-session'), getConnection: fixtureAgentConnection, options: { ...runtime.options, onResponse: response => responses.push(response) } })
  assert.equal(result.status, 'success');assert.equal(result.response.body.scope, 'outer');assert.equal(result.response.body.leaked, undefined)
  assert.match(result.response.body.answer, /Child city: Belo Horizonte/)
  assert.equal(result.context['child-private'], undefined)
  assert.equal(responses.length, 1);assert.equal(responses[0].body.scope, 'outer')
  assert.equal(result.steps.filter(step => step.id === 'child').length, 1);assert.equal(result.steps.find(step => step.id === 'child').tool_of, 'parent')
  assert.equal(result.steps.some(step => ['parent-model', 'child-model', 'parent-memory', 'child-memory'].includes(step.id)), false)
  const providerCalls = requests.slice(before).filter(request => request.url === '/agent/chat/completions')
  assert.deepEqual(providerCalls.map(request => request.data.model), ['slot-nested-parent', 'slot-nested-child', 'slot-nested-parent'])
  assert.equal(providerCalls[1].data.tools, undefined)
  assert.deepEqual(providerCalls[1].data.messages.map(message => message.content), ['Child rules', 'Child city: Belo Horizonte'])
  assert.equal((await runtime.memory.load('parent-session'))[0].content, 'Private parent prompt')
  assert.equal((await runtime.memory.load('child-session'))[0].content, 'Child city: Belo Horizonte')
  assert.equal(runtime.store.list('memory').length, 2);assert.ok(!JSON.stringify(runtime.store.snapshot()).includes('Private parent prompt'))
  await runtime.jobs.close()
})

test('nested AI memory reentry is rejected before the child provider call instead of waiting on its parent lock', async () => {
  const runtime = agentRuntime('nested-memory-reentry'), before = requests.length
  const result = await executeGraph({ flux: nestedAgentFlow('shared-session', 'shared-session'), getConnection: fixtureAgentConnection, options: runtime.options })
  assert.equal(result.status, 'error');assert.equal(result.error.code, 'AGENT_TOOL_ERROR');assert.equal(result.error.details.error.code, 'MEMORY_SESSION_REENTRY')
  assert.equal(requests.slice(before).filter(request => request.url === '/agent/chat/completions').length, 1)
  assert.deepEqual(await runtime.memory.load('shared-session'), [])
  await runtime.jobs.close()
})

test('Jobs wait for explicit drain so queued snapshot can be committed before effects', async () => {
  const store = new MemoryStore(), box = secretBox(undefined, '22'.repeat(32)), domain = new Domain(store, box)
  const flow = initialFlow('org'); store.put('flows', flow)
  const jobs = new Jobs(domain, { autoStart: false, runtime: { maxExecutionMs: 30000 } })
  const job = jobs.submit(flow, { message: 'before persist' })
  await Promise.resolve(); assert.equal(store.get('executions', job.execution.id).status, 'queued')
  flow.steps[1].config.values.message = 'changed after submit'
  jobs.drain(); const result = await job.promise; await jobs.idle()
  assert.equal(result.status, 'success'); assert.equal(result.response.body.message, 'before persist')
  assert.ok(store.get('executions', result.id).encrypted_input)
  assert.equal(result.encrypted_input, undefined)
  await jobs.close()
})

test('failed pre-execution checkpoint resolves the job without sending HTTP', async () => {
  const store = new MemoryStore(), domain = new Domain(store, secretBox(undefined, '55'.repeat(32)))
  const flow = { id: 'flow', org_id: 'org', name: 'fixture', steps: [{ id: 'IN', app: 'webhook' }, { id: '1', app: 'requester', config: { url: origin + '/echo' } }] }
  store.put('flows', flow)
  const jobs = new Jobs(domain, { autoStart: false, beforeStart: async () => { throw new Error('checkpoint fixture secret') }, runtime: { fetchImpl: localFetch } })
  const count = requests.length, job = jobs.submit(flow, {})
  jobs.drain(); const result = await job.promise; await jobs.idle()
  assert.equal(result.status, 'error'); assert.equal(result.error.code, 'CHECKPOINT_FAILED')
  assert.ok(!JSON.stringify(result).includes('checkpoint fixture secret')); assert.equal(requests.length, count)
})

test('automatic error handlers also wait for their own persisted queued checkpoint', async () => {
  const store = new MemoryStore(), domain = new Domain(store, secretBox(undefined, '66'.repeat(32)))
  const handler = { id: 'handler', org_id: 'org', name: 'handler', published_version_id: 'published', versions: [{ id: 'published', snapshot: { steps: [{ id: 'IN', app: 'webhook' }, { id: '1', app: 'requester', config: { url: origin + '/echo' } }] } }] }
  const flow = { id: 'main', org_id: 'org', name: 'main', settings: { error_handler_flux_id: handler.id }, steps: [{ id: 'IN', app: 'webhook' }, { id: '1', app: 'code', config: { code: 'return 1' } }] }
  store.put('flows', flow); store.put('flows', handler)
  const checked = [], count = requests.length
  const jobs = new Jobs(domain, { autoStart: false, beforeStart: async execution => {
    checked.push(execution.flux_id)
    assert.equal(store.get('executions', execution.id).status, 'queued')
    if (execution.flux_id === handler.id) throw new Error('handler checkpoint failed')
  }, runtime: { fetchImpl: localFetch } })
  const job = jobs.submit(flow, {}); jobs.drain(); await job.promise; await jobs.idle()
  assert.deepEqual(checked, ['main', 'handler']); assert.equal(requests.length, count)
  assert.equal(store.list('executions').find(execution => execution.flux_id === handler.id).error.code, 'CHECKPOINT_FAILED')
})

test('stale queued and running executions become interrupted without replaying effects', () => {
  const store = new MemoryStore(), domain = new Domain(store, secretBox(undefined, '33'.repeat(32)))
  store.put('executions', { id: 'q', status: 'queued' }); store.put('executions', { id: 'r', status: 'running' })
  const jobs = new Jobs(domain, { autoStart: false }); jobs.recover()
  assert.equal(store.get('executions', 'q').status, 'interrupted'); assert.equal(store.get('executions', 'r').status, 'interrupted')
  assert.equal(jobs.running.size, 0); assert.equal(jobs.waiting.length, 0)
})
