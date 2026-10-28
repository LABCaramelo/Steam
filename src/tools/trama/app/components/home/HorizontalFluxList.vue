<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppsUsedByFlux from '@trama/components/AppsUsedByFlux.vue'
import HelpTooltip from '@trama/components/HelpTooltip.vue'
import ModalConfirm from '@trama/components/ModalConfirm.vue'
import UserConnectionsPanel from './UserConnectionsPanel.vue'
import { db, deleteFlux, duplicateFlux, fetchFluxes, toggleFluxStatus } from '@trama/services/api'
import { getBlockState } from '@trama/utils/subscription'
import { toastError, toastInfo, toastSuccess } from '@trama/composables/useToast'
import { useSession } from '@trama/composables/useSession'

const PRIORITY_HELP =
  'A classificação mostra a duração média registrada nas execuções manuais. Não altera a ordem de execução.'
const OPERATIONS_HELP =
  'Operações representam o uso da plataforma e são contabilizadas sempre que um aplicativo ou ação é executado. No entanto, alguns componentes não consomem operações, sendo eles Gatilhos (webhook, scheduler ou gatilho de aplicativo), Filtros, Roteadores e ForEach'

// Faixas de tempo médio de execução (mesmos limites do original).
const LIMITS = { quick: 30, medium: 600 }
const PRIORITY = {
  quick: { text: 'Alta', color: 'primary' },
  medium: { text: 'Media', color: 'yellow' },
  slow: { text: 'Baixa', color: 'warning' },
}

const route = useRoute()
const router = useRouter()
const { selectedOrgId } = useSession()

const tab = ref(route.query.tab === 'conexoes' ? 'conexoes' : 'integracoes')
watch(
  () => route.query.tab,
  (value) => (tab.value = value === 'conexoes' ? 'conexoes' : 'integracoes'),
)
watch(tab, (value) => {
  const query = { ...route.query }
  if (value === 'conexoes') query.tab = 'conexoes'
  else delete query.tab
  router.replace({ query })
})

const fluxes = ref({ data: [], meta: { total: 0, last_page: 1 } })
const loading = ref(true)
const search = ref('')
const orderBy = ref('updated_at')
const reverse = ref(true)
const page = ref(1)
const deleting = ref(false)
const duplicating = ref(new Set())
let searchTimer

const block = computed(() => getBlockState(db.subscription, 'integration'))

onMounted(load)
watch(page, () => load())
watch(selectedOrgId, () => { fluxes.value = { data: [], meta: { total: 0, last_page: 1 } }; load(true) })
onBeforeUnmount(() => clearTimeout(searchTimer))

let loadVersion = 0
async function load(resetPage = false) {
  if (resetPage && page.value !== 1) {
    page.value = 1
    return
  }
  loading.value = true
  const version = ++loadVersion
  try {
    const result = await fetchFluxes({ searchTerm: search.value ?? '', orderBy: orderBy.value, reverse: reverse.value, page: page.value })
    if (version === loadVersion) fluxes.value = result
  } catch (error) {
    if (version === loadVersion) toastError({ text: error.userMessage ?? 'Não foi possível carregar as integrações.' })
  } finally {
    if (version === loadVersion) loading.value = false
  }
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => load(true), 300)
}

function clearSearch() {
  search.value = ''
  load(true)
}

function sortBy(key) {
  if (orderBy.value === key) reverse.value = !reverse.value
  else {
    orderBy.value = key
    reverse.value = false
  }
  load()
}

function priorityOf(flux) {
  const avg = flux.average_execution
  if (avg == null) return null
  if (avg <= LIMITS.quick) return PRIORITY.quick
  if (avg <= LIMITS.medium) return PRIORITY.medium
  return PRIORITY.slow
}

async function toggle(flux, active) {
  try {
    await toggleFluxStatus(flux.id, active)
    flux.active = active
    toastSuccess({
      text: active ? 'Integração ativada.' : 'Integração desativada.',
      icon: active ? 'mdi-play-circle-outline' : 'mdi-pause-circle-outline',
    })
  } catch {
    toastError({ text: 'Não foi possível atualizar o estado do fluxo.' })
  }
}

async function duplicate(flux) {
  duplicating.value.add(flux.id)
  try {
    await duplicateFlux(flux.id)
    toastInfo({ title: 'Integração duplicada', text: `"${flux.name} (Cópia)" foi criada com sucesso`, color: 'success', icon: 'mdi-content-copy' })
    await load()
  } catch {
    toastError({ text: 'Não foi possível duplicar a integração, tente novamente mais tarde' })
  } finally {
    duplicating.value.delete(flux.id)
  }
}

async function remove(id) {
  deleting.value = true
  try {
    await deleteFlux(id)
    toastSuccess({ text: 'Integração excluída com sucesso', icon: 'mdi-delete-outline' })
    fluxes.value.data = fluxes.value.data.filter((f) => f.id !== id)
    fluxes.value.meta.total -= 1
  } catch {
    toastError({ text: 'Não foi possível excluir a integração, tente novamente mais tarde' })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <v-card>
    <div class="flow-list-toolbar">
      <div class="flow-list-tabs" role="tablist" aria-label="Integrações e conexões">
        <button type="button" role="tab" :aria-selected="tab === 'integracoes'" :class="{ active: tab === 'integracoes' }" @click="tab = 'integracoes'"><v-icon icon="mdi-source-branch" size="18"/><span>Integrações</span><span v-if="fluxes.meta?.total" class="flow-tab-count">{{ fluxes.meta.total }}</span></button>
        <button type="button" role="tab" :aria-selected="tab === 'conexoes'" :class="{ active: tab === 'conexoes' }" @click="tab = 'conexoes'"><v-icon icon="mdi-link-variant" size="18"/><span>Conexões</span></button>
      </div>
      <v-text-field
        v-if="tab === 'integracoes'"
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        placeholder="Buscar integrações"
        aria-label="Buscar integrações"
        class="flow-list-search"
        hide-details
        density="compact"
        clearable
        variant="outlined"
        rounded="lg"
        @input="onSearch"
        @click:clear="load(true)"
      />
    </div>

    <v-window v-model="tab">
      <v-window-item value="integracoes">
        <div v-if="loading">
          <v-skeleton-loader v-for="n in 6" :key="n" type="avatar, sentences, button@2" />
        </div>

        <div v-else-if="fluxes.data.length">
          <div class="flow-mobile-list">
            <article v-for="flux in fluxes.data" :key="flux.id" class="flow-mobile-card">
              <router-link :to="{ name: 'flux', params: { fluxId: flux.id } }" class="flow-mobile-open"><h3>{{ flux.name }}</h3><span>Abrir fluxo <span aria-hidden="true">↗</span></span></router-link>
              <p class="flow-mobile-meta"><span>{{ flux.activations || 0 }} operações</span><span>Execução manual</span></p>
              <div class="flow-mobile-actions">
                <v-btn variant="text" color="primary" prepend-icon="mdi-content-copy" :aria-label="'Duplicar ' + flux.name" :loading="duplicating.has(flux.id)" @click="duplicate(flux)">Duplicar</v-btn>
                <v-btn variant="text" color="error" prepend-icon="mdi-delete-outline" :aria-label="'Excluir ' + flux.name" :disabled="flux.first">Excluir<ModalConfirm activator="parent" header-text="Excluir integração" confirm-text="Excluir integração" cancel-text="Cancelar" :loading-confirm="deleting" color="error" icon="mdi-alert-outline" @confirm="remove(flux.id)"><p>Tem certeza que deseja excluir a integração <b>{{ flux.name }}</b>?</p></ModalConfirm></v-btn>
              </div>
            </article>
          </div>
          <div class="bg-background py-1 flow-desktop-list">
            <v-container fluid>
              <v-row class="d-flex align-center justify-space-between flux-row">
                <v-col lg="1" md="1" sm="1" />
                <v-col lg="3" md="2" sm="2">
                  <h4 class="cursor-pointer d-flex align-center sort-header" @click="sortBy('name')">
                    NOME
                    <v-icon
                      size="16"
                      class="ml-1 sort-icon"
                      :class="{ 'sort-icon--active': orderBy === 'name' }"
                      :color="orderBy === 'name' ? 'primary' : undefined"
                      :icon="orderBy === 'name' && reverse ? 'mdi-arrow-down' : 'mdi-arrow-up'"
                    />
                  </h4>
                </v-col>
                <v-col lg="2" md="2" sm="2" class="d-flex justify-center align-center">
                  <h4>PRIORIDADE</h4>
                  <HelpTooltip :text="PRIORITY_HELP" :size="15" class="ml-1" />
                </v-col>
                <v-col lg="1" md="2" sm="2" class="d-flex justify-center align-center">
                  <h4>OPERAÇÕES</h4>
                  <HelpTooltip :text="OPERATIONS_HELP" :size="15" class="ml-1" />
                </v-col>
                <v-col lg="3" md="2" sm="2" class="d-none d-lg-flex justify-center"><h4>APPS</h4></v-col>
                <v-col lg="1" md="1" sm="1" class="d-flex justify-center"><h4>DUPLICAR</h4></v-col>
                <v-col lg="1" md="1" sm="1" class="d-flex justify-end"><h4>EXCLUIR</h4></v-col>
              </v-row>
            </v-container>
          </div>

          <div v-for="flux in fluxes.data" :key="flux.id" class="flow-desktop-list">
            <router-link :to="{ name: 'flux', params: { fluxId: flux.id } }">
              <v-card v-ripple class="flux-card px-4" variant="flat" rounded="0">
                <v-row class="d-flex align-center justify-space-between flux-row">
                  <v-col lg="1" md="1" sm="1" class="d-flex" @click.stop.prevent>
                    <v-switch
                      inset
                      hide-details
                      class="py-2"
                      color="primary"
                      :model-value="flux.active"
                      :disabled="true" aria-label="Ativação automática indisponível nesta versão"
                      @update:model-value="(v) => v !== null && toggle(flux, v)"
                    />
                    <v-menu v-if="block.isBlocked" max-height="350" open-on-hover location="top" activator="parent">
                      <v-card :title="block.title" :text="block.text" max-width="360" />
                    </v-menu>
                  </v-col>
                  <v-col lg="3" md="2" sm="2" class="d-flex align-center text-truncate">
                    <span class="text-truncate">{{ flux.name }}</span>
                    <v-icon v-if="flux.premium && !db.subscription" icon="mdi-crown" class="ml-2" color="primary">
                      <v-tooltip activator="parent" location="top">Integração Premium</v-tooltip>
                    </v-icon>
                  </v-col>
                  <v-col lg="2" md="2" sm="2" class="d-flex justify-center">
                    <v-chip v-if="priorityOf(flux)" :color="priorityOf(flux).color" variant="tonal" size="small">
                      {{ priorityOf(flux).text }}
                    </v-chip>
                  </v-col>
                  <v-col lg="1" md="2" sm="2" class="d-flex justify-center">
                    <span :class="{ 'text-disabled': !flux.activations }">{{ flux.activations || 0 }}</span>
                  </v-col>
                  <v-col lg="3" md="2" sm="2" class="d-none d-lg-flex justify-center">
                    <AppsUsedByFlux :used-apps="flux.apps_used" />
                  </v-col>
                  <v-col lg="1" md="1" sm="1" class="d-flex justify-center" @click.stop.prevent>
                    <v-btn variant="text" icon :aria-label="'Duplicar ' + flux.name" :loading="duplicating.has(flux.id)" @click.stop.prevent="duplicate(flux)">
                      <v-icon icon="mdi-content-copy" color="primary" />
                      <v-tooltip activator="parent" location="top">Duplicar {{ flux.name }}</v-tooltip>
                    </v-btn>
                  </v-col>
                  <v-col lg="1" md="1" sm="1" class="d-flex justify-end" @click.stop.prevent>
                    <v-btn variant="text" icon :aria-label="'Excluir ' + flux.name" :disabled="flux.first">
                      <v-icon icon="mdi-delete-outline" color="error" />
                      <v-tooltip activator="parent" location="top">Excluir {{ flux.name }}</v-tooltip>
                      <ModalConfirm
                        activator="parent"
                        header-text="Excluir integração"
                        confirm-text="Excluir integração"
                        cancel-text="Cancelar"
                        :loading-confirm="deleting"
                        color="error"
                        icon="mdi-alert-outline"
                        @confirm="remove(flux.id)"
                      >
                        <p>
                          Tem certeza que deseja excluir a integração <b>{{ flux.name }}</b>?
                        </p>
                      </ModalConfirm>
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card>
            </router-link>
            <v-divider />
          </div>

          <div class="d-flex align-center justify-center flex-wrap ga-2 mx-5 my-4">
            <v-pagination
              v-model="page"
              total-visible="10"
              :length="fluxes.meta?.last_page ?? 1"
              active-color="primary"
              density="comfortable"
            />
          </div>
        </div>

        <div v-else class="text-center py-16">
          <v-icon :icon="search ? 'mdi-magnify-close' : 'mdi-source-branch'" size="48" class="mb-2 opacity-60" />
          <p class="mb-1">{{ search ? 'Nenhum resultado encontrado' : 'Nenhuma integração ainda' }}</p>
          <p class="mb-3">
            {{ search ? `Não encontramos integrações para "${search}".` : 'Crie sua primeira integração pelo botão no topo da página.' }}
          </p>
          <v-btn v-if="search" prepend-icon="mdi-close" variant="text" color="primary" @click="clearSearch">Limpar busca</v-btn>
        </div>
      </v-window-item>

      <v-window-item value="conexoes">
        <div class="pa-5">
          <UserConnectionsPanel />
        </div>
      </v-window-item>
    </v-window>
  </v-card>
</template>

<style scoped>
.flow-list-toolbar{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:20px 28px}
.flow-list-tabs{display:flex;gap:6px;min-width:0}
.flow-list-tabs>button{display:flex;align-items:center;gap:8px;min-height:42px;padding:9px 12px;border-bottom:2px solid transparent;font-size:13px;font-weight:600;white-space:nowrap}
.flow-list-tabs>button.active{color:rgb(var(--cm-accent-ink));border-color:rgb(var(--cm-accent-ink))}
.flow-tab-count{background:rgb(var(--cm-accent-soft));font-size:10px;line-height:19px;min-width:20px;border-radius:20px;padding-inline:5px;text-align:center}
.flow-list-search{flex:0 1 360px;min-width:180px}
.flow-mobile-list{display:none}
@media(max-width:900px){
  .flow-list-toolbar{flex-direction:column;align-items:stretch;gap:12px;padding:16px 14px}
  .flow-list-tabs{width:100%;justify-content:space-between;gap:4px}
  .flow-list-tabs>button{gap:6px;padding:9px 6px;font-size:12px;flex:1;justify-content:center}
  .flow-list-search{flex:auto;min-width:0;width:100%}
  .flow-desktop-list{display:none!important}
  .flow-mobile-list{display:flex;flex-direction:column;padding:0 14px;gap:12px}
  .flow-mobile-card{padding:16px 14px;border:1px solid rgb(var(--cm-line));border-radius:12px;background:rgb(var(--cm-surface-1))}
  .flow-mobile-open{display:flex;flex-direction:column;gap:12px;padding-bottom:12px}
  .flow-mobile-open h3{font-size:16px;line-height:1.4;overflow-wrap:anywhere}
  .flow-mobile-open>span{font-size:11px;font-weight:650;color:rgb(var(--cm-accent-ink));display:flex;align-items:center;gap:5px}
  .flow-mobile-meta{display:flex;flex-wrap:wrap;gap:5px 12px;font-size:10px;color:rgb(var(--cm-fg-dim));line-height:1.5;padding-bottom:12px}
  .flow-mobile-actions{display:flex;flex-wrap:wrap;gap:6px;border-top:1px solid rgb(var(--cm-line));padding-top:9px;justify-content:space-between}
  .flow-mobile-actions .v-btn{font-size:11px;min-width:0;padding-inline:6px;min-height:38px}
}
.flux-row > .v-col {
  padding-top: 8px;
  padding-bottom: 8px;
}

.sort-header .sort-icon:not(.sort-icon--active) {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.sort-header:hover .sort-icon:not(.sort-icon--active) {
  opacity: 1;
}

.flux-card:hover {
  background-color: rgb(var(--v-theme-background));
}
</style>
