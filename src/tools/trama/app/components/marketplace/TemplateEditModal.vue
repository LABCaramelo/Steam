<script setup>
import { computed, ref, useTemplateRef, watch } from 'vue'
import ModalConfirm from '@trama/components/ModalConfirm.vue'
import { db, deleteTemplate, getFlux, orgFluxes, updateTemplate } from '@trama/services/api'
import { useSession } from '@trama/composables/useSession'
import { lengthBetween, required } from '@trama/utils/rules'
import { toastError, toastSuccess } from '@trama/composables/useToast'

const props = defineProps({
  template: { type: Object, default: null },
})

const emit = defineEmits(['saved'])
const model = defineModel({ type: Boolean, default: false })

const form = useTemplateRef('form')
const loading = ref(false)
const { user } = useSession()
const isNew = computed(() => !props.template?.id)
const flows = computed(() => orgFluxes())
const sourceFlowId = ref(null)
const paymentsConfigured = computed(() => db.capabilities?.payments === true)
const free = ref(false)
const updateFlux = ref(false)
const fields = ref({ title: '', description: '', price: '' })

const maxLines = (n) => (v) => (String(v ?? '').split('\n').length <= n ? true : `Máximo de ${n} linhas`)
const priceRange = (min, max) => (v) => {
  const cents = toCents(v)
  return cents >= min * 100 && cents <= max * 100 ? true : `Valor entre R$ ${min} e R$ ${max}`
}

watch(model, (open) => {
  if (!open) return
  fields.value = {
    title: props.template?.name ?? '',
    description: props.template?.description ?? '',
    price: formatCents(props.template?.price),
  }
  free.value = true
  updateFlux.value = isNew.value
  sourceFlowId.value = props.template?.source_flow_id ?? null
})

watch(free, (value) => {
  if (value) fields.value.price = '0,00'
})

function formatCents(cents) {
  return cents == null ? '0,00' : (cents / 100).toFixed(2).replace('.', ',')
}

function toCents(value) {
  const text = String(value ?? '').replace(/[^\d,]/g, '').replace(',', '.')
  return Math.round(Number(text || 0) * 100)
}

// Máscara de moeda do original: digita só números e a vírgula fica nas duas últimas casas.
function maskPrice(value) {
  const digits = String(value).replace(/\D/g, '')
  let whole = digits.slice(0, -2)
  const decimals = digits.slice(-2).padStart(2, '0')
  whole = (whole.replace(/^0+(?=\d)/, '') || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  fields.value.price = `${whole},${decimals}`
}

async function save() {
  if (loading.value) return
  const { valid } = await form.value.validate()
  if (!valid) return
  loading.value = true
  try {
    let graph = {}
    if (isNew.value || updateFlux.value) {
      const flow = await getFlux(sourceFlowId.value)
      if (!Array.isArray(flow.steps) || !Array.isArray(flow.edges)) throw new Error('O fluxo precisa conter nós e conexões válidos.')
      graph = {
        source_flow_id: flow.id, steps: flow.steps, edges: flow.edges,
        settings: flow.settings, test_input: flow.test_input,
        apps: [...new Set(flow.steps.filter(step => !['webhook', 'scheduler'].includes(step.app)).map(step => step.app))],
      }
    }
    await updateTemplate(props.template?.id ?? null, {
      name: fields.value.title.trim(),
      description: fields.value.description.trim(),
      price: 0,
      owner_id: user.value.id, status: 'own', ...graph,
    })
    toastSuccess({ text: isNew.value ? 'Template criado com sucesso.' : 'Template atualizado com sucesso.', icon: 'mdi-check' })
    emit('saved')
    model.value = false
  } catch (error) {
    toastError({ text: error.userMessage ?? error.message ?? 'Não foi possível salvar o template.' })
  } finally {
    loading.value = false
  }
}

async function remove() {
  if (!props.template?.id || loading.value) return
  loading.value = true
  try {
    await deleteTemplate(props.template.id)
    toastSuccess({ title: 'Template removido', text: 'Seu template foi deletado.', icon: 'mdi-check' })
    emit('saved')
    model.value = false
  } catch (error) {
    toastError({ text: error?.userMessage || 'Não foi possível deletar o template.' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-dialog v-model="model" max-width="800" :persistent="loading">
    <v-card class="pa-4">
      <div class="d-flex justify-center mb-4">
        <h2>{{ isNew ? 'Criar Template' : 'Editar Template' }}</h2>
      </div>
      <v-card-text>
        <v-form ref="form" class="mb-2">
          <v-alert v-if="!paymentsConfigured" type="info" variant="tonal" class="mb-4">
            Seus templates ficam neste espaço privado para usar em outros fluxos.
          </v-alert>
          <v-text-field
            v-model="fields.title"
            label="Título"
            placeholder="Título"
            class="mb-4"
            :rules="[required, lengthBetween(3, 30)]"
          />
          <v-textarea
            v-model="fields.description"
            label="Descrição"
            placeholder="Descrição"
            density="compact"
            :rules="[required, lengthBetween(10, 120), maxLines(2)]"
            messages="Limite: entre 10 e 120 caracteres, até 2 linhas"
            maxlength="120"
            counter
          />
          <v-switch v-if="paymentsConfigured" v-model="free" class="w-50 mb-2" inset hide-details color="primary">
            <template #label>
              <div class="d-inline-flex align-center">
                Gratuito
                <v-tooltip text="Define o template como gratuito, removendo o valor cobrado pelo uso do template" location="top">
                  <template #activator="{ props: tip }">
                    <v-icon v-bind="tip" size="18" class="ml-1" color="info">mdi-help-circle-outline</v-icon>
                  </template>
                </v-tooltip>
              </div>
            </template>
          </v-switch>
          <v-text-field
            v-if="paymentsConfigured && !free"
            :model-value="fields.price"
            prefix="R$"
            label="Valor do template"
            placeholder="Valor do template"
            :rules="[required, priceRange(5, 200)]"
            maxlength="6"
            @update:model-value="maskPrice"
          />
          <v-switch v-if="!isNew" v-model="updateFlux" class="w-50" inset hide-details color="primary">
            <template #label>
              <div class="d-inline-flex align-center">
                Atualizar template
                <v-tooltip text="Atualizar o template com as alterações feitas no fluxo" location="top">
                  <template #activator="{ props: tip }">
                    <v-icon v-bind="tip" size="18" class="ml-1" color="info">mdi-help-circle-outline</v-icon>
                  </template>
                </v-tooltip>
              </div>
            </template>
          </v-switch>
          <v-select
            v-if="isNew || updateFlux"
            v-model="sourceFlowId"
            :items="flows"
            item-title="name"
            item-value="id"
            label="Fluxo de origem"
            :rules="[required]"
            hint="Salva uma cópia dos nós, conexões, configurações e entrada de teste."
            persistent-hint
          />
        </v-form>
      </v-card-text>
      <div class="d-flex justify-space-between mx-6">
        <div class="d-flex align-center">
          <v-btn v-if="!isNew" variant="text" class="text-error" :disabled="loading">
            <v-icon icon="mdi-delete-outline" />
            Deletar
            <v-tooltip activator="parent" location="top">Excluir seu template</v-tooltip>
            <ModalConfirm
              activator="parent"
              header-text="Deletar Template"
              confirm-text="Deletar template"
              cancel-text="Cancelar"
              color="error"
              icon="mdi-alert-outline"
              close-on-confirm
              @confirm="remove"
            >
              <p>Tem certeza que deseja excluir seu template?</p>
            </ModalConfirm>
          </v-btn>
        </div>
        <div class="w-100 ml-4">
          <v-btn class="w-50" size="large" variant="text" :disabled="loading" @click="model = false">Cancelar</v-btn>
          <v-btn class="w-50" color="primary" :loading="loading" size="large" variant="flat" @click="save">{{ isNew ? 'Criar' : 'Salvar' }}</v-btn>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>
