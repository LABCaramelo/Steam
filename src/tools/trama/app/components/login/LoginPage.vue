<script setup>
import { computed, ref, useTemplateRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GoogleBtn from './GoogleBtn.vue'
import GoogleSignInDialog from './GoogleSignInDialog.vue'
import ModalLogin from './ModalLogin.vue'
import { loginAccount, resetPassword } from '@trama/services/api'
import { completeLogin, safeRedirect } from '@trama/composables/useLoginFlow'
import { toastError } from '@trama/composables/useToast'
import { email as emailRule, required } from '@trama/utils/rules'

const emit = defineEmits(['change-tab'])

const route = useRoute()
const router = useRouter()
const googleOpen = ref(false)

const form = ref({ email: '', password: '', showPassword: false })
const newPassword = ref({ newPassword: '', confirmNewPassword: '', showNewPassword: false, showConfirmPassword: false })
const criteria = ref({ characters: false, uppercase: false, repetitions: false, match: false })
const CRITERIA_LABELS = {
  characters: 'Possuir de 8 a 16 caracteres',
  uppercase: 'Possuir pelo menos uma letra maiúscula, um número e um caractere especial',
  repetitions: 'Não possuir repetições ou sequências iguais (111, 123, abc, qwe)',
  match: 'Os campos possuem a mesma senha',
}

function evaluateCriteria() {
  const pwd = newPassword.value.newPassword
  criteria.value.characters = pwd.length >= 8 && pwd.length <= 16
  criteria.value.uppercase = /[A-Z]/.test(pwd) && /\d/.test(pwd) && /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
  criteria.value.repetitions = !/(.)\1{2,}/.test(pwd) && !/123|234|345|456|567|678|789|012|qwe|werty|asdf|zxcv|abc/.test(pwd)
  criteria.value.match = pwd === newPassword.value.confirmNewPassword
}

const hasNewPassword = computed(() => (evaluateCriteria(), newPassword.value.newPassword.length > 0))
const passwordsMatch = computed(() => newPassword.value.newPassword === newPassword.value.confirmNewPassword)
const allCriteriaMet = computed(() => (evaluateCriteria(), Object.values(criteria.value).every(Boolean)))

const loading = ref(false)
const passwordDefined = ref(false)
const loginFormRef = useTemplateRef('loginForm')
const newPasswordFormRef = useTemplateRef('newPasswordForm')

function loginWithGoogle() {
  googleOpen.value = true
}

async function submit() {
  const { valid } = await loginFormRef.value.validate()
  if (!valid) return
  loading.value = true
  try {
    const user = await loginAccount({ email: form.value.email, password: form.value.password })
    if (user.requires_mfa) {
      router.push({ name: 'mfa-challenge', hash: `#mfa_token=${user.mfa_token}` })
      return
    }
    await completeLogin(router, user, safeRedirect(route.query.redirect))
  } catch (error) {
    toastError({ text: error.userMessage ?? 'Credenciais inválidas' })
  } finally {
    loading.value = false
  }
}

async function submitNewPassword() {
  const { valid } = await newPasswordFormRef.value.validate()
  if (!valid || !allCriteriaMet.value) return
  loading.value = true
  try {
    await resetPassword({ email: String(route.query.email), token: String(route.query.token), password: newPassword.value.newPassword })
    passwordDefined.value = true
  } catch (error) {
    toastError({ text: error.userMessage ?? 'Token expirado, solicite uma nova redefinição e tente novamente' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="route.query.email" class="line-gap-2">
    <h2>Defina sua senha</h2>
    <p class="mb-6">Digite sua nova senha para acessar a Trama</p>
    <v-form ref="newPasswordForm" @submit.prevent>
      <v-text-field
        v-model="newPassword.newPassword"
        :append-inner-icon="newPassword.showNewPassword ? 'mdi-eye' : 'mdi-eye-off'"
        :type="newPassword.showNewPassword ? 'text' : 'password'"
        rounded="lg"
        density="compact"
        label="Nova senha"
        :rules="[hasNewPassword]"
        @keydown.enter="submitNewPassword"
        @click:append-inner="newPassword.showNewPassword = !newPassword.showNewPassword"
      />
      <v-text-field
        v-model="newPassword.confirmNewPassword"
        :append-inner-icon="newPassword.showConfirmPassword ? 'mdi-eye' : 'mdi-eye-off'"
        :type="newPassword.showConfirmPassword ? 'text' : 'password'"
        rounded="lg"
        density="compact"
        label="Repita a nova senha"
        class="mb-2"
        :rules="[passwordsMatch]"
        @keydown.enter="submitNewPassword"
        @click:append-inner="newPassword.showConfirmPassword = !newPassword.showConfirmPassword"
      />
      <div class="d-flex align-start mb-4"><h4>Critérios da senha</h4></div>
      <div>
        <div v-for="(ok, key) in criteria" :key="key" class="d-flex align-start mb-2">
          <v-icon :color="ok ? 'green' : 'red'" class="mr-2">{{ ok ? 'mdi-check' : 'mdi-close' }}</v-icon>
          <p class="text-justify">{{ CRITERIA_LABELS[key] }}</p>
        </div>
      </div>
      <div class="d-flex align-start mb-6">
        <p class="text-justify text-muted">Dica: Evite datas de nascimento, documentos ou email</p>
      </div>
      <v-btn class="login-button" color="primary" :disabled="!allCriteriaMet" :loading="loading" flat block @click="submitNewPassword">
        <span>Definir senha</span>
      </v-btn>
      <ModalLogin
        v-model="passwordDefined"
        header-text="Senha Definida com sucesso!"
        body-text="Sua jornada começa agora"
        @confirm="router.push({ name: 'login' })"
      />
    </v-form>
  </div>

  <template v-else>
    <div class="d-flex flex-column justify-center pb-10">
      <h2 class="mb-1">Sua solução completa de integração.</h2>
      <p>Otimize seu tempo. Reduza as tarefas manuais</p>
    </div>
    <div class="line-gap-5">
      <v-form ref="loginForm" @submit.prevent>
        <v-text-field
          v-model="form.email"
          rounded="lg"
          density="compact"
          label="Email"
          variant="outlined"
          autocomplete="username"
          :rules="[required, emailRule]"
          @keydown.enter="submit"
        />
        <v-text-field
          v-model="form.password"
          rounded="lg"
          density="compact"
          :append-inner-icon="form.showPassword ? 'mdi-eye' : 'mdi-eye-off'"
          :type="form.showPassword ? 'text' : 'password'"
          label="Senha"
          autocomplete="current-password"
          :rules="[required]"
          @keydown.enter="submit"
          @click:append-inner="form.showPassword = !form.showPassword"
        />
        <div class="d-flex justify-space-between">
          <div class="d-flex justify-start pb-2">
            <span class="cursor-pointer" @click="emit('change-tab', 'forgotPassword')">Esqueci minha senha</span>
          </div>
        </div>
        <p class="d-flex justify-start pb-4 text-small flex-wrap">
          Ao entrar você está ciente das&nbsp;
          <router-link class="text-primary" :to="{ name: 'privacy-policies' }" target="_blank">políticas de privacidade</router-link>
          &nbsp;e&nbsp;
          <router-link class="text-primary" :to="{ name: 'terms-of-use' }" target="_blank">termos de uso</router-link>
          &nbsp;da Trama.
        </p>
        <v-btn
          class="login-button"
          color="primary"
          flat
          block
          :disabled="!form.email || !form.password"
          :loading="loading"
          @click="submit"
        >
          <span v-if="!loading">Entrar</span>
        </v-btn>
      </v-form>
      <GoogleBtn color="primary" class="w-100" @click="loginWithGoogle">Fazer login com o Google</GoogleBtn>
      <GoogleSignInDialog v-model="googleOpen" />
      <div align="center" class="pt-2">
        Não possui uma conta?
        <span class="font-weight-bold cursor-pointer" @click="emit('change-tab', 'register')">Crie agora</span>
      </div>
    </div>
  </template>
</template>
