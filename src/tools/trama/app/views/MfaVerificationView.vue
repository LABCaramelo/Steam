<script setup>
// Verificação de dois fatores (/mfa-challenge), igual ao MfaVerificationPage original:
// o login manda para cá com #mfa_token=... quando a conta tem MFA ativo.
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TramaLogo from '@trama/components/TramaLogo.vue'
import AppModal from '@trama/components/AppModal.vue'
import { loginWithMfaCode, loginWithRecoveryCode } from '@trama/services/api'
import { completeLogin } from '@trama/composables/useLoginFlow'
import { toastError, toastInfo } from '@trama/composables/useToast'

const route = useRoute()
const router = useRouter()

const code = ref('')
const verifying = ref(false)
const recoveryOpen = ref(false)
const recoveryCode = ref('')
const recovering = ref(false)

const mfaToken = computed(() => new URLSearchParams(route.hash.replace('#', '')).get('mfa_token'))

function finishLogin(user) {
  return completeLogin(router, user)
}

async function verify() {
  if (!mfaToken.value) {
    toastError({ text: 'Token MFA inválido ou ausente' })
    return
  }
  verifying.value = true
  try {
    await finishLogin(await loginWithMfaCode(code.value, mfaToken.value))
  } catch (error) {
    if (error.status === 401) toastInfo({ title: 'Aviso!', text: 'Código inválido. Verifique e tente novamente', color: 'warning', icon: 'mdi-alert-circle' })
    else toastError({ text: error.userMessage ?? 'Muitas tentativas. Tente novamente em alguns minutos' })
  } finally {
    verifying.value = false
  }
}

async function useRecoveryCode() {
  recovering.value = true
  try {
    await finishLogin(await loginWithRecoveryCode(recoveryCode.value, mfaToken.value ?? ''))
  } catch {
    toastError({ title: 'Código de recuperação inválido', text: 'Tente novamente' })
  } finally {
    recovering.value = false
  }
}
</script>

<template>
  <div class="d-flex flex-column align-center justify-center min-h-screen position-relative overflow-hidden">
    <v-icon icon="custom:trama-logo" size="40rem" color="primary" class="background-logo" />
    <v-card class="w-100 pa-10 mfa-card" max-width="600">
      <div class="d-flex align-center justify-center mb-10">
        <TramaLogo logo-width="250" logo-class="logo-img" />
      </div>
      <div class="d-flex align-center justify-center mb-2">
        <v-chip color="primary" class="rounded-lg px-4 mr-2" variant="tonal">
          <v-icon icon="mdi-shield-check" />
        </v-chip>
        <h1>Verificação de Dois Fatores</h1>
      </div>
      <div>
        <div class="mb-4">
          <p class="mb-4 text-center">Digite o código de 6 dígitos enviado para seu aplicativo autenticador</p>
          <div class="d-flex justify-center">
            <v-otp-input v-model="code" :length="6" type="number" :loading="verifying" />
          </div>
        </div>
        <div class="mb-8 d-flex justify-center">
          <v-btn variant="tonal" color="info" @click="recoveryOpen = true">Utilizar códigos de recuperação</v-btn>
        </div>
        <div class="d-flex flex-nowrap justify-center">
          <v-btn variant="text" color="primary" class="mr-2" @click="router.push('/login')">Cancelar</v-btn>
          <v-btn color="primary" :loading="verifying" @click="verify">Verificar</v-btn>
        </div>
      </div>
    </v-card>

    <AppModal v-model="recoveryOpen" max-width="480px" :prevent-close="recovering">
      <div v-if="recovering" class="d-flex justify-center mt-3">
        <v-progress-circular color="primary" indeterminate />
      </div>
      <div v-else>
        <div class="d-flex flex-column justify-center pb-2">
          <h2 class="mb-1">Digite seu código de recuperação</h2>
          <p>Use o código de backup para acessar sua conta</p>
        </div>
        <v-form @submit.prevent="useRecoveryCode">
          <v-text-field v-model="recoveryCode" rounded="lg" density="compact" label="Código de recuperação" variant="outlined" />
          <div class="d-flex flex-column align-center">
            <v-btn type="submit" :disabled="!recoveryCode" color="primary" variant="flat" block>Confirmar</v-btn>
            <v-btn class="mt-3" variant="text" @click="recoveryOpen = false">Voltar</v-btn>
          </div>
        </v-form>
      </div>
    </AppModal>
  </div>
</template>

<style scoped>
.min-h-screen {
  min-height: 100vh;
}

.background-logo {
  position: absolute;
  top: -5rem;
  left: -5rem;
  filter: blur(7px);
  animation: float 8s ease-in-out infinite;
  pointer-events: none;
}

.mfa-card {
  text-align: center;
}

:deep(.logo-img) {
  max-width: 250px;
}

@keyframes float {
  0%,
  100% {
    transform: translate(0) rotate(0);
  }
  25% {
    transform: translate(10px, -10px) rotate(2deg);
  }
  50% {
    transform: translateY(-20px) rotate(0);
  }
  75% {
    transform: translate(-10px, -10px) rotate(-2deg);
  }
}
</style>
