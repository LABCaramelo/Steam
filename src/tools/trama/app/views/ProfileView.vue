<script setup>
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppModal from '@trama/components/AppModal.vue'
import ModalConfirm from '@trama/components/ModalConfirm.vue'
import MfaCard from '@trama/components/profile/MfaCard.vue'
import PaymentMethodsModal from '@trama/components/profile/PaymentMethodsModal.vue'
import UpgradePlanCard from '@trama/components/profile/UpgradePlanCard.vue'
import {
  changePassword,
  db,
  getBillingAddress,
  listInvoices,
  requestCancellation,
  resetPasswordSendEmail,
  saveBillingAddress,
  updateProfile,
  updateProfileImage,
} from '@trama/services/api'
import { EMPTY_ADDRESS } from '@trama/utils/billing'
import { COUNTRY_ITEMS, DOCUMENT_TYPE_ITEMS, STATE_ITEMS, documentLabel, lookupCep } from '@trama/utils/billing'
import { isUnlimited } from '@trama/utils/subscription'
import { email as emailRule, lengthBetween, required, strongPassword } from '@trama/utils/rules'
import { useSession } from '@trama/composables/useSession'
import { toastError, toastSuccess } from '@trama/composables/useToast'

const route = useRoute()
const router = useRouter()
const { user, updateUser } = useSession()

const section = ref(route.query.section === 'plan' ? 'plan' : 'date')
watch(
  () => route.query.section,
  (value) => (section.value = value === 'plan' ? 'plan' : 'date'),
)
watch(section, (value) => {
  router.replace({ query: value === 'plan' ? { section: 'plan' } : {} })
  if (value === 'plan') loadPlan()
})

// ---- Meus dados ----

const editing = ref(false)
const savingInfo = ref(false)
const showPhone = ref(false)
const form = ref({ username: user.value?.username ?? user.value?.fullname ?? '', phone: user.value?.phone ?? '' })

async function toggleEdit() {
  if (!editing.value) {
    editing.value = true
    return
  }
  savingInfo.value = true
  try {
    const updated = await updateProfile(user.value.email, { fullname: form.value.username.trim(), phone: form.value.phone.trim() })
    updateUser(updated)
    toastSuccess({ title: 'Perfil atualizado', text: 'Perfil atualizado com sucesso.' })
    editing.value = false
  } catch {
    toastError({ text: 'Não foi possível atualizar o perfil.' })
  } finally {
    savingInfo.value = false
  }
}

// Foto de perfil
const photoOpen = ref(false)
const newPhoto = ref('')
const savingPhoto = ref(false)
const fileInput = useTemplateRef('fileInput')

function pickPhoto(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
    toastError({ text: 'Escolha uma imagem PNG, JPEG ou WebP de até 1 MB.' })
    return
  }
  const reader = new FileReader()
  reader.onload = () => (newPhoto.value = reader.result)
  reader.readAsDataURL(file)
}

async function savePhoto() {
  if (!newPhoto.value) {
    photoOpen.value = false
    return
  }
  savingPhoto.value = true
  try {
    const updated = await updateProfileImage(user.value.email, newPhoto.value)
    updateUser(updated)
    newPhoto.value = ''
    toastSuccess({ text: 'Foto de perfil atualizada com sucesso.' })
  } catch {
    toastError({ text: 'Não foi possível atualizar a foto de perfil.' })
  } finally {
    savingPhoto.value = false
    photoOpen.value = false
  }
}

// Senha
const passwordOpen = ref(false)
const passwordForm = useTemplateRef('passwordForm')
const passwords = ref({ current: '', next: '', confirm: '' })
const visible = ref({ current: false, next: false, confirm: false })
const resetOpen = ref(false)
const resetEmail = ref('')
const sendingReset = ref(false)

async function submitPassword() {
  const { valid } = await passwordForm.value.validate()
  if (!valid) return
  const { current, next, confirm } = passwords.value
  if (next !== confirm) return toastError({ title: 'Senhas diferentes', text: 'A nova senha e a confirmação precisam ser iguais.' })
  if (current === next) return toastError({ title: 'Senha inválida', text: 'A nova senha deve ser diferente da senha atual.' })
  try {
    await changePassword(user.value.email, { current, next })
    toastSuccess({ text: 'Senha alterada com sucesso.' })
    passwords.value = { current: '', next: '', confirm: '' }
    passwordOpen.value = false
  } catch (error) {
    toastError({ title: 'Senha atual incorreta', text: error.userMessage ?? 'Não foi possível alterar a senha. Tente novamente.' })
  }
}

function openReset() {
  resetEmail.value = user.value.email
  resetOpen.value = true
}

async function sendReset() {
  if (emailRule(resetEmail.value) !== true || !resetEmail.value) return
  sendingReset.value = true
  try {
    await resetPasswordSendEmail({ email: resetEmail.value })
    resetOpen.value = false
    toastSuccess({ title: 'Email enviado', text: 'Um email para redefinição de senha foi enviado, verifique sua caixa de entrada.' })
  } catch (error) {
    toastError({ text: error.userMessage || 'Não foi possível enviar o e-mail de recuperação.' })
  } finally {
    sendingReset.value = false
  }
}

// ---- Plano ----

const loadingPlan = ref(false)
const subscription = computed(() => db.subscription)
const paymentsConfigured = computed(() => db.capabilities?.payments === true)
const isLocalPlan = computed(() => subscription.value?.local === true || !paymentsConfigured.value)
const unlimited = computed(() => isUnlimited(subscription.value))
const usedPercent = computed(() =>
  subscription.value?.quantity_plan ? Math.min((subscription.value.quantity_used / subscription.value.quantity_plan) * 100, 100) : 0,
)
const expiration = computed(() => {
  const end = subscription.value?.plan_current_period_end
  if (!end) return ''
  return new Date(end * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
})

const invoices = ref([])
const invoicePage = ref(1)
const invoicePages = ref(1)

async function loadInvoices() {
  if (!paymentsConfigured.value) { invoices.value = []; invoicePages.value = 1; return }
  try {
    const result = await listInvoices(invoicePage.value, 10)
    invoices.value = result.data
    invoicePages.value = result.pagination?.last_page ?? result.meta?.last_page ?? 1
  } catch (error) { toastError({ text: error.userMessage || 'Não foi possível consultar o histórico de pagamentos.' }) }
}

async function loadPlan() {
  loadingPlan.value = true
  try {
    await loadInvoices()
  } finally {
    loadingPlan.value = false
  }
}

watch(invoicePage, loadInvoices)
onMounted(() => section.value === 'plan' && loadPlan())

function invoiceMonth(date) {
  const text = new Date(date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function invoiceDay(date) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function downloadInvoice(invoice) {
  try {
    const url = new URL(invoice.download_url || invoice.receipt_url || invoice.invoice_pdf || '')
    if (!paymentsConfigured.value || url.protocol !== 'https:') throw new Error()
    window.open(url.href, '_blank', 'noopener,noreferrer')
  } catch { toastError({ text: 'O provedor não disponibilizou um recibo para este pagamento.' }) }
}

// Cancelamento
const cancelOpen = ref(false)
const cancelEmail = ref('')
const cancelReason = ref('')

async function submitCancellation() {
  if (!paymentsConfigured.value || isLocalPlan.value) { toastError({ text: 'Não há assinatura comercial para cancelar nesta instalação.' }); return }
  if (cancelEmail.value !== user.value.email) {
    toastError({ title: 'Email inválido', text: 'Digite o email correto para confirmar o cancelamento.' })
    return
  }
  if (lengthBetween(20, 500)(cancelReason.value) !== true || !cancelReason.value) {
    toastError({ text: 'Descreva o motivo do cancelamento (20 a 500 caracteres).' })
    return
  }
  try {
    await requestCancellation({ email: cancelEmail.value, reason: cancelReason.value })
    toastSuccess({ title: 'Solicitação registrada', text: 'A solicitação de cancelamento foi salva no servidor.' })
    cancelOpen.value = false
    cancelEmail.value = ''
    cancelReason.value = ''
  } catch (error) { toastError({ text: error.userMessage || 'Não foi possível registrar o cancelamento.' }) }
}

const paymentOpen = ref(false)

// Dados de faturamento
const billingEditing = ref(false)
const billingLoading = ref(false)
const billingSaving = ref(false)
const searchingCep = ref(false)
const billing = ref({ ...EMPTY_ADDRESS })
const billingNameLabel = computed(() => documentLabel(billing.value.document_type))

async function editBilling() {
  if (!paymentsConfigured.value) return
  billingLoading.value = true
  try {
    billing.value = { ...EMPTY_ADDRESS, ...(await getBillingAddress()) }
    billingEditing.value = true
  } catch (error) {
    toastError({ text: error.userMessage || 'Não foi possível consultar os dados de faturamento.' })
  } finally {
    billingLoading.value = false
  }
}

async function fillFromCep() {
  if (String(billing.value.postal_code).replace(/\D/g, '').length !== 8) return
  searchingCep.value = true
  try {
    const data = await lookupCep(billing.value.postal_code)
    Object.assign(billing.value, {
      street: data.street || billing.value.street,
      neighborhood: data.neighborhood || billing.value.neighborhood,
      city: data.city || billing.value.city,
      state: data.state || billing.value.state,
      country: 'BR',
    })
    toastSuccess({ title: 'CEP encontrado', text: 'Endereço preenchido automaticamente.' })
  } catch {
    toastError({ title: 'CEP não encontrado', text: 'Não foi possível encontrar o endereço para este CEP.' })
  } finally {
    searchingCep.value = false
  }
}

async function saveBilling() {
  billingSaving.value = true
  try {
    await saveBillingAddress({ ...billing.value, document_number: billing.value.document_number.replace(/\D/g, '') })
    toastSuccess({ text: 'Dados de faturamento atualizados com sucesso.' })
    billingEditing.value = false
  } catch {
    toastError({ text: 'Não foi possível salvar os dados de faturamento.' })
  } finally {
    billingSaving.value = false
  }
}
</script>

<template>
  <div>
    <div class="text-center my-4">
      <v-btn-toggle v-model="section" mandatory class="pa-1" color="primary" rounded="lg">
        <v-btn value="date" class="mr-4">Meus dados</v-btn>
        <v-btn value="plan">Plano</v-btn>
      </v-btn-toggle>
    </div>

    <div class="mx-auto profile-container pb-12">
      <!-- Meus dados -->
      <div v-if="section === 'date'">
        <v-card class="pa-2">
          <div class="d-flex justify-space-between align-center pa-2">
            <div class="d-flex align-center">
              <div class="avatar-edit-wrapper" @click="photoOpen = true">
                <v-avatar class="border" color="faded" size="80">
                  <v-img v-if="user?.profile_image_url" :src="user.profile_image_url" cover />
                  <v-icon v-else icon="mdi-account" size="50" />
                </v-avatar>
                <div class="avatar-edit-overlay">
                  <v-icon icon="mdi-camera" color="white" size="28" />
                </div>
              </div>
              <div class="ml-4">
                <h2 class="mb-1">{{ user?.username ?? user?.fullname }}</h2>
                <p class="text-medium-emphasis mb-0 sensitive-on-hover">{{ user?.email }}</p>
              </div>
            </div>
          </div>

          <v-row class="ma-4">
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.username"
                label="Usuário"
                :disabled="!editing"
                class="mb-4"
                :rules="[required, lengthBetween(2, 200)]"
                hide-details="auto"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.phone"
                label="Telefone"
                :type="showPhone ? 'text' : 'password'"
                :append-inner-icon="showPhone ? 'mdi-eye-off' : 'mdi-eye'"
                :readonly="!editing"
                class="mb-4"
                hide-details="auto"
                @click:append-inner="showPhone = !showPhone"
              />
            </v-col>
          </v-row>

          <div class="ma-4">
            <v-row>
              <v-col cols="12" sm="6">
                <v-btn v-if="user?.has_credentials !== false" color="info" variant="outlined" block class="mb-4" @click="passwordOpen = true">
                  <v-icon icon="mdi-lock" class="mr-2" />
                  Alterar Senha
                </v-btn>
                <!-- Conta criada pelo Google ainda sem senha (como no original). -->
                <v-btn v-else variant="outlined" block class="mb-4" @click="openReset">
                  <v-icon icon="mdi-lock-open" class="mr-2" />
                  Solicitar definição de senha
                </v-btn>
              </v-col>
              <v-col cols="12" sm="6">
                <v-btn color="primary" block :loading="savingInfo" :disabled="savingInfo" @click="toggleEdit">
                  {{ editing ? 'Confirmar' : 'Editar informações' }}
                </v-btn>
              </v-col>
            </v-row>
          </div>
        </v-card>

        <div class="mt-8">
          <MfaCard />
        </div>
      </div>

      <!-- Plano: carregando -->
      <div v-else-if="loadingPlan">
        <v-card class="pa-5 mb-4"><v-skeleton-loader type="heading,text,actions" /></v-card>
        <v-card class="pa-5 mb-4"><v-skeleton-loader type="article" /></v-card>
      </div>

      <!-- Plano: assinante -->
      <div v-else-if="subscription">
        <v-card class="pa-5 mb-4">
          <div class="d-flex align-center">
            <div class="mr-6 flex-grow-1">
              <div class="d-flex mb-2 justify-space-between">
                <h2>{{ subscription.product?.name ?? subscription.plan_name }}</h2>
              </div>
              <template v-if="!unlimited">
                <h3 class="d-flex align-center justify-end font-weight-bold mb-1">{{ usedPercent.toFixed(0) }}% Utilizado</h3>
                <v-progress-linear :model-value="usedPercent" color="progressbar" height="10" rounded />
              </template>
            </div>
            <span class="d-flex align-center justify-end mr-6">
              de {{ subscription.quantity_used }} /
              <v-icon v-if="unlimited" icon="mdi-all-inclusive" class="ml-1" />
              <span v-else class="ml-1">{{ subscription.quantity_plan }}</span>
            </span>
          </div>
        </v-card>

        <v-card class="pa-5 mb-4">
          <h2 class="mb-4">{{ isLocalPlan ? 'Instalação local' : 'Sua assinatura' }}</h2>
          <v-alert v-if="isLocalPlan" type="info" variant="tonal" class="mb-5">Plano Local, sem cobrança. Pagamentos e assinaturas comerciais não estão configurados.</v-alert>
          <v-row>
            <v-col cols="12" sm="6">
              <p class="text-medium-emphasis mb-1">{{ isLocalPlan ? 'Plano atual' : 'Ciclo atual' }}</p>
              <h3 class="mb-4">{{ subscription.product?.name ?? subscription.plan_name }}</h3>
            </v-col>
            <v-col cols="12" sm="6">
              <p class="text-medium-emphasis mb-1">Expiração</p>
              <b>{{ isLocalPlan ? 'Sem vencimento comercial' : expiration || 'Não informada' }}</b>
            </v-col>
          </v-row>
          <v-row v-if="paymentsConfigured && !isLocalPlan" class="ma-2">
            <v-col cols="12" sm="6">
              <v-btn color="error" variant="text" block @click="cancelOpen = true">Solicitar cancelamento</v-btn>
            </v-col>
            <v-col cols="12" sm="6">
              <v-btn block color="primary" @click="paymentOpen = true">
                <v-icon icon="mdi-credit-card-outline" class="mr-1" />
                Alterar forma de pagamento
              </v-btn>
            </v-col>
          </v-row>
        </v-card>

        <v-card class="pa-5 mb-4">
          <h2 class="mb-4">Dados de faturamento</h2>
          <p v-if="!paymentsConfigured" class="text-medium-emphasis">Faturamento não configurado nesta instalação.</p>
          <v-btn v-else-if="!billingEditing" class="mb-4" color="primary" variant="outlined" :loading="billingLoading" @click="editBilling">
            Editar informações de faturamento
          </v-btn>
          <div v-else-if="paymentsConfigured">
            <v-row>
              <v-col cols="12" sm="3">
                <p class="text-medium-emphasis mb-1">Tipo de Documento</p>
                <v-select v-model="billing.document_type" :items="DOCUMENT_TYPE_ITEMS" density="compact" />
              </v-col>
              <v-col cols="12" sm="3">
                <p class="text-medium-emphasis mb-1">CPF / CNPJ</p>
                <v-text-field v-model="billing.document_number" density="compact" />
              </v-col>
              <v-col cols="12" sm="6">
                <p class="text-medium-emphasis mb-1">{{ billingNameLabel }}</p>
                <v-text-field v-model="billing.company_name" density="compact" />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" sm="2">
                <p class="text-medium-emphasis mb-1">CEP</p>
                <v-text-field v-model="billing.postal_code" :loading="searchingCep" density="compact" @blur="fillFromCep" />
              </v-col>
              <v-col cols="12" sm="3">
                <p class="text-medium-emphasis mb-1">Bairro</p>
                <v-text-field v-model="billing.neighborhood" density="compact" />
              </v-col>
              <v-col cols="12" sm="3">
                <p class="text-medium-emphasis mb-1">Cidade</p>
                <v-text-field v-model="billing.city" density="compact" />
              </v-col>
              <v-col cols="12" sm="2">
                <p class="text-medium-emphasis mb-1">Estado</p>
                <v-select v-model="billing.state" :items="STATE_ITEMS" density="compact" />
              </v-col>
              <v-col cols="12" sm="2">
                <p class="text-medium-emphasis mb-1">País</p>
                <v-select v-model="billing.country" :items="COUNTRY_ITEMS" density="compact" />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" sm="6">
                <p class="text-medium-emphasis mb-1">Endereço</p>
                <v-text-field v-model="billing.street" density="compact" />
              </v-col>
              <v-col cols="12" sm="3">
                <p class="text-medium-emphasis mb-1">Número</p>
                <v-text-field v-model="billing.number" density="compact" />
              </v-col>
              <v-col cols="12" sm="3">
                <p class="text-medium-emphasis mb-1">Complemento</p>
                <v-text-field v-model="billing.complement" density="compact" />
              </v-col>
            </v-row>
            <v-btn class="mt-5" color="primary" variant="outlined" block :loading="billingSaving" @click="saveBilling">Salvar alterações</v-btn>
          </div>
        </v-card>

        <v-card class="pa-5 mb-4">
          <h2 class="mb-4">Histórico de pagamento</h2>
          <p v-if="!paymentsConfigured" class="text-center pa-4 text-medium-emphasis">Não há cobranças nem faturas no plano Local.</p>
          <p v-else-if="invoices.length === 0" class="text-center pa-4 text-medium-emphasis">Nenhum pagamento encontrado</p>
          <div v-for="invoice in invoices" :key="invoice.id" class="d-flex align-center justify-space-between pa-2 invoice-row">
            <div class="d-flex align-center">
              <v-avatar class="mr-4" color="faded">
                <v-icon color="primary">mdi-receipt-text-outline</v-icon>
              </v-avatar>
              <div>
                <h3>{{ invoiceMonth(invoice.paid_at) }}</h3>
                <p class="text-medium-emphasis">{{ invoiceDay(invoice.paid_at) }}</p>
              </div>
            </div>
            <div class="text-right">
              <h4>R$ {{ invoice.amount }}</h4>
              <v-btn variant="text" size="small" color="primary" @click="downloadInvoice(invoice)">
                <v-icon icon="mdi-download" />
                Baixar
              </v-btn>
            </div>
          </div>
          <v-pagination v-if="invoicePages > 1" v-model="invoicePage" :length="invoicePages" :total-visible="5" class="mt-4" />
        </v-card>
      </div>

      <!-- Plano: sem assinatura -->
      <div v-else>
        <div class="text-center mb-8">
          <h1 class="mb-3">Escolha seu plano</h1>
          <h2 class="text-medium-emphasis font-weight-regular">Automatize mais e desbloqueie recursos para o seu negócio crescer.</h2>
        </div>
        <UpgradePlanCard @subscribed="loadPlan" />
      </div>
    </div>

    <!-- Foto de perfil -->
    <v-dialog v-model="photoOpen" max-width="520">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Alterar foto de perfil</span>
          <v-btn icon="mdi-close" variant="text" @click="photoOpen = false" />
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-row class="ga-4" align="center" justify="space-around">
            <v-col cols="12" sm="5" class="d-flex flex-column align-center">
              <h4 class="mb-2">Atual</h4>
              <v-avatar rounded="lg" size="140" color="faded">
                <v-img v-if="user?.profile_image_url" :src="user.profile_image_url" cover />
                <v-icon v-else icon="mdi-account" size="50" />
              </v-avatar>
            </v-col>
            <v-icon size="28">mdi-arrow-right</v-icon>
            <v-col cols="12" sm="5" class="d-flex flex-column align-center">
              <h4 class="mb-2">Nova imagem</h4>
              <button class="photo-picker" @click="fileInput.click()">
                <v-img v-if="newPhoto" :src="newPhoto" cover width="140" height="140" />
                <v-icon v-else icon="mdi-image-plus-outline" size="40" />
              </button>
              <input ref="fileInput" type="file" accept="image/*" hidden @change="pickPhoto" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions class="d-flex pa-4 align-center justify-space-around">
          <v-btn variant="text" @click="photoOpen = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" :loading="savingPhoto" @click="savePhoto">Concluir</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Alterar senha -->
    <AppModal v-model="passwordOpen" width="min(90vw, 440px)">
      <v-form ref="passwordForm" @submit.prevent="submitPassword">
        <p>Senha atual</p>
        <v-text-field
          v-model="passwords.current"
          :type="visible.current ? 'text' : 'password'"
          :append-inner-icon="visible.current ? 'mdi-eye' : 'mdi-eye-off'"
          :rules="[required, lengthBetween(2, 100)]"
          @click:append-inner="visible.current = !visible.current"
        />
        <p>Sua nova senha</p>
        <v-text-field
          v-model="passwords.next"
          class="mb-2"
          :type="visible.next ? 'text' : 'password'"
          :append-inner-icon="visible.next ? 'mdi-eye' : 'mdi-eye-off'"
          :rules="[strongPassword]"
          @click:append-inner="visible.next = !visible.next"
        />
        <p>Confirmar sua nova senha</p>
        <v-text-field
          v-model="passwords.confirm"
          :type="visible.confirm ? 'text' : 'password'"
          :append-inner-icon="visible.confirm ? 'mdi-eye' : 'mdi-eye-off'"
          :rules="[strongPassword]"
          @click:append-inner="visible.confirm = !visible.confirm"
        />
        <div class="d-flex justify-start pb-2">
          <span class="cursor-pointer" @click="openReset">Esqueci minha senha</span>
        </div>
        <div class="d-flex justify-center">
          <v-btn color="primary" type="submit">Confirmar</v-btn>
        </div>
      </v-form>
    </AppModal>

    <AppModal v-model="resetOpen" width="min(90vw, 560px)">
      <div class="d-flex flex-column justify-center pb-2">
        <h2 class="mb-1">Informe seu email</h2>
        <p>Será enviado um link para definição de senha</p>
      </div>
      <v-text-field
        v-model="resetEmail"
        rounded="lg"
        density="compact"
        label="Email"
        :rules="[required, emailRule, lengthBetween(1, 100)]"
        class="pb-2"
        @keydown.enter="sendReset"
      />
      <v-btn block color="primary" :disabled="!resetEmail" :loading="sendingReset" @click="sendReset">Enviar email</v-btn>
    </AppModal>

    <!-- Cancelamento -->
    <ModalConfirm
      v-model="cancelOpen"
      header-text="Solicitar cancelamento"
      confirm-text="Solicitar"
      cancel-text="Cancelar"
      icon="mdi-alert-outline"
      @confirm="submitCancellation"
    >
      <p>Tem certeza que deseja solicitar o cancelamento da sua assinatura?</p>
      <p class="mt-4">Email:</p>
      <v-text-field v-model="cancelEmail" placeholder="email_exemplo@exemplo.com" density="compact" />
      <p class="mt-3">Motivo do cancelamento:</p>
      <v-textarea v-model="cancelReason" placeholder="O motivo do cancelamento é..." density="compact" />
    </ModalConfirm>

    <PaymentMethodsModal v-model="paymentOpen" />
  </div>
</template>

<style scoped>
.profile-container {
  max-width: 80vw;
}

.avatar-edit-wrapper {
  position: relative;
  cursor: pointer;
  border-radius: 50%;
}

.avatar-edit-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background-color: #00000073;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.avatar-edit-wrapper:hover .avatar-edit-overlay {
  opacity: 1;
}

.sensitive-on-hover {
  filter: blur(4px);
  transition: filter 0.2s ease;
}

.sensitive-on-hover:hover {
  filter: blur(0);
}

.photo-picker {
  width: 140px;
  height: 140px;
  border-radius: 8px;
  overflow: hidden;
  display: grid;
  place-items: center;
  border: 2px dashed rgb(var(--v-theme-primary));
}

.invoice-row {
  border-bottom: 1px solid rgb(var(--v-theme-card-outline));
}

@media (max-width: 960px) {
  .profile-container {
    max-width: calc(100vw - 32px);
  }
}
</style>
