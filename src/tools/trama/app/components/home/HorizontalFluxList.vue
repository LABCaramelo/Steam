<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppsUsedByFlux from '@trama/components/AppsUsedByFlux.vue'
import HelpTooltip from '@trama/components/HelpTooltip.vue'
import ModalConfirm from '@trama/components/ModalConfirm.vue'
import UserConnectionsPanel from './UserConnectionsPanel.vue'
import { db, deleteFlux, duplicateFlux, fetchFluxes, toggleFluxStatus } from '@trama/services/api'
import { toastError, toastInfo, toastSuccess } from '@trama/composables/useToast'
import { useSession } from '@trama/composables/useSession'

const PRIORITY_HELP =
  'A classificação mostra a duração média registrada nas execuções. Não altera a ordem de execução.'
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
  <section class="flow-library">
    <div class="flow-list-toolbar">
      <div class="flow-list-tabs" role="tablist" aria-label="Integrações e conexões">
        <button id="trama-flows-tab" type="button" role="tab" aria-controls="trama-flows-panel" :tabindex="tab === 'integracoes' ? 0 : -1" :aria-selected="tab === 'integracoes'" :class="{ active: tab === 'integracoes' }" @click="tab = 'integracoes'" @keydown.right.prevent="tab='conexoes'; $event.currentTarget.nextElementSibling.focus()"><v-icon icon="mdi-source-branch" size="18"/><span>Integrações</span><span class="flow-tab-count">{{ fluxes.meta?.total || 0 }}</span></button>
        <button id="trama-connections-tab" type="button" role="tab" aria-controls="trama-connections-panel" :tabindex="tab === 'conexoes' ? 0 : -1" :aria-selected="tab === 'conexoes'" :class="{ active: tab === 'conexoes' }" @click="tab = 'conexoes'" @keydown.left.prevent="tab='integracoes'; $event.currentTarget.previousElementSibling.focus()"><v-icon icon="mdi-link-variant" size="18"/><span>Conexões</span></button>
      </div>
      <v-text-field v-if="tab === 'integracoes'" v-model="search" prepend-inner-icon="mdi-magnify" label="Buscar integrações" class="flow-list-search" hide-details density="compact" clearable variant="outlined" rounded="lg" @input="onSearch" @click:clear="load(true)" />
    </div>
    <v-window v-model="tab">
      <v-window-item value="integracoes">
        <div id="trama-flows-panel" role="tabpanel" aria-labelledby="trama-flows-tab">
          <div v-if="loading" class="flow-loading" aria-label="Carregando integrações"><v-skeleton-loader v-for="n in 3" :key="n" type="list-item-avatar-two-line" /></div>
          <template v-else-if="fluxes.data.length">
            <div class="flow-table-heading"><span>WEBHOOK</span><button class="flow-sort" type="button" @click="sortBy('name')">NOME DO FLUXO <v-icon :icon="orderBy === 'name' && reverse ? 'mdi-arrow-down' : 'mdi-arrow-up'" size="14"/></button><span>APLICATIVOS</span><span class="flow-column-help">PRIORIDADE <HelpTooltip :text="PRIORITY_HELP" :size="15" /></span><span class="flow-column-help">OPERAÇÕES <HelpTooltip :text="OPERATIONS_HELP" :size="15" /></span><span>AÇÕES</span></div>
            <div class="flow-rows">
              <article v-for="flux in fluxes.data" :key="flux.id" class="flow-row">
                <div class="flow-webhook"><v-switch inset hide-details density="compact" color="primary" :model-value="flux.active" :disabled="!flux.active && (!db.capabilities?.external_webhooks || !flux.published_version_id)" :aria-label="'Ativar webhook de ' + flux.name" @update:model-value="(v) => v !== null && toggle(flux, v)" /><span class="flow-mobile-status">{{ flux.active ? 'Webhook ativo' : 'Webhook desativado' }}</span></div>
                <router-link :to="{ name:'flux', params:{fluxId:flux.id} }" class="flow-open"><span class="flow-title"><v-icon icon="mdi-source-branch" size="22"/><h3>{{ flux.name }}</h3><v-icon v-if="flux.premium && !db.subscription" icon="mdi-crown" size="18" color="primary" aria-label="Integração Premium"/></span><span class="flow-open-description">{{ flux.published_version_id ? 'Versão publicada' : 'Em construção' }} <span aria-hidden="true">·</span> Abrir fluxo <v-icon icon="mdi-arrow-top-right" size="14"/></span></router-link>
                <div class="flow-apps"><span class="flow-mobile-label">Aplicativos</span><AppsUsedByFlux :used-apps="flux.apps_used" /></div>
                <div class="flow-priority"><span class="flow-mobile-label">Prioridade</span><v-chip v-if="priorityOf(flux)" :color="priorityOf(flux).color" variant="tonal" size="small">{{ priorityOf(flux).text }}</v-chip><span v-else class="flow-no-data">Sem execução</span></div>
                <div class="flow-operations"><span class="flow-mobile-label">Operações</span><strong>{{ flux.activations || 0 }}</strong></div>
                <div class="flow-actions"><v-btn variant="text" icon :aria-label="'Duplicar ' + flux.name" :loading="duplicating.has(flux.id)" @click="duplicate(flux)"><v-icon icon="mdi-content-copy" size="19"/><v-tooltip activator="parent" location="top">Duplicar fluxo</v-tooltip></v-btn><v-btn variant="text" icon :aria-label="'Excluir ' + flux.name" :disabled="flux.first"><v-icon icon="mdi-delete-outline" size="20"/><v-tooltip activator="parent" location="top">Excluir fluxo</v-tooltip><ModalConfirm activator="parent" header-text="Excluir integração" confirm-text="Excluir integração" cancel-text="Cancelar" :loading-confirm="deleting" color="error" icon="mdi-alert-outline" @confirm="remove(flux.id)"><p>Tem certeza que deseja excluir a integração <b>{{ flux.name }}</b>?</p></ModalConfirm></v-btn></div>
              </article>
            </div>
            <div v-if="(fluxes.meta?.last_page || 1) > 1" class="flow-pagination"><v-pagination v-model="page" :total-visible="5" :length="fluxes.meta?.last_page ?? 1" active-color="primary" density="comfortable" /></div>
          </template>
          <div v-else class="flow-empty"><span class="flow-empty-icon"><v-icon :icon="search ? 'mdi-magnify-close' : 'mdi-source-branch-plus'" size="30"/></span><h3>{{ search ? 'Nenhum caminho por aqui.' : 'Seu primeiro caminho começa aqui.' }}</h3><p>{{ search ? 'Tente outro nome ou limpe a busca.' : 'Crie um fluxo e conecte as ações da sua ideia.' }}</p><v-btn v-if="search" prepend-icon="mdi-close" variant="outlined" @click="clearSearch">Limpar busca</v-btn></div>
        </div>
      </v-window-item>
      <v-window-item value="conexoes"><div id="trama-connections-panel" role="tabpanel" aria-labelledby="trama-connections-tab" class="connections-content"><UserConnectionsPanel/></div></v-window-item>
    </v-window>
  </section>
</template>
<style scoped>
.flow-library{border:1px solid rgb(var(--cm-line));border-radius:var(--trama-radius-xl,18px);overflow:hidden;background:rgb(var(--cm-surface-1));box-shadow:inset 0 1px rgb(var(--cm-fg)/.025)}
.flow-list-toolbar{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:22px 24px;border-bottom:1px solid rgb(var(--cm-line))}.flow-list-tabs{display:flex;align-items:center;gap:6px;padding:4px;background:rgb(var(--cm-stage));border:1px solid rgb(var(--cm-line));border-radius:12px}.flow-list-tabs>button{display:flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:9px 14px;border-radius:8px;font:600 13px/1.4 var(--trama-font-ui,Inter,sans-serif);color:rgb(var(--cm-fg-muted));transition:background-color 160ms,color 160ms,box-shadow 160ms,transform 80ms}.flow-list-tabs>button.active{color:rgb(var(--cm-fg));background:rgb(var(--cm-surface-3));box-shadow:inset 0 0 0 1px rgb(var(--cm-line-strong))}.flow-list-tabs>button.active>.v-icon{color:rgb(var(--cm-accent-ink))}.flow-list-tabs>button:hover{color:rgb(var(--cm-fg))}.flow-list-tabs>button:focus-visible,.flow-sort:focus-visible{outline:2px solid rgb(var(--cm-focus));outline-offset:3px}.flow-tab-count{font:600 11px/20px var(--trama-font-code,monospace);min-width:23px;padding-inline:6px;background:rgb(var(--cm-accent-soft));color:rgb(var(--cm-accent-ink));border-radius:5px}.flow-list-search{flex:0 1 340px;min-width:180px}
.flow-table-heading,.flow-row{display:grid;grid-template-columns:80px minmax(180px,1.55fr) minmax(130px,1fr) minmax(90px,.65fr) minmax(80px,.55fr) 86px;align-items:center;gap:18px;padding:18px 24px}.flow-table-heading{font:500 11px/1.5 var(--trama-font-ui,Inter,sans-serif);letter-spacing:.08em;color:rgb(var(--cm-fg-dim));border-bottom:1px solid rgb(var(--cm-line));min-height:56px;background:rgb(var(--cm-surface-2)/.45)}.flow-sort{display:flex;align-items:center;gap:6px;min-height:28px;text-align:left}.flow-column-help{display:flex;align-items:center;gap:5px}.flow-row{min-height:106px;transition:background-color 160ms,border-color 160ms}.flow-row+.flow-row{border-top:1px solid rgb(var(--cm-line))}.flow-row:hover{background:rgb(var(--cm-surface-2)/.65)}.flow-webhook{display:flex;align-items:center;justify-content:flex-start}.flow-open{display:flex;flex-direction:column;gap:9px;min-width:0;padding:8px 0;border-radius:6px}.flow-title{display:flex;align-items:center;gap:10px;color:rgb(var(--cm-fg))}.flow-title>.v-icon{color:rgb(var(--cm-accent-ink));flex-shrink:0}.flow-title h3{font:700 15px/1.4 var(--trama-font-ui,Inter,sans-serif)!important;letter-spacing:-.02em;overflow-wrap:anywhere}.flow-open-description{display:flex;align-items:center;gap:5px;font-size:11px;line-height:1.5;color:rgb(var(--cm-fg-dim));padding-left:32px}.flow-open:hover .flow-open-description{color:rgb(var(--cm-accent-ink))}.flow-open:focus-visible{outline:2px solid rgb(var(--cm-focus));outline-offset:4px}.flow-apps{min-width:0}.flow-priority{font-size:12px}.flow-no-data{font-size:11px;color:rgb(var(--cm-fg-dim))}.flow-operations strong{font:600 15px var(--trama-font-code,monospace);color:rgb(var(--cm-fg-2));font-variant-numeric:tabular-nums}.flow-actions{display:flex;justify-content:flex-end;gap:4px}.flow-actions .v-btn{width:40px;height:40px;color:rgb(var(--cm-fg-dim));border-radius:9px}.flow-actions .v-btn:hover{background:rgb(var(--cm-surface-3));color:rgb(var(--cm-fg))}.flow-actions .v-btn:last-child:hover{color:rgb(var(--cm-danger));background:rgb(var(--cm-danger-soft))}.flow-mobile-label,.flow-mobile-status{display:none}.flow-pagination{display:flex;justify-content:center;padding:15px;border-top:1px solid rgb(var(--cm-line))}.flow-loading{padding:16px}.flow-empty{display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;padding:68px 24px}.flow-empty-icon{display:grid;place-items:center;width:64px;height:64px;border:1px solid rgb(var(--cm-accent-ink)/.25);border-radius:18px;background:rgb(var(--cm-accent-soft));color:rgb(var(--cm-accent-ink));margin-bottom:6px}.flow-empty h3{font-size:23px;letter-spacing:-.04em}.flow-empty p{font-size:14px;line-height:1.65;color:rgb(var(--cm-fg-muted));max-width:390px}.connections-content{padding:24px}
@media(max-width:1150px){.flow-table-heading,.flow-row{grid-template-columns:62px minmax(150px,1.5fr) minmax(100px,1fr) 95px 75px 86px;gap:10px;padding-inline:18px}.flow-table-heading{font-size:11px}.flow-open-description{padding-left:0}}
@media(max-width:900px){.flow-list-toolbar{flex-direction:column;align-items:stretch;gap:16px;padding:16px}.flow-list-tabs{align-self:flex-start}.flow-list-search{min-width:0;flex:auto;width:100%}.flow-table-heading{display:none}.flow-rows{display:flex;flex-direction:column;padding:0 16px 16px;gap:14px}.flow-row,.flow-row+.flow-row{display:grid;grid-template-columns:1fr 1fr;gap:17px 12px;padding:20px 18px;border:1px solid rgb(var(--cm-line));border-radius:14px;background:rgb(var(--cm-surface-1))}.flow-open{order:0;grid-column:1/-1;padding:0}.flow-title h3{font-size:18px!important}.flow-title>.v-icon{font-size:23px}.flow-open-description{font-size:12px;padding-left:32px}.flow-webhook{order:1;grid-column:1/-1;border-top:1px solid rgb(var(--cm-line));padding-top:10px;gap:6px}.flow-mobile-status{display:block;font-size:12px;color:rgb(var(--cm-fg-muted))}.flow-mobile-label{display:block;color:rgb(var(--cm-fg-dim));font-size:11px;line-height:1.5;margin-bottom:7px}.flow-apps{order:2;grid-column:1/-1}.flow-priority{order:3}.flow-operations{order:4}.flow-actions{order:5;grid-column:1/-1;padding-top:12px;border-top:1px solid rgb(var(--cm-line))}.flow-actions .v-btn{min-width:44px;min-height:44px}.flow-list-tabs>button{min-height:44px;padding-inline:13px}.flow-tab-count{font-size:12px}.connections-content{padding:16px}.flow-empty{padding:48px 20px}.flow-empty h3{font-size:22px}.flow-empty p{font-size:16px}}
@media(prefers-reduced-motion:reduce){.flow-row,.flow-list-tabs>button{transition:none}}
</style>
