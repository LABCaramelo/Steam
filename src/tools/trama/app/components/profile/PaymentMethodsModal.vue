<script setup>
import { computed, ref, watch } from 'vue'
import AppModal from '@trama/components/AppModal.vue'
import { db, deletePaymentMethod, listPaymentMethods, setDefaultPaymentMethod } from '@trama/services/api'
import { toastError } from '@trama/composables/useToast'

const model = defineModel({ type: Boolean, default: false })
const cards = ref([]), loadingCards = ref(false), busyId = ref(null), loadError = ref('')
const paymentsConfigured = computed(() => db.capabilities?.payments === true)
const setupUrl = computed(() => {
  try { const url = new URL(db.capabilities?.payment_setup_url || ''); return url.protocol === 'https:' ? url.href : '' } catch { return '' }
})
watch(model, value => { if (value) load() })
async function load() {
  cards.value = []; loadError.value = ''
  if (!paymentsConfigured.value) return
  loadingCards.value = true
  try { cards.value = await listPaymentMethods() }
  catch (error) { loadError.value = error.userMessage || 'Não foi possível consultar as formas de pagamento.' }
  finally { loadingCards.value = false }
}
async function makeDefault(id) {
  if (!paymentsConfigured.value) return
  busyId.value = id
  try { await setDefaultPaymentMethod(id); await load() }
  catch (error) { toastError({ text: error.userMessage || 'Não foi possível alterar a forma de pagamento padrão.' }) }
  finally { busyId.value = null }
}
async function remove(id) {
  if (!paymentsConfigured.value) return
  busyId.value = id
  try { await deletePaymentMethod(id); await load() }
  catch (error) { toastError({ text: error.userMessage || 'Não foi possível remover a forma de pagamento.' }) }
  finally { busyId.value = null }
}
</script>

<template>
  <AppModal v-model="model" width="min(90vw, 720px)">
    <header class="d-flex justify-space-between align-center flex-wrap ga-4 mb-6">
      <div><h1>Formas de pagamento</h1><p>Gerencie suas preferências de cobrança.</p></div>
      <v-btn v-if="paymentsConfigured && setupUrl" :href="setupUrl" target="_blank" rel="noopener noreferrer" color="primary" prepend-icon="mdi-plus">Adicionar nova forma</v-btn>
    </header>
    <v-alert v-if="!paymentsConfigured" type="info" variant="tonal" class="mb-5">
      O processador de pagamentos não está configurado. Esta instalação usa o plano Local, sem cobrança.
    </v-alert>
    <v-alert v-else-if="!setupUrl" type="info" variant="tonal" class="mb-5">
      O provedor ainda não disponibilizou um link para cadastrar formas de pagamento.
    </v-alert>
    <v-alert v-if="loadError" type="error" variant="tonal" class="mb-5">{{ loadError }}</v-alert>
    <h3>Suas formas de pagamento</h3>
    <div v-if="loadingCards" class="text-center pa-6"><v-progress-circular indeterminate color="primary" /></div>
    <div v-else-if="!cards.length" class="pa-8 text-center text-medium-emphasis">
      <v-icon size="40" class="mb-3">mdi-credit-card-off-outline</v-icon>
      <p>Nenhuma forma de pagamento cadastrada</p>
    </div>
    <div v-else class="d-flex flex-column ga-3 mt-4">
      <v-card v-for="item in cards" :key="item.id" class="pa-3">
        <div class="d-flex align-center justify-space-between flex-wrap ga-3">
          <div class="d-flex align-center ga-3"><v-icon color="primary">mdi-credit-card-outline</v-icon><div><p class="text-capitalize">{{ item.card_brand || 'Cartão' }} terminado em {{ item.last_four }}</p><p class="text-small text-medium-emphasis">Validade {{ item.expiration_date }}</p></div></div>
          <div class="d-flex align-center ga-2">
            <v-chip v-if="item.is_default" color="primary">Padrão</v-chip>
            <v-btn v-else size="small" variant="text" :loading="busyId === item.id" @click="makeDefault(item.id)">Tornar padrão</v-btn>
            <v-btn icon="mdi-trash-can-outline" size="small" variant="text" color="error" aria-label="Remover forma de pagamento" :disabled="busyId !== null" @click="remove(item.id)" />
          </div>
        </div>
      </v-card>
    </div>
    <p v-if="paymentsConfigured" class="text-small text-medium-emphasis mt-5">O cadastro de cartão é realizado no ambiente seguro do provedor de pagamentos.</p>
  </AppModal>
</template>
