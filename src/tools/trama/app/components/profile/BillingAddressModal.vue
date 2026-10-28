<script setup>
import { computed, ref, useTemplateRef, watch } from 'vue'
import { getBillingAddress, saveBillingAddress } from '@trama/services/api'
import { COUNTRY_ITEMS, DOCUMENT_TYPE_ITEMS, EMPTY_ADDRESS, STATE_ITEMS, documentLabel, lookupCep } from '@trama/utils/billing'
import { lengthBetween, required } from '@trama/utils/rules'
import { toastError, toastSuccess } from '@trama/composables/useToast'

// Modal "Dados de faturamento" exibido antes da compra de um plano (UpgradePlan no original).
const emit = defineEmits(['saved'])
const model = defineModel({ type: Boolean, default: false })

const form = useTemplateRef('form')
const saving = ref(false)
const searchingCep = ref(false)
const address = ref({ ...EMPTY_ADDRESS })
const nameLabel = computed(() => documentLabel(address.value.document_type))

watch(model, async (open) => {
  if (!open) return
  try {
    address.value = { ...EMPTY_ADDRESS, ...(await getBillingAddress()) }
  } catch (error) {
    toastError({ text: error.userMessage ?? 'Não foi possível carregar o endereço de faturamento.' })
    model.value = false
  }
})

async function fillFromCep() {
  const cep = address.value.postal_code
  if (String(cep).replace(/\D/g, '').length !== 8) return
  searchingCep.value = true
  try {
    const data = await lookupCep(cep)
    Object.assign(address.value, {
      street: data.street || address.value.street,
      neighborhood: data.neighborhood || address.value.neighborhood,
      city: data.city || address.value.city,
      state: data.state || address.value.state,
      country: 'BR',
    })
    toastSuccess({ title: 'CEP encontrado', text: 'Endereço preenchido automaticamente.' })
  } catch {
    toastError({ title: 'CEP não encontrado', text: 'Não foi possível encontrar o endereço para este CEP.' })
  } finally {
    searchingCep.value = false
  }
}

async function save() {
  const { valid } = await form.value.validate()
  if (!valid || saving.value) return
  saving.value = true
  try {
    await saveBillingAddress({ ...address.value, document_number: address.value.document_number.replace(/\D/g, '') })
    toastSuccess({ text: 'Dados de faturamento salvos com sucesso.' })
    model.value = false
    emit('saved')
  } catch {
    toastError({ text: 'Não foi possível salvar os dados de faturamento.' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-dialog v-model="model" width="800">
    <v-card>
      <div class="d-flex align-center justify-space-between pa-4 pb-3">
        <div>
          <h2>Dados de faturamento</h2>
          <p class="mt-1">Preencha os dados para emissão da nota fiscal</p>
        </div>
        <v-btn icon="mdi-close" size="small" variant="text" @click="model = false" />
      </div>
      <v-divider />
      <v-form ref="form">
        <v-card-text class="pt-4">
          <h4 class="mb-3">Documento</h4>
          <v-row dense>
            <v-col cols="12" sm="4">
              <p class="mb-1">Tipo</p>
              <v-select v-model="address.document_type" :items="DOCUMENT_TYPE_ITEMS" :rules="[required]" density="compact" />
            </v-col>
            <v-col cols="12" sm="4">
              <p class="mb-1">Número do Documento</p>
              <v-text-field v-model="address.document_number" :rules="[required, lengthBetween(11, 50)]" density="compact" />
            </v-col>
            <v-col cols="12" sm="4">
              <p class="mb-1">{{ nameLabel }}</p>
              <v-text-field v-model="address.company_name" :rules="[required, lengthBetween(2, 255)]" density="compact" />
            </v-col>
          </v-row>
          <v-divider class="my-4" />
          <h4 class="mb-3">Localização</h4>
          <v-row dense>
            <v-col cols="12" sm="3">
              <p class="mb-1">CEP</p>
              <v-text-field
                v-model="address.postal_code"
                :rules="[required, lengthBetween(8, 20)]"
                :loading="searchingCep"
                density="compact"
                placeholder="00000-000"
                @blur="fillFromCep"
              />
            </v-col>
            <v-col cols="12" sm="5">
              <p class="mb-1">Cidade</p>
              <v-text-field v-model="address.city" :rules="[required, lengthBetween(2, 100)]" density="compact" />
            </v-col>
            <v-col cols="12" sm="2">
              <p class="mb-1">Estado</p>
              <v-select v-model="address.state" :items="STATE_ITEMS" :rules="[required]" density="compact" />
            </v-col>
            <v-col cols="12" sm="2">
              <p class="mb-1">País</p>
              <v-select v-model="address.country" :items="COUNTRY_ITEMS" :rules="[required]" density="compact" />
            </v-col>
          </v-row>
          <v-divider class="my-4" />
          <h4 class="mb-3">Endereço</h4>
          <v-row dense>
            <v-col cols="12" sm="6">
              <p class="mb-1">Logradouro</p>
              <v-text-field v-model="address.street" :rules="[required, lengthBetween(2, 255)]" density="compact" placeholder="Av. Paulista" />
            </v-col>
            <v-col cols="12" sm="3">
              <p class="mb-1">Bairro</p>
              <v-text-field v-model="address.neighborhood" :rules="[required, lengthBetween(2, 100)]" density="compact" />
            </v-col>
            <v-col cols="12" sm="3">
              <p class="mb-1">Número</p>
              <v-text-field v-model="address.number" :rules="[required, lengthBetween(1, 20)]" density="compact" placeholder="144" />
            </v-col>
            <v-col cols="12">
              <p class="mb-1">Complemento</p>
              <v-text-field v-model="address.complement" :rules="[lengthBetween(2, 100)]" density="compact" placeholder="Ap. 220 - Torre A" />
            </v-col>
          </v-row>
        </v-card-text>
      </v-form>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="model = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" @click="save">Salvar e continuar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
