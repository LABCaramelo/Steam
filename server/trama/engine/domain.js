import { randomUUID, randomBytes } from 'node:crypto'
import { passwordHash, checkPassword, token, digest, base32, verifyTotp, redact } from './security.js'
import { initialFlow, initialTemplates, localSubscription } from './initial-data.js'
import { validateGraph } from './runtime/index.js'
import { verifyConnectorConnection } from './connectors/index.js'
import { declaredCredentialSecrets } from './runtime/declarative.js'
import { redact as redactValues } from './runtime/errors.js'
import { getPath, resolveValue } from './shared/expressions.js'

export const uid = () => randomUUID()
export const now = () => new Date().toISOString()
export function problem(message, status = 400, code = 'VALIDATION_ERROR') { return Object.assign(new Error(message), { status, code }) }
const clone = (v) => structuredClone(v)
const required = (v, message) => { if (!String(v ?? '').trim()) throw problem(message); return String(v).trim() }
const paginate = (list, page = 1, perPage = 10) => {
  page = Math.max(1, Number(page) || 1); perPage = Math.min(100, Math.max(1, Number(perPage) || 10))
  const meta = { total: list.length, current_page: page, last_page: Math.max(1, Math.ceil(list.length / perPage)) }
  return { data: list.slice((page - 1) * perPage, page * perPage), meta, pagination: meta }
}
export function publicUser(user) {
  if (!user) return null
  return { id: user.id, fullname: user.fullname, username: user.fullname, email: user.email, phone: user.phone ?? '', profile_image_url: user.profile_image_url ?? null, has_credentials: true, has_document: true, qualified: true, requires_payment_setup: false }
}
export class Domain {
  constructor(store, box) { this.store = store; this.box = box }
  organizations(user) { return this.store.list('organizations').filter(o => o.members.some(m => m.user_id === user.id && m.invite_accepted_at)) }
  organization(user, orgId, admin = false, owner = false) {
    const org = this.store.get('organizations', orgId)
    const member = org?.members.find(m => m.user_id === user.id && m.invite_accepted_at)
    if (!member) throw problem('Organização não encontrada ou acesso negado.', 404, 'NOT_FOUND')
    if ((admin && !['1', '2'].includes(member.role)) || (owner && member.role !== '1')) throw problem('Você não tem permissão para essa ação.', 403, 'FORBIDDEN')
    return org
  }
  flow(user, id) {
    const flow = this.store.get('flows', id)
    if (!flow || !this.organizations(user).some(o => o.id === flow.org_id)) throw problem('Integração não encontrada.', 404, 'NOT_FOUND')
    return this.bindDefinitions(flow)
  }
  bindStep(step, orgId) {
    if (!String(step.app).startsWith('custom:')) return step
    const app = this.store.get('apps', String(step.app).slice(7))
    if (!app || app.org_id !== orgId) {
      // Imported graphs retain their explicit HTTP snapshot without gaining access to another tenant's app.
      if (step.definition?.request) return step
      throw problem('Aplicativo customizado não encontrado. Importe também sua definição.', 404)
    }
    const module = app.modules.find(module => module.id === step.module_id)
    if (!module) throw problem('Módulo customizado não encontrado.', 404)
    return { ...step, title: step.title || app.name, action: module.name, parameters_json: clone(module.parameters_json ?? []), definition: { base: clone(app.base), request: clone(module.request), revision: app.revision, app_id: app.id, module_id: module.id } }
  }
  bindDefinitions(flow) { flow.steps = (flow.steps ?? []).map(step => this.bindStep(step, flow.org_id)); return flow }
  app(user, id, orgId) {
    this.organization(user, orgId)
    const app = this.store.get('apps', id)
    if (!app || app.org_id !== orgId) throw problem('Aplicativo não encontrado.', 404)
    return app
  }
  flowView(flow, executions = true) {
    const { webhook_token, ...view } = flow
    if (executions) view.executions = this.store.list('executions', flow.org_id).filter(e => e.flux_id === flow.id).sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, 200).map(({ snapshot, encrypted_input, encrypted_response, idempotency_key, ...e }) => e)
    else view.executions = []
    return view
  }
  connection(user, id) {
    const conn = this.store.get('connections', id)
    if (!conn) throw problem('Conexão não encontrada.', 404)
    this.organization(user, conn.org_id)
    return conn
  }
  secretConnection(id, orgId) {
    const conn = this.store.get('connections', id)
    if (!conn || conn.org_id !== orgId) throw problem('Conexão indisponível para esta organização.', 403)
    const record = this.store.get('secrets', id)
    return { ...conn, credentials: record ? this.box.decrypt(record.encrypted) : {} }
  }
  templates(orgId) {
    const access = new Set(this.store.list('template_access', orgId).map(item => item.template_id))
    return [...initialTemplates(), ...this.store.list('templates', orgId)].map(template => ({
      ...template,
      owner: template.owner ?? { name: template.author ?? 'Trama' },
      apps: template.apps ?? [...new Set((template.steps ?? []).map(step => step.app))],
      is_active: template.is_active !== false,
      status: template.org_id === orgId ? 'own' : access.has(template.id) ? 'unlocked' : 'locked',
    }))
  }
  state(user, requestedOrg) {
    const organizations = this.organizations(user)
    const orgId = organizations.some(o => o.id === requestedOrg) ? requestedOrg : organizations[0]?.id
    return {
      user: publicUser(user), selected_org_id: orgId ?? null, organizations,
      users: [publicUser(user)], connections: orgId ? this.store.list('connections', orgId) : [],
      fluxes: orgId ? this.store.list('flows', orgId).map(f => this.flowView(f, false)) : [],
      templates: orgId ? this.templates(orgId) : [],
      apps: orgId ? this.store.list('apps', orgId) : [],
      subscription: orgId ? (this.store.get('subscriptions', orgId) ?? localSubscription()) : null,
      billingAddress: this.store.get('addresses', user.id) ?? {}, invoices: [], paymentMethods: [], partners: {},
      capabilities: { payments: false, google_oauth: false, durable_queue: false, database: 'supabase', files: 'r2', runtime: 'node', local: false, manual_execution: true, max_execution_ms: 30000, scheduler: false, external_webhooks: false, javascript: false, shared_organizations: false },
    }
  }
  createAccount({ fullname, email, password }) {
    email = required(email, 'Informe um e-mail.').toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw problem('E-mail inválido.')
    if (this.store.list('users').some(u => u.email === email)) throw problem('Este e-mail já está cadastrado.', 409)
    const user = { id: uid(), email, fullname: required(fullname, 'Informe seu nome.'), password_hash: passwordHash(password), created_at: now(), phone: '' }
    this.store.transaction(() => {
      this.store.put('users', user)
      const org = { id: uid(), name: 'Minha Organização', image: null, members: [{ id: user.id, user_id: user.id, name: user.fullname, email, role: '1', invite_accepted_at: now() }] }
      this.store.put('organizations', org)
      this.store.put('subscriptions', { id: org.id, ...localSubscription() }, org.id)
      this.store.put('flows', initialFlow(org.id))
    })
    return user
  }
  authenticate({ email, password }) {
    const user = this.store.list('users').find(u => u.email === String(email).trim().toLowerCase())
    if (!user || !checkPassword(password, user.password_hash)) throw problem('Credenciais inválidas.', 401, 'INVALID_CREDENTIALS')
    const mfa = this.store.get('mfa', user.id)
    if (mfa?.enabled) {
      const challengeToken = token()
      this.store.put('challenges', { id: digest(challengeToken), user_id: user.id, expires: Date.now() + 300000, attempts: 0 })
      return { requires_mfa: true, mfa_token: challengeToken }
    }
    return { user }
  }
  finishMfa(code, challengeToken, recovery = false) {
    const challenge = this.store.get('challenges', digest(challengeToken))
    if (!challenge || challenge.expires < Date.now() || challenge.attempts >= 5) throw problem('Verificação expirada. Entre novamente.', 401)
    challenge.attempts++; this.store.put('challenges', challenge)
    const mfa = this.store.get('mfa', challenge.user_id)
    const secret = mfa && this.box.decrypt(mfa.encrypted)
    const recoveryHash = digest(String(code).trim())
    if (!(recovery ? secret?.recovery_hashes.includes(recoveryHash) : verifyTotp(secret?.secret ?? '', code))) throw problem('Código de verificação inválido.', 401)
    if (recovery) { secret.recovery_hashes = secret.recovery_hashes.filter(h => h !== recoveryHash); mfa.encrypted = this.box.encrypt(secret); this.store.put('mfa', mfa) }
    this.store.delete('challenges', challenge.id)
    return this.store.get('users', challenge.user_id)
  }
  async rpc(name, args, user, orgId, origin) {
    const [a, b, c] = args
    const store = this.store
    const org = () => this.organization(user, orgId)
    const admin = (id = orgId) => this.organization(user, id, true)
    const savedFlow = (flow) => { this.bindDefinitions(flow); flow.updated_at = now(); store.put('flows', flow); return this.flowView(flow) }
    switch (name) {
      case 'listApps': org(); return store.list('apps', orgId)
      case 'saveApp': {
        admin()
        if (!a || typeof a !== 'object' || Array.isArray(a)) throw problem('Definição de aplicativo inválida.')
        const existing = a.id ? this.app(user, a.id, orgId) : null
        const object = (value, label) => { if (!value || typeof value !== 'object' || Array.isArray(value)) throw problem(label + ' deve ser um objeto JSON.'); return clone(value) }
        const base = object(a.base ?? {}, 'Base')
        if (base.base_url && !/^https?:\/\//i.test(base.base_url)) throw problem('A URL base deve usar HTTP ou HTTPS.')
        if (base.headers) object(base.headers, 'Cabeçalhos da base')
        const entries = (value, label) => {
          if (!Array.isArray(value) || value.length > 100) throw problem(label + ' deve conter até 100 itens.')
          const ids = new Set()
          return value.map(entry => {
            const id = String(entry.id || uid())
            if (ids.has(id)) throw problem('IDs duplicados em ' + label + '.')
            ids.add(id)
            const request = object(entry.request ?? {}, 'Requisição')
            request.method = String(request.method ?? 'GET').toUpperCase()
            if (!['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].includes(request.method)) throw problem('Método HTTP inválido.')
            for (const key of ['headers', 'query']) if (request[key] != null) object(request[key], key)
            if (entry.parameters_json != null && !Array.isArray(entry.parameters_json)) throw problem('Os parâmetros devem ser uma lista de categorias.')
            return { id, name: required(entry.name, 'Informe o nome do módulo ou RPC.').slice(0, 100), description: String(entry.description ?? '').slice(0, 2000), parameters_json: clone(entry.parameters_json ?? []), request, ...(entry.iterate ? { iterate: String(entry.iterate) } : {}), ...(entry.label ? { label: String(entry.label) } : {}), ...(entry.value ? { value: String(entry.value) } : {}) }
          })
        }
        const id = existing?.id ?? uid()
        const app = { id, key: 'custom:' + id, org_id: orgId, owner_id: existing?.owner_id ?? user.id, name: required(a.name, 'Informe o nome do aplicativo.').slice(0, 100), description: String(a.description ?? '').slice(0, 4000), base, modules: entries(a.modules ?? [], 'Módulos'), rpcs: entries(a.rpcs ?? [], 'RPCs'), triggers: [], revision: (existing?.revision ?? 0) + 1, created_at: existing?.created_at ?? now(), updated_at: now() }
        return store.put('apps', app)
      }
      case 'deleteApp': { admin(); const app = this.app(user, a, orgId); store.delete('apps', app.id); return { deleted: true } }
      case 'runAppRpc': {
        const app = this.app(user, a, orgId), rpc = app.rpcs.find(rpc => rpc.id === b)
        if (!rpc) throw problem('RPC não encontrada.', 404)
        const connection = c?.connection_id ? this.secretConnection(c.connection_id, orgId) : null
        const { executeDeclaredRequest } = await import('./runtime/declarative.js')
        const response = await executeDeclaredRequest({ base: app.base, request: rpc.request }, c?.params ?? {}, connection)
        const result = { response }
        if (rpc.iterate) {
          const items = getPath(response, rpc.iterate)
          if (!Array.isArray(items)) throw problem('O caminho iterate da RPC deve apontar para uma lista.', 422)
          result.options = items.map(item => ({ label: resolveValue(rpc.label ?? '{{$ITEM.name}}', { ITEM: item }), value: resolveValue(rpc.value ?? '{{$ITEM.id}}', { ITEM: item }) }))
        }
        return redact(result)
      }
      case 'fetchFluxes': {
        org(); const options = a ?? {}; const term = String(options.searchTerm ?? '').toLowerCase()
        let list = store.list('flows', orgId).filter(f => f.name.toLowerCase().includes(term))
        const key = ['name', 'updated_at', 'created_at'].includes(options.orderBy) ? options.orderBy : 'updated_at'
        list.sort((x, y) => String(x[key]).localeCompare(String(y[key]), 'pt-BR') * (options.reverse === false ? 1 : -1))
        const result = paginate(list.map(f => ({ ...this.flowView(f, false), apps_used: [...new Set(f.steps.filter(s => !['webhook','scheduler'].includes(s.app)).map(s => s.app))] })), options.page, options.perPage)
        return result
      }
      case 'getFlux': return this.flowView(this.flow(user, a))
      case 'createFlux': {
        org(); const f = initialFlow(orgId); f.name = required(a.name, 'Informe o nome da integração.').slice(0, 100)
        if (Array.isArray(a.steps)) { f.steps = a.steps; f.edges = a.edges ?? a.steps.slice(1).map((s, i) => ({ id: uid(), source: String(a.steps[i].id), target: String(s.id) })) }
        if (a.settings) f.settings = a.settings
        if (a.test_input) f.test_input = a.test_input
        return savedFlow(f)
      }
      case 'updateFlux': {
        const f = this.flow(user, a)
        for (const key of ['name','steps','edges','settings','test_input','description','notes']) if (Object.hasOwn(b, key)) f[key] = clone(b[key])
        if (!Array.isArray(f.steps) || f.steps.length > 500) throw problem('O fluxo deve conter até 500 nós.')
        return savedFlow(f)
      }
      case 'toggleFluxStatus': {
        const f = this.flow(user, a)
        if (b && !f.published_version_id) throw problem('Publique uma versão antes de ativar a integração.')
        f.active = !!b
        if (b) f.next_run_at = Date.now()
        return savedFlow(f)
      }
      case 'duplicateFlux': {
        const f = this.flow(user, a); const copy = { ...f, id: uid(), name: f.name + ' (Cópia)', active: false, versions: [], published_version_id: null, webhook_token: token(24), activations: 0, average_execution: null, created_at: now() }
        return savedFlow(copy)
      }
      case 'deleteFlux': { const f = this.flow(user, a); store.delete('flows', f.id); return { deleted: true } }
      case 'saveFluxVersion': {
        const f = this.flow(user, a); const validation = validateGraph(f)
        if (!validation.valid) throw problem(validation.errors.map(e => typeof e === 'string' ? e : e.message).join('; '))
        const snapshot = clone({ steps: f.steps, edges: f.edges, settings: f.settings, test_input: f.test_input })
        const v = { id: uid(), name: 'Versão ' + ((f.versions?.length ?? 0) + 1), active: true, created_at: now(), ...snapshot, snapshot }
        f.versions = [v, ...(f.versions ?? []).map(v => ({ ...v, active: false }))]
        f.published_version_id = v.id
        return savedFlow(f)
      }
      case 'restoreFluxVersion': {
        const f = this.flow(user, a); const v = f.versions?.find(v => v.id === b)
        if (!v) throw problem('Versão não encontrada.', 404)
        Object.assign(f, clone(v.snapshot ?? { steps: v.steps, edges: v.edges }))
        f.versions = f.versions.map(v => ({ ...v, active: v.id === b })); f.published_version_id = b
        return savedFlow(f)
      }
      case 'renameFluxVersion': {
        const f = this.flow(user, a); const v = f.versions?.find(v => v.id === b); if (!v) throw problem('Versão não encontrada.', 404)
        v.name = required(c, 'Informe um nome.').slice(0, 100); return savedFlow(f)
      }
      case 'deleteFluxVersion': {
        const f = this.flow(user, a)
        if (f.published_version_id === b) throw problem('A versão publicada não pode ser excluída.')
        f.versions = (f.versions ?? []).filter(v => v.id !== b); return savedFlow(f)
      }
      case 'fetchConnections': org(); return store.list('connections', orgId).filter(conn => !a || conn.app === a)
      case 'createConnection': {
        org(); if (!a.credentials || typeof a.credentials !== 'object' || !Object.values(a.credentials).some(Boolean)) throw problem('Preencha as credenciais da conexão.')
        const connection = { id: uid(), org_id: orgId, app: required(a.app, 'Selecione um aplicativo.'), name: required(a.name, 'Informe um nome.'), connection_config: a.connection_config ?? 'API Key', verified: false, created_at: now(), configured: true }
        store.transaction(() => { store.put('connections', connection); store.put('secrets', { id: connection.id, org_id: orgId, encrypted: this.box.encrypt(a.credentials) }) })
        return connection
      }
      case 'fetchUserApps': {
        org(); const counts = new Map()
        for (const connection of store.list('connections', orgId)) { const entry = counts.get(connection.app) ?? { app_id: connection.app, app_name: connection.app, total_connections: 0 }; entry.total_connections++; counts.set(connection.app, entry) }
        return [...counts.values()]
      }
      case 'verifyConnection':
      case 'reauthorizeConnection': {
        const conn = this.connection(user, a)
        const secret = this.secretConnection(conn.id, conn.org_id)
        const hiddenValues = declaredCredentialSecrets(secret)
        try {
          const result = await verifyConnectorConnection(secret, { timeout: 15000 })
          conn.verified = result?.valid ?? result?.verified ?? result?.connection_activated ?? result?.ok ?? (Number(result?.code) >= 200 && Number(result?.code) < 300)
          conn.last_verified_at = now(); store.put('connections', conn)
          return { ...redactValues(result, hiddenValues), connection_activated: conn.verified }
        } catch (error) { conn.verified = false; store.put('connections', conn); throw problem(redactValues(error.message || 'A conexão não pôde ser verificada.', hiddenValues), 422, error.code) }
      }
      case 'renameConnection': { const conn = this.connection(user, a); conn.name = required(b, 'Informe um nome.'); return store.put('connections', conn) }
      case 'updateConnection': {
        const conn = this.connection(user, a)
        if (b.credentials) store.put('secrets', { id: conn.id, org_id: conn.org_id, encrypted: this.box.encrypt(b.credentials) })
        conn.name = b.name ?? conn.name; conn.verified = false; return store.put('connections', conn)
      }
      case 'deleteConnection': {
        const conn = this.connection(user, a); store.delete('connections', conn.id); store.delete('secrets', conn.id); return { deleted: true }
      }
      case 'fetchOrganizations': return this.organizations(user)
      case 'createOrganization': {
        const organization = { id: uid(), name: required(a, 'Informe um nome.'), image: null, members: [{ id: user.id, user_id: user.id, name: user.fullname, email: user.email, role: '1', invite_accepted_at: now() }] }
        store.put('organizations', organization); store.put('subscriptions', { id: organization.id, ...localSubscription() }, organization.id); return organization
      }
      case 'updateOrganization': {
        const organization = admin(a.id)
        if (a.name) organization.name = String(a.name).slice(0, 100)
        if (a.image !== undefined) organization.image = a.image
        return store.put('organizations', organization)
      }
      case 'deleteOrganization': {
        const organization = this.organization(user, a, true, true)
        store.transaction(() => { for (const collection of ['flows','connections','executions','subscriptions','secrets','templates','template_access','apps','memory','accumulators','usage']) for (const item of store.list(collection, organization.id)) store.delete(collection, item.id); store.delete('organizations', organization.id) })
        return { deleted: true }
      }
      case 'countOrgFluxes': this.organization(user, a); return store.list('flows', a).length
      case 'listOrgMembers': {
        const organization = this.organization(user, a); const search = (b?.search ?? '').toLowerCase()
        return paginate(organization.members.filter(m => (m.name + ' ' + m.email).toLowerCase().includes(search)), b?.page, b?.perPage)
      }
      case 'inviteOrgUser': {
        const organization = admin(a); const email = required(b.email, 'Informe um e-mail.').toLowerCase()
        if (!['2','3'].includes(b.role)) throw problem('Selecione Administrador ou Desenvolvedor.')
        if (organization.members.some(m => m.email === email)) throw problem('Este usuário já foi convidado.')
        const invitation = token(); const member = { id: uid(), name: email.split('@')[0], email, role: b.role, invite_accepted_at: null }
        organization.members.push(member); store.put('organizations', organization)
        store.put('invitations', { id: digest(invitation), organization_id: organization.id, member_id: member.id, email, expires: Date.now() + 7 * 86400000 })
        return { ...member, invite_link: origin + '/project/' + a + '/accept-invite?token=' + invitation }
      }
      case 'acceptInvite': {
        const invitation = store.get('invitations', digest(a))
        if (!invitation || invitation.expires < Date.now() || invitation.email !== user.email) throw problem('Convite inválido, expirado ou destinado a outro e-mail.')
        const organization = store.get('organizations', invitation.organization_id); const member = organization?.members.find(m => m.id === invitation.member_id)
        if (!member) throw problem('Convite inválido.')
        Object.assign(member, { user_id: user.id, name: user.fullname, invite_accepted_at: now() }); store.put('organizations', organization); store.delete('invitations', invitation.id); return organization
      }
      case 'updateOrgUserRole': {
        const organization = admin(a); const member = organization.members.find(m => m.id === b)
        if (!member || !['1','2','3'].includes(c)) throw problem('Membro ou papel inválido.')
        if (c === '1' && !member.invite_accepted_at) throw problem('O membro precisa aceitar o convite antes de receber a propriedade.')
        const me = organization.members.find(m => m.user_id === user.id)
        if (c === '1' || member.role === '1') { if (me.role !== '1') throw problem('Apenas o proprietário pode transferir a propriedade.', 403); if (c !== '1') throw problem('Transfira a propriedade para outro membro primeiro.'); me.role = '2' }
        member.role = c; return store.put('organizations', organization)
      }
      case 'removeOrgUsers': {
        const organization = admin(a)
        organization.members = organization.members.filter(m => !(b ?? []).includes(m.id) || m.role === '1')
        return store.put('organizations', organization)
      }
      case 'getSubscription': org(); return store.get('subscriptions', orgId) ?? localSubscription()
      case 'subscribe':
      case 'cancelSubscription':
      case 'addPaymentMethod':
      case 'setDefaultPaymentMethod':
      case 'deletePaymentMethod':
      case 'requestPartnerWithdraw': throw problem('Este servidor local não possui processador de pagamentos configurado.', 501, 'PAYMENTS_NOT_CONFIGURED')
      case 'listInvoices': return paginate([], a, b)
      case 'listPaymentMethods': return []
      case 'getBillingAddress': return store.get('addresses', user.id) ?? {}
      case 'saveBillingAddress': return store.put('addresses', { ...a, id: user.id })
      case 'requestCancellation': store.put('requests', { id: uid(), user_id: user.id, kind: 'cancellation', reason: a.reason, created_at: now() }); return { recorded: true }
      case 'fetchPartnerInfo': throw problem('Não há conta de parceiro configurada neste servidor.', 404)
      case 'fetchPartnerEarnings': return paginate([], a, b)
      case 'listTemplates': return this.templates(org().id)
      case 'unlockTemplate': {
        const template = initialTemplates().find(t => t.id === a) ?? store.get('templates', a)
        if (!template || (template.org_id && template.org_id !== orgId)) throw problem('Template não encontrado.', 404)
        if (Number(template.price) > 0) throw problem('Configure um processador de pagamentos para desbloquear templates pagos.', 501)
        store.put('template_access', { id: orgId + ':' + template.id, org_id: orgId, template_id: template.id, unlocked_at: now() })
        return { ...template, status: 'unlocked' }
      }
      case 'downloadTemplate': {
        const template = initialTemplates().find(t => t.id === a) ?? store.get('templates', a)
        if (!template || (template.org_id && template.org_id !== orgId)) throw problem('Template não encontrado.', 404)
        if (Number(template.price) > 0 && template.org_id !== orgId && !store.get('template_access', orgId + ':' + template.id)) throw problem('Template não desbloqueado.', 403)
        store.put('template_access', { id: orgId + ':' + template.id, org_id: orgId, template_id: template.id, unlocked_at: now() })
        return { name: template.name, steps: template.steps, edges: template.edges, settings: template.settings, test_input: template.test_input }
      }
      case 'updateTemplate': {
        org(); const existing = store.get('templates', a)
        if (existing && existing.org_id !== orgId) throw problem('Acesso negado.', 403)
        const price = Number(b.price ?? existing?.price ?? 0)
        if (!Number.isInteger(price) || price < 0) throw problem('Preço inválido.')
        return store.put('templates', { ...existing, ...b, id: a || uid(), org_id: orgId, status: 'own', price, is_active: true, owner_id: user.id, owner: { id: user.id, name: user.fullname }, author: user.fullname })
      }
      case 'deleteTemplate': { const template = store.get('templates', a); if (!template || template.org_id !== orgId) throw problem('Template não encontrado.', 404); store.delete('templates', a); return { deleted: true } }
      case 'updateProfile':
      case 'savePhone':
      case 'updateProfileImage': {
        const current = store.get('users', user.id)
        if (name === 'savePhone') current.phone = String(b).slice(0, 40)
        else if (name === 'updateProfileImage') { if (!/^data:image\/(png|jpeg|webp);base64,/.test(b) || b.length > 1500000) throw problem('Envie uma imagem PNG, JPEG ou WebP de até 1 MB.'); current.profile_image_url = b }
        else { current.fullname = required(b.fullname, 'Informe seu nome.').slice(0, 100); current.phone = String(b.phone ?? '').slice(0, 40) }
        store.put('users', current); return publicUser(current)
      }
      case 'changePassword': {
        if (!checkPassword(b.current, user.password_hash)) throw problem('Senha atual incorreta.', 401)
        user.password_hash = passwordHash(b.next); store.put('users', user); return { changed: true }
      }
      case 'getMfaStatus': return { enabled: !!store.get('mfa', user.id)?.enabled, mfa_enabled: !!store.get('mfa', user.id)?.enabled }
      case 'enableMfa': {
        const secret = base32(randomBytes(20)); const recoveryCodes = Array.from({ length: 8 }, () => token(6))
        store.put('mfa', { id: user.id, enabled: false, encrypted: this.box.encrypt({ secret, recovery_hashes: recoveryCodes.map(digest) }) })
        return { secret, recovery_codes: recoveryCodes, otpauth_url: 'otpauth://totp/Trama:' + encodeURIComponent(user.email) + '?secret=' + secret + '&issuer=Trama&digits=6&period=30' }
      }
      case 'confirmMfa': {
        const record = store.get('mfa', user.id); if (!record || !verifyTotp(this.box.decrypt(record.encrypted).secret, b)) throw problem('Código inválido.')
        record.enabled = true; store.put('mfa', record); return { enabled: true }
      }
      case 'disableMfa': {
        const record = store.get('mfa', user.id); const secret = record && this.box.decrypt(record.encrypted)
        const valid = c === 'recovery' ? secret?.recovery_hashes.includes(digest(b)) : verifyTotp(secret?.secret ?? '', b)
        if (!valid) throw problem('Código inválido.')
        store.delete('mfa', user.id); return { enabled: false }
      }
      case 'submitQualification': return publicUser(user)
      case 'googleSignIn': throw problem('Configure um cliente OAuth Google no servidor para usar esta autenticação.', 501, 'OAUTH_NOT_CONFIGURED')
      case 'resetPasswordSendEmail':
      case 'resetPassword': throw problem('Configure o serviço de e-mail e o fluxo de recuperação antes de redefinir senhas.', 501, 'EMAIL_NOT_CONFIGURED')
      default: throw problem('Operação não disponível: ' + name, 404, 'UNKNOWN_OPERATION')
    }
  }
}
