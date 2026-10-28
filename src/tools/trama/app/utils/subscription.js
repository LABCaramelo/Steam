// Mesma lógica de bloqueio do original (subscriptionUtils).
const UNLIMITED_TIERS = [5, 6, 7, 8, 10]
const UNLIMITED_QUANTITY = 1e6

const MESSAGES = {
  billing: {
    title: 'Conta bloqueada',
    text: {
      integration: 'Sua conta está bloqueada por falta de pagamento. Regularize para ativar suas integrações.',
      test: 'Sua conta está bloqueada por falta de pagamento. Regularize para executar testes.',
    },
  },
  free: {
    title: 'O plano gratuito não inclui integrações',
    text: {
      integration: 'O plano gratuito não possui operações disponíveis. Para utilizar a plataforma, seja premium.',
      test: 'O plano gratuito não possui operações disponíveis. Para utilizar a plataforma, seja premium.',
    },
  },
  limit: {
    title: 'Limite atingido',
    text: {
      integration: 'Você atingiu o limite do seu plano. Faça upgrade para continuar.',
      test: 'Você atingiu o limite do seu plano. Faça upgrade para continuar.',
    },
  },
}

export function isUnlimited(sub) {
  if (!sub) return false
  return Number(sub.is_unlimited_plan) === 1 || UNLIMITED_TIERS.includes(Number(sub.tier)) || Number(sub.quantity_plan) >= UNLIMITED_QUANTITY
}

function blocked(reason, kind) {
  const msg = MESSAGES[reason]
  return { isBlocked: true, reason, title: msg.title, text: msg.text[kind] }
}

export function getBlockState(sub, kind = 'integration') {
  if (sub && Number(sub.delinquent) === 1) return blocked('billing', kind)
  if (!sub || Number(sub.tier) === 0) return blocked('free', kind)
  if (!isUnlimited(sub) && Number(sub.quantity_used) >= Number(sub.quantity_plan)) return blocked('limit', kind)
  return { isBlocked: false, reason: null, title: '', text: '' }
}
