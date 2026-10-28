<script setup>
import { onMounted, ref, useTemplateRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ModalLogin from './ModalLogin.vue'
import { resetPasswordSendEmail } from '@trama/services/api'
import { toastError } from '@trama/composables/useToast'
import { email as emailRule, lengthBetween, required } from '@trama/utils/rules'

const props = defineProps({
  hideBackButton: { type: Boolean, default: false },
})
const emit = defineEmits(['change-tab'])

const route = useRoute()
const router = useRouter()
const form = ref({ email: '' })
const loading = ref(false)
const emailSent = ref(false)
const sendEmailFormRef = useTemplateRef('sendEmailForm')

onMounted(() => {
  if (route.name === 'reset-password' && (!route.query.email || !route.query.token)) router.push({ name: 'login' })
})

async function send() {
  const { valid } = await sendEmailFormRef.value.validate()
  if (!valid) return
  loading.value = true
  try {
    await resetPasswordSendEmail({ email: form.value.email })
    emailSent.value = true
  } catch (error) {
    toastError({ text: error.userMessage ?? 'O email fornecido não possui cadastro' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="line-gap-5">
    <div class="d-flex flex-column justify-center pb-2">
      <h2 class="mb-1">Informe seu email</h2>
      <p>Será enviado um link para redefinição de senha</p>
    </div>
    <v-form ref="sendEmailForm" @submit.prevent>
      <v-text-field
        v-model="form.email"
        rounded="lg"
        density="compact"
        label="Email"
        variant="outlined"
        class="pb-2"
        :rules="[required, emailRule, lengthBetween(1, 100)]"
        @keydown.enter="send"
      />
      <v-row class="d-flex justify-space-between">
        <v-col>
          <v-btn class="login-button" block flat color="primary" :disabled="!form.email" :loading="loading" @click="send">
            <span>Enviar email</span>
          </v-btn>
          <ModalLogin
            v-model="emailSent"
            header-text="Verifique seu email"
            body-text="Um link para definir sua nova senha foi enviado para o e-mail cadastrado"
            lost-email-text="Não recebeu o e-mail?"
            @change-tab="(tab) => emit('change-tab', tab)"
            @close-modal="emailSent = false"
            @reset-password="send"
          />
        </v-col>
      </v-row>
      <v-btn v-if="!props.hideBackButton" class="mt-6" variant="text" @click="emit('change-tab', 'login')">Voltar</v-btn>
    </v-form>
  </div>
</template>
