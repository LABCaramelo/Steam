import { acceptInvite } from '@trama/services/api'
import { useSession } from '@trama/composables/useSession'
import { toastError, toastSuccess } from '@trama/composables/useToast'

// Convite aberto sem login fica guardado (como "pending_invite" no original) e é aceito
// assim que o usuário entra na conta.
const KEY = 'pending_invite'

export function savePendingInvite(token) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token }))
  } catch {
    // storage indisponível: o convite precisará ser aberto de novo após o login
  }
}

export async function acceptPendingInvite() {
  let token = ''
  try {
    token = JSON.parse(localStorage.getItem(KEY))?.token ?? ''
  } catch {
    // valor corrompido: ignora
  }
  if (!token) return null
  try {
    const org = await acceptInvite(token)
    useSession().selectOrg(org.id)
    toastSuccess({ title: 'Convite aceito', text: 'Você entrou na organização com sucesso!', icon: 'mdi-check-circle-outline' })
    return org
  } catch {
    toastError({ text: 'Convite inválido ou expirado.' })
    return null
  } finally {
    localStorage.removeItem(KEY)
  }
}

// Próximo passo depois de autenticar (mesma ordem do AuthAutentificated original):
// aceita convite pendente → configurar pagamento → qualificação → destino pedido.
export async function completeLogin(router, user, redirect = '/') {
  useSession().setUser(user)
  await acceptPendingInvite()
  if (user.requires_payment_setup) return router.replace({ name: 'onboarding-subscription' })
  if (!user.qualified) {
    return router.replace({ name: 'user-qualification-form', query: redirect !== '/' ? { redirect } : {} })
  }
  return router.replace(redirect)
}

export function safeRedirect(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}
