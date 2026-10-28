<script setup>
// Painel de parceiro: saldos e atividades precisam ser fornecidos pelo servidor.
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import AppModal from '@trama/components/AppModal.vue'
import { db, fetchPartnerEarnings, fetchPartnerInfo, requestPartnerWithdraw } from '@trama/services/api'
import { required } from '@trama/utils/rules'
import { toastError, toastSuccess } from '@trama/composables/useToast'

const DOCUMENT_TYPES = [
  { text: 'CPF', value: 'br_cpf', placeholder: '000.000.000-00', digits: 11 },
  { text: 'CNPJ', value: 'br_cnpj', placeholder: '00.000.000/0000-00', digits: 14 },
]

const EVENT_STATUS = {
  1: { text: 'PAGO', color: 'primary' },
  2: { text: 'CANCELADO', color: 'warning' },
  4: { text: 'TEMPLATE', color: 'info' },
  5: { text: 'YOUTUBE ADS', color: 'info' },
}

const HEADERS = [
  { title: 'NOME', key: 'user_referred.fullname', sortable: false },
  { title: 'DATA', key: 'created_at', sortable: false },
  { title: 'VALOR', key: 'comission', sortable: false },
  { title: 'EVENTO', key: 'status', sortable: false },
]

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const money = (value) => brl.format(Number(value || 0))

const partner = ref(null)
const loading = ref(true)
const loadError = ref('')
const paymentsConfigured = computed(() => db.capabilities?.payments === true)
const earnings = ref({ data: [], meta: { last_page: 1 } })
const loadingEarnings = ref(false)
const page = ref(1)

const withdrawOpen = ref(false)
const withdrawForm = useTemplateRef('withdrawForm')
const withdrawing = ref(false)
const docType = ref('br_cpf')
const withdraw = ref({ document: '', pix: '', amount: '' })
const showDocument = ref(false)
const showPix = ref(false)

const docInfo = computed(() => DOCUMENT_TYPES.find((d) => d.value === docType.value))
const totalEarned = computed(() => (partner.value ? Number(partner.value.available_balance) + Number(partner.value.won_balance) : 0))

// Usuários indicados únicos e quantos deles já geraram comissão.
const referralStats = computed(() => {
  const events = earnings.value.data ?? []
  const unique = (list) => new Set(list.map((e) => e.user_referred.id)).size
  return [
    { label: 'Usuários registrados', color: 'warning', value: unique(events) },
    { label: 'Usuários pagantes', color: 'purple', value: unique(events.filter((e) => Number(e.comission) > 0)) },
  ]
})

onMounted(async () => {
  try {
    if (!paymentsConfigured.value) { loadError.value = 'Parcerias e saques não estão configurados nesta instalação.'; return }
    partner.value = await fetchPartnerInfo()
    await loadEarnings()
  } catch (error) {
    loadError.value = error.userMessage || 'Não foi possível consultar a conta de parceiro.'
  } finally {
    loading.value = false
  }
})

watch(page, loadEarnings)

async function loadEarnings() {
  loadingEarnings.value = true
  try {
    earnings.value = await fetchPartnerEarnings(page.value)
  } catch (error) {
    toastError({ text: error.userMessage || 'Não foi possível consultar a atividade de indicações.' })
  } finally {
    loadingEarnings.value = false
  }
}

function openWithdraw() {
  if (!paymentsConfigured.value) { toastError({ text: 'O processador de pagamentos não está configurado.' }); return }
  const document = partner.value?.document ?? ''
  docType.value = document.replace(/\D/g, '').length === 14 ? 'br_cnpj' : 'br_cpf'
  withdraw.value = { document, pix: partner.value?.pix ?? '', amount: '' }
  withdrawOpen.value = true
}

const parseAmount = (value) => Number(String(value).replace(/\./g, '').replace(',', '.'))

const documentRule = (v) => (String(v ?? '').replace(/\D/g, '').length === docInfo.value.digits ? true : `${docInfo.value.text} inválido`)
const amountRule = (v) => {
  const amount = parseAmount(v)
  if (Number.isNaN(amount) || amount < 100) return 'o valor mínimo é R$ 100,00'
  if (amount > Number(partner.value?.available_balance)) return `o valor disponível para saque é ${money(partner.value?.available_balance)}`
  return true
}

async function submitWithdraw() {
  if (!paymentsConfigured.value) return
  const { valid } = await withdrawForm.value.validate()
  if (!valid) return
  withdrawing.value = true
  try {
    const balances = await requestPartnerWithdraw(parseAmount(withdraw.value.amount), {
      pix: withdraw.value.pix,
      document: withdraw.value.document.replace(/\D/g, ''),
    })
    Object.assign(partner.value, balances, { pix: withdraw.value.pix, document: withdraw.value.document })
    toastSuccess({
      title: 'Saque solicitado!',
      text: 'A solicitação foi registrada pelo provedor. Consulte o status antes de enviar um novo pedido.',
    })
    withdrawOpen.value = false
  } catch (error) {
    toastError({ text: error.userMessage || 'Não foi possível solicitar o saque.' })
  } finally {
    withdrawing.value = false
  }
}
</script>

<template>
  <div class="page-padding">
    <v-row v-if="!loading && partner" no-gutters>
      <v-col lg="3" md="6" cols="12" class="px-5 mb-6">
        <v-card class="pa-5 partner-card partner-card--green" height="100%">
          <p>Disponível para saque</p>
          <h1>{{ money(partner.available_balance) }}</h1>
          <div class="mt-3">
            <v-btn color="primary" :disabled="!paymentsConfigured" @click="openWithdraw">Solicitar saque</v-btn>
          </div>
        </v-card>
      </v-col>
      <v-col lg="3" md="6" cols="12" class="px-5 mb-6">
        <v-card class="pa-5 partner-card partner-card--purple" height="100%">
          <p>Você já ganhou</p>
          <h1>{{ money(totalEarned) }}</h1>
          <div class="mt-5">Com indicações Trama</div>
          <v-menu activator="parent" open-on-hover>
            <v-card class="pa-5" min-width="260">
              <div v-for="stat in referralStats" :key="stat.label" class="d-flex justify-space-between py-1 align-center">
                <div>
                  <v-icon icon="mdi-minus-thick" :color="stat.color" />
                  {{ stat.label }}
                </div>
                <div class="font-weight-bold">{{ stat.value }}</div>
              </div>
            </v-card>
          </v-menu>
        </v-card>
      </v-col>
      <v-col lg="6" md="12" cols="12" class="px-5 mb-6">
        <v-card class="pa-5" height="100%">
          <div class="d-flex align-start">
            <v-icon icon="mdi-information-outline" color="warning" size="28" class="mr-3 mt-1" />
            <div>
              <h2 class="mb-3">Link de indicação e cupons</h2>
              <p class="mb-3">Consulte os recursos disponíveis para sua conta de parceiro.</p>
              <p class="mb-3">
                Links e cupons de indicação dependem da configuração do programa nesta instalação.
                Saldos e solicitações de saque são confirmados pelo provedor de pagamentos.
              </p>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-else-if="loading" no-gutters class="mb-10">
      <v-col v-for="n in 3" :key="n" cols="4" class="px-5">
        <v-skeleton-loader type="card" />
      </v-col>
    </v-row>

    <v-alert v-else type="info" variant="tonal" class="mx-5 mb-8">{{ loadError || 'Não há conta de parceiro configurada.' }}</v-alert>

    <div v-if="partner" class="px-5">
      <v-card>
        <div class="px-4 py-3 d-flex justify-space-between align-center">
          <h3>Atividade</h3>
        </div>
        <v-data-table
          class="partners-table"
          :headers="HEADERS"
          :items="earnings.data"
          :items-per-page="10"
          :loading="loadingEarnings"
          hide-default-footer
        >
          <template #[`item.created_at`]="{ value }">{{ new Date(value).toLocaleDateString('pt-BR') }}</template>
          <template #[`item.comission`]="{ value }">{{ money(value) }}</template>
          <template #[`item.status`]="{ value }">
            <v-chip rounded="lg" :color="EVENT_STATUS[value]?.color ?? 'grey'">{{ EVENT_STATUS[value]?.text ?? 'REGISTRADO' }}</v-chip>
          </template>
          <template #no-data>
            <div class="py-10">
              <h2 class="text-muted mb-5">Nenhuma atividade de indicados</h2>
            </div>
          </template>
        </v-data-table>
        <v-pagination v-model="page" class="my-4" :total-visible="8" active-color="primary" :length="earnings.meta.last_page" />
      </v-card>
    </div>

    <AppModal v-if="paymentsConfigured" v-model="withdrawOpen" width="min(92vw, 600px)" :prevent-close="withdrawing">
      <v-form ref="withdrawForm" @submit.prevent="submitWithdraw">
        <div class="mb-10"><h2>Solicitar saque</h2></div>
        <v-row density="compact">
          <v-col cols="4">
            <p class="pb-2">Código Fiscal</p>
            <v-select v-model="docType" :items="DOCUMENT_TYPES" item-title="text" item-value="value" density="compact" :rules="[required]" />
          </v-col>
          <v-col cols="8">
            <p class="pb-2">Documento</p>
            <v-text-field
              v-model="withdraw.document"
              density="compact"
              :placeholder="docInfo.placeholder"
              :type="showDocument ? 'text' : 'password'"
              :append-inner-icon="showDocument ? 'mdi-eye-off' : 'mdi-eye'"
              :rules="[required, documentRule]"
              @click:append-inner="showDocument = !showDocument"
            />
          </v-col>
        </v-row>
        <div class="mb-10">
          <p>Disponível para saque</p>
          <h1>{{ money(partner?.available_balance) }}</h1>
        </div>
        <v-text-field
          v-model="withdraw.pix"
          label="Chave PIX"
          :type="showPix ? 'text' : 'password'"
          :rules="[required]"
          :append-inner-icon="showPix ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="showPix = !showPix"
        />
        <v-divider class="my-5" />
        <p>Valor</p>
        <v-text-field
          v-model="withdraw.amount"
          prefix="R$"
          class="mb-10"
          placeholder="100,00"
          messages="Valor mínimo de saque R$ 100,00"
          :rules="[required, amountRule]"
        />
        <div class="text-center">
          <div>
            <v-btn color="primary" class="mb-3 px-15" type="submit" :loading="withdrawing">Confirmar</v-btn>
          </div>
          <v-btn variant="text" :disabled="withdrawing" @click="withdrawOpen = false">Cancelar</v-btn>
        </div>
      </v-form>
    </AppModal>
  </div>
</template>

<style scoped>
.page-padding {
  padding: 60px;
}

.partner-card {
  background-repeat: no-repeat;
}

.partner-card--green {
  background-image: radial-gradient(circle at 110% 120%, rgba(40, 199, 56, 0.28), transparent 55%);
}

.partner-card--purple {
  background-image: radial-gradient(circle at 110% 120%, rgba(110, 40, 199, 0.32), transparent 55%);
}

.partners-table :deep(thead > tr) {
  background-color: color-mix(in srgb, rgb(var(--v-theme-faded)), transparent 80%);
}

@media (max-width: 960px) {
  .page-padding {
    padding: 24px 8px;
  }
}
</style>
