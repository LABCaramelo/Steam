<script setup>
// /auth-token-authenticated: destino do login social no original (AuthAutentificated).
// Troca o token da URL pela sessão e segue o fluxo pós-login (convite, pagamento, qualificação).
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { completeLogin, safeRedirect } from '@trama/composables/useLoginFlow'
import { consumeAuthToken } from '@trama/services/api'
import { toastError } from '@trama/composables/useToast'

const route = useRoute()
const router = useRouter()

onMounted(async () => {
  const redirect = route.query.mfa_disabled === 'true' ? '/profile' : safeRedirect(route.query.redirect)
  try {
    const user = await consumeAuthToken(String(route.query.token ?? ''))
    if (user.requires_mfa) {
      router.replace({ name: 'mfa-challenge', hash: `#mfa_token=${user.mfa_token}` })
      return
    }
    await completeLogin(router, user, redirect)
  } catch (error) {
    toastError({ text: error.userMessage ?? 'Não foi possível concluir o login.' })
    router.replace({ name: 'login' })
  }
})
</script>

<template>
  <div class="d-flex align-center justify-center min-h-screen">
    <v-progress-circular indeterminate color="primary" size="48" />
  </div>
</template>
