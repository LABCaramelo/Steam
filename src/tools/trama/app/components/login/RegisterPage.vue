<script setup>
import { ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import GoogleBtn from './GoogleBtn.vue'
import GoogleSignInDialog from './GoogleSignInDialog.vue'
import { registerAccount } from '@trama/services/api'
import { completeLogin } from '@trama/composables/useLoginFlow'
import { toastError } from '@trama/composables/useToast'
import { email as emailRule, lengthBetween, required, strongPassword } from '@trama/utils/rules'

const emit = defineEmits(['change-tab'])

const router = useRouter()
const form = ref({ name: '', email: '', password: '', showPassword: false })
const loading = ref(false)
const googleOpen = ref(false)
const registerFormRef = useTemplateRef('registerForm')

function registerWithGoogle() {
  googleOpen.value = true
}

async function submit() {
  const { valid } = await registerFormRef.value.validate()
  if (!valid) return
  loading.value = true
  try {
    const user = await registerAccount({ fullname: form.value.name, email: form.value.email, password: form.value.password })
    // Conta nova segue para o formulário de qualificação.
    await completeLogin(router, user)
  } catch (error) {
    toastError({ text: error.userMessage ?? 'O email já está registrado' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="line-gap-5">
    <div class="d-flex flex-column justify-center pb-10">
      <h2 class="mb-1">Sua solução completa de integração.</h2>
      <p>Otimize seu tempo. Reduza as tarefas manuais</p>
    </div>
    <v-form ref="registerForm" @submit.prevent>
      <v-text-field
        v-model="form.name"
        label="Nome"
        variant="outlined"
        rounded="lg"
        density="compact"
        autocomplete="name"
        :rules="[required, lengthBetween(4, 50)]"
        @keydown.enter="submit"
      />
      <v-text-field
        v-model="form.email"
        label="Email"
        variant="outlined"
        rounded="lg"
        density="compact"
        autocomplete="email"
        :rules="[required, emailRule, lengthBetween(1, 100)]"
        @keydown.enter="submit"
      />
      <v-text-field
        v-model="form.password"
        :append-inner-icon="form.showPassword ? 'mdi-eye' : 'mdi-eye-off'"
        :type="form.showPassword ? 'text' : 'password'"
        label="Senha"
        rounded="lg"
        density="compact"
        autocomplete="new-password"
        :rules="[strongPassword, value => value?.length >= 10 || 'Use pelo menos 10 caracteres.']"
        @click:append-inner="form.showPassword = !form.showPassword"
        @keydown.enter="submit"
      />
      <p class="text-start pb-4 text-small">
        Ao cadastrar nesta instalação, você está ciente das&nbsp;
        <router-link class="text-primary" :to="{ name: 'privacy-policies' }" target="_blank">políticas de privacidade</router-link>
        &nbsp;e&nbsp;
        <router-link class="text-primary" :to="{ name: 'terms-of-use' }" target="_blank">termos de uso</router-link>
        &nbsp;aplicáveis a esta instalação.
      </p>
      <v-btn
        class="login-button"
        color="primary"
        flat
        block
        :disabled="loading || !form.name || !form.email || !form.password"
        :loading="loading"
        @click="submit"
      >
        <span>Criar conta</span>
      </v-btn>
      <div class="custom-hr-primary my-5" />
    </v-form>
    <GoogleBtn color="primary" class="w-100" @click="registerWithGoogle">Inscrever-se com o Google</GoogleBtn>
    <GoogleSignInDialog v-model="googleOpen" />
    <div align="center">
      Já possui uma conta?
      <span class="font-weight-bold cursor-pointer" @click="emit('change-tab', 'login')">Entre aqui!</span>
    </div>
  </div>
</template>
