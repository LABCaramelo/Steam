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
  <v-btn class="trama-new-flow" color="primary" rounded="lg" size="large" :disabled="loading" @click="open = true">
    <v-icon icon="mdi-plus" size="22" />
    <span class="mr-1">Novo fluxo</span>
    <v-tooltip activator="parent" location="top">Criar nova integração</v-tooltip>
  </v-btn>

  <AppModal v-model="open" max-width="450px" :prevent-close="loading">
    <span class="create-flux-symbol" aria-hidden="true"><v-icon icon="mdi-source-branch-plus" size="30" /></span>
    <h3 class="create-flux-heading">Dê um nome ao caminho.</h3>
    <p class="create-flux-description">Depois, conecte os módulos e transforme a ideia em ação.</p>
    <v-form ref="form" :disabled="loading" class="position-relative" @submit.prevent="submit">
      <div class="mb-2">
        <v-text-field v-model="name" label="Nome do fluxo" placeholder="Ex.: Receber novos contatos" autofocus :rules="[required, lengthBetween(0, 50)]" />
      </div>
      <div class="create-flux-actions">
        <v-btn variant="outlined" :disabled="loading" @click="open = false">Cancelar</v-btn>
        <v-btn color="primary" type="submit" append-icon="mdi-arrow-right" :loading="loading">Começar!</v-btn>
      </div>
    </v-form>
  </AppModal>
</template>

<style scoped>
.trama-new-flow{height:46px!important;padding-inline:22px!important;font-size:14px;font-weight:700}
.create-flux-symbol{display:grid;place-items:center;width:56px;height:56px;border-radius:15px;color:rgb(var(--cm-accent-ink));background:rgb(var(--cm-accent-soft));border:1px solid rgb(var(--cm-accent-ink)/.25);margin-bottom:20px}
.create-flux-heading{font-size:28px;line-height:1.1!important;letter-spacing:-.05em!important;max-width:290px;margin-bottom:12px}
.create-flux-description{margin-bottom:24px}
.create-flux-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:22px;padding-top:20px;border-top:1px solid rgb(var(--cm-line))}
.create-flux-actions .v-btn{min-height:42px}
@media(max-width:600px){.trama-new-flow{min-height:48px}.create-flux-actions{display:grid;grid-template-columns:1fr 1fr}.create-flux-actions .v-btn{min-height:44px}.create-flux-heading{font-size:27px}}
</style>
