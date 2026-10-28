<script setup>
// /onboarding/subscription (SubscriptionSetup no original): conta que exige pagamento antes de
// usar a plataforma escolhe um plano aqui; sem essa exigência, segue para a qualificação.
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import UpgradePlanCard from '@trama/components/profile/UpgradePlanCard.vue'
import { useSession } from '@trama/composables/useSession'

const router = useRouter()
const { user, updateUser, logout } = useSession()

onMounted(() => {
  if (user.value?.requires_payment_setup !== true) router.replace({ name: 'user-qualification-form' })
})

function onSubscribed() {
  updateUser({ requires_payment_setup: false })
  router.replace({ name: 'user-qualification-form' })
}

async function signOut() {
  await logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <div class="subscription-setup">
    <div class="subscription-setup__topbar">
      <v-btn variant="text" prepend-icon="mdi-logout" @click="signOut">Sair</v-btn>
    </div>
    <header class="subscription-setup__header">
      <h1 class="text-h5 font-weight-bold">Configure seu pagamento</h1>
      <p class="text-body-2 text-medium-emphasis mt-2">Escolha um plano para continuar usando a plataforma.</p>
    </header>
    <UpgradePlanCard @subscribed="onSubscribed" />
  </div>
</template>

<style scoped>
.subscription-setup {
  min-height: 100vh;
  padding: 32px 16px;
}

.subscription-setup__topbar {
  display: flex;
  justify-content: flex-end;
  max-width: 1200px;
  margin: 0 auto 8px;
}

.subscription-setup__header {
  max-width: 1200px;
  margin: 0 auto 24px;
  text-align: center;
}
</style>
