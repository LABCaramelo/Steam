<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ModalConfirm from '@trama/components/ModalConfirm.vue'
import { deleteApp, listApps } from '@trama/services/api'
import { useSession } from '@trama/composables/useSession'
import { toastError, toastSuccess } from '@trama/composables/useToast'

const router = useRouter()
const { selectedOrgId } = useSession()
const apps = ref([]), search = ref(''), loading = ref(false), loadError = ref(''), deleting = ref(null)
const visibleApps = computed(() => apps.value.filter(app => `${app.name} ${app.description ?? ''}`.toLowerCase().includes(search.value.toLowerCase().trim())))
let revision = 0
async function load() {
  const current = ++revision
  loading.value = true; loadError.value = ''
  try { const result = await listApps(); if (current === revision) apps.value = result }
  catch (error) { if (current === revision) loadError.value = error.userMessage ?? 'Não foi possível carregar os aplicativos.' }
  finally { if (current === revision) loading.value = false }
}
async function remove(app) {
  deleting.value = app.id
  try { await deleteApp(app.id); toastSuccess({ text: 'Aplicativo removido.' }); await load() }
  catch (error) { toastError({ text: error.userMessage ?? 'Não foi possível remover o aplicativo.' }) }
  finally { deleting.value = null }
}
onMounted(load)
watch(selectedOrgId, () => { apps.value = []; load() })
</script>

<template>
  <div class="page-padding">
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-6">
      <div><h2>Aplicativos</h2><p class="text-medium-emphasis mt-1">Crie módulos para integrar suas APIs aos fluxos.</p></div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="router.push({ name: 'app-builder' })">Criar aplicativo</v-btn>
    </div>
    <v-text-field v-model="search" label="Pesquisar aplicativos" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" class="mb-5" hide-details />
    <v-alert v-if="loadError" type="error" variant="tonal" class="mb-4">{{ loadError }} <v-btn variant="text" size="small" @click="load">Tentar novamente</v-btn></v-alert>
    <v-row v-if="loading"><v-col v-for="n in 3" :key="n" cols="12" md="4"><v-skeleton-loader type="card" /></v-col></v-row>
    <v-alert v-else-if="!visibleApps.length && !loadError" type="info" variant="tonal">{{ search ? 'Nenhum aplicativo encontrado.' : 'Você ainda não criou aplicativos nesta organização.' }}</v-alert>
    <v-row v-else>
      <v-col v-for="app in visibleApps" :key="app.id" cols="12" md="6" lg="4">
        <v-card class="pa-5" height="100%">
          <div class="d-flex ga-3 align-center mb-3"><v-avatar color="primary" variant="tonal" rounded><v-icon icon="mdi-puzzle-outline" /></v-avatar><h3>{{ app.name }}</h3></div>
          <p class="text-medium-emphasis mb-4">{{ app.description }}</p>
          <p class="text-small mb-5">{{ app.modules.length }} módulos · {{ app.rpcs.length }} RPCs</p>
          <div class="d-flex justify-space-between">
            <v-btn variant="text" color="error" :loading="deleting === app.id" prepend-icon="mdi-delete-outline">Excluir
              <ModalConfirm activator="parent" header-text="Excluir aplicativo" confirm-text="Excluir" cancel-text="Cancelar" color="error" icon="mdi-alert-outline" close-on-confirm @confirm="remove(app)"><p>Os fluxos existentes mantêm a definição salva em cada nó. Este aplicativo deixará de aparecer na seleção de novas ações.</p></ModalConfirm>
            </v-btn>
            <v-btn color="primary" variant="tonal" prepend-icon="mdi-pencil-outline" @click="router.push({ name: 'app-builder', params: { appId: app.id } })">Editar</v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
