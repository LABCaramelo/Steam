import { randomUUID } from 'node:crypto'

export function initialFlow(orgId) {
  return {
    id: randomUUID(), org_id: orgId, name: 'Primeiro fluxo', active: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    activations: 0, average_execution: null, premium: false, first: false,
    steps: [
      { id: 'IN', app: 'webhook', action: 'Gatilho', config: {}, position: { x: 0, y: 0 } },
      { id: '1', app: 'set_variables', action: 'Definir variáveis', config: { values: { message: '{{$IN.BODY.message}}' } }, position: { x: 270, y: 0 } },
      { id: '2', app: 'return', action: 'Retorno', config: { status: 200, body: { message: '{{$1.message}}', ok: true } }, position: { x: 540, y: 0 } },
    ],
    edges: [{ id: 'IN-1', source: 'IN', target: '1' }, { id: '1-2', source: '1', target: '2' }],
    test_input: { message: 'Olá, Trama!' }, settings: { minimap: true, halt_on_error: false },
    versions: [], executions: [], webhook_token: randomUUID().replaceAll('-', ''),
  }
}
export const localSubscription = () => ({ plan_name: 'LAB', tier: 10, tier_name: 'lab', product: { name: 'Trama / LAB', tier: 10 }, quantity_plan: 1000000, quantity_used: 0, is_unlimited_plan: 1, local: false, delinquent: 0 })
export const initialTemplates = () => [{
  id: 'template-http', name: 'Webhook → HTTP → retorno', description: 'Recebe JSON, chama uma API configurada e retorna a resposta.', author: 'Trama', owner: { name: 'Trama' }, apps: ['webhook', 'requester', 'return'], price: 0, status: 'locked', is_active: true,
  steps: [{ id: 'IN', app: 'webhook', action: 'Gatilho', config: {} }, { id: '1', app: 'requester', action: 'Requisição HTTP', config: { method: 'POST', url: '', body: '{{$IN.BODY}}' } }, { id: '2', app: 'return', action: 'Retorno', config: { status: 200, body: '{{$1.body}}' } }],
}]
