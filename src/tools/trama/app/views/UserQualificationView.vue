<script setup>
// Formulário de qualificação (/qualificacao), mesmo fluxo do UserQualificationForm original:
// telefone → perguntas de múltipla escolha → apps de interesse → "Começar a integrar!".
// Telefone e respostas são gravados na conta do servidor ao confirmar cada etapa.
import { computed, ref, useTemplateRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import TramaLogo from '@trama/components/TramaLogo.vue'
import AppIcon from '@trama/components/AppIcon.vue'
import { QUALIFICATION_QUESTIONS, savePhone, submitQualification } from '@trama/services/api'
import { APPS } from '@trama/services/apps'
import { useSession } from '@trama/composables/useSession'
import { toastError } from '@trama/composables/useToast'
import { required } from '@trama/utils/rules'

const questions = QUALIFICATION_QUESTIONS

const route = useRoute()
const router = useRouter()
const { smAndDown } = useDisplay()
const { user, updateUser, selectOrg } = useSession()
const form = useTemplateRef('form')

const state = ref({ questions: {}, apps: [], currentTab: questions[0].tab_key })
const appSearch = ref('')
const finishing = ref(false)
const savingPhone = ref(false)

const phoneId = questions.find((q) => q.tab_key === 'tel_number').id_question
const currentIndex = computed(() => questions.findIndex((q) => q.tab_key === state.value.currentTab))
const apps = computed(() => {
  const term = appSearch.value?.trim().toLowerCase()
  return Object.entries(APPS)
    .filter(([, app]) => !app.trigger && !app.middleware)
    .filter(([, app]) => !term || app.title.toLowerCase().includes(term))
    .map(([key, app]) => ({ key, ...app }))
})

const phoneRule = (v) => (String(v ?? '').replace(/\D/g, '').length >= 10 ? true : 'Telefone inválido')

function next() {
  if (currentIndex.value < questions.length - 1) state.value.currentTab = questions[currentIndex.value + 1].tab_key
  setTimeout(() => form.value?.resetValidation(), 10)
}

function back() {
  if (currentIndex.value > 0) state.value.currentTab = questions[currentIndex.value - 1].tab_key
}

function answer(questionId, option) {
  state.value.questions[questionId] = option
  next()
}

function toggleApp(key) {
  const index = state.value.apps.indexOf(key)
  if (index > -1) state.value.apps.splice(index, 1)
  else state.value.apps.push(key)
}

async function submitPhone() {
  const { valid } = await form.value.validate()
  if (!valid) return
  savingPhone.value = true
  try {
    const updated = await savePhone(user.value.email, state.value.questions[phoneId])
    updateUser(updated)
    next()
  } catch (error) {
    toastError({ text: error.userMessage ?? 'Não foi possível salvar o telefone.' })
  } finally {
    savingPhone.value = false
  }
}

async function finish() {
  finishing.value = true
  try {
    // Como no original, o telefone não vai junto das respostas (já foi salvo no perfil).
    const answers = Object.entries(state.value.questions)
      .filter(([id]) => Number(id) !== phoneId)
      .map(([id, response]) => ({ id: Number(id), response }))
    const result = await submitQualification(user.value.email, { questions: answers, apps: state.value.apps })
    updateUser(result.user)
    selectOrg(result.orgId)
    const redirect = route.query.redirect
    if (typeof redirect === 'string' && redirect.startsWith('/') && redirect !== '/') router.replace(redirect)
    else if (result.fluxId) router.push({ name: 'flux', params: { fluxId: result.fluxId } })
    else router.push({ name: 'home' })
  } catch (error) {
    toastError({ text: error.userMessage ?? 'Não foi possível concluir o cadastro. Tente novamente.' })
  } finally {
    finishing.value = false
  }
}
</script>

<template>
  <div class="page-padding qualification-container">
    <TramaLogo logo-width="200" />
    <h3 class="mb-5 mt-4">
      Estamos aqui para transformar suas integrações em uma experiência mais simples e eficaz. Vamos começar!
    </h3>

    <div class="stepper">
      <div
        v-for="n in questions.length"
        :key="n"
        class="stepper-bar mr-2 rounded-xl"
        :class="{ 'stepper-bar-filled': n <= currentIndex + 1 }"
        :style="{ width: `${100 / questions.length}%` }"
      />
    </div>

    <v-form ref="form" @submit.prevent>
      <v-window v-model="state.currentTab">
        <v-window-item v-for="(question, index) in questions" :key="question.id_question" :value="question.tab_key">
          <div class="question-container mt-10 mb-5">
            <v-fade-transition>
              <v-btn v-if="index > 0 && !smAndDown" color="primary" density="comfortable" variant="tonal" icon="mdi-chevron-left" @click="back" />
            </v-fade-transition>
            <h3 class="ml-2">{{ question.question }}</h3>
          </div>

          <!-- Perguntas de múltipla escolha -->
          <v-row v-if="question.options.length">
            <v-col v-for="option in question.options" :key="option" cols="12" sm="6" md="4" lg="3">
              <button
                v-ripple
                class="question-btn"
                :class="{ 'question-btn--selected': state.questions[question.id_question] === option }"
                @click="answer(question.id_question, option)"
              >
                {{ option }}
              </button>
            </v-col>
          </v-row>

          <!-- Seleção de apps -->
          <div v-else-if="question.tab_key === 'apps_selection'">
            <v-card class="px-5 py-1" rounded="lg" variant="elevated">
              <v-text-field
                v-model="appSearch"
                density="compact"
                variant="plain"
                label="Pesquisar aplicativo"
                single-line
                hide-details
              >
                <template #prepend-inner>
                  <v-icon icon="mdi-magnify" color="primary" />
                </template>
              </v-text-field>
            </v-card>
            <v-card class="apps-external-card" rounded="lg" variant="elevated">
              <v-row dense class="justify-center">
                <div
                  v-for="app in apps"
                  :key="app.key"
                  class="option-card text-center"
                  :class="{ 'selected-card': state.apps.includes(app.key) }"
                  @click="toggleApp(app.key)"
                >
                  <AppIcon :app="app.key" :size="44" class="mb-2" />
                  <div class="text-small">{{ app.title }}</div>
                </div>
              </v-row>
              <p v-if="!apps.length" class="text-center text-medium-emphasis py-8">Nenhum aplicativo encontrado</p>
            </v-card>
            <div class="d-flex justify-end mt-3">
              <v-btn color="primary" rounded="lg" :block="smAndDown" :variant="state.apps.length ? 'flat' : 'tonal'" @click="next">
                {{ state.apps.length ? 'Avançar' : 'Pular' }}
              </v-btn>
            </div>
          </div>

          <!-- Telefone -->
          <div v-else-if="question.tab_key === 'tel_number'">
            <v-card variant="text" class="py-1">
              <v-text-field
                v-model="state.questions[phoneId]"
                :rules="[required, phoneRule]"
                placeholder="(11) 91234-5678"
                label="Telefone"
                clearable
                max-width="600"
                @keydown.enter="submitPhone"
              />
              <b>Por que pedimos seu telefone?</b>
              Queremos garantir que você tenha a melhor experiência possível com a nossa plataforma. Nossa equipe de suporte
              está aqui para ajudar sempre que você precisar. Fique tranquilo, respeitamos sua privacidade e não enviaremos spam
              para o seu número.
            </v-card>
            <div class="mt-3 text-right">
              <v-btn color="primary" rounded="lg" :block="smAndDown" :loading="savingPhone" @click="submitPhone">Avançar</v-btn>
            </div>
          </div>
        </v-window-item>
      </v-window>
    </v-form>

    <div v-if="state.currentTab === 'end'">
      <h2>Obrigado!</h2>
      <p>Agora você está pronto para iniciar.</p>
      <v-btn class="mt-4" color="primary" :block="smAndDown" :loading="finishing" @click="finish">
        <v-icon icon="mdi-party-popper" class="pr-2" />
        Começar a integrar!
      </v-btn>
    </div>

    <v-expand-transition>
      <v-btn
        v-if="smAndDown && currentIndex > 0"
        class="mt-4"
        block
        color="primary"
        rounded="lg"
        variant="text"
        @click="back"
      >
        Voltar
      </v-btn>
    </v-expand-transition>
  </div>
</template>

<style scoped>
.qualification-container {
  max-width: 1500px;
  margin: 0 auto;
  padding: 60px 60px 50px;
}

.stepper {
  display: flex;
  justify-content: space-between;
}

.stepper-bar {
  height: 15px;
  background-color: rgb(var(--v-theme-faded));
  transition: background-color 0.5s ease;
}

.stepper-bar-filled {
  background-color: rgb(var(--v-theme-primary));
}

.question-container {
  display: flex;
  align-items: center;
}

.question-btn {
  word-break: break-word;
  border: 1px solid;
  min-width: 100%;
  min-height: 48px;
  border-radius: 8px;
  padding: 5px;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.question-btn:hover,
.question-btn--selected {
  background-color: color-mix(in srgb, rgb(var(--v-theme-faded)), transparent 70%);
}

.question-btn--selected {
  border-color: rgb(var(--v-theme-primary));
}

.option-card {
  margin: 8px;
  width: 96px;
  background-color: rgb(var(--v-theme-background));
  padding: 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.option-card.selected-card {
  border-color: rgb(var(--v-theme-primary));
  transform: translateY(-3px);
}

.option-card:hover {
  background-color: color-mix(in srgb, rgb(var(--v-theme-faded)), transparent 70%);
}

.apps-external-card {
  padding: 16px;
  margin-top: 16px;
  margin-bottom: 16px;
  overflow-y: auto;
  height: 450px;
}

@media (max-width: 960px) {
  .qualification-container {
    padding: 24px 16px 50px;
  }
}
</style>
