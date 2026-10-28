<script setup>
import { ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import AppModal from '@trama/components/AppModal.vue'
import { createFlux } from '@trama/services/api'
import { toastError } from '@trama/composables/useToast'
import { lengthBetween, required } from '@trama/utils/rules'

const router = useRouter()
const open = ref(false)
const loading = ref(false)
const name = ref('')
const form = useTemplateRef('form')

async function submit() {
  const { valid } = await form.value.validate()
  if (!valid) return
  loading.value = true
  try {
    const flux = await createFlux({ name: name.value.trim() })
    open.value = false
    name.value = ''
    router.push({ name: 'flux', params: { fluxId: flux.id } })
  } catch (error) {
    toastError({ text: error.userMessage ?? 'Não foi possível criar a integração.' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-btn class="cm-brand-action trama-new-flow" rounded size="large" :disabled="loading" @click="open = true">
    <v-icon icon="mdi-plus" size="22" />
    <span class="mr-1">Novo fluxo</span>
    <v-tooltip activator="parent" location="top">Criar nova integração</v-tooltip>
  </v-btn>

  <AppModal v-model="open" max-width="450px" :prevent-close="loading">
    <div class="create-flux-icon-container">
      <div class="create-flux-icon">
        <v-icon icon="custom:trama-logo" size="90" color="primary" />
      </div>
    </div>
    <h3 class="mb-4 position-relative">Nomeie sua integração!</h3>
    <v-form ref="form" :disabled="loading" class="position-relative" @submit.prevent="submit">
      <div class="mb-2">
        <v-text-field v-model="name" label="Nome do fluxo" autofocus :rules="[required, lengthBetween(0, 50)]" />
      </div>
      <div class="text-center">
        <v-btn class="mr-5" color="primary" variant="text" @click="open = false">Cancelar</v-btn>
        <v-btn color="primary" type="submit" :loading="loading">Começar!</v-btn>
      </div>
    </v-form>
  </AppModal>
</template>

<style scoped>
.create-flux-icon-container {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  pointer-events: none;
}

.create-flux-icon-container .create-flux-icon {
  position: absolute;
  right: 0;
  top: 0;
  transform: translate(15%, -15%) rotate(35deg);
  opacity: 0.25;
}
</style>
