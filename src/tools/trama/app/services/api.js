import { reactive, watch } from 'vue'
import { getApp } from './apps'
import { useSession } from '@trama/composables/useSession'
import { tramaFetch, setTransportOwner } from './transport'

// The browser holds a view of server state. Credentials and the database stay on the server.
const emptyState = () => ({
  users: [], organizations: [], fluxes: [], connections: [], templates: [], apps: [],
  subscription: null, billingAddress: {}, paymentMethods: [], invoices: [],
  partners: {}, qualifications: {}, cancellationRequests: [], capabilities: {},
})
export const db = reactive(emptyState())
export const apiStatus = reactive({ ready: false, online: true, setupRequired: false, error: '' })
const session = useSession()
let epoch = 0

export function resetSessionState(userId) {
  epoch++
  setTransportOwner(userId)
  session.setUser(null)
  session.ready.value = false
  session.selectOrg(null)
  Object.assign(db, emptyState())
  Object.assign(apiStatus, { ready: false, online: true, setupRequired: false, error: '' })
}

function apiError(message, status = 0, code = 'API_ERROR') {
  return Object.assign(new Error(message), { userMessage: message, status, code })
}
async function jsonRequest(path, options = {}) {
  let response
  try {
    response = await tramaFetch(path, {
      credentials: 'same-origin',
      ...options,
      headers: { Accept: 'application/json', ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    apiStatus.online = false
    throw apiError(error.message || 'Não foi possível conectar à Trama. Tente novamente.', error.status || 0, 'NETWORK_ERROR')
  }
  let data
  try { data = await response.json() } catch { throw apiError('O servidor retornou uma resposta inválida.', response.status) }
  apiStatus.online = true
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/rpc/login') && !path.startsWith('/rpc/register')) session.setUser(null)
    throw apiError(data.error?.message || (typeof data.error === 'string' ? data.error : data.message) || 'Não foi possível concluir a operação.', response.status, data.error?.code || data.code)
  }
  return data
}
function hydrate(state, requestedOrg) {
  if (!state || typeof state !== 'object') return
  // An old request must not replace the newly selected organization's data.
  if (requestedOrg && session.selectedOrgId.value && requestedOrg !== session.selectedOrgId.value) return
  for (const key of Object.keys(emptyState())) if (Object.hasOwn(state, key)) db[key] = state[key]
  if (Object.hasOwn(state, 'user')) session.setUser(state.user)
  if (state.selected_org_id !== undefined && state.selected_org_id !== session.selectedOrgId.value) session.selectOrg(state.selected_org_id, false)
}
export async function refreshState() {
  if (!session.user.value) { Object.assign(db, emptyState()); return }
  const currentEpoch = epoch
  const requestedOrg = session.selectedOrgId.value
  const state = await jsonRequest('/state' + (requestedOrg ? '?org_id=' + encodeURIComponent(requestedOrg) : ''))
  if (currentEpoch === epoch) hydrate(state.state ?? state, requestedOrg)
  return state
}
export async function initializeApi() {
  const currentEpoch = epoch
  try {
    const info = await jsonRequest('/session')
    if (currentEpoch !== epoch) return
    apiStatus.setupRequired = !!info.setup_required
    session.setUser(info.user ?? null)
    if (info.user) await refreshState()
    else Object.assign(db, emptyState())
    apiStatus.error = ''
  } catch (error) {
    if (currentEpoch !== epoch) return
    session.setUser(null)
    apiStatus.error = error.userMessage || error.message
  } finally {
    if (currentEpoch === epoch) { apiStatus.ready = true; session.markReady() }
  }
}
async function call(name, ...args) {
  const currentEpoch = epoch
  const orgId = session.selectedOrgId.value
  const payload = await jsonRequest('/rpc/' + encodeURIComponent(name), { method: 'POST', body: { args, org_id: orgId } })
  if (currentEpoch === epoch && payload.state) hydrate(payload.state, orgId)
  return Object.hasOwn(payload, 'result') ? payload.result : payload
}
async function auth(name, ...args) {
  const result = await call(name, ...args)
  if (!result?.requires_mfa) {
    const user = result?.user ?? result
    if (user?.email) { session.setUser(user); await refreshState(); apiStatus.setupRequired = false }
  }
  return result?.user ?? result
}
export const loginAccount = values => auth('loginAccount', values)
export const registerAccount = values => auth('registerAccount', values)
export const loginWithMfaCode = (code, token) => auth('loginWithMfaCode', code, token)
export const loginWithRecoveryCode = (code, token) => auth('loginWithRecoveryCode', code, token)
export const googleSignIn = values => call('googleSignIn', values)
export const consumeAuthToken = value => auth('consumeAuthToken', value)
export async function logoutAccount() {
  await jsonRequest('/logout', { method: 'POST' })
  epoch++
  session.setUser(null)
  Object.assign(db, emptyState())
}
watch(session.selectedOrgId, (next, previous) => {
  if (apiStatus.ready && session.user.value && next && next !== previous) refreshState().catch(error => { apiStatus.error = error.userMessage || error.message })
})

export function resetDemoData() { throw apiError('Os dados são persistidos no servidor. Exclua itens pela interface para removê-los.') }
export const QUALIFICATION_QUESTIONS = [
  { id_question: 1, tab_key: 'tel_number', question: 'Qual seu número de telefone?', options: [] },
  { id_question: 2, tab_key: 'job_title', question: 'Quais das opções abaixo melhor descreve sua posição?', options: ['Desenvolvimento / Engenharia', 'Suporte / Operações', 'Produto / Gestão de projetos', 'Freelancer / Consultoria', 'Vendas / Desenvolvimento de negócio', 'Análise de dados', 'Marketing / Growth', 'Outro'] },
  { id_question: 3, tab_key: 'lead_origin', question: 'Como você conheceu a Trama?', options: ['Facebook', 'Instagram', 'YouTube', 'LinkedIn', 'Indicação', 'Pesquisa online', 'Outro'] },
  { id_question: 4, tab_key: 'integrations_experience', question: 'Como você descreveria sua experiência com integrações?', options: ['Eu não tenho nenhuma experiência com integrações', 'Eu já utilizei outras plataformas de integração', 'Eu já desenvolvi minhas próprias integrações sozinho(a)'] },
  { id_question: 5, tab_key: 'apps_selection', question: 'Selecione os softwares que você deseja integrar ao nosso sistema', options: [] },
  { id_question: 6, tab_key: 'end', question: '', options: [] },
]
export const savePhone = (...args) => call('savePhone', ...args)
export async function submitQualification(...args) {
  const result = await call('submitQualification', ...args)
  if (result?.user && result?.fluxId) return result
  const currentOrg = session.selectedOrgId.value
  const flow = db.fluxes.find(item => item.org_id === currentOrg)
  return { user: result?.user ?? result, orgId: currentOrg, fluxId: flow?.id }
}
export const resetPasswordSendEmail = (...args) => call('resetPasswordSendEmail', ...args)
export const resetPassword = (...args) => call('resetPassword', ...args)
export const updateProfile = (...args) => call('updateProfile', ...args)
export const updateProfileImage = (...args) => call('updateProfileImage', ...args)
export const changePassword = (...args) => call('changePassword', ...args)
export async function getMfaStatus(...args) {
  const result = await call('getMfaStatus', ...args)
  return { ...result, two_factor_enabled: !!(result.two_factor_enabled ?? result.enabled ?? result.mfa_enabled), pending_confirmation: !!result.pending_confirmation }
}
export const enableMfa = (...args) => call('enableMfa', ...args)
export async function confirmMfa(...args) { const result = await call('confirmMfa', ...args); return { ...result, two_factor_enabled: !!(result.two_factor_enabled ?? result.enabled) } }
export const disableMfa = (...args) => call('disableMfa', ...args)

export function orgFluxes(orgId = session.selectedOrgId.value) { return db.fluxes.filter(flow => flow.org_id === orgId) }
export const fetchFluxes = (options = {}) => call('fetchFluxes', options)
export const getFlux = (...args) => call('getFlux', ...args)
export const createFlux = (...args) => call('createFlux', ...args)
export const updateFlux = (...args) => call('updateFlux', ...args)
export const toggleFluxStatus = (...args) => call('toggleFluxStatus', ...args)
export const duplicateFlux = (...args) => call('duplicateFlux', ...args)
export const deleteFlux = (...args) => call('deleteFlux', ...args)
export const saveFluxVersion = (...args) => call('saveFluxVersion', ...args)
export const restoreFluxVersion = (...args) => call('restoreFluxVersion', ...args)
export const renameFluxVersion = (...args) => call('renameFluxVersion', ...args)
export const deleteFluxVersion = (...args) => call('deleteFluxVersion', ...args)
export const replayExecution = (...args) => call('replayExecution', ...args)
export const buildFluxFromPrompt = (...args) => call('buildFluxFromPrompt', ...args)

export async function cancelExecution(id) {
  return jsonRequest('/executions/' + encodeURIComponent(id) + '/cancel', { method: 'POST', body: {} })
}
export async function runFlux(id, { input, onEvent, signal } = {}) {
  let executionId
  let finalExecution
  const cancel = () => {
    if (executionId) tramaFetch('/executions/' + encodeURIComponent(executionId) + '/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', keepalive: true }).catch(() => {})
  }
  signal?.addEventListener('abort', cancel, { once: true })
  try {
    const response = await tramaFetch('/flows/' + encodeURIComponent(id) + '/run', {
      method: 'POST', credentials: 'same-origin', signal,
      headers: { Accept: 'application/x-ndjson', 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, org_id: session.selectedOrgId.value }),
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw apiError(payload.error?.message || payload.message || 'Não foi possível executar a integração.', response.status, payload.error?.code)
    }
    if (!response.headers.get('content-type')?.includes('ndjson')) {
      const payload = await response.json()
      finalExecution = payload.execution ?? payload.result ?? payload
      onEvent?.({ type: 'execution:finish', execution: finalExecution })
    } else {
      const reader = response.body?.getReader()
      if (!reader) throw apiError('O servidor não disponibilizou os eventos da execução.')
      const decoder = new TextDecoder()
      let buffer = ''
      const consume = line => {
        if (!line.trim()) return
        let event
        try { event = JSON.parse(line) } catch { throw apiError('Evento de execução inválido.') }
        executionId ??= event.executionId || event.execution_id || event.execution?.id
        if (event.type === 'execution:finish') finalExecution = event.execution ?? event.result ?? event.data
        if (event.type === 'error' && !event.execution) throw apiError(event.error?.message || event.message || 'A execução falhou.')
        onEvent?.(event)
      }
      try {
        while (true) {
          const { value, done } = await reader.read()
          buffer += decoder.decode(value, { stream: !done })
          let split
          while ((split = buffer.indexOf('\n')) !== -1) { consume(buffer.slice(0, split)); buffer = buffer.slice(split + 1) }
          if (done) break
        }
        if (buffer.trim()) consume(buffer)
      } finally { reader.releaseLock() }
    }
    if (!finalExecution) throw apiError('A transmissão terminou antes do resultado da execução.')
    return finalExecution
  } finally {
    signal?.removeEventListener('abort', cancel)
    if (session.user.value) refreshState().catch(() => {})
  }
}
export async function testFluxStep(fluxId, stepId, payload = {}) {
  const result = await jsonRequest('/flows/' + encodeURIComponent(fluxId) + '/nodes/' + encodeURIComponent(stepId) + '/test', { method: 'POST', body: { ...payload, org_id: session.selectedOrgId.value } })
  return result.execution ?? result.result ?? result
}
export const getWebhookInfo = id => jsonRequest('/flows/' + encodeURIComponent(id) + '/webhook')
export const getWebhookCapture = id => jsonRequest('/flows/' + encodeURIComponent(id) + '/webhook/capture')
export async function rotateWebhookToken(id) {
  await jsonRequest('/flows/' + encodeURIComponent(id) + '/webhook/rotate', { method: 'POST', body: {} })
  return getWebhookInfo(id)
}
export const getExecution = id => jsonRequest('/executions/' + encodeURIComponent(id))

export async function fetchConnections(appFilter = null) {
  const list = await call('fetchConnections', appFilter)
  return list.map(connection => ({ ...connection, app_name: db.apps.find(app => app.key === connection.app)?.name ?? getApp(connection.app).title }))
}
export const createConnection = (...args) => call('createConnection', ...args)
export const updateConnection = (...args) => call('updateConnection', ...args)
export async function fetchUserApps() {
  const list = await call('fetchUserApps')
  return list.map(app => ({ ...app, app_name: db.apps.find(custom => custom.key === app.app_id)?.name ?? getApp(app.app_id).title }))
}
export const verifyConnection = (...args) => call('verifyConnection', ...args)
export const reauthorizeConnection = (...args) => call('reauthorizeConnection', ...args)
export const renameConnection = (...args) => call('renameConnection', ...args)
export const deleteConnection = (...args) => call('deleteConnection', ...args)
export const listApps = (...args) => call('listApps', ...args)
export const saveApp = (...args) => call('saveApp', ...args)
export const deleteApp = (...args) => call('deleteApp', ...args)
export const runAppRpc = (...args) => call('runAppRpc', ...args)

export const listTemplates = (...args) => call('listTemplates', ...args)
export const unlockTemplate = (...args) => call('unlockTemplate', ...args)
export const updateTemplate = (...args) => call('updateTemplate', ...args)
export const deleteTemplate = (...args) => call('deleteTemplate', ...args)
export async function downloadTemplate(id, { download = true } = {}) {
  const template = await call('downloadTemplate', id)
  if (!download) return template
  const link = document.createElement('a')
  const url = URL.createObjectURL(new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' }))
  link.href = url; link.download = (template.name || id) + '.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  return template
}
export const PLUS_PLAN = { key: 'plus', title: 'Plus', price: 'R$ 29,90', installments: 12, operations: 1000000, tier: 9 }
export const getSubscription = (...args) => call('getSubscription', ...args)
export const subscribe = (plan = PLUS_PLAN) => call('subscribe', plan)
export const cancelSubscription = (...args) => call('cancelSubscription', ...args)
export const requestCancellation = (...args) => call('requestCancellation', ...args)
export const listInvoices = (page = 1, perPage = 10) => call('listInvoices', page, perPage)
export const getBillingAddress = (...args) => call('getBillingAddress', ...args)
export const saveBillingAddress = (...args) => call('saveBillingAddress', ...args)
export const listPaymentMethods = (...args) => call('listPaymentMethods', ...args)
export const addPaymentMethod = (...args) => call('addPaymentMethod', ...args)
export const setDefaultPaymentMethod = (...args) => call('setDefaultPaymentMethod', ...args)
export const deletePaymentMethod = (...args) => call('deletePaymentMethod', ...args)

export const ORG_ROLES = { OWNER: '1', ADMIN: '2', DEVELOPER: '3' }
export function currentUserRole(orgId) {
  const user = session.user.value
  return db.organizations.find(org => org.id === orgId)?.members?.find(member => !!member.invite_accepted_at && (member.user_id === user?.id || member.email?.toLowerCase() === user?.email?.toLowerCase()))?.role ?? null
}
export function visibleOrganizations() {
  const user = session.user.value
  return user ? db.organizations.filter(org => org.members?.some(member => !!member.invite_accepted_at && (member.user_id === user.id || member.email?.toLowerCase() === user.email?.toLowerCase()))) : []
}
export const isOrgOwner = orgId => currentUserRole(orgId) === ORG_ROLES.OWNER
export const isOrgAdmin = orgId => [ORG_ROLES.OWNER, ORG_ROLES.ADMIN].includes(currentUserRole(orgId))
export const fetchOrganizations = (...args) => call('fetchOrganizations', ...args)
export const createOrganization = (...args) => call('createOrganization', ...args)
export const updateOrganization = (...args) => call('updateOrganization', ...args)
export const deleteOrganization = (...args) => call('deleteOrganization', ...args)
export const countOrgFluxes = (...args) => call('countOrgFluxes', ...args)
export const listOrgMembers = (orgId, options = {}) => call('listOrgMembers', orgId, options)
export const inviteOrgUser = (...args) => call('inviteOrgUser', ...args)
export const acceptInvite = (...args) => call('acceptInvite', ...args)
export const updateOrgUserRole = (...args) => call('updateOrgUserRole', ...args)
export const removeOrgUsers = (...args) => call('removeOrgUsers', ...args)
export function partnerData() { return db.partners?.[session.user.value?.email] ?? null }
export const fetchPartnerInfo = (...args) => call('fetchPartnerInfo', ...args)
export const fetchPartnerEarnings = (page = 1, perPage = 10) => call('fetchPartnerEarnings', page, perPage)
export const requestPartnerWithdraw = (...args) => call('requestPartnerWithdraw', ...args)
