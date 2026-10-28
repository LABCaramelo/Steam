import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { MemoryStore } from './memory-store.mjs'
import { secretBox } from './engine/security.js'
import { Domain } from './engine/domain.js'
import { Jobs } from './engine/jobs.js'
import { initialFlow } from './engine/initial-data.js'
import { executeGraph, httpRequest, runScript } from './engine/runtime/index.js'
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
