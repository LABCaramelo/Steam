<script setup>
import { computed, ref } from 'vue'
import BillingAddressModal from './BillingAddressModal.vue'
import { PLUS_PLAN, db, subscribe } from '@trama/services/api'
import { toastError, toastSuccess } from '@trama/composables/useToast'

// Cartão do plano Plus (ComponentUpgradePlan no original).
const FEATURES = [
  { key: 'monthlyOperations', prefix: 'Operações', highlight: 'ilimitadas' },
  { key: 'activeIntegrations', prefix: 'Integrações', highlight: 'ilimitadas' },
  { key: 'chatSupport', prefix: 'Suporte via chat' },
  {
    key: 'mentoring',
    prefix: '10 horas de mentoria semanal',
    explanation: 'Mentoria ao vivo com especialista via Google Meet. 10h por semana de acompanhamento personalizado.',
  },
  {
    key: 'courses',
    prefix: 'Acesso à plataforma de cursos',
    explanation: 'Trilhas de Gestão, Pessoas e Tecnologia para acelerar o seu negócio.',
  },
  {
    key: 'community',
    prefix: 'Comunidade no WhatsApp',
    explanation: 'Comunidade no WhatsApp com usuários compartilhando ideias de automação, soluções e aprendizados diários.',
  },
]

const emit = defineEmits(['subscribed'])
const billingOpen = ref(false)
const buying = ref(false)
const paymentsConfigured = computed(() => db.capabilities?.payments === true)
const localPlan = computed(() => !paymentsConfigured.value)

const cta = computed(() =>
  db.subscription?.tier_name === PLUS_PLAN.key ? { label: 'Plano Atual', disabled: true } : { label: 'Comprar', disabled: false },
)

async function purchase() {
  if (!paymentsConfigured.value) { toastError({ text: 'O processador de pagamentos não está configurado nesta instalação.' }); return }
  buying.value = true
  try {
    const result = await subscribe(PLUS_PLAN)
    if (result?.checkout_url) {
      const url = new URL(result.checkout_url)
      if (url.protocol !== 'https:') throw new Error('Link de pagamento inválido.')
      window.location.assign(url.href)
    } else if (result?.status === 'active') {
      toastSuccess({ title: 'Plano ativo', text: 'A assinatura foi confirmada pelo provedor.', icon: 'mdi-crown' })
      emit('subscribed')
    } else throw new Error('O provedor não confirmou a assinatura nem devolveu um link de pagamento.')
  } catch (error) {
    toastError({ text: error.userMessage || error.message || 'Não foi possível iniciar a contratação.' })
  } finally {
    buying.value = false
  }
}

function onBuy() {
  if (!paymentsConfigured.value) return
  if (cta.value.disabled) return
  if (db.billingAddress?.document_number) purchase()
  else billingOpen.value = true
}
</script>

<template>
  <div class="plans-page">
    <v-card class="plan-card mx-auto" elevation="0">
      <div class="plan-card__accent" />
      <v-card-text v-if="localPlan" class="pa-10 text-center">
        <v-icon icon="mdi-server-outline" color="primary" size="44" class="mb-4" />
        <h2 class="plan-card__title">Local</h2>
        <h3 class="mt-4">Sem cobrança</h3>
        <p class="text-medium-emphasis mt-4">As integrações são executadas neste servidor. O uso das APIs externas segue as condições das conexões configuradas.</p>
        <v-alert type="info" variant="tonal" density="compact" class="mt-6 text-left">Pagamentos e assinaturas comerciais não estão configurados.</v-alert>
        <v-btn class="mt-6" variant="tonal" color="primary" disabled>Plano atual</v-btn>
      </v-card-text>
      <v-card-text v-else class="pa-12 d-flex flex-column">
        <div class="d-flex flex-column align-center text-center">
          <h2 class="plan-card__title font-weight-bold">{{ PLUS_PLAN.title }}</h2>
          <div class="d-flex align-end ga-1 mt-4">
            <span class="plan-card__installments mb-2">{{ PLUS_PLAN.installments }}x</span>
            <span class="plan-card__price font-weight-bold">{{ PLUS_PLAN.price }}</span>
            <span class="plan-card__period-unit mb-2">/mês</span>
          </div>
          <span class="plan-card__plan-label mt-1">no plano anual</span>
        </div>
        <v-divider class="my-8" />
        <div class="plan-card__features">
          <div v-for="feature in FEATURES" :key="feature.key" class="plan-card__feature">
            <v-icon color="success" size="20">mdi-check</v-icon>
            <span>
              {{ feature.prefix }}
              <span v-if="feature.highlight" class="plan-card__feature-highlight font-weight-bold">{{ feature.highlight }}</span>
            </span>
            <v-tooltip v-if="feature.explanation" location="top" max-width="320">
              <template #activator="{ props: tip }">
                <v-icon v-bind="tip" color="info" size="14">mdi-help-circle-outline</v-icon>
              </template>
              <span>{{ feature.explanation }}</span>
            </v-tooltip>
          </div>
        </div>
        <v-btn class="plan-card__cta mt-10" color="primary" rounded="lg" size="large" :disabled="cta.disabled" :loading="buying" @click="onBuy">
          {{ cta.label }}
        </v-btn>
      </v-card-text>
    </v-card>
    <BillingAddressModal v-if="paymentsConfigured" v-model="billingOpen" @saved="purchase" />
  </div>
</template>

<style scoped>
.plans-page {
  width: 100%;
  padding: 2rem 1.5rem 4rem;
  display: flex;
  justify-content: center;
}

.plan-card {
  width: 100%;
  max-width: 32rem;
  border: 0.0625rem solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 1.25rem;
  position: relative;
  overflow: hidden;
}

.plan-card__accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 0.25rem;
  background: linear-gradient(90deg, rgb(var(--v-theme-primary)), rgba(var(--v-theme-primary), 0.6));
}

.plan-card__title {
  font-size: 2.25rem;
  line-height: 1.1;
  color: rgb(var(--v-theme-primary));
}

.plan-card__price {
  font-size: 3rem;
  line-height: 1;
  letter-spacing: -0.02em;
}

.plan-card__installments {
  font-size: 1.25rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  line-height: 1;
}

.plan-card__period-unit {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-weight: 500;
}

.plan-card__plan-label {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.plan-card__features {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.25rem;
  width: fit-content;
  margin: 0 auto;
}

.plan-card__feature {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1rem;
}

.plan-card__feature-highlight {
  color: rgb(var(--v-theme-primary));
}

.plan-card__cta {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
  height: 3.25rem;
}
</style>
